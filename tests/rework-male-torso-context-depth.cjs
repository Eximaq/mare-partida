'use strict';
const R=require('path').resolve(process.argv[2]||require('path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),a=require('assert/strict'),J=f=>require(R+'/'+f);
const I=J('item-catalog').create({forge:J('forge-system'),prison:J('prison-system'),haki:J('haki-system'),akuma:J('akuma-system'),hakiProgression:J('haki-progression')}).items;
const roster=[2,3,14,15,16,31,32,110,111,112,117,118,119,120,121,122,123,124,125,126,127,128],hit=r=>r?.id.includes(':own-gait-context-torso:6');
const actor=(w,t='light')=>A.commit({classId:I[w].type,equipment:{weapon:{def:w}}},{gender:'masculino',skinColor:t,hairColor:'black',eyeColor:'blue'},()=>true);
const coat=p=>({...p,equipment:{...p.equipment,coat:{def:6}}});
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{const n=make();await n.ready;let realized=0;const rows=[];
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk'])for(const w of roster){
  const o={consumer:'world',action,direction},p=actor(w),off=n.selectVisual(p,o),q=coat(p),r=n.selectVisual(q,o);
  rows.push({direction,action,w,id:r?.id,tag:!!hit(r)});if(!hit(r))continue;
  realized++;a.equal(direction,'north');a.equal(action,'idle');a.equal(r.slotRoutes.weapon.source,off.id);
  a.equal(r.slotRoutes.coat.item,6);a.deepEqual(r.plan,off.plan);a.deepEqual(r.colorAppearance,off.colorAppearance);
  const d=r.pack.directions.north,b=off.pack.directions.north,rest=({layers,...r})=>r;
  a.deepEqual(rest(d),rest(b));const layers=d.layers.filter(x=>!r.outfitOverlay.layerIds.includes(x.id));
  a.deepEqual(layers,b.layers);
  a.equal(d.layers.filter(x=>r.outfitOverlay.layerIds.includes(x.id)&&x.depth<100).length,1);
  a(!hit(n.selectVisual(coat(actor(w,'ebony')),o)));
  a(!hit(n.selectVisual({...q,classId:'sword'},o)));
  a(!hit(n.selectVisual({...q,equipment:{...q.equipment,coat:{def:6,variant:'invalid'}}},o)));
  if(process.env.CENSUS)continue;
  const bare=await n.prepareConfiguration([{player:p,options:o}]),dressed=await n.prepareConfiguration([{player:q,options:o}]);
  try{
   a.equal(dressed.coverage[0].frames,1);let x,y;
   a(bare.draw({save(){},restore(){},drawImage(c){x=rgba(c)}},p,o));
   a(dressed.draw({save(){},restore(){},drawImage(c){y=rgba(c)}},q,o));
   a(x?.length&&x.length===y?.length&&!x.equals(y),'actual map slot on');
  }finally{bare.release();dressed.release();global.gc?.();}
 }
 console.log(JSON.stringify({rows,realized}));if(process.env.CENSUS)return;
 a.equal(realized,5);console.log('PASS contextual coat World selection and five pixel-drawn poses');
})().catch(e=>{console.error(e);process.exit(1)})
