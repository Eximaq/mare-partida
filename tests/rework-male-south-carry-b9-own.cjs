'use strict';
const path=require('node:path'),R=process.env.KAIZOKU_REPO||path.join(__dirname,'..');
const n=file=>require(path.join(R,file)),{make,cv}=n('tests/rework-integration-support.cjs'),app=n('character-appearance'),load=n('tools/rework-hd-test-loader.cjs').create(R),a=require('node:assert/strict');
const fs=require('node:fs'),fetchJSON=async f=>{const p=path.join(R,f);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')));};
const engine=(options={})=>process.env.KAIZOKU_SELECTOR?require(process.env.KAIZOKU_SELECTOR).create({fetchJSON,loadImage:load,makeCanvas:cv.createCanvas,...options}):make(options);
const api=engine();
const items=n('item-catalog').create({forge:n('forge-system'),prison:n('prison-system'),haki:n('haki-system'),akuma:n('akuma-system'),hakiProgression:n('haki-progression')}).items;
const covered=[0,1,2,3,4,5,12,13,14,15,16,17,31,32,67,68,69,70,71,72,73,74,109,110,111,112,114,116,117,118,119,120,121,122,123,124,125,126,127,128];
const materialVariants=new Set([121,123,125,126,127]);
const o={direction:'south',action:'idle',consumer:'world'}, suffix=':own-b9-south-carry',pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(id,e,skinColor='light')=>app.commit({classId:items[id].type,equipment:{weapon:{def:id},...e}},{gender:'masculino',skinColor},()=>true);
(async()=>{await api.ready;let frames=0,selected=0;
for(const item of covered){
 for(const skin of Object.keys(app.skins)){
  const off=actor(item,{},skin),on=actor(item,{boots:{def:9}},skin),inv=JSON.stringify(on);
  const bare=api.selectVisual(off,o),wear=api.selectVisual(on,o),d=wear?.pack?.directions?.south,base=bare.pack.directions.south;
  a(wear?.id.includes(suffix),[item,skin]);a.equal(wear.slotRoutes.boots.item,9);a.equal(wear.slotRoutes.weapon.item,item);a.deepEqual(wear.omitted,[]);
  a.deepEqual(wear.plan,bare.plan);a.deepEqual(wear.colorAppearance,bare.colorAppearance);
  const boots=d.layers.filter(l=>l.id.startsWith('boot9-'));
  a.equal(boots.length,4);a.deepEqual(boots.map(l=>l.depth),[-1,4.01,-1,4.01]);a.deepEqual({...d,layers:d.layers.filter(l=>!boots.includes(l))},base);selected++;
  if(process.env.SELECT_ONLY||!materialVariants.has(item)&&!['light','ebony'].includes(skin))continue;
  const control={...bare,id:bare.id+':weapon-off-proof',plan:{...bare.plan,parts:[]}};
  const actors=[off,on,off],sources=[bare,wear,control],bundles=await Promise.all(actors.map((player,i)=>api.prepareConfiguration([{player,source:sources[i],options:o}],{resolve:x=>x})));
  const draw=i=>{let c;a(bundles[i].draw({save(){},restore(){},drawImage(x){c=x;}},actors[i],o));return c;};
  try{
   const [b,w,u]=[0,1,2].map(draw);
   const [x,y,z]=[b,w,u].map(pix),mask=cv.createCanvas(b.width,b.height),ctx=mask.getContext('2d'),
   pad=bare.plan.paddingPhysical??0;
   for(const layer of boots)ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+layer.frames[0]+'.png'),pad,pad);
   const m=pix(mask);let change=0,sole=-1;
   for(let i=0;i<x.length;i+=4){
    if(y[i+3])sole=(i/(w.width*4))|0;
    if(x.readUInt32LE(i)!==y.readUInt32LE(i)){
     a(m[i+3],`outside B9 ${item} ${skin}`);
     a.equal(x.readUInt32LE(i),z.readUInt32LE(i),`weapon altered ${item} ${skin}`);change++;
    }
   }
   a(change>5700);a.equal(sole-pad,451);a(pix(draw(0)).equals(x));a.equal(JSON.stringify(on),inv);frames++;mask.width=1;
  }finally{bundles.forEach(b=>b.release());global.gc?.();}
 }
}
for(const e of [{boots:{def:9,variant:'different'}},{boots:{def:9},legs:{def:21}},{boots:{def:148}}])a(!api.selectVisual(actor(0,e),o)?.id.includes(suffix));
for(const p of [{direction:'north'},{action:'attack'},{consumer:'character-creation'}])a(!api.selectVisual(actor(0,{boots:{def:9}}),{...o,...p})?.id.includes(suffix));
// The independently selected weapon projection is not footwear eligibility.
const drifted=engine({fetchJSON:async f=>{
 const doc=await fetchJSON(f);
 if(f.endsWith('/carry-binding-plan.json')){
  const source=doc.records.find(r=>r.item===0&&r.body==='male'&&r.direction==='south');
  source.parts[0].depthOffset+=0.2;
 }
 return doc;
}});
await drifted.ready;
a.equal(drifted.selectVisual(actor(0,{}),o)?.hdKind,'carry');
a(drifted.selectVisual(actor(0,{boots:{def:9}}),o)?.id.includes(suffix));
a(drifted.selectVisual(actor(1,{boots:{def:9}}),o)?.id.includes(suffix));
const lowerDrift=engine({fetchJSON:async f=>{
 const doc=await fetchJSON(f);
 if(f==='tools/rework-modular-outfits-hd/index.json'){
  const row=doc.records.find(q=>q.id==='male-pants133-idle-south-isolated-r2-boots9-isolated-candidate');
  row.pack.directions.south.poses[0]['LEFT LEG'].y+=1;
 }
 return doc;
}});
await lowerDrift.ready;
a.equal(lowerDrift.selectVisual(actor(0,{}),o)?.hdKind,'carry');
a(!lowerDrift.selectVisual(actor(0,{boots:{def:9}}),o)?.id.includes(suffix));
a.equal(selected,covered.length*8);a.equal(frames,process.env.SELECT_ONLY?0:covered.length*2+materialVariants.size*6);
console.log('PASS',selected,'World HD declarations;',frames,'Canvas; originals restored; lower-pose drift guarded');
})().catch(e=>{console.error(e);process.exitCode=1});
