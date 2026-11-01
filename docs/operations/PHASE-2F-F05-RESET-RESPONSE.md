# F05 — perda da resposta de troca de senha

Preparação local autorizada em 01/11/2026, sobre `31a92ed`. **Ensaio hospedado
autorizado e concluído em 01/11/2026, sobre `5332f51`: segurança e reconciliação
aprovadas; ressalva de interface corrigida e validada localmente abaixo.** F04 foi concluído antes deste
único novo envio para G. Não iniciar Fase 3, merge ou deploy. O aceite final da
Fase 2 permanece com o proprietário.

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

## Procedimento aprovado para a janela hospedada

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

A autorização específica do proprietário cobriu G, um único envio, a troca efetiva
de senha, a perda deliberada da resposta e a revogação das sessões de G. Não autoriza
outro envio ou nova troca. [Matriz de aceite](PHASE-2F-FINAL-ACCEPTANCE.md).

## Ensaio real e evidências sanitizadas

Horários abaixo em UTC de 01/11/2026 (São Paulo = UTC menos três horas).
Somente `mare-partida-auth-dev` e HTTPS local, com verificação TLS habilitada.
Notificação automática de senha alterada estava desativada no painel; conferida
em leitura, sem mudar configuração. Não foram usados recursos administrativos.

O controle automático do Opera foi bloqueado pela ferramenta antes de qualquer
envio. Auth e os processos foram desligados nessa interrupção. A janela foi
retomada com autorização para orientação manual: o proprietário operou o Opera
normal/privativo e digitou senhas; o perfil integrado foi o outro login anterior.
Não houve contorno da proteção da ferramenta. O fluxo recovery usou a mesma
janela privativa desde o pedido até o callback.

Instrumentação privada e ignorada pelo Git: guardas de projeto, destinatário,
método/rota e bearer comparado em memória à sessão recovery de G no PostgreSQL.
Marcadores exclusivos em disco limitam pedido recovery e PUT remoto a um cada,
inclusive após reinício. O injetor foi armado após conferir duas sessões play e
uma recovery de G; oito verificações offline passaram, incluindo concorrência,
repetição, projeto/destinatário divergente, bearer incompatível e recusa remota.
Nenhuma senha, token ou corpo de pedido foi registrado pelo observador.

| Critério | Resultado observado | Classificação |
|---|---|---|
| Sessões anteriores | Dois logins G em perfis separados, 06:50:33 e 06:52:10; duas sessões play autorizadas no banco | Aprovado |
| Um envio | Único pedido recovery aceito pelo provedor 200 às 06:54:21 e BFF 202; sem cadastro/reenvio | Aprovado |
| Callback e identidade | PKCE 200 às 06:55:56; callback 303 às 06:55:57; recovery de G validada, JWT ES256/900 s | Aprovado |
| Resposta perdida | PUT remoto 200 às 06:58:06.386; injetor descartou a resposta às 06:58:06.387; reset BFF 503 às 06:58:06.405 | Aprovado |
| Revogação | Epoch G incrementado uma vez; duas sessões play e recovery sem autorização; logout remoto 204 às 06:58:11; fila zerada antes do novo login | Aprovado |
| Repetições | Duas chamadas adicionais de reset às 06:58:23 e 06:58:46 retornaram 401; apenas um PUT chegou ao provedor | Aprovado para recusa; não alegar apenas uma submissão na UI |
| Navegadores antigos | Opera normal voltou ao login conforme captura do proprietário; perfil integrado também observado em login; leituras /v1/me 401 | Aprovado |
| Senha antiga/nova | Proprietário informou tentativa antiga e depois nova; provedor 400/BFF 401 às 07:08:42, provedor/BFF 200 às 07:08:53; nova identidade de G validada em leitura | Aprovado |
| Persistência e saída | /v1/me 200 após recarregar às 07:09:33; logout local 204 às 07:09:45; /v1/me 401 após recarregar; logout remoto 204 às 07:09:51 | Aprovado |
| Mensagem da primeira falha | Primeiro status 503 comprovado; texto inicial na UI não foi capturado. Proprietário relatou depois “Sua sessão terminou. Entre novamente.”, compatível com os retries 401 | Inconclusivo quanto ao texto inicial; sem ocultar a observação |
| Encerramento | Injetor desarmado; Auth false/API/gateway parados às 07:10:14; somente PostgreSQL em loopback | Aprovado |

