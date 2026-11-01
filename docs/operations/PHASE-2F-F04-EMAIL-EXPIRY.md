# F04 — expiração natural do link remoto

Estado em 01/11/2026: **em espera, ainda não aprovado**. Runtime `e30ac98`,
branch `feature/auth-sessions`, PR #162 Draft. O proprietário autorizou um único
pedido/e-mail de recuperação para G e espera de 65 minutos, sem troca de senha.
Não há autorização de F05, novos envios, merge, deploy ou Fase 3.

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

## Execução ainda pendente

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
