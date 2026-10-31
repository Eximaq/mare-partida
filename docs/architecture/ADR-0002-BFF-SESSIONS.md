# ADR 0002 — BFF e sessão opaca do jogo

Estado: direção da Etapa 2A aprovada pelo proprietário e implementada para desenvolvimento.
Gate de origem comum passou em HTTPS local e navegador; homologação Supabase real pendente.
Base: fundação 3addd2a, branch própria
feature/auth-sessions. PR #160 permanece isolado e sem merge.

## Viabilidade de origem comum

O cliente é estático e suas chamadas novas podem usar caminhos relativos `/v1/`.
Cloudflare Pages/GitHub Pages atuais publicam conteúdo estático: não executam este
servidor Node nem fornecem por si só uma origem comum para ele. Não acrescentaremos
CORS permissivo, cookies entre sites ou tokens em localStorage para contornar isso.

Para desenvolvimento, um gateway HTTPS limitado a loopback terá uma única origem
`https://localhost:9443`: `/online/` serve o cliente de contas separado, `/v1/` e
`/health/` encaminham ao backend de loopback; `/` serve exclusivamente o build `dist`
da demonstração. Nenhum arquivo do checkout é servido. Certificado e chave de teste
são locais, ignorados; não instalar raiz de confiança global nem alterar DNS.

Gate: teste HTTPS real verifica rota estática + API, Set-Cookie Secure/HttpOnly,
encaminhamento de cookie e isolamento de arquivos; navegador usa o mesmo origin.
Publicação futura requer proxy/origem única explicitamente aprovada. Ela não é
necessária para desenvolver/testar localmente e não será criada nesta tarefa.

| Opção | Vantagem | Custo/risco | Decisão |
|---|---|---|---|
| BFF + cookie opaco | Tokens Supabase fora do navegador; revogação interna imediata | Estado no servidor, CSRF, refresh serializado, gateway comum | Escolhida para desenvolvimento após gate |
| SDK no navegador + bearer | Facilita frontend em host estático separado | Tokens acessíveis a JS; persistência/refresh no cliente; ainda exige autorização e revogação | Alternativa se hospedagem futura impedir BFF; exige nova decisão |

## Contratos e invariantes

- Supabase Auth: e-mail confirmado, senha e recuperação; projeto gratuito separado
  criado/configurado pelo proprietário. Sem service_role ou acesso administrativo.
- PostgreSQL do jogo privado, separado de auth.*. Runtime não é owner; grants mínimos,
  consultas parametrizadas, migrations incrementais. Identidade `(issuer, sub)` validada
  no servidor; IDs de conta/personagem nunca são prova de autorização.
- Sessões opacas de 256 bits em cookie __Host, Secure, HttpOnly, SameSite=Lax, Path=/.
  Somente hash no banco; tokens do provedor cifrados com AEAD e chave fora do Git/banco.
  Ambiente de desenvolvimento usa HTTPS; não há cookie inseguro alternativo.
- CSRF vinculado ao cookie + Origin exato em toda mutação, inclusive login/logout.
  Preauth expira, tem assinatura e serve apenas para CSRF, nunca identifica jogador.
- Uma conta possui um personagem. A criação aceita nome/classe/facção do catálogo;
  nenhum XP, ouro, atributo, item, owner/account ID ou save local é aceito.
- Vários dispositivos podem autenticar. Controle do personagem é uma concessão
  separada, com token por aba, prazo curto e epoch monotônico; aquisição concorrente
  falha com conflito. Takeover explícito exige epoch esperado, autorização de dono e
  revoga o controlador anterior. Comandos de gameplay continuam inexistentes.
- Rotação do cookie invalida o anterior atomicamente, sem janela de reutilização.
  Duas abas atualizam CSRF após rotação; resposta perdida pode exigir novo login.
  Login/reautenticação nunca adota um identificador escolhido pelo cliente.
- Refresh serializado com row lock no PostgreSQL e tempo limitado no provedor;
  falha definitiva revoga; falha transitória não estende validade nem destrói dados.
  Logout local/global revoga sessões internas antes de tentar logout do provedor.
- Recuperação usa PKCE com correlação à origem/navegador, uso único e sessão restrita
  a trocar senha; não permite acessar personagem. Troca concluída revoga sessões
  internas anteriores e exige novo login. Fluxo incompleto não concede autoridade.

## Política temporal aprovada em 31/10/2026

