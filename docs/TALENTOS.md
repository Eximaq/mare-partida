# Árvores de Talentos

## Acesso e regras

O botão Personagem e o atalho P abrem uma seleção entre Personagem, Talentos e Conquistas. A primeira aba mantém atributos e o acesso ao inventário/equipamentos. A segunda mostra uma constelação da classe ativa, com tronco inato, três ramos, cinco tiers, três intermediários e três finais. A terceira abre o Diário de Conquistas. Os nós são passivos; não ocupam a barra de habilidades.

- O orçamento total é nível + PT das conquistas resgatadas: nível 1 tem 1 PT; cada nível seguinte acrescenta 1 PT. As conquistas somam PT apenas quando resgatadas. Atributos continuam separados, com 5 pontos por nível a partir do 2.
- Cada nó comum aceita até 10 pontos. Um tier exige 5 pontos no nó anterior do mesmo ramo.
- Só dois ramos podem ter investimentos. O primeiro ponto no terceiro é recusado, tanto na interface quanto na validação do modelo.
- Após 10 PT comuns, o núcleo libera um intermediário por 1 PT. Novos investimentos nos tiers 3–5 também exigem esse intermediário, além de cinco pontos no nó anterior.
- Após 50 PT comuns, um intermediário e pelo menos cinco pontos no último tier de um ramo, pode-se escolher um final por 3 PT. Apenas um intermediário e um final por build. O final não ativa o terceiro ramo.
- Montar a prévia não altera atributos nem save. Confirmar abre um diálogo e valida novamente classe, revisão, orçamento e dependências. Descartar, cancelar ou fechar preserva os pontos confirmados.
- Redefinição gratuita, mediante confirmação, somente no porto. Devolve os pontos da classe ativa e mantém atributos, equipamentos e outras árvores.
- Cada classe guarda uma build independente com orçamento igual a nível + conquistas resgatadas. Somente a classe ativa concede bônus; trocar de classe não soma árvores.

## Ramificações

| Classe | Ramo 1 | Ramo 2 | Ramo 3 |
|---|---|---|---|
| Lutador | Força Bruta | Vitalidade | Disciplina |
| Espadachim | Letalidade | Agilidade | Guarda Naval |
| Atirador | Precisão Cirúrgica | Posicionamento | Arsenal |
| Gatuno | Letalidade Rápida | Oportunismo | Astúcia |
| Ciborgue | Blindagem Metálica | Sobrecarga de Armas | Manutenção |
| Estrategista Elemental | Poder Elemental | Fluxo de Mana | Concentração |
| Suporte | Devoção | Presença | Peregrinação |

Os valores por graduação, ordem dos tiers e estatísticas ficam no catálogo `talent-system.js`. A interface usa esse mesmo catálogo para mostrar nomes, requisitos e efeitos.

## Exclusivos: parâmetros iniciais

