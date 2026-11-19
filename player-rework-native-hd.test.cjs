const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
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
test('normal provider keeps native raster and applies approved world scale around its physical pivot',async()=>{
 const api=make(),player={appearance96:{body:'male',hair:'hair-cropped'}},o={action:'idle',direction:'south',time:0,x:400,y:650};
 assert.equal(await api.prepare(player,o),true);const calls=[],canvas=cv.createCanvas(800,800),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);draw(...args);};assert(api.draw(ctx,player,o));
 assert.equal(calls.length,1);assert.equal(calls[0].length,5);assert.equal(calls[0][0].width,512);assert.equal(calls[0][0].height,512);assert.equal(api.snapshot().last.sourceScale,1);assert.equal(calls[0][1],400-api.snapshot().last.pivot.x*(105/374));
 const source=calls[0][0],expected=cv.createCanvas(800,800),ec=expected.getContext('2d');ec.imageSmoothingEnabled=false;ec.drawImage(source,400-256*(105/374),650-448*(105/374),512*(105/374),512*(105/374));assert.equal(require('node:crypto').createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex'),require('node:crypto').createHash('sha256').update(expected.toBuffer('image/png')).digest('hex'));
});
test('does not substitute unknown cosmetic identities or hide equipped objects',async()=>{
 const api=make();await api.ready;const o={action:'idle',direction:'south'};
 for(const player of [{appearance96:{hair:'hair-not-a-real-style'}},{appearance96:{hair:'hair-cropped',eyeColor:'green'}},{appearance96:{hair:'hair-cropped'},equipment:{weapon:{def:999}}},{appearance96:{hair:'hair-cropped'},equipment:{coat:{def:151}}},{appearance96:{hair:'hair-cropped'},zoanTransformed:true}])assert.equal(api.select(player,o),null);
});
test('all supported calls render from runtime instead of legacy head-only bridge',async()=>{
 const api=make(),index=JSON.parse(fs.readFileSync(path.join(__dirname,'tools/rework-base-hd/index.json')));let count=0;
 for(const r of index.records){const player={appearance96:{body:r.body,hair:r.hairStyle}},o={action:r.action,direction:r.direction,x:512,y:768};assert(await api.prepare(player,o),r.id);const canvas=cv.createCanvas(1024,1024);assert(api.draw(canvas.getContext('2d'),player,o),r.id);assert.equal(api.snapshot().last.width,r.pack.frame.width*4);count++;}assert(count>=99);
});

test('equipped109 actual provider preserves640 and authored48ticks',async()=>{const api=make(),player={equipment:{weapon:{def:109}},appearance96:{body:'male',hair:'original'}},o={action:'attack-unarmed',direction:'south',progress:.5,x:512,y:768};assert(await api.prepare(player,o));const c=cv.createCanvas(1024,1024);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);assert.equal(api.snapshot().last.sourceScale,1);});

test('real save schema gender/hairStyle is read without losing female identity',async()=>{const api=make();await api.ready;const r=api.select({appearance96:{gender:'feminino',hairStyle:'hair-cropped'}},{action:'idle',direction:'north'});assert(r);assert.equal(r.body,'female');assert.equal(r.femaleNamedHairRecord.style,'cropped');assert.equal(r.hairStyle,'original');});
test('real saved male palettes render at native size without changing source dimensions',async()=>{
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{const api=make(),player={appearance96:{version:1,gender:'masculino',hairStyle:'hair-cropped',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'ebony'}},o={action:'idle',direction:'south',x:400,y:700};assert(await api.prepare(player,o));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,512);assert.equal(player.appearance96.gender,'masculino');}finally{delete global.MareAppearance96;}
});
test('small portrait allocates a scrollable native viewport rather than shrinking or cutting raster',async()=>{
 const api=make(),player={appearance96:{hair:'hair-cropped'}},o={action:'idle',direction:'south',preview:true};assert(await api.prepare(player,o));const c=cv.createCanvas(72,80);assert(api.draw(c.getContext('2d'),player,o));assert(c.width>=512);assert(c.height>=560);assert.equal(api.snapshot().last.sourceScale,1);assert.equal(api.snapshot().last.physicalScale,1);
});

test('dynamic selected hair is composed on compatible HD body after exact head-source proof',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'hair-cropped'}},o={action:'attack-unarmed',direction:'south',progress:.3,x:400,y:700};assert(await api.prepare(player,o),JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);assert.equal(api.snapshot().last.sourceScale,1);});

