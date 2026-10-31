# Fase 2 — Autenticação, sessões e autorização de personagens

Plano de 30/10/2026, produzido na revisão da Fase 1; implementação de desenvolvimento
autorizada depois pelo proprietário. Contratos, BFF, sessões, personagem e tela isolada
estão implementados na branch `feature/auth-sessions`, baseada em `3addd2a`.
**Aceitação da Fase 2 ainda depende de homologação Supabase real.** Nenhum projeto,
usuário remoto, SMTP ou serviço pago foi criado/alterado pelo agente.
As decisões atuais e diferenças em relação à proposta histórica abaixo estão na
[ADR 0002](ADR-0002-BFF-SESSIONS.md) e no
[guia de desenvolvimento](../operations/PHASE-2-DEVELOPMENT.md).

## Resultado esperado e fronteira

Autenticar uma identidade real, vinculá-la a uma conta interna e permitir criar,
consultar e selecionar somente o personagem dessa conta. Manter criação visual,
Canvas, native96, portal e saves locais. O modo online será separado e identificado;
autenticar não transforma a simulação atual do navegador em um jogo autoritativo.

Não receber ouro, XP, inventário, dano, loot, relógio, nível ou saves do cliente como
estado confiável. A Fase 2 não implementa combate/economia online, marketplace,
importação automática, sincronização de saves nem meta de 600 usuários concorrentes.
As colunas econômicas permanecem ausentes. O schema atual admite um personagem por
conta; não remover essa restrição sem uma decisão explícita.

## Arquitetura recomendada

Usar Supabase Auth como provedor de identidade e o servidor Node como única fronteira
de autorização do jogo. Manter PostgreSQL do jogo separado logicamente de `auth.*`;
não escrever diretamente nas tabelas internas do provedor. A localização física do
banco do jogo ainda deve ser escolhida. O navegador não terá acesso SQL/Data API a
`mare_game`, nem credenciais administrativas.

Recomendação: sessão própria do aplicativo com cookie opaco e servidor intermediando
Auth (BFF). O cliente Canvas continua fazendo requisições à API; não precisa virar
SSR. É um desenho próprio, distinto da integração Supabase em que o SDK do navegador
administra access/refresh tokens. Nesse desenho, o SDK de Auth e o refresh ficam
somente no servidor. Custo: mais estado, proteção CSRF e gestão segura de refresh.

Alternativa: SDK Supabase no navegador e bearer JWT na API. É mais simples de integrar,
mas deixa tokens acessíveis ao JavaScript e exige a mesma autorização de personagem
e tratamento explícito de revogação no servidor. Escolher uma abordagem antes de
implementar; não misturar dois donos do refresh da mesma sessão.

Para BFF, adotar origem comum para cliente/API por um proxy futuro. Nenhum DNS ou
deploy será alterado nesta fase de planejamento. Em HTTPS, cookie `__Host-mare_session`,
`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain`. Desenvolvimento HTTP local
terá nome separado e exceção restrita a loopback, nunca fallback automático em produção.

## Identidade, tokens e fluxo de entrada

1. Provisionar projeto de desenvolvimento separado após decisão de provedor/método;
   fixar URL/issuer, audience e algoritmos aceitos. Não inferir endpoints de URLs ou
   headers enviados pelo usuário. Evitar `service_role`/secret key no fluxo normal.
2. Recomendação inicial de produto: e-mail confirmado + senha gerenciada pelo Supabase,
   recuperação de senha e encerramento explícito de sessão. OAuth/OTP/magic link são
   opções pendentes. O aplicativo não mantém hashes de senhas e não registra senha,
   cookie, Authorization, código de login ou tokens em logs.
3. Fluxos com redirecionamento usam PKCE, correlação `state`, retorno em allowlist e
   código de uso único. Cadastro/login por senha não deve ser descrito como fluxo
   OAuth/PKCE. Recuperação e verificação de e-mail exigem fluxos próprios testados.
4. Validar assinatura, `iss`, `aud`, `exp`, `nbf` quando presente, `sub` e `session_id`;
   rejeitar algoritmo inesperado, JWT sem assinatura, projeto errado e chave desconhecida.
   Usar biblioteca mantida, sem implementar criptografia JWT manualmente. A identidade
   vem de verificação no servidor, nunca de JSON decodificado ou user metadata editável.
5. Vincular a conta por `(provider, subject)` derivado do token verificado, com issuer
   fixo por ambiente; não vincular automaticamente por e-mail. Fazer upsert transacional
   protegido pela unicidade existente, incluindo logins simultâneos e retries.

