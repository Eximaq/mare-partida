# Recuo ao Norte, íris azul e B155

Base: `a903d55`. Somente no PR #348. O build não substitui nenhuma rota que já tenha fonte exata compatível.

- **Bota 155 masculina, Peitoral 151/Luva 152:** a bota pode sair e voltar nas sete calças (140/147/154/161/168/175/182) em repouso e caminhada Norte e no repouso Sul: 21 novos clipes. A fonte da própria calça manda nos passes do cano. Comparação de 126 quadros Originais e 126 com aparência salva, preservando a sola, cor e camadas fora da bota. As laterais não ganharam paleta; falta isolar a íris. Sul caminhada continua na regra já validada.
- **Olho azul nas seis espadas femininas:** com corte curto rente e formato Original, o pigmento azul usa somente a camada de íris conferida por hash. Branco, pupila e alfa são preservados. Norte mantém a íris oculta. Foram 1.920 seleções do perfil azul, 32 quadros por estêncil de íris e 32 retiradas da Bota 9 sem alterar a aparência ou a arma.
- **Fuzil 113 e Pistola 114 femininos ao Norte:** os pixels expostos das pernas, ombros e pescoço passam a acompanhar o tom escolhido sem pintar a regata ou o short. As oito máscaras são vinculadas a cada raster; não há classificação genérica por matiz no runtime. O Fuzil 113 ganha C151 usando 18 PNGs existentes extraídos do checkpoint versionado. Não ativa C151 para a Pistola 114. Nos 48 quadros testados em três aparências, todos os estados de arma, poses e cadência permaneceram idênticos ao vigente; a manga pode ocluir um pixel de antialias na fase 7. O acervo que acrescenta rifle em outras fases e a pistola de 30 ticks permanecem separados.

Verificação: `python tools/build_pages.py`; `node tests/rework-firearm-north-material.cjs`; `node tests/rework-sword-blue-iris.cjs`; `node --test player-rework-male-b155-seven-poses-hd.test.cjs player-rework-firearm-north-recoil-hd.test.cjs`.

A Adaga 12 Norte continua como prova: translação exata da cabeça; máscara candidata de pernas e pescoço, não ativa. Ainda há mecha original fundida no torso da fase 3 e antialias de gola sem certificado para pele escura.
