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
URLs, logs, documentação versionada ou banco. Ausência dessa variável mantém o
backend de desenvolvimento sem restrição de convite; em staging ela deve estar
configurada **antes** de retirar o Basic Auth do gateway. Código curto/previsível
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
