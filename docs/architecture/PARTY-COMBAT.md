# Party e Social — integração ao jogo original

## Escopo

Até quatro personagens autenticados no mesmo backend, usando as contas, leases de controle, mundo, colisões, combate, inventário e progressão existentes. Party é temporária e independente de Tripulação. O cliente estático não cria uma Party offline nem concede recompensas.

A aba Social abre o menu contextual e a janela Grupo de Caçada. A HUD recolhível aparece somente com grupo e fica acima do rastreador de XP e da Expedição. Emblemas vêm da facção real, retratos usam o compositor native96 e os companheiros no mapa usam as mesmas camadas, transformações e auras existentes.

## Autoridade e concorrência — PARTY-COMBAT

Migração aditiva 0032_parties.sql: grupo, membros, convites, instâncias, mortes e parcelas de XP. Chave primária por personagem impede duas Parties; índice parcial impede duas instâncias ativas. Mortes e parcelas têm chaves únicas e o ledger de XP exige recibo transacional. Novos comandos têm payload estrito, CSRF, proprietário, lease, versão, orçamento e idempotência iguais aos demais comandos.

Ordem: sessão, conta, lock do personagem e grupo. A entrada tenta os locks dos demais sem esperar, revalida requisitos e prontidão e grava todos os destinos na mesma transação. Uma sessão ocupada provoca tentativa posterior, sem entrada parcial. O worker bloqueia grupo/instância e tenta cada ator; não mantém a transação esperando outra sessão.

Cada instância tem uma lista canônica de monstros. O adaptador party-battle.cjs executa o world-battle.cjs em passos limitados, mantendo uma única linha temporal da IA e um único dono de atualização de cada inimigo por subpasso. Ataques e skills dos membros operam na mesma lista. O worker solo exclui atores com instância Party, inclusive após adquirir o lock. A retomada de controle pausa somente o estado pessoal e não regrava os inimigos compartilhados.

## Convites, liderança e reconexão

Criar grupo não adiciona outra pessoa. Convites por nome exigem um personagem online inequívoco, expiram em 60 s e revalidam a última vaga na aceitação. O limite é quatro, sem reserva permanente. Só o líder convida, remove, promove, prepara e inicia. Remover outro participante preserva a liderança explicitamente escolhida. Quando o líder sai, assume o primeiro membro conectado restante, ou o mais antigo se todos estão offline.

Presença exige lease e sessão válidos, inclusive validação do provedor e epoch da conta, e heartbeat recente de leitura. Após 10 s sem presença o membro não combate nem recebe XP. O vínculo pode se reconectar à mesma instância por até 60 s, sem catch-up offline. Após essa tolerância ele retorna ao porto e deixa de participar da atividade; permanece no grupo para gerenciar uma nova partida. O líder offline por mais de 60 s é substituído por um membro conectado. Uma instância sem qualquer participante anexado é encerrada. O líder pode remover um membro desconectado.

Saída voluntária e remoção encerram a participação e retornam ao porto, preservando conquistas e baús pendentes. Não alteram XP passada nem reiniciam a vida do chefe. Os limites são configurados em party-rules.cjs.

## Entrada e escolha visual

O líder escolhe uma ilha ou chefe em cartões com as artes HD canônicas, prepara, todos confirmam e só então a equipe parte. A preparação dura 60 s, vincula destino e composição e exige de dois a quatro membros para iniciar. Um grupo de um pode preparar. A entrada revalida nível, conexão, vida, atividades incompatíveis e direito à masmorra.

As ilhas são agrupadas em East Blue e Alabasta; Skypiea mantém o estado sem destinos disponíveis do catálogo. A galeria de chefes usa os nove retratos existentes, com enquadramento superior para preservar os rostos. Os dados das cartas vêm dos catálogos, sem valores fictícios. A seleção local não teleporta ninguém nem muda a preparação já confirmada pelo servidor. Regras técnicas permanecem nesta documentação, fora da janela do jogador.

## Caçada — PARTY-HUNT

Orientação posterior do proprietário substitui a tabela sugerida na sprint:

| Ativos na instância Party | Densidade sobre a população normal |
|---|---:|
| 1 | 120% |
| 2 | 140% |
| 3 | 160% |
| 4 | 180% |

A caçada solo, sem Party, continua normal. População usa arredondamento para cima e teto de 80. Entrada de extras é gradual, com no máximo dois spawns por reconciliação, tiles caminháveis, espaço entre inimigos e distância dos jogadores. Saídas retiram somente extras ociosos; não apagam adversários engajados. Chefes regionais preservam gates e recarga originais. Dano, velocidade e drops não são multiplicados pela densidade.

