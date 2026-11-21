'use strict';
const assert=require('node:assert/strict'),A=require('../character-appearance'),I=require('../tools/rework-weapon-layers-hd/index.json'),{make}=require('./rework-integration-support.cjs');
const api=make(),o={direction:'north',action:'attack-sword',consumer:'world'};
const player=(item,t)=>JSON.parse(JSON.stringify(A.commit({id:`north-${item}`,classId:'sword',equipment:{weapon:{def:item}}},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:t},()=>true)));
const grab=(x,f)=>{let c;assert(api.draw({save(){},restore(){},drawImage(v){c=v;}},x,{...o,progress:(f+.2)/8}));return Buffer.from(c.getContext('2d').getImageData(0,0,1024,1024).data);};
(async()=>{await api.ready;const ts=['light',...Object.keys(A.skins).filter(t=>t!=='light')];assert.equal(ts.length,8);let n=0;
for(const item of [1,68]){
 const ref=I.records.find(r=>r.id===`sword${item}-north-native-attachment`),light=[];
 for(const t of ts){
 const x=player(item,t),before=JSON.stringify(x),r=api.select(x,o);assert.equal(r?.id,ref.id);assert.equal(r.colorAppearance.skin,t);
 for(const k of ['states','nativeCanvas','pivot','timeline','basePack','fps'])assert.deepEqual(r[k],ref[k]);
 assert(await api.prepareClip(x,o));for(let f=0;f<8;f++){
  const got=grab(x,f);if(t==='light')light[f]=got;else{
   let change=0;const src=light[f];for(let i=0;i<got.length;i+=4){assert.equal(got[i+3],src[i+3]);change+=+(got.readUInt32LE(i)!==src.readUInt32LE(i));}
   assert(change>100 || t==='warm'&&change>20);
  } n++;
 } assert.equal(JSON.stringify(x),before);
 if(t!=='light')for(const [q,opts] of [[x,{...o,consumer:'portrait'}],[x,{...o,weaponless:true}],[{...x,classId:'gunner'},o],[{...x,equipment:{weapon:{def:item,variant:'other'}}},o],[{...x,equipment:{weapon:{def:item},coat:{def:151}}},o]])assert.notEqual(api.select(q,opts)?.id,ref.id);
 global.gc?.();
 }
}
assert.equal(n,128);console.log('PASS 128 ordinary World renders; 2 independent sword attachments x 8 tones x 8 native phases');
})().catch(e=>{console.error(e);process.exitCode=1});
