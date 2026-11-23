'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), zlib=require('node:zlib');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)), project=path.join(__dirname,'..');
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require(path.join(project,'tests/rework-integration-support.cjs'));
const {gear,weapons}=require(path.join(project,'tools/audit-hd-wardrobe-product.cjs')),load=require(path.join(project,'tools/rework-hd-test-loader.cjs')).create(root);
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
function json(file){const p=path.join(root,file);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):zlib.gunzipSync(fs.readFileSync(p+'.gz')));}
const weaponIndex=json('tools/rework-weapon-layers-hd/index.json');
const weaponArt=mod('player-rework-weapon-native-hd.js').create(weaponIndex,{makeCanvas:cv.createCanvas});
const read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
// Compare the ordered dagger head with the independent modular source. Its
// neck and nose were translated in the signed 640px export, in both directions.
async function daggerReference(record,direction){
 const source=json('tools/rework-base-hd/index.json').records.find(r=>r.id==='v7-daggers-'+direction+'-modular8-'+direction);
 const p=source.pack,d=p.directions[direction],images=new Map();
 for(const key of source.sourceRefs)images.set(key,await load('tools/rework-base-hd/assets/'+key+'.png'));
 const poses=d.poses.map(pose=>{
  const shift=k=>({...pose[k],x:pose[k].x+(direction==='east'?-8:8)/4,y:pose[k].y+4/4});
  return {...pose,NECK:shift('NECK'),NOSE:shift('NOSE')};
 });
 const part=layers=>({...p,directions:{[direction]:{...d,layers,poses}}});
 const vendor=mod('tools/rework-accessories/vendor.js');
 const api=mod('player-rework-base-hd.js').create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});
 const frames=[];
 for(let frame=0;frame<8;frame++){
  function drawPart(layers){const c=cv.createCanvas(640,640);vendor.compositor.render(c.getContext('2d'),part(layers),images,{direction,frame,density:4});const px=read(c);c.width=1;return px;}
  async function raw(layer){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-weapon-layers-hd/assets/'+layer+'.png'),0,0);const px=read(c);c.width=1;return px;}
  const mask=drawPart(d.layers.filter(l=>l.slot==='hair')),full=drawPart(d.layers);
  const [far,body,near]=record.states[frame].layers,original=await raw(body.registeredBodySHA||body.sha256);
  const farPixels=await raw(far.sha256),nearPixels=await raw(near.sha256);
  const skull=cv.createCanvas(640,640);
  api.render(skull.getContext('2d'),{id:source.id,body:'male',pack:part(d.layers.filter(l=>l.slot!=='hair')),direction,sourceRefs:source.sourceRefs},images,
   {frame,makeCanvas:cv.createCanvas,appearance:{skin:'ebony',face:'original'}});
  const reveal=read(skull);skull.width=1;
  let count=0;
  for(let k=3;k<mask.length;k+=4)if(mask[k]){
   assert.equal(farPixels[k]+nearPixels[k],0,'foreign blade in original hair');
   assert.equal(original.readUInt32LE(k-3),full.readUInt32LE(k-3),'unregistered original hair');count++;
  }
  assert.equal(count,4994);
  frames.push({mask,reveal,uncover(canvas){
   const ctx=canvas.getContext('2d'),im=ctx.getImageData(0,0,640,640),px=im.data;
   for(let k=0;k<mask.length;k+=4)if(mask[k+3])px.set(reveal.subarray(k,k+4),k);
   ctx.putImageData(im,0,0);
  }});
 }
 return {poses,frames};
}
const group=process.argv[2],expected={sword:180,rogue:180,gunner:130,healer:140,strategist:120};
assert(Object.hasOwn(expected,group),'Specify a weapon family with articulated headgear');
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();const rows=[];
 for(const {id:weapon,role} of weapons.filter(w=>w.role===group))for(const direction of ['north','south','east','west']){
  const actor=look.commit({classId:role,equipment:{weapon:{def:weapon}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
  const o={consumer:'world',direction,action:api.attackActionFor(weapon)},bare=world.selectWorldHDOnly(api,catalog,actor,o);
  // The archive records the orientation of the modular skull independently of the selector.
  const mirrored=weaponIndex.records.some(source=>source.item===weapon&&source.body===bare?.body&&
   source.direction===direction&&source.approvedModularBody?.placement==='behind-body'&&source.approvedModularBody.mirror===true);
  let images,dagger;const backs=new Map();let count=0,frames=0;
  for(const item of gear[4]){
   const player={...actor,equipment:{...actor.equipment,head:{def:item}}},r=world.selectWorldHDOnly(api,catalog,player,o),part=r?.ownGauntletHead;
   if(!part||part.paddingPhysical===undefined)continue;
   assert.equal(r.slotRoutes.head.item,item);assert.equal(r.slotRoutes.weapon.item,weapon);assert.deepEqual(r.omitted,[]);
   assert.deepEqual(r.timeline,bare.timeline);assert.deepEqual(r.states,bare.states);
   const hidden=mod('headgear-visibility.js').resolve({def:item}).hideHair;
   if(r.daggerHeadRig&&!dagger)dagger=await daggerReference(bare,direction);
   if(!images){
    images=new Map();const urls=new Set(weaponArt.requiredFiles(bare));
    for(const url of Object.values((bare.orbAnatomy||bare.fusedFocusAnatomy)?.images||{}))urls.add('tools/rework-weapon-layers-hd/'+url);
    for(const url of urls)images.set(url,await load(url));
   }
   if(!backs.has(hidden)){
    const layers=[];
    for(let i=0;i<r.states.length;i++){
     const c=cv.createCanvas(...r.nativeCanvas);
     const layeredHead=bare.orbAnatomy||bare.orderedAnatomy||bare.fusedFocusAnatomy;
     const skull=(layeredHead||bare.w32SideSavedPalette)&&hidden?{...bare,ownGauntletHead:{hideHair:true}}:bare;
     weaponArt.render(c.getContext('2d'),skull,images,{frame:i,hiddenSlots:hidden&&!layeredHead&&!dagger?['hair']:[],appearance:bare.colorAppearance});
     if(hidden&&dagger)dagger.frames[i].uncover(c);
     layers.push(c);
    }
    backs.set(hidden,layers);
   }
   const group=part.gear,h=group.sourceRecord,adj=h.adjustmentRecord.adjustment,prior=h.entry.pack.directions[direction].headgearPolicy?.headAdjustment||{};
   const raw=await load('tools/rework-accessories/assets/'+group.gear.source+'.png');
   const b=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   try{
    for(let tick=0;tick<r.timeline.length;tick++){
     const i=Number(r.timeline[tick]),pose=dagger?dagger.poses[i]:(bare.basePack||bare.orbAnatomy||bare.orderedAnatomy||bare.fusedFocusAnatomy).pack.directions[direction].poses[i],pad=part.paddingPhysical;
     const off=(axis,delta)=>pad+Math.round(4*(pose.NECK[axis]-h.rest.NECK[axis]+(prior[axis]||0)+(delta||0)));
     const expected=cv.createCanvas(...r.nativeCanvas),ctx=expected.getContext('2d'),back=backs.get(hidden)[i];
     ctx.drawImage(back,0,0);
     if(mirrored){ctx.translate(expected.width,0);ctx.scale(-1,1);}
     ctx.drawImage(raw,off('x',adj.gearX),off('y',adj.gearY));
     let actual;assert(b.draw({save(){},restore(){},drawImage(c){actual=c;}},player,{...o,progress:(tick+.2)/r.timeline.length}));
     const pixels=read(actual);assert(pixels.equals(read(expected)),[weapon,direction,item,tick,'original weapon and gear'].join('/'));
     assert(!pixels.equals(read(back)),[weapon,direction,item,tick,'visible gear'].join('/'));
     expected.width=expected.height=1;frames++;
    }
   }finally{b.release();}
   count++;
  }
  for(const frames of backs.values())for(const c of frames)c.width=c.height=1;
  if(count){rows.push({weapon,direction,items:count,frames});console.log(weapon,direction,count,frames);}
  global.gc?.();
 }
 if(group==='sword')assert.deepEqual(rows.find(r=>r.weapon===69&&r.direction==='north'),
  {weapon:69,direction:'north',items:10,frames:80},'All helmets ride the mirrored Nodachi skull through the complete cycle');
 if(group==='healer')for(const direction of ['east','west']){
  const relic=rows.find(r=>r.weapon===32&&r.direction===direction);
  assert.deepEqual(relic,{weapon:32,direction,items:10,frames:80});
 }
 const items=rows.reduce((a,r)=>a+r.items,0);assert(items>0,'No tested fits for '+group);assert.equal(items,expected[group]);assert(rows.every(r=>r.items===gear[4].length));
 if(process.env.HD_HEAD_RESULTS)fs.writeFileSync(process.env.HD_HEAD_RESULTS,JSON.stringify({group,rows,items}));
})().catch(e=>{console.error(e);process.exitCode=1;});