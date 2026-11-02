# Sincronização visual do movimento online

## Problema e correção

O ensaio de 02/11/2026 reproduziu saltos no personagem e na câmera com cadência de renderização estável. Cada snapshot substituía imediatamente a posição desenhada e reinicializava a câmera. O caminho de um comando também fazia consultas sequenciais redundantes de CSRF e identidade antes de obter o estado atualizado.

O cliente agora mantém uma apresentação separada da posição autoritativa. Ao receber um snapshot no mesmo mapa, conserva a continuidade visual e dissolve a diferença em 200 ms. Primeiro estado, troca de mapa, intervalo superior a cinco segundos ou grande descontinuidade reinicializam a apresentação. O limite visual de descontinuidade considera a velocidade aprovada e o intervalo entre consultas, com piso de 128 e teto de 512 pixels: um colega começando a andar entre consultas não deve ser confundido com um teleporte. A câmera acompanha normalmente, sem reset a cada consulta. A mesma apresentação é aplicada individualmente aos colegas, com cache limitado ao roster atual de até 16 jogadores e remoção de presenças obsoletas preservada.

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

## Pausas de renderização em CPU limitada

O teste de caminhada contínua não abrangia todo o problema percebido no computador remoto. Um novo perfil alterna direção a cada 400 ms, com paradas de 200 ms, por 20 ciclos, e repete com CPU do navegador limitada em 4x. Usa o mesmo backend descartável e nenhuma conta hospedada.

O perfil identificou custo de desenho de portal/NPCs fora do viewport, formatação numérica repetida, reescrita de mensagens de carregamento a cada frame e reprojeção da HUD em notificações de `busy` sem novo estado. A correção:

- Descarta somente desenho inteiramente fora da tela, preservando margens de rótulos e os dados de interação/colisão.
- Reutiliza o formatador numérico português, mantendo o mesmo arredondamento.
- Atualiza mensagens de carregamento, erro e acessibilidade quando seu estado muda.
- Projeta novamente o estado do jogo somente quando recebe novos dados. Controle, indisponibilidade e botões pendentes continuam atualizados mesmo sem novo snapshot.

Medição no Edge com CPU limitada em 4x, excluindo os primeiros 500 ms e os últimos 100 ms da captura para remover o custo de início/encerramento do profiler:

| Medida | Antes | Depois |
|---|---:|---:|
| Tempo de frame p95 | 51,6 ms | 18,6 ms |
| Maior intervalo entre frames nessa janela | 124,1 ms | 53,6 ms |
| Intervalos acima de 50 ms | 27 | 3 |

São ensaios locais de aproximadamente 12 segundos, com a mesma sequência de entrada; não medem o computador ou a conexão do colaborador. Ainda houve pausas isoladas. A CPU simulada não substitui validação no equipamento remoto, e a latência entre entrada e confirmação do servidor permanece distinta do tempo de renderização. Nenhuma dessas otimizações transfere autoridade ao cliente ou muda saves, aparência, recompensas ou a política de sessão.

`tests/render-hot-path.test.cjs` cobre descarte fora da tela, bordas visíveis, formatação, transições de mensagens e notificações sem dados novos. O teste HTTPS de lobby também observa o DOM e exige que mensagens estáveis não sejam reescritas a cada frame. `MARE_QA_STATIC_ROOT` permite servir o build descartável nesses testes, preservando a instalação contínua durante a validação.

## Cadência de monstros e perseguição automática

O relato posterior distinguiu caminhada manual de combate: monstros já se moviam em passos, e o herói passava a apresentar o mesmo comportamento ao ativar a caçada. O ensaio com o worker real de batalhas, Node, PostgreSQL descartável e Edge reproduziu isso. As consultas de combate têm intervalo mínimo de 750 ms, mas a interpolação de monstros terminava em 180 ms e a correção do herói em 200 ms. O restante do intervalo ficava visualmente parado, mesmo com frames regulares.

