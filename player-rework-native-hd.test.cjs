const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cv=require('@napi-rs/canvas');
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'tools/rework-accessories/vendor.js'),'utf8'));
global.MareReworkBaseHD=require('./player-rework-base-hd.js');
global.MareReworkWeaponNativeHD=require('./player-rework-weapon-native-hd.js');
global.MareReworkHead=require('./player-rework-head-family.js');
global.MareNativeHeadCompat=require('./native-head-compat.js');
global.MareReworkModularOutfitsHD=require('./player-rework-modular-outfits-hd.js');
global.MareReworkWeaponCarryHD=require('./player-rework-weapon-carry-hd.js');
global.MareReworkOutfitOverlayHD=require('./player-rework-outfit-overlay-hd.js');
global.MareReworkOutfitCarryOverlayHD=require('./player-rework-outfit-carry-overlay-hd.js');
const {create}=require('./player-rework-native-hd.js');
global.MareReworkZip=require('./player-rework-zip.js');global.MareReworkHDAssets=require('./player-rework-hd-assets.js');
const make=()=>create({fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(__dirname,p))),loadImage:require('./tools/rework-hd-test-loader.cjs').create(__dirname),makeCanvas:cv.createCanvas});
test('normal provider outputs original physical raster 1:1 and physical pivot',async()=>{
 const api=make(),player={appearance96:{body:'male',hair:'hair-cropped'}},o={action:'idle',direction:'south',time:0,x:400,y:650};
 assert.equal(await api.prepare(player,o),true);const calls=[],canvas=cv.createCanvas(800,800),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);draw(...args);};assert(api.draw(ctx,player,o));
 assert.equal(calls.length,1);assert.equal(calls[0].length,3);assert.equal(calls[0][0].width,512);assert.equal(calls[0][0].height,512);assert.equal(api.snapshot().last.physicalScale,1);assert.equal(calls[0][1],400-api.snapshot().last.pivot.x);
 const source=calls[0][0],expected=source.getContext('2d').getImageData(0,0,512,512).data,actual=ctx.getImageData(calls[0][1],calls[0][2],512,512).data;assert.deepEqual(actual,expected);
});
test('does not substitute unknown cosmetic identities or hide equipped objects',async()=>{
 const api=make();await api.ready;const o={action:'idle',direction:'south'};
 for(const player of [{appearance96:{hair:'hair-not-a-real-style'}},{appearance96:{hair:'hair-cropped',eyeColor:'green'}},{appearance96:{hair:'hair-cropped'},equipment:{weapon:{def:115}}},{appearance96:{hair:'hair-cropped'},equipment:{coat:{def:151}}},{appearance96:{hair:'hair-cropped'},zoanTransformed:true}])assert.equal(api.select(player,o),null);
});
test('all supported calls render from runtime instead of legacy head-only bridge',async()=>{
 const api=make(),index=JSON.parse(fs.readFileSync(path.join(__dirname,'tools/rework-base-hd/index.json')));let count=0;
 for(const r of index.records){const player={appearance96:{body:r.body,hair:r.hairStyle}},o={action:r.action,direction:r.direction,x:512,y:768};assert(await api.prepare(player,o),r.id);const canvas=cv.createCanvas(1024,1024);assert(api.draw(canvas.getContext('2d'),player,o),r.id);assert.equal(api.snapshot().last.width,r.pack.frame.width*4);count++;}assert(count>=99);
});

test('equipped109 actual provider preserves640 and authored48ticks',async()=>{const api=make(),player={equipment:{weapon:{def:109}},appearance96:{body:'male',hair:'original'}},o={action:'attack-unarmed',direction:'south',progress:.5,x:512,y:768};assert(await api.prepare(player,o));const c=cv.createCanvas(1024,1024);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);assert.equal(api.snapshot().last.physicalScale,1);});