| Classe | Talento | Efeito |
|---|---|---|
| Lutador | Impacto Concussivo | Básicos: 15% de chance de atordoar por 1s. |
| Lutador | Fúria da Batalha | Abaixo de 30% HP: redução adicional multiplicativa de 25% e roubo de vida de 12%. |
| Lutador | Golpes Crescentes | +4% por básico consecutivo no mesmo alvo, até 8 acúmulos; troca de alvo reinicia. |
| Espadachim | Fio Desgastante | Básicos: -4% defesa física por 5s, até 5 acúmulos; renova duração sem alterar a defesa base. |
| Espadachim | Ímpeto Sanguinário | Abate: +20% velocidade de ataque e +15% movimento por 6s; renova, não empilha. |
| Espadachim | Aparar Perfeito | 12% de anular golpe físico e contra-atacar com 100% dano físico base, descontada a defesa do alvo; exige alcance e linha livre. |
| Atirador | Tiro de Longo Alcance | Dano cresce linearmente com a distância, até +30% a 180px. |
| Atirador | Munição Perfurante | 30% de atravessar para até 2 inimigos alinhados atrás, a 50% do dano efetivo inicial; respeita alcance e obstáculos. |
| Atirador | Foco Extremo | Com HP cheio, primeiro acerto em cada inimigo é crítico. Não elimina o teste de precisão. |
| Gatuno | Lâminas Envenenadas | 20% físico base/s por 4s, renova sem somar venenos. |
| Gatuno | Mãos Leves | +20% relativo às faixas de raridade raro/épico/lendário; crítico tem 15% de roubar 2 dobrões, até 6 por inimigo. |
| Gatuno | Golpe Furtivo | Primeiro acerto pelas costas de cada inimigo causa 150% físico base como dano verdadeiro, substituindo o dano normal. |
| Ciborgue | Escudo de Energia | Sobrevive ao golpe letal com 1 HP; escudo de 30% HP máximo por 5s; recarga de 90s persistida. |
| Ciborgue | Núcleo Instável | Ao sofrer ataque, 20% de explosão de 60% ataque como dano elemental em raio de 120px, respeitando obstáculos. |
| Ciborgue | Armadura Adaptativa | +3% defesa por golpe físico, máximo 15 acúmulos; termina após 6s sem combate. |
| Estrategista | Eco Arcano | Dano mágico tem 20% de repetir metade do dano efetivo no mesmo alvo após 0,18s. |
| Estrategista | Congelamento Estático | Dano mágico aplica lentidão de 25% por 3s. |
| Estrategista | Sifão de Mana | Abate restaura 10% da energia máxima. |
| Suporte | Cura em Corrente | Distribui 30% da cura efetiva entre outros aliados feridos reais a até 180px. |
| Suporte | Aura de Revigoramento | Regeneração de HP e energia +20% para si e aliados reais na tela; sem empilhar auras iguais. |
| Suporte | Intervenção Divina | Duração de atordoamento/congelamento reduzida à metade para si e aliados a até 180px; reduções iguais não empilham. |

## Combate e limites da versão

`talent-combat.js` contém os gatilhos puros de acerto, dano recebido, abate e tempo. `game.js` os liga à precisão, dano, curas, movimento, drops e estados reais. Dano secundário de veneno, eco, perfuração, explosão e contra-ataque não volta ao gatilho de acerto; abates continuam entregando a recompensa normal uma única vez.

Bônus temporários são limpos ao morrer, trocar de classe ou mudar de cena. Acúmulos de combate expiram após 6s sem combate. A recarga absoluta do Escudo de Energia permanece no save, inclusive após redefinir talentos, morrer ou recarregar. Estados de inimigos duram apenas enquanto eles existem.

Limites derivados: velocidade de ataque 3/s, crítico 65%, esquiva 45%, precisão 100%, mitigação comum 60%, penetração física/mágica 60%, roubo comum 30%, eficiência de energia 40%, bônus de área 50% e bônus relativo de raros 50%. Fúria é uma camada multiplicativa adicional, condicionada à vida baixa. Alcance/área respeitam os obstáculos do mapa. Gemas e pérolas diretas continuam restritas a Impel Down. A única exceção nas caçadas são Caixas Nv.1 geradas pelo final Senhor do Submundo, conforme o novo pedido; abrir a caixa continua entregando uma pérola do nível correspondente.

**O jogo atual é solo e local, sem backend ou grupos multiplayer.** Aura funciona no próprio suporte. Cura em Corrente tem contrato e testes para destinatários reais, mas não cria aliados fictícios nem cura o próprio alvo duas vezes. Intervenção tem processamento e teste de controle para suporte/aliados; os monstros atuais ainda não aplicam atordoamento/congelamento ao herói. As interfaces indicam essa limitação. Ao adicionar party ou monstros com controle, usar `chainHeal`, `auraRecipients` e `applyControl`, sem duplicar bônus nem criar uma segunda regra de talentos.

## Persistência e arquivos

Migração `talentVersion:2`, orçamento derivado de nível + resgates, builds por classe e `talentSeq` para rejeitar confirmações antigas. Backup original em `mare-partida-save-v1-before-talents-v2`. A normalização limita saves inválidos ao orçamento, dois ramos, tiers válidos e exclusivo conhecido. Recarregar não concede pontos extras. Falha ao gravar a confirmação mantém o estado vivo e os pontos anteriores.

