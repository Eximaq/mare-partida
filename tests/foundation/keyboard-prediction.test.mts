import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ui=require('../../apps/account-client/game-ui.js');
const source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
const section=(a:string,b:string)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function fixture(){
 let now=0;const commands:any[]=[];
 const initial={mapId:'lobby',position:{x:100,y:100},path:[],speed:100,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:00:03Z'};
 const presentation=ui.createWorldPresentation({walk:true});presentation.update(initial,0);
 const gameSession:any={controlled:true,available:true,busy:false,pending:false,data:{character:{id:'fixture'},online:{world:initial}},command(action:string,payload:any){this.busy=true;return new Promise((resolve,reject)=>commands.push({action,payload,resolve,reject}));}};
 const c=vm.createContext({performance:{now:()=>now},MareOnlineGameUI:ui,ONLINE_GAME:gameSession,onlineWorldFrame:{snapshot:initial,received:0,presentation,special:false},onlineMoveKeys:'',onlineNextMove:0,onlineMoveWorking:null,queuedOnlineWalk:null,onlineMoveSendAt:0,keys:new Set(),game:{hp:100},session:{respawn:0},world:{hero:{x:100,y:100}},currentPanel:null,lobbyAction:null,lobbyDestination:null,actionLocked:()=>false,getDerived:()=>({moveSpeed:100}),navigator:()=>({clear:()=>true,move:(p:any,x:number,y:number)=>{p.x+=x;p.y+=y;}}),onlineUI:{error:()=>{}},closePanel:()=>{},activateNPC:()=>{}});
 vm.runInContext(section('  function previewOnlineWalk(', '  function navigateEntity(')+section('  async function onlineWorldCommand(', '  function syncOnlineWorld(')+section('  function tickOnlineWorld(', '  function applyOnlineEquipment('),c);
 return {c,commands,initial,step(t:number,keys:string[]){now=t;c.keys=new Set(keys);c.tickOnlineWorld();return {...c.world.hero};},async ack(index:number,accepted=true,at?:number){if(at!==undefined)now=at;const cmd=commands[index];gameSession.busy=false;if(accepted)cmd.resolve();else cmd.reject(Error('rejected'));await Promise.resolve();await Promise.resolve();}};
}
test('WASD starts and reverses before the first command acknowledgement',()=>{
 const f=fixture();f.step(0,['d']);assert.equal(f.commands.length,1);
 const east=f.step(20,['d']);assert.ok(east.x>100,'keyboard must predict its first step');
 const turning=f.step(40,['a']);const west=f.step(60,['a']);assert.ok(west.x<turning.x,'the newer key must win while the previous move is in flight');
 assert.equal(f.commands.length,1,'one network command at a time');assert.equal(f.c.queuedOnlineWalk.point.x<100,true);
 assert.deepEqual(f.initial.position,{x:100,y:100});
});
test('low latency key spam keeps only the newest intent and bounds sends without delaying the local turn',async()=>{
 const f=fixture();let acked=0;
 for(let t=0;t<=1000;t+=10){const key=(t/10)%2?'a':'d',hero=f.step(t,[key]);assert.equal(hero.direction,key==='a'?'left':'right');while(acked<f.commands.length)await f.ack(acked++);}
 assert.ok(f.commands.length<=9,'at most eight movement sends per second plus the initial send');
 assert.ok(f.commands.length>=7,'the client must continue sending, not just hide commands');
 f.step(1010,[]);f.step(1140,[]);while(acked<f.commands.length)await f.ack(acked++);
 assert.equal(f.commands.at(-1).action,'world.stop','keyup is retained as the newest intent');
});
test('losing control during the pacing gap discards unsent movement before reacquisition',async()=>{
 const f=fixture();f.step(0,['d']);await f.ack(0,true,10);f.step(20,['a']);assert.ok(f.c.queuedOnlineWalk);
 f.c.ONLINE_GAME.controlled=false;f.step(150,[]);assert.equal(f.c.queuedOnlineWalk,null,'a later controller must not inherit an old unsent direction');
});
test('a newer combat action replaces an unsent movement during the pacing gap',async()=>{
 const f=fixture();f.step(0,['d']);await f.ack(0,true,10);f.step(20,['a']);
 void f.c.onlineWorldCommand('battle.target',{targetId:'fixture-target'});assert.equal(f.commands[1].action,'battle.target');assert.equal(f.c.queuedOnlineWalk,null);
 await f.ack(1,true,150);assert.equal(f.commands.length,2,'old movement must not restart after selecting an enemy');
});
test('rapid orthogonal keys reach the rendered hero in the same input tick',()=>{
 const f=fixture();
 for(const [t,key,direction] of [[0,'d','right'],[100,'w','back'],[200,'a','left'],[300,'s','front'],[400,'d','right'],[500,'w','back']] as const){
  const hero=f.step(t,[key]);assert.equal(hero.direction,direction,'render must not retain the previous key for a frame');
 }
 assert.equal(f.commands.length,1,'same-frame presentation does not add parallel network commands');
});
test('releasing keys stops presentation and coalesces the queued stop',async()=>{
 const f=fixture();f.step(0,['d']);f.step(40,['d']);f.step(60,[]);const a=f.step(80,[]),b=f.step(100,[]);
 assert.equal(a.x,b.x,'keyup must not wait for HTTP');assert.equal(f.c.queuedOnlineWalk.stop,true);
 await f.ack(0,true,150);assert.equal(f.commands.length,2);assert.equal(f.commands[1].action,'world.stop');
});
test('only the latest keyboard intent is dispatched after the current command',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,['a']);f.step(40,[]);f.step(60,['w']);
 await f.ack(0,true,150);assert.equal(f.commands.length,2);assert.equal(f.commands[1].action,'world.move');assert.ok(f.commands[1].payload.y<100);
});
test('diagonal prediction keeps the normal movement speed',()=>{
 const f=fixture();f.step(0,['w','d']);const p=f.step(20,['w','d']);assert.ok(Math.abs(Math.hypot(p.x-100,p.y-100)-2)<1e-6);
});
test('a held diagonal stops at its first obstacle instead of sliding a distant target around it',()=>{
 const f=fixture();f.c.navigator=()=>({clear:(_from:any,to:any)=>to.x>=90,move:(p:any,dx:number,dy:number)=>{p.x=Math.max(90,p.x+dx);p.y+=dy;}});
 f.step(0,['w','a']);const goal=f.commands[0].payload;
 assert.ok(goal.x>=90&&goal.y>=90,'a future keyboard target must remain inside the clear diagonal corridor');
 assert.ok(Math.abs(goal.x-goal.y)<1e-6,'the target must retain the requested axis, without an automatic detour');
});
test('captured mixed-key corners in Porto and Dawn require only a direct preview route',()=>{
 const catalog=require('../../world-catalog.cjs').load();
 for(const [map,x,y,letters] of [['lobby',1268.6916384088431,1593.3213806690933,['a','s']],['dawn',1244.9436931410185,1578.2368970974524,['s','d']]] as const){
  const f=fixture(),nav=catalog.originalNavigation(map);f.initial.mapId=map;f.initial.position={x,y};f.initial.speed=164;
  f.c.onlineWorldFrame.presentation=ui.createWorldPresentation({walk:true,route:(from:any,to:any)=>{assert.ok(nav.clear(from,to),'keyboard preview must not invoke a detour search at the captured corner');return nav.path(from,to);}});
  f.c.onlineWorldFrame.presentation.update(f.initial,0);f.c.navigator=()=>nav;f.c.getDerived=()=>({moveSpeed:164});
  f.step(0,[...letters]);assert.equal(f.commands.length,1);assert.ok(nav.clear({x,y},f.commands[0].payload));
 }
});


