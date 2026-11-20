# Cabelo feminino: aplicar encaixes arquivados no HD

Usa os 27 registros de `hair_user_adjustments_source-only_v1` já presentes no índice HD, conforme a referência conferida antes da alteração. Nenhum JSON foi reimportado. O ramo de cabelo feminino nomeado sem capacete aplica x/y e escala com o pivô, os PNGs e o compositor da bancada. Só depois ancora o cabelo no pescoço da pose. Rosto, pele, olhos, equipamento, save e o recuo autoral da animação continuam separados.

- 27/27 composições iguais em RGBA à referência da bancada. Em 26 a posição ou a escala muda o desenho; o corte Longo no Norte é neutro (0/0/100%) e permanece idêntico.
- Nos controles de disparo Norte F0/F4/F7 das armas 113/114, mantém o recuo de nove pixels somente em F4. Os doze controles com capacetes 129/178 são iguais ao baseline. No soco Leste/Oeste, também conferidos três quadros por direção com cabelo rosa, pele Ébano e olhos verdes em formato Sereno.
- Não altera ajustes de capacetes, regras que ocultam cabelo, nenhum deslocamento Norte, variantes não arquivadas ou poses fora das rotas HD com fonte compatível.

Verificar com `node tests/rework-female-archived-hair-fit.cjs`. O teste também aceita `KAIZOKU_BASELINE_FEMALE_HAIR` para comparar RGBA contra o runtime anterior. Build estático local e regressões de cabeça/pescoço preservados; não implica publicação em Pages.