test('stable world gate refuses uncovered weapon family rather than alternating legacy and HD',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{weapon:{def:999}}};assert.equal(await api.prepareFamily(player),false);const c=cv.createCanvas(800,800);assert.equal(api.drawStable(c.getContext('2d'),player,{action:'attack-unarmed',direction:'south'}),false);assert.match(api.snapshot().last.reason,/No compatible source for this pose/);});

test('complete native male original family stays HD while a different action loads',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeColor:'blue',eyeStyle:'original'}},o={action:'idle',direction:'south',x:400,y:700};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));assert(await api.prepare(player,o));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o));assert(api.drawStable(c.getContext('2d'),player,{...o,action:'walk',direction:'north'}));assert.equal(api.snapshot().last.state,'holding-native-while-loading');}finally{delete global.MareAppearance96;}});

test('M133 original isolated pants are consumed by real provider, not a baked body fallback',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{legs:{def:133}}},o={action:'walk',direction:'south',time:.25,x:400,y:700};assert(await api.prepare(player,o),JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.sourceScale,1);assert.equal(api.snapshot().last.width,512);});

test('109 equipped real-save family supports idle walk attack across all directions without legacy substitution',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeColor:'blue',eyeStyle:'original'},equipment:{weapon:{def:109}}};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east','west']){const o={action,direction,time:.2,progress:.3,x:400,y:700};assert(await api.prepare(player,o),action+'/'+direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.sourceScale,1);}}finally{delete global.MareAppearance96;}});

test('109 plus133 uses identity-checked isolated overlay in real attack provider',async()=>{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original'},equipment:{weapon:{def:109},legs:{def:133}}};for(const direction of ['south','north','east','west']){const o={action:'attack-unarmed',direction,progress:.4,x:400,y:700};assert(await api.prepare(player,o),direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.draw(c.getContext('2d'),player,o));assert.equal(api.snapshot().last.width,640);}});

test('109+133 complete candidate family is connected with real save fields and null equipment slots',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:109},legs:{def:133},coat:null,head:null,boots:null,gloves:null}};assert(await api.prepareFamily(player),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east','west']){const o={action,direction,time:.4,progress:.4,x:400,y:700};assert(await api.prepare(player,o),action+'/'+direction+JSON.stringify(api.snapshot()));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),player,o),JSON.stringify(api.snapshot()));assert.equal(api.snapshot().last.sourceScale,1);}}finally{delete global.MareAppearance96;}});

test('palette startup race does not permanently reject a compatible family',async()=>{delete global.MareAppearance96;const api=make(),player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'black',skinColor:'light'}};assert.equal(await api.prepareFamily(player),false);global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{assert.equal(await api.prepareFamily(player),true);}finally{delete global.MareAppearance96;}});

test('numeric equipment IDs cannot disappear into an unarmed native base',async()=>{const api=make();await api.ready;const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:999}};assert.equal(api.select(p,{action:'idle',direction:'south'}),null);});

test('orb17 has a complete native original-appearance family in the normal world',async()=>{const api=make();const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:17}}};assert.equal(await api.prepareFamily(p),true);for(const action of ['idle','walk','attack-focus'])for(const direction of ['north','south','east','west'])assert(api.select(p,{action,direction}),action+direction);});

test('orb122 has a complete native original-appearance world family',async()=>{const api=make();const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:122}}};assert.equal(await api.prepareFamily(p),true);});

test('rifle115 world activation requires an original-compatible SOUTH source',async()=>{const api=make();const p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:115}}};await api.ready;const south=api.select(p,{action:'attack-firearm',direction:'south'});assert.equal(await api.prepareFamily(p),!!south);if(south)assert.notEqual(south.id,'rifle115-v5-south-native-layers');});

test('rifle115 refuses a whole family whose baked attack hair is incompatible',async()=>{const api=make();assert.equal(await api.prepareFamily({appearance96:{body:'male',hair:'hair-cropped'},equipment:{weapon:{def:115}}}),false);});

test('world visual height follows HD alpha bounds at the approved display scale',async()=>{const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{}},o={action:'idle',direction:'south'};await api.prepareFamily(p);await api.prepare(p,o);const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),p,o));assert(api.height(p)>70&&api.height(p)<150);assert.equal(api.snapshot().last.sourceScale,1);});

test('gauntlet111 has a complete original-appearance native world family',async()=>{const api=make();assert.equal(await api.prepareFamily({appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:111}}}),true);});

test('real game generic attack/skill actions resolve native families instead of holding idle',async()=>{const api=make();await api.ready;for(const item of [0,109,17,122,111]){const p={appearance96:{body:'male',hair:'original'},equipment:item?{weapon:{def:item}}:{}};for(const action of ['attack','skill','cast']){const r=api.select(p,{action,direction:'south'});assert(r,`${item}/${action}`);if(item)assert.equal(r.item,item);else assert.equal(r.action,'attack-unarmed');}}});

