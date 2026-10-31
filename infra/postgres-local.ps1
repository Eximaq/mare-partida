param(
    [ValidateSet('start', 'status', 'stop')][string]$Action = 'status',
    [string]$PgBin = (Join-Path $env:LOCALAPPDATA 'MarePartida\postgres-18.6\pgsql\bin'),
    [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'MarePartida\authoritative-dev\data'),
    [ValidateRange(1024, 65535)][int]$Port = 55432
)
$ErrorActionPreference = 'Stop'
$dataPath = (Resolve-Path -LiteralPath $DataDirectory).Path
$control = (Resolve-Path -LiteralPath (Join-Path $PgBin 'pg_ctl.exe')).Path
if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
    throw 'The selected directory is not an initialized PostgreSQL cluster.'
}
# No initialization, deletion, service registration or global PATH modification.
$arguments = @('-D', ('"' + $dataPath + '"'))
if ($Action -eq 'start') {
    $arguments += @('-l', ('"' + (Join-Path $dataPath 'server.log') + '"'), '-o', ('"-h 127.0.0.1 -p ' + $Port + '"'), '-w', '-t', '20')
} elseif ($Action -eq 'stop') {
    $arguments += @('-m', 'fast', '-w', '-t', '20')
}
$arguments += $Action
$process = Start-Process -FilePath $control -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru `
    -RedirectStandardOutput (Join-Path $dataPath 'launcher-output.log') `
    -RedirectStandardError (Join-Path $dataPath 'launcher-error.log')
Get-Content -LiteralPath (Join-Path $dataPath 'launcher-output.log')
if ($process.ExitCode -ne 0) {
    Get-Content -LiteralPath (Join-Path $dataPath 'launcher-error.log')
    exit $process.ExitCode
}
