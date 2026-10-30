# Sprites atuais: fonte única do personagem jogável

Sprint de 30/10/2026, branch `fix/current-player-sprite-ownership`, base `f095720` (PR157 integrado).
Esta política substitui as permissões históricas de fallback84, opt-out e ensaio temporário que alterava o jogador no mundo.

## Fluxo vigente

Estado salvo ou rascunho explícito → relógio lógico existente → ação/direção → resolução atual → composição → desenho.

- Humanos: uma instância de `MarePaperDoll96Lobby`, usando `tools/paper-doll-96-v3`. Criação, editor, retrato, inventário, lobby e caça consultam esse mesmo compositor. `character-appearance.js` centraliza os cosméticos; equipamento e ocultação do capacete continuam separados dos atributos.
- Transformações: o adaptador já existente `MareSpriteCombatV2` resolve as oito formas atuais; os módulos de fruta conservam regras, relógios, efeitos e escalas. Não há renderizador visual substituto quando falta uma forma/ação atual.
- O controlador de combate conserva metadados lógicos de classe/facção, sem carregar suas imagens antigas (`loadVisuals:false`). Isso evita alterar dano, recarga e hit-frame por uma correção de arte.
- `?paperDoll96=0`, `?paperDoll96=1` e flags antigas de review não escolhem outro modelo nem sobrescrevem cosméticos salvos. DEV usa os mesmos sprites atuais e seu save separado.
- APIs de rascunho do ensaio continuam disponíveis para ferramentas isoladas, mas não substituem a aparência salva no mundo. O editor vigente só salva mediante confirmação.

## Causas comprovadas e correções

| Caminho confirmado | Correção |
|---|---|
| Inicialização criava runtime modular antigo e review84 além do native96 | Removidos construtores e imports antigos das duas entradas do jogo |
| Native96 sem quadro disponível caía em review84, catálogo modular, class84 ou faction56 | Removida cadeia de substituição em mundo, retrato, inventário e editor |
| DEV/opt-out reativavam os modelos anteriores | Native96 é obrigatório para o humano jogável |
| Consulta ao registro lógico de combate solicitava imagens class84 | Resolução lógica sem preload/desenho visual |
| Consulta de timing Tori/Uma/Inu dependia de imagens antigas quando faltava metadado atual | Timing autoral preservado como metadado puro (9 quadros,12fps,contato4), sem carregar pixels |
| Preload de frutas atuais chamava também preload de seus corpos antigos | Adaptadores solicitam apenas efeitos legítimos no módulo anterior |
| Transformação com ataque ainda carregando podia desenhar Idle; metadado ausente reativava corpo antigo | Retorno transparente, diagnóstico e nenhuma chamada ao desenho/status antigo |
| Roupa sem mapeamento atual restaurava roupa padrão | Camada sem substituta, diagnóstico do item e aviso visível; bônus preservados |
| Versões de cache não abrangiam mudanças nos módulos/arte/cosméticos | Fingerprint da release native96 e do pacote atual de transformações |

Não foi comprovado um service worker ativo ou uma sobrescrita de registro por NPC como origem destes conflitos. Não foram alteradas animações, PNGs ou o estilo artístico.

## Recursos e falhas

`player-pack.json` é a liberação já aprovada pelo proprietário, agora com `renderer:native96`, revisão de conteúdo e lista de 978 PNGs com dimensões. Não é um segundo catálogo de escolhas: deriva dos manifests atuais. `tools/player96_release.py` lê os recursos e gera/valida essa integridade; não desenha imagens.

Ao mudar compositor, cosméticos, metadados ou arte atual, executar:

`python tools/player96_release.py --write` → `python tools/player96_release.py --check` → `python tools/build_pages.py`.

