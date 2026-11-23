# Vestuário nos ataques de foco e nas pistolas

Censo da publicação `6f8bf4dbbc2e1ee2074cfdf0df4e7a307493e262`; assinatura do seletor e dos índices `a3c5f4242eec36b27b87ee5f1ee2ef0a63bf0a0c35d1115a629a7ea670346ce4`. [Resumo por ID](resumo.json), [detalhes das 58.800 seleções individuais](detalhes.tsv.gz), [resultados por contexto, incluindo pares e combinações](censo.ndjson.gz) e [fila com as causas](pendencias.json.gz).

## Resultados medidos

| Corpo e equipamento | Receptores | Contextos completos no censo | Peças selecionadas | Pares selecionados | Conjuntos mistos selecionados |
|---|---:|---:|---:|---:|---:|
| Feminino com arma | 504/504 | 504/504 | 25.200/25.200 | 504.000/504.000 | 50.400/50.400 |
| Masculino com arma | 504/504 | 361/504 | 19.331/25.200 | 367.435/504.000 | 36.100/50.400 |
| Feminino sem arma | 84/84 | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |
| Masculino sem arma | 84/84 | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |

Em cada contexto foram selecionados os 50 itens, os 1.000 pares possíveis entre categorias diferentes e 100 conjuntos completos determinísticos. Há 143 contextos masculinos de ataque com pendências. A cobertura global em todas as etapas é 0/50. O [produto cartesiano feminino executado anteriormente](../censo-d7027df/cartesiano-feminino-4ff9073.json.gz) tem sua própria assinatura e cobre 58,8 milhões de seleções.

| Revisão do código | Individuais masculinos armados | Pares masculinos armados |
|---|---:|---:|
| 6b20251, botas e cabeças nas orbes | 18.975 | 364.583 |
| 4ab25ed, peitorais nas orbes | 18.991 | 364.903 |
| 039de93, sete cajados | 19.327 | 367.423 |
| 6f8bf4d, pistolas 114 Norte | 19.331 | 367.435 |

## Fontes e desenho

- **Cajados 31 e 123–128, Leste e Oeste.** Os arquivos editáveis 124 e 128 em `art-approved/weapons/clothing-batch-20261112` contêm o tecido dos peitorais 151, 158, 165 e 179. As camadas corporais ordenadas, a mão protegida e o metal da arma real determinam a sobreposição. A fonte Oeste já vem espelhada para o corpo e o metal. O teste de origem recompôs os 128 quadros de referência. O teste de desenho verificou 448 fases dos peitorais nos sete cajados. No mapa foram observados 84 ataques com botas 169, cabeça 19 e troca ou retirada de peitoral.
- **Orbes 17 e 122.** Os peitorais foram recuperados dos próprios registros ordenados após a restauração da mão. Houve 320 verificações de fases de peitoral, 800 de botas com peitoral e 24 ataques no navegador.
- **Pistolas 114, Norte.** Em cada uma das oito fases, o recorte central de 640 × 640 da referência de 768 × 768 é idêntico ao receptor nativo original. O exportador recupera somente o tecido da peça, respeita a máscara de cabelo, pele e arma e verifica as 32 imagens vestidas contra o original editável. A composição no mapa conserva a aparência, posiciona o peitoral acima da calça e preserva a luva em primeiro plano. Foram comparadas 64 fases de desenho, isoladas e com calça 21, bota 9 e luva 25. A sessão do navegador registrou 18 ataques, sete deles no ensaio de troca 151 → 158 → 165 → 179 → 151 e retirada.
- **Desenho de botas e capacetes no build dos sete cajados.** As suítes de estrategista e curandeiro mediram 1.920 fases de botas e 2.400 de capacetes, incluindo regressões de armas já integradas. Uma sessão adicional de troca de botas observou 130 ataques no mapa. As comparações por fase e os quadros de mapa identificam arma, ação e direção. [Dados dos ciclos e das trocas](ciclos-e-mapa.json.gz)
- Os ensaios do mapa usaram pele ébano, cabelo azul, olhos verdes e estilos originais. As capturas ilustram instantes das sessões. A contagem de observações no mapa é distinta da verificação de todos os pixels ao longo de um ciclo. [Cajado 124 no mapa](mapa-cajado-124-oeste.webp) · [Pistolas 114 no mapa](mapa-pistola-114-norte.webp)

## Reprodução

Gere o site com `python tools/build_pages.py --static-demo` e aponte `HD_PUBLISHED_ROOT` para a saída. Para o censo, execute `node tools/audit-hd-wardrobe-product.cjs <saída>` com `PRODUCT_MODE=sample`. Resuma o diretório `<saída>/<assinatura>/sample` com `node tools/summarize-hd-wardrobe-product.cjs <diretório> resumo.json detalhes.tsv.gz pendencias.json.gz`. As reprovações de seleção produzem código de saída 1.

Execute `python tests/rework_staff_coat_sources.py`, `python tools/export_north_pistol_coats.py --verify`, `node --expose-gc tests/rework-ordered-staff-coats.cjs` e `node tests/rework-north-pistol-coats.cjs`. Para as sessões no mapa, use `tests/rework-independent-world-browser.cjs` com `--staff-coats`, `--pistol-clothes` ou `--articulated-boots` e as variáveis `MARE_TEST_URL` e `MARE_EVIDENCE_DIR`.

## Estado dos 50 itens

As colunas de corpos contam seleção isolada em 504 contextos armados por corpo e 168 desarmados nos dois corpos. Pares e mistos abrangem apenas os contextos armados dos dois corpos. Cada item participa de até 40.320 pares e 10.080 mistos.

| ID | Slot | Masculino armado | Feminino armado | Desarmado | Pares | Mistos | Integração global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 362 | 504 | 168 | 34.601 | 8.650 | Parcial |
| 7 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 130 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 137 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 144 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 151 | Peitoral | 410 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 158 | Peitoral | 410 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 165 | Peitoral | 410 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 172 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 179 | Peitoral | 410 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 21 | Calça | 370 | 504 | 168 | 34.612 | 8.650 | Parcial |
| 22 | Calça | 362 | 504 | 168 | 34.602 | 8.650 | Parcial |
| 133 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 140 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 147 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 154 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 161 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 168 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 175 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 182 | Calça | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 8 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 9 | Bota | 405 | 504 | 168 | 35.133 | 8.650 | Parcial |
| 134 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 141 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 148 | Bota | 402 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 155 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 162 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 169 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 176 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 183 | Bota | 401 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 25 | Luva | 366 | 504 | 168 | 34.614 | 8.650 | Parcial |
| 26 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 131 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 138 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 145 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 152 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 159 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 166 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 173 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 180 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 18 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 19 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 129 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 136 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 143 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 150 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 157 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 164 | Cabeça | 429 | 504 | 168 | 35.128 | 8.650 | Parcial |
| 171 | Cabeça | 427 | 504 | 168 | 35.120 | 8.650 | Parcial |
| 178 | Cabeça | 429 | 504 | 168 | 35.120 | 8.650 | Parcial |
