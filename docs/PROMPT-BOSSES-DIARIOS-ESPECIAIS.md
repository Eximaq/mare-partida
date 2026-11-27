# Kaizoku Idle: sete especiais dos bosses diários

## Prompt para o Codex

Trabalhe no mesmo PR #380 de `Eximaq/mare-partida`. Aproveite as tiras já adicionadas. Não redesenhe os sprites aprovados, não use imagens do anime como assets e não altere o Ryuma zumbi de Thriller Bark, os chefes de masmorra 130–170 ou o Akainu semanal. O escopo deste commit é arte, geometria, relógio e prévia testável; não habilite calendário, spawn, recompensas nem deploy.

### Onde localizar

- Ator: `assets/sprites-combat-v2/<daily-id>/{attack,special}-<direção>.png`. Use `attack` no básico e `special` exclusivamente no especial, em north/south/east/west. Não espelhe as laterais já autoradas de Shanks.
- Efeito: `assets/vfx/daily-sword-bosses/<daily-id>/{travel,impact}.png`. Só Mihawk, Shanks e Shiki têm `travel`. Cada PNG é uma tira horizontal de 6 quadros de 192 × 192 (1152 × 192), pivô (96,96) e fundo transparente. Filtro nearest-neighbor, sem repetir o impacto. Direcionais nascem em leste e rodam pelo ângulo do golpe; o anel de Rayleigh e a queda/impacto de Shiki mantêm a orientação da tela.
- Regras e URLs de referência: `daily-sword-boss-specials.json`.
- Relógio e geometria reutilizável: `daily-sword-boss-combat.js`, API `create`, `sample`, `contains`, `contact`, `cancel`. Prévia: `daily-sword-boss-preview.html`. Testes: `tests/daily-sword-boss-combat.test.cjs`.

### Animação, sinalização e contato

Use 4 quadros do ator: F0 preparação 440 ms, F1 antecipação 360 ms, F2 solta o golpe 260 ms, F3 recuperação 300 ms. O aviso abre em F0; a liberação ocorre aos 800 ms, no início de F2. O tempo até o contato depende do golpe, não do início de uma animação de partículas. O relógio do efeito pode ultrapassar o fim da ação do ator.

| Boss / ID | Prompt visual | Comportamento |
|---|---|---|
| Mihawk / `daily-mihawk` | Carregue Yoru; solte um crescente esmeralda brilhante, trilhas finas e faíscas verdes; termine com uma lasca cruzada de luz. | Projétil perfurante avança 235 px em 380 ms, faixa de 36 px visível desde a preparação. A frente móvel acerta uma vez cada alvo válido; o fim da onda não dá segundo dano. |
| Shanks / `daily-shanks` | Uma única mão firma Gryphon; avanço com traço carmim, raios escuros e um clarão de corte no fim. Sem regenerar o braço ausente. | Kamusari percorre faixa fixa de 172 × 48 px em 180 ms. O rastro segue o avanço do chefe; não é projétil separado. O ponto final deve ser aprovado pela navegação, sem cruzar parede. |
| Ryuma vivo / `daily-ryuma-alive` | Shusui sobe; corte limpo azul-prata desce com estilhaços claros junto do chão. Não desenhe um dragão como entidade. | Corte frontal no F2, em cone de 88° e alcance de 117 px. O salto é visual; não teletransporta nem deixa área persistente. Não troca a versão zumbi. |
| Oden / `daily-oden` | As duas lâminas fecham um X âmbar e rosa, com núcleo claro e faíscas curtas. | Tōgen Totsuka fixa centro 96 px à frente; dois braços de 112 × 28 px a ±45°. O cruzamento causa um só contato por alvo. |
| Rayleigh / `daily-rayleigh` | Lâmina sobe em arco violeta-prata; anel baixo e pontilhado marca os pés do alvo da área. | Corte Ascendente é original do jogo. Área circular fixa a 84 px à frente do chefe, raio de 62 px; atinge no F2 após o aviso completo. Não procura o herói depois que o alvo sair. |
| Zoro / `daily-zoro` | Mostre três rastros violeta-turquesa e um golpe conjunto, sem perder a katana da boca. | Adaptação de Hiryū Jigoku: três faixas frontais paralelas de 148 × 34 px, centro e ±42 px. Há espaços seguros; um único contato por alvo no F2. |
| Shiki / `daily-shiki` | O giro das lâminas eleva pedras douradas; destroços caem nos centros marcados e explodem em poeira e lascas sem clarão de tela cheia. | Queda do Leão Dourado é original do jogo. Trave três círculos de 45 px de raio no início, a partir da posição inicial do alvo (distância máxima do centro 140 px). O VFX de queda dura 460 ms após o F2; o dano só existe ao cair. Sobreposição não acumula dano. |

### Critérios de integração e verificação

1. Gere um `castId` estável e congele direção, origem e centros no telegráfico. Desenhe e teste contato sobre as mesmas formas. Não decida dano pelo alfa do PNG. Use colisão e linha de visão do motor quando ligar a um encontro.
2. Durante o lançamento, efeitos móveis seguem a posição amostrada. Para Shiki coloque um `travel` em cada centro marcado, sem deslocá-lo horizontalmente. Para Oden/Rayleigh aplique o efeito no centro fixado. Limpe efeitos em cancelamento ou fim da luta.
3. Em integração online futura, só o servidor determina contatos e estado. Teste evasão no limite, dois jogadores dentro/fora da mesma área e sem reaplicar dano em reconexão. A prévia atual não reduz HP e não cria a agenda diária.
4. Valide os 7 IDs, 140 strips de ator, 10 tiras de efeito, quatro direções, limites e fases no build estático. Rode o teste isolado e abra a bancada no navegador com os sete especiais. Não faça merge ou publicação.

### Referências consultadas

- [Mihawk, corte da lâmina negra em Marineford](https://one-piece.com/anime/470/index.html)
- [Shanks, Kamusari contra Kid](https://one-piece.com/anime/67527/index.html)
- [Ryuma vivo, referência visual de MONSTERS](https://one-piece.com/news/64503/index.html) e [corte do dragão](https://one-piece.com/greg/o20210224_1205/index.html)
- [Oden contra Kaido](https://one-piece.com/anime/o5745/index.html) e [técnica de duas espadas](https://one-piece.com/anime/o5993/index.html)
- [Rayleigh em Sabaody, referência de postura e velocidade](https://one-piece.com/anime/405/index.html)
- [Zoro contra King](https://one-piece.com/anime/61675/index.html)
- [Shiki, poder da Fuwa Fuwa no Mi](https://one-piece.com/character/Shiki/index.html) e [lâminas nas pernas](https://one-piece.com/figure/o1779/index.html)
