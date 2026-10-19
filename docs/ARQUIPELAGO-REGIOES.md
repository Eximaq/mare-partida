# Regiões e detalhes do Arquipélago

Atualização de 19/10/2026. A janela continua acessível pelo ícone Mapa, tecla M, botão de expedição e NPC. East Blue abre por padrão; Alabasta está desabilitada, com `data-status="locked"`, nome e aviso visível abaixo do título.

## Catálogo

| Ilha | Nível recomendado | Área do save | Entrada | Disponibilidade |
|---|---|---|---|---|
| Ilha Dawn | 1–10 | `beach` | Nv. 1 | Jogável |
| Cidade das Conchas | 11–20 | `swamp` | Nv. 8 | Jogável |
| Orange Town | 21–30 | — | A definir | Em desenvolvimento |
| Ilha dos Animais Raros | 31–40 | — | A definir | Em desenvolvimento |
| Vilarejo Syrup | 41–50 | — | A definir | Em desenvolvimento |
| Baratie | 51–60 | — | A definir | Em desenvolvimento |
| Parque Arlong | 61–70 | — | A definir | Em desenvolvimento |
| Loguetown | 71–80 | — | A definir | Em desenvolvimento |

Ilha Dawn é o nome atual de Ruínas de Brasas; Cidade das Conchas substitui Fenda da Névoa. As renomeações se aplicam à HUD, origem de novos drops e notificações atuais. Textos históricos no inventário, saves exportados e documentação anterior não são reescritos. O cenário das duas áreas não foi modificado nesta tarefa.

As faixas são recomendações; não alteram os requisitos existentes nem impõem nível máximo. Combate, economia, equipamentos e IDs de persistência permanecem iguais. A viagem reutiliza `worldChange`, inclusive a recuperação de vida/energia já existente.

## Seleção e detalhes

O clique em qualquer ilha abre nome, faixa recomendada, descrição, moldura do chefe, entrada, taxa de sucesso e drops. Não muda a cena nem o save. Apenas o botão **Viajar para esta ilha** realiza o teleporte, quando a área existe e o personagem cumpre seu requisito. As seis ilhas futuras têm detalhes acessíveis e viagem bloqueada, sem redirecionar para outro cenário.

Os previews usam os sprites existentes: Capitão da Caldeira na Ilha Dawn e Guardião da Caldeira na Cidade das Conchas. A folha de oito direções do Capitão é recortada para uma única célula, sem editar o PNG. Não havendo monstro configurado, a moldura mostra uma silhueta com interrogação e **Indisponível**. O mesmo fallback cobre falhas ao carregar a imagem.

Os drops das áreas atuais refletem `killMob`: dobrões/XP, equipamentos compatíveis, Ferro Salgado, poções e pérolas. As futuras mostram **A definir**. Não existe cálculo de sucesso de dungeon no jogo; o painel informa **Não estimada**.

Trocar uma região habilitada limpa a seleção e reconstrói sua lista. Alabasta não recebe cliques nem libera conteúdo. Clicar novamente em East Blue ou reabrir a janela limpa os detalhes anteriores. No desktop a lista e os detalhes ficam lado a lado; no celular os detalhes substituem a lista, com **Voltar às ilhas**. Foco, teclado, Escape, água animada e preferência de movimento reduzido são mantidos.

## Extensão e publicação

`archipelago.js` é o catálogo local, sem backend: regiões, oito ilhas, faixas, área real, requisito, descrição, drops e preview. Não há banco remoto. Para liberar uma ilha futura, primeiro implementar e testar seu mapa no mundo, configurar sua chave em `zones`, seu requisito e encontros, e só então atribuir a área real no catálogo. Para liberar uma região, adicionar seus destinos e retirar `locked`; o renderizador filtra por região e limpa a seleção.

`game.js` integra a seleção e a viagem; `ui-nautical.css` define a apresentação; `index.html` carrega o catálogo antes do jogo. `tools/dev_server.py` observa o catálogo e `tools/build_pages.py` o inclui com hash de cache. O build usa caminhos relativos. Nenhuma arte foi gerada ou modificada e não houve consumo pago.

## Validação

- `node tests/archipelago.test.cjs`: ordem/faixas, IDs únicos, regiões, chaves antigas dos saves, requisitos, futuros bloqueados e fontes das imagens.
- Todos os demais `tests/*.test.cjs`: regressões de atributos, mundo, navegação, câmera, forja e animações.
- `python tests/voyage_browser.py`: nove grupos em Chromium isolado, cinco resoluções de 320×568 a 1920×1080, oito destinos, previews e fallback 404, cliques sem viagem, requisitos, viagens reais, persistência, teclado/foco e água em relógio real/reduzido.
- `python tests/ember_browser.py`: oito grupos de viagens, câmera, vinte derrotas, retorno e save.
- `python tests/island_browser.py`: doze grupos de HUD, serviços, movimentação, contratos, save e costa.
- `python tests/polish_feedback_browser.py`: inventário e atributos nas três resoluções desktop.
- `python tests/pages_cache_browser.py`: pacote Pages mobile com 16 recursos versionados, nenhum script antigo sem hash e save preservado.

Capturas e resultados locais ficam em `docs/evidence-arquipelago/`, fora do Git. Os testes não acessam o save do usuário. Branch `feature/arquipelago-regioes-detalhes`, base `ab6bb23`. Rollback por reversão do commit, sem migração de save.

Todos os comandos acima e a validação de sintaxe dos scripts JS passaram nesta entrega. Os outros scripts de personagens/combate/fusão foram adaptados ao novo fluxo, sem execução integral nesta tarefa.
