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
e chave pública ES256 compatível. Na preparação funcional, a Data API desligada foi
confirmada diretamente no dashboard, sem chave privilegiada. As demais opções do
painel continuam informadas pelo proprietário. JWT de 900 s e política BFF de 24 horas absolutas/2 horas sem
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

## Preparação da homologação funcional — 31/10/2026

Executada sobre o código `89ce3a0`, exclusivamente no projeto de desenvolvimento e
em `https://localhost:9443/online/`. A autorização para preparar o ambiente não
inclui recuperação de senha, segunda conta ou envio ilimitado de mensagens.

| Verificação anterior ao cadastro | Resultado observado |
|---|---|
| Senha local de `mare_auth_runtime` | Substituída por valor aleatório novo; conexão nova passou; senha anterior recusada com SQLSTATE 28P01 |
| Chave local de cifragem | Substituída por 32 bytes novos; chave anterior não decifra registro sintético cifrado com a nova |
| Preservação na rotação | Nenhum registro cifrado, fluxo ou revogação pendente; nenhuma sessão perdida; banco sem restart e sem exclusão de dados |
| Proteção das credenciais | Valores não impressos; configuração somente em arquivos ignorados; nenhuma chave privilegiada Supabase utilizada |
| Data API no dashboard do projeto correto | `Enable Data API` desligado e mensagem `Data API is disabled`; nenhuma configuração alterada |
| Exposição automática de tabelas | Controle não visível enquanto a Data API está desligada; não habilitada para inspecioná-lo |
| HTTPS com adapter real ativo localmente | Readiness 200, CSRF 200, cookie de pré-autenticação Secure/HttpOnly/SameSite=Lax/Path=/; `/v1/me` sem sessão retorna 401 |
| Navegador | Tela de contas carregou após o proprietário aceitar somente o certificado local; sem mudança global de segurança |

Os testes de preparação, isoladamente, não emitem JWT de usuário nem comprovam
entrega de e-mail. A verificação funcional posterior está registrada abaixo; nunca
copiar token, identificador pessoal, cookie ou link de confirmação para evidências.

