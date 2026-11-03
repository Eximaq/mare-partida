# Workers de simulação — 03/11/2026

## Escopo e autoridade

Continuação do PR #228 sobre main `7bd4a17`, preservando Party/Social (#226) e manutenção (#227). A simulação usa worker_threads com isolados V8 e pools PostgreSQL próprios no mesmo processo Node. O objetivo é retirar CPU de IA/navegação do event loop HTTP e distribuir caçadas; não é ainda distribuição entre hosts ou certificação de 3.000 jogadores.

Cada worker executa o mesmo domínio transacional existente. O banco continua guardando mundo, monstros, HP, relógios, recibos e recompensas. Não há economia volátil em memória, recompensa calculada pelo navegador, importação de save ou mudança de regras de combate, física, densidade ou balanceamento. Não altera migrations, grants ou hashes de gameplay.

Solo é particionado por character_id; Party pelo ID da instância inteira, sem separar seus membros. A seleção usa hash PostgreSQL com seed fixa, módulo e parâmetros validados. A união das partições cobre os atores e cada um pertence a uma partição. Os locks e revalidações existentes continuam obrigatórios, incluindo exclusão de atores Party do worker solo. A mudança de quantidade de workers ocorre no reinício da API, evitando duas configurações dentro de um supervisor.

O padrão é dois workers solo e um Party. Cada worker tem pool máximo de duas conexões; a API mantém dez: orçamento padrão de 16 conexões, sem um pool por jogador. Os limites configuráveis são 1–6 solo e 1–2 Party (até 26 conexões junto da API). `SIMULATION_SOLO_WORKERS` e `SIMULATION_PARTY_WORKERS` inválidos impedem a inicialização com Auth ativo. Somente configuração do operador, nunca de requisições do cliente. Cada isolate tem teto de 256 MiB de old-generation, além do restante do consumo nativo/Node; isso não equivale a um teto total de RSS.

## Inicialização, falhas e encerramento

A entrada é o JS compilado, sem herdar flags de execução/importação nem variáveis Supabase ou chave de criptografia do BFF. Somente NODE_ENV, diretórios básicos do Windows e a conexão runtime pelo canal privado de worker. O worker não recebe tokens de jogadores nem chama o provedor. Não há porta HTTP adicional ou endpoint administrativo para controlá-lo.

A API aguarda os workers, incluindo aquecimento da navegação Dawn, por até 30 s. Heartbeat privado a cada segundo: cinco segundos sem heartbeat tornam readiness indisponível; dez segundos provocam encerramento do worker e substituição. Crashes usam backoff de 250 ms até 30 s, limitado a um substituto por slot; não acumulam filas de threads. Erros do worker não são copiados para logs públicos; métricas selecionam somente números e identificação de lane/partição. Contadores de reinício e saída inesperada são cumulativos; estatísticas da lane são a última janela de dez segundos recebida.

Cada lane continua single-flight, sem fila de catch-up. A pausa offline superior ao limite já existente cancela intenções, preservando os monstros feridos; não gera recuperação de farm offline. Uma queda antes de COMMIT desfaz a transação, e um COMMIT já aceito conserva seu recibo. A autorização é revalidada na transação, incluindo propriedade, epoch, sessão, prazo do provedor e controlador. Revogação impede novos ticks mesmo se o worker permanece vivo.

Shutdown fecha admissão e timers, solicita drenagem e aguarda workers e pools antes de terminar. Após oito segundos, um worker que não encerrou é terminado; sua conexão fecha e PostgreSQL desfaz a transação incompleta. O encerramento da API continua com prazo global de dez segundos. Worker_threads encerra com o processo pai, sem serviço independente órfão. Readiness não substitui backup ou monitoração externa.

## Protocolo 2 de Party

O ensaio identificou contenção no banco quando toda consulta de movimento recalculava atributos e aparência dos quatro membros. `online-state` anuncia agora `sync.protocol=2`. O frame leva `partyMotion`: campos dinâmicos públicos (vida, presença, prontidão, posição, ação, transformação, Haki e atividade). A projeção completa preserva convites, nomes, aparência, classe, facção, atributos públicos e equipamento.

