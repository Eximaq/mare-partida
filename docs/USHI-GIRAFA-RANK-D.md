# Ushi-Ushi no Mi: Modelo Girafa — Rank D

Zoan adicionada ao terceiro espaço do Registro D e ao final de `itemDefs` (índice 77). Os índices anteriores permanecem iguais. O registro usa a concessão de demonstração existente, sem nova tabela de drop, e o bônus permanente padrão do Compêndio. A descrição, a fruta e os dois ícones são os fornecidos pelo proprietário.

## Transformação e apresentação

Equipar ativa a Girafa; **T** alterna com a forma humana. Retirar ou substituir a fruta restaura o humano. O save conserva a forma escolhida e as recargas, sem guardar buffs temporários. Retratos e prévias usam escala própria para caber no quadro.

O personagem existente do PixelLab é **Ushi-Ushi no Mi: Girafa**, ID `f7a9fca3-6336-42f6-91cb-9fb31e46bb64`. Foram importados 84 frames originais nas quatro direções do jogo: idle (1), Walking (8), Roundhouse Kick (7) e Picking Up (5), por direção. Não houve novas gerações nem consumo de créditos. Os PNGs de origem foram centralizados em células transparentes de 96×96, sem resampling; pés e hashes RGBA estão em `clips.json`.

Escala nominal de mapa: **112 px**, 16 abaixo dos 128 px do Leopardo aprovado. A escala é 112/64 sobre a arte nativa, com ancoragem nos pés e nome/barra de vida elevados 32 px. O ataque básico usa os sete frames de **Roundhouse Kick (beta)** a 12 FPS, sem reiniciar um ciclo ainda em execução. Alcance básico de 96 px; não concede bônus permanente de atributos.

## Habilidades

| Tecla | Habilidade | Energia | Recarga |
|---|---|---:|---:|
| 1 | Chicote de Marfim | 26 | 12 s |
| 2 | Fúria Selvagem | 30 | 22 s |

Exigem forma de Girafa e combate ativo. Custos/recargas são o balanceamento inicial adotado para este lote. Ativações locais inválidas não consomem energia nem iniciam recarga.

### Chicote de Marfim

Seleciona um único alvo vivo a até 128 px com linha de visão e orienta o jogador para ele. **Picking Up (beta)** reproduz cinco frames a 12 FPS; impacto único em 250 ms e término em aproximadamente 417 ms. A movimentação e ataques concorrentes ficam bloqueados nesse intervalo. Trocar a seleção não troca a vítima; alvo morto, fora de alcance ou atrás de obstáculo no impacto não recebe o golpe. Controle incapacitante cancela a ação.

O dano segue a fórmula física atual: `max(1, floor(ATQ × 1,8 − DEF efetiva × 0,7 × 0,30))`. A Fúria Selvagem não amplifica esta habilidade. Após um acerto não letal, tenta deslocar a vítima 64 px no sentido oposto ao jogador. O trajeto inteiro é verificado em passos de 8 px contra terreno, objetos sólidos e outros monstros. Se qualquer trecho estiver bloqueado, não há deslocamento parcial. O dano ainda é aplicado.

### Fúria Selvagem

Buff pessoal de **5000 ms**, com relógio real: reduz em 40% todo dano que chegaria à vida, inclusive físico, elemental e direto. Não elimina invulnerabilidades/esquivas existentes. Aumenta em 25% somente o dano final dos ataques básicos da Girafa; não altera atributos permanentes nem o dano das habilidades.

O VFX fornecido `effect.png`/`effect.json` usa oito frames de 35×61 a 83 ms cada (ciclo de 664 ms), com origem (18,29). Desenhado sobre o corpo, acompanha a posição do jogador e repete enquanto o buff estiver ativo. Expirar, morrer, sair da forma, retirar/substituir a fruta ou trocar a sessão/mapa remove os efeitos; reativar a forma não restaura o buff anterior. A recarga permanece.

## Arquitetura e reprodução

- `ushi-system.js`: regras de impacto/knockback/buff, seleção de frames e renderização. `ushi-rules.js` e `ushi-art-data.js` embutem os dados para compatibilidade com abertura direta do HTML.
- `assets/akuma/ushi/`: regras JSON, atlas, fonte VFX original, ícones e proveniência. `tools/import_ushi_assets.py` reimporta o ZIP existente e a pasta de anexos; ambos os caminhos são argumentos, sem dados pessoais gravados no repositório.
- `server/akuma.py`: cadastro, migração aditiva SQLite, transformação, validação de alvo/alcance/energia/recarga, dano e buff. A rota `/api/akuma/basic` calcula o bônus básico; `/damage` aplica a resistência de qualquer fonte.
- O protótipo continua simulando o mapa no cliente: impacto real, vida dos monstros e colisão do empurrão são resolvidos no navegador. A API recebe atributos/posições informados pelo cliente, como nas demais frutas; não é combate multiplayer autoritativo. O estado do buff é encerrado ao sincronizar uma nova sessão do cliente.

## Verificação

- `node tests/ushi-system.test.cjs`: cadastro, parâmetros, penetração, expiração, bônus básico, caminhos bloqueados, seleção de todos os frames, pés e origem VFX.
- `python tests/ushi_artwork_test.py`: bytes dos anexos e hashes dos pixels dos 84 frames originais.
- `python tests/ushi_backend_test.py`: cadastro, transformação, custos, recargas, dano, resistência e cancelamentos.
- `node tests/ushi_browser.cjs`: fluxo real de registro/equipamento, quatro direções, impacto/empurrão, bloqueio de movimento, buff, dano básico versus skill, obstáculo real do mapa, morte/transformação e reload. Aceita `MARE_TEST_URL`, `MARE_TEST_WIDTH` e `MARE_EXPECT_API=1`; evidências ficam fora do Git via `MARE_QA_DIR`.
- Regressão completa Node, suites Python de Akuma/Supa/Neko, navegador Neko e build Pages.
