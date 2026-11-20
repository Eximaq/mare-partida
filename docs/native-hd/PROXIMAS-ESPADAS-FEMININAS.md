# Família feminina de espadas, ativada por encaixe

Conjunto: 0, 1, 67, 68, 69 e 70. As outras cinco já têm oito estados nativos de ataque em cada direção quando usadas sem o Peitoral 151. Todos os registros compartilham o corpo e os dados de empunhadura da Espada 0; não se deve reaproveitar cegamente uma matriz que veio de outro PNG.

- **1, 68 e 69:** prova isolada de 96 quadros por arma com C151 e amostras de calça, luva e bota. A arma usa o próprio PNG, no mesmo punho; só mudam os pixels abrangidos pela arma. Norte e Sul usam o próprio movimento; as laterais da prova seguem o vetor recuperado de revisão. A visão lateral de 68 tem alfa próprio e não é uma duplicata de 1.
- **67 e 70:** acervo feminino histórico recomposto e validado, SHA-256 `27aaf381440afce9a0e0d41d3dfc55415a3753c5efff0a8412a853f7e8d8773a`. O teste do Leste/Oeste reaproveita a própria lâmina de cada uma e mantém punho/escala. Foram 32 quadros sem cortar a imagem do equipamento. Esse candidato não equivale à edição posterior de novembro preservada em vídeo.

## Integração padrão

Espadas **1, 67, 68, 69 e 70**: o Peitoral 151 e os encaixes independentes da família entram nas quatro direções, somente quando a rota exata ou modular anterior não atende ao conjunto. A arma usa os oito estados nativos e a margem de tela da própria espada, sem aplicar as rotações experimentais da prova. A troca da roupa não troca a posição, o PNG ou o relógio da arma. A rota de espada sozinha permanece exata; adicionar o peitoral ou as peças autorizadas não altera cabelo, olhos, pele nem save.

Escopo do acervo: aparência feminina de referência (cabelo curto loiro, olhos âmbar, os oito tons de pele no save normal, além do perfil literal legado). G26/G145/G159/G166/G173 no perfil normalizado. Para combinações simultâneas de calça e bota, P22/B9 já comprovada; outras como P21/B9 continuam recusadas, não são ajustadas por transparência.

`node tests/rework-sword-family-active.cjs` após `python tools/build_pages.py` verifica as cinco espadas, 80 seleções de peças representativas e 160 quadros, incluindo troca do conjunto e integridade da origem e da aparência.

Para reproduzir a comparação de 1, 68 e 69 após gerar o build normal: `ITEM=1 node tests/rework-sword-family-review.cjs` (repita com 68 e 69). O teste carrega a orientação de revisão do acervo só em memória; não altera o jogo.
