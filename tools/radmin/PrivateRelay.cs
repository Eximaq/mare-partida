// Opaque TCP transport: never decrypts TLS, reads cookies or stores application data.
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
public sealed class MarePrivateRelay : IDisposable {
    private readonly TcpListener listener;
    private readonly IPAddress allowed, upstream;
    private readonly int upstreamPort, maximum, idleMs;
    private readonly object gate = new object();
    private readonly List<Link> links = new List<Link>();
    private volatile bool stopped;
    public int Port { get { return ((IPEndPoint)listener.LocalEndpoint).Port; } }
    public int Active { get { lock(gate) return links.Count; } }
    public bool Running { get { return !stopped && accept != null; } }
    private Task accept;
    private sealed class Link : IDisposable {
        public readonly TcpClient In, Out = new TcpClient(AddressFamily.InterNetwork);
        private readonly Timer timer;
        private readonly int idle;
        private int closed;
        public Link(TcpClient input, int timeout) { In=input;idle=timeout;timer=new Timer(_=>Dispose(),null,timeout,Timeout.Infinite); }
        public void Touch() { try { timer.Change(idle,Timeout.Infinite); } catch(ObjectDisposedException){} }
        public void Dispose(){if(Interlocked.Exchange(ref closed,1)!=0)return;timer.Dispose();In.Close();Out.Close();}
    }
    private static IPAddress Address(string value){
        IPAddress a;
        if(!IPAddress.TryParse(value,out a)||a.AddressFamily!=AddressFamily.InterNetwork||a.Equals(IPAddress.Any)||a.Equals(IPAddress.Broadcast))throw new ArgumentException("An explicit IPv4 address is required");
        return a;
    }
    public MarePrivateRelay(string listen,int port,string peer,string target,int targetPort,int maxConnections,int idleTimeoutMs){
        if(port<0||port>65535||targetPort<1||targetPort>65535||maxConnections<1||maxConnections>32||idleTimeoutMs<100||idleTimeoutMs>120000)throw new ArgumentException("Invalid relay bounds");
        listener=new TcpListener(Address(listen),port);allowed=Address(peer);upstream=Address(target);upstreamPort=targetPort;maximum=maxConnections;idleMs=idleTimeoutMs;
        listener.Server.ExclusiveAddressUse=true;
    }
    public void Start(){if(accept!=null||stopped)throw new InvalidOperationException("Relay cannot restart");listener.Start(maximum);accept=Accept();}
    private async Task Accept(){
        try {
            while(!stopped){
                TcpClient input=await listener.AcceptTcpClientAsync().ConfigureAwait(false);
                Link link;
                lock(gate){
                    if(stopped||!((IPEndPoint)input.Client.RemoteEndPoint).Address.Equals(allowed)||links.Count>=maximum){input.Close();continue;}
                    link=new Link(input,idleMs);links.Add(link);
                }
                Serve(link);
            }
        }catch(ObjectDisposedException){}catch(SocketException){}finally{Dispose();}
    }
    private async void Serve(Link link){
        try {
            Task connection=link.Out.ConnectAsync(upstream,upstreamPort);
            if(await Task.WhenAny(connection,Task.Delay(3000)).ConfigureAwait(false)!=connection){
                link.Dispose();
                Task observer=connection.ContinueWith(t=>{var error=t.Exception;},TaskContinuationOptions.OnlyOnFaulted);
                return;
            }
            await connection.ConfigureAwait(false);link.Touch();
            Task a=Copy(link.In.GetStream(),link.Out.GetStream(),link),b=Copy(link.Out.GetStream(),link.In.GetStream(),link);
            await Task.WhenAny(a,b).ConfigureAwait(false);link.Dispose();
            await Task.WhenAll(a,b).ConfigureAwait(false);
        }catch(IOException){}catch(SocketException){}catch(ObjectDisposedException){}catch(InvalidOperationException){}
        finally{link.Dispose();lock(gate)links.Remove(link);}
    }
    private static async Task Copy(Stream source,Stream target,Link link){
        byte[] buffer=new byte[16384];int n;
        while((n=await source.ReadAsync(buffer,0,buffer.Length).ConfigureAwait(false))>0){link.Touch();await target.WriteAsync(buffer,0,n).ConfigureAwait(false);link.Touch();}
    }
    public void Dispose(){
        stopped=true;listener.Stop();
        lock(gate){foreach(Link link in links)link.Dispose();}
    }
}
