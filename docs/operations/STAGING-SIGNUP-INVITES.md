# Convite no cadastro do servidor de testes

## Fluxo e configuração

O site de staging abre diretamente em `/online/`, sem autenticação HTTP Basic.
Somente **Criar conta** solicita e-mail, senha e código de convite. **Cadastrar**
envia uma única solicitação; a confirmação de e-mail do Supabase continua
obrigatória. Login e recuperação de contas existentes não pedem convite.

A resposta de cadastro orienta explicitamente: se o e-mail já estiver vinculado a
uma conta, usar **Entrar** ou **Recuperar acesso**; repetir cadastro não altera a
senha. Essa orientação é a mesma para todos os cadastros aceitos, preservando a
proteção contra consulta pública de quais e-mails possuem conta. Não se apresenta
uma mensagem de erro de duplicidade quando o provedor não fornece essa certeza.

`SIGNUP_INVITE_CODE_SHA256` configura o SHA-256 hexadecimal de um código compartilhado
de alta entropia no ambiente privado do backend. O código nunca integra o cliente,
URLs, logs, documentação versionada ou banco. Ausência dessa variável só permite
Auth nas origens HTTPS de loopback `localhost`, `127.0.0.1` e `[::1]`. Em qualquer
outra origem o processo recusa iniciar, evitando que a perda da configuração abra
o cadastro. Em staging ela deve estar configurada **antes** de retirar o Basic Auth
do gateway. Código curto/previsível
não é apropriado. Para rotacionar, atualize o hash privado e reinicie somente a API.

A validação ocorre no servidor, com comparação em tempo constante, schemas estritos,
origem/CSRF e limites de requisições existentes. Código ausente ou incorreto retorna
403 antes de chamar o provedor. A resposta 202 permanece neutra: não prova entrega
SMTP nem distingue conta existente, nova ou indisponibilidade do provedor.

## Admissão e preservação

A migração `0057_signup_admissions.sql` adiciona uma tabela independente dos saves.
Guarda somente um HMAC do e-mail normalizado e uma validade de 24 horas. A chave do
HMAC deriva do cofre já configurado no servidor; não se guarda e-mail em texto ou
senha. O cadastro com código válido registra essa admissão antes da chamada externa
para tolerar a aceitação pelo provedor com resposta perdida.

O primeiro login confirmado ou callback PKCE válido consome a admissão na mesma
transação que cria a identidade interna e a sessão. Logins concorrentes não criam
identidades duplicadas. Confirmação feita fora do navegador original pode exigir
login normal, mas não um novo código, enquanto a admissão estiver válida. O callback
continua exigindo correlação PKCE. A sessão permanece em 24 horas absolutas e duas
horas de inatividade; o JWT do provedor não foi alterado.

Contas já existentes no banco do jogo continuam admitidas. Cadastro direto na API
pública do Supabase, sem admissão, não permite criar identidade/sessão no jogo. Isso
não restringe a API pública de cadastro do próprio provedor nem sua cota SMTP.
Admissões expiradas são removidas em lotes limitados. Rotacionar o convite não revoga
contas ou admissões anteriormente aceitas. Depois de 24 horas sem primeiro acesso,
é necessário iniciar novamente o cadastro com um convite válido.

Um callback recusado continua sem emitir sessão. Navegação HTML recebe um retorno
fixo à tela de acesso com orientação; consumidores JSON continuam recebendo o erro
400/403. A interface não declara confirmação concluída: informa que ela **pode** ter
ocorrido no provedor antes do erro e permite tentar login, sujeito às verificações
normais. Não reflete códigos/URLs recebidos nem reenvia e-mail automaticamente.

## Investigação do relato de confirmação em 13/11/2026

A API publicada desde 05:37 UTC tinha o hash de convite configurado e o Supabase de
desenvolvimento informou `mailer_autoconfirm=false`. A identidade mais recente,
criada na janela do relato, teve o e-mail confirmado no provedor às 19:49:29 UTC;
a conta interna e a sessão do jogo foram criadas às 19:50:59 UTC. Consulta somente
de leitura com a sessão dessa identidade, sem chave administrativa nem refresh.
Esses horários **não** demonstram entrada antes da confirmação. O vínculo dessa
identidade com o convidado ainda depende de confirmar o personagem informado.

Na mesma revisão publicada, uma tentativa sem convite foi recusada com
403 `invitation_invalid`, antes da chamada ao provedor. O desvio de convite
relatado não foi reproduzido. A admissão é consumida no primeiro acesso; os registros
disponíveis não permitem reconstituir cada ação do formulário nem a razão exata do
callback histórico. Não se afirma que o convidado abriu em outro navegador.

Regressão isolada reproduz o cenário possível: login antes de confirmação retorna
401; provedor confirma e-mail; callback em outro navegador retorna erro; login
posterior aceita somente a identidade previamente convidada. Sem admissão, login,
callback de fluxo antigo e recuperação continuam recusados. O fluxo PKCE não foi
relaxado para corrigir a mensagem.

A auditoria encontrou separadamente uma falha de configuração reproduzível: remover
o hash permitia cadastro aberto em origem externa. O teste falhou antes da correção
e passou após exigir o hash fora do loopback. Essa não era a configuração ativa da
VPS e não é apresentada como causa comprovada do relato.

Verificação final da correção:

