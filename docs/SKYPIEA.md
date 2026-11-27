# Skypiea — novo mapa celestial

## Cenário atual — 27/11/2026

O proprietário autorizou a criação de um mapa novo para substituir o cenário dos quatro destinos existentes. A arte mostra uma ilha sobre o mar de nuvens, com caminhos de pedra em circuito, praça central, jardins, ruínas de Shandora, entrada alada, grandes cipós e sino dourado. A mesma imagem é usada no mundo, nos quatro cards e no fundo da seleção de Skypiea.

- Imagem original: `assets/skypiea/celestial-island/scene.png`, 1536 × 1024 pixels, sem alteração dos pixels gerados.
- Mundo: **4608 × 3072 unidades**, escala inteira 3×, desenho sem suavização.
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

Os quatro destinos chegam em **(1296, 2190)**, ao lado do círculo turquesa. O retorno clicável fica em **(1068, 2190)**, separado da chegada para evitar uma saída imediata. A malha de navegação usa células de 16 unidades e a pegada existente de 32 × 20.

A borda caminhável segue o chão da imagem. Céu, casas e o santuário além da praça ficam bloqueados. As colunas e pilares do portal têm colisão nos pés; seus recortes poligonais são redesenhados pela fila de profundidade usando os próprios pixels da cena. A imagem completa continua visível fora da área caminhável: a máscara de movimento nunca recorta o céu.

O vento e as partículas azul-celeste continuam no pool de `ambient-weather.js`, respeitando movimento reduzido e qualidade. Não há geração de cenário ou imagens durante o combate.

## Saves e servidor

O save offline mantém IDs e progresso. Ao reabrir o jogo, a entrada continua no porto; ao viajar novamente para Skypiea, o mundo usa a nova chegada e conserva os respawns salvos. Não houve mudança na chave de armazenamento ou concessão de recursos.

A migração aditiva `0065_skypiea_celestial_map.sql` atualiza apenas assinaturas conhecidas e reposiciona personagens que estavam nos quatro mapas substituídos. Caminhos antigos são cancelados. O upgrade de combate reancora encontros, inclusive extras de party, preservando identidade, HP, mortos/vivos, respawns e progresso. Ataques transitórios do cenário anterior são cancelados. Áreas externas e hashes desconhecidos não são realocados.

A publicação estática não executa migrações no banco de produção. A etapa 0065 acompanha o código para implantação do servidor online.

## Verificação específica

- `node --test tests/skypiea.test.cjs tests/skypiea-expansion.test.cjs tests/skypiea-scene-compat.test.cjs`
- `tests/skypiea_browser.cjs`: quatro destinos, arte real em escala 3×, combate, retorno por clique, reload e viewport estreito.
- `tests/integration/server-skypiea-scene.test.mts`: migração real em PostgreSQL, preservação e idempotência.
- Workflow `.github/workflows/skypiea.yml`: verificação focada desta substituição.

## Histórico

Os exports anteriores continuam preservados em `assets/skypiea/`, incluindo `anjos/`. Os scripts `tools/import_skypiea.py` e `tools/import_skypiea_expansion.py` são importadores históricos e sobrescrevem o catálogo de mapa quando executados; não fazem parte do build do novo cenário. O PR #377 não foi reaplicado: suas alterações de equipamentos, economia e balanceamento não pertencem a esta substituição.
