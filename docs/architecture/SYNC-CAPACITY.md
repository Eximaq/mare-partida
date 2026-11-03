# Sincronização e capacidade — primeiro incremento

## Base compatível e revisão do colaborador

Base: `6899bef`, main com PR #226 (Party/Social) e #227 (manutenção). A primeira entrega acrescentou migração 0032, monstros canônicos compartilhados, consentimento, presença, XP e baús por participante. A segunda separou o build atual das bancadas históricas, removeu apenas bitmaps substituídos, preservou a navegação móvel e atualizou a CI. Este incremento parte de ambas, sem copiar um game.js anterior sobre elas. O teste de frame cobre também a atividade Party e seus monstros canônicos.

Desenvolvimento em worktree própria, separada da instalação contínua. Banco descartável de teste em outro processo/porta; não usa contas, e-mails, saves ou credenciais do Supabase. Nenhum teste de carga atinge o servidor Radmin em uso.

## Contrato de apresentação

`online-state` anuncia `sync.protocol=1`. Só então o cliente usa `GET /v1/characters/:id/frame`. Servidores anteriores continuam pelo contrato completo existente. O frame devolve protocolo, personagem, versão, tempo de servidor, idade do último tick pessoal, mundo, batalha, roster e Party. É uma projeção privada autorizada pela mesma sessão BFF, verificação de propriedade, locks do personagem/grupo e revogação da leitura completa. Não é um caminho de comandos; POST e parâmetros extras são recusados. Não oferece cache público nem aceita accountId/ownerId como autorização. Server-Timing informa somente duração agregada de processamento.

O cliente faz leitura completa ao menos a cada três segundos de polling, após comandos e imediatamente quando a versão difere. Leituras intermediárias usam frames na cadência anterior. Não aumenta frequência para mascarar atraso. Inventário, progressão, equipamentos, atributos e catálogos só mudam pela leitura completa. Uma resposta ultrapassada não substitui a leitura mais recente; frames concorrentes da mesma sessão compartilham uma chamada. Versão inválida/identidade incompatível falha fechada. A política 24h/2h, JWT, CSRF e controle exclusivo permanecem.

A idade do tick pessoal é diagnóstica. Não é ping, nem relógio de evento por monstro; no Party o tick canônico pode ser mais recente ou mais antigo que o último tick do membro. Ainda não existe linha temporal por evento de ataque. O frame não promete eliminar toda defasagem entre dano e posição visual.

## Trabalho de simulação

Solo e Party passam a ter agendamentos independentes de 250 ms. Cada um admite uma única execução em andamento, sem fila de catch-up. Um solo lento não impede o agendamento da Party. Isso não equivale a isolamento de CPU: ambos ainda compartilham o event loop Node e PostgreSQL. Os locks existentes impedem dois donos de atualizar um personagem/instância. Shutdown aguarda os dois trabalhos e não fecha o pool antes deles.

Janelas agregadas informam ciclos, falhas, oportunidades adiadas, média e máximo por lane. Métricas HTTP acrescentam percentis aproximados de histogramas fixos, sem listas crescentes nem IDs. O relatório de carga mede também fila do pool, atraso do event loop, CPU, memória, bytes e idade da simulação.

O perfil de CPU identificou custo dominante de consultas repetidas de máscara/colisão em Dawn. A navegação server-only agora mantém cache limitado por mapa: 4.096 consultas de ponto e 8.192 segmentos. Chaves usam coordenadas exatas, raio e ordem dos pontos, sem quantização. Resultados são booleanos sobre geometria estática; não há cache de estado de personagem, monstros, sessão, autorização ou progresso. Mapas dinâmicos futuros exigirão invalidação ou instância de navegação própria. Testes comparam grids, colisões, linhas e rotas em todos os mapas e estados de combate determinísticos com o solver original.

A migração 0033 promove apenas o hash predecessor auditado de mundo (`6677e2ee…`) para o novo hash. Não altera posição, caminho, velocidade, itens ou progresso. Hash desconhecido continua bloqueado. Migrations anteriores permanecem imutáveis. O hash de combate do PR #226 é preservado.

## Ensaio reproduzível e limites

Executar `npm run load:local` com `.env.test.local` apontando para PostgreSQL loopback descartável. O runner cria somente seu próprio banco aleatório e o remove ao terminar. Recusa alvo externo. O provedor é fictício; HTTP, autenticação BFF, PostgreSQL, domínio e workers são reais. Cabeçalho de IP individual é aceito somente pelo proxy de fixture loopback, para representar clientes independentes sem retirar rate limits. A carga usa polling agendado a cada 750 ms, registra trabalho descartado e limita a 96 requisições em voo; não oculta saturação diminuindo silenciosamente a taxa. O máximo configurável é 3.000 identidades, não uma afirmação de capacidade.

