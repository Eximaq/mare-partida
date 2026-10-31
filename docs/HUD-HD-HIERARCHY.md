# HUD HD — auditoria e contrato visual

Branch: feature/pirate-hud-hierarchy-hd. Base auditada: 1572627.

## Diagnóstico confirmado

- O cartaz copia o canvas de 72 × 72 do retrato antigo, incluindo cenário e aura. A correção usará o compositor native96 diretamente num canvas transparente próprio.
- status.png tem 361 × 181, mas seu contêiner usa 361/166; poster.png tem 357 × 502, mas é recortado num contêiner 357/420. Não reutilizar essas proporções divergentes.
- A faixa superior duplica nome e retrato. Removê-la, mantendo os acessos existentes por controles já presentes.
- Os quatro emblemas oficiais possuem 912 × 912; reutilizar assets/ui/faction-emblems sem geração nem redesenho.
- O nome usa a fonte original Alabasta Pirate. A Bounty ficará vazia, substituindo o requisito histórico de zero.

## Fonte única de hierarquia

MareHierarchy.titles e MareHierarchy.title são a fonte da grafia. O par factionId/hierarchyTier identifica o título; as chaves abaixo são apenas notação documental, não novos IDs persistidos. A promoção existente usa MareHierarchy.next e server/hierarchy.py. Patamares 6–8 estão declarados, mas bloqueados; a migração atual limita saves a 1–5. Nenhuma regra será alterada.

| Chave (facção:patamar) | Nome exato | Atribuição atual | Família visual prevista | Estado |
|---|---|---|---|---|
| pirate:1 | Pirata Novato | Inicial | pirate-base | Integrado; texto canônico e variante por patamar |
| pirate:2 | Pirata Promissor | Promoção manual, nível 20 | pirate-base | Integrado; texto canônico e variante por patamar |
| pirate:3 | Capitão Pirata | Promoção manual, nível 50 | pirate-base | Integrado; texto canônico e variante por patamar |
| pirate:4 | Supernova | Promoção manual, nível 75 | pirate-command | Integrado; texto canônico e variante por patamar |
| pirate:5 | Shichibukai | Promoção manual, nível 100 | pirate-command | Integrado; texto canônico e variante por patamar |
| pirate:6 | Comandante Yonkou | Bloqueado; nível declarado 135 não libera promoção | pirate-elite | Integrado; texto canônico e variante por patamar |
| pirate:7 | Yonkou (Imperador) | Bloqueado; nível declarado 170 não libera promoção | pirate-elite | Integrado; texto canônico e variante por patamar |
| pirate:8 | Rei dos Piratas | Bloqueado; nível declarado 200 não libera promoção | pirate-elite | Integrado; texto canônico e variante por patamar |
| marine:1 | Recruta | Inicial | marine-base | Integrado; texto canônico e variante por patamar |
| marine:2 | Marinheiro | Promoção manual, nível 20 | marine-base | Integrado; texto canônico e variante por patamar |
| marine:3 | Sargento | Promoção manual, nível 50 | marine-base | Integrado; texto canônico e variante por patamar |
| marine:4 | Capitão | Promoção manual, nível 75 | marine-command | Integrado; texto canônico e variante por patamar |
| marine:5 | Comodoro | Promoção manual, nível 100 | marine-command | Integrado; texto canônico e variante por patamar |
| marine:6 | Vice-Almirante | Bloqueado; nível declarado 135 não libera promoção | marine-elite | Integrado; texto canônico e variante por patamar |
| marine:7 | Almirante | Bloqueado; nível declarado 170 não libera promoção | marine-elite | Integrado; texto canônico e variante por patamar |
| marine:8 | Almirante de Frota | Bloqueado; nível declarado 200 não libera promoção | marine-elite | Integrado; texto canônico e variante por patamar |
| revolutionary:1 | Simpatizante | Inicial | revolutionary-base | Integrado; texto canônico e variante por patamar |
| revolutionary:2 | Guerrilheiro | Promoção manual, nível 20 | revolutionary-base | Integrado; texto canônico e variante por patamar |
| revolutionary:3 | Oficial Revolucionário | Promoção manual, nível 50 | revolutionary-base | Integrado; texto canônico e variante por patamar |
| revolutionary:4 | Executivo | Promoção manual, nível 75 | revolutionary-command | Integrado; texto canônico e variante por patamar |
| revolutionary:5 | Comandante de Tropa | Promoção manual, nível 100 | revolutionary-command | Integrado; texto canônico e variante por patamar |
| revolutionary:6 | Comandante de Exército | Bloqueado; nível declarado 135 não libera promoção | revolutionary-elite | Integrado; texto canônico e variante por patamar |
| revolutionary:7 | Chefe de Gabinete | Bloqueado; nível declarado 170 não libera promoção | revolutionary-elite | Integrado; texto canônico e variante por patamar |
| revolutionary:8 | Líder Supremo | Bloqueado; nível declarado 200 não libera promoção | revolutionary-elite | Integrado; texto canônico e variante por patamar |
| government:1 | Agente Menor | Inicial | government-base | Integrado; texto canônico e variante por patamar |
| government:2 | Agente Oficial | Promoção manual, nível 20 | government-base | Integrado; texto canônico e variante por patamar |
| government:3 | Inspetor do Governo | Promoção manual, nível 50 | government-base | Integrado; texto canônico e variante por patamar |
| government:4 | Agente Cipher Pol | Promoção manual, nível 75 | government-command | Integrado; texto canônico e variante por patamar |
| government:5 | Elite Cipher Pol (CP9) | Promoção manual, nível 100 | government-command | Integrado; texto canônico e variante por patamar |
| government:6 | Agente Aegis (CP0) | Bloqueado; nível declarado 135 não libera promoção | government-elite | Integrado; texto canônico e variante por patamar |
| government:7 | Comandante Aegis Zero | Bloqueado; nível declarado 170 não libera promoção | government-elite | Integrado; texto canônico e variante por patamar |
| government:8 | Diretor Geral | Bloqueado; nível declarado 200 não libera promoção | government-elite | Integrado; texto canônico e variante por patamar |

