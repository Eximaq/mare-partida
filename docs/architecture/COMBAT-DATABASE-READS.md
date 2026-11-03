# Leituras transacionais de combate — 03/11/2026

## Escopo

Continuação de #229 sobre main `a898279`. Reduz viagens ao PostgreSQL e duração das transações de caçadas e Parties. Mantém os workers 2 solo + 1 Party, pools, timeouts, simulação, hashes, balanceamento e protocolo 2 existentes. Não adiciona índices, migrations, grants, dependências, acesso administrativo ou serviços externos.

A medição em PostgreSQL real mostrou leituras repetidas de atributos, inventário, talentos, frutas, perfil e sala canônica em um mesmo ciclo. `readCombatInputs` agrupa no máximo quatro personagens obtidos pelo backend, valida os mesmos contratos dos leitores ordinários e reutiliza exclusivamente esses dados locais à operação. Cada chamada consulta o banco novamente; não há cache de personagem, sessão, autorização ou economia entre requisições/ticks. A projeção completa reutiliza seus próprios inputs para combatPreview, atributos, talentos, frutas e poder permanente de hierarquia/conquistas. Poder permanente continua excluindo efeitos temporários, Haki ativo e builds de prévia.

Mundo e estado pessoal de uma Party são lidos em lote. O relógio do mundo vem da mesma consulta que lê a posição e mantém o limite de movimento por sessão/controlador. O worker grava o estado pessoal de cada ator e uma única versão canônica dos monstros por transação, em vez de reler/regravar a sala para cada membro. Recompensas, mortes, XP, inventário e recibos continuam no mesmo COMMIT; rollback conserva todos juntos. Subida de nível recarrega os inputs após a recompensa e deriva a vida com o estado de combate atualizado, sem reutilizar atributos anteriores à mutação.

## Autorização e compatibilidade

As leituras em lote são funções internas, sem endpoint público ou IDs aceitos como prova de propriedade. A API mantém autenticação/refresh/revogação, ownership, locks de sessão/conta/personagem e Party. O worker mantém SKIP LOCKED/try-lock e revalida a presença depois de adquirir os locks dos participantes, impedindo usar um roster conectado que ficou obsoleto por revogação concorrente. Não retira locks nem amplia privilégios para melhorar o teste.

Os validadores de inventário (incluindo itens vinculados ao dono), atributos, talentos e frutas são compartilhados pelos dois caminhos. Fixtures de migrations anteriores ao perfil mantêm os leitores ordinários. Uma Party de personagens sem inventário original mantém o fallback do combatente anterior; workers de combate original continuam exigindo inventário inicializado. HUD, assets, saves e fluxo de entrada foram preservados.

A verificação de navegador falhou na reconexão. A investigação reproduziu uma condição de corrida no cliente: falha tardia de leitura completa podia marcar indisponível um estado autorizado mais recente. A correção ignora somente essa falha obsoleta; HTTP401 continua limpando dados e controle imediatamente, inclusive fora de ordem. A regressão determinística falhou antes da correção e passou depois. O teste de navegador espera o estado real de conexão e o medidor com prazo limitado, em vez de presumir que polling e renderização de um segundo terminem juntos em1100 ms. Nenhuma mutação é reenviada para recuperar conexão.

