# Kaizoku Idle — validação global parcial

Base do PR #322: `ef74788c4512853632dc07033c238e76e48fb8fa`. Branch `fix/rework-map-user-flows`.
Build local: SHA-256 de `dist/index.html` `9edfd6ae4db8e310472d5e55454a937cb24ba42657648abe612970872c8545eb`.
Revisão visual `native96-2404408f188c3d08`. Inventário `452fd41de2150d6051f526fc23cd6ce49e1826cb22769dd7b19792d10f055b73`.

## Preparação na entrada e nas trocas

O mapa só libera o personagem local depois que as poses requeridas estão compostas. A configuração publicada possui seus próprios quadros, independentes do cache oportunista de prévias. O fluxo seleciona a fonte exata de cada ação e direção e usa o compositor modular publicado para os casos com camadas separadas disponíveis. Os recursos de Zoro e os clipes das formas Zoan passam pela preparação dos renderizadores próprios. O cliente aguarda a configuração vigente antes de iniciar o movimento ou enviar a ação de combate. O servidor mantém a autoridade de jogo.

Uma troca mantém a configuração anterior até que a próxima possa ser publicada. O pedido antigo é abortado e não pode publicar seus quadros. Um erro identifica a fonte ou configuração afetada. A entrada oferece nova tentativa e permite corrigir a equipagem pela interface. As transições em que uma ação é resolvida como repouso mantêm o contrato anterior.

## Resultados por escopo

| Área | Resultado | Cobertura comprovada |
|---|---|---|
| Entrada e primeira utilização | PASSOU | Edge, dois contextos novos, Espadachim Pirata masculino e feminino, peitoral 6 e arma 0. Decodificação atrasada manteve o personagem e o controle bloqueados. O primeiro deslocamento EAST e o primeiro ataque EAST exibiram 8/8 quadros cada em ambos os corpos. |
| Pressão no cache de prévia | PASSOU | Teste Node do renderizador percorreu todos os quadros preparados de repouso, caminhada e ataque desarmado nas quatro direções, após abrir clipes de outra configuração. |
| Botas 8 e 9 e luvas 25 e 26 | PASSOU nos conjuntos exatos | Dez conjuntos, 120 amostras de repouso, caminhada e ataque desarmado. A caminhada e o ataque exigiram dois quadros observados por cenário. O teste não solicitou pré-carga manual. |
| PNG ausente | PASSOU no teste negativo | A camada de caminhada retornou HTTP 404 induzido. O mapa aguardou e identificou o arquivo. O botão de nova tentativa recuperou a composição após remover o 404. |
| Criação e recarga | PASSOU | Nove cenários com Espadachim, Atirador e Lutador. Inclui save recarregado e viewport estreito. |
| Rifle 115 V5 | PASSOU | Os cinco estados do ataque SOUTH da fonte exata apareceram no mapa. A retirada do capacete 157 impediu o uso da V5. |
| Catálogo | PASSOU na enumeração | 189 definições, 148 equipáveis, 42 armas. Os 189 caminhos de ícone de inventário derivados do catálogo existem no pacote. Interação individual, poses de todas as armas e fidelidade de cada ícone seguem pendentes. |
| Aparência | Cobertura parcial | Dois corpos e paleta inicial no mapa. O catálogo inclui 14 escolhas de cabelo, 10 cores de cabelo, 8 cores de pele, 5 estilos de olhos e 6 cores de olhos. |
| Navegação | PASSOU no teste estrutural | 424 rotas em 21 mapas do motor. A simulação de rota não substitui as visitas pelo navegador nem a interação com os objetos. |
| Integridade do pacote | Cobertura parcial | 5.942 arquivos inventariados. 5.660 passaram no validador de formato aplicável e 282 aguardam validação de formato. 16.241 PNGs arquivados passaram em hash, leitura do ZIP e decodificação. Nenhuma colisão de capitalização detectada. |
| Referências | Cobertura parcial | 3.046 referências estáticas aguardam triagem, incluindo caminhos virtuais dos ZIPs e referências históricas. A auditoria canônica tem 4.464 linhas, com 4.320 selecionadas e 144 pendentes. São linhas de vínculo, não combinações validadas. |
| Demais sistemas e consumidores | NÃO TESTADO nesta rodada | Fluxos online, todos os mapas no navegador, NPCs, chefes, áudio, telas, habilidades e efeitos fora dos cenários acima. |

