# Rank A — Ope Ope no Mi, Mero Mero no Mi e HUD de três habilidades

Base: main em c4b7cf6, após PR159. Branch: feature/rank-a-ope-mero.

## HUD e persistência

A HUD aceita habilidades nas teclas 1, 2 e 3, incluindo o terceiro slot das novas frutas Rank A e de futuros catálogos Rank S com três habilidades. As habilidades antigas, inclusive a tecla 3 do Dachshund, permanecem disponíveis. Cooldowns e contadores da sessão têm três posições; a recarga persistente das frutas continua indexada por ID e habilidade.

Os itens novos foram anexados ao catálogo: nenhum índice anterior mudou. Registro no Compêndio, equipamento, ícones, tooltips, criação, aventura normal e DEV usam o sistema existente. As recargas sobrevivem ao reload. ROOM, controles e impactos pendentes são temporários e não entram no save; mudança de fruta/área, morte e reload limpam estados incompatíveis. Controles de outros sistemas não são apagados.

## Regras

| Habilidade | Dano/efeito | Energia | Recarga inicial |
|---|---|---:|---:|
| ROOM | Redoma fixa no ponto do lançamento, raio 320 px; +30% ataque físico/especial, defesa física/mágica e velocidade de ataque | 50 | 45s |
| Shambles | Troca posições válidas dentro da ROOM, 200% físico e stun 2s | 20 | 6s independente |
| Tact | 350% físico, raio 128 px em torno do alvo | 40 | 14s |
| Gamma Knife | 450% mágico; defesa, escudos e mitigação ignorados integralmente | 55 | 20s |
| Mero Mero Mellow | 250% especial, cone frontal até 192 px; petrificação 3s | 35 | 14s |
| Beijo Pistola | 350% físico perfurante, projétil até 256 px; stun 1,5s e −20% defesa física por 4s | 30 | 10s |
| Chuva de Amor | 250% especial, raio 256 px ao redor do alvo; petrificação e −20% defesa física por 5s | 50 | 22s |

Um tile equivale a 64 px. Custos, recargas, tipo físico dos golpes Ope sem tipo especificado e redução de defesa de 20% da Chuva são parâmetros iniciais dos campos não definidos no pedido. Estão centralizados em assets/akuma/rank-a-rules.json. Os multiplicadores e durações especificados pelo proprietário foram mantidos.

A ROOM reproduz os quadros humanos 1–25 a 100 FPS (250 ms) e mantém estritamente os quadros 26–29 (índices 25–28), 83 ms por quadro, por 30 segundos. Não volta ao início durante o loop. O prazo real impede prolongamento ao deixar a aba pausada. Só o lançamento de ROOM cria a redoma e o texto laranja ROOOM!, com duração de 2s; nenhum outro golpe repete essa ativação ou renova sua duração. Shambles ocupa o primeiro slot apenas durante a ROOM ativa, sem apagar a recarga original.

Tact cresce visualmente até o raio final e encerra seus 29 quadros em 600 ms, junto ao único impacto de dano. Gamma reproduz seus 25 quadros em 1,8s, ancorada no torso pelo pivot original; sua camada fica atrás do alvo para preservar a leitura corporal. Não aplica deduções de defesa, escudo, mitigação ou Logia. Proteções de alvo indisponível/inalvejável e retorno de monstros continuam válidas.

Mellow cresce na direção do olhar: largura de um tile a um tile de distância, dois tiles a dois e três na ponta; cada vítima recebe um único acerto, sem atingir atrás do usuário. Beijo acompanha o alvo e só causa dano na colisão. Chuva aplica o dano e os controles uma vez na área do alvo principal. Debuffs preservam a defesa base e expiram sem acumular redução permanente.

## Arte e desempenho

Os 15 PNGs (nove ícones e seis folhas) e seis JSONs fornecidos foram importados sem alteração de bytes. Total: 158 quadros. A escolha de power-aura-take-16 para Mellow, em lugar do take-18 citado no texto, foi confirmada pelo proprietário. Nenhuma arte foi gerada ou substituída.

