# Masmorras com autoridade do servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

As nove masmorras usam os mapas, sprites, animações, diário, mochila e revelação
originais. O cliente solicita entrada, resgate ou formação; não informa vitória,
dano, recompensas, identidade, relógio nem resultados aleatórios. Saves da
apresentação local permanecem separados e não são importados.

## Regras preservadas

- Nove chefes dos níveis10–90, com os perfis originais multiplicados por2,5.
  Os36 contatos direcionais usam os frames/fps autorados. Movimento para durante
  o ataque; alcance, alvo vivo e linha de visão são conferidos no impacto.
- Entrada e retorno à instância mantêm HP, energia e recargas persistentes. Derrota
  restaura os recursos sem recriar a identidade do chefe nem o limite de roubo.
- Vitória não concede loot/XP regional, caçadas, contratos ou abates globais.
  O worker registra a vitória e o baú pendente no mesmo commit.
- Alvida e Morgan concedem cinco fragmentos E vinculados por baú, XP de20% do
  requisito do nível do chefe (10% quando o personagem está acima dele) e Berry
  igual ao piso de1% do ouro acumulado, fixado ao iniciar a tentativa. Esse total
  é calculado dos eventos do servidor, deduplicados por recibo.
- Os sete chefes restantes preservam a vitória pendente e o aviso original de
  recompensas em definição. Não foram inventados prêmios ou repetição infinita.
- Resgate exige o mesmo personagem/instância e posição até90 unidades do baú.
  Mochila cheia deixa o direito pendente. Repetição não duplica XP, ouro ou itens.
- Dez fragmentos E próprios e desbloqueados formam uma fruta E aleatória conforme
  o catálogo original. A fruta permanece vinculada. Revelação pendente impede
  outra formação; confirmação só aceita o item realmente emitido pelo servidor.

## Persistência e autorização

Migração0025 acrescenta estado de masmorras e ledgers imutáveis de vitória/resgate,
com unicidade por personagem/chefe e vínculo diferido ao recibo. Runtime recebe
somente SELECT, INSERT específico e UPDATE do estado; não apaga/regrava os ledgers.
Falha no inventário, progressão ou recibo reverte a transação inteira.

Os quatro comandos são `dungeon.enter`, `dungeon.claim`, `dungeon.craft` e
`dungeon.acknowledge`. Os dois primeiros recebem apenas `dungeonId`; formação
recebe `expectedSeq`; confirmação recebe `itemId`. Sessão, propriedade, CSRF,
controlador exclusivo, versão e limites de abuso são obrigatórios até em replays.
O inventário valida o vínculo ao dono ao ler e escrever. Venda de item vinculado
é recusada. IDs extras e campos de recompensa não entram no contrato.

O hash de combate inclui regras, perfis e tempos de animação. A migração altera
somente o hash conhecido do release anterior, preservando o restante de cada
combate. Hash desconhecido continua bloqueado, exigindo investigação explícita.

## Validação

- Quatro testes do motor: nove perfis,36 contatos, persistência JSON, alcance,
  identidade/recargas, vitória sem recompensa regional e retorno ao baú.
- Oito testes PostgreSQL: worker, proximidade, capacidade, dois baús, pilhas,
  formação/revelação, concorrência/replay, rollback, acesso cruzado, CSRF,
  controlador, grants e migração preservadora. Banco descartável; provedor simulado.
- Três testes de intenções do cliente e navegador real desktop/mobile sobre
  respostas BFF controladas: entrada, mapa, reload, baú, formação e revelação.
  A fixture visual não substitui as transações reais testadas separadamente.
- Suítes completas de fundação, integração e147 arquivos legados, build/typecheck
  e versão estática. O teste de histórico foi atualizado para a migração25.
- Navegadores da demonstração verificam as nove artes e o fluxo original.

Não há envio de e-mail, alteração de Supabase, importação de saves ou exposição
pública do backend neste incremento. Frutas consumidas/equipadas e seus efeitos,
Haki e demais grupos do manifesto integral ainda exigem seus próprios aceites.

Atualização local executada com backup e API/gateway parados: as41 tabelas
anteriores permaneceram idênticas, normalizando somente o hash conhecido de
combate. Quatro contas, três personagens,25 migrações e zero vitórias artificiais.
Reinício HTTPS com certificado validado, recursos200 e catálogo401 sem sessão.