test('real save schema gender/hairStyle is read without losing female identity',async()=>{const api=make();await api.ready;const r=api.select({appearance96:{gender:'feminino',hairStyle:'hair-cropped'}},{action:'idle',direction:'north'});assert(r);assert.equal(r.body,'female');assert.equal(r.hairStyle,'cropped');});
test('real saved palettes render at native size without changing source dimensions',async()=>{
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{const api=make(),player={appearance96:{version:1,gender:'feminino',hairStyle:'hair-cropped',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'ebony'}},o={action:'idle',direction:'south',x:400,y:700};assert(await api.prepare(player,o));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,512);assert.equal(player.appearance96.gender,'feminino');}finally{delete global.MareAppearance96;}
});
test('small portrait allocates a scrollable native viewport rather than shrinking or cutting raster',async()=>{
 const api=make(),player={appearance96:{hair:'hair-cropped'}},o={action:'idle',direction:'south',preview:true};assert(await api.prepare(player,o));const c=cv.createCanvas(72,80);assert(api.draw(c.getContext('2d'),player,o));assert(c.width>=512);assert(c.height>=560);assert.equal(api.snapshot().last.physicalScale,1);
});

test('dynamic selected hair is composed on compatible HD body after exact head-source proof',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'hair-cropped'}},o={action:'attack-unarmed',direction:'south',progress:.3,x:400,y:700};assert(await api.prepare(player,o),JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);assert.equal(api.snapshot().last.physicalScale,1);});

test('stable world gate refuses partial weapon family rather than alternating legacy and HD',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{weapon:{def:115}}};assert.equal(await api.prepareFamily(player),false);const c=cv.createCanvas(800,800);assert.equal(api.drawStable(c.getContext('2d'),player,{action:'attack-unarmed',direction:'south'}),false);assert.match(api.snapshot().last.reason,/Incomplete native family/);});

test('complete native male original family stays HD while a different action loads',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeColor:'blue',eyeStyle:'original'}},o={action:'idle',direction:'south',x:400,y:700};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));assert(await api.prepare(player,o));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o));assert(api.drawStable(c.getContext('2d'),player,{...o,action:'walk',direction:'north'}));assert.equal(api.snapshot().last.state,'holding-native-while-loading');}finally{delete global.MareAppearance96;}});

test('M133 original isolated pants are consumed by real provider, not a baked body fallback',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{legs:{def:133}}},o={action:'walk',direction:'south',time:.25,x:400,y:700};assert(await api.prepare(player,o),JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.physicalScale,1);assert.equal(api.snapshot().last.width,512);});

test('109 equipped real-save family supports idle walk attack across all directions without legacy substitution',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeColor:'blue',eyeStyle:'original'},equipment:{weapon:{def:109}}};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east','west']){const o={action,direction,time:.2,progress:.3,x:400,y:700};assert(await api.prepare(player,o),action+'/'+direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.physicalScale,1);}}finally{delete global.MareAppearance96;}});

test('109 plus133 uses identity-checked isolated overlay in real attack provider',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{weapon:{def:109},legs:{def:133}}};for(const direction of ['south','north','east','west']){const o={action:'attack-unarmed',direction,progress:.4,x:400,y:700};assert(await api.prepare(player,o),direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);}});

test('109+133 complete candidate family is connected with real save fields and null equipment slots',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:109},legs:{def:133},coat:null,head:null,boots:null,gloves:null}};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east','west']){const o={action,direction,time:.4,progress:.4,x:400,y:700};assert(await api.prepare(player,o),action+'/'+direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o),JSON.stringify(api.snapshot()));assert.equal(api.snapshot().last.physicalScale,1);}}finally{delete global.MareAppearance96;}});

test('palette startup race does not permanently reject a compatible family',async()=>{delete global.MareAppearance96;const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light'}};assert.equal(await api.prepareFamily(player),false);global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{assert.equal(await api.prepareFamily(player),true);}finally{delete global.MareAppearance96;}});