Variáveis: `MARE_LOAD_CLIENTS` (1–3000), `MARE_LOAD_SECONDS` (10–600), `MARE_LOAD_MODE` (`full`, `mixed`, `party`) e `MARE_LOAD_REPORT` (somente tmp/ ou infra/local/). Perfis full/mixed caçam solo; party prepara grupos de até quatro por comandos reais e inicia caçada compartilhada. Mixed/Party usam uma leitura completa a cada quatro pedidos e frames nos demais. O cliente real ainda força leitura completa ao mudar a versão; portanto o gerador misto mede um padrão controlado, não reproduz exatamente todos os pedidos do navegador. Os jogadores sintéticos usam auto-combate; o teste HTTPS separado cobre mouse, comandos, reload, autorização e preservação do save.

Critérios iniciais, propostos para diagnóstico local: nenhum erro HTTP ou de rede, nenhum pedido agendado descartado, p95 HTTP <500 ms e p95 da idade da simulação <1000 ms. A aprovação exige também invariantes funcionais e os testes de recompensas/idempotência existentes. O ensaio não prova toda a segurança econômica com a simples ausência de saldo negativo. Processo gerador, API e banco estão no mesmo computador; medições são diagnósticas e não dimensionam uma VPS. Há aquecimento e variação de RNG/IA; comparações são observações, não benchmark A/B estatisticamente controlado.

| Perfil, 12 jogadores, janela de 15 s | HTTP 200 / pedidos | p50 / p95 / p99 HTTP | Média por resposta | p95 idade do tick | Resultado |
|---|---|---|---|---|---|
| Leitura completa, antes do cache | 240 / 240 | 289 / 848 / 1138 ms | 23.679 B | não coletada | Reprovado por latência |
| Misto, antes do cache, com profiler | 240 / 240 | 48 / 810 / 1474 ms | 15.546 B | 2226 ms | Reprovado |
| Misto, cache exato | 240 / 240 | 24 / 265 / 611 ms | 16.599 B | 1489 ms | Reprovado por atraso da simulação |
| Party, cache exato | 240 / 240 | 280 / 1054 / 1363 ms | 26.530 B | 2828 ms | Reprovado |

Resultados completos privados e perfis de CPU ficam ignorados; a tabela não contém dados pessoais. O runner encerra com código 2 quando reprova os critérios. Não se deve omitir essa reprovação porque todas as respostas foram 200. Não houve avanço automático para 50, 100, 300, 1.000 ou 3.000 depois da reprovação em 12. Nenhum desses patamares está certificado. Não são 3.000 jogadores visíveis no mesmo lobby; o roster atual continua limitado a 16 e Party a quatro.

## Próxima decisão arquitetural

Transporte persistente sozinho não remove o custo de IA, consultas, serialização e locks observado. Primeiro é necessário particionar a execução dos mapas/instâncias e medir o custo por sala, com um dono de simulação, orçamento de ticks e distribuição de carga. A extração para processos de simulação exige protocolo de comandos/recibos duráveis e recuperação de crash antes de mover economia para memória. Não retirar ledger, autorização ou durabilidade para ganhar números.

Depois, avaliar WebSocket same-origin autenticado pelo BFF (validação de Origin, limites por sessão/IP, revogação durante a conexão, backpressure, reconexão e retomada por sequência). Snapshots devem ter tick/tempo de simulação e eventos correlacionados; clientes recebem apenas a área de interesse. A animação usa buffer coerente, com predição limitada de movimento e reconciliação, sem aceitar XP, dano ou posições econômicas do cliente.

A matriz de homologação deverá subir 50 →100 →300 →1000 →3000 somente após passar o degrau anterior, com carga de login, caminhada, combate, Party, comandos econômicos idempotentes, perda/reconexão e teste prolongado. Banco/API/gerador separados em host de homologação serão necessários para certificar infraestrutura. Nenhuma compra de VPS é feita por este incremento.

## Atualização da instalação contínua

Este PR inclui as migrations 0032 do colaborador e 0033 deste incremento na cadeia. Antes de usar o novo backend no banco de jogo: backup nativo validado, parada graciosa da API, migração com a role existente de migração, grants atuais de runtime, build e reinício. Preservar banco, saves e personagens. Pages entrega o cliente estático e não executa a migração. Não misturar só arquivos soltos de versões diferentes. O cliente novo ainda pode operar com backend anterior sem o protocolo compacto; isso não instala Party em banco antigo.
