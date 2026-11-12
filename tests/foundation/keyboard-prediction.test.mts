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
 const c=vm.createContext({performance:{now:()=>now},MareOnlineGameUI:ui,ONLINE_GAME:gameSession,onlineWorldFrame:{snapshot:initial,received:0,presentation,special:false},onlineMoveKeys:'',onlineNextMove:0,onlineMoveWorking:null,queuedOnlineWalk:null,keys:new Set(),game:{hp:100},session:{respawn:0},world:{hero:{x:100,y:100}},currentPanel:null,lobbyAction:null,lobbyDestination:null,actionLocked:()=>false,getDerived:()=>({moveSpeed:100}),navigator:()=>({move:(p:any,x:number,y:number)=>{p.x+=x;p.y+=y;}}),onlineUI:{error:()=>{}},closePanel:()=>{},activateNPC:()=>{}});
 vm.runInContext(section('  function previewOnlineWalk(', '  function navigateEntity(')+section('  async function onlineWorldCommand(', '  function syncOnlineWorld(')+section('  function tickOnlineWorld(', '  function applyOnlineEquipment('),c);
 return {c,commands,initial,step(t:number,keys:string[]){now=t;c.keys=new Set(keys);c.tickOnlineWorld();return {...c.world.hero};},async ack(index:number,accepted=true){const cmd=commands[index];gameSession.busy=false;if(accepted)cmd.resolve();else cmd.reject(Error('rejected'));await Promise.resolve();await Promise.resolve();}};
}
test('WASD starts and reverses before the first command acknowledgement',()=>{
 const f=fixture();f.step(0,['d']);assert.equal(f.commands.length,1);
 const east=f.step(20,['d']);assert.ok(east.x>100,'keyboard must predict its first step');
 const turning=f.step(40,['a']);const west=f.step(60,['a']);assert.ok(west.x<turning.x,'the newer key must win while the previous move is in flight');
 assert.equal(f.commands.length,1,'one network command at a time');assert.equal(f.c.queuedOnlineWalk.point.x<100,true);
 assert.deepEqual(f.initial.position,{x:100,y:100});
});
test('releasing keys stops presentation and coalesces the queued stop',async()=>{
 const f=fixture();f.step(0,['d']);f.step(40,['d']);f.step(60,[]);const a=f.step(80,[]),b=f.step(100,[]);
 assert.equal(a.x,b.x,'keyup must not wait for HTTP');assert.equal(f.c.queuedOnlineWalk.stop,true);
 await f.ack(0);assert.equal(f.commands.length,2);assert.equal(f.commands[1].action,'world.stop');
});
test('only the latest keyboard intent is dispatched after the current command',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,['a']);f.step(40,[]);f.step(60,['w']);
 await f.ack(0);assert.equal(f.commands.length,2);assert.equal(f.commands[1].action,'world.move');assert.ok(f.commands[1].payload.y<100);
});
test('diagonal prediction keeps the normal movement speed',()=>{
 const f=fixture();f.step(0,['w','d']);const p=f.step(20,['w','d']);assert.ok(Math.abs(Math.hypot(p.x-100,p.y-100)-2)<1e-6);
});


test('opening a panel while a move is pending retains a stop instead of a stale turn',async()=>{
 const f=fixture();f.step(0,['d']);f.step(20,['a']);f.c.currentPanel='inventory';f.step(40,['a']);
 assert.equal(f.c.queuedOnlineWalk.stop,true);await f.ack(0);assert.equal(f.commands[1].action,'world.stop');
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
