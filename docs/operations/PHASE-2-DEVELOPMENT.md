# Fase 2 — executar e homologar com segurança

Base aprovada `3addd2a`, branch `feature/auth-sessions`, pasta de trabalho separada
`mare-partida-auth`. A pasta original e a branch/PR #160 não são modificadas.
Auth fica desligado até configuração explícita. Não há gameplay online, importação
de saves, administração de contas ou escrita de economia nesta entrega.

## Preparação local

Requisitos: Node indicado em `.node-version`, npm, Python para o build legado e
PostgreSQL 18.6. A migração é executada pelo owner; a aplicação usa somente runtime.
Não utilizar credenciais admin/owner em `.env.server.local`.

Na preparação local de 31/10/2026 foi criado o banco vazio `mare_auth_dev` na
instância de desenvolvimento já existente, sem restart. Foram criadas roles próprias
`mare_auth_owner` (migração) e `mare_auth_runtime` (aplicação), sem privilégios de
superusuário, criação de banco/roles ou bypass de RLS. As migrations 0001/0002 e os
grants foram aplicados nesse banco; repetição, readiness e negativas de privilégio
passaram. O banco da Fase 1 não foi migrado nem reutilizado.

As URLs correspondentes ficam somente em `.env.migration.local` e `.env.server.local`,
ignorados. A chave de cifragem foi gerada localmente sem saída em logs. O arquivo do
servidor mantém Auth desligado. O proprietário preencheu os campos Supabase e a
[pré-validação de conexão](SUPABASE-DEVELOPMENT-SETUP.md) passou em 31/10/2026,
usando apenas GET e publishable key; os ensaios com contas/e-mails aguardam autorização.
Os comandos Docker abaixo são uma **alternativa de instalação**: usam os nomes
genéricos `mare_owner`/`mare_runtime` em outra instância. Não reaplicar seus grants
sem adaptar a role à instância; no banco preparado, o destinatário é
`mare_auth_runtime`.

```sh
npm ci --ignore-scripts
npm run build
python tools/build_pages.py
npm run dev:certificate
```

O certificado usa arquivos novos em `infra/local/`, ignorados, e não altera trust
store ou DNS. Se já existirem, o comando falha em vez de sobrescrevê-los. O navegador
de teste pode aceitar **somente esse certificado local** em perfil descartável;
não desabilitar validação TLS para o processo Node ou para o Supabase.

Com Docker disponível, preencher `infra/env/compose.env.example` em um arquivo
ignorado `.env.compose.local`, usando senhas diferentes e aleatórias (hex evita
problemas de encoding na URL).
O projeto Compose `mare-auth-local` usa volume próprio e portas 55433/8788, sem
reutilizar a instância/volume da Fase 1. Não executar comandos `down -v` sobre dados.

```sh
docker compose --env-file .env.compose.local -f infra/compose.yaml up -d --wait postgres
docker compose --env-file .env.compose.local -f infra/compose.yaml --profile tools run --rm migrate
docker compose --env-file .env.compose.local -f infra/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U mare_owner -d mare_dev -f /opt/mare/grant-health.sql
docker compose --env-file .env.compose.local -f infra/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U mare_owner -d mare_dev -f /opt/mare/grant-auth.sql
```

Sem Docker, criar banco separado por procedimento autorizado do ambiente existente,
configurar `.env.migration.local` pelo template `infra/env/migration.env.example`,
executar `npm run db:migrate` e aplicar os dois grants como owner nesse banco.
Não reiniciar, reconfigurar nem tentar contornar restrições da instância existente.

## Ativação após preparação manual do provedor

Seguir [SUPABASE-DEVELOPMENT-SETUP.md](SUPABASE-DEVELOPMENT-SETUP.md). Não criar ou
alterar projetos automaticamente. Copiar `.env.example` para `.env.server.local`,
preencher runtime DB, URL do projeto separado, publishable key e algoritmo público.
Gerar a chave de cifragem local sem saída no terminal. Depois de remover somente a
linha placeholder `AUTH_ENCRYPTION_KEY` do arquivo local, pode-se executar:

