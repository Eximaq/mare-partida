# Monstros neutros e respawns fixos

28/10/2026. Aplica-se às nove regiões de caça atuais; lobby sem inimigos e Impel Down com seu encontro único fixo por andar.

-82 pontos comuns,dois por setor,distribuídos pelo mapa. Um ocupante vivo por ponto. O chefe existente de Dawn conserva seus requisitos e ponto fixo separado.
-Posições e espécies estão em monster-behavior.js. Não dependem da posição do jogador nem são recalculadas ao entrar. Os pontos foram conferidos contra a navegação real e ficam afastados da chegada.
-Derrotar um inimigo deixa o ponto aguardando pelo menos30 segundos; o ciclo de spawn verifica disponibilidade a cada2,4s. O prazo absoluto é salvo em hunts.areas[area].respawns, preservado por migração, viagem e reload. Chefes conservam também sua recarga própria.
-Proximidade, seleção de alvo e taunt sem dano não iniciam ataques. Apenas dano efetivo alerta o inimigo atingido; não há alerta compartilhado de grupo. Dano em área pode provocar todos os alvos realmente atingidos.
-Perseguição limitada a260px do ponto original. Ao sair desse limite,o inimigo interrompe o golpe,retorna por navegação e recupera a vida ao chegar. Durante o retorno não recebe dano nem é escolhido como alvo automático. Morte do jogador encerra os combates pendentes.
-Inimigos não somem ao trocar de setor,e não reaparecem ao redor do jogador. Auto-caçada continua andando entre pontos reais; não muda XP,ouro ou tabelas de loot.

Código:monster-behavior.js,game.js,hunt-system.js,catálogos compartilhados e registro HTML/Pages. Metadados do servidor usam reactive_homebound; a física/IA continuam locais conforme a arquitetura atual.

Testes:monster-behavior.test.cjs valida neutralidade,leash,prazo/migração e navegação dos83 pontos; monster_behavior_browser.cjs valida as nove regiões,retaliação,isolamento do alvo,retorno,espera,viagem e reload. Impel Down mantém sua suíte de progressão/chefes/recompensas. O teste de combate de Alabasta avança o relógio de teste para respeitar o novo prazo de respawn.

Reversão:reverter o commit,sem apagar saves. O campo adicional de prazos não renumera itens nem altera progressos existentes. Sem geração de arte.
