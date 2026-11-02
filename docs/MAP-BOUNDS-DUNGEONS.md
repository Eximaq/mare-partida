# Limites finitos dos mapas e Masmorra de Chefes

## Fase 1 — câmera e carregamento

A inspeção confirmou renderização de imagens completas e caches locais de canvases (Dawn/Ember), sem fila de downloads de chunks inexistentes. Não foi confirmada a hipótese de busca infinita. A câmera anterior usava apenas o retângulo declarado, sem verificar lacunas nativas. A navegação dos 18 mapas era criada sincronamente na abertura: 1.380 ms no ensaio Node local; esse valor não representa tempo de frame em outros dispositivos.

A cobertura visual usa as grades nativas, incluindo água, muros e terrenos escuros. Não usa a máscara de caminhada como existência. Dawn conserva a água original que já completava o interior da exportação; Ember e o cenário procedural legado têm superfície finita própria. Coordenadas negativas são válidas. Novos mapas podem declarar visualCoverage com rows, tile, x, y e version; alterar a versão invalida o índice e as respostas de ausência.

Um índice de soma por região permite consultas constantes; linhas de conteúdo são preparadas uma vez, sem varrer pixels por frame. A câmera procura posições válidas de forma limitada, preserva o jogador no enquadramento e não interpola por buracos. Zoom efetivo respeita o tamanho da tela e da cobertura, até 1,8. Quando um corredor, buraco ou mapa muito pequeno impede enquadramento completo, recorta-se a área existente sobre acabamento escuro finito; não há piso adicional nem alteração de colisões. Nenhum bloco colocado pelo proprietário foi removido.

O mapa e a navegação precisam estar prontos antes da simulação e da revelação. Navegação é preparada apenas quando utilizada, por lotes de 24 células com orçamento aproximado de 2 ms por frame; um lote ou pausa do navegador pode ultrapassar esse orçamento. Grades prontas são preservadas, e mapas anteriores não continuam sendo preparados após uma troca. Falhas de imagem permanecem explícitas, sem repetição por frame; recarregar tenta novamente usando o cache HTTP normal. Não existe uma fila nova de chunks.

Mapas auditados: lobby, hunt legado, alabasta, alubarna-01 a 05, impel-down, embers, orange, conchas, dawn, rare, syrup, baratie, arlong e loguetown. Skypiea não possui mapa registrado e não foi habilitada.

Validação: testes Node de cobertura/zoom/navegação/carregamento; navegador real visitando os 18 mapas, zoom 0,8/1/1,8, telas móvel/desktop/ultrawide, cache frio/quente, conexão retardada e imagem indisponível sem novas solicitações repetidas. A câmera não deslocou o personagem. No ensaio Chromium, maior atualização de câmera 0,1 ms e maior linha de navegação 1,7 ms; caches Dawn 8/35 e Ember 6/32; zero erros de página/requisições no percurso normal. Capturas e relatórios de ensaio ficam fora do Git.

## Fase 2 — Masmorra de Chefes

O menu existente preserva sua ancoragem e ordem: Mapa do Arquipélago, Impel Down e Masmorra de Chefes. Não há outra barra lateral permanente. A janela segue a dimensão máxima compacta do Haki: 1300 × 850 px, limitada à viewport; ilustração grande do chefe selecionado à direita e apenas os dois cards reais à esquerda. Layout e seleção não alteram combate ou recompensas. Cores de disponibilidade, texto e seleção são independentes. No móvel, o conteúdo continua acessível por rolagem.

### Fonte nativa e coordenadas

Quest Dungeons, mapa PixelLab 8cf41b1c-df16-4a86-beb8-74ab6dc6d7f3, foi importado do arquivo fornecido pelo proprietário. O importador tools/import_quest_dungeons.py preserva byte a byte o composto PNG e os 15 sprites RGBA originais, com 44 objetos. A grade de terreno real foi obtida separadamente do metadado nativo PixelLab: 29 × 26 células de 64 px, 562 células presentes. Não se desenhou cenário substituto nem se alterou a disposição dos objetos. A navegação usa o chão nativo e footprints sólidos; os objetos são recompostos em profundidade quando o personagem está atrás deles.

