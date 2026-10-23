# Quatro armas do Gatuno — 23/10/2026

Adaga de Cristal (Épico), Punhal de Netuno (Lendário), Punhal Flamejante (Lendário) e Lâmina das Trevas (Supremo) foram acrescentados ao fim do catálogo, preservando os índices dos saves. Todos usam `type: rogue`, slot de arma e a base existente de 13 ATQ das Lâminas Acrobáticas. Forja, atributos adicionais, níveis, refinamento e multiplicadores de raridade permanecem nos sistemas atuais. As descrições fornecidas aparecem no painel e tooltip. Características temáticas não criam efeitos de combate novos.

Os três ícones estáticos 64×64 e a folha RGBA 256×256 foram copiados dos anexos sem reamostragem ou recoloração. A imagem estática da Lâmina das Trevas é seu primeiro quadro de 64×64. O manifesto `assets/ui/items-pixellab/gatuno-weapons.json` registra nomes e hashes. A ferramenta `tools/import_gatuno_weapons.py PASTA` reproduz a importação.

A Lâmina das Trevas percorre 16 quadros em ordem de leitura, loop de 0,5 s (32 quadros/s), usando a mesma infraestrutura das outras armas animadas tanto na mochila quanto equipada. A preferência por movimento reduzido exibe o primeiro quadro. Os ícones cabem na área útil dos slots, com fundos roxo, dourado e vermelho determinados pelos metadados de raridade.

Itens Épicos e Lendários participam do pool existente quando a raridade sorteada coincide e a classe é Gatuno. A raridade Suprema permanece fora do sorteio comum, conforme a regra atual do jogo; nenhuma fonte de obtenção ou taxa nova foi criada. Cadastrar estes itens não concede cópias ao save do jogador.

Validação: testes dos itens Gatuno, quatro espadas, Forja, slots de raridade e animação existente passaram; sintaxe e build Pages passaram. Chrome isolado 1366×768: quatro descrições, equipar cada arma, animação equipada após reload, retirar e animar na mochila, movimento reduzido e rejeição das quatro armas por Espadachim. Nenhuma exceção de página. As cópias de teste foram inseridas somente em um contexto de navegador isolado. Capturas locais em `gatuno-weapons-equipped-20261023.png` e `gatuno-weapons-bag-20261023.png` na pasta temporária do sistema.
