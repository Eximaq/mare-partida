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

## Rodada 2 — execução real, 31/10/2026

Código do backend `591106c`, projeto exclusivo de desenvolvimento e origem
`https://localhost:9443`. O proprietário confirmou substituição de eventual
credencial exposta, coerência do SMTP e autorizou um cadastro/um e-mail para B.
Houve uma submissão de cadastro, sem reenvio ou recuperação. Após informar atraso
na chegada, o proprietário usou o link. O fluxo PKCE foi consumido, a conta B e sua
sessão foram criadas; JWT ES256/900 s e usuário confirmado/destinatário esperado
foram verificados em memória, sem publicar dados do usuário.

A página QA ficou somente em `infra/local/`, ignorada. O gateway usou a implementação
original e uma cópia byte a byte do cliente de contas, acrescentando apenas a página
de testes local. O backend, gameplay, mapas, HUD, Paper Doll, assets e saves não foram
modificados. Os testes de autorização usaram cookies reais nos dois perfis e APIs
reais, sem provider simulado nem chaves administrativas.

| Caso | Classificação e evidência |
|---|---|
| Entrega e callback PKCE válido | Aprovado: link usado pelo proprietário, fluxo consumido e sessão B emitida no contexto correspondente |
| Login antes de confirmar | Inconclusivo: o link foi aberto antes de executar a tentativa negativa; a confirmação não foi revertida |
| Identidades/sessões independentes | Aprovado: duas contas e sessões do provedor distintas; conta B verificada contra o destinatário autorizado |
| A acessa/controla/seleciona B | Aprovado: 20 casos HTTP; alvo alheio e inexistente retornam mesmo erro 404, sem dados de B |
| B acessa/controla/seleciona A | Aprovado: 20 casos HTTP equivalentes; personagem próprio permanece inalterado |
| Corpos com accountId/ownerId/characterId/extras | Aprovado: 400 nos contratos estritos, incluindo campos aninhados |
| IDs de rota/query adulterados | Aprovado: não mudam proprietário; query de seleção continua retornando apenas o personagem próprio. Parâmetros ignorados não foram apresentados como rejeitados |
| Concorrência com personagem B já existente | Aprovado: duas tentativas de criar outro personagem retornam 409/409; retries idênticos retornam 201/201 com o mesmo ID; um personagem por conta no banco |
| Corrida da primeira criação de B | Inconclusivo: ao observar a ferramenta, B já possuía personagem e o guard recusava nova criação. Nenhum personagem foi apagado para recriar o estado |
| Reutilização do link real | Aprovado: provedor retorna otp_expired e BFF rejeita invalid_auth_flow, sem novo código de autorização; nenhuma conta, sessão ou fluxo adicional; sessão B existente preservada |
| Entradas inválidas do callback | Aprovado como ensaio HTTP local: seis negativos, incluindo código ausente/duplicado/excessivo e fixture de pré-auth expirada; não equivalem a um link hospedado não consumido |
| Código real em navegador incompatível | Inconclusivo: não observado antes do consumo do link; negativo local sem correlação foi executado separadamente |
| Fluxo real não consumido até expirar | Bloqueado pelo escopo de um único envio, já utilizado no callback válido; otp_expired de link usado não comprova este caso |
| Preservação e encerramento | Aprovado: duas contas/dois personagens, Teste Alfa idêntico ao snapshot inicial; zero sessões autorizadas e fila remota vazia; Auth/API/gateway desligados; PostgreSQL preservado |

Uma expectativa incorreta do ensaio foi corrigida após conferir o roteamento:
`not-a-uuid` nem corresponde à rota e retorna 404; um UUID malformado que corresponde
à rota chega ao validador e retorna 400. Ambos foram verificados nos dois sentidos.
Isso não exigiu correção de produção. Não se observou falha real de autorização nos
40 casos; os cenários não observados continuam pendentes, sem aprovação presumida.

Evidências sanitizadas ficam fora do Git; IDs usados como alvos só aparecem na
configuração local ignorada do ensaio. Senhas foram digitadas pelo proprietário;
links foram usados em campo protegido, sem copiar conteúdo para chat/log/relatório.
Os casos de replay usam o link já consumido, não uma segunda mensagem.

### Janela adicional da Conta C

O proprietário autorizou um cadastro e um único e-mail para uma terceira conta sob
seu controle, preservando A/B. O destinatário fica somente no ambiente local ignorado.
A sequência reserva esse envio ao login negativo antes da confirmação, callback
PKCE válido no navegador original e corrida da primeira criação de personagem.
Não abrir o link em outro perfil: a verificação no provedor pode consumir a
confirmação antes de o BFF rejeitar a ausência de correlação. Esse teste real fica
pendente de um procedimento separado; os negativos locais não o substituem.