```sh
node --input-type=module -e "import{appendFileSync,readFileSync}from'node:fs';import{randomBytes}from'node:crypto';const p='.env.server.local';if(/^AUTH_ENCRYPTION_KEY=/m.test(readFileSync(p,'utf8')))throw Error('Key already configured');appendFileSync(p,'\nAUTH_ENCRYPTION_KEY='+randomBytes(32).toString('base64')+'\n',{mode:0o600});"
```

Política aprovada pelo proprietário em 31/10/2026: JWT 900 s, sessão absoluta 86400 s,
inatividade 7200 s,
revalidação do provedor no máximo 900 s. Configuração não aceita ausência dos TTLs.
Atividade autenticada mantém a janela de inatividade, nunca a validade absoluta.
Revogação interna é transacional; detecção de revogação externa admite a janela de
revalidação. Recuperação/preauth duram 600 s; controlador 120 s, renovado a cada 30 s.

Só então alterar `AUTH_ENABLED=true` no arquivo privado e executar:

```sh
npm run dev:server
# Em outro terminal, na mesma pasta:
npm run dev:gateway
```

Abrir `https://localhost:9443/online/`. `/` continua sendo a demonstração. O servidor
Node em 8788 e PostgreSQL ficam em loopback. Não abrir portas públicas. A aplicação
continua recusando `NODE_ENV=production` nesta fundação.

Para executar a API no Docker, usar os dois arquivos Compose e ambos env files:

```sh
docker compose --env-file .env.compose.local --env-file .env.server.local -f infra/compose.yaml -f infra/compose.auth.yaml --profile server config --quiet
docker compose --env-file .env.compose.local --env-file .env.server.local -f infra/compose.yaml -f infra/compose.auth.yaml --profile server up -d --wait server
```

O overlay passa somente campos Auth enumerados; a URL do banco no container continua
usando runtime. Nunca imprimir `docker compose config` sem `--quiet`, ambientes,
cookies, URLs de conexão, links de recuperação ou payloads do provedor em evidências.

## Verificação reproduzível

```sh
npm run typecheck
npm run test:foundation
npm run test:integration
npm run test:legacy
```

Integração requer `.env.test.local` ignorado, com TEST_DATABASE_URL de administrador
**local**, apontando para `postgres`; cria/destroi somente bancos `mare_test_<UUID>`
do próprio ensaio. O teste de grants cria também role única descartável. Não usa
um banco de jogadores. Testa persistência, duas instâncias de serviço, expiração,
refresh concorrente, epoch, CSRF, overposting, IDOR, rollback e recuperação de rede.

`npm run test:auth-browser` abre API/gateway de teste em loopback com banner de
**provedor simulado** e banco UUID descartável. Usar endereços `@example.invalid`
e a senha pública de fixture `Local test password only`. Digitar `stop` no terminal
encerra apenas esse processo e remove somente seu banco. Não incluir esse harness
na imagem da API ou em homologação real. Ele não envia e-mails.

## Aceitação no Supabase real — ainda pendente

