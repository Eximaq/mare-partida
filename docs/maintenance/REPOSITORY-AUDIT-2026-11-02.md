# Auditoria de manutenção — Kaizoku Idle

Data local: 02/11/2026. Base: main 903ec11, com PR #226 integrado. Branch feature/repository-maintenance. Escopo de manutenção: sem conteúdo, balanceamento, migração, geometria de mapas ou redesenho. A cópia antiga e modificada em Downloads permaneceu intacta.

## Diagnóstico comprovado

- Linha de base: 7.957 arquivos versionados, 160.290.419 bytes (152,86 MiB); assets 121.945.196 bytes (116,30 MiB). PNG: 5.643 arquivos; JSON: 805; MP3: dois. Nenhum dump, cache de dependências ou build reproduzível versionado foi encontrado nessa base.
- Maiores grupos: UI 46.462.114 bytes; sprites-combat-v2 23.511.737; Akuma 10.582.700; áudio 7.960.784. Os maiores arquivos são mapas oficiais e retratos de chefes, todos preservados. Maior blob encontrado também no histórico: mapa de Alubarna, 6.471.629 bytes.
- Git informou 122.128 KiB em packs e 28.299 KiB em objetos soltos antes dos commits. O diretório .git é compartilhado por muitos worktrees; não representa exclusivamente esta sprint. Não foi executado GC, migração LFS nem reescrita de histórico. Excluir imagens da revisão atual não reduz os blobs históricos. Não há configuração LFS; os tamanhos atuais não justificam uma migração destrutiva urgente.
- Encontrados 339 grupos de duplicatas binárias exatas, com 5.553.919 bytes redundantes. A maioria pertence a referências/ensaios de geração e a fontes legítimas de mapas. Foram preservados: identidade de hash isoladamente não comprova desuso nem autoriza alterar manifests, importadores ou mapas.

## PR de 2h30: o que os logs permitem concluir

O PR #226 tem 57 arquivos alterados, 836 adições e 51 remoções; foi criado às 22:14:17 e recebeu merge às 22:25:31, horário de São Paulo em 02/11. Vida total de 11min14s. O último conjunto de verificações começou às 22:21:29; a maior duração registrada foi 4min25s, incluindo execução e eventual fila do workflow. Push local observado na sprint anterior levou cerca de três segundos. Esses dados não comprovam 2h30 de envio, build ou CI. Não foi identificado pelo proprietário outro número de PR a que as 2h30 se referem; a duração de implementação/revisão humana não pode ser inferida dos logs de Actions.

Amostra detalhada: build TypeScript 1s; npm ci 1s; foundation 14s; integração PostgreSQL 175s. No job de inventário, preparar Chromium levou 23s, testes 119s e upload de 37.603.190 bytes apenas 2s. O build estático do job de lobby foi inferior à resolução de um segundo do log. Assim, não há evidência de que upload ou tamanho do build expliquem horas nessa amostra.

Causas de trabalho desnecessário comprovadas: muitas suítes visuais ativadas por game.js/index.html/build_pages.py; nenhum cancelamento das rodadas superadas de PR; downloads repetidos de Chromium; publicação de 793 arquivos que não são necessários ao jogo atual. Nenhum teste de segurança foi removido nem enfraquecido.

Dois jobs visuais do PR #226 falharam ao clicar no menu em telas estreitas: o botão Central do Navegante ficava fora da viewport após o acréscimo do Social. A correção restringe o flex dos oito controles até 380px, preservando arte, destinos e comportamento. Há teste com cliques reais em 320/360/380/390/760px.

## Limpeza efetiva e categorias

**A — removido confirmado:** sete bitmaps da primeira HUD, total 76.475 bytes. [Caminhos, tamanhos e prova de substituição](REMOVED-HUD-2026-11-02.md). O manifesto preserva origem e hashes como registros de retirada; fonte e arte HD atuais permanecem.

**B — preservado necessário:** native96 masculino/feminino e todos os recursos da release; aparência, equipamentos, todas as formas atuais, monstros, chefes, Haki e todas as frutas; mapas, colisões, terrenos e fontes do PixelLab; Party, Tripulação, profissões e demais recursos planejados. FactionSprites continua necessário para NPCs e os registros class84 conservam metadados lógicos; não foram confundidos com um fallback autorizado para o jogador.

**B — desenvolvimento, fora do pacote normal:** bancadas históricas, seus scripts e arquivos de revisão continuam no repositório e podem ser publicados por python tools/build_pages.py --include-reviews. O workflow histórico usa esse modo e mantém seus testes. O build padrão publica native96 e o jogo atual; retira do pacote os renderizadores review84 não importados pelas entradas atuais. O código de exportação histórica foi movido sem mudar as listas para tools/build_review_pages.py.

Oito folhas-fonte de geração da UI também ficam fora do pacote normal por lista explícita, não por exclusão genérica de nomes. Os recortes oficiais continuam publicados. As fontes permanecem no repositório e no modo --include-reviews; não se perde a capacidade de refazer/exportar os elementos.

