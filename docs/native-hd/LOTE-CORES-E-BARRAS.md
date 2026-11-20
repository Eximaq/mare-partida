# Novas cores e barras, lote do PR #348

Base: `8127c1f`. O lote não muda o PR #349 da publicação isolada das espadas.

- **Seis espadas femininas (0/1/67/68/69/70), com C151:** mantêm as dez cores de cabelo e cinco cores de olhos do formato Original, nos oito tons de pele e no mesmo corte curto rente. Prova: 9.600 escolhas da Bota 9 e 144 quadros amostrados, contando todas as fases da Espada 0 nos dois perfis de contraste. Tirar a bota mudou apenas o alfa da bota; corpo e arma continuaram os mesmos. Olho azul e outros cortes/formatos ainda não foram incluídos: a fonte de íris original não contém azul e precisa de uma aplicação explícita sobre a camada certa.
- **Soco masculino Sul, Luvas 26/159:** além do azul, mantém olhos castanho, verde, cinza, âmbar e violeta nas nove botas estáticas, em 90 novos casos de cor. Prova de 96 quadros comparados: somente os mesmos 45 pixels da íris mudaram. Sem atualizar Bota 9, descalço, Luva 25 ou tabelas Norte/Leste/Oeste por extrapolação.
- **Calça 168 feminina, Botas 9/176, caminhada Sul:** acrescenta os peitorais 6/7/130/137/144/158/165/172/179, com ou sem Luva 152. Passaram 36 arranjos em dois tons ao longo dos 40 quadros de cada um. B155 histórica ficou intacta. Retirar a bota não moveu sola nem alterou tecido, pele ou outras peças fora do alfa correspondente. P147/P182 não foram promovidas.
- **Roteiro de continuidade:** o inventário de origem passou a separar 92 equipamentos corporais e a trilha das dez capas. A [matriz reproduzível](PLANO-COBERTURA-EQUIPAMENTOS.md) prioriza o que falta por ação/direção, sem confundir fonte encontrada com prova de encaixe.

Pendências materiais: continuam as máscaras explícitas de pele/roupa das Adagas; o acervo encaixado não contém a anatomia oculta separada. No W113 Norte, o Peitoral 151 encaixou sem mudar pose/arma, mas o recorte personalizado ainda precisa preservar o tom em pernas e pescoço, que dividem o raster com a regata. Essas propostas permanecem no staging de prova, sem habilitar combinações inseguras.

Testes dirigidos: `node --test player-rework-south-punch-hd.test.cjs player-rework-female-south-hem-coated-hd.test.cjs`; após gerar o build, `node tests/rework-sword-family-colors.cjs`.
