# F03 — rotação de assinatura em desenvolvimento

Preparação em 01/11/2026, runtime `f98063e`, documentação-base `faec32f`.
**Execução autorizada em 01/11/2026, incluindo retorno único à ES256 anterior em
caso de falha. F03 aprovado nos cenários reais abaixo; janela encerrada.**
Nova ES256 permanece Current; F01 e o aceite final da Fase 2 continuam pendentes.
Referência de aceite: [matriz 2F](PHASE-2F-FINAL-ACCEPTANCE.md).

## Janela de execução — resultado

Base `39b0890`, exclusivamente projeto de desenvolvimento. A autorização inclui
uma standby ES256 gerada pelo provedor, ativação após propagação, logins da Conta A,
refresh natural, cache aquecido/vazio e retorno único à ES256 anterior se necessário.
Não inclui revogar/excluir chaves, alterar prazos, enviar e-mails ou fazer deploy.

- 01/11/2026, aproximadamente 00:13:47 (America/Sao_Paulo): criada uma standby
  ECC/P-256. Painel confirmou Current ES256 + Standby ES256 + Previous HS256.
  Chave privada gerada pelo Supabase, sem importação, exportação ou leitura.
- JWKS público passou de uma para duas chaves EC/P-256/ES256, mantendo a anterior.
  A primeira leitura com ambas ocorreu após 88 s; isso não encerrou a margem de
  propagação de 20 minutos. Auth permaneceu false, API/gateway parados.
- Às 00:33:57, após 1210 s, o gate confirmou ambas as ES256 no JWKS. API e gateway
  foram iniciados em loopback; HTTPS /health/ready e /online/ retornaram 200 com
  validação TLS habilitada. Auth foi ligado somente para a janela; nesse momento,
  a chave anterior ainda era Current e a nova aguardava ativação.
- Baseline: quatro contas, três personagens, zero sessões internas ativas e zero
  revogações pendentes. Fingerprint dos personagens igual ao fechamento de F02.
- Teste complementar `node --import tsx --test tests/foundation/supabase-provider.test.mts`:
  um teste aprovado. Provedor simulado neste teste; não substitui a rotação hospedada.
- Coleta local com consultas somente leitura, comparação de assinatura e observação
  de status de chamadas do BFF. Tokens não aparecem em logs; o token antigo de
  controle foi guardado apenas cifrado em arquivo local ignorado, sem refresh token.
- Login inicial da Conta A aceito pelo BFF: chamada de login 200 às 00:35:54,
  JWKS 200 e identidade confirmada 200. Controle independente confirmou assinatura
  pela ES256 anterior, JWT 900 s, uma sessão interna e personagem preservado.
- Às 00:36:43 foi solicitada a única ativação autorizada. Painel confirmou nova
  ES256 Current, ES256 anterior Previous e HS256 legada Previous; nenhuma standby
  remanescente, chave revogada ou excluída. Às 00:36:48, o JWT antigo ainda passou
  na verificação criptográfica, com 846 s restantes. A UI original permaneceu
  autenticada após recarregar; esta leitura não foi tratada como prova de revalidação JWT.
- Segundo login da mesma conta, no Opera isolado, às 00:37:45: BFF aceitou o JWT
  assinado pela nova ES256, duração de 900 s e identidade preservada. Duas sessões
  internas ativas, sem novas contas ou personagens. Mesmo processo BFF; apenas
  uma busca JWKS registrada desde o início e cache carregado havia cerca de 111 s.
  **Cache aquecido aprovado**; não houve restart nem nova busca para ocultar falha.
- A sessão do Opera foi encerrada localmente para evitar refresh em segundo plano
  durante o futuro teste de cache vazio. Logout remoto 204 às 00:41:38; sessão
  original preservada e fila vazia. Essa antecipação do encerramento não alterou
  o token ou o prazo da sessão reservada ao refresh.
