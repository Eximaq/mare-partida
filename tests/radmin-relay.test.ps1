param([int]$TlsPort = 0)
$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot '../tools/radmin/PrivateRelay.cs')
function Assert($Value, $Message) { if (-not $Value) { throw $Message } }
Add-Type @"
using System; using System.Net; using System.Net.Sockets; using System.Threading.Tasks;
public class RelayEcho : IDisposable {
 public TcpListener Listener; public int Port {get {return ((IPEndPoint)Listener.LocalEndpoint).Port;}}
 public RelayEcho(){Listener=new TcpListener(IPAddress.Loopback,0);Listener.Start();Task.Run(async()=>{try{while(true){var c=await Listener.AcceptTcpClientAsync();var job=Task.Run(async()=>{using(c){var s=c.GetStream();var b=new byte[8192];int n;while((n=await s.ReadAsync(b,0,b.Length))>0)await s.WriteAsync(b,0,n);}});}}catch(ObjectDisposedException){}catch(SocketException){}});}
 public void Dispose(){Listener.Stop();}
}
"@
$echo=[RelayEcho]::new()
$relay=[MarePrivateRelay]::new('127.0.0.1',0,'127.0.0.1','127.0.0.1',$echo.Port,2,1000)
try {
 $relay.Start();$client=[Net.Sockets.TcpClient]::new();$client.Connect('127.0.0.1',$relay.Port);$stream=$client.GetStream();$stream.ReadTimeout=3000
 $bytes=[Text.Encoding]::UTF8.GetBytes('opaque transport');$stream.Write($bytes,0,$bytes.Length);$answer=New-Object byte[] $bytes.Length;$n=0
 while($n -lt $answer.Length){$read=$stream.Read($answer,$n,$answer.Length-$n);if(-not $read){break};$n+=$read}
 Assert ($n -eq $bytes.Length -and [Text.Encoding]::UTF8.GetString($answer) -eq 'opaque transport') 'Bytes changed in transit'
 Start-Sleep -Milliseconds 1300;Assert ($stream.Read($answer,0,1) -eq 0) 'Idle connection was not closed';$client.Dispose()
 $bounded=[MarePrivateRelay]::new('127.0.0.1',0,'127.0.0.1','127.0.0.1',$echo.Port,1,10000)
 $one=[Net.Sockets.TcpClient]::new();$two=[Net.Sockets.TcpClient]::new()
 try{
  $bounded.Start();$one.Connect('127.0.0.1',$bounded.Port)
  $s=$one.GetStream();$s.ReadTimeout=3000;$s.WriteByte(42);Assert ($s.ReadByte() -eq 42) 'First connection failed'
  $two.Connect('127.0.0.1',$bounded.Port);$other=$two.GetStream();$other.ReadTimeout=3000
  Assert ($other.ReadByte() -eq -1) 'Connection limit bypassed'
  $data=New-Object byte[] 262144;[Random]::new(37).NextBytes($data)
  $sending=$s.WriteAsync($data,0,$data.Length);$received=New-Object byte[] $data.Length;$offset=0
  while($offset -lt $received.Length){$count=$s.Read($received,$offset,$received.Length-$offset);if(-not $count){throw 'Truncated stream'};$offset+=$count}
  $sending.GetAwaiter().GetResult()
  Assert ([Convert]::ToBase64String($data) -ceq [Convert]::ToBase64String($received)) 'Large binary transfer corrupted'
 }finally{$one.Dispose();$two.Dispose();$bounded.Dispose()}
 $denied=[MarePrivateRelay]::new('127.0.0.1',0,'127.0.0.2','127.0.0.1',$echo.Port,2,1000)
 try {$denied.Start();$c=[Net.Sockets.TcpClient]::new();$c.Connect('127.0.0.1',$denied.Port);$s=$c.GetStream();$s.ReadTimeout=2000;Assert ($s.Read($answer,0,1) -eq 0) 'Foreign source accepted';$c.Dispose()} finally {$denied.Dispose()}
 $port=$relay.Port;$relay.Dispose();$probe=[Net.Sockets.TcpClient]::new();try {$probe.Connect('127.0.0.1',$port);throw 'Listener survived stop'}catch [Net.Sockets.SocketException]{}finally{$probe.Dispose()}
 if($TlsPort){$tls=[MarePrivateRelay]::new('127.0.0.1',0,'127.0.0.1','127.0.0.1',$TlsPort,8,10000);try{$tls.Start();$r=Invoke-WebRequest ('https://localhost:'+$tls.Port+'/health/live') -UseBasicParsing;Assert ($r.StatusCode -eq 200) 'TLS forwarding failed'}finally{$tls.Dispose()}}
 Write-Output 'PASS: exact peer filter, binary transfer, connection limit, idle timeout, shutdown and optional verified HTTPS.'
} finally {$relay.Dispose();$echo.Dispose()}
