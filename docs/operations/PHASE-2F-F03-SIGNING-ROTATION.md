# F03 — proposta de rotação de assinatura em desenvolvimento

Preparação em 01/11/2026, runtime `f98063e`, documentação-base `faec32f`.
**Somente leitura e planejamento. Nenhuma chave criada, ativada, revogada ou excluída.**
F03 ainda não autorizado para execução; F01 permanece pendente para o fechamento.
Referência de aceite: [matriz 2F](PHASE-2F-FINAL-ACCEPTANCE.md).

## Estado verificado antes da proposta

- Projeto exclusivo `mare-partida-auth-dev`; painel JWT Keys: uma chave Current
  ECC/P-256 (ES256), nenhuma standby, uma Previous HS256/Shared Secret.
- JWKS público: HTTP 200, uma chave EC/P-256/ES256, uso sig e cache-control
  public/max-age=600. Nenhum identificador ou material de chave copiado para este documento.
- Aplicação usa publishable key e valida exclusivamente ES256. A chave HS256 anterior
  continua no inventário do provedor, mas é rejeitada pelo verificador do jogo;
  sua revisão/revogação é escopo separado, não limpeza automática neste lote.
- BFF: cache JWKS de 300000 ms e timeout de 4000 ms. A versão instalada de jose usa
  cooldown padrão de 30000 ms ao buscar uma chave desconhecida; isso não garante
  que a resposta do cache do provedor já contenha uma chave recém-criada.
- Quatro contas, três personagens, zero sessões internas ativas e fila vazia.
  Não foi feito censo de todas as sessões remotas de possíveis outros consumidores.
- Auth false, API/gateway parados; PostgreSQL continua em loopback. Política mantida:
  JWT 900 s, sessão absoluta 86400 s e inatividade 7200 s.

## Alteração proposta no Supabase

Criar **uma** chave ES256 gerada pelo próprio Supabase em standby. Depois da
propagação e dos controles abaixo, ativá-la como Current. A ES256 atual passa a
Previous e continua confiável. O estado final esperado é nova ES256 Current,
ES256 antiga Previous e HS256 legada Previous, sem standby criada em duplicidade.

Não mudar algoritmo, JWT TTL, publishable key, SMTP, URLs, Data API, usuários,
senhas, banco do jogo ou AUTH_ENCRYPTION_KEY. Não importar/exportar chave privada,
revogar ou excluir chaves. Essa operação altera a assinatura dos novos tokens de
**todo o projeto de desenvolvimento**, não somente da Conta A.

