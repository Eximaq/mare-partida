# Rank S — Yami-Yami e Mera-Mera

Base: c24f885 (PR165 integrado), branch feature/rank-s-yami-mera. Duas frutas S adicionadas ao final do catálogo, preservando IDs e índices anteriores. Três habilidades nos atalhos 1/2/3, com energia e recargas persistentes, pela mesma HUD e pelo controlador avançado de frutas existente.

## Proporções aprovadas em 31/10/2026

Após a prévia, o proprietário pediu redução de 40% no tamanho e alcance das três habilidades Yami e aumento de 40% no pilar Hibashira e em seu alcance de contato. A aura passiva foi apresentada separadamente e aprovada. Um tile corresponde a 64 px.

| Habilidade | Área / comportamento | Energia | Recarga |
|---|---|---:|---:|
| Vórtice Negro | Raio 153,6 px (2,4 tiles); 400% mágico, atração física de 0,18s e silêncio Akuma de 5s | 45 | 18s |
| Black Hole | Poça fixa de raio 115,2 px (1,8 tile) por 6s; −80% movimento enquanto ocupada e seis ticks de 250% mágico | 55 | 24s |
| Liberation | Raio 153,6 px; duas ondas de 400% e 300% mágico, empurrão de 96 px por onda | 65 | 30s |
| Punho de Fogo | Linha de 320 px (5 tiles), meia largura 32 px, velocidade 900 px/s; 450% mágico e queimadura | 45 | 14s |
| Chuva de Fogo | Detecta alvos até 256 px (4 tiles); cinco quedas de 130% mágico, intervalo 0,12s, queda 0,25s | 50 | 20s |
| Hibashira | Pilar perseguidor por 7s, velocidade 360 px/s, contato em raio 67,2 px; 450% mágico, empurrão e queimadura | 70 | 32s |

Dimensões do desenho: Vórtice 307,2×307,2; Black Hole 230,4×230,4; Liberation 307,2×288; Punho 150×110; cada meteoro 52×58; Hibashira 179,2×235,2 px. Área lógica e arte usam as mesmas regras de proporção; o tamanho do atlas inclui transparência. O contato de Liberation usa o ponto de chão nativo (62,100), evitando deslocar a explosão abaixo dos pés.

Custos/recargas, raio inicial de Liberation, empurrões, velocidades e intervalo de contato do pilar são parâmetros iniciais para campos não especificados no pedido. Dano elemental genérico foi tratado como mágico. O pilar tem intervalo de 1s por vítima, evitando dano a cada quadro. A procura do inimigo mais próximo segue o mapa; o aumento de alcance foi aplicado ao raio de contato. Não há limite de detecção adicional inventado para esse pilar.

Queimadura captura 10% do poder elemental base por segundo durante 4s. Contatos renovam a duração sem acumular várias queimaduras nem reiniciar sua cadência. O atlas de status aparece sobre todas as vítimas queimando. Chuva fixa a posição de cada queda ao soltá-la e permite esquiva; usa um único meteoro do atlas por projétil lógico, sem multiplicar a quantidade visual de tiros.

## Quadros e arte

26 arquivos fornecidos preservados byte a byte: 17 PNGs e nove JSONs, total de 361 quadros nativos. Nenhuma geração paga ou substituição da arte original. O importador tools/import_rank_s.py registra origem e SHA-256 em assets/akuma/rank-s-manifest.json. O ícone Yami veio no arquivo fornecido com nome Crie itens baseado na imagen … (3).png; o destino é assets/akuma/yami/fruit.png.

