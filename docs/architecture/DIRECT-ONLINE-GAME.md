# Entrada direta no jogo — integração em andamento

## Fluxo corrigido

Referência do proprietário: Entrar → carregar personagem → jogo original,
sem painel intermediário de progresso e sem miniporto separado. A página normal
`/online/` agora contém apenas acesso/recuperação/cadastro e criação inicial.
Sessão existente e login aceito redirecionam a `/game`. Usuário sem personagem
precisa escolher nome, classe e facção antes de jogar.

O gateway local entrega em `/game` o mesmo HTML construído de `index.html`, com os
scripts de sessão online carregados antes de `game.js`. HUD, navegação, mapa,
Paper Doll e assets são os existentes; não foi criada outra engine nem outra arte.
O painel antigo fica em `/online/qa.html`, fora do fluxo normal de login.
O miniporto anterior não é a entrada do produto e não deve ser promovido como tal.

## Autoridade e preservação

- Identidade vem de `/v1/me`; estado vem do snapshot restrito ao dono. O cliente
  não escolhe accountId/ownerId/characterId para provar autorização.
- `/game` não lê, escreve, apaga ou importa o save da demonstração. Falta do script
  de sessão ou erro no BFF bloqueia a entrada; nunca inicia offline como fallback.
- Itens, dinheiro, poções e materiais iniciais da demonstração são removidos da
  projeção online. Nível, XP, ouro, HP e pontos refletem o backend.
- A simulação offline de combate/recompensas não executa nesse modo. A cena online
  reflete o encontro persistido e envia intenções de ataque, sem dano/RNG/XP/ouro.
- Comandos exigem versão, CSRF e lease. Intenção pendente salva só na sessionStorage,
  sem credenciais; após resposta incerta, retomada explícita usa o mesmo requestId.
- Perda de conexão pausa ações; perda de controle impede comandos; logout limpa
  identidade/lease e retorna ao login. A janela oculta não renova controle ou joga.
- O modo demonstração permanece em `/`, com o fluxo de saves anterior. Assets,
  IDs do catálogo original e dados dos colaboradores não foram substituídos.
- Há mapeamento apenas visual dos dois equipamentos online para os assets iniciais
  existentes. Bônus efetivos continuam vindo do perfil do servidor, congelado por
  encontro; não se usam bônus calculados pelo catálogo offline como autoridade.

## O que está realmente conectado

Os menus do jogo acessam os contratos já existentes: ronda introdutória,
encontro repetível por turnos, compra/venda dos três itens online, equipar/desequipar,
atributos e logout. Isso corrige a entrada e integra o **alpha limitado** à engine
visual. Não entrega paridade do servidor com todo o gameplay da demonstração.
O proprietário confirmou manualmente abertura com HUD e mapa originais e relatou
que a experiência estava incompleta. Essa observação é válida e impede declarar
o jogo online completo ou promover a integração como release final.

| Sistema do jogo original | Estado do backend atual | Falta para paridade |
|---|---|---|
| Conta/personagem/sessão | Conectado | Persistência de aparência e preferências ainda ausente |
| Classes e facções | Identidade das sete classes; atributos básicos | Habilidades, passivos e bônus completos de facção |
| Progressão | Níveis1–20, pontos e ledger | Compatibilizar restante da progressão e recompensas |
| Caçadas e mapas | Uma ronda de30s e um inimigo repetível | Spawns/AI/setores/chefes e expedições do jogo |
| Combate | Turnos, cooldown, RNG/HP/prêmio no servidor | Loop original, alcance, colisões e habilidades autoritativas |
| Inventário/mercador | Três itens empilháveis; dois slots | Instâncias/raridades/afixos, todos os slots e catálogo original |
| Forja/consumíveis/contratos | Não migrados | Custos, execução, inventário e recompensas transacionais |
| Talentos/conquistas/Haki/frutas | Não migrados | Regras e ledgers no backend, respeitando requisitos atuais |
| Presença/movimento/cooperação | Não implementados | Estado de mundo, sincronização, reconexão e autorização de comandos |
| Interface dos menus online | Adaptadores básicos dentro da HUD | Reutilizar a apresentação completa junto à migração de cada domínio |

Recursos não migrados são indisponíveis online; habilitá-los com gravação local
não atenderia a solicitação de servidor autoritativo. Esta limitação é de
implementação, não do PC ou de falta de VPS. A base é a main atual `fbadec1`,
incluindo o ajuste mais recente de HUD, com os trabalhos locais em branches próprias.

## Ordem de continuidade para preservar o gameplay

1. Fixar contratos de paridade usando os catálogos/regras atuais, sem renumerar IDs.
   Separar dados de interface, projeção visual e autoridade econômica.
2. Migrar inventário de instâncias, equipamentos/raridades/consumíveis e mercador;
   recuperar os menus completos sem adaptar uma economia incompatível por aparência.
3. Migrar a primeira região com movimento/colisão, spawns, AI, ataques e recompensas
   do loop original. Reutilizar dados autorais de navegação no backend.
4. Migrar habilidades/classes e progressão dependente; depois forja, contratos,
   talentos/conquistas, frutas e Haki com seus testes próprios.
5. Sincronizar presença e movimento para jogadores se encontrarem no mesmo lobby.

Não confundir esse trabalho restante com a preparação operacional da VPS. Não apagar
saves antigos antes de backup e aceite da nova experiência. Nenhuma limpeza foi feita.

## Evidência executada

- Login automático para `/game` e ausência de formulários de gameplay na entrada.
- Testes do cliente contra BFF/PG real: compra persistente, reload, controle em
  duas sessões, isolamento entre contas, resposta perdida após commit e replay único,
  logout. Provedor sintético em banco UUID descartável; sem e-mails/Supabase real.
- Testes da projeção e do tick original: sem grants/recompensas/regen locais;
  pausa sem conexão/controle; sem ataque duplicado ou retomada automática incerta.
- `/game` sem bootstrap de sessão não pode acessar o save da demonstração.
- 83 foundation,101 integrações e143 arquivos Node legados; build/typecheck e
  build/testes do portal. Recursos HTTPS locais e HTML original verificados.
- Proprietário confirmou visualmente que abriu a HUD/mapa originais. A ferramenta
  de navegador segue retornando desativada; ainda não há aceite visual completo
  nem prova de paridade de todos os menus e animações online.

Sem compra, merge, deploy de produção, DNS, migração de banco ou novos envios SMTP
nesta atualização. O ambiente local permanece ativo para avaliação do proprietário.
