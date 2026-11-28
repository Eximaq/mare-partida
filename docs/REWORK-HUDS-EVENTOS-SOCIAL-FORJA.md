# HUDs de eventos, Social, Tripulação e Forja

## Referência visual

O HTML fornecido foi conferido no Chromium. O jogo reaproveita a composição em duas áreas, os cartões com moldura e acento por chefe, a faixa azul, as serifas e a ação principal destacada. A interface compacta exibe os fatos e as ações do jogo. Os estados de demonstração do HTML permanecem apenas no material de referência.

Na Tripulação, a lista dá prioridade à identidade, presença e ações contextuais, com informações de profissão e contribuição separadas. As referências de organização foram os painéis oficiais de [Party e Amigos de Final Fantasy XIV](https://na.finalfantasyxiv.com/game_manual/pp/), [guildas de Guild Wars 2](https://www.guildwars2.com/en/news/catch-up-on-guild-week/) e seus [indicadores de atividade](https://www.guildwars2.com/en/news/studio-update-guild-wars-2-in-spring-and-summer-2024/).

## Interfaces

- **Modos de jogo.** Cinco linhas com molduras de ícones, alinhamento e seta de navegação. Os dois eventos usam emblemas próprios de 48 × 48. O atalho M no online e o botão de Modos abrem a mesma lista. O Mapa usa a HUD do Arquipélago também durante a recuperação da sessão, mantendo a viagem bloqueada até o mundo estar disponível. A navegação por teclado ignora as opções ocultas ou desabilitadas.
- **Boss Semanal.** Três almirantes selecionáveis. Akainu usa abertura oficial manual e o horário confirmado pelo servidor, exibido em Brasília. Aokiji e Kizaru são consultáveis, com indicação de agenda indefinida. A janela mostra localização, requisito, disponibilidade e possíveis recompensas. As chances numéricas ficam fora da HUD. Os controles autorizados estão em Central do Navegante → Operação de eventos.
- **Desafio das Sete Lâminas.** Os cartões seguem a rotação real de segunda a domingo com Mihawk, Shanks, Ryuma em vida, Oden, Rayleigh, Zoro e Shiki. A arena abre das 20h às 21h em Brasília. Fim da janela ou vitória encerra a entrada. A arte fica colorida quando a arena está disponível e cinza nos demais estados. As recompensas são fragmentos do Compêndio de Espadas, entregues pelo Correio conforme a elegibilidade existente.
- **Social e Tripulação.** Os retratos usam a pose Sul do personagem e têm enquadramento de cabeça e ombros calculado pelo conteúdo da imagem. A lista reutiliza a mesma renderização e o cache. O backend reaproveita a projeção do Social, incluindo presença e permissão de interação. A Tripulação tem nove emblemas próprios nas abas horizontais, botões no estilo da HUD, visão de nível e XP, e informações separadas de nível do personagem, classe, cargo e profissão. O saldo e as movimentações da Tesouraria exibem o ícone oficial de Berry. O conteúdo de cada aba fica visível com menos espaço vazio.
- **Forja das Correntes.** Os atributos nos extras usam os ícones de Força, Destreza, Vitalidade, Inteligência e Espírito do estúdio de personagem, além de ícones de combate próprios. Pérolas mantêm seus ícones nas operações de encaixe. A Reforja mostra o custo em uma linha e compara somente atributos alterados. A confirmação conserva os riscos e a regra de aumento de custo.

## Origem dos recursos e dados

| Recurso | Origem e aplicação |
|---|---|
| Emblemas dos modos | `assets/ui/modes/weekly-boss.svg` e `assets/ui/modes/seven-blades.svg` foram desenhados para o menu |
| Akainu, Aokiji e Kizaru | Três splashes fornecidos pelo responsável. Convertidos para WebP de 1.672 × 941 em `assets/ui/weekly-boss/`, com enquadramento de cada cartão em CSS |
| Sete espadachins | Sete WebPs existentes em `assets/ui/sword-event/`, associados às chaves da rotação |
| Atributos e emblemas | PNGs oficiais de `assets/ui/character-studio/attributes/`, ícones de classe existentes e nove emblemas próprios em `assets/ui/crew/tabs/` |
| Agenda e disponibilidade | `weekly-boss.ts`, `weekly-boss-rules.cjs`, `daily-sword-event.ts` e a rotação compartilhada em `sword-compendium.js` |
| Recompensas | Sistema de loot do Boss Semanal e catálogo do Compêndio. A HUD reaproveita os ícones de item e o fluxo de Correio |

A branch foi sincronizada com a main em `baaa229c`, que incorporou o PR #393. As HUDs usam a arena e o Compêndio já presentes nessa revisão e preservam a progressão publicada. O empacotamento autoritativo corresponde ao catálogo de 246 itens e à sequência de 69 migrações.

## Verificações

- Build, checagem de tipos e 17 testes focados de menu, HUDs de eventos, rotação, Forja, entrada e recompensas.
- Projeções de agenda, presença e aparência conferidas em PostgreSQL descartável. Os testes usam contas e estado isolados.
- Capturas feitas no Chromium em desktop e celular com o cliente do jogo e respostas controladas da sessão. As nove abas da Tripulação foram abertas e capturadas individualmente. Foram exercitados seleção de chefe, reconsulta que recusa uma entrada encerrada, cartões do dia em cinza e coloridos, fechamento com retorno ao jogo, retratos do Social e da Tripulação e custos da Reforja.
- O servidor atual tem um encontro semanal jogável de Akainu. A abertura de Aokiji e Kizaru depende de programação oficial futura.
