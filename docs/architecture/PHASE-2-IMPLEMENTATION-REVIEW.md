# Fase 2 — revisão da implementação de desenvolvimento

**Atualização de fechamento, 01/11/2026:** Fase 2 homologada nos cenários da
[matriz 2F](../operations/PHASE-2F-FINAL-ACCEPTANCE.md), PR #162 integrado em
`5b88df6` após 22/22 checks. Publicação somente estática; backend não publicado.
A próxima etapa está em [Fase 3 — estado](PHASE-3-SERVER-STATE-PLAN.md).
Os status datados abaixo são históricos, não pendências atuais implícitas.

**Status da revisão inicial:** `c8be42f`, oito checks CI aprovados, PR #162 Draft e sem conflitos
com main `8550cfa`. [Etapa 2F](../operations/PHASE-2F-FINAL-ACCEPTANCE.md):
preparação autorizada, execução externa e aceite final ainda pendentes. As
seções cronológicas registram o estado observado em cada commit; não tratar
bloqueios antigos já resolvidos como resultados atuais.

Revisão local em 31/10/2026. Branch `feature/auth-sessions`, criada a partir da
fundação aprovada `3addd2ae93c1d2862500ee0aea4ece9bff7fd217`. PR #160 permanece
Draft, aberto e sem alterações. Última main consultada: `8550cfa760bbee08565e98a6f7e4ff6927ea1ea2`.
A compatibilidade integrada é verificada pelo ref de PR e CI, sem merge na main.
As adições concorrentes no topo do README e em `.gitattributes` foram conciliadas
por commit normal na branch da Fase 2: preservam os links Rank A e regras de bytes
dos assets da main, junto das regras/documentação do backend. A atualização posterior
preserva também os links de HUD/Bari/Doku/Ito, a rota documental de HUD e suas regras
de metadados. Esses ajustes textuais não importam ou alteram o runtime do jogo nesta
branch; a integração completa continua pertencendo ao futuro merge autorizado.
A implementação Auth preserva os assets; a correção de compatibilidade autorizada
do PR #177 foi posteriormente incorporada conforme a seção final deste documento.
Os índices e regras adicionados para Rank S na main posterior foram igualmente
preservados por conciliação textual, sem alterar os arquivos do jogo nesta branch.

## Entrega implementada

- Contratos estritos, BFF em HTTPS de origem comum, cookie opaco Secure/HttpOnly,
  CSRF vinculado à sessão e Origin exato. Sem tokens do provedor no cliente.
- Adapter Supabase Auth com verificação JWT/JWKS, usuário confirmado, PKCE de uso
  único, recuperação restrita e limites de rede. Auth desligado por padrão.
- PostgreSQL com migração 0002, refresh serializado, expiração absoluta/inativa,
  rotação, logout local/global e fila cifrada de revogação remota.
- Um personagem por conta, proprietário derivado da identidade verificada, filtros
  de dono, concessão de controle por aba/dispositivo com epoch e prazo curto.
- Tela `/online/` isolada; nenhuma mudança em gameplay, mapas, HUD, Paper Doll,
  assets, portal, economia ou lógica de saves. Nenhuma coluna econômica acrescentada.
- Readiness com probe compartilhado e timeout; gateway bloqueia destinos absolutos,
  arquivos fora dos diretórios permitidos e headers de encaminhamento não confiáveis.

Testes de regressão reproduziram antes da correção: comparação Unicode de CSRF,
concorrência/timeout de readiness, privilégio SQL excessivo exigido por row lock de
personagem, revogação durante refresh, autorização concorrente com logout global,
redirecionamento de destino do gateway, classificação de 429 do provedor e retry
de logout após refresh. A versão final evita ampliar grants para contornar testes.

## Resultados observados

Preparação adicional de 31/10/2026: banco local separado `mare_auth_dev`, roles
próprias e zero contas/personagens, migrations 0001/0002 repetíveis, grants mínimos
verificados e smoke HTTPS real com health/ready 200. Auth permaneceu desligado
(rota CSRF 404), sem chamadas ao Supabase. O teste da política de sessão aprovada
falhou com o exemplo anterior e passou após atualização para 24 h/2 h.

