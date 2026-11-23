'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const weapon=Number(process.argv[2]),tone=process.argv[3]||'light';
const daggers=[12,13,71,72,73,74].includes(weapon);
assert((daggers||[17,122].includes(weapon))&&['light','ebony'].includes(tone));
const clock=daggers?8:20,action=daggers?'attack-daggers':'attack-focus',role=daggers?'rogue':'strategist';
const atlas=mod('tools/rework-combat-wardrobe/index.json')[daggers?'daggerGloves':'orbGloves'];
const tile=()=>cv.createCanvas(640,640);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(url,mirror,base){
 const c=tile(),x=c.getContext('2d');
 if(base){const im=x.createImageData(640,640);new Uint32Array(im.data.buffer).set(base);x.putImageData(im,0,0);}
 if(mirror){x.translate(640,0);x.scale(-1,1);}
 x.drawImage(await load(url),0,0);const out=pixels(c);c.width=1;return out;
}
async function main(){
 const api=make();await api.ready;
 const player=look.commit({classId:role,equipment:{}},{gender:'masculino',skinColor:tone,hairColor:tone==='light'?'brown':'blue',
  eyeColor:tone==='light'?'brown':'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const raw={...player.appearance96,gender:'male'};delete raw.skinStyle;delete raw.version;
 const saved=JSON.stringify([raw,player.appearance96]),rows=[];
 for(const direction of ['east','west']){
  const options={action,direction,consumer:'world'};
  async function pose(eq){
   const equipment=Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]));
   const p={...player,equipment},r=world.selectWorldHDOnly(api,catalog,p,options);
   assert(r&&!r.visualDegraded&&!r.appearanceAdapted);assert.deepEqual(r.omitted||[],[]);
   const legacy=world.selectWorldHDOnly(api,catalog,{...p,appearance96:raw},options);
   assert(legacy);assert.deepEqual(legacy.omitted||[],[]);assert.deepEqual(legacy.timeline,r.timeline);
   for(const [slot,route] of Object.entries(r.slotRoutes)){
    assert.equal(legacy.slotRoutes[slot].item,route.item);
    if(slot==='weapon')assert.equal(legacy.slotRoutes[slot].source.split(':')[0],route.source.split(':')[0]);
    else assert.deepEqual(legacy.slotRoutes[slot],route);
   }
   for(const [slot,id] of Object.entries(eq))assert.equal(r.slotRoutes[slot].item,id);
   const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   function draw(f){
    let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(f+.1)/clock}));
    assert.equal(api.snapshot().last.frame,Math.min(f,7));assert.equal(c.width,640);return pixels(c);
   }
   return {r,draw,release:()=>bundle.release()};
  }
  const fixed={weapon,head:19,coat:151,boots:169},bare=await pose({weapon}),dressed=await pose(fixed),base=[];
  assert.deepEqual(bare.r.timeline.map(Number),Array.from({length:clock},(_,i)=>Math.min(i,7)));
  for(let f=0;f<8;f++){
   const s=bare.r.states[f],src='tools/rework-weapon-layers-hd/';
   const [metal,restore]=await Promise.all([s.layers[daggers?2:1].url,s.layers[daggers?3:2].mask.url].map(url=>plane(src+url,false)));
   base.push({bare:bare.draw(f),kit:dressed.draw(f),metal,restore});
  }
  assert.deepEqual(bare.draw(clock-1),base[7].bare);
  for(const gloves of gear[3]){
   const solo=await pose({weapon,gloves}),kit=await pose({...fixed,gloves});
   assert.deepEqual(solo.r.slotRoutes.gloves,kit.r.slotRoutes.gloves);
   for(const slot of Object.keys(fixed))assert.deepEqual(dressed.r.slotRoutes[slot],kit.r.slotRoutes[slot]);
   for(let f=0;f<8;f++){
    const s=base[f],result=solo.draw(f),mixed=kit.draw(f);
    const image=(side,body)=>plane('tools/rework-combat-wardrobe/assets/'+atlas.items[gloves][side][f].art+'.png',direction==='west',body);
    const [left,right,onLeft,onRight]=await Promise.all([image('left'),image('right'),image('left',s.bare),image('right',s.bare)]);
    let palm=0,near=0,contacts=0,under=0,blade=0,changed=0,withCoat=0;
    for(let i=0;i<result.length;i++){
     if(!left[i]&&!right[i]){
      assert.equal(result[i],s.bare[i]);assert.equal(mixed[i],s.kit[i]);
      if(s.metal[i]>>>24===255&&!(s.restore[i]&255))blade++;
      continue;
     }
     assert(!(left[i]&&right[i]));
     if((s.restore[i]&255)||!s.metal[i]){
      assert.equal(result[i],left[i]?onLeft[i]:onRight[i]);if(left[i])palm++;else near++;
      if(s.restore[i]&255)contacts++;
     }else if(s.metal[i]>>>24===255){assert.equal(result[i],s.bare[i]);under++;}
     if(result[i]!==s.bare[i])changed++;if(mixed[i]!==s.kit[i])withCoat++;
    }
    assert(palm>(daggers?2:100)&&near>200&&changed>280&&withCoat>240,JSON.stringify({weapon,tone,direction,gloves,f,palm,near,changed,withCoat}));
    assert(blade>0,'Signed foreground weapon remains visible outside both hands');
    rows.push({direction,gloves,f,palm,near,contacts,under,changed,withCoat});
   }
   solo.release();kit.release();
  }
  bare.release();dressed.release();
 }
 assert.equal(rows.length,160);assert(rows.some(r=>r.contacts>0));// On dagger 13 the authored restoration puts both gloves in front of every opaque contact.
 assert.equal(rows.some(r=>r.under>0),weapon!==13);
 assert.equal(JSON.stringify([raw,player.appearance96]),saved);
 const output=process.env.HD_ORDERED_GLOVE_RESULTS||process.env.HD_ORB_GLOVE_RESULTS;
 if(output)fs.writeFileSync(output,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,action,'individual frames and 160 frames with coat, boots and helmet');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
