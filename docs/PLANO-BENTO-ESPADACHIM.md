# Bento Maré-Livre — piloto de combate

## Escopo e preservação

Pedido recebido em 18/10/2026. O arquivo fornecido termina em “Atacar interrompe a caminhada quando o alvo está”. A etapa executável agora é o teste visual frontal de combat idle e ataque básico; produção restante e integração dependem da aprovação visual solicitada pelo usuário.

Checkpoint integral anterior às edições: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-bento-combat-20261018`. Não foram encontrados AGENTS.md no projeto nem em seus diretórios ancestrais. README, relatório da etapa 1, metadados, manifesto e reprodução/combate foram inspecionados. Os originais aprovados permanecem intactos.

## Padrão visual

Bento: cabelo escuro ondulado, faixa azul-petróleo, colete carmim, camisa creme, calça azul-cobalto, faixa de cintura marrom, sandálias e pequenos detalhes de latão. Conservar rosto, proporções, contorno escuro e sombras agrupadas da rotação frontal aprovada de 48×48. Perspectiva low top-down. Altura aparente em torno de 70 px, compatível com os NPCs. Não aumentar a resolução dos pixels.

Espada original de aço, guarda de bronze envelhecido e cabo envolto em tecido. Uma só arma empunhada, sem símbolos ou técnicas de personagens conhecidos. Guarda legível, espada afastada do rosto, mãos coerentes. Fundo transparente.

O piloto usa uma cópia da frente de Bento com 8 px de margem transparente em cada lado (64×64, sem redimensionamento). Pixen acrescentará espada e postura de guarda. Duas animações v3 partirão dessa mesma imagem: respiração discreta e golpe com preparação, corte, impacto e recuperação. Inspecionar identidade, mão/arma, direção, pés, continuidade e ausência de cortes/artefatos antes de aceitar. Nenhum espelhamento ou remendo local de pixels.

## Reutilização e integração posterior

O MCP está conectado; Bento remoto `5d04e580-5ad5-4f89-82f3-47be52a99804` tem quatro rotações 48×48 e somente idle/walk. Não existe animação armada reutilizável. Os ciclos aprovados de idle e caminhada serão preservados.

Hoje `faction-sprites.js` reproduz loops pelo tempo global; `drawPlayerSprite` escolhe walk/idle por facção e não distingue a classe. `heroAttack` aplica dano imediatamente e usa um temporizador visual de 0,22 s; `takeDamage` registra hit e inicia respawn de 4,1 s quando a vida zera. A classe Espadachim usa o id `sword`, independente da facção `pirate`.

Depois da aprovação, a integração deverá ser restrita a pirate+sword, com tempo por estado, ciclos não repetidos para attack/skill/hurt/death, prioridade de death e fim de animação explícito. Sincronizar dano com o impacto, evitando dano duplicado e preservando cooldown, precisão, área, recompensas e saves. A pose final de death deve permanecer até o respawn. Não aplicar escala baseada na altura de cada pose de queda; usar a referência estável do corpo em pé. Nenhuma implementação de combate será ativada antes da aprovação visual.

## Lote de teste proposto

1. `edit_image_pixen`: cópia frontal com padding 64×64, transparente; 1 geração, uma tentativa.
2. `animate_image`: guarda frontal, 4 frames gerados; 1 geração estimada. A API mantém também a referência inicial: 5 imagens retornadas, preservadas em ordem.
3. `animate_image`: golpe frontal, 6 frames gerados; 1 geração estimada. Com a referência, 7 imagens retornadas, preservadas em ordem.

Total estimado: 3 gerações, sem retries. Nenhum crédito em USD previsto com a assinatura disponível. O roteiro de 4 frames de idle é uma meta inicial; o frame inicial extra da API será mostrado e contabilizado, sem corte silencioso.

As demais direções, Corte de Maré, hurt e death serão orçados após inspecionar o piloto e medir o consumo. Não estão autorizados por este lote. A abordagem econômica pode falhar na continuidade/identidade; falha exige avaliação e autorização antes de qualquer nova tentativa.

## Resultado do primeiro teste aprovado

O usuário aprovou o teste. A edição Pixen custou 1 geração e retornou uma imagem 64×64 transparente, mas virou Bento para a direita em vez de manter a frente. Foi rejeitada como referência de animação. As duas animações não foram iniciadas e nenhuma integração ao jogo foi ativada. Saldo 1667 → 1666, sem consumo de créditos USD.

A primeira observação da ampliação sugeriu corte na borda; a medição do PNG nativo corrigiu essa interpretação: os limites visíveis são [15,9,49,55], com margens transparentes em todos os lados. O defeito confirmado é a direção. Resultado original, verificação, manifest e blueprint estão em `pixellab-pip-generations/bento-combat-pilot-20261018/`. Qualquer nova edição exige autorização de tentativa adicional.

## Continuação autorizada e teste concluído

O usuário autorizou uma edição adicional de 1 geração. A base corrigida manteve a frente e foi usada nas duas animações já aprovadas. Consumo final do piloto: 4 gerações. As duas prévias estão prontas para avaliação, com ressalvas na guarda e recuperação; veja [resultado completo](BENTO-ESPADACHIM-PILOTO.md). Nenhuma produção adicional nem integração de combate foi autorizada nesta aprovação.
