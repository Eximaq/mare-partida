$ErrorActionPreference='Stop'
$root=Join-Path $PSScriptRoot '../tools/radmin'
foreach($name in @('Common.ps1','Firewall.ps1')){
 if(-not(Test-Path "$root/$name")){throw "Missing $name"}
 $tokens=$null;$errors=$null
 $null=[Management.Automation.Language.Parser]::ParseFile((Resolve-Path "$root/$name"),[ref]$tokens,[ref]$errors)
 if($errors.Count){throw ($errors|Out-String)}
}
. "$root/Common.ps1"
foreach($bad in @('0.0.0.0','127.0.0.1','26.1.2','26.001.2.3','::1')){
 $rejected=$false;try{Assert-MareAddress $bad}catch{$rejected=$true}
 if(-not $rejected){throw 'Unsafe configuration accepted'}
}
Assert-MareAddress '26.1.2.3'
Write-Output 'PASS: package scripts parse; only canonical Radmin IPv4 accepted.'
