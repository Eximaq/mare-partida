# Etapa 2F — matriz de aceite e janela final

Preparação autorizada em 31/10/2026. Referência técnica verificada: `c8be42f`,
branch `feature/auth-sessions`, PR #162 Draft, base de integração main `8550cfa`.
**Estado: preparação concluída; janela final NÃO executada e aceite final aberto.**
Este documento concentra o status atual. Os relatos das rodadas 1–3 preservam
seus resultados históricos e não autorizam novos envios ou operações externas.

## Escopo autorizado nesta preparação

Consolidar documentos, conferir contratos e elaborar os procedimentos. Nenhum
cadastro, e-mail, reset, revogação ou alteração do Supabase está autorizado por
esta preparação. Não iniciar API/gateway nem habilitar Auth somente para preparar
este roteiro. Commit/push documental no PR existente é permitido, com prefixo
`[CF-Pages-Skip]` e exclusão de previews mantida. Sem merge, deploy, DNS ou Fase 3.

## Matriz única de status atual

| ID | Requisito | Evidência/status | Condição para fechamento |
|---|---|---|---|
| A01 | HTTPS local, origem comum e cookie protegido | Aprovado em testes TLS e navegador | Preservar origem localhost:9443; não expor portas |
| A02 | Login, confirmação, PKCE, replay e isolamento do navegador | Rodadas reais 1–2 aprovadas nos casos registrados | G usou cliente HTTP original; B/C cobriram navegador original; não generalizar |
| A03 | Sessões, refresh real/concorrente, controlador e logout | Rodada 1 aprovada | JWT 900 s, BFF 24 h/2 h mantidos; não foi aguardado todo o prazo de 24 h/2 h |
| A04 | Propriedade e criação de personagem | 40 testes cruzados; primeira criação 201/409, um personagem; retries idênticos 201/201 | A/B/C e personagens preservados; sem escrita econômica |
| A05 | Recuperação real pelo backend | Rodada 3: sessão restrita, reset, senha antiga/nova, invalidação interna e refresh recusado | Não cobre preenchimento da senha pela UI; ver F01 |
| A06 | Integração, Node, PostgreSQL e Docker/Linux | `c8be42f`: oito checks CI aprovados; local 28 fundação, 19 integração e 123 arquivos Node | Bloqueios de Fênix/hash resolvidos; CI de novos commits deve ser conferida |
| F01 | Recuperação completa pela interface | Pendente, procedimento abaixo | Uma conta existente autorizada, um envio, participação do proprietário |
| F02 | Revogação iniciada fora do BFF | Pendente no provedor real | Operação suportada, escopo de conta explícito, medir rejeição após revalidação |
| F03 | Rotação real da assinatura JWT/JWKS | Pendente | Autorização do projeto e efeitos; novo JWT ES256/900 s aceito; nenhuma tolerância a assinatura inválida |
| F04 | Expiração do token remoto de e-mail sem uso | Não comprovada; expiração do BFF comprovada | Envio separado, prazo remoto confirmado, espera natural; ou adiamento explícito com risco registrado |
| F05 | Resposta perdida durante reset hospedado | Coberta localmente, não induzida no provedor real | Plano de injeção isolado e autorização adicional; ou adiamento explícito, sem alegar atomicidade |
| O01 | Operação antes de exposição pública | Pendente | Origem de produção, retenção/chaves, abuso, carga e backup/restauração; nenhuma publicação nesta fase |
| G01 | Aceite final da Fase 2 | Aberto | Revisão do proprietário: F01–F03, decisão registrada sobre F04/F05, matriz sem falhas abertas ocultadas |

Evidências de A06: [fundação e Docker/Linux](https://github.com/Eximaq/mare-partida/actions/runs/41263542593),
[regressão integrada](https://github.com/Eximaq/mare-partida/actions/runs/41263542566),
[native96](https://github.com/Eximaq/mare-partida/actions/runs/41263542598).
Nenhum teste de runtime foi repetido para esta edição documental. O plano original
é histórico; [ADR](../architecture/ADR-0002-BFF-SESSIONS.md) e esta matriz descrevem
as decisões vigentes. CI verde não significa autorização de produção ou Fase 3.

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

## Lote F03 — assinatura ES256/JWKS, orçamento de zero e-mails

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
