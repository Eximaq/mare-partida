// Keep the same Porcelana control when checking each tone.
if(!process.env.SKIN){
 const {spawnSync}=require('node:child_process');
 for(const tone of ['light','warm','olive','copper','brown','dark','ebony']){
  const child=spawnSync(process.execPath,['--expose-gc',__filename],
   {env:{...process.env,SKIN:'porcelain,'+tone},stdio:'inherit'});
  if(child.error)throw child.error;
  if(child.status!==0){console.error('B183 Sul '+tone+': '+(child.signal||'exit '+child.status));process.exit(child.status??1);}
 }
 console.log('PASS 64 distinct B183 South poses');
 process.exit(0);
}
const p=require('path'),a=require('assert/strict'),root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),fs=require('fs');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
require(process.env.KAIZOKU_CHECKPOINT||p.join(root,'player-rework-sword0-checkpoint.js'));
const path='tools/rework-sword0-checkpoint/sword-catalog.json',dist=process.env.KAIZOKU_SWORD_DIST||p.join(root,'dist'),cat=require(p.join(dist,path));
make();const l=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const load=f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):l(f);
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>f===path?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:load,makeCanvas:cv.createCanvas});
const o={direction:'south',action:'attack-sword',consumer:'world'},pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const source=async(p,o)=>{const r=api.selectVisual(p,o);a(r,JSON.stringify([p,o]));return {r,b:await api.prepareConfiguration([{player:p,options:o,source:r}],{resolve:x=>x}),p};};
const draw=(s,f)=>{let c;a(s.b.draw({save(){},restore(){},drawImage(t){c=t;}},s.p,{...o,progress:(f+.25)/8}));return c;};
const boot=183;
const boots=x=>x.pack.directions.south.layers.filter(y=>y.id.startsWith('boot'+boot+'-'));
(async()=>{await api.ready;let count=0;const soles=new Map();
for(const skinColor of (process.env.SKIN?.split(',')||Object.keys(global.MareAppearance96.skins)))for(const item of (process.env.WEAPONS?.split(',').map(Number)||[0])){
 const appearance96=global.MareCharacterAppearance.normalize({...cat.appearance96,skinColor});
 const actor=e=>({classId:'sword',appearance96,equipment:{weapon:{def:item},...e}});
 const p=actor({boots:{def:boot}}),bare=await source(actor({}),o),withBoots=await source(p,o),control=await source(actor({coat:{def:151},boots:{def:boot}}),o);
 a.equal(withBoots.r.slotRoutes.boots.item,boot);a.deepEqual(withBoots.r.states,bare.r.states);
 a.deepEqual(withBoots.r.colorAppearance,bare.r.colorAppearance);
 a.deepEqual(withBoots.r.pack.directions.south.layers.filter(x=>!x.id.startsWith('boot'+boot+'-')),bare.r.pack.directions.south.layers);
 a.deepEqual(boots(withBoots.r),boots(control.r));
 const reference=cat.records.find(x=>x.direction==='south'&&x.slot==='boots'&&x.item===boot);
 a.deepEqual(boots(withBoots.r),reference.layers);
 a(api.selectVisual(actor({boots:{def:9}}),o)?.id.endsWith(':checkpoint-b9-south-no-coat'));
 const save=JSON.stringify(p);
 for(let f=0;f<8;f++){
  const native=draw(bare,f),test=draw(withBoots,f),ctrl=draw(control,f),m=cv.createCanvas(test.width,test.height),mc=m.getContext('2d');
  a.equal(test.width,native.width);a.equal(test.width,ctrl.width);
  for(const z of boots(withBoots.r)){
   const q=await load('tools/rework-sword0-checkpoint/assets/'+z.frames[f]+'.png');
   const pad=(test.width-q.width)/2;a(Number.isInteger(pad)&&pad>=0);mc.drawImage(q,pad,pad);
  }
  const wc=cv.createCanvas(test.width,test.height),wx=wc.getContext('2d'),part=bare.r.states[f].parts[0],padd=bare.r.paddingPhysical||0;
  wx.imageSmoothingEnabled=false;wx.translate(padd,padd);wx.transform(...part.matrix);
  if(part.sourceClip){wx.beginPath();wx.rect(...part.sourceClip);wx.clip();}
  wx.drawImage(await load(part.url),0,0);const blade=pix(wc);
  const x=pix(native),y=pix(test),t=pix(ctrl),mask=pix(m);let diff=0,overlap=0;
  for(let i=0;i<x.length;i+=4){
   if(mask[i+3])a.equal(y.readUInt32LE(i),t.readUInt32LE(i),'coat altered B9 pixels');
   if(x.readUInt32LE(i)!==y.readUInt32LE(i)){
    a(mask[i+3],'change outside boots');if(blade[i+3])overlap++;diff++;
   }
  }
  if(overlap)console.log('weapon overlap',item,skinColor,f,overlap);
  a.equal(overlap,0,'B9 altered visible weapon domain');
  let bottom=0;for(let i=0;i<mask.length;i+=4)if(mask[i+3])bottom=Math.floor(i/(4*test.width));
  const sole=[];
  for(let i=(bottom-15)*test.width*4;i<mask.length;i+=4)if(mask[i+3])sole.push([y[i],y[i+1],y[i+2],y[i+3]]);
  if(soles.has(f)){
   const t=soles.get(f);a.equal(sole.length,t.length);let peak=0,n=0;
   for(let i=0;i<t.length;i++){a.equal(sole[i][3],t[i][3]);const d=Math.max(...[0,1,2].map(j=>Math.abs(sole[i][j]-t[i][j])));peak=Math.max(peak,d);n+=d>3;}
   a.equal(n,0,'B183 sole transferred skin above the allowed threshold: '+peak);
  }else soles.set(f,sole);
  a(diff>1000);a(pix(draw(bare,f)).equals(x));count++;m.width=wc.width=1;
 }
 a.equal(JSON.stringify(p),save);
 for(const e of [{legs:{def:22}},{head:{def:19}},{gloves:{def:26}},{weapon:{def:1}},{weapon:{def:5}},{weapon:{def:69}},{boots:{def:141}},{boots:{def:176}}]){
  a(!api.selectVisual(actor({boots:{def:boot},...e}),o)?.id.includes(':checkpoint-b'+boot+'-south-no-coat'));
 }
 for(const delta of [{direction:'north'},{direction:'east'},{direction:'west'},{action:'walk'},{action:'attack-unarmed'}])
  a(!api.selectVisual(p,{...o,...delta})?.id.includes(':checkpoint-b'+boot+'-south-no-coat'));
 bare.b.release();withBoots.b.release();control.b.release();global.gc?.();console.log(item,skinColor,'8');
}
console.log('passed',count);
})().catch(e=>{console.error(e);process.exitCode=1});