A indicação (802, -168) corresponde a pixels do mundo do editor. A exportação começa em (-128, -448); portanto o mesmo baú ocupa (930, 280, 64, 64) no mundo normalizado. Sua área interativa acompanha esse objeto, sem desenhar outro baú sobre o original. Centro dos pés: (961,5; 332), raio de interação 90 px. Spawn explícito no tapete inferior: (928, 1440); adversário em (928, 672). Ambos têm chão válido e rota até a aproximação do baú. Origem, hashes e transformações ficam em assets/quest-dungeons/provenance.json.

### Encontros e identidade

| ID | Chefe da seleção | Entrada | Monstro provisório |
|---|---|---|---|
| alvida | Alvida | Nível 10 | Mr. 3, catálogo mr3 |
| morgan | Morgan | Nível 20 | Cocox, catálogo cocox |

Os perfis originais são reutilizados somente na instância. Não há renomeação global de monstros, sprites definitivos novos nem alteração das ocorrências no mundo. Cada tentativa possui runId, encounterId e ownerId próprios. As ilustrações de seleção não substituem sprites de combate.

Fluxo: bloqueada → disponível → em andamento → vitória pendente → recebida. Sair ou perder antes de vencer permite nova tentativa; o inimigo anterior não conclui uma tentativa nova. Vitória exige o adversário e os IDs exatos, persiste antes da interação e não concede loot comum. Reentrada após vitória recupera o baú sem outro inimigo. Baú cheio, distante, já recebido ou com falha de gravação não concede parte da recompensa. O baú fica no mapa; sua ilustração na HUD é informativa.

### Recompensas e síntese

Cada conclusão concede cinco Fragmentos Rank E vinculados. XP provisória: 20% da curva real 10→11 ou 20→21 no nível recomendado; 10% dessa mesma base acima dele. A XP é congelada ao registrar a vitória. Não usa a progressão do nível atual de um personagem avançado.

Adendo do proprietário: Berry corresponde a floor(stats.goldEarned / 100), o total histórico adquirido pelo personagem, congelado ao iniciar a tentativa. Não usa saldo disponível nem os ganhos posteriores da tentativa. A interface mostra apenas os valores finais de XP/Berry, sem suas porcentagens ou fórmulas.

Materiais append-only, sem renumerar itens antigos: akuma_fragment_e, akuma_fragment_d, akuma_fragment_c, akuma_fragment_b, akuma_fragment_a, akuma_fragment_s. Raridades: raro, épico, épico, lendário, lendário, supremo. Arte única da fruta escura com interrogação e peça de quebra-cabeça, reutilizada E–S por decisão do proprietário; rank e raridade permanecem identificados no nome, dados e apresentação. Quantidade empilhável até 9999, sem misturar proprietários ou itens livres. D–S não possuem fontes de obtenção nem receitas novas. Somente os dois baús concedem E.

FORMAR AKUMA consome exatamente dez fragmentos E desbloqueados do personagem e entrega uma fruta E elegível do catálogo atual. Política provisória: distribuição uniforme na lista elegível, com gerador injetável centralizado em MareBossDungeons.craft para futura substituição por pesos aprovados. Nenhuma garantia de ineditismo. Validação de capacidade ocorre antes do sorteio. Uma única gravação inclui consumo, fruta e revelação; em falha, nada é consumido, e a tentativa na sessão conserva o resultado sorteado. A janela utiliza o ícone oficial e não sorteia, equipa, consome ou registra a fruta. Recarregar preserva item e revelação. Continuar encerra somente a apresentação.

Os materiais e a fruta formada conservam boundToCharacter. Venda existente é bloqueada; equipar/usar um item de outro proprietário é rejeitado. Não existem mercado, correio, troca ou cofre coletivo implementados no jogo estático: nenhum mecanismo fictício foi adicionado. Novos sistemas de transferência deverão respeitar o vínculo.

