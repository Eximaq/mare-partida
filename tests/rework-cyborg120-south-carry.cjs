'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname)),V=global.ReworkAccessoryVendor.compositor;
const s='south',t=process.env.SKIN||'light',act=process.env.ACTION||'walk';
const look={hairColor:'black',eyeColor:'blue',hairStyle:'original',eyeStyle:'original',skinColor:t};
const p0={id:'cyborg120',classId:'cyborg',equipment:{weapon:{def:120}}};
const save=(rest={},app={})=>JSON.parse(JSON.stringify(A.commit({...p0,...rest},{...look,...app},()=>true)));
const basePix=(c,w=c.width)=>Buffer.from(c.getContext('2d').getImageData(0,0,w,w).data);
(async()=>{await api.ready;
 const o={direction:s,action:act,consumer:'world'},actor=save(),r=api.select(actor,o),bytes=JSON.stringify(actor);
 a(r?.cyborgFringeSavedPalette);a.equal(r.hdKind,'carry');
 for(const g of [save({classId:'brawler'}),save({equipment:{weapon:{def:120,variant:'test'}}}),save({equipment:{weapon:{def:120},coat:{def:151}}}),save({equipment:{weapon:{def:120},gloves:{def:26}}}),save({equipment:{weapon:{def:120},legs:{def:133}}}),save({equipment:{weapon:{def:120},head:{def:157}}}),save({}, {hairStyle:'hair-bob'}),{...actor,appearance96:{...actor.appearance96,skinColor:'original'}},save({equipment:{weapon:{def:31}}})]) a(!api.select(g,o)?.cyborgFringeSavedPalette);
 for(const dir of ['north'])a(!api.select(actor,{...o,direction:dir})?.cyborgFringeSavedPalette);
 for(const opt of [{action:'attack-unarmed'},{consumer:'portrait'},{weaponless:true}])a(!api.select(actor,{...o,...opt})?.cyborgFringeSavedPalette);
 const q=r.plan.parts[0],vanilla={...r,id:r.id+':control',plan:{...r.plan,parts:[{...q,joinedFringe:null}]}};
 const bare=save({equipment:{}}),plain=api.select(bare,o);a.deepEqual(plain.pack,r.pack);
 const d=r.pack.directions[s],n=d.clip.frames;a.equal(n,act==='idle'?1:16);a.equal(d.clip.fps,act==='idle'?1:16);a.deepEqual(r.pack.pivot,{x:64,y:112});
 a.equal(r.relicEyes.samples.length,45);a.equal(r.base.mirrorX===true,s==='west');
 a(q.hideHandBeyondWrist&&!q.replaceBoundLayer);
 const prefix='tools/rework-weapon-layers-hd/',gear=(await load(prefix+q.source.url)),M=global.MareNativeSkinHD,AP=global.MareAppearance96;
 const [own,hw]=await Promise.all(q.joinedFringe.urls.map(x=>load(prefix+x)));
 const c=cv.createCanvas(640,640),ctx=c.getContext('2d');
 const read=im=>{ctx.clearRect(0,0,640,640);ctx.drawImage(im,0,0);return ctx.getImageData(0,0,640,640);};
 const raw=read(gear),skin=read(own),arms=read(hw);
 const expectedSupport=ctx.createImageData(640,640);
 let owned=0,alpha=0,unchanged=0;
 for(let i=0;i<raw.data.length;i+=4){
  if(!raw.data[i+3])continue;
  alpha++;if([0,1,2,3].some(k=>raw.data[i+k]!==arms.data[i+k])){a(skin.data[i+3]&&arms.data[i+3]<255);expectedSupport.data[i+3]=255;owned++;}
  else unchanged++;
 }
 a.equal(owned,143);a.equal(alpha,1542);a.equal(unchanged,1399);
 ctx.putImageData(expectedSupport,0,0);
 const face=d.layers.find(l=>l.slot==='face'),eyes=cv.createCanvas(512,512),ey=eyes.getContext('2d'),ei=ey.createImageData(512,512);
 for(const [x,y,R,G,B,alpha,rk] of r.relicEyes.samples){const i=((y-r.relicEyes.offset)*512+x-r.relicEyes.offset)*4,h=parseInt(A.eyes.blue.ramp[rk-1].slice(1),16);ei.data.set([h>>>16,(h>>>8)&255,h&255,255],i);}
 ey.putImageData(ei,0,0);
 const rows=[[r,actor],[vanilla,actor],[plain,bare]];
 for(const row of rows)row[2]=await api.prepareConfiguration([{player:row[1],source:row[0],options:o}],{resolve:x=>x});
 const emit=(k,f)=>{let z;a(rows[k][2].draw({save(){},restore(){},drawImage(c){z=c}},rows[k][1],{...o,progress:(f+.23)/n}));return basePix(z);};
 const orient=tile=>{if(!r.base.mirrorX)return basePix(tile);const x=cv.createCanvas(512,512),t=x.getContext('2d');t.translate(512,0);t.scale(-1,1);t.drawImage(tile,0,0);const b=basePix(x);x.width=1;return b;};
 const layer=(l,img,f)=>{const c=cv.createCanvas(512,512),g=c.getContext('2d'),h=l.frames?.[f]||l.source;V.render(g,{...r.pack,directions:{[s]:{...d,layers:[l]}}},new Map([[h,img]]),{direction:s,frame:f,density:4});const b=orient(c);c.width=1;return b;};
 const gearPlane=(im,f)=>{const z=cv.createCanvas(512,512),k=z.getContext('2d'),pp=d.poses[f],m=V.rigid(q.sourceBone[q.binding.b],q.sourceBone[q.binding.a],pp[q.binding.b],pp[q.binding.a]);k.imageSmoothingEnabled=false;k.transform(m[0],m[1],m[2],m[3],m[4]*4,m[5]*4);k.drawImage(im,0,0);const b=orient(z);z.width=1;return b;};
 try{
 const hand=d.layers.find(l=>l.id==='handRight'),handImage=await load('tools/rework-base-hd/assets/'+hand.source+'.png');
 const results=[];
 for(let f=0;f<n;f++){
  const stock=emit(1,f),cur=emit(0,f),ordinary=emit(2,f),ownership=gearPlane(c,f),ga=gearPlane(gear,f),iris=layer(face,eyes,f),handAlpha=layer(hand,handImage,f);let diff=0,eyeN=0,gearN=0;
  for(let i=0;i<cur.length;i+=4){
   a.equal(cur[i+3],stock[i+3]);
   if(cur.readUInt32LE(i)!==stock.readUInt32LE(i)){a(ownership[i+3],'fused crop changed hardware-only pixel '+i/4);diff++;}
   if(iris[i+3]){a.equal(cur.readUInt32LE(i),iris.readUInt32LE(i));eyeN++;}
   if(ga[i+3])gearN++;
   if(!handAlpha[i+3]&&!ga[i+3]&&!iris[i+3])a.equal(cur.readUInt32LE(i),ordinary.readUInt32LE(i),'body outside the hand/crop/iris changed');
  }
  a.equal(eyeN,45);a(diff>15);a(gearN>1500);a(cur.subarray(390*512*4).equals(ordinary.subarray(390*512*4)));
  results.push({f,diff,gearN,eyeN});
 }
 a.equal(JSON.stringify(actor),bytes);console.log(s,t,act,n,results);
 }finally{rows.forEach(row=>row[2].release());}
})().catch(e=>{console.error(e);process.exitCode=1});
