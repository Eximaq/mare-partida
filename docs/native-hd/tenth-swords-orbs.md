# Décimo lote local: 67/70 e17/122 EAST/WEST

Candidato isolado sobre nono lote local `be70215c38ab3fb5181595b1ab003a1df57e5667`, árvore `eed227d5a9a7e44dffa7fb3e5ce1dfebb3b8de06`. Pai remoto equivalente verificado pelo coordenador: `709f3666033f7dd6b9d19f111a2fc04ea632ea45`. Este candidato não foi publicado; sem navegador, mapa, merge ou deploy.

## Escopo e contrato

- 67/70: duas espadas masculinas, classe canônica `sword`, EAST/WEST originais, arma isolada, aparência original de cabelo/olhos castanhos e pele clara. Canvas768, padding64, densidade4, pivô96/144. Não inclui trajes ou revisão posterior de nuca.
- 17/122: dois focos masculinos, classe `strategist`, EAST/WEST, ataque apenas. Peitoral original151/158/165/179 obrigatório. Não certifica ataque sem peitoral, outras roupas, cores, variantes, SOUTH/NORTH ou porte. Canvas640, densidade4, pivô80/128.
- Orbes: corpo→arma→reposição RGBA da anatomia original sob máscara→roupa independente. A roupa é o overlay original com recorte de propriedade e linhas superiores já documentados, não uma base vestida. A arma não incorpora mão ou pele. O ID de cache e `equipmentContract` incluem arma e peitoral.
- Orbe122 usa a regra original da mão mais as máscaras originais do reparo de punho1/2/6. A máscara17 não serve como substituta: perderia sete pixels transparentes na pose2. A recuperação reproduziu os32 PNGs originais; nenhuma máscara inferida da composição nem nova arte foi criada.

Todos os quatro ciclos autorais têm oito poses,12fps nominais, contato4, sem loop. Os holds de apresentação não são relógio de combate. O sampler existente continua ancorado ao impacto real sem alterar duração, velocidade, dano, rede ou controlador. A linha estrita `attack-sword` já veio do nono lote e não foi modificada novamente.

## Verificações focadas

RED→GREEN do contrato obrigatório: antes a seleção aceitava fonte sem peitoral e rejeitava a combinação aprovada; agora só aceita os quatro peitorais originais, sem extras. Seleção real e contrato/cache verificados, com rejeições de corpo, classe, variante e aparência.

160 referências reais no compositor:32 de espadas e128 de orbes. Alfa exato. RGB≤1 em todos os canais, exceto quatro canais azuis medidos:17/122 com peitoral158,pose1,EAST(367,315)/WEST(272,315),alfa254,delta azul≤2,premultiplicado≤508/255. Nenhum outro quadro, coordenada ou canal foi flexibilizado; arredondamento melhor é aceito. Diagnóstico congelado em `tests/fixtures/tenth-orb-canvas-diagnostic.json`. O RGB opaco permanece≤1. A diferença nasce somente no source-over de roupa252alpha sobre corpo151alpha, não em ordem ou oclusão. Nenhum pixel de produção foi retocado.

WorldVisual headless real em três subprocessos seriais:67→70;17→122 com peitoral151;peitoral151→158 na mesma17. São objetos de configuração sucessivos dentro da mesma instância de lobby: verifica troca/invalidação de identidade e cache, não mutação do mesmo objeto JavaScript. Os testes exigem TAP e os dois comprovantes de desenho por subprocesso, invalidam a identidade anterior e verificam extras/retirada. Não são testes de navegador/mapa. A/B do controlador existente em quatro equipamentos, seis velocidades e80 passos (1920 passos) preserva snapshots, impacto único, cooldown e desbloqueio; consome Canvas a cada amostra para limitar retenção.

136 consultas fora do contrato novo conservam exatamente os registros do nono lote; oito seleções não-nulas de porte17 (idle/walk nas quatro direções) permanecem idênticas. Os testes originais de carry17 também passaram. Todos os registros, perfis e bindings anteriores permanecem intactos; quatro JSONs de posicionamento sem alterações.

## Fontes e reprodução

`tenth-source-proof.json` conserva hashes, recibos de aprovação, matrizes, referências e limites.67/70 vêm das receitas originais preservadas e PNGs aprovados, sem assumir que uma fonte NORTH equivale a EAST.17/122 têm a aprovação de quatro trajes `d706bf9d… → f402eb44…` e correspondência exata ao ZIP original949573ea…; isto não amplia a aprovação para ataque sem roupa.

Receitas portáteis:
- `replay-package-tenth-swords67-70.py --item 67|70 --equipment-zip ORIGINAL --source-dir INPUTS --recipe-zip RECIPE_V10 --output DIR`
- `replay-package-tenth-orb17.py --source-zip ORBE17_EW --cohort-zip ORBES_M_FOUR_TORSOS --output DIR`
- `replay-package-tenth-orb122.py --source-zip ORBE17_EW --cohort-zip ORBES_M_FOUR_TORSOS --recipe-zip RECIPE_V10 --output DIR`

A receita122 reexecuta a receita original fixada por SHA e apenas registra seu predicado de oclusão; os reparos históricos incluídos são preservados, não gerados novamente. ZIPs usam membros raiz `{sha}.png`. Camadas e referências originais permanecem em arquivos separados.

## Resultado da validação consolidada

Focados5/5; WorldVisual dividido1/1(3 subprocessos); A/B relógio1/1; fallback/carry3/3. Auditoria295 arquivos,19088 PNGs de fonte e179 PNGs de cabeça verificados. Validação final: foundation243/243;259/259 arquivos legacy Node; suíte nativa191/191(796,1s); comando focal exato do workflow91/91(529,6s), sem falhas, cancelados ou ignorados. Pages build passou. Auditoria canônica4679 registros, zero divergências. Os8 ZIPs obrigatórios (4 componentes e4 referências) foram incluídos explicitamente no índice Git; os4 JSONs de ajustes de cabelo/capacete conferidos byte a byte contra o pai. A ressalva de recursos permanece: WorldVisual é headless e usa subprocessos seriais, não é prova de navegador/mapa.