O projeto e a configuração local foram preparados pelo proprietário. A conexão de
leitura, a troca das duas credenciais locais, a Data API desligada no dashboard e
o HTTPS com Auth ativo foram verificados. O primeiro ensaio real passou em login,
JWT ES256/900 s, reload e logout. A recusa antes da confirmação ficou inconclusiva
porque o link foi aberto durante o ensaio; callback completo segue pendente.
Auth voltou a desligado e os processos do ensaio foram encerrados. Ver o
[relatório funcional](SUPABASE-DEVELOPMENT-SETUP.md#primeiro-ensaio-funcional-real--31102026).
Os testes abaixo continuam distintos dos testes locais com provedor simulado.

### Etapa inicial: uma conta autorizada

Combinar com o proprietário um e-mail sob seu controle, permitido pelo serviço de
e-mail padrão do projeto, e autorização específica para um cadastro e uma mensagem
de confirmação. A senha é definida por ele na tela local, sem passar pelo chat.

1. Submeter o cadastro uma única vez. A resposta neutra da API não comprova entrega;
   se não chegar, registrar pendência sem reenviar automaticamente.
2. Antes de abrir o link, testar uma tentativa de login com a senha correta: deve
   ser recusada e não criar sessão local autenticada.
3. O proprietário abre o link no mesmo perfil/navegador que iniciou o cadastro,
   preservando o cookie PKCE. Não compartilhar o link nem abri-lo em outro perfil.
4. Verificar sessão após confirmação, persistência por reload e login explícito.
   Validar assinatura de um JWT emitido com JWKS, algoritmo ES256 e `exp - iat = 900`
   somente em memória. Registrar apenas resultados e contagens, nunca tokens/claims.
5. Testar logout local e rejeição de acesso posterior. Aguardar a fila de revogação
   antes de encerrar. Não criar personagem, recuperar senha ou cadastrar segunda
   conta como consequência automática desta etapa.

### Etapas adicionais: autorização separada antes da execução

| Ensaio | Contas e operações necessárias |
|---|---|
| Recuperação | Mesma conta de teste; mais um e-mail de recuperação, senha nova definida pelo proprietário, teste de sessão restrita e revogação global |
| Autorização cruzada | Segunda caixa sob controle do proprietário; mais um cadastro e uma confirmação; um personagem novo por conta, leitura/controle cruzados devem falhar sem alterar personagens |
| Abas, dispositivos e refresh | Conta já autorizada em duas abas e dois perfis, espera pelo vencimento real, refresh concorrente, controle exclusivo, rotação e logout local/global |
| Revogação externa ou chaves | Escopo explícito da conta/projeto; apresentar antes qualquer mudança no dashboard, sem afetar contas fora do ensaio |

Não assumir que autorização de uma linha permite executar as demais. Um destinatário
adicional depende das restrições reais do SMTP gratuito; não contornar por serviço
pago, alteração DNS ou uso de endereço de terceiros.

Matriz completa a executar somente conforme as autorizações correspondentes:

1. Cadastro com confirmação obrigatória: login antes de confirmar falha; link no
   mesmo navegador cria sessão. Link repetido, expirado e em outro perfil falha.
2. Login em duas abas e dois perfis/dispositivos. Inspecionar atributos do cookie
   sem copiar valores; nenhum access/refresh token em JS/localStorage/URL final.
3. Criar um personagem; recarregar e reiniciar somente a API autorizada: mesma
   identidade persistida. Conta B não lê/controla personagem A (404 indistinguível).
4. Abas concorrentes no vencimento de JWT: refresh serializado, sem perda de sessão;
   observar somente contagem/status. Expiração absoluta/inativa não é prorrogada.
5. Controle exclusivo: confirmação para assumir, epoch anterior rejeitado. Rotação
   do cookie invalida o anterior; requisição concorrente pode pedir nova tentativa.
6. Logout local preserva outro dispositivo; logout global e recuperação invalidam
   todos. Indisponibilidade do provedor mantém revogação interna e fila de retry.
7. Recuperação por e-mail gera sessão restrita: não cria personagem nem assume
   controle. Troca de senha exige novo login e consome o fluxo. Testar retorno perdido.
8. Revogar no dashboard somente a conta de teste autorizada; verificar rejeição após
   janela declarada. Conferir rotação de chave/JWKS e limites reais do projeto/SMTP.

Registrar data, commit, casos/status e projeto público; nunca guardar mensagens de
e-mail, dados pessoais, senhas ou tokens. Mocks/SDK com JWT local não substituem isso.

## Limites operacionais antes de exposição pública

- Escolher hospedagem com origem HTTPS comum; Pages estático não executa o BFF.
- Manter os TTLs aprovados; definir limites por IP atrás de proxy confiável e proteção adicional de abuso.
  IP não autoriza contas. O gateway local remove headers de origem de IP não confiáveis.
- Definir retenção de metadados e gestão/backup da chave. Tokens expirados/revogados
  são apagados por lotes; metadados de sessão ainda não têm retenção automática final.
  Rotacionar a chave atual exige invalidar sessões/fluxos e reconciliar a fila remota
  antes de trocar: não há keyring de múltiplas versões implementado.
- O reset remoto não é atomicamente acoplado ao PostgreSQL. Falha incerta revoga
  sessões locais e pede novo login/recuperação; não anuncia troca de senha confirmada.
- Sem teste de carga, recuperação por restart PostgreSQL ou recuperação de desastre.
  A interrupção/restauração de rede foi testada sem reiniciar o serviço protegido.
- Scripts de migração não apagam saves; não há migração de economia ou progressão.