Antes da corrida, comprovar zero personagens para C e guardar uma referência local
dos personagens A/B. Disparar duas requisições simultâneas com nomes diferentes:
o contrato espera 201/409, exatamente uma linha persistida para C e nenhum efeito
em A/B. Repetições dos dados vencedores devem retornar 201 com o mesmo personagem.
Um guard da ferramenta impede executar a corrida com A/B ou personagem preexistente.

Um link não comprova simultaneamente confirmação válida e expiração sem uso.
A expiração real de um novo fluxo de cadastro exige outro envio e autorização
própria, ainda não concedida. Não alterar relógios, códigos, dados do provedor ou
personagens para fabricar o cenário. A autorização de C não inclui recuperação.

### Resultado da janela C e matriz consolidada — 31/10/2026

Backend sem alteração desde `e59b29f`; ferramenta QA exclusiva em diretório local
ignorado. O proprietário definiu a senha diretamente na aplicação, submeteu um
cadastro e, antes de abrir o link, tentou entrar com a mesma senha informada por ele.
O gateway registrou somente método, rota sem query e status: signup 202, login 401,
callback 303; nenhum corpo, cookie, código ou endereço de e-mail foi registrado.
Após o 401, o banco tinha duas contas, dois personagens e zero sessões autorizadas.
O link foi aberto no navegador original pelo proprietário; a identidade de C e sua
confirmação foram verificadas no provedor em memória, com JWT assinado ES256/900 s.

A consulta anterior à corrida confirmou zero personagens de C. Dois POSTs iniciados
em paralelo, com nomes diferentes e sessão real, retornaram 201/409. A consulta
posterior confirmou exatamente um personagem de C, três personagens no total e A/B
idênticos à referência anterior. Dois retries idênticos retornaram 201/201 e o mesmo
ID do vencedor. Não houve exclusão, recriação, escrita direta de personagens ou
alteração dos prazos aprovados.

| Cenário consolidado | Resultado | Limite ou risco residual |
|---|---|---|
| Autorização cruzada A/B | Aprovado anteriormente: 40/40 | Nenhuma falha de autorização observada nesse conjunto; não equivale a auditoria exaustiva |
| Login antes da confirmação | Aprovado em C: 401 e nenhuma sessão criada | Erro público permanece neutro; senha foi digitada pelo proprietário, não capturada pelo ensaio |
| Confirmação e callback PKCE válido | Aprovado em B e C; C retornou 303 no navegador original | Link válido foi reservado a esse fluxo |
| Identidades e sessões independentes | Aprovado; identidade C conferida contra destinatário autorizado | Nenhum identificador pessoal publicado |
| Primeira criação concorrente | Aprovado em C: 201/409, zero antes e uma linha depois | O ensaio cobre duas requisições concorrentes; não é teste de carga |
| Idempotência e limite de um personagem | Aprovado: retries C 201/201 com mesmo ID; B já coberto | A/B/C preservados, sem dados econômicos locais importados |
| Link real reutilizado | Aprovado anteriormente em B | Replay não comprova expiração sem uso |
| Entradas inválidas e correlação local | Aprovado em testes HTTP locais anteriores | Fixtures não substituem ensaio real com código válido em outro navegador |
| Código real em contexto incompatível | Recusa observada em D, mas prova completa inconclusiva | O controle positivo no contexto original falhou por expiração PKCE no provedor; repetir em janela curta, com novo envio especificamente autorizado |
| Cadastro real não consumido até expirar no BFF | Aprovado em E: 897 s, callback 400 e nenhuma sessão | Link ainda aceito pelo provedor (303 com código); não comprova expiração do link de e-mail no Supabase |
| Preservação e encerramento | Aprovado: A/B intactos, três contas/três personagens, zero sessões autorizadas e zero revogações pendentes | Auth false; API/gateway parados; PostgreSQL mantido ativo |

No início desta janela PostgreSQL já estava parado: conexão recusada e nenhum
processo observado. O início normal pelo helper documentado foi executado sem
parada deliberada, alteração de configuração ou inicialização de cluster. O banco
registrou recuperação automática e ficou pronto; A/B foram consultados antes do
cadastro. A causa da interrupção anterior não foi estabelecida. Essa observação
não comprova restauração de backup, RPO/RTO nem substitui um plano de recuperação
de desastre. Não houve tentativa de reproduzir o exercício stop/start bloqueado.

Nenhuma falha real foi observada nos casos desta janela. Nenhum segundo envio,
recuperação, merge, deploy de backend, alteração DNS ou Fase 3 foi executado.
As evidências sanitizadas permanecem fora do Git; o relatório contém apenas o resumo.

### Janela D/E — expiração real e limite do ensaio de correlação

