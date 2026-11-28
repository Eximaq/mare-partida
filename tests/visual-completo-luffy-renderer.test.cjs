'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const renderer=require('../visual-completo-renderer.js');
const atlas=require('../assets/skins/visual-completo/luffy/atlas.json');
const actor=(classId,weaponId)=>({classId,hp:42.25,energy:17.5,appearance96:{gender:'feminino',hairColor:'blue'},cosmetics:{equipped:{head:'east-blue-hat'}},equipment:{visual_completo:{def:246,id:'owned-luffy'},...(weaponId==null?{}:{weapon:{def:weaponId,id:'owned-weapon'}})}});

test('an owned Luffy visual renders for all seven classes without relaxing Zoro',()=>{
 for(const [classId,weaponId] of [['sword',0],['brawler',2],['gunner',114],['rogue',12],['cyborg',15],['strategist',17],['healer',32]]){
  const p=actor(classId,weaponId);
  assert.equal(renderer.equipped(p),true,classId);
  assert.equal(renderer.skinId(p),'visual_completo_luffy');
  assert.equal(renderer.equipped({...p,equipment:{visual_completo:{def:187}}}),classId==='sword');
 }
 assert.equal(renderer.equipped(actor('invalid',0)),false);
 assert.equal(renderer.equipped({classId:'sword',equipment:{}}),false);
});

test('Luffy follows the actual equipped weapon family and eight-frame contact clock',()=>{
 const cases=[['sword',68,'attack_sword_sabre'],['brawler',2,'attack_brawler_gauntlets'],['gunner',5,'attack_gunner_rifle'],['gunner',114,'attack_gunner_dual_pistols'],['rogue',12,'attack_rogue_dual_daggers'],['cyborg',119,'attack_cyborg_hydraulic'],['cyborg',120,'attack_cyborg_cannon'],['strategist',16,'attack_strategist_compass'],['strategist',17,'attack_strategist_orb'],['strategist',121,'attack_strategist_scepter'],['strategist',123,'attack_strategist_staff'],['healer',31,'attack_healer_cajado'],['healer',32,'attack_healer_reliquary'],['healer',125,'attack_healer_baton'],['healer',126,'attack_healer_staff']];
 for(const [classId,weaponId,clip] of cases){
  const player=actor(classId,weaponId),before=structuredClone(player);
  for(const direction of ['south','north','east','west']){
   const p=renderer.pose(atlas,player,{action:classId==='cyborg'?'attack-unarmed':'attack',direction,progress:.3,timing:{hitFrameRatio:.3}});
   assert.ok(p,clip+' '+direction);assert.equal(p.action,clip);assert.equal(p.index,4);assert.equal(p.direction,direction);
   assert.equal(renderer.pose(atlas,player,{action:'attack',direction,progress:1}).index,7);
  }
  assert.deepEqual(player,before);
 }
});

test('class skill selectors cover the fourteen abilities without inventing hits',()=>{
 const cases=[['sword',0,'special_sword_tide','special_sword_horizon'],['brawler',2,'attack_brawler_gauntlets','guard_brawler_gauntlets'],['gunner',114,'attack_gunner_dual_pistols','burst_gunner_dual_pistols'],['rogue',12,'attack_rogue_dual_daggers','dance_rogue_dual_daggers'],['cyborg',15,'taunt_cyborg_cannon','guard_cyborg_cannon'],['strategist',123,'attack_strategist_staff','attack_strategist_staff'],['healer',32,'attack_healer_reliquary','blessing_healer_reliquary']];
 for(const [classId,weaponId,...clips] of cases)for(let skillIndex=0;skillIndex<2;skillIndex++){
  const p=renderer.pose(atlas,actor(classId,weaponId),{action:'attack',skillIndex,direction:'north',progress:.5});
  assert.ok(p);assert.equal(p.action,clips[skillIndex]);assert.equal(p.direction,'north');
 }
});

test('free-hand casting hides weapons and the selected loadout returns afterward',()=>{
 const player=actor('cyborg',120),before=structuredClone(player);
 const cast=renderer.pose(atlas,player,{action:'attack-unarmed',direction:'south',weaponless:true,progress:.5});
 assert.ok(cast);assert.equal(cast.action,'cast_palm_shared');
 const restored=renderer.pose(atlas,player,{action:'idle',direction:'south',time:0});
 assert.equal(restored.action,'idle_cyborg_cannon');
 assert.equal(renderer.pose(atlas,actor('gunner'),{action:'attack',direction:'south',progress:.5}).action,'attack_brawler_bare');
 assert.deepEqual(player,before);
});

