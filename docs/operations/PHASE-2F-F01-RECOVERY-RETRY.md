# F01 — retomada controlada da recuperação pela interface

Preparação autorizada em 01/11/2026 sobre `50cc977`. **Não houve envio, abertura de
link, troca de senha ou alteração do Supabase. Auth permanece false e API/gateway
parados.** A execução abaixo depende de autorização específica do proprietário.
Referência: [matriz 2F e diagnóstico anterior](PHASE-2F-FINAL-ACCEPTANCE.md).

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

## Escopo a autorizar

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
   Aguardar a mensagem neutra de envio. Não repetir se houver demora ou dúvida.
3. Na caixa/Spam, localizar somente a mensagem nova pelo destinatário e horário.
   **Pode clicar uma vez em Reset password**: abrir no mesmo Opera que iniciou o pedido.
   Não usar celular, janela privativa, perfil diferente ou links antigos. Não copiar
   nem encaminhar o link ao agente/chat. Se a confirmação abrir em outro perfil, parar.
4. Se aparecer Definir nova senha, digitar uma senha exclusiva de pelo menos 12
   caracteres e confirmar na tela. Nunca enviar a senha no chat. Se aparecer erro,
   informar apenas a mensagem; não repetir o link, o envio ou a troca de senha.
5. Após confirmação da troca, entrar na Conta G pela tela e aguardar a conferência.
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
