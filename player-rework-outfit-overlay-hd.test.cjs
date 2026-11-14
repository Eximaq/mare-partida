const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),cv=require('@napi-rs/canvas');
const {adapt}=require('./player-rework-outfit-overlay-hd.js'),weapons=require('./tools/rework-weapon-layers-hd/index.json'),outfits=require('./tools/rework-modular-outfits-hd/index.json');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'tools/rework-accessories/vendor.js'),'utf8'));
const api=require('./player-rework-weapon-native-hd.js').create(weapons,{makeCanvas:cv.createCanvas}),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
const output=fs.mkdtempSync(require('node:os').tmpdir()+'/mare-hd-attack-');fs.mkdirSync(output,{recursive:true});
// Explicit original overlay cohort. Later equipped flat records are not compatible base rigs.
const originalOverlayCases=[
  {
    "weapon": "gauntlet109-south-native-layers",
    "outfit": "male-pants133-attack-unarmed-south-drawn8-candidate",
    "direction": "south",
    "frames": 7,
    "baseSHA256": "ae9f25a9f6982fe6ee02c08f1c323c228955d97c176c28958aca639fa6af0964",
    "clothSHA256": "8a93e44b2f1bc0abd95b342f31808776e5aa53db4c7d15a2c5975d8f2a20d0f5"
  },
  {
    "weapon": "gauntlet109-north-native-layers",
    "outfit": "male-pants133-attack-unarmed-north-drawn8-candidate",
    "direction": "north",
    "frames": 8,
    "baseSHA256": "7f084167add6b3feea3781fed355cec591ea20bb1465747cd8eb90b6316bb957",
    "clothSHA256": "0a8b4f5d31f846075182b02a8446890a3f3af738d43857213c86b26357e29787"
  },
  {
    "weapon": "gauntlet109-east-native-layers",
    "outfit": "male-pants133-attack-unarmed-east-drawn8-candidate",
    "direction": "east",
    "frames": 8,
    "baseSHA256": "1793a125ab0bbb85e7c1bd17b631d638287fb4cca4929cc4135166f42a5980e0",
    "clothSHA256": "d120b0bafabd0cde95d772f60014216696bdfbd077284ed6b6b82aafa34d4fa6"
  },
  {
    "weapon": "gauntlet109-west-native-layers",
    "outfit": "male-pants133-attack-unarmed-west-drawn8-candidate",
    "direction": "west",
    "frames": 8,
    "baseSHA256": "443626e677dcabda46b4a90b5730138d8c3a56606a74c91b4a7f269700b5f561",
    "clothSHA256": "843dc9fe52d55e421ab90068d22e06831349d1f355f732c1e1f5f3d1112378f2"
  }
];
test('109/133 exact body identity, immutable inputs and native rendering all approved states',async()=>{let count=0;for(const fixture of originalOverlayCases){const w=weapons.records.find(r=>r.id===fixture.weapon),o=outfits.records.find(r=>r.id===fixture.outfit);assert(w,fixture.weapon);assert(o,fixture.outfit);assert.equal(w.item,109);assert.equal(w.body,'male');assert.equal(w.direction,fixture.direction);assert.equal(w.states.length,fixture.frames);assert.equal(w.basePack.originalSHA256,fixture.baseSHA256);assert.equal(o.overlayContract.item,133);assert.equal(o.overlayContract.paddedSourceSHA256,fixture.clothSHA256);const before=JSON.stringify(w),r=adapt(w,o);assert(r,w.direction);assert.equal(JSON.stringify(w),before);const images=new Map();for(const f of new Set([...api.requiredFiles(r),...api.requiredFiles(w)])){images.set(f,await load(f));}
const sheet=cv.createCanvas(640*4,640*2),sx=sheet.getContext('2d');for(let frame=0;frame<r.states.length;frame++){const canvas=cv.createCanvas(640,640);api.render(canvas.getContext('2d'),r,images,{frame});assert.equal(canvas.width,640);const original=cv.createCanvas(640,640);api.render(original.getContext('2d'),w,images,{frame});const cloth=cv.createCanvas(640,640),cx=cloth.getContext('2d');cx.drawImage(images.get('tools/rework-modular-outfits-hd/assets/'+o.overlayContract.paddedSourceSHA256+'.png'),0,0);const mask=cx.getImageData(0,0,640,640).data,a=canvas.getContext('2d').getImageData(0,0,640,640).data,b=original.getContext('2d').getImageData(0,0,640,640).data;let outside=0;for(let k=0;k<a.length;k+=4)if(mask[k+3]===0)for(let ch=0;ch<4;ch++)if(Math.abs(a[k+ch]-b[k+ch])>6)outside++;assert.equal(outside,0,'Body outside pants preserved '+w.direction+frame);fs.writeFileSync(path.join(output,`${w.direction}-${frame}.png`),canvas.toBuffer('image/png'));sx.drawImage(canvas,(frame%4)*640,Math.floor(frame/4)*640);count++;}fs.writeFileSync(path.join(output,w.direction+'-contact.png'),sheet.toBuffer('image/png'));
const bad=JSON.parse(JSON.stringify(o));bad.overlayContract.bodyFrames[0]='0'.repeat(64);assert.equal(adapt(w,bad),null);
}assert.equal(count,31);});

test('later approved flat109 has no compatible basePack and must not receive the133 overlay',()=>{for(const direction of ['east','west']){const id='approved-lateral-male-109-151-'+direction,w=weapons.records.find(r=>r.id===id),o=outfits.records.find(r=>r.id==='male-pants133-attack-unarmed-'+direction+'-drawn8-candidate');assert(w,id);assert(o);assert.equal(w.basePack,undefined);const before=JSON.stringify(w);assert.equal(adapt(w,o),null);assert.equal(JSON.stringify(w),before);}});
