'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
const raw=async (x,pos=[0,0])=>{const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(await load(x),...pos);return new Uint32Array(ctx.getImageData(0,0,640,640).data.buffer);};
test('W118 attack uses its exact independent P22 behind the unchanged glove and weapon contribution',async()=>{
 const api=make(),A=MareCharacterAppearance;await api.ready;let checked=0;
 for(const direction of ['east','west'])for(const skinColor of Object.keys(A.skins)){
  let p;const x={classId:'cyborg',equipment:{weapon:{def:118},legs:{def:22,potential:null},boots:null,coat:null}};
  A.commit(x,{...A.defaults,skinColor},q=>{p=JSON.parse(JSON.stringify(q));return true;});
  const {legs,...equipment}=p.equipment,off={...p,equipment},before=JSON.stringify(p),o={consumer:'world',action:'attack-unarmed',direction};
  const candidate=api.selectVisual(p,o),base=api.selectVisual(off,o);
  a(candidate?.id.includes(':own-p22:'));a.deepEqual(candidate.timeline,base.timeline);a.deepEqual(candidate.pivot,base.pivot);
  a.deepEqual(candidate.colorAppearance,base.colorAppearance);a.equal(candidate.slotRoutes.legs.quality,'hd');a.deepEqual(candidate.omitted,[]);
  a(!api.selectVisual({...p,equipment:{...p.equipment,coat:{def:6}}},o)?.id.includes(':own-p22:'));
  a(!api.selectVisual({...p,appearance96:{...p.appearance96,hairStyle:'hair-spiky',hairColor:'blue'}},o)?.id.includes(':own-p22:'));
  a(await api.prepareClip(p,o));a(await api.prepareClip(off,o));
  const draw=(q,i)=>{let c;a(api.draw({save(){},restore(){},drawImage(x){c=x;}},q,{...o,progress:(i+.125)/20}));a.equal(api.snapshot().last.frame,i);return new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);};
  for(let i=0;i<8;i++){
   const [body,cloth,gear]=candidate.states[i].layers;a.deepEqual([body,gear],base.states[i].layers);a.deepEqual(cloth.occludedBy,gear);
   const [g,m]=await Promise.all([raw('tools/rework-weapon-layers-hd/'+gear.url,gear.offset),raw(cloth.url.slice(1))]);
   const a0=draw(off,i),a1=draw(p,i);let added=0;for(let j=0;j<a0.length;j++)if(a0[j]!==a1[j]){a(m[j]>>>24,'outside P22');a.equal(g[j]>>>24,0,'changed weapon or grip');added++;}
   a(added>100);a.deepEqual(draw(off,i),a0);checked++;
  }a.equal(JSON.stringify(p),before);
 }
 a.equal(checked,128);
});