- `npm run typecheck`, `npm run build`, `git diff --check`: aprovados.
- `npm test`: 312 testes foundation e 188 arquivos legados aprovados.
- 21 integrações PostgreSQL: Auth, HTTP, PKCE, resposta perdida na recuperação,
  privilégios e convites; todas aprovadas, sem pular testes.
- Navegador real desktop/390 px: cadastro inválido sem envio, confirmação obrigatória,
  callback válido, entrada, retorno inválido sem sessão e sem overflow. Apenas
  provedor simulado; nenhum envio SMTP real.
- Imagem Linux candidata recusa configuração externa sem hash antes de iniciar;
  configuração real preservada é aceita. Nenhuma migração necessária.

Aplicada somente à VPS de testes, imagem
`sha256:d08f328b801cf81a7df4746c7f097235aee8ac9600223939a628c1b66d4d2ab5`.
Backup verificado em
`/srv/mare-staging/incoming/rollback-auth-callback-20261113T201431Z`.
API pronta, cadastro sem convite 403, callback HTML inválido 303 sem cookie de sessão,
identidade anônima 401. A navegação pelo HTTPS público exibiu a orientação correta.
Mesmo container PostgreSQL; seis contas e cinco personagens antes/depois. Hashes de
`game.js`, `game-session.js`, HUD, gateway e configurações privadas preservados.
Somente módulos de configuração/rotas Auth e `login.js` atualizados; sem merge,
Pages, DNS, alteração de configuração Supabase, criação de conta ou envio de e-mail.

## Verificação em 13/11/2026

- TDD: convite ausente aceito e identidade não convidada aceita foram reproduzidos
  antes da implementação; regressões agora aprovadas.
- `npm run typecheck`, `npm run build`: aprovados.
- `npm test`: 308 testes foundation e 188 arquivos legados aprovados na execução
  final. A primeira execução teve uma falha de temporização no teste de reinício do
  worker (`simulation-pool`); seus quatro testes isolados e a suíte completa repetida
  passaram, sem mudar limites/assertivas desse teste.
- 21 testes de integração de autenticação, HTTP, PKCE, recuperação, privilégios,
  convites e WebSocket: aprovados. O teste de privilégios foi ampliado com o novo
  fluxo e reexecutado separadamente, aprovado usando a role restrita.
- Navegador Chromium/Edge real, desktop 1280×900 e móvel 390×844: convite somente no
  cadastro, campo obrigatório, código inválido sem envio, pedido válido único,
  login não confirmado recusado, callback e entrada autenticada aprovados. Provedor
  simulado e PostgreSQL descartável; nenhum e-mail real foi enviado.
- Cópia do banco da VPS: somente 0057 aplicada; segunda execução sem pendências;
  fingerprints das 89 tabelas preexistentes idênticos antes/depois. Privilégios da
  role de runtime e readiness verificados dentro da imagem Linux candidata.

## Aplicação e retorno

Fazer dump verificável antes da migração e guardar imagem/configurações anteriores.
Aplicar a migração com a role de migrations e conceder SELECT/INSERT/UPDATE/DELETE
somente na tabela nova à role de runtime (`infra/postgres/grant-auth.sql`). Ativar o
hash na API, validar a recusa sem convite e só então remover as duas diretivas
`auth_basic` do gateway. Não alterar a origem HTTPS, callbacks, DNS ou Supabase.

O retorno deve usar a imagem anterior **com o arquivo 0057 incluído**, para que a
verificação de histórico reconheça a migração já aplicada. Restaurar gateway com
Basic Auth, cliente e configuração anteriores. Deixar a tabela adicional e os dados
atuais intactos; não restaurar um dump antigo sobre progresso feito após a mudança.

Entrega SMTP e criação real de uma nova conta permanecem dependentes de uma janela
autorizada com destinatário específico. As verificações públicas após aplicação
devem usar apenas convites inválidos/ausentes e não enviar e-mails.

## Aplicação verificada na VPS

Código `4e8e9376`, imagem `mare-staging-server:invite-4e8e9376`, aplicada em
`https://teste.kaizokuidle2d.com.br`. Backup privado em
`/srv/mare-staging/incoming/rollback-invite-20261113T035717Z`; dump conferido por
`pg_restore --list`. API pronta (200), mesmo container PostgreSQL, cinco contas e
quatro personagens antes/depois, cliente de movimento com o mesmo SHA-256.

Pelo Chromium em sessão nova sem Basic Auth: página e script 200; `/v1/me` 401 sem
sessão; cadastro sem código 403 `invitation_invalid`; código inválido pela interface
exibiu a recusa esperada. Script público com SHA-256 idêntico ao artefato local;
formulário inspecionado em desktop e celular, sem overflow horizontal ou erros JS.
O cliente HTTP Python sem navegador recebeu 403 da borda; a validação do fluxo foi
feita no navegador real, não interpretando esse bloqueio como resposta da API.

Na primeira tentativa de ativação, a sonda HTTP direta omitiu o cabeçalho de
identidade exigido do proxy confiável e recebeu 400 `invalid_proxy_identity`. O
procedimento restaurou a imagem compatível e o gateway anteriores automaticamente,
com readiness 200, preservando a migração e os dados. A sonda local foi corrigida
para representar o proxy; a aplicação subsequente passou. Não houve relaxamento
da validação de identidade nem alteração da configuração do Supabase.

Nenhum cadastro hospedado ou envio SMTP foi executado nesta entrega. O PR continua
Draft, sem merge; site principal, DNS, gameplay e saves não foram alterados.
