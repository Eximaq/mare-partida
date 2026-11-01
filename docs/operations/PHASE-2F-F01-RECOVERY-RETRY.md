# F01 — retomada controlada da recuperação pela interface

Preparação autorizada em 01/11/2026 sobre `50cc977`, registrada em `255c5d9`.
**Estado atual: F01 aprovado na janela posterior conduzida no Opera, sobre
`53bb628`, com nova autorização específica de um pedido/e-mail para G.
Auth false, API/gateway parados e PostgreSQL preservado.** A janela anterior foi
interrompida após pedido manual para A; seu registro permanece abaixo.
Referência: [matriz 2F e diagnóstico anterior](PHASE-2F-FINAL-ACCEPTANCE.md).

## F01 aprovado — Opera, 01/11/2026, 01:38–01:45

Somente G; navegação conduzida pelo agente no Opera do computador do proprietário.
O proprietário digitou e submeteu a nova senha e depois a usou no login. Nenhuma
senha, cookie, token, endereço pessoal ou link assinado integra este relatório.

| Verificação | Evidência observada (America/Sao_Paulo) |
|---|---|
| Pré-condições | Baseline quatro contas/três personagens, zero sessões/fila; HTTPS/readiness 200 com TLS validado, API/gateway somente em loopback |
| Único pedido | 01:38:22: BFF 202, provedor 200; mensagem das 01:38 encontrada no Spam, destinatário exato conferido nos detalhes; sem reenvio ou pedido para outra conta |
| Callback válido | 01:39:27: abertura única do link novo no Opera original; exchange PKCE 200, callback local 303 com código e sem erro remoto; tela Definir nova senha |
| Identidade e sessão | G confirmada pela API do próprio usuário; sessão kind=recovery; assinatura real ES256 e exp-iat=900 verificados sem divulgar JWT |
| Troca pela interface | 01:42:48: atualização de senha no provedor 200 e reset BFF 200; tela Senha alterada. Entre novamente.; proprietário confirmou a submissão |
| Revogação após reset | Epoch de G incrementado uma vez; recovery revogada, zero sessões ativas; logout remoto 204 às 01:42:56 e fila vazia antes do novo login |
| Login e persistência | 01:44:08: login remoto/BFF 200 e /v1/me 200; sessão play de G, ES256/900 s e prazo absoluto 86400 s; Opera mostrou Sua conta e permaneceu autenticado após recarregar |
| Logout | 01:44:48: Sair deste dispositivo 204; provedor 204 às 01:44:57; recarregamento retornou Entrar na conta e /v1/me 401 |
| Encerramento | 01:45:10: Auth false, API/gateway próprios parados; PostgreSQL preservado em 127.0.0.1:55432; zero sessões autorizadas, fila e fluxos não expirados; recovery e play revogadas |
| Preservação | Quatro contas/três personagens, fingerprints de personagens e contas locais A/B/C inalterados; G continua sem personagem; nenhuma mudança de gameplay, assets ou saves |

**Aprovado no escopo revisado de F01: recuperação pela UI, login e logout.** Não
foram repetidos nesta janela a senha antiga, duas sessões prévias, replay ou acesso
a personagens com cookie recovery; a cobertura específica anterior permanece na
Rodada 3. A política de inatividade de 7200 s foi preservada, não aguardada inteira.
Não houve mudança de template, configuração, relógio ou dados internos do provedor.

O sucesso atual não determina a causa do otp_expired antigo nem demonstra correção
de um defeito de runtime: nenhum código foi alterado. A entrega no Spam e o
agrupamento de mensagens exigem conferir destinatário e horário em futuras janelas.
F04/F05 e o aceite final da Fase 2 continuam separados; sem Fase 3, merge ou deploy.

## Resultado da janela de 01/11/2026

Runtime `255c5d9`, exclusivamente desenvolvimento e HTTPS local. Horários abaixo
em America/Sao_Paulo. Observadores locais registraram somente operação, horário,
status e duração, sem corpos, headers, URLs de confirmação ou credenciais.

| Verificação | Resultado e classificação |
|---|---|
| Pré-condições | Aprovadas: HTTPS/readiness 200, loopback, ES256/900 s, BFF 24 h/2 h; template padrão, OTP 3600 s e notificação adicional de senha desligada, em leitura |
| Pedido de G às 01:23:31 | BFF 202, Supabase 200; log hospedado user_recovery_requested associado exatamente a G |
| Entrega de G | Aprovada: mensagem das 01:23 localizada no Spam da caixa autorizada, destinatário conferido nos detalhes; agrupada com recuperações antigas e o pedido posterior de A |
| Pedido às 01:24:22 | Segundo BFF 202/Supabase 200. Proprietário informou ter usado o endereço de A porque não encontrou o de G; log hospedado confirmou A, não uma repetição para G |
| Controle do lote | Interrompido por desvio do procedimento de um envio/uma conta. Nenhum pedido foi disparado pelo agente; nenhum terceiro pedido ou reenvio automático |
| Callback, sessão recovery e reset | Inconclusivos/não executados: nenhum callback, exchange PKCE ou reset registrado nesta janela; nenhum link aberto pelo agente |
| Login com senha nova e logout | Pendentes: não houve troca de senha nem sessão nova; não classificados como aprovados |
| Encerramento às 01:25:59 | Auth false, API/gateway próprios parados; somente PostgreSQL na porta 55432 em loopback. Quatro contas/três personagens, zero sessões ativas/fila, fingerprints dos personagens e contas locais A/B/C inalterados; epoch de G sem alteração |