test('directional hurt, breathing and transformation fallback preserve actor state',()=>{
 const player=actor('healer',31),options={action:'hurt',direction:'west',progress:.5};
 assert.equal(renderer.pose(atlas,player,options)?.direction,'west');
 assert.equal(renderer.pose(atlas,player,{action:'idle',direction:'north',time:1.4})?.index,7);
 assert.equal(renderer.pose(atlas,{...player,zoanTransformed:true},options),null);
 assert.equal(renderer.pose(atlas,player,{...options,action:'death'}),null);
 assert.equal(options.direction,'west');
});

test('a completed skill cannot override hurt, walking or idle, and free-hand casting takes priority',()=>{
 const player=actor('cyborg',120);
 for(const action of ['idle','walk','hurt']){
  assert.equal(renderer.pose(atlas,player,{action,skillIndex:1,direction:'east',progress:.5}).action,action+'_cyborg_cannon');
 }
 const bare=actor('cyborg');
 assert.equal(renderer.pose(atlas,bare,{action:'attack',skillIndex:1,direction:'west',progress:.5}).action,'guard_brawler_bare');
 assert.equal(renderer.pose(atlas,bare,{action:'attack',skillIndex:1,freeHandPower:true,direction:'west',progress:.5}).action,'cast_palm_shared');
});

function browserBox(fetchImpl,{delay,createImageBitmap}={}){
 const imagePaths=[];
 class Img{async decode(){const source=Object.values(atlas.sources).find(s=>this.url.split('?')[0].endsWith(s.file));assert.ok(source);await delay?.(source.file);[this.naturalWidth,this.naturalHeight]=source.size;}set src(value){this.url=value;imagePaths.push(value);}}
 const box={fetch:fetchImpl,Image:Img,createImageBitmap,console:{error(){}},Date};
 for(const name of ['luffy-animation.js','visual-completo-luffy.js','visual-completo-renderer.js']){const file=path.join(__dirname,'..',name);if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),box);}
 return {box,imagePaths};
}

test('equipping warms only the local class and keeps the skin during delayed poses, casts and turns',async()=>{
 const blocked=new Map(),tick=()=>new Promise(resolve=>setImmediate(resolve));
 let disposed=0;
 const {box,imagePaths}=browserBox(async()=>({ok:true,json:async()=>atlas}),{
  delay:file=>new Promise(resolve=>blocked.set(file,resolve)),
  createImageBitmap:async(image,opts)=>({url:image.url,width:opts.resizeWidth,height:opts.resizeHeight,close(){disposed++;}})
 });
 const player={...actor('sword',1),characterId:'local'};
 const engine=box.MareVisualCompletoRenderer,luffy=box.MareLuffyVisual;
 const drawn=[];
 const ctx={canvas:{width:300,height:300},save(){},restore(){},translate(){},scale(){},drawImage(image,...args){drawn.push({image,args});}};
 const unlock=async()=>{
  for(const release of blocked.values())release();
  blocked.clear();
  await tick();
 };
 engine.warmClass(player,'east');
 await tick();
 assert.deepEqual([...blocked.keys()],['atlases/idle_sword_sabre/east.png','atlases/cast_palm_shared/east.png']);
 assert.equal(engine.draw(ctx,player,{action:'idle',direction:'east'}),false);
 await unlock();
 assert.equal(engine.draw(ctx,player,{action:'idle',direction:'east'}),true);
 assert.equal(luffy.worldReady(player),true);
 assert.equal(engine.draw(ctx,player,{action:'attack',direction:'north'}),true);
 assert.equal(luffy.snapshot().last.action,'idle_sword_sabre');
 assert.equal(luffy.snapshot().last.held,true);
 assert.equal(engine.draw(ctx,player,{action:'attack-unarmed',weaponless:true,direction:'south'}),true);
 assert.equal(luffy.snapshot().last.action,'cast_palm_shared');
 assert.equal(engine.draw(ctx,player,{action:'walk',direction:'west'}),true);
 assert.ok(luffy.snapshot().pendingSources<=4);
 for(let i=0;i<21&&luffy.snapshot().warm.ready<21;i++)await unlock();
 assert.deepEqual({...luffy.snapshot().warm},{classId:'sword',total:21,ready:21});
 assert.equal(imagePaths.length,21);
 assert(imagePaths.every(p=>/sword|cast_palm_shared/.test(p)&&!p.includes('/west.png')));
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack','hurt']){
  assert.equal(engine.draw(ctx,player,{action,direction,time:.5,progress:.5}),true);
  assert.equal(luffy.snapshot().last.action,action+'_sword_sabre');
  assert.equal(luffy.snapshot().last.direction,direction);
  assert.equal(luffy.snapshot().last.held,undefined);
 }
 assert.equal(imagePaths.length,21,'prepared moves never request an atlas again');
 assert(drawn.at(-1).image.url.includes('/east.png'),'west samples the mirrored east atlas');
 engine.warmClass(null);
 assert.equal(luffy.snapshot().warm,null);
 assert.equal(disposed,21);
});