test('numeric unknown helmets are not silently dropped from native appearance',async()=>{const api=make();await api.ready;const p={appearance96:{body:'male',hair:'original'},equipment:{head:999999}};assert.equal(api.select(p,{action:'idle',direction:'south'}),null);assert.equal(await api.prepareFamily(p),false);});

test('isolated pants133 and boots9 resolve a complete native family using saved equipment slots',async()=>{const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{legs:{def:133},boots:{def:9}}};assert(await api.prepareFamily(p),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack'])for(const direction of ['south','north','east','west']){const r=api.select(p,{action,direction});assert(r?.bootsOverlay,action+'/'+direction);assert.deepEqual(r.equipment,{pants:133,boots:9});}});

test('orb17 NORTH loads bounded frame dependencies and renders instead of endless loading',async()=>{const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:17}}};await api.ready;const o={action:'attack',direction:'north',progress:.5};const r=api.select(p,o),w=global.MareReworkWeaponNativeHD.create(JSON.parse(fs.readFileSync('tools/rework-weapon-layers-hd/index.json')),{makeCanvas:cv.createCanvas});assert(w.requiredFiles(r,{frame:4}).length<64);assert(await api.prepareFamily(p));assert(await api.prepare(p,o));const c=cv.createCanvas(800,800);assert(api.drawStable(c.getContext('2d'),p,o),JSON.stringify(api.snapshot()));assert.equal(api.snapshot().last.state,'rendered');});
test('unproven fused outfits never claim unsupported light palette without recoloring source',async()=>{const api=make();await api.ready;const p={appearance96:{body:'male',hair:'original',skinColor:'light'},equipment:{coat:{def:151},legs:{def:133},gloves:{def:152},boots:{def:134}}};assert.equal(api.select(p,{action:'idle',direction:'north'}),null);});

test('padded sword69 renders through actual provider with compensated physical pivot',async()=>{const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:69}}};assert(await api.prepareFamily(p),JSON.stringify(api.snapshot()));for(const action of ['idle','walk','attack']){const o={action,direction:'east',progress:.5,x:700,y:900};assert(await api.prepare(p,o));const c=cv.createCanvas(1400,1400);assert(api.drawStable(c.getContext('2d'),p,o),JSON.stringify(api.snapshot()));assert.equal(api.snapshot().last.width,1024);assert.equal(api.snapshot().last.sourceScale,1);assert(api.snapshot().last.pivot.x>=500);}});

test('native rendered cache keys include saved palette identity',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),p={appearance96:{body:'male',hair:'original',skinColor:'light',hairColor:'black'},equipment:{weapon:{def:109}}},o={action:'idle',direction:'south',x:400,y:700};assert(await api.prepareFamily(p));assert(await api.prepare(p,o));const a=cv.createCanvas(800,800);assert(api.drawStable(a.getContext('2d'),p,o));p.appearance96.hairColor='pink';assert(await api.prepareFamily(p));assert(await api.prepare(p,o));const b=cv.createCanvas(800,800);assert(api.drawStable(b.getContext('2d'),p,o));assert.notDeepEqual(a.getContext('2d').getImageData(0,0,800,800).data,b.getContext('2d').getImageData(0,0,800,800).data);}finally{delete global.MareAppearance96;}});

test('female111 family is actually wired through normal native provider without male aliases',async()=>{const api=make(),p={appearance96:{gender:'feminino',hairStyle:'original',skinColor:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original'},equipment:{weapon:{def:111}}};assert.equal(await api.prepareFamily(p),true);for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack']){const o={direction,action,progress:.4,x:400,y:650};const r=api.select(p,o);assert.equal(r.hdKind,'female-equipment');assert.equal(r.body,'female');assert.equal(await api.prepare(p,o),true);assert.equal(api.draw(cv.createCanvas(900,900).getContext('2d'),p,o),true);assert.equal(api.snapshot().last.sourceScale,1);}assert.equal(await api.prepareFamily({...p,appearance96:{...p.appearance96,skinColor:'light'}}),false);});

