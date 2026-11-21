# Nono lote local: espadas 0/1/68/69 EAST/WEST

Quatro equipamentos independentes, oito perfis masculinos `attack-sword`, classe canônica `sword`, aparência original (cabelo e olhos castanhos, pele clara), arma isolada. Cada fonte conserva equipamento separado da anatomia, com restauração da mão sob máscara de propriedade original. Não usa subtração de composição para inventar equipamento. WEST conserva o espelho literal aprovado; nenhuma direção própria foi descartada sem prova.

A seleção opt-in `orderedAttack` com `strictSourceIdentity` foi estendida somente a `attack-sword`. O teste falhou com a rota antiga antes dos dados e continuou falhando depois deles: o adaptador genérico de olhos interceptava a aparência castanha. A extensão de uma condição resolve apenas perfis estritos aprovados; firearm, controlador, dano, rede e relógio não foram alterados.

## Geometria e tempo

- 0: 640×640, densidade 4, pivô lógico 80/128.
- 1/68: 768×768, padding 64 ao redor da base 640; pivô 96/144.
- 69: 1024×1024, padding 128 ao redor da fonte 768 já com 64; padding acumulado 192, pivô 128/176. Não se reutilizou cegamente o offset antigo nem se redimensionou arte.

As quatro fontes têm oito poses, 12 fps nominais, contato 4 e sem loop. O sampler visual existente remapeia somente a fase para o impacto real; não promete 12 fps literal em qualquer velocidade. A/B com quatro equipamentos, seis velocidades e 400 passos (9.600 passos) manteve estados, impacto, recarga e desbloqueio idênticos. O harness consome os quadros Canvas, sem mudar produção.

## Evidência local e limites

- 64 referências originais: alfa exato, RGB máximo 1; nenhuma nova exceção.
- O mesmo lobby headless troca 0→1 e 68→69, invalida identidades antigas e desenha EAST/WEST com a fonte certa e fase 4 no contato. Luva extra e retirada da arma seguem fallback sem a nova rota.
- 208 consultas fora da assinatura nova conservam os registros completos do índice anterior: outros corpos/aparências, quatro peitorais, luvas, subconjuntos, direções antigas e 67/70.
- 16 comparações confirmam que a anatomia 69, recortada nas margens de 128 px, coincide com a fonte 1/68 e mantém o mesmo pivô físico no mundo.
- Quatro JSONs de posicionamento permanecem intactos. A fonte original de 0 não implica correção posterior de nuca nem composição com trajes.

A rodada original WorldVisual/A-B passou em 54,6 s, com RSS observado até 3902 MB. Para limitar retenção de Canvas, o gate final separa 0→1 e 68→69 em dois subprocessos seriais, preservando invalidação dentro de cada par, extras/remoção e todos os rasters/fallbacks. O harness exige TAP real e comprovantes dos quatro desenhos, não apenas exit 0. A primeira tentativa herdou `NODE_TEST_CONTEXT` e não executou os filhos; foi descartada e corrigida. A rodada corrigida passou em 55,6 s. Picos observados: 3320 MB e 3735 MB. Isso não garante a disponibilidade de recursos de um runner externo.

`npm test` passou foundation 243 e legacy 253/253 antes desta divisão exclusivamente de harness e da asserção adicional de registro geométrico. O comando focal exato do workflow, já na versão final dos testes, passou 83/83 em 427,3 s. Build Pages e auditorias passaram. A suíte nativa ampla passou 191/191 em 784,7 s, sem testes ignorados/cancelados e com exit 0. O verificador confirmou 291 arquivos, 18.928 PNGs de fonte e 179 PNGs de cabeça; auditoria canônica de 4.679 registros sem divergências. Todos os registros, bindings e dependências anteriores permanecem idênticos; apenas oito perfis e três arquivos foram acrescentados. Pai publicado equivalente: `435e9974adbdb592018534d941637630fa8141fb`.

Não houve navegador/mapa, upload, publicação ou merge neste candidato. Mosquete 5 permanece fora deste lote: sua prova de composição não resolveu o vínculo do relógio. A rejeição de extras indica apenas limite desta fonte, não incompatibilidade geral; os fallbacks anteriores permanecem disponíveis, sem nova certificação de sua fidelidade.

## Reprodução portátil

Os seis ZIPs (três arquivos de componentes e três fixtures) foram reproduzidos byte a byte pelas receitas versionadas, sem fonte remota ou caminho privado no código:

```sh
python tools/rework-weapon-layers-hd/package-ninth-swords1-68.py --source SABRE1_NODACHI68.zip --recipe-source NODACHI69.zip --output OUT168
python tools/rework-weapon-layers-hd/replay-package-ninth-sword0.py --source-dir INPUTS --recipe-zip RECIPE_V10.zip --output OUT0
python tools/rework-weapon-layers-hd/replay-package-ninth-sword69.py --source-zip NODACHI69.zip --output OUT69
```

INPUTS contém `Espada0 NORTH - Base original restaurada - Pacote.zip`, `Nodachi69_EW_FonteAnterior_Intacta_Candidato_Editavel_v2.zip` e `Espadas0_67_70_male_EAST_WEST_QuatroTrajes_Editavel.zip`. A prova versionada conserva hashes das fontes, referências e geometria. A máscara 69 é binária: vermelho 255 se e somente se o alfa da mão original for positivo, para equivaler exatamente ao predicado do compositor existente. Não há alteração de aparência nem arredondamento reparado por pixels de cada traje.

O índice de armas tem 13.758.892 bytes; o payload UTF-8 calculado tem 14.668.657 bytes, abaixo do limite observado de 16 MiB. Não foram divididos nem modificados ZIPs para transporte.
