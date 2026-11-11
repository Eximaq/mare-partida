# Zoro — Visual Completo

Item cosmético exclusivo de Espadachim (classId: sword), acrescentado ao índice 187 do catálogo existente. Usa a mochila e os comandos items.equip/items.unequip existentes. O slot visual_completo aparece na aba Visual, abaixo do personagem. Sem raridade, preço, bônus, distribuição automática ou habilidades concedidas.

## Testar sem tocar personagens reais

1. Execute `python tools/build_pages.py` e sirva `dist` por HTTP.
2. Abra `/?dev=1`; o Laboratório usa o save de teste existente.
3. Crie um Espadachim e gere **Zoro — Visual Completo** pelo seletor de itens do Laboratório. O controle genérico de raridade não atribui raridade ao cosmético.
4. Abra Inventário → Visual, selecione o item na mochila e equipe. Para retirar, selecione o slot abaixo do personagem.
5. Teste caminhada, ataque e as habilidades existentes Corte de Maré e Arco do Horizonte. Conjurações compatíveis usam a palma. Retire, reequipe, troque de mapa e recarregue.

Online, somente uma instância já possuída e validada pelo servidor pode ser equipada. A obtenção definitiva continua sem definição: não foi acrescentado a lojas, recompensas ou loot.

## Contratos e assets

- `visual-completo.js`: definição e transições locais, com validação de classe.
- `visual-completo-renderer.js`: apresentação pelos relógios existentes; fallback nativo em falhas de assets e transformações.
- `assets/skins/visual-completo/zoro/atlas.json`: 104 quadros, retângulos reais, âncoras dos pés, escala única por sequência e polígonos nas lacunas transparentes onde efeitos/espadas atravessam colunas nominais.
- `sources/`: sete PNGs fornecidos pelo proprietário, preservados byte a byte, hashes no atlas. Alfa RGBA; sem geração de arte, remoção por cor preta ou reconstrução de pixels.
- `icon-96.png`: ícone integral 96 × 96, nearest neighbor, original preservado.
- Importação: `python tools/import_zoro_visual.py <pasta-dos-originais>`.

| Ação | Vínculo |
|---|---|
| Repouso | Coluna 0 da caminhada, direção atual; pose estática |
| Caminhada | Quatro quadros, fase de locomoção existente |
| Ataque | Cinco quadros; contato por hitFrameRatio |
| Palma | Quatro quadros nos estados cast/heal/attack-focus/attack-unarmed |
| Dano | South; perda efetiva de HP, sem alterar direção lógica |
| Corte de Maré | class:sword:0 / índice 0 → specialTide |
| Arco do Horizonte | class:sword:1 / índice 1 → specialHorizon |

Os especiais marcam o controlador de classe real e o relógio alternativo existente; não agendam impactos adicionais. Ataques normais limpam a marca cosmética. O desenho retorna ao estado atual e respeita transformações. As camadas de corpo/equipamento são substituídas somente na apresentação. Projéteis e efeitos de alcance/área no alvo permanecem no fluxo original. A projeção pública utiliza o protocolo multiplayer existente e respeita ocultação de itens.

Saves sem o slot continuam válidos (null por padrão). Índices antigos preservados; seleção no equipamento existente. Sem migração SQL ou protocolo paralelo.

## Verificação

Testes: `node --test tests/visual-completo.test.cjs` e `node --import tsx --test tests/foundation/visual-completo.test.mts`. Cobrem dados/atributos preservados, classe, save, inventário cheio, intents online, hashes/dimensões/âncoras, sincronização de impacto, controlador real e fallback de assets.

Revisão no navegador local: Zoro ao lado de César; inventário desktop e 390 × 844; retirar/reequipar/recarregar/trocar de mapa; atributos inalterados; ambos os especiais acionados pelos botões reais nas quatro direções, retornando ao repouso. Capturas e saves de teste fora do repositório.

A suíte de integração PostgreSQL e uma sessão multiplayer autenticada não foram executadas. Contratos e testes de fundação não substituem o teste ponta a ponta com dois jogadores conectados.