A [documentação oficial](https://supabase.com/docs/guides/auth/signing-keys)
distingue standby, ativação e revogação; ambas as chaves continuam confiáveis
após rotação. Também informa cache de JWKS e limitações temporais entre mudanças
de estado. A proposta abaixo preserva essa sobreposição e não promete reversão
instantânea nem invalidação imediata de JWTs antigos.

## Sequência de execução — somente após autorização

1. Reconferir projeto/inventário e dados; parar se surgir alteração de colaborador
   ou consumidor desconhecido. Registrar apenas contagens e comparações, sem kids.
2. Criar uma standby ES256. Manter Auth desligado durante a propagação. Reservar
   inicialmente **20 minutos** de margem, uma decisão conservadora deste ensaio;
   tempo decorrido sozinho não aprova o gate. Confirmar as duas chaves ES256 no
   JWKS público e respeitar qualquer cooldown do painel. Se não propagou, não ativar.
3. Iniciar BFF/gateway local. Proprietário entra na Conta A em um perfil; conferir
   JWT antigo ES256/900 s e identidade, com o BFF validando a assinatura. Usar o
   mesmo processo para o teste com cache aquecido. Confirmar que a chave standby
   já está publicada antes desse aquecimento; não reiniciar para esconder uma falha.
4. Ativar a standby uma única vez. Conferir estado esperado no painel e obter um
   novo login de A em segundo perfil isolado, com senha digitada pelo proprietário.
   Provar que o novo JWT foi assinado por chave diferente, ES256/900 s, e que o BFF
   com cache aquecido o aceita. IDs/tokens são comparados em memória, nunca publicados.
5. Conferir continuidade da sessão original, sem chamar logout ou rotacionar cookie.
   Validar criptograficamente o JWT anterior ainda não expirado em controle isolado;
   /v1/me 200 sozinho não prova nova verificação de assinatura a cada leitura.
6. Aguardar o refresh natural da sessão original e verificar nova assinatura, mesma
   conta/personagem e ausência de duplicação. Manter 900 s/24 h/2 h e relógio real.
7. Reiniciar somente o BFF local para o teste com cache vazio. Fazer novo login real
   e comprovar descoberta JWKS/validação no processo novo; reinício seguido apenas
   de /v1/me não basta, pois uma sessão interna ainda válida pode dispensar refresh.
8. Encerrar as sessões de teste de A pelo fluxo normal, conferir fila e preservação,
   Auth false e processos locais parados. PostgreSQL e personagens permanecem.
   A nova ES256 fica Current se o teste passar; não desfazer uma rotação bem-sucedida.

Estimativa de janela: **40–60 minutos**, incluindo propagação e refresh natural.
Orçamento: zero e-mails e zero novos cadastros. Participação do proprietário:
logins iniciais nos perfis indicados e um login após o restart, sem fornecer senha
no chat. Não abrir uma janela se ele não puder participar desses passos.

## Riscos e resposta a falhas

| Risco | Controle / resposta |
|---|---|
| Cache ainda não conhece a nova chave | Propagar antes de ativar; verificar cache aquecido e vazio; não ignorar assinatura ou aumentar tolerância |
| Falha de login/refresh após ativação | Registrar 401/503 e motivo sanitizado; interromper novos testes; não reclassificar como sucesso |
| Impacto em outros clientes do projeto | Rotação é global ao projeto; reconferir consumidores, manter chave anterior confiável e preservar contas |
| Rotação confundida com revogação | Tokens antigos ainda válidos devem continuar aceitos; rejeição de chave revogada não será alegada nem testada neste lote |
| Retorno não imediato | Painel pode impor espera entre mudanças; caches continuam relevantes. Não garantir recuperação instantânea |
| Confusão com chave de cifragem local | AUTH_ENCRYPTION_KEY e credenciais PostgreSQL não serão tocadas; trocar a assinatura JWT não recifra sessões |

Plano de retorno proposto para incluir na autorização: em falha atribuída à nova
assinatura, mover **a ES256 que era Current no início** de Previous para standby
e reativá-la, respeitando os bloqueios do painel. Não selecionar HS256 como retorno,
não revogar/excluir a nova chave e não repetir alternâncias. Manter Auth desligado
se o retorno não estiver disponível ou não resolver. Voltar a assinar com a antiga
não desfaz os tokens emitidos pela nova enquanto ambas continuarem confiáveis.

O retorno é uma segunda alteração externa e precisa constar da autorização.
Sem essa autorização, a resposta à falha será parar o ensaio e desligar Auth,
apresentando o estado observado antes de qualquer nova ação no painel.

## Escopo concreto para aprovação

Autorizar, exclusivamente neste projeto de desenvolvimento: criar uma standby
ES256, aguardar/validar propagação, ativá-la, executar logins/refresh/restart local
com a Conta A e encerrar suas sessões de teste. Incluir explicitamente o retorno
único à ES256 anterior em caso de falha, se desejado. Sem e-mails, revogação ou
exclusão de chaves, alterações de configuração adicionais, merge ou deploy.

F03 só será aprovado com evidências reais dos controles acima; nenhuma operação
foi executada por esta preparação. A recuperação F01 e os demais casos pendentes
continuam impedindo declarar aceite completo da Fase 2 ou iniciar Fase 3.
