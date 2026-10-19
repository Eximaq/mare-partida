> Histórico da entrega anterior. **Regras e testes atuais:** [Refatoração da Forja](FORJA-REFATORACAO.md). O teto +5 e as antigas chances descritas abaixo foram substituídos conforme a nova especificação.

# Forja 2.0 — implementação e validação

Atualização no projeto corrente V12, com Aprimorar, Imbuir, Fusão e Reforja reais. Nenhuma geração paga, troca de sprite, região nova ou alteração de mapa/câmera. Os ajustes de HUD/polimento que já estavam em andamento foram conservados; não foram reinseridas as seções removidas do menu Personagem.

## Modelo e transações

`forge-system.js` contém catálogo, raridades, custos, geração de extras, agregação de equipamento, migração e operações. `forge-ui.js` apenas apresenta os dados e as prévias. O modelo recebe estado, comando, revisão esperada, RNG e relógio; devolve uma nova cópia do estado somente se a operação for válida. Nenhuma interface calcula um segundo bônus para o combate.

Comandos: `upgrade`, `imbue`, `remove`, `fuse`, `reforge`. Cada comando valida recursos, alvo e inventário antes da mudança. Operações confirmadas incrementam `forgeSeq`; uma revisão antiga é rejeitada. Pagamentos ocorrem na cópia transacional antes do RNG da operação. Exceção do RNG descarta a cópia inteira. IDs de novas pérolas são únicos no conjunto mochila/equipamentos. Esta organização pode ser usada por um futuro servidor, mas o jogo continua local; não existe autoridade remota fictícia.

## Aprimorar

Regras mantidas: máximo +5, dobrões `50 × (refinamento+1)²`, ferro `2 + refinamento×2`. Chances: +0→+1 e +1→+2 em100%; +2→+3 em80%; +3→+4 em65%; +4→+5 em50%. Falha consome recursos e não destrói nem reduz o item.

Custos aparecem como Necessário / Disponível e saldo previsto. Resultado fica em área reservada dentro da janela: verde em sucesso, vermelho em falha. Não há tabela separada de materiais disponíveis nem toast de aprimoramento sobre os controles. Botões sem recursos ou no limite ficam indisponíveis. Após uma operação, o resultado é trazido ao início do conteúdo e os valores são atualizados.

## Raridades

| Raridade | Cor | Extras | Sockets | Base × | Drop normal |
|---|---|---:|---:|---:|---:|
| Comum | Cinza |1|0|1.0|50%|
| Incomum | Verde |2|1|1.3|22,5%|
| Raro | Azul |3|2|1.7|15%|
| Épico | Roxo |4|3|2.4|12%|
| Lendário | Amarelo |5|4|4.0|0,5%|
| Supremo | Vermelho |6|5|6.0|0%|

RNG inteiro uniforme1..1000:1–5 lendário;6–125 épico;126–275 raro;276–500 incomum;501–1000 comum. A roleta roda depois de decidido o drop de equipamento. A chance anterior de equipamento continua16% para inimigos comuns e95% para chefes. Materiais36% e poção9,5% permanecem em seus testes independentes. Supremo não recebeu receita, loja ou drop.

Raridade é propriedade da instância do equipamento; o índice `def` antigo permanece estável. Status base são guardados em `baseStats`. Para cada status ATQ/DEF/VIDA:

`round((base × multiplicadorRaridade + refinamento × coeficienteAntigo) × escalaNivel) + extrasDiretos`

Coeficientes preservados: ATQ3, DEF2, VIDA10 por refinamento; escala de nível `1 + min(20, nível−1) × 0.09`. O multiplicador de raridade não é reaplicado a extras, refinamento nem percentuais de pérolas. Extras de atributo primário entram na camada do personagem; vida/energia/crítico diretos entram uma única vez nos derivados.

## Imbuir e percentuais

Instalação consome uma pérola desbloqueada da mochila e exige socket livre. Não cobra dobrões. Pérola instalada só concede bônus se o equipamento estiver em uso. Equipamentos na mochila não afetam os atributos. A prévia informa quando está simulando equipar o item selecionado.

`atributoFinal = (baseClasse + investimentos + extrasPrimáriosEquipados) × (1 + somaPercentuaisEquipados)`

