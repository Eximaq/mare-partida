# F05 — perda da resposta de troca de senha

Preparação local autorizada em 01/11/2026, sobre `31a92ed`. **O teste hospedado
continua pendente de autorização específica.** Não enviar recuperação de G enquanto
o F04 espera a expiração: outro pedido para a mesma conta poderia substituir o
token reservado e prejudicar o ensaio. Não iniciar Fase 3, merge ou deploy.

## Ensaio local executado

`tests/integration/server-auth-reset-response.test.mts` usa SupabaseProvider real,
SDK/PKCE, assinatura ES256 de fixture, AuthService, rotas HTTP/CSRF e migrations
reais em bancos PostgreSQL descartáveis com nomes aleatórios. Somente o provedor
é simulado, escutando em loopback/porta efêmera; não usa credenciais hospedadas,
não envia e-mails e não acessa contas A/B/C/G. O helper remove exclusivamente o
banco que criou. Auth do ambiente de homologação permanece false.

| Cenário | Esperado e observado |
|---|---|
| Controle positivo | Resposta normal do provedor: reset HTTP 200, `{reset:true}` |
| Commit remoto simulado + resposta ausente | O simulador aplica a senha e não envia resposta; timeout real e inalterado de 4 s do adaptador; BFF retorna 503/password_reset_unconfirmed, sem falso sucesso |
| Sessão no navegador | Cookie de sessão apagado por Max-Age=0 em ambos os cenários |
| Revogação interna | Duas sessões anteriores e a recovery ficam sem autorização; conta de controle independente continua acessível |
| Replay | Segunda chamada reset com a recovery usada retorna 401; somente uma atualização de senha chega ao simulador |
| Revogação remota simulada | Uma entrada na fila, logout global processado, fila zerada e os dois refresh tokens antigos recusados |
| Reconciliação | Senha antiga recusada; senha nova autentica, permite leitura e logout; nenhum reenvio |
| Escopo | Um pedido recovery simulado e uma troca PKCE por cenário; nenhuma chamada ao Supabase hospedado |

Dois cenários focados aprovados; suíte completa de integração PostgreSQL **21/21**
aprovada, typecheck aprovado e `npm test` aprovado (**28/28** testes de fundação
e **123/123** arquivos Node legados). O harness separado de `supa-browser.test.cjs`
não foi executado nesta preparação sem mudanças de interface. São testes de caracterização de comportamento
existente, sem alteração de código de produção; não representam um ciclo TDD de
uma correção nem substituem o F05 real.

## Proposta para a janela hospedada — ainda não autorizada

Somente depois de concluir/classificar F04, usar G e um novo pedido/e-mail de
recuperação, com aprovação específica. O proprietário conhece a senha atual após
F01. Pré-condições: nenhum trabalho de outra conta no BFF, duas sessões de G em
perfis isolados, baseline de contas/personagens, fila vazia e TLS válido. A/B/C
ficam fora de qualquer mutação. Verificar notificações de senha em leitura antes
de fixar orçamento de um e-mail; não mudar configuração para fazê-lo caber.

Preparar instrumentação local de uso único, fora do runtime versionado, com
validação offline antes de armar: aceitar somente o projeto de desenvolvimento,
PUT /auth/v1/user e a sessão recovery específica de G. Identificar a sessão no
servidor e comparar em memória; não registrar bearer, corpo, senha ou token.
Depois de receber a resposta de sucesso real, impedir que ela alcance o adaptador
e produzir erro de transporte. Não falsificar status 200, modificar TLS/firewall,
interceptar outras operações, repetir o PUT nem alterar dados internos do Supabase.

Isso simula perda no limite entre transporte e adaptador **após aceitação remota**;
não prova queda física de rede nem cobre todas as posições de uma interrupção.
O ensaio local acima usa timeout real; a instrumentação hospedada deve distinguir
claramente seu mecanismo de descarte controlado, sem alegar que são idênticos.

O proprietário digitará/submeterá uma nova senha pela UI. O resultado esperado é
503 e a mensagem de troca não confirmada, embora a senha já tenha sido alterada
remotamente. Verificar que as sessões anteriores e a recovery não autorizam mais
o BFF, que a fila drena e que não há retry remoto. Somente após a fila zerar,
testar uma tentativa da senha antiga e uma da nova, digitadas pelo proprietário.
Conferir identidade, logout e preservação. Não pedir outra recuperação para
resolver uma falha sem autorização adicional.

## Riscos, interrupção e encerramento

- A senha pode mudar apesar do erro mostrado ao usuário; não repetir o reset.
- Se o login com a senha nova falhar, o resultado fica inconclusivo; pode ser
  necessário outro e-mail posteriormente, não autorizado por esta proposta.
- A revogação interna é imediata no limite transacional; JWT remoto já emitido
  não é magicamente invalidado antes de expirar. Não alegar atomicidade distribuída.
- Parar em sessão/destinatário divergente, falha da instrumentação ou quota, sem
  contornar políticas. Registrar falha real, bloqueio do ambiente ou inconclusivo.
- Desarmar o injetor, drenar a fila quando possível, Auth false e API/gateway
  próprios parados; preservar PostgreSQL, contas, personagens, gameplay e saves.

A aprovação do teste real deverá nomear G, o único envio, a troca efetiva de senha,
a perda deliberada da resposta e a revogação das sessões de G. Esta documentação
não autoriza essas ações. [Matriz de aceite](PHASE-2F-FINAL-ACCEPTANCE.md).
