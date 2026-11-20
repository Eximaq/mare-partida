# Espada 0 + Peitoral 151 no jogo normal

A compilação padrão carrega a família de ataque feminina da Espada 0 com o Peitoral 151, sem flag nem parâmetro de URL. A rota só é usada quando nenhuma fonte HD exata nem modular existente atende ao pedido. A sua pose, oito estados, trajetória da espada, material do personagem e as outras peças continuam vindo da fonte nativa. A rotação lateral experimental contida no acervo não é usada ao trocar equipamentos.

## Aparência e peças

- Perfil registrado: cabelo Curto loiro e olhos âmbar, oito tons de pele no save normalizado (também preserva o perfil original do acervo). Outros penteados, olhos e tons não são forçados para esse perfil.
- No perfil padrão validado: **76 rotas novas** de peça isolada nas quatro direções, incluindo dez botas, calças validadas e Luvas 26/145/159/166/173. As outras luvas do acervo ainda não têm prova de separação entre material quente e pele para o perfil normalizado.
- A combinação Calça 22 + Bota 9 foi validada nas quatro direções. A Calça 21 + Bota 9 deixa um vão na barra e não entra na rota. Não extrapolar a mesma bota para outras calças.
- As 24 rotas anteriores de calça do recorte permanecem idênticas. A ausência do catálogo ou a falha nas assinaturas deixa as rotas existentes disponíveis.

## Reprodução

1. `python tools/build_pages.py`: valida as partes do ZIP já arquivado, extrai o catálogo e os 1.503 PNGs por SHA para o build. Nenhuma cópia de sprite é adicionada ao Git.
2. `node tests/rework-sword0-checkpoint-optin.cjs .`: apesar do nome histórico, verifica a integração **padrão**, sem URL especial. Inclui 96 seleções no perfil do acervo, 76 no perfil normalizado, 192 quadros Canvas representativos, precedência das 24 rotas exatas, proteção de barra, vínculo de arma/identidade e inicialização após carregamento tardio da paleta.
3. `node tests/rework-sword0-checkpoint-world.cjs`: os scripts de mapa do build padrão também renderizaram o conjunto Calça 22 + Bota 9 nas quatro direções, em 32 quadros locais com o save imutável. Não é afirmação de validação em navegador interativo ou de publicação no Pages.
