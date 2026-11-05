param([ValidateSet('start','stop','status','backup')][string]$Action='status')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repo
try {
 $version=(Get-Content -LiteralPath (Join-Path $repo '.node-version') -Raw).Trim()
 if($version -notmatch '^24\.\d+\.\d+$'){throw 'Versao Node local invalida'}
 $portable=Join-Path $env:LOCALAPPDATA ('MarePartida\node-v'+$version+'-win-x64\node.exe')
 $node=if(Test-Path -LiteralPath $portable){$portable}else{(Get-Command node -CommandType Application -ErrorAction Stop).Source}
 if($Action -eq 'start' -and (& $node --version).Trim() -ne ('v'+$version)){throw ('Instale Node '+$version+' ou a copia portatil verificada; nenhum servico foi iniciado')}
 if($Action -eq 'start') {
  $probe=New-Object System.Net.Sockets.TcpClient
  $listening=$false
  try { $attempt=$probe.ConnectAsync('127.0.0.1',55432); $listening=$attempt.Wait(1500) -and $probe.Connected } catch {} finally { $probe.Dispose() }
  if(-not $listening){
   $pgRoot=Join-Path $env:LOCALAPPDATA 'MarePartida'
   $data=Join-Path $pgRoot 'authoritative-dev\data'
   $control=Join-Path $pgRoot 'postgres-18.6\pgsql\bin\pg_ctl.exe'
   if(-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))){throw 'Cluster existente nao encontrado; nenhum banco foi criado'}
   & $control -D $data -l (Join-Path $data 'server.log') -o '-h 127.0.0.1 -p 55432' -w -t 20 start
   if($LASTEXITCODE -ne 0){throw 'PostgreSQL indisponivel'}
  }
 }
 if($Action -eq 'backup'){ & $node tools/local-server-backup.mts }
 else { & $node tools/local-server.mts $Action }
 exit $LASTEXITCODE
} finally { Pop-Location }