O build valida antes de reconstruir `dist`. Preserva caminhos relativos. Scripts, JSONs e imagens atuais usam a revisão correspondente; a release é revalidada sem desativar globalmente o cache. O fingerprint normaliza apenas quebras de linha dos textos para ser estável entre Windows e Linux; os bytes das imagens permanecem exatos. Imagens em memória têm limite de48, composições de mundo2, prévias8 e até6 decodificações simultâneas.

Durante carregamento, o corpo correto fica temporariamente transparente; controles e simulação continuam. Ausência, erro HTTP, PNG de dimensões inválidas, caminho fora da lista ou equipamento sem mapeamento geram diagnóstico limitado com recurso, componente, caminho resolvido, ação e direção. O aviso informa a falha; recarregar permite tentar novamente. Não há loop de rede nem substituição antiga. Respostas atrasadas não publicam mensagens ou aparência sobre a seleção mais recente.

Aliases autorais existentes (por exemplo, direção espelhada e reação humana representada pela pose atual de repouso) são preservados. Isso não autoriza buscar outra geração quando um arquivo falha.

## Sistemas preservados e desativados

Desativados **no personagem jogável**: `MarePaperDollCatalog`, `MarePaperDollReview`, editor antigo e fallbacks para class84/faction56. Seus scripts não são importados por `index.html`/`ui-preview.html`. Campos antigos de diagnóstico mostram `retired` para consumidores históricos, sem criar instâncias.

Preservados: arquivos e bancadas históricas, NPCs de demonstração, inimigos, cenários, efeitos de fruta e metadados de combate. `MareFactionSprites` ainda desenha NPCs legítimos; não é o renderizador do jogador. Os módulos antigos de fruta mantêm preload de atores como padrão para consumidores isolados; os adaptadores atuais passam `actors:false`.

## Validação e prevenção

- `tests/current-player-sprites.test.cjs`: propriedade exclusiva, metadados sem imagens antigas, preload só dos efeitos legítimos, ataque pendente transparente, metadado/clip ausente, dimensão incompatível, caminho antigo e roupas sem substituição.
- `tests/current-player-release.test.cjs`: release, IDs duplicados, dependências, caminhos e strip84 impostor.
- `tests/player_sprite_ownership_browser.cjs`: atraso real, controles durante carga, quatro flags antigas, personalização salva, PNG404/corrompido, tentativa limitada, recuperação e promessa atrasada. Requisições de corpos antigos: zero.
- `tests/paper_doll_96_lobby_browser.cjs`: comparação pixel a pixel com a bancada atual, M/F, quatro direções, duas roupas equipadas, todos os ataques,28 perfis, movimento real, rascunhos, save e oito viewports.
- Demais resultados executados estão no changelog desta sprint.

O workflow `paper-doll-96-lobby.yml` valida os contratos e a propriedade exclusiva; `paper-doll-visual.yml` conserva as bancadas históricas isoladas. Os E2Es antigos que exigiam um corpo84 no jogo raiz foram retirados do job de produção, sem apagar seus arquivos: paper_doll_browser/world_review/east_fit_combat/dev/look/unarmed/gunner/rogue/complete/melee/player/diagnostics, universal_character e class_combat_v2. A cobertura atual usa as suítes native96, armas, aparência, capacetes e SpriteCombatV2. Para retomar um ensaio84, usar bancada isolada, nunca reativar fallback no jogador.

## Compatibilidade e limites

Saves, inventário e atributos não são migrados destrutivamente. Saves sem `appearance96` recebem os mesmos defaults compatíveis e preservam a indicação antiga de cabelo raspado. Rascunhos não persistem antes de confirmar. Itens futuros sem arte atual precisam receber mapeamento válido: são diagnosticados e não ganham equipamento fictício. Esta sprint não produz essa arte.

Rollback: reverter o commit desta sprint por PR; não fazer reset de save nem force-push. Isso restaura a política anterior e, portanto, também seus fallbacks conhecidos. Não declarar ausência absoluta de defeitos artísticos: o escopo é eliminar a mistura entre gerações e validar as animações existentes.
