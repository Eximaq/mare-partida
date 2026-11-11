param([ValidateSet('start','stop','status','backup')][string]$Action='status')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repo
try {
 $version=(Get-Content -LiteralPath (Join-Path $repo '.node-version') -Raw).Trim()
 if($version -notmatch '^24\.\d+\.\d+$'){throw 'Versao Node local invalida'}
 $pgRoot=Join-Path $env:LOCALAPPDATA 'MarePartida'
 $settingsFile=Join-Path $repo 'infra/local/continuous/settings.json'
 if(Test-Path -LiteralPath $settingsFile){
  $settings=Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
  if($settings.resourceRoot){
   if(-not [IO.Path]::IsPathRooted($settings.resourceRoot)){throw 'resourceRoot deve ser um caminho absoluto existente'}
   $pgRoot=(Resolve-Path -LiteralPath $settings.resourceRoot -ErrorAction Stop).Path
  }
 }
 $portable=Join-Path $pgRoot ('node-v'+$version+'-win-x64\node.exe')
 $node=if(Test-Path -LiteralPath $portable){$portable}else{(Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source}
 if($Action -eq 'start') {
  $actualNode=(& $node --version | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or $actualNode -ne ('v'+$version)){
   $reported=if($actualNode -match '^v\d+\.\d+\.\d+$'){$actualNode}else{'indisponivel'}
   throw ('Node esperado: v'+$version+'; encontrado: '+$reported+' em '+$node+'. Nenhum servico foi iniciado')
  }
  $data=Join-Path $pgRoot 'authoritative-dev\data'
  $control=Join-Path $pgRoot 'postgres-18.6\pgsql\bin\pg_ctl.exe'
  $ready=Join-Path $pgRoot 'postgres-18.6\pgsql\bin\pg_isready.exe'
  if(-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))){throw 'Cluster existente nao encontrado; nenhum banco foi criado'}
  & $ready -q -h 127.0.0.1 -p 55432 -t 2
  if($LASTEXITCODE -ne 0){
   # A listening socket is not readiness while PostgreSQL recovers after a reboot.
   # Reuse an existing postmaster; never remove its lock or reset database files.
   & $control -D $data status *> $null
   if($LASTEXITCODE -ne 0){
    & $control -D $data -l (Join-Path $data 'server.log') -o '-h 127.0.0.1 -p 55432' -W start
    if($LASTEXITCODE -ne 0){throw 'Nao foi possivel iniciar PostgreSQL; dados preservados'}
   }
   Write-Host 'Aguardando PostgreSQL ficar pronto (recuperacao pode levar ate 120 segundos)...'
   $elapsed=[System.Diagnostics.Stopwatch]::StartNew()
   do {
    & $ready -q -h 127.0.0.1 -p 55432 -t 2
    $databaseReady=$LASTEXITCODE -eq 0
    if(-not $databaseReady){Start-Sleep -Milliseconds 500}
   } while(-not $databaseReady -and $elapsed.Elapsed.TotalSeconds -lt 120)
   if(-not $databaseReady){throw 'PostgreSQL ainda nao esta pronto. Aguarde a recuperacao e tente novamente; dados preservados'}
  }
 }
 if($Action -eq 'backup'){ & $node tools/local-server-backup.mts }
 else { & $node tools/local-server.mts $Action }
 exit $LASTEXITCODE
} finally { Pop-Location }
