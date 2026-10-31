# Rank A — Bari-Bari, Doku-Doku e Ito-Ito

Base: ab77811, após merge do PR161. Branch feature/rank-a-bari-doku-ito. A expansão reutiliza a HUD de três slots e o runtime Rank A; Ope e Mero continuam com seus índices, artes e comportamento anteriores. ROOM e seu texto permanecem exclusivos do lançamento de ROOM.

## Mecânicas e parâmetros

| Fruta / skill | Regra | Energia | Recarga inicial |
|---|---|---:|---:|
| Bari — Impacto de Barreira | Linha de 4 tiles, 350% físico, arrasto; colisão sólida acrescenta 100% e stun 1,5s, uma vez por vítima | 35 | 14s |
| Bari — Domo Defensivo | Segue o usuário por 10s; −80% dano total, imunidade a projéteis e CC; reflete 20% do dano efetivamente recebido em corpo a corpo | 50 | 28s |
| Bari — Investida | Barreira avança até 4 tiles; 300% físico total por vítima, arrasto e silêncio durante o deslocamento | 40 | 18s |
| Doku — Hydra | Surge ao lado do alvo até 4 tiles, 250% mágico; veneno de 20% ATQ/s por 5s e −30% movimento | 40 | 14s |
| Doku — Bomba de Gás | Bolha até 3 tiles; explosão 150% mágica em raio de 2 tiles; gás fixo 4s, cega e causa 20% especial/s aos ocupantes | 40 | 18s |
| Doku — Venom Demon / Kinjite | Fixa no centro do tile conjurado, raio 3 tiles; explosão 500% especial sem defesa/escudo; corrosão 5% HP máximo/s durante 3s | 60 | 30s |
| Ito — Tamaito | Três projéteis rápidos até 5 tiles, 180% físico cada; sangramento 15% físico/s por 4s | 35 | 12s |
| Ito — Parasite | Stun instantâneo 5s; mantém quadro humano 25, depois executa os quatro finais; dois ataques contra si mesmo | 45 | 22s |
| Ito — Overheat | Raio de 3 tiles acompanha o usuário; seis janelas de 250% físico, alternando três por lado | 55 | 24s |

Cada tile tem 64 px. Custos, recargas, dano de gás (20% especial/s), dano próprio de Parasite (100% do ataque do alvo por acerto) e alcance de Investida (4 tiles) são valores iniciais para campos não especificados. Hydra usa dano mágico inicial; seus ticks usam 20% do ataque efetivo capturado no lançamento. Dano e status ficam configurados em assets/akuma/rank-a-rules.json e rank-a-expansion.js.

O reflexo do domo usa o HP efetivamente perdido após mitigação: um golpe de 100 que efetivamente resulta em 20 após o domo devolve 4. Dano refletido não reflete novamente. Ataques corpo a corpo de grande alcance não são confundidos com projéteis. A imunidade limpa apenas controles/lentidão; não concede imunidade a veneno ou sangramento. O cálculo de proteção é reutilizável por entidade, preparado para futuros consumidores de party, sem simular aliados.

O arrasto usa passos curtos e a navegação sólida real. A barreira não causa impactos repetidos por quadro, nem atravessa paredes para atingir outra sala. Silêncio impede ataques/conjurações durante o arrasto. Cegueira do gás impede ações ofensivas, preservando a movimentação. Sair do gás remove a trava; não transforma cegueira em raiz/stun.

Cada aplicação de veneno severo tem cinco ticks próprios; aplicações diferentes acumulam. Cada campo de gás tem quatro ticks, somados aos demais venenos/campos apenas enquanto a vítima está dentro dele. A corrosão tem três ticks percentuais. Tamaito soma três impactos reais; o sangramento da mesma rajada é renovado, sem multiplicar artificialmente os quatro ticks. Overheat acompanha o jogador tanto na arte quanto na seleção de vítimas; um alvo parado num lado recebe três cortes desse lado.

## Arte e controle dos quadros

32 arquivos originais novos: 22 PNGs (três frutas, nove ícones e dez atlas) e dez JSONs. 294 quadros novos, preservando os bytes; os 158 quadros de Ope/Mero permanecem intactos. O manifesto Rank A passa a abranger 53 arquivos fornecidos e 452 quadros.

Mapeamento fiel do pedido:

- Bari: Skill 2 → Impacto; Skill 3 → Domo; Skill 1 → Investida. A pasta original chama-se Bara bara no mi; o item é Bari-Bari conforme o prompt e seu ícone.
- Doku: Skill 4 → Hydra; Skill 5 → Gás; Skill 6 → Venom Demon.
- Ito: Skill 7 → Tamaito; Skill 9 → Parasite; Skill 8 → Overheat.

