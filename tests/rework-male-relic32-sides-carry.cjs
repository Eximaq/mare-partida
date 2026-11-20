'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance'));
const testDir=process.env.CANDIDATE_DIR,base=make(),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),args={fetchJSON:async f=>{const x=p.join(R,f);return JSON.parse(fs.existsSync(x)?fs.readFileSync(x):require('node:zlib').gunzipSync(fs.readFileSync(x+'.gz')))},loadImage:load,makeCanvas:cv.createCanvas};
const api=testDir?(global.MareReworkWeaponCarryHD=require(p.resolve(testDir,'player-rework-weapon-carry-hd.js')),require(p.resolve(testDir,'player-rework-native-hd.js')).create(args)):make();
const side=process.env.SIDE||'south';a(['south','east','west'].includes(side));
const raw={gender:'masculino',skinStyle:'natural',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},
 player=(skin,gear={weapon:{def:32}},look={},cls='healer')=>JSON.parse(JSON.stringify(A.commit({id:'disposable-w32',classId:cls,equipment:gear},{...raw,skinColor:skin,...look},()=>true))),
 items=JSON.parse(fs.readFileSync(p.join(R,'tools/rework-weapon-layers-hd/carry-binding-plan.json'))).records,
 piece=items.find(r=>r.item===32&&r.direction===side).parts[0],baseIndex=require(p.join(R,'tools/rework-base-hd/index.json')),o={direction:side,consumer:'world'},
 V=global.ReworkAccessoryVendor.compositor,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const clothes=o=>o?.hdKind==='carry'&&o.item===32;
