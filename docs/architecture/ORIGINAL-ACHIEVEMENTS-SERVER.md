# Conquistas originais e pontos de talentos no servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

Base: main `9c90f4e` (talentos originais, PR #210). O Diário de Conquistas original
continua dentro do jogo. Não há importação de progresso nem alteração dos saves
da demonstração, arte, mapas, HUD ou Paper Doll.

## Escopo e regras

O catálogo original contém 31 conquistas e 72 pontos possíveis. Neste incremento,
18 conquistas podem ser comprovadas pelo servidor: mortes de monstros, ouro ganho,
nível, pico de poder permanente e cinco ilhas distintas. Elas concedem até 36
pontos. As outras 13 continuam visíveis e indisponíveis enquanto Impel Down,
frutas, Haki, desbloqueios de viagem rápida e recompensas de chefes não tiverem
eventos autoritativos. Não se usa a disponibilidade dos módulos offline para
habilitar essas conquistas online.

`achievement.claim` recebe somente `{achievementId}`, dentro do envelope existente
de requestId, versão e controlador. Sessão, CSRF, propriedade, versão, limite de
requisições e controle exclusivo são verificados pelo backend. Não são aceitos
contadores, pontos, moedas, dano, relógios, accountId ou ownerId do cliente.

O nível e os eventos persistidos determinam a elegibilidade. O orçamento de
talentos é `nível + soma dos resgates únicos`; o reset devolve os investimentos
sem perder esse bônus. Resgatar não altera XP, ouro, inventário, build ou recargas.
Atualiza a revisão de talentos para invalidar prévias feitas com orçamento antigo.
Resgate, revisão, versão e recibo são uma única transação. Repetir o mesmo requestId
reproduz o recibo; nova intenção não concede novamente a mesma conquista.

## Observação de progresso

- Mortes vêm do worker de combate e dos recibos de vitória anteriores à integração
  original. O spawn recompensado não pode ser creditado duas vezes.
- Ouro conta somente deltas positivos confirmados. Gastar não reduz o acumulado;
  saldo anterior é um piso de compatibilidade, sem duplicar o valor em cada leitura.
- Poder usa equipamento, atributos e build confirmados, sem runtime de combate,
  bênçãos temporárias ou prévias. Observa antes/depois de mudanças, preservando o
  pico mesmo ao desequipar ou redefinir talentos.
- Visitas usam somente viagens concluídas e IDs canônicos. Abrir mapas, leituras,
  movimento e repetição da mesma ilha não aumentam a quantidade de destinos.
- Contadores são limitados à maior meta do catálogo. Leituras não gravam progresso
  nem concedem recompensas; a interface recebe disponibilidade e metas do servidor.

## Migração e operação

`0023_original_achievements.sql` acrescenta progresso, visitas e resgates. Resgates
e visitas são imutáveis para a role de runtime; ela só atualiza as três colunas de
contadores. SQL limita pontos/metas aos valores exatos do catálogo e mantém
unicidade por personagem/conquista, requestId e versão, com FK diferida ao recibo.
Todas as consultas com entradas variáveis são parametrizadas.

A migração reconstrói moedas e mortes dos ledgers existentes, deduplicando eventos
econômicos por requestId, e visitas de recibos de viagem bem-sucedidos. Não importa
resgates do navegador nem concede recompensas automaticamente. O pico histórico
de poder não pode ser reconstruído sem observações antigas; começa pela configuração
permanente atual, preservando máximos a partir deste incremento. Migrações anteriores
permanecem intactas e o hash do motor de combate não foi alterado.

Fazer backup consistente, parar API/gateway, executar migrations como owner,
aplicar `infra/postgres/grant-auth.sql` e reiniciar a instalação local. A role usada
pela aplicação não ganha permissões de migração. GitHub Pages publica o cliente
estático; o backend e PostgreSQL continuam restritos ao computador local.

## Validação

- `server-achievements.test.mts`: PostgreSQL real descartável, transações, concorrência,
  replay, rollback, worker, riqueza após gastos, visitas, poder sem buffs, HTTP/CSRF,
  acesso cruzado, revogação de controlador/sessão, grants e migração preservadora.
- `achievements-client.test.mts`: contrato estrito, catálogo, disponibilidade online
  e ausência de gravações offline no caminho de resgate.
- `achievements-online-browser.cjs`: navegador real com respostas BFF simuladas,
  diário original, resposta perdida/reload/replay, investimento do ponto adicional,
  reset, desktop/mobile e preservação da chave de save. A fixture de interface não
  substitui os testes SQL; nenhum teste deste bloco usa o Supabase hospedado.
- Suítes legadas e navegador offline verificam a demonstração. O CI também executa
  Linux, Docker Compose, migrações e permissões nas imagens construídas.

Este bloco não conclui a migração integral do jogo. Os domínios dependentes seguem
no manifesto `FULL-SERVER-SCOPE.json`; presença compartilhada e grupos são escopo
multiplayer adicional. A revisão de capacidade/carga será repetida após a integração
dos domínios restantes: observar poder adiciona consultas às mutações autorizadas.

A atualização local foi executada com backup e API/gateway parados. Os hashes das
35 tabelas anteriores permaneceram idênticos: quatro contas, três personagens,
23 migrações e zero resgates artificiais. HTTPS foi reiniciado e verificado com
TLS válido e recusa 401 sem sessão. O navegador também detectou e cobriu a correção
da revisão da prévia ao reabrir talentos após resgate ou reconexão.

Atualização de Impel Down: as quatro metas de andares agora usam o progresso
confirmado do servidor. São22 conquistas disponíveis/47 pontos, com nove metas
ainda dependentes de outros domínios. Ver [prisão online](ORIGINAL-PRISON-SERVER.md).
