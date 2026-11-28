# Skypiea — mapa celestial em 4K

## Cenário atual — 27/11/2026

O proprietário autorizou a criação de um mapa novo para substituir o cenário dos quatro destinos existentes. A arte mostra uma ilha sobre o mar de nuvens, com caminhos de pedra em circuito, praça central, jardins, ruínas de Shandora, entrada alada, grandes cipós e sino dourado. A mesma imagem é usada no mundo, nos quatro cards e no fundo da seleção de Skypiea.

- Imagem atual: `assets/skypiea/celestial-island/scene-4k.webp`, **4096 × 2731 pixels**. Nove trechos de 1536 × 1024 foram gerados com detalhe novo a partir de recortes sobrepostos de 576 × 384 da composição original, depois montados sem ampliar esses trechos. As junções seguem regiões de menor diferença e o céu recebe transição de cor suave.
- Arquivo do jogo: **10.558.968 bytes**, WebP near-lossless sem subamostragem de cor; diferença máxima de 4/255 por canal frente ao PNG master preservado, com PSNR de 42,27 dB. A otimização mantém a resolução inteira.
- Mundo: **4608 × 3072 unidades**, preservando o tamanho dos personagens. A ampliação horizontal da textura caiu de 3× para **1,125×**; a textura contém aproximadamente **7,1 vezes** mais pixels. O renderer usa as dimensões reais da imagem e continua sem suavização.
- A grade de projeto de 1536 × 1024 e seu fator 3 continuam definindo as coordenadas do mundo; não representam a resolução da textura atual.
- Proveniência, prompt e SHA-256: `assets/skypiea/celestial-island/provenance.json`.
- Dados: `skypiea-map-data.js`; renderer e mapas: `skypiea-world.js`.
- Uma imagem compartilhada e carregada sob demanda; nenhuma cópia por destino e nenhuma requisição por frame.

## Quatro destinos preservados

| ID | Nome | Faixa | Adversário | Nível |
| --- | --- | --- | --- | ---: |
| `skypiea-01` | Ilha dos Anjos | 75–80 | Satori | 77 |
| `skypiea-02` | Ilha dos Anjos 2 | 80–85 | Shura | 84 |
| `skypiea-03` | Ilha dos Anjos 3 | 85–90 | Gendatsu | 88 |
| `skypiea-04` | Ilha dos Anjos 4 | 90–95 | Ohm | 95 |

Cada destino mantém seis encontros e os IDs `skypiea-0N-0` a `skypiea-0N-5`. Os setores e pontos de encontro acompanham as novas praças; progresso de caça, respawns, desbloqueios, atributos, XP e drops continuam nas regras existentes. Os sacerdotes permanecem fora da rotação de Impel Down.

## Navegação e profundidade

Os quatro destinos chegam em **(534, 2604)**, no caminho de pedra diante do portão alado: centro do X marcado pelo proprietário, equivalente a (178, 868) na grade de projeto. A passagem pelo portão dá acesso ao restante da ilha. O retorno clicável continua em **(1068, 2190)**, no círculo turquesa. A malha de navegação usa células de 16 unidades e a pegada existente de 32 × 20.

A borda caminhável segue o chão da imagem. Céu, casas e o santuário além da praça ficam bloqueados. As colunas e pilares do portal têm colisão nos pés; seus recortes poligonais são redesenhados pela fila de profundidade usando os próprios pixels da cena. A imagem completa continua visível fora da área caminhável: a máscara de movimento nunca recorta o céu.

O vento e as partículas azul-celeste continuam no pool de `ambient-weather.js`, respeitando movimento reduzido e qualidade. Não há geração de cenário ou imagens durante o combate.

## Saves e servidor

O save offline mantém IDs e progresso. Ao reabrir o jogo, a entrada continua no porto; ao viajar novamente para Skypiea, o mundo usa a nova chegada e conserva os respawns salvos. Não houve mudança na chave de armazenamento ou concessão de recursos.

A migração aditiva `0065_skypiea_celestial_map.sql` atualiza apenas assinaturas conhecidas e reposiciona personagens que estavam nos quatro mapas substituídos. Caminhos antigos são cancelados. O upgrade de combate reancora encontros, inclusive extras de party, preservando identidade, HP, mortos/vivos, respawns e progresso. Ataques transitórios do cenário anterior são cancelados. Áreas externas e hashes desconhecidos não são realocados.

A migração `0066_skypiea_hd_arrival.sql` acompanha esta melhoria visual e a mudança da chegada. Ela promove somente a assinatura conhecida: não muda posições, caminhos, velocidades ou relógios dos saves atuais. O upgrade de combate desta versão também promove somente a assinatura, preservando ataques pendentes, projéteis, HP, cooldowns e respawns. A nova chegada vale para as próximas viagens. A migração histórica 0065 permanece intacta.

A publicação estática não executa migrações no banco de produção. As etapas 0065 e 0066 acompanham o código para implantação do servidor online.

## Verificação específica

- `node --test tests/skypiea.test.cjs tests/skypiea-expansion.test.cjs tests/skypiea-scene-compat.test.cjs`
- `tests/skypiea_browser.cjs`: quatro destinos, resolução real da arte, chegada marcada, passagem pelo portão, combate, retorno por clique, reload e viewport estreito. Os recortes usam a proporção real entre textura e mundo.
- `tests/integration/server-skypiea-scene.test.mts`: migração real em PostgreSQL, preservação e idempotência.
- Workflow `.github/workflows/skypiea.yml`: verificação focada desta substituição.

## Histórico

Os exports anteriores continuam preservados em `assets/skypiea/`, incluindo `anjos/`. Os scripts `tools/import_skypiea.py` e `tools/import_skypiea_expansion.py` são importadores históricos e sobrescrevem o catálogo de mapa quando executados; não fazem parte do build do novo cenário. O PR #377 não foi reaplicado: suas alterações de equipamentos, economia e balanceamento não pertencem a esta substituição.
