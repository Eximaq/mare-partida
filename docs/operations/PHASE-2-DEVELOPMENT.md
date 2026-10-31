# Fase 2 — executar e homologar com segurança

Base aprovada `3addd2a`, branch `feature/auth-sessions`, pasta de trabalho separada
`mare-partida-auth`. A pasta original e a branch/PR #160 não são modificadas.
Auth fica desligado até configuração explícita. Não há gameplay online, importação
de saves, administração de contas ou escrita de economia nesta entrega.

## Preparação local

Requisitos: Node indicado em `.node-version`, npm, Python para o build legado e
PostgreSQL 18.6. A migração é executada pelo owner; a aplicação usa somente runtime.
Não utilizar credenciais admin/owner em `.env.server.local`.

Na preparação local de 31/10/2026 foi criado o banco vazio `mare_auth_dev` na
instância de desenvolvimento já existente, sem restart. Foram criadas roles próprias
`mare_auth_owner` (migração) e `mare_auth_runtime` (aplicação), sem privilégios de
superusuário, criação de banco/roles ou bypass de RLS. As migrations 0001/0002 e os
grants foram aplicados nesse banco; repetição, readiness e negativas de privilégio
passaram. O banco da Fase 1 não foi migrado nem reutilizado.

As URLs correspondentes ficam somente em `.env.migration.local` e `.env.server.local`,
ignorados. A chave de cifragem foi gerada localmente sem saída em logs. O arquivo do
servidor mantém Auth desligado. O proprietário preencheu os campos Supabase e a
[pré-validação de conexão](SUPABASE-DEVELOPMENT-SETUP.md) passou em 31/10/2026,
usando apenas GET e publishable key; os ensaios com contas/e-mails aguardam autorização.
Os comandos Docker abaixo são uma **alternativa de instalação**: usam os nomes
genéricos `mare_owner`/`mare_runtime` em outra instância. Não reaplicar seus grants
sem adaptar a role à instância; no banco preparado, o destinatário é
`mare_auth_runtime`.

```sh
npm ci --ignore-scripts
npm run build
python tools/build_pages.py
npm run dev:certificate
```

O certificado usa arquivos novos em `infra/local/`, ignorados, e não altera trust
store ou DNS. Se já existirem, o comando falha em vez de sobrescrevê-los. O navegador
de teste pode aceitar **somente esse certificado local** em perfil descartável;
não desabilitar validação TLS para o processo Node ou para o Supabase.

### Diagnóstico de acesso no Windows

Usar exatamente `https://localhost:9443/online/`. O gateway HTTPS escuta em
`127.0.0.1:9443` e encaminha a API para `127.0.0.1:8788`. Os dois processos precisam
permanecer ativos durante a janela de teste. Depois do encerramento intencional,
recusa de conexão é esperada; a página não é um serviço publicado na Internet.

Não confundir `ERR_CONNECTION_REFUSED` com `NET::ERR_CERT_AUTHORITY_INVALID`.
Em 31/10/2026, foram observados os listeners Node no Windows e respostas 200 para
`/online/` e `/health/ready`. O proprietário apresentou depois uma tela de erro de
confiança do certificado. Não há evidência suficiente para atribuir o erro de conexão
anterior a uma causa única ou afirmar o estado da porta naquele instante específico.

Após autorização específica, apenas o certificado público local existente foi
importado em `Cert:\CurrentUser\Root`, com hash conferido. Nenhuma chave privada foi
importada; `LocalMachine` e opções globais de TLS não foram alterados. O cliente HTTPS
do Windows passou sem ignorar certificados, e o proprietário confirmou a abertura
normal da página no Opera, sem aviso. Essa confiança persiste entre janelas de teste;
sua instalação ou remoção exige escopo explícito, sem limpar outros certificados.

Não automatizar o aceite de avisos nem usar flags para ignorá-los. Diagnosticar a
confiança antes de testar contas; não usar HTTP como alternativa ao BFF seguro.
Embora o IP também alcance a página, `https://127.0.0.1:9443` é outra origem: seu
Origin foi recusado com 403. A origem localhost continua exigindo sessão (401 sem
autenticação). Cookie de pré-autenticação verificado: Secure, HttpOnly, host-only,
SameSite=Lax e Path=/; nenhum valor de cookie foi registrado.

Com Docker disponível, preencher `infra/env/compose.env.example` em um arquivo
ignorado `.env.compose.local`, usando senhas diferentes e aleatórias (hex evita
problemas de encoding na URL).
O projeto Compose `mare-auth-local` usa volume próprio e portas 55433/8788, sem
reutilizar a instância/volume da Fase 1. Não executar comandos `down -v` sobre dados.

