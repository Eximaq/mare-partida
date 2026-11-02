# Hierarquia e ranking autoritativos

O modo online usa os títulos e requisitos de `hierarchy-system.js` no servidor e
mantém o painel original, com consulta das quatro facções e32 títulos. O modo de
demonstração e seus saves não são importados nem modificados.

`hierarchy.promote` aceita somente `expectedTier`. A sessão determina o dono;
controlador, versão, CSRF, rate limit e recibo são verificados pelo protocolo
comum. O backend consulta o nível persistido, avança exatamente um patamar e
registra título, versão e recibo na mesma transação. Promoções2–5 exigem níveis
20/50/75/100;6–8 continuam bloqueadas pelos itens futuros do jogo original.
Falha reverte tudo; replay não promove novamente e duas intenções simultâneas
não saltam cargos. Não há custo novo, concessão de nível ou importação do preview.

`GET /v1/hierarchy/ranking` exige sessão de jogo e aceita apenas uma facção válida
opcional. Retorna até10 personagens, por patamar, nível e poder decrescentes,
com ID como desempate estável. A resposta tem somente ID público do personagem,
nome, facção, classe, nível, poder, patamar, título e retrato vazio com fallback
oficial da facção. Não recebe PNG/base64 nem expõe conta, e-mail, sessão, saldo,
atributos ou inventário. O endpoint legado de sincronização não é usado online.

O poder do ranking é uma projeção dos atributos/equipamentos/talentos permanentes
calculados pelo backend, atualizada na mesma transação das mutações e ao ler o
próprio personagem. Buffs temporários não alteram a classificação. O nível vem
diretamente da progressão. Personagens que ainda não inicializaram seu kit têm
poder0; a instalação existente recebe backfill calculado pelo backend. As
conquistas conservam seu limite de100000, separado do teto de1e9 do ranking.

Migração0027 cria estado e ledger de promoções, sem alterar as tabelas anteriores.
A role pode atualizar apenas patamar/poder e inserir eventos; não pode apagar
estado, alterar propriedade ou modificar/apagar o ledger. Não existem rotas de
concessão administrativa.

Testes: PostgreSQL descartável para promoção, nível, gates, concorrência, replay,
conta alheia, campos extras, CSRF, sessão revogada, limite/filtro/ordenação do
ranking, atualização do poder, rollback, privilégios e migração idempotente.
Navegador real usa fixture BFF para verificar o painel original, consulta,
promoção, persistência, desktop/mobile e save intacto. Essa fixture não substitui
os testes reais do banco nem representa novos testes no Supabase hospedado.

Instalação contínua atualizada após backup, com API/gateway parados. As44 tabelas
anteriores mantiveram hashes idênticos; permanecem quatro contas e três
personagens. O backfill só criou a projeção de poder/título inicial. HTTPS,
recursos públicos e recusa401 sem sessão foram verificados após reinício.
