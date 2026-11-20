if(!process.env.GLOVE){
 const {spawnSync}=require('node:child_process');
 for(const id of [26,145,159,166,173])for(const tone of ['original','olive','ebony']){
  const child=spawnSync(process.execPath,[__filename],{stdio:'inherit',env:{...process.env,GLOVE:String(id),TONE:tone}});
  if(child.error)throw child.error;if(child.status!==0)process.exit(child.status||1);
 }
 process.exit(0);
}
const p=require('path'),a=require('assert/strict'),root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),fs=require('fs');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(process.env.KAIZOKU_CHECKPOINT||p.join(root,'player-rework-sword0-checkpoint.js'));
const path='tools/rework-sword0-checkpoint/sword-catalog.json',cat=require(p.join(root,'dist',path));
make();const l=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const load=f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(root,'dist',f)):l(f);
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===path?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:load,makeCanvas:cv.createCanvas});
const o={direction:'north',action:'attack-sword',consumer:'world'},pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const source=async(p,o)=>{const r=api.selectVisual(p,o);a(r,JSON.stringify([p,o]));return {r,b:await api.prepareConfiguration([{player:p,options:o,source:r}],{resolve:x=>x}),p};};
const draw=(s,f)=>{let c;a(s.b.draw({save(){},restore(){},drawImage(t){c=t;}},s.p,{...o,progress:(f+.25)/8}));return c;};
const handIds=['left-hand','right-hand'];
const ids=[26,145,159,166,173],gloves=process.env.GLOVE?[Number(process.env.GLOVE)]:ids;
a(gloves.every(g=>ids.includes(g)));
(async()=>{await api.ready;let count=0;
const profiles=process.env.TONE?[process.env.TONE]:['original','olive','ebony'];
for(const skinColor of profiles){
 const appearance96=global.MareCharacterAppearance.normalize({...cat.appearance96,skinColor});
 const actor=e=>({classId:'sword',appearance96,equipment:{weapon:{def:0},...e}});
 const bare=await source(actor({}),o);
 for(const g of gloves){
 const p=actor({gloves:{def:g}}),withGlove=await source(p,o),control=api.selectVisual(actor({coat:{def:151},gloves:{def:g}}),o);
 a.equal(withGlove.r.slotRoutes.gloves.item,g);a.deepEqual(withGlove.r.states,bare.r.states);
 a.deepEqual(withGlove.r.colorAppearance,bare.r.colorAppearance);a.deepEqual(withGlove.r.material,bare.r.material);
 const d=bare.r.pack.directions.north,out=withGlove.r.pack.directions.north,ct=control.pack.directions.north;
 a.deepEqual(out.clip,d.clip);a.deepEqual(out.poses,d.poses);a.deepEqual(withGlove.r.pack.pivot,bare.r.pack.pivot);
 a.deepEqual(out.layers.filter(x=>!handIds.includes(x.id)),d.layers.filter(x=>!handIds.includes(x.id)));
 const mapped=out.layers.filter(x=>handIds.includes(x.id));a.deepEqual(mapped,ct.layers.filter(x=>handIds.includes(x.id)));
 a.deepEqual(mapped.map(x=>x.depth),d.layers.filter(x=>handIds.includes(x.id)).map(x=>x.depth));
 const save=JSON.stringify(p);
 for(let f=0;f<8;f++){
  const native=draw(bare,f),test=draw(withGlove,f),M=cv.createCanvas(test.width,test.height),mc=M.getContext('2d');
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
  a(diff>10);a(pix(draw(bare,f)).equals(x));count++;M.width=1;
 }
 a.equal(JSON.stringify(p),save);
 for(const e of [{legs:{def:22}},{head:{def:19}},{boots:{def:9}},{weapon:{def:67}},{gloves:{def:25}},{gloves:{def:g,variant:'candidate'}}]){
  a(!api.selectVisual(actor({gloves:{def:g},...e}),o)?.id.includes('-north-no-coat'));
 }
 for(const delta of [{direction:'south'},{direction:'east'},{direction:'west'},{action:'walk'},{action:'attack-unarmed'}])
  a(!api.selectVisual(p,{...o,...delta})?.id.includes(':checkpoint-g'));
 withGlove.b.release();console.log(g,skinColor,8);
 }
 bare.b.release();
}
a.equal(count,gloves.length*profiles.length*8);console.log('passed',count);
})().catch(e=>{console.error(e);process.exitCode=1});
