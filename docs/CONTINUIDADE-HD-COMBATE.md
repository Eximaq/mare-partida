# Continuidade do personagem HD

## Pacote de animações da aparência equipada

A partir da revisão `10f975c8`, o problema reproduzido era a primeira caminhada continuar desenhando a pose anterior. O renderizador guardava uma pose por vez. A versão atual prepara os quatro repousos, os quatro ciclos de caminhada e as rotas reais de ataque e habilidade da aparência equipada. A arma temporariamente ocultada por uma fruta equipada recebe sua própria rota. O mapa e seus comandos continuam disponíveis enquanto esse trabalho roda.

O primeiro desenho normal exige que as rotas essenciais tenham terminado a preparação. Se um asset falhar, o estado identifica a rota afetada e permite a recuperação assíncrona. O mapa nunca usa a direção anterior como substituta da direção solicitada. Trocar a aparência ou o equipamento descarta o trabalho que deixou de corresponder ao personagem. Trocar apenas de ação, direção ou mapa reaproveita as poses já prontas.

O inventário e a janela de atributos apresentam o mesmo retrato HD de repouso para o Sul, com a aparência e o equipamento atuais e o mesmo enquadramento. Ambos aproveitam a composição do mapa. A silhueta de oclusão usa a pose efetivamente desenhada. As rotas de ataque e habilidade que resolvem a mesma fonte e o mesmo relógio compartilham o raster. As superfícies retidas preservam o alinhamento original e descartam margens transparentes. A leitura dos ajustes publicados é restrita às peças que têm registros para a pose em preparo.

| Ensaio apontado no Chrome, cache frio | Base | Alteração |
|---|---:|---:|
| Quatro caminhadas completas no cache do mapa | 9.609 ms | 5.859 ms |
| Primeiro personagem no mapa | 1.828 ms, repouso isolado | 13.675 ms, com as ações essenciais |
| Preparações físicas de repouso Sul ao abrir o inventário durante a entrada | 2 | 1 |
| Primeiro quadro exato após comando de caminhada | A caminhada acabou antes de aparecer | 4–15 ms |
| Primeiro quadro exato de ataque ou habilidade | As três primeiras execuções terminaram antes de aparecer | 5–10 ms |

Ensaio de referência no Chrome local com Espadachim masculino, arma #1, peitoral #6 e luva #25. O mapa respondeu em cerca de 1 s na versão alterada e o inventário abriu durante a preparação. Foram observados os 16 quadros de cada direção, 64 ao todo. Caminhar, atacar e usar a habilidade após o primeiro desenho geraram zero pedidos adicionais de arte HD e zero recomposições durante os comandos observados.

O navegador também comparou os retratos da mochila e dos atributos com a pose Sul do mapa. Os três rasters coincidiram antes e depois da troca da luva #25 pela #26, inclusive na conferência em 390 × 844.

A prova do compositor comparou o desenho compactado com a referência RGBA, inclusive o alinhamento em escala fracionária e os ajustes publicados. Em um ensaio separado com cinco peças equipadas, as superfícies retidas das oito poses caíram de 272 para cerca de 31 MiB, mais uma superfície compartilhada de até 4 MiB. O dado mede só as superfícies dos quadros, sem estimar a memória total do navegador.

Na combinação masculina inicial da espada #0 com o peitoral #6, a fonte Sul conserva uma falha de validação de cor no quadro 1. A mesma falha foi reproduzida na versão publicada do PR #391. O carregamento registra esse caso como uma rota degradada. A troca para um conjunto novo continua exigindo preparar as poses desse conjunto. A corrida de troca durante o ataque confirmou que ele desenha enquanto a resposta antiga segue retida.

## Referência histórica do PR #391

## Causas e correções

- A preparação trocava a referência do desenho assim que mudava a ação ou a direção. Se a nova composição ainda estivesse pendente, o mapa deixava de desenhar o jogador. O mapa agora conserva a última composição HD compatível com a identidade visual e a revisão dos ajustes. Ao ficar pronta, a pose exata assume o desenho com o relógio da ação em curso.
- A antecipação em combate considera o próximo ataque básico na direção atual e, quando uma fruta equipada permite o movimento, o ataque temporariamente desarmado. Uma solicitação de jogo tem prioridade sobre a antecipação. Uma pose armada não reaparece durante uma ação que exige esconder a arma, mesmo que a pose desarmada ainda esteja pendente.
- O perfil do navegador encontrou leituras de pixels, máscaras e recoloração no preparo e na primeira apresentação de fases com ajustes da bancada. O mapa agora prepara os quadros ajustados em lotes, reaproveita a recoloração de fontes decodificadas e guarda os quadros que serão desenhados. A bancada preserva a edição e a comparação com o original.
- Quando um quadro chegava ao limite de 250 ms, a divisão em passos de 50 ms gerava um sexto passo de aproximadamente 1,39 × 10⁻¹⁷ s. O movimento desse passo era zero, o que fazia a navegação cancelar o caminho. O passo residual foi eliminado. No mapa real, a rota de (1504, 1568) a (1970, 1578) deixa de ser cancelada nessa condição.
- As imagens de efeitos das frutas são pedidas ao equipar ou ao desenhar o efeito pela primeira vez. A mesma imagem é reaproveitada pelos consumidores da sessão.