- `talent-system.js`: catálogo, migração, orçamento, transações e atributos.
- `talent-combat.js`: gatilhos e estados passivos, sem dependência da interface.
- `talent-ui.js`: árvore, inspeção e prévia.
- `game.js`, `ui-nautical.css`, `index.html`: integração no jogo e layout responsivo.
- `tools/build_pages.py`: três novos módulos com caminhos relativos e hashes próprios contra cache.

## Verificação

`node tests/talent-system.test.cjs` cobre 13 grupos, incluindo as 7 árvores, os 21 exclusivos, migração, confirmações antigas, orçamento, ramos, expiração e destinatários reais. `python tests/talents_browser.py` valida seleção inicial, prévia, confirmação/cancelamento, recarga, reset, falha de armazenamento, cinco viewports e combates reais das sete classes em contextos isolados. Capturas ficam na pasta temporária do sistema, fora do repositório. Rodar também as regressões Node, personagens, animação de combate e o pacote Pages.


## Constelação e compatibilidade

O tronco é a fundação inata do personagem no nível 1; não concede bônus ou PT gratuitos. Linhas conectam os ramos iniciais ao saldo comum necessário para o intermediário, passam pela ponte aos tiers avançados e terminam nos finais. Só as rotas treinadas acendem. O brilho durante a prévia ainda depende de confirmação para afetar o combate.

O diagrama tem zoom por botões/roda/pinça, arraste por mouse/toque, visão geral, retorno ao tronco e foco automático nos nós acessados por Tab. A árvore começa ampliada no tronco para manter os nós legíveis; a visão geral enquadra toda a constelação. O diagrama usa SVG para linhas/ícones e botões HTML para foco e acessibilidade. O painel de inspeção explica requisitos e custos. Sem geração de imagens ou cobrança de créditos.

Direção visual: carta celeste náutica, tinta azul `#0b1922`, mar `#183139`, latão `#e5c47f`, turquesa `#78ceca` e texto `#c7d2cd`; tipografia do projeto. O contraste entre linhas apagadas/acesas expressa progressão. Círculos comuns, intermediários em losango e finais com anel duplo diferenciam funções. A referência orienta a estrutura; a paleta e as artes permanecem próprias do jogo.

Builds v1 preservam seus investimentos e intermediários. Se uma build antiga já tinha tiers avançados sem intermediário, esses ranks continuam válidos; aumentar os ranks avançados exige escolher o intermediário. Não há respec silencioso, concessão gratuita de final nem remoção de pontos. Resetar remove esse investimento herdado e passa a seguir integralmente as regras atuais. As recargas persistidas não são apagadas por reset, morte ou troca de classe.

## Diário de Conquistas

Catálogo em `achievement-system.js`: **31 conquistas**, oito categorias, até **72 PT extras** quando todos os sistemas futuros forem liberados. Marcos não consomem seu progresso; todos podem ser resgatados uma vez. Não há limite diário artificial: a progressão usa as metas crescentes solicitadas.

| Categoria | Meta → PT |
|---|---|
| Extermínio | 100 → 1; 500 → 1; 2.000 → 2; 10.000 → 3 monstros |
| Desbravador | Andares 10 → 1; 30 → 2; 50 → 3; 100 → 5 |
| Riqueza | 10.000 → 1; 100.000 → 1; 1.000.000 → 2 dobrões |
| Jornada | Níveis 5 → 1; 10 → 1; 20 → 2; 50 → 3; 100 → 5 |
| Poder de Combate | 1.000 → 1; 5.000 → 1; 20.000 → 2; 50.000 → 3; 100.000 → 5 |
| Akuma no Mi | Primeira fruta → 2; cinco diferentes → 3; despertar → 5 |
| Haki | Observação → 1; Armamento → 1; Rei → 3; três maximizados → 5 |
| Exploração | Cinco ilhas → 1; oito pontos do Arquipélago → 2; dez chefes de recompensa diferentes → 3 |

O poder é o maior BP efetivo permanente observado após equipamentos, nível e passivas confirmadas; buffs temporários, prévias de atributos e bênção de combate não entram. Reduzir o BP ou gastar ouro não desfaz conquistas. Riqueza usa ouro acumulado nos contadores históricos, incluindo abates, contratos, furto e vendas, com o saldo atual como mínimo na migração antiga. O registro guarda o total e o último contador de ouro já observado: só acrescenta o delta de ganhos novos, sem somar novamente o saldo a cada frame. Gastar e voltar a ganhar continua aumentando o total corretamente. Na primeira migração, o saldo é o mínimo conhecido, e o ouro inicial conhecido também é contabilizado.

