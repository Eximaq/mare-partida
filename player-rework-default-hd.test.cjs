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
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');const native=make();await native.ready;let requested;const renderer=require('./player-rework-default-hd.js').create({native:{select:(...a)=>native.select(...a),snapshot:()=>native.snapshot(),draw:(ctx,p,o)=>{requested=[p,o];return native.draw(ctx,p,o);}}});
 for(const gender of ['masculino','feminino'])for(const id of [0,4,2]){const p={appearance96:{gender,hairStyle:'original',hairColor:'black',skinColor:'light',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:id},coat:{def:6}}},before=JSON.stringify(p);
 for(const action of ['idle','walk','attack'])for(const direction of ['south','north','east','west']){const o={action,direction,x:150,y:180,time:0},canvas=cv.createCanvas(300,300),ctx=canvas.getContext('2d');renderer.draw(ctx,p,o);
 const candidate={...p,appearance96:{gender:gender==='feminino'?'female':'male',body:gender==='feminino'?'female':'male',hairStyle:'original',hair:'original',hairColor:'original',skinColor:'original',skin:'original',eyeStyle:'original',face:'original',eyeColor:'original'},equipment:{}};
 assert(await native.prepare(...requested));renderer.draw(ctx,p,o);assert.equal(renderer.snapshot().last.state,'rendered');assert.equal(renderer.snapshot().last.physicalScale,105/374);assert.equal(renderer.snapshot().last.sourceScale,1);assert.equal(JSON.stringify(p),before);
 }
 }
});

test('preview loading does not report readiness and stop portrait retries',()=>{
 let rendered=false;const context={URL,URLSearchParams,console,fetch:()=>new Promise(()=>{}),MareReworkNativeHD:{create:()=>({draw:()=>false})},MareReworkDefaultHD:{create:()=>({draw:()=>true,snapshot:()=>({last:{state:rendered?'rendered':'loading'}})})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'paper-doll-96-lobby.js'),'utf8'),context);
 const runtime=context.MarePaperDoll96Lobby.create({baseURL:'http://localhost/'}),ctx={canvas:{width:256,height:256}};
 assert.equal(runtime.preview(ctx,{equipment:{weapon:{def:0}}}),false);rendered=true;assert.equal(runtime.preview(ctx,{equipment:{weapon:{def:0}}}),true);
});

test('explicit visual preparation loads every current attack frame without mutating save',async()=>{
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');const native=make(),renderer=require('./player-rework-default-hd.js').create({native});
 for(const gender of ['masculino','feminino']){
 const p={appearance96:{gender,hairStyle:'original',hairColor:'black',skinColor:'light'},equipment:{weapon:{def:2},coat:{def:6}}},before=JSON.stringify(p),o={action:'attack',direction:'east',x:150,y:180};
 assert(await renderer.prepare(p,o));
 const canvas=cv.createCanvas(300,300),ctx=canvas.getContext('2d'),frames=new Set();
 for(let i=0;i<16;i++){ctx.clearRect(0,0,300,300);renderer.draw(ctx,p,{...o,progress:i/16});const s=renderer.snapshot().last;assert.equal(s.state,'rendered',JSON.stringify({i,s,diag:native.snapshot()}));assert.equal(s.sourceScale,1);frames.add(s.frame);assert(ctx.getImageData(0,0,300,300).data.some((v,j)=>j%4===3&&v));}
 assert(frames.size>1);assert.equal(JSON.stringify(p),before);
 }
});