test('opening a panel while a move is pending retains a stop instead of a stale turn',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,['a']);f.c.currentPanel='inventory';f.step(40,['a']);
 assert.equal(f.c.queuedOnlineWalk.stop,true);await f.ack(0,true,150);assert.equal(f.commands[1].action,'world.stop');
});
test('rejection and map changes discard queued keyboard intentions',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,['a']);await f.ack(0,false);assert.equal(f.commands.length,1);assert.equal(f.c.queuedOnlineWalk,null);
 for(let t=40;t<=300;t+=20)f.step(t,[]);
 assert.deepEqual(f.initial.position,{x:100,y:100});
 const g=fixture();g.step(0,['d']);g.step(20,['a']);g.c.ONLINE_GAME.data.online.world={...g.initial,mapId:'dawn'};await g.ack(0);assert.equal(g.commands.length,1);assert.equal(g.c.queuedOnlineWalk,null);
});
test('unavailable or uncontrolled clients do not send or predict keyboard movement',()=>{
 for(const flag of ['available','controlled']){const f=fixture();f.c.ONLINE_GAME[flag]=false;f.step(0,['d']);assert.equal(f.commands.length,0);assert.equal(f.step(20,['d']).x,100);}
});

test('WASD and arrow keys use equivalent normalized directions',()=>{
 for(const [key,dx,dy] of [['w',0,-1],['arrowup',0,-1],['s',0,1],['arrowdown',0,1],['a',-1,0],['arrowleft',-1,0],['d',1,0],['arrowright',1,0]] as const){
  const f=fixture();f.step(0,[key]);const p=f.step(20,[key]);assert.ok(Math.abs(p.x-(100+dx*2))<1e-6);assert.ok(Math.abs(p.y-(100+dy*2))<1e-6);
 }
});
test('special genie movement retains the authoritative fruit command path',()=>{
 const f=fixture();f.c.session.genie={x:100,y:100};f.step(0,['d']);assert.equal(f.commands[0].action,'fruit.move');assert.equal(f.step(20,['a']).x,100);assert.equal(f.c.queuedOnlineWalk,null);
});

