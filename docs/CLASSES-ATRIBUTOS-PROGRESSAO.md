# Classes, atributos e progressão — 18/10/2026

Atualização funcional 1.3.0, mantendo o pacote V12, a chave de save, as quatro facções e os equipamentos existentes. Os arquivos de mapa, câmera e artes não foram modificados nesta etapa. Não foram realizadas gerações PixelLab.

## Auditoria e checkpoint

O estado recebido tinha seis classes em `game.js`, sem atributos distribuíveis. Ataques e habilidades usavam o mesmo ataque derivado de classe, nível, equipamentos e facção. Ciborgue possuía explosão em área e Elemental compartilhava a habilidade de proteção/cura. A XP e o inventário já funcionavam; foram integrados, sem substituição.

Foram lidos README, documentação de auditoria e entregas anteriores; nenhum AGENTS.md foi encontrado no projeto ou nas pastas ancestrais consultadas. O texto anexado foi a especificação desta etapa; os áudios citados nele não estavam anexados a este pedido.

Checkpoint integral anterior à primeira edição: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-attributes-20261018`.

## Classes e habilidades

| Classe / ID preservado | Função | Principal / secundário | Comportamento |
|---|---|---|---|
| Espadachim / sword | DPS físico | FOR / DES | Corte de Maré de 250% físico e Arco do Horizonte de 165% em área |
| Lutador / brawler | DPS próximo e resistência | FOR / VIT | Impacto de Âncora de 300% físico; Fôlego de Ferro cura e protege |
| Atirador / gunner | DPS à distância | DES / FOR | Disparo de 270% e rajada em área; alcance 210 e recuo quando há espaço |
| Gatuno / rogue | DPS ágil e evasão | DES / VIT | Ponto Fraco de 265% e Dança das Adagas de 145%; mobilidade e evasão maiores |
| Ciborgue / cyborg | Tanque | VIT / FOR | Provocação: pulso físico de 110%, atração por 5s e proteção por 4s; Blindagem: proteção por 7s e cura |
| Estrategista Elemental / strategist | Mago | INT / ESP | Chama Concentrada de 240% elemental; Tempestade de 170% em área e lentidão por 4,5s; ataques básicos elementais |
| Suporte / healer | Curandeiro | ESP / INT | Ataque básico elemental de água; Maré Restauradora e Bênção do Farol |

As seis classes anteriores permanecem. As duas novas armas de Curandeiro foram acrescentadas ao final da lista de itens, preservando os índices dos itens salvos. Loot, equipamento compatível, autoequipar e forja usam o mesmo sistema anterior.

Os ataques verificam alcance e linha livre. Ataques em área alcançam vítimas a até 125 px do alvo principal e respeitam linha livre. Atirador, Elemental e Curandeiro tentam recuar quando o inimigo entra em 45% do alcance; obstáculos podem impedir o recuo. Isso não permite atacar além do alcance.

## Pontos, interface e persistência

Cada atributo começa em 5. Ao alcançar o nível 2 e cada nível seguinte, o jogador recebe cinco pontos livres. O orçamento total é `5 × (nível − 1)`; pontos disponíveis são o orçamento menos a soma investida. Subir de nível não escolhe atributos pelo jogador. O crescimento básico por nível das classes foi mantido.

Clique em **Personagem**, no contador de pontos do perfil ou pressione **P**. A janela mostra sprite, facção, classe e poder à esquerda; os cinco atributos e botões de adicionar/retirar ao centro; resultados atuais e prévia à direita. **Limpar prévia** cancela apenas alterações ainda não aplicadas. **Confirmar distribuição** valida o saldo novamente, aplica os atributos, recalcula HUD/combate e salva imediatamente. Fechar cancela a prévia. Não há redistribuição gratuita dos pontos já confirmados.

O save usa os novos campos `attributeVersion: 1`, `attributes` e `attributePoints`. Saves anteriores recebem todos os pontos do nível como livres. Recarregar recalcula o saldo a partir do investimento, sem somar pontos outra vez. Valores inválidos ou acima do orçamento são limitados. Classe, facção, nível, XP, itens, IDs, melhorias, contratos e estatísticas anteriores são conservados.

A chave principal continua `mare-partida-save-v1`. Antes da primeira migração, o conteúdo original é guardado, sem alteração, em `mare-partida-save-v1-before-attributes-v1`. Uma importação também preserva o save anterior em `-before-import` e o arquivo recebido em `-import-source`. Essas cópias são locais ao mesmo navegador/origem; não são um serviço de nuvem. O formato de exportação inclui os novos campos. Trocar classe preserva pontos e itens; mochila cheia impede a troca para não descartar a arma anterior.

## Fórmulas centralizadas

`character-system.js` concentra o orçamento, migração, atributos derivados, dano, mitigação e cura. Combate, HUD, inventário e prévia usam os mesmos derivados. Atributos nas fórmulas são os totais (5 iniciais + investimento). `L = nível − 1`; equipamentos fornecem os bônus de ataque, defesa e vida já existentes, incluindo melhoria e nível do item. `round` arredonda ao inteiro mais próximo.

### Ataques

Físico: `round((ataqueBase + L × crescimentoAtaque + ataqueEquipamento + a×FOR + b×DES + c×VIT) × multiplicadorAtaqueFacção)`.

| Classe | a (FOR) | b (DES) | c (VIT) |
|---|---:|---:|---:|
| Espadachim | 1,60 | 0,45 | 0 |
| Lutador | 1,55 | 0,15 | 0,25 |
| Atirador | 0,35 | 1,55 | 0 |
| Gatuno | 0,25 | 1,50 | 0,10 |
| Ciborgue | 0,65 | 0,15 | 0,15 |
| Elemental | 0,30 | 0,15 | 0 |
| Curandeiro | 0,25 | 0,15 | 0 |

O ataque base do Ciborgue passou a 10 e seu crescimento ofensivo a 1,5 por nível, priorizando resistência.

Elemental: `round((ataqueBase + L × crescimentoAtaque + 0,8 × ataqueEquipamento + i×INT + e×ESP) × multiplicadorAtaqueFacção)`. Elemental usa `i=2,1; e=0,35`. Curandeiro usa `i=0,9; e=0,65`. Nas demais classes o valor potencial aparece no painel, mas seus ataques continuam físicos; investir INT não transforma golpes físicos em magia.

Dano aplicado: `max(1, floor(max(1, ataqueDoTipo × multiplicadorHabilidade × variação − defesaAlvo × fator) × crítico))`. Fator é 0,30 físico e 0,15 elemental; variação entre 0,90 e 1,12; crítico multiplica por 1,65. Ataques físicos podem errar conforme a precisão; elementais não usam esse teste de precisão. Ataques básicos usam multiplicador 1.

### Resistência, recursos e suporte

- Vida: `round((vidaBase + L×crescimentoVida + vidaEquipamento + VIT×8) × bônusVidaFacção)`. No Ciborgue, VIT multiplica por 12.
- Defesa: `round((defesaBase + L×crescimentoDefesa + defesaEquipamento + VIT×0,55 + FOR×0,08) × bônusDefesaFacção)`. Ciborgue usa VIT×1,05.
- Energia: `round((energiaBase + L×crescimentoEnergia + ESP×4 + INT×0,5) × bônusEnergiaFacção)`.
- Dano recebido: `max(1, floor(ataqueInimigo × 100/(100+3×defesa) × mitigaçãoPassiva × proteçãoAtiva × variação))`. Ciborgue recebe fator passivo 0,88; demais, 1. Variação entre 0,85 e 1,10. Proteção ativa aplica `1 − redução`.
- Redução de proteção: `min(65%, 30% + ESP×0,1%)`; Ciborgue começa em 38%.
- Potência de cura: `round(12 + INT×1,1 + ESP×2,3 + L×0,8)`. Maré Restauradora aplica esse valor, limitado à vida faltante.
- Blindagem cura `12% da vida máxima + 25% da potência de cura`; Fôlego cura `18% da vida máxima + 25% da potência`.
- Regeneração de energia: `2,2 + ESP×0,04` por segundo. Vida em combate: `0,9 + ESP×0,015` por segundo; no porto soma 1,9.
- Bênção concede proteção por 8s e regeneração adicional `1,5 + ESP×0,06 + INT×0,02` por segundo durante o efeito.

### Destreza e poder

- Ataques/s: `min(3, (velocidadeBase + min(0,5; L×0,009) + DES×0,006) × bônusVelocidadeFacção)`.
- Crítico: `min(50%, críticoBase + bônusFacção + L×0,1% + DES×0,15%)`.
- Esquiva: `min(35%, DES×0,15% + bônusGatunoDe12%)`.
- Precisão física: `min(99%, 90% + DES×0,15%)`.
- Movimento livre: base 158 px/s (Gatuno 180) + `min(36, DES×0,3)`. Aproximação em combate mantém bases específicas por classe e recebe o mesmo bônus de Destreza. Mapas, colisões e câmera permanecem iguais.
- Poder: `round(ataqueUtilizado×8 + defesa×5 + vida×0,22 + energia×0,1 + crítico×100 + esquiva×100 + bônusSuporte)`. O ataque utilizado é elemental no Mago/Curandeiro e físico nos demais. Curandeiro soma potência de cura×2. Poder é um indicador comparativo, não uma promessa de DPS.

## Idle e estrutura de grupo

O Curandeiro cura automaticamente abaixo de 70% da vida por padrão. A janela permite escolher 40%, 50%, 60%, 70%, 80% ou 90%; a preferência persiste. Cura com vida cheia não consome energia nem inicia cooldown. O suporte é avaliado antes das poções; sem necessidade de cura, o Curandeiro continua atacando. Bênção automática exige vida abaixo de 85% e proteção encerrada.

Ciborgue prioriza blindagem abaixo de 85% da vida. Lutador usa proteção abaixo de 75%. Habilidades respeitam energia e cooldown; a facção Governo Mundial mantém a redução de recarga de 8%. Elemental usa fogo individual e eletricidade em área com cores distintas nos efeitos de combate existentes.

`healRecipients` aceita uma lista explícita de destinatários reais e informa cura efetiva por ID. Nesta versão o jogo passa somente o herói. Provocação registra `targetId` e duração nos inimigos e mantém sua aproximação durante o efeito. Não há aliados simulados, grupo, rede ou multiplayer funcional.

## Arquivos e validação

Novos: `character-system.js`, `tests/character-system.test.cjs`, `tests/characters_browser.py` e este documento. Alterados: `game.js`, `index.html`, `styles.css`, `tools/dev_server.py`, `tests/island_browser.py` e `README.md`.

Os resultados executados e capturas desta entrega ficam em `docs/evidence-attributes/`; a regressão anterior fica na subpasta `regression/`. Os testes usam contextos isolados, saves de teste e relógio virtual, sem editar o personagem do usuário.

Executados e aprovados:

- `node tests/character-system.test.cjs`: 10 cenários de orçamento, migração repetida, distribuição inválida, escalonamento por classe, dano, defesa, cura e limites de Destreza.
- `python tests/characters_browser.py`: 12 cenários; criação/Idle/level up das sete classes, prévia e confirmação dos cinco atributos, recargas, inventário/forja, janela em 1366×768 e 1920×1080 (mais 390×844), cura real, configuração persistida, energia/cooldown e prevenção de cura com vida cheia. [Resultados](evidence-attributes/results.json).
- `python tests/island_browser.py` com `MARE_EVIDENCE_DIR=evidence-attributes/regression`: 12 cenários de regressão, incluindo 20 derrotas, recompensa e persistência. [Resultados](evidence-attributes/regression/results.json).
- `node tests/world-system.test.cjs`: 39 verificações; `node tests/island-world.test.cjs`: oito rotas completas e acesso aos serviços.
- Sintaxe de `game.js` e `character-system.js`: válida.
- SHA256 dos 52 assets anteriores e dos três arquivos `world-system.js`, `island-world.js`, `island-assets.js`: idênticos ao checkpoint.

![Distribuição e atributos derivados](evidence-attributes/character-1366x768.png)

![Cura individual real em combate](evidence-attributes/healer-real-heal.png)

## Limites de balanceamento

O balanceamento foi validado por cenários funcionais e comparação de fórmulas. Ainda exige sessões longas e telemetria para ajustar dificuldade por nível e equilíbrio de builds. Não foram adicionados furtividade, novos sprites ou novos elementos além dos ataques descritos. Não há grupo multiplayer para homologar cura em aliados ou troca de aggro entre jogadores. As texturas em 64×64 continuam dependendo da autorização de geração separada.
