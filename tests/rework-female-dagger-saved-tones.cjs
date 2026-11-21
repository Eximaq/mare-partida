'use strict';
const a=require('node:assert/strict'),p=require('node:path'), crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const path=p.dirname(__dirname),I=require('../tools/rework-female-dagger-p22/index.json'),L=require('../tools/rework-hd-test-loader.cjs').create(path), api=make();
const ids=[12,13,71,72,73,74],o={consumer:'world',action:'attack-daggers'},orig={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original'};
const save=(def,tone,pants=false,mod={})=>JSON.parse(JSON.stringify(A.commit({id:def+'-'+tone+'-'+pants,classId:'rogue',equipment:{weapon:{def},...(pants?{pants:{def:22}}:{})}},{gender:'feminino',skinColor:tone,...mod},()=>true)));
const data=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const packSig=(x,d)=>[x.pack.density,x.pack.frame,x.pack.pivot,x.pack.directions[d].clip,x.pack.directions[d].rest,x.pack.directions[d].poses,x.states];
async function png(url){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await L(url),0,0);const q=data(c);c.width=1;return q;}
function draw(w,o,f){let c; a(api.draw({save(){},restore(){},drawImage(v){c=v;}},w,{...o,progress:(f+.1)/8}));a(c?.width===640&&c?.height===640);return data(c);}
(async()=>{await api.ready;for(const direction of process.argv.slice(2).length?process.argv.slice(2):Object.keys(I.savedToneMaterials)){
 const q={...o,direction}, p22=await Promise.all(I.frames[direction].map(h=>png('tools/rework-female-dagger-p22/assets/'+h+'.png')));
 const overlayRows=p22.map(b=>{const out=[];for(let i=0;i<b.length;i+=4){if(b[i+3])out.push(i);}return out;});
 let n=0;
 for(const def of ids){
  const stock={id:'orig'+def,classId:'rogue',appearance96:orig,equipment:{weapon:{def}}}, authentic=api.selectVisual(stock,q);
  const geo=packSig(authentic,direction), clips=I.targets[def+'/'+direction];a.deepEqual([authentic.id,authentic.action,authentic.direction,authentic.body,authentic.item,authentic.states],clips);
  const original=[];a(await api.prepareClip(stock,q));for(let f=0;f<8;f++)original.push(draw(stock,q,f));
  const toneHashes=[];
  for(const skin of Object.keys(A.skins)){
   const bare=save(def,skin),dress=save(def,skin,true),v=api.selectVisual(bare,q),e=api.selectVisual(dress,q);
   a(v?.femaleDaggerSavedTones);a(e?.femaleDaggerSavedTones);a.equal(v.material.skinColor,skin);a.equal(v.material.hairColor,'black');
   a.equal(api.selectVisual(bare,{...q,action:'attack'})?.id,v.id);a.equal(api.selectVisual(dress,{...q,action:'attack'})?.id,e.id);
   a.deepEqual(packSig(v,direction),geo);a.deepEqual(packSig(e,direction),geo);
   a.deepEqual(e.daggerP22Sources,I.frames[direction]);a(!v.daggerP22Sources);a(await api.prepareClip(bare,q));a(await api.prepareClip(dress,q));
   const hs=[];
   for(let f=0;f<8;f++){
    const x=draw(bare,q,f),y=draw(dress,q,f),restored=draw(bare,q,f),clip=original[f];a(x.equals(restored));
    let painted=0,opaque=0;const allowed=overlayRows[f];let from=0,j=0;
    for(const i of allowed){
     if(i>from&&!x.subarray(from,i).equals(y.subarray(from,i)))throw Error('P22 affected pixel outside own layer '+[def,direction,f,skin,from,i].join('/'));
     from=i+4;if(x.readUInt32LE(i)!==y.readUInt32LE(i)){painted++;if(p22[f][i+3]===255&&y.readUInt32LE(i)===p22[f].readUInt32LE(i))opaque++;}
    }
    if(from<x.length)a(x.subarray(from).equals(y.subarray(from)));
    a(painted>500,[def,direction,skin,f,painted,opaque].join('/'));
    let diff=0,alpha=0;
    for(let i=0;i<x.length;i+=4){if(clip[i+3]!==x[i+3])alpha++;if(clip.readUInt32LE(i)!==x.readUInt32LE(i))diff++;}
    a(alpha===0,[def,direction,skin,f,'alpha',alpha].join('/'));a(diff>2500,[def,direction,skin,f,'changed',diff].join('/'));
    hs.push(hash(x));n+=2;
   }
   a.equal(new Set(hs).size,8);toneHashes.push(hs.join(':'));
  }
  a.equal(new Set(toneHashes).size,8);
  for(const opt of [{consumer:'portrait'},{weaponless:true},{variant:'other'},{action:'idle'}])a(!api.selectVisual(save(def,'ebony'),{...q,...opt})?.femaleDaggerSavedTones);
  const normal=save(def,'ebony');for(const q0 of [{...normal,classId:'gunner'},{...normal,equipment:{...normal.equipment,coat:{def:6}}},{...normal,equipment:{weapon:{def,variant:'other'}}}])a(!api.selectVisual(q0,q)?.femaleDaggerSavedTones);
  global.gc?.();
 }
 a.equal(n,768);console.log('PASS',direction,n,'normal saved World draws (6 weapons x 8 poses x 8 tones x 2 P22 states), no alpha drift, exact P22 restore.');
}})().catch(e=>{console.error(e);process.exitCode=1;});
