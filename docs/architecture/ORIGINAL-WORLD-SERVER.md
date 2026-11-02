# Posição e viagens autoritativas — incremento do mundo

O jogo original recebe posição e trajeto do backend. O navegador envia apenas o
ponto desejado ou o ID da ilha; não pode fornecer velocidade, tempo transcorrido,
spawn, caminho, dono, dano ou resultado econômico. A demonstração mantém seu
fluxo e save. Não houve alterações em mapas, geometria, HUD ou assets originais.

## Contrato e persistência

`world.initialize`, `world.move`, `world.stop`, `world.travel` e `world.return`
usam o protocolo de comandos existente: sessão, propriedade, controlador/epoch,
versão, idempotência e recibo atômico. Inicializar novamente não reposiciona o
personagem. Retorno e viagem usam exclusivamente os spawns e requisitos do catálogo.
A tabela `character_world` não permite DELETE nem troca de proprietário pela role
de runtime. As consultas usam parâmetros.

A posição é uma âncora persistida com uma polilinha validada pela navegação original.
Leitura/reinício calculam a posição pelo tempo PostgreSQL, sem gravar um tick a cada
frame. A velocidade vem das fórmulas do personagem no servidor. Movimento termina
no menor prazo entre comando, sessão e controle (máximo120s). Logout local/global,
recuperação de senha e revogação detectada cortam esse prazo. Transferir o controle
materializa a posição e encerra a rota anterior antes de emitir outro epoch.
O navegador interpola apenas para desenhar; seu resultado não é enviado ao servidor.

`world-catalog.cjs` carrega uma lista fixa de módulos locais confiáveis, incluindo
os14 destinos comuns do arquipélago. Não recebe JavaScript, nomes de arquivo ou
geometria do cliente. Hash das fontes normalizado entre Windows/Linux identifica
as regras. Mudança de hash bloqueia o mundo existente até uma migração explícita;
não teleporta personagens silenciosamente após alterações de mapa.

A migração0016 adiciona posição e três campos opcionais aos encontros. Os dados
antigos permanecem intactos. Migrações e grants devem ser aplicados antes do novo
runtime; a aquisição de controle em fixtures históricas continua sem exigir uma
tabela de mundo que ainda não existia naquela versão.

## Interface original e compatibilidade

O botão Explorar os mares abre o mapa original; seleção, viagem, câmera, caminhada
por WASD/clique, NPCs e retorno usam o mapa/posição do snapshot. Inventário, forja
e atributos continuam nos painéis já integrados. O painel temporário de ronda e
saqueador permanece acessível em Rota & Recompensas e Contratos até a substituição
pelo combate completo. Não são criados monstros fictícios para simular a paridade.
Encontros encerrados não reaparecem como inimigos vivos após reload.

Encontros piloto iniciados depois da inicialização do mundo têm posição inimiga
emitida pelo servidor, alcance e linha de visão verificados antes do dano/turno.
Viagens são recusadas durante encontro ativo ou vitória não resgatada. Encontros
anteriores e clientes do piloto ainda sem mundo mantêm seu contrato por turnos;
a garantia espacial não deve ser atribuída a esses registros legados. Depois de
inicializado, o cliente não pode apagar o mundo para voltar a esse caminho.

## Verificação e limites

- Testes PostgreSQL isolados: posição/reload/stop, tempo de movimento, versão e
  concorrência, propriedade cruzada, takeover/replay, limites de viagem, alcance,
  logout local/global, expiração do controle e rollback integral de recibo falho.
- Esquemas estritos rejeitam IDs de propriedade, velocidade, relógio, saldo e dano.
- Chromium local: teclado real, mapa original, viagem, reload, retorno, painel do
  piloto preservado, encontro encerrado e save sentinela inalterado; desktop e
  viewport393×852. A API desse teste visual é uma fixture; transações são testadas
  separadamente em PostgreSQL real. Não houve novo teste de provedor hospedado.
- Backup local antes da migração. Hashes das27 tabelas anteriores iguais, excluindo
  somente as três colunas novas. Quatro contas e três personagens preservados,
 16 migrações e nenhuma posição criada artificialmente para as contas existentes.

O mundo permanece **parcial** no manifesto. Ainda faltam IA/spawns/patrulhas,
combate original em tempo real, energia/habilidades e integração das instâncias de
Impel Down/masmorras. Não existe presença compartilhada entre jogadores neste
incremento. O limite de60 comandos/minuto e recibos duráveis continua; caminhada
contínua renova intenção a cada2,2s. É necessário medir carga específica e retenção
antes de abrir o backend ao público. Nenhuma alegação de invulnerabilidade ou de
paridade integral decorre destes testes. Sem merge ou deploy de produção.

Validação local concluída: build/typecheck,101 testes de fundação,127 integrações
PostgreSQL/HTTP,145 arquivos Node legados e4 testes Python de exportação/portal.
Os dois ensaios Chromium de mundo e inventário/forja passaram sobre `dist/`.
HTTPS local reiniciado e certificado validado; endpoint protegido recusou chamada
sem sessão com401. Docker/Linux é verificado separadamente no CI deste PR.
