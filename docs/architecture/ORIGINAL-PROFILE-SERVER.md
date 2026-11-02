# Perfil e criação originais no servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

O login abre `/game` também para contas sem personagem. O mesmo assistente de
facção, classe e aparência da demonstração cria o personagem online. Nome,
classe, facção e escolhas cosméticas passam por contratos estritos; identidade de
conta e personagem continua derivada da sessão. Cadastro/recovery não é alterado.

## Operações e preservação

- `profile.appearance`: opções originais, persistidas no PostgreSQL.
- `profile.preferences`: esconder equipamento, esconder capacete e limiar de cura
  entre25% e90%; o worker lê esse limiar para a habilidade automática do curandeiro.
- `profile.identity`: nome, classe, facção e aparência no porto. Disponível em
  Meu Perfil → Personalizar → Editar personagem. Retorna ao jogo original após salvar.
- Cada classe conserva sua árvore de talentos e usa o mesmo orçamento ganho.
  Trocar de classe não cura, não restitui energia e não apaga recargas absolutas.
- O equipamento inicial só é concedido uma vez por classe. Ao voltar para uma
  classe, reutiliza uma arma possuída; se foi vendida, não fabrica outra gratuita.
  A antiga arma volta à mochila. Mochila cheia impede a transação inteira.
- Nível, XP, ouro, atributos, título, equipamentos e demais progressões permanecem.
  A facção determina o título correspondente ao patamar já conquistado.
- Criação repetida não troca a aparência nem entrega outro kit ao personagem existente.
- Áudio, densidade, movimento de interface e qualidade são preferências visuais do
  navegador. Saves normal/DEV não são lidos, gravados nem importados no modo online.

O perfil mostra a data de criação real. Tempo e dano começam a ser medidos no
worker desta versão, sem inventar o histórico anterior. A interface identifica a
persistência no servidor. Mural público, PvP e personalização pública futura não
são implementados por este incremento.

## Segurança e persistência

Migration29 cria perfil e eventos imutáveis ligados ao recibo de comando.
Somente o hash conhecido da simulação28 é atualizado; versões desconhecidas
continuam recusadas. Não edita migrations anteriores. Grants permitem mudar
nome/classe/facção, mas não id, dono, criação ou histórico de eventos.

Todos os comandos usam sessão, CSRF, propriedade, controlador exclusivo, versão,
limite de comandos e transação já existentes. O evento inclui os estados antes e
depois, incluindo itens e builds na troca de classe. Falha em qualquer escrita
reverte identidade, inventário, talentos, versão e recibo juntos.

## Evidências

`server-profile.test.mts`: PostgreSQL real descartável com provedor de sessão de
teste, criação, conservação de dados, acesso cruzado, concorrência, replay,
rollback forçado, privilégios mínimos e HTTP adversarial. Não envia e-mails nem
altera o Supabase hospedado.

`profile-contract.test.mts`: enumerações e campos extras. `world-battle.test.mts`:
limiar persistido governa a cura automática e métricas são observadas no servidor.
`profile-online-browser.cjs`: Chromium na exportação `dist`, criação original,
aparência, recarregamento, privacidade, perfil, edição de identidade e save intacto;
BFF controlado no teste visual, separado dos testes de banco reais.

Este documento fecha o grupo de personagem. O aceite integrado do jogo inteiro
continua registrado em FULL-SERVER-PARITY.md; não equivale à implantação pública.

Validação deste incremento: build/typecheck,178 casos de fundação,147 arquivos
Node legados, Chromium em dist e3 testes de pacote passaram. A suíte PostgreSQL
executou207 casos:206 passaram e a lista esperada de migrations de um teste estava
desatualizada; corrigida para29 e confirmada no reteste de10 casos (todos passaram).
A migração local preservou47 tabelas byte-equivalentes após normalizar somente o
hash autorizado; quatro contas e três personagens, sem importar saves. Backup
consistente criado antes da aplicação. Dependências de produção: zero alertas
no npm audit executado. CI repete os testes antes do merge.
