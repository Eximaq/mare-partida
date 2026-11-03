# Ciclos de simulação e navegação — 03/11/2026

## Base e escopo

Continuação do #230, main `58825cf`. O perfil de CPU de oito atores e 80 chamadas mostrou 3127 ms no motor, dos quais 2444 ms em buscas de caminho. Amostragem apontou `sample` e `maskLine` de Dawn como os maiores custos de CPU. No primeiro diagnóstico após a aceleração conservadora, o motor consumiu 833 ms e os caminhos 591 ms. Esses ensaios usam RNG, tempo e posições variáveis: são diagnóstico, não comparação A/B ou capacidade de produção. Perfis brutos ficam em infra/local ignorado.

Objetivo: atualizar os atores com atraso menor, mantendo o combate original e o banco como autoridade. Não muda gameplay, velocidades, colisões, mapas, assets, HUD, saves, conteúdo/economia, TTLs de autenticação, quantidade padrão de workers ou conexões. Não adiciona endpoints, campos aceitos do cliente, dependências ou recursos externos.

## Geometria estática

1. A máscara imutável de Dawn recebe um índice de soma de células bloqueadas. Uma região retangular inteiramente livre de terreno e de obstáculos pode ser aceita sem repetir a travessia densa. A prova inclui raio e margem conservadora. Regiões com obstáculos, bordas ou resultado inconclusivo usam o predicado original. O índice é compartilhado por mapa dentro do isolate, nunca criado por personagem, e ocupa aproximadamente 2,3 MiB para Dawn.
2. O teste determinístico encontrou decisões do DDA original dependentes da direção em finais de segmento alinhados à máscara. Essas decisões foram preservadas: segmentos descendentes próximos dessas fronteiras continuam no verificador original. A otimização não corrige nem substitui as regras originais por geometria aproximada.
3. Componentes da grade usam somente vizinhos cardinais e omitem verificações exatas de arestas. Esse grafo permite mais conexões que o A* original; portanto só pode provar impossibilidade quando componentes são distintos, depois de testar a rota direta. Inícios transitáveis cujo centro de célula é bloqueado podem entrar pelos componentes vizinhos. Busca, custos, desempate e suavização do A* existente permanecem iguais.
4. Resultados exatos das oito arestas dirigidas de cada nó usam dois bytes por célula, evitando expulsão pelo cache de consultas dinâmicas. Direções são independentes; coordenadas próximas não são arredondadas para nós. As demais consultas continuam nos caches limitados existentes.

O índice recebe exclusivamente a máscara versionada de Dawn carregada pelo backend. Dimensões e tamanho são validados. Outros mapas mantêm seus próprios predicados e geometria. A imagem, máscara e código originais de Dawn e world-system não foram alterados. A comparação com o navegador original inclui grade completa de todos os mapas, consultas exatas, rotas e estado determinístico de combate.

## Orçamento dos ciclos

Os workers mantêm o disparo a cada 250 ms, single-flight, dois solo e um Party. Cada lote tem orçamento suave de 200 ms. Ao estourar esse tempo, termina e confirma a transação atual antes de ceder; não interrompe um personagem, uma sala ou recompensa pela metade. A transação inicial pode exceder o orçamento. Não é um limite rígido de latência: banco, CPU ou uma transação individual ainda podem ultrapassá-lo.

A nova seleção continua ordenada pelo tick persistido mais antigo. Não carrega comandos nem recompensas em filas de catch-up; cada ator/sala é consultado e autorizado novamente. Locks, propriedade, epochs, validade do provedor/controlador, idempotência e limite de gap/offline continuam obrigatórios. Não removemos a proteção que cancela auto em gaps longos para melhorar o benchmark. Chamadas legadas diretas sem orçamento mantêm o comportamento anterior; a entrada real dos workers passa 200 ms explicitamente.

Testes PostgreSQL com atraso real em trigger comprovam que só um ator/sala termina por janela vencida, que o ator mais antigo progride em seguida e que todos os membros da sala são persistidos juntos.

## Migração e operação

