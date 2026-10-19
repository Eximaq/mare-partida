# Árvores de Talentos

## Acesso e regras

O botão Personagem e o atalho P abrem uma seleção entre Personagem e Talentos. A primeira aba mantém atributos e o acesso ao inventário/equipamentos. A segunda mostra a árvore da classe ativa, com três ramos, cinco tiers por ramo e um núcleo com três talentos exclusivos. Os nós são passivos; não ocupam a barra de habilidades.

- O orçamento total é igual ao nível: nível 1 tem 1 PT; cada nível seguinte acrescenta 1 PT. Atributos continuam separados, com 5 pontos por nível a partir do 2.
- Cada nó comum aceita até 10 pontos. Um tier exige 5 pontos no nó anterior do mesmo ramo.
- Só dois ramos podem ter investimentos. O primeiro ponto no terceiro é recusado, tanto na interface quanto na validação do modelo.
- Após 10 PT em nós comuns, o núcleo libera a escolha de um exclusivo, por 1 PT adicional. Só um pode ser escolhido.
- Montar a prévia não altera atributos nem save. Confirmar abre um diálogo e valida novamente classe, revisão, orçamento e dependências. Descartar, cancelar ou fechar preserva os pontos confirmados.
- Redefinição gratuita, mediante confirmação, somente no porto. Devolve os pontos da classe ativa e mantém atributos, equipamentos e outras árvores.
- Cada classe guarda uma build independente com orçamento igual ao nível. Somente a classe ativa concede bônus; trocar de classe não soma árvores.

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

Limites derivados: velocidade de ataque 3/s, crítico 65%, esquiva 45%, precisão 100%, mitigação comum 60%, penetração física/mágica 60%, roubo comum 30%, eficiência de energia 40%, bônus de área 50% e bônus relativo de raros 50%. Fúria é uma camada multiplicativa adicional, condicionada à vida baixa. Alcance/área respeitam os obstáculos do mapa. A exclusividade de gemas, pérolas e caixas para Impel Down permanece intacta.

**O jogo atual é solo e local, sem backend ou grupos multiplayer.** Aura funciona no próprio suporte. Cura em Corrente tem contrato e testes para destinatários reais, mas não cria aliados fictícios nem cura o próprio alvo duas vezes. Intervenção tem processamento e teste de controle para suporte/aliados; os monstros atuais ainda não aplicam atordoamento/congelamento ao herói. As interfaces indicam essa limitação. Ao adicionar party ou monstros com controle, usar `chainHeal`, `auraRecipients` e `applyControl`, sem duplicar bônus nem criar uma segunda regra de talentos.

## Persistência e arquivos

Migração `talentVersion:1`, orçamento derivado do nível, builds por classe e `talentSeq` para rejeitar confirmações antigas. Backup original em `mare-partida-save-v1-before-talents-v1`. A normalização limita saves inválidos ao orçamento, dois ramos, tiers válidos e exclusivo conhecido. Recarregar não concede pontos extras. Falha ao gravar a confirmação mantém o estado vivo e os pontos anteriores.

- `talent-system.js`: catálogo, migração, orçamento, transações e atributos.
- `talent-combat.js`: gatilhos e estados passivos, sem dependência da interface.
- `talent-ui.js`: árvore, inspeção e prévia.
- `game.js`, `ui-nautical.css`, `index.html`: integração no jogo e layout responsivo.
- `tools/build_pages.py`: três novos módulos com caminhos relativos e hashes próprios contra cache.

## Verificação

`node tests/talent-system.test.cjs` cobre 13 grupos, incluindo as 7 árvores, os 21 exclusivos, migração, confirmações antigas, orçamento, ramos, expiração e destinatários reais. `python tests/talents_browser.py` valida seleção inicial, prévia, confirmação/cancelamento, recarga, reset, falha de armazenamento, cinco viewports e combates reais das sete classes em contextos isolados. Capturas ficam na pasta temporária do sistema, fora do repositório. Rodar também as regressões Node, personagens, animação de combate e o pacote Pages.