```sh
docker compose --env-file .env.compose.local -f infra/compose.yaml up -d --wait postgres
docker compose --env-file .env.compose.local -f infra/compose.yaml --profile tools run --rm migrate
docker compose --env-file .env.compose.local -f infra/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U mare_owner -d mare_dev -f /opt/mare/grant-health.sql
docker compose --env-file .env.compose.local -f infra/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U mare_owner -d mare_dev -f /opt/mare/grant-auth.sql
```

Sem Docker, criar banco separado por procedimento autorizado do ambiente existente,
configurar `.env.migration.local` pelo template `infra/env/migration.env.example`,
executar `npm run db:migrate` e aplicar os dois grants como owner nesse banco.
Não reiniciar, reconfigurar nem tentar contornar restrições da instância existente.

## Janela adicional C — resultado e limites

Em 31/10/2026, um cadastro/envio adicional autorizado permitiu observar login 401
antes da confirmação, callback PKCE 303 e primeira criação concorrente 201/409,
com uma única linha para C. Retries idênticos retornaram 201/201 com o mesmo ID.
A/B foram preservados; Auth/API/gateway desligados ao final, PostgreSQL ativo.
Código válido em perfil incompatível não foi usado para evitar consumo do link;
expiração de cadastro sem uso exige outro envio e autorização específica.
Matriz consolidada e proposta da Rodada 3 em
[preparação Supabase](SUPABASE-DEVELOPMENT-SETUP.md#resultado-da-janela-c-e-matriz-consolidada--31102026).

## Ativação após preparação manual do provedor

A continuação D/E comprovou expiração do fluxo de cadastro no BFF após 897 s,
sem sessão criada. O token de e-mail remoto ainda era válido. A recusa no contexto
incompatível foi observada, mas o controle positivo falhou com 422 no Supabase por
PKCE expirado; manter o caso inconclusivo até repetição em janela curta autorizada.
Não estender prazos ou reenviar automaticamente para obter aprovação. Detalhes,
limitações de contexto HTTP/navegador e encerramento seguro constam na
[matriz e janela D/E](SUPABASE-DEVELOPMENT-SETUP.md#janela-de--expiração-real-e-limite-do-ensaio-de-correlação).

A janela F revelou perda do estado PKCE após resultado de transporte incerto,
apesar de cadastro aceito remotamente. O adaptador foi corrigido com regressão
prévia: captura apenas PKCE antes da chamada e o preserva cifrado para o callback
vinculado ao contexto original, sem reenviar o e-mail nem alterar limites de tempo.
As regressões locais passaram; naquele encerramento a confirmação hospedada e a
prova completa de correlação dependiam de novo envio especificamente autorizado.
O fluxo F já vazio não é recuperável pela correção. Ver
[evidências e limites da janela F](SUPABASE-DEVELOPMENT-SETUP.md#janela-f--resposta-perdida-e-correção-do-estado-pkce).

A janela G concluiu a prova de correlação em `230e636`: um único envio, mensagem
recebida no Spam, contexto incompatível 400 e mesmo código aceito no original (303),
com sessão válida e JWT ES256/900 s. O helper HTTP foi corrigido para apagar cookies
com Max-Age=0; isso não alterou o backend nem repetiu o envio. Replay 400 e logout
204/401; quatro contas e três personagens, A/B/C preservados, Auth/API/gateway
desligados. O original era HTTP isolado, não outro navegador. A resposta perdida
não foi forçada no provedor real; a regressão correspondente continua sendo local.
Ver [janela G e matriz atualizada](SUPABASE-DEVELOPMENT-SETUP.md#janela-g--correlação-real-com-controle-positivo-válido).

A Rodada 3 concluiu recuperação real na conta temporária G, com três envios
autorizados para permitir participação somente pelo celular: preparar senha e
duas sessões, esperar expiração real sem uso e executar a troca final. Callback
expirado aos 614 s recusado; fluxos válidos com sessão recovery/ES256/900 s.
Sessões restritas não acessam personagens. Troca final invalidou os dois contextos
e seus refresh remotos; senha antiga recusada, nova aceita, replay recusado e
logout confirmado. Clientes HTTP isolados, sem preenchimento de senha pela UI;
expiração remota do token de e-mail e falha de transporte no reset não induzidas.
Auth/API/gateway encerrados, quatro contas/três personagens preservados e nenhuma
revogação pendente. Ver [execução e matriz final da Rodada 3](SUPABASE-DEVELOPMENT-SETUP.md#rodada-3--recuperação-real-concluída-em-31102026).

Seguir [SUPABASE-DEVELOPMENT-SETUP.md](SUPABASE-DEVELOPMENT-SETUP.md). Não criar ou
alterar projetos automaticamente. Copiar `.env.example` para `.env.server.local`,
preencher runtime DB, URL do projeto separado, publishable key e algoritmo público.
Gerar a chave de cifragem local sem saída no terminal. Depois de remover somente a
linha placeholder `AUTH_ENCRYPTION_KEY` do arquivo local, pode-se executar:

```sh
node --input-type=module -e "import{appendFileSync,readFileSync}from'node:fs';import{randomBytes}from'node:crypto';const p='.env.server.local';if(/^AUTH_ENCRYPTION_KEY=/m.test(readFileSync(p,'utf8')))throw Error('Key already configured');appendFileSync(p,'\nAUTH_ENCRYPTION_KEY='+randomBytes(32).toString('base64')+'\n',{mode:0o600});"
```

Política aprovada pelo proprietário em 31/10/2026: JWT 900 s, sessão absoluta 86400 s,
inatividade 7200 s,
revalidação do provedor no máximo 900 s. Configuração não aceita ausência dos TTLs.
Atividade autenticada mantém a janela de inatividade, nunca a validade absoluta.
Revogação interna é transacional; detecção de revogação externa admite a janela de
revalidação. Recuperação/preauth duram 600 s; controlador 120 s, renovado a cada 30 s.

Só então alterar `AUTH_ENABLED=true` no arquivo privado e executar:

```sh
npm run dev:server
# Em outro terminal, na mesma pasta:
npm run dev:gateway
```

Abrir `https://localhost:9443/online/`. `/` continua sendo a demonstração. O servidor
Node em 8788 e PostgreSQL ficam em loopback. Não abrir portas públicas. A aplicação
continua recusando `NODE_ENV=production` nesta fundação.

Para executar a API no Docker, usar os dois arquivos Compose e ambos env files:

```sh
docker compose --env-file .env.compose.local --env-file .env.server.local -f infra/compose.yaml -f infra/compose.auth.yaml --profile server config --quiet
docker compose --env-file .env.compose.local --env-file .env.server.local -f infra/compose.yaml -f infra/compose.auth.yaml --profile server up -d --wait server
```

O overlay passa somente campos Auth enumerados; a URL do banco no container continua
usando runtime. Nunca imprimir `docker compose config` sem `--quiet`, ambientes,
cookies, URLs de conexão, links de recuperação ou payloads do provedor em evidências.

## Verificação reproduzível

```sh
npm run typecheck
npm run test:foundation
npm run test:integration
npm run test:legacy
```

Integração requer `.env.test.local` ignorado, com TEST_DATABASE_URL de administrador
**local**, apontando para `postgres`; cria/destroi somente bancos `mare_test_<UUID>`
do próprio ensaio. O teste de grants cria também role única descartável. Não usa
um banco de jogadores. Testa persistência, duas instâncias de serviço, expiração,
refresh concorrente, epoch, CSRF, overposting, IDOR, rollback e recuperação de rede.

`npm run test:auth-browser` abre API/gateway de teste em loopback com banner de
**provedor simulado** e banco UUID descartável. Usar endereços `@example.invalid`
e a senha pública de fixture `Local test password only`. Digitar `stop` no terminal
encerra apenas esse processo e remove somente seu banco. Não incluir esse harness
na imagem da API ou em homologação real. Ele não envia e-mails.

## Aceitação no Supabase real — histórico e limites

Estado atual: Rodadas 1–3 executadas, incluindo recuperação autorizada na conta
temporária G. Os itens abaixo registram preparação e ensaios anteriores; consultar
a [matriz atualizada](SUPABASE-DEVELOPMENT-SETUP.md#matriz-de-aprovação-da-fase-2)
para resultados e limites. Isso não autoriza merge, produção ou Fase 3.

O projeto e a configuração local foram preparados pelo proprietário. A conexão de
leitura, a troca das duas credenciais locais, a Data API desligada no dashboard e
o HTTPS com Auth ativo foram verificados. O primeiro ensaio real passou em login,
JWT ES256/900 s, reload e logout. A recusa antes da confirmação ficou inconclusiva
porque o link foi aberto durante o ensaio; callback completo segue pendente.
Auth voltou a desligado e os processos do ensaio foram encerrados. Ver o
[relatório funcional](SUPABASE-DEVELOPMENT-SETUP.md#primeiro-ensaio-funcional-real--31102026).
Na Rodada 1 posterior, passaram dois perfis, persistência, refresh real e concorrente,
controle exclusivo e logout local/global. Ver a
[matriz atual de aprovação](SUPABASE-DEVELOPMENT-SETUP.md#matriz-de-aprovação-da-fase-2).
Os testes abaixo continuam distintos dos testes locais com provedor simulado.

### Etapa inicial: uma conta autorizada

Combinar com o proprietário um e-mail sob seu controle, permitido pelo serviço de
e-mail padrão do projeto, e autorização específica para um cadastro e uma mensagem
de confirmação. A senha é definida por ele na tela local, sem passar pelo chat.

1. Submeter o cadastro uma única vez. A resposta neutra da API não comprova entrega;
   se não chegar, registrar pendência sem reenviar automaticamente.
2. Antes de abrir o link, testar uma tentativa de login com a senha correta: deve
   ser recusada e não criar sessão local autenticada.
3. O proprietário abre o link no mesmo perfil/navegador que iniciou o cadastro,
   preservando o cookie PKCE. Não compartilhar o link nem abri-lo em outro perfil.
4. Verificar sessão após confirmação, persistência por reload e login explícito.
   Validar assinatura de um JWT emitido com JWKS, algoritmo ES256 e `exp - iat = 900`
   somente em memória. Registrar apenas resultados e contagens, nunca tokens/claims.
5. Testar logout local e rejeição de acesso posterior. Aguardar a fila de revogação
   antes de encerrar. Não criar personagem, recuperar senha ou cadastrar segunda
   conta como consequência automática desta etapa.

### Etapas adicionais: autorização separada antes da execução

| Ensaio | Contas e operações necessárias |
|---|---|
| Recuperação | Mesma conta de teste; mais um e-mail de recuperação, senha nova definida pelo proprietário, teste de sessão restrita e revogação global |
| Autorização cruzada | Segunda caixa sob controle do proprietário; mais um cadastro e uma confirmação; um personagem novo por conta, leitura/controle cruzados devem falhar sem alterar personagens |
| Abas, dispositivos e refresh | Conta já autorizada em duas abas e dois perfis, espera pelo vencimento real, refresh concorrente, controle exclusivo, rotação e logout local/global |
| Revogação externa ou chaves | Escopo explícito da conta/projeto; apresentar antes qualquer mudança no dashboard, sem afetar contas fora do ensaio |

Não assumir que autorização de uma linha permite executar as demais. Um destinatário
adicional depende das restrições reais do SMTP gratuito; não contornar por serviço
pago, alteração DNS ou uso de endereço de terceiros.

Sequência econômica proposta para as próximas rodadas: zero e-mails nos testes de
sessão/controle; uma confirmação para a segunda conta; duas recuperações, uma para
deixar um fluxo não consumido expirar e outra para trocar a senha com sucesso. O caso
de callback expirado pode ser coberto pelo fluxo de recuperação do mesmo mecanismo
PKCE, identificando seu tipo na evidência. Isso não comprova expiração de um fluxo
de cadastro ainda não consumido; se esse caso adicional for exigido, planejar outra
mensagem e obter autorização própria. Callback já usado não prova expiração.

Na consulta à [documentação oficial do SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
em 31/10/2026, o serviço padrão limita o projeto a duas mensagens por hora e envia
somente para endereços da equipe do projeto. Confirmar elegibilidade e cota antes de
cada janela; dividir os três envios planejados entre janelas e nunca fazer retry
automático. Essa proposta não autoriza adicionar membros, mudar SMTP, alterar limites
ou enviar mensagens. A recuperação exige consentimento explícito para a conta,
dois envios planejados, senha nova definida pelo proprietário e invalidação global
das sessões anteriores. Não registrar senha, link ou códigos nos relatórios.

### Preparação da Rodada 2

Base aprovada `be2eb46`. Pré-validação de leitura confirmou uma conta, um personagem
Teste Alfa, zero sessões autorizadas e fila remota vazia. Auth permanece desligado
até o destinatário e um único envio serem confirmados. O endereço será preenchido
no arquivo ignorado `.env.round2.local`, campo `ROUND2_TEST_EMAIL`, sem senha/link.
O proprietário deve confirmar controle da caixa, elegibilidade no SMTP padrão e
cota disponível; não adicionar membros ou mudar SMTP para contornar restrições.

Procedimento após a autorização específica:

1. Abrir a janela HTTPS local com os TTLs aprovados. Manter a conta A em um perfil
   isolado e iniciar B no Opera, onde o proprietário abrirá o e-mail no mesmo perfil.
   Confirmar página correta antes do cadastro; senha definida pelo proprietário.
2. Uma única submissão de cadastro e uma tentativa de login antes de abrir o link.
   Esperado: recusa e ausência de sessão B autenticada. Se um scanner ou abertura
   antecipada confirmar a conta, classificar o negativo como inconclusivo.
3. Confirmar o e-mail no navegador original, antes de expirar o fluxo de 10 minutos.
   Verificar consumo único do fluxo, sessão B válida e retorno sem código na URL.
   Não copiar links/códigos para chat, PR, histórico de comandos ou logs de teste.
4. Verificar callbacks sem correlação, inválidos e reutilizados sem criar sessão.
   Não testar um código falso com a correlação original antes do callback válido:
   uma tentativa pode consumir o fluxo local. Isolar os casos negativos para não
   inviabilizar o único envio autorizado.
5. Identidades e sessões A/B devem ser distintas. Para criar B, enviar duas operações
   concorrentes com nomes diferentes: exatamente um personagem persistido, uma
   operação vencedora e conflito na outra; repetir a mesma entrada verifica a
   idempotência. Preservar identidade, dono e conteúdo do personagem A.
6. Pela sessão A, consultar e tentar controlar B, inclusive renovação/seleção pelas
   rotas disponíveis: resposta de não encontrado sem dados de B. Comparar com ID
   inexistente. Texto fora do padrão da rota recebe 404; UUID malformado que chega
   ao validador recebe 400. Não há seleção de gameplay
   online implementada; não inventar um endpoint para esse ensaio.
7. Enviar accountId, ownerId, characterId e campos extras nos corpos: contratos
   estritos devem recusar. Adulterar IDs de rota e query: nunca podem determinar
   dono ou ampliar autorização. Um parâmetro de query ignorado com segurança não
   equivale a autorização; registrar separadamente de uma rejeição explícita.
8. Conferir os dois personagens, ausência de alterações econômicas e respostas sem
   dados de terceiros. Encerrar sessões, drenar revogações, desligar Auth e processos
   locais; preservar PostgreSQL, contas e personagens. Não enviar recuperação.

**Expiração:** callback já consumido e depois repetido não comprova expiração de
fluxo não consumido. Com um único cadastro/envio, priorizar callback válido e replay.
O caso de expiração real não consumida fica bloqueado pelo orçamento autorizado,
até combinar outro fluxo/envio específico. Uma fixture local de expiração pode
complementar a regressão, mas não será rotulada como homologação real do Supabase.
Não alterar relógio, timestamps ou confirmação hospedada para produzir aprovação.

Classificar cada caso como aprovado, falha real, bloqueio do ambiente ou inconclusivo.
Falha real exige investigação/regressão antes da correção; bloqueio SMTP/cota não
autoriza retry automático. Nenhum resultado dessa rodada foi aprovado na preparação.

**Bloqueio observado em 31/10/2026:** após o proprietário informar o destinatário B,
a pesquisa de leitura no dashboard Team retornou zero correspondências em uma equipe
com um membro. O endereço fica apenas no arquivo local ignorado. Como o SMTP padrão
aceita somente endereços da equipe, a entrega real está bloqueada pelo ambiente;
nenhum cadastro ou envio foi tentado. Não adicionar membros ou conceder permissões
somente para contornar o limite. Uma alternativa SMTP de desenvolvimento precisa ser
planejada e autorizada separadamente, sem mudança DNS/produção ou custo automático.

Quatro regressões locais focadas passaram: contratos contra overposting, barreira
HTTP/CSRF, propriedade/limite de personagem e correlação/uso único de fluxo. Usaram
PostgreSQL descartável e provedor simulado; não validam o cadastro B hospedado nem
representam envio de recuperação. Auth e os processos de aplicação continuam
desligados; conta A e Teste Alfa preservados. Aprovações podem ocorrer pelo chat;
uma caixa de e-mail só pode ser lida após conexão autorizada, sem copiar links de
confirmação para o chat. Não há conexão Gmail confirmada nesta preparação.

**Rechecagem após configuração manual de SMTP:** o proprietário informou Gmail com
senha de app. O dashboard do projeto de desenvolvimento confirmou custom SMTP
habilitado, host `smtp.gmail.com`, porta `465` e formulário sem alterações pendentes.
Os valores de remetente e usuário estão protegidos pela interface; sua igualdade
não foi comprovada. O campo Password não foi lido, revelado ou alterado. A presença
de configuração salva não comprova que a senha está correta nem que houve entrega.

Uma conexão TLS do Windows local ao Gmail na porta 465 validou o certificado e
recebeu greeting 220, sem AUTH nem envio. Isso não comprova a conexão originada no
Supabase. A autenticação SMTP e a entrega seguem pendentes do único envio autorizado.
O bloqueio anterior por destinatário fora da equipe corresponde ao SMTP padrão,
substituído pela configuração personalizada; não atribuir falha de entrega sem teste.
Antes do cadastro, renovar a confirmação específica do destinatário/envio conforme
pedido atual; confirmar que remetente/username representam a conta Google correta e
que eventual senha compartilhada no chat foi revogada e substituída. Não solicitar
valores de senha. Auth e processos locais permanecem desligados nesta pré-validação.

Na execução real posterior, o único cadastro/e-mail autorizado produziu callback
válido e sessão B. Os 40 testes de autorização A/B, concorrência para personagem já
existente e replay passaram. O link foi aberto antes do negativo de login, e a
primeira criação não foi observada na ferramenta; esses casos não foram aprovados.
Expiração real não consumida e código real no navegador incompatível continuam
pendentes conforme o [relatório e classificações](SUPABASE-DEVELOPMENT-SETUP.md#rodada-2--execução-real-31102026).
Não houve recuperação, reenvio ou correção de código de produção. Conta A/Teste Alfa e B foram
preservados, com um personagem por conta. A janela foi encerrada com Auth e processos
locais desligados, zero sessões autorizadas e fila de revogação remota vazia.

### Matriz completa a executar conforme as autorizações correspondentes

1. Cadastro com confirmação obrigatória: login antes de confirmar falha; link no
   mesmo navegador cria sessão. Link repetido, expirado e em outro perfil falha.
2. Login em duas abas e dois perfis/dispositivos. Inspecionar atributos do cookie
   sem copiar valores; nenhum access/refresh token em JS/localStorage/URL final.
3. Criar um personagem; recarregar e reiniciar somente a API autorizada: mesma
   identidade persistida. Conta B não lê/controla personagem A (404 indistinguível).
4. Abas concorrentes no vencimento de JWT: refresh serializado, sem perda de sessão;
   observar somente contagem/status. Expiração absoluta/inativa não é prorrogada.
5. Controle exclusivo: confirmação para assumir, epoch anterior rejeitado. Rotação
   do cookie invalida o anterior; requisição concorrente pode pedir nova tentativa.
6. Logout local preserva outro dispositivo; logout global e recuperação invalidam
   todos. Indisponibilidade do provedor mantém revogação interna e fila de retry.
7. Recuperação por e-mail gera sessão restrita: não cria personagem nem assume
   controle. Troca de senha exige novo login e consome o fluxo. Testar retorno perdido.
8. Revogar no dashboard somente a conta de teste autorizada; verificar rejeição após
   janela declarada. Conferir rotação de chave/JWKS e limites reais do projeto/SMTP.

Registrar data, commit, casos/status e projeto público; nunca guardar mensagens de
e-mail, dados pessoais, senhas ou tokens. Mocks/SDK com JWT local não substituem isso.

## Limites operacionais antes de exposição pública

- Escolher hospedagem com origem HTTPS comum; Pages estático não executa o BFF.
- Manter os TTLs aprovados; definir limites por IP atrás de proxy confiável e proteção adicional de abuso.
  IP não autoriza contas. O gateway local remove headers de origem de IP não confiáveis.
- Definir retenção de metadados e gestão/backup da chave. Tokens expirados/revogados
  são apagados por lotes; metadados de sessão ainda não têm retenção automática final.
  Rotacionar a chave atual exige invalidar sessões/fluxos e reconciliar a fila remota
  antes de trocar: não há keyring de múltiplas versões implementado.
- O reset remoto não é atomicamente acoplado ao PostgreSQL. Falha incerta revoga
  sessões locais e pede novo login/recuperação; não anuncia troca de senha confirmada.
- Sem teste de carga, recuperação por restart PostgreSQL ou recuperação de desastre.
  A interrupção/restauração de rede foi testada sem reiniciar o serviço protegido.
- Scripts de migração não apagam saves; não há migração de economia ou progressão.
