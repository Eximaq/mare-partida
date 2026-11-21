# Capas não visuais, soco Sul, disparo e botas Norte

Base do lote: PR #348 em `7efaafd9`. Nenhuma nova animação ou cópia dos PNGs. Os índices e as camadas existentes continuam responsáveis pelas posições, cadências e materiais. O lote não altera atributos, inventário ou save.

| O que entrou | Escopo comprovado |
| --- | --- |
| As dez capas equipáveis não derrubam a composição HD | O slot continua não visual. A seleção independente agora o ignora da mesma forma que a seleção exata. 350 seleções, 56 quadros × três estados (sem capa, equipada, retirada) e a Espada 69 com o fluxo dos scripts de mapa do build, 32 quadros × três estados. Capa que faz parte de um peitoral continua desenhada. O teste falha no código anterior. |
| Personalização no disparo Norte feminino de W4, W5, W115 e W116 | A mesma base autoral de W113/W114, com arma própria fixa, mesmas oito fases a 12 fps e recuo registrado no quadro 4. 144 quadros de controle dos seis IDs, com Original, perfil padrão e aparência alternativa. O peitoral 151 continua reservado à rota W113, não foi emprestado. |
| Quatro luvas no soco masculino Sul: 145, 166, 173, 180 | Peitoral 151/Calça 133 e as nove botas da família estática. A arte da luva fica intocada, inclusive contorno; rosto, mãos e pele seguem o perfil nas máscaras já verificadas. 216 seleções, 160 quadros personalizados e 32 controles Original idênticos ao código anterior com a referência configurada. Leste/Oeste não foram alterados. |
| Calça 22 com Botas 148/162/183 no ataque Norte das seis espadas femininas | Peitoral 151 e as mesmas fases/camadas de arma. 288 quadros em Porcelana e Ébano: sem mudança fora do alfa de cada bota, sem exposição nova de pele em relação à B9, sem deslocar a sola. As combinações P21, B176 e demais direções não foram liberadas por esse teste. |

A prova de espelho das adagas confirma os mesmos pixels nas oito fases Leste/Oeste do torso, da cabeça e do cabelo. Braços e arma continuam com seus arquivos. No Norte, há pixels de cabelo antigo fundidos ao torso no quadro 3; não trocar pelo composto e não usar um recorte aproximado.

Comandos após build do Pages: `node tests/rework-nonvisual-cloak.cjs`, `node tests/rework-firearm-north-material.cjs`, `node --test tests/rework-male-south-four-gloves.cjs` e `node tests/rework-sword-north-boot-hem.cjs`. Os testes em Canvas e os scripts de mapa locais não afirmam publicação ou jogo validado em navegador interativo.
