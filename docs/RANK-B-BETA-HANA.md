# Beta-Beta e Hana-Hana — Rank B

Duas frutas adicionadas ao final do catálogo, preservando IDs e índices anteriores. Usa os 16 PNG/JSON fornecidos pelo proprietário sem alterar seus bytes: quatro sequências de 17 frames, 83ms por frame (1411ms), e a nova aura energy-orb-take-3 de 25 frames, 83ms por frame (2075ms). Manifesto com hashes: assets/akuma/rank-b-manifest.json. Importação reproduzível em tools/import_rank_b_assets.py.

## Equipamento e balanceamento inicial

| Fruta | Atributos passivos | Habilidade 1 | Habilidade 2 |
|---|---|---|---|
| Beta-Beta, Logia | +240 HP, +26 ataque especial, +14 defesa física, +6% redução de recarga | 35 energia, 12s base | 35 energia, 20s base |
| Hana-Hana, Paramecia | +100 HP, +28 ataque físico, +8% crítico, +8% penetração de armadura | 35 energia, 14s | 55 energia, 30s |

A Beta favorece dano especial e controle com resistência; a Hana favorece combos físicos e controle direcionado. Valores iniciais, sem alegação de simulação PvP. Recargas da Beta após o passivo: 11,28s e 18,8s. Os dados JS/Python e os tooltips compartilham os modificadores, sem acúmulo ao recalcular/reequipar. Chance crítica e penetração respeitam os tetos existentes.

## Beta-Beta

- Intangibilidade Logia: reduz em 30% o dano físico recebido após a defesa comum. O ataque com hasHaki=true ignora somente essa redução. Dano especial permanece normal. A interface informa a redução e sua anulação por Haki; getDerived expõe physicalDamageReduction=0.30.
- takeDamage aceita hasHaki no sétimo argumento ou no atacante source.hasHaki. A API /api/akuma/damage aceita hasHaki ou has_haki. O backend valida os valores e aplica a mesma mitigação sobre o dano recebido informado pelo protótipo.
- Aura passiva acompanha as pernas enquanto equipada. VFX energy-orb-take-3 de 96×96, desenhado inteiro à frente, sem recorte. Pivô no pixel 57 da folha de 64px: a base opaca coincide com os pés (offset +2px), cobrindo-os durante os 25 quadros. O mesmo encaixe é usado na prisão do alvo.
- Deslize: substitui a pose de caminhada por pose parada; o deslocamento é interpolado linearmente com velocidade constante e resolução de colisão pelo navegador atual. Abrange teclado, rota clicada e perseguição automática, sem alterar o ponto físico dos pés.
- Lançador Pegajoso: 150% do ataque especial instantâneo em círculo de raio 128px (2 tiles; caixa delimitadora de 5×5 centros de tiles). A composição radial de oito cópias da sequência original cobre 360°. Nas diagonais, vale o raio circular, não os cantos externos de um quadrado de 5×5.
- Vareta Pegajosa: exige alvo vivo visível no lançamento e o enraíza por 4s. O alvo pode atacar, mas não se deslocar. Feixe ancorado nas pernas do jogador, com ângulo e comprimento atualizados continuamente, e gosma nas pernas do alvo. Mover o jogador não rompe a ligação. O alvo continua retido no mundo fora da câmera durante o efeito.

## Hana-Hana

- Dos Fleur: Socos: exige alvo vivo visível a até 128px. Quatro ticks físicos de 80%, em 25%, 50%, 75% e 100% dos 1411ms da animação. VFX nasce e acompanha o alvo original, sem redirecionar os ticks ao trocar seleção.
- Treinta Fleur: Estrangulamento: exige alvo vivo visível. Aplica 100% físico inicial; toca os frames 1–12 por 996ms. Atingindo o frame 13, fixa esse frame por exatamente 5s e bloqueia movimento, ataques e habilidades do alvo.
- Durante a trava: cinco ticks de 90% físico, um a cada segundo, totalizando 550% com o impacto inicial, antes da defesa e do arredondamento por golpe.
- Após a trava, retoma diretamente no frame 14, sem repetir o frame 13. Frames 14–17 duram 332ms; o controle é removido ao concluir essa liberação, conforme pedido. Duração total visual: 6328ms. O alvo fica controlado durante os 5s de trava e a curta sequência de soltura; não há ticks adicionais durante a soltura.
- Overlay 104×104 centralizado no corpo para cobrir o alvo. Root e stun usam campos próprios, sem substituir o temporizador de outros controles existentes. Purificação limpa os campos novos e interrompe a raiz/estrangulamento local.

## Estados e integração

Morte, troca de fruta/mapa e reinício removem VFX, vínculos e controles temporários. Somente a fruta equipada concede seus passivos de equipamento; o bônus permanente do Compêndio continua seguindo a regra existente. Recargas persistem após reload. O servidor emite tokens de combo e valida proprietário, instância, alvo original, horário mínimo e consumo único dos nove ticks possíveis da Hana.

Código: rank-b-data.js, rank-b-system.js, server/rank_b.py; regras em assets/akuma/rank-b-rules.json. Endpoint novo: POST /api/akuma/rank-b-tick. Reutiliza o endpoint cast existente e seu contexto adicional. O jogo continua com simulação de mundo local; não introduz PvP ou servidor autoritativo de posições/HP.

## Validação

- 75 arquivos Node e 85 testes Python passaram.
- Testes próprios: rank-b-system.test.cjs, rank_b_backend_test.py, rank_b_browser.cjs.
- Navegador real em preview estático e Python: item/tooltip/equipamento, atributos exatos, mitigação/Haki, dano especial radial, movimento e vínculo dinâmico, raiz, quatro socos, frame 13 congelado, cinco ticks, liberação e save/recargas. API aceitou os quatro casts e nove ticks esperados.
- Layout também conferido em 900px. Capturas inspecionadas ficam fora do Git. Executar python tools/build_pages.py para o preview estático.