test('female cropped hair and ebony skin use the approved face material together',async()=>{global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');try{const api=make(),player={appearance96:{gender:'feminino',hairStyle:'hair-cropped',skinColor:'ebony',hairColor:'black'}},before=JSON.stringify(player),o={action:'idle',direction:'south',x:400,y:650};assert(await api.prepare(player,o));const c=cv.createCanvas(800,800).getContext('2d');assert(api.draw(c,player,o));assert.match(api.snapshot().last.source,/hair-cropped:none:ebony:black$/);assert.equal(JSON.stringify(player),before);}finally{delete global.MareAppearance96;}});

test('approved monster-scale draw reduces complete native composite with one foot-anchored transform',async()=>{
 const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{weapon:{def:109}}},o={action:'attack-unarmed',direction:'south',progress:0,x:420,y:610};
 assert(await api.prepare(p,o));const c=cv.createCanvas(900,800),ctx=c.getContext('2d'),calls=[],original=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);original(...args);};assert(api.draw(ctx,p,o));
 const info=api.snapshot().last,call=calls[0],scale=105/374;
 assert.equal(calls.length,1,'body and all equipment must share one final composite transform');
 assert.equal(call[0].width,640,'HD backing canvas remains native');assert.equal(call[0].height,640);
 assert.equal(call.length,5,'only final destination size is reduced');
 assert.equal(call[1],420-info.pivot.x*scale);assert.equal(call[2],610-info.pivot.y*scale);
 assert.equal(call[3],640*scale);assert.equal(call[4],640*scale);assert.equal(info.physicalScale,scale);
});
test('loading hold retains approved monster scale and scaled label height',async()=>{
 const api=make(),p={appearance96:{body:'male',hair:'original'},equipment:{}},o={action:'idle',direction:'south',x:400,y:600};
 assert(await api.prepareFamily(p));assert(await api.prepare(p,o));const c=cv.createCanvas(800,800),ctx=c.getContext('2d');assert(api.drawStable(ctx,p,o));const height=api.height(p);assert(height>70&&height<150,'visible world height matches ordinary monsters, not native HD pixels');
 const calls=[],original=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);original(...args);};assert(api.drawStable(ctx,p,{...o,action:'walk',direction:'north'}));assert.equal(api.snapshot().last.state,'holding-native-while-loading');assert.equal(calls[0][3],calls[0][0].width*105/374);assert.equal(api.height(p),height);
});

test('registered missing coat 6 keeps every native P133 punch frame and its appearance',async()=>{
 const prior={palette:global.MareAppearance96,appearance:global.MareCharacterAppearance,headgear:global.MareHeadgear};
 global.MareCharacterAppearance=require('./character-appearance.js');
 global.MareHeadgear=require('./headgear-visibility.js');
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{
  const api=make();await api.ready;
  const options={action:'attack-unarmed',direction:'south',consumer:'world'};
  for(const look of [{},{skinColor:'dark',hairColor:'pink'}]){
   const appearance96=global.MareCharacterAppearance.normalize({gender:'masculino',...look});
   const alone={classId:'brawler',appearance96,equipment:{legs:{def:133}}};
   const mixed={...alone,equipment:{...alone.equipment,coat:{def:6}}},saved=structuredClone(mixed);
   assert.equal(api.select(mixed,options),null,'strict selection remains strict');
   const source=api.selectLayered(mixed,options);
   assert.equal(source?.layeredPilot,true,JSON.stringify(api.snapshot()));
   assert.equal(api.selectLayered(mixed,{...options,direction:'north'}),null);
   assert.equal(api.selectLayered({...mixed,equipment:{...mixed.equipment,weapon:{def:0}}},options),null);
   assert.equal(api.selectLayered({...mixed,equipment:{...mixed.equipment,boots:{def:148}}},options),null);
   assert.equal(api.selectLayered({...mixed,appearance96:{...appearance96,eyeColor:'green'}},options),null);
   const a=await api.prepareConfiguration([{player:alone,options}]);
   const b=await api.prepareConfiguration([{player:mixed,options,source}],{resolve:x=>x});
   try{
    assert.equal(b.coverage[0].frames,8);
    assert.deepEqual(b.coverage[0].omitted,['coat']);
    assert.equal(b.coverage[0].slotRoutes.coat.item,6);
    const pixels=(bundle,player,phase)=>{
     const ctx=cv.createCanvas(400,400).getContext('2d');
     assert.ok(bundle.draw(ctx,player,{...options,x:180,y:180,progress:(phase+.2)/8}));
     return ctx.getImageData(0,0,400,400).data;
    };
    for(let phase=0;phase<8;phase++){
     const before=pixels(a,alone,phase),after=pixels(b,mixed,phase);
     assert.ok(before.some(v=>v>0),'native frame is not empty');
     assert.deepEqual(after,before,'only the missing slot may differ; current source has no coat');
    }
    assert.deepEqual(mixed,saved,'the visual omission must not change the equipment or appearance');
   }finally{a.release();b.release();}
  }
 }finally{
  global.MareAppearance96=prior.palette;
  global.MareCharacterAppearance=prior.appearance;
  global.MareHeadgear=prior.headgear;
 }
});

