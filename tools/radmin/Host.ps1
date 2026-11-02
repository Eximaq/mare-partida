param([switch]$Stop)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/Common.ps1"
$config=Read-MareConfig
$runtime="$PSScriptRoot/runtime.json";$stopFile="$PSScriptRoot/stop.json"
if($Stop){
 if(Test-Path $runtime){$r=Get-Content $runtime -Raw|ConvertFrom-Json;@{instance=$r.instance}|ConvertTo-Json|Set-Content $stopFile -Encoding UTF8}
 exit
}
$null=Assert-MareAdapter $config.server
Add-Type -Path "$PSScriptRoot/PrivateRelay.cs"
$relay=[MarePrivateRelay]::new($config.server,9444,$config.peer,'127.0.0.1',9443,16,60000)
$instance=[Guid]::NewGuid().ToString();$started=$false
try{
 $relay.Start();$started=$true
 @{pid=$PID;instance=$instance;state='running'}|ConvertTo-Json|Set-Content $runtime -Encoding UTF8
 while($relay.Running){
  Start-Sleep -Milliseconds 300
  if(Test-Path $stopFile){try{$s=Get-Content $stopFile -Raw|ConvertFrom-Json;if($s.instance -eq $instance){break}}catch{}}
 }
}finally{
 $relay.Dispose()
 if($started){@{pid=$PID;instance=$instance;state='stopped'}|ConvertTo-Json|Set-Content $runtime -Encoding UTF8}
}
