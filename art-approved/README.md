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
