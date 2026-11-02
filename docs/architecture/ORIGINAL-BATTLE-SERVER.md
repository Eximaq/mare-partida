# Monstros e combate original no servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

Incremento do PR #204, sobre a posição autoritativa da migração 0016. Não conclui
a paridade integral do jogo. Nenhum save da demonstração é importado, alterado ou
apagado. As contas, personagens e recibos anteriores permanecem intactos.

## Contrato

`battle.start` inicia o domínio uma única vez, depois do inventário/mundo originais
e sem encontro piloto ativo ou prêmio pendente. A entrada no jogo faz essa
inicialização quando o servidor informa `battle:null`. Depois disso os comandos
econômicos do piloto são recusados, evitando duas progressões em paralelo.

O jogador pode ativar/pausar a caçada (`battle.auto`), escolher um alvo emitido pelo
servidor (`battle.target`), solicitar uma das duas habilidades da classe
(`battle.skill`) e resgatar a primeira vitória (`battle.first`). Payloads são
estritos: não aceitam dono, dano, HP, XP, ouro, relógio, cooldown ou atributos do
monstro. Sessão, propriedade, controlador, versão e idempotência são verificados
antes de cada comando/replay. Selecionar um UUID de outro personagem não autoriza
acesso ao seu combate.

## Simulação e persistência

`world-battle.cjs` usa `hunt-system.js`, `monster-behavior.js`, `monster-catalog.js`,
`character-system.js`, `character-catalog.js` e `combat-vfx.js`. Preserva os pontos,
níveis, perfis, alcance e recargas das 14 ilhas comuns. Inclui patrulha neutra,
reação ao dano, perseguição, retorno imune ao ponto de origem, regeneração no
retorno, respawn comum de 30s, chefe de Dawn condicionado aos 12 abates/proximidade,
telegraphs e recompensa única da primeira vitória.

O worker roda a cada250ms, sem sobreposição, em passos de até50ms. Processa no
máximo32 personagens por passagem. Usa o relógio PostgreSQL, controla alcance,
colisão, momento do impacto, projéteis, HP, energia, skills, guardas, cura, slow,
caçada automática, poções automáticas e renascimento de 4,1s. A leitura HTTP nunca
avança a simulação ou concede recompensa. O cliente apenas desenha os snapshots
e efeitos; não executa o dano/economia da demonstração.

Cada transação trava sessão, conta e personagem na mesma ordem da autenticação.
O worker não renova sessão, não chama o Supabase e exige sessão/controle válidos,
epoch atual e validade da última verificação do provedor. Logout/takeover impedem
novas ações do controlador antigo. Uma lacuna superior a 2s pausa as intenções e
descarta ataques pendentes; não há compensação de farm offline. A simulação de
uma passagem é limitada a 1s. Movimento manual não reinicia o relógio dos monstros.

A migração 0017 adiciona `character_battles` e `world_battle_rewards`, sem alterar
linhas anteriores. Cada morte usa UUID de spawn criado pelo backend; a chave
única impede pagamento duplicado. Vida, respawn, saldo, XP, nível, itens, poções,
versão, ledger e recibo são confirmados na mesma transação. Falha de gravação
desfaz tudo. A falha de uma transação é reportada após processar as demais
batalhas do lote; não desfaz nem interrompe o progresso de outra conta. Recibos internos `battle.reward` não são ações aceitas pela API e não
gastam o orçamento de 60 comandos do jogador por minuto.

Loot normal reutiliza chances, raridades, equipamento da classe, tiers, materiais,
poções e bônus de ouro da facção. Mochila cheia não é excedida. A primeira vitória
permanece resgatável quando não há espaço. Potências e modificadores ainda não
migrados não são fabricados pelo cliente.

O runtime recebe UPDATE apenas nas colunas mutáveis; não pode apagar batalhas,
trocar a identidade do registro ou alterar/apagar o ledger de recompensas. A
mudança do hash de regras bloqueia o estado antigo até migração explícita; não
recria personagens nem reescreve combates automaticamente.

## Interface e operação

O mesmo `/game` apresenta mapa, sprites, HUD, seleção de alvo, auto-caçada,
habilidades, poções e painel original Rota & Recompensas. O snapshot chega a cada
750ms na aba controladora visível, com interpolação visual; demais abas usam 3s.
Esses prazos de apresentação não controlam a velocidade do combate. Os antigos
painéis de ronda deixam de representar a caçada quando este domínio está ativo.

Aplicar backup, migrações e `infra/postgres/grant-auth.sql` antes do runtime. Não
alterar Supabase, DNS ou exposição de rede. A imagem Docker inclui os módulos
puros necessários; Docker é verificado no CI Linux, quando a execução concluir,
e não presumido a partir de build TypeScript.

## Compatibilidade com a main

A main recebeu a HUD compartilhada do PR #205 em `8362794` durante este bloco.
O ajuste preserva esses arquivos e combina a viagem autoritativa com os avisos
de contratos da demonstração em `game.js`, sem reescrever históricos nem fazer
merge na main. As regressões de combate online, inventário/forja online e HUD
compartilhada foram executadas novamente sobre a exportação estática.

## Aceite e limites

Testes específicos: `tests/foundation/world-battle.test.mts`,
`tests/foundation/battle-client.test.mts`,
`tests/integration/server-world-battle.test.mts` e
`tests/online-battle-browser.cjs`. Cobrem regras originais, perseguição na colisão
real de Dawn, impacto/voo, entrada repetida, isolamento, takeover, concorrência,
rollback, expiração, reinício, poções, habilidades, primeira vitória e reload.
Os testes de navegador usam BFF simulado; os testes de transação usam PostgreSQL
real descartável e provedor falso. Não equivalem a novo ensaio do Supabase.

Validação local deste incremento: build e typecheck aprovados; 110 testes de
fundação, 133 de integração PostgreSQL/HTTP e 146 arquivos Node legados passaram.
Exportação Pages, quatro testes Python do portal/exportação e Chromium sobre
`dist` passaram, incluindo desktop, viewport estreito, reload e save sentinela.
O teste de isolamento reproduziu a interrupção indevida do lote antes da correção
e passou depois. O CI inclui agora essa suíte e o contrato visual do combate.

Na instalação contínua, o backup precedeu a migração 0017. Os hashes dos dados
das 28 tabelas anteriores permaneceram iguais; quatro contas e três personagens
foram preservados. HTTPS foi verificado com o certificado local confiável e a API
recusou acesso sem sessão. Docker não foi executado neste Windows; o resultado
da execução Linux deve ser consultado nos checks do PR.

Ainda faltam modificadores de talentos/ultimates/frutas/Haki, drops especiais,
contratos e contadores correspondentes, Impel Down/masmorras e seus chefes, além
da aceitação completa de todas as combinações e do dimensionamento/retenção do
worker e ledgers. O limiar de cura automática usa o padrão original de 70%; a
preferência individual ainda precisa de contrato persistente. Os efeitos visuais
podem chegar atrasados pelo polling; o emissor visual de arma não define a
geometria válida do servidor. Monstros continuam privados por personagem: este
bloco não implementa presença multiplayer nem encontros compartilhados.

O manifesto mantém IA, combate e habilidades como **parciais**. Publicação deste
incremento significa commit/push no Draft PR #204, sem merge e sem deploy.
