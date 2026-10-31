# Fase 2 — revisão da implementação de desenvolvimento

Revisão local em 31/10/2026. Branch `feature/auth-sessions`, criada a partir da
fundação aprovada `3addd2ae93c1d2862500ee0aea4ece9bff7fd217`. PR #160 permanece
Draft, aberto e sem alterações. Última main consultada: `ab77811ecca70be4c0a02513ec1b4ac9b0643023`.
A compatibilidade integrada é verificada pelo ref de PR e CI, sem merge na main.
As adições concorrentes no topo do README e em `.gitattributes` foram conciliadas
por commit normal na branch da Fase 2: preservam os links Rank A e regras de bytes
dos assets da main, junto das regras/documentação do backend. Nenhum asset foi editado.

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

| Ensaio local | Resultado |
|---|---|
| Build / TypeScript estrito | Passaram |
| Fundação, contratos, gateway TLS, SDK com JWTs locais | 27/27 |
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

**A Fase 2 não está homologada no Supabase real.** O proprietário escolheu preparar
manualmente um projeto gratuito separado. Não houve criação/alteração de projeto,
envio de e-mail, configuração remota ou uso de credencial do provedor. SDK com servidor
simulado não comprova o comportamento do ambiente hospedado.

Política temporal proposta: JWT/revalidação até 15 min, sessão absoluta 7 dias,
inatividade 24 h. Permanece configurável e exige decisão explícita na ativação.
Pendentes: entrega real de e-mail, confirmação/recuperação, concorrência de refresh
no provedor, revogação externa/JWKS, hospedagem de origem comum para produção,
retenção/chaves, proteção adicional contra abuso e testes de carga.

A recuperação de rede do pool PostgreSQL passou sem reiniciar o serviço. Restart
real/recuperação de desastre não foram testados: a restrição de segurança anterior
não foi contornada. Não há alegação de RLS; o backend aplica autorização por conta,
e a role runtime não altera identidade, atributos ou personagens existentes.

Ver [ADR 0002](ADR-0002-BFF-SESSIONS.md),
[operação e matriz real](../operations/PHASE-2-DEVELOPMENT.md) e
[preparação manual Supabase](../operations/SUPABASE-DEVELOPMENT-SETUP.md).