test('map scale matches the native body and applies only horizontal walking registration',async()=>{
 const {box}=browserBox(async()=>({ok:true,json:async()=>atlas}));
 const player=actor('sword',1),engine=box.MareVisualCompletoRenderer;
 let draw;
 const ctx={canvas:{width:300,height:300},save(){},restore(){},drawImage(...args){draw=args;}};
 for(const action of ['walk','attack']){
  const opts={action,direction:'east',x:150,y:240,time:.75,progress:.5};
  const p=engine.pose(atlas,player,opts);
  assert.equal(await engine.prepare(player,opts),true);
  assert.equal(engine.draw(ctx,player,opts),true);
  const scalar=105/p.bodyHeight,[ax,ay]=p.frame.anchor;
  const offset=atlas.worldPresentation.walkOffsets[p.action]?.east[p.index]||0;
  if(action==='walk')assert.notEqual(offset,0);
  assert.equal(draw[5],Math.round(opts.x+(offset-ax)*scalar));
  assert.equal(draw[6],Math.round(opts.y-ay*scalar));
  assert.equal(draw[8],p.frame.rect[3]*scalar);
 }
 for(const [id,dirs] of Object.entries(atlas.worldPresentation.walkOffsets)){
  for(const direction of ['south','north','east','west'])assert.equal(dirs[direction].length,atlas.clips[id].frames[direction].length);
  assert(dirs.east.every((x,i)=>x===-dirs.west[i]),'walking offsets respect mirroring');
 }
});

test('Luffy loads only the requested atlas and draw is presentation-only',async()=>{
 const {box,imagePaths}=browserBox(async()=>({ok:true,json:async()=>atlas}));
 const player=actor('gunner',114),before=structuredClone(player),opts={action:'attack',direction:'north',progress:.5};
 assert.equal(await box.MareVisualCompletoRenderer.prepare(player,opts),true);
 assert.equal(imagePaths.length,1,'avoid decoding all 340 atlases at startup');
 let draws=0;const ctx={canvas:{width:180,height:220},save(){},restore(){},drawImage(){draws++}};
 assert.equal(box.MareVisualCompletoRenderer.draw(ctx,player,opts),true);
 assert.equal(draws,1);assert.deepEqual(player,before);
 assert.equal(box.MareVisualCompletoRenderer.snapshot().last.action,'attack_gunner_dual_pistols');
});

test('missing Luffy assets return false so the native renderer can continue',async()=>{
 const {box,imagePaths}=browserBox(async()=>({ok:false,status:404}));
 const player=actor('sword',0);
 assert.equal(await box.MareVisualCompletoRenderer.prepare(player),false);
 assert.equal(box.MareVisualCompletoRenderer.draw({},player),false);
 assert.equal(imagePaths.length,0);
});

test('an incomplete direction or invalid source hash is rejected before loading images',async()=>{
 for(const corrupt of [
  data=>{delete data.clips.cast_palm_shared.frames.east;delete data.clips.cast_palm_shared.directions.east;},
  data=>{delete data.sources[Object.keys(data.sources)[0]].sha256;}
 ]){
  const data=structuredClone(atlas);corrupt(data);
  const {box,imagePaths}=browserBox(async()=>({ok:true,json:async()=>data}));
  assert.equal(await box.MareVisualCompletoRenderer.prepare(actor('sword',0)),false);
  assert.equal(imagePaths.length,0);
 }
});

