param([Parameter(Mandatory=$true)][string]$PeerAddress)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/Common.ps1"
Assert-MareAddress $PeerAddress
$root=(Resolve-Path "$PSScriptRoot/../..").Path
$adapters=@(Get-NetAdapter|Where-Object {$_.InterfaceDescription -match '^Famatech Radmin VPN' -and $_.Status -eq 'Up'}|ForEach-Object {Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4}|Where-Object IPAddress -like '26.*')
if($adapters.Count -ne 1){throw 'Expected one active Radmin address.'}
$server=$adapters[0].IPAddress
Assert-MareAddress $server
if($server -eq $PeerAddress){throw 'Peer cannot be the host.'}
$response=Invoke-WebRequest 'https://localhost:9443/health/live' -UseBasicParsing
if($response.StatusCode -ne 200){throw 'Start the local HTTPS server first.'}
$cert=[Security.Cryptography.X509Certificates.X509Certificate2]::new("$root/infra/local/localhost.crt")
if($cert.HasPrivateKey -or $cert.NotAfter.ToUniversalTime() -le [DateTime]::UtcNow){throw 'Invalid public certificate.'}
$out=Join-Path $root ('infra/local/radmin-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
if(Test-Path $out){throw 'Output already exists.'}
$null=New-Item -ItemType Directory -Path "$out/host","$out/amigo"
$config=@{server=$server;peer=$PeerAddress;certificateSha256=(Get-MareCertificateHash $cert)}|ConvertTo-Json
foreach($folder in @('host','amigo')){
 $config|Set-Content "$out/$folder/config.json" -Encoding UTF8
 Copy-Item "$PSScriptRoot/Common.ps1","$PSScriptRoot/PrivateRelay.cs" "$out/$folder/"
}
Copy-Item "$PSScriptRoot/Host.ps1","$PSScriptRoot/Firewall.ps1" "$out/host/"
Copy-Item "$PSScriptRoot/Client.ps1" "$out/amigo/"
[IO.File]::WriteAllBytes("$out/amigo/localhost.cer",$cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
@'
@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0Client.ps1"
if errorlevel 1 pause
'@|Set-Content "$out/amigo/Jogar.cmd" -Encoding ASCII
@'
@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0Host.ps1"
if errorlevel 1 pause
'@|Set-Content "$out/host/Iniciar Radmin.cmd" -Encoding ASCII
@'
@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0Host.ps1" -Stop
'@|Set-Content "$out/host/Parar Radmin.cmd" -Encoding ASCII
@'
1. Entre na mesma rede Radmin VPN do anfitriao.
2. Extraia TODOS os arquivos deste ZIP para uma pasta sua.
3. Abra Jogar.cmd. Se o Windows bloquear por download, confira a origem com o anfitriao e desbloqueie SOMENTE o ZIP em Propriedades antes de extrair novamente. Nao desative antivirus ou firewall.
4. Na primeira vez, confira a impressao SHA256 do certificado com o anfitriao e digite CONFIAR. A confianca vale para aplicativos do seu usuario Windows. Nenhuma chave privada acompanha este pacote.
5. O navegador abrira https://localhost:9443/online/. Use sua propria conta do projeto de desenvolvimento; nunca a conta do anfitriao.
6. Mantenha a janela aberta. Para parar, saia do jogo e pressione Enter nela.
O anfitriao precisa manter o servidor e o Radmin ligados. Se aparecer erro de conexao ou certificado, avise-o sem enviar senha, cookies ou links de recuperacao. Nao aceite certificados diferentes.
Para remover a confianca depois do teste, abra certmgr.msc, Autoridades de Certificacao Raiz Confiaveis / Certificados, e remova somente o certificado correspondente a este pacote apos conferir sua impressao digital.
'@|Set-Content "$out/amigo/LEIA-ME.txt" -Encoding UTF8
Compress-Archive -Path "$out/amigo/*" -DestinationPath "$out/Mare-Partida-Amigo.zip"
Write-Output $out