0034 promove somente o hash de mundo conhecido `2a2da158` para `65fb208c`, incluindo os dois módulos de navegação no fingerprint. Não muda linhas de batalha, inventário, progressão, aparência, personagens ou caminhos/relógios de mundo; hashes desconhecidos ficam intactos e continuam falhando de forma fechada. Migrations anteriores não foram editadas. As listas de histórico esperado nos testes de upgrades foram ampliadas explicitamente para 0034, mantendo os testes de reaplicação/checksum.

A imagem Docker inclui o novo módulo de máscara. Não há novos grants. Fazer backup nativo e testar sua restauração e upgrade antes de aplicar no banco local; encerrar API/HTTPS, aplicar 0034 com a role de migração, compilar runtime e reiniciar pelo supervisor. Não executar runtimes com fingerprints antigos e novos juntos. Não fazer downgrade nem restaurar automaticamente por cima dos dados em uso. PostgreSQL e saves ficam preservados.

## Ensaios de carga

Gerador/API/banco no mesmo PC; HTTP, domínio, PostgreSQL e workers reais; identidade fictícia e banco descartável. Nenhum e-mail, conta hospedada, dado de jogador ou carga no Radmin. Mesmos critérios de #230: todas HTTP200, zero descartes e paradas de atores vivos, p95 HTTP <500 ms e idade da simulação <1000 ms. Quantidade de atores ativos e recibos de recompensa é medida ao final.

| Código/perfil | Janela | HTTP200 | p95 HTTP | p95 simulação | Auto ativo | Resultado |
|---|---:|---:|---:|---:|---:|---|
| #230 solo50, referência | 30s | 2000/2000 | 468ms | 1712ms | 18/50 | Reprovado |
| Máscara inicial, solo50 | 30s | 2000/2000 | 223ms | 727ms | 49/50 | Reprovado: uma parada |
| Componentes + orçamento, solo50 | 60s | 4000/4000 | 347ms | 1039ms | 50/50 | Reprovado: idade |
| Código final, solo50 | 60s | 4000/4000 | 361ms | 805ms | 50/50 | Passou janela curta |
| Código final, solo50 | 120s | 8000/8000 | 170ms | 702ms | 50/50 | Passou repetição |
| Código final, Party12 | 60s | 960/960 | 56ms | 377ms | 12/12 | Passou janela curta |
| Código final, Party50 | 60s | 4000/4000 | 624ms | 1515ms | 4/50 | Reprovado: 46 paradas |
| Código final, solo100 instrumentado | 30s | 3831/3831 | 467ms | 1409ms | 44/100 | Reprovado: 168 descartes, 56 paradas |

A repetição de 120s registrou 1378 recibos de recompensa e nenhuma morte, parada indevida ou reinício de worker. Party50 teve pico de 70 esperas no pool. Solo100 teve pico de 84; os workers ficaram prontos e não reiniciaram, mas a carga não passou. Nenhum ensaio de 300/1000/3000 foi executado depois dessas reprovações.

A primeira tentativa de solo100 encerrou o processo com código nativo 0xC0000409, sem relatório ou stderr: **inconclusiva**, causa não comprovada. Não foi classificada como defeito do sistema operacional nem como falha confirmada de código. Uma repetição com marcos agregados de setup e relatórios de falha configurados para excluir ambiente/rede concluiu a janela sem nova queda e produziu a reprovação acima. Não foram ampliados limites de memória nem desativadas proteções para forçar o teste; não foi gerado dump de heap/credenciais. O encerramento inicial permanece um risco não explicado, sem alegação de correção causal.

RNG/distribuição das partições/aquecimento e carga do PC variam. Os resultados aprovam somente as janelas indicadas, não garantem CCU de VPS, estabilidade prolongada ou 3.000 jogadores. O próximo gargalo é a contenção por sala e a fila de consultas/projeções compartilhadas; não aumentar conexões nem retirar locks/revalidações para declarar capacidade. A autorização do snapshot de apresentação precisa permanecer rigorosa ao reduzir o acoplamento com a simulação.