Em 31/10/2026, o proprietário autorizou exatamente dois cadastros temporários e
dois envios, um por alias de Gmail sob seu controle. Nenhum reenvio ou recuperação.
As contas A/B/C não foram recadastradas ou alteradas. O cliente HTTP de teste chamou
o BFF HTTPS local com validação TLS, cookies separados por fluxo e senhas aleatórias
geradas em memória. As senhas não foram guardadas; estas identidades são temporárias
e não receberam personagens. Isso não representa um ensaio iniciado em dois
navegadores: o contexto original era um cliente HTTP isolado, e o contexto negativo
foi o navegador integrado sem os cookies daquele fluxo.

Os dois cadastros retornaram 202 e persistiram estado PKCE do provedor. A ferramenta
de controle do Opera interrompeu a primeira janela por não conseguir verificar a URL;
Auth/API/gateway foram desligados, PostgreSQL preservado. Após autorização para
continuar, retomou-se somente pelo navegador integrado, sem contornar a restrição
do Opera e sem novos envios. O relógio e os prazos não foram alterados.

O proprietário compartilhou os links no chat e confirmou que não os havia aberto;
depois identificou o destinatário do primeiro. Essa exposição é uma limitação do
manuseio do ensaio, não deve ser repetida. Relatório/PR não contêm links, códigos,
tokens, endereços pessoais ou credenciais. Artefatos privados ficaram cifrados em
diretório local ignorado; evidências sanitizadas permanecem fora do Git.

**D — correlação:** o provedor emitiu um código e o navegador sem a correlação
recebeu `invalid_auth_flow`. Antes do controle positivo, o banco continuava com três
contas/três personagens e zero sessões autorizadas; o fluxo D ainda tinha cerca de
84 s de validade local. Contudo, a troca no cliente HTTP original retornou 400 no
BFF. Leitura dos logs Auth do projeto identificou a causa remota: POST `/token`,
422, `invalid flow state, flow state has expired`. O dashboard confirmou D no
provedor, sem último login. Nenhuma conta/sessão local D foi criada.

