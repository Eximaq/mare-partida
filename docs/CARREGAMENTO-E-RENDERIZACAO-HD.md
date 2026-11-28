# Carregamento e renderização HD

## Causas confirmadas

- O retângulo da captura era um inimigo. As cores da figura coincidem com as constantes de `drawMonsterFallback`. Na rota do Cocox, o resultado falso de uma folha V2 pendente chegava ao desenho procedural usado para o chefe genérico.
- A abertura exigia a instalação de todas as unidades do catálogo público. Depois, uma segunda rotina de desenho escondia a interface até que o primeiro quadro do personagem aparecesse. A navegação podia estar pronta enquanto o download, a decodificação ou a escolha de uma pose ainda aguardavam.
- Uma falha em uma peça podia deixar a composição disponível com a peça ausente e sem nova tentativa. Entre preparações concluídas, a mesma textura podia passar pelo carregador de imagens novamente.
- O service worker antigo podia buscar o arquivo pelo nome original quando o cache da aba não continha os bytes esperados. Nomes iguais podem apontar para conteúdo diferente após uma publicação.

## Correções

A interface é liberada depois de inicializar a sessão. O mapa tem indicação própria de carregamento e a falta da arte do personagem afeta apenas a representação visual. A fila prioriza a pose solicitada e reaproveita tarefas já em curso. Composições e tentativas são vinculadas à identidade visual, à pose e à revisão aprovada. Quando a roupa muda, resultados ainda pendentes da identidade anterior são descartados.

Uma composição válida continua desenhando o corpo e as peças prontas se apenas uma peça falhar. O renderizador tenta recuperar as camadas que falharam duas vezes, com intervalos crescentes. Uma tentativa que deixaria outras camadas de fora é descartada. Os inimigos com arte V2 conservam sua rota e sua HUD durante o atraso ou a falha. A próxima tentativa usa a folha da mesma ação e direção.

O service worker carrega as unidades referenciadas sob demanda, com até três transferências simultâneas e uma tarefa compartilhada por hash. Cada aba mantém o manifesto de sua versão. Para arquivos desse manifesto, um nome reaproveitado em outra publicação só é aceito com o tamanho e o SHA-256 esperados. O cache técnico reaproveita os conteúdos previamente verificados. Os arquivos já visitados continuam disponíveis offline. A política do cache opera em CacheStorage e não grava nos saves ou nas preferências.

## Limpeza

- Removido o fallback procedural de inimigos em `game.js`, sem outro consumidor. Os quatro PNGs estáticos vinculados a tipos reais passam a carregar quando o mapa ou uma prévia os pede.
- As 24 variantes do slideshow de instalação saíram da abertura e da publicação padrão. As três folhas antigas de Cocox também saíram da publicação padrão. Os arquivos-fonte permanecem no repositório para revisão e para o importador.
- A assinatura do pacote nativo foi atualizada pelo verificador existente. As artes, os índices da bancada e as regras de montagem permanecem disponíveis. As duas árvores HD de vestuário usadas pelo compositor passaram a constar do catálogo de conteúdo.

## Verificações e medidas

| Medida | Resultado observado |
|---|---|
| Desenho procedural do Cocox | No Chromium, a mesma pose Sul em espera desenhava 1.126 pixels da cor do torso genérico. A correção desenhou zero pixels dessa cor e recuperou o ataque HD na segunda tentativa, depois de um 503. |
| Requisições desnecessárias no caso do Cocox | Sete solicitações evitadas. Eram as três folhas antigas e os quatro PNGs estáticos. Total de 47.153 bytes de arquivos no cenário, antes de cache e HTTP. |
| Arquivos eliminados da publicação padrão | 9.974.333 bytes de arquivos individuais, referentes ao slideshow e às folhas antigas. Os insumos permanecem no repositório. Esse valor mede a remoção bruta e não o tamanho líquido de todos os pacotes gerados. |
| Transferência obrigatória antes de interagir | A instalação antiga exigia 1.119.539.265 bytes no manifesto preservado da publicação do PR #383. No teste do novo worker, nenhuma unidade foi transferida antes de liberar o comando do cenário controlado. No jogo exportado em localhost, a interface abriu em 1.309 ms. O servidor do ensaio contabilizou 405 respostas e 96.711.805 bytes antes desse ponto, com zero arquivos ZIP de animação HD entregues. Esse ensaio mede a transferência local e usa uma publicação diferente do manifesto antigo. |
| Reuso de imagens no compositor | A repetição do disparo Sul com o rifle 115, o peitoral 151 e o capacete 157 foi de 15 para zero chamadas ao carregador de imagem após soltar a composição. Os cinco quadros mantiveram os mesmos pixels RGBA na comparação em Node. |
| Memória técnica | O cache de fontes decodificadas tem teto de 48 MiB e 128 entradas por compositor, com até seis carregamentos de imagem simultâneos. O cache transitório do worker tem teto de 32 MiB quando o armazenamento persistente falha. Esses limites não são uma medição do pico total do navegador. |

No jogo completo, o inventário e a caminhada funcionaram com o ZIP da pose pendente. Ao liberar o arquivo, o compositor HD recuperou o personagem. Depois de recarregar a página, o save isolado preservou as peças e a personalização. No ensaio real de troca rápida, a resposta antiga foi descartada e 12 desenhos da nova pose reutilizaram os recursos já carregados.

Os testes focados verificam troca rápida de equipamentos, chegada tardia de um resultado anterior, tentativa após falha de camada, máscara e posição da bancada, fonte correta do Cocox, faixa de bytes offline e isolamento de versões entre duas abas. A comparação de quadros mede o trabalho do compositor no cenário exercitado. Não foi medida uma taxa geral de quadros ou de consumo de memória de jogadores em produção.
