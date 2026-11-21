# Luvas Sul 131/138/152 e Bota 169 Norte

Reaproveitamento validado sobre `0675bad2`, no mesmo PR #348. Sem desenhar arte, trocar fases, mudar equipamento salvo ou publicar no Pages.

- **Luvas 131, 138 e 152:** soco masculino Sul, P133/C151 e as nove botas estáticas já verificadas. As 24 imagens de luva foram reconstruídas byte por byte das seis camadas avulsas e translações de mão dos checkpoints ref-0540/0541/0543, sem abrir a camada de corpo. Mantém os materiais e bordas; a pele visível e a íris seguem a aparência salva. 162 seleções novas, 120 quadros personalizados nos casos B8/B155/B183, 24 quadros Original comparados contra o estado anterior. O teste agregado inclui mais quatro luvas do lote anterior. G25 e os lados Leste/Oeste não entram.
- **Bota 169 + Calça 22:** ataque Norte das espadas femininas 0/1/67/68/69/70, C151. 96 quadros (oito fases, dois tons extremos). Retirada RGBA exata; nenhuma alteração fora do próprio alfa da bota. Em comparação com B9, até quatro pixels no alfa intermediário no cano, com componente de no máximo três pixels e diferença de até dois níveis de cor: suavização de contorno, não uma faixa de pele. Sola, pivô, ordem de camadas e fases de arma permanecem inteiros. Não extrapola para outros corpos, calças, ações ou direções.

Após build do Pages: `node --test tests/rework-male-south-four-gloves.cjs` (todos os sete IDs) e `node tests/rework-sword-north-boot169-hem.cjs`. Os renders são testes do seletor/Canvas local, não uma confirmação de deploy.
