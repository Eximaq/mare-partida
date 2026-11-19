const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=__dirname,get=f=>fs.readFileSync(p.join(R,f));
vm.runInThisContext(get('tools/rework-accessories/vendor.js').toString());
for(const [g,f] of Object.entries({MareReworkBaseHD:'player-rework-base-hd',MareFemaleNamedHairHD:'player-rework-female-named-hair-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkModularOutfitsHD:'player-rework-modular-outfits-hd',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets',MareCharacterAppearance:'character-appearance',MareReworkEyeStylesHD:'player-rework-eye-styles-hd',MareHeadgear:'headgear-visibility',MareOriginalHairHelmetsHD:'player-rework-original-hair-helmets-hd',MareNativeSkinHD:'player-rework-skin-hd'}))global[g]=require(p.join(R,f+'.js'));
let v=vm.createContext({MareTorso96:{},MareCharacterAppearance:global.MareCharacterAppearance});
vm.runInContext(get('tools/paper-doll-96-v3/appearance.js').toString(),v);global.MareAppearance96=v.MareAppearance96;

const {test}=require('node:test'),{createCanvas}=require('@napi-rs/canvas');
const newFile=p.join(R,'player-rework-native-hd.js');
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R), memo=new Map();
const loadImage=f=>{if(!memo.has(f))memo.set(f,load(f));return memo.get(f);};
const options={fetchJSON:async f=>JSON.parse(get(f)),loadImage,makeCanvas:createCanvas};
const api=require(newFile).create(options);
const bootIds=[8,9,134,141,148,155,162,169,176,183],o={action:'walk',direction:'south',consumer:'world'};
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

const crypto=require('node:crypto'), historical=require('./female-south-walk-control-hashes.json');
test('all ten female C151 boots use only their own layers throughout the South walking clock',async()=>{
 await api.ready;
 // Verify the three bare-leg profiles and preserve historical pants with G152.
 // New boot-and-pants contacts are held until the hems are verified separately.
 const cases=[{profile:0},{profile:1},{profile:2},{profile:0,pants:21},{profile:2,pants:133},...[147,161,168,175,182].map(pants=>({profile:1,pants}))];
 let frameCount=0;
 for(const {profile,pants} of cases){
  const make=id=>{const p=player(profiles[profile],id);if(pants!=null)Object.assign(p.equipment,{legs:{def:pants},gloves:{def:152}});return p;};
  const p0=make(null),empty=await bundle(api,p0),baseHash=crypto.createHash('sha256');
  const bareFrames=Array.from({length:40},(_,i)=>{const data=frame(empty,p0,i);baseHash.update(data);return data;});
  assert.equal(baseHash.digest('hex'),historical.groups[`${profile}:${pants??'none'}`].bare);
  empty.release();
  const ids=pants==null?bootIds:[155];
  for(const id of ids){
   const p=make(id),original=JSON.stringify(p),r=api.selectVisual(p,o),q=await bundle(api,p);
   assert.equal(r.hdKind,'authored-pants');
   assert.deepEqual(r.equipment,{coat:151,boots:id,...(pants!=null?{legs:pants,gloves:152}:{})});
   assert.equal(r.authoredPantsLayer.layers.filter(l=>l.slot==='boots').length,4);
   const masks=[];
   for(let m=0;m<10;m++){
     const mask=createCanvas(512,512),cx=mask.getContext('2d');
     for(const l of r.authoredPantsLayer.layers.filter(l=>l.slot==='boots'))cx.drawImage(await imageFor(l.frames[m]),0,0);
     masks.push(rgba(mask));
   }
   const h=id===155?crypto.createHash('sha256'):null;
   for(let i=0;i<40;i++){
     const img=frame(q,p,i),bare=bareFrames[i],mask=masks[r.authoredPantsLayer.spec.frameToPhase[i]];
     h?.update(img);
     let changed=0;
     for(let j=0;j<mask.length;j+=4)if(!eq(img,bare,j)){assert(mask[j+3],`non-boot pixel changed: ${id}/${pants}/${i}`);changed++;}
     assert(changed>0);frameCount++;
   }
   if(h)assert.equal(h.digest('hex'),historical.groups[`${profile}:${pants??'none'}`][155]);
   assert.equal(JSON.stringify(p),original);
   q.release();
  }
 }
 assert.equal(frameCount,1480);
 const hem=player(profiles[2],9,{legs:{def:133},gloves:{def:152}});
 assert.notEqual(api.selectVisual(hem,o)?.hdKind,'authored-pants','no unverified boot at a trouser hem');
});
