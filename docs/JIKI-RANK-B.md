# Jiki Jiki no Mi — Rank B / Paramecia

Atualização de 26/10/2026, branch feature/jiki-rank-b sobre origin/main 89ecb2d. Catálogo anexado ao final, preservando IDs e índices das frutas anteriores. Lore integral e ícones fornecidos pelo proprietário; descrição também aparece no tooltip da mochila.

## Atributos iniciais

+180 HP máximo, +24 ataque físico, +10 defesa física e +6% penetração de armadura. Passivos compartilhados entre JS, Python e interface, sem acumular ao recalcular. Regras em assets/akuma/jiki/rules.json.

## Grande Devorador (1)

- 45 energia e 22s de recarga, contados na primeira ativação. A segunda ativação lança sem custo adicional e mantém o mesmo prazo de recarga.
- Até 6s de carga, com barra numérica sobre o personagem e sucata seguindo sua posição. A massa usa estritamente o último dos 25 quadros originais de power-aura-take-5; pequenas peças de ferro são atraídas continuamente para o centro.
- Pode caminhar enquanto carrega. Ataques básicos e habilidades de classe ficam suspensos durante a canalização; o Punho Foguete pode ser usado normalmente.
- Segundos completos, com mínimo de um para lançamentos antes de 1s: 1s=200%, 2s=250%, 3s=300%, 4s=350%, 5s=400%, 6s=450% do ataque físico capturado no início. Escala 100%, 130%, 150%, 150%, 150%, 150%, conforme o incremento de 30% e teto de 150% solicitados.
- A segunda ativação arremessa para a posição do alvo selecionado; aos 6s dispara automaticamente. Alcance inicial de 4 tiles (256px). Sem alvo válido, usa a última posição conhecida, limitada ao alcance; sem posição prévia, arremessa na direção atual. Não deixa a carga presa indefinidamente.
- A massa voa a 320px/s, sai da altura da pilha e desce até o ponto de impacto. Não causa dano durante a carga ou no lançamento.
- Ao chegar, causa o dano acumulado em círculo de raio 128px ao redor do centro, incluindo o limite de 2 tiles. Cantos externos de um quadrado 5×5 não pertencem ao círculo. Encerra a massa e toca os 13 quadros originais de explosion-take-1 (923ms), em 320×320 para cobrir a região.
- Colisão com parede antecipa a explosão no ponto bloqueado; não atravessa obstáculos nem acerta alvos sem linha livre a partir do impacto.

## Punho Foguete (2)

- 35 energia, 14s de recarga, alvo vivo a até 4 tiles com caminho livre no disparo. Fotografia do ataque físico e penetração na ativação.
- Voo perseguidor a 240px/s, com rotação acompanhando a direção. Reavalia a posição do alvo a cada passo, sem trocar para outro inimigo ao mudar a seleção. Alcance total de trajetória de 256px e limite de vida de 2s.
- Somente frames 1–12 de explosion-take-3 repetem em voo (12×71=852ms por ciclo). Colidindo com o alvo, para no ponto e inicia exclusivamente os frames 13–17 (355ms), sem repetir os de voo.
- Dano físico único de 250% no impacto, sem dano em área ou hits por quadro. Alvo morto/ausente, obstáculo ou fim de alcance encerra o projétil com o despedaçamento, sem acertar outro alvo.

## Estados e serviço

Carga, projéteis e explosões são transitórios. Stun/root/controle interrompe a canalização; projéteis já lançados continuam. Morte, retirada/troca de fruta, mapa e reload limpam todos os efeitos. Energia e recargas já gastas permanecem. O serviço expira cargas sem conclusão após 8s; retornar de uma aba suspensa por mais tempo cancela a carga expirada. O lançamento normal automático ocorre aos 6s.

jiki-system.js compartilha dados, escalas, seleção de quadros e trajetórias. game.js integra HUD, partículas, colisões, dano e ciclo de vida. server/jiki.py controla recargas/custo, horário de carga, multiplicador, proprietário, instância, alcance e consumo único do token. Rotas: cast existente, jiki-release, jiki-impact e jiki-cancel-charge. O servidor rejeita impacto anterior ao tempo mínimo de voo e lançamentos/impactos repetidos. Não confia no multiplicador de carga enviado pelo cliente.

Limitação herdada: o protótipo ainda informa atributos, posições, monstros e defesas pelo cliente. Isto não transforma a API local em simulação MMORPG autoritativa. Preview estático aplica as mesmas regras localmente.

## Arte e reprodução

Nove arquivos do proprietário importados sem alterar bytes: fruta, dois ícones e três pares PNG/JSON. Manifesto de hashes em assets/akuma/jiki/manifest.json; gerador tools/import_jiki_assets.py recebe a pasta de fontes. Nenhuma nova geração paga. Fontes pessoais, saves, banco de QA e capturas não entram no Git.

## Validação e reversão

Testes próprios: tests/jiki-system.test.cjs, tests/jiki_backend_test.py e tests/jiki_browser.cjs. Cobrem nove hashes, dano/escala por segundo, último frame fixo, loop 1–12 e final 13–17, perseguição/colisão, raio e limite, impacto único, falta de energia, recarga, proprietário/instância e limpeza.

82 arquivos de testes Node e 99 testes Python aprovados. Navegador em 1920×1080, 1366×768 e 1280×720; tooltip, equipamento, barra móvel, custo único, 200% em área, 250% direcionado, 450% automático após 6s reais na API, 20 abates com recompensas no cenário isolado e limpeza de estados. Build Pages e pacote estático conferidos. Capturas jiki-charge-1366.png e jiki-impact-1366.png geradas nesta atualização e mantidas fora do Git.

Saves antigos continuam válidos, sem migração de índices. Para reverter, reverter o commit desta branch; o Compêndio preserva IDs desconhecidos sem conceder habilidades.

Atalho: eventos repetidos de uma tecla segurada são ignorados; lançar exige uma segunda ativação distinta, evitando arremesso involuntário durante a carga.
