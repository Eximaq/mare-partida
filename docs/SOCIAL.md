# Social online

A HUD Mestre mantém um único menu **Social** com Amigos, Mensagens, Party,
Tripulação, Correio e Trocas. Cada atalho abre sua própria tela. Os quatro serviços novos dependem das migrações
0044–0046; a demonstração local continua independente. O servidor anuncia a
disponibilidade somente quando as três migrações estão presentes.

- **Amigos e mensagens:** os vínculos usam o ID do personagem. Pedidos cruzados
  permanecem pendentes até aceite explícito. Uma nova conversa exige amizade;
  removê-la preserva o histórico. O bloqueio impede novos contatos, convites e
  trocas com aquele personagem. A presença vem de atividade recente da sessão
  que controla o personagem. O chat privado usa abas do Canal do Porto; uma
  mensagem fica não lida até o destinatário visualizar o fim da conversa.
- **Correio:** cada baú concluído emite uma entrega oficial exclusiva daquele
  personagem, paga XP e Berry como antes e devolve o personagem ao porto. Em
  Party, cada vitória elegível mantém sua entrega separada. O resgate preserva
  as instâncias, quantidades e vínculos e só arquiva cartas resgatadas. Se uma
  carta não couber inteira, permanece pendente; o resgate em lote continua com
  as outras. O arquivo da carta retém o recibo. Vitórias antigas sem baú
  resgatado seguem elegíveis; baús já resgatados diretamente não são reenviados.
  O emissor interno `sendOfficialMail` é reutilizável por eventos oficiais
  futuros, que precisam validar a elegibilidade na mesma transação. Não há uma
  fonte de eventos ativos neste catálogo.
- **Trocas:** o aceite abre uma sessão de dois personagens. Apenas instâncias
  negociáveis da mochila entram na oferta; o banco protege as reservas contra
  alterações por outros caminhos. Alterar itens ou quantidades exige novo
  travamento e confirmação dos dois. A segunda confirmação revalida a versão,
  propriedades e espaço final, e só então troca os itens e grava um recibo em
  uma transação. Cancelar ou deixar vencer libera as reservas.

Os comandos passam pela sessão, controle do personagem e recibo idempotente
existentes. Os históricos são paginados e as consultas de Social são limitadas
à tela aberta, com um resumo periódico de indicadores. O texto privado não é
escrito na fila de comandos do navegador.

Os testes de integração usam personagens descartáveis em bancos isolados. O
teste `tests/social-online-browser.cjs` exercita o cliente real em Chromium
contra respostas de teste; as verificações de persistência e autorização ficam
nos testes Node com PostgreSQL.