| Ensaio local | Resultado |
|---|---|
| Build / TypeScript estrito | Passaram |
| Fundação, contratos, gateway TLS, SDK com JWTs locais | 28/28 após a política aprovada |
| Integração PostgreSQL real, incluindo role LOGIN mínima e resposta PKCE perdida | 19/19 após a correção da janela F |
| Legado Node | 122/122 arquivos; supa-browser tem harness separado |
| Python backend / hierarquia | 69 + 4 |
| Testes release native96 / Pages / portal | 3 + 1 + 3 |
| Catálogo native96 | 978 recursos; `native96-5dbae4385025f074` |
| Build Pages e portal | Passaram |
| Navegador HTTPS, perfis separados | Login, persistência/reload, duas abas, controle exclusivo, rotação, logout local/global |
| Tela de contas | Desktop 1365×900 e móvel 390×844, sem overflow horizontal |
| Save de demonstração descartável | Bytes iguais antes/depois de operações Auth; voltou ao porto por reload |
| Dependências de produção / workflow | npm audit zero; Actionlint passou |

O navegador usou um perfil descartável, banco UUID próprio e banner explícito de
provedor simulado. Cookie não acessível a JS; nenhum token em localStorage/sessionStorage.
Evidências visuais e logs ficam fora do repositório. Não foram lidos ou importados
saves pessoais. Fontes originais do jogo e assets não têm diff contra a fundação.

Docker não está instalado neste Windows. O workflow `authoritative-foundation.yml`
executa build, migrações repetidas, health, runtime não root e grants no Linux/Docker,
incluindo modo Auth ativo sem chamar um Supabase hospedado. Consultar o resultado
efetivo no Draft PR; configuração escrita não equivale a execução bem-sucedida.

## Aceitação e riscos ainda abertos

**A Fase 2 não está homologada no Supabase real.** Em 31/10/2026, o proprietário
informou ter criado/configurado manualmente o projeto gratuito `mare-partida-auth-dev`,
com confirmação obrigatória e JWT de 900 s. Depois de ele preencher a configuração
privada, foi autorizada e executada pré-validação remota somente GET: publishable key
aceita, Auth com confirmação obrigatória e JWKS ES256 compatível. A resposta 401 da
Data API não comprovava seu estado. Na preparação funcional posterior, o dashboard
do projeto confirmou `Enable Data API` desligado e `Data API is disabled`, sem
service_role/secret key nem alteração de configuração.
Configuração local válida e metadados remotos não substituem os ensaios de sessão.
SDK com servidor simulado não comprova o comportamento do ambiente hospedado. Ver o
[estado de preparação](../operations/SUPABASE-DEVELOPMENT-SETUP.md).

Política escolhida pelo proprietário em 31/10/2026: JWT/revalidação até 15 min,
sessão absoluta de 24 horas e inatividade de 2 horas. O exemplo e a configuração
privada local adotam esses valores. A preparação funcional autorizada substituiu a
senha de `mare_auth_runtime` e a chave de cifragem, rejeitou a senha antiga e confirmou
ausência de registros cifrados a migrar. Auth foi ativado apenas no ambiente local:
readiness/CSRF passaram e `/v1/me` sem sessão foi recusado; tela HTTPS real carregou.
Depois de autorização específica, o proprietário cadastrou uma conta e informou
recebimento do e-mail. Login real, JWT ES256 com assinatura válida e duração de 900 s,
persistência por reload e logout passaram; fila remota vazia. A recusa antes da
confirmação ficou inconclusiva porque um link foi aberto durante o ensaio. O callback
PKCE completo não foi comprovado. Não houve recuperação, segunda conta ou personagem.
Auth voltou a desligado e somente os processos API/gateway do ensaio foram encerrados.
Na Rodada 1 posterior, autorizada para a conta existente, passaram os dois perfis
isolados, persistência, refresh real após 900 s, concorrência entre abas com espera
de lock observada, transferência exclusiva de controle e logout local/global.
Ambos os perfis renovaram tokens com assinatura ES256 válida e prazo de 900 s, sem
trocar identidade ou estender o vencimento absoluto. O encerramento confirmou zero
sessões autorizadas, fila remota vazia e Auth desligado; conta/personagem preservados.
O acesso normal no Opera exigiu confiança explícita no certificado público apenas
no usuário Windows; TLS permaneceu validado e os serviços em loopback.

