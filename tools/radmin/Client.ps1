$ErrorActionPreference='Stop'
. "$PSScriptRoot/Common.ps1"
$config=Read-MareConfig
$null=Assert-MareAdapter $config.peer
$cert=[Security.Cryptography.X509Certificates.X509Certificate2]::new("$PSScriptRoot/localhost.cer")
if($cert.HasPrivateKey -or (Get-MareCertificateHash $cert) -cne $config.certificateSha256 -or $cert.NotAfter.ToUniversalTime() -le [DateTime]::UtcNow){throw 'Certificate mismatch or expiration.'}
$store=[Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser')
try{$store.Open('ReadOnly');$trusted=@($store.Certificates|Where-Object Thumbprint -eq $cert.Thumbprint).Count -gt 0}finally{$store.Close()}
if(-not $trusted){
 Write-Host 'Este certificado publico permite confiar no HTTPS local do jogo no seu usuario Windows.'
 Write-Host ('SHA256: '+$config.certificateSha256)
 Write-Host ('Valido ate: '+$cert.NotAfter.ToString('yyyy-MM-dd'))
 if((Read-Host 'Confira com o anfitriao. Digite CONFIAR para importar somente este certificado') -cne 'CONFIAR'){throw 'Import cancelled.'}
 $null=Import-Certificate -FilePath "$PSScriptRoot/localhost.cer" -CertStoreLocation Cert:\CurrentUser\Root
}
Add-Type -Path "$PSScriptRoot/PrivateRelay.cs"
$relay=[MarePrivateRelay]::new('127.0.0.1',9443,'127.0.0.1',$config.server,9444,16,60000)
try{
 $relay.Start()
 $tcp=[Net.Sockets.TcpClient]::new()
 try{
  $tcp.Connect('127.0.0.1',9443)
  $tls=[Net.Security.SslStream]::new($tcp.GetStream(),$false)
  try{
   $tls.ReadTimeout=10000;$tls.WriteTimeout=10000;$tls.AuthenticateAsClient('localhost')
   $remote=[Security.Cryptography.X509Certificates.X509Certificate2]::new($tls.RemoteCertificate)
   if((Get-MareCertificateHash $remote) -cne $config.certificateSha256){throw 'Unexpected server certificate.'}
  }finally{$tls.Dispose()}
 }finally{$tcp.Dispose()}
 Write-Host 'HTTPS verificado. Mantenha esta janela aberta enquanto joga.'
 Start-Process 'https://localhost:9443/online/'
 $null=Read-Host 'Pressione Enter para encerrar a conexao'
}finally{$relay.Dispose()}