O proprietário escolheu a opção mais curta, substituindo a proposta inicial de
7 dias/24 horas: JWT de 15 minutos; sessão interna com validade absoluta de 24 horas
e ociosidade de 2 horas sem requisições autenticadas. Atividades idle normais podem
manter sessão.
Revogação interna imediata. Revogação externa detectada no próximo refresh, limitado
a 15 minutos; operações em curso têm deadline próprio. Refresh não estende validade
absoluta. As durações são configuração validada, não constantes dispersas. Preauth e
fluxo de recuperação: 10 minutos; controle por aba: 120 segundos, renovável enquanto
sessão/dono/epoch forem válidos. Rate limits iniciais conservadores, documentados por
rota; não usar IP como identidade e não confiar em X-Forwarded-For arbitrário.

## Rotas propostas

| Método/rota | Contrato | Proteção |
|---|---|---|
| GET /v1/auth/csrf | Retorna token CSRF; emite preauth se necessário | Sem autoridade de conta; no-store |
| POST /v1/auth/signup | e-mail e senha | CSRF/origin, limite, resposta neutra |
| POST /v1/auth/login | e-mail e senha | CSRF/origin, limite, confirmação de e-mail, nova sessão |
| POST /v1/auth/recover | e-mail | Resposta neutra, PKCE, correlação assinada |
| GET /v1/auth/callback | código + fluxo correlacionado | Consumo único; redirecionamento fixo, sem tokens na URL final |
| POST /v1/auth/reset | nova senha | Somente sessão de recuperação, CSRF/origin |
| POST /v1/auth/logout | scope local/all | Revogação interna transacional |
| POST /v1/auth/rotate | corpo vazio | Sessão, CSRF/origin, invalidação do cookie anterior |
| GET /v1/me | Sem account ID | Identidade e personagem mínimo da sessão |
| POST /v1/characters | nome/classe/facção | Sessão, CSRF/origin, unicidade transacional |
| GET /v1/characters/:id | UUID | ID + account autenticada na mesma consulta |
| POST /v1/characters/:id/control | epoch esperado opcional | Dono, sessão, CSRF; conflito em concorrência |
| POST /v1/characters/:id/control/renew | epoch e token de controle | Dono + sessão + token + epoch, sem comandos de gameplay |

Limite de corpo antes de JSON, campos extras rejeitados, erros sanitizados, respostas
de conta inexistente/de outro dono indistinguíveis, ausência de CORS. Readiness terá
um probe por vez, deadline e limite de conexões; timeout não inicia probes adicionais
enquanto o anterior não se resolver. Autenticação desligada por padrão sem configuração.

## Homologação e publicação

A aplicação continua desabilitada por padrão. Os TTLs acima foram escolhidos pelo
proprietário e seguem configuráveis: a ativação exige valores explícitos. Rotação
opaca ocorre no login, callback e endpoint de renovação; não há rotação periódica
automática nem período de tolerância para reutilizar cookie substituído. Refresh do
provedor é serializado por sessão. A fronteira autorização/escrita adquire lock da
conta após refresh, revalida epoch e serializa logout global. Um controlador recebe
um token e epoch; qualquer futuro comando deverá validá-los na mesma transação.

O gateway é ferramenta de desenvolvimento, não proxy de produção. Como não confia
em X-Forwarded-For, o limite por IP agrega clientes atrás dele; isso é conservador
para homologação, inadequado como política final para muitos jogadores. Não há
CAPTCHA, MFA, teste de carga ou garantia de resistência a enumeração por análise
estatística de tempo; respostas de cadastro/recuperação são neutras e limitadas.

Revogação local usa estado PostgreSQL antes da tentativa remota. Uma fila cifrada
repete logout do provedor. Erros temporários não viram sucesso nem sessão válida;
crash entre refresh remoto e persistência pode exigir novo login/reconciliação.
Não existe transação distribuída com Supabase. Chaves e retenção operacional devem
ser tratadas antes da exposição pública (ver guia operacional).

Testes com provedor simulado cobrem falhas determinísticas, mas não encerram a Fase 2.
É obrigatório registrar teste real no projeto de homologação: confirmação, login,
refresh, recuperação e logout. Enquanto não houver ambiente autorizado/configurado,
o Draft PR identifica a homologação como pendente, sem anunciar contas prontas.
Sem merge, deploy, DNS, importação de saves ou alteração de gameplay/arte.