- Importação reproduzível: python tools/import_rank_a.py CAMINHO_DA_PASTA_RANK_A.
- Origem e hashes: assets/akuma/rank-a-manifest.json.
- Metadados do navegador: rank-a-data.js, derivados dos retângulos, durações e pivots originais.
- Somente as três folhas da fruta selecionada são preparadas; falhas ficam memorizadas, sem pedidos repetidos. Uma falha impede consumo de energia/recarga e informa o jogador.
- Jobs visuais limitados a 32; rastro de Shambles dura 250 ms. Nenhuma criação de canvas ou leitura de pixels por frame foi adicionada.
- A petrificação conserva a trava, o indicador de controle e a quebra de defesa. O filtro cinza foi avaliado separadamente e a entrega usa a alternativa de desempenho autorizada, sem filtro por frame.

Ensaio de desenho no Chrome 156, 1366×768, CPU 2×: quatro rodadas alternadas na mesma cena/pose, 140 amostras úteis por opção. Com filtro cinza, p99 de CPU de desenho = 35,4 ms e máximo = 36,0 ms; sem filtro, p99 = 25,8 ms e máximo = 29,1 ms. A cadência observada foi 47,2 versus 48,8 FPS. Isso fundamenta a escolha de manter os indicadores e dispensar o filtro; não representa garantia de FPS em outros cenários/hardware. A ROOM continua usando os quatro quadros originais em loop, sem gerar canvases por frame.

A revisão encontrou conversão indevida de quebras de linha de metadados antigos pelo checkout Windows. .gitattributes agora preserva os JSONs de combat-vfx e das duas novas frutas. Os bytes versionados antigos e todos os PNGs anteriores foram mantidos.

## API opcional e segurança de execução

server/rank_a.py compartilha o catálogo JSON e valida energia, recarga, posição, área e impactos com token de uso único por vítima. ROOM e Shambles têm chaves distintas. O endpoint de atributos aplica o mesmo buff e o remove ao expirar. A inicialização da API é compartilhada; uma solicitação nova aguarda a sincronização antes de lançar uma habilidade. Energia, fruta, alvo e contexto são conferidos novamente após carregamentos assíncronos.

Esse serviço conserva a arquitetura local existente: o mundo ainda é simulado no cliente. Não constitui um servidor PvP autoritativo. O pacote estático funciona sem API e reutiliza as mesmas regras e assets.

## Validação

- Motor: loop exclusivo 26–29, prazo de 30s, Shambles, posições válidas, impactos únicos, áreas/cone, duração dos controles, redução de defesa e cancelamento.
- Teste explícito: os outros cinco golpes não criam ROOM nem renovam uma já ativa; Shambles não repete o texto. As prévias limpam corretamente efeitos da cena anterior.
- Navegador: os seis golpes, buff exato de 30%, três botões/atalhos, tooltips dinâmicos, dano no instante correto, Gamma contra defesa/escudo elevados, petrificação bloqueando movimento, ícones de controle/defesa e reload das recargas.
- Telas: 1920×1080, 1366×768, 1280×720, 393×852 e 320×568, com os três botões dentro da viewport.
- API: cenário com resposta inicial atrasada, recargas independentes, custos, impacto antecipado/repetido rejeitado, Gamma absoluta, área de Chuva e buff temporário; sem respostas de erro nos fluxos válidos.
- Caçada nativa em personagem de teste Nv.20 e distribuição válida de 95 pontos: Ope, 21 abates/248 XP/684 moedas em 100s simulados; Mero, 20 abates/237 XP/631 moedas em 90s simulados; nenhuma queda. Sem adicionar spawns artificiais nessa etapa.
- Suíte completa Node: 204 testes; suíte Python: 138 testes. Build estático verificado. Registros de falhas iniciais e correções: expectativa de catálogo/entrada mobile atualizada para os módulos novos, build executado antes da validação de portal e preservação de bytes no Windows.
- Evidências de teste e bancos ficaram fora do repositório.

## Arquivos e manutenção

Implementação: game.js, akuma-system.js, rank-a-system.js, rank-a-data.js, server/rank_a.py, server/akuma.py, server/app.py, index.html, ui-preview.html e tools/build_pages.py. Arte: pastas assets/akuma/ope e mero, catálogo e manifesto rank-a. Ferramenta: tools/import_rank_a.py. Testes: rank-a-system.test.cjs, rank_a_browser.cjs, rank_a_backend_test.py, rank_a_artwork_test.py e expectativa append-only de akuma-system.test.cjs. CI dedicado: .github/workflows/rank-a-skills.yml.

As fases têm commits próprios. Um revert da integração restaura o comportamento anterior sem renumerar itens existentes. Próximo ajuste recomendado: balanceamento dos custos e recargas iniciais após avaliação no jogo; novos conteúdos Rank S podem reutilizar os três slots sem criar outra HUD.
