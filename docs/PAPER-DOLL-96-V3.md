# Personagens de 96 px — bases por camadas e ataques

28/10/2026. O proprietário aprovou a nova aparência masculina/feminina na
simulação do lobby. **A aprovação foi do desenho estático, não de todas as
animações, equipamentos ou de uma migração do personagem publicado.**

## Cobertura desta etapa

- Oito referências: masculino/feminino × sul, norte, oeste e leste.
- Cada referência tem corpo neutro, rosto, cabelo, bermuda e roupa superior
  independentes; a roupa superior masculina é uma camada vazia legítima.
- Oito ciclos de caminhada, oito frames reais a 8 FPS, e oito de Idle, quatro frames a 4 FPS: quatro direções por corpo. Camadas independentes.
- Os seis ataques anteriores foram retargeteados para os dois corpos nas
  quatro direções: espada, soco, disparo, adagas, tecnologia e canalização.
  São48 entradas de oito frames reais,12FPS, com início, golpe e recuperação.
  Disparo e tecnologia eram idênticos nos PNGs/fontes anteriores: compartilham
  oito clips, resultando em40 animações geradas distintas, sem custo duplicado.
- A continuação de29/10 completou os14 ciclos pendentes. A pose estática aprovada continua separada do Idle animado. Encaixes, contatos refinados, novos estilos e custos em [PAPER-DOLL-96-PERSONALIZACAO.md](PAPER-DOLL-96-PERSONALIZACAO.md).

Abrir `tools/paper-doll-96-v3/`. Os controles ocultam cada peça sem modificar
save. Movimentos ausentes ficam vazios e identificados; não há fallback que
finja que foram produzidos. Esta bancada não é carregada pela aventura normal.

## Contrato visual e encaixes

Canvas 128×128, pivô (64,112), referência visível de 96 px e escala fixa 1×.
O tamanho não é recalculado pelo bounding box de cada pose. A arte estática
foi extraída da folha aprovada e reduzida com nearest-neighbor para reproduzir
a simulação aprovada; não se trata de oito desenhos nativos de 128 px.

Os ataques usam células160×160 e pivô(80,128): os16px extras em cada margem
acomodam os membros sem reduzir a altura do personagem. Não misturar o tamanho
da célula com a escala aparente. Cada clip declara seu próprio frame/pivô.

O corpo tem cabeça calva, face sem traços e roupa íntima neutra opaca. As partes
escondidas foram reconstruídas pelo inpaint do PixelLab. Rosto/cabelo/roupas
visíveis reutilizam os pixels da proposta, separados por máscaras inspecionadas.
As áreas de pele no recorte facial precisarão acompanhar a futura paleta de pele;
o rosto não é um parâmetro imutável nem fica embutido no corpo.

A composição estática completa foi comparada aos oito PNGs de referência no
mesmo Canvas: diferença zero, inclusive na comparação de cor premultiplicada.
O compositor retira o underpaint sob as peças visíveis antes de desenhá-las,
evitando tingir os pixels semitransparentes do contorno original. Ao ocultar
uma peça, o underpaint aparece. Isso é uma validação de integridade visual,
não uma aprovação artística automática de cada peça isolada.

## Movimento reaproveitado

As oito poses frontais vieram da caminhada feminina anterior de 84×84. Foram
medidas as articulações COCO-18 e transferidos ângulos, deslocamento da raiz e
encurtamento projetado dos membros para as proporções novas, compartilhando
o guia entre os dois corpos. Não foram criados movimentos separados por classe
ou facção. Os quatro movimentos iniciais pagos eram estudos compostos/de base;
somente os dois ciclos modulares finais entram na bancada.

`rig.js` preserva as entradas e converte a profundidade fracionária do estimador
em ordem inteira antes da geração. Uma submissão inicial falhou pela incompatibilidade
de profundidade e não gerou frames; não foi repetida sem corrigir a causa.
O teste de encurtamento evita apagar a elevação do pé ao retargetear a passada.

A cabeça neutra é uma peça rígida ligada ao encaixe medido do movimento, com
translação inteira por frame; pescoço/ombros do movimento são preservados.
Rosto e cabelo seguem o mesmo encaixe, sem novas gerações desses elementos.
A roupa das primeiras caminhadas reutiliza os recortes dos estudos de pose.
Seu encaixe e a amplitude da passada ainda precisam da revisão artística do
proprietário; não usar os testes técnicos como homologação da caminhada.

### Ataques — continuação de29/10/2026

Foram medidas as poses dos oito frames originais de cada ataque/direção/corpo
e transferidos os movimentos para as proporções aprovadas. Skeleton v3
produziu oito desenhos reais por clip; não há ping-pong, duplicação de uma pose
nem interpolação temporal para preencher frames. O encaixe de cabeça vem dos
sockets do modelo84 anterior, evitando que a estimativa facial faça a cabeça
girar ou trocar de direção, principalmente no norte.

Oito camadas: braços posteriores, corpo, cabeça neutra, bermuda, roupa superior,
rosto, cabelo e braços/mãos anteriores. `motion.js` aplica o encaixe rígido da
cabeça e uma malha de roupa guiada pelo tronco/quadris/pernas. As peças usam
pixels nativos da referência, sem novas gerações de cabelo/rosto por frame.
O Workbench separou a cabeça gerada com alterações RGBA guardadas. Regiões
laterais inspecionadas retiram armas/flashes não solicitados do corpo neutro;
a bermuda cobre a roupa íntima neutra que apareceu fora da malha inicial.