No isolamento READ COMMITTED, cada SELECT lê seu próprio snapshot e vê alterações anteriores da própria transação. Agrupar leituras não dispensa a autorização nem os locks existentes. Referências: [isolamento PostgreSQL 18](https://www.postgresql.org/docs/18/transaction-iso.html), [locks PostgreSQL 18](https://www.postgresql.org/docs/18/explicit-locking.html).

## Consultas medidas

Fixture isolado, quatro membros ou um solo, sem abates na janela de contagem. Inclui BEGIN/COMMIT, autorização e comandos de configuração da transação; não conta somente consultas ao inventário. Contagem determinística, não garantia de latência; recompensas e outras condições adicionam trabalho.

| Operação | Antes | Depois |
|---|---:|---:|
| Tick solo | 40 | 14 |
| Tick Party, quatro membros | 162 | 38 |
| Leitura completa Party | 190 | 59 |
| Frame Party | 47 | 28 |
| Leitura completa solo | 100 | 50 |
| Frame solo | 21 | 20 |

## Carga e limites

Mesmo runner loopback, PostgreSQL descartável, provedor fictício e HTTP/domínio/workers reais. CPU/API/gerador/banco compartilham o PC; sem contas hospedadas, e-mails ou carga no Radmin. Critérios preservados: todas HTTP200, zero descartes, p95 HTTP <500 ms e idade da simulação <1000 ms. Não certifica VPS ou 3.000 jogadores. Relatórios brutos ficam ignorados pelo Git, sem credenciais na documentação.

Medições intermediárias, antes de instrumentar atividade: apenas agrupar os atores ainda reprovou Party12 (480/480, p95 HTTP342 ms, idade1069 ms). Após reutilizar os inputs próprios, Party12 marcou189/642 ms, solo12 54/428 ms e solo50 529/1840 ms. São diagnósticos intermediários; não comprovavam quantos atores continuavam em combate. Um controle solo12 anterior teve atividade de teste concorrente no PC e não serve de benchmark isolado.

O runner foi reforçado: impede ticks apenas no banco descartável durante o aquecimento dos isolates, libera a agenda ao iniciar a janela e registra auto ativo, mortos, parados vivos e recibos de recompensa. Isso evita medir atores ociosos porque o setup ultrapassou a proteção contra gaps. Nenhum relógio do sistema, prazo de segurança ou dado do banco do jogo é modificado. O critério passa a exigir também zero atores vivos com auto interrompido, além dos critérios de latência existentes. A primeira coleta desse indicador teve alias SQL convertido para minúsculas e foi inconclusiva pelo erro do coletor; a chave foi corrigida, validada e o ensaio repetido.

| Código final, coletor corrigido, 30 segundos | HTTP200 | Descartes | p95 HTTP | p95 idade | Auto ativo / total | Parados vivos | Recibos de recompensa | Resultado |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Party12 | 480/480 | 0 | 162 ms | 658 ms | 12/12 | 0 | 104 | Passou janela curta |
| Solo12 | 480/480 | 0 | 65 ms | 482 ms | 12/12 | 0 | 90 | Passou janela curta |
| Solo50 | 2000/2000 | 0 | 468 ms | 1712 ms | 18/50 | 32 | 98 | **Reprovado** |

Nenhuma morte, falha de lane, reinício ou saída inesperada de worker nesses três ensaios. No perfil50, os dois workers solo chegaram a médias de1123/1771 ms por lote na última janela, adiando30/33 oportunidades; event loop API p99 de32 ms e pico de35 esperas no pool. A proteção existente contra gaps longos cancelou auto para32 atores vivos. HTTP200 sozinho esconderia essa degradação: **50 ainda não foi aprovado**, e 100/300/1000/3000 não foram executados.

As contagens e o throughput melhoraram, mas o processamento serial dos lotes ainda excede o orçamento de simulação. O próximo bloco precisa medir CPU/navegação por ator e limitar a duração dos lotes com recuperação durável e justiça entre atores; não desligar a proteção de offline nem ampliar conexões sem evidência. Janelas curtas não substituem soak, reconexão, comandos econômicos concorrentes e ensaio em máquinas separadas. RNG, aquecimento e distribuição das partições variam: os números não são comparação A/B estatisticamente controlada ou limite garantido de jogadores reais.

## Validação e operação

Testes de integração verificam orçamento de consultas, projeção pública sem inventário de terceiros, sete classes contra os leitores originais, atualização dentro da transação, rollback sem cache, validação de itens vinculados, uma escrita canônica e revogação durante a aquisição de locks. Suítes existentes verificam morte/recompensa única, distribuição de XP, falhas de ledger, controle e autorização cruzada. A homologação de navegador usa fixture HTTPS com banco isolado e workers reais; saves da demonstração preservados.

Operação: backup nativo e restauração verificada antes de substituir o runtime; compilar e reiniciar apenas API/HTTPS pelo supervisor contínuo, preservando PostgreSQL. Não exige migration nem alteração do Supabase. Manter a instalação local ativa ao final, conforme autorização de teste contínuo; `.env.server.local` conserva Auth desligado fora do processo supervisionado.