Na Rodada 2, um cadastro/e-mail autorizado resultou em confirmação e callback PKCE
válido, com sessão B independente e JWT ES256/900 s verificado. Passaram 20 casos
reais A→B e 20 B→A, sem leitura/controle/seleção de personagem alheio ou sobreposição
de dono por campos/IDs. Concorrência com B existente preservou o limite de um
personagem; replay do link não criou sessão. Teste Alfa permaneceu intacto. Não houve
mudança de código de produção: somente ferramenta local ignorada e documentação. O negativo de
login antes da confirmação e a corrida de primeira criação não foram observados;
correlação incompatível com código real e expiração não consumida não estão encerradas.
A janela terminou com duas contas/dois personagens preservados, zero sessões
autorizadas, fila vazia e Auth/processos locais desligados.

Na janela adicional C, o login antes da confirmação foi recusado (401, sem sessão),
o callback PKCE válido retornou 303 e a primeira criação concorrente retornou
201/409, com exatamente um personagem persistido. Retries idênticos: 201/201 com
o mesmo personagem. A/B intactos; JWT ES256/900 s; três contas/três personagens e
zero sessões autorizadas/revogações pendentes ao encerrar, com Auth/API/gateway
desligados e PostgreSQL preservado. Um único cadastro/envio, sem alteração de runtime.

Na janela D/E, dois cadastros/envios adicionais foram autorizados. E comprovou
expiração real do BFF: sem uso por 897 s, provedor 303 com código, BFF 400 sem sessão
com cookies originais vencidos. Não comprova expiração do token de e-mail remoto.
D foi recusado no navegador incompatível, mas o controle positivo também falhou:
logs Auth identificaram POST /token 422 por fluxo PKCE expirado no provedor, apesar
do prazo local restante. O ensaio completo de correlação permanece inconclusivo.
O cliente original era HTTP isolado, não outro navegador; links compartilhados
pelo proprietário no chat constituem limitação adicional. Sem novos personagens,
contas/sessões locais, mudança de runtime ou prazos; Auth/API/gateway encerrados.

Na janela F, o único cadastro autorizado retornou 202 local e 200 no provedor,
mas o estado PKCE ficou vazio após cerca de 4 s. O SDK apaga o verificador quando
a resposta falha, mesmo com cadastro aceito remotamente. Regressões reproduziram
a falha antes da correção usando SDK real e PostgreSQL descartável. O adaptador
agora preserva apenas PKCE antes da chamada quando o resultado é incerto, sem
retry de envio, alteração dos prazos ou afrouxamento das verificações do callback.
Os testes locais de cadastro/recuperação passaram; outro contexto e replay continuam
recusados. Naquele encerramento, a correção ainda exigia ensaio hospedado; não
reutilizava o fluxo F vazio nem autorizava outro e-mail. A/B/C preservados;
Auth/API/gateway desligados.

A janela G, já em `230e636`, concluiu correlação real com controle positivo válido:
um cadastro/envio, 400 no contexto incompatível e 303 no original com o mesmo código
em cerca de 33 s. Sessão válida, JWT ES256/900 s, replay 400 e logout 204/401.
O helper ignorado foi ajustado para respeitar exclusão de cookie com Max-Age=0;
nenhuma alteração de runtime. Original HTTP isolado e negativo no navegador;
não declarar dois navegadores neste caso. Quatro contas/três personagens, A/B/C
preservados, zero sessões/revogações e Auth/API/gateway desligados.
A perda de resposta remota não foi induzida: o ramo de timeout é coberto localmente.

A Rodada 3 foi executada com três recuperações especificamente autorizadas da
conta temporária G, sem personagem: preparação de senha/sessões, expiração real
sem uso e troca final. Callback expirado aos 614 s: 400; callback válido: 303 e
sessão restrita, JWT ES256/900 s. APIs de personagem recusadas com 401. Reset 200;
sessão de recuperação reutilizada 401; callbacks repetidos 400. Duas sessões
antigas passaram de 200 a 401; ambos os refresh antigos foram recusados pelo
provedor via adaptador (401). Senha antiga 401, nova 200; logout 204/401 e fila
remota vazia. Quatro contas/três personagens intactos, Auth/API/gateway desligados.
Não houve alteração de runtime, senha pelo chat ou chave administrativa. O ensaio
usou clientes HTTP isolados; não testou preenchimento interativo da nova senha.
Expiração comprovada no BFF, não no token de e-mail remoto; reset com resposta
perdida não foi induzido no provedor. Rodadas funcionais 1–3 executadas, sujeitas
à revisão final dos limites pelo proprietário; sem autorização de Fase 3/produção.

