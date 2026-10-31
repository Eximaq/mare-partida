# Revisão técnica final da Fase 1

Revisão de 30/10/2026, com execuções de CI em 31/10 UTC. Escopo: os commits
`16c18e0d9e586fcfb3a90962db948598df8f8629` e
`d8710bab3094ae907f544e28bdb0418b1f0e5260`, seus 40 arquivos alterados e as correções
de revisão `34dbc054bf41e9c84f058033490106013bffc29b` e
`b3cbadb5cd6e7913f0d7ac09814c0c9f7390c3d2`.

**Parecer:** adequada como fundação local isolada e para revisão em Draft PR, com as
correções abaixo. Não aprovada como serviço público, autenticação pronta ou servidor
de jogo autoritativo operacional. Fase 2 apenas planejada, sem implementação.

## Achados e decisões

| Prioridade | Achado e efeito | Resultado |
|---|---|---|
| P2 | Os launchers carregavam um `.env` com runtime, owner e admin de testes; um processo servidor recebia credenciais além da role que utilizava | Corrigido em `b3cbadb`: arquivos distintos e quatro testes de processos reais; original `.env` preservado e não mais carregado |
| P2 | Mensagem do migrador afirmava ausência de commits em qualquer falha; desconexão durante COMMIT deixa o resultado potencialmente desconhecido | Corrigido em `34dbc05`: conferir ledger ao reconectar; não editar/resetar histórico |
| P2 antes de exposição pública | Readiness executa um probe por requisição, sem agrupamento, rate limit ou deadline HTTP próprio | Pendente para hardening: ensaio local controlado com 16 pedidos produziu 16 callbacks simultâneos; pool/SQL têm limites, mas isso não limita toda a carga HTTP |
| Gate antes de dados reais | Reinício/crash recovery e restauração de backup não comprovados | Bloqueio de política documentado; não repetido nem contornado. Teste de rede não equivale a recuperação do banco |
| Gate de configuração futura | Segredos locais ainda são arquivos acessíveis ao mesmo usuário do SO; separar arquivos não é sandbox | Antes de deploy: identidades/secret mounts distintos, ACLs, rotação e TLS. Não carregar credenciais privilegiadas no ambiente herdado do runtime |

Não foi encontrado endpoint novo de escrita econômica. Ausência de achado crítico
neste escopo não equivale a uma prova geral de segurança ou teste de intrusão completo.

## Integridade e colaboração

Os dois commits originais formam uma sequência linear a partir de `7b14fa7`. Os
commits de revisão foram acrescentados, sem reescrever os originais. `git fsck --full`
não encontrou corrupção; reportou somente o objeto desconectado `bcb0b104...`, trazido
da pasta antiga para comparação anterior e mantido, sem prune.

A branch permanece `refactor/authoritative-server`; a `main` local continua em
`7b14fa74dabd51d2efd51021dc6304e3f9bdfa9b`. Durante a revisão, a main remota avançou
para `c4b7cf6a1e8f07b59012b07644371838590141e7`, merge do PR #159 de performance de
sprites. Esses 17 commits não foram incorporados, nem revertidos. A lista de arquivos
alterados por eles não se sobrepõe ao diff da fundação. Isso não substitui validar a
combinação; verificar o resultado atualizado da CI do PR antes de uma futura integração.

Nenhuma alteração da fundação atinge código do jogo, portal, backend legado, sprites,
assets ou catálogo de itens. A raiz mantém compatibilidade CommonJS; ESM ficou nos
workspaces novos. A normalização LF foi limitada ao backend/infra/testes novos, mantendo
regras anteriores dos assets. Skills locais não foram modificadas.

Na pasta antiga, os **5.806 arquivos fora de `.git`** conferem com o inventário SHA-256;
nenhum conteúdo foi alterado, removido ou importado. Na comparação dos 10.568 arquivos
totais surgiram apenas uma referência ausente e duas novas dentro de
`.git/refs/codex/turn-diffs`, metadados internos do Codex. Não foram restaurados/apagados.
O ZIP completo anterior e o inventário continuam preservados no diretório irmão de
preservação, fora do Git. Permanecem preservados os dois commits exclusivos antigos,
a alteração manual de documentação, 275 arquivos não rastreados e 2.098 ignorados.

## Segurança e PostgreSQL

HTTP novo expõe somente GET `/health/live` e `/health/ready`. Não serve o checkout,
`.env`, `.git`, arquivos do jogo ou a API Python antiga. Métodos de escrita em health
retornam 405; rotas ausentes retornam 404. Erros de banco/configuração são sanitizados;
respostas JSON têm no-store/nosniff. Não há autenticação fictícia, CORS aberto ou rota
de WebSocket de gameplay. Liveness independe do banco; readiness exige ledger íntegro.
Readiness confere histórico de migrations, não toda forma possível de schema drift.

Contrato compartilhado aceita somente ping, UUID, sequência inteira segura positiva
e payload vazio; rejeita campos extras/identidade/economia e limita 4096 bytes UTF-8.
Não há consumidor de rede desse contrato. Validação estrutural de sequence/requestId
não implementa replay protection, idempotência econômica ou autorização.

Migrations usam transação, advisory lock, nomes ordenados, checksum e SQL confiável do
repositório; dados do ledger são parametrizados. Os testes reais comprovaram concorrência,
repetição, rollback de SQL anterior a COMMIT e rejeição de histórico alterado. A FK de
personagem e unicidade de conta são restrições de dados, não autenticação do jogador.