## Direção visual

Madeira #302018, ouro #c69849, pergaminho #e3be7c; títulos vermelho #8f2535, verde #215b42, azul #235480 e marfim #eee4cc. Alabasta Pirate no nome; tipografia existente legível nos valores e títulos dinâmicos. Painel 300 px, arte em resolução superior, sem deformar ornamentos; título à esquerda do emblema e imediatamente acima do HP. Cartaz com proporção integral da arte e retrato native96 sem fundos.

## Validação planejada

32 títulos, quatro emblemas, mudança real de título, reload, barras 0/25/100%, nomes longos, transparência do retrato, ambos os corpos, capacete oculto/visível, resoluções desktop/mobile e regressões Node. Capturas reais fora do repositório. Cada etapa será registrada apenas após execução.

## Implementação e artes

- character-hud.js usa factionId/hierarchyTier e MareHierarchy.title; troca imagens apenas quando muda esse par. A identidade visual não atribui patamares.
- game.js fornece dados reais e um callback do compositor native96 para o canvas transparente 192×192; não copia o retrato 72px nem efeitos de combate. A imagem é renderizada apenas com cartaz aberto e mudanças de aparência.
- index.html/ui-preview.html não têm retrato, nome ou faixa superiores; o emblema reaproveita o botão existente de expandir. Perfil/atributos continuam pelo controle de pontos e navegação existente. player-hub.js mantém seu retrato original.
- HP, EN, XP, nível, poder e Dobrões mantêm fontes e fórmulas existentes. Bounty vazia, sem anúncio de recurso futuro.
- Painel 300×200 CSS px (menor em mobile), moldura 600×400 PNG; cartaz 448×600 proporcional; materiais 512×256 madeira e 448×600 papel. Insígnias 480×96, em 12 variantes para 32 títulos; numeral do patamar diferencia níveis dentro da família. Texto ajustado à área interna, sem rasterizar nomes.
- PixelLab Pro: 190 gerações, incluindo amostra 15, molduras 50, materiais 50, três folhas 75. Workbench alinhou a folha-base e separou as 12 placas sem interpolação. Exportação GIF→PNG conserva RGBA decodificado, verificado byte a byte. IDs/origem em assets/ui/character-hud/hd/manifest.json.
- Molduras e insígnias têm alfa real; materiais interiores são opacos por definição. Emblemas oficiais 912×912 reutilizados sem mudanças. Canvas do personagem usa nearest-neighbor; artwork HD usa redução proporcional nativa do navegador. Não se esticam molduras nem se ampliam fontes pequenas para simular HD.
- Build estático mantém versionamento SHA256 de scripts/CSS; caminhos relativos, novos assets numa pasta HD própria, nenhuma chamada PixelLab em runtime. Nenhuma exclusão de fontes antigas nesta sprint.

## Testes executados

20 testes Node pertinentes (HUD, hierarquia, aparência, capacete, inventário, perfil e preview) e 4 testes Python de hierarquia passaram. Teste real de navegador cobriu 32 títulos, quatro facções, promoção existente 3→4, persistência, barras 0/25/100%, XP e saldo, nomes como texto, ambos os corpos, capacete oculto/visível, canvas transparente, toque/teclado e 8 resoluções: 1920×1080,1366×768,1280×720,1024×768,393×852,360×800,320×568 e844×390. Capturas e saves de QA permanecem fora do repositório.

## Limites

Patamares 6–8 são validados como apresentação, sem liberar sua progressão. A inspeção artística não substitui o aceite do proprietário; a HUD menor em mobile exige rolagem do cartaz, preservando sua proporção. Testes de promoção online continuam cobertos no backend, enquanto o teste visual usa preview estático isolado.