A CI de e54f802 passou fundação/Docker, mas a integração com main bddd32f falhou
em sprite-south-hurt.test.cjs: phoenix retorna clip null para hurt/south. A mesma
falha foi reproduzida em cópias exatas do teste, catálogo e resolver da main e do
ref de integração d851d543; esses arquivos são idênticos nas duas referências.
O teste passa no HEAD isolado da Fase 2. Bloqueio real de integração de gameplay,
fora da alteração documental desta rodada; nenhum asset/teste legado foi editado.
Compatibilidade textual sem conflitos não equivale a integração aprovada. Revisar
o contrato de hurt/asset/fallback de phoenix em tarefa separada, sem mascarar o erro.

Investigação posterior, somente leitura do runtime: a falha continua na main
93368fd, incluindo a atualização de habilidades do PR #171. O teste passa em
94508ab (pai da introdução) e falha em 85490a6 (introdução da Fênix). Entre 27
entradas do catálogo atual, somente phoenix não resolve hurt/south. Ela registra
idle, walk, attack e dash nas quatro direções; não há hurt-south.png no repositório.
Os 16 PNGs existentes foram conferidos pelo cabeçalho e todos correspondem às
dimensões declaradas. O teste geral sprite-combat-v2.test.cjs passa, mas não cobre
a nova forma nesse contrato; sprite-south-hurt.test.cjs detecta a omissão.

O efeito não se limita ao teste: game.js:2458 seleciona hurt após dano e o resolver
recusa substituir ações ausentes das formas jogáveis. A função real drawUpdatedZoan
foi executada isoladamente com o catálogo/resolver reais e canvas/imagens simulados:
antes do golpe houve um desenho; durante a reação, retorno false e nenhum desenho;
após 0,18 s, o desenho voltou. O chamador de mundo não desenha um substituto nesse
retorno. Isso demonstra a interrupção de desenho no caminho de código; não houve
validação visual em navegador nem uso de save. O TypeError de clip.image ocorre
na asserção do teste; o jogo retorna false nesse caminho, em vez de lançar esse erro.

Correção recomendada, ainda não implementada: localizar uma animação hurt/south
genuína da Fênix no material original aprovado e integrar seus metadados corretos,
preservando a regra South e a duração visual. A disponibilidade fora do repositório
não foi verificada. Se esse material não existir, a decisão artística e eventual
fallback específico precisam de aprovação antes de alterar o contrato. Não remover
phoenix do teste nem reaproveitar idle/attack como se fossem hurt para obter CI verde.
Acrescentar regressão do desenho durante dano e conferir no navegador com save
descartável quando a correção for autorizada. Nenhum gameplay, asset ou teste
produtivo foi alterado nesta investigação; Auth continua desligado.

Pendentes/limites: expiração específica do token de e-mail remoto (BFF já ensaiado),
preenchimento da nova senha na UI e perda de resposta no reset hospedado,
rotação de chave e revogação iniciada no painel, hospedagem de origem comum para produção,
retenção/chaves, proteção adicional contra abuso e testes de carga.

A recuperação de rede do pool PostgreSQL passou sem reiniciar o serviço. Restart
real/recuperação de desastre não foram testados: a restrição de segurança anterior
não foi contornada. Não há alegação de RLS; o backend aplica autorização por conta,
e a role runtime não altera identidade, atributos ou personagens existentes.

Ver [ADR 0002](ADR-0002-BFF-SESSIONS.md),
[operação e matriz real](../operations/PHASE-2-DEVELOPMENT.md) e
[preparação manual Supabase](../operations/SUPABASE-DEVELOPMENT-SETUP.md).


## Revalidação e contenção de publicação — 31/10/2026

Build e TypeScript passaram novamente; fundação 28/28 e integração 19/19 com
PostgreSQL real em bancos UUID descartáveis. O provedor destas regressões é
simulado; nenhum cadastro, e-mail ou recuperação hospedada foi executado.