test('the actual inventory fit mode keeps tall weapons inside the portrait throughout the cycle',async()=>{
 const {box}=browserBox(async()=>({ok:true,json:async()=>atlas}));
 for(const [classId,weaponId] of [['strategist',121],['strategist',123],['cyborg',15]]){
  const player=actor(classId,weaponId);
  const opts={action:'idle',direction:'south',inventoryPresentation:true,avatarZoom:null,avatarWorldPose:false,x:90,y:200,scale:196/46};
  assert.equal(await box.MareVisualCompletoRenderer.prepare(player,opts),true);
  let args;
  const ctx={canvas:{width:180,height:220},save(){},restore(){},drawImage(...values){args=values;}};
  for(let frame=0;frame<8;frame++){
   opts.time=frame/5;
   const p=box.MareVisualCompletoRenderer.pose(atlas,player,opts);
   assert.equal(box.MareVisualCompletoRenderer.draw(ctx,player,opts),true);
   const bounds=p.frame.visibleBounds,scale=args[7]/args[3];
   const left=args[5]+bounds[0]*scale,top=args[6]+bounds[1]*scale,right=args[5]+bounds[2]*scale,bottom=args[6]+bounds[3]*scale;
   assert.ok(left>=9&&top>=9&&right<=171&&bottom<=211,`${classId}/${weaponId} frame ${frame}: ${[left,top,right,bottom]}`);
  }
 }
});

test('extra weapons reuse the class and grip already represented in the Luffy atlas',()=>{
 const cases=[
  ['sword',69,0],['brawler',112,2],['gunner',116,4],['rogue',74,12],
  ['cyborg',118,15],['cyborg',117,14],['strategist',122,17],['strategist',124,121],
  ['healer',127,31],['healer',128,126],['healer',900,126],['strategist',900,123]
 ];
 for(const [classId,weaponId,baseId] of cases){
  const player=actor(classId,weaponId),before=structuredClone(player);
  for(const action of ['idle','walk','hurt','attack'])for(const direction of ['south','north','east','west']){
   const opts={action,direction,progress:.5};
   const actual=renderer.pose(atlas,player,opts),base=renderer.pose(atlas,actor(classId,baseId),opts);
   assert.ok(actual,classId+' / '+weaponId+' / '+action+' / '+direction);
   assert.equal(actual.loadout,base.loadout);
   assert.equal(actual.source,base.source);
   assert.equal(actual.index,base.index);
   assert.equal(renderer.pose(atlas,{...player,equipment:{...player.equipment,head:{def:19},coat:{def:151}}},opts).source,base.source);
  }
  for(const skillIndex of [0,1]){
   const opts={action:'attack',direction:'east',skillIndex,progress:.5};
   assert.equal(renderer.pose(atlas,player,opts)?.source,renderer.pose(atlas,actor(classId,baseId),opts).source);
  }
  assert.equal(renderer.pose(atlas,player,{action:'attack',weaponless:true}).action,'cast_palm_shared');
  assert.deepEqual(player,before);
 }
});

test('all 42 functional weapons resolve the existing Luffy animations of their own class',()=>{
 const requireRule=name=>require('../'+name+'.js');
 const {items}=requireRule('item-catalog').create({
  forge:requireRule('forge-system'),prison:requireRule('prison-system'),haki:requireRule('haki-system'),
  akuma:requireRule('akuma-system'),hakiProgression:requireRule('haki-progression')
 });
 let count=0;
 for(const [id,def] of items.entries()){
  if(def.slot!=='weapon')continue;
  const player=actor(def.type,id);
  for(const action of ['idle','walk','hurt','attack'])for(const direction of ['south','north','east','west']){
   const scene=renderer.pose(atlas,player,{action,direction});
   assert.ok(scene,def.name+' / '+action+' / '+direction);
   assert.equal(atlas.loadouts.find(v=>v.id===scene.loadout).classId,def.type);
  }
  count++;
 }
 assert.equal(count,42);
});