test('slot registrations reuse both native body models without changing authored phase clocks',async()=>{
 const prior={palette:global.MareAppearance96,appearance:global.MareCharacterAppearance,headgear:global.MareHeadgear};
 global.MareCharacterAppearance=require('./character-appearance.js');
 global.MareHeadgear=require('./headgear-visibility.js');
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{
  const api=make();await api.ready;
  const male={classId:'brawler',appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'},
   equipment:{coat:{def:151},legs:{def:133},gloves:{def:152}}};
  for(const action of ['idle','walk'])for(const direction of ['east','west','north','south']){
   const o={action,direction},empty=api.selectLayered(male,o);
   assert.ok(empty,`${action}/${direction} bare`);
   const d=empty.pack.directions[direction];
   for(const item of [8,9,134,141,148,155,162,169,176,183]){
    const player={...male,equipment:{...male.equipment,boots:{def:item}}},r=api.selectLayered(player,o);
    assert.equal(r?.slotRoutes?.boots?.quality,'hd',`${action}/${direction}/${item}: ${JSON.stringify(r?.slotRoutes)}`);
    const selected=r.pack.directions[direction];
    assert.deepEqual(selected.clip,d.clip);
    assert.deepEqual(selected.layers.filter(l=>!l.id.startsWith('boot'+item+'-')&&!l.id.startsWith('equip-boot'+item+'-')),d.layers);
   }
   const mixed={...male,appearance96:{...male.appearance96,hairStyle:'hair-cropped',hairColor:'pink'}};
   assert.equal(api.selectLayered(mixed,o),null,'baked head must not reset requested hairstyle or color');
  }
  for(const gender of ['masculino','feminino'])for(const direction of ['north','south','east','west'])for(const action of ['idle','walk','attack-unarmed']){
   const base={...male,appearance96:{...male.appearance96,gender},equipment:{coat:{def:151},legs:{def:gender==='masculino'?133:154},boots:{def:155}}};
   const o={action,direction},bare=api.selectLayered(base,o);
   assert.ok(bare?.layeredSlots,gender+'/'+action+'/'+direction+' bare hands');
   for(const item of [25,26,131,138,145,152,159,166,173,180]){
    const r=api.selectLayered({...base,equipment:{...base.equipment,gloves:{def:item}}},o);
    if(gender==='feminino'&&(item===131&&direction==='south'||item===180&&direction!=='north')){assert.equal(r,null);continue;}
    assert.equal(r?.slotRoutes?.gloves?.quality,'hd',gender+'/'+action+'/'+direction+'/'+item);
    assert.deepEqual(r.pack.directions[direction].clip,bare.pack.directions[direction].clip);
   }
  }
  const mixed={...male,equipment:{...male.equipment,boots:{def:9},gloves:{def:25}}};
  const mixedSource=api.selectVisual(mixed,{action:'walk',direction:'east'});
  assert.equal(mixedSource?.slotRoutes?.boots?.item,9);
  assert.equal(mixedSource?.slotRoutes?.gloves?.item,25);
  const opts={action:'walk',direction:'south'};
  const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:'olive',hairColor:'blonde',eyeColor:'amber'});
  const female={classId:'strategist',appearance96,equipment:{legs:{def:21},weapon:{def:17}}};
  const pending={...female,equipment:{...female.equipment,boots:{def:148}}};
  const source=api.selectLayered(pending,opts);
  assert.deepEqual(source?.omitted,['boots']);
  assert.equal(source?.slotRoutes?.weapon?.item,17);
  assert.deepEqual(source.authoredPantsLayer,api.select(female,opts).authoredPantsLayer);
  const before=await api.prepareConfiguration([{player:female,options:opts}]);
  const after=await api.prepareConfiguration([{player:pending,options:opts,source}],{resolve:x=>x});
  try {
   assert.equal(after.coverage[0].frames,40);
   for(let i=0;i<40;i++){
    const a=cv.createCanvas(360,320).getContext('2d'),b=cv.createCanvas(360,320).getContext('2d');
    const o={...opts,x:150,y:190,progress:(i+.25)/40,time:(i+.25)/40};
    assert.ok(before.draw(a,female,o));assert.ok(after.draw(b,pending,o));
    assert.deepEqual(a.getImageData(0,0,360,320).data,b.getImageData(0,0,360,320).data);
   }
  }finally{before.release();after.release();}
 }finally{
  global.MareAppearance96=prior.palette;
  global.MareCharacterAppearance=prior.appearance;
  global.MareHeadgear=prior.headgear;
 }
});

