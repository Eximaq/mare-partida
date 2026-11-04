# Comparação controlada de potencial

Classe: Espadachim · nível 50 · facção Pirata. Poder sem equipamento: 2.272.

Somente um peitoral equipado. Sem refinamento, pérolas, talentos, Haki, fruta ou atributos distribuídos. O mesmo sorteio determinístico (semente 3) mantém os tipos e a sequência de distribuição dos extras dentro de cada série. Todos os valores vêm de `MareForge.generateItem` → `aggregate` → `MareCharacters.derive`, sem alterar a fórmula de Poder.

## Poder acrescentado pelo peitoral

| Raridade e peça | 0% | 20% | 40% | 60% | 80% | 100% |
|---|---:|---:|---:|---:|---:|---:|
| Comum · Casaco de Marinheiro (ID 6) | 297 | 397 | 509 | 609 | 721 | 821 |
| Incomum · Casaco da Bruma (ID 7) | 579 | 787 | 994 | 1.194 | 1.405 | 1.605 |
| Raro · Casaco das Marés (ID 130) | 860 | 1.160 | 1.459 | 1.751 | 2.042 | 2.344 |
| Épico · Sobretudo do Almirante (ID 151) | 1.304 | 1.753 | 2.180 | 2.622 | 3.069 | 3.499 |
| Lendário · Casaco da Grand Line (ID 172) | 1.964 | 2.637 | 3.298 | 3.981 | 4.655 | 5.335 |
| Supremo · Armadura do Imperador (ID 179) | 2.938 | 3.965 | 4.978 | 5.983 | 6.984 | 8.004 |

## Cinco gaps por raridade — pontos de Poder e aumento da contribuição da peça

| Raridade | 0→20% | 20→40% | 40→60% | 60→80% | 80→100% |
|---|---:|---:|---:|---:|---:|
| Comum | +100 (33,67%) | +112 (28,21%) | +100 (19,65%) | +112 (18,39%) | +100 (13,87%) |
| Incomum | +208 (35,92%) | +207 (26,3%) | +200 (20,12%) | +211 (17,67%) | +200 (14,23%) |
| Raro | +300 (34,88%) | +299 (25,78%) | +292 (20,01%) | +291 (16,62%) | +302 (14,79%) |
| Épico | +449 (34,43%) | +427 (24,36%) | +442 (20,28%) | +447 (17,05%) | +430 (14,01%) |
| Lendário | +673 (34,27%) | +661 (25,07%) | +683 (20,71%) | +674 (16,93%) | +680 (14,61%) |
| Supremo | +1.027 (34,96%) | +1.013 (25,55%) | +1.005 (20,19%) | +1.001 (16,73%) | +1.020 (14,6%) |

## Limites da leitura

- O percentual acima usa a contribuição do peitoral, não o Poder total do personagem. O JSON também fornece o aumento percentual do personagem.
- São amostras controladas. Outra classe, distribuição de extras ou equipamento adicional pode mudar o ganho. Potencial aumenta as bases em 1,5% por ponto, além do orçamento de extras e de uma reserva de Vida que elimina empates de arredondamento. Refino e pérolas continuam separados.
- A fórmula de Poder existente não contabiliza todos os efeitos de combate com o mesmo peso. Velocidade de ataque e dano crítico continuam afetando o combate pelas regras próprias.
- Pisos compartilhados por slot/classe corrigem bases antigas que invertiam raridades. Cada patamar nativo possui bases no mínimo 50% acima do teto de bases anterior; os básicos fundidos ficam entre os dois patamares, preservando a vantagem nativa na mesma raridade.

Reproduzir: `node tools/report_equipment_potential.cjs sword 50`. Acrescente `--json` para incluir os atributos reais e ambos os percentuais.
