# Personagem modular — viabilidade e proposta, sem implementação

Decisão do proprietário em 20/10/2026: pausar as novas gerações e o lote das seis classes, preservar o trabalho e aguardar uma especificação modular. Branch `feature/class-combat-animations-v2`, base `origin/main` em `5047eea`. Este documento não autoriza gastos nem altera saves.

## Conclusão

É viável manter o Canvas 2D e migrar gradualmente para Paper Doll por camadas de sprites. A infraestrutura de reprodução é reutilizável; os personagens atuais são imagens completas, com pele, cabelo, roupas e armas já fundidos. Eles não se tornam módulos apenas separando arquivos ou aplicando máscaras: faltam os pixels do corpo escondidos pelas roupas, além da oclusão das mãos e dos equipamentos em cada pose.

Recomendação: composição por frames desenhados sobre um rig/pivô comum, com uma única linha do tempo por ação. Preservar o renderizador atual como caminho legado durante a migração. Não adotar agora deformação esquelética de imagens rígidas: rotação arbitrária e esticamento não garantem o pixel art aprovado.

## O que foi preservado nesta pausa

- `combat-registry.js`: seleção por metadados de classe/facção, aliases de ações, controle por ator, fallback de identidade e prioridade de Zoan. Pode evoluir para resolver categorias de arma/movimento sem depender da classe ou facção.
- `combat-animation.js`: relógio, direção travada durante ação, impacto único, interrupção pela morte, estado final e temporização por direção; agora reconhece habilidades individuais, combo e estados especializados.
- `faction-sprites.js`: reprodução dos frames originais, transparência, pivô, nearest-neighbor e carregamento sob demanda opcional.
- `game.js`: utilização do registro e agendamento único dos efeitos das habilidades. Não há sistema modular, customizador, novas regras de classe ou migração de save implementados.
- Bento Espadachim: PNGs e metadados idênticos à base. Bases das quatro facções e artes Zoan preservadas.
- Piloto do Lutador: solicitações, recibos, frames retornados, folhas e prévias em `pixellab-pip-generations/class-combat-v2-20261020/pirate-brawler/`. Nenhum conjunto novo foi aprovado/integrado como produção.
- Chamadas aceitas antes da pausa podem terminar no servidor. Acompanhamento e download não geram novas animações; não cancelar, excluir, sobrescrever ou reenviar esses trabalhos.

O piloto é parcial. Guarda/soco/combo sul falharam na direção/postura solicitada; estão registrados como reprovados em `art-review.json`. Isso não foi ocultado com espelhamento, cortes ou frames artificiais. A correção proposta por template/âncoras **não foi executada**: a resposta do proprietário foi pausar.

O checkpoint guarda80 frames novos já retornados. O último status confirmou hurt/leste ainda em processamento (job `5ead33c2-960b-4e42-8982-89d1a868d714`, quatro frames); consultas MCP subsequentes não responderam. `resume.json` registra o getter gratuito e o procedimento para recuperar somente o resultado desse trabalho, sem refazer a chamada paga. Isso não foi declarado como geração concluída ou cancelada.

## Reaproveitamento por componente

| Componente atual | Reaproveitamento | Ajuste futuro necessário |
|---|---|---|
| Máquina de estados | Alto | Um relógio e eventos compartilhados por todas as camadas; chave de rig/ação substitui chave classe/facção |
| Registro de combate | Alto | Resolver categoria de arma e capacidade do rig; facção torna-se identidade narrativa/cosmética |
| Carregador e metadados | Alto | Manifesto por peça, rig compatível, versão, quadros e ordem de desenho |
| Frames completos existentes | Referência e fallback | Não usar como partes independentes; preservar animações legadas e escala |
| Pivôs/escala atuais | Referência mensurada | Unificar no contrato do rig, sem confundir canvas, altura corporal e tile64 |
| Timeline de golpes/cura | Alto | Um evento lógico por ação, não um evento por camada ou golpe visual |
| Haki e VFX | Parcial | Anchors de mãos/olhos/arma e máscaras próprias do rig; aura continua separada |
| Zoan | Alto como renderizador alternativo | Transformação substitui a composição humana e a restaura ao terminar |
| Inventário/equipamentos | Dados existentes úteis | Mapear definição de item para skin visual, mantendo IDs/atributos e fallback |
| Retratos/personagem/inventário | Parcial | Consumir a mesma composição da cena, evitando aparências divergentes |
| Saves | Preservados | Nenhuma mudança nesta etapa; qualquer campo de aparência depende da próxima especificação |
| Mapas/câmera/colisões | Preservados | Aparência não altera hitbox, velocidade ou espaço navegável |

