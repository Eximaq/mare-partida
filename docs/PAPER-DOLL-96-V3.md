# Personagens de 96 px — bases por camadas e início da animação

28/10/2026. O proprietário aprovou a nova aparência masculina/feminina na
simulação do lobby. **A aprovação foi do desenho estático, não de todas as
animações, equipamentos ou de uma migração do personagem publicado.**

## Cobertura desta etapa

- Oito referências: masculino/feminino × sul, norte, oeste e leste.
- Cada referência tem corpo neutro, rosto, cabelo, bermuda e roupa superior
  independentes; a roupa superior masculina é uma camada vazia legítima.
- Dois ciclos candidatos de caminhada frontal, oito frames reais por corpo,
  8 FPS, com as mesmas cinco camadas. Não são cobertura completa de locomoção.
- Parado animado, demais direções de caminhada e seis ataques **ainda faltam**.
  A pose estática não é anunciada como uma animação de Idle.

Abrir `tools/paper-doll-96-v3/`. Os controles ocultam cada peça sem modificar
save. Movimentos ausentes ficam vazios e identificados; não há fallback que
finja que foram produzidos. Esta bancada não é carregada pela aventura normal.

## Contrato visual e encaixes

Canvas 128×128, pivô (64,112), referência visível de 96 px e escala fixa 1×.
O tamanho não é recalculado pelo bounding box de cada pose. A arte estática
foi extraída da folha aprovada e reduzida com nearest-neighbor para reproduzir
a simulação aprovada; não se trata de oito desenhos nativos de 128 px.

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

Foram salvas gratuitamente **20 folhas por camada** no PixelLab, todas
vinculadas à pasta existente **Jade Dragon**: dez folhas estáticas (cinco por
corpo, quatro vistas na ordem S/N/W/E) e dez da caminhada frontal (cinco por
corpo, oito frames). Os slots superiores masculinos são vazios legitimamente.
O índice público `tools/paper-doll-96-v3/gallery-items.json` registra seus IDs
e nomes para edição futura sem gerar novamente. Este pacote tem células128;
não misturar diretamente com as folhas84 do histórico.

## Validação e continuidade

Teste Node: retarget, imutabilidade, encurtamento, profundidade inteira, relógio,
escala fixa, paths seguros e rejeição de animação modular incompleta.
Navegador: oito referências recompostas sem diferença, ocultação das peças,
16 frames reais distintos sem pixels visíveis nas bordas, viewport móvel,
ausência de erros e nenhuma gravação de save. Cache limitado a 64 composições.

O build usa allowlist e somente os PNGs referenciados pelo manifesto. Não
alterar o catálogo de equipamentos, a criação feminina futura ou o trabalho
de calças documentado em [HANDOFF-CALCAS-PAPER-DOLL.md](HANDOFF-CALCAS-PAPER-DOLL.md).
Os estudos antigos de 192×168 e seus testes locais permanecem separados, sem
conversão silenciosa para este contrato.