Visitas só são registradas quando a viagem é executada, nunca ao inspecionar um card. As duas ilhas atuais já alimentam o diário; repetir uma ilha não aumenta a contagem. Impel Down, frutas, Haki, rede completa de viagem rápida e recompensas de chefes distintos permanecem **Em breve**, sem resgate antecipado. Os marcos aparecem mesmo indisponíveis. Visitar cinco ilhas ficará alcançável quando mais ilhas forem construídas.

Hooks puros `MareAchievements.record(save, event, canonicalId)`: `islandVisited`, `fruitUnlocked`, `fruitAwakened`, `hakiUnlocked`, `hakiMaximized`, `fastTravelUnlocked`, `bountyCollected`. IDs repetidos não contam novamente. A meta de Cartógrafo usa os IDs do catálogo do Arquipélago; novas ilhas futuras devem entrar naquele catálogo. Haki aceita `observation`, `armament`, `conqueror`. Despertar implica fruta registrada e maximizar Haki implica desbloqueio. A progressão da prisão lê `impelDown.cleared`; a liberação futura precisa habilitar explicitamente seu sinal de disponibilidade. Não confundir derrotas repetidas do chefe atual com dez Bounty Bosses distintos.

`claim` devolve uma transação sem modificar o estado de entrada, valida a meta e o registro de resgates, acrescenta seu ID e incrementa a revisão dos talentos. A aplicação no jogo persiste antes de trocar o estado vivo. Falha no armazenamento não concede PT nem marca a conquista como resgatada. O orçamento é recalculado a partir dos IDs conhecidos, evitando dupla concessão em recargas. Os PT extras valem no orçamento de cada classe, mas as builds continuam independentes e apenas a ativa concede bônus.

## Aprimoramentos exclusivos finais

Todos os finais são passivos e têm graduação única, escolha exclusiva e custo de 3 PT. Parâmetros configuráveis em `ultimate-system.js`:

