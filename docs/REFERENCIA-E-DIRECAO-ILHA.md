# Referência e direção artística — ilha e HUD náutica

## Material recebido

Vídeo `Gravação de Tela 2026-10-18 105414.mp4`, 25,27 segundos, 1864 × 924, 30 fps. O arquivo foi decodificado até o final; quadros de toda a extensão foram extraídos a cada segundo para inspeção. Esta análise não presume detalhes entre os quadros amostrados. Evidências em `reference-20261018/`, contatos cobrindo 00:00–00:24.

Imagem enviada pelo usuário: inventário com madeira, ferragens douradas, cordas, pergaminho e cabeçalho vermelho. É referência de materiais/acabamento, não uma captura do jogo desenvolvido.

## Observado e comparação

| Tempo | Observação na gravação | Estado V12/Sprint 1 | Mudança desta entrega |
|---|---|---|---|
| 00:00–00:24 | Perfil persistente no alto à esquerda com XP, nível, poder, HP, MP e moeda | Faixa horizontal muito compacta, apenas vida/energia/moeda | Perfil vertical compacto com dados reais e acabamentos náuticos |
| 00:00–00:24 | Menu horizontal no alto à direita | Menu no mesmo canto, mas botões grandes arredondados | Comandos compactos, madeira, latão e cantos firmes |
| 00:00–00:24 | Chat aberto no canto inferior esquerdo | Chat recolhido por padrão | Canal local aberto em desktop; não simular canal online |
| 00:00–00:24 | Atalhos pequenos centralizados no rodapé | Cinto central já funcional | Revestir como cinto de convés, preservar habilidades/poção e cooldowns |
| 00:00–00:24 | Jornada pequena à direita no rodapé | Contratos escondidos em painel expansível | Objetivo real visível, progresso e resgate quando disponível |
| 00:00–00:12 | Personagem caminha pela praça, cenário se desloca e HUD permanece fixa | Câmera funcional, personagens visualmente grandes em zoom 2× | Ajustar leitura de escala para vila e preservar câmera do Sprint 1 |
| 00:13–00:24 | Trajeto sobe em direção a grandes fachadas; vegetação, bancos, iluminação, NPCs e portal estruturam espaço | Núcleo pequeno de pedra escura, grande extensão de piso repetido | Ilha tropical com margens, vegetação e distritos portuários |

O vídeo é apenas de passeio na cidade. Não mostra entrada em caçada, combate, seleção de alvos em batalha, inventário ou morte. O painel do alvo seguirá o requisito escrito anterior (centro superior), sem atribuir isso à gravação.

## Proposta de design

Paleta: madeira escura `#362215`, madeira gasta `#765032`, latão `#bc914e`, corda `#d5bb80`, pergaminho `#e6d2a5`, azul-mar `#204b61`. Vermelho de vela para hierarquia pontual, sem recolorir tudo de vermelho.

Tipografia: Bahnschrift/Trebuchet nos títulos de instrumentos náuticos; Segoe UI no texto e números. Números tabulares. Bordas pequenas, metal rebitado e amarrações como estrutura dos módulos, evitando o aspecto de cartões arredondados genéricos.

Layout: perfil vertical no alto à esquerda; comandos no alto à direita; alvo no alto central; canal no rodapé esquerdo; cinto no rodapé central; jornada e resumo de caçada no rodapé direito. Centro do mundo permanece livre. Janelas de inventário, forja e mapa conservam suas funções e dados reais.

Ilha: costa orgânica rodeada por mar turquesa, praia clara e gramado, porto de madeira a oeste, praça central, mercado, taverna e forja. Artes novas deverão vir de PixelLab; topologia e colisores devem acompanhar o terreno e as bases dos edifícios. Nenhum NPC ou sprite existente será descartado.

## Plano PixelLab aprovado

O usuário aprovou 27–33 gerações: duas transições Wang de 32 × 32 em modo standard (oceano→areia e areia→grama, com base conectada), mais um atlas de quatro edifícios Pro 512 × 512. Não inclui retries extras. Prompts e parâmetros exatos serão registrados no manifesto e blueprint da geração.
