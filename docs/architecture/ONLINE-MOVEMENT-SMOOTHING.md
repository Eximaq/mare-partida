# Sincronização visual do movimento online

## Problema e correção

O ensaio de 02/11/2026 reproduziu saltos no personagem e na câmera com cadência de renderização estável. Cada snapshot substituía imediatamente a posição desenhada e reinicializava a câmera. O caminho de um comando também fazia consultas sequenciais redundantes de CSRF e identidade antes de obter o estado atualizado.

O cliente agora mantém uma apresentação separada da posição autoritativa. Ao receber um snapshot no mesmo mapa, conserva a continuidade visual e dissolve a diferença em 200 ms. Primeiro estado, troca de mapa, intervalo superior a cinco segundos ou descontinuidade acima de 128 pixels reinicializam a apresentação. A câmera acompanha normalmente, sem reset a cada consulta. A mesma apresentação é aplicada individualmente aos colegas, com cache limitado ao roster atual de até 16 jogadores e remoção de presenças obsoletas preservada.

`worldPosition` continua seguindo somente o caminho aprovado, limitado por `motionUntil`. A posição suavizada não é persistida nem substitui a posição usada pelo loop de comandos de movimento. O servidor continua validando destino, colisões, velocidade, sessão, propriedade, controlador, versão e recompensas. Não há alteração de migrações, balanceamento, assets ou saves.

Comandos comuns recarregam somente o estado autorizado do personagem já conhecido. Criação e alteração de identidade continuam lendo a identidade atual, inclusive classe e facção usadas pelos talentos e pela HUD. CSRF fica somente na memória por até 30 segundos, com uma consulta compartilhada entre chamadas concorrentes. Logout, operações de autenticação, mudança de personagem, 401 e rejeição CSRF invalidam esse cache. Nenhuma mutação é reenviada automaticamente por causa dessa otimização; a recuperação idempotente explícita permanece.

## Evidência e limites

Reprodução com Node, PostgreSQL descartável, HTTPS confiável e Edge; provedor de autenticação de fixture, sem e-mails nem contas hospedadas. Caminhada de quatro segundos seguida de parada, comparando a versão anterior com a corrigida:

| Atraso acrescentado por requisição | Maior deslocamento do herói por frame, antes → depois | Maior deslocamento horizontal da câmera, antes → depois | Requisições, antes → depois |
|---|---|---|---|
| 0 ms | 14,89 → 3,85 px | 23,46 → 3,33 px | 17 → 12 |
| 100 ms | 42,90 → 5,49 px | 42,27 → 4,48 px | 17 → 12 |

O frame mediano ficou entre 16,7 e 18 ms nos ensaios. Os números são medições locais, não capacidade de uma VPS nem garantia de desempenho de qualquer computador. A correção suaviza a reconciliação; não elimina latência de confirmação, pequenas correções na parada, pausas do navegador ou perda de conexão. A apresentação não prevê movimentos ainda não aprovados pelo servidor.

Os testes de fundação cobrem continuidade, convergência, parada, limite do caminho, mudança de mapa, imutabilidade, cache CSRF, revogação do cache, ausência de replay automático e atualização de identidade. O teste HTTPS de lobby acrescenta 100 ms às requisições e mede deslocamento por tempo de frame, tanto no herói quanto no colega. Exige movimento real e ausência de saltos abruptos em frames regulares; mantém os cenários de duas contas, retorno de aba, 66 segundos de caminhada, viagem, logout e preservação da demonstração.

Comandos: `npm run test:foundation`, `npm run test:legacy`, `npm run typecheck`, `npm run build`, `python tools/build_pages.py` e `node --env-file-if-exists=.env.test.local --import tsx tests/shared-lobby-browser.mts`, com Playwright e certificado local confiável. Os dados brutos e a gravação do usuário ficam fora do Git.
