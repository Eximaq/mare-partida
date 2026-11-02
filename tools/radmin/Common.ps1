function Assert-MareAddress([string]$Address) {
 $ip=$null
 if(-not [Net.IPAddress]::TryParse($Address,[ref]$ip) -or $ip.AddressFamily -ne 'InterNetwork' -or $ip.ToString() -cne $Address -or -not $Address.StartsWith('26.')){throw 'Expected an exact Radmin IPv4 address.'}
}
function Read-MareConfig {
 $c=Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw|ConvertFrom-Json
 Assert-MareAddress $c.server;Assert-MareAddress $c.peer
 if($c.server -eq $c.peer -or $c.certificateSha256 -cnotmatch '^[A-F0-9]{64}$'){throw 'Invalid private configuration.'}
 return $c
}
function Assert-MareAdapter([string]$Address) {
 $found=@(Get-NetAdapter|Where-Object {$_.InterfaceDescription -match '^Famatech Radmin VPN' -and $_.Status -eq 'Up'}|ForEach-Object {Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4}|Where-Object IPAddress -eq $Address)
 if($found.Count -ne 1){throw 'Connect to the expected Radmin network first.'}
 return $found[0]
}
function Get-MareCertificateHash($Certificate) {
 $hash=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($hash.ComputeHash($Certificate.RawData))).Replace('-','')}finally{$hash.Dispose()}
}
