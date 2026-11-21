const p=require('node:path'),a=require('node:assert/strict'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),
 index=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),old=make();
const api=old;
const o={direction:'north',action:'attack-sword',consumer:'world'},source=item=>index.records.find(r=>r.item===item&&r.body==='male'&&r.direction==='north');
const actor=(item,x={},e={})=>JSON.parse(JSON.stringify(A.commit({id:'real-save',classId:'sword',equipment:{weapon:{def:item},...e}},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'light',...x},()=>true)));
(async()=>{await Promise.all([api.ready,old.ready]);
for(const item of [1,68]){
 const x=actor(item),save=JSON.stringify(x),r=api.select(x,o),ref=source(item);
 a.equal(r?.id,ref.id,'missing normalized sword '+item);a.equal(r.colorAppearance.eyeColor,'blue');a.equal(JSON.stringify(x),save);
 for(const k of ['states','nativeCanvas','pivot','timeline','basePack'])a.deepEqual(r[k],ref[k]);
 a.equal(r.fps,12);a.equal(r.states.length,8);a.equal(r.timeline.length,8);a(!r.basePack.pack.directions.north.layers.some(l=>l.id==='face'||l.slot==='face'));
 const literal={...x,appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',eyeColor:'original',hairColor:'original',skinColor:'original'}};
 a.equal(api.select(literal,o)?.id,ref.id);
 for(const [look,gear,opts] of [
  [{eyeColor:'green'},{},o],[{hairColor:'silver'},{},o],[{skinColor:'ebony'},{},{...o,consumer:'portrait'}],[{hairStyle:'hair-bob'},{},o],
  [{},{coat:{def:151}},o],[{},{boots:{def:9}},o],[{},{weapon:{def:item,variant:'alt'}},o],
  [{},{},{...o,direction:'south'}],[{},{},{...o,direction:'east'}],[{},{},{...o,direction:'west'}],[{},{},{...o,action:'walk'}]
 ]){
  const actorX=actor(item,look,gear),got=api.select(actorX,opts);a(!got||got.id!==ref.id);
 }
}
a.notEqual(source(1).states[0].attachment.sha256,source(68).states[0].attachment.sha256);
console.log('PASS 2 real default saves, independent signed arms and 8-phase clock');
if(process.env.SELECT_ONLY)return;
const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas}),comp=global.ReworkAccessoryVendor.compositor;
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,1024,1024).data);
let count=0;
for(const item of [1,68]){
 const saved=actor(item),memo=JSON.stringify(saved),r=api.select(saved,o),basis=source(item),d=r.basePack.pack.directions.north;
 const batch=await api.prepareConfiguration([{player:saved,source:r,options:o}],{resolve:x=>x});
 const render=(model,imgs,f,appearance)=>{const c=cv.createCanvas(1024,1024);const result=native.render(c.getContext('2d'),model,imgs,{frame:f,appearance});a.deepEqual(result.pivot,{x:512,y:704});a.equal(result.fps,12);const out=pixels(c);c.width=1;return out;};
 try{for(let f=0;f<8;f++){
  const imgs=new Map(await Promise.all(native.requiredFiles(r,{frame:f}).map(async h=>[h,await load(h)])));
  const emit=look=>render(r,imgs,f,look),actual=emit(r.colorAppearance),noEyes=emit({...r.colorAppearance,eyeColor:'original'});
  a(actual.equals(noEyes),'North Blue affects something beyond chosen metadata');
  let w;a(batch.draw({save(){},restore(){},drawImage(k){w=k;}},saved,{...o,progress:(f+.2)/8}));a(w.width===1024&&pixels(w).equals(actual));
  const tint=emit({...r.colorAppearance,skin:'ebony',skinColor:'ebony',hairColor:'silver'}),orig=emit({hair:'original',hairColor:'original',face:'original',eyeColor:'original',skin:'original'});
  const weapon=r.states[f].attachment,texture=imgs.get('tools/rework-weapon-layers-hd/'+weapon.url);a(texture.width===weapon.size[0]);a(texture.height===weapon.size[1]);
  const raw=cv.createCanvas(1024,1024),rc=raw.getContext('2d');rc.imageSmoothingEnabled=false;rc.translate(192,192);rc.transform(...weapon.matrix);if(weapon.mirrorX){rc.translate(weapon.size[0],0);rc.scale(-1,1);}rc.drawImage(texture,0,0);rc.resetTransform();
  const mask=cv.createCanvas(1024,1024),m=mask.getContext('2d'),base=r.basePack.pack;
  const layerRaster=l=>{m.clearRect(0,0,1024,1024);m.save();m.translate(192,192);
   const sha=l.frames?.[f]||l.source,key='tools/rework-weapon-layers-hd/'+r.basePack.images[sha];
   comp.render(m,{...base,directions:{north:{...d,layers:[l]}}},new Map([[sha,imgs.get(key)]]),{direction:'north',frame:f,density:4,clear:false});m.restore();return pixels(mask);};
  const all=d.layers.map(l=>[l,layerRaster(l)]);
  rc.globalCompositeOperation='destination-out';
  for(const [l,L] of all.filter(([l])=>l.depth>weapon.depth)){const bb=rc.createImageData(1024,1024);bb.data.set(L);m.putImageData(bb,0,0);rc.drawImage(mask,0,0);}
  const ordered=pixels(raw);raw.width=mask.width=1;
  const material=all.filter(([l])=>l.id!=='shorts'),hair=all.find(([l])=>l.id==='hair')[1];let change=0,pure=0,rear=0,feet=0,hands=0,visible=0;
  for(let i=0;i<actual.length;i+=4){
   a.equal(actual[i+3],tint[i+3]);a.equal(actual[i+3],orig[i+3]);
   if(ordered[i+3])visible++;if(ordered[i+3]===255){a.equal(actual.readUInt32LE(i),ordered.readUInt32LE(i));a.equal(tint.readUInt32LE(i),ordered.readUInt32LE(i));pure++;}
   if(actual.readUInt32LE(i)!==tint.readUInt32LE(i)){
    a(material.some(([_,m])=>m[i+3]),'pixel outside approved anatomical material layers');change++;
    const y=Math.floor(i/(4*1024));
    if(hair[i+3]===255)rear++;
    if(y>=590)feet++;
    if(all.some(([l,m])=>l.id.startsWith('forearm-hand-')&&m[i+3]===255))hands++;
   }
  }
  a(change>1000&&rear>100&&feet>100&&hands>20&&visible>100&&pure>0,JSON.stringify({item,f,change,rear,feet,hands,visible,pure}));
  a(r.states[f]===basis.states[f]||JSON.stringify(r.states[f])===JSON.stringify(basis.states[f]));
  console.log(item,f,{change,rear,feet,hands,visible,pure});count++;
 }}finally{batch.release();global.gc?.();}
 a.equal(JSON.stringify(saved),memo);
}
a.equal(count,16);console.log('PASS 2 saves and 16 North sword own-pose/own-raster renders');
})().catch(e=>{console.error(e);process.exitCode=1});
