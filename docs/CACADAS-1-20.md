# Caçadas 1–20 — integração e balanceamento

## Resumo para o colaborador

- Dawn usa setores Nv.1–10; Conchas Nv.11–20, com entrada no nível 11. Monstros não acompanham mais o nível do jogador.
- Chefes fixos Nv.10/Nv.20 aparecem no setor final após 12 abates naquela ilha. Respawn de 90s persiste entre viagens/reloads.
- Especiais têm aviso no chão e mira travada; o jogador pode sair, interromper conjuradores e usar a tentativa de desvio da auto-caçada.
- XP, ouro e equipamento vêm do encontro. Primeira vitória rende arma rara/épica da classe, com resgate único e protegido contra mochila cheia.
- Catálogo/fórmulas em `hunt-system.js`; integração em `game.js`. Sem mudanças de dimensões, terreno, sprites ou custos de geração.

Branch `feature/ruinas-brasas`, base `5f4902e`. Integrar por PR. Após o merge, o colaborador deve incorporar a main à sua branch. Combinar edições em `game.js`, `index.html` e `ui-nautical.css`; alterações nesses arquivos foram necessárias para ligar a nova lógica. Para outra ilha, configurar encontros, catálogo e geometria antes de liberar viagem.

## Rota e encontros

| Dawn | Níveis |
|---|---|
| Cais das Cinzas | 1–2 |
| Rua dos Corsários | 3–4 |
| Estaleiro Partido | 4–5 |
| Mercado Calcinado | 5–6 |
| Pátio das Âncoras | 7–8 |
| Mirante do Farol Quebrado | 8–9 |
| Fortaleza da Caldeira | 9–10; Capitão Nv.10 |

| Conchas | Níveis |
|---|---|
| Pátio da Vigília | 11–13 |
| Docas Veladas | 14–16 |
| Catacumbas da Névoa | 17–19 |
| Bastião das Conchas | 19–20; Guardião Nv.20 |

**Rota & recompensas**, junto ao retorno ao porto, calcula caminho real ao setor escolhido e pausa a auto-caçada. Ao chegar, o jogador a retoma. Não é teleporte. Os centros Dawn acompanham os anchors de `MareEmber`; Conchas usa a geometria legada. Todos os centros têm caminho navegável.

Spawns pertencem ao setor atual, a 180–450px do jogador, com 150px de respiro na chegada, chão/path válidos e distância mínima de 75px entre atores. Evitam mais de dois vizinhos em 220px. Limite global de oito; reposição a cada 2,4s quando há menos de seis comuns. Inimigos distantes de outro setor são retirados sem recompensa para permitir encontros novos ao explorar. Chefes não participam dessa limpeza. Arquétipos têm alcance/aggro próprios e perseguição limitada em relação à origem.

## Fórmulas e comportamento

`MareHunt.profile(area,sectorId,type,roll)` não recebe o nível do jogador. Comuns sorteiam dentro do setor; chefes usam o máximo da ilha:

- Vida: `(70 + nível × 22) × (1 + nível × 0,035) × fator de vida`.
- Ataque: `(6 + nível × 2,2) × fator de ataque`.
- Defesa: `(2 + nível × 1,15) × fator de defesa`.
- Fatores vida/ataque/defesa: pesado 1,25/0,8/1,3; corsário 1/1/1; conjurador 0,82/1,1/0,7; chefe 4,2/1,5/1,45. Resultados arredondados.
- Chefes: Dawn 1.644 HP/42 ATQ/20 DEF; Conchas 3.641 HP/75 ATQ/36 DEF.

Pesados são lentos e têm aggro menor; corsários perseguem; conjuradores marcam a posição original do alvo com aviso de 0,85s. A cada terceiro ataque, chefes alternam círculo de 140px/1,3s e faixa de 280×64px/1,45s. A mira não acompanha o jogador após o aviso. A resolução respeita linha de visão e controle/EMP. A auto-caçada procura terreno livre fora dos avisos e caminha até ele: não teleporta nem concede invulnerabilidade. Pode receber dano se estiver presa em animação ou não houver saída.

