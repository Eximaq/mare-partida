# Paper Doll — correção das guias de ataque (22/10/2026)

[Comparação no navegador](../pixellab-pip-generations/paper-doll-bento-repair-20261022/preview.html) · [Parâmetros e consumo](../pixellab-pip-generations/paper-doll-bento-repair-20261022/manifest.json) · [Receita](../pixellab-pip-generations/paper-doll-bento-repair-20261022/repairs.blueprint.json).

## Resultado e limite artístico

Foram corrigidas as entradas das duas vistas pendentes. O norte anterior colocava o antebraço esquerdo mais perto da câmera que o tronco; agora os dois antebraços têm profundidade60/ordem1, atrás das âncoras do tronco140/7. O leste anterior alternava a altura dos tornozelos; agora todas as poses usam53/64. A câmera mudou de `high top-down` para `low top-down`, compatível com a apresentação clássica de RPG observada no Bento. As referências neutras e os oito frames de controle de cada ação foram preservados.

**Os dois novos corpos foram reprovados para integração.** O norte ainda desenha o antebraço sobre as costas nas poses1–5. O leste ainda varia o limite inferior dos pés entre55 e56, apesar das guias constantes. Não se encobre o erro do norte com roupa nem se estabiliza o leste por offsets diferentes em cada frame. O norte recebe apenas padding fixo10/13; o leste,10/10. A documentação do PixelLab não especifica como derivar a ordem do tronco a partir dos joints COCO, portanto a política numérica orienta a geração e não garante oclusão.

Frente e oeste continuam com as mesmas seis folhas modulares do estudo anterior, copiadas byte a byte. Norte e leste usam o personagem original completo como fallback, mesmo no modo de inspeção que aceita rascunhos. Nenhuma arte nova foi aprovada ou ativada no catálogo do jogo. A Fase1 artística permanece incompleta.

## Chamadas e cobrança

Foram executadas **duas** chamadas MCP `animate_with_skeleton_v3`: norte e leste, oito frames por direção, referência nativa64×64, `template_id:mannequin`, `view:low top-down`, `no_background:true`, sem seed. Cada getter confirmou **3 gerações cobradas:6 nesta etapa**, abaixo do teto12. Todos os jobs terminaram; não há chamadas pendentes nem retries adicionais.

Descrição exata: “a bald human male pirate base with a bare torso and arms, plain charcoal shorts, bare feet and empty hands”. Tradução: base humana masculina careca, torso e braços descobertos, shorts cinza, pés descalços e mãos vazias. A ação enviada foi `attack` (ataque). As imagens fornecidas em `first_frame_url`, os18 joints e os demais campos exatos estão nos pedidos e manifestos por direção.

A terceira chamada planejada, Pro Flash para remover o clarão do leste, **não foi executada**, pois dependia da aprovação do corpo. Fonte, máscara e contexto preparados permanecem identificados como entradas não enviadas; não são arte nova nem um resultado de inpainting. O plano de custo não foi redirecionado para mais tentativas.

## Melhorias técnicas implementadas

- `tools/paper_doll_motion_controls.py` verifica entradas malformadas, coordenadas finitas, profundidade e ordem válidas. `--grounded` exige a altura de cada tornozelo constante nas poses; `--north-forward` exige ambos os antebraços atrás das âncoras do tronco. São políticas opcionais deste ataque, não regras para qualquer movimento. Os casos reais anteriores continuam como regressão.
- O compositor aceita `clip.occludedFrames`, somente para folhas de arma com frames realmente transparentes. Uma célula vazia não declarada continua inválida. Declarar um frame que contém pixels visíveis também falha. Corpo e outras peças não podem usar essa exceção, nem uma direção inteira pode ser marcada como encoberta. A declaração faz parte da chave da auditoria para evitar reutilizar resultados de outra política.
- Essa capacidade descreve oclusão real da fonte; não foi usada para aprovar os corpos reprovados, apagar anatomia ou preencher frames ausentes. Os exemplos coloridos dos testes existem somente fora da tela como fixtures técnicas.
- A prévia compara os32 quadros de direção, permite inspecionar o corpo isolado e mantém fallback completo nas vistas inválidas. O empacotamento é offline; CI não chama PixelLab.

## Próxima unidade de produção

Continuam faltando dois clipes de corpo confiáveis, oito frames norte e oito leste, e quatro peças limpas na pose5 do leste, encoberta pelo clarão. Não repetir o mesmo Skeleton com mudanças textuais: esta tentativa mostrou que corrigir entradas não resolveu a saída. A alternativa mais previsível é uma revisão artística manual dos16 frames sobre o rig existente, ou uma rota mascarada controlada por pose com novo plano explícito de produção e inspeção. Nenhuma dessas alternativas foi iniciada nesta etapa.

Não é necessário gerar outra vez frente, oeste, Idle ou Walk. Os ataques modulares completos e a continuidade visual com a locomoção dependem das peças que ainda faltam e da revisão do proprietário.

## Validação

Os testes verificam separadamente dados de controle, fallback, fontes herdadas e RGBA. O teste Chromium inclui oclusão de arma com imagens Canvas reais,32 quadros comparativos, padding dos16 corpos novos, viewport desktop/celular e isolamento do save. Aprovação técnica não é aprovação artística. As capturas permanecem fora do Git em `docs/evidence-paper-doll/`.

Passaram42 suítes Node, nove testes Python das guias, o build do GitHub Pages e os testes Chromium desta revisão, do pacote direcional anterior e da bancada original. As capturas desktop/celular dos corpos novos e do fallback foram inspecionadas. O combate existente das sete classes foi verificado no navegador, sem erros de JavaScript. Combate, impactos, movimento, câmera do jogo, inventário, classes/facções, Haki, Zoan, mapas e saves não foram alterados. O único módulo de execução modificado é o compositor visual independente.