A XP-base de cada morte é repartida pelos elegíveis presentes, vivos, conectados, na mesma instância e a até 768 unidades do ponto de morte. Cada um recebe 1/2, 1/3 ou 1/4 conforme o número real de elegíveis. O resto inteiro alterna entre IDs ordenados para conservar a base. Depois da divisão, aplica-se o modificador de nível do próprio destinatário usando a função original de recompensas. O ledger registra base_amount e amount, antes e depois desse modificador. O contador XP/h — Party usa somente o ganho efetivo daquele personagem.

## Masmorras — PARTY-DUNGEONS

Dois a quatro personagens enfrentam um único chefe. O perfil solo 2,5x já aplicado pelo catálogo é preservado. Só a vida recebe o fator adicional configurável: 1,6x para dois, 2,2x para três e 2,8x para quatro. Ataque, velocidade e alcance não recebem esse fator. A vida máxima fica fixada na entrada e não é reiniciada por saída ou morte de membro.

Cada integrante vivo e participante da vitória gera seu próprio registro original de conclusão. Alvida concede os cinco fragmentos Rank E a cada elegível; o primeiro resgate não consome o dos outros. Baús e recibos originais continuam únicos e transacionais. Quem já concluiu ou tem baú pendente não inicia nova execução recompensada. As sete masmorras cujas recompensas continuam sem configuração não recebem prêmios inventados.

## Regras preservadas — PARTY-LOOT-RULES e PARTY-IMPEL-DOWN

Somente a XP de caçada é repartida. Itens, Berry e contadores pessoais de morte continuam com o personagem que desfere a morte, sem sorteio, cópia de drops ou divisão monetária nova. Regra futura de loot cooperativo permanece pendente de definição do proprietário.

Impel Down permanece individual. Preparar ou entrar na prisão com Party retorna uma mensagem, sem dissolver o grupo e sem mexer em andares ou prêmios anteriores.

## Operação e atualização do backend

O backend de jogo fica no computador do colaborador. Este trabalho não altera a instalação, dados, segredos, rede ou processo daquele computador. Pages entrega somente o cliente; publicar os arquivos estáticos não migra o banco nem atualiza o worker remoto.

Na atualização coordenada do backend: guardar o backup pelo procedimento existente, parar a API de forma graciosa, atualizar código/dependências, executar o comando de migração com a conexão de migração já configurada, reaplicar infra/postgres/grant-auth.sql na role de runtime existente, compilar e reiniciar a API pelo fluxo habitual. Não usar o banco descartável de validação como banco de jogo. O cliente deve ser publicado junto da versão correspondente do backend. Não reescrever migrations antigas nem preencher hashes desconhecidos.

A 0032 promove apenas o hash de combate predecessor auditado; saves com outro hash permanecem bloqueados para investigação. Rollback operacional exige compatibilidade entre versão do cliente, API e schema; não apagar tabelas de progresso da Party.

## Validação e pendências — PARTY-BALANCE

Verificações com PostgreSQL descartável real e sessões distintas: convites/permissões, consentimento, última vaga concorrente, replay da entrada, lista canônica, XP para dois/três/quatro, modificador por destinatário, ausência de XP offline, reconexão, transferência/saída, baú individual, rollback conjunto em falha do ledger e permissões mínimas. A matriz HTTP cobre as novas ações contra propriedade estrangeira, ausência de CSRF, campos de autoridade e lease obsoleto.

Capturas de navegador usam quatro contas locais de teste, sem personagens reais ou saves de produção. Evidências, banco, certificados, ferramentas portáteis e tokens ficam fora dos commits.

Pendências de produto: revisar fatores de densidade/vida e raio de elegibilidade com jogadores; definir loot cooperativo futuro. Validar a versão final também no backend do colaborador após a atualização coordenada. O teste de arquivo/restauração nativa requer pg_dump e pg_restore da instalação PostgreSQL; esses executáveis não acompanham o pacote mínimo descartável usado nesta máquina. Não considerar esse teste aprovado sem a ferramenta nativa.

Validação final local: 204 testes foundation; 151/151 arquivos de testes Node legados; oito cenários PostgreSQL da Party; 13 cenários focados de banco/aceitação/Party após os ajustes de migração. Build do servidor, checagem de tipos e build estático passaram. Navegador com quatro sessões reais de teste cobriu preparação, entrada conjunta e saída para três e dois membros, além das galerias de ilhas e chefes.
