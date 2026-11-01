# Central do Navegante HD — Perfil, Jornal do Morgan e Configurações

## Entrega e auditoria

Branch: feature/profile-journal-settings-hd. Base: 5e1644c (main após PR #183).

A sprint altera apresentação e corrige a privacidade do perfil. Não modifica catálogo, atributos, combate, promoções, economia nem formato dos saves.

| Tela | Fonte e comportamento preservados |
|---|---|
| Meu Perfil / Visão geral | Nome, classe, facção, nível, poder oficial de getDerived, totalPlay, created, stats.kills/damage/goldEarned |
| Meu Perfil / Equipamentos | As 12 posições do inventário, inclusive vazias; definições por item.def; nome, raridade, nível e refinamento reais |
| Mural / Personalizar | Estruturas de perfil público já incompletas; continuam informativas, sem outro editor |
| Jornal do Morgan | Rota interna journal; publicações reais de journal-feed.json; Tudo/Eventos/Atualizações/Avisos |
| Configurações / Geral | Cinco seções expansíveis existentes; não foram criadas novas rotas ou opções |
| Configurações / Discord | Sem convite oficial configurado; continua informativo, sem link inventado |

A renomeação visível de Jornal do Porto para Jornal do Morgan preserva rotas, IDs e persistência.

## Perfil e privacidade

- Título canônico de MareHierarchy.title(factionId, hierarchyTier), sem título fixo de exemplo.
- Berry recebidos usa stats.goldEarned, não o saldo gold. Dados inexistentes mostram “Não registrado”.
- O serviço existente oferece Top 10 da Hierarquia ordenado por cargo, nível e poder. Não fornece posições globais separadas por nível e poder; o perfil informa essa diferença sem criar outro ranking.
- Retrato próprio de 256 × 256 com o compositor native96 e aparência persistida explicitamente passada a MareCharacterAppearance.read. Não amplia o retrato legado de 64/72 px.
- Transformações usam MareZoanArt, já integrado ao SpriteCombatV2. Aura usa o sistema real vfx_aura, somente quando corresponde à fruta equipada.
- Artes de equipamento vêm de MareItemArt.path(item.def, itemBase(item)), a mesma fonte HD do inventário; ícone oficial da definição é o fallback quando aplicável.
- Inspeção por teclado ou ponteiro reutiliza tooltipItem e MareTooltips; não existe outro cálculo de atributos.
- A preferência preferences.hideItems antes não era aplicada nessa tela. Agora remove cards, nomes e tooltips e compõe o retrato sem equipamentos, aura ou transformação que revelem a fruta. O estado real do jogador não muda.
- O perfil atual é local; não foi inventada distinção de proprietário/visitante ou publicação remota.
- Alterações estruturais de equipamento, aparência, classe, facção e privacidade refazem o componente. Métricas atualizam somente seus textos na atualização já existente do jogo.
- Carregamento do retrato usa tentativas temporárias limitadas, canceladas ao fechar ou trocar de tela. Não adiciona intervalo, renderizador ou cache de sprites paralelo.

## Todas as seções de Configurações

| Seção existente | Controles reais |
|---|---|
| Geral | Idioma português, conexão local e estado de conta, informativos |
| Áudio | Ativar/silenciar música; volume de 0 a 100%, via MareAudio |
| Gráficos | Alta qualidade / efeitos reduzidos; mesmo setReducedFX |
| Interface e Controles | Densidade padrão/compacta; ajuda dos atalhos existentes |
| Acessibilidade | Movimento normal/reduzido; textos maiores |
| Discord | Informação de convite ainda não configurado |

A chave mare-partida-player-ui-v1 e seus valores válidos foram preservados. Abrir/fechar não salva padrões. Valores enumerados inválidos são ignorados em memória; não há migração ou regravação automática. Ajustes continuam imediatos e preservam foco e posição de leitura.

Os controles continuam sendo selects, checkboxes e range nativos. O estilo se limita a esta família de telas, mantendo estados selecionado, foco e desabilitado.

## Recursos e direção de arte

- Madeira escura e metal escuro com dourado envelhecido, conforme o padrão permanente.
- Molduras, botões escuros/dourados de nove partes, madeira, textura da Forja e banner náutico das HUDs já aprovadas.
- Emblemas oficiais de facção e os mesmos símbolos de classe dos Talentos.
- Equipamentos HD oficiais reaproveitados; nenhum item ou sprite de personagem foi regenerado.
- Morgan e as cinco ilustrações das seções de Configurações: recortes exatos das referências aprovadas, em resolução nativa. O texto e os controles permanecem em HTML.
- PixelLab AI Pro: uma folha transparente de 512 × 256 com oito pictogramas isolados: bandeira, música, estrela náutica, espadas, jornal, ampulheta, coroa e fala.
- Job 62db29b4-47a1-435b-8cf5-e4eacd09d0bb; galeria 49cea63d-bd89-5178-896f-fd7ac9981594; recibo: US$0,15 em créditos. Não houve geração em tempo de execução.
- Origem, dimensões, regiões dos recortes e hashes: assets/ui/captain-hd/manifest.json.
- Ícones novos possuem alfa; os preenchimentos legítimos das placas e botões são preservados.
- Fontes reais com acentos. O canvas do personagem mantém pixels nítidos; texturas e ícones HD preservam suas proporções.

O editor PixelLab não aceita imagens de referência com lado acima de 1024 px para operações exatas; por isso os recortes autorizados foram exportados diretamente por Canvas, sem reamostragem ou redesenho. A arte aprovada não foi substituída.

## Validação executada

- 15 testes Node aprovados nos sete arquivos pertinentes: captain-hd, player-hub, game-tooltips, character-appearance, headgear-visibility, ui-system e character-hud-hierarchy.
- Navegador real sobre fonte e sobre dist: dados canônicos, 12 slots, vazio, ícones por ID, tooltips, alteração imediata de equipamento, preferência de privacidade inclusive tooltip já aberto, notícias reais e categorias vazias.
- Todas as cinco seções internas e a aba Discord; música, volume 37%, efeitos, densidade, movimento, textos maiores e persistência após recarregar.
- Retratos masculino/feminino comparados a partir das escolhas persistidas. Saves de teste isolados.
- Sete resoluções nas três telas: 1920×1080, 1366×768, 1024×768, 760×900, 393×852, 320×568 e 844×390. Sem transbordamento horizontal ou fechamento inacessível.
- Regressão da HUD principal em dist: oito viewports, fonte, barras reais, teclado, toque, Bounty vazia e recarga; sem erros de página ou recursos ausentes.
- python tools/build_pages.py aprovado. captain-hd.css, scripts, feed e assets publicados com caminhos relativos e versionamento existente.
- Capturas de todas as telas e seções ficam fora do repositório. O workflow captain-hd gera novas capturas como artefatos temporários de validação.

## Arquivos principais

- player-hub.js: composição e ciclo de vida das três áreas.
- captain-hd.css: apresentação isolada e responsiva.
- game.js: retrato compartilhado, snapshot de equipamentos, atualização de métricas e privacidade.
- game-tooltips.js: inclusão dos cards do perfil no resolvedor existente.
- index.html / tools/build_pages.py: carregamento e publicação.
- assets/ui/captain-hd/: recursos e manifesto.
- tests/captain-hd.test.cjs / tests/captain_hd_browser.cjs: validação funcional e visual.
- .github/workflows/captain-hd.yml: execução automática no PR.

## Limites preservados

Mural, personalização pública, Discord, conta online e PvP permanecem sem funcionalidades novas. Os rankings separados de nível/poder continuam indisponíveis; o Top 10 da Hierarquia permanece no sistema próprio. Não foram criados convites, notícias, dados de exemplo ou ações de equipamento no perfil.
