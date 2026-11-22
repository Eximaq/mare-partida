'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs');
const root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const extras=process.env.SIGNED_GARMENT_DIR;
const read=path=>{const asset=extras&&p.join(extras,p.basename(path));return asset&&path.startsWith('tools/rework-weapon-layers-hd/assets/')&&fs.existsSync(asset)?cv.loadImage(asset):load(path);};
const api=make({loadImage:read});
const w={weapon:{def:114}},actor=(parts={},appearance96={gender:'masculino',hairStyle:'original'})=>({classId:'gunner',appearance96,equipment:{...w,...parts}});
const prep=(player,options)=>api.prepareConfiguration([{player,options}]);
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const draw=(q,player,o,f,n)=>{let out;a(q.draw({save(){},restore(){},drawImage(c){out=c;}},player,{...o,progress:(f+.25)/n}));return pix(out);};
const url=sha=>'tools/rework-weapon-layers-hd/assets/'+sha+'.png';
(async()=>{await api.ready;let draws=0;
 for(const [direction,parts] of [
  ['south',{boots:{def:9}}],['south',{legs:{def:21}}],['south',{legs:{def:22}}],
  ['south',{legs:{def:21},boots:{def:9}}],['south',{legs:{def:22},boots:{def:9}}],
  ['north',{legs:{def:21}}]
 ]){
  const o={direction,action:'attack-firearm',consumer:'world'},on=actor(parts),off=actor(),snapshot=JSON.stringify(on);
  const r=api.selectVisual(on,o),b=api.selectVisual(off,o);a(r?.signedWeaponGarments,JSON.stringify([direction,parts,r?.id]));
  a.equal(r.signedWeaponGarments.base.id,b.id);a.deepEqual(r.states,b.states);a.deepEqual(r.pivot,b.pivot);a.deepEqual(r.timeline,b.timeline);a.equal(r.fps,b.fps);
  a.equal(r.timeline.length,direction==='south'?30:8);a.deepEqual(Object.keys(r.slotRoutes).sort(),Object.keys(on.equipment).sort());a.deepEqual(r.omitted,[]);
  const q0=await prep(off,o),q1=await prep(on,o),c=cv.createCanvas(640,640),ctx=c.getContext('2d'),m=cv.createCanvas(640,640),mc=m.getContext('2d'),publicSources=await Promise.all(b.states.map(f=>read(url(f.layers[0].sha256))));
  const images=new Map();for(const f of r.signedWeaponGarments.phases)for(const h of [...f.rear,...f.front])if(!images.has(h))images.set(h,await read(url(h)));
  try{
  for(let i=0;i<r.timeline.length;i++){
   const index=Number(r.timeline[i]),frame=r.signedWeaponGarments.phases[index],im=publicSources[index];
   ctx.clearRect(0,0,640,640);ctx.drawImage(im,0,0);a.deepEqual(draw(q0,off,o,i,r.timeline.length),pix(c),'OFF: literal published phase');
   const bare=pix(c);ctx.clearRect(0,0,640,640);mc.clearRect(0,0,640,640);
   for(const sha of frame.rear){ctx.drawImage(images.get(sha),0,0);mc.drawImage(images.get(sha),0,0);}
   ctx.drawImage(im,0,0);
   for(const sha of frame.front){ctx.drawImage(images.get(sha),0,0);mc.drawImage(images.get(sha),0,0);}
   const expected=pix(c),mask=pix(m),newFrame=draw(q1,on,o,i,r.timeline.length);
   a.deepEqual(newFrame,expected,'ON draws real ordered independent passes');
   let delta=0;for(let j=0;j<bare.length;j+=4){
    a(newFrame[j+3]>=bare[j+3],'lost native source alpha');
    if(newFrame.readUInt32LE(j)!==bare.readUInt32LE(j)){a(mask[j+3],'changed pixels outside exact garment atlas');delta++;}
    if(parts.boots&&bare[j+3]>=128&&Math.floor(j/4/640)>=502)a(mask[j+3],'exposed bottom of bare foot');
   }
   a(delta>4000);draws++;
  }}
  finally{q0.release();q1.release();c.width=m.width=1;}
  a.equal(JSON.stringify(on),snapshot);
  const qa=await prep(off,o);try{a.deepEqual(draw(qa,off,o,0,r.timeline.length),draw(awaitableReference(off,o,pix,publicSources[0],cv),off,o,0,r.timeline.length));}finally{qa.release();}
  global.gc?.();console.log(direction,Object.keys(parts),r.timeline.length);
 }
 for(const [direction,parts] of [['south',{gloves:{def:25}}],['north',{boots:{def:9}}],['north',{legs:{def:22}}],['east',{boots:{def:9}}],['west',{boots:{def:9}}],['south',{legs:{def:21,variant:'alt'}}],['south',{legs:{def:21},coat:{def:6}}]]){
  a(!api.selectVisual(actor(parts),{direction,action:'attack-firearm',consumer:'world'})?.signedWeaponGarments);
 }
 a.equal(draws,158);console.log('PASS 158 P114 signed World ticks, published OFF and ordered ON byte-exact');
})().catch(e=>{console.error(e);process.exitCode=1;});
function awaitableReference(_p,_o,_pix,img,canvas){return {draw(ctx){const c=canvas.createCanvas(640,640);c.getContext('2d').drawImage(img,0,0);ctx.drawImage(c);return true;}};}
