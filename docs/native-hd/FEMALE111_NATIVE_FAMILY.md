# Família111 feminina nativa candidata

12registros /68frames: idle1 +walk8 +punch8 em cada uma das4direções.
Fontes base: registrosfemale original de rework-base-hd/index.json, intactos. Arma: PNGs111 jáisolados no pipeline masculino, sem alterar bytes, recortar arquivo ou redimensionar. O recorte em draw limita os dois equipamentos dentro do mesmo PNG quando necessário.

## Arquivos para integração

- player-rework-female-equipment-hd.js: registry browser independente `MareReworkFemaleEquipmentHD.create(index)`; resolve/requiredFiles/render. Render devolve pivot físico, density4, framecount/fps e physicalScale1.
- records.json: índice `female-native-equipment-registration-v1`, incorpora contrato integral da base porregistro.228KB, não duplica PNGs.
- build.py: reproduz registro geométrico. Testa nativamente fontes atuais; não executa geração.
- test.cjs:3testes,68frames, baseRecord idêntico aoindex, SHA dearma, cabeça e pixels fora daarma preservados com tolerância1 de arredondamento.
- renders/:12contact sheets e capturasframe0/4. Contact sheets são miniaturas de inspeção; capturas individuais permanecem512/640 nativas.

## Patch de ligação sugerido ao integrador

Adicionar script noHTML/build e carregar índice; instantiate registry junto aosdemais. Em select, após normalizar aparência, tentar registry.resolve com weapon/body/action/direction/appearance/equipment. Resultado recebe hdKind específico. Em prepare/render usar requiredFiles/render deste registry; dimensões permanecem r.pack.frame*density. Não alterar o gate prepareFamily: esta família fornece as12combinações idle/walk/attack4dirs. Não precisa generalizar male→female nos registros existentes.

## Registro e limitações

Ataque usa perspectiva111 do estado correspondente e centros das máscaras de mão autorais femininas. A dimensão de cada PNG é preservada, com translação rígida. Onde antebraço está inteiramente ocluído, não se inventa braço: a própria mão ainda fornece centro. Fonte arma porframe é clipada em2regiões quando há2mãos, sem editar PNG.

WalkS usa bones do próprio pacote. WalkN/E/W usa extremidades inferiores das regiões de braços existentes. WalkE/Wframe6 tem ownership fundida com corpo; as2âncoras foram medidas visualmente na arte original, explicitadas no build. Lateralwalk usa a perspectiva inicial maior emambasmãos para evitar luva quase invisível. Esses são novos registros candidatos; aprovação das fontes não certifica este encaixe.

Inspeção estática realizada emtodos oscontact sheets de ataque e caminhada. CorrigidosS4 (a mão ativa sem antebraço visível ficava semarma), E/W4 (PNGcom equipamentoúnico era cortado indevidamente) ewalkE/W6. Não foi observado playback contínuo ou cenário do jogo. Encaixe/oclusão periférica e variação devolume ainda são calibragem candidata, não certificação artística.

Somente aparência original e nenhumaoutra roupa/equipamento. `original` não é alias de`light/black/blue`. Paletas/cabelos/roupas diferentes recusados; sem fallback para bodybaked111F. Nenhum módulo comum alterado, nenhum commit/push feito.
