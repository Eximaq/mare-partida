import type {Server,IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';
import {WebSocketServer,WebSocket} from 'ws';
import {z} from 'zod';
import {characterCommandSchema} from '@mare/shared';
import type {AuthService} from './auth/service.js';
import {AuthFault} from './auth/errors.js';
import {equal,digest,type Vault} from './auth/vault.js';
import {sessionCookie} from './auth/routes.js';
import {clientAddress} from './client-address.js';
import {requestMetrics} from './metrics.js';

const protocol='mare.realtime.v1';
const sequence=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const messageSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('subscribe'),characterId:z.uuid(),csrfToken:z.string().max(100)}).strict(),
 z.object({type:z.literal('ping'),seq:sequence}).strict(),
 z.object({type:z.literal('command'),seq:sequence,command:characterCommandSchema}).strict(),
]);
type CommandMessage=Extract<z.infer<typeof messageSchema>,{type:'command'}>;

// This transport does not own gameplay state. Every frame rechecks the session
// and ownership; every movement commits through the same authoritative service.
export function attachRealtime(server:Server,options:{service:AuthService;vault:Vault;origin:string;trustedProxyIp?:string}){
 const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false,handleProtocols:offered=>offered.has(protocol)?protocol:false});
 const peers=new Map<string,number>(),sessions=new Map<string,number>();
 const totals={connections:0,frames:0,commands:0,errors:0,slow:0,frameMs:0,commandMs:0,frameMaxMs:0,commandMaxMs:0};
 const metrics=requestMetrics();
 let stopping=false,reserved=0;
 const reject=(socket:Duplex,status:number)=>{socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);};
 const upgrade=(request:IncomingMessage,socket:Duplex,head:Buffer)=>{
  socket.on('error',()=>{});
  let ip:string,token:string|undefined;
  try{
   if(stopping||request.method!=='GET'||request.url!=='/v1/realtime')return reject(socket,404);
   if(request.headers.origin!==options.origin||request.headers['sec-fetch-site']==='cross-site'||request.headers['sec-websocket-protocol']!==protocol)return reject(socket,403);
   ip=clientAddress(request,options.trustedProxyIp);token=sessionCookie(request);
   if(!token)return reject(socket,401);
  }catch{return reject(socket,400);}
  const key=digest(token);
  if(reserved>=64||(peers.get(ip)??0)>=8||(sessions.get(key)??0)>=2)return reject(socket,429);
  reserved++;peers.set(ip,(peers.get(ip)??0)+1);sessions.set(key,(sessions.get(key)??0)+1);
  let released=false;
  const release=()=>{if(released)return;released=true;reserved--;for(const [map,k] of [[peers,ip],[sessions,key]] as const){const n=(map.get(k)??1)-1;if(n)map.set(k,n);else map.delete(k);}};
  socket.once('close',release);
  const deadline=setTimeout(()=>socket.destroy(),5000);deadline.unref();
  void options.service.rateLimit('realtime-connect:'+ip,30,60).then(()=>{
   if(socket.destroyed||stopping)return socket.destroy();
   clearTimeout(deadline);
   wss.handleUpgrade(request,socket,head,ws=>{totals.connections++;serve(ws,token!,ip);});
  }).catch(()=>{clearTimeout(deadline);reject(socket,429);});
 };
 function serve(ws:WebSocket,token:string,ip:string){
  let character:string|undefined,subscribed=false,running=false,commandRunning=false,pending:CommandMessage|undefined,lastSeq=0;
  let frameAt=0,timer:NodeJS.Timeout|undefined,lastMessage=Date.now(),bucketAt=Date.now(),count=0;
  const authDeadline=setTimeout(()=>ws.close(1008,'subscription_required'),5000);authDeadline.unref();
  const close=()=>{clearTimeout(authDeadline);clearTimeout(timer);};ws.on('close',close);ws.on('error',close);
  const send=(value:unknown)=>{
   if(ws.readyState!==WebSocket.OPEN)return;
   if(ws.bufferedAmount>262144){totals.slow++;ws.close(1013,'slow_consumer');return;}
   ws.send(JSON.stringify(value));
  };
  const fail=(error:unknown,seq?:number)=>{
   totals.errors++;
   const fault=error instanceof AuthFault?error:new AuthFault(503,'unavailable');
   send({type:'error',...(seq===undefined?{}:{seq}),status:fault.status,error:fault.status>=500?'unavailable':fault.code,retryAfterSeconds:fault.retryAfterSeconds});
   if(seq===undefined||fault.status===401||fault.status===403||fault.status===404)ws.close(1008,'authorization_or_state_unavailable');
  };
  const schedule=()=>{clearTimeout(timer);if(ws.readyState===WebSocket.OPEN){timer=setTimeout(()=>void pump(),Math.max(0,frameAt-performance.now()));timer.unref();}};
  // A bounded command lane must not wait behind a slow read-only projection.
  // Database authority, control fencing and durable ordering stay in service.command.
  async function commands(){
   if(commandRunning||!pending||!character||ws.readyState!==WebSocket.OPEN)return;
   commandRunning=true;const input=pending;pending=undefined;const start=performance.now();
   try{
    await options.service.rateLimit('command-ip:'+ip,1200,60);
    const result=await options.service.command(token,character,input.command);
    const ms=performance.now()-start;totals.commands++;totals.commandMs+=ms;totals.commandMaxMs=Math.max(totals.commandMaxMs,ms);metrics.record(200,ms,'command');
    send({type:'ack',seq:input.seq,result});
   }catch(error){metrics.record(error instanceof AuthFault?error.status:503,performance.now()-start,'command');fail(error,input.seq);}
   finally{commandRunning=false;if(pending)void commands();}
  }
  async function pump(){
   if(running||!subscribed||!character||ws.readyState!==WebSocket.OPEN)return;
   running=true;
   try{
    if(Date.now()-lastMessage>15000){ws.close(1001,'heartbeat_timeout');return;}
    if(ws.readyState===WebSocket.OPEN&&performance.now()>=frameAt){
     const start=performance.now();
     // Omitting knownVersion intentionally selects only the compact projection.
     // Full progression remains on the authenticated full-state read path.
     let frame;
     try{frame=await options.service.onlineFrame(token,character);}catch(error){
      if(!(error instanceof AuthFault)||error.status!==401)throw error;
      // JWT validity can end while the MVCC snapshot is being projected.
      // Discard that snapshot, validate/refresh under the session lock, and
      // build a fresh one. Revoked/expired BFF sessions still fail closed.
      await options.service.me(token);
      frame=await options.service.onlineFrame(token,character);
     }
     const ms=performance.now()-start;totals.frames++;totals.frameMs+=ms;totals.frameMaxMs=Math.max(totals.frameMaxMs,ms);
     metrics.record(200,ms,'frame');
     send({type:'frame',frame});frameAt=Math.max(start+100,performance.now()+10);
    }
   }catch(error){fail(error);}finally{running=false;schedule();}
  }
  ws.on('message',(bytes,binary)=>{
   if(binary){ws.close(1003,'text_required');return;}
   if(Date.now()-bucketAt>=1000){bucketAt=Date.now();count=0;}
   if(++count>24){ws.close(1008,'message_rate_limited');return;}
   let value:z.infer<typeof messageSchema>;
   try{value=messageSchema.parse(JSON.parse(bytes.toString()));}catch{ws.close(1008,'invalid_message');return;}
   lastMessage=Date.now();
   if(!subscribed){
    if(value.type!=='subscribe'||!equal(value.csrfToken,options.vault.csrf(token))){ws.close(1008,'csrf_rejected');return;}
    character=value.characterId;subscribed=true;clearTimeout(authDeadline);void pump();return;
   }
   if(value.type==='ping'){send({type:'pong',seq:value.seq});return;}
   if(value.type!=='command'||!['world.move','world.stop'].includes(value.command.action)||value.seq<=lastSeq){ws.close(1008,'invalid_command');return;}
   lastSeq=value.seq;
   if(pending){fail(new AuthFault(429,'command_rate_limited',1),value.seq);return;}
   pending=value;void commands();
  });
 }
 server.on('upgrade',upgrade);
 return {
  report(){const report={...metrics.flush(),event:'realtime_window',active:reserved,...totals};for(const key of Object.keys(totals) as (keyof typeof totals)[])totals[key]=0;return report;},
  async close(){stopping=true;server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();await new Promise<void>(resolve=>wss.close(()=>resolve()));},
 };
}