Estado final: **quatro contas, três personagens, zero sessões autorizadas, zero
revogações pendentes e zero fluxos recovery válidos**. Fingerprints dos personagens
e demais contas preservados. G continua sem personagem, com epoch +1 esperado.
JWT 900 s, sessão play absoluta 24 h/inatividade 2 h mantidos. Sem alterações em
gameplay, HUD, Paper Doll, mapas, assets, saves ou runtime versionado.

## Ressalva de interface e limites do resultado

**Observação real de UX:** após a resposta perdida, o formulário de definir senha
permaneceu visível e permitiu novas submissões. As duas foram recusadas pelo
backend; isso não demonstrou sessão ainda válida nem nova troca no provedor.
Correção posterior autorizada: consumir a tela de reset ao receber resultado
incerto/sessão inválida, apresentar acesso ao login e preservar a explicação sobre
a senha possivelmente alterada, com regressão de interface. Não foi corrigido
durante o ensaio hospedado; a implementação e validação posteriores constam abaixo.

O descarte foi local, após resposta real de sucesso, e durou menos de um segundo;
não foi uma queda física de rede ou o timeout de quatro segundos do ensaio local.
Não se afirma atomicidade entre bancos nem invalidação imediata de JWT remoto já
emitido. Refresh tokens antigos não foram apresentados novamente ao provedor
nesta janela; o logout remoto 204 e a revogação interna foram comprovados.
Documentos são a única mudança versionada desta conclusão. Testes offline e
evidências privadas permanecem ignorados; os resultados locais anteriores não
são apresentados como nova execução da suíte completa nesta janela.

## Correção posterior da interface, sem novo envio

Sobre `dfec0d5`, a solicitação seguinte do proprietário autorizou corrigir a
ressalva. `account.js` agora encerra o formulário e mostra o login ao receber
`password_reset_unconfirmed`, `authentication_required` ou uma falha de transporte
sem resultado conhecido. Remove o parâmetro recovery da URL, limpa a senha e
preserva uma mensagem que não anuncia sucesso indevido. Uma guarda impede
submissões concorrentes e novas submissões na mesma página após consumir o fluxo.
Recusas de validação continuam permitindo corrigir a senha sem novo e-mail.

Regressão em `tests/foundation/account-reset-ui.test.mts`: o código real do cliente
foi executado com DOM mínimo e respostas controladas. Antes da mudança, quatro
cenários falharam pelos motivos esperados (formulário aberto e dois pedidos
concorrentes); depois, **5/5 passaram**, incluindo a validação recuperável.
Typecheck, **21/21 integrações PostgreSQL** e `npm test` (**33/33 fundação**,
**123/123 arquivos Node legados**) passaram. O harness separado
`supa-browser.test.cjs` não integra essa contagem; a validação visual executada
nesta correção é a fixture de recuperação descrita a seguir.

Navegador integrado em HTTPS local com fixture explícita, sem banco ou provedor
externo: um reset simulado 503 levou a “Entrar na conta”, manteve o aviso de senha
possivelmente alterada e removeu o formulário de reset. Apenas um pedido de reset
foi registrado. Dado de senha fictício; nenhuma conta ou senha real foi utilizada.
A fixture foi encerrada e Auth permaneceu false. Contas, personagens e fila foram
conferidos e preservados. Isso valida a UI localmente e **não constitui novo
ensaio SMTP/Supabase**. O texto inicial do ensaio real permanece inconclusivo no
registro histórico; a correção não reescreve essa evidência. Aceite final da Fase 2
continua pendente, sem Fase 3, merge ou deploy.
