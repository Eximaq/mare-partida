'use strict';
const assert=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),S=process.env.CANDIDATE_DIR&&p.resolve(process.env.CANDIDATE_DIR),
 A=require(p.join(R,'character-appearance.js')),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const idx=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),load0=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),
 local=process.env.ARCHIVE_SOURCES&&JSON.parse(process.env.ARCHIVE_SOURCES),load=async f=>local?.[p.basename(f,'.png')]?cv.loadImage(local[p.basename(f,'.png')]):load0(f),stock=make();
let api=stock;
if(S){global.MareReworkWeaponNativeHD=require(p.join(S,'player-rework-weapon-native-hd.js'));api=require(p.join(S,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});}
const makeCanvas=cv.createCanvas,canvas=()=>makeCanvas(640,640),pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const native=global.MareReworkWeaponNativeHD.create(idx,{vendor:global.ReworkAccessoryVendor,makeCanvas}),opt={action:'attack-daggers',direction:'south',consumer:'world'};
const player=(item,skin='light',extras={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'south-daggers',classId:'rogue',equipment:{weapon:{def:item}},...extras},{skinColor:skin,...look},()=>true)));
const raster=img=>{const c=canvas();c.getContext('2d').drawImage(img,0,0);return pix(c);};
const ir=global.MareReworkModularOutfitsHD.southIrisSamples();
const actors=process.argv[2]?[Number(process.argv[2])]:[73,74],palettes=process.env.SHORT_TEST?['light','ebony']:Object.keys(A.skins);
(async()=>{await api.ready;
 const hairMask=raster(await load('tools/rework-modular-outfits-hd/assets/dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5.png'));
 for(const item of actors){
  const stock=idx.records.find(r=>r.id===`daggers${item}-south-native-original-source`),raw=player(item),own=api.select(raw,opt);
  assert(own?.ownedDaggersSouth,'saved appearance must use its own South daggers');
  assert.deepEqual(own.timeline,stock.timeline);assert.deepEqual(own.pivot,[80,128]);assert.equal(own.fps,12);
  assert.deepEqual(own.timeline,Array.from({length:9},(_,i)=>String(i)));
  const literal={...raw,appearance96:{...raw.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
  assert.equal(api.select(literal,opt).id,stock.id);
  for(const [u,o]of [[player(item,'light',{classId:'cyborg'}),opt],[player(item,'light',{equipment:{weapon:{def:item,variant:'unapproved'}}}),opt],
    [player(item,'light',{equipment:{weapon:{def:item},coat:151}}),opt],[player(item,'light',{}, {hairStyle:'hair-bob'}),opt],[player(item,'light',{}, {eyeColor:'gray'}),opt],
    [player(13),opt],[player(12),opt],[raw,{...opt,direction:'east'}],[raw,{...opt,direction:'north'}],[raw,{...opt,consumer:'portrait'}],
    [raw,{...opt,weaponless:true}],[raw,{...opt,action:'idle'}]])assert(!api.select(u,o)?.ownedDaggersSouth);
  const assets=new Map(await Promise.all(native.requiredFiles(own).map(async f=>[f,await load(f).catch(e=>{throw Error(f,{cause:e})})]))),mat=[];
  for(let i=0;i<9;i++){
   const [a,b,g,f,,p]=native.requiredFiles(own,{frame:i}).map(x=>raster(assets.get(x)));
   mat.push({a,b,g,f,p});
  }
  for(const tone of palettes){
   const actor=player(item,tone),snapshot=JSON.stringify(actor),route=api.select(actor,opt);assert(route?.ownedDaggersSouth);
   const ready=await api.prepareConfiguration([{player:actor,source:route,options:opt}],{resolve:v=>v});let limb=0,metal=0,cloth=0,eyes=0,hair=0;
   try{for(let k=0;k<9;k++){
    let w;assert(ready.draw({save(){},restore(){},drawImage(y){w=y}},actor,{...opt,progress:(k+.25)/9}));
    const frame=pix(w),{a,b,g,f,p}=mat[k];let changed=0;
    for(let j=0;j<a.length;j+=4){
     assert.equal(frame[j+3],a[j+3]);const diff=a.readUInt32LE(j)!==frame.readUInt32LE(j);
     if(diff){
      changed++;assert((b[j+3]>0&&g[j+3]<255&&f[j+3]<255)||f[j+3]>0,'no pixel may change outside the authored body/foreground');
      if(f[j+3]===255)limb++;
     }
     if(g[j+3]===255&&!f[j+3]){assert(!diff);metal++;}
     if(hairMask[j]&&!g[j+3]&&!f[j+3]){
      const v=parseInt(A.hairs.black.ramp[hairMask[j]-1].slice(1),16);
      assert.deepEqual([...frame.subarray(j,j+4)],[v>>>16,(v>>>8)&255,v&255,a[j+3]]);
      hair++;
     }
     if((p[j+3]===255&&b.readUInt32LE(j)===p.readUInt32LE(j)&&!f[j+3])||(p[j+3]===255&&f.readUInt32LE(j)===p.readUInt32LE(j))){assert(!diff);cloth++;}
    }
    assert(changed>1500);
    for(const [x,y,R,G,B,av,t]of ir){
     const j=(y*640+x)*4,h=parseInt(A.eyes.blue.ramp[t-1].slice(1),16),rgb=[h>>>16,(h>>>8)&255,h&255];
     if(!g[j+3]&&!f[j+3]){assert.deepEqual([...frame.subarray(j,j+4)],[...rgb,av]);eyes++;}
     if(g[j+3]===255&&!f[j+3])assert.equal(frame.readUInt32LE(j),a.readUInt32LE(j));
    }
   }
   assert(limb>100&&metal>100&&cloth>1000&&eyes>150&&hair>30_000);assert.equal(JSON.stringify(actor),snapshot);
   console.log(item,tone,'9@12',JSON.stringify({limb,metal,cloth,eyes,hair}));
   }finally{ready.release();}global.gc?.();
  }
 }
 console.log('PASS dagger own source, preserved matte order, hidden iris, cloth, and all saved attacks',actors,palettes.length);
})().catch(e=>{console.error(e);process.exitCode=1});