Os ataques terminam no último frame (`loop:false`); o checkbox de repetição é
exclusivo da bancada e inclui uma pausa final. Imagens são carregadas sob
demanda: cache de32 atlas e64 composições. A visualização permite ocultar as
peças; não lê ou grava o save. Todos os clips permanecem `reviewed:false` até
a avaliação artística do proprietário. O encaixe das roupas em poses extremas
continua sendo candidato de revisão; testes técnicos não aprovam a arte.

Armas/equipamentos e seus sockets visuais finais são uma etapa posterior.
Os clips fornecem os gestos corporais, sem ativação na aventura normal.

## Custos e origem

PixelLab nesta etapa: 11 medições × 0,1 = 1,1; dois estudos compostos de caminhada
× 3 = 6; oito reconstruções de base × 6 = 48; duas animações do corpo neutro
× 3 = 6. Compromisso confirmado pelos recibos de submissão/conclusão: **61,1**.
Manter reserva adicional de **3** da submissão que falhou antes de gerar, sem
presumir reembolso: compromisso conservador **64,1**. Edições exatas posteriores
no Workbench não consumiram gerações. Não há replays automáticos de receitas.

Jobs das bases: `ef121e22-5085-4cd5-a62c-4befc3e297c9`,
`c77acd7f-3568-4db4-a178-de28592b1db4`, `4841e073-e45b-4d38-b331-f676d5bce007`,
`4a6485ed-50cf-4365-b728-b3e40dbeb9a1`, `8f9d810f-c971-4fe6-8f98-1d5c27a8c7f4`,
`d8e3dfd3-7be8-47d8-a78a-596cd1af8664`, `234191a7-d978-40a5-a699-44bedcf6e559`,
`853b69b4-98c0-4e91-b270-6c4013b0ec8c`.
Corpos animados: `8ded60f5-6ad5-44d7-a1a2-00a56d1f447a` e
`e30e5b13-8cd8-49de-bc78-527dc6eb8d8b`.

Fontes brutas, máscaras, decisões, ledger e capturas ficam no pacote local de
trabalho `Animacoes-96-v3`, fora do Git. O repositório inclui somente assets
referenciados pela bancada, controles, manifesto e testes. Não há credenciais,
URLs assinadas, base64 de requests ou saves no pacote público.

Continuação dos ataques:333 medições ×0,1 =33,3;40 animações ×3 =120.
Total adicional confirmado: **153,3 gerações**. Limites de concorrência
recusaram solicitações sem criar jobs; as chaves aceitas foram registradas
para não enviar a mesma animação novamente. O novo plano permitiu um lote de
20 jobs simultâneos. Nenhuma assinatura foi alterada pelo agente.
Montagem das camadas, retoques guardados e salvamento dos atlas são gratuitos.
Origem de cada clip e hashes das oito poses constam no manifesto; fontes,
receitas completas e recibos permanecem no pacote local `Ataques-96-v3`.

Foram salvas gratuitamente **20 folhas por camada** no PixelLab, todas
vinculadas à pasta existente **Jade Dragon**: dez folhas estáticas (cinco por
corpo, quatro vistas na ordem S/N/W/E) e dez da caminhada frontal (cinco por
corpo, oito frames). Os slots superiores masculinos são vazios legitimamente.
O índice público `tools/paper-doll-96-v3/gallery-items.json` registra seus IDs
e nomes para edição futura sem gerar novamente. Este pacote tem células128;
não misturar diretamente com as folhas84 do histórico.

Foram acrescentadas **80 folhas de ataques** na mesma pasta Jade Dragon
(dois corpos ×cinco movimentos distintos ×oito camadas), totalizando100.
Para respeitar o limite de1024px do editor, cada folha tem960×960, grade6×6 e
células160 nativas: índices0–7 sul,8–15 norte,16–23 oeste,24–31 leste;
32–35 vazios. Esses espaços finais são intencionais. Cada índice é
`linha * 6 + coluna`, começando em zero. Tecnologia usa as folhas de disparo.
Os atlas do navegador são tiras1280×160 e não devem substituir essas folhas
do editor sem reempacotar as células. `gallery-items.json` registra os100 IDs.

## Validação e continuidade

Teste Node: retarget, imutabilidade, encurtamento, profundidade inteira, relógio,
escala fixa, paths seguros e rejeição de animação modular incompleta.
Navegador: oito referências recompostas sem diferença, ocultação das peças,
16 frames reais distintos sem pixels visíveis nas bordas, viewport móvel,
ausência de erros e nenhuma gravação de save. Cache limitado a 64 composições.

Os testes dos ataques verificam48 entradas,40 jobs distintos, oito camadas por
pose, dimensões/pivôs,12FPS, source hashes e compartilhamento disparo/tecnologia.
O teste de montagem protege as mãos durante a remoção de itens não solicitados.
A auditoria no navegador percorre400 quadros disponíveis (384 de ataques e16
de caminhada, incluindo aliases), verifica frames distintos, bordas livres,
recomposição das oito referências, caches limitados e save intocado.

O build usa allowlist e somente os PNGs referenciados pelo manifesto. Não
alterar o catálogo de equipamentos, a criação feminina futura ou o trabalho
de calças documentado em [HANDOFF-CALCAS-PAPER-DOLL.md](HANDOFF-CALCAS-PAPER-DOLL.md).
Os estudos antigos de 192×168 e seus testes locais permanecem separados, sem
conversão silenciosa para este contrato.
