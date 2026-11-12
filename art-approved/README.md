# Arquivo de artes aprovadas

Organização incremental de fontes aprovadas. Sem PR, merge ou ativação no jogo nesta etapa.

## Navegação

- `CATALOG.json`: índice completo dos ZIPs presentes, tamanhos, SHA-256 e quantidade de entradas PNG.
- `weapons/manifest.json`: poses individuais aprovadas, versões e direções. Os subdiretórios históricos preservam ciclos autocontidos, com seus metadados.
- `clothing/static-and-idle-v1/`: equipamentos estáticos femininos e masculinos e cinco idles femininos.
- Demais pastas de `clothing/`: pacotes organizados por item ou grupo histórico, gênero, direção e versão. `METADATA.json` dentro de cada ZIP documenta o conteúdo e o tempo de animação quando aplicável.
- `clothing/walk-and-collar-history/`: caminhada SOUTH r7 e estudo aprovado de gola/punhos M172 v2. A aprovação histórica não se estende a revisões posteriores.

## Limites

São arquivos de fonte para futura implementação, não integração funcional. Não alteram compositor, bindings, catálogo do jogo, save ou distribuição Pages. Alguns pacotes contêm camadas editáveis ou apresentações aprovadas, não sprites finais de produção. Contagens de PNGs podem incluir camadas e não equivalem a fases únicas.

A aprovação de uma vista estática não aprova automaticamente sua animação. Cada inclusão preserva o escopo aprovado e os bytes das fontes. Versões em correção e fontes sem vínculo verificável com aprovação ficam fora. A cobertura ainda está sendo reconciliada; este arquivo não declara que todo o histórico foi recuperado.


## Atualização de 2026-11-12

57 pacotes aprovados de roupas em animações de armas em `weapons/clothing-batch-20261112/`. Todos os ciclos NORTH do cajado 128 ficam fora. O manifesto registra hashes exatos e o script restaura os ZIPs divididos em partes. Arquivo de fontes, sem integração ou teste no jogo.

A aprovação explícita posterior de 109 nas laterais (M/F) e117 feminino NORTH v7 está em `weapons/clothing-batch-20261112-followup/`: mais3 pacotes, total60 no dia. A exceção128 NORTH permanece integralmente fora.


## Cajado 128 NORTH: aprovação posterior

A versão nova baseada na animação aprovada do cajado 127 foi aprovada em 2026-11-12 e está em `weapons/staff128-north-base127-approved/`. A aprovação inclui os dois modelos e quatro trajes. As exclusões anteriores permanecem válidas para as versões rejeitadas, não para este backup específico. A reconstrução exata e o CRC foram verificados; sem integração ou teste no jogo.


## Braço 117: laterais aprovadas

Os dois backups aprovados de EAST/WEST, masculino e feminino com quatro trajes, estão em `weapons/arm117-ew-approved/`. Reconstrução exata, CRC e SHA-256 verificados; sem integração ou teste no jogo.


## Armas 0, 67 e 70: laterais aprovadas

Os dois backups aprovados de EAST/WEST, masculino e feminino com quatro trajes, estão em `weapons/swords0-67-70-ew-approved/`. Reconstrução exata, CRC e SHA-256 verificados; sem integração ou teste no jogo.


## Manopla 109 NORTH aprovada

O backup aprovado de NORTH, masculino e feminino com quatro trajes, está em `weapons/manopla109-north-approved/`. Reconstrução exata, CRC e SHA-256 verificados. A pendência SOUTH é separada. Sem integração ou teste no jogo.


## Sabre 1 e Nodachi 68 SOUTH aprovados

A composição apresentada sobre o ciclo da arma 67 está em `weapons/sabre1-nodachi68-south-base67-approved/`. Aprovação restrita à prévia mostrada, sem extensão a modelos ou trajes não apresentados. Backup exato verificado; sem integração ou teste no jogo.


## Nodachi de Fogo 69: laterais masculinas de base aprovadas

O backup v2 das laterais EAST/WEST está em `weapons/nodachi69-ew-male-base-v2-approved/`. Aprovação restrita ao modelo masculino de base apresentado, sem extensão ao feminino ou trajes não mostrados. Backup exato verificado; sem integração ou teste no jogo.


## Nodachi de Fogo 69: quatro trajes M/F nas laterais

A aprovação posterior dos quatro trajes masculinos e femininos de EAST/WEST está em `weapons/nodachi69-ew-four-outfits-approved/`. Backups exatos, reconstrução, CRC e SHA-256 verificados. Sem integração ou teste no jogo.


## Arma 13 SOUTH V2 aprovada

A composição apresentada está em `weapons/adaga13-south-v2-approved/`. Aprovação restrita à prévia mostrada, sem extensão a outros modelos ou trajes. Backup exato verificado; sem integração ou teste no jogo.


## Mosquete 4 SOUTH V3 aprovado

O ciclo apresentado com cano frontal está em `weapons/mosquete4-south-v3-approved/`. Aprovação restrita à combinação M151/157 mostrada. Backup exato verificado; sem integração ou teste no jogo.


## Seis adagas NORTH aprovadas

As armas 12, 13, 71, 72, 73 e 74 na composição masculina apresentada estão em `weapons/daggers12-13-71-74-north-presented-approved/`. Aprovação restrita ao que foi mostrado, sem inferir feminino, outros trajes ou integração modular. Backup exato verificado; sem integração ou teste no jogo.
