'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),appearance96={gender:'masculino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original',eyeStyle:'original'};
const p=(def,boot)=>({classId:'fighter',appearance96,equipment:{coat:{def},legs:{def:133},...(boot?{boots:{def:boot}}:{})}});
const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
const rgb=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const take=(bundle,player,o,i)=>{let result;a(bundle.draw({save(){},restore(){},drawImage(c){result=c;}},player,{...o,progress:(i+.25)/8}));return rgb(result);};
const memo=new Map();
const image=h=>{if(!memo.has(h))memo.set(h,load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));return memo.get(h);};
const dirs=['north','south','east','west'],coats=[6,7,130,137,144,158,165,172,179];
(async()=>{
 await api.ready;let matched=0,rendered=0;
 for(const direction of dirs)for(const boot of [9,148])for(const coat of coats){
  if(boot===148&&!['north','south'].includes(direction))continue;
  const o={action:'attack-unarmed',direction,consumer:'world'},bare=p(coat),worn=p(coat,boot),anchor=p(151,boot);
  const origin=api.selectVisual(bare,o),target=api.selectVisual(worn,o),reference=api.selectVisual(anchor,o),d=r=>r?.pack?.directions?.[direction];
  a.equal(target?.slotRoutes?.boots?.item,boot,JSON.stringify({direction,boot,coat,source:target?.id}));a.equal(target.slotRoutes.coat.item,coat);
  a.deepEqual(d(target).layers.filter(l=>!l.id.startsWith('boot'+boot+'-')),d(origin).layers);
  const b=d(target).layers.filter(l=>l.id.startsWith('boot'+boot+'-'));
  const rb=d(reference)?.layers.filter(l=>l.id.startsWith('boot'+boot+'-'));
  a.deepEqual(b,rb,reference?.id);a.deepEqual(d(target).clip,d(origin).clip);a.deepEqual(d(target).poses,d(origin).poses);
  matched++;
  if(process.env.SELECT_ONLY||process.env.SMOKE&&coat!==158)continue;
  const save=JSON.stringify(worn);
  const prep=(player,source)=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x});
  const q0=await prep(bare,origin),q1=await prep(worn,target),mask=cv.createCanvas(640,640),ctx=mask.getContext('2d');
  try{
   for(let i=0;i<8;i++){
    const before=take(q0,bare,o,i),after=take(q1,worn,o,i);
    ctx.clearRect(0,0,640,640);
    for(const l of b)ctx.drawImage(await image(l.frames?.[i]||l.source),0,0);
    const zone=rgb(mask);let delta=0,art=0;
    for(let z=0;z<after.length;z+=4){
     if(zone[z+3]>200)art++;
     if(before.readUInt32LE(z)!==after.readUInt32LE(z)){a(zone[z+3],`outside boot art ${direction} ${boot} ${coat} ${i} ${z}`);delta++;}
    }
    a(delta>2000&&delta>=art*.8,`boot hidden by coat ${direction} ${boot} ${coat} ${i} ${delta}/${art}`);
    rendered++;
   }
  }finally{q0.release();q1.release();mask.width=mask.height=1;}
  a.equal(JSON.stringify(worn),save);global.gc?.();
 }
 console.log({matched,rendered});
})().catch(e=>{console.error(e);process.exitCode=1});
