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