| Classe | Final | Mecânica e parâmetros iniciais |
|---|---|---|
| Lutador | Corpo de Titã | Render 35% maior ancorado nos pés; básicos em raio de 100px, ignorando 20% da defesa restante. Não altera colisão/navegação. |
| Lutador | Pele de Armamento | Vigor de 25% HP máximo, absorve antes do HP, imuniza contra CC enquanto positivo e reflete 25% do dano recebido de contato físico. Renova ao fim do combate. Barra acima da vida no HUD compacto e sobre o personagem. |
| Lutador | Imortalidade Temporária | Letal deixa 1 HP, invulnerabilidade por 5s e +60% roubo de vida nesse intervalo. Recarga persistida de 600s. |
| Espadachim | Aura Demoníaca (Asura) | Dois fantasmas por básico, 30% cada, com atrasos de 0,12/0,24s. Não geram outros fantasmas. |
| Espadachim | Execução Absoluta | 5% por básico: elimina comum; em chefe, causa 10% HP máximo como dano verdadeiro. |
| Espadachim | Corte Espacial | Alcance mínimo de 220px; feixe em linha, largura útil de 56px, atingindo todos os inimigos alinhados e respeitando paredes. |
| Atirador | Artilharia Pesada | A cada cinco básicos acertados: 400% ataque em raio de 150px, descontando defesa elemental. |
| Atirador | Camuflagem Óptica | Parado por 2s na caçada: invisível e inalvejável. Movimento revela; ataque de saída crítico de 300% consome a camuflagem e reinicia o período. |
| Atirador | Mestre do Ricochete | Rebotes a cada 0,12s em raio de 160px, -15% dano a cada salto; pode revisitar inimigos vivos, encerrando apenas quando não encontra outro alvo no alcance. Processado ao longo do tempo, sem laço síncrono infinito. |
| Gatuno | Marca do Assassino | Cinco críticos no alvo consomem marcas e causam 12% de seu HP máximo como dano verdadeiro. |
| Gatuno | Clone das Sombras | Clone intangível renderizado com transparência, sem colisão, repete ataque em 0,16s com 50% do dano. Replica veneno em um canal de metade da potência e furto com metade do ouro, sem exceder o teto por alvo. Não replica a si próprio. |
| Gatuno | Senhor do Submundo | Dobra chances de equipamentos, materiais, poções e eficácia dos bônus relativos de raridade. Comum: 0,5% caixa Nv.1 e 1% equipamento lendário adicionais, com capacidade da mochila respeitada. Não cria gemas ou pérolas diretas. |
| Ciborgue | Overclock de Sistemas | Ataque e movimento ×2, até 6 ataques/s com os limites base; remove a recarga interna de Escudo de Energia. Custo verdadeiro contínuo de 1% HP máximo/s em combate, sem esquiva/mitigação e podendo matar. Habilidades ativas mantêm recargas próprias. Não há procs de itens com recarga nesta versão; `internalCooldown`/`internalReady` fornecem o contrato para eles. |
| Ciborgue | Matriz de Aniquilação (EMP) | Cruzar de acima para abaixo de 50% HP: 10s de cegueira/silêncio e defesa física/mágica nula em todos os monstros na tela. Recarga persistida de 45s. Os monstros atuais não têm um sistema separado de habilidades; cegueira/silêncio bloqueiam seus ataques e a defesa nula entra no cálculo real. |
| Ciborgue | Canhão Orbital | Cadência ×0,5, alcance mínimo 250px, básicos de 250% ataque; faixa incendiada de 80px por 4s, 35% ataque/s. |
| Estrategista | Cataclismo Passivo | Básicos de 160% dano mágico, rotação visual meteoro/raio/gelo e sorteio entre burn de 30% elemental/s por 4s, stun de 1,5s ou congelamento de 1,5s. |
| Estrategista | Domínio do Arquimago | Custo de habilidades zero; energia atual absorve dano na proporção 1:1 antes do HP, com regeneração normal. Barra de Escudo de Mana na HUD. |
| Estrategista | Singularidade | Crítico mágico cria campo de 180px por 2s; puxa até 180px/s usando navegação e linha livre, sem atravessar paredes. |
| Suporte | Benção Eterna | 10% da cura excedente vira HP máximo e 2% vira ataque, acumulando até o fim do combate. Regeneração também alimenta o efeito; cura automática pode sobrecurar durante combate. Bônus não persistem nem entram no marco de BP permanente. |
| Suporte | Anjo Guardião | Revive com 100% HP/energia e derruba inimigos visíveis por 2s. Recarga persistida de 600s, compartilhada entre resgates do próprio suporte/aliados futuros. O contrato de reviver aliados exige os limites reais da tela. |
| Suporte | Vínculo Empático | Contratos de grupo dividem dano entre membros vivos e replicam curas uma vez. Solo: 50% de cura efetiva vira dano mágico contra cada atacante próximo, com frações acumuladas antes de aplicar dano. |

Dano secundário de fantasmas, clone, ricochete, execução, marca, reflexo, burn e bombardeio não volta a disparar a si mesmo. Somente o clone passa pelo contrato de contato, identificado como secundário, para reproduzir metade de veneno/furto/roubo de vida. Abates secundários entregam recompensas normais uma vez. Alvos mortos são removidos e não voltam a ser selecionados.

As recargas de Escudo de Energia, Imortalidade, EMP e Anjo Guardião são timestamps absolutos no save e sobrevivem a recarregar, redefinir ou trocar de classe. Campos, marcas, vigor, clone e buffs de combate são transitórios. O fim do combate continua usando seis segundos sem atividade, ou fim de cena/andar/morte. Grupos multiplayer continuam ausentes: os efeitos de Suporte sobre outras pessoas são contratos testados para entidades reais, não aliados simulados.

## Arquitetura e testes da expansão