O [roteiro por autorizações](PHASE-2-DEVELOPMENT.md#aceitação-no-supabase-real--ainda-pendente)
separa o ensaio inicial dos testes adicionais. Ao encerrar a janela de homologação,
restaurar `AUTH_ENABLED=false` e encerrar apenas os processos locais do ensaio, sem
reverter as credenciais novas nem interromper PostgreSQL.

## Primeiro ensaio funcional real — 31/10/2026

O proprietário autorizou um e-mail sob seu controle e um único cadastro/envio no
projeto de desenvolvimento. Ele definiu a senha na tela local e submeteu o cadastro
uma vez. Não houve reenvio, recuperação, segunda conta ou criação de personagem.

| Fluxo | Resultado |
|---|---|
| Cadastro | Resposta neutra esperada; recebimento de uma mensagem de confirmação informado pelo proprietário |
| Login sem confirmação | **Inconclusivo**: o acesso foi permitido, mas o proprietário informou que abriu um link durante o ensaio; não foi estabelecido um estado ainda não confirmado no instante do login |
| Confirmação no provedor | `GET /auth/v1/user` com a sessão da própria conta informa e-mail confirmado; settings continua exigindo confirmação |
| Callback BFF/PKCE completo | **Pendente**: fluxo de cadastro ainda pendente na inspeção; o ensaio não comprovou seu consumo pelo callback neste perfil |
| Login com senha | Passou no provedor real e na aplicação local; uma conta e uma sessão local, sem personagem |
| JWT realmente emitido | Assinatura verificada com JWKS, issuer/audience esperados e ES256; `exp - iat = 900`; identidade do token corresponde ao usuário do provedor |
| Persistência | Tela autenticada permaneceu após reload da mesma aba |
| Logout local | Tela voltou ao login e permaneceu assim após reload; zero sessões locais ativas, uma revogada e fila de revogação remota vazia |
| Encerramento | `AUTH_ENABLED=false` restaurado; processos API/gateway deste ensaio encerrados; PostgreSQL mantido ativo |

O acesso permitido não deve ser apresentado como teste negativo aprovado nem como
falha confirmada do requisito: a sequência de confirmação foi alterada durante o
ensaio. Repetir esse caso requer uma conta ainda não confirmada e autorização
adicional para o destinatário/cadastro. Não desfazer confirmação, apagar a conta ou
usar chaves administrativas para fabricar esse estado.

Resultado parcial: login, JWT, reload e logout reais passaram. Confirmação obrigatória
em execução controlada, callback, recuperação, múltiplos dispositivos, refresh
concorrente e autorização cruzada continuam gates de homologação. A conta de teste
foi preservada; evidências visuais sem credenciais ficam fora do repositório.

## Rodada 1 — conta existente, 31/10/2026

Escopo confirmado pelo proprietário: somente a conta de teste existente, personagem
online próprio, duas sessões isoladas, duas abas no mesmo perfil, refresh real,
transferência de controle e logout local/global. Código do ensaio: `f189f2e`;
nenhuma alteração no runtime para produzir os resultados. Nenhum novo e-mail.

O acesso pelo Opera no Windows foi confirmado pelo proprietário depois de autorizar
confiança no certificado público local apenas em `CurrentUser\Root`. A validação
HTTPS normal do Windows passou. Foram observadas conexões locais de Opera e ChatGPT
ao mesmo gateway em loopback; não houve exposição externa, DNS ou relaxamento TLS.
Ver o [diagnóstico operacional](PHASE-2-DEVELOPMENT.md#diagnóstico-de-acesso-no-windows).

| Critério | Resultado da rodada |
|---|---|
| Perfis isolados | Passou: duas sessões BFF, dois tokens opacos distintos e duas sessões Supabase, vinculadas a uma única conta |
| Persistência | Passou: mesma conta/personagem na segunda aba; reload no Opera confirmado pelo proprietário; personagem preservado após reinício da API entre janelas |
| JWT e prazos iniciais | Passou: ambas as assinaturas ES256 verificadas com JWKS, `exp - iat = 900`; validade absoluta BFF de 24 h; configuração de inatividade de 2 h intacta |
| Controle entre abas | Passou: epoch 1 para 2; a aba anterior perdeu o controle mantendo o login |
| Controle entre navegadores | Passou: epoch 3 associado à outra sessão; a aba integrada perdeu o controle mantendo o login |
| Refresh após expiração e concorrência | Passou nas duas abas: JWT anterior expirado; novo JWT ES256/900 s com assinatura válida, access/refresh substituídos, mesma identidade, sessão BFF e sessão do provedor; expiração absoluta inalterada |
| Serialização observada | Espera por lock no PostgreSQL durante carregamento concorrente das duas abas; ambas terminaram autenticadas, sem duplicar sessão |
| Logout local | Passou: ambas as abas integradas voltaram ao login; somente a sessão do Opera permaneceu utilizável; fila remota drenada |
| Refresh no outro navegador após logout local | Passou: JWT anterior expirado, assinatura do novo JWT ES256/900 s válida; tokens substituídos, mesma identidade e sessão, prazo absoluto preservado; reload sem senha confirmado pelo proprietário |
| Logout global | Passou: executado com duas sessões ativas; zero sessões autorizadas pelo estado/epoch da conta; quatro registros revogados após manutenção; fila remota vazia; ambas as telas voltaram ao login após reload |
| Encerramento | Auth desligado e API/gateway/observador encerrados; PostgreSQL, conta e personagem preservados; certificado público continua confiável somente no usuário autorizado |

Os JWTs são comparados apenas em memória por observador de leitura. Evidências usam
contagens, aliases de sessão e resultados booleanos; nenhum cookie, token, senha,
e-mail, identificador de conta/personagem ou código de callback é registrado.
Não foram alterados relógio, `exp`, prazos no banco ou política para acelerar testes.

O logout global invalida pela versão de autorização da conta imediatamente; a
contagem de sessões utilizáveis deve verificar também `account_epoch = auth_epoch`,
além de prazos e `revoked_at`. Apenas contar linhas sem `revoked_at` não comprova
sessões autorizadas. A manutenção preenche posteriormente os registros revogados.

### Matriz de aprovação da Fase 2

| Bloco | Situação | Condição restante |
|---|---|---|
| Acesso local, HTTPS e origem | Aprovado nesta máquina | Serviços precisam estar ativos durante cada janela; confiança do certificado foi autorizada para o usuário atual |
| Rodada 1: sessões e controlador | Aprovada no provedor real | Manter os prazos aprovados; não confundir o ensaio de JWT de 900 s com espera de 24 h/2 h, cobertas em configuração e testes locais |
| Rodada 2: segunda conta e autorização cruzada | Pendente de autorização específica | Segundo destinatário próprio e elegível no SMTP; um cadastro/confirmação; negativo antes da confirmação, callback, personagem e tentativas cruzadas/overposting |
| Rodada 3: recuperação | Pendente de autorização específica | Dois envios planejados em janelas com cota disponível; fluxo não consumido expirado e fluxo válido; senha definida pelo proprietário; invalidação das sessões anteriores |
| Aceitação completa da Fase 2 | Não encerrada | Concluir os blocos pendentes; não iniciar a Fase 3 |

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
