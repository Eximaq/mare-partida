# Hoya-Hoya no Mi — Rank B

Atualização de 25/10/2026, branch feature/hoya-genie-beta-aura, base origin/main f6d1232 (PR113).

## Equipamento

Paramecia adicionada ao fim do catálogo, sem mudar índices antigos. Lore e ícones fornecidos pelo proprietário. Passivos iniciais: +180 HP, +20 ataque físico, +20 ataque especial, +5% velocidade de movimento. Fonte compartilhada: assets/akuma/hoya/rules.json. Compêndio e saves mantêm o contrato atual.

## Invocação Majin

- Tecla 1: 60 energia, 90s de recarga, duração máxima de 60s. Durante a invocação, o mesmo botão/atalho passa a Cancelar Gênio, sem custo. Cancelar remove entidade, comando, ataque pendente, buff, portal e proteção; o personagem volta ao normal e a recarga original das duas habilidades continua contando. O botão passa a Reconjurar; uma nova invocação custa 60 energia e só ocorre após a recarga, com 60s novos e estado limpo.
- Instancia o Gênio em espaço livre ao lado do jogador. Seus atributos numéricos são uma fotografia de 150% dos atributos totais atuais do jogador. Mantém os tetos de crítico, evasão, precisão, penetração, roubo de vida e mitigação do sistema.
- Clique no chão: navegação com colisão. Clique no inimigo: aproximação e ataques físicos com a animação original de arma longa. Impacto único a 55% da animação; velocidade de ataque retima a sequência sem repetir dano.
- Caster fica parado, inalvejável, invulnerável a dano físico/especial/direto e livre de debuffs. A câmera acompanha o Gênio; inimigos perseguem e atacam a invocação. Ataques e habilidades de classe do jogador ficam suspensos durante o controle.
- VFX power-aura-take-7 cobre o corpo do invocador durante a invocação.
- Vida própria da invocação; derrota, expiração, troca de fruta/mapa ou reinício encerram a proteção e os VFX. A morte do Gênio não transfere dano para o jogador.

## Majin Saidan

- Tecla 2: 35 energia, 24s de recarga, 10s de duração. Botão bloqueado sem Gênio ativo.
- Dobra os atributos atuais do Gênio (300% da fotografia do jogador) e preserva a fração de vida na entrada/saída.
- Tamanho natural 96px, maior que o personagem de aproximadamente 74px. Buff cresce suavemente em 300ms para 144px e retorna ao normal. Idle, deslize e ataque usam a mesma referência nativa de 64px, inclusive nas folhas com espaço adicional para a arma.
- power-aura-take-6 fica atrás do Gênio em loop e acompanha a escala durante o buff. O centro foi elevado de 48px para 64px acima dos pés, multiplicado pela escala: o limite inferior da folha coincide com os pés, cobrindo o corpo sem sobras visíveis abaixo.

## Arte e reprodução

PixelLab: personagem existente Genio Hoya, ID 5d3f6ff4-657d-4668-865a-1f677a4f279b. Reutilizado sem gerações pagas. Animações originais Glide_forward_with_a_smooth_floating_motion_swayin e Wind_up_the_heavy_polearm_overhead_then_swing_it_v; 17 frames por direção, quatro direções e quatro poses paradas: 140 frames. Pivô estável nos pés; pixels originais, sem redimensionar as fontes.

Importador tools/import_hoya_assets.py recebe a pasta de fontes e o ZIP exportado. Manifesto assets/akuma/hoya/manifest.json registra hashes de fontes e frames. Nenhum ZIP bruto, caminho pessoal, save ou captura é publicado. A aura atual da Beta usa energy-orb-take-3: 25 frames de 64×64, 83ms, importados sem alterar bytes. Passiva e prisão da Skill 2 usam o mesmo VFX de 96×96, integralmente à frente da entidade, base opaca na linha dos pés; feixe preservado.

## Cliente e serviço

hoya-data.js/hoya-system.js: atributos, estado, escala e renderização. game.js integra controles, IA e ciclo de vida. server/hoya.py valida energia/recarga, proprietário, instância, requisito da Skill 2, distância, instante do impacto e uso único do token. Rotas hoya-command, hoya-attack, hoya-impact, hoya-damage e hoya-cancel. O cancelamento valida a instância e não altera energia nem registros de recarga. Recargas persistem no SQLite; entidades e proteção não sobrevivem ao reload. Preview estático executa as mesmas regras localmente.

Limitação herdada: mundo/posições/atributos e dano recebido são informados pelo cliente no protótipo local. O serviço não é uma simulação MMORPG autoritativa nem deve ser exposto como tal.

## Validação e reversão

Testes próprios: tests/hoya-system.test.cjs, tests/hoya_backend_test.py, tests/hoya_browser.cjs. Cobrem escala em todas as poses, atributos, fração de HP, recargas/requisito, impacto único, expiração, proteção, cliques, aggro, derrota, retirada e reload. Regressões Beta/Hana incluem a nova aura, tether, quatro socos, frame 13, cinco ticks e soltura.

Saves antigos continuam válidos; o estado transitório não é salvo. Reversão: reverter o commit desta branch; o Compêndio preserva IDs desconhecidos sem conceder habilidades.

Resultado desta atualização: 77 arquivos Node e 91 testes Python passaram; navegador em 1920×1080, 1366×768 e 1280×720, incluindo preview estático e API local; 20 abates pelo Gênio no cenário isolado, regressões Beta/Hana e Supa aprovadas. Build Pages e verificação de diff sem erros. Capturas recentes ficaram fora do Git.

As durações também respeitam o relógio real para que deixar a aba em segundo plano não prolongue invocação/proteção ou buff.

Correção de 25/10/2026 sobre PR114: cancelamento pelo botão/atalho 1, reconjuração somente após recarga e aura do buff elevada. Regressões: 77 arquivos Node, 92 testes Python, navegador em três resoluções e preview Pages aprovados, incluindo cancelamento sem energia e preservação dos prazos de cooldown.