O Supabase oferece `getClaims()` para verificação de JWT, com JWKS em projetos com
chaves assimétricas; `getSession()` sozinho não comprova identidade. Rotação de chaves
precisa considerar caches e um procedimento de invalidação emergencial.
[Verificação](https://supabase.com/docs/reference/javascript/auth-getclaims) ·
[Chaves de assinatura](https://supabase.com/docs/guides/auth/signing-keys).

## Sessão do aplicativo e revogação

- Gerar identificador opaco aleatório de pelo menos 256 bits. Persistir somente seu
  hash; rotacionar no login, elevação/reautenticação e eventos de segurança. Não
  aceitar session ID escolhido pelo cliente nem colocar tokens em URLs de jogo.
- Nova tabela `mare_game.app_sessions`: ID, hash único, account FK, provider session ID,
  criação, validade absoluta, última atividade, revogação e versão de credencial.
  Índices para validação/expiração. Não guardar dados pessoais desnecessários.
- Se persistir refresh token do provedor, usar criptografia autenticada de biblioteca
  mantida, chave fora do banco/repositório, versão para rotação e acesso restrito.
  Armazenar apenas hash do refresh não permite utilizá-lo. Separar configuração de
  runtime, migração e testes; não voltar ao `.env` misto corrigido na revisão.
- Serializar refresh por sessão com coordenação no PostgreSQL e timeout; testar
  duas abas e duas instâncias do servidor, resposta perdida e rotação concorrente.
  Gravar substituição de tokens atomicamente. Não repetir indefinidamente um refresh
  inválido nem desabilitar detecção de reutilização.
- Em cada operação protegida, verificar sessão interna válida e não revogada. Logout
  local revoga a sessão interna imediatamente, limpa cookie e encerra conexões dessa
  sessão; logout global revoga todas as sessões internas da conta. Sincronizar o escopo
  correspondente no provedor; falha externa não reativa a sessão local.
- Revogação feita fora do jogo é uma decisão explícita: expiração curta e revalidação
  limitada, ou uma integração restrita para verificar `auth.sessions`/receber eventos
  autenticados. `getUser()` atualiza o registro do usuário, mas não deve ser tratado
  como prova universal de que todo JWT foi revogado. Não conceder acesso administrativo
  amplo ao servidor apenas para introspecção.

No Supabase, logout invalida refresh, mas JWT já emitido pode permanecer válido até
`exp`. A documentação descreve a correlação de `session_id` com `auth.sessions` para
verificações mais fortes. Logo, verificar somente a assinatura não fornece logout
instantâneo do jogo. O refresh possui rotação e regras de tolerância para retries;
não assumir que duas chamadas sempre provocam revogação.
[Logout](https://supabase.com/docs/guides/auth/signout) ·
[Sessões](https://supabase.com/docs/guides/auth/sessions).

Decisão posterior do proprietário em 31/10/2026: JWT de 15 minutos, sessão BFF de
24 horas absolutas e 2 horas de inatividade, substituindo a proposta inicial de até
7 dias. Refresh não amplia a validade absoluta. Idle legítimo não é ausência de
atividade de segurança; não exigir cliques constantes. Alguns controles
de sessão do provedor dependem do plano contratado; não pressupor contratação.

## Autorização e contratos HTTP propostos

| Operação | Dados aceitos | Regra obrigatória |
|---|---|---|
| Cadastro/login/recuperação | Apenas dados do método aprovado | Limites de tamanho/frequência, resposta neutra, sem tokens em logs |
| Callback Auth | Código e correlação do fluxo | PKCE/state/retorno permitido, consumo único |
| `GET /v1/me` | Cookie da sessão | Retornar conta/personagem mínimo, nunca refresh/credenciais |
| `POST /v1/auth/logout` | Sessão + CSRF + escopo permitido | Revogar transacionalmente; idempotente |
| `POST /v1/characters` | Nome, classe, facção e aparência do catálogo | Account ID gerado pela sessão; um personagem por conta |
| `GET /v1/characters/:id` | Identificador | Consulta filtrada simultaneamente por ID e account da sessão |
| `POST /v1/characters/:id/select` | Identificador + CSRF | Verificar dono; nenhuma alteração de economia |

Os nomes são proposta, não endpoints já existentes. Rejeitar campos extras, accountId,
ownerId, ouro, inventário e progresso. Definir normalização Unicode/tamanho do nome,
aparência por IDs/cor permitidos, resposta 401 para sessão ausente/expirada e resposta
uniforme para personagem inexistente/de outro dono. Não confiar em uma consulta prévia
do cliente para autorizar uma operação posterior.

Queries parametrizadas e transações com condição de ownership. Account/character IDs
gerados no servidor; duplicação de cadastro não cria duas contas e double-submit de
personagem não gera dois personagens. Chave de idempotência de criação vinculada à
conta e ao hash do pedido; não reutilizar requestId livre como autorização.

Adicionar somente migrations incrementais, sem editar `0001`. Grants explícitos por
schema/tabela/operação. Nunca GRANT ALL ou conexão como owner/superuser no runtime.
Se houver Data API Supabase acessível, manter schema do jogo não exposto e políticas
RLS/default deny para qualquer superfície exposta. RLS complementa o serviço; não
substitui a verificação de dono e não é presumida nesta fundação sem RLS.

## Proteção de requisições e compatibilidade

CSRF em mutações, inclusive login/logout: token vinculado à sessão/fluxo e verificação
estrita de Origin; SameSite é camada complementar. CORS por origem exata, sem wildcard
com cookies; limites de corpo, cabeçalhos, tempo e concorrência antes de consultar Auth.
Rate limits por conta/fluxo e IP com cuidado com redes compartilhadas; não registrar
IP completo sem necessidade e política de retenção. Mensagens neutras evitam enumeração.

Resolver também o limite de concorrência/deadline de readiness identificado na revisão
antes de qualquer exposição pública. Proxy confiável deve ser explicitamente configurado;
não confiar em X-Forwarded-For arbitrário. Recuperação de Auth/DB falha fechada para novas
autorizações, com retries limitados; não destruir saves ou avançar recompensas por falha.

WebSocket continua fechado até a fase de transporte. Reservar contrato de sessão e
ownership para handshake futuro: Origin permitido, sem token em query string e sem
reuso de ticket. Decidir uma sessão controladora por personagem, com versão de posse
verificada no servidor, antes de habilitar comandos. Outras sessões podem consultar
a conta conforme política; expulsar todos os dispositivos a cada login não é presumido.

## Sequência de implementação e aceite

| Etapa | Entrega | Evidência exigida |
|---|---|---|
| 2A — decisões/contratos | Método Auth, BFF/bearer, origens, TTL, revogação, política de personagem | ADR aprovado e contratos estritos; nenhum segredo no Git |
| 2B — provedor | Adapter Auth, configuração validada, JWT/JWKS e callbacks | Tokens adulterados/expirados, issuer/aud/kid/alg errados, rotação, PKCE/replay e indisponibilidade |
| 2C — sessões | Migrations, sessão opaca, refresh, logout e recuperação | Rotação concorrente, resposta perdida, fixação, CSRF, expiração, revogação local/global/externa |
| 2D — personagens | Conta única, criação/consulta/seleção autorizadas | Alice não lê/seleciona Bob; owner forjado; double-submit; concorrência; grants reais |
| 2E — cliente | Login e modo online explícito sem importar progresso | Navegador desktop, reload, duas abas/dispositivos, logout, aparência native96 e saves locais preservados |
| 2F — aceitação | Documentação operacional, scanner e Draft PR | Node + PostgreSQL + Docker/Linux, provedor de homologação real e nenhuma escrita econômica |

Mocks de Auth cobrem falhas determinísticas, mas não substituem teste com Supabase de
homologação (cadastro, confirmação, recuperação, refresh, logout, rotação). Não acessar
contas reais nem enviar e-mail a terceiros como teste. Usar contas de teste autorizadas.
Nenhuma alegação de carga/600 CCU sem ensaio específico posterior. Migração/backup e
recuperação precisam de ambiente autorizado antes de receber dados reais.

## Decisões pendentes do proprietário

1. Supabase Auth confirmado? Qual projeto de desenvolvimento e método inicial de login?
   Recomendação: projeto separado, e-mail confirmado + senha e recuperação.
2. BFF com cookie opaco ou SDK no navegador + bearer? Recomendo BFF e origem comum;
   isso exige decidir a hospedagem/proxy futuro, sem publicar produção agora.
3. Onde ficará o PostgreSQL do jogo e como serão isoladas as credenciais/roles do Auth?
   Recomendo manter o schema privado e o browser sem Data API do jogo.
4. Qual duração das sessões, quantos dispositivos e qual prazo de revogação externa?
   Recomendo revogação interna imediata e uma sessão controladora por personagem.
5. Um personagem por conta continua válido? Nome único, moderação e troca de classe/
   facção/identidade não estão decididos. Recomendo preservar a restrição atual e não
   criar endpoints de transferência/exclusão nesta fase.
6. Qual destino dos saves antigos? Recomendo preservá-los como modo local, com qualquer
   futura migração de aparência/progresso decidida e auditada separadamente.
7. SMTP, domínio, limites/custos e retenção de dados: precisam de definição antes do
   teste completo do provedor. Nenhuma contratação é presumida pelo plano.
