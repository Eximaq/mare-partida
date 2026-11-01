# Etapa 2F — matriz de aceite e janela final

Preparação autorizada em 31/10/2026. Referência técnica verificada: `c8be42f`,
branch `feature/auth-sessions`, PR #162 Draft, base de integração main `8550cfa`.
**Estado: F02 aprovado no cenário real autorizado sobre `f98063e`. F01 aprovado
na janela posterior sobre `53bb628`: um envio para G, PKCE, troca de senha pela UI,
login, persistência e logout no Opera; encerramento seguro confirmado. F03 aprovado
em 01/11/2026: rotação ES256 real, caches aquecido/vazio, refresh natural e
encerramento verificados. F04/F05 e aceite final continuam abertos; não há
autorização de Fase 3.**
Este documento concentra o status atual. Os relatos das rodadas 1–3 preservam
seus resultados históricos e não autorizam novos envios ou operações externas.
F01: [resultado aprovado e histórico das tentativas](PHASE-2F-F01-RECOVERY-RETRY.md).
Auth false e serviços locais parados. O erro remoto da primeira janela não foi
reproduzido na execução válida nem teve sua causa determinada. Novos envios ou
operações externas continuam exigindo autorização específica.

## Escopo da preparação original

Consolidar documentos, conferir contratos e elaborar os procedimentos. Nenhum
cadastro, e-mail, reset, revogação ou alteração do Supabase está autorizado por
esta preparação. Não iniciar API/gateway nem habilitar Auth somente para preparar
este roteiro. Commit/push documental no PR existente é permitido, com prefixo
`[CF-Pages-Skip]` e exclusão de previews mantida. Sem merge, deploy, DNS ou Fase 3.
Os ensaios F01, F02 e F03 receberam autorizações específicas posteriores, registradas
nesta matriz e no relatório vinculado; o escopo histórico acima não os substitui.

## Matriz única de status atual

| ID | Requisito | Evidência/status | Condição para fechamento |
|---|---|---|---|
| A01 | HTTPS local, origem comum e cookie protegido | Aprovado em testes TLS e navegador | Preservar origem localhost:9443; não expor portas |
| A02 | Login, confirmação, PKCE, replay e isolamento do navegador | Rodadas reais 1–2 aprovadas nos casos registrados | G usou cliente HTTP original; B/C cobriram navegador original; não generalizar |
| A03 | Sessões, refresh real/concorrente, controlador e logout | Rodada 1 aprovada | JWT 900 s, BFF 24 h/2 h mantidos; não foi aguardado todo o prazo de 24 h/2 h |
| A04 | Propriedade e criação de personagem | 40 testes cruzados; primeira criação 201/409, um personagem; retries idênticos 201/201 | A/B/C e personagens preservados; sem escrita econômica |
| A05 | Recuperação real pelo backend | Rodada 3: sessão restrita, reset, senha antiga/nova, invalidação interna e refresh recusado | Não cobre preenchimento da senha pela UI; ver F01 |
| A06 | Integração, Node, PostgreSQL e Docker/Linux | `c8be42f`: oito checks CI aprovados; local 28 fundação, 19 integração e 123 arquivos Node | Bloqueios de Fênix/hash resolvidos; CI de novos commits deve ser conferida |
| F01 | Recuperação completa pela interface | Aprovado sobre `53bb628`: um envio G, PKCE 200/callback 303, reset 200, revogação 204, login/persistência 200 e logout 204/401 no Opera | Escopo revisado sem senha antiga/duas sessões prévias; histórico da Rodada 3 preservado. Erro antigo sem causa comprovada; ver relatório F01 |
| F02 | Revogação iniciada fora do BFF | Aprovado: logout externo 204, refresh remoto recusado, sessão interna revogada e /v1/me 401 | Uma conta/uma sessão neste ensaio; detecção na próxima revalidação, sem promessa de invalidação instantânea do JWT |
| F03 | Rotação real da assinatura JWT/JWKS | Aprovado: nova ES256/900 s, cache aquecido/vazio, JWT antigo válido, refresh natural e mesma identidade; ver [registro F03](PHASE-2F-F03-SIGNING-ROTATION.md) | Antiga ES256 preservada como Previous; não testada revogação de chave nem executado rollback; Auth false e serviços locais parados |
| F04 | Expiração do token remoto de e-mail sem uso | Em espera: único envio autorizado de G às 01:54:55 de 01/11, prazo remoto 3600 s; [registro F04](PHASE-2F-F04-EMAIL-EXPIRY.md) | Aguardar 65 minutos sem abrir; provar causa da recusa remota; Auth/API/gateway desligados durante a espera. Ainda não aprovado |
| F05 | Resposta perdida durante reset hospedado | Coberta localmente, não induzida no provedor real | Plano de injeção isolado e autorização adicional; ou adiamento explícito, sem alegar atomicidade |
| O01 | Operação antes de exposição pública | Pendente | Origem de produção, retenção/chaves, abuso, carga e backup/restauração; nenhuma publicação nesta fase |
| G01 | Aceite final da Fase 2 | Aberto | Revisão do proprietário: F01–F03, decisão registrada sobre F04/F05, matriz sem falhas abertas ocultadas |

