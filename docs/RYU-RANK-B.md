# Ryu Ryu no Mi — Rank B / Zoan Ancestral

## Uso e escala aprovada

Registrar no Compêndio Rank B e equipar. A fruta transforma automaticamente; T alterna entre humano e dinossauro. As teclas 1 e 2 acionam os ataques apenas na forma Zoan, em caçada, com alvo vivo a até 96 px (1,5 tile) e linha de visão livre.

O proprietário aprovou **128×128 px no mapa** em 26/10/2026, após comparar 64, 96 e 112 px. A dimensão de destino é comum a idle, caminhada, ataque básico, mordida e cauda nas quatro direções. Pivots nos pés acompanham cada frame original. Retratos são ajustados ao espaço da interface; não usam os 128 px do mapa. A transição Zoan compartilhada cobre a forma de 128 px.

## Regras

| Ataque | Dano físico | Energia | Recarga | Efeito |
|---|---:|---:|---:|---|
| Básico | Fórmula básica existente | — | Velocidade de ataque | Animação nativa de mordida |
| Mordida com Haki | 450% ATQ | 45 | 18s | Haki nativo ignora a redução Logia |
| Impacto da Cauda | 150% ATQ | 35 | 16s | Atordoamento por 3000 ms |

Os custos, recargas, dano da cauda e passivos são valores iniciais definidos para os campos não especificados no pedido. Passivos: +220 HP máximo, +32 ataque físico, +12 defesa física, +5 pontos percentuais de penetração. O básico usa o ataque físico em todas as classes enquanto transformado.

Dano no frame 12 (índice zero, a 1s) das duas habilidades, uma vez por execução, no alvo selecionado. Defesa física comum e penetração seguem a fórmula existente: floor(ATQ × multiplicador − DEF × (1 − penetração) × 0,30), mínimo 1. Em seguida aplica-se a mitigação Logia, salvo Haki. A mordida sempre tem Haki; a cauda também respeita Armamento ativo. Haki remove a passiva Logia, não concede penetração de 100% contra armaduras comuns.

O atordoamento começa no impacto, interrompe avisos de ataque e bloqueia deslocamento/ataques durante 3s. Expiração preserva outros controles ativos. A animação termina e volta a idle. Morte, troca de fruta, mudança de área, controle no atacante ou retorno à forma humana cancelam impactos pendentes. Recargas persistem no save e não são apagadas ao transformar. Alvos mortos, inalvejáveis, invulneráveis, fora do alcance ou atrás de obstáculos não recebem o impacto.

## Arte e origem

Personagem existente do PixelLab: dc1eb4bb-f3bb-4f6f-861b-f635c8b02f64, Ryu Ryu no Mi. Sem novas gerações pagas. Ícone da fruta e dois ícones de habilidade fornecidos pelo proprietário, copiados sem alteração.

- Idle: rotações originais, um frame por direção.
- Caminhada: The dinosaur initiates a powerful sprint leaning f…
- Básico: The dinosaur tilts its head back baring massive te…
- Skill 1: Infuse the teeth with a glossy black aura then lun…
- Skill 2: Wind up the upper body by leaning slightly forward…

304 frames originais preservados, em 20 atlas com padding transparente; sem reamostragem. Metadados, dimensões, pivots, hashes RGBA e origem em assets/akuma/ryu/clips.json e manifest.json. Importação reproduzível: python tools/import_ryu_assets.py arquivo.zip pasta-dos-icones.

## Validação

- tests/ryu-system.test.cjs: catálogo, fórmulas, Haki, defesa, 3s e 304 frames em 128 px.
- tests/ryu_backend_test.py: catálogo/passivos, transformação, energia, alcance, Haki, timing, recarga, cancelamento, token de uso único e expiração.
- tests/ryu_artwork_test.py: pixels originais dos 304 frames.
- tests/ryu_browser.cjs: registro, HUD, transformação, impacto, dano, alvo único, bloqueio real de movimento/ataques, duração exata do stun, cancelamento, recarga e reload. Executar contra o servidor estático e, com MARE_EXPECT_API=1, contra a API local.
- Regressões gerais Node/Python e python tools/build_pages.py.

A API opcional valida os contratos usando o mundo informado pelo cliente, como as frutas existentes. Não representa um servidor PvP autoritativo. O preview GitHub Pages executa a mecânica local, sem exigir a API Python. Saves e banco de QA são isolados e ficam fora do repositório.

## Resultado da entrega — 26/10/2026

86 suítes Node passaram; 108 testes Python de backend/arte e quatro testes de hierarquia passaram. Navegador: Ryu na versão estática, com API e no pacote Pages; regressões de Lobo e transições Zoan passaram. A suíte Ryu também verifica cancelamento por morte e remoção da fruta. Build Pages concluído.
