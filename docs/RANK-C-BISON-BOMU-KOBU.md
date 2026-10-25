# Bisão, Bomu e Kobu — Rank C

Completa os cinco slots Rank C junto de Horu e Mato. Novos IDs anexados ao catálogo, preservando a ordem e os saves anteriores. Nenhuma geração paga: 120 quadros do personagem PixelLab existente e 19 arquivos fornecidos pelo proprietário. Manifesto e hashes em assets/akuma/rank-c-expansion-manifest.json. Importação reproduzível: tools/import_rank_c_expansion.py recebe o ZIP existente do Bisão e a pasta de fontes Rank C.

## Passivos e custos iniciais

| Fruta | Passivos de equipamento | Skill 1 | Skill 2 |
|---|---|---|---|
| Bisão | +240 HP, +18 defesa física, +12 ataque físico | 30 energia / 14s | 45 energia / 45s |
| Bomu | +80 HP, +20 ataque físico, +6% crítico; imunidade a explosão | 40 energia / 20s | 35 energia / 16s |
| Kobu | +140 HP, +10 defesa física, +12 ataque especial, +5% redução de recarga | 40 energia / 35s base | 35 energia / 30s base |

Bônus de Kobu reduzem as recargas para 33,25s e 28,5s. Valores de balanceamento inicial, sem alegação de simulação PvP. Os dicionários JS/Python e os tooltips usam os mesmos modificadores.

## Ushi Ushi: Modelo Bisão

- Personagem PixelLab 85edd3a5-c083-4fe2-9062-819e765f4314, quatro direções: Idle, Running (8 frames), To attack by lowering the head (13), Jump Attack (8). Ataque básico usa sincronização dinâmica existente e impacto a 50% do ciclo.
- O pedido posterior aumenta a sprite de 64 para **96×96 no mundo**, mantendo a colisão dos pés. Prévias respeitam o tamanho solicitado por seu renderizador.
- Investida Furiosa: até quatro tiles, linha reta e colisão sólida; atinge o primeiro inimigo no caminho por 180% físico e aplica stun de 2s, cancelando o aviso de ataque dele. Consome o impacto uma vez.
- Casco Firme: 30s, +35% defesas física/especial, +20% HP máximo. HP atual mantém a mesma fração ao ativar, expirar, sair da forma, trocar fruta ou recarregar. O marcador de escala é normalizado antes do clamp do save, evitando perda de vida em saves com HP elevado.
- VFX verde 112×112 centrado 44px acima dos pés; desenhado atrás do Bisão e à frente abaixo da cabeça, envolvendo o corpo conforme ajuste pedido. Loop mantém os frames fornecidos intactos.

## Bomu Bomu

- Imunidade é explícita por tipo: damageType/damage_type = explosion; aplicada antes de esquiva/mitigação. takeDamage aceita também damageType no sexto argumento; avisos do mapa propagam essa classificação. A API /api/akuma/damage recebe damage_type. Outros danos continuam normais. Projéteis próprios não selecionam o jogador.
- Sopro Explosivo: seis projéteis simultâneos, cada um de 75% físico, até seis tiles. Atingem o primeiro inimigo na trajetória. Os sete primeiros frames representam voo e os seguintes, impacto. O impacto desenha a arte original e sua cópia horizontalmente espelhada no mesmo centro.
- O arquivo fornecido Skill 3.png é o ícone da Skill 1; o texto inicial mencionava Skill 1.png, que não foi fornecido.
- Duplo Bombeamento: duas bombas separadas por 180ms, 150% físico cada. Impacto centrado no inimigo; splash inclui os centros de todos os tiles adjacentes, inclusive diagonais (distâncias em X/Y de até 64px). Os quinze primeiros frames são voo e os finais, explosão. VFX 256×256, ampliação de 33% em relação à área de 192×192, cobrindo suas bordas.
- Terreno sólido ou fim de alcance encerram o projétil e produzem explosão no ponto final; cada projétil aplica seu dano uma vez. O serviço valida token, proprietário, instância, distância, contato e consumo de cada índice.

## Kobu Kobu

- Revolução nasce nos pés e dura 20s. Animação inicial até o frame 10; loop exclusivo dos frames 11–17, numeração do pedido iniciada em 1. A cada segundo, aliados que veem a bandeira recebem +20% ataques/defesas físicos e especiais e +10 pontos percentuais de crítico, limitado pelo teto de 65% existente. Buffs não se acumulam consigo mesmos.
- Destituição nasce no último chão clicado visível e transitável; sem clique anterior, usa os pés. Dura 15s. Reproduz a sequência e mantém o último frame original, inclusive sua aparência de bandeira caída. Não altera a arte para reconstruir uma bandeira em pé.
- Campo hostil usa um retângulo centrado no estandarte, com dimensões da visão no momento da criação. Inimigos nesse campo perdem 20% ataque e ambas as defesas. Fora do campo, após a próxima verificação, ou ao expirar, os atributos originais retornam sem sobrescrever sua base.
- Bandeiras permanecem no chão, não acompanham o jogador; uma por habilidade. Troca de fruta/mapa, morte ou reinício limpam entidades e modificadores.
- **O jogo continua solo.** Usa MareRankC.setPartyProvider e RankCExpansionService.party_provider para membros reais da PT; o servidor filtra PT/instância/visão e aplica modificadores ao cálculo desses membros. O cliente publica kobuSupportUntil no status dos membros recebidos pelo adaptador. Não cria aliados, PvP ou sincronização de rede. A simulação de monstros e movimento continua no cliente, conforme o protótipo existente.

## Código e validação

Regras: assets/akuma/rank-c-expansion-rules.json. Dados/arte: rank-c-expansion-data.js e rank-c-expansion.js. Backend: server/rank_c_expansion.py. Rotas novas: expansion-impact e expansion-field sob /api/akuma/.

- 73 arquivos Node e 80 testes Python passaram.
- Navegador real: transformação, sprite de 96px, buff em duas camadas de 112px, ataque básico, investida/stun, HP proporcional inclusive reload, seis hits, espelhamento, duas explosões 3×3, imunidade tipada, bandeiras/atributos/visibilidade/expiração e persistência de recargas.
- Integração API: nove impactos aceitos; regressões de Horu/Mato, passivos Rank D e 56 cenários de velocidade/animação de ataque.
- Capturas visuais inspecionadas ficam fora do Git. Preview produzido por python tools/build_pages.py.
