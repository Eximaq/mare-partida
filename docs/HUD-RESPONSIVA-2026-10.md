# Revisão da HUD náutica — outubro de 2026

O trabalho mantém madeira, bronze, pergaminho e interiores verde-marinho.
Não produz arte nova nem altera combate, equipamento, catálogo ou saves.

## Auditoria e correções

| Etapa | Tela e estado observado | Resultado |
|---|---|---|
| 1 | HUD, menus de personagem/modos/Central, chat e expedição | Mantida a disposição nas bordas e os ícones compactos. A preferência “Compacta” aumentava botões mobile de 32 para 52 px; agora mantém 32 px no celular e reduz para 36 px no desktop. Alvo respeita o espaço real entre perfil/menu em paisagem; XP/h acompanha a altura real da expedição e usa resumo em telas baixas. |
| 2 | Inventário, equipamento e mochila | Corrigida regra de três colunas de desktop aplicada após os breakpoints. Antes: conteúdo de 1.053 px dentro de 358 px; depois: 358/358. Tablet usa duas colunas e personagem em largura inteira; celular usa uma coluna. |
| 3 | Navegação do inventário | Atalhos mobile fixos para Equipamentos, Mochila e Detalhes; seções focáveis e margem de rolagem para não ficarem sob o cabeçalho. Pesquisa em linha inteira, dois filtros abaixo e categorias em madeira. Paginação e sete linhas existentes preservadas. |
| 4 | Personagem, talentos, conquistas e Haki | Botões de fechar maiores, cabeçalhos e campos legíveis; indicador de PT sem quebrar o número. A árvore continua com pan/zoom e sprites aprovados; roxo continua identificando o recurso de Haki. |
| 5 | Arquipélago e Impel Down | Cartões mobile com navio acima do texto, evitando títulos comprimidos numa coluna estreita. A prisão conserva sua navegação e regras. |
| 6 | Compêndio, hierarquia, contratos e ajuda | Conferência de enquadramento, rolagem e fechamento; recebem os controles compartilhados. |
| 7 | Jornal, Meu Perfil e Configurações | Cabeçalhos, destaque do perfil e ícones de ajustes agora usam madeira/bronze; controles de preferências recebem nomes acessíveis em português. |
| 8 | Aparência | Conferido o aviso de revisão no DEV sem pacote experimental. A atualização não libera peças nem altera flags do Paper Doll. |

## Validação

- Falha horizontal reproduzida no navegador antes da correção. Depois, 48
  combinações de 12 janelas em 320×568, 768×900, 844×390 e 1366×768
  sem overflow horizontal ou fechamento fora da viewport.
- Revisão visual adicional em 390×844, incluindo os atalhos de inventário,
  Haki desbloqueado no save DEV, Jornal, Perfil e Configurações.
- `node tests/player-hub.test.cjs`: teste do nome acessível da preferência
  observado falhando antes da implementação e passando depois.
- `tests/hud_responsive_browser.py`: regressão em sete viewports e 16 janelas,
  saltos de seção, tamanho da HUD compacta, colisões entre alvo/menu/XP/expedição
  no combate e preservação do progresso.
  Executada pelo workflow de inventário; consultar o resultado do CI do PR.
- `tests/inventory-layout-browser.py` continua verificando slots, raridades,
  equipamento e paginação com 119 itens; não foi enfraquecido.
- Build: `python tools/build_pages.py`; sintaxe e `git diff --check`.

Capturas de exploração ficam locais, fora do Git. O CI publica suas capturas
no artefato `inventario-layout-capturas`, com retenção limitada. O enquadramento
não equivale a uma certificação de acessibilidade: leitores de tela reais,
teclado virtual de iOS/Android e aparelhos físicos não foram ensaiados.

## Manutenção

Correção de acesso ao Personagem: o próprio ícone abre/fecha a lista de seções,
inclusive com pendências. A seta adicional foi removida. Os badges continuam
no ícone e nas seções; não redirecionam automaticamente para uma janela.
Tecla P, setas, Escape e retorno do foco usam o mesmo acionador.

- Respeitar os breakpoints de 1180 e 760 px; colunas com mínimos de desktop
  devem existir apenas na media query correspondente.
- Reusar `--rpg-planks`, `--rpg-brass`, `--rpg-paper` e `--rpg-text`.
- Preferências de interface continuam separadas do progresso do jogo.
- Usar o build para validar: ele versiona URLs de CSS/JS e evita a folha
  antiga que o cache do servidor estático local pode manter.