### Persistência e fronteira com o servidor

A migração cria uma identidade UUID persistente para saves antigos, sem depender do nome. bossDungeons armazena versão, sequência, registros e revelação. As transações confirmam identidade e sequência salva e gravam o save inteiro uma vez. Falha mantém a operação pendente.

Web Locks e MareSaveWriter permitem somente uma aba gravadora por chave de save. Uma segunda aba mostra modo somente leitura e bloqueia entradas/simulação; precisa recarregar após fechar a primeira. Navegadores sem Web Locks conservam o jogo comum, mas não confirmam transações de masmorra/síntese. Isso protege abas locais; não é autoridade multiplayer, antitrapaça ou coordenação entre dispositivos. O save continua local e editável pelo dono do navegador. Proteção real entre dispositivos exige futura transação no servidor. Nenhum serviço, schema, migração ou contrato do servidor alpha foi alterado; o cliente online autoritativo permanece separado desta implementação estática.

### Arte

Retratos HD de seleção Alvida/Morgan: ferramenta imagegen integrada do ChatGPT, conforme autorização específica do proprietário. Fragmento: PixelLab. Novos ícones de baú, Berry, XP e espadas: PixelLab Pro; Berry/XP/espadas gerados pela conexão MCP direta da conta nova. Canal alfa real, sem fundo de placa e sem ampliar o arquivo para simular resolução. Arquivos, prompts e IDs em assets/ui/boss-dungeons/art-manifest.json e assets/quest-dungeons/fragment-art.json. PNGs finais ficam no repositório, sem URLs assinadas ou credenciais. O mapa e seu baú físico não foram regenerados.

### Validação

- 145/145 arquivos Node legados, incluindo cobertura/navegação, mapas, talentos, Haki, HUDs e catálogo; 20 casos Node específicos de cobertura/masmorras.
- 67 testes da fundação do servidor e verificação TypeScript aprovados, sem alteração do servidor.
- Chromium real: 19 mapas registrados, cache frio/quente, zoom e diferentes telas, imagem retardada/404 sem repetição infinita, preservação da posição lógica do jogador.
- Ensaio final de carregamento em 19 mapas: maior lote de navegação 4,5 ms, p99 de 0,2 ms; maior atualização de câmera 0,1 ms. São medições locais, sujeitas ao dispositivo e pausas do navegador.
- Auditoria de profundidade real em nove mapas, silhueta, parede interrompendo projétil e liberando movimento, além de visualização móvel.
- Masmorras no navegador e no pacote dist: entrada por nível, seleção da ilustração, spawn, inimigo incorreto rejeitado, baú antecipado bloqueado, vitória/reentrada, dez fragmentos, botão real FORMAR AKUMA, confirmação, revelação, reload, vínculo, segundo escritor bloqueado e oito painéis anteriores. Zero erros de página.
- Regressão Supa no navegador: combate, ícones, custos, recargas, escudo e expiração aprovados.
- Build local python tools/build_pages.py aprovado. Evidências e saves de teste ficam fora do Git.

### Pendências obrigatórias

- CHEFES DEFINITIVOS: concluído em 02/11/2026 para os nove chefes reais; ver [integração e validação](NINE-DUNGEON-BOSSES.md).
- PARTY EM MASMORRAS: futura; nenhuma simulação de grupo ou divisão de recompensa nesta sprint.
- MASMORRAS 30–90: sete entradas reais integradas; recompensas específicas aguardam definição, com vitória preservada sem concessão automática.
- FRAGMENTOS: fontes gerais, pesos definitivos e receitas D–S aguardam orientação; nenhuma fonte adicional criada.
- RECOMPENSAS: interpretação de XP continua provisória. Berry segue o adendo de 1% histórico na entrada; fórmula oculta na HUD.
- MAPAS: proprietário poderá remover blocos artificiais após validar os limites; não foram removidos nesta sprint.
- SERVIDOR: persistência/autoridade multidevice, economia e transações online deverão ser integradas em sprint própria. Não apresentar os bloqueios locais como segurança multiplayer concluída.
