# Convite no cadastro do servidor de testes

## Fluxo e configuração

O site de staging abre diretamente em `/online/`, sem autenticação HTTP Basic.
Somente **Criar conta** solicita e-mail, senha e código de convite. **Cadastrar**
envia uma única solicitação; a confirmação de e-mail do Supabase continua
obrigatória. Login e recuperação de contas existentes não pedem convite.

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
