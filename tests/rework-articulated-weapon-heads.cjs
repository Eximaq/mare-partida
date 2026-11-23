'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), zlib=require('node:zlib');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)), project=path.join(__dirname,'..');
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require(path.join(project,'tests/rework-integration-support.cjs'));
const {gear,weapons}=require(path.join(project,'tools/audit-hd-wardrobe-product.cjs')),load=require(path.join(project,'tools/rework-hd-test-loader.cjs')).create(root);
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
function json(file){const p=path.join(root,file);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):zlib.gunzipSync(fs.readFileSync(p+'.gz')));}
const weaponArt=mod('player-rework-weapon-native-hd.js').create(json('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
const read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const group=process.argv[2],expected={sword:170,rogue:60,gunner:130,healer:120,strategist:120};
assert(Object.hasOwn(expected,group),'Specify a weapon family with articulated headgear');
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();const rows=[];
 for(const {id:weapon,role} of weapons.filter(w=>w.role===group))for(const direction of ['north','south','east','west']){
  const actor=look.commit({classId:role,equipment:{weapon:{def:weapon}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
  const o={consumer:'world',direction,action:api.attackActionFor(weapon)},bare=world.selectWorldHDOnly(api,catalog,actor,o);
  let images;const backs=new Map();let count=0,frames=0;
  for(const item of gear[4]){
   const player={...actor,equipment:{...actor.equipment,head:{def:item}}},r=world.selectWorldHDOnly(api,catalog,player,o),part=r?.ownGauntletHead;
   if(!part||part.paddingPhysical===undefined)continue;
   assert.equal(r.slotRoutes.head.item,item);assert.equal(r.slotRoutes.weapon.item,weapon);assert.deepEqual(r.omitted,[]);
   assert.deepEqual(r.timeline,bare.timeline);assert.deepEqual(r.states,bare.states);
   const hidden=mod('headgear-visibility.js').resolve({def:item}).hideHair;
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
     const skull=layeredHead&&hidden?{...bare,ownGauntletHead:{hideHair:true}}:bare;
     weaponArt.render(c.getContext('2d'),skull,images,{frame:i,hiddenSlots:hidden&&!layeredHead?['hair']:[],appearance:bare.colorAppearance});
     layers.push(c);
    }
    backs.set(hidden,layers);
   }
   const group=part.gear,h=group.sourceRecord,adj=h.adjustmentRecord.adjustment,prior=h.entry.pack.directions[direction].headgearPolicy?.headAdjustment||{};
   const raw=await load('tools/rework-accessories/assets/'+group.gear.source+'.png');
   const b=await api.prepareConfiguration([{player,options:o}],{resolve:()=>({player,options:o,source:r})});
   try{
    for(let tick=0;tick<r.timeline.length;tick++){
     const i=Number(r.timeline[tick]),pose=(bare.basePack||bare.orbAnatomy||bare.orderedAnatomy||bare.fusedFocusAnatomy).pack.directions[direction].poses[i],pad=part.paddingPhysical;
     const off=(axis,delta)=>pad+Math.round(4*(pose.NECK[axis]-h.rest.NECK[axis]+(prior[axis]||0)+(delta||0)));
     const expected=cv.createCanvas(...r.nativeCanvas),ctx=expected.getContext('2d'),back=backs.get(hidden)[i];
     ctx.drawImage(back,0,0);ctx.drawImage(raw,off('x',adj.gearX),off('y',adj.gearY));
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
 const items=rows.reduce((a,r)=>a+r.items,0);assert(items>0,'No tested fits for '+group);assert.equal(items,expected[group]);assert(rows.every(r=>r.items===gear[4].length));
 if(process.env.HD_HEAD_RESULTS)fs.writeFileSync(process.env.HD_HEAD_RESULTS,JSON.stringify({group,rows,items}));
})().catch(e=>{console.error(e);process.exitCode=1;});