(async()=>{await base.ready;await api.ready;
 for(const tone of Object.keys(A.skins))for(const action of ['idle','walk']){
  const opt={...o,action},p0=player(tone),old=JSON.stringify(p0),x=api.selectVisual(p0,opt),plain=api.selectVisual(player(tone,{}),opt),shared=api.selectVisual(player(tone,{weapon:{def:5}}, {},'gunner'),opt);
  a(clothes(x),'missing default W32 '+side+' '+tone+'/'+action);a.deepEqual(api.select(p0,opt),x);a.deepEqual(x.base,shared.base);
  a.deepEqual(x.base.pack,plain.pack);a(x.base.pack.directions[side].layers.some(l=>l.slot==='face'));a.equal(x.relicEyes.samples.length,side==='south'?45:18);a(x.base.headHairSeparated);
  a.deepEqual(x.plan.parts,[piece]);a.deepEqual(x.colorAppearance.skin,tone);a.equal(x.colorAppearance.hairColor,'black');a.equal(x.colorAppearance.eyeColor,'blue');
  a.equal(x.base.pack.directions[side].clip.frames,action==='idle'?1:16);
  a.equal(api.selectVisual(player(tone,undefined,{},'strategist'),opt)?.id,x.id); // compatibility with existing 516 audit
  delete p0.equipment.weapon;a.deepEqual(api.selectVisual(p0,opt),plain);p0.equipment.weapon={def:32};a.deepEqual(api.selectVisual(p0,opt),x);a.equal(JSON.stringify(p0),old);
  for(const q of [
   player(tone,{weapon:{def:32,variant:'alt'}}),player(tone,{weapon:{def:32},coat:{def:151}}),
   player(tone,{weapon:{def:32},head:{def:19}}),player(tone,undefined,{hairStyle:'hair-bob'}),
   player(tone,undefined,{eyeStyle:'face-calm'}),player(tone,undefined,{hairStyle:'none',hairColor:'blonde',eyeColor:'amber'}),
  ])a(!clothes(api.selectVisual(q,opt)));
  for(const opts of [{action:'attack-focus'},{consumer:'portrait'},{weaponless:true}])a(!clothes(api.selectVisual(player(tone),{...opt,...opts})));
 }
 console.log('8 x 2 real saved routes W32 '+side+', exact iris tuples; negative coverage stays stock');
 if(process.env.SELECT_ONLY)return;
 const sk=process.env.SKIN||'light',action=process.env.ACTION||'walk',opt={...o,action},p0=player(sk),p1=player(sk,{}),r=api.selectVisual(p0,opt),d=r.base.pack.directions[side],n=d.clip.frames;
 const gear=await load('tools/rework-weapon-layers-hd/'+piece.source.url),noGear={...r,id:r.id+':no-pure-w32-for-test',plan:{...r.plan,parts:[]}};
 const off=await api.prepareConfiguration([{player:p0,source:noGear,options:opt}],{resolve:v=>v});
 const both=await api.prepareConfiguration([{player:p0,source:r,options:opt}],{resolve:v=>v});
 const bare=await api.prepareConfiguration([{player:p1,source:api.selectVisual(p1,opt),options:opt}],{resolve:v=>v});
 const draw=(session,player,f)=>{let c;const v={...opt,time:(f+.25)/n,progress:(f+.25)/n};a(session.draw({save(){},restore(){},drawImage(x){c=x}},player,v));return pix(c)};
 const oriented=c=>{if(!r.base.mirrorX)return pix(c);const x=cv.createCanvas(c.width,c.height),t=x.getContext('2d');t.translate(c.width,0);t.scale(-1,1);t.drawImage(c,0,0);const p=pix(x);x.width=1;return p;};
 const face=d.layers.find(l=>l.slot==='face'),fm=cv.createCanvas(512,512),fc=fm.getContext('2d'),fi=fc.createImageData(512,512);
 for(const [x,y,R,G,B,A,tone] of r.relicEyes.samples){
  const i=((y-r.relicEyes.offset)*512+x-r.relicEyes.offset)*4,v=parseInt(Appearance()[tone-1].slice(1),16);fi.data.set([v>>>16,(v>>>8)&255,v&255,255],i);
 }
 function Appearance(){return A.eyes.blue.ramp;}
 fc.putImageData(fi,0,0);
 try{
 const rows=[],arc='tools/rework-base-hd/assets/',Mat=global.MareNativeSkinHD,P=global.MareAppearance96;
 const isolate=async (wanted,f)=>{
  const sha=wanted.frames?.[f]||wanted.source,im=await load(arc+sha+'.png'),src=cv.createCanvas(im.width,im.height),sc=src.getContext('2d');sc.drawImage(im,0,0);
  const raw=sc.getImageData(0,0,src.width,src.height),hair=wanted.slot==='hair',ramp=hair?P.hairs.black.ramp:P.skins[sk].ramp,
   mask=hair?P.materialMask(raw.data,'hair'):Mat.mask(raw.data,src.width,Mat.ownership([wanted]));
  raw.data.set(P.recolor(raw.data,mask,ramp));sc.putImageData(raw,0,0);
  const c=cv.createCanvas(512,512),cx=c.getContext('2d');
  V.render(cx,{...r.pack,directions:{[side]:{...d,layers:[wanted]}}},new Map([[sha,src]]),{direction:side,frame:f,density:4});
  const x=oriented(c);src.width=c.width=1;return x;
 };

 for(let f=0;f<n;f++){
  const plain=draw(off,p0,f),full=draw(both,p0,f),ordinary=draw(bare,p1,f);
  const iris=cv.createCanvas(512,512),ic=iris.getContext('2d');
  V.render(ic,{...r.pack,directions:{[side]:{...d,layers:[face]}}},new Map([[face.source,fm]]),{direction:side,frame:f,density:4});
  const eye=oriented(iris);iris.width=1;
  let eyes=0;for(let i=0;i<plain.length;i+=4){
   if(eye[i+3]===255){a.equal(plain.readUInt32LE(i),eye.readUInt32LE(i));a.equal(full.readUInt32LE(i),eye.readUInt32LE(i));eyes++;}
   if(!eye[i+3])a.equal(plain.readUInt32LE(i),ordinary.readUInt32LE(i),'carry body changed away from owned iris F'+f+' pixel '+i/4);
  }
  a.equal(eyes,r.relicEyes.samples.length,'unexpected lost iris');

  const [w,h]=[r.pack.frame.width*4,r.pack.frame.height*4],mask=cv.createCanvas(w,h),m=mask.getContext('2d'),q=piece,k=q.binding.a,j=q.binding.b,pose=d.poses[f];
  const mat=V.rigid(q.sourceBone[j],q.sourceBone[k],pose[j],pose[k]);
  m.imageSmoothingEnabled=false;m.transform(mat[0],mat[1],mat[2],mat[3],mat[4]*4+q.calibrationOffsetPhysical[0],mat[5]*4+q.calibrationOffsetPhysical[1]);if(q.mirrorSource){m.translate(q.source.nativeSize[0],0);m.scale(-1,1);}m.drawImage(gear,0,0);
  const owner=oriented(mask);mask.width=1;
  const vPlan=V.plan(r.pack,side,f),arm=vPlan.find(a=>a.binding?.a===k&&a.binding?.b===j),hands=[...d.layers.filter(l=>/^hand/.test(l.id))];
  a(arm?.id===(side==='south'?'handLeft':'handNear')&&hands.length===(side==='south'?2:1)&&!q.replaceBoundLayer&&!q.hideHandBeyondWrist);
  const counts={};
  for(const l of [...hands,d.layers.find(l=>l.id==='hair'),d.layers.find(l=>l.id==='lower-redrawn')]){
   const area=await isolate(l,f);let compared=0,gearOverlap=0;
   for(let j=0;j<area.length;j+=4){
    const y=Math.trunc(j/2048);
    if(l.id==='lower-redrawn'&&y<342)continue;
    if(area[j+3]===255&&area.readUInt32LE(j)===plain.readUInt32LE(j)){
     a.equal(full.readUInt32LE(j),plain.readUInt32LE(j),l.id+' changed on authored opaque pixels F'+f);
     compared++;if(owner[j+3])gearOverlap++;
    }
   }
   a(compared>100,l.id+' lacks visible owned material');counts[l.id]=[compared,gearOverlap];
  }
  a(full.subarray(390*512*4).equals(plain.subarray(390*512*4)),'feet change under relic');

  let changed=0;for(let x=0;x<plain.length;x+=4)if(plain.readUInt32LE(x)!==full.readUInt32LE(x)){a(owner[x+3],'unexpected out-of-attachment delta');changed++;}
  a(changed>300);
  const body=require('node:crypto').createHash('sha256').update(plain).digest('hex');
  a(counts[arm.id][1]>10,'no visible equipment-hand contact');
  rows.push({f,changed,body,counts,eyes});
 }
 console.log(JSON.stringify(rows));
 }finally{[off,both,bare].forEach(v=>v.release());}
})().catch(e=>{console.error(e);process.exitCode=1});
