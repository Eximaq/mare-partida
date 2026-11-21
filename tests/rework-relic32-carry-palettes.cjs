'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance.js'));
const P=global.MareAppearance96,V=global.ReworkAccessoryVendor.compositor,H=require(p.join(R,'player-rework-hair-anatomy-hd.js'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),W=512;
const stock=make(),raw={gender:'masculino',skinStyle:'natural',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:32}})=>JSON.parse(JSON.stringify(A.commit({id:'w32-carry-palette-test',classId:'healer',equipment},{...raw,...look},()=>true)));
const colors=Object.keys(A.hairs),eyes=Object.keys(A.eyes),skins=Object.keys(A.skins);
const cap=()=>cv.createCanvas(W,W).getContext('2d');
const bytes=c=>Buffer.from(c.getImageData(0,0,W,W).data);
function orient(c,r){if(!r.base.mirrorX)return bytes(c);const t=cap();t.translate(W,0);t.scale(-1,1);t.drawImage(c.canvas,0,0);return bytes(t);}
const shaPath=h=>'tools/rework-base-hd/assets/'+h+'.png';
async function image(h){const c=cap();c.drawImage(await load(shaPath(h)),0,0);return c.getImageData(0,0,W,W);}
function single(r,l,im,f){const d=r.pack.directions[r.direction],c=cap();const pack={...r.pack,directions:{[r.direction]:{...d,layers:[l]}}};V.render(c,pack,new Map([[l.frames?.[f]||l.source,im]]),{direction:r.direction,frame:f,density:4});return orient(c,r);}
const hex=n=>parseInt(n.slice(1),16);
const write=(p,i,k)=>{p[i]=k>>16;p[i+1]=(k>>8)&255;p[i+2]=k&255;p[i+3]=255};
function draw(api,player,o,f,n){let c;const opt={...o,x:0,y:0,time:0,progress:(f+.1)/n};a(api.draw({save(){},restore(){},drawImage(x){c=x;}},player,opt),JSON.stringify(api.snapshot()));a.equal(api.snapshot().last.frame,f);return bytes(c.getContext('2d'));}
(async()=>{await stock.ready;
 let api=stock;
 if(C){global.MareReworkWeaponCarryHD=require(p.resolve(C,'player-rework-weapon-carry-hd.js'));
 api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 for(const direction of (process.env.SIDE?[process.env.SIDE]:['north','south','east','west']))for(const action of ['idle','walk']){
  const opt={direction,action,consumer:'world'},p0=save({skinColor:'light'}),r=api.selectVisual(p0,opt);
  a(r?.relic32SavedPalette,'signed carry missing'); const d=r.pack.directions[direction],n=d.clip.frames,face=d.layers.find(l=>l.slot==='face'),hair=d.layers.find(l=>l.slot==='hair');
  a.equal(n,action==='idle'?1:16);a.equal(r.relicEyes?.samples.length||0,{south:45,north:0,east:18,west:18}[direction]);a.equal(!face,direction==='north');
  for(const skinColor of skins)for(const hairColor of colors)for(const eyeColor of eyes){
   const player=save({skinColor,hairColor,eyeColor}),v=api.selectVisual(player,opt);
   a(v?.relic32SavedPalette); a.equal(v.id,r.id);a.equal(v.colorAppearance.hairColor,hairColor);a.equal(v.colorAppearance.eyeColor,eyeColor);a.equal(v.colorAppearance.skin,skinColor);
   a.equal(v.plan,r.plan,'attachment identity');a.equal(v.base,r.base,'authored base identity');
  }
  const alternate={hairColor:'blonde',eyeColor:'amber'};
  for(const [q,o] of [[save({...alternate,hairStyle:'hair-bob'}),opt],[save({...alternate,eyeStyle:'face-calm'}),opt],
   [save(alternate,{weapon:{def:32},coat:{def:151}}),opt],[save(alternate,{weapon:{def:32},head:{def:19}}),opt],
   [save(alternate,{weapon:{def:32,variant:'alt'}}),opt],[save(alternate,{weapon:{def:5}}),opt],[save(alternate),{...opt,action:'attack-focus'}],
   [save(alternate),{...opt,consumer:'portrait'}],[save(alternate),{...opt,weaponless:true}]]){
   const found=api.selectVisual(q,o);a(!found?.relic32SavedPalette);
   if(C)a.deepEqual(found,stock.selectVisual(q,o),'out-of-scope route changed');
  }
  if(process.env.SELECT_ONLY)continue;
  const src=await image(hair.source),mat=H.masks(hair.source,src.data,P),hairOwner=cap(),hm=hairOwner.createImageData(W,W);
  let protects=0;for(let j=0;j<mat.skin.length;j++){if(mat.skin[j]){a(!mat.hair[j]);if(src.data[j*4+3])protects++;}if(mat.hair[j])write(hm.data,j*4,0xffffff);}
  a(protects>100);hairOwner.putImageData(hm,0,0);
  // All 10 palette ramps use the established anatomy-rank math with exactly the same alpha/mask.
  for(const c of colors){const x=H.recolor(hair.source,src.data,{hairColor:c},P);for(let j=0;j<mat.hair.length;j++){
    const i=j*4,t=mat.hair[j];a.equal(x[i+3],src.data[i+3]);if(t){const exp=hex(A.hairs[c].ramp[t-1]);a.equal((x[i]<<16)|(x[i+1]<<8)|x[i+2],exp);}else a.equal((x[i]<<16)|(x[i+1]<<8)|x[i+2],(src.data[i]<<16)|(src.data[i+1]<<8)|src.data[i+2]);
  }}
  const hairTiles=new Map();
  for(const [skinColor,hairColor] of [['light','blonde'],['light','silver'],['ebony','silver']]){
   const t=cap(),m=t.createImageData(W,W);m.data.set(H.recolor(hair.source,src.data,{hairColor,skin:skinColor},P));t.putImageData(m,0,0);hairTiles.set(skinColor+'/'+hairColor,t.canvas);
  }
  const piece=r.plan.parts[0],gear=await load('tools/rework-weapon-layers-hd/'+piece.source.url);
  const srcFace=face&&await image(face.source),eyeTiles=new Map();
  for(const c of eyes){if(!face)continue;const t=cap(),m=t.createImageData(W,W),{samples,offset}=r.relicEyes;
   for(const [x,y,R,G,B,A,tone] of samples){const i=((y-offset)*W+x-offset)*4;a.deepEqual(Array.from(srcFace.data.slice(i,i+4)),[R,G,B,A]);write(m.data,i,hex(global.MareCharacterAppearance.eyes[c].ramp[tone-1]));}
   t.putImageData(m,0,0);eyeTiles.set(c,t.canvas);
  }
  const cfg=[['light','black','blue'],['light','blonde','amber'],['light','silver','violet'],['ebony','black','blue'],['ebony','silver','violet']];
  const players=cfg.map(([skinColor,hairColor,eyeColor])=>save({skinColor,hairColor,eyeColor}));
  const rows=[];
  if(!process.env.PALETTE_ONLY)for(let f=0;f<n;f++){
   const natively=async(api,player)=>{a(await api.prepareStablePose(player,{...opt,progress:(f+.1)/n}),JSON.stringify(api.snapshot()));return draw(api,player,opt,f,n);};
   const frames=[];for(const player of players)frames.push(await natively(api,player));
   if(C){for(const k of [0,3])a(frames[k].equals(await natively(stock,players[k])),'baseline default RGBA changed');}
   const hm=single(r,hair,hairOwner.canvas,f),e0=face?single(r,face,eyeTiles.get('blue'),f):null;
   // Prove cosmetic domains do not touch the authored weapon and control that
   // the separately posed hand still contacts it, even with translucency.
   const q=piece,k=q.binding.a,j=q.binding.b,pose=d.poses[f],g=cap(),m=V.rigid(q.sourceBone[j],q.sourceBone[k],pose[j],pose[k]);
   g.imageSmoothingEnabled=false;g.transform(m[0],m[1],m[2],m[3],m[4]*4+q.calibrationOffsetPhysical[0],m[5]*4+q.calibrationOffsetPhysical[1]);
   if(q.mirrorSource){g.translate(q.source.nativeSize[0],0);g.scale(-1,1);}g.drawImage(gear,0,0);
   const gearOwner=orient(g,r),arm=d.layers.find(l=>l.binding?.a===k&&l.binding?.b===j);a(arm?.id.startsWith('hand'));
   const ps=await image(arm.frames?.[f]||arm.source),hc=cap(),skinMask=global.MareNativeSkinHD.mask(ps.data,W,'anatomy');
   ps.data.set(P.recolor(ps.data,skinMask,P.skins.light.ramp));hc.putImageData(ps,0,0);
   const hand=single(r,arm,hc.canvas,f);let contact=0;
   for(let i=0;i<gearOwner.length;i+=4)if(gearOwner[i+3]){a(!hm[i+3]&&!e0?.[i+3]);if(hand[i+3]===255&&hand.readUInt32LE(i)===frames[0].readUInt32LE(i))contact++;}
   a(contact>10,'missing visible hand–weapon contact');
   for(const [from,to,c] of [[0,1,'amber'],[0,2,'violet'],[3,4,'violet']]){
    const eye=face?single(r,face,eyeTiles.get(c),f):null,h=single(r,hair,hairTiles.get(cfg[to][0]+'/'+cfg[to][1]),f);let nd=0,ne=0,owned=0;
    for(let i=0;i<frames[to].length;i+=4){
     a.equal(frames[to][i+3],frames[from][i+3],'silhouette changed');
     if(eye?.[i+3]){a.equal(frames[to].readUInt32LE(i),eye.readUInt32LE(i),'owner iris not visible');ne++;}
     else if(frames[to].readUInt32LE(i)!==frames[from].readUInt32LE(i)){a(hm[i+3],'delta outside hair/iris at '+i/4);if(h[i+3]===255){a.equal(frames[to].readUInt32LE(i),h.readUInt32LE(i),'opaque hair rank differs');owned++;} nd++;}
    }
    a.equal(ne,r.relicEyes?.samples.length||0);a(nd>2700&&owned>2200);rows.push({f,c,nd,ne,contact,owned});
   }
   global.gc?.();
  }
  // Test every iris color through the runtime in one pilot frame; the same sampled ranks were proven phase-by-phase above.
  const baseOwner=single(r,hair,hairOwner.canvas,0),pBase=save();
  a(await api.prepareStablePose(pBase,{...opt,progress:.1/n}));const first=draw(api,pBase,opt,0,n);
  for(const eyeColor of eyes){const x=save({eyeColor}),v=api.selectVisual(x,opt);a(await api.prepareStablePose(x,{...opt,progress:.1/n}));const out=draw(api,x,opt,0,n);
   if(!face){a(out.equals(first),'North eye preference rendered visible pixels');continue;}
   const e=single(v,face,eyeTiles.get(eyeColor),0);for(let i=0;i<e.length;i+=4)a.equal(out.readUInt32LE(i),(e[i+3]?e:first).readUInt32LE(i));
  }
  for(const hairColor of colors){
   const x=save({hairColor});a(await api.prepareStablePose(x,{...opt,progress:.1/n}));const out=draw(api,x,opt,0,n),t=cap(),m=t.createImageData(W,W);
   m.data.set(H.recolor(hair.source,src.data,{hairColor,skin:'light'},P));t.putImageData(m,0,0);
   const h=single(r,hair,t.canvas,0);let diff=0;
   for(let i=0;i<out.length;i+=4){a.equal(out[i+3],first[i+3]);if(out.readUInt32LE(i)!==first.readUInt32LE(i)){a(baseOwner[i+3]);if(h[i+3]===255)a.equal(out.readUInt32LE(i),h.readUInt32LE(i));diff++;}}
   if(hairColor==='black')a.equal(diff,0);else a(diff>2700,'saved hair not visible: '+hairColor);
  }
  console.log(direction,action,rows.length,JSON.stringify(rows));
 }
 console.log('PASS W32 exact saved material');
})().catch(e=>{console.error(e);process.exitCode=1;});
