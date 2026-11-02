# Servidor local persistente — Windows

Instalação preparada em `%USERPROFILE%\Desktop\MARE\mare-server-state`.
Interface: **https://localhost:9443/online/**. PostgreSQL em loopback55432;
API em loopback8788; HTTPS em loopback9443. Node24, PG18 e certificado de localhost
já configurados neste usuário. Não instalar serviço global nem mudar execução do
PowerShell ou verificação TLS para iniciar.

## Como usar

Na área de trabalho, pasta **Maré Partida - Servidor Local**:

1. Abra **Iniciar servidor.cmd**. Aguarde “Servidor iniciado” e feche a janela.
2. Abra **Abrir jogo.url**. Use sua conta de teste já confirmada e a senha diretamente
   na página. O login leva direto a `/game`, com HUD/mapa originais. As quatro
   contas e três personagens anteriores estão preservados. O gameplay online
   ainda é limitado; ver `docs/architecture/DIRECT-ONLINE-GAME.md`.
3. Para encerrar, abra **Parar servidor.cmd**. Aguarde a confirmação. Isso desliga
   Auth/API/HTTPS; PostgreSQL continua ativo para preservar o uso de outros trabalhos.
4. **Status.cmd** informa o estado; **Backup.cmd** cria uma nova cópia consistente.

Equivalentes no PowerShell, dentro desta pasta:

```powershell
.\infra\local-server.ps1 -Action start
.\infra\local-server.ps1 -Action status
.\infra\local-server.ps1 -Action backup
.\infra\local-server.ps1 -Action stop
```

Iniciar novamente não duplica processos. Após reiniciar o computador, use Iniciar;
o launcher inclui uma rotina para iniciar o cluster existente se estiver parado.
Essa partida fria do cluster compartilhado não foi forçada neste ensaio; o PG
permaneceu ativo. Ele nunca inicializa ou apaga banco. Fechar o navegador não encerra o servidor. Suspender/desligar o PC
interrompe acesso; iniciar depois retoma os dados persistidos. Não há início automático
no login do Windows nesta entrega.

## Onde ficam os dados

- Banco dedicado **mare_local_alpha**, no cluster existente em
  `%LOCALAPPDATA%\MarePartida\authoritative-dev\data`.
- Banco anterior **mare_auth_dev** permaneceu intacto: esta instalação recebeu uma
  cópia consistente e migrou somente a cópia. Progresso daqui em diante é independente.
  As sessões copiadas exigem novo login por incremento de epoch apenas na cópia.
- Backups em `%LOCALAPPDATA%\MarePartida\continuous-backups`; nenhum é sobrescrito
  ou apagado automaticamente. Backup inicial antes da migração e backup do alpha
  instalado foram criados. A cópia externa ainda deve ser definida pelo proprietário.
- Configuração runtime em `.env.server.local`, ignorada pelo Git. Auth permanece
  false no arquivo; o supervisor habilita apenas no processo iniciado pelo usuário.
  Credenciais de owner/admin não são herdadas pela API.
- Metadados e log privado em `infra/local/continuous`, ignorados pelo Git. Não
  compartilhar essa pasta nem backups/envs com colaboradores. A configuração owner
  do backup fica em `.env.migration.local`, separada da API. Os certificados estão
  em `infra/local`; preservar esta pasta junto à instalação.

O código do gameplay, assets e saves da demonstração não foi alterado. O save
offline continua no navegador; a progressão do painel online fica no PostgreSQL.
Não limpar dados do navegador para solucionar login nem importar XP/ouro local.

## Colaborador e lobby

Esta instalação aceita conexões somente deste PC. No computador do colaborador,
`localhost` se refere ao computador dele. Acesso conjunto exige uma etapa própria
de rede, HTTPS/origem e autenticação: LAN ou rede privada, com endereço confiável
comum e URLs de callback aprovadas. Nenhuma porta de roteador/firewall foi aberta,
nenhum túnel público criado e nenhuma configuração Supabase alterada.

Com acesso compartilhado, contas diferentes terão seus próprios personagens e
progressão no mesmo backend. Ainda **não existe presença/movimento multiplayer**:
vocês não se verão no lobby, não lutarão juntos nem terão chat compartilhado.
O lobby visual da demonstração continua local. Esses recursos exigem sincronização
autoritativa de presença, mapa e movimentos, incluindo desconexão e reconexão.

## Validação desta instalação

- Cópia e migração aditivas:13 migrações, quatro contas, três personagens;
  hashes de todas as tabelas originais inalterados antes/depois da instalação.
- Início duplicado, parada graciosa por IPC privado e reinício executados.
- Readiness real, página HTTPS e CSRF disponíveis; endpoints privados recusam
  chamadas sem sessão. Leitura pública de JWKS do provedor é permitida; nenhum
  cadastro, recuperação, e-mail ou mudança de configuração foi solicitado.
- Build/typecheck,69 testes foundation,100 integrações PG/HTTP e três testes do
  portal passaram. Teste automatizado encerra a API real e comprova que PG/personagem persistem.
  Nenhuma prova de acesso do colaborador ou lobby compartilhado é alegada.

Se não iniciar: confira Status, PG e portas8788/9443. Não mate processos de outros
trabalhos para liberar portas. O log é privado; mensagens de startup são genéricas
para não expor credenciais. Não usar `reset`, apagar diretório do PG ou restaurar
backup por cima do banco atual. Recuperação deve ocorrer em um banco novo.

O monitor detectou cerca de4% de disco livre neste PC. Não houve remoção de arquivos;
liberar espaço com revisão do proprietário antes de acumular backups/artefatos.
