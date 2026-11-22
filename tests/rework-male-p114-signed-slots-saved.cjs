const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),root=p.resolve(process.env.KAIZOKU_REPO||process.env.PROOF_STAGE||p.join(__dirname,'..')),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),A=require(p.join(root,'character-appearance.js')),load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const native=make({loadImage:path=>{const q=process.env.SIGNED_GARMENT_DIR&&p.join(process.env.SIGNED_GARMENT_DIR,p.basename(path));return q&&path.startsWith('tools/rework-weapon-layers-hd/assets/')&&fs.existsSync(q)?cv.loadImage(q):load(path);}});
const draw=(b,p,o,i,n)=>{let c;a(b.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:(i+.25)/n}));return Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);};
(async()=>{await native.ready;let count=0;for(const [direction,parts] of [['south',{boots:{def:9}}],['south',{legs:{def:21},boots:{def:9}}],['south',{legs:{def:22},boots:{def:9}}],['north',{legs:{def:21}}]])for(const skinColor of Object.keys(A.skins)){
 const appearance96=A.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor}),off={classId:'gunner',appearance96,equipment:{weapon:{def:114}}},on={...off,equipment:{...off.equipment,...parts}},o={direction,action:'attack-firearm',consumer:'world'};
 const r=native.selectVisual(on,o),b=native.selectVisual(off,o),n=r?.timeline.length;a(r?.signedWeaponGarments,[direction,skinColor,JSON.stringify(parts)]);a.deepEqual(r.states,b.states);a.deepEqual(r.timeline,b.timeline);a.deepEqual(r.colorAppearance,b.colorAppearance);
 const q0=await native.prepareConfiguration([{player:off,options:o}]),q1=await native.prepareConfiguration([{player:on,options:o}]),m=cv.createCanvas(640,640),mc=m.getContext('2d'),assets=new Map();
 for(const frame of r.signedWeaponGarments.phases)for(const h of [...frame.rear,...frame.front])if(!assets.has(h))assets.set(h,await (process.env.SIGNED_GARMENT_DIR?cv.loadImage(p.join(process.env.SIGNED_GARMENT_DIR,h+'.png')):load('tools/rework-weapon-layers-hd/assets/'+h+'.png')));
 try{for(let i=0;i<n;i++){
  const x=draw(q0,off,o,i,n),y=draw(q1,on,o,i,n),frame=r.signedWeaponGarments.phases[Number(r.timeline[i])];
  mc.clearRect(0,0,640,640);for(const h of [...frame.rear,...frame.front])mc.drawImage(assets.get(h),0,0);
  const data=mc.getImageData(0,0,640,640).data;let changes=0;
  for(let j=0;j<x.length;j+=4){a(y[j+3]>=x[j+3]);if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(data[j+3]>0);changes++;}}
  a(changes>4000);count++;
 }}finally{q0.release();q1.release();m.width=1;}
 global.gc?.();console.log(direction,skinColor,n);
}a.equal(count,784);console.log('PASS signed existing saved body/weapon output and clock, 784 ticks');})().catch(e=>{console.error(e);process.exitCode=1});