A causa da mensagem não encontrada nesta janela foi delimitada: ela estava no
Spam, agrupada na mesma conversa. Isso **não explica nem corrige** o otp_expired
do ensaio anterior, cuja causa continua inconclusiva. Não atribuir consumo a Gmail,
scanner ou proprietário sem evidência. A inspeção da caixa não abriu os links nem
removeu o marcador Spam ou alterou filtros.

Os pedidos foram para contas diferentes: não há evidência de substituição do
token remoto de G pelo pedido de A. Separadamente, o BFF grava um único cookie
de fluxo (`__Host-mare_flow`) por origem; uma nova solicitação no mesmo perfil
substitui esse contexto. Usar o link de G após solicitar A nesse perfil não é um
ensaio controlado do fluxo original. Não reconstruir cookies, verificadores ou
estado interno para contornar essa condição.

O pedido de A alterou seu estado de recuperação no provedor; portanto, não declarar
ausência absoluta de alterações no Supabase. Não houve evidência de callback ou
troca de senha de A, e seus dados locais/personagem permaneceram intactos. Os dois
fluxos locais ficaram sujeitos ao prazo normal de dez minutos, sem exclusão manual.

**F01 continua aberto.** Outra tentativa exige autorização específica de um novo
envio para G. Antes dela, preparar a busca da caixa incluindo Spam e conferir o
destinatário dentro da mensagem mais recente, pois o Gmail agrupa contas e horários
diferentes. Não usar o endereço de A como alternativa nem repetir o formulário em
caso de demora. O agente localiza a mensagem; o proprietário só abre o link quando
o contexto original e o destinatário estiverem confirmados, no mesmo Opera.
Nenhuma nova tentativa, alteração de configuração ou Fase 3 está autorizada por
este relatório.

Verificação local posterior: `npm run test:foundation` **28/28 aprovados**;
diff-check sem erros. Essa suíte não substitui o fluxo real pendente. Somente os
dois documentos F01/matriz foram alterados; helpers e evidências permaneceram em
arquivos locais ignorados, sem mudanças de runtime, gameplay, assets ou saves.

## Bloqueio investigado

- Evidência local preservada: um pedido /recover 202, callback 400 com erro remoto
  otp_expired, nenhum reset; o fluxo local ainda estava válido. O registro anterior
  do provedor mostrou pedido 200 e One-time token not found cerca de 42 s depois.
  Um 202 neutro do BFF, isoladamente, não comprova envio ou sucesso do provedor.
- A comparação anterior confirmou que o link novo chegou intacto ao projeto correto,
  com tipo recovery e redirect esperado. Não reabrimos o link usado nem copiamos
  tokens para este relatório. Não houve coleta nova de logs hospedados nesta preparação.
- GET /auth/v1/health respondeu 200, versão atual **v2.197.0**. Isso permite consultar
  uma referência versionada, mas não comprova a versão implantada no instante do incidente.
