# Beri-Beri: seis esferas (visual v2)

Atualização visual solicitada pelo proprietário do Kaizoku Idle, a partir da prévia criada com os assets reais do jogo. Não altera regras de combate nem o formato dos saves.

## Assets

- `assets/akuma/beri-skill-sheet-v2.webp`: 1152×1152, grade 6×6, 36 quadros de 192×192, 24 FPS. Âncora normalizada (0.5, 0.75), posicionada nos pés do personagem. Duração visual de 1,5 segundo.
- `assets/akuma/beri-skill-icon-v2.webp`: 96×96.
- Ambos são conversões WebP sem perdas dos PNGs da prévia fornecida nesta tarefa. SHA-256 dos arquivos: sheet `c5807e67684e2242ae7fbcf973ac1b348f118808cc44755317b5b7d9fbda2ead`; icon `f33bc990bdc5684f8712a7f08f303a89e1b97e20ddd0f24a04d71ca0f6440818`.
- Nenhuma requisição a serviços de arte externos é necessária no jogo. A transferência temporária dos assets foi removida da árvore final.

## Integração

`akuma-system.js` define metadados opcionais de tamanho, âncora e FPS somente para Beri. `game.js` os utiliza no leitor de spritesheets. Frutas sem esses metadados mantêm células de 48×48, âncora (0.5, 1) e 12 FPS. O retrato preserva seus limites anteriores; o fallback de seis partes capturadas do personagem permanece disponível durante indisponibilidade da imagem.

Permanecem intactos: invulnerabilidade de 1,5 segundo, empurrão original, consumo de energia, recarga, regras online/offline, equipamento, HUD, modelos de personagem, progresso e saves.

## Verificação

- `node --check game.js` e `node --check akuma-system.js`.
- `node --test tests/beri-visual-v2.test.cjs`: seis casos cobrindo leitura de célula, âncora, FPS, limites, fallback e retrato; confirmados falhando antes e passando depois da mudança.
- `npm test`: 232 casos foundation e 169 arquivos de testes legacy aprovados na integração. A suíte legacy informa que `supa-browser.test.cjs` requer seu próprio harness, não incluído nessa contagem.
- `python3 tests/akuma_backend_test.py`: seis testes aprovados.
- `python3 tools/build_pages.py`: build concluído.
- Renderização isolada das funções reais em Chromium: leitura do WebP, 15 posições da sequência e ícone verificados sem erros de JavaScript; isso não substitui um ensaio multiplayer.

## Teste manual e reversão

Com Beri-Beri equipada, entrar em uma área de combate e ativar Divisão Esférica. Confirmar expansão das seis esferas, retorno do personagem e manutenção da recarga. Recarregar a página após a publicação se estiver com código antigo em cache.

Para reverter, desfazer apenas o commit squash deste PR e publicar novamente. Os PNGs anteriores continuam no repositório, e a alteração não migra nem apaga saves. Não usar reset ou force-push sobre alterações de outras pessoas.
