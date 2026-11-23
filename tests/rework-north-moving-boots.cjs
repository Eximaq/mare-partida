'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const crypto=require('node:crypto');
const registry=require(path.join(root,'tools/rework-combat-wardrobe/index.json')).northBoots;
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const image=key=>load('tools/rework-combat-wardrobe/assets/'+key+'.png');
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const ids=[0,1,67,68,70,12,13,71,72,73,74,16,17,31,32,121,122];
(async()=>{
 const receipts=new Map();const api=make({loadImage:url=>receipts.has(url)?receipts.get(url):load(url)});await api.ready;await api.warmSwordCheckpoint();
 // Construct the comparison directly from the published donor plates.
 // Insert them into a new copy of the naked rig. This independently lets
 // shorts, front arms and the equipped weapon occlude the cuffs at runtime.
 async function reference(stock,item){
  const old=stock.basePack,d=old.pack.directions.north,leg=d.layers.find(l=>l.id==='legs');
  const phases=registry.rigs[leg.frames[0]].tracks[item],images={...old.images},layers=[...d.layers];
  const refs=[];
  for(const [component,depth] of [['rear',-1],['art',2.5]]){
   if(!phases.some(p=>p[component]))continue;
   const frames=[];
   for(const row of phases){
    const plate=cv.createCanvas(640,640),key=crypto.createHash('sha256').update(['test-fit',component,row[component]||'',row.x,row.y].join('/')).digest('hex');
    if(row[component])plate.getContext('2d').drawImage(await image(row[component]),row.x,row.y);
    const rel='assets/'+key+'.png';images[key]=rel;const file='tools/rework-weapon-layers-hd/'+rel;
    if(!receipts.has(file))receipts.set(file,plate);else plate.width=1;
    refs.push(file);frames.push(key);
   }
   layers.push({id:'reference-boot-'+component,slot:'top',depth,binding:{kind:'fixed'},source:frames[0],frames});
  }
  const {independentPlan,...record}=stock;
  return {record:{...record,id:stock.id+'#reference-'+item,
   basePack:{...old,images,pack:{...old.pack,directions:{...old.pack.directions,north:{...d,layers}}}}},refs};
 }
 const donors=require('../tools/rework-combat-wardrobe/north-boot-donors.json');
 assert.deepEqual(Object.keys(registry.sources).map(Number),gear[2]);
 assert.equal(Object.keys(registry.rigs).length,3);
 for(const item of gear[2]){
  const lookData={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'};
  const actor=look.commit({classId:'brawler',equipment:{boots:{def:item}}},lookData,()=>true);
  const donor=world.selectWorldHDOnly(api,catalog,actor,{action:'attack-unarmed',direction:'north',consumer:'world'});
  const pass=donor.independentPlan.passes.get('boots');
  assert.deepEqual(donor.omitted,[]);
  const expected=pass.layers.map(l=>[l.depth,l.frames?.[0]||l.source]);
  const actual=donors[item].map(l=>[l.depth,l.fit]);
  assert.deepEqual(actual.sort(),expected.sort(),'North donor identity '+item);
 }
 const selected=process.argv.slice(2).map(Number);assert(selected.every(n=>ids.includes(n)));
 const group=selected.length?selected:ids,results=[];
 for(const weapon of group){
  const role=weapons.find(w=>w.id===weapon).role,options={action:api.attackActionFor(weapon),direction:'north',consumer:'world'};
  const p=look.commit({classId:role,equipment:{weapon:{def:weapon},head:{def:19}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const pick=player=>world.selectWorldHDOnly(api,catalog,player,options);
  const prepare=(player,source)=>api.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source})});
  const draw=(b,player,t)=>{let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v}},player,{...options,progress:(t+.2)/8}));return c;};
  const stock=pick(p),off=await prepare(p,stock);assert.deepEqual(stock.omitted,[]);
  try{for(const item of gear[2]){
   const a={...p,equipment:{...p.equipment,boots:{def:item}}},r=pick(a);
   assert.deepEqual(r.omitted,[],[weapon,item,r.slotResolution?.boots?.reason].join('/'));
   assert.deepEqual(r.slotRoutes.head,stock.slotRoutes.head);assert.deepEqual(r.slotRoutes.weapon,stock.slotRoutes.weapon);
   assert.equal(r.slotRoutes.boots.item,item);assert(r.bootTrack?.splitDepth);
   const on=await prepare(a,r);assert.deepEqual(on.coverage[0].omitted,[]);
   const original=await reference(stock,item),verified=await prepare(p,original.record);
   try{for(let phase=0;phase<8;phase++){
    const before=draw(off,p,phase),after=draw(on,a,phase),referenceFrame=draw(verified,p,phase);
    const bare=pixels(before),actual=pixels(after),expected=pixels(referenceFrame);
    const f=r.bootTrack.phases[phase],[dx,dy]=r.renderOffsetPhysical||[0,0];
    const bounds=cv.createCanvas(after.width,after.height),ctx=bounds.getContext('2d');
    if(f.rear)ctx.drawImage(await image(f.rear),dx+f.x,dy+f.y);
    ctx.drawImage(await image(f.art),dx+f.x,dy+f.y);const owned=pixels(bounds);
    let visible=0,unexpected=0;
    for(let i=0;i<bare.length;i++){
     if(actual[i]!==bare[i]){assert(owned[i],[weapon,item,phase,'changed outside shoe',i].join('/'));visible++;}
     if(actual[i]!==expected[i])unexpected++;
    }
    assert(visible>500,[weapon,item,phase,visible,'missing boot'].join('/'));
    assert.equal(unexpected,0,[weapon,item,phase,'garment differs from independently mounted original'].join('/'));
    results.push({weapon,item,phase,visible});bounds.width=1;
   }}finally{verified.release();on.release();for(const f of original.refs)receipts.delete(f);}

  }}finally{off.release();}
  console.log('North',weapon,'80 registered boot frames');global.gc?.();
 }
 assert.equal(results.length,group.length*80);
 if(process.env.HD_BOOT_RECEIPT)fs.writeFileSync(process.env.HD_BOOT_RECEIPT,JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
