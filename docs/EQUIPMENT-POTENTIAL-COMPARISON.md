# Comparação controlada de potencial

Classe: Espadachim · nível 50 · facção Pirata. Poder sem equipamento: 2.272.

Somente um peitoral equipado. Sem refinamento, pérolas, talentos, Haki, fruta ou atributos distribuídos. O mesmo sorteio determinístico (semente 3) mantém os tipos e a sequência de distribuição dos extras dentro de cada série. Todos os valores vêm de `MareForge.generateItem` → `aggregate` → `MareCharacters.derive`, sem alterar a fórmula de Poder.

## Poder acrescentado pelo peitoral

| Raridade e peça | 0% | 20% | 40% | 60% | 80% | 100% |
|---|---:|---:|---:|---:|---:|---:|
| Comum · Casaco de Marinheiro (ID 6) | 164 | 173 | 181 | 190 | 198 | 207 |
| Incomum · Casaco da Bruma (ID 7) | 325 | 334 | 352 | 353 | 379 | 388 |
| Raro · Casaco das Marés (ID 130) | 268 | 286 | 296 | 307 | 325 | 335 |
| Épico · Sobretudo do Almirante (ID 151) | 387 | 411 | 426 | 442 | 467 | 476 |
| Lendário · Casaco da Grand Line (ID 172) | 638 | 676 | 695 | 735 | 774 | 822 |
| Supremo · Armadura do Imperador (ID 179) | 961 | 1.018 | 1.081 | 1.116 | 1.175 | 1.234 |

## Cinco gaps por raridade — pontos de Poder e aumento da contribuição da peça

| Raridade | 0→20% | 20→40% | 40→60% | 60→80% | 80→100% |
|---|---:|---:|---:|---:|---:|
| Comum | +9 (5,49%) | +8 (4,62%) | +9 (4,97%) | +8 (4,21%) | +9 (4,55%) |
| Incomum | +9 (2,77%) | +18 (5,39%) | +1 (0,28%) | +26 (7,37%) | +9 (2,37%) |
| Raro | +18 (6,72%) | +10 (3,5%) | +11 (3,72%) | +18 (5,86%) | +10 (3,08%) |
| Épico | +24 (6,2%) | +15 (3,65%) | +16 (3,76%) | +25 (5,66%) | +9 (1,93%) |
| Lendário | +38 (5,96%) | +19 (2,81%) | +40 (5,76%) | +39 (5,31%) | +48 (6,2%) |
| Supremo | +57 (5,93%) | +63 (6,19%) | +35 (3,24%) | +59 (5,29%) | +59 (5,02%) |

## Limites da leitura

- O percentual acima usa a contribuição do peitoral, não o Poder total do personagem. O JSON também fornece o aumento percentual do personagem.
- São amostras controladas. Outra classe, distribuição de extras ou equipamento adicional pode mudar o ganho. Potencial aumenta o orçamento real; não equivale a um multiplicador linear de Poder.
- A fórmula de Poder existente não contabiliza todos os efeitos de combate com o mesmo peso. Velocidade de ataque e dano crítico continuam afetando o combate pelas regras próprias.
- Nesta amostra, o Casaco das Marés Raro fica abaixo do Casaco da Bruma Incomum. O cadastro atual tem bases diferentes (DEF 4 / Vida 17 contra DEF 7 / Vida 27). Essa inversão está exposta para avaliação; não foi corrigida silenciosamente.

Reproduzir: `node tools/report_equipment_potential.cjs sword 50`. Acrescente `--json` para incluir os atributos reais e ambos os percentuais.
