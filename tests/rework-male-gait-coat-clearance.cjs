'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),a=require('node:assert/strict'),J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const arms=[2,3,14,15,16,31,32,110,111,112,117,118,119,120,121,122,123,124,125,126,127,128], plus=x=>x?.id.includes(':own-gait-torso:6'), pix=(c)=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const makeP=(w,skinColor='light')=>A.commit({classId:I[w].type,equipment:{weapon:{def:w}}},{gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'},()=>true);
const coat=(p)=>({...p,equipment:{...p.equipment,coat:{def:6}}});
(async()=>{const api=make();await api.ready;let total=0;const rows=[];
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk'])for(const w of arms){
  const o={consumer:'world',direction,action},p=makeP(w),b=api.selectVisual(p,o),r=api.selectVisual(coat(p),o);
  const added=plus(r),desc=JSON.stringify([direction,action,w]);rows.push({direction,action,w,id:r?.id,added});
  if(!added) continue; total++;a.equal(b.id,r.slotRoutes.weapon.source);a.equal(r.slotRoutes.coat.item,6);
  a.deepEqual(r.plan,b.plan);a.deepEqual(r.colorAppearance,b.colorAppearance);a.equal(r.base.mirrorX,b.base.mirrorX);
  const d=b.pack.directions[direction], q=r.pack.directions[direction], motion=({layers,...v})=>v;
  a.deepEqual(motion(d),motion(q));a.deepEqual(q.layers.filter(l=>!r.outfitOverlay.layerIds.includes(l.id)),d.layers);
  a(!plus(api.selectVisual({...coat(p),classId:'sword'},o)));a(!plus(api.selectVisual(coat(makeP(w,'ebony')),o)));
  a(!plus(api.selectVisual({...p,equipment:{...p.equipment,coat:{def:6,variant:'unproven'}}},o)));
 }
 console.log(JSON.stringify({total,rows}));if(process.env.CENSUS)return;
 a.equal(total,42);
 for(const [direction,action,w] of [['north','idle',2],['north','walk',16],['south','idle',2],['east','idle',16],['west','idle',16]]){
  const o={consumer:'world',direction,action}, p=makeP(w), c=coat(p),r=api.selectVisual(c,o);a(plus(r));
  const ac=await api.prepareConfiguration([{player:p,options:o}]), dc=await api.prepareConfiguration([{player:c,options:o}]);
  try{const n=r.pack.directions[direction].clip.frames;
   for(let f=0;f<n;f++) {
    let u,v,x,y;const param={...o,progress:(f+.25)/n};
    a(ac.draw({save(){},restore(){},drawImage(c){u=c;x=pix(c);}},p,param));
    a(dc.draw({save(){},restore(){},drawImage(c){v=c;y=pix(c);}},c,param));
    a(u&&v);a(!x.equals(y),JSON.stringify([direction,action,w,f]));a.equal(u.width,v.width);a.equal(u.height,v.height);
   }
  }finally{ac.release();dc.release();global.gc?.();}
 }
 console.log('PASS effective World preparation, exact draw clock, original weapon/appearance/slot metadata and invalid variant negatives');
})().catch(e=>{console.error(e);process.exit(1)});