test('keyboard never creates or restores a mouse destination marker',async()=>{
 const f=fixture();f.step(0,['d']);assert.equal(f.c.lobbyDestination,null,'keydown must not publish a click marker');
 f.step(20,['a']);await f.ack(0,true,150);assert.equal(f.c.lobbyDestination,null,'queued keyboard acknowledgement must remain a keyboard input');
});
test('keyboard immediately replaces pending mouse navigation and NPC intent',async()=>{
 const f=fixture();f.c.walkTo({x:500,y:100},{kind:'npc',x:500,y:100});assert.equal(f.c.lobbyDestination.x,500);
 f.step(0,['w']);assert.equal(f.c.lobbyDestination,null);assert.equal(f.c.lobbyAction,null);
 await f.ack(0,true,150);assert.equal(f.c.lobbyDestination,null);assert.equal(f.c.lobbyAction,null);assert.ok(f.commands[1].payload.y<100);
});
test('mouse click after key release keeps its own marker and replaces the queued stop',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,[]);f.c.walkTo({x:350,y:100});await f.ack(0,true,150);
 assert.equal(f.commands[1].action,'world.move');assert.equal(f.c.lobbyDestination.x,350);
});

for(const [key,direction] of [['d','right'],['a','left'],['w','back'],['s','front']] as const){
 test('release keeps facing and freezes atomically while walking '+key,()=>{
  const f=fixture();f.step(0,[key]);f.step(100,[key]);f.step(200,[key]);
  let time=200;f.c.performance.now=()=>time+=3;
  f.c.stopOnlineWalk();
  const stopped=f.c.onlineWorldFrame.presentation.sample(240);
  assert.equal(stopped.direction,direction,'a stop must not become a backward micro-walk');
  assert.equal(stopped.moving,false,'releasing has no route back to an earlier sampled position');
  assert.deepEqual(f.c.onlineWorldFrame.presentation.sample(260),stopped);
 });
}
