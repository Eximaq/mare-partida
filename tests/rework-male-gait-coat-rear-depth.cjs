'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),a=require('assert/strict'),J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const arms=[2,3,14,15,16,31,32,110,111,112,117,118,119,120,121,122,123,124,125,126,127,128], coats=[6,7,130,137,144,151,158,165,172,179];
const hit=(r,c)=>r?.id.includes(':own-gait-torso:'+c), pix=(c)=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(w,skinColor='light')=>A.commit({classId:I[w].type,equipment:{weapon:{def:w}}},{gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'},()=>true);
const coat=(p,c,variant)=>({...p,equipment:{...p.equipment,coat:{def:c,variant}}});
(async()=>{const api=make();await api.ready;let total=0;const rows=[];
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk'])for(const w of arms){
  const o={consumer:'world',direction,action},p=actor(w),b=api.selectVisual(p,o);
  for(const c of coats){
   const r=api.selectVisual(coat(p,c),o), added=hit(r,c);rows.push({direction,action,w,c,id:r?.id,added});
   if(!added||c===6)continue;total++;
   a.equal(b.id,r.slotRoutes.weapon.source);a.equal(r.slotRoutes.coat.item,c);
   a.deepEqual(r.plan,b.plan);a.deepEqual(r.colorAppearance,b.colorAppearance);a.equal(r.base.mirrorX,b.base.mirrorX);
   const d=b.pack.directions[direction],q=r.pack.directions[direction],motion=({layers,...v})=>v;
   a.deepEqual(motion(d),motion(q));a.deepEqual(q.layers.filter(l=>!r.outfitOverlay.layerIds.includes(l.id)),d.layers);
   a(!hit(api.selectVisual({...coat(p,c),classId:'sword'},o),c));a(!hit(api.selectVisual(coat(actor(w,'ebony'),c),o),c));
   a(!hit(api.selectVisual(coat(p,c,'unproven'),o),c));
  }
 }
 console.log(JSON.stringify({total,rows}));if(process.env.CENSUS)return;
 a.equal(total,33);
 const poses=[['north','idle',137],['east','walk',137],['west','walk',137],['east','idle',7],['west','idle',179]];
 let drawn=0;
 for(const [direction,action,c] of poses){
  const o={consumer:'world',direction,action},p=actor(16),d=coat(p,c),r=api.selectVisual(d,o);a(hit(r,c));
  const base=await api.prepareConfiguration([{player:p,options:o}]), dressed=await api.prepareConfiguration([{player:d,options:o}]);
  try{const n=r.pack.directions[direction].clip.frames;a.equal(dressed.coverage[0].frames,n);
   a.equal(dressed.coverage[0].slotRoutes.coat.item,c);
   for(let f=0;f<n;f++){
    const opts={...o,progress:(f+.25)/n};let x,y;
    a(base.draw({save(){},restore(){},drawImage(c){x=pix(c)}},p,opts));
    a(dressed.draw({save(){},restore(){},drawImage(c){y=pix(c)}},d,opts));
    a(x&&y&&x.length===y.length&&!x.equals(y));drawn++;
   }
  }finally{base.release();dressed.release();global.gc?.();}
 }
 a(!hit(api.selectVisual(coat(actor(16),137),{consumer:'world',direction:'north',action:'walk'}),137));
 a.equal(drawn,35);console.log('PASS 35 exact World draws; existing weapon, clipped tick, body and selected appearance unchanged');
})().catch(e=>{console.error(e);process.exit(1)});
