#Requires -RunAsAdministrator
param([switch]$Remove)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/Common.ps1"
$config=Read-MareConfig
$name='MarePartida-Radmin-HTTPS-9444'
$existing=Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
if($Remove){if($existing){$existing|Remove-NetFirewallRule};exit}
if($existing){throw 'Rule already exists. Review it before replacing.'}
$adapter=Assert-MareAdapter $config.server
$null=New-NetFirewallRule -Name $name -DisplayName 'Mare Partida - um colaborador Radmin HTTPS' -Direction Inbound -Action Allow -Protocol TCP -LocalAddress $config.server -LocalPort 9444 -RemoteAddress $config.peer -InterfaceAlias $adapter.InterfaceAlias -Profile Any -Enabled True
Write-Host 'Liberada somente a conexao privada do colaborador.'
