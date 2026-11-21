const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=__dirname,get=f=>fs.readFileSync(p.join(R,f));
vm.runInThisContext(get('tools/rework-accessories/vendor.js').toString());
for(const [g,f] of Object.entries({MareReworkBaseHD:'player-rework-base-hd',MareFemaleNamedHairHD:'player-rework-female-named-hair-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkModularOutfitsHD:'player-rework-modular-outfits-hd',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets',MareCharacterAppearance:'character-appearance',MareReworkEyeStylesHD:'player-rework-eye-styles-hd',MareHeadgear:'headgear-visibility',MareOriginalHairHelmetsHD:'player-rework-original-hair-helmets-hd',MareNativeSkinHD:'player-rework-skin-hd'}))global[g]=require(p.join(R,f+'.js'));
let v=vm.createContext({MareTorso96:{},MareCharacterAppearance:global.MareCharacterAppearance});
vm.runInContext(get('tools/paper-doll-96-v3/appearance.js').toString(),v);global.MareAppearance96=v.MareAppearance96;

const {test}=require('node:test'),{createCanvas}=require('@napi-rs/canvas');
const newFile=p.join(R,'player-rework-native-hd.js');
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R), memo=new Map();
const loadImage=f=>{if(!memo.has(f))memo.set(f,load(f));const x=memo.get(f);memo.delete(f);memo.set(f,x);if(memo.size>48)memo.delete(memo.keys().next().value);return x;};
const options={fetchJSON:async f=>JSON.parse(get(f)),loadImage,makeCanvas:createCanvas};
const api=require(newFile).create(options);
const o={action:'walk',direction:'south',consumer:'world'};
const imageFor=h=>loadImage('tools/rework-modular-outfits-hd/assets/'+h+'.png');
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const eq=(a,b,i)=>a.readUInt32LE(i)===b.readUInt32LE(i);
const player=(appearance,boots,extra={})=>({classId:'brawler',appearance96:appearance,equipment:{coat:{def:151},...(boots==null?{}:{boots:{def:boots}}),...extra}});
const raw={gender:'feminino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'};
const profiles=[raw,global.MareCharacterAppearance.normalize({gender:'feminino'}),global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:'olive',hairColor:'blonde',eyeColor:'amber'})];
const bundle=async (api,p)=>api.prepareConfiguration([{player:p,options:o}],{resolve:pose=>({...pose,source:api.selectVisual(pose.player,pose.options)})});
const frame=(q,p,i)=>{
 let capture;
 const draw={save(){},restore(){},drawImage(x){capture=x;}};
 assert(q.draw(draw,p,{...o,progress:(i+.25)/40}));assert(capture);return rgba(capture);
};