O teste de primeiro uso usa o cadastro e a equipagem iniciais reais. A única preparação de cenário posiciona um inimigo e o personagem numa faixa livre. Movimento por teclado e clique de combate percorrem os controles do jogo. Uma rodada concorrente anterior observou cinco dos oito quadros masculinos com 160–190 ms entre desenhos. Foi preservada como ocorrência de desempenho. O reteste isolado observou os oito.

## Ocorrências

| ID | Gravidade | Reprodução e resultado |
|---|---|---|
| VIS-001 | Alta | Cache frio, criação com peitoral 6 e Espada de Ferro Salgado. A base do PR preparava repousos e podia desenhar a arma omitindo o peitoral. A composição preparada usa o compositor modular com os IDs preservados. Reteste de entrada e primeira ação nos dois corpos passou. |
| VIS-002 | Alta | Equipar 115 + 151 + 157 e atacar SOUTH. No primeiro patch, repouso e ataque compartilhavam o mesmo ID e a preparação reutilizava uma timeline de um quadro. A chave agora inclui a timeline. Reteste Node e cinco estados desenhados no navegador passaram. |
| VIS-003 | Média | Sob carga simultânea, amostragem masculina do primeiro ataque saltou quadros mesmo com os recursos preparados. Reproduzir a rodada em concorrência com as varreduras. O teste isolado passou. Capacidade sob pressão continua pendente. |
| VIS-004 | Média | Dois testes históricos de bob feminino divergem sobre pele clara e proteção de pixels. Ambos também falharam com os renderizadores da base do PR. A expectativa visual requer revisão independente. |
| VIS-005 | Alta | Configurações legalmente equipáveis com clipes sem fonte compatível podem chegar ao estado de erro. A auditoria ainda não delimitou todas essas combinações. A cobertura dos efeitos auxiliares e dos caminhos de reconexão ainda precisa ser comprovada. |

## Matriz e retomada

O enumerador calcula **403.204.335.722.496.000 configurações por modo** com o domínio de equipagem e aparência do catálogo. O total inclui slots sem impacto no sprite e visibilidade quando há capacete. Capas têm presença de item prevista e ausência intencional na composição. Restrições de classe são aplicadas antes da enumeração. O número é o espaço enumerável do catálogo, não uma medição de personagens que já obtiveram todos os itens. A execução por quadro e por consumidor ainda não cobre integralmente nenhuma configuração. Restam **403.204.335.722.496.000** configurações completas por modo. O cursor inicial continua em `0`; as provas parciais são indexadas separadamente para retomada.

As verificações de recursos e de navegação não substituem a execução funcional. Permanecem pendentes a matriz de ações alcançáveis e transições por configuração, verificação quadro a quadro dos demais clipes, trocas rápidas fora de ordem, falhas de outros formatos, formas e efeitos no mapa, persistência online e inspeção de encaixes em todas as famílias. Os carregadores de efeitos de fruta que ainda usam o próprio fluxo devem ser auditados individualmente.

## Reprodução

```text
python tools/player96_release.py --check
python tools/build_pages.py
node tools/audit_game_catalog.cjs catalog.json
node tools/audit_game_catalog.cjs catalog.json 0 32 offline
python tools/audit_game_resources.py --out audit-output
node tools/audit_maps.cjs --output maps.json
node tools/audit_rework_integration.cjs canonical-sources.csv
node --test tests/rework-visual-readiness.test.cjs
node tests/rework_visual_readiness_browser.cjs
node tests/rework_default_game_browser.cjs
node tests/rework_v5_ui_browser.cjs
node tests/boots_gloves_map_browser.cjs
```

O navegador precisa de Playwright, `MARE_TEST_URL` apontando para a build servida e `MARE_EVIDENCE_DIR`. Use `MARE_RECORD_VIDEO=1` para gravar os ciclos e `MARE_FAIL_VISUAL=1` para induzir o PNG ausente e exercitar nova tentativa. Execute a auditoria de integridade após o término do empacotamento. O CI remoto tem resultado independente das rodadas locais.
