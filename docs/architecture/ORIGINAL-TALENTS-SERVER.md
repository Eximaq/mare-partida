# Talentos originais no servidor

Base: main `9ebbfff` (contratos originais, PR #209). Este incremento mantém a
árvore e as regras compartilhadas das sete classes: 105 nós comuns, 21 escolhas
intermediárias e 21 finais. A demonstração mantém seus saves e sua progressão.

## Autoridade e contratos

O snapshot autenticado inclui `talents`: build, revisão, pontos ganhos, gastos e
disponíveis. Ler não grava nem concede pontos. Neste bloco, o orçamento é o nível
persistido; pontos de conquistas dependerão do ledger autoritativo de conquistas.
Não se importam conquistas, árvores, XP ou moeda do navegador.

`talents.commit` recebe somente `{build:{nodes,keystone,ultimate}}`.
`talents.reset` recebe `{}` e exige o Porto das Correntes. Ambos usam o envelope
existente de requestId, versão e controlador. A classe vem da identidade no banco.
O servidor valida ranks 0–10, orçamento, dois ramos, dependências, requisitos e
exclusividade. Commit só acrescenta investimentos; remover/trocar escolhas exige
reset. Reset não cura, não altera inventário/atributos nem limpa recargas absolutas.

Sessão, CSRF, proprietário e controlador são verificados antes de aplicar ou
reproduzir recibos. Mesma intenção retorna o recibo; intenções distintas competem
pela versão. Build, auditoria, versão e recibo são uma transação. A role de runtime
não pode apagar builds/roubos, trocar suas identidades ou reescrever auditorias.

## Simulação original

`talent-runtime.cjs` adapta os módulos puros existentes sem carregar saves. Hidrata
Sets, Maps e referências de alvos; persiste filas/efeitos entre ticks e recargas
absolutas calculadas com o relógio do servidor. O worker usa passos de até 50 ms,
com o limite existente de um segundo por atualização e sem progresso offline.

Atributos, acerto, dano, crítico, penetração, velocidade, alcance, energia/custo de
habilidades, cura, escudos, reações, veneno, clones, queimaduras, ricochetes e
atração são resolvidos no servidor. Efeitos secundários não reiniciam a cadeia de
ataques principais. A atração verifica o trajeto de movimento, além da linha de
disparo; bônus temporários de vida são limitados novamente quando terminam.

Efeitos descritos como “na tela” usam a área canônica 960×570, centralizada no
herói e limitada ao mapa. O cliente não fornece viewport como alcance. Curas e
proteções de grupo não inventam aliados: a simulação atual é individual; presença
compartilhada, grupos, revive e distribuição de cura/dano entre jogadores continuam
fora deste incremento. Os efeitos solo das escolhas finais estão integrados.

Roubo usa o UUID da vida atual do monstro, com teto SQL de seis moedas por spawn,
na mesma transação de inventário/recibo. Senhor do Submundo mantém as chances e
recompensas do código original, incluindo caixas e lendários, capacidade da bolsa
e exclusão de frutas do loot comum. RNG e valores vêm do servidor. Não há rota
para informar loot, relógio, dano, nível ou cooldown pelo cliente.

Morte, viagem, logout/troca de controlador e intervalo excessivo do worker encerram
o runtime transitório do herói; preservam recargas absolutas. O combate continua
rejeitando hashes desconhecidos. Filas acima de 2048 efeitos, 128 campos ou 1024
projéteis abortam a transação em vez de descartar efeitos silenciosamente. Um
limite alcançado torna o batch não saudável; voltar ao porto encerra o runtime.
Monitorar esse limite continua necessário antes de uma operação pública.

## Migração e interface

`0021_original_talents.sql` cria builds, eventos imutáveis e teto de roubo.
`0022_talent_battle_compatibility.sql` atualiza somente o hash conhecido do motor
anterior. Preserva HP, monstros, respawns, posição, moedas e recargas; não gera
novas batalhas nem importa saves. Migrações antigas permanecem imutáveis. Aplicar
os grants atualizados depois das migrações e manter backup antes da atualização.

A árvore, confirmações, reset e atalhos continuam nas telas originais. A prévia
não altera o personagem confirmado. Resultado só aparece após leitura do servidor;
resposta perdida pode ser reconciliada após reload com o mesmo requestId. O modo
online não escreve a árvore nos saves da demonstração. Arte, mapas e Paper Doll
não foram modificados.

## Evidência e limites

- `world-talents.test.mts`: efeitos reais do motor, serialização, recargas,
  recursos, barreiras, limite de roubo e ausência de procs recursivos.
- `server-talents.test.mts`: PostgreSQL descartável real, worker, loot, HTTP/CSRF,
  acesso cruzado, concorrência, replay, rollback, grants e migração preservadora.
- `talents-client.test.mts` e `talents-online-browser.cjs`: intenções limitadas,
  árvore original, confirmação, perda de resposta, reset, mobile e save isolado.
- Suítes originais de talentos/finais e navegador offline verificam regressões
  na demonstração; o CI executa também imagem Docker, Linux e grants.

A autenticação das fixtures é simulada; estes testes não enviam e-mails ou alteram
Supabase. A operação continua local em HTTPS. GitHub Pages publica somente a
versão estática; não hospeda PostgreSQL ou o backend.

O objetivo integral do servidor continua incompleto. Conquistas e seus pontos,
frutas/Haki, Impel Down, masmorras e demais itens do manifesto mantêm seus próprios
critérios de migração. Talentos está marcado parcial no manifesto enquanto o
orçamento adicional por conquistas não for autoritativo.

A atualização local foi aplicada com backup e os serviços parados. A comparação
sanitizada das 32 tabelas anteriores confirmou dados idênticos, normalizando
somente o hash explicitamente migrado: quatro contas, três personagens, 22
migrações e nenhum investimento artificial. A instalação HTTPS foi reiniciada;
certificado, recursos e recusa 401 sem sessão foram verificados.
