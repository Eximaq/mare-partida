'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)), S=process.env.CANDIDATE_DIR&&p.resolve(process.env.CANDIDATE_DIR),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),
 A=require(p.join(R,'character-appearance.js')),load0=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),base=make();
const src='tools/rework-weapon-layers-hd/', vals=Object.keys(A.skins), expected='ruptura112NorthSavedPalette';
const opt={direction:'north',consumer:'world'},look={gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'black',eyeColor:'blue',skinStyle:'natural'};
const save=(skin,weapon=112,gear={},classId='brawler',app={})=>JSON.parse(JSON.stringify(A.commit({id:'test-ruptura112',classId,equipment:{weapon:{def:weapon},...gear}},{...look,skinColor:skin,...app},()=>true)));
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{
 await base.ready;let api=base;
 if(S){global.MareReworkWeaponCarryHD=require(p.join(S,'player-rework-weapon-carry-hd.js'));api=require(p.join(S,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:async f=>{const q=p.basename(f,'.png');const found=process.env.ARCHIVE_SOURCES&&JSON.parse(process.env.ARCHIVE_SOURCES)[q];return found?cv.loadImage(found):load0(f)},makeCanvas:cv.createCanvas});await api.ready;}
 a.equal(vals.length,8);
 for(const action of ['idle','walk']){
 const o={...opt,action}, light=save('light'), old={...light,appearance96:{...light.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
 const l=api.selectVisual(light,o), r0=base.selectVisual(old,o);a(l?.[expected],'saved W112 exact North carry');a.equal(l.hdKind,'carry');a.deepEqual(l.base,r0.base);
 if(S)a(!base.selectVisual(light,o)?.[expected]);
 const d=l.base.pack.directions.north,n=d.clip.frames,q=l.plan.parts[0];a.equal(n,action==='idle'?1:16);a.equal(d.clip.fps,action==='idle'?1:16);a.deepEqual(l.base.pack.pivot,{x:64,y:112});
 const parts=l.plan.parts; a.equal(parts.length,2);
 const stripped=parts.map(({joinedFringe,...q})=>q);a.deepEqual(stripped,r0.plan.parts);a.equal(l.relicEyes,undefined);
 const neg=[[save('light',112,{coat:{def:151}}),o],[save('light',112,{head:{def:157}}),o],[save('light',112,{},'cyborg'),o],[save('light',112,{},'brawler',{hairColor:'brown'}),o],[save('light',111),o],[light,{...o,direction:'south'}],[light,{...o,direction:'east'}],[light,{...o,direction:'west'}],[light,{...o,consumer:'portrait'}],[light,{...o,action:'attack-unarmed'}],[light,{...o,weaponless:true}],[old,o]];
 for(const [u,w] of neg)a(!api.selectVisual(u,w)?.[expected]);
 const V=global.ReworkAccessoryVendor.compositor,controls=Array.from({length:n},()=>({mask:new Uint8Array(512*512),contact:Infinity}));
 for(const [j,q] of parts.entries()){
  const [raw,own,hardware,shorts]=await Promise.all([q.source.url,...q.joinedFringe.urls].map(async f=>{const h=p.basename(f,'.png'),local=process.env.ARCHIVE_SOURCES&&JSON.parse(process.env.ARCHIVE_SOURCES)[h];return local?cv.loadImage(local):load0(src+f)}));
  const plate=cv.createCanvas(640,640),c=plate.getContext('2d'),take=img=>{c.clearRect(0,0,640,640);c.drawImage(img,0,0);return c.getImageData(0,0,640,640).data;};
  const [C,B,H,P]=[raw,own,hardware,shorts].map(take),skin=global.MareNativeSkinHD.mask(B,640,'anatomy'),matte=c.createImageData(640,640);let visible=0,owned=0;
  for(let i=0;i<C.length;i+=4)if(C[i+3]){visible++;if([0,1,2,3].some(k=>C[i+k]!==H[i+k])){if(P[i+3]&&!B[i+3])continue;a(skin[i/4]&&B[i+3]&&H[i+3]<255);owned++;matte.data[i+3]=255;}}
  a.equal(visible,[1336,1328][j]);a.equal(owned,[639,656][j]);c.putImageData(matte,0,0);
  const hand=d.layers.find(x=>x.id===['handRight','handLeft'][j]),hl=await load0('tools/rework-base-hd/assets/'+hand.source+'.png');
  for(let f=0;f<n;f++){
   const z=cv.createCanvas(512,512),zz=z.getContext('2d'),pos=d.poses[f],m=V.rigid(q.sourceBone[q.binding.b],q.sourceBone[q.binding.a],pos[q.binding.b],pos[q.binding.a]);
   const proj=img=>{zz.resetTransform();zz.clearRect(0,0,512,512);zz.imageSmoothingEnabled=false;zz.transform(...m.slice(0,4),m[4]*4,m[5]*4);zz.drawImage(img,0,0);return pixels(z)};
   const gear=proj(raw),mask=proj(plate);zz.resetTransform();zz.clearRect(0,0,512,512);
   V.render(zz,{...l.base.pack,directions:{north:{...d,layers:[hand]}}},new Map([[hand.source,hl]]),{direction:'north',frame:f,density:4});
   const b=pixels(z);let contact=0;for(let i=3;i<gear.length;i+=4){if(b[i]&&gear[i])contact++;if(mask[i])controls[f].mask[(i-3)/4]=1;}a(contact>100);controls[f].contact=Math.min(controls[f].contact,contact);
  }
 }
 const orig=await base.prepareConfiguration([{player:old,source:r0,options:o}],{resolve:x=>x});
 const emit=(handle,u,f)=>{let v;a(handle.draw({save(){},restore(){},drawImage(c){v=c}},u,{...o,progress:(f+.24)/n}));return pixels(v);};
 const silhouette=Array.from({length:n},(_,i)=>emit(orig,old,i));orig.release();
 for(const t of vals){
  const u=save(t),r=api.selectVisual(u,o),oldPlan={...r,id:r.id+':uncolored-crop',plan:{...r.plan,parts:stripped}};a(r?.[expected]);
  const handle=await api.prepareConfiguration([{player:u,source:r,options:o}],{resolve:x=>x});
  const control=await api.prepareConfiguration([{player:u,source:oldPlan,options:o}],{resolve:x=>x});
  let total=0;for(let f=0;f<n;f++){const b=emit(handle,u,f),d0=emit(control,u,f),{mask}=controls[f],s0=silhouette[f];for(let i=0;i<b.length;i+=4){a.equal(b[i+3],s0[i+3]);if(b.readUInt32LE(i)!==d0.readUInt32LE(i)){a(mask[i/4],'outside defined skin support');total++;}}}
  a(total>0);console.log(action,t,n,total,Math.min(...controls.map(j=>j.contact)));handle.release();control.release();global.gc?.();
 }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
