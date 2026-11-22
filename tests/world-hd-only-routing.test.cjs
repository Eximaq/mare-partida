'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(process.env.TRIAL||path.join(__dirname,'..','paper-doll-96-lobby.js'),'utf8');
const spies={old:0,selections:0,draws:0,released:0};
let enterSlow,resumeSlow;
const slowStarted=new Promise(resolve=>{enterSlow=resolve;});
const native={ready:Promise.resolve(),snapshot:()=>({}),selectVisual(p,o,allowOmission){
 spies.selections++;
 const keys=Object.keys(p.equipment),id=p.appearance96.skinColor;
 if(id==='incompatible'||!['walk','idle'].includes(o.action)||keys.length>2)return null;
 const slotRoutes=Object.fromEntries(keys.map(k=>[k,{item:p.equipment[k].def,quality:'hd',source:k+'-signed'}]));
 return {id:[o.action,id,...keys].join('/'),body:'female',direction:o.direction,action:o.action,
  pack:{directions:{[o.direction]:{clip:{frames:1}}}},slotRoutes,colorAppearance:p.appearance96};
},selectIndependentWorld(p,o,selectPose){
 const pose=selectPose({...p,equipment:{weapon:p.equipment.weapon}},o);
 if(!pose)return null;
 return {...pose,slotRoutes:{...pose.slotRoutes,boots:{item:9,quality:'hd',source:'sole-pass'},
  gloves:{item:26,quality:'missing',reason:'no-compatible-owned-registration'}},omitted:['gloves']};
},async prepareConfiguration([pose],{resolve}){
 const r=resolve(pose);
 assert.strictEqual(r.player.appearance96.skinColor,pose.player.appearance96.skinColor);
 if(r.player.appearance96.skinColor==='warm'){
  await new Promise(resolve=>{resumeSlow=resolve;enterSlow();});
 }
 return {coverage:[r.source],release(){if(r.player.appearance96.skinColor==='warm')spies.released++;},draw(_ctx,p,action){assert.equal(p.appearance96.skinColor,r.player.appearance96.skinColor);spies.draws++;return true;}};
}};
const old=()=>{spies.old++;throw Error('legacy renderer called for World');};
const root={MareHeadgear:{hidden:()=>false},MareReworkNativeHD:{create:()=>native},
 MareReworkDefaultHD:{create:()=>({draw:old,clear(){},snapshot:()=>({})})},MarePlayerReworkRuntime:{create:()=>({active:true,draw:old,snapshot:()=>({})})}};
const load=new Function('globalThis','URL','fetch','performance','AbortController','console',src+';return globalThis.MarePaperDoll96Lobby;');
const toolkit=load(root,class URL{},async()=>({ok:false}),performance,AbortController,{error(){}});
const api=toolkit.create({baseURL:'https://fixture.test/'});
const actor=(skinColor)=>({classId:'rogue',appearance96:{gender:'feminino',skinColor},equipment:{weapon:{def:73},boots:{def:9},gloves:{def:26}}});
(async()=>{
 await api.ready;
 const off=actor('incompatible'),e={consumer:'world',action:'walk',direction:'east',worldView:false};
 assert(!api.draw({},off,e));await api.requestWorldVisual(off,e).promise;
 assert.equal(api.worldVisual().state,'failed');assert.equal(api.worldVisual().reason,'no-hd-pose');assert(!api.draw({},off,e));assert.equal(spies.old,0);
 const p=actor('light'),saved=JSON.stringify(p), start=spies.selections;
 assert(!api.draw({},p,e));await api.requestWorldVisual(p,e).promise;
 const row=api.worldVisual().coverage[0];
 assert.equal(row.omitted.length,1);assert.equal(row.slotRoutes.weapon.quality,'hd');
 assert.equal(row.slotRoutes[row.omitted[0]].reason,'no-compatible-owned-registration');
 assert.equal(Object.values(row.slotRoutes).filter(x=>x.quality==='hd').length,2);
 assert(spies.selections-start===2,'selector is bounded and executes only on new poses');
 const before=spies.selections;
 for(let n=0;n<30;n++)assert(api.draw({},p,e));
 assert.equal(spies.selections,before);assert.equal(spies.old,0);assert.equal(JSON.stringify(p),saved);
 const other=actor('ebony');assert(!api.draw({},other,e));await api.requestWorldVisual(other,e).promise;
 assert(api.draw({},other,e));assert.equal(api.worldVisual().coverage[0].colorAppearance.skinColor,'ebony');
 // Complete the older decoding after the new identity has published.
 const warm=actor('warm'),slow=api.requestWorldVisual(warm,e);await slowStarted;
 const copper=actor('copper');await api.requestWorldVisual(copper,e).promise;
 const current=api.worldVisual().publishedKey;
 resumeSlow();await slow.promise;
 assert.equal(spies.released,1);
 assert.equal(api.worldVisual().publishedKey,current);
 assert(api.draw({},copper,e));
 assert.equal(api.worldVisual().coverage[0].colorAppearance.skinColor,'copper');
 console.log('PASS World no-source fail-closed, no per-frame probing, stale bundles released.');
})().catch(e=>{console.error(e);process.exitCode=1});