test('original-appearance bare fallback pixels equal independent authored pack composition at world scale',async()=>{
 const native=make(),renderer=require('./player-rework-default-hd.js').create({native}),index=JSON.parse(fs.readFileSync('tools/rework-base-hd/index.json')),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
 for(const gender of ['masculino','feminino'])for(const action of ['idle','walk'])for(const direction of ['south','north','east','west']){
  const p={appearance96:{gender,hairStyle:'original',eyeStyle:'unsupported-eye-style',skinColor:'original',hairColor:'original'},equipment:{weapon:{def:999999}}},r=index.records.find(r=>r.body===(gender==='feminino'?'female':'male')&&r.action===action&&r.direction===direction&&r.hairStyle==='original'),pack=r.pack,d=pack.directions[direction];
  assert(await renderer.prepare(p,{action,direction}));
  for(let frame=0;frame<d.clip.frames;frame++){
   const images=new Map();for(const l of d.layers){const sha=l.frames?.[frame]||l.source;if(sha&&!images.has(sha))images.set(sha,await load('tools/rework-base-hd/assets/'+sha+'.png'));}
   const source=cv.createCanvas(pack.frame.width*pack.density,pack.frame.height*pack.density);ReworkAccessoryVendor.compositor.render(source.getContext('2d'),pack,images,{direction,frame,density:pack.density});let image=source;
   if(r.mirrorX){image=cv.createCanvas(source.width,source.height);const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.translate(source.width,0);c.scale(-1,1);c.drawImage(source,0,0);}
   const expected=cv.createCanvas(512,512),ctx=expected.getContext('2d'),scale=105/374;ctx.imageSmoothingEnabled=false;ctx.drawImage(image,256-pack.pivot.x*pack.density*scale,400-pack.pivot.y*pack.density*scale,source.width*scale,source.height*scale);
   const actual=cv.createCanvas(512,512);renderer.draw(actual.getContext('2d'),p,{action,direction,progress:(frame+.25)/d.clip.frames,x:256,y:400});assert.equal(renderer.snapshot().last.frame,frame);assert.equal(require('node:crypto').createHash('sha256').update(actual.getContext('2d').getImageData(0,0,512,512).data).digest('hex'),require('node:crypto').createHash('sha256').update(expected.getContext('2d').getImageData(0,0,512,512).data).digest('hex'),`${gender}/${action}/${direction}/${frame}`);
  }
 }
});

test('fallback preserves the best source pixels and reports unsupported slots on both bodies',async()=>{
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');const native=make(),renderer=require('./player-rework-default-hd.js').create({native}),hash=c=>require('node:crypto').createHash('sha256').update(c.getContext('2d').getImageData(0,0,512,512).data).digest('hex');await native.ready;
 for(const gender of ['masculino','feminino'])for(const action of ['idle','walk'])for(const direction of ['south','north','east','west']){
 const p={appearance96:{gender,hairStyle:'hair-wavy',eyeStyle:'face-calm',skinColor:'dark',hairColor:'black'},equipment:{weapon:{def:9999},coat:{def:6}}},before=JSON.stringify(p),female=gender==='feminino',reference={appearance96:{...p.appearance96,eyeStyle:'original',skinColor:'original',hairColor:'original'},equipment:{coat:{def:6}}},o={action,direction,x:256,y:400};
 const source=native.select(reference,o);assert(source,'Explicit compatible reference must exist');assert.match(source.id,female?/female-torso6-.*:female-original-face:wavy:none/:/male-torso6-.*:head:hair-wavy:none/);assert(await renderer.prepare(p,o));assert(await native.prepareClip(reference,o));const count=source.pack.directions[direction].clip.frames;
 for(let frame=0;frame<count;frame++){const pose={...o,progress:(frame+.25)/count},expected=cv.createCanvas(512,512),actual=cv.createCanvas(512,512);assert(await native.prepare(reference,pose));assert(native.draw(expected.getContext('2d'),reference,pose));renderer.draw(actual.getContext('2d'),p,pose);const diagnostic=renderer.snapshot().last;assert.equal(diagnostic.source,source.id);assert.deepEqual(diagnostic.unrepresentedSlots,['weapon']);assert.equal(hash(actual),hash(expected),gender+'/'+action+'/'+direction+'/'+frame);}
 assert.equal(JSON.stringify(p),before);
 }
});
