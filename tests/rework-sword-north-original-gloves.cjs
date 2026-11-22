const supported=[0,1,67,68,69,70],spots={0:26,1:145,67:159,68:166,69:173,70:26};
if(!process.env.GLOVE){
 const {spawnSync}=require('node:child_process');
 const weapons=process.env.WEAPON?[Number(process.env.WEAPON)]:supported;
 for(const item of weapons)for(const id of (process.env.ALL_GLOVES==='1'?[26,145,159,166,173]:[spots[item]]))for(const tone of (process.env.TONE?[process.env.TONE]:['light','ebony'])){
  const child=spawnSync(process.execPath,[...process.execArgv,__filename],{stdio:'inherit',env:{...process.env,WEAPON:String(item),GLOVE:String(id),TONE:tone}});
  if(child.error)throw child.error;if(child.status!==0)process.exit(child.status||1);
 }
 process.exit(0);
}
const item=Number(process.env.WEAPON);
const p=require('path'),a=require('assert/strict'),root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),fs=require('fs');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(process.env.KAIZOKU_CHECKPOINT||p.join(root,'player-rework-sword0-checkpoint.js'));
const path='tools/rework-sword0-checkpoint/sword-catalog.json',dist=process.env.KAIZOKU_SWORD_DIST||p.join(root,'dist'),cat=require(p.join(dist,path));
make();const l=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const load=f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):l(f);
const {create}=global.MareReworkFemaleEquipmentHD,crypto=require('node:crypto'),contribution=new Map();
global.MareReworkFemaleEquipmentHD.create=(...args)=>{
 const registry=create(...args),render=registry.render;
 registry.render=(ctx,r,images,opts)=>{
  if(r.item!==item||r.direction!=='north'||r.action!=='attack-sword')return render(ctx,r,images,opts);
  const result=render(ctx,r,images,opts),scratch=cv.createCanvas(1,1);
  let weapon,depth,partial=0;const capture=({op,canvas})=>{
   if(op.part){
    a(!weapon,'expected one weapon operation');depth=op.depth;
    weapon=cv.createCanvas(canvas.width,canvas.height);
    weapon.getContext('2d').drawImage(canvas,0,0);
   }else if(weapon){
    const c=weapon.getContext('2d');c.globalCompositeOperation='destination-out';c.drawImage(canvas,0,0);
   }
   canvas.width=1;
  };
  render(scratch.getContext('2d'),r,images,{...opts,captureOps:capture});
  a(weapon);const pixels=pix(weapon);
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0&&pixels[i]<255)partial++;
  contribution.set(r.id+':'+opts.frame,[depth,partial,crypto.createHash('sha256').update(pixels).digest('hex')]);
  weapon.width=scratch.width=1;
  return result;
 };
 return registry;
};
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===path?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:load,makeCanvas:cv.createCanvas});
const o={direction:'north',action:'attack-sword',consumer:'world'},pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const source=async(p,o)=>{const r=api.selectVisual(p,o);a(r,JSON.stringify([p,o]));return {r,b:await api.prepareConfiguration([{player:p,options:o,source:r}],{resolve:x=>x}),p};};
const draw=(s,f)=>{let c;a(s.b.draw({save(){},restore(){},drawImage(t){c=t;}},s.p,{...o,progress:(f+.25)/8}));return c;};
const handIds=['left-hand','right-hand'];
const ids=[26,145,159,166,173],gloves=process.env.GLOVE?[Number(process.env.GLOVE)]:ids;
a(supported.includes(item));a(gloves.every(g=>ids.includes(g)));
(async()=>{await api.ready;let count=0,partialCount=0;
const profiles=process.env.TONE?[process.env.TONE]:['light','ebony'];
for(const skinColor of profiles){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor});
 const actor=e=>({classId:'sword',appearance96,equipment:{weapon:{def:item},...e}});
 const bare=await source(actor({}),o);
 for(const g of gloves){
 const p=actor({gloves:{def:g}}),withGlove=await source(p,o);
 const control=api.selectVisual({...p,appearance96:global.MareCharacterAppearance.normalize({...cat.appearance96,skinColor})},o);
 a(control?.id.includes(':checkpoint-g'),'old Cropped source must still win');
 a(withGlove.r.id.includes(':own-registered-north-glove:'));
 const W=require(root+'/paper-doll-96-lobby.js'),catalog=require(root+'/tools/paper-doll-96-v3/weapons.json');
 for(const action of ['attack','skill'])a.equal(W.selectWorldHD(api,catalog,p,{...o,action})?.id,withGlove.r.id);
 a.equal(withGlove.r.slotRoutes.gloves.item,g);a.equal(withGlove.r.slotRoutes.weapon.item,item);a.deepEqual(withGlove.r.states,bare.r.states);
 a.deepEqual(withGlove.r.colorAppearance,bare.r.colorAppearance);a.deepEqual(withGlove.r.material,bare.r.material);
 const d=bare.r.pack.directions.north,out=withGlove.r.pack.directions.north,ct=control.pack.directions.north;
 a.deepEqual(out.clip,d.clip);a.deepEqual(out.poses,d.poses);a.deepEqual(withGlove.r.pack.pivot,bare.r.pack.pivot);
 a.deepEqual(out.layers.filter(x=>!handIds.includes(x.id)),d.layers.filter(x=>!handIds.includes(x.id)));
 const mapped=out.layers.filter(x=>handIds.includes(x.id));a.deepEqual(mapped,ct.layers.filter(x=>handIds.includes(x.id)));
 a.deepEqual(mapped.map(x=>x.depth),d.layers.filter(x=>handIds.includes(x.id)).map(x=>x.depth));
 const save=JSON.stringify(p);
 const replaced=actor({gloves:{def:g===26?145:26}}),rotate=await source(replaced,o);
 a.notEqual(rotate.r.id,withGlove.r.id);a.deepEqual(rotate.r.material,withGlove.r.material);a.deepEqual(rotate.r.states,withGlove.r.states);
 for(let f=0;f<8;f++){
  const native=draw(bare,f),test=draw(withGlove,f),M=cv.createCanvas(test.width,test.height),mc=M.getContext('2d');
  const w=contribution.get(bare.r.id+':'+f);a(w,'missing weapon capture');partialCount+=w[1];a.deepEqual(contribution.get(withGlove.r.id+':'+f),w,'visible weapon RGBA contribution (including partial alpha) changed');
  a.equal(test.width,native.width);a.equal(test.height,native.height);
  for(const z of mapped){
   const q=await load('tools/rework-sword0-checkpoint/assets/'+z.frames[f]+'.png');
   const orig=d.layers.find(x=>x.id===z.id),h=await load('tools/rework-base-hd/assets/'+orig.frames[f]+'.png');
   const rect=cv.createCanvas(q.width,q.height),dctx=rect.getContext('2d');dctx.drawImage(q,0,0);
   const gPixels=pix(rect);dctx.clearRect(0,0,q.width,q.height);dctx.drawImage(h,0,0);const barePixels=pix(rect);
   for(let j=3;j<gPixels.length;j+=4)a.equal(gPixels[j],barePixels[j],'raw alpha footprint changed');
   const pad=(test.width-q.width)/2;a(Number.isInteger(pad)&&pad>=0);mc.drawImage(q,pad,pad);rect.width=1;
  }
  const x=pix(native),y=pix(test),mask=pix(M);let diff=0;
  for(let i=0;i<x.length;i+=4){
   a.equal(x[i+3],y[i+3],'whole original alpha');
   if(x.readUInt32LE(i)!==y.readUInt32LE(i)){a(mask[i+3],'change outside registered two hands');diff++;}
  }
  a(diff>10);
  a(!pix(draw(rotate,f)).equals(y),'different gloves must draw different frames');
  a.deepEqual(contribution.get(rotate.r.id+':'+f),w,'swapping keeps weapon');

  const equipped=p.equipment.gloves;delete p.equipment.gloves;
  a.equal(api.selectVisual(p,o).id,bare.r.id,'removal selects original bare sword');
  a(pix(draw({...bare,p},f)).equals(x),'removal redraw must be pixel-identical');
  p.equipment.gloves=equipped;
  a.equal(api.selectVisual(p,o).id,withGlove.r.id,'re-equip selects same glove and sword');
  count++;M.width=1;
 }
 a.equal(JSON.stringify(p),save);
 for(const e of [{legs:{def:22}},{head:{def:19}},{boots:{def:9}},{weapon:{def:5}},{gloves:{def:25}},{gloves:{def:g,variant:'candidate'}}]){
  a(!api.selectVisual(actor({gloves:{def:g},...e}),o)?.id.includes(':own-registered-north-glove:'));
 }
 for(const delta of [{direction:'south'},{direction:'east'},{direction:'west'},{action:'walk'},{action:'attack-unarmed'}])
  a(!api.selectVisual(p,{...o,...delta})?.id.includes(':own-registered-north-glove:'));
 rotate.b.release();withGlove.b.release();console.log(item,g,skinColor,8);
 }
 bare.b.release();
}
a.equal(count,gloves.length*profiles.length*8);a(partialCount>0,'must exercise partial alpha weapon contribution');console.log('PASS original saved North glove',item,gloves,profiles,count,'ticks; semi-transparent weapon samples',partialCount);
})().catch(e=>{console.error(e);process.exitCode=1});
