# Acesso direto pelo Radmin VPN

Os dois jogadores abrem `https://<IP-RADMIN-DO-ANFITRIAO>:9444/online/` e entram com contas distintas. O jogo roda no navegador; não há ZIP do jogo, conector ou programa de encaminhamento no computador do colaborador. A proposta anterior de relay foi substituída antes do merge.

## Segurança e arquitetura

O supervisor contínuo inicia um segundo listener HTTPS somente no IP da interface Radmin. O firewall permite apenas o IP exato do colaborador, na porta TCP 9444 e interface Radmin. O gateway recusa conexões TCP de qualquer endereço diferente do anfitrião ou colaborador e valida o Host HTTP esperado. Cabeçalhos encaminhados não provam identidade nem substituem esse filtro.

O backend e PostgreSQL permanecem em loopback. O gateway serve o jogo original e encaminha a API ao mesmo backend e banco já existentes. Não abre portas do roteador, não muda DNS e não publica o backend na Internet. Pages continua sendo apenas a distribuição estática.

O BFF usa uma única origem canônica privada. O supervisor a deriva dos IPs validados na configuração ignorada, mantendo ES256, sessões 24h/2h, cookies Secure/HttpOnly, CSRF e PKCE. A chave e credenciais existentes não são copiadas para o cliente. O arquivo .env continua com Auth desligado; a ativação permanece restrita ao processo supervisionado.

O endereço antigo localhost redireciona apenas páginas GET/HEAD de entrada e jogo à origem privada. Não redireciona comandos POST nem transforma origens arbitrárias em origens autorizadas. Será necessário entrar novamente na origem privada; sessões e progresso não são importados do navegador antigo. Não há migração nem mudança de saves, personagens, gameplay ou assets.

## Configuração local

Preservar uma cópia de `infra/local/continuous/settings.json`. Acrescentar `radmin: {host, peer, key, cert}` com dois IPv4 canônicos diferentes da interface Radmin (26.x.x.x) e caminhos locais dos arquivos TLS. Ausência de `radmin` mantém o modo localhost anterior. Wildcards, interfaces públicas, loopback como destino Radmin e certificados sem SAN do IP são rejeitados. O supervisor exige que o IP exista numa interface local e encerra seus próprios processos caso o listener falhe.

Preparar certificado de desenvolvimento com SAN do IP exato, uso serverAuth e chave privada exclusiva no anfitrião. Compartilhar somente o certificado público .cer; nunca .key, .env, banco ou arquivos de configuração privados. Conferir fingerprint e validade antes da distribuição. Renovação exige preparar e confiar no novo certificado; não desativar TLS para resolver expiração.

O helper `tools/radmin/Firewall.ps1`, executado como administrador, cria a regra restrita. Ele lê `config.json` ao lado do script, com `server`, `peer` e `certificateSha256` (SHA256 hexadecimal do certificado público). Copiar os helpers Common.ps1/Firewall.ps1 para a pasta local ignorada antes de gerar essa configuração. Uma regra existente não é sobrescrita automaticamente. `Firewall.ps1 -Remove` remove somente a regra nomeada do jogo.

No Supabase de desenvolvimento, adicionar **somente após autorização** o callback exato `https://<IP>:9444/v1/auth/callback`, sem wildcard. Preservar o callback e Site URL antigos. Login com senha usa a origem configurada no BFF; confirmação/recuperação precisam do novo callback permitido. Não enviar mensagens nem cadastrar contas para conferir essa configuração.

Reiniciar pelo supervisor após salvar as configurações. Os atalhos existentes Iniciar/Parar servidor continuam controlando API e ambos os listeners; PostgreSQL permanece preservado. Sem Radmin ativo, o modo privado falha fechado. Para voltar a localhost, parar o supervisor, restaurar as configurações anteriores e iniciar novamente; não apagar dados.

## Colaborador: primeira utilização

1. Conectar o Radmin na mesma rede do anfitrião.
2. Receber somente o certificado público e conferir sua impressão digital com o anfitrião.
3. Abrir o .cer, escolher Instalar Certificado → Usuário Atual → Colocar todos os certificados no repositório a seguir → Autoridades de Certificação Raiz Confiáveis. Confirmar somente o certificado conferido. Essa confiança vale para aplicativos do usuário Windows; não é uma desativação global da validação TLS.
4. Abrir o endereço HTTPS privado no navegador e entrar com sua própria conta. Cadastro/envios de e-mail continuam sujeitos à autorização separada.
5. Usar personagens diferentes no mesmo porto. Para encerrar, sair da conta e fechar a aba; nenhum conector precisa ficar aberto.

Ao encerrar o uso desse ambiente, remover somente o certificado correspondente em certmgr.msc, após conferir sua impressão digital. Não instalar chave privada, ignorar avisos de certificados diferentes ou desativar antivírus/firewall. Hospedagem com domínio e certificado público confiável dispensa essa configuração de confiança no computador do jogador.

## Validação e limites

Testes Node cobrem configuração privada, política preservada, rejeição de host adulterado, rejeição de peer incorreto mesmo com X-Forwarded-For forjado, arquivos privados inacessíveis, cookies seguros e redirecionamento canônico. Testes Windows validam sintaxe dos helpers e endereços canônicos. O servidor original continua com os mesmos limites de concorrência/timeout do gateway.

Conectividade no computador do colaborador e encontro entre duas contas pela VPN exigem confirmação remota; testes locais não substituem essa evidência. O certificado de desenvolvimento precisa ser confiado nos dois computadores. Radmin e computador do anfitrião precisam permanecer ligados. Isso é um teste privado, não um serviço de produção nem uma garantia de capacidade de MMO.