- `achievement-system.js`: catálogo, observações, hooks, resgates e cálculo do PT extra.
- `ultimate-system.js`: os 21 finais, eventos, filas, campos e contratos para aliados reais.
- `talent-system.js`: orçamento ampliado, ponte, finais, validação/migração v2.
- `talent-combat.js`: composição dos intermediários com os finais e contatos do clone.
- `talent-ui.js`: constelação, gestos/foco e Diário; componentes consomem o catálogo do modelo.
- `game.js`: integração com ações, dano, restauração, viagens, drops e HUD compacta.
- Build Pages inclui 22 scripts/CSS versionados por conteúdo. Caminhos relativos preservados.

`tests/achievements-ultimates.test.cjs` cobre 21 grupos de conquistas, migração e todos os finais. `tests/constellation_browser.py` cobre as transações, rotas/ponte/final, cinco resoluções, arraste/zoom/foco, visitas reais e cenários de combate dos 21 finais em saves isolados. RNG controlado nesses cenários torna gatilhos probabilísticos reproduzíveis; a simulação, atributos, monstros, dano, navegação e ações são os do jogo. Capturas ficam no diretório temporário do sistema, fora do Git. Rodar também todas as suítes Node e as regressões de talentos anteriores, personagens, Bento, inventário/forja e cache Pages.

## Ícones HD e renderização interna — 26/10/2026

As sete classes mantêm os mesmos 21 talentos por árvore, IDs, bônus, custos, escolhas exclusivas e investimentos. O exemplo de quatro nós foi usado como contrato de configuração, sem substituir as árvores.

- MareTalentUI.TALENT_TREE_CONFIG contém ID, nome, tipo, ícone, nível máximo, posição, dependências e gates. configFor(game,draft) aplica os níveis da prévia sem alterar os templates nem o save.
- Dependências comuns em talent-system.js (requires), compartilhadas por validação e normalização. Intermediários/finais mantêm os requisitos agregados e escolha única existentes.
- Canvas desenha conexões antes dos ícones. A conexão acende ao cumprir o requisito, mesmo sem investimento no destino. Bloqueados: cinza/50%; máximo: contorno e progresso dourados.
- Nove fontes PixelLab de **512×512**, exibidas em **32×32** coordenadas da árvore. O backing do Canvas acompanha densidade/zoom (até 3×), com amostragem suave. Fontes sem redimensionamento; limpeza exata de letras geradas fora do medalhão da espada via PixelLab Workbench. Recorte circular no Canvas.
- Clique/toque/Enter tenta investir na prévia, verificando requisitos, limite de ramos, máximo e PT. Shift+clique apenas inspeciona. Botão +1 preservado. Confirmar aplica transacionalmente; descartar preserva o save.
- Botões DOM mantêm nomes acessíveis, progresso e foco. Pan/zoom/pinça preservados, assim como a moldura externa.
- Proveniência: assets/ui/talents/manifest.json. Custo: 18 gerações (9 estudos iniciais 32px e 9 artes HD utilizadas). Estudos fora do pacote público.
- Sem mudança da versão de save. Ranks avançados herdados v1 preservados; novos investimentos exigem o intermediário. Rollback: reverter o commit, preservando armazenamento local.

## Revisão aprovada: 96 px, transparência e ícones exclusivos — 26/10/2026

O proprietário rejeitou a escala de 32px por falta de legibilidade e aprovou a revisão visual antes da publicação.

- Os ícones passam a 96×96 coordenadas de tela ao abrir (zoom inicial 100%). O botão “96 px” restaura a escala; “Visão geral” é uma opção explícita. Margens transparentes são medidas uma vez e descontadas no desenho para que a arte ocupe o tamanho anunciado.
- Nove recortes transparentes preservam os medalhões originais em cutouts/. Remoção feita no PixelLab Workbench, sem novas gerações pagas. Fontes anteriores mantidas por proveniência.
- Cada um dos 21 intermediários e 21 finais usa seu próprio PNG em special/, em vez da fruta/estrela genérica. Fontes nativas 256×256 com transparência; custo do lote: 42 gerações. O manifesto inclui prompts, IDs, classe e habilidade correspondente.
- O fundo é a segunda imagem enviada pelo proprietário, copiada sem alterações em ocean-background.jpeg. SHA-256 registrado no manifesto.
- Janela ampla e cabeçalho compacto; detalhes só aparecem ao selecionar um nó. No móvel, a árvore mantém 96px e permite arraste, com detalhes em fluxo e rolagem. Ancoragem inicial no tronco é recalculada após mudanças de tamanho.
- As conexões dos finais passam por uma junção que expressa o requisito “qualquer ponta válida”, sem cruzamentos de todas as pontas com todos os finais. Nenhuma regra, custo, talento ou investimento foi alterado.
- Testes cobrem as sete classes, sete resoluções, toque, zoom, confirmação/recarga, falha de storage, saves antigos, tamanho 96px e 42 caminhos exclusivos.


