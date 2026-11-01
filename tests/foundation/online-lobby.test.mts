import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
test('visual lobby follows server identity, clears on logout and has no economic or save authority',async()=>{
 const listeners:any={},elements:any={},frames:any[]=[];const ctx=new Proxy({}, {get:()=>()=>{}});const playerDraws:any[]=[];
 const get=(id:string)=>elements[id]??=(id==='lobby-canvas'?{width:960,height:540,getContext:()=>ctx,addEventListener:(n:string,fn:any)=>listeners[n]=fn,focus(){},getBoundingClientRect:()=>({width:960,height:540})}:{textContent:''});
 let api:any;const box:any={document:{getElementById:get,hidden:false},location:{origin:'https://localhost:9443'},requestAnimationFrame:(f:any)=>frames.push(f),addEventListener(){},ResizeObserver:class{observe(){}},performance,console,
 MareWorldDepth:{},MareLobbyMapData:{},MareHeadgear:{},MareCharacterAppearance:{},MareWorld:{Navigation:class{move(hero:any,x:number,y:number){hero.x+=x;hero.y+=y;}}},MareLobby:{spawn:{x:100,y:100},map:{width:2000,height:2000},ground(){},foreground(){},image:{complete:true,naturalWidth:100}},
 MarePaperDoll96Lobby:{create:()=>({ready:Promise.resolve(),ensure:async()=>{},snapshot:()=>({visualState:'ready'}),draw:(_c:any,p:any)=>playerDraws.push(p),stepWalk(){}})},
 fetch(){assert.fail('renderer must not send game commands')},localStorage:{getItem(){assert.fail('demo save read')},setItem(){assert.fail('demo save write')}}};
 runInNewContext(readFileSync(new URL('../../apps/account-client/lobby.js',import.meta.url),'utf8'),box);api=box.MareOnlineLobby;
 api.update({character:{id:'a',name:'Server Name',classId:'sword'},state:{level:2,experience:'80',gold:'3'},controlled:true});await api.enter();
 assert.equal(get('lobby-name').textContent,'Server Name');assert.match(get('lobby-progress').textContent,/80/);frames.shift()(1000);assert.equal(playerDraws.at(-1).name,'Server Name');
 api.update(null);frames.shift()(1100);assert.equal(playerDraws.length,1,'unavailable identity is not rendered');
 api.update({character:{id:'a',name:'Server Name',classId:'sword'},state:{level:2,experience:'80',gold:'3'},controlled:false});frames.shift()(1200);assert.equal(playerDraws.length,2,'a refreshed snapshot resumes rendering');
 api.clear();assert.equal(get('lobby-name').textContent,'');
});

test('failed map decoding reports a load failure and never starts a blue placeholder loop',async()=>{
 let frames=0;const elements:any={};const get=(id:string)=>elements[id]??={textContent:'',getContext:()=>({clearRect(){}}),addEventListener(){},focus(){}};
 const box:any={document:{getElementById:get},location:{origin:'https://localhost:9443'},addEventListener(){},requestAnimationFrame(){frames++;},
 MareWorld:{Navigation:class{}},MareLobbyMapData:{},MareWorldDepth:{},MareHeadgear:{},MareCharacterAppearance:{},MareLobby:{image:{decode:async()=>{throw new Error('missing image');}}},MarePaperDoll96Lobby:{create:()=>({ready:Promise.resolve(),ensure:async()=>true})}};
 runInNewContext(readFileSync(new URL('../../apps/account-client/lobby.js',import.meta.url),'utf8'),box);
 box.MareOnlineLobby.update({character:{id:'a',name:'Fixture'},state:{level:1,experience:'0',gold:'0'}});await box.MareOnlineLobby.enter();
 assert.equal(frames,0,'missing map must not start a render loop');assert.match(get('lobby-status').textContent,/Não foi possível carregar o porto/);
});