## Contrato visual proposto

1. Um `rigId` identifica geometria, proporção, pivô dos pés e biblioteca de poses. Peças só são combinadas com rigs compatíveis. Outro formato corporal pode exigir outro rig e novos quadros de roupas.
2. Quatro direções reais e escala de mundo medida junto dos NPCs. Resolução corporal, canvas com padding e células de mapa são dimensões distintas. Não fixar 48/64/84 como regra universal antes da prova artística.
3. O controlador escolhe ação, direção e índice de frame uma única vez. Corpo, cabelo, roupa e arma usam esse mesmo índice; não têm relógios independentes.
4. Camadas sugeridas: capa/cabelo traseiro, arma/mão traseira, corpo/pernas, botas, torso/armadura, cabeça/rosto, cabelo frontal, mão/arma frontal e acessórios. A ordem varia com direção e pose; deve constar nos dados.
5. Slots de ancoragem por frame para mãos, cabeça, olhos e origem de projéteis. Em pixel art, preferir poses de arma desenhadas para a ação, evitando girar uma arma rígida em ângulos arbitrários.
6. Máscaras de cobertura por peça: capacete pode ocultar cabelo; casaco cobre torso; equipamento de duas mãos reserva ambas. Não remover pixels permanentemente dos arquivos de origem.
7. Compatibilidade declarada por peça/ação. Se faltar uma camada de ataque, usar um conjunto visual completo compatível previamente aprovado; não montar silenciosamente roupa de outra pose ou facção. Falhas devem aparecer na auditoria de assets.

Exemplo conceitual, sem arquivo de runtime criado:

```text
AppearanceResolver -> rig + corpo + rosto + cabelo + roupas + skins de equipamento
ActionResolver -> categoria de arma/ação + clip compatível
CombatAnimation -> direção, frame, evento de impacto
PaperDollRenderer -> ordem e camadas desse frame -> composição Canvas 2D
ZoanRenderer -> substituição explícita enquanto transformado
```

Classe determina habilidades/regras; arma determina a família de movimento aplicável; facção permanece independente. Essa separação visual não autoriza remover as restrições de equipamentos ou alterar dano/alcance das classes atuais.

## Reuso de movimentos e custo de conteúdo

Compartilhar movimento significa compartilhar poses e sequência, não obter automaticamente todas as roupas animadas. Cada roupa precisa cobrir as poses que usa; cabelo/capas também podem exigir quadros, máscaras ou uma decisão explícita de rigidez. Um item de inventário32 não equivale a uma arma equipada em quatro direções.

As famílias candidatas são desarmado, espada, adagas, arma de fogo, mecânico e conjuração; cura pode usar parte da conjuração com poses/VFX próprios. Combo, recarga, defesa e habilidades especiais continuam separados quando a mecânica exige. A lista final depende da próxima especificação; não foram gerados esses conjuntos.

Reduz-se a necessidade de manter 4×7 personagens completos, mas aumenta-se o investimento inicial na base e em peças compatíveis. Não é correto prometer que qualquer roupa futura funciona sem novos frames.

## Performance e pacote

- Compor somente peças equipadas, com carregamento por ação/rig e descarte controlado.
- Cache por rig, aparência, versões das peças, ação, direção e frame. Invalidar ao trocar visual; não recompor todos os quadros a cada renderização.
- Usar canvas fora da tela para pré-composição e um limite de bytes/LRU; medir no celular antes de escolher o limite. O guia MDN recomenda pré-renderização de desenhos repetidos: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas .
- Aritmética de memória, não benchmark: 80×80 RGBA = 25.600 bytes por frame; 272 frames = 6,64 MiB por camada decodificada. Oito camadas equivalem a aproximadamente53,1 MiB, antes de caches, texturas/GPU e outros custos. PNG pequeno em disco não garante pouco uso de memória.
- Preservar `imageSmoothingEnabled=false`, coordenadas de desenho arredondadas e pivô comum: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled .
- O personagem composto continua sendo uma entidade na ordenação do mundo; todas as suas camadas ficam sujeitas à mesma oclusão por árvores/casas.