Evidências de A06: [fundação e Docker/Linux](https://github.com/Eximaq/mare-partida/actions/runs/41263542593),
[regressão integrada](https://github.com/Eximaq/mare-partida/actions/runs/41263542566),
[native96](https://github.com/Eximaq/mare-partida/actions/runs/41263542598).
A preparação documental não repetiu runtime; o ensaio F01 abaixo é posterior. O plano original
é histórico; [ADR](../architecture/ADR-0002-BFF-SESSIONS.md) e esta matriz descrevem
as decisões vigentes. CI verde não significa autorização de produção ou Fase 3.

## F01 — ensaio parcial de 31/10/2026 e encerramento

Runtime `f1ef36b`, projeto de desenvolvimento e HTTPS local. O proprietário aprovou
usar G, conta existente confirmada e sem personagem, para um pedido/e-mail e
recuperação pela UI, seguido de login/logout. A senha temporária anterior havia
sido descartada: o escopo foi reduzido explicitamente, sem preparar duas sessões
nem repetir senha antiga/invalidação; as evidências anteriores da Rodada 3 continuam
históricas. O roteiro completo abaixo permanece referência, não prova deste ensaio.

| Verificação | Resultado observado |
|---|---|
| Pré-condições | HTTPS/readiness 200, listeners em loopback, políticas ES256/900 s e BFF 24 h/2 h preservadas |
| Baseline local | Quatro contas, três personagens, zero sessões ativas e revogações pendentes |
| Solicitação pela UI | Um POST /v1/auth/recover, 202 e mensagem neutra; nenhum reenvio |
| Entrega | Uma mensagem nova de recuperação localizada no Spam; link distinto dos três anteriores, tipo recovery e callback local correto |
| Provedor | Log de pedido aceito (200); cerca de 42 s depois, verificação recusada com `One-time token not found`, retorno `otp_expired` |
| Callback local | 400 invalid_auth_flow, sem código para troca PKCE; não chegou à tela de nova senha |
| Prazo local | Um fluxo recovery ainda não expirado na consulta posterior (~101 s do início); não foi expiração de dez minutos do BFF |
| Participação do proprietário | Informou não ter clicado no link; nenhuma nova senha foi solicitada ou preenchida |
| Casos não executados | Reset pela UI, login com nova senha e logout; não classificados como aprovados |
| Encerramento | Auth false, API/gateway parados, PostgreSQL preservado; quatro contas/três personagens, fingerprint dos personagens inalterado, zero sessões ativas e revogações pendentes |

**Classificação: inconclusivo quanto à causa, fluxo UI não aprovado.** A recusa
remota foi observada, mas não prova isoladamente defeito do BFF, expiração remota,
consumo por scanner ou erro do usuário. O fluxo local pendente fica sujeito à
expiração normal, sem exclusão manual ou mudança de prazo. Nenhum segredo, endereço,
ID pessoal, cookie ou link assinado integra este registro.

Próximo passo: correlacionar logs de verificação e configuração/template de e-mail
em leitura antes de propor repetição. A documentação do Supabase descreve consumo
antecipado por verificadores de links como uma possibilidade, **não comprovada
neste caso**: [email prefetching](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching).
Não desativar proteções do Gmail, aumentar prazos ou mudar template/fluxo sem análise
e autorização. O orçamento de um envio foi consumido; qualquer novo envio ou
alteração do Supabase exige nova autorização específica. F02–F05 não executados.

## F01 — diagnóstico em leitura após o ensaio

A investigação posterior não enviou mensagens, não abriu novamente o link de
recuperação, não ligou Auth e não alterou Supabase, templates, prazos ou contas.

| Hipótese/verificação | Evidência obtida | Conclusão permitida |
|---|---|---|
| Link antigo ou alterado na navegação | Token completo do registro API Gateway comparado em memória ao link da mensagem nova; igualdade exata, um parâmetro token, tipo recovery e redirect esperado | Não houve substituição/truncamento observável entre esse e-mail e a requisição registrada |
| Conta incorreta | Destinatário do evento user_recovery_requested coincide com o autorizado; digest do actor corresponde à única conta local sem personagem (G) | Pedido associado à conta existente correta; nenhum ID/endereço publicado |
| Prazo remoto curto | Painel Email: OTP expiration 3600 s; recusa aproximadamente 42 s após pedido | Não há evidência de vencimento por espera normal; OTP de e-mail é separado do JWT de 900 s |
| Template/redirect | Template usa `{{ .ConfirmationURL }}`; Site URL e allowlist incluem a origem/callback HTTPS local esperados | Não foi encontrada divergência nestas configurações; nenhum Save acionado |
| Perda do estado PKCE local | Fluxo cifrado legível, com verificador presente e apenas material de verificador; callback chegou sem código, já com erro do provedor | A troca PKCE nem foi alcançada; não é evidência de cookie, CSRF ou verifier inválido |
| Repetição/consumo antecipado | Recorte de logs consultado contém um pedido recovery e um GET /auth/v1/verify associado ao clique; usuário negou outro clique | Scanner/prefetch não foi comprovado; ausência no recorte não prova ausência universal |
| Ponto exato de falha | Auth: One-time token not found; API Gateway: GET /auth/v1/verify 303 redirecionando com otp_expired; callback local 400 | Rejeição na consulta do token do provedor, antes da emissão do código PKCE; não confundir o 303 de transporte com sucesso |

A leitura do [código oficial de verificação](https://github.com/supabase/auth/blob/master/internal/api/verify.go)
mostra que token não encontrado e token vencido podem produzir o mesmo código
público otp_expired por caminhos distintos. Isso é consistente com o erro interno
observado; não comprova a versão implantada ou a causa da ausência do token.

**Diagnóstico delimitado:** o link novo chegou intacto ao projeto correto, que o
recusou por token não encontrado. A causa interna permanece inconclusiva. Não há
base para culpar o usuário, afirmar consumo pelo Gmail/navegador, declarar bug do
Supabase ou aplicar uma correção especulativa no servidor do jogo. Não houve teste
de nova assinatura JWT, nova sessão ou alteração de senha nesta investigação.

Resumo preparado para eventual suporte: runtime `f1ef36b`, PKCE recovery,
/recover aceito, uma mensagem entregue, /verify 42 s depois com token exatamente
igual ao e-mail, erro interno One-time token not found, OTP 3600 s, template padrão,
callback permitido, nenhum código para exchange. A correlação por projeto/horários
e request IDs fica em canais privados autorizados, nunca com token/link/credenciais.
Enviar esse resumo ao suporte é comunicação externa e requer autorização; não foi
enviado. Repetir com outro e-mail ou mudar template também depende de autorização
específica. Não consumir mais quota apenas para tentar novamente sem hipótese.

CI do registro `4a89b6c`: oito checks aprovados. Isso valida a branch e não transforma
o ensaio F01 em sucesso. Auth permaneceu false, serviços locais parados e dados
preservados. Sem merge, deploy, DNS ou Fase 3.

## Preparação da execução — após autorização do lote

1. Confirmar o destinatário e a conta temporária existente (preferencialmente G,
   sem personagem) em canal privado/local. Não incluir endereço/IDs nos documentos.
   Não criar outra conta. Confirmar que o proprietário consegue acessar a caixa e
   o navegador do computador local durante o fluxo de dez minutos.
2. Conferir branch/commit, arquivos privados ignorados, Auth false e configuração
   sem imprimir valores. Verificar PostgreSQL com `pg_isready`, não apenas porta
   aberta; o launcher de 20 s já ficou aquém da recuperação observada de ~37 s.
   Não reinicializar cluster, alterar antivírus ou contornar políticas.
3. Registrar contagens sem IDs: referência anterior quatro contas/três personagens,
   zero sessões ativas e zero revogações pendentes. Divergência requer investigação,
   não exclusão de dados para produzir uma contagem esperada.
4. Confirmar somente desenvolvimento `mare-partida-auth-dev`, ES256/900 s,
   86400 s absolutos/7200 s inativos, HTTPS local e ausência de listeners públicos.
   Preservar Data API desligada, SMTP e banco do jogo separado.
5. Somente na janela autorizada habilitar Auth local e iniciar API/gateway em
   loopback. Testar HTTPS e readiness sem ignorar TLS. Perfil exclusivo de QA;
   não limpar cookies, saves ou perfis de outras tarefas.

## Lote F01 — recuperação pela UI, um envio

**Autorização necessária:** destinatário exato sob controle do proprietário;
um pedido de recuperação e no máximo um e-mail, sem reenvio; login em dois perfis,
troca da senha da conta temporária e revogação de suas sessões. A/B/C ficam fora.
Não usar cadastro. Se a senha atual de G não estiver disponível, parar e revisar
as pré-condições antes do envio; não gerar uma recuperação extra implicitamente.

Procedimento técnico:

1. Com o proprietário digitando a senha existente nas telas, obter duas sessões
   válidas da mesma conta e comprovar /v1/me 200 nos dois perfis. Usar um terceiro
   perfil isolado, sem sessão, para iniciar a recuperação; preservar os cookies
   dos dois perfis de controle.
2. Solicitar recuperação UMA vez pela UI. A resposta neutra não comprova entrega.
   Registrar apenas status/contagem/tempo. Se houver timeout ou mensagem ausente,
   investigar sem repetir o envio nem consumir links de outras rodadas.
3. Usar a mensagem identificada por destinatário e horário desta janela, no mesmo
   navegador que iniciou o pedido. Não encaminhar por padrão, não abrir em outro
   dispositivo e não copiar link/código para o chat. Preservar o fluxo válido.
4. Confirmar callback válido e tela de nova senha; sessão recovery não autoriza
   /v1/me ou operações de personagem (401). O proprietário preenche e submete a
   nova senha. Nenhuma senha entra em captura, log, relatório ou ferramenta de texto.
5. Comprovar reset 200, retorno a Entrar e campo de senha limpo. Antes de substituir
   cookies de controle, as duas sessões anteriores devem retornar 401. Depois,
   uma tentativa com senha antiga deve falhar e com nova deve passar, digitadas
   pelo proprietário. Reuso da sessão recovery deve falhar; logout final 204/401.
6. Conferir fila remota, contagens e nenhuma alteração dos personagens. Distinguir
   revogação interna de JWT remoto ainda dentro de expiração. Encerrar a janela.

Tutorial para o proprietário, enviado novamente apenas quando a janela estiver pronta:

1. No computador, abrir `https://localhost:9443/online/` no navegador indicado.
2. Selecionar **Recuperar acesso**, preencher o e-mail combinado e enviar uma vez,
   somente quando solicitado. O agente confirma qual mensagem aguardar.
3. Abrir essa mensagem na caixa do mesmo navegador e clicar no link uma vez,
   quando solicitado. Se a caixa estiver só no celular, avisar antes do envio:
   localhost no celular não aponta para o computador e abrir o link ali prejudica
   a correlação. A aprovação pelo celular é possível, mas não substitui essa etapa.
4. Na tela **Definir nova senha**, digitar uma senha exclusiva de pelo menos 12
   caracteres e clicar **Salvar nova senha**. Avisar apenas o resultado, sem senha/link.
5. Fazer as tentativas de login indicadas e aguardar a confirmação de encerramento.

## Lote F02 — revogação externa, orçamento de zero e-mails

Pedir autorização separada para revogar somente as sessões da conta temporária
combinada no provedor, sem usar o logout do BFF como disparador. Antes de agir,
confirmar se o dashboard oferece uma operação com esse escopo. A disponibilidade
não foi verificada nesta preparação. Se não houver controle adequado, registrar
bloqueio e apresentar alternativa com API oficial usando apenas a sessão do próprio
usuário para nova autorização; não usar service_role, secret key, banimento,
exclusão de conta, troca de senha ou SQL interno como substituto silencioso.

- Confirmar sessão BFF 200 antes da ação; registrar instante relativo da revogação.
- Não modificar diretamente `mare_game.app_sessions`, epochs ou prazos: isso
  invalidaria a prova de propagação externa. Sem refresh manual que altere o caso.
- Fazer leitura protegida em baixa frequência (por exemplo, a cada 30 s) até a
  próxima revalidação. O código só chama refresh quando `provider_valid_until`
  vence, limitado pelo menor prazo entre expiração JWT e recheck configurado.
- Dentro da janela anterior pode haver 200. Após a revalidação, refresh recusado
  deve resultar em 401 e sessão interna revogada; 503 é indisponibilidade, não
  prova de revogação. Registrar duração, resultado e deadline real da requisição.
- Falha além da janela declarada exige investigação e regressão; não aumentar TTL
  para aprovar. Não alterar o relógio nem alegar revogação instantânea universal.

Logout do provedor revoga refresh; JWT já emitido pode continuar válido até expirar.
Isso é diferente da revogação imediata interna do jogo.
[Referência Supabase](https://supabase.com/docs/guides/auth/signout).

### F02 — resultado real e encerramento, 31/10/2026

O proprietário autorizou explicitamente usar a Conta A e revogar suas sessões pela
API oficial com a própria sessão. Essa decisão substitui a investigação de uma
operação equivalente no dashboard prevista no roteiro. Nenhuma chave administrativa,
service_role, troca de senha ou e-mail. Login digitado pelo proprietário na UI local;
G não foi usada porque a senha temporária havia sido descartada. B/C/G preservadas.

Runtime `f98063e`, sem mudança de código. Helper local ignorado leu a sessão cifrada
já emitida pelo BFF, verificou assinatura ES256, JWT de 900 s, identidade do provedor,
conta autorizada e personagem existente antes do logout global no provedor.
Somente SELECT no banco para instrumentação; nenhuma edição de sessão, epoch ou
prazo pelo helper. O endpoint de logout do BFF não foi chamado.

| Verificação | Resultado |
|---|---|
| Baseline | Quatro contas/três personagens, zero sessões ativas e revogações pendentes |
| Login e leitura antes da revogação | UI autenticada; login 200 e /v1/me 200; exatamente uma sessão de A |
| Revogação externa | Log oficial POST/logout 204; nenhuma alteração imediata de revoked_at, epoch ou provider_valid_until internos |
| Política real | Assinatura verificada ES256 e exp-iat=900; sessão absoluta 86400 s, inatividade 7200 s e recheck 900 s inalterados |
| Janela anterior à revalidação | Leituras 200 observadas com o mesmo cookie; nenhuma rotação manual ou novo login |
| Revalidação natural | Primeira consulta automática após o prazo retornou 401 em 1278 ms; Supabase registrou 400 refresh_token_not_found |
| Prova no banco | Sessão interna revogada pelo fluxo normal; prazos absoluto/inativo ainda válidos, portanto não foi expiração de 24 h/2 h |
| Interface e persistência da recusa | Voltou a Entrar na conta; recarregamento adicional retornou 401 em 8 ms |
| Preservação e encerramento | Fingerprint dos personagens inalterado; quatro contas/três personagens, zero sessões ativas e fila vazia; Auth false, API/gateway parados, PostgreSQL ativo em loopback |

Tempos relativos: primeira recusa aproximadamente 891,2 s após o logout externo,
na primeira leitura automática disponível após o deadline (30,4 s depois dele,
incluindo 1,278 s de requisição). A interface consulta a cada 60 s enquanto visível;
esse intervalo de observação não estende a autorização de requisições após o
deadline. Não reduzir TTL, alterar relógio ou prometer revogação instantânea.

**Aprovado neste cenário:** uma conta, uma sessão local e revogação global no
provedor. Não representa teste adicional de múltiplos dispositivos, rotação de
chaves, recuperação, carga ou indisponibilidade do provedor. Testes anteriores
mantêm seus próprios limites. Evidências privadas só contêm status, tempos e
contagens; tokens permaneceram apenas em memória e no armazenamento cifrado
existente. Helpers, capturas e logs não entram no commit.

F01 foi adiado expressamente pelo proprietário para retomada no fechamento, sem
aceite do fluxo de recuperação. F03 exige autorização própria antes de qualquer
mudança de assinatura. Sem merge, deploy, DNS ou início da Fase 3.

## Lote F03 — assinatura ES256/JWKS, orçamento de zero e-mails

[Proposta concreta de execução e riscos](PHASE-2F-F03-SIGNING-ROTATION.md), preparada
em 01/11/2026 após leitura do painel. Inventário: ES256 atual, sem standby, HS256
anterior. Nenhuma mudança de chave autorizada ou executada nesta preparação.

Pedir autorização própria para preparar/rotacionar a chave de assinatura no projeto
DE DESENVOLVIMENTO. A ação afeta a confiança de tokens do projeto inteiro, não só G;
apresentar as sessões existentes e o plano de recuperação antes de executar.
Não alterar a chave de cifragem local `AUTH_ENCRYPTION_KEY`, senha PostgreSQL,
publishable key, algoritmo ou TTL neste lote. Não exportar chaves privadas.

1. Validar login/refresh antes da mudança. Registrar somente que assinatura é ES256,
   duração 900 s e comparação de chave anterior/nova, nunca JWT ou kid em relatório.
2. Confirmar o estado das chaves e a operação suportada no painel. Preparar uma
   nova chave ES256 em standby e respeitar propagação/cache antes de ativá-la.
   A criação/ativação só ocorre dentro do escopo autorizado; sem exclusão permanente.
3. Manter a chave anterior confiável durante a transição. Verificar login e refresh
   reais com a nova assinatura, mesma identidade e ausência de duplicação de conta.
   Rotação não é revogação: aceitar um JWT antigo ainda válido é esperado aqui.
4. Medir o comportamento com cache aquecido e com novo processo BFF local, sem
   desligar verificações de assinatura. O adaptador usa `cacheMaxAge=300000` e
   timeout de JWKS de 4000 ms; respeitar também o cache público do provedor.
5. Rejeição de assinatura da chave revogada é um subteste distinto: requer autorização
   adicional com impacto e janela concretos. Um token que já expirou não prova essa
   rejeição. Não revogar cedo nem reduzir TTL apenas para produzir um negativo.
6. Em falha, parar novas operações e manter Auth false. Qualquer reversão externa
   precisa estar explicitamente incluída na autorização do lote; não improvisar.

O Supabase distingue preparar, rotacionar e revogar chaves, e informa cache público
JWKS de dez minutos. Não prometer rejeição imediata nem aplicar automaticamente
um procedimento de migração HS256 a este projeto ES256.
[Referência de assinatura e caches](https://supabase.com/docs/guides/auth/signing-keys).

## F04/F05 — escopos separados, não incluídos nos lotes acima

- **F04:** confirmar em leitura o prazo remoto vigente e apresentar um único envio
  adicional para esperar esse prazo sem usar o link. Só rejeição observada no
  provedor prova expiração remota; callback 400 do BFF não basta. O mesmo link
  não será usado também como controle positivo. Não alterar prazos ou relógios.
- **F05:** preparar proposta isolada de perda da resposta, preservando TLS, sem
  mudar a configuração global de rede e sem capturar credenciais. Contemplar
  resultado incerto, ausência de sucesso falso, revogação interna e reconciliação.
  A conta pode precisar de nova recuperação; qualquer envio extra exige aprovação.
  Não executar injeção de falha no projeto hospedado com a autorização de F01.

Os dois casos permanecem pendentes, sem adiamento automaticamente aceito. Se o
proprietário decidir adiá-los, registrar motivo, risco, responsável e condição de
retomada. A mesma regra vale para qualquer exceção proposta a F01–F03.

## Evidência, interrupção e encerramento

Registro por caso: ID, commit, ambiente de desenvolvimento, mecanismo/navegador,
pré-condições, status HTTP, tempo relativo, contagens, esperado/observado,
classificação e próximo passo. Somente aprovado, falha real, bloqueio do ambiente
ou inconclusivo; planejado não conta como aprovado. Sem e-mail, account/character ID,
JWT, cookies, senha, links assinados ou dumps de rede/ambiente. Capturas só de telas
sem dados pessoais; evidências auxiliares ficam ignoradas fora do commit.

Parar em destinatário/projeto divergente, quota, resposta incerta, código expirado,
intervenção inesperada do navegador ou alteração de colaborador. Não repetir
cadastro/envio, contornar TLS/CAPTCHA ou apagar dados para retomar. Se falhar,
registrar antes de propor correção e novo ensaio. Preservar todas as contas/personagens.

Ao encerrar CADA lote, inclusive interrupção: restaurar `AUTH_ENABLED=false`, parar
somente API/gateway/helpers iniciados nesta janela e conferir portas fechadas;
manter PostgreSQL e dados. Encerrar apenas sessões do escopo autorizado e conferir
fila de revogação. Se a fila não drenar, registrar pendência preservada, sem fingir
logout remoto ou manter Auth ligado. Nunca limpar sessões de colaboradores.

Aceite final exige matriz consolidada, CI atual, ausência de falha de autorização
aberta e decisão explícita do proprietário sobre os casos restantes. Resolver
esses itens não autoriza merge, deploy ou início automático da Fase 3.

## Decisões operacionais antes de exposição pública

Origem HTTPS comum de produção e banco privado; retenção de metadados;
backup/restauração e gestão da chave de cifragem (sem keyring implementado);
limites/abuso com proxy confiável; carga e continuidade após restart. Não confundir
recuperação de rede ou recuperação automática observada com restauração de backup.
Esses itens não serão contratados, implantados ou testados contra dados reais por
esta preparação. Não adicionar gameplay/economia online para fechar a Fase 2.
