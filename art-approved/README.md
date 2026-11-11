# Arquivo de artes aprovadas

Branch de organização incremental. Sem PR, merge ou ativação no jogo nesta etapa.

- `weapons/`: poses aprovadas de armas, com versões, direções e SHA-256 no manifesto.
- `clothing/static-and-idle-v1/`: nove conjuntos estáticos (cinco femininos e quatro masculinos) e cinco ciclos idle femininos. Cada ZIP é autocontido e mantém os PNGs originais e o tempo de animação em METADATA.json. INDEX.json registra tamanho e integridade.

## Roupas preservadas neste lote

Estáticos femininos151/158/165/172/179 e masculinos158/165/172/179, quatro vistas de cada item. Idles femininos151S/151N/158S/172S/179S, oito fases a4fps. Repetições são referências aos mesmos PNGs, sem redesenho. A aprovação de uma pose estática não aprova automaticamente sua animação.

A pasta guarda arte aprovada para futura implementação. Não altera compositor, bindings, catálogo, save ou distribuição Pages. Pacotes históricos não são automaticamente versões prontas para produção. Futuras inclusões devem preservar item, gênero, direção, versão, timing e escopo da aprovação.
