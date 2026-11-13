const {test}=require('node:test');const assert=require('node:assert/strict');
test('normal save uses replacement without changing equipment or appearance',()=>{const api=require('./player-rework-default-hd.js');const original={appearance96:{gender:'masculino',skinColor:'light',hairColor:'black'},equipment:{weapon:{def:4},coat:{def:6}}};const before=JSON.stringify(original);const native={select:p=>Object.keys(p.equipment).length===0,draw:()=>true,snapshot:()=>({last:{state:'rendered',physicalScale:105/374}})};const renderer=api.create({native});assert.equal(renderer.draw({},original,{action:'idle',direction:'south'}),true);assert.equal(JSON.stringify(original),before);assert.equal(renderer.snapshot().last.state,'rendered');assert.deepEqual(renderer.snapshot().last.unrepresentedSlots,['weapon','coat']);});

const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cv=require('@napi-rs/canvas');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'tools/rework-accessories/vendor.js'),'utf8'));
global.MareReworkBaseHD=require('./player-rework-base-hd.js');
global.MareFemaleNamedHairHD=require('./player-rework-female-named-hair-hd.js');
global.MareReworkWeaponNativeHD=require('./player-rework-weapon-native-hd.js');
global.MareReworkFemaleEquipmentHD=require('./player-rework-female-equipment-hd.js');
global.MareReworkHead=require('./player-rework-head-family.js');
global.MareNativeHeadCompat=require('./native-head-compat.js');
global.MareReworkModularOutfitsHD=require('./player-rework-modular-outfits-hd.js');
global.MareReworkWeaponCarryHD=require('./player-rework-weapon-carry-hd.js');
global.MareReworkOutfitOverlayHD=require('./player-rework-outfit-overlay-hd.js');
global.MareReworkOutfitCarryOverlayHD=require('./player-rework-outfit-carry-overlay-hd.js');
const {create}=require('./player-rework-native-hd.js');
global.MareReworkZip=require('./player-rework-zip.js');global.MareReworkHDAssets=require('./player-rework-hd-assets.js');
const make=()=>create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(__dirname,p))),loadImage:require('./tools/rework-hd-test-loader.cjs').create(__dirname),makeCanvas:cv.createCanvas});

test('real starter saves render base rework at native source dimensions, all directions and actions',async()=>{
 const native=make();await native.ready;let requested;const renderer=require('./player-rework-default-hd.js').create({native:{select:(...a)=>native.select(...a),snapshot:()=>native.snapshot(),draw:(ctx,p,o)=>{requested=[p,o];return native.draw(ctx,p,o);}}});
 for(const gender of ['masculino','feminino'])for(const id of [0,4,2]){const p={appearance96:{gender,hairStyle:'original',hairColor:'black',skinColor:'light',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:id},coat:{def:6}}},before=JSON.stringify(p);
 for(const action of ['idle','walk','attack'])for(const direction of ['south','north','east','west']){const o={action,direction,x:150,y:180,time:0},canvas=cv.createCanvas(300,300),ctx=canvas.getContext('2d');renderer.draw(ctx,p,o);
 const candidate={...p,appearance96:{gender:gender==='feminino'?'female':'male',body:gender==='feminino'?'female':'male',hairStyle:'original',hair:'original',hairColor:'original',skinColor:'original',skin:'original',eyeStyle:'original',face:'original',eyeColor:'original'},equipment:{}};
 assert(await native.prepare(...requested));renderer.draw(ctx,p,o);assert.equal(renderer.snapshot().last.state,'rendered');assert.equal(renderer.snapshot().last.physicalScale,105/374);assert.equal(renderer.snapshot().last.sourceScale,1);assert.equal(JSON.stringify(p),before);
 }
 }
});
