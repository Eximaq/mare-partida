# F04 — expiração natural do link remoto

Estado em 01/11/2026: **aprovado no cenário real autorizado**. Runtime equivalente
a `e30ac98`, checkout `71e6ae5` (nenhum diff em servidor, cliente de contas,
shared ou gateway entre esses commits), branch `feature/auth-sessions`, PR #162
Draft. O proprietário autorizou um único
pedido/e-mail de recuperação para G e espera de 65 minutos, sem troca de senha.
F05 foi preparado e testado localmente; seu ensaio hospedado, novos envios,
merge, deploy ou Fase 3 continuam sem autorização.

## Preparação e envio observados

- Painel do projeto de desenvolvimento consultado em leitura: Email OTP expiration
  **3600 segundos**. Nenhuma configuração ou relógio alterado.
- Baseline: quatro contas/três personagens, zero sessões autorizadas e fila vazia;
  identidade local de G conferida, sem personagem. HTTPS/readiness 200 com TLS
  validado; API/gateway somente em loopback.
- Um pedido no Opera: provedor 200 em **2026-11-01T04:54:55.716Z** (01:54:55 em
  America/Sao_Paulo), BFF 202. Sem repetição. Mensagem das 01:54 listada no Spam na
  busca restrita à conta autorizada; link não aberto.
- Auth false e API/gateway próprios parados às 01:55:05; PostgreSQL preservado
  em 127.0.0.1:55432. Contagens/fingerprints preservados, zero sessões/fila, um fluxo
  local pendente sujeito à expiração normal. Não excluir ou reconstruir esse fluxo.
- Retomada automática única preparada neste chat, após o prazo. Se o desktop estiver
  bloqueado ou indisponível, registrar impedimento sem contornar a proteção.

## Procedimento autorizado, agora executado

**Não abrir o link antes de 2026-11-01T05:59:55.716Z** (02:59:55 em São Paulo).
Comparar timestamps ISO em UTC; não usar conversão de datas dependente de cultura.
Preparar novamente o HTTPS local, conferir a mensagem exata por destinatário e
horário no Opera e abrir seu link uma única vez. Não usar links anteriores,
reenviar, modificar a senha ou alterar o estado do provedor.

Correlacionar a recusa com os logs Auth hospedados em leitura. O código público
otp_expired e o callback 400 local não bastam para determinar a causa: o prazo
PKCE do BFF é de dez minutos e terá vencido independentemente. Distinguir evidência
de token remoto expirado de token ausente, consumido ou substituído. Se a evidência
não permitir essa distinção, classificar como inconclusivo, não como aprovado.
Não usar o mesmo link também como controle positivo.

Ao encerrar: Auth false, API/gateway próprios parados, PostgreSQL preservado,
contas/personagens inalterados, zero sessões/fila. Atualizar esta evidência e a
[matriz 2F](PHASE-2F-FINAL-ACCEPTANCE.md), sem credenciais, endereços pessoais,
links assinados, IDs pessoais ou logs brutos. Helpers/evidências ficam ignorados.

## Resultado observado

- A retomada automática chegou antes do limite. O guard ISO/UTC recusou iniciar
  às 05:59:54Z; a checagem seguinte passou às **06:00:08Z**, após `notBefore`.
  Nenhum relógio ou prazo foi alterado.
- API/gateway iniciados somente após esse guard. HTTPS/readiness **200**, com
  verificação TLS habilitada; listeners exclusivamente em loopback. PostgreSQL
  preservado. Nenhuma reconstrução de cookie, PKCE ou fluxo expirado.
- No Opera original, conferidos destinatário G e cabeçalho da mensagem de
  **01/11/2026 às 01:54**. Aberto somente o link dessa mensagem, uma vez, após
  aproximadamente **65 minutos e 32 segundos** desde o envio. Nenhum pedido novo.
- Gateway registrou callback às **06:00:28.312Z**, HTTP **400**, sem `code`, com
  `error_code=otp_expired`; navegador mostrou `invalid_auth_flow`.
- O painel Auth Logs do projeto de desenvolvimento, consultado em leitura,
  registrou às **06:00:29Z** o evento GET `/verify` com **error e msg iguais a
  `email link has expired`**. Essa evidência causal distingue a expiração remota
  do erro genérico e do vencimento independente do PKCE local. Nenhuma chave
  privilegiada ou edição de dados do provedor foi utilizada.
- Nenhuma troca PKCE, alteração de senha ou nova sessão ocorreu no backend.
  Auth false e os dois processos próprios encerrados às **06:00:54Z**. Apenas
  PostgreSQL permaneceu escutando, em 127.0.0.1:55432.
- Conferência final: **quatro contas, três personagens, zero sessões autorizadas,
  zero revogações pendentes e zero fluxos recovery válidos**. Fingerprints dos
  personagens e demais contas inalterados; epoch de G sem mudança.

O teste prova a recusa por expiração do token remoto de recuperação no prazo
configurado de 3600 s, com margem de cinco minutos. Não determina o instante
exato da fronteira e não é controle positivo do mesmo link. O F01 já documenta
separadamente o fluxo válido. Não houve reenvio, reset, alteração de TTL, gameplay,
saves, assets ou configuração do Supabase. A única atualização versionada deste
resultado é documental; F05 hospedado e aceite final permanecem pendentes.
