# Teste privado pelo Radmin VPN

O colaborador usa o mesmo backend do anfitrião, sem publicar o servidor na Internet. Pages continua sendo apenas a distribuição estática. Contas e personagens devem ser distintos para se verem no porto.

## Transporte e limites

`navegador do amigo HTTPS localhost:9443 -> relay local 127.0.0.1:9443 -> interface Radmin do anfitrião:9444 -> gateway 127.0.0.1:9443`.

O relay transporta bytes opacos; TLS termina somente no gateway existente. Cookie Secure/HttpOnly, CSRF, PKCE, origem e URLs de retorno permanecem iguais. Não há mudança no Supabase, DNS, gameplay, saves ou banco. API e PostgreSQL continuam em loopback.

O listener do anfitrião aceita somente o IPv4 configurado do colaborador e usa exclusivamente a interface Radmin. O firewall acrescenta a mesma restrição de origem, destino, interface e porta. Não desativar firewall, antivírus ou validação TLS. Não abrir portas no roteador.

Limites: 16 conexões por relay, buffers de 16 KiB, conexão upstream de no máximo três segundos e inatividade de 60 segundos. Conexões excedentes são fechadas. Transporte interrompido não altera estado persistido. Isso serve a um colaborador autorizado; não constitui hospedagem de produção ou teste de capacidade.

## Preparação no anfitrião

Com servidor HTTPS contínuo e Radmin ativos, executar `powershell -NoProfile -File tools/radmin/Prepare.ps1 -PeerAddress <IPv4-do-amigo>`. O gerador cria uma pasta nova em `infra/local/`, ignorada pelo Git. Nenhum endereço real deve ser salvo em commits.

Revisar `host/config.json`. Executar `host/Firewall.ps1` como administrador para criar a regra restrita; o script não substitui regra existente. Iniciar `host/Iniciar Radmin.cmd`, mantendo a janela aberta, ou iniciar o mesmo Host.ps1 em processo oculto controlado. `host/Parar Radmin.cmd` encerra apenas esse relay por identificador de instância, sem parar PostgreSQL ou matar processos alheios. Para retirar a regra, executar `Firewall.ps1 -Remove` como administrador.

Enviar manualmente somente `Mare-Partida-Amigo.zip` e conferir sua procedência com o colaborador. O pacote contém scripts, configuração privada e certificado PÚBLICO, nunca chave privada, credenciais, saves ou banco.

## Computador do colaborador

1. Entrar na mesma rede Radmin e extrair o ZIP inteiro.
2. Executar `Jogar.cmd`; não é necessário instalar Node.
3. Na primeira execução, conferir a impressão SHA256 com o anfitrião e consentir a importação do certificado público em `CurrentUser/Root`. Essa confiança abrange aplicativos desse usuário Windows; pode ser removida depois em `certmgr.msc`, conferindo o certificado exato. Não importar chaves privadas nem outros certificados.
4. O cliente verifica o TLS normalmente e compara o certificado recebido ao empacotado antes de abrir o jogo. Entrar com sua própria conta já autorizada. Cadastro e envio de e-mails dependem de autorização separada.
5. Manter a janela aberta durante o teste; Enter encerra o relay. Se houver bloqueio de arquivo baixado, conferir a procedência e desbloquear somente esse ZIP em Propriedades, sem desativar políticas globais.

O anfitrião precisa estar ligado, conectado e com o servidor ativo. O IP Radmin sozinho não prova a identidade da conta: login e autorização de personagem continuam obrigatórios. Reconfigurar o pacote se um IP ou o certificado mudar. Uma máquina com serviço próprio em localhost:9443 deve encerrar esse serviço antes; o relay não o substitui.

## Validação

Testes Windows: `tests/radmin-package.test.ps1` valida scripts e endereços canônicos. `tests/radmin-relay.test.ps1` cobre filtro de origem, bytes binários, limite de conexões, timeout e parada. `-TlsPort 9443` acrescenta uma requisição HTTPS real pelo relay com validação normal do certificado.

Esses testes locais não comprovam conectividade no computador do colaborador. Aceite remoto pendente: iniciar pacote nesse computador, entrar com duas contas, encontrar-se no mesmo porto, observar movimento nos dois lados, fechar relay e verificar perda da conexão. Preservar personagens e saves ao encerrar.