## Economia

A curva `xpNeeded` e os pontos por nível foram preservados:

- Comuns: `14 + nível × 6` XP; pesado ×1,1, conjurador ×1,12. Chefe: `nível × 35` XP.
- Até três níveis acima do inimigo: XP integral. Depois, −7 pontos percentuais por nível excedente, com piso de 15%. Ilhas não impõem nível máximo ao jogador.
- Ouro comum: `4 + nível × 2` a `8 + nível × 3`; chefe: `nível × 12` a `nível × 17`. Bônus de facção mantidos.
- Equipamento: tier `ceil(nível do inimigo / 5)`, Dawn 1–2 e Conchas 3–4; chance 14%/18% em comuns e 100% em chefes, havendo espaço. Comuns rolam até épico; chefes podem rolar lendário. Bônus de raros continuam aplicados.
- Ferro: 35%/45% em comuns; chefes garantem 6/10. Poções: 8%/12% em comuns, duas por chefe. Senhor do Submundo mantém sua exceção de caixas Nv.1 e lendários.

Primeira vitória: arma rara tier2 +300 dobrões em Dawn; épica tier4 +900 em Conchas. O resgate valida mochila, grava o candidato e só depois aplica. Falha de storage mantém a recompensa disponível. Mochila cheia não perde o prêmio de primeira vitória; o equipamento de drop normal exige espaço e informa quando não pode ser recolhido.

Três contratos antigos preservam IDs, contadores e resgates. Quatro novos contratos usam abates/chefes por ilha e bônus únicos. Não convertem estatísticas globais antigas em progresso local sem saber onde ocorreram.

**Limite de conteúdo:** chefes Nv.10/20 não satisfazem o requisito Nv.30 do Livro da Vontade. A regra de 5% e os desbloqueios/estoques existentes permanecem; o laboratório DEV fornece o livro para testes. Aquisição natural em chefes Nv.30+ depende das próximas regiões/chefes diários. Impel Down, ilhas futuras, gemas e drops diretos de pérolas continuam indisponíveis.

## Persistência e arquitetura

Novo campo: `hunts:{version:1,areas:{beach:{kills,bosses,firstRewardClaimed,bossReadyAt},swamp:{...}}}`. Migração idempotente; nível, XP acumulada, equipamentos, atributos, talentos, conquistas e preferências Haki preservados. Novos objetivos locais começam em zero porque os contadores antigos eram globais.

`monsterTypes` permanece como catálogo legado/preview da prisão; encontros do mundo usam `MareHunt.profile`. DEV cria os mesmos perfis regionais no save separado. Novo módulo incluído no observador local e build Pages com hash. Seis ícones principais da HUD mantidos. Nenhuma geração paga.

## Validação

- `node tests/hunt-system.test.cjs`: níveis, rotas, economia, tiers, gate/respawn, migração, resgate único/mochila cheia e avisos esquiváveis/interrompíveis com LOS.
- Todos os `tests/*.test.cjs`, sintaxe e `git diff --check`.
- `python tests/hunt_browser.py`: rotas em cinco resoluções, gate11, inimigos fixos para Nv.80, caminhada/vitórias reais nos dois chefes, aviso visual, persistência e falha de storage no resgate.
- `python tests/hunt_classes_browser.py`: amostras reais de 30s para cada uma das sete classes, com XP e sobrevivência. Não mede uma campanha completa 1–20.
- Regressões de Haki, viagem e DEV; build/Pages com 27 recursos versionados. Capturas em `%TEMP%/mare-hunt-qa`, fora do Git.
- `node tools/measure_hunt_balance.cjs`: baseline analítico com fórmulas reais, atributos 70/30 e ATQ6/DEF7/HP24. Sem skills, talentos, forja, deslocamento ou poções. No nível recomendado: TTK básico estimado Dawn 5,09–31,47s, Conchas 5,52–41,62s. Tanque/suporte são mais lentos; isso não prova equilíbrio perfeito entre classes nem duração real da campanha.
