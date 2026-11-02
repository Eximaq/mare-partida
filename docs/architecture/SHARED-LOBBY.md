# Lobby compartilhado do Porto das Correntes

Implementado em 02/11/2026. O login continua abrindo o jogo original. Dois jogadores conectados ao **mesmo backend e banco** se veem no porto, com seus nomes, aparência, equipamentos visuais e movimento. A demonstração offline permanece independente.

## Contrato e segurança

`GET /v1/characters/:id/online-state` acrescenta `lobby: {players, limit:16, truncated}`. O endpoint continua exigindo sessão válida e propriedade do personagem solicitado. Não existe endpoint para o cliente escrever presença, posição de outro personagem ou recompensas.

Cada jogador público contém somente `id`, `name`, `classId`, `factionId`, `appearance96`, `hideHeadgear`, equipamentos `{def}` e o caminho/posição já aprovados pelo servidor. Não inclui conta, sessão, e-mail, inventário, identificadores de instâncias de itens, atributos ou saldo. A preferência `hideItems` suprime a projeção dos equipamentos; `hideHeadgear` segue o compositor original.

A consulta é limitada e ordenada. Só inclui personagens no porto com controlador vigente, sessão de jogo não revogada, prazos válidos, epoch de conta atual e validação vigente do provedor. Não renova sessões de terceiros nem altera seus personagens. IDs públicos não conferem autorização para consultar estado privado, comandar ou assumir controle.

O cliente acompanha o caminho aprovado, sem devolver coordenadas calculadas ao servidor. Atualiza pelo polling existente (~750 ms com controle). Limpa presenças após cinco segundos sem snapshot válido. Logout e viagem removem o personagem no próximo snapshot. Fechar uma aba sem logout pode manter sua presença até vencer a concessão de controle existente (no máximo 120 segundos). Não alteramos as políticas de autenticação.

Retomar uma aba suspensa renova a presença imediatamente. Se sua concessão venceu, o cliente solicita uma concessão livre, sem `expectedEpoch`: não assume um controlador ativo de outra aba/dispositivo. Renovação concorrente é agrupada numa única tentativa; falha transitória preserva o identificador local para tentar renovar depois. Esse caminho corrige a visibilidade unilateral observada no teste remoto: a conta continuava autenticada, mas seu controle havia expirado e ela deixava de aparecer para o colega. O prazo do servidor e a exclusividade permanecem intactos.

A ordenação por profundidade e a oclusão usam o mapa original. O cache público é separado do personagem local, limitado a 16 aparências e compõe somente repouso/caminhada. Jogadores remotos não alteram colisões, NPCs, combate ou recompensas. Acima do limite, a lista é truncada; este incremento não representa um teste de capacidade de MMO.

Não há migração nova nem alteração das migrações aplicadas. Bancos anteriores à migração de perfil retornam lista vazia durante os testes de atualização. Saves, assets PNG e dados dos personagens existentes permanecem preservados.

## Validação

- PostgreSQL isolado: presença, isolamento, viagem/retorno, logout, concessão expirada, validação do provedor expirada, revogação por epoch, privacidade e limite do roster.
- IDs obtidos no roster não autorizam acesso ao estado, comando nem controle de outra conta.
- Navegador HTTPS real com dois contextos isolados, Node e PostgreSQL reais: criação original, dois personagens visíveis no porto original, caminhada refletida no outro navegador, viagem/retorno, logout e save offline preservado.
- Provedor de autenticação determinístico nesses testes; nenhum cadastro ou e-mail no Supabase hospedado.
- Regressão de logout corrige um frame entre a limpeza da sessão e o redirecionamento.
- Execução automatizada também preparada no job `shared-lobby-browser`, sem desativar TLS.

Comandos: `npm run build`, `npm run typecheck`, `npm run test:foundation`, `npm run test:integration`, `npm run test:legacy`, `python tools/build_pages.py`; navegador: `node --env-file-if-exists=.env.test.local --import tsx tests/shared-lobby-browser.mts` com Playwright e certificado local confiável. O teste usa exclusivamente a porta loopback 9445 e bancos descartáveis; não ocupa a instalação contínua em 9443.

## Colaborador em outro local

O Pages publica apenas arquivos estáticos. `localhost` no computador do colaborador aponta para a máquina dele; ele ainda não acessa o banco deste computador. A publicação deste incremento não expõe o backend.

Caminho escolhido pelo proprietário: [Radmin VPN com HTTPS direto](RADMIN-PRIVATE-TEST.md). Usa o IP privado no navegador, certificado próprio e callback adicional autorizado no Supabase de desenvolvimento. Os passos abaixo permanecem como alternativa Tailscale não executada.

Alternativa proposta para teste privado pela Internet:

1. Instalar e autenticar Tailscale nos dois computadores, escolhendo um plano gratuito somente se o projeto for elegível; não contratar serviços.
2. Permitir exclusivamente o colaborador e a porta HTTPS do jogo nas regras da rede privada, sem acesso a PostgreSQL, terminal ou outros serviços do computador.
3. Configurar HTTPS privado pelo Tailscale Serve, **sem Funnel**, mantendo API e PostgreSQL em loopback. Não desativar a validação do certificado do upstream.
4. Preparar a origem HTTPS comum para jogo e API, atualizar a configuração local do BFF e adicionar somente essa URL de callback ao projeto Supabase de desenvolvimento, após autorização. Cookies Secure/HttpOnly, CSRF e PKCE permanecem ativos.
5. Usar contas distintas, abrir o mesmo endereço privado, confirmar movimento nos dois computadores, desconectar a rede privada e comprovar que o serviço deixa de ser acessível.
6. Ao encerrar, parar o compartilhamento e os processos do jogo, preservando PostgreSQL e personagens.

Essa configuração de rede ainda não foi executada. Exige login dos usuários na rede privada e autorização para instalação/configuração e para a URL adicional no Supabase. Não exige publicar o backend para toda a Internet, abrir porta do roteador, alterar DNS de produção nem comprar VPS. HTTPS com certificado público pode registrar o nome do host nos registros públicos de transparência; escolher um nome genérico.

Referências: [Serve privado](https://tailscale.com/docs/features/tailscale-serve), [teste de aplicação com a equipe](https://tailscale.com/docs/use-cases/application-testing/share-local-dev-server-with-team), [planos e elegibilidade](https://tailscale.com/docs/reference/free-plans-discounts), [certificados HTTPS](https://tailscale.com/docs/how-to/set-up-https-certificates).

Validação concluída localmente: 182/182 testes de fundação, 213/213 PostgreSQL, 147 arquivos Node cobertos (o teste de cache foi atualizado para o limite separado e reexecutado), três testes Python do build e o cenário HTTPS de dois perfis. A comparação visual cobre 82 estados e 14 superfícies em nove resoluções; sua fixture agora espera os recursos e congela apenas a simulação de teste para comparar conteúdo idêntico. Não há congelamento no jogo publicado. O executor Linux do navegador fica fixado em Ubuntu 24.04, compatível com a versão de Playwright usada.

O ensaio prolongado de dois jogadores caminhando pelo mesmo gateway identificou 21 respostas 429 com o limite único anterior. Autenticação mantém 300 requisições/IP/minuto e os limites mais estritos de login/e-mail existentes. As rotas de jogo passam a usar um orçamento separado e limitado de 600/IP/minuto, para que polling e movimento não esgotem o orçamento de autenticação. O teste HTTPS inclui 66 segundos de caminhada simultânea e exige zero respostas 429 nesse cenário. Não é uma autorização de capacidade para 16 jogadores simultâneos por endereço IP.
