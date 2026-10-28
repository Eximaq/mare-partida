# Monstros neutros e respawns fixos

28/10/2026. Aplica-se às nove regiões de caça atuais; lobby sem inimigos e Impel Down com seu encontro único fixo por andar.

-82 pontos comuns,dois por setor,distribuídos pelo mapa. Um ocupante vivo por ponto. O chefe existente de Dawn conserva seus requisitos e ponto fixo separado.
-Posições e espécies estão em monster-behavior.js. Não dependem da posição do jogador nem são recalculadas ao entrar. Os pontos foram conferidos contra a navegação real e ficam afastados da chegada.
-Derrotar um inimigo deixa o ponto aguardando pelo menos30 segundos; o ciclo de spawn verifica disponibilidade a cada2,4s. O prazo absoluto é salvo em hunts.areas[area].respawns, preservado por migração, viagem e reload. Chefes conservam também sua recarga própria.
-Nos mapas comuns, os monstros fazem pequenas caminhadas e pausas em um raio máximo de72px do ponto fixo, a45% da velocidade de combate. Escolhem trajetos curtos livres de colisão, sem usar a posição do jogador. Controles que impedem movimento suspendem a patrulha.
-Proximidade, seleção de alvo e taunt sem dano não iniciam ataques nos mapas comuns. Apenas dano efetivo alerta o inimigo atingido; não há alerta compartilhado de grupo. Dano em área pode provocar todos os alvos realmente atingidos.
-Exceção atual: em Impel Down, o adversário persegue e ataca o personagem por iniciativa própria, sem exigir dano prévio e sem o limite de260px. O encontro continua sendo único por andar, com os mesmos spawns e progressão.
-Perseguição nos mapas comuns limitada a260px do ponto original. Ao sair desse limite,o inimigo interrompe o golpe,retorna por navegação e recupera a vida ao chegar. Durante o retorno não recebe dano nem é escolhido como alvo automático. Morte do jogador encerra os combates pendentes.
-Inimigos não somem ao trocar de setor,e não reaparecem ao redor do jogador. Auto-caçada continua andando entre pontos reais; não muda XP,ouro ou tabelas de loot.

Código:monster-behavior.js,game.js,hunt-system.js,catálogos compartilhados e registro HTML/Pages. Metadados do servidor usam reactive_homebound; a física/IA continuam locais conforme a arquitetura atual.

Testes:monster-behavior.test.cjs valida neutralidade,patrulha limitada,agressividade exclusiva de Impel Down,leash,prazo/migração e navegação dos83 pontos; monster_behavior_browser.cjs valida movimento neutro nas nove regiões,retaliação,isolamento do alvo,retorno,espera,viagem e reload. Impel Down mantém sua suíte de progressão/chefes/recompensas. O teste de combate de Alabasta avança o relógio de teste para respeitar o novo prazo de respawn.

Reversão:reverter o commit,sem apagar saves. O campo adicional de prazos não renumera itens nem altera progressos existentes. Sem geração de arte.
