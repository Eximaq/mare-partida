'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
test('saved named-head C6 adds only its own independent P22 pixels on matched native poses',async()=>{
 const api=make();await api.ready;
 const render=async(p,o)=>{
  const s=api.selectVisual(p,o);assert(s);assert(await api.prepare(p,o),JSON.stringify(api.snapshot().last));
  const c=cv.createCanvas(512,512),x=c.getContext('2d');assert(api.draw(x,p,o),JSON.stringify(api.snapshot().last));return {s,pixels:x.getImageData(0,0,512,512).data,last:api.snapshot().last};
 };
 let proved=0;
 for(const [hairStyle,hairColor,skinColor,key] of [['hair-spiky','black','light','legs'],['hair-cropped','pink','dark','pants']]){
  let p;assert(MareCharacterAppearance.commit({classId:'brawler',equipment:{weapon:null,coat:{def:6},[key]:{def:22,potential:null}}},{...MareCharacterAppearance.defaults,hairStyle,hairColor,skinColor},saved=>{p=JSON.parse(JSON.stringify(saved));return true;}));
  const before=JSON.stringify(p),{[key]:unused,...coatEquipment}=p.equipment,coat={...p,equipment:coatEquipment};
  for(const direction of ['south','east','west'])for(const action of direction==='south'?['idle','walk','attack-unarmed']:['idle','walk']){
   const opts={consumer:'world',direction,action,x:256,y:405,time:0,weaponless:false};
   const combined=api.selectVisual(p,opts),original=api.selectVisual(coat,opts);
   const d=combined?.pack.directions[direction],base=original?.pack.directions[direction];
   assert(d&&base,`${direction}/${action}`);
   assert.deepEqual(d.layers.slice(0,-1),base.layers);assert.deepEqual(d.clip,base.clip);assert.deepEqual(d.poses,base.poses);
   assert.deepEqual(combined.colorAppearance,original.colorAppearance);assert.equal(combined.headRecord.id,original.headRecord.id);
   assert.deepEqual(combined.omitted,[]);assert.equal(combined.slotRoutes.coat.quality,'hd');assert.equal(combined.slotRoutes[key].quality,'hd');
   const layer=d.layers.at(-1),pack={...combined.pack,directions:{[direction]:{...d,layers:[layer]}}};
   for(let frame=0;frame<d.clip.frames;frame++){
    const o={...opts,progress:(frame+.125)/d.clip.frames},old=await render(coat,o),next=await render(p,o);
    assert.equal(old.last.frame,frame);assert.equal(next.last.frame,frame);
    const source=layer.frames?.[frame]||layer.source,img=await load('tools/rework-modular-outfits-hd/assets/'+source+'.png');
    const tile=cv.createCanvas(512,512),mask=cv.createCanvas(512,512),m=mask.getContext('2d'),scale=105/374;
    ReworkAccessoryVendor.compositor.render(tile.getContext('2d'),pack,new Map([[source,img]]),{direction,frame,density:4});
    m.imageSmoothingEnabled=false;m.drawImage(tile,o.x-pack.pivot.x*4*scale,o.y-pack.pivot.y*4*scale,512*scale,512*scale);
    const alpha=m.getImageData(0,0,512,512).data;
    let added=0,outside=0;
    for(let j=0;j<alpha.length;j+=4){
     const a=old.pixels,b=next.pixels;
     if(a[j]===b[j]&&a[j+1]===b[j+1]&&a[j+2]===b[j+2]&&a[j+3]===b[j+3])continue;
     if(alpha[j+3])added++;else outside++;
    }
    assert(outside===0&&added>100,`${direction}/${action}/${frame}: ${added} inside and ${outside} outside`);
    if(frame===0||frame===d.clip.frames-1)assert.deepEqual((await render(coat,o)).pixels,old.pixels);
    proved++;
   }
  }
  const turn={consumer:'world',action:'idle',direction:'south',progress:0,time:0,weaponless:false};
  assert(await api.prepare(p,turn));
  const inv=cv.createCanvas(420,480),status=api.drawFittedAvatar(inv.getContext('2d'),p,{zoom:3});
  assert(status);assert.equal(status.source,api.selectVisual(p,turn).id);assert.equal(status.multiplier,3);
  assert.deepEqual(status.omitted,[]);assert.equal(JSON.stringify(p),before);
  for(const o of [{...turn,direction:'north'},{...turn,direction:'north',action:'walk'}])
   assert(!api.selectVisual(p,o)?.id.includes(':own-p22'));
  assert(!api.selectVisual({...p,equipment:{...p.equipment,[key]:{def:22,variant:'unsupported'}}},turn)?.id.includes(':own-p22'));
 }
 assert.equal(proved,118);
});
