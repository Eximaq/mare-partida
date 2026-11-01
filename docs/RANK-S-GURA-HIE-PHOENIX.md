# Rank S: Gura, Hie e Tori Phoenix

As três frutas entram no catálogo Rank S com três slots de habilidade. As regras do cliente e do serviço local compartilham os identificadores e custos de `assets/akuma/rank-s-rules.json`; o serviço valida lançamentos e impactos, enquanto a simulação do mundo permanece no cliente.

## Gura-Gura

- Aura usa somente os frames 17–21 do recurso enviado. Sua renderização mantém a escala aprovada, centralizada no personagem e com opacidade de 68%. O buff usa os frames 5–15 na mesma escala.
- Rachadura Espacial: cone frontal de quatro tiles, 450% de dano físico e 2,5 s de atordoamento. Poeira 2 é desenhada em cada tile do cone.
- Quebra-Crânio: área de três tiles, 450% de dano físico sem defesa ou escudo e redução de 80% da defesa por 3 s. Poeira 1 é desenhada em cada tile da área.
- Exército de um Homem Só: mais 60% de ataque e defesa durante 10 s.

## Hie-Hie

- Passiva Logia recebe a redução física já usada pelas outras Logias, salvo ataques com Haki.
- Lanças de Gelo: cinco impactos de 420% num alcance de cinco tiles.
- Pássaro Gélido: 450% num alcance de seis tiles; a animação respeita o frame 39.
- Ambos aplicam lentidão de movimento e ataque. Tempo Gélido alcança um alvo até três tiles, congelando por até 5 s; o próximo golpe despedaça o gelo e adiciona 600% de dano. Após a liberação, o alvo recebe 40% de lentidão e 50% de redução de velocidade de ataque.

## Tori-Tori: Model Phoenix

- A aura é visível na forma Zoan e usa 70% da escala quando o personagem volta à forma humana.
- A forma transformada usa o personagem PixelLab AI `7acf1282-14f7-429b-9e4e-5ed3adacee7a`, com frames nativos das quatro direções para idle, Walking, Attack e Tuck the wings tightly against. A escala de mundo é 130%.
- Regenera 10% da vida máxima e da energia máxima a cada 10 s equipada.
- Phoenix Flame usa os 40 quadros originais de `Tuck_the_wings_tightly_against_the_sides_and_accel` nas quatro direções e a animação corporal de asas recolhidas voltada ao alvo, sem deslocar o personagem; causa 400% até dois tiles, reduz defesa em 50% e cura recebida em 80%.
- Chamas da Restauração mantém o totem fixo de 96 px por 7 s, repetindo os frames 18–41. As chamas dos frames 1–6 cobrem todos os 81 tiles do raio de cinco tiles, em tamanho de 64 px cada. Cura 15% da vida máxima por segundo enquanto o personagem está dentro da área.
- Energia Flamejante desenha à frente da fênix o spritesheet fornecido `Bola de Eneriga.png`, preservando suas proporções, e percorre o caminho até o alvo em cinco impactos, somando 550%, e aplica redução de cura recebida de 80%.

Os recursos enviados pelo usuário foram preservados em `assets/akuma/{gura,hie,phoenix}`. As prévias automatizadas ficam fora do repositório.

## Reação de dano da Fênix — 31/10/2026

A integração original não continha `hurt/south`: ao receber dano, a forma Phoenix
ficava sem desenho durante a janela visual de 180 ms. A prévia gerada e aprovada
pelo proprietário foi integrada com seus quatro quadros originais, na mesma ordem,
sem redimensionar ou pintar pixels. A geração custou 2 gerações PixelLab; a
integração não solicitou novas gerações.

`assets/sprites-combat-v2/phoenix/hurt-south.png` contém quatro células RGBA de
132 × 132 em uma folha de 528 × 132. `layout.json` registra os limites, os hashes
RGBA por quadro e os IDs de origem. A montagem é uma concatenação horizontal sem
máscara ou reamostragem. O pivô fixo `[66,113]` corresponde ao pivô South original
`[48,95]` acrescido dos 18 px de margem central do canvas gerado.

O catálogo e `playback.json` usam todos os quadros, de 0 a 3, durante os 180 ms
existentes. Hurt é South em qualquer orientação; a orientação lógica do ator não
muda. A animação não repete: ao terminar, o renderizador retoma o estado atual.
A última pose com asas recolhidas, aprovada na prévia, permanece como fornecida.
Dano, ataques, skills, mapas, HUD, Paper Doll e formatos de save não foram alterados.

Validação na base `8550cfa`:

- `node tests/phoenix-hurt.test.cjs`: falhou antes com a Fênix invisível e passou
  depois; executa a função real `drawUpdatedZoan`, oito orientações, quatro quadros,
  coalescência de golpes e retorno à locomoção após 180 ms.
- `sprite-south-hurt.test.cjs` e `sprite-combat-v2.test.cjs`: aprovados.
- Suíte de `tests/*.test.cjs`, excluindo o E2E Supa conforme o CI: inicialmente
  134/135; após investigar e corrigir o teste herdado, **135/135 aprovados**.
  O hash antigo incluía a variável de interface `inventoryForgeReturn`, adicionada
  entre o catálogo e as missões. As definições das armas permaneceram iguais.
  O teste agora executa a inicialização real e compara índices de save, nomes,
  tipos, atributos e raridades das 22 armas com tuplas auditadas em `82e7082`.
  Mutação de estado de UI passa; mutações de ataque e identidade falham.
  As verificações de arte, 1.200 poses, 1.440 contatos e 240 vistas foram mantidas.
- Navegador real no build `dist`, origem local isolada e save DEV: perda única de
  5 HP, quatro quadros visíveis em 0/50/100/150 ms, Idle norte em 181 ms, orientação
  preservada e zero erros de console/diagnóstico. Conferido em desktop e 390 × 844.
  A fixture injeta controles somente na resposta HTTP de teste; não entra no build.
- Sintaxe dos JavaScript, hashes RGBA dos quatro quadros, cópia do PNG no build,
  `python tools/build_pages.py`, `python tests/paper_doll_pages_test.py`,
  `python tests/portal_build_test.py` e `python tools/build_portal.py`: aprovados.

Capturas em `docs/evidence-phoenix-hurt/`, ignoradas pelo Git. Integração em branch
separada; nenhum merge ou deploy de produção foi executado.

O push inicial acionou indevidamente um preview automático do portal estático
na integração Cloudflare existente. Após autorização, o deployment `76cb9297`
e seu alias foram excluídos; ambos retornaram HTTP 404. A produção foi preservada.
As branches `fix/phoenix-hurt-animation`, `feature/auth-sessions` e
`refactor/authoritative-server` agora estão excluídas dos previews automáticos.
Outros previews e trabalhos de colaboradores não foram removidos. O backend
não foi publicado: o build observado executava somente `tools/build_portal.py`.
Os próximos commits desta atualização usam também o prefixo `[CF-Pages-Skip]`.
