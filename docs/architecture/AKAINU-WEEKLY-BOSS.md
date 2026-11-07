# Akainu — evento semanal desativado por padrão

## Estado de entrega

A integração não cria Marineford, não altera tabelas de spawn público e não abre um evento no carregamento, reinício ou deploy. A configuração inicial é nula e não existe operador pré-cadastrado. O conteúdo oficial só abre por comando autenticado de um dos dois operadores, depois de Marineford estar registrado e de a configuração ser validada. Publicar o cliente não atualiza o servidor do colaborador.

## Operação no jogo

Depois de atualizar o backend e cadastrar os dois operadores, entrar com uma dessas contas e abrir **Modos → Boss semanal · Akainu**. O botão **Teste privado** usa uma instância isolada do mapa de teste já existente; não coloca o boss nos mapas públicos e não concede XP, Berry, itens, profissão ou direitos de recompensa. O segundo operador pode entrar no mesmo encontro. **Encerrar encontro** devolve os participantes ao porto. Nenhuma conta comum vê esse ensaio.

A configuração do próximo evento é um formulário real: posições de nascimento/entrada, lotação, nível mínimo, duração e atributos de combate. Salvar não abre o evento. A abertura oficial fica bloqueada enquanto Marineford não existir, o local não for caminhável, o raio não couber na área, a entrada não tiver caminho/visibilidade ou o balanceamento não estiver confirmado. A periodicidade não cria um agendamento automático.

## Autoridade e persistência

- `akainu-combat.js`: controlador puro do boss, preparação/impacto/recuperação, quatro direções e telegráfo fixo antes da erupção.
- `weekly-boss-battle.cjs`: uma lista canônica com um único Akainu; passos limitados de 50 ms; ataques dos jogadores usam o combate original; a IA do boss avança uma vez por passo, não por participante.
- `world-battle.cjs`: impactos internos passam pelas defesas, frutas e talentos já existentes. A validação de ação, alvo, alcance, linha de visão e identificador evita aplicar o mesmo impacto duas vezes. Abates semanais não passam pelo loot da caçada.
- `weekly-boss-rules.cjs`: ciclos de segunda-feira 00:00 America/Fortaleza, relógio do servidor, validação fechada por padrão e elegibilidade por participação efetiva.
- `apps/game-server/src/characters/weekly-boss*.ts`: comandos, permissões, bloqueios transacionais, persistência, entrada, saída, cancelamento, vitórias e projeção pública.
- Migração `0050_akainu_weekly_boss.sql`: estruturas aditivas, dois operadores com slots únicos, configuração versionada, encontro único ativo por modo, contribuições, vitórias, direitos semanais e auditoria. Nenhuma conta real é cadastrada pela migração.

O navegador não envia dano, HP, recompensas, contribuições nem o estado final do chefe. Os comandos usam sessão, CSRF, dono/controlador, versão e requestId já existentes. A autorização administrativa é conferida inclusive antes de reproduzir recibos antigos. A role de runtime consulta operadores, mas não concede a si mesma esse acesso.

Reconectar não restaura a vida do chefe. Presença expira em 10 s; a tolerância de reconexão é de 60 s. Interrupções longas não geram combate retroativo nem dano atrasado: a conjuração em andamento é cancelada e a vida é preservada. Cancelar limpa o vínculo e retorna os participantes sem duplicar recompensas.

## Recompensas e profissões

Os prêmios ainda não estão definidos. A vitória oficial registra participantes elegíveis e um direito principal por personagem/ciclo, com status `pending_configuration`; ela não inventa XP, Berry ou itens. A elegibilidade exige presença válida, vida positiva, pelo menos 10 s de combate e dano efetivo de 0,1% da vida máxima do boss ou cura efetiva de outros participantes equivalente a 50% da vida máxima do curador. Esses limites são iniciais e devem ser calibrados em ensaio antes de uma abertura pública. Regeneração própria e mera observação não contam como contribuição.

A flag de profissões `productionWeeklyBoss` permanece falsa. Este evento não altera a regra de três conclusões distintas por semana nem redistribui XP profissional.

## Arte

