# Pacote consolidado — alpha online inicial

Escopo autorizado: atributos no combate, inventário/equipamentos/loja, ciclo online
repetível e preparação operacional. Não equivale à migração de todo o MMORPG:
mapas compartilhados, talentos, frutas, Haki, party/PvP e animações da demonstração
continuam fora do servidor. O painel `/online/` é a interface deste alpha.

## Combate e economia

`online-combat-v2` congela classe, nível, pontos investidos, equipamento e valores
derivados ao iniciar cada encontro. Mudanças durante o combate valem somente para
o seguinte. Encontros anteriores com perfil nulo continuam usando as regras v1.
As sete classes usam os atributos iniciais existentes na demonstração; nenhuma
informação do save local é importada. Primário/secundário seguem `AGENT.md`.

- Ataque mínimo: `7 + floor(primário/3) + floor(secundário/10) + equipamento`;
  máximo = mínimo + 4; sorteio e aplicação ocorrem no servidor.
- Vida: `20 + 2*VIT + equipamento`; proteção até 6; dano inimigo mínimo 1.
- Recarga: `max(500, 2000 - 10*DES)` ms. Classificação elemental das duas classes
  mágicas não implica resistências, habilidades ou cura implementadas.
- Vitória resgatada: 30 XP, 12 ouro e um fragmento; uma única transação inclui
  prêmio, nível, inventário, versão e recibo. Uma falha desfaz tudo.

Catálogo independente `online-items-v1`:

| Item | Compra/venda | Efeito equipado |
|---|---:|---|
| Fragmento de metal | 2 / 1 | Material, não equipável |
| Instrumento de treino | 30 / 10 | +2 ataque |
| Colete do cais | 24 / 8 | +8 vida, +1 proteção |

Compra/venda aceitam apenas item e quantidade inteira 1–100; equipar aceita item,
desequipar aceita slot. Preço, saldo, propriedade e bônus vêm do banco. A última
cópia equipada não pode ser vendida. Pilhas até 100 mil; ouro BIGINT verificado
antes da escrita. Os IDs não se misturam ao catálogo da demonstração.

Toda mutação exige sessão, propriedade, lease do controlador, versão e requestId.
Repetir o mesmo pedido devolve o recibo; mudar seu conteúdo conflita. Autorizações
são verificadas antes do replay. Recibos não são removidos: não há mais bloqueios
de 100 encontros ou 10 mil comandos por vida. Mantidos 60 comandos/minuto,
10 encontros/24h, descanso de 60s, nível máximo 20 e limites numéricos seguros.
Monitorar crescimento de disco; arquivamento futuro não pode apagar deduplicação.

## Migrações e preservação

0011 acrescenta perfis sem recalcular combates históricos; 0012 acrescenta catálogo,
inventário, equipamento e ledger; 0013 amplia ordinal sem apagar histórico.
Atualizar `grant-auth.sql` com owner após migrar. Runtime não altera catálogos,
perfis congelados nem ledgers; atualiza apenas colunas necessárias.
Não rodar binário antigo contra banco migrado. Rollback operacional é parar API e
restaurar backup em banco novo, com o binário correspondente; nunca migração reversa
destrutiva nem sobrescrita de saves.

## Operação e publicação

O [runbook](ONLINE-ALPHA-HOSTING.md) contém a topologia e os gates de hospedagem.
Pages permanece somente estático, sem API nem autenticação online ativa. Publicar
o código/Pages não hospeda o backend. Os templates não criam recursos, alteram DNS
nem configuram Supabase. Autenticação real permanece desligada no ambiente local.

## Validação

Validação local executada em 01/11/2026:
- Build e typecheck; 67 testes foundation; 143 arquivos Node da demonstração;
  três testes do portal e build Pages passaram.
- 98 testes PG/HTTP passaram em uma execução completa; teste adicional do monitor
  passou depois (99 cenários no conjunto). Migrações do histórico, permissões,
  concorrência, recibos, falhas atômicas e recuperação de rede cobertos.
- Backup nativo PG18 restaurado em banco UUID novo: todas as tabelas comparadas,
  readiness e recibo preservados. Nenhum banco persistente foi restaurado/apagado.
- Carga isolada: 12 clientes, 120 comandos econômicos HTTP, zero erros; p95 411ms
  e máximo 484ms na execução dedicada. Não é estimativa de CCU de uma VPS.
- Navegador HTTPS: personagem limpo → jornada → caçada de 30s → duas vitórias,
  80XP/nível2/32ouro/2fragmentos → compra por30 → equipamento → cinco pontos em
  força → reload persistente → venda de um fragmento por1 → terceiro encontro
  com ataque16–20. Compra sem saldo recusada; perfil anterior13–17 preservado.
- Desktop e viewport390px sem transbordamento; logout confirmado. Demonstração
  abriu seleção e Paper Doll original; zero erros de console nas duas interfaces.
- Gitleaks do diff preparado não encontrou segredos. Evidências e dumps sintéticos
  permanecem locais/ignorados; não integram a publicação.
- Alerta de disco funcionou: aproximadamente4% livre no computador de teste,
  abaixo do mínimo20%. Nenhum arquivo foi removido para ocultar o alerta.

Provedor sintético local não substitui uma nova homologação real no Supabase.
JWT900s e sessão24h/2h permanecem intactos. API/gateway de teste encerrados;
PostgreSQL persistente preservado. Resultado Linux/Docker/CI será anexado após execução.
