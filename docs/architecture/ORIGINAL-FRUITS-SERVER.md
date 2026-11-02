# Frutas originais sob autoridade do servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

O inventário persistido escolhe a fruta; o navegador envia somente a intenção.
Os 30 itens e seus módulos de regras originais são reutilizados, sem renumerar o
catálogo, editar sprites ou importar saves. A demonstração mantém seu fluxo atual.

## Contratos e persistência

- `fruit.register {itemId}` registra uma instância possuída na mochila/equipamento.
  O compêndio online não concede cópias gratuitas. Registro, versão e recibo são
  atômicos; a chave personagem/fruta impede repetição. O bônus permanente e as
  conquistas usam esse ledger, inclusive depois de desequipar/vender a instância.
- `fruit.cast {key, point?}` reserva energia e recarga do catálogo. Apenas a bandeira
  Kobu2 aceita um ponto, limitado à área visível e navegável. O worker resolve
  ataques, projéteis, cura, status e recompensas na mesma transação do combate.
- `fruit.transform {enabled}` exige Zoan equipada. Troca de área, morte, troca de
  fruta e perda de controle encerram efeitos transitórios, preservando recargas.
- `fruit.move {x,y}` controla apenas o Gênio ativo. Seu movimento/alcance/ataque e
  vida vêm do servidor; corpo e invocação não ganham duas ações simultâneas.

Todos exigem sessão BFF, CSRF, propriedade, lease/fencing, versão e requestId.
IDs e campos adicionais não provam propriedade: dano, saldo, relógio, custo,
recarga, alvo externo e estado completo não são aceitos. O runtime só insere/lê
registros do compêndio; não pode reescrevê-los, apagá-los ou alterar sua identidade.

A migração0028 cria o ledger e atualiza somente o hash conhecido do simulador
anterior. Simulações desconhecidas continuam bloqueadas. Nenhuma fruta é
concedida pela migração; o caminho de obtenção existente é a formação com dez
fragmentosE. Recompensas de chefes superiores não definidas no original continuam
indisponíveis, assim como o despertar futuro. Não se inventam drops para liberar
conteúdo que o jogo ainda não fornecia.

## Regras e apresentação

`fruit-runtime.cjs`, `fruit-lower-runtime.cjs` e `fruit-summon-runtime.cjs` adaptam
os módulos originais E–S: passivos, transformações, projéteis, dano periódico,
campos, teleporte, petrificação, congelamento, proteção, reflexão, regeneração,
carga magnética e Gênio. Relógio/RNG/geometria vêm do backend. Sets/Maps das
linhas do tempo são serializados explicitamente e o runtime tem tamanho limitado.

O Lobo mantém direção por movimento validado, colisão, limite de trajeto e prazo.
Ataques Zoan usam os quadros de impacto originais. Curas percentuais e roubo de
vida mantêm a regra de eficiência original. Fênix regenera após dez segundos
simulados, sem acumular regeneração offline. A comida Kuku depende de cadáver
recente, consumido uma vez, e da aproximação ao alimento criado.

O compêndio, atalhos1/2/3, transformação e efeitos originais recebem snapshots e
eventos. O cliente traduz tempos apenas para desenhar; não confirma acertos nem
publica HP/economia. O gateway continua sem encaminhar `/api/*` legado. Polling
pode atrasar a apresentação; não muda o relógio válido do combate.

## Evidências e limites

- Fundação: passivos das30 frutas, habilidades E–S, JSON/reload, energia, recarga,
  alcance/LOS, cadáveres/comida, regeneração, controle da investida e impacto Zoan.
- PostgreSQL/HTTP: registro possuído, replay, concorrência, kill único entre workers,
  rollback de recibo, campos extras, CSRF, acesso cruzado, controle revogado,
  privilégios mínimos e migração conservadora do hash.
- Chromium sobre a exportação estática: compêndio, transformação, habilidade,
  persistência da recarga, reload, viewport estreito e renderização das habilidades
  das30 frutas sem erro JavaScript, mantendo um save sentinela da demonstração.
  Esse ensaio de UI usa respostas BFF de teste; transações usam PostgreSQL real
  isolado. Não houve envio de e-mail nem operação no Supabase hospedado.

O aceite integral do servidor continua separado: aparência/preferências e revisão
final do percurso ainda precisam ser concluídas. A publicação estática não publica
o backend. Resultados consolidados são registrados ao concluir os checks do PR.

## Validação do incremento

Build/typecheck,176 testes de fundação e147 arquivos Node legados aprovados.
A execução completa de202 integrações terminou com200 aprovações e duas
expectativas antigas de conquistas; após atualizar essas expectativas, os12 testes
da suíte de conquistas passaram. Todos os202 cenários possuem resultado aprovado
na revisão, incluindo sete novos cenários de frutas. O CI repete o conjunto.
A matriz de fórmulas cobre630 combinações fruta/classe/talento final.

Chromium sobre `dist` aprovou frutas, combate e inventário/forja; três testes Python
do build do portal também passaram. Assets e saves não foram alterados.
Backup consistente precedeu a migração local28. Os hashes das46 tabelas anteriores
permaneceram iguais, desconsiderando apenas o hash de regras atualizado e conferido
separadamente. Quatro contas/três personagens preservados; HTTPS local200 e
catálogo401 sem sessão. Auth/API/gateway foram desligados para o próximo incremento,
com PostgreSQL preservado. Docker será confirmado somente pela execução do CI Linux.
