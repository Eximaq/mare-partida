# Bento Maré-Livre — combate do Espadachim Pirata

Este relatório registra a primeira integração à combinação Pirata + Espadachim. A pendência de ataque para a esquerda e os quatro clipes norte com braços sobre as costas foram corrigidos posteriormente; as 20 combinações estão animadas. Veja [correções, custos e testes atuais](BENTO-CORRECOES-DIRECIONAIS.md). As seções seguintes conservam a avaliação da versão inicial para auditoria.

## Arte e inspeção da versão inicial

20 clipes, 144 frames: guarda 4, ataque 8, Corte de Maré 12, hurt 4 e death 8, em frente/costas/esquerda/direita. 19 combinações são reproduzidas como animação; ataque/esquerda usa a ressalva acima. As quatro rotações armadas são 64×64. O PixelLab devolveu animações em 76×76 (frente/costas) e 68×68 (lados); o corpo mantém a escala nativa, com espaço extra para movimento. Folhas de entrega usam células transparentes 84×84.

Nenhum frame foi repintado, espelhado, invertido, duplicado ou encurtado localmente. Foram verificados pixels originais na montagem e os GIFs coalescidos contra suas fontes, com paleta exata, transparência, disposal 2 e repetição de inspeção. O pivô é fixo por centro do canvas e linha dos pés da referência, sem alinhar novamente cada pose ou ampliar a figura quando ela cai. Altura de referência 46 px exibida em cerca de 70 px.

Ressalvas artísticas: a guarda movimenta a espada mais que uma respiração discreta; a lâmina fica pouco legível à esquerda. O ataque de costas tem um flash forte. Hurt termina agachado e retorna à guarda pela transição do estado. Corte de Maré/esquerda não contém o arco turquesa gerado nas outras vistas; o efeito de corte já existente no jogo continua no impacto. Há um pequeno pixel cinza solto no fim do Corte frontal. Death/esquerda termina sentado/caído, enquanto as outras vistas terminam deitadas. Esses detalhes ficam expostos na galeria, sem afirmar acabamento artístico definitivo.

## Integração

`combat-animation.js` controla idle, walk, combat-idle, attack, skill, hurt e death com relógio por estado. Movimento aguarda o fim do golpe; dano tem um único compromisso no frame de impacto; morte cancela esse compromisso e mantém o último frame até o renascimento. Hurt recebido durante um golpe é reproduzido logo depois, sem cortar a espada no meio do movimento. Habilidades automáticas prontas têm prioridade para não ficarem bloqueadas pelo ataque básico. Um ataque recusado pelo estado não reinicia seu intervalo.

As fórmulas de dano, precisão, atributos e custos de energia continuam existentes; o momento de aplicação acompanha a animação. O segundo golpe de área do Espadachim compartilha o estado visual de skill, sem uma geração adicional. Idle e walk normais reutilizam a base aprovada, sem espada; os estados de combate usam a versão armada. Nenhuma arte de outra classe ou facção foi gerada. O aviso de renascimento foi movido para uma faixa no rodapé somente nesse personagem, permitindo ver o corpo caído.

A seleção e os retratos das quatro bases foram preservados. O mostruário das facções filtra o asset de classe para continuar mostrando apenas os quatro modelos. O save do usuário não foi modificado pelos testes.

## Custos e preservação

**23 gerações neste lote:** 1 pelas rotações, 4 pela guarda, 4 pelo ataque, 6 pelo Corte de Maré, 4 por hurt e 4 por death. Somadas às 4 do piloto: **27 gerações nesta etapa**. Nenhum crédito USD foi necessário. As três chamadas inicialmente recusadas por falta de vagas não criaram jobs; os mesmos trabalhos aprovados foram enviados depois. Não houve retry pago e não há geração pendente.

Checkpoint anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-bento-combat-20261018`. Os 16 arquivos das facções-base, os 52 assets anteriores e os sistemas de mundo, ilha e atributos permanecem preservados. Novas folhas: `assets/classes/pirate-sword/`. Originais, ZIP, prévias, auditoria e parâmetros: `pixellab-pip-generations/bento-combat-production-20261018/`.

## Verificação

- combat: 3 cenários aprovados; resultados em `docs/evidence-bento-combat/`.
- classes: 12 cenários aprovados; resultados em `docs/evidence-bento-combat/`.
- island: 12 cenários aprovados; resultados em `docs/evidence-bento-combat/`.
- factions: 6 cenários aprovados; resultados em `docs/evidence-bento-combat/`.
- Testes unitários de estado: exclusão de ações, impacto único, frames longos, cancelamento na morte, pose final e reset.
- Testes de reprodução: clamp de one-shot, loop de idle, direção, pivô fixo e pixels sem suavização.
- 10 cenários de atributos, 39 verificações de mundo/câmera e oito rotas de ilha aprovados.

![Corte de Maré no combate real](evidence-bento-combat/skill.png)

![Morte mantida até renascer](evidence-bento-combat/death-held.png)

## Chamadas e entradas exatas

MCP v3, referência armada aprovada, sem seed enviado. A rotação usou quatro direções, humanoid, size 64, low top-down. As animações usaram as quatro direções, `keep_first_frame: false` e 4/8/12/4/8 frames. Os prompts abaixo foram elaborados a partir do pedido e aprovados previamente.

`Bento Maré-Livre, the same pirate swordsman as the reference. Preserve his face, hair, teal headband, crimson vest, cream shirt, blue trousers, proportions, pixel shading and original steel sword with bronze guard and cloth grip.`

Tradução: Preservar Bento, rosto, cabelo, roupas, proporções, estilo e espada original.

`Hold a steady sword combat guard with subtle breathing. Keep the sword in the same hand, feet planted, body in place and facing unchanged. Return smoothly to the starting guard.`

Tradução: Guarda firme com respiração discreta, mesma mão e direção, pés apoiados, retorno suave à guarda.

`Prepare one sword strike, swing through a clear impact, then fully recover into the same starting guard. Keep the sword in the same hand, body in place and facing unchanged.`

Tradução: Preparar um golpe, cortar com impacto e recuperar a guarda inicial, mantendo a mão e direção.

`Wind up, perform one broad sword slash with a brief original turquoise sea-energy arc, then recover into the same starting guard. Keep the sword in the same hand, body in place and facing unchanged.`

Tradução: Corte amplo com breve arco marítimo turquesa e recuperação da guarda, mantendo mão e direção.

`Recoil briefly from one hit, bend slightly, then return to the same sword guard. Keep the sword in the same hand, body in place and facing unchanged.`

Tradução: Reagir a um golpe, inclinar levemente e retornar à mesma guarda.

`Lose balance gradually, buckle at the knees and fall to the ground, ending in a still fallen pose with the sword visible. Keep continuous movement without vanishing or teleporting.`

Tradução: Perder equilíbrio, dobrar os joelhos e cair continuamente, terminando caído com a espada visível, sem desaparecer ou teleportar.

[Galeria ao vivo](http://127.0.0.1:8123/pixellab-pip-generations/bento-combat-production-20261018/preview.html) · [Manifesto](../pixellab-pip-generations/bento-combat-production-20261018/manifest.json) · [Blueprint](../pixellab-pip-generations/bento-combat-production-20261018/bento-combat.blueprint.json)