Arquivos em `assets/weekly-boss/akainu/`: idle, caminhada, dano, soco, conjuração em área e VFX de magma. O corpo usa a mesma referência de escala dos chefes atuais; quadros de 128 px acomodam movimento sem reduzir o personagem. A caminhada foi recuperada por componentes completos que atravessavam os limites das linhas antigas, preservando todos os valores de alfa e uma translação fixa por direção. O repouso usa a primeira pose neutra completa do soco, em vez das duas células de repouso previamente cortadas. Não há redimensionamento adicional na recuperação; WebP é lossless e o round-trip RGBA foi conferido. A procedência e os hashes estão em `recovery-provenance.json`.

A derrota usa a pose de reação e fade de 1,2 s; não é uma animação de queda inédita. O efeito em área fica separado do personagem. O renderizador não altera HP, dano, recarga ou estado persistido.

## Atualização do backend do colaborador

Executar no computador que já hospeda o servidor, não no banco descartável dos testes. Esta documentação não confirma que esse computador foi atualizado.

1. Fazer backup pelo procedimento existente e guardar uma cópia fora da pasta do jogo. Parar API/gateway de forma graciosa; não apagar o cluster nem parar outro banco compartilhado.
2. Conferir `git status --short`. Preservar mudanças locais. Atualizar para o commit de release aprovado com o fluxo normal, instalar dependências com `npm ci --ignore-scripts`, executar `npm run build` e `npm run typecheck`.
3. Com a conexão de migração já configurada em `.env.migration.local`, executar `npm run db:migrate`. Reaplicar `infra/postgres/grant-auth.sql` na role de runtime pelo procedimento existente. Não usar credenciais de owner/admin no processo da API. Não reescrever migrações antigas.
4. Iniciar API/gateway pelo supervisor habitual. Conferir health/ready, login, porto, save, inventário e o teste privado com duas contas. O cliente publicado deve corresponder ao backend atualizado.

Somente os dois hashes predecessores auditados são promovidos pela migração. Um hash desconhecido permanece bloqueado para investigação; não preencher ou alterar manualmente esse valor para contornar a verificação.

### Cadastrar os dois administradores

Usar os **UUIDs de conta** do sistema (não os IDs de personagem, nomes ou e-mails). Com a conexão de migração, em uma transação, o administrador local pode cadastrar os slots 1 e 2:

```sql
BEGIN;
INSERT INTO mare_game.weekly_boss_operators(account_id, slot)
VALUES ('UUID_DA_CONTA_DO_PROPRIETARIO', 1),
       ('UUID_DA_CONTA_DO_COLABORADOR', 2);
COMMIT;
```

Substituir os dois valores antes de executar. A FK exige contas existentes, e as restrições impedem slot repetido, terceiro operador ou a mesma conta nos dois slots. Se já houver operadores cadastrados, conferir os registros existentes antes de substituir qualquer um; não apagar permissões automaticamente. Não enviar senhas, tokens, arquivos `.env` nem dados de sessão ao repositório.

Conferência de encerramento, usando a conexão administrativa local:

```sql
SELECT slot, account_id FROM mare_game.weekly_boss_operators ORDER BY slot;
SELECT mode, status, count(*) FROM mare_game.weekly_boss_events GROUP BY mode, status;
```

A primeira release deve permanecer sem encontro oficial ativo. O teste privado, quando concluído, deve ser cancelado ou encerrado, sem linhas de prêmio.

## Validação reproduzível

```sh
npm run build
npm run typecheck
npm test
npm run test:integration
python tools/build_pages.py
python tests/portal_build_test.py
node --test tests/akainu-*.test.cjs tests/weekly-boss-*.test.cjs
node --import tsx tests/weekly-boss-browser.mts
```

A integração exige PostgreSQL descartável via `TEST_DATABASE_URL`. O teste de navegador exige Playwright e certificado local confiável, usa HTTPS em loopback 9445 e três contas de teste. Não executa contra o servidor do colaborador. Os resultados da release devem ser consultados nos checks do commit exato, não presumidos a partir desta lista.

## Desativação e retorno

Encerrar primeiro o evento pelos controles autenticados. A reversão do cliente e da API deve respeitar a compatibilidade com schema e hashes. Não apagar registros de vitórias, direitos ou auditoria. A integração não altera o formato de saves offline nem ativa o evento automaticamente.
