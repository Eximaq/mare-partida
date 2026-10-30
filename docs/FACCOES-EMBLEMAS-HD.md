# Seleção de facções — emblemas HD

Base 6268c16 (merge do PR156). Branch feature/faction-selection-emblems. Alteração visual pontual da Etapa 01.

## Assets

Fonte definitiva fornecida pelo proprietário: Gemini_Generated_Image_97idfr97idfr97id.jpeg, 2400 × 1792. Os quatro PNGs em assets/ui/faction-emblems têm canvas 912 × 912, proporções nativas e transparência real. Não houve redimensionamento dos pixels-fonte, redesenho, geração PixelLab ou compressão de saída com perdas. O arquivo JPEG original permanece intacto com o proprietário; source.json registra seu hash, dimensões, centros dos recortes e processamento.

| Card, na ordem existente | Arquivo | Posição na fonte |
| --- | --- | --- |
| Exército Revolucionário | revolutionary.png | Inferior direita |
| Pirata | pirate.png | Inferior esquerda |
| Marinha | marine.png | Superior esquerda |
| Governo Mundial | government.png | Superior direita |

O exterior excedente foi retirado com uma máscara circular conservadora de raio 444 e transição de alpha de um pixel, preservando a borda metálica e sua sombra próxima. Há padding transparente até o limite quadrado do canvas. Os RGB de todos os 619.193 pixels visíveis por arquivo foram comparados ao JPEG decodificado nas coordenadas originais: zero diferenças. A redução para exibição acontece somente no navegador; os PNGs definitivos continuam em resolução nativa.

## Integração e limites

index.html e ui-preview.html substituem somente a imagem nos quatro cards. A classe faction-emblem usa dimensionamento proporcional, centralização e interpolação adequada à arte HD dentro do espaço anterior. A regra é exclusiva da Etapa 01; sprites do jogo continuam com sua renderização de pixel art. Nenhum sprite antigo foi removido ou alterado.

A definição compartilhada da facção marine agora apresenta Marinha/MARINHA. IDs, saves, diretórios, bônus e cálculos permanecem iguais. Marinheiro como cargo da hierarquia, nome de inimigo ou parte do nome de um item continua preservado: esses termos não são o rótulo da facção. Etapas 02/03 e personalização permanecem intactas.

Dimensões, ordem, descrições, cores dos cards, estados, hover e navegação foram preservados. A posição absoluta é aplicada somente à nova imagem, com o espaço de arte existente como referência; o PNG grande não interfere no tamanho do card ou no texto.

## Verificação

- tests/faction_selection_browser.cjs foi observado falhando com os antigos sprites antes da alteração. Verifica associação dos quatro arquivos, resolução nativa, alpha, proporção quadrada, centralização, limites, nomes, bônus e oito resoluções: 1920×1080, 1366×768, 1280×720, 780×900, 760×900, 393×852, 320×740 e 852×393.
- Comparação local com medidas da base anterior: larguras, alturas, áreas de arte, bordas e fundo dos cards permaneceram iguais nas oito resoluções. A comparação usa referências privadas, não capturas em massa no Git.
- Estados normal/hover/selecionado, teclado, quatro facções salvas com IDs antigos e ida/volta pelas três etapas foram verificados no navegador. Os multiplicadores e descrições foram comparados com a base anterior.
- Quinze testes Node focados em personagem, aparência, hierarquia e UI foram aprovados. Build Pages aprovado; o teste de seleção também passou na saída estática. O teste histórico de facções aceita os emblemas de 912 px e continua verificando os sprites de animação no jogo.
- A regressão histórica tests/factions_browser.py foi aprovada nas quatro facções: sprites Idle/Walk nas quatro direções, movimento, leitura de spritesheets e persistência após reload, sem erros JavaScript.
- O job factionSelection executa a validação de seleção em Pages. Seu resultado é independente da validação local.

Evidências recentes ficam na pasta privada Sprint-Emblemas-Faccoes da biblioteca de trabalho do proprietário. Nenhum save, JPEG original ou captura em massa entra no commit. Para reverter a apresentação, reverter o commit restaura as referências anteriores; não há migração de dados.