Não há outro bônus primário de facção no modelo atual; os multiplicadores derivados da facção permanecem na mesma etapa das fórmulas anteriores. Percentuais são somados para cada atributo entre todos os equipamentos, sem multiplicação sucessiva. Exemplo testado:100FOR com2%,6% e10% =118FOR. Totais primários são arredondados a seis casas apenas para eliminar ruído de ponto flutuante; os derivados mantêm seus arredondamentos e limites existentes.

Remoção devolve a pérola à mochila e custa:

`ceil((20 + nivelItem × 4) × multiplicadorRaridade × (1 + nivelPerola × 0.75))`

Exige saldo e um espaço livre antes do pagamento. Socket ocupado não pode ser sobrescrito. A mochila continua com120 objetos; as pérolas são objetos individuais, sem uma capacidade paralela oculta. Bloqueio da pérola impede instalação/fusão.

### Catálogo real

[Catálogo JSON canônico das25 combinações](balance-data/pearl-catalog.json). Atributos: FOR/strength, DES/dexterity, VIT/vitality, INT/intelligence, ESP/spirit.

| Nível | Bônus | Multiplicador | IDs (um por atributo) |
|---|---:|---:|---|
|1|+2%|1.02|`pearl_for_1`, `pearl_des_1`, `pearl_vit_1`, `pearl_int_1`, `pearl_esp_1`|
|2|+4%|1.04|`pearl_for_2`, `pearl_des_2`, `pearl_vit_2`, `pearl_int_2`, `pearl_esp_2`|
|3|+6%|1.06|`pearl_for_3`, `pearl_des_3`, `pearl_vit_3`, `pearl_int_3`, `pearl_esp_3`|
|4|+8%|1.08|`pearl_for_4`, `pearl_des_4`, `pearl_vit_4`, `pearl_int_4`, `pearl_esp_4`|
|5|+10%|1.10|`pearl_for_5`, `pearl_des_5`, `pearl_vit_5`, `pearl_int_5`, `pearl_esp_5`|

Cada registro JSON contém ID, nome completo, atributo, nível, percentual, multiplicador e raridade visual. Os25 SVGs em `assets/ui/pearls/` usam cinco paletas e marcas de nível1–5, em grade32px; são arte geométrica original escrita no projeto. Ícones já aprovados não foram substituídos.

Para a função estar disponível na progressão real, pérolas Nv.1 têm um teste de drop adicional independente de5% por inimigo, dividido uniformemente entre os cinco atributos. Não substitui nem reduz os testes anteriores de equipamento/material/poção e respeita a mochila cheia. Níveis superiores são obtidos por fusão, não por um drop oculto ou compra gratuita.

## Fusão e economia

São consumidas cinco pérolas do mesmo atributo e nível, mais os dobrões. Sucesso entrega uma do nível seguinte; falha entrega zero. Nv.5 não pode ser fundido. Entradas bloqueadas não contam.

| Operação | Chance | Dob. por tentativa | Dob. totais esperados* | Pérolas Nv.1 esperadas* |
|---|---:|---:|---:|---:|
| Nv1→Nv2 |80%|40|50|6,25|
| Nv2→Nv3 |50%|160|820|62,5|
| Nv3→Nv4 |10%|650|47.500|3.125|
| Nv4→Nv5 |5%|2.500|4.800.000|312.500|

*Por pérola final daquele nível, começando em Nv.1 sem preço de aquisição. Recorrência exata: `C(n+1)=(5×C(n)+custoTentativa)/chance`; a quantidade de Nv.1 usa `N(n+1)=5×N(n)/chance`. Falhas de etapas anteriores estão incluídas.

Simulação Monte Carlo reproduzível de 2.000 jornadas completas até Nv.5: média4.884.105dobrões e317.997pérolas Nv.1; mediana3.344.200dobrões, P90 de 11.389.730 e P95 de 14.677.490. A média exata é4,8milhões, não uma garantia individual. Dados em [forge-economy.json](balance-data/forge-economy.json); reproduzir com `node tools/forge_economy.cjs`.

Impacto: as chances prescritas tornam Nv.5 extremamente raro. Para um atributo escolhido, o teste de aquisição de Nv.1 é1% por inimigo;312.500pérolas desse atributo correspondem a31,25milhões de derrotas esperadas sem comércio/eventos. Isso é um gargalo de aquisição muito maior que o custo direto de fusão. As chances solicitadas foram preservadas; não foi aplicado pity, receita alternativa, Supremo ou redução silenciosa de custos. Uma revisão futura da cadência de aquisição dependerá de decisão de design.

