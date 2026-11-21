'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),api=make();
const idx=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
const source=idx.records.find(r=>r.id==='staff125-north-native-original-source'), o={direction:'north',action:'attack-focus',consumer:'world'};
const save=(tone,cl='healer',weapon=125)=>JSON.parse(JSON.stringify(A.commit({id:'north-pilot',classId:cl,equipment:{weapon:{def:weapon}}},{skinColor:tone},()=>true)));
const px=i=>{const c=cv.createCanvas(640,640),x=c.getContext('2d');x.drawImage(i,0,0);return Buffer.from(x.getImageData(0,0,640,640).data);};
(async()=>{await api.ready;const control=api.selectVisual(save('light'),o);assert(control?.ownStaff125North);
const orig=await Promise.all(source.states.map(async (s,i)=>Promise.all([s.layers[0].url,control.states[i].staffNorthRanks].map(async u=>px(await load('tools/rework-weapon-layers-hd/'+u))))));let n=0;
for(const tone of Object.keys(A.skins)){
 const player=save(tone),route=api.selectVisual(player,o);assert.equal(route?.ownStaff125North,tone);assert.deepEqual(route.timeline,source.timeline);assert.deepEqual(route.pivot,[80,128]);assert.equal(route.fps,12);
 const h=await api.prepareConfiguration([{player,source:route,options:o}],{resolve:x=>x});
 for(let f=0;f<9;f++){
  let im;assert(h.draw({save(){},restore(){},drawImage(c){im=c}},player,{...o,progress:(f+.1)/9}));
  const out=Buffer.from(im.getContext('2d').getImageData(0,0,640,640).data), [raw,m]=orig[f];let changed=0;
  for(let i=0;i<out.length;i+=4){assert.equal(out[i+3],raw[i+3]);if(!m[i]&&raw[i+3]===255)assert.equal(out.readUInt32LE(i),raw.readUInt32LE(i));if(m[i]&&out.readUInt32LE(i)!==raw.readUInt32LE(i))changed++;}
  assert(changed>10000);n++;
  if(process.env.PREVIEW_DIR&&['light','ebony'].includes(tone))require('fs').writeFileSync(path.resolve(process.env.PREVIEW_DIR,'local-world-'+tone+'-'+f+'.png'),im.toBuffer('image/png'));
 }
 h.release();global.gc?.();console.log(tone,'9/9');
}
assert(!api.selectVisual(save('light','strategist'),o)?.ownStaff125North);assert(!api.selectVisual(save('light','healer',126),o)?.ownStaff125North);
assert(!api.selectVisual(save('ebony'),{...o,consumer:'portrait'})?.ownStaff125North);assert.equal(n,72);console.log('PASS actual World W125 North',n);
})().catch(e=>{console.error(e);process.exitCode=1});
