# Vestuário no build d7027df

O [código testado](https://github.com/Eximaq/mare-partida/commit/d7027dfb04adbf7a37ee216c14620fcf70659cc0) reúne a montagem dos capacetes no crânio articulado, os vínculos da pistola 114 e os contatos de mãos e armas em oito poses adicionais. A assinatura da distribuição é `26ba9a07d355e29ac09330c695a5f798ced6882e6bd4ec64392b5c4ad4c5ef84`.

| Seleção | Build 902c176 | Build d7027df | Consultas no build d7027df |
|---|---:|---:|---:|
| Corpo armado sem roupas | 1.008 | 1.008 | 1.008 |
| Contextos com peças, pares e conjuntos amostrados completos | 1.025 | 1.033 | 1.176 |
| Peças individuais | 51.417 | 52.227 | 58.800 |
| Pares de itens em slots diferentes | 1.025.015 | 1.033.023 | 1.176.000 |
| Conjuntos de cinco peças amostrados | 102.500 | 103.300 | 117.600 |

Passaram os 504 contextos femininos armados, 361 dos 504 masculinos armados e os 168 desarmados. As 143 lacunas restantes neste build estão nas montagens de roupas em ataques masculinos. A fila identifica os itens e a causa de cada recusa. [Totais](resumo.json) · [Detalhes por item e contexto](detalhes.tsv.gz) · [Fila](pendencias.json.gz) · [Resultados dos 1.176 contextos](censo.ndjson.gz).

## Seleção exaustiva

As armas 2 e 3 ao Norte, 15, 109 e 112 ao Sul e 117 a Leste, Oeste e Sul passaram em **800.000 de 800.000** conjuntos completos. Cada contexto percorreu as 100.000 combinações diretamente pelo seletor, com aparência masculina de pele ébano, cabelo azul e olhos verdes. [Resultado de cada contexto e item](produto-direto.json.gz).

A execução feminina em lotes sobre a distribuição 4ff9073 também terminou. Passaram **58.800.000 de 58.800.000 consultas de seleção**, distribuídas por 588 contextos, com 100.000 conjuntos em cada. Foram 50.400.000 consultas com arma e 8.400.000 nas poses sem arma das sete classes. A assinatura e as contagens por arma, classe, ação e direção estão no arquivo de resultados. Os mesmos conjuntos reaparecem em poses diferentes. [Enumeração feminina](cartesiano-feminino-4ff9073.json.gz).

## Desenho

O teste da distribuição d7027df carregou os recursos originais e comparou **104 instantes da animação**: corpo com arma contra a fonte nativa, e os cinco slots contra as máscaras e os metais da fase. A arma 109 ocupa 48 instantes com sete estados anatômicos diferentes. A direção Oeste usa suas fontes já orientadas. Também passaram as regressões dos 40 quadros de contato anteriores, os 48 quadros de propriedade dos peitorais ao Sul e as duas suítes de materiais ao Sul. [Teste de contatos](../../../../tests/rework-wardrobe-authored-contact.cjs).

No mapa, foram 39 ataques em 13 poses. A troca da luva 159 → 25 → 159 pelo inventário manteve as outras roupas, a arma e a aparência. O navegador registrou zero erros. O ensaio dos capacetes tem sua evidência separada de 3.360 quadros e 12 observações no mapa. [Registro do mapa](mapa.json.gz) · [Captura da manopla 112](mapa-manopla-112.webp) · [Capacetes](../capacetes-articulados).

## Estado por item

As duas colunas armadas têm 504 contextos cada, a desarmada tem 168. Por item, o censo armado tem 40.320 consultas de pares e 10.080 participações em conjuntos amostrados.

| ID | Slot | Masc. armado | Fem. armado | Desarmado | Pares armados | Conjuntos amostrados armados | Estado global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 362 | 504 | 168 | 34.601 | 8.650 | Parcial |
| 7 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 130 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 137 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 144 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 151 | Peitoral | 379 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 158 | Peitoral | 379 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 165 | Peitoral | 379 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 172 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 179 | Peitoral | 379 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 21 | Calça | 370 | 504 | 168 | 34.608 | 8.650 | Parcial |
| 22 | Calça | 362 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 133 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 140 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 147 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 154 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 161 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 168 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 175 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 182 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 8 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 9 | Bota | 365 | 504 | 168 | 34.609 | 8.650 | Parcial |
| 134 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 141 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 148 | Bota | 362 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 155 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 162 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 169 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 176 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 183 | Bota | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 25 | Luva | 366 | 504 | 168 | 34.610 | 8.650 | Parcial |
| 26 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 131 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 138 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 145 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 152 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 159 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 166 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 173 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 180 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 18 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 19 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 129 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 136 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 143 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 150 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 157 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 164 | Cabeça | 411 | 504 | 168 | 34.608 | 8.650 | Parcial |
| 171 | Cabeça | 409 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 178 | Cabeça | 411 | 504 | 168 | 34.600 | 8.650 | Parcial |