test('B155 in four directions keeps authored pixels and only changes boot pixels when swapped for B9',async()=>{
 const prior={palette:global.MareAppearance96,appearance:global.MareCharacterAppearance,headgear:global.MareHeadgear};
 global.MareCharacterAppearance=require('./character-appearance.js');
 global.MareHeadgear=require('./headgear-visibility.js');
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{
  const runtime=make();await runtime.ready;
  const index=require('./tools/rework-modular-outfits-hd/index.json');
  const author=global.MareReworkModularOutfitsHD.create(index,{vendor:global.ReworkAccessoryVendor});
  const load=require('./tools/rework-hd-test-loader.cjs').create(__dirname),images=new Map();
  const player={classId:'brawler',appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'},equipment:{coat:{def:151},legs:{def:133},gloves:{def:152}}};
  const withBoots=id=>id==null?player:{...player,equipment:{...player.equipment,boots:{def:id}}};
  const boots=l=>/^(?:equip-)?boot[0-9]+-/.test(l.id);
  const rgba=async(record,frame)=>{
   const {width,height}=record.pack.frame,{density}=record.pack;
   const c=cv.createCanvas(width*density,height*density),ctx=c.getContext('2d');
   for(const file of author.requiredFiles(record,{frame}))if(!images.has(file))images.set(file,await load(file));
   author.render(ctx,record,images,{frame});
   return ctx.getImageData(0,0,c.width,c.height).data;
  };
  for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
   const o={action,direction},side=['east','west'].includes(direction),original=runtime.select(withBoots(155),o);
   assert.equal(original?.id,`frozen-male-glove152-${direction}-${action}-native-layers`);
   const [a,b,c,r]=[155,null,9,155].map(id=>runtime.selectVisual(withBoots(id),o));
   const d=r=>r.pack.directions[direction],onlyBoots=r=>({...r,pack:{...r.pack,directions:{[direction]:{...d(r),layers:d(r).layers.filter(boots)}}}});
   const core=d(b).layers.filter(l=>!boots(l));
   for(const item of [c,runtime.selectLayered(withBoots(155),o)])assert.deepEqual(d(item).layers.filter(l=>!boots(l)),core);
   const front=d(a).layers.filter(boots);
   if(!side){
    assert.equal(front.length,4);
    assert.deepEqual(front.map(l=>l.depth).sort((x,y)=>x-y),[-1,-1,99,99]);
    assert.deepEqual(front,d(original).layers.filter(boots),'B155 original sources, matrices and depth retained');
   }else{
    // The exact indexed outfit may use another G152 revision. Keep the
    // latest glove, but all ten registered boot artworks themselves match.
    const bare=await rgba(b,0);
    for(const id of [8,9,134,141,148,155,162,169,176,183]){
     const p=withBoots(id),exact=runtime.select(p,o),layered=runtime.selectVisual(p,o);
     assert.ok(exact&&layered?.slotRoutes?.boots?.quality==='hd');
     assert.deepEqual(d(layered).layers.filter(l=>!boots(l)),core);
     const [oldBoot,newBoot,worn]=await Promise.all([onlyBoots(exact),onlyBoots(layered),layered].map(r=>rgba(r,0)));
     assert.deepEqual(oldBoot,newBoot,`${direction}/${action}/${id} boot artwork`);
     let changed=0;
     for(let i=0;i<bare.length;i++)if(worn[i]!==bare[i]){
      changed++;assert.notEqual(newBoot[(i&~3)+3],0,`${direction}/${action}/${id} outside boot artwork`);
     }
     assert.ok(changed>0);
    }
    const attack={action:'attack-unarmed',direction};
    assert.equal(runtime.selectVisual(withBoots(155),attack)?.id,runtime.select(withBoots(155),attack)?.id);
   }
   for(let frame=0;frame<d(a).clip.frames;frame++){
    const [old,before,off,swapped,after,mask155,mask9]=await Promise.all([original,a,b,c,r,onlyBoots(a),onlyBoots(c)].map(record=>rgba(record,frame)));
    assert.deepEqual(before,old,`${direction}/${action}/${frame} B155 approved pixels`);
    assert.deepEqual(before,after,`${direction}/${action}/${frame} B155 restoration`);
    for(const [worn,mask] of [[before,mask155],[swapped,mask9]]){
     let changed=0;
     for(let i=0;i<off.length;i++)if(worn[i]!==off[i]){changed++;assert.notEqual(mask[(i&~3)+3],0,'outside boot artwork');}
     assert.ok(changed>0,'worn boot must be visible');
    }
   }
  }
 }finally{
  global.MareAppearance96=prior.palette;
  global.MareCharacterAppearance=prior.appearance;
  global.MareHeadgear=prior.headgear;
 }
});

