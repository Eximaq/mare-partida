# Preparação manual do Supabase de desenvolvimento

O proprietário escolheu criar/configurar o projeto manualmente. Este roteiro não
autoriza o agente a criar recursos, alterar projetos existentes, contratar planos ou
enviar e-mails. Não forneça senhas, tokens, links de recuperação ou chaves no chat.

## Situação informada em 31/10/2026

O proprietário informou ter criado manualmente `mare-partida-auth-dev` no plano
gratuito, com e-mail/senha, confirmação obrigatória, JWT de 900 segundos e assinatura
assimétrica. Informou também Site URL `https://localhost:9443/online/`, retorno exato
`https://localhost:9443/v1/auth/callback`, Data API e exposição automática de novas
tabelas desativadas, e serviço de e-mail padrão com destinatário autorizado.

O proprietário preencheu URL, publishable key e algoritmo no arquivo local ignorado.
A pré-validação abaixo confirmou conexão Auth, chave aceita, confirmação obrigatória
e chave pública ES256 compatível. As demais opções do painel continuam informadas
pelo proprietário. JWT de 900 s e política BFF de 24 horas absolutas/2 horas sem
requisições autenticadas foram definidos por ele.

Data API desativada não muda a arquitetura: o BFF usa o serviço Auth, e as tabelas
de contas, sessões e personagens ficam no PostgreSQL do jogo, separado do Supabase.
Nenhuma migration do jogo deve ser executada no banco do projeto hospedado.

Antes de cadastrar contas ou enviar e-mails de confirmação/recuperação, solicitar
autorização específica para o projeto e os destinatários de teste. Para troca de
senha e logout remoto, combinar também o escopo das contas descartáveis. A criação
manual do projeto não equivale a autorização para esses ensaios.

## Pré-validação remota somente de leitura — 31/10/2026

Executada sobre a implementação `4b48b8a`, com autorização explícita para validar
configuração e conexão, sem cadastros/e-mails. Valores privados, URL do projeto,
identificadores de chaves e corpos completos de resposta não foram publicados.

| Verificação | Resultado |
|---|---|
| `.env.server.local` | Ignorado e não rastreado; sem campos duplicados; validadores da aplicação passaram |
| BFF e banco | Origem HTTPS local correta; PostgreSQL local `mare_auth_dev`, role runtime própria; 24 h/2 h |
| Chave de cifragem | 32 bytes válidos; não exibida |
| `GET /auth/v1/settings` com publishable key | 200; chave inválida de controle recebeu 401 |
| Configurações Auth expostas em settings | E-mail habilitado, `mailer_autoconfirm=false`, cadastro habilitado, anônimos desabilitados |
| `GET /auth/v1/.well-known/jwks.json` | 200; chave pública ES256 compatível importada para verificação, sem material privado |
| `GET /rest/v1/` | 401, exige chave secreta; não comprova a opção Data API desativada |
| PostgreSQL do jogo | Readiness passou; consulta READ ONLY confirmou zero contas, personagens e sessões; runtime sem privilégios elevados |

Todas as chamadas remotas foram GET, com TLS validado, redirects recusados e limites
de espera/resposta. O arquivo privado não foi alterado; `AUTH_ENABLED=false` permanece.
Não houve login, token de usuário, criação de sessão/conta, e-mail ou mudança remota.

Não se confirmou por esses endpoints: Site URL/allowlist de retorno, expiração real
de JWT emitido, entrega SMTP, flag Data API/exposição automática de tabelas ou plano
contratado. JWKS compatível não comprova qual chave assina uma sessão emitida agora.
Esses resultados não encerram a homologação funcional do Supabase. Não solicitar ou
usar uma secret/service_role key só para ampliar essa pré-validação.

Referências para interpretação: [settings do Auth](https://github.com/supabase/auth/blob/master/internal/api/settings.go),
[chaves de assinatura/JWKS](https://supabase.com/docs/guides/auth/signing-keys) e
[chaves de aplicação](https://supabase.com/docs/guides/getting-started/api-keys).

## Roteiro de referência

1. No dashboard Supabase, escolha uma organização **Free** e crie um projeto novo,
   por exemplo `mare-partida-auth-dev`. Confira o custo exibido antes de confirmar;
   se exigir pagamento ou upgrade, pare. Não reutilize um projeto existente. Escolha
   a região adequada ao seu teste; a região não será alterada pelo agente.
2. Guarde a senha do banco do Supabase em seu gerenciador. O jogo não precisará dessa
   senha nem de service_role/secret key: o banco do jogo permanece separado.
3. Em Auth, habilite e-mail/senha e **Confirm email**. Mantenha proteção contra reuso
   de refresh. Configure expiração do JWT em 900 segundos, conforme política aprovada.
   Use chave de assinatura assimétrica; registre o algoritmo e issuer públicos.
4. Configure Site URL `https://localhost:9443/online/` e permita exatamente
   `https://localhost:9443/v1/auth/callback`. Não use wildcard de produção. Links
   abrirão na máquina local, no navegador que iniciou o fluxo PKCE. O gateway local
   e o backend devem estar ativos antes do teste.
5. Para os primeiros ensaios, use e-mail sob seu controle permitido pelo serviço de
   e-mail padrão do projeto. Esse serviço tem limites baixos e restrições de
   destinatário: não garante entrega a usuários gerais. SMTP próprio é uma decisão
   separada; não habilitar serviço pago ou DNS para este ensaio.
6. Informe ao agente somente o nome e a URL pública do projeto quando estiver pronto.
   A publishable key e contas de teste serão preenchidas por você em arquivos locais
   ignorados, a partir dos exemplos fornecidos pela implementação. Não colocar chaves
   privilegiadas nem credenciais na linha de comando, screenshot, PR ou logs.
7. Antes de qualquer chamada real, combinar quais contas/e-mails de teste podem ser
   usados e autorizar explicitamente cadastro, envio de confirmação/recuperação,
   troca de senha e logout dessas contas. Não usar contas de jogadores reais.

O plano Free possui limites e projetos podem ser pausados por inatividade; consulte
a [página oficial de planos](https://supabase.com/pricing) no momento da criação.
Detalhes do [SMTP de teste](https://supabase.com/docs/guides/auth/auth-smtp) e das
[URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls).

Até a homologação real, testes locais/CI não devem ser descritos como validação do
Supabase hospedado. A etapa pode avançar em código, contratos e testes isolados, mas
permanece um gate de aceitação explícito.