## Ensaio no jogo

Base `e60e9696`, merge do PR #390. Chrome headless no Windows, 1366 × 780, publicação local, sem limitação simulada de CPU ou rede. Duas execuções equivalentes da rota, com navegador novo em cada uma. As medições após a correção do lobby usaram os módulos atualizados sobre os mesmos assets da publicação de referência.

O percurso partiu de (1504, 1568), atravessou o centro (1970, 1578), a extremidade leste (2728, 1480), o portal de expedição, a região da Nami, o noroeste e a extremidade oeste antes de voltar. A aura de Berri Berri estava ativa. Houve passagens com oclusão, deslocamento de câmera e duas aberturas e fechamentos do inventário.

| Medida | Antes | Depois |
|---|---:|---:|
| Do início da sessão à primeira composição HD no lobby | 1.902 ms | 1.004 ms |
| Intervalo entre quadros do lobby, p95 | 83,4 ms | 33,3 ms |
| Trabalho JavaScript por quadro no lobby, p95 | 62,4 ms | 6,2 ms |
| Desenho da camada do personagem, p95 | 58,8 ms | 0,2 ms |
| Tarefas acima de 50 ms | 129 | 44 |
| Tentativas extras para chegar a um destino | 3 | 0 |

As pausas mais altas ocorreram no centro, ao aproximar do portal e durante a abertura do inventário no centro e perto da Nami. O tempo para abrir a interface inicial variou de 1.280 para 2.306 ms nesse par de execuções. O ganho medido acima é da sessão e do desenho. Ainda houve picos durante a rota e o ensaio local não mede conexão real no Pages.

Para reproduzir o combate, equipe o Espadachim masculino com arma #1 e luva #25, entre em uma caçada e faça repouso, caminhada, ataque para o Sul, retorno ao repouso e nova caminhada. No ensaio instrumentado, a primeira preparação da pose de ataque foi retida por pelo menos 220 ms. Após a primeira sequência, o pacote ficou pronto antes da repetição do golpe. Os golpes continuaram causando dano enquanto o visual aguardava. A repetição com o pacote pronto não pediu novamente o acervo de composição. O ensaio também abriu e fechou o inventário e equipou a luva #26.

| Medida da caçada controlada | Base | Build local |
|---|---:|---:|
| Quadros do primeiro ataque sem personagem | 13 de 13 | 0 de 17 |
| Quadros do ataque com o pacote pronto sem personagem | 0 de 7 | 0 de 45 |
| Pedidos de assets de composição durante o ataque com pacote pronto | 0 | 0 |
| Troca da luva até o primeiro desenho da nova composição | 334 ms | 197 ms |

O número de quadros varia com a cadência do navegador. Nos 17 quadros do primeiro ataque do build local, a pose temporária manteve corpo, aparência e peças corretos. A pose de ataque exata apareceu na repetição.

## Publicação e verificações

A publicação padrão exclui 72 arquivos exclusivos dos pilotos e da prévia isolada do chefe, totalizando 29.038.174 bytes de arquivos de origem. As referências de desenvolvimento continuam disponíveis com `python tools/build_pages.py --include-reviews`. O jogo publicado mantém os cinco corretores de empunhadura, os combates diários das Sete Lâminas e a bancada HD.

Os workflows e suas proteções permanecem vigentes. Os testes de prontidão e movimento distinguem a pose solicitada da pose HD efetivamente desenhada durante a transição. A cobertura continua exigindo que a pose exata assuma o desenho e que uma composição antiga não seja reutilizada depois de trocar equipamentos. As verificações isoladas de transformação, a disponibilidade offline e a integridade do pacote HD foram mantidas.

As verificações locais incluíram a assinatura dos 2.122 recursos nativos, a disponibilidade offline, a rota do Porto, a abertura da bancada com os 92 itens e os cenários de atraso e erro temporário com os dois corpos. A corrida de troca de peitoral durante ataque de cajado confirmou o dano e o desenho correto depois de liberar a resposta antiga. A comparação RGBA preservou quatro referências e confirmou os 16 quadros ajustados da caminhada Oeste entre mapa e bancada.
