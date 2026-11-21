'use strict';
const assert=require('node:assert/strict'),p=require('node:path'),A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),api=make();
const V=global.ReworkAccessoryVendor,idx=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname));
const record=idx.records.find(r=>r.id==='cyborg118-south-native-original-source');
const makeCanvas=cv.createCanvas,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),canvas=()=>makeCanvas(640,640),opt={action:'attack-unarmed',direction:'south',consumer:'world'};
const player=(skin='light',rest={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'cyborg118-south',classId:'cyborg',equipment:{weapon:{def:118}},...rest},{skinColor:skin,...look},()=>true)));
const native=global.MareReworkWeaponNativeHD.create(idx,{vendor:V,makeCanvas});
const timeline='0 0 1 1 2 2 3 3 4 4 5 5 6 6 7 8 9 10 11 11'.split(' ');
(async()=>{await api.ready;
 const raw=player(),own=api.select(raw,opt);
 assert(own?.ownedCyborg118SouthAttack,'saved appearance must use W118 South HD');
 assert.deepEqual(own.timeline,timeline);assert.deepEqual(own.pivot,[80,128]);assert.equal(own.fps,24);
 const legacy={...raw,appearance96:{...raw.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
 assert.equal(api.select(legacy,opt).id,record.id);
 for(const q of [player('light',{classId:'brawler'}),player('light',{equipment:{weapon:{def:118,variant:'unreviewed'}}}),player('light',{equipment:{weapon:{def:118},gloves:26}}),player('light',{equipment:{weapon:{def:118},coat:151}}),player('light',{}, {hairStyle:'hair-bob'}),player('light',{}, {eyeColor:'gray'})])assert(!api.select(q,opt)?.ownedCyborg118SouthAttack);
 for(const o of [{action:'walk'},{weaponless:true},{consumer:'portrait'},{direction:'east'},{direction:'north'}])assert(!api.select(raw,{...opt,...o})?.ownedCyborg118SouthAttack);
 const files=new Map(await Promise.all(native.requiredFiles(own).map(async f=>[f,await load(f).catch(e=>{throw Error(f,{cause:e})})])));
 const ir=global.MareReworkModularOutfitsHD.southIrisSamples(), original=record.states.map((_,frame)=>{const c=canvas();native.render(c.getContext('2d'),record,files,{frame});return pix(c);});
 const bp=own.ownedCyborg120Body, d=bp.pack.directions.south, shorts=d.layers.find(x=>x.slot==='pants');
 const hairMask=await load('tools/rework-modular-outfits-hd/assets/dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5.png');
 const layerPix=image=>{const c=canvas();c.getContext('2d').drawImage(image,0,0);return pix(c);};
 const hairOwner=layerPix(hairMask),ownGear=[],ownShorts=[],orderedIris=[];
 const eyes=canvas(),ex=eyes.getContext('2d'),eyePixels=ex.createImageData(640,640);
 for(const [x,y,R,G,B,av,t]of ir){
  const c=parseInt(A.eyes.blue.ramp[t-1].slice(1),16),j=(y*640+x)*4;
  eyePixels.data.set([c>>>16,(c>>>8)&255,c&255,av],j);
 }
 for(let i=0;i<12;i++){
  const source=files.get(native.requiredFiles(own,{frame:i})[1]);ownGear[i]=layerPix(source);
  ex.putImageData(eyePixels,0,0);ex.drawImage(source,0,0);orderedIris[i]=pix(eyes);
  ownShorts[i]=layerPix(files.get('tools/rework-weapon-layers-hd/'+bp.images[shorts.frames[Math.min(i,7)]]));
 }
 const nativeLight=[];
 for(const tone of ['light',...Object.keys(A.skins).filter(s=>s!=='light')]){
  const actor=player(tone),old=JSON.stringify(actor),selected=api.select(actor,opt);
  assert(selected?.ownedCyborg118SouthAttack);const ready=await api.prepareConfiguration([{player:actor,source:selected,options:opt}],{resolve:v=>v});
  const checks=[];
  try{const seen=new Map();
  for(let i=0;i<20;i++){
   let w;assert(ready.draw({save(){},restore(){},drawImage(y){w=y}},actor,{...opt,progress:(i+.25)/20}));
   const sample=pix(w),phase=Number(timeline[i]),raw=original[phase];
   if(seen.has(phase)){assert(sample.equals(seen.get(phase)));continue;}seen.set(phase,sample);
   if(tone==='light')nativeLight[phase]=sample;
   let changed=0,legs=0,arms=0,gear=0,cloth=0,hair=0;
   const g=ownGear[phase],p=ownShorts[phase];
   for(let j=0;j<raw.length;j+=4){
    assert.equal(sample[j+3],raw[j+3]);
    if(g[j+3]===255){assert.equal(sample.readUInt32LE(j),raw.readUInt32LE(j));gear++;}
    if(p[j+3]===255&&g[j+3]===0&&p.readUInt32LE(j)===raw.readUInt32LE(j)){assert.equal(sample.readUInt32LE(j),raw.readUInt32LE(j));cloth++;}
    if(tone!=='light'&&hairOwner[j]){assert.equal(sample.readUInt32LE(j),nativeLight[phase].readUInt32LE(j));hair++;}
    if(sample.readUInt32LE(j)!==raw.readUInt32LE(j)){changed++;const y=Math.floor(j/2560);if(y>=410)legs++;if(y>=251&&y<=385)arms++;}
   }
   assert(changed>1000&&legs>100&&arms>100&&cloth>1000,JSON.stringify({phase,tone,changed,legs,arms,gear,cloth}));if(tone!=='light')assert.equal(hair,4090);
   if(tone==='ebony')assert(!sample.equals(nativeLight[phase]));
   for(const [x,y,R,G,B,av,t]of ir){const j=(y*640+x)*4;assert(ownGear[phase][j+3]<255);assert.equal(sample.readUInt32LE(j),orderedIris[phase].readUInt32LE(j),'original iris and translucent hardware order: phase '+phase+' '+x+','+y);}
   checks.push([phase,changed,legs,arms]);
  }
  assert.equal(checks.length,12);
  assert.equal(JSON.stringify(actor),old);
  }finally{ready.release();}global.gc?.();
 }
 console.log('PASS W118 SOUTH: 8 saved skin tones × 20 ticks = 160; 96 material phases, 45 registered irises, source silhouette, pivot, exclusions, and unchanged saves');
})().catch(e=>{console.error(e);process.exitCode=1});
