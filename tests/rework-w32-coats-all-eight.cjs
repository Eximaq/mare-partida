'use strict';
const a=require('node:assert/strict'),p=require('node:path');
const R=p.resolve(process.argv[2]||p.join(__dirname,'..')),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance.js'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),api=make();
function save(skinColor,coat,extra={}){return JSON.parse(JSON.stringify(A.commit({classId:'healer',equipment:{weapon:{def:32},...(coat?{coat:{def:coat}}:{}),...extra}},{gender:'masculino',skinStyle:'natural',skinColor,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},()=>true)))}
const W=640,pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,W,W).data);
const blank=()=>cv.createCanvas(W,W);
(async()=>{await api.ready;let n=0;for(const direction of ['east','west'])for(const tone of Object.keys(A.skins)){
 const o={consumer:'world',action:'attack-focus',direction},bare=save(tone),br=api.selectVisual(bare,o),bc=await api.prepareConfiguration([{player:bare,options:o}]);a(br?.relic32SideBlue);
 const draw=(bundle,v,f)=>{let im;a(bundle.draw({save(){},restore(){},drawImage(x){im=x;}},v,{...o,progress:(f+.1)/8}));a.equal(im.width,W);return im;};
 const base=Array.from({length:8},(_,j)=>pixels(draw(bc,bare,j)));
 for(const coat of [151,158,165,179]){
  const actor=save(tone,coat),r=api.selectVisual(actor,o);
  a(r?.relic32SideBlue,`missing W32 ${coat} / ${direction} / ${tone}`);
  a.deepEqual(r.equipmentContract,{weapon:32,coat});a.deepEqual(r.basePack,br.basePack);a.deepEqual(r.timeline,br.timeline);a.equal(r.contactTick,br.contactTick);a.equal(r.fps,br.fps);a.deepEqual(r.pivot,br.pivot);
  a(!api.selectVisual(save(tone,coat,{boots:{def:9}}),o)?.relic32SideBlue);
  const cc=await api.prepareConfiguration([{player:actor,options:o}]);
  for(let f=0;f<8;f++){
   const [c,g]=r.states[f].layers,rg=br.states[f].layers[0];a.equal(g.sha256,rg.sha256);
   const [cloth,gear]=await Promise.all([c,g].map(l=>load('tools/rework-weapon-layers-hd/'+l.url)));
   const C=blank(),G=blank();C.getContext('2d').drawImage(cloth,0,0);G.getContext('2d').drawImage(gear,0,0);
   const b=base[f],v=pixels(draw(cc,actor,f)),cm=pixels(C),gm=pixels(G);let change=0;
   const E=blank(),e=E.getContext('2d'),im=e.createImageData(W,W);im.data.set(b);e.putImageData(im,0,0);e.drawImage(cloth,0,0);
   const expect=pixels(E);
   for(let i=0;i<b.length;i+=4)if(cm[i+3]){
    a(!gm[i+3],'arm/weapon hidden by coat');if(b.readUInt32LE(i)!==v.readUInt32LE(i))change++;
    for(let k=0;k<4;k++)a(Math.abs(v[i+k]-expect[i+k])<=1,`coat is not exact original overlay ${direction}/${tone}/${coat}/${f}/${i}`);
   }else a.equal(v.readUInt32LE(i),b.readUInt32LE(i),'changed unowned weapon/anatomy');
   a(change>200);a.deepEqual(pixels(draw(bc,{...actor,equipment:{weapon:actor.equipment.weapon}},f)),b);a.deepEqual(pixels(draw(cc,actor,f)),v);
   C.width=G.width=E.width=1;n++;
  }
  cc.release();global.gc?.();
 }
 bc.release();global.gc?.();console.log(direction,tone,n);
}
a.equal(n,512);console.log('PASS 512 full actual World phases W32 with four independent coats, all eight tones, authored gear/skin exterior unchanged and remove/restored byte-exact');
})().catch(e=>{console.error(e);process.exit(1)});
