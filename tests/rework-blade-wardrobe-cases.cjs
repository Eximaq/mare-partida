'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),wardrobe=mod('tools/rework-combat-wardrobe/index.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const owners={sword:[0,1,67,68,69,70],daggers:[12,13,71,72,73,74]};
async function cycle(api,weapon,family,direction,draw,slot,items){
 const coats=slot==='coat',atlas=coats?(family==='sword'?wardrobe.maleSwordCoats:wardrobe.maleDaggerCoats):wardrobe.bladeTrousers;
 const {id,role}=weapon,options={action:api.attackActionFor(id),direction,consumer:'world'};
 const player=look.commit({classId:role,equipment:{}},{gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'blue',hairStyle:'original',eyeStyle:'original'},()=>true);
 const saved=JSON.stringify(player.appearance96);
 function select(eq){
  const actor={...player,equipment:Object.fromEntries(Object.entries(eq).map(([slot,item])=>[slot,{def:item}]))};
  const r=world.selectWorldHDOnly(api,catalog,actor,options);
  assert(r&&!r.visualDegraded&&!r.appearanceAdapted&&!r.omitted.length,JSON.stringify([id,direction,eq,r?.slotResolution]));
  assert.equal(r.resolvedAction??r.action,options.action);assert.equal(r.direction,direction);
  return {r,actor};
 }
 async function render({r,actor}){
  const bundle=await api.prepareConfiguration([{player:actor,options}],{resolve:()=>({player:actor,options,source:r})});
  assert(!bundle.coverage[0].omitted.length);
  return {draw(t){let c;assert(bundle.draw({save(){},restore(){},drawImage(x){c=x;}},actor,{...options,progress:(t+.2)/8}));return c;},close:()=>bundle.release()};
 }
 const fixed={weapon:id,...(coats?{legs:168}:{coat:151}),gloves:152,boots:148,head:19};
 const base=select(fixed),images=[];
 if(draw){
  const bridge=await render(base);
  try{for(let t=0;t<8;t++){const c=bridge.draw(t);images.push(pixels(c));}}finally{bridge.close();}
 }
 let frames=0;for(const item of items){
  const solo=select({weapon:id,[slot]:item}),equipped=select({...fixed,[slot]:item}),r=equipped.r;

  assert.equal(r.slotRoutes[slot].item,item);assert.deepEqual(solo.r.slotRoutes[slot],r.slotRoutes[slot]);
  const track=coats?atlas.coats[item]:atlas.items[family][item];
  if(coats){
   assert.equal(r.slotRoutes[slot].source,'male-'+(family==='sword'?'sword':'dagger')+'-coat-'+item+'-'+direction+'@'+atlas.profileSleeves[item].record);
   const mounted=family==='sword'?r.swordTrack:r.daggerCoatPlate;
   assert.deepEqual(mounted.cloth,track);
  }else{
   assert.equal(r.slotRoutes[slot].source,atlas.sources[family+'/'+item].record+'@'+family+'-'+direction);
   assert.deepEqual(r.bladePants.phases,track);
  }
  for(const slot of Object.keys(fixed))assert.deepEqual(base.r.slotRoutes[slot],r.slotRoutes[slot]);
  assert.deepEqual(select({[slot]:item,...fixed}).r.slotRoutes,r.slotRoutes);
  if(!draw)continue;
  const bridge=await render(equipped);
  try{for(let t=0;t<8;t++){
   const c=bridge.draw(t),after=pixels(c),before=images[t],p=coats?{art:track[t],x:family==='sword'?-64:0,y:family==='sword'?-64:0}:track[t];
   const tile=cv.createCanvas(c.width,c.height),cx=tile.getContext('2d');cx.translate(...(r.renderOffsetPhysical||[0,0]));
   if(direction==='west'){cx.translate(640,0);cx.scale(-1,1);}
   cx.drawImage(await load('tools/rework-combat-wardrobe/assets/'+p.art+'.png'),p.x,p.y);
   const fabric=pixels(tile);let changed=0,own=0;
   for(let i=0;i<after.length;i++)if(after[i]!==before[i]){
    if(!fabric[i])throw Error([id,direction,item,t,i,'outside owned fabric'].join('/'));
    changed++;if((fabric[i]>>>24)===255&&fabric[i]===after[i])own++;
   }
   assert(own>180&&changed>250,JSON.stringify([id,direction,item,t,own,changed]));tile.width=1;frames++;
  }}finally{bridge.close();}
 }
 assert.equal(saved,JSON.stringify(player.appearance96));
 return {contexts:1,individual:items.length,mixed:items.length,frames};
}
module.exports=async function check(slot){
 const items=slot==='coat'?gear[0].filter(i=>wardrobe.maleSwordCoats.profileSleeves[i]):gear[1];
 assert.equal(items.length,slot==='coat'?6:10);
 const ids=process.argv.slice(2).map(Number),full=Object.values(owners).flat(),chosen=ids.length?ids:full;
 assert.equal(gear[1].length,10);assert(chosen.length&&new Set(chosen).size===chosen.length&&chosen.every(id=>full.includes(id)));
 const totals={contexts:0,individual:0,mixed:0,frames:0};
 const api=make();await api.ready;
 for(const id of chosen){const family=owners.sword.includes(id)?'sword':'daggers';
  for(const direction of ['east','west']){
   const row=await cycle(api,weapons.find(w=>w.id===id),family,direction,ids.length||[1,69,73].includes(id),slot,items);
   for(const key of Object.keys(totals))totals[key]+=row[key];
  }
 }
 assert.equal(totals.contexts,2*chosen.length);assert.equal(totals.individual,2*items.length*chosen.length);assert.equal(totals.mixed,totals.individual);assert.equal(totals.frames,16*items.length*(ids.length||3));
 console.log(JSON.stringify(totals));
};
