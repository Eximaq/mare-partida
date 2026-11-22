'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
require('../player-rework-sword0-checkpoint');const {make,cv}=require('./rework-integration-support.cjs');
const A=require('../character-appearance'),loader=require('../tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
const o={consumer:'world',action:'attack-sword',direction:'north'};
const wrists=new Set(['left-hand','right-hand']);
function read(bundle,actor,frame){
 let c;a(bundle.draw({save(){},restore(){},drawImage(canvas){c=canvas;}},actor,{...o,progress:(frame+.25)/8}));
 return {w:c.width,h:c.height,b:Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)};
}
(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint());let n=0;
 for(const skinColor of ['light','ebony']){
  const appearance96=A.normalize({...catalog.appearance96,skinColor});
  for(const pants of [22,182]){
  const actor=(boot,glove)=>({appearance96,classId:'sword',equipment:{weapon:{def:1},legs:{def:pants},
   ...(boot?{boots:{def:boot}}:{}),...(glove?{gloves:{def:glove}}:{})}});
  for(const boot of (pants===22?[null,8,9,148]:[null])){
   const off=actor(boot,null),selected=api.selectVisual(off,o);a(selected);
   const baseline=await api.prepareConfiguration([{player:off,options:o}]);
   try{
    for(const g of [26,145]){
     const on=actor(boot,g),before=JSON.stringify(on),r=api.selectVisual(on,o);
     a(r?.slotRoutes?.gloves?.item===g,'independent gloves missing after lower-body attachment: '+[boot,g,skinColor,r?.id].join('/'));
     a.equal(r.slotRoutes.legs.item,pants);a.equal(r.slotRoutes.boots?.item,boot||undefined);
     a.equal(r.slotRoutes.weapon.item,1);
     const x=selected.pack.directions.north,y=r.pack.directions.north;
     const others=layers=>layers.filter(l=>!wrists.has(l.id));
     a.deepEqual(others(x.layers),others(y.layers));a.deepEqual(x.poses,y.poses);a.deepEqual(x.clip,y.clip);
     a.deepEqual(selected.material,r.material);a.deepEqual(selected.states,r.states);a.deepEqual(selected.pack.pivot,r.pack.pivot);
     const b=await api.prepareConfiguration([{player:on,options:o}]);
     try{
      for(let i=0;i<8;i++){
       const l=read(baseline,off,i),z=read(b,on,i);a.deepEqual([l.w,l.h],[z.w,z.h]);
       let delta=0;
       for(let j=0;j<l.b.length;j+=4)if(l.b.readUInt32LE(j)!==z.b.readUInt32LE(j)){
        a(Math.floor(j/4/l.w)<400,'pixel changed below approved glove reach');delta++;}
       a(delta>0);n++;
      }
     }finally{b.release();}
     a.equal(JSON.stringify(on),before);
    }
   }finally{baseline.release();global.gc?.();}
  }
 }
 }
 console.log('PASS',n,'frames of independent pants/boots/glove swaps in one receiving attack');
})().catch(e=>{console.error(e);process.exitCode=1;});