A apresentação agora usa o intervalo observado entre snapshots mais 100 ms de margem, limitado entre 250 e 1.250 ms, para monstros e para o herói em combate automático sem caminho manual. Cada novo estado parte da posição atualmente desenhada e segue até o último ponto confirmado. Não extrapola posições desconhecidas. Perda de atualizações termina no ponto confirmado; mudança de mapa, grande descontinuidade e retorno após cinco segundos continuam reinicializando a apresentação. A apresentação dos monstros também é reiniciada nas transições entre vivo e morto. Movimento manual conserva a correção de 200 ms e o caminho autorizado.

A consequência é um atraso visual limitado nos movimentos amostrados, em troca da continuidade entre consultas. Não é previsão de IA no cliente. HP, dano, alvos, recompensas, navegação e relógios continuam vindo do servidor; não houve aumento de consultas ou mudanças de limites de segurança.

No ensaio exploratório de nove segundos sem auto e dezoito segundos com auto, a proporção de frames com deslocamento de algum monstro aumentou de aproximadamente 22–24% para 85–94%; o herói em auto passou de aproximadamente 21% para 78%. Esses números incluem paradas legítimas de IA, têm trajetórias diferentes e não são um benchmark de FPS nem uma medição no computador remoto. A captura posterior ainda teve frames mais longos; esta mudança corrige especificamente as pausas entre snapshots, sem prometer eliminar qualquer travamento.

A regressão determinística em `tests/online-battle-browser.cjs` entrega um novo ponto e retém a próxima resposta, medindo o renderer entre 320 e 600 ms: herói e monstro devem continuar andando sem ultrapassar os pontos recebidos. A versão anterior falhou nesse cenário e a corrigida passou. O teste também mantém HP autoritativo, intenções de habilidades, HUD original, recarga da página, viewport móvel e save da demonstração. Os testes de fundação cobrem cadência, jitter, parada por falta de novos dados e retorno à correção manual curta. O ensaio com worker real é complementar; a fixture de interface não é apresentada como autenticação real no Supabase.


## Caminhada sem aceleração de compensação

O novo relato identificou outro defeito: a transição curta podia aumentar a velocidade para alcançar um snapshot atrasado, e a regra de grande descontinuidade permitia reposicionamento instantâneo no mesmo mapa. O teste com clique no lobby observou aproximadamente 211 px/s na apresentação para 162,2 px/s autorizados. Não era uma autorização do servidor para correr. A velocidade anunciada durante a perseguição também precisava corresponder a `huntSpeed`, em vez de `moveSpeed`.

O herói em caminhada regular agora percorre uma rota de apresentação com orçamento de distância por tempo limitado à velocidade informada pelo servidor. A rota conecta a posição desenhada ao novo ponto confirmado pela navegação com colisões do mapa, seguida do caminho aprovado no snapshot. Nunca amplia `motionUntil`. Distância grande ou retorno de um frame demorado não autorizam teleporte nem corrida de compensação; o passo após uma pausa fica limitado a 100 ms. Uma rota de conexão indisponível mantém a posição visual até obter caminho válido. O servidor continua sendo a autoridade para comandos, posição real e combate.

Primeiro estado, troca de mapa e evento explícito de respawn reposicionam a apresentação. Ações e investidas especiais de frutas conservam sua apresentação própria, separada da caminhada regular. Não houve mudança no balanceamento de `moveSpeed` ou `huntSpeed`, dano, recompensas, relógios, assets ou saves. O efeito de rede lenta pode continuar aparecendo como atraso na resposta; não é mais compensado aumentando a velocidade da caminhada.

Os quatro novos testes de fundação falharam antes da correção: limite de velocidade com confirmação atrasada, clique distante sem teleporte, percurso em torno de obstáculo e cadência irregular/retorno de frame. A integração PostgreSQL verifica que a perseguição anuncia sua velocidade correta e que o comando manual restaura a velocidade de caminhada. `tests/online-walking-browser.mts` acrescenta um worker real, cliques de mouse no lobby e na ilha, 250 ms de atraso artificial por requisição durante os cliques, chegada ao destino e perseguição automática. Mede deslocamento por frame e em janelas de pelo menos 300 ms, com tolerância de três pixels para agendamento do navegador; exige movimento real e preservação do save da demonstração. Usa banco descartável e provedor fictício, sem e-mails ou contas hospedadas.
