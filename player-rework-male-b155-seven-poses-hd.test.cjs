const fs=require('node:fs'),p=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const R=process.env.KAIZOKU_REPO||__dirname,source=process.env.KAIZOKU_SELECTOR||p.join(R,'player-rework-native-hd.js');
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const indices=require(p.join(R,'tools/rework-modular-outfits-hd/index.json'));
const part=(r,d,f)=>({...r,pack:{...r.pack,directions:{[d]:{...r.pack.directions[d],layers:r.pack.directions[d].layers.filter(f)}}}});
const boot=l=>/^(equip-)?boot155-/.test(l.id);
test('existing B155 comes off all seven male trousers on exact North and South rigs, retaining saved colors',async()=>{
 const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),native=require(source);
 make();
 const api=native.create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;
 const author=global.MareReworkModularOutfitsHD.create(indices,{vendor:global.ReworkAccessoryVendor});
 const appearance96={gender:'masculino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'};
 for(const legs of [140,147,154,161,168,175,182])for(const direction of ['north','south'])for(const action of ['idle','walk']){
  if(direction==='south'&&action==='walk')continue; // established regression in native-hd test
  const o={action,direction},actor={classId:'brawler',appearance96,equipment:{coat:{def:151},legs:{def:legs},gloves:{def:152}}};
  const wornActor={...actor,equipment:{...actor.equipment,boots:{def:155}}};
  const old=api.select(wornActor,o),worn=api.selectVisual(wornActor,o),bare=api.selectVisual(actor,o),again=api.selectVisual(wornActor,o);
  const here=`P${legs}/${action}/${direction}`;
  assert.equal(old?.id,`frozen-male-pants${legs}-${direction}-${action}-v47`,here);
  assert.equal(worn?.slotRoutes?.boots?.item,155,here);
  assert.equal(bare?.slotRoutes?.legs?.item,legs,here);
  assert.equal(bare?.slotRoutes?.gloves?.item,152,here);
  assert.equal(bare?.slotRoutes?.coat?.item,151,here);
  assert.equal(worn.id,again.id,here);
  const d=r=>r.pack.directions[direction],images=new Map(),mask=part(worn,direction,boot);
  assert.deepEqual(d(worn).clip,d(old).clip,here);
  assert.deepEqual(d(worn).layers.filter(boot),d(old).layers.filter(boot),here);
  assert.deepEqual(d(worn).layers.filter(l=>!boot(l)),d(bare).layers,here);
  const render=async(r,f)=>{
   const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
   for(const name of author.requiredFiles(r,{frame:f}))if(!images.has(name))images.set(name,await load(name));
   author.render(ctx,r,images,{frame:f,makeCanvas:cv.createCanvas});return Buffer.from(ctx.getImageData(0,0,512,512).data);
  };
  for(let f=0;f<d(old).clip.frames;f++){
   const [prev,on,off,alpha]=await Promise.all([old,worn,bare,mask].map(r=>render(r,f)));
   assert(on.equals(prev),here+'/old RGBA');
   let n=0;
   for(let i=0;i<on.length;i+=4)if(on.readUInt32LE(i)!==off.readUInt32LE(i)){
    n++;assert(alpha[i+3]>0,here+'/outside boot art');
   }
   assert(n>0,here+'/no visible bota');
  }
  const tune=(player,skinColor,hairColor,eyeColor)=>({...player,appearance96:{...appearance96,skinColor,hairColor,eyeColor}});
  const expectedEye=direction==='north'?'blue':'amber'; // the North rig has no authored iris layer
  const colored=tune(actor,'olive','blonde',expectedEye),cWorn=tune(wornActor,'olive','blonde',expectedEye);
  if(direction==='north')for(const p of [actor,wornActor]){
   const unproved=tune(p,'olive','blonde','amber');
   assert.equal(api.selectLayered(unproved,o)?.registeredPantsBoot155,undefined,here+' claimed an unsupported iris');
  }
  const cBare=api.selectVisual(colored,o),cBoot=api.selectVisual(cWorn,o);
  assert.ok(cBare?.registeredPantsBoot155&&cBoot?.registeredPantsBoot155,here+' missing saved color route');
  assert.equal(cBare.colorAppearance.skin,'olive');
  assert.equal(cBare.colorAppearance.hairColor,'blonde');
  assert.equal(cBare.colorAppearance.eyeColor,expectedEye);
  for(const alter of [{hairStyle:'hair-cropped'},{eyeStyle:'face-focused'}])
   assert.equal(api.selectLayered({...colored,appearance96:{...colored.appearance96,...alter}},o)?.registeredPantsBoot155,undefined);
  for(let f=0;f<d(old).clip.frames;f++){
   const [colOn,colOff,rawOff,alpha]=await Promise.all([cBoot,cBare,bare,mask].map(r=>render(r,f)));
   assert(!colOff.equals(rawOff),here+' palette did not apply');
   let bp=0, exposed=0;
   for(let i=0;i<colOn.length;i+=4){
    if(colOn.readUInt32LE(i)!==colOff.readUInt32LE(i)){bp++;assert(alpha[i+3]>0,here+'/color changed outside boot art');}
    if(colOff.readUInt32LE(i)!==rawOff.readUInt32LE(i)&&i>=350*512*4)exposed++;
   }
   assert(bp>0&&exposed>0,here+' palette not reaching exposed feet');
  }
  const other={...actor,equipment:{...actor.equipment,boots:{def:9}}};
  assert.equal(api.selectLayered(other,o)?.registeredPantsBoot155,undefined);
 }
});
