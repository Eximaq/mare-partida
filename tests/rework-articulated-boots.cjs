'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const source=mod('tools/rework-combat-wardrobe/index.json').articulatedBoots;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const art=key=>load('tools/rework-combat-wardrobe/assets/'+key+'.png');
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const copy=c=>{const a=cv.createCanvas(c.width,c.height);a.getContext('2d').drawImage(c,0,0);return a;};
const roles={sword:[0,1,67,68,69,70],gunner:[4,5,113,115,116],strategist:[17,122,123,124],healer:[31,125,126,127,128]};
async function cycle(api,weapon,direction){
 const {id,role}=weapon,options={action:api.attackActionFor(id),direction,consumer:'world'};
 const equipment={weapon:{def:id},head:{def:19},...(role!=='gunner'?{coat:{def:151}}:{})};
 const actor=look.commit({classId:role,equipment},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 async function prepare(player){
  const r=world.selectWorldHDOnly(api,catalog,player,options);
  assert(r&&!r.omitted.length&&!r.visualDegraded&&!r.appearanceAdapted,JSON.stringify([id,direction,player.equipment,r?.slotResolution]));
  const bundle=await api.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source:r})});
  assert(!bundle.coverage[0].omitted.length);
  return {r,bundle,draw(i){let c;assert(bundle.draw({save(){},restore(){},drawImage(canvas){c=canvas;}},player,{...options,progress:(i+.2)/r.timeline.length}));return c;}};
 }
 const stock=await prepare(actor),base=stock.r,offset=base.renderOffsetPhysical||[0,0];
 const originals=base.timeline.map((_,i)=>copy(stock.draw(i)));
 let ticks=0;
 try{for(const item of gear[2]){
  const equipped={...actor,equipment:{...actor.equipment,boots:{def:item}}},p=await prepare(equipped);
  try{
   assert(p.r.bootTrack);assert.equal(p.r.slotRoutes.boots.item,item);assert(p.r.slotRoutes.boots.source.startsWith(source.sources[item].record+'@'));
   for(const slot of Object.keys(equipment))assert.deepEqual(p.r.slotRoutes[slot],base.slotRoutes[slot]);
   assert.deepEqual(p.r.states,base.states);assert.deepEqual(p.r.timeline,base.timeline);
   for(let t=0;t<base.timeline.length;t++){
    const c=p.draw(t),bare=originals[t],phase=Number(base.timeline[t]),f=p.r.bootTrack.phases[phase];
    const plate=cv.createCanvas(c.width,c.height),cx=plate.getContext('2d');
    cx.translate(...offset);if(direction==='west'){cx.translate(640,0);cx.scale(-1,1);}
    cx.drawImage(await art(f.art),f.x,f.y);const fabric=pixels(plate);
    cx.drawImage(await art(f.mask),f.x,f.y);const bound=pixels(plate),after=pixels(c),before=pixels(bare);
    let changed=0,own=0,cut=0;
    for(let i=0;i<after.length;i++){
     if(before[i]===after[i])continue;
     if(!bound[i])throw Error([id,direction,item,t,i,'outside source and anatomy mask'].join('/'));
     changed++;
     if((fabric[i]>>>24)>200&&after[i]===fabric[i])own++;
     if(!after[i]&&before[i])cut++;
    }
    assert(changed>500&&own>500,[id,direction,item,t,changed,own,cut].join('/'));
    ticks++;plate.width=1;
   }
  }finally{p.bundle.release();}
 }}finally{stock.bundle.release();for(const c of originals)c.width=1;}
 assert.equal(ticks,gear[2].length*base.timeline.length);return ticks;
}
(async()=>{
 const role=process.argv[2],ids=process.argv.slice(3).map(Number),group=roles[role];
 assert(group&&(!ids.length||ids.every(id=>group.includes(id))));
 const list=weapons.filter(w=>w.role===role&&(ids.length?ids:group).includes(w.id));
 assert.equal(list.length,ids.length||group.length);assert.equal(gear[2].length,10);
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 let total=0;const rows=[];for(const w of list)for(const direction of ['east','west']){
  const ticks=await cycle(api,w,direction);rows.push({weapon:w.id,direction,items:10,ticks});total+=ticks;
  console.log(w.id,direction,ticks);global.gc?.();
 }
 if(process.env.HD_BOOT_RESULTS)fs.writeFileSync(process.env.HD_BOOT_RESULTS,JSON.stringify({role,rows,total}));
})().catch(e=>{console.error(e);process.exitCode=1;});