**C — uso incerto, preservado:** placas HD reutilizáveis, corpos anteriores usados em ensaios isolados, exports de mapas, referências pagas e recursos sem menção textual direta. Caminhos dinâmicos são tratados pelos manifests native96, SpriteCombatV2, catálogo de itens, dados de mapas, importadores e bancadas. Não houve exclusão automática por grep, idade, cor ou nome. Não foram encontrados chunks inválidos cuja remoção pudesse ser comprovada nesta rodada; geometrias e blocos de proteção visual foram mantidos.

O inventário reproduzível tools/audit_repository.py gera JSON/CSV com caminho, bytes, tipo, SHA-256, sistema, referências literais resolvidas, presença no pacote e decisão B/C. Referências dinâmicas continuam sujeitas à leitura dos manifests; a ferramenta nunca decide exclusões automaticamente. Os sete itens A constam do inventário de remoção acima. Saída padrão local ignorada pelo Git.

## Pipeline, carregamento e configurações

- 22 workflows cancelam apenas execuções superadas do mesmo PR; main/deploy não são interrompidos por essa regra.
- 20 jobs visuais reutilizam Chromium por sistema operacional e versão exata de Playwright. Instalação/verificação das dependências e todos os testes permanecem. Benefício de cache quente depende das próximas execuções; não foi inventada uma nova duração total de CI.
- .gitignore protege os diretórios descartáveis .party-test-runtime e .maintenance-local, sem remover arquivos dos colaboradores. Locks e dependências fixadas preservados.
- Não foi criado outro cache. O compositor native96 já tem fila e limites; os mapas e galerias já usam carregamento por necessidade. Excluir as prévias da distribuição não altera as URLs atuais nem o relógio de combate. Não há evidência para prometer aumento de FPS ou redução de memória; não foi introduzida uma refatoração para produzir esse tipo de número.

## Métricas antes/depois

| Indicador | Antes | Depois |
|---|---:|---:|
| Arquivos versionados | 7957 | 7956 |
| Bytes das fontes versionadas | 160290419 | 160246436 |
| Arquivos do pacote normal | 4125 | 3332 |
| Bytes do pacote normal | 139746497 | 134369743 |
| Assets versionados, bytes | 121945196 | 121868721 |
| PNGs antigos removidos do repositório | — | 7 (76475 bytes) |
| Histórico Git reescrito | não | não |
| Última medição local do build, segundos | 8.50 | 5.96 |

Redução do pacote normal: 793 arquivos (19,2%) e 5376754 bytes (5,13 MiB, 3,8%). O diretório de fontes perde somente as sete imagens, acrescido das ferramentas/testes/documentação de manutenção; não confundir essa alteração com o tamanho de node_modules, dist ou dos outros worktrees. O Git continua armazenando versões anteriores.

Tempo local é uma amostra, não benchmark controlado: houve outra medição de 15,32s durante a validação e a preparação inicial do pacote compacto levou 5,60s. Hardware, antivírus, cache e concorrência interferem; a redução de arquivos/bytes é determinística, a redução de tempo não está garantida. Tempo de abertura e memória não foram comparados em condições controladas e não são declarados como ganhos.

## Validação executada

- npm test: 204 testes foundation e 151/151 arquivos Node legados aprovados. Party, saves, inventário, forja, Haki, frutas, Zoans, mapas, masmorras, talentos, contratos e compositor atual cobertos nas respectivas suítes. O harness separado supa-browser não é contado como executado.
- npm run build e npm run typecheck aprovados.
- Build normal e --include-reviews aprovados; cinco testes novos conferem dependências HTML, bytes de todos os recursos native96, HUD/fonte atuais e ausência de fontes/previews antigas no pacote normal. Bancadas completas confirmadas no modo opcional.
- Navegador real: ownership dos sprites (quatro flags antigas, PNG ausente/corrompido, carga atrasada e recuperação): zero requests de corpos antigos e zero erros.
- Criação: sete classes, 42 especiais, quatro facções, nove resoluções, navegação, confirmação e reload.
- Inventário: 12 slots, abas, filtros, seleção, equipar/remover, ocultação de capacete, vazio/cheio, paginação, nove resoluções e HUDs de quatro facções.
- HUD density: 20 vistas em oito resoluções, navegação somente de apresentação e controles preservados. Social/Personagem/Modos/Central com cliques reais nas cinco larguras do novo teste.
- Todos os YAML de workflows foram analisados com PyYAML.

Não foram executados testes no PC do colaborador nem novamente todo o multiplayer com PostgreSQL nesta sprint: backend, schema, combate e protocolos ficaram byte a byte fora do diff. Essa validação não equivale a uma implantação em produção. Os testes de segurança/integridade completos continuam no CI.

## Pendências e recuperação

1. Comparar caches e durações após as próximas execuções de CI; não é possível prometer o fim de uma demora de 2h30 não reproduzida nos logs consultados.
2. Se for necessária outra rodada de remoções artísticas, decidir por conjunto após revisar importadores e manifests; os 339 grupos duplicados não são uma lista de exclusão autorizada.
3. Manter os ensaios históricos para ferramentas e documentação; seu modo opcional evita publicá-los a cada release normal.
4. Histórico Git preservado. Qualquer migração LFS ou reescrita exigiria decisão separada e coordenação com todos os colaboradores.

Commits separados permitem reverter imagens, pacote, correção de navegação ou CI independentemente. Nenhum save, credencial, captura em massa, dependência local ou banco de teste integra o PR.