A primeira execução de integração retornou `57P03`: o cluster local estava em
recuperação automática de uma interrupção anterior. A porta aberta não significava
readiness. Após `pg_isready` confirmar aceitação, a suíte completa passou. O log
registrou aviso de compartilhamento de `server.log` e conclusão da recuperação;
nenhuma proteção do Windows foi desabilitada. O launcher de 20 s não acompanhou
o tempo de recuperação (~37 s); isso permanece uma limitação operacional do helper.
Esta observação não equivale a teste planejado de desastre/restauração de backup.
Contagem final somente leitura: quatro contas, três personagens, zero sessões
ativas e zero revogações pendentes. Auth false, API/gateway não iniciados.

A correção artística aprovada da Fênix está isolada no PR #177 (`b08d0b2`),
baseado na main `8550cfa`: clipe nativo, regressão do desenho e navegador real.
A suíte do jogo nessa branch passou 135/135. O teste herdado do Paper Doll foi
corrigido após identificar uma variável de UI incluída indevidamente no hash;
os contratos das 22 armas continuam verificados. Nada disso foi incorporado
à branch de Auth. A CI integrada de #162 ainda depende da correção separada:
a main continua sem hurt/south. Não declarar integração verde apenas porque
os testes isolados de Auth passaram.

O conflito concorrente do README foi conciliado em commit normal, preservando
os quatro links de Forja/Contratos/Inventário presentes na main e os documentos
do servidor. Nenhum merge, rebase, alteração de gameplay ou Fase 3 foi iniciado.

O push inicial de #177 acionou um preview automático do portal estático na
integração Cloudflare preexistente. Após autorização, somente `76cb9297` e seu
alias foram excluídos, ambos com HTTP 404. Produção e outros previews preservados.
As branches de Auth, fundação e correção da Fênix foram excluídas dos previews
automáticos; novos commits desta tarefa usam também `[CF-Pages-Skip]`.
O build observado executava `tools/build_portal.py`, sem publicar o backend.


## Correção incorporada do PR #177 — 31/10/2026

Por autorização explícita, a branch de Auth recebeu a correção de `27f1953` e
`b08d0b2`, sem merge, rebase ou alteração da main. Como esta branch antecede a
Fênix, também recebeu somente os pré-requisitos de renderização de `8550cfa`:
catálogo, mapeamento e arquivos nativos da Fênix. Todas as entradas anteriores
do catálogo permanecem semanticamente idênticas. `game.js`, código do servidor,
economia, mapas, HUD, chaves de saves e políticas de sessão não foram alterados.

A aplicação literal criava conflitos add/add nos arquivos novos da main.
Para evitá-los, o catálogo e `phoenix/layout.json` permanecem iguais à main;
`install()` do renderizador registra o mesmo Hurt nativo do #177 somente quando
a entrada ainda não possui Hurt. Não usa outra ação como fallback e não sobrescreve
Hurt existente. O PNG é idêntico ao aprovado; `hurt-layout.json` preserva os
metadados e hashes originais. Os testes de desenho e de armas são os do #177,
sem remoção de asserções. A composição por `merge-tree` com `8550cfa` ficou sem
conflitos, sem atualizar refs nem realizar merge.

A regressão de desenho falhou antes do Hurt e passou após a correção. O teste de
armas verifica os contratos reais das 22 armas e não o texto de estado de UI.
Build/typecheck, 28 testes de fundação, 19 integrações PostgreSQL reais e
123/123 arquivos Node legados passaram após a adaptação final. O E2E Supa
permanece no harness separado, conforme a suíte oficial.
O provedor das integrações é simulado; não houve novo ensaio hospedado ou e-mail.
Build Pages e testes Python de Pages (1) e portal (3) passaram. No navegador,
a tela de criação carregou e uma fixture executou a função real de desenho:
quatro quadros visíveis em 0/50/100/150 ms, retorno a Idle norte em 181 ms,
sem alterar HP/orientação. Esse ensaio isola o renderizador; não representa uma
nova rodada de gameplay, login ou recuperação real. Helpers ficam fora do Git.

Esta correção remove a dependência de merge do #177 para validar #162. A CI deve
avaliar o novo commit contra main; os resultados anteriores de falha continuam
históricos. PRs #160 e #177 preservados, #162 continua Draft, Auth desligado.
Nenhum deploy ou início da Fase 3. As pendências funcionais e operacionais da
homologação permanecem as já registradas; corrigir CI não aprova produção.
