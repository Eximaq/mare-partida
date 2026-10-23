# Ícones de itens — PixelLab (20/10/2026)

Os 64 ícones existentes foram substituídos por PNGs transparentes de 32×32: 33 equipamentos, 25 pérolas, três caixas, Livro da Vontade, poção e Ferro Salgado. A espada é a alternativa 45 escolhida pelo proprietário. Não há frutas cadastradas no catálogo atual; futuras Akuma no Mi mantêm seu próprio `icon_path`.

## Integração

- Arquivos públicos em `assets/ui/items-pixellab/`; `manifest.json` relaciona chave, nome, dimensões, hash e origem.
- `game.js:itemIcon` resolve os mesmos índices numéricos e IDs de pérolas usados pelos saves. Inventário, detalhes, drops, forja e recompensas da prisão usam a nova arte. Criação das sete classes e detalhe do Livro também foram atualizados.
- Os SVGs anteriores e as artes antigas de Haki continuam preservados. A escala CSS da interface não foi ampliada. Nenhum atributo, equipamento possuído, drop, preço ou progressão foi alterado.
- Os PNGs têm caminhos novos e chave de versão `20261020`. O build Pages copia os arquivos públicos; nenhum diretório de inspeção ou save é publicado.

## Geração e aprovação

29 ícones finais têm fonte nativa32; 35 foram reduzidos por nearest-neighbor após aprovação explícita. Não afirmar que todos foram gerados nativamente em32. Foram usadas quatro chamadas Pro para os lotes e14 Pixen para os complementos; dois resultados Pixen que mostravam personagens foram rejeitados e substituídos pelas duas correções aprovadas. Não houve pintura/recoloração local.

Consumo observado: **54 gerações na produção**, mais **10,1 na amostra inicial**, total **64,1**. Os valores são consumo, não saldo da conta.

Originais, requisições exatas, resultados rejeitados, manifest de auditoria e blueprint portátil ficam localmente em `pixellab-pip-generations/item-icons-production-20261019/` e na pasta da amostra. Essas inspeções não fazem parte do preview público. O manifest público registra quais fontes tinham32,64 ou128 pixels.

## Validação

- Decodificação dos64 PNGs,32×32, canal alfa, vínculo por chave e cópia byte a byte no build Pages.
- `python tests/item_icons_browser.py`: criação, todos64 ícones no inventário,25 pérolas na forja, caixas da prisão, desktop1366×768 e celular393×852. Compara os dados persistidos após reload sem usar o save real do jogador.
- Todas as suítes `tests/*.test.cjs`, sintaxe dos módulos alterados, `python tools/build_pages.py` e `git diff --check`.

Para o colaborador: a mudança está concentrada nos caminhos de arte em `game.js`, `index.html` e `haki-ui.js`; os catálogos e contratos de gameplay permanecem iguais. Para adicionar um novo item, inclua sua arte e metadados no diretório público sem renumerar o catálogo existente.

## Novas espadas

Quatro PNGs RGBA 128×128 fornecidos pelo proprietário foram copiados sem recoloração ou recorte para `assets/ui/items-pixellab/`. O catálogo aponta cada arma diretamente para seu arquivo; o CSS existente as exibe em `object-fit: contain` com renderização pixelada nos tamanhos do inventário/equipamento.

As definições são acrescentadas ao final do catálogo para preservar índices dos saves. Todas usam o tipo `sword` e a base de 11 ATQ do Sabre de Coral; raridades usam os multiplicadores existentes do sistema Forja. As descrições são exibidas nos tooltips. Não foram criados efeitos de fogo, vento ou Kairouseki sem suporte a efeitos por item.

As armas Épicas e Lendária entram nos drops existentes somente quando a raridade sorteada coincide; isso mantém sua classificação fixa. A Ame no Habakiri é registrada como Suprema, mas continua fora dos drops comuns porque o sistema atual não sorteia essa raridade. Nenhuma fonte ou taxa de obtenção nova foi inventada.