test('eight approved pants and ten gloves compose by slot on the south idle rig',async()=>{
 const api=make();await api.ready;
 const a={gender:'masculino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'};
 const player=(p,g,appearance96=a)=>({appearance96,classId:'brawler',equipment:{coat:{def:151},boots:{def:155},legs:{def:p},gloves:{def:g}}});
 const o={action:'idle',direction:'south'};
 const pants=[133,140,147,154,161,168,175,182],gloves=[25,26,131,138,145,152,159,166,173,180];
 const piece=(r,prefix)=>r.pack.directions.south.layers.filter(l=>prefix.some(x=>l.id.startsWith(x)));
 let added=0;
 for(const p of pants)for(const g of gloves){
  const actor=player(p,g),candidate=api.selectLayered(actor,o),winner=api.selectVisual(actor,o),native=api.select(actor,o);
  assert.ok(candidate&&winner,`${p}/${g}`);
  if(native)assert.equal(winner.id,native.id);else{
   assert.equal(candidate.slotRoutes.legs.item,p);
   assert.equal(candidate.slotRoutes.gloves.item,g);
   assert.deepEqual(candidate.omitted,[]);
   assert.equal(winner.id,candidate.id);
   assert.deepEqual(piece(candidate,['boot155-','equip-boot155-']),piece(api.selectLayered(player(133,25),o),['boot155-','equip-boot155-']));
   added++;
  }
 }
 assert.equal(added,63);
 const unsupported=player(140,25,{...a,hairColor:'pink'});
 assert.equal(api.selectLayered(unsupported,o),null);
 assert(!api.selectLayered(player(140,25),{action:'walk',direction:'south'})?.slotRoutes?.legs);
});