const ticks=40,starts=[0,5,10,15,18,20,25,30,35,38],startSet=new Set(starts),{createHash}=require('node:crypto');
const createPlayer=(skinColor,gloves,id,legs=168)=>{
 const look=global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairColor:'blonde',eyeColor:'amber'});
 return player(look,id,{legs:{def:legs},...(gloves?{gloves:{def:152}}:{})});
};
const renderLoop=async (m,p)=>{
 const q=await bundle(m,p),frames=[],hash=createHash('sha256');
 try{
  assert.equal(q.coverage[0].frames,ticks);
  let held;
  for(let i=0;i<ticks;i++){
   const pixels=frame(q,p,i);hash.update(pixels);
   if(startSet.has(i)){held=pixels;frames[i]=pixels;}
   else assert(pixels.equals(held),'authored hold must repeat its contact phase');
  }
  return {frames,hash:hash.digest('hex')};
 }finally{q.release();}
};
test('P168 plus B9/B176 in South walk preserves C151, custom palette, timing, and optional G152',async()=>{
 await api.ready;
 const before=process.env.KAIZOKU_PRIOR?require(process.env.KAIZOKU_PRIOR).create(options):null;
 if(before)await before.ready;
 for(const gloves of [false,true]){
  const sets={};
  for(const skin of ['porcelain','ebony']){
   const barePlayer=createPlayer(skin,gloves,null),oldPlayer=createPlayer(skin,gloves,155);
   const b=await renderLoop(api,barePlayer),h=await renderLoop(api,oldPlayer);
   const bare=b.frames,historical=h.frames;
   if(before){
    for(const [p,actual] of [[barePlayer,b],[oldPlayer,h]]){
     const previous=await renderLoop(before,p);
     assert.equal(previous.hash,actual.hash,'historical South source changed');
    }
   }
   const candidate={};
   for(const id of [9,176]){
    const p=createPlayer(skin,gloves,id),snapshot=JSON.stringify(p),r=api.selectVisual(p,o);
    assert.equal(r.hdKind,'authored-pants');assert.equal(r.pack.directions.south.clip.frames,ticks);
    assert.deepEqual(r.equipment,{coat:151,boots:id,legs:168,...(gloves?{gloves:152}:{})});
    const layers=r.authoredPantsLayer.layers.filter(l=>l.slot==='boots');
    assert.equal(layers.length,4);assert(layers.every(l=>l.id.startsWith('boot'+id+'-')));
    const masks=[];
    for(let m=0;m<10;m++){
     const c=createCanvas(512,512),cx=c.getContext('2d');
     for(const l of layers)cx.drawImage(await imageFor(l.frames[m]),0,0);
     masks.push(rgba(c));
    }
    const worn=(await renderLoop(api,p)).frames;
    for(const i of starts){
     const mask=masks[r.authoredPantsLayer.spec.frameToPhase[i]];
     let n=0;
     for(let k=0;k<mask.length;k+=4)if(!eq(worn[i],bare[i],k)){assert(mask[k+3],'P168 or other equipment changed outside boot');n++;}
     assert(n>0);
    }
    assert.equal(JSON.stringify(p),snapshot);
    candidate[id]=worn;
   }
   sets[skin]={bare,historical,candidate};
  }
  // A no-boot pixel that responds to skin color is part of exposed anatomy.
  // Compare opposite skin ramps at the ankle, not approximate skin colors.
  // B9/B176 add no solid-tint opening relative to B155. Quantized AA isolated
  // edge is bounded by 4 levels of 255, with the opaque cuff otherwise intact.
  const light=sets.porcelain, dark=sets.ebony;
  for(const id of [9,176])for(const i of starts){
   const a=light.candidate[id][i],b=dark.candidate[id][i];
   const gains=new Set();
   for(let y=303;y<512;y++)for(let x=100;x<400;x++){
    const k=(y*512+x)*4;
    const baseline=!eq(light.historical[i],dark.historical[i],k);
    const bare=!eq(light.bare[i],dark.bare[i],k);
    if(eq(a,b,k)||baseline)continue;
    assert(bare,'boot introduced new material carrying skin tint');
    assert(Math.max(Math.abs(a[k]-b[k]),Math.abs(a[k+1]-b[k+1]),Math.abs(a[k+2]-b[k+2]))<=4,'new visible skin at trouser hem');
    gains.add(k/4);
   }
   assert(gains.size<=(id===9?15:27),'new exposed area at trouser hem');
   // Eight-connected components catch a thin contiguous stripe even when each
   // pixel is faint. Accept isolated raster coverage only, not a cuff gap.
   for(const point of gains){
    const component=[point];gains.delete(point);
    for(let j=0;j<component.length;j++)for(const offset of [-513,-512,-511,-1,1,511,512,513]){
     const next=component[j]+offset;if(gains.delete(next))component.push(next);
    }
    assert(component.length<=(id===9?3:5),'new contiguous mark at trouser hem');
   }
  }
 }
 for(const p of [147,182])for(const id of [9,176])assert.notEqual(api.selectVisual(createPlayer('olive',true,id,p),o)?.authoredPantsLayer?.layers?.some(l=>l.slot==='boots'&&l.id.startsWith('boot'+id+'-')),true);
 for(const id of [8,134,141,148,162,169,183])assert.notEqual(api.selectVisual(createPlayer('olive',true,id),o)?.authoredPantsLayer?.layers?.some(l=>l.slot==='boots'&&l.id.startsWith('boot'+id+'-')),true);
});