## Reforja

Troca todos os extras ao mesmo tempo. Preserva ID, `def`/tipo, nível, raridade, `baseStats`, refinamento, sockets, pérolas, bloqueio, origem e campos personalizados. A confirmação mostra o preço e pode ser cancelada sem sorteio ou pagamento. A interface apresenta extras anteriores e novos após confirmar.

Para primários: `fator=sqrt(multRaridade)`; `min=ceil((0.8+nível×0.14)×fator)`; `max=ceil((2+nível×0.30)×fator)`. Inteiro inclusivo. Vida usa o valor primário sorteado×8; energia×4; crítico×0.0015, limitado a0.04 por extra. O crítico final do personagem continua limitado a50%, velocidade3 e esquiva35%.

Seleção sem repetição. Armas físicas evitam INT; armas de magia/suporte evitam FOR. Armaduras podem beneficiar qualquer classe. O pool de primários, vida, energia e crítico suporta os seis extras do Supremo.

Custos propostos após inspecionar os ganhos atuais (equipamento inicial, drops e contratos):

`dobrões=ceil((30+nívelItem×12)×multRaridade×(1+quantidadeExtras×0.35))`

`ferro=ceil((1+nívelItem/8)×sqrt(multRaridade)+quantidadeExtras)`

Exemplos: comumNv1 custa57dobrões/3ferros; épicoNv10 custa864/8; supremoNv30 custa7.254/18. O comum inicial é próximo do preço de aprimorar+0, enquanto itens de raridade/nível altos exigem mais caçadas e contratos. [Tabela completa por nível/raridade](balance-data/forge-economy.json). Não foram alterados ganhos de ouro, preços de venda ou recompensas para compensar artificialmente os custos.

## Saves e compatibilidade

Checkpoint imediatamente anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-forge2-20261018-202127`.

Schema `forgeVersion:2`, revisão `forgeSeq`, metadados por item: `rarity`, `baseStats`, `extras`, `sockets`, `forgeVersion`. Campos antigos e IDs são preservados;25 definições de pérola foram anexadas após os33 equipamentos, sem mudar seus índices. Itens antigos recebem sua raridade anterior, base original, sockets vazios correspondentes e extras determinísticos por hash de ID/definição/nível/raridade. Recarregar nunca rola extras novamente. Itens já migrados conservam extras e sockets, inclusive dados preservados além do tamanho atual.

Antes da primeira migração, JSON original em `mare-partida-save-v1-before-forge-v2`, sem sobrescrever cópia anterior. Importação conserva também as cópias anteriores e de origem existentes. Ouro, XP, investimentos, nível, inventário, contratos e refinamentos não são reiniciados. Os derivados dos equipamentos antigos passam a refletir os multiplicadores e extras da nova versão; a tabela base de classe permanece em50. HP/energia são limitados aos máximos válidos como antes.

## Testes, arquivos e limites

- `node tests/forge-system.test.cjs`:11 grupos;25 pérolas,1.000 rolls,6 raridades,4 fusões,7 classes, custos, sockets, soma118, migração e operações obsoletas.
- `tests/forge_browser.py`:quatro abas e operações reais em 1920×1080,1366×768,1280×720; sucesso/falha, remoção252dobrões, confirmação/cancelamento de reforja, inventário e recarga;5 grupos. [Resultados](evidence-forge2/results.json).
- Regressões de atributos, mundo/ilha, estados e sprites; e testes de navegador das sete classes, cura, HUD,20 derrotas, contrato, retorno/recarga em pastas de evidências próprias.
- Capturas reais da forja em `evidence-forge2/`; capturas do polimento antes/depois em `evidence-polish/`. Nenhum save do usuário é usado pelos testes.

Fontes novas: `forge-system.js`, `forge-ui.js`,25 SVGs/manifesto, testes de modelo/navegador e simulador econômico. Alterados: `game.js`, `character-system.js`, `index.html`, `ui-nautical.css`, observação do servidor de prévia, testes de regressão, README e changelog. Mapas, câmera, sprites e ícones anteriores permanecem intactos.

Mercado e cofre continuam desativados; Supremo não é obtível pelo drop normal. Não há servidor/multiplayer nem geração paga. Este estágio implementa as operações locais e prepara a separação do modelo; não reivindica segurança de economia online.
