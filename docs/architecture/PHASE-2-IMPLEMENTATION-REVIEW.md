# Fase 2 — revisão da implementação de desenvolvimento

Revisão local em 31/10/2026. Branch `feature/auth-sessions`, criada a partir da
fundação aprovada `3addd2ae93c1d2862500ee0aea4ece9bff7fd217`. PR #160 permanece
Draft, aberto e sem alterações. Última main consultada: `c24f8858a4901dded35911d1f58100fdc1af44d0`.
A compatibilidade integrada é verificada pelo ref de PR e CI, sem merge na main.
As adições concorrentes no topo do README e em `.gitattributes` foram conciliadas
por commit normal na branch da Fase 2: preservam os links Rank A e regras de bytes
dos assets da main, junto das regras/documentação do backend. A atualização posterior
preserva também os links de HUD/Bari/Doku/Ito, a rota documental de HUD e suas regras
de metadados. Esses ajustes textuais não importam ou alteram o runtime do jogo nesta
branch; a integração completa continua pertencendo ao futuro merge autorizado.
Nenhum asset foi editado.

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
| Integração PostgreSQL real, incluindo role LOGIN mínima | 17/17 |
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

Pendentes: confirmação em sequência controlada/callback, recuperação, autorização
cruzada real, rotação de chave e revogação iniciada no painel, hospedagem de origem comum para produção,
retenção/chaves, proteção adicional contra abuso e testes de carga.

A recuperação de rede do pool PostgreSQL passou sem reiniciar o serviço. Restart
real/recuperação de desastre não foram testados: a restrição de segurança anterior
não foi contornada. Não há alegação de RLS; o backend aplica autorização por conta,
e a role runtime não altera identidade, atributos ou personagens existentes.

Ver [ADR 0002](ADR-0002-BFF-SESSIONS.md),
[operação e matriz real](../operations/PHASE-2-DEVELOPMENT.md) e
[preparação manual Supabase](../operations/SUPABASE-DEVELOPMENT-SETUP.md).
