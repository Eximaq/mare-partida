# Próximas espadas femininas, sem ativação

Conjunto: 0, 1, 67, 68, 69 e 70. As outras cinco já têm oito estados nativos de ataque em cada direção quando usadas sem o Peitoral 151. Todos os registros compartilham o corpo e os dados de empunhadura da Espada 0; não se deve reaproveitar cegamente uma matriz que veio de outro PNG.

- **1, 68 e 69:** prova isolada de 96 quadros por arma com C151 e amostras de calça, luva e bota. A arma usa o próprio PNG, no mesmo punho; só mudam os pixels abrangidos pela arma. Norte e Sul usam o próprio movimento; as laterais da prova seguem o vetor recuperado de revisão. A visão lateral de 68 tem alfa próprio e não é uma duplicata de 1.
- **67 e 70:** acervo feminino histórico recomposto e validado, SHA-256 `27aaf381440afce9a0e0d41d3dfc55415a3753c5efff0a8412a853f7e8d8773a`. O teste do Leste/Oeste reaproveita a própria lâmina de cada uma e mantém punho/escala. Foram 32 quadros sem cortar a imagem do equipamento. Esse candidato não equivale à edição posterior de novembro preservada em vídeo.

Essas provas são de reaproveitamento. Nenhuma arma acima foi ativada junto com a Espada 0; não foi criada nova arte nem modificada a rota atual de cada uma.

Para reproduzir a comparação de 1, 68 e 69 após gerar o build normal: `ITEM=1 node tests/rework-sword-family-review.cjs` (repita com 68 e 69). O teste carrega a orientação de revisão do acervo só em memória; não altera o jogo.
