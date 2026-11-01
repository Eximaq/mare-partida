# Forja HD — quatro telas integradas

Sprint de 31/10/2026. Escopo confirmado pelo proprietário: integrar as quatro referências na Forja existente, preservando as mecânicas. Implementação em `feature/forge-hd-rebranding`; aprovação visual e merge são etapas separadas.

## Interface

Aprimorar, Imbuir, Fusão e Reforja compartilham madeira escura, moldura dourada, superfícies azul-marinho, títulos dinâmicos legíveis e a identificação KAIZOKU IDLE. A ilustração aprovada de Kozaburo aparece à direita, sem receber cliques ou cobrir os controles. É um recorte exato da referência, exibido com proporção preservada; a interface não usa uma captura inteira como fundo.

A busca, os filtros, a seleção, o modo lista e a paginação continuam usando o estado existente. Equipados e mochila continuam separados. A Forja passa a usar o mesmo catálogo HD do inventário (`MareItemArt`); os sprites vestíveis e as animações de combate não mudaram.

- Aprimorar: peça real, transição de refinamento, materiais e saldos, prévia, chance, risco, crescimento e histórico.
- Imbuir: sockets reais, pérolas desbloqueadas, seleção, remoção e instalação. A prévia detalhada dos atributos e Poder pode ser expandida para manter a ação de instalação acessível.
- Fusão: equipamentos e pérolas usam a mesma composição de cinco materiais, seta, resultado e ação. Arrastar, selecionar automaticamente, limpar e retirar materiais preservam os handlers existentes.
- Reforja: atributo individual ou todos, custo crescente, extras reais e comparação do resultado.

Painéis e grades usam rolagem interna quando o conteúdo excede a altura disponível. Em telas estreitas, a ilustração é ocultada e as operações continuam acessíveis por rolagem. Não há encolhimento artificial da arte nem texto de valores fictícios gravado em imagens.

## Regras preservadas

`forge-system.js` não foi alterado. Nenhuma fórmula, chance, drop, preço, atributo, limite, receita ou schema de save foi modificado. Continuam válidos: +20, garantia até +5, confirmação antes de consumo, cancelamento sem cobrança, proteção de itens bloqueados, sockets ocupados, mochila cheia, percentuais de pérolas de 2/4/6/8/10%, falhas de fusão, proteção de replay e bloqueio de Supremo.

Os valores e ícones demonstrativos das referências não substituem os dados canônicos. Os atributos zerados continuam visíveis no resumo da peça para permitir a comparação.

## Arte e origem

Manifest: [assets/ui/forge-hd/manifest.json](../assets/ui/forge-hd/manifest.json).

- PixelLab AI Pro: atlas nativo 256×256, quatro ícones de operação. Job `a532b8bd-3225-4e51-ba5a-88f5050e49da`, galeria `b7605420-dc86-5013-b978-ef518dff1d96`.
- Custo confirmado: **10 gerações**. Saldo observado: 171,68 → 161,68; créditos USD: 0.
- Ícones exportados por recorte exato com transparência preservada; atlas original, prompt, hashes e dimensões registrados.
- Kozaburo/oficina: referência fornecida e aprovada pelo proprietário, recorte [1084,94,1448,1086], 364×992, sem redesenho, reamostragem ou textos/controles incorporados.
- Madeira, moldura, botões, pergaminho, tipografia, ícones auxiliares, moeda Berry e itens HD reutilizam os recursos existentes e seus manifests.
- Teste de pixels confirmou que os cinco recortes correspondem exatamente aos arquivos de origem.

## Validação executada

- `node --test tests/forge-system.test.cjs tests/inventory-components.test.cjs tests/inventory-layout.test.cjs tests/inventory-comparison.test.cjs tests/ui-system.test.cjs tests/ui-foundation-contract.test.cjs`: **8 testes/suítes, sem falhas**; o modelo da Forja contém 16 grupos de cenários.
- `tests/forge_browser.py` com Chrome real: 1920×1080, 1366×768 e 1280×720. Aprimorar, cancelar/confirmar, instalar/remover, reforjar linha/todos, fundir equipamentos/pérolas, sucesso/falha, custos exatos, bloqueios, +20 e persistência após reload passaram.
- `tests/forge-hd-browser.cjs`: quatro abas em nove resoluções, 1920×1080 até 360×740; fontes/imagens carregadas, somente itens HD, ações alcançáveis, sem overflow horizontal. Valida também cinco slots de pérolas, navegação sem consumo, isolamento da arte, nome longo, item comum sem sockets, inventário vazio e restauração da marca ao abrir outra janela.
- Mesmo teste visual executado na versão estática `dist/`.
- `python tools/build_pages.py`: concluído, recursos com caminhos relativos.

Para repetir os testes de navegador, disponibilize o projeto por HTTP e configure `MARE_TEST_URL`; `CHROME_PATH` permite usar Chrome instalado. Playwright deve estar disponível no ambiente Node/Python. `MARE_FORGE_EVIDENCE` pode apontar para um diretório temporário; as evidências não são versionadas.

Prévias reais: Aprimorar, Imbuir, Fusão de equipamentos, Reforja e Fusão de pérolas. Capturas e fixtures permaneceram fora do Git. Não houve merge automático. A semelhança artística final depende da avaliação do proprietário; a interface usa dados reais e adapta a organização à resolução.
