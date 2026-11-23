'use strict';
if(!process.env.BOOT){
 const {spawnSync}=require('node:child_process');
 for(const [DIR,BOOT] of [['north',148],...([8,9,134,148,162].map(id=>['south',id]))]){
  const child=spawnSync(process.execPath,['--max-old-space-size=180','--expose-gc',__filename],{
   stdio:'inherit',env:{...process.env,DIR,BOOT:String(BOOT)}});
  if(child.error)throw child.error;
  if(child.status!==0)process.exit(child.status||1);
 }
 console.log('PASS 576 sword/boot frames with exact slot, blade and saved-palette checks');
 return;
}
const a=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), hash=require('node:crypto').createHash;
const R=process.env.STAGE||path.resolve(__dirname,'..'),D=process.env.KAIZOKU_SWORD_DIST||path.resolve(R,'dist'),n=f=>require(path.join(R,f)),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(D,prefix,'sword-catalog.json'));
require(process.env.CK||path.join(R,'player-rework-sword0-checkpoint.js'));
if(process.env.NATIVE){
 const f=path.join(R,'player-rework-native-hd.js'),M=require('module'),m=new M(f);
 m.filename=f;m.paths=M._nodeModulePaths(R);m._compile(fs.readFileSync(process.env.NATIVE,'utf8'),f);m.loaded=true;require.cache[f]=m;
}
const {make,cv}=n('tests/rework-integration-support.cjs'), A=n('character-appearance.js'), disk=n('tools/rework-hd-test-loader.cjs').create(R);
const load=f=>f.startsWith(prefix)?cv.loadImage(path.join(D,f)):disk(f);
const api=make({loadImage:load,fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(R,f)))});
const mats=global.MareFemaleNamedHairHD.create(n('tools/rework-accessories/head-layer-index.json'),n('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(n('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{appearanceRegistry:mats,makeCanvas:cv.createCanvas});
const phase=process.env.DIR||'south',id=+(process.env.BOOT||8),weaponIds=(process.env.WEAPONS||'0,1,67,68,69,70').split(',').map(Number),
 o={consumer:'world',action:'attack-sword',direction:phase},south=phase==='south';
const b8=buf=>Buffer.from(buf),bytes=c=>b8(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actors=(w,t,b)=>({classId:'sword',appearance96:A.normalize({gender:'feminino',skinColor:t,hairStyle:'original',hairColor:'black',eyeColor:'blue'}),
 equipment:{weapon:{def:w},...(b?{boots:{def:b}}:{})}});
function render(r,imgs,f,capture=true){
 const c=cv.createCanvas(1,1);let weapon;
 reg.render(c.getContext('2d'),r,imgs,{frame:f,...(capture?{captureOps({op,canvas}){
  if(op.part){a(!weapon);weapon=cv.createCanvas(canvas.width,canvas.height);weapon.getContext('2d').drawImage(canvas,0,0);}
  else if(weapon){const wc=weapon.getContext('2d');wc.globalCompositeOperation='destination-out';wc.drawImage(canvas,0,0);}
  canvas.width=1;
 }}:{})});
 const n=c.width,pixels=bytes(c),blade=weapon?hash('sha256').update(bytes(weapon)).digest('hex'):null;
 c.width=1;if(weapon)weapon.width=1;
 return {n,pixels,blade};
}
const lower=(q,depth)=>{
 const d=q.pack.directions[phase],ls=d.layers.map(l=>l.id.startsWith('boot'+id+'-')&&l.depth>0?{...l,depth}:l);
 const pack={...q.pack,directions:{...q.pack.directions,[phase]:{...d,layers:ls}}};
 return {...q,pack,baseRecord:{...q.baseRecord,pack},states:q.states.map(s=>({...s,parts:[]}))};
};
(async()=>{await api.ready;a(await api.warmSwordCheckpoint());let phases=0;
 const ref=catalog.records.find(r=>r.item===id&&r.slot==='boots'&&r.direction===phase);
 const imageHashes=new Set(ref.layers.flatMap(l=>l.frames));
 for(const file of imageHashes)a.equal(hash('sha256').update(fs.readFileSync(path.join(D,prefix,'assets',file+'.png'))).digest('hex'),file);
 for(const weapon of weaponIds){
 const sole=new Map();
 for(const tone of ['light','ebony']){
  const off=actors(weapon,tone,0),on=actors(weapon,tone,id),saved=JSON.stringify(on),r=api.selectVisual(off,o),q=api.selectVisual(on,o);
  a.equal(r?.item,weapon);a(q?.id.endsWith(':own-boot:'+id),JSON.stringify([phase,weapon,id,tone,q?.id]));a.equal(q.slotRoutes.boots.item,id);a.equal(q.slotRoutes.weapon.item,weapon);
  a.deepEqual(q.states,r.states);a.deepEqual(q.colorAppearance,r.colorAppearance);a.deepEqual(q.material,r.material);
  const d=q.pack.directions[phase],original=r.pack.directions[phase];
  a.deepEqual(d.layers.filter(l=>!l.id.startsWith('boot'+id+'-')),original.layers);a.deepEqual(d.poses,original.poses);a.deepEqual(d.clip,original.clip);
  const mounted=d.layers.filter(l=>l.id.startsWith('boot'+id+'-'));
  a.deepEqual(mounted,ref.layers.map(l=>south&&l.depth===45?{...l,depth:4.01}:l));
  if(weapon===69){
   const W=n('paper-doll-96-lobby.js'),cat=n('tools/paper-doll-96-v3/weapons.json');
   for(const action of ['attack','skill'])a.equal(W.selectWorldHD(api,cat,on,{...o,action})?.id,q.id);
   a.notEqual(api.selectVisual({...on,equipment:{...on.equipment,boots:{def:id,variant:'invalid'}}},o)?.id,q.id);
  }
  const padding=r.paddingPhysical||0;
  for(let f=0;f<8;f++){
   const files=new Set([...reg.requiredFiles(r,{frame:f}),...reg.requiredFiles(q,{frame:f})]);
   const all=new Map(await Promise.all([...files].map(async x=>[x,await load(x)])));
   const x=render(r,all,f),y=render(q,all,f);a.equal(x.n,y.n);a(x.blade);a.equal(x.blade,y.blade,'actual blade contribution changed');
   if(south){
    const old=render(lower(q,45),all,f,false),next=render(lower(q,4.01),all,f,false);
    a(old.pixels.equals(next.pixels),'near boot/pose order changed visible clothing without the sword');
   }
   const M=cv.createCanvas(y.n,y.n),mc=M.getContext('2d');for(const l of mounted)mc.drawImage(all.get(prefix+'assets/'+l.frames[f]+'.png'),padding,padding);
   const mask=bytes(M);let bottom=0,changed=0;
   for(let j=0;j<mask.length;j+=4){
    if(mask[j+3])bottom=(j/4/y.n)|0;
    if(x.pixels.readUInt32LE(j)!==y.pixels.readUInt32LE(j)){a(mask[j+3],'outside own boot');changed++;}
    if(x.pixels[j+3])a(y.pixels[j+3],'original opaque support disappeared');
   }
   a(changed>100);let bottomColors=[];
   for(let j=(bottom-16)*y.n*4;j<mask.length;j+=4)if(mask[j+3])bottomColors.push(y.pixels.readUInt32LE(j));
   if(tone==='light')sole.set(f,bottomColors);
   else{
    const prior=sole.get(f);a.equal(prior.length,bottomColors.length);
    for(let j=0;j<prior.length;j++)for(const s of [0,8,16])a(Math.abs(((prior[j]>>>s)&255)-((bottomColors[j]>>>s)&255))<=3,'sole color leaks skin assignment');
   }
   M.width=1;phases++;if(f===7)global.gc?.();
  }
  a.equal(JSON.stringify(on),saved);
 }
 }
 console.log('PASS exact sword contribution, independent boot and saved silhouette:',phase,id,phases);
})().catch(e=>{console.error(e);process.exitCode=1;});