O cliente reconhece protocolos 1 e 2. Com protocolo 2, mescla campos dinâmicos somente quando grupo e conjunto de membros coincidem com a projeção completa autorizada. Se a composição ou versão muda, busca o estado completo; não reaproveita dados de outro grupo. Convites e mudanças visuais de outros membros são atualizados pela leitura completa periódica (aproximadamente três segundos, sujeito à duração das requisições). Não muda autorização, dano, XP ou frequência de comandos. O cliente anterior, que reconhece apenas protocolo 1, usa leituras completas com o servidor novo; o cliente novo continua operando com protocolo 1.

## Ensaios e resultados

Ambiente: Node 24, PostgreSQL descartável loopback separado do jogo, provedor fictício, CPU/API/gerador no mesmo PC. Nenhuma conta/e-mail/serviço hospedado ou dado de jogador é usado. O runner suporta `MARE_LOAD_SIMULATION=workers`; sem essa opção conserva o modo inline para comparação. Construir o servidor antes de executar, pois o worker usa a entrada compilada. Aquecimento e setup ficam fora da janela. Os critérios do primeiro incremento permanecem: todos HTTP200, zero consultas descartadas, p95 HTTP <500 ms e p95 da idade pessoal da simulação <1000 ms. São critérios diagnósticos, não SLA de produção.

| Perfil | Consultas/HTTP200 | p95 HTTP | p95 idade da simulação | Event loop API p99 | Resultado |
|---|---|---|---|---|---|
| Solo misto, 12, 15s, 2+1 workers | 240/240 | 355 ms | 957 ms | 32 ms | Passou o ensaio curto |
| Party, 12, 20s, projeção anterior, 2+1 | 320/320 | 1448 ms | 5253 ms | 25 ms | Reprovado |
| Party, 12, 20s, protocolo 2, 2+1 | 320/320 | 919 ms | 1968 ms | 32 ms | Melhorou; reprovado |
| Party, 12, 20s, protocolo 2, 2+2 | 320/320 | 2272 ms | 3561 ms | 33 ms | Reprovado; não adotado como padrão |
| Solo misto, 50, 15s, 2+1 | 970/970 | 1626 ms | 1888 ms | 32 ms | Reprovado; 30 consultas descartadas |

Nenhum worker reiniciou ou registrou falha nesses ensaios. A API deixou de concentrar a CPU da simulação, mas ainda há saturação e espera pelo banco. No ensaio de 50 houve pico de 84 esperas no pool do gerador/API. O orçamento de conexões do fixture é diferente do host de produção; o teste não dimensiona VPS. RNG, distribuição entre partições, aquecimento e carga do PC variam; números não são benchmark A/B estatisticamente controlado nem limite garantido de jogadores reais.

Não avançar para 100, 300, 1000 ou 3000 depois de reprovar 50. Party de 12 ainda não tem aprovação de capacidade. O controle curto de 12 solo não substitui soak, reconexão e teste no host real. Mais workers não corrigem automaticamente contenção de sessão/grupo ou leituras caras. A próxima otimização deve medir consultas/locks por sala, reduzir projeções redundantes e tempo de transação e depois avaliar snapshots de simulação publicados com durabilidade e sequência. Ledger, limites, autorização e recibos não podem ser removidos para produzir um benchmark melhor.

## Validação funcional exigida

Testes incluem partições disjuntas com PostgreSQL, comportamento original para count=1, worker real com privilégios mínimos, crash/restart, revogação, preservação da progressão e parada sem órfãos. Fundação exercita limites de configuração, isolamento de CPU, heartbeat, recuperação de travamento e encerramento. Party mantém os cenários de dois/três/quatro participantes, lista canônica, XP, loot e rollback. A API compilada é iniciada e encerrada por IPC com Auth desabilitado e habilitado em fixture. O navegador HTTPS usa os workers reais, o protocolo compacto e os controles originais; preserva o save da demonstração.

## Operação

Não requer nova migration ou role. Compilar API/worker juntos, validar backup pelo procedimento existente e reiniciar pelo supervisor local. A API deve ser parada antes de trocar o JS compilado; não iniciar outro supervisor sobre a mesma instalação. Readiness confirma o banco e o heartbeat dos workers. O teste de carga permanece sempre no banco descartável, nunca no endereço Radmin dos jogadores.