## Correção de sobreposição, seleção e zoom — 31/10/2026

Branch fix/talent-icons-selection-zoom, base 4788ca4 (main após merge do PR173).

Causas reproduzidas no Chrome:
- O upgrade de botões excluía somente .talent-node. Os seis intermediários/finais recebiam .ui-button; a regra global de navegação aplicava border-image com fill, formando quadrados opacos sobre as artes do Canvas.
- A margem vertical legada de 17px nos talentos comuns deslocava o alvo HTML em relação ao ícone. Canvas, outline do botão e disco interno podiam desenhar anéis ao mesmo tempo.
- Visão geral calculava uma escala abaixo do limite aplicado aos outros controles; o limite anterior de 20% também permitia leitura muito reduzida.

Correção:
- Todos os nós da constelação ficam fora da conversão para botão comum. O alvo tem margem zero, fundo/border-image transparentes, sem disco legado nem pseudo-conector.
- Um único pseudo-elemento circular do alvo representa máximo, seleção, hover e foco de teclado. O Canvas mantém artes, conexões e graduação, sem outro anel de seleção/máximo. Centros conferidos com tolerância de 0,1px no navegador.
- Limite compartilhado 58%–180% para botões, roda, teclado, pinça, visão geral e restauração da visualização. O botão de diminuir fica desabilitado em 58%. O padrão 100% / 96px permanece.
- Arrastar não seleciona os textos. Pan, foco, inspeção, prévia, confirmação, descarte e persistência continuam disponíveis.
- Em telas onde a árvore não cabe inteira a 58%, usar arraste ou foco nos nós para navegar. Visão geral respeita o limite de legibilidade solicitado.

Sem novas artes, uso de PixelLab, mudança de IDs, bônus, custos, ranks ou formato de save. Reversão pelo commit da correção; não é necessária migração.

Arquivos: talent-ui.js, ui-system.js, ui-screens.css, testes de Canvas/visual e workflow .github/workflows/talents-visual.yml.

Validação local:
- 10 resultados Node aprovados em oito arquivos pertinentes: talentos, Canvas, conquistas/finais, UI, contratos, preview e componentes/comparação do inventário.
- talent_canvas_browser.py passou: sete classes, sete resoluções, requisitos, prévia/clique/inspeção, máximo, confirmação, reload, descarte, saves herdados, alta densidade, toque e falha de armazenamento; zero erros de página.
- talent_visual_browser.py passou na fonte e em dist: 21 alvos por classe, sete classes, cinco resoluções, alinhamento das artes/seleção, nós treinados, transparência, zoom por todos os cinco controles e ausência de mutação de save. Pinça usa eventos reais de entrada do Chrome.
- Build Pages e verificação de sintaxe/diff passaram.
- O roteiro legado talents_browser.py foi tentado, mas não iniciou: solicita o Chromium do Playwright ausente nesta máquina. O roteiro atual talent_canvas_browser.py foi executado no Chrome instalado, incluindo as verificações transacionais listadas acima. Não declarar o roteiro legado aprovado.
- Capturas reais e saves controlados ficam fora do Git, em diretórios temporários. Prévia final: mare-talent-visual-fix/talents-fixed.png.

Workflow novo executa regressão Node, roteiro Canvas na fonte e roteiro visual no pacote estático, com capturas como artefatos temporários do CI. Publicação da branch/PR não equivale a merge; aprovação permanece com o proprietário.


## Interface HD — 31/10/2026

A constelação agora usa três colunas, madeira compartilhada, medalhões centralizados e bônus totais canônicos, com zoom mínimo de 58%. Regras e saves preservados. Consulte [TALENTOS-HD.md](TALENTOS-HD.md) para arquitetura, arte, testes e limites de enquadramento.
