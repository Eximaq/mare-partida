'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),
{fitInventoryAvatar}=require('../player-rework-native-hd.js'),api=make();
const o={action:'idle',direction:'south',time:0,progress:0,consumer:'world'};
const save=(gender,equipment,classId)=>JSON.parse(JSON.stringify(A.commit({id:'inventory-test',classId,equipment},{gender,skinColor:'ebony'},()=>true)));
function alpha(c){const rr=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(rr[(y*c.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 return {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};
}
(async()=>{await api.ready;
for(const [gender,equipment,cls,label] of [
 ['masculino',{},'sword','male saved default'],['feminino',{},'sword','female saved default'],
 ['masculino',{legs:{def:133},head:{def:129},weapon:{def:4}},'gunner','male pants/helmet/firearm'],
 ['feminino',{weapon:{def:12}},'rogue','female dagger'],
]){
 const p=save(gender,equipment,cls),before=JSON.stringify(p),source=api.selectVisual(p,o);
 a(source,label);a(await api.prepareStablePose(p,o),label);
 const world=cv.createCanvas(440,450),wc=world.getContext('2d'),desktop=cv.createCanvas(400,350),dc=desktop.getContext('2d');
 a(api.drawStable(wc,p,{...o,x:220,y:390}));const prior=api.snapshot().last,at1=alpha(world);
 const result=api.drawFittedAvatar(dc,p,{zoom:3,consumer:'inventory'});a(result,label);a.equal(result.source,source.id);a.equal(result.multiplier,3);a.equal(result.limited,false);a.equal(result.consumer,'inventory');
 a.equal(JSON.stringify(p),before);a.deepEqual(api.snapshot().last,prior);
 const at3=alpha(desktop);a(at3.x0>=9&&at3.y0>=9&&at3.x1<391&&at3.y1<341);
 a(Math.abs(at3.h-3*at1.h)<=3,JSON.stringify({label,at1,at3}));
 a(Math.abs(at3.w-3*at1.w)<=3,JSON.stringify({label,at1,at3}));
 const phone=cv.createCanvas(135,260),mc=phone.getContext('2d');const mobile=api.drawFittedAvatar(mc,p,{zoom:3});
 a.equal(mobile.source,result.source);a(mobile.limited&&mobile.multiplier<3);const pb=alpha(phone);a(pb.x0>=9&&pb.y0>=9&&pb.x1<=125&&pb.y1<=250);
 const status=cv.createCanvas(660,600),sc=status.getContext('2d');const x4=api.drawFittedAvatar(sc,p,{zoom:4,consumer:'character-status'});
 a.equal(x4.source,result.source);a.equal(x4.multiplier,4);a.equal(x4.consumer,'character-status');a.deepEqual(api.snapshot().last,prior);
 if(label.includes('pants')){a(result.source.includes('pants133'));a(result.source.includes('129'));a(result.source.includes('carry4'));}
 console.log(label,result.source,`old ${at1.w}x${at1.h} -> ${at3.w}x${at3.h}`,`mobile ${pb.w}x${pb.h}`);
}
const fallback=cv.createCanvas(180,220);fallback.getContext('2d').fillRect(4,7,30,60);
const padded=cv.createCanvas(121,212),ctx=padded.getContext('2d'),fit=fitInventoryAvatar(ctx,fallback,1,{cache:false});
a.equal(fit.multiplier,3);a.deepEqual(alpha(padded),{x0:15,y0:16,x1:104,y1:195,w:90,h:180});
a.equal(fitInventoryAvatar(ctx,cv.createCanvas(180,220)),null);
console.log('PASS real authored stage Canvas: 3x normal / no clipping / 4x optional / fallback exact footprint');
})().catch(e=>{console.error(e);process.exitCode=1;});
