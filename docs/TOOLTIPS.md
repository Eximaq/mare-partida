# Tooltips de itens e habilidades

O inventário e os atalhos de habilidade usam `game-tooltips.js` e `game-tooltips.css`. O painel segue o ponteiro, respeita as bordas da viewport e aparece também ao focar os botões por teclado. O fundo, borda e cores de raridade reutilizam os tokens da HUD náutica. A comparação em duas colunas usa o item equipado no mesmo slot e mostra diferenças `item em foco − item equipado` nos atributos e no Poder.

`MareForge.itemStats` fornece os atributos reais dos equipamentos. `MareTooltips.filterCleanStats` omite valores numéricos zero; os bônus percentuais das Akuma no Mi são convertidos para apresentação. Os atalhos de classe e Haki usam seus dados atuais; a API Python `/api/akuma/catalog` publica nomes, custos, recargas e descrições das habilidades das frutas. A versão estática usa a descrição local equivalente. Os talentos passivos mostram seu efeito sem inventar custo ou recarga.

Validação: `node tests/game-tooltips.test.cjs`, `node tests/akuma-system.test.cjs` e `python -m unittest discover -s tests -p '*akuma*.py'`. Conferir manualmente Inventário (item equipável com/sem comparação), foco por teclado, tooltip da habilidade de classe e da fruta, além dos limites da tela.
