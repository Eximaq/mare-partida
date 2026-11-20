'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),root=p.resolve(__dirname,'..'),load=require('../tools/rework-hd-test-loader.cjs').create(root),memo=new Map();
const look={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const player=(pants,boot)=>({classId:'fighter',appearance96:look,equipment:{coat:{def:151},legs:{def:pants},gloves:{def:152},...(boot?{boots:{def:boot}}:{})}});
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const take=(q,p,o,i,n)=>{let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...o,progress:(i+.25)/n}));return [pix(c),c];};
const boot=l=>l.id==='equip-boot155-far'||l.id==='equip-boot155-near';
const actorParts=l=>!l.id.startsWith('pants')&&!l.id.includes('glove')&&!boot(l);
const src=h=>{if(!memo.has(h))memo.set(h,load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));return memo.get(h);};
(async()=>{
 await api.ready;let selected=0,rendered=0;
 const roster=[140,147,154,161,168,175,182];
 const sheets={};
 for(const direction of ['east','west'])for(const action of ['idle','walk'])for(const pants of roster){
  const o={action,direction,consumer:'world'},worn=player(pants,155),bare=player(pants),reference=player(133);
  const withBoot=api.selectVisual(worn,o),without=api.selectVisual(bare,o),ref=api.selectVisual(reference,o);
  a(without?.registeredPantsBoot155,JSON.stringify([direction,action,pants,without?.id]));
  a.equal(without.equipment.boots,undefined);a.equal(without.slotRoutes.legs.item,pants);a.equal(without.slotRoutes.gloves.item,152);a.equal(without.slotRoutes.coat.item,151);
  const x=withBoot.pack.directions[direction],y=without.pack.directions[direction],z=ref.pack.directions[direction];
  const equipped=x.layers.filter(boot);a.deepEqual(y.layers,x.layers.filter(l=>!boot(l)));
  a.deepEqual(y.layers.filter(actorParts),z.layers.filter(actorParts));
  a.deepEqual(x.clip,y.clip);a.deepEqual(x.poses,y.poses);
  selected++;
  if(process.env.SELECT_ONLY||process.env.SMOKE&&pants!==168)continue;
  const saves=[JSON.stringify(worn),JSON.stringify(bare)],n=x.clip.frames;
  const q0=await prep(worn,withBoot,o),q1=await prep(bare,without,o);
  const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
  try{
   for(let i=0;i<n;i++){
    const [before]=take(q0,worn,o,i,n),[after,frame]=take(q1,bare,o,i,n);
    ctx.clearRect(0,0,512,512);
    for(const l of equipped){a.equal(l.binding.kind,'fixed');ctx.drawImage(await src(l.frames[i]),0,0);}
    const mask=pix(c);let diff=0,bareLeg=0;
    for(let j=0;j<mask.length;j+=4){
     if(before.readUInt32LE(j)===after.readUInt32LE(j))continue;
     a(mask[j+3]);diff++;
     const y=Math.floor(j/4/512);
     if(y>=377&&after[j+3]>145&&after[j]>95&&after[j]>1.22*after[j+1]&&after[j]>1.45*after[j+2])bareLeg++;
    }
    a(diff>1500);a(bareLeg>190,[direction,action,pants,i,bareLeg].join('/'));
    a.deepEqual(take(q0,worn,o,i,n)[0],before);
    if(process.env.PRINT&&action==='walk'&&[0,4,8,12].includes(i)){
     if(!sheets[direction]){
      const s=cv.createCanvas(7*147,4*153),sc=s.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#68768c';sc.fillRect(0,0,s.width,s.height);
      sheets[direction]=[s,sc];
     }
     const [s,sc]=sheets[direction],x=roster.indexOf(pants)*147,y=[0,4,8,12].indexOf(i)*153;
     sc.drawImage(frame,144,280,224,190,x+4,y+7,137,128);
     sc.fillStyle='white';sc.fillText('P'+pants+' F'+i,x+6,y+141);
    }
    rendered++;
   }
  }finally{c.width=c.height=1;q0.release();q1.release();}
  a.deepEqual([JSON.stringify(worn),JSON.stringify(bare)],saves);global.gc?.();
 }
 a.equal(selected,28);
 if(!process.env.SELECT_ONLY&&!process.env.SMOKE)a.equal(rendered,238);
 if(process.env.PRINT)for(const [dir,[c]] of Object.entries(sheets))require('node:fs').writeFileSync(process.env.PRINT+'/'+dir+'-bare-feet.png',c.toBuffer('image/png'));
 console.log({selected,rendered,exactNonBootLayers:true});
})().catch(e=>{console.error(e);process.exitCode=1});
