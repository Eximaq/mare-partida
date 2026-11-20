'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const src=read('paper-doll-96-lobby.js');
(function checkVisualRuntime(lobbySource,gameSource,indexSource){
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const frame=gameSource.split('\n').find(line=>line.includes('function frame(t)'));
  assert(frame&&!frame.includes('visualState'), 'The simulation frame waits for the whole character.');
  assert(!gameSource.includes('!lobby96.worldReady(game)'), 'Input and combat depend on art.');
  assert(!indexSource.includes('playerVisualStatus')&&!indexSource.includes('retryPlayerVisual'), 'The character still owns map/HUD loading indicators.');
  assert(!lobbySource.includes('for(const action of actions)if(!useSkin'), 'An appearance requests every action at once.');
})(src,read('game.js'),read('index.html'));
(async()=>{
const schedule=[],paint=[],errors=[];
const native={ready:Promise.resolve(),selectVisual:()=>({}),snapshot:()=>({}),height:()=>96,
 prepareConfiguration([pose],{signal}){return new Promise((resolve,reject)=>{
   schedule.push({pose,signal,resolve:()=>resolve({coverage:[pose.options],release(){},draw(){paint.push([pose.player.equipment.weapon.def,pose.options.action,pose.options.direction]);return true;}}),reject});
 });}};
const clock={now:()=>time};let time=0;
const root={MareHeadgear:{hidden:()=>false},MareReworkNativeHD:{create:()=>native}};
const load=new Function('globalThis','URL','fetch','performance','AbortController','console',src+';return globalThis.MarePaperDoll96Lobby;');
const api=load(root,class URL{},async()=>({ok:false}),clock,AbortController,{error(...x){errors.push(x);}}).create({baseURL:'https://fixture.test/'});
const check=(condition,msg)=>{if(!condition)throw Error(msg);};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const actor=id=>({classId:'sword',equipment:{weapon:{def:id}}});
const draw=(id,action='idle',direction='south')=>api.draw({},actor(id),{action,direction,worldView:true});
await api.ready;
check(!draw(0),'cold pose transparent');await drain();
check(schedule.length===1&&schedule[0].pose.options.action==='idle','only current pose gets requested');
check(!draw(1)&&!draw(2),'new item stays transparent');await drain();
check(schedule.length===2&&schedule[0].signal.aborted&&schedule[1].pose.player.equipment.weapon.def===2,'intermediate equipment superseded');
schedule[1].resolve();await drain();check(draw(2),'third item draws immediately when ready');
schedule[0].resolve();await drain();check(draw(2)&&paint.every(([id])=>id===2),'late decode cannot publish prior item');
check(!draw(2,'attack','east'),'pending attack does not borrow idle');await drain();
schedule[2].reject(Error('fixture decode error'));await drain();
check(api.worldVisual().state==='failed'&&!draw(2,'attack','east'),'failure remains transparent');
check(draw(2),'failed attack does not block cached idle');
time=1500;check(!draw(2,'attack','east'),'retry stays transparent');await drain();
schedule[3].resolve();await drain();check(draw(2,'attack','east'),'current attack recovered');
check(paint.at(-1).join(',')==='2,attack,east','draw uses current action/direction');
api.clearWorldVisual();return {poseRequests:schedule.length,staleAssetsPrevented:true,recovery:true};
})().then(console.log).catch(error=>{console.error(error);process.exitCode=1;});
