# Etapa 3D — primeiro fluxo online separado da demonstração

Registro do incremento 3D. A [Etapa 3E](PHASE-3E-FIRST-HUNT.md) acrescenta caçada
temporizada, recompensa única e o campo hunt ao snapshot; mantém os limites de
isolamento descritos aqui e estende a pendência por action.

Base: main `48eb49d`. Integração incremental no cliente de contas existente,
servido em `/online/` pelo gateway HTTPS local. Não altera nem carrega o runtime
do gameplay, saves, mapas, HUD, Paper Doll ou assets. Não transforma a demonstração
em jogo online nem publica uma API de produção.

## Leitura e início de jornada

Nova consulta `GET /v1/characters/:id/online-state`: sessão BFF de jogo e propriedade
verificadas na mesma transação da conta. Resposta `{state, journey:{started}}`.
`state` mantém os campos 3A; `started` consulta a existência do ledger 3C, nunca
infere início pela versão global. Sem payload/query strings; métodos de escrita
retornam 405. Outra conta e personagem inexistente têm o mesmo 404; recuperação
não autoriza leitura. Cache-Control continua no-store. Sem migração ou novo grant.

O painel mostra nível, XP e ouro confirmados pelo servidor, preservando números
BIGINT como texto. Exibe o estado da jornada e exige controle vigente nesta aba
para habilitar “Iniciar jornada”. Envia `journey.begin` pelo contrato 3C; não envia
saldos, dono ou recompensas. O botão fica indisponível durante envio, sem estado
confirmado, sem controle ou depois de iniciado. Exploração e combate continuam
explicitamente indisponíveis no modo online.

## Conexão, recarregamento e isolamento

Antes do primeiro envio, gera requestId uma única vez. Guarda em memória e,
quando disponível, na chave **sessionStorage `mare-online-pending-v1`** somente
`characterId`, `requestId`, `expectedVersion`. Nenhum token, cookie, senha, email,
estado econômico ou save é gravado. Não lê nem escreve localStorage. O registro
pendente não autoriza operações; o servidor continua validando sessão/dono/lease.

Pedidos do fluxo online têm timeout de 15 segundos, abrangendo obtenção de CSRF
e envio. Em falha de rede/503, a ação pode ter sido confirmada. A UI consulta o
estado com GET, sem repetir POST automaticamente. Se o ledger informa início,
limpa a pendência e mostra o resultado confirmado. Isso confirma o marco, não
atribui autoria ao pedido quando outra aba também poderia tê-lo iniciado.

Se o marco ainda não está confirmado, “Retomar solicitação” usa o mesmo requestId
e versão, com o controle atual. Após reload, nenhum POST é automático e o usuário
precisa assumir o controle novamente. Storage malformado ou de outro personagem
é descartado; storage indisponível mantém somente a recuperação em memória.
Após fechar a aba, o marco permanente pode ser consultado mesmo sem o requestId.
Isso é específico da ação única journey.begin, não uma política para futuras
transações econômicas repetíveis.

Logout/troca de personagem limpa controle e pendência. Contadores locais de vista
ignoram respostas atrasadas de leitura/controle após troca de conta ou logout.
Falha na renovação encerra o controle local; uma renovação antiga não apaga um
controle mais recente. Mensagens distinguem cota/versão/controle de indisponibilidade.

## Testes e limites

TDD: consulta começou em 404; painel não apresentava estado nem botões conectados.
Regressões adicionais reproduziram controle “ativo” após resposta atrasada no
logout e perda da mensagem de limite de comandos; ambas corrigidas.

Testes do JS real em DOM controlado cobrem precisão numérica, ausência de acesso
a saves, clique duplo, resposta perdida, retomada após reload com mesmo ID,
troca de identidade, controle expirado e respostas atrasadas. São testes de UI
isolada; não substituem a validação de navegador.

Navegador HTTPS real + backend e PostgreSQL reais, em banco UUID descartável e
provedor simulado: login sintético, criação de personagem, controle, início de
jornada, leitura após reload e em outra aba, logout e retorno de ambas a Entrar.
Nenhum email/cadastro ou alteração no Supabase hospedado; contas existentes intactas.
O fixture foi encerrado e seu banco descartável removido pelo próprio harness.

Layout desktop conferido no navegador. A tentativa de viewport de 390px não foi
aplicada pela ferramenta: a largura observada permaneceu 1280px. Validação visual
móvel fica pendente; não foi declarada como aprovada. A página mantém a media query
existente, quebra de linhas e controles flexíveis, sem reformulação visual do jogo.

Uma execução ampla falhou com ECONNRESET no teste de readiness ao rodar junto de
build/integrações; o watchdog do teste fecha sockets após 1 segundo. O mesmo teste
isolado passou em 186ms. O runtime e o timeout de produção não foram alterados;
a suíte completa foi repetida sem essas cargas paralelas para verificar o resultado.

Resultado final local: 44 testes de fundação (incluindo timeout de consulta da
conta), 40 integrações PostgreSQL e 142 arquivos Node legados aprovados; build,
typecheck, build Pages e três testes do portal aprovados. O harness separado
supa-browser não foi executado. A falha inicial de readiness não reapareceu na
repetição completa nem na última execução da fundação.

## Publicação e continuidade

O build Pages continua excluindo `apps/account-client` e backend. Código integrado
e publicação estática não tornam o painel acessível na Internet; `/online/` depende
do gateway/API locais. Auth de homologação fica false ao terminar. Sem migrações
no banco persistente, DNS ou novos serviços. Docker/Linux é verificado pelo CI.

Este incremento conclui o primeiro fluxo 3D, não toda a migração online do jogo.
Próximos blocos precisam escolher uma funcionalidade de gameplay com contratos
próprios, estado autoritativo e reconciliação; manter o modo demonstração isolado.
Homologação hospedada deste painel e operação pública continuam separadas.