- Nessa [versão de verify.go](https://github.com/supabase/auth/blob/v2.197.0/internal/api/verify.go),
  a ausência do token e o vencimento são caminhos distintos que podem retornar o
  mesmo código público. A consulta antecede a verificação do prazo e a emissão PKCE.
- Em [one_time_token.go](https://github.com/supabase/auth/blob/v2.197.0/internal/models/one_time_token.go),
  One-time token not found indica ausência de linha correspondente; criar outro token
  do mesmo tipo/usuário substitui o anterior. Isso define uma hipótese verificável,
  não prova segundo pedido, consumo ou problema de persistência neste incidente.
- O [envio de recuperação dessa versão](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mail.go)
  trata envio e persistência do token. A entrega do e-mail sozinha não demonstra
  que o token continuava disponível quando consultado; não inferir rollback ou bug
  interno sem evidência adicional.
- Painel relido: template Reset password usa ConfirmationURL; notificação adicional
  Password changed desligada. Nenhum switch, Save ou configuração SMTP foi alterado;
  a senha SMTP não foi acessada. OTP 3600 s e URLs são evidências da inspeção anterior,
  a reconferir antes da janela, sem confundir com JWT 900 s ou fluxo BFF de 10 min.
- Conta G local coincide com o digest do ensaio anterior, sem personagem/sessões.
  Quatro contas/três personagens preservados, fingerprint inalterado, fila vazia.

**Conclusão:** o ponto de falha está delimitado; a causa permanece inconclusiva.
Não há correção de código justificada nem evidência para culpar usuário, Gmail ou
PKCE local. F03 não corrigiu nem demonstrou correção de F01. O próximo ensaio será
um controle instrumentado com abertura manual no navegador original, não uma
promessa de sucesso. A hipótese a observar é consumo/substituição antes do clique;
ausência de evidência não será tratada como confirmação dessa hipótese.

## Escopo de referência para eventual nova autorização

Somente a Conta G já existente, identificada privadamente ao proprietário: **um
pedido e no máximo um e-mail de recuperação**, sem cadastro, reenvio ou encaminhamento.
Definição da nova senha pelo proprietário na interface, login e logout de G.
Nenhuma criação de personagem; A/B/C, seus personagens e saves ficam preservados.
Se uma notificação adicional estiver habilitada ao reconferir, parar antes do envio
e revisar o orçamento com o proprietário; não desativá-la automaticamente.

A senha anterior de G foi descartada. Este lote não terá duas sessões prévias nem
repetirá senha antiga/invalidação delas; essas evidências permanecem na Rodada 3.
Não criar uma recuperação extra para preparar essas pré-condições.

## Passos para o proprietário — somente depois da autorização

1. Com os serviços locais prontos, abrir **no Opera normal** https://localhost:9443/online/.
   Abrir também a caixa que recebe o alias de G no Gmail desse mesmo perfil.
2. Escolher Recuperar acesso, preencher o destinatário exato de G e clicar uma vez.
   Aguardar a mensagem neutra de envio. Não repetir nem substituir o endereço se
   houver demora ou dúvida; informar ao agente, que localizará a mensagem em leitura.
3. Na caixa/Spam, localizar somente a mensagem nova pelo destinatário e horário.
   Após o agente conferir destinatário/contexto, **clicar uma vez em Reset password**
   no mesmo Opera que iniciou o pedido.
   Não usar celular, janela privativa, perfil diferente ou links antigos. Não copiar
   nem encaminhar o link ao agente/chat. Se a confirmação abrir em outro perfil, parar.
4. Se aparecer Definir nova senha, aguardar a verificação da sessão restrita pelo
   agente; depois digitar uma senha exclusiva de pelo menos 12 caracteres e
   confirmar na tela. Nunca enviar a senha no chat. Se aparecer erro,
   informar apenas a mensagem; não repetir o link, o envio ou a troca de senha.
5. Após confirmação da troca e o agente conferir a fila de revogação vazia, entrar
   na Conta G pela tela e aguardar a conferência.
   Não criar personagem. O logout e o encerramento serão orientados ao terminar.

## Coleta e critérios de interrupção

Observar no BFF apenas operação, horário, status e duração: recover, exchange PKCE,
verificação de identidade/JWKS, reset, login e logout. Observador local ignorado
preparado; não inicia chamadas e não lê corpos, headers, senhas ou tokens. Manter
políticas ES256/900 s e BFF 24 h/2 h, TLS válido e serviços exclusivamente em loopback.

Correlacionar o intervalo do pedido ao callback com logs hospedados em leitura,
considerando pedidos recovery/magiclink e verificações, sem publicar identificadores,
URLs assinadas ou IPs. Registrar acesso anterior ao clique somente se comprovado.
Não testar um link por HEAD/GET, abrir preview dele ou visitá-lo fora do fluxo válido.

Sucesso exige callback PKCE válido, sessão restrita de recuperação, tela de senha,
reset confirmado, login com senha nova e logout. Se o provedor rejeitar novamente,
encerrar como inconclusivo/falha observada conforme a evidência, sem segundo e-mail;
preparar correlação sanitizada para eventual suporte, cujo envio exige autorização.
Não alterar templates, prazos, relógios, confirmação de usuários ou tabelas Auth.
Não usar service_role, secret key ou SQL privilegiado para reparar o estado.

Ao terminar: revogar somente sessões de G pelo fluxo normal, drenar fila, Auth false,
parar API/gateway, manter PostgreSQL e conferir contas/personagens. Registrar cada
caso como aprovado, falha real, bloqueio do ambiente ou inconclusivo. Sem merge,
deploy, DNS ou Fase 3. F04/F05 continuam fora desta autorização.

Preparação verificada: sintaxe do observador e sete chamadas simuladas, zero rede,
respostas preservadas e nenhum corpo/header registrado. Essa verificação não é
homologação de recuperação. Consultas locais somente leitura confirmaram preservação;
porta PostgreSQL em loopback, nenhuma escuta da API/gateway. Documentação verificada
por diff-check e inspeção de links locais; nenhuma mudança de runtime versionada.