- Aura Mera: loop humano 1–35 (índices 0–34), excluindo dissipação. Aura Yami usa os primeiros 35 quadros estáveis, sem a cauda de desaparecimento.
- Âncoras das auras derivadas uma vez dos pixels do anel inferior, com estabilização dos quadros em que uma pequena abertura entre chamas seria confundida com o centro. Sem leitura de pixels durante o jogo. Parte inferior do anel é composta à frente do personagem.
- Vórtice: 41 quadros acelerados para 0,6s; aplicação sincronizada ao índice 20, seguida do puxão físico. Silêncio bloqueia apenas Akuma, preservando ataque básico e habilidades de classe.
- Black Hole: introdução de 0,5s; loop humano 20–41 (índices 19–40) até completar 6s. Centro não acompanha o usuário.
- Liberation: impactos nos índices 1 e 26, em 0,083s e 2,158s, uma aplicação por onda/vítima.
- Punho: varredura de colisão ao longo da linha, limitada por obstáculos e alcance. Pilar usa navegação com revisão de rota a cada 0,3s, troca de alvo quando necessário e atlas Espiral efetivamente desenhado.

## Arquitetura e compatibilidade

rank-s-system.js é um módulo filho do gateway rank-a-system.js; rank-s-data.js reúne regras e metadados derivados. O gateway compartilha casts, HUD, custo, recarga e dano, mantendo seu conjunto de regras A separado para não mudar o rank do catálogo. Novas entradas são append-only. Auras são carregadas por fruta equipada; não se inventou imunidade Logia ou bônus passivo de atributos.

server/rank_s.py integra o serviço opcional existente. Valida tokens por dono/instância, energia, recarga, alcance, índices e duplicatas. Queimadura exige contato inicial válido e respeita cadência. Eventos não-DoT incluem idade lógica do efeito, limitada ao tempo real decorrido, para suportar atraso de renderização sem aceitar quadros futuros. A expiração do token continua real. Isso não transforma a simulação local em combate multiplayer autoritativo.

Filas limitadas a 32 efeitos e 128 queimaduras por sessão. Morte, transição e troca de fruta limpam efeitos incompatíveis. Saves preservam fruta/Compêndio/recargas; jobs, rastros, queimaduras e callbacks não são persistidos. ROOM e ROOOM! continuam exclusivos do lançamento de ROOM.

## Validação

- Node: 233/233 testes da suíte completa .test.cjs aprovados; contratos específicos de frames, colisão, limites novos, queimadura renovada, silêncio, pilar e âncora de Liberation.
- Python: suíte completa de 157 testes aprovada, incluindo 10 testes do serviço S e três de integridade artística.
- Navegador Chrome: seis habilidades com API e em dist, duas auras, cinco viewports (1920×1080, 1366×768, 1280×720, 393×852 e 320×568), três slots junto com Haki, save/reload e limpeza ao sair, sem erros JavaScript ou erros de API nos fluxos válidos.
- Regressões Ope/Mero e Bari/Doku/Ito passaram no navegador após integrar o gateway S.
- Caçada nativa Nv.20 com 95 pontos válidos em INT: Yami 20 abates/220 XP/644 moedas em 74s simulados; Mera 20/237/710 em 131s; nenhuma queda. Esse ensaio ocorreu antes do ajuste visual/de alcance aprovado; os novos limites foram revalidados por testes de borda e navegador.
- python tools/build_pages.py e git diff --check. Capturas e banco de QA privados, fora do repositório. Workflow dedicado: .github/workflows/rank-s-skills.yml.

Arquivos principais: rank-s-system.js, rank-s-data.js, assets/akuma/rank-s-*.json, assets/akuma/yami, assets/akuma/mera, server/rank_s.py, gateway rank-a, catálogo akuma, game.js, entradas HTML, importador e build. Testes: rank-s-system.test.cjs, rank_s_backend_test.py, rank_s_artwork_test.py, rank_s_browser.cjs.

Pendência de produto: playtest para balancear custos/recargas e dano contínuo; nenhum asset solicitado está ausente. Reversão por revert dos commits da sprint, sem renumerar itens anteriores. Próximo escopo recomendado: balanceamento das duas frutas em chefes e encontros de vários inimigos.