## Custos estimados — nenhum gasto novo autorizado

**Análise e documentação desta pausa: zero gerações.** O lote anterior teve13 gerações informadas pelas chamadas aceitas (7 clipes sul + 3 direções de Impacto + 3 direções de hurt). A expansão de death foi recusada por falta de vagas, sem criar jobs; não foi reenviada. O teto56 era do piloto, não autorização para um novo lote modular. Recibos individuais são a referência; diferenças de saldo podem incluir trabalho paralelo de outro colaborador.

Referências da ferramenta consultadas nesta sessão: `animate_character` v3 cobra pelo canvas gerado e número de frames; clips pequenos deste piloto retornaram68×68 e1 geração por direção. `create_character_state` gera o personagem completo, não camadas, e custa10–25. Pixen pequeno tem custo publicado de1 geração por imagem; nenhum desses valores garante encaixe modular ou aprovação artística. Documentação do serviço: https://api.pixellab.ai/mcp/docs .

Exemplos para dimensionar a próxima especificação, **não cotação nem promessa de resultado**:

| Cenário | Estimativa de gerações | Limites |
|---|---:|---|
| Engenharia/planejamento, sem novas artes | 0 | Não entrega corpo ou roupas modulares |
| Corpo-base48 com idle4, walk8 e soco8 nas quatro direções, por v3 | 14–26 | Base do zero ~2 +12 clipes×1–2; canvas pode ampliar e alterar custo. Sem roupas/arma/cabelo separados, sem retries |
| Duas peças animadas cobrindo os80 frames desse piloto, se geradas individualmente por Pixen | +160 | 2×80×1; encaixe e qualidade incertos, não é a rota recomendada para produção em massa |
| Uma peça apenas nas poses de ataque de8 frames×4 direções | +32 | Se cada pose exigir uma imagem; modelo de custo conservador, não um lote solicitado |
| Peças produzidas manualmente sobre poses padronizadas | 0 PixelLab | Há trabalho artístico humano; prazo/preço não estimados sem escopo e artista |

Recomendação econômica: definir primeiro o contrato de poses e uma pequena prova de encaixe, com um corpo, uma roupa, um cabelo e uma categoria de arma. Comparar produção manual guiada por poses com geração assistida antes de escolher um lote. Não ampliar para dezenas de itens nem usar geração frame a frame em massa sem comprovar consistência.

O projeto Universal LPC é uma referência de organização por peças/ações e exportação de créditos: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator . Não foi importado; seu estilo não é automaticamente compatível com Maré Partida. Qualquer eventual adoção exige decisão artística e leitura das licenças das peças escolhidas.

## Migração proposta para futura autorização

1. **Especificação e contrato:** definir corpos, densidade/estilo, slots, categorias de arma, poses, ordem das camadas e customização permitida. Fixar orçamento de arte após medir a matriz de cobertura.
2. **Prova mínima isolada:** um rig, uma roupa, cabelo, arma e três ações/quatro direções. Validar encaixe e oclusão em todas as poses antes de produzir o restante. Não trocar o personagem do jogador nesta prova.
3. **Renderizador e adaptador de itens:** resolver peças, sincronizar frames e cache; manter caminho legado. Sem acoplar aparência à facção ou classe. Testar Haki, transformações, retratos e variações corporais.
4. **Cobertura de combate:** expandir as famílias necessárias às sete classes, mantendo cooldown/energia/dano; verificar ataques manuais e automáticos, morte e retorno. Nenhuma camada pode emitir dano/cura por conta própria.
5. **Persistência/UI, em especificação própria:** decidir como salvar aparência opcional e lidar com saves antigos. Não implementado, nem autorizado por esta pausa.
6. **Produção incremental:** só ampliar roupas/equipamentos após a prova; matriz de ações suportadas e testes de cada peça. Branch/PR próprios e revisão antes de merge.

## Aceite futuro e dependências

Exigir cobertura de quatro direções, pivô estável, mãos/armas corretas, ausência de corpos ou roupas vazando, transparência, VFX com âncoras corretas, consumo lógico único, fallback compatível, identidade persistente entre retrato e cena e desempenho medido. A especificação futura precisa decidir se roupas visuais seguem automaticamente equipamentos ou constituem transmogrificação separada.

Até lá, nenhuma nova geração, nenhum código de Paper Doll e nenhuma alteração de save/main. O trabalho de animações continua preservado, **não concluído**.
