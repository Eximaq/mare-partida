# Escopo integral do servidor — correção de direção

Pedido do proprietário em01/11/2026: todas as funções que o jogo atual já possui
devem funcionar com autoridade do servidor, preservando as interfaces/gameplay.
As entregas anteriores de alpha não cumprem esse objetivo. A entrada direta no
jogo corrigiu navegação, não completou a migração dos sistemas.

## Aceite obrigatório

Uma função só fica concluída quando mantém suas regras e UI atuais, executa a
transição pelo backend, persiste corretamente e passa em testes de manipulação,
replay, concorrência, propriedade, falha e recuperação pertinentes. Função desativada
ou substituída por versão menor não conta como implementada. Os testes de fundação
podem estar verdes enquanto esse aceite integral continua reprovado.

O inventário obrigatório está em [FULL-SERVER-SCOPE.json](FULL-SERVER-SCOPE.json).
Verificação executável:

```sh
node tools/server-completeness.mts --audit
# Gate de entrega integral: retorna1 enquanto houver funções parciais/pendentes.
node tools/server-completeness.mts
```

Não existe garantia honesta de invulnerabilidade. O critério é o cliente não poder
determinar resultados/progresso e não haver brechas conhecidas deixadas abertas no
aceite, com revisão, testes adversariais e monitoramento. Alterar HUD ou memória no
próprio navegador não deve alterar o estado válido do servidor.

## Fonte única das regras

Começar pelo código atual da main `fbadec1`, preservando commits de colaboradores,
valores, fórmulas, níveis, índices de catálogo e condições de cada ação. Extrair
lógica pura compartilhável para módulos usados pelo jogo e pelo backend, em vez
de recriar balanceamento menor. RNG e relógio usados no backend devem vir do
servidor; decisões do cliente nunca substituem esses valores.

Primeiro avanço executado: montagem original do catálogo extraída para
`item-catalog.js`, consumida pelo jogo e por `gameplay/catalog.ts`. Mantém exatamente
103 definições,30 frutas,12 slots,mochila120 e índice31 da arma do curandeiro.
O hash do catálogo completo foi registrado antes da extração e é comparado nos
testes. Katana, armas Gatuno, raridades, descrições, animações e referências visuais
permanecem nas mesmas posições. O backend congela sua cópia profundamente.

`GET /v1/characters/:id/game-catalog` exige sessão e propriedade, não aceita filtros
de dono e não altera progresso. Essa leitura é infraestrutura para a migração;
não significa que inventário/forja/frutas já estejam operando integralmente no
servidor. A economia do alpha ainda não foi convertida ou promovida por esse passo.

## Ordem de execução e consistência

1. **Inventário e economia originais:** instâncias e IDs emitidos pelo backend,
   slots, limite120, bloqueios, equipar/desequipar, venda original e poção35/44%.
   Forja e consumíveis precisam do mesmo inventário, sem segunda carteira de ouro.
2. **Personagem e progressão:** criação/kit inicial pelo backend, aparência,
   preferências, classes/facções, atributos e fórmulas completas. Migrações
   explícitas do alpha para o modelo original, sem importar save ou conceder kit
   duplicado. Não resetar personagens existentes sem autorização específica.
3. **Mundo e combate originais:** posição, colisões, alcance/LOS, spawns, AI,
   timers, energia/HP, ataques/hit frames e habilidades. Backend recebe intenções
   limitadas; ele calcula mundo e resultados. Cliente interpola e desenha.
4. **Progressão dependente:** caçadas, chefes, contratos, Impel Down/caixas,
   conquistas, talentos/finais e hierarquia. Recompensa única deve ter evento/ledger
   único no mesmo commit que saldo/inventário/versão/recibo.
5. **Frutas e Haki:** todas as30 frutas existentes, registro/compêndio, passivos,
   transformações, RankE–S, Vontade e domínio. Preservar custos, recargas e requisitos.
6. **Aceite integral:** testar o percurso inteiro na HUD original; reinício,
   reconexão, perda de resposta, múltiplos dispositivos, acesso cruzado e comparação
   de resultados com as regras originais. Só então limpar saves antigos com backup.

Nenhuma etapa substitui os sistemas originais por menus básicos como critério de
entrega. Domínios podem ser migrados internamente em incrementos; o estado do
objetivo integral permanece incompleto até todos passarem.

## Requisitos de segurança transversais

- Sessão BFF validada; dono derivado da sessão; nunca confiar em IDs fornecidos como
  prova de autorização. Revalidar dono, sessão e controlador até em replays.
- Lease exclusivo com epoch/fencing. Serialização e versão impedem gastar duas
  vezes; idempotência deve sobreviver à perda de resposta e ao reinício.
- Rejeitar campos extras: saldo, dano, atributos finais, loot, preço, chances,
  relógio, cooldown, nível, dono, concessões DEV e estado completo do cliente.
- Validar tipos, finitude, limites, slots, classe, capacidade, pré-requisitos,
  alcance, custos e estado de combate no backend. Consultas parametrizadas.
- Moeda e itens só mudam por transações autorizadas. Receipts/ledgers imutáveis,
  grants mínimos e versões de conteúdo. Falha deve reverter a operação toda.
- Não habilitar antigas APIs Python de fruta/hierarquia com IDs/contexto enviados
  diretamente pelo navegador. Auditar e colocar atrás da identidade BFF ou migrar
  regras; o gateway novo continua sem encaminhar `/api/*` legado.
- Timeouts, rate limits por ação/conta/IP, limites de conexões/payload e métricas
  sem credenciais. Sem secret/service_role na aplicação do jogador.
- Revisão de dependências/configuração, TLS, CSRF, revogação, backup/restauração,
  teste de carga e hardening do host continuam gates de operação pública.

Renderização, áudio, captura de teclado, interpolação e preferências puramente
visuais permanecem no cliente; isso não concede autoridade sobre a economia ou
combate. Presença multiplayer e funções futuras que não existem no jogo atual
devem ser tratadas como escopo adicional, sem confundi-las com esta paridade.

## Estado da entrega

**Objetivo integral ainda não concluído.** Não declarar o lado do servidor pronto
nem abrir produção com base na contagem de testes ou na publicação do frontend.
Catálogo compartilhado e seu endpoint estão validados; inventário original e os
demais domínios continuam marcados conforme o manifesto. Nenhum save, banco ou
personagem existente foi apagado nesta correção de direção.

## Validação deste incremento

- Build e typecheck Node/TypeScript aprovados.
- 85 testes de fundação,102 integrações PostgreSQL/HTTP e143 arquivos Node
  legados aprovados. Incluem hash completo antes/depois da extração, catálogo
  imutável, propriedade por conta, campos extras e ausência de escrita nesse GET.
- Build estático e teste de exportação Paper Doll aprovados; dados de saves e
  assets existentes preservados. Não foi executada uma jornada visual local
  automatizada: a ferramenta informa uso do navegador local desabilitado.
- Smoke Docker/Linux deverá confirmar a importação do catálogo na imagem e a
  separação dos arquivos privados. Não houve execução Docker neste Windows.
- O gate integral retorna `ready:false` (3/26 grupos implementados). Essa contagem
  é acompanhamento de escopo, não uma estimativa percentual do esforço restante.