Verificação real da role `mare_runtime`: sem SUPERUSER, CREATEDB, CREATEROLE,
REPLICATION ou BYPASSRLS; sem membership que permita assumir owner. CONNECT permitido;
CREATE/TEMP do banco negados. Sem USAGE/CREATE em public/mare_game; USAGE e SELECT
somente no ledger mare_meta. Foram negados com 42501: leitura de accounts/characters,
UPDATE no ledger, CREATE SCHEMA e SET ROLE owner. Nenhuma tabela econômica existe.
RLS não foi implementada: a fronteira atual é ausência de grants/rotas de jogadores.

## Segredos e configuração

Gitleaks 8.30.1, baixado da release oficial e conferido por SHA-256, examinou o intervalo
de commits da fundação com redaction: nenhum segredo detectado. Os 67 blobs alterados
presentes nas árvores dos dois commits originais também foram comparados privadamente
às senhas locais conhecidas: nenhuma correspondência. Não houve impressão dessas senhas.

Não existe `.env` real ou variante privada rastreada nos commits revisados. Exemplos
contêm placeholders. **Existem strings de senha fictícias de testes**, incluindo
`disposable-ci-only` na CI original e URLs de fixture; não são credenciais de serviços
ou do ambiente local. Portanto, não é correto afirmar literalmente que não há nenhuma
palavra/senha de exemplo nos commits. Os resultados são limitados ao escopo examinado,
não uma certificação de todo o histórico anterior do projeto.

Os três arquivos `.env.*.local` são ignorados e carregados separadamente. O servidor
local foi reiniciado com `.env.server.local`, respondendo alive/ready. O original
`.env` misto permanece privado e não é carregado pelos launchers novos. Nunca anexar
esses arquivos, backup, saves ou evidências locais ao PR.

## Docker, Linux e dependências

Docker não está instalado no Windows usado na revisão. Foi **executado em runner Ubuntu
da CI**, não apenas inspecionado: configuração dos profiles Compose, builds multi-stage,
PostgreSQL 18.6, inicialização dos papéis, migrations duas vezes, grant do ledger,
health dos contêineres/HTTP, UID não-root, negação de acesso a jogadores e ausência de
`.env`, `.git`, game.js e TypeScript na imagem de runtime.
[Execução de fundação/Docker em b3cbadb](https://github.com/Eximaq/mare-partida/actions/runs/41158989838).

O volume segue o layout do PostgreSQL 18 em `/var/lib/postgresql`. Portas do Compose
estão publicadas apenas em 127.0.0.1; o servidor usa 0.0.0.0 dentro do contêiner.
Credenciais são distintas; grant de health exige passo explícito após migração.
Scripts shell são LF. Imagem runtime contém dependências de produção e migrations,
não o jogo. Lockfile e versões estão fixados; `npm ci --ignore-scripts` funciona no
build Linux. `npm audit` retornou zero vulnerabilidades conhecidas nesta execução.

Compose continua sendo desenvolvimento local: imagens usam tags, não digest imutável;
não há configuração de TLS, SLA, secret manager, recursos/cotas ou estratégia de deploy.
Esses itens precisam de revisão antes de produção, sem introduzir serviços agora.

## Recuperação e evidência executada

O teste anterior de parada/reinício via helper PostgreSQL foi rejeitado pela revisão
automática de aprovação com a razão disponível `blocked by policy`. Não foi repetido
nem contornado nesta revisão. Não houve mudança de ExecutionPolicy. A CI inicializa
um banco descartável próprio para testar Compose; não reproduz aquele exercício.

Foi reexecutada a falha de rede por proxy TCP local descartável: perda de conexões,
readiness false, retorno da rede e readiness true com pool real. Não prova crash
recovery, persistência após reinício, restauração de dump/volume, WAL/PITR, RPO ou RTO.
Não aceitar contas reais antes de uma janela/ambiente autorizado para esses testes.

| Validação | Resultado |
|---|---|
| Build e TypeScript estrito | Passaram |
| Fundação original + isolamento de credenciais | 21/21; quatro testes falharam antes da correção e passaram depois |
| PostgreSQL real | 5/5 em Windows e CI Linux |
| Legado Node | 122/122 arquivos; supa-browser tem harness separado e não foi contado |
| Python backend/hierarquia | 69 + 4 passaram |
| Build estático | 1 teste Pages/Paper Doll + 3 portal; ambos os builds passaram |
| Assets | 978 recursos native96 válidos |
| Navegador isolado | Criação/facção/classe/aparência, porto, reload do save, native96 ready sem erros; portal abriu sem erros |
| Secrets/dependências/workflow | Gitleaks sem achados; npm audit zero; Actionlint passou |
| Docker/Linux | Build, migrações repetíveis, health, conteúdo da imagem e grants passaram |
| CI essencial | [Passou em b3cbadb](https://github.com/Eximaq/mare-partida/actions/runs/41158990000) |

Não foi repetida uma matriz visual móvel completa nem realizado teste de carga.
O ensaio de navegador usou um perfil separado e um save descartável, sem abrir ou
alterar os saves reais do usuário. Logs e screenshots permanecem fora do repositório.

## Publicação e próxima fase

[Draft PR #160](https://github.com/Eximaq/mare-partida/pull/160) aberto com base main,
sem merge/rebase/force-push. O workflow GitHub Pages de produção não foi acionado.
A integração Cloudflare já existente criou automaticamente um **preview da branch**
ao receber o push; a checagem distingue Preview URL e Branch Preview URL. Nenhum
comando de deploy de produção ou alteração de domínio foi executado.

Ver o [plano detalhado da Fase 2](PHASE-2-AUTH-SESSIONS-PLAN.md), especialmente as
decisões sobre BFF/bearer, método Supabase Auth, topologia do banco, sessão/revogação,
personagem único, saves legados e SMTP/custos. Nenhuma dessas funcionalidades foi
implementada nesta revisão.
