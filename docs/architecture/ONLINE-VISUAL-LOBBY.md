# Entrada visual do personagem online — primeira integração

O painel `/online/` agora oferece **Entrar no jogo** depois de identificar o
personagem e ler seu snapshot autorizado. A entrada refaz a leitura; nome, classe,
nível, XP e ouro vêm do BFF. Não aceita personagem por URL, não importa saves e
não inicializa `game.js`, cujo ciclo econômico ainda pertence à demonstração.

O porto usa `lobby-map-data.js`, `lobby-world.js`, `world-system.js`, a composição
de profundidade e o Paper Doll native96 existentes, carregados apenas ao entrar.
Nenhum asset ou mapa foi editado. Aparência inicial padrão: os três itens do
catálogo online ainda não possuem mapeamento visual de equipamento aprovado.

**Limite explícito:** caminhada é apresentação local, com colisões do mapa;
posição não é persistida nem transmitida. Exige lease de controle ativo na UI e
para ao perder controle. Ainda não há presença compartilhada, chat, NPCs interativos
ou combate em mapa. Os links de serviços levam às ações autoritativas já existentes
de caçada, combate por turnos, mochila/mercador e atributos abaixo do mapa.
Isso entrega acesso ao porto com a identidade online; a migração completa do
gameplay da demonstração e o multiplayer continuam etapas posteriores.

Sair da conta limpa o renderizador. Troca de identidade descarta a posição visual.
Atualizações suspendem desenho/movimento até a leitura voltar; falha na leitura
fecha o lobby e não recorre ao save offline. Nenhum comando econômico é emitido
por entrar ou caminhar; saldos/resultados permanecem no protocolo do servidor.

## Validação executada

- 72 testes foundation, incluindo entrada sem mutação econômica, saída, falha de
  leitura, identidade no desenho e retomada após atualização; typecheck aprovado.
- Recursos do lobby/Paper Doll e página responderam200 por HTTPS com certificado
  validado no gateway local. Três testes de build do portal passaram.
- Testes de UI proíbem acesso a localStorage e mantêm as verificações anteriores
  de comandos e idempotência. Não houve nova migração ou mudança no Supabase.
- Navegador automatizado retornou uso local desativado mesmo após confirmação do
  proprietário: renderização visual, animação e movimentação real no navegador
  **ainda não foram aprovadas**. Não substituir essa prova pelo teste em VM.
- Instalação persistente reiniciada; dados e saves preservados. Nenhum save antigo
  foi limpo nesta etapa. Fazer limpeza apenas após backup e aceite da nova entrada.

## Conferência do proprietário

Recarregar https://localhost:9443/online/, entrar com a conta existente e clicar
**Entrar no jogo**. Conferir nome/nível/saldos, carregamento do porto e personagem.
Usar **Assumir controle**, confirmar a transferência se necessário, voltar ao
canvas e mover com WASD/setas. Abrir os serviços e conferir que os mesmos dados
persistem após recarregar. Sair da conta deve remover o porto e o personagem.
Relatar tela de carregamento que não termina, arte ausente ou erro de console;
não limpar dados do navegador para tentar corrigir.
