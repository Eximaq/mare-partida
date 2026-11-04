# Comparação controlada de potencial

Classe: Espadachim · nível 50 · facção Pirata. Poder sem equipamento: 2.272.

Somente um peitoral equipado. Sem refinamento, pérolas, talentos, Haki, fruta ou atributos distribuídos. O mesmo sorteio determinístico (semente 3) mantém os tipos e a sequência de distribuição dos extras dentro de cada série. Todos os valores vêm de `MareForge.generateItem` → `aggregate` → `MareCharacters.derive`, sem alterar a fórmula de Poder.

## Poder acrescentado pelo peitoral

| Raridade e peça | 0% | 20% | 40% | 60% | 80% | 100% |
|---|---:|---:|---:|---:|---:|---:|
| Comum · Casaco de Marinheiro (ID 6) | 311 | 425 | 523 | 637 | 727 | 840 |
| Incomum · Casaco da Bruma (ID 7) | 592 | 810 | 1.004 | 1.204 | 1.411 | 1.633 |
| Raro · Casaco das Marés (ID 130) | 931 | 1.250 | 1.558 | 1.864 | 2.199 | 2.497 |
| Épico · Sobretudo do Almirante (ID 151) | 1.493 | 1.994 | 2.473 | 2.953 | 3.434 | 3.939 |
| Lendário · Casaco da Grand Line (ID 172) | 2.372 | 3.160 | 3.927 | 4.748 | 5.531 | 6.327 |
| Supremo · Armadura do Imperador (ID 179) | 3.762 | 5.043 | 6.298 | 7.530 | 8.796 | 10.039 |

## Cinco gaps por raridade — pontos de Poder e aumento da contribuição da peça

| Raridade | 0→20% | 20→40% | 40→60% | 60→80% | 80→100% |
|---|---:|---:|---:|---:|---:|
| Comum | +114 (37%) | +98 (24%) | +114 (22%) | +90 (15%) | +113 (16%) |
| Incomum | +218 (37%) | +194 (24%) | +200 (20%) | +207 (18%) | +222 (16%) |
| Raro | +319 (35%) | +308 (25%) | +306 (20%) | +335 (18%) | +298 (14%) |
| Épico | +501 (34%) | +479 (25%) | +480 (20%) | +481 (17%) | +505 (15%) |
| Lendário | +788 (34%) | +767 (25%) | +821 (21%) | +783 (17%) | +796 (15%) |
| Supremo | +1.281 (35%) | +1.255 (25%) | +1.232 (20%) | +1.266 (17%) | +1.243 (15%) |

## Limites da leitura

- Percentuais exibidos são arredondados para cima. Usam a contribuição do peitoral, não o Poder total do personagem. O JSON fornece os percentuais exatos da peça e do personagem.
- São amostras controladas. Outra classe, distribuição de extras ou equipamento adicional pode mudar o ganho. Potencial aumenta as bases em 1,5% por ponto, além do orçamento de extras e de uma reserva de Vida que elimina empates de arredondamento. Refino e pérolas continuam separados.
- A fórmula de Poder existente não contabiliza todos os efeitos de combate com o mesmo peso. Velocidade de ataque e dano crítico continuam afetando o combate pelas regras próprias.
- Pisos compartilhados por slot/classe corrigem bases antigas que invertiam raridades. Cada patamar nativo possui bases no mínimo 60% acima do teto de bases anterior; os básicos fundidos ficam entre os dois patamares, preservando a vantagem nativa na mesma raridade.

Reproduzir: `node tools/report_equipment_potential.cjs sword 50`. Acrescente `--json` para incluir os atributos reais e ambos os percentuais.