A importação em tools/import_rank_a.py é reproduzível a partir da pasta Rank A. Arquivos e hashes de origem estão em assets/akuma/rank-a-manifest.json; .gitattributes preserva os JSONs originais nas três pastas. Nenhuma geração ou alteração dos PNGs foi feita.

Parasite mantém o índice 24 (quadro humano 25) durante os cinco segundos inteiros. O movimento de entrada usa esse mesmo quadro; após a trava, quadros 26–29 encerram a animação. Os dois danos próprios ocorrem em 1,5s e 3,5s. Hydra sincroniza seu ataque/explosão ao impacto de 800ms. O gás reproduz o estouro na chegada e depois mantém o atlas de veneno nos tiles livres, limitados pelo cenário. Tamaito usa a faixa de um único projétil do atlas para evitar desenhar nove balas em vez das três lógicas. Fios e criaturas VFX são compostos atrás dos atores; domo/transparências mantêm o personagem legível.

Domo e Overheat leem a posição atual do usuário. Gás e Venom Demon preservam seus pontos de conjuração. Cada fruta carrega apenas seus três ou quatro atlas. Filas têm limites de 32 jobs, 16 campos e 512 instâncias de DoT por sessão; os tiles de gás são calculados uma vez. Nenhum canvas, recoloração ou leitura de pixels por frame foi adicionado.

## Arquitetura, persistência e API

rank-a-expansion.js é chamado pelo motor rank-a-system.js, pelo mesmo controlador de casts, energia, cooldowns e HUD. Os itens são append-only: índices anteriores mantidos. Reload preserva recargas, equipamentos e Compêndio, sem salvar callbacks ou efeitos temporários.

A API opcional usa server/rank_a_expansion.py através do serviço Rank A existente. Valida dono/instância do token, energia, alcance, tempos, índices de tiro/corte/tick e impactos repetidos. Não aceita ticks de veneno sem o acerto inicial correspondente. O ponto real de explosão de gás, limitado pela colisão local, acompanha a validação. Proteção, expiração e reflexo do domo também existem no endpoint de dano.

A simulação do mundo continua local, conforme a arquitetura anterior; esse serviço não é apresentado como combate PvP autoritativo. Morte, transição de área e troca de fruta limpam filas incompatíveis, preservando controles de outros sistemas.

## Verificação e entrega

Resultado final local: 218/218 testes Node e 144/144 testes Python aprovados. As nove skills passaram no navegador com API e na distribuição estática, em cinco viewports. Ope/Mero também passaram na regressão do navegador.

- Testes de motor: colisão real e bônus único, imunidades e reflexo, silêncio, gases fixos, venenos acumulados, corrosão de HP máximo, três tiros, sangramento, Parasite e seus dois danos, Overheat acompanhando movimento e lados, limpeza de estado e bloqueio por cenário.
- Teste de gás comprovado em vermelho/verde: sem o recorte por colisão, a regressão falha; restaurado o recorte, passa.
- Navegador estático/API: nove habilidades, três slots, parede real, redução 80%, imunidade a projétil, reflexo 4 após receber 20, limpeza de CC sem apagar veneno, DoTs simultâneos, indicadores e persistência após reload; sem erros JavaScript ou respostas de erro da API nos fluxos válidos.
- Cinco viewports: 1920×1080, 1366×768, 1280×720, 393×852 e 320×568, sem overflow e com os três slots dentro da tela.
- Regressão funcional de Ope e Mero no navegador.
- Caçada nativa Nv.20, distribuição válida de 95 pontos e spawns existentes: Bari 22 abates / 242 XP / 673 moedas em 90s simulados; Doku 20 / 237 / 671 em 90s; Ito 21 / 248 / 658 em 100s. Nenhuma queda.
- Evidências, capturas e bancos de QA ficaram fora do repositório. Publicação estática gerada por python tools/build_pages.py.

Arquivos principais: rank-a-expansion.js, rank-a-system.js, rank-a-data.js, game.js, server/rank_a_expansion.py, server/rank_a.py, server/akuma.py, server/app.py, catálogo/manifesto rank-a, assets/akuma/bari, doku e ito, importador, entradas HTML e build. Testes novos: rank-a-expansion.test.cjs, rank_a_expansion_backend_test.py e rank_a_expansion_browser.cjs; contratos anteriores foram ampliados. CI compartilhado em .github/workflows/rank-a-skills.yml.

As fases têm commits próprios. Para desfazer, reverter a integração e sua validação sem renumerar itens anteriores. Pendência de produto: avaliar balanceamento dos custos/recargas iniciais; não faltam assets do lote solicitado.