test('nine authored South coats swap over the exact isolated P133 walk and idle tracks',async()=>{
 const api=make();await api.ready;
 const a={gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'};
 const actor=(id,boot,appearance96=a)=>({appearance96,classId:'brawler',equipment:{legs:{def:133},...(id==null?{}:{coat:{def:id}}),...(boot==null?{}:{boots:{def:boot}})}});
 for(const action of ['idle','walk']){
  const o={action,direction:'south'},bare=api.selectVisual(actor(null),o);
  const d=r=>r.pack.directions.south;
  assert.equal(bare?.id,`male-pants133-${action}-south-isolated-r2`);
  for(const boot of [null,9,148])for(const id of [6,7,130,137,144,158,165,172,179]){
   const p=actor(id,boot),now=api.selectVisual(p,o),noCoat=api.selectVisual(actor(null,boot),o);
   assert.equal(now?.slotRoutes?.coat?.item,id);
   assert.equal(now?.slotRoutes?.legs?.item,133);
   assert.equal(now?.slotRoutes?.boots?.item,boot??undefined);
   assert.deepEqual(now.omitted,[]);
   assert.deepEqual(d(now).clip,d(bare).clip);
   assert.deepEqual(d(now).layers.filter(l=>d(noCoat).layers.some(x=>x.id===l.id)),d(noCoat).layers);
   assert.equal(api.selectLayered(actor(id,boot,{...a,skinColor:'olive'}),o),null);
  }
 }
});

test('authored Original coats compose with P21/P22 on the three phase-equivalent idle and walk directions',async()=>{
 const api=make();await api.ready;
 const a={gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'};
 const player=(p,c)=>({appearance96:a,classId:'brawler',equipment:{...(p==null?{}:{legs:{def:p}}),...(c==null?{}:{coat:{def:c}})}});
 for(const p of [21,22])for(const c of [6,7,130,137,144,158,165,172,179])
 for(const action of ['idle','walk'])for(const direction of ['south','east','west']){
  const o={action,direction},both=api.selectVisual(player(p,c),o),co=api.selectVisual(player(null,c),o),pa=api.selectVisual(player(p,null),o);
  assert.equal(both?.slotRoutes?.coat?.item,c);
  assert.equal(both?.slotRoutes?.legs?.item,p);
  assert.deepEqual(both.omitted,[]);
  const d=r=>r.pack.directions[direction],pants=l=>l.id.startsWith('pants'+p+'-');
  assert.deepEqual(d(both).layers.filter(pants),d(pa).layers.filter(pants));
  assert.deepEqual(d(both).layers.filter(l=>!pants(l)),d(co).layers);
  assert.equal(api.selectLayered(player(p,c),{action,direction:'north'}),null);
 }
});

test('approved punch coats leave the isolated P21/P22/P133 layers and authored motion intact',async()=>{
 const api=make();await api.ready;
 const a={gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'};
 const player=(p,c)=>({appearance96:a,classId:'brawler',equipment:{...(p==null?{}:{legs:{def:p}}),...(c==null?{}:{coat:{def:c}})}});
 for(const p of [21,22,133])for(const c of [6,7,130,137,144,158,165,172,179])
 for(const direction of ['north','south','east','west']){
  const o={action:'attack-unarmed',direction};
  const both=api.selectVisual(player(p,c),o),co=api.select(player(null,c),o),pa=api.select(player(p,null),o);
  assert.equal(both?.slotRoutes?.coat?.item,c);
  assert.equal(both?.slotRoutes?.legs?.item,p);
  assert.equal(both.resolvedAction,'attack-unarmed');
  const d=r=>r.pack.directions[direction],pants=l=>l.id.startsWith('pants'+p+'-');
  assert.deepEqual(d(both).layers.filter(pants),d(pa).layers.filter(pants));
  assert.deepEqual(d(both).layers.filter(l=>!pants(l)),d(co).layers);
  assert.deepEqual(d(both).clip,d(co).clip);
  assert.equal(d(both).clip.frames,8);
 }
});

test('north boot removal keeps normalized hair and skin, including the exposed feet',async()=>{
 const prior={palette:global.MareAppearance96,appearance:global.MareCharacterAppearance};
 global.MareCharacterAppearance=require('./character-appearance.js');
 global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 try{
  const runtime=make();await runtime.ready;
  const renderer=global.MareReworkModularOutfitsHD.create({schema:'rework-modular-outfits-hd-v1'},{vendor:global.ReworkAccessoryVendor});
  const loader=require('./tools/rework-hd-test-loader.cjs').create(__dirname),cache=new Map();
  const actor=(id,appearance96=global.MareCharacterAppearance.normalize())=>({appearance96,classId:'brawler',equipment:{coat:{def:151},legs:{def:133},gloves:{def:152},...(id?{boots:{def:id}}:{})}});
  const boots=l=>/^boot(?:9|155)-/.test(l.id),lower=l=>l.id==='lower-redrawn';
  function select(id,opts,look){const r=runtime.selectVisual(actor(id,look),opts);assert.ok(r);return r;}
  async function pixels(r,frame,keep){
   const d=r.pack.directions.north,record=keep?{...r,pack:{...r.pack,directions:{north:{...d,layers:d.layers.filter(keep)}}}}:r;
   const sources=renderer.requiredFiles(record,{frame}),images=new Map();
   for(const source of sources){
    if(!cache.has(source))cache.set(source,await loader(source));
    images.set(source,cache.get(source));while(cache.size>60)cache.delete(cache.keys().next().value);
   }
   const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
   renderer.render(ctx,record,images,{frame,makeCanvas:cv.createCanvas});
   return ctx.getImageData(0,0,512,512).data;
  }
  for(const action of ['idle','walk']){
   const o={action,direction:'north'},def=select(null,o),olive=select(null,o,global.MareCharacterAppearance.normalize({skinColor:'olive',hairColor:'auburn'}));
   assert.equal(def.colorAppearance.eyeColor,'blue');
   assert.equal(olive.colorAppearance.skin,'olive');
   assert.equal(olive.colorAppearance.hairColor,'auburn');
   assert(!def.pack.directions.north.layers.some(l=>l.slot==='face'||l.slot==='iris'));
   const original=runtime.selectLayered(actor(null,{gender:'masculino'}),o);
   for(let i=0;i<def.pack.directions.north.clip.frames;i++){
    const a=await pixels(def,i),b=await pixels(olive,i),feet=await pixels(olive,i,lower),uncolored=await pixels(original,i,lower);
    assert.notDeepEqual(a,b);
    const skin=global.MareNativeSkinHD.mask(uncolored,512,'mixed'),ramp=new Set(global.MareAppearance96.skins.olive.ramp);
    let covered=0;
    for(let k=0;k<skin.length;k++)if(skin[k]){
     const css='#'+[feet[k*4],feet[k*4+1],feet[k*4+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
     assert(ramp.has(css));covered++;
    }
    assert(covered>0);
    for(const item of [9,155]){
     const worn=select(item,o),w=await pixels(worn,i),m=await pixels(worn,i,boots);
     assert.equal(worn.slotRoutes.boots.item,item);
     let diff=0;
     for(let k=0;k<a.length;k++)if(a[k]!==w[k]){assert(m[(k&~3)+3]);diff++;}
     assert(diff>0);
    }
   }
   assert.equal(runtime.selectLayered(actor(155,global.MareCharacterAppearance.normalize({hairStyle:'hair-cropped'})),o),null);
  }
 }finally{global.MareAppearance96=prior.palette;global.MareCharacterAppearance=prior.appearance;}
});