- Refresh natural da sessão original: primeira consulta após o vencimento acionou
  refresh remoto 200 às 00:51:20, JWKS 200 e identidade confirmada 200; /v1/me 200
  às 00:51:21. Novo JWT assinado pela nova ES256, 900 s, mesma sessão interna,
  mesma sessão do provedor e mesmo proprietário/personagem. Sem alteração de
  relógio, expiração, dados internos ou reinício antecipado. A consulta periódica
  aconteceu cerca de 25 s após o vencimento; o BFF aguardou a revalidação para responder.
- Após o refresh, logout local da sessão original e fila drenada. Reiniciado
  somente o BFF; gateway e PostgreSQL mantidos. Novo processo começou sem chamadas
  ao provedor. Login real às 00:52:38 provocou a primeira busca JWKS desse processo,
  seguida de identidade confirmada: todas 200. JWT novo ES256/900 s validado;
  **cache vazio aprovado**, sem refresh concorrente anterior para aquecê-lo.
- Último logout local: revogação remota 204 às 00:53:03, fila drenada. Encerramento
  às 00:53:22: Auth false, portas 8788/9443 sem listeners, PostgreSQL preservado
  em loopback. Quatro contas, três personagens com fingerprint inalterado, zero
  sessões internas ativas e zero revogações pendentes. Configuração local voltou
  ao estado inicial; credenciais e políticas não foram alteradas.

| Controle | Resultado |
|---|---|
| Uma standby ES256 gerada pelo provedor e propagada antes de ativar | Aprovado; 1210 s de margem e duas ES256 no JWKS |
| Uma ativação, preservando a antiga como Previous | Aprovado; nenhuma chave revogada/excluída |
| Token antigo ainda válido após a ativação | Aprovado por verificação criptográfica independente, antes de expirar |
| Login com nova assinatura e cache aquecido | Aprovado no mesmo processo, sem nova busca JWKS |
| Refresh natural e continuidade da sessão original | Aprovado no provedor real, JWT ES256/900 s |
| Login real em novo processo/cache vazio | Aprovado; primeira busca JWKS causada pelo login |
| Logout, preservação e encerramento local | Aprovado; zero sessões/fila, Auth false, API/gateway parados |
| Retorno à chave anterior | Não executado: não houve falha que o exigisse |
| Rejeição de uma chave revogada | Fora do escopo; nenhuma revogação autorizada ou executada |

Limites: o ensaio cobriu o BFF local e os dois perfis autorizados; não prova o
comportamento de consumidores desconhecidos nem disponibilidade de produção.
A ES256 anterior e a HS256 legada continuam confiáveis no provedor; o jogo aceita
somente ES256. A revisão/revogação dessas chaves exige escopo próprio, e não foi
simulada por expiração de JWT. Rollback permaneceu preparado, sem execução.

Sem e-mails, cadastros, mudança de senha, chave administrativa, migração, alteração
de gameplay/assets/saves, merge, deploy, DNS ou Fase 3. Apenas este documento e a
matriz foram modificados no repositório; auxiliares/evidências continuam ignorados.
O teste unitário complementar usa provedor simulado; os resultados funcionais
acima vieram do Supabase de desenvolvimento real. As seções seguintes preservam
o plano autorizado e não representam novas operações a executar.

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

## Sequência autorizada — plano original

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

## Escopo submetido e aprovado — histórico

Autorizar, exclusivamente neste projeto de desenvolvimento: criar uma standby
ES256, aguardar/validar propagação, ativá-la, executar logins/refresh/restart local
com a Conta A e encerrar suas sessões de teste. Incluir explicitamente o retorno
único à ES256 anterior em caso de falha, se desejado. Sem e-mails, revogação ou
exclusão de chaves, alterações de configuração adicionais, merge ou deploy.

O critério original exigia evidências reais dos controles acima; elas foram obtidas
na execução registrada no início deste documento. A preparação original não
executou operações. A recuperação F01 e os demais casos pendentes continuam
impedindo declarar aceite completo da Fase 2 ou iniciar Fase 3.