Classificação: recusa segura observada, mas **prova completa inconclusiva por
expiração no provedor**, pois o controle positivo não demonstrou um código ainda
trocável. Não classificar como falha de autorização nem aprovar por equivalência.
A [documentação PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
descreve validade curta e uso único; o log remoto é a evidência da causa neste caso.
Não inferir o instante exato de início do prazo remoto apenas pelo redirect.
Repetir em janela curta, com acesso à mensagem preparado antes do cadastro e troca
imediata, exige outra confirmação especificamente autorizada. Não aumentar TTLs
para contornar o problema; revisar a compatibilidade dos prazos BFF/provedor antes
de prometer ao usuário dez minutos de conclusão garantida.

**E — expiração:** o fluxo local foi observado vencido sem uso. Imediatamente antes
da verificação, o dashboard mostrava E ainda sem confirmação/último login. Após
897 s desde o início, o link foi usado uma única vez: provedor 303 com código, BFF
400 `invalid_auth_flow` ao receber os cookies originais já vencidos, e `/v1/me` sem
autenticação. O ensaio deliberadamente reapresentou os cookies antigos para verificar
que o servidor não aceita esse replay; não alterou seus valores nem datas.
**Aprovada a barreira real de expiração do BFF.** O link do provedor ainda era válido;
expiração do próprio token de e-mail Supabase não foi ensaiada. O prazo local pode
recusar antes de alcançar a troca remota; não atribuir essa recusa ao provedor.

Encerramento: Auth false, portas 8788/9443 fechadas, PostgreSQL 55432 ativo,
três contas/três personagens no jogo, A/B/C iguais à referência inicial, zero
sessões autorizadas e zero revogações pendentes. D/E permaneceram no provedor,
sem personagem ou conta local criada. Nenhuma alteração de runtime, gameplay,
assets, saves, prazo de JWT/sessão, produção, DNS, merge ou Fase 3.

### Janela F — resposta perdida e correção do estado PKCE

Em 31/10/2026, após autorização de um cadastro/envio adicional e confirmação de
acesso à mensagem encaminhada, foi feita exatamente uma tentativa pelo BFF local.
O BFF retornou 202, mas persistiu estado PKCE vazio. Os logs Auth do projeto de
desenvolvimento registraram POST `/signup` 200 e confirmação solicitada com sucesso.
O fluxo local foi persistido cerca de 4,021 s após o início, compatível com o limite
de transporte de 4 s. Não houve reenvio, recuperação, uso do link ou criação de
conta/personagem/sessão no banco do jogo. A entrega deste e-mail não foi comprovada.

**Falha real de disponibilidade do callback:** em erro de transporte, o SDK remove
o verificador; o adaptador lançava erro e o serviço guardava um objeto vazio.
A aceitação remota do cadastro não garantia a preservação local do estado.
Não atribuir a falha ao SMTP nem registrar o ensaio de correlação como aprovado.

A regressão reproduziu o timeout real de 4 s com SDK real, servidor HTTP de teste
e PostgreSQL descartável: cadastro e recuperação falhavam no callback legítimo
antes da correção. O adaptador agora captura somente o estado PKCE antes da chamada
e o retorna em erros de transporte/servidor classificados pelo SDK como resultado
incerto. O serviço continua cifrando esse estado, vinculando-o aos cookies originais
e exigindo código válido, JWT verificado e usuário confirmado antes de criar sessão.
Erros explícitos de validação/limite continuam falhando; não há retry de envio,
aumento de timeout, alteração de TTL, aceitação de sessão imediata no cadastro ou
exposição do verificador ao cliente. A captura não recupera fluxos antigos vazios.

Após a correção, os testes comprovaram callback legítimo, rejeição de outro contexto
antes de consultar o provedor, rejeição de replay, apenas uma solicitação de envio
e restrição da sessão de recuperação. São regressões locais, **não homologação de
recuperação nem validação da correção no Supabase hospedado**. A repetição real da
correlação permanece pendente de novo destinatário/janela e orçamento de envio
especificamente autorizados. O envio F já foi consumido.

Validação desta correção: `npm run typecheck`, `npm run build`, `npm test`
(28 testes de fundação e 122/122 arquivos Node legados), `npm run test:integration`
(19/19, PostgreSQL local real) e `git diff --check`. A nova regressão falhou nos
dois cenários antes do patch e passou depois. Docker não foi executado neste Windows;
a CI Docker/Linux deve ser verificada no commit publicado, sem equipará-la a Supabase real.

Encerramento: Auth desligado, API/gateway encerrados, PostgreSQL preservado;
A/B/C e seus três personagens iguais à referência inicial, zero sessões
autorizadas e zero revogações pendentes. Gameplay, HUD, assets e saves intactos.

### Rodada 3 — proposta para aprovação separada

Usar uma conta de teste confirmada escolhida pelo proprietário, preferencialmente
C para reduzir interferência em A/B. Autorizar explicitamente destinatário, dois
envios de recuperação, troca de senha pelo proprietário e invalidação de todas as
sessões dessa conta. Não há autorização de execução nesta preparação.

1. Primeiro envio: deixar o fluxo de recuperação não consumido ultrapassar seu
   prazo real de 600 s no BFF, sem alterar relógios. Verificar rejeição e ausência de
   sessão de recuperação. Isso comprova a barreira local observada; não atribuir
   ao provedor uma expiração que tenha sido rejeitada antes de alcançá-lo.
2. Segundo envio, em janela com cota disponível: manter previamente duas sessões
   da conta selecionada, concluir callback no navegador original e verificar que
   a sessão de recuperação não permite APIs de personagem.
3. O proprietário define e submete a nova senha na tela local. Verificar sucesso,
   consumo da sessão de recuperação, rejeição da senha antiga, login com a nova
   senha e invalidação das sessões internas anteriores nos dois perfis. Conferir
   a fila de revogação remota e registrar qualquer pendência, sem presumir revogação
   imediata de JWTs já emitidos no provedor.
4. Rejeitar repetição do fluxo já usado sem novo e-mail. Fazer logout, desligar
   Auth/API/gateway e preservar PostgreSQL, contas, personagens e saves.

Os dois envios cobrem expiração e recuperação válida em fluxos separados. Eventuais
mensagens automáticas de segurança configuradas no provedor precisam ser conferidas
antes da autorização; não prometer quantidade total de mensagens sem essa leitura.
Expiração de recuperação deve ser registrada como tal; o cadastro E já comprovou
a barreira de expiração do BFF, sem provar expiração do token de e-mail do provedor.

### Matriz de aprovação da Fase 2

| Bloco | Situação | Condição restante |
|---|---|---|
| Acesso local, HTTPS e origem | Aprovado nesta máquina | Serviços precisam estar ativos durante cada janela; confiança do certificado foi autorizada para o usuário atual |
| Rodada 1: sessões e controlador | Aprovada no provedor real | Manter os prazos aprovados; não confundir o ensaio de JWT de 900 s com espera de 24 h/2 h, cobertas em configuração e testes locais |
| Rodada 2: contas e autorização cruzada | Parcial: 40 testes cruzados, confirmação, primeira corrida e expiração BFF aprovados | Correlação com controle positivo válido pendente: D expirou no provedor; F revelou perda do estado PKCE após resposta incerta. Correção passou em regressão local, ainda requer ensaio hospedado autorizado. Expiração do token de e-mail remoto não ensaiada |
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
