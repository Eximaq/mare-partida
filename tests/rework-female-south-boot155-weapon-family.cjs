'use strict';
const p=require('node:path'),a=require('node:assert/strict'),fs=require('node:fs');
const root=process.env.PROOF_STAGE||p.resolve(__dirname,'..'),{make,cv}=require(root+'/tests/rework-integration-support.cjs'),A=require(root+'/character-appearance');
const load=require(root+'/tools/rework-hd-test-loader.cjs').create(root);
const opts={action:'walk',direction:'south',consumer:'world'};
const weapons=[15,32,67,70,111,112,117,118,119,120];
const context=['light','ebony'],phaseMap=[0,1,2,3,3,4,5,6,7,7],tp=[0,5,10,15,18,20,25,30,35,38];
const get=(b,pl,progress)=>{let c;a(b.draw({save(){},restore(){},drawImage(x){c=x;}},pl,{...opts,progress}));return c;};
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const cast=(skinColor,equipment)=>A.commit({classId:'sword',equipment},{gender:'feminino',hairStyle:skinColor==='light'?'original':'hair-cropped',hairColor:skinColor==='light'?'black':'blue',eyeColor:'blue',eyeStyle:'original',skinColor},()=>true);
async function one(id,tone){
 const w=make();await w.ready;
 const wp={weapon:{def:id}},pl=cast(tone,{...wp,boots:{def:155}}),off=cast(tone,wp),onlyBoot=cast(tone,{boots:{def:155}});
 const [base,source,boot]=[off,pl,onlyBoot].map(q=>w.selectVisual(q,opts));
 a(source?.carrySouthBootOnly,'new independent boot route '+id);
 a.deepEqual(source.carrySouth.states,base.states);a.equal(source.carrySouth.id,base.id);
 a.deepEqual(source.carrySouth.colorAppearance,base.colorAppearance);a.deepEqual(source.carrySouth.material,base.material);
 a.equal(source.slotRoutes.boots.item,155);a.equal(source.slotRoutes.weapon.item,id);
 a.deepEqual(source.omitted,[]);
 const o=await w.prepareConfiguration([{player:off,options:opts}]),s=await w.prepareConfiguration([{player:pl,options:opts}]),b=await w.prepareConfiguration([{player:onlyBoot,options:opts}]);
 a.equal(o.coverage[0].frames,8);a.equal(s.coverage[0].frames,40);
 const pad=source.carrySouth.paddingPhysical||0,W=512+pad*2,spec=source.authoredPantsLayer.spec;
 const masks=[],contacts=[];for(let k=0;k<10;k++){
  const c=cv.createCanvas(W,W),x=c.getContext('2d');for(const l of source.authoredPantsLayer.layers)x.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[k]+'.png'),pad,pad);
  masks.push(px(c));
  const contact=spec.contacts.find(q=>q.targetAuthoredPhase===k);
  if(contact){x.clearRect(0,0,W,W);x.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+contact.mask+'.png'),pad,pad);contacts[k]=px(c);}
  c.width=1;
 }
 let total=0;
 try{
  for(let tick=0;tick<40;tick++){
   const k=spec.frameToPhase[tick],f=Math.floor(tick/5);a.equal(phaseMap[k],f);
   const fraction=(tick+.15)/40,on=get(s,pl,fraction);
   if(tp[k]!==tick){a.equal(on,get(s,pl,(tp[k]+.15)/40));total++;continue;}
   const before=px(get(o,off,fraction)),after=px(on),back=hash(before),m=masks[k],body=cv.createCanvas(W,W);
   body.getContext('2d').drawImage(get(b,onlyBoot,fraction),pad,pad);
   const shoe=px(body),old=new Uint32Array(before.buffer,before.byteOffset,before.length/4),now=new Uint32Array(after.buffer,after.byteOffset,after.length/4);
   let diff=0,localDelta=0;
   for(let j=0;j<old.length;j++){
    const n=j*4;
    if(m[n+3]||contacts[k]?.[n]){
     if(!contacts[k]?.[n])a(after[n+3]>=before[n+3], 'alpha lost beyond authored correction: '+[id,tone,tick,j]);
     a(now[j]===shoe.readUInt32LE(n),'proven B155 contact differs '+[id,tone,tick,j]);
    }else if(now[j]!==old[j]) throw Error('outside boot plus signed contact alpha '+[id,tone,tick,j]);
    if(now[j]!==old[j])diff++;
   }
   a(diff>700);a.equal(hash(px(get(o,off,fraction))),back);
   if(process.env.BOARD&&localDelta){const out=cv.createCanvas(720,270),x=out.getContext('2d');x.fillStyle='#718091';x.fillRect(0,0,720,270);x.imageSmoothingEnabled=false;for(const [i,f] of [get(o,off,fraction),on,body].entries())x.drawImage(f,163+pad,308+pad,190,170,i*240,0,240,235);fs.writeFileSync(process.env.BOARD+'/delta-'+tick+'.png',out.toBuffer('image/png'));}
   if(localDelta) console.log('local',id,tone,tick,localDelta);body.width=1;total++;
  }
 }finally{o.release();s.release();b.release();}
 a.equal(total,40);console.log('PASS',id,tone,total);
}
if(process.env.ITEM)one(Number(process.env.ITEM),process.env.SKIN||'ebony').catch(e=>{console.error(e);process.exitCode=1;});
else{let total=0;for(const id of weapons)for(const tone of context){
 const child=require('node:child_process').spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,ITEM:String(id),SKIN:tone},encoding:'utf8'});
 process.stdout.write(child.stdout||'');process.stderr.write(child.stderr||'');a.equal(child.status,0);total+=40;
}a.equal(total,800);console.log('PASS saved World',total);}
