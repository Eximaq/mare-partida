'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const forge=require('../forge-system.js');
const catalog=()=>require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
test('Zoro is appended without gear stats, rarity, price, or automatic loot eligibility',()=>{
 const c=catalog(),i=c.items.findIndex(d=>d.id==='visual_completo_zoro');
 assert.equal(i,187,'append after the existing XP boost, without changing saved item indexes');
 const item={id:'zoro-test',def:i,level:1,plus:0,locked:false,obtainedAt:0};
 assert.equal(c.items[186].kind,'xp-boost');
 assert.equal(c.items[i].slot,'visual_completo');
 assert.equal(c.items[i].rarity,undefined);
 assert.equal(c.items[i].price,undefined);
 assert.equal(forge.isGear(item,c.items),false);
 assert.deepEqual(forge.normalizeItem(item,c.items),item);
 assert.deepEqual(forge.aggregate({visual_completo:item},c.items),forge.aggregate({},c.items));
});
test('equip, replacement, reload and unequip preserve customization, gear and fractional HP',()=>{
 assert.ok(fs.existsSync(require.resolve('../item-catalog.js').replace('item-catalog.js','visual-completo.js')),'cosmetic transition module exists');
 const v=require('../visual-completo.js'),defs=catalog().items;
 const one={id:'one',def:187,level:1,plus:0,locked:false,obtainedAt:0},two={...one,id:'two'};
 const state={hp:87.25,energy:15.75,classId:'sword',factionId:'pirate',appearance96:{hairColor:'blue'},equipment:{weapon:{id:'sword',def:0},coat:{id:'coat',def:6}},inventory:[one,two]};
 const original=structuredClone(state);
 const a=v.equip(state,'one',defs);assert.equal(a.ok,true);assert.deepEqual(state,original);
 assert.equal(a.state.equipment.visual_completo.id,'one');assert.equal(a.state.hp,87.25);
 const b=v.equip(JSON.parse(JSON.stringify(a.state)),'two',defs);assert.equal(b.ok,true);
 assert.deepEqual(b.state.inventory,[one]);
 const c=v.unequip(b.state,defs);assert.equal(c.ok,true);
 assert.deepEqual(c.state.appearance96,original.appearance96);assert.equal(c.state.energy,15.75);
 assert.deepEqual(c.state.equipment.weapon,original.equipment.weapon);assert.deepEqual(c.state.equipment.coat,original.equipment.coat);
 assert.equal(c.state.equipment.visual_completo,null);
 assert.equal(v.equip(state,'unowned',defs).ok,false);
 assert.equal(v.equip({...state,inventory:[{...one,def:0}]},'one',defs).ok,false);
 assert.equal(v.unequip({...a.state,inventory:Array.from({length:120},(_,i)=>({...two,id:'full'+i}))},defs).ok,false);
});

test('visual frames follow real contact progress and hurt presentation never changes facing',()=>{
 const path=require('node:path').join(__dirname,'../visual-completo-renderer.js');
 assert.ok(fs.existsSync(path),'visual frame resolver exists');
 const r=require(path),atlas=require('../assets/skins/visual-completo/zoro/atlas.json');
 const item={def:187},player={equipment:{visual_completo:item},classId:'sword'};
 assert.equal(r.pose(atlas,player,{action:'attack',direction:'east',progress:.2,timing:{hitFrameRatio:.2}}).index,3);
 assert.equal(r.pose(atlas,player,{action:'specialTide',direction:'north',progress:.7,timing:{hitFrameRatio:.7}}).index,3);
 const options={action:'hurt',direction:'west',progress:.5};
 assert.equal(r.pose(atlas,player,options).direction,'south');assert.equal(options.direction,'west');
 assert.equal(r.pose(atlas,{...player,zoanTransformed:true},options),null);
 assert.equal(r.pose(atlas,{equipment:{}},options),null);
 assert.equal(r.pose(atlas,player,{action:'idle',direction:'north',time:99}).index,0);
 assert.equal(r.pose(atlas,player,{action:'walk',direction:'west',time:.75}).index,3);
 assert.equal(r.pose(atlas,player,{action:'death',direction:'west'}),null);
});

test('Zoro is exclusive to Espadachim in equip and rendering, including malformed saves',()=>{
 const v=require('../visual-completo.js'),r=require('../visual-completo-renderer.js'),defs=catalog().items;
 assert.equal(defs[187].requiredClass,'sword');
 for(const classId of ['brawler','gunner','rogue','cyborg','strategist','healer',undefined]){
  const item={id:'skin',def:187},state={classId,inventory:[item],equipment:{visual_completo:item}};
  assert.equal(v.equip(state,'skin',defs).ok,false);assert.equal(r.equipped(state),false);
 }
});

test('online cosmetic removal uses the existing intent protocol',()=>{
 const {validIntent}=require('../apps/account-client/game-session.js');
 assert.equal(validIntent('items.unequip',{slot:'visual_completo'}),true);
 assert.equal(validIntent('items.equip',{itemId:'owned',def:187}),false);
});

test('all atlas rectangles and polygon anchors fit unchanged RGBA source sheets',()=>{
 const atlas=require('../assets/skins/visual-completo/zoro/atlas.json'),path=require('node:path'),crypto=require('node:crypto');let count=0;
 for(const [key,source] of Object.entries(atlas.sources)){const b=fs.readFileSync(path.join(__dirname,'../assets/skins/visual-completo/zoro',source.file));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),source.sha256);assert.equal(b[25],6);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],source.size);}
 for(const clip of Object.values(atlas.clips)){const [sw,sh]=atlas.sources[clip.source].size;assert(Math.abs(clip.scale*clip.bodyHeight-96)<1e-10);for(const frames of Object.values(clip.frames))for(const f of frames){count++;const [x,y,w,h]=f.rect;assert(x>=0&&y>=0&&x+w<=sw&&y+h<=sh);assert(f.anchor[0]>=0&&f.anchor[0]<=w&&f.anchor[1]>=0&&f.anchor[1]<=h);for(const [px,py] of f.clipPolygon||[])assert(px>=0&&py>=0&&px<=w&&py<=h);}}assert.equal(count,104);
 const r=require('../visual-completo-renderer.js');assert.equal(r.pose(atlas,{classId:'sword',equipment:{visual_completo:{def:187}}},{action:'attack-unarmed',direction:'east',progress:.5}).action,'castPalm');
});

test('failed assets preserve native rendering and successful draw cannot mutate player data',async()=>{
 const vm=require('node:vm'),atlas=require('../assets/skins/visual-completo/zoro/atlas.json'),source=fs.readFileSync(require.resolve('../visual-completo-renderer.js'),'utf8');
 const failed={fetch:async()=>({ok:false,status:404}),console:{error(){}}};vm.runInNewContext(source,failed);await failed.MareVisualCompletoRenderer.prepare();assert.equal(failed.MareVisualCompletoRenderer.draw({}, {classId:'sword',equipment:{visual_completo:{def:187}}}),false);
 class Img{set src(path){const s=Object.values(atlas.sources).find(s=>path.endsWith(s.file));[this.naturalWidth,this.naturalHeight]=s.size;queueMicrotask(()=>this.onload());}}
 const box={fetch:async()=>({ok:true,json:async()=>atlas}),Image:Img,console};vm.runInNewContext(source,box);await box.MareVisualCompletoRenderer.prepare();
 const player={classId:'sword',hp:2.25,energy:4.75,equipment:{visual_completo:{def:187}},appearance96:{hairColor:'blue'}},before=structuredClone(player);let draws=0;const ctx={save(){},restore(){},drawImage(){draws++},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){}};
 for(const direction of ['south','west','east','north'])for(const action of ['idle','walk','attack','castPalm','specialTide','specialHorizon','hurt'])assert.equal(box.MareVisualCompletoRenderer.draw(ctx,player,{action,direction,progress:.5}),true);
 assert.equal(draws,28);assert.deepEqual(player,before);assert.equal(box.MareVisualCompletoRenderer.draw(ctx,{...player,zoanTransformed:true}),false);assert.equal(draws,28);
});

test('accepted sword skills tag the real class controller without adding impacts',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(require.resolve('../game.js'),'utf8');const start=source.indexOf('  function useSkill('),end=source.indexOf('  function useAutoSkills(',start);let plays=0;const clock={play(){plays++;return true;},locked:()=>false};
 const box={MareAttributeRules:require('../attribute-rules.js'),ONLINE_GAME:null,actionLocked:()=>false,hoyaActive:()=>false,classSkillReason:()=>false,scene:'hunt',game:{classId:'sword',area:'beach',hp:100,energy:100,equipment:{},factionId:'pirate'},session:{cooldowns:[0,0],skillEnergySpent:0},world:{hero:{direction:'front'},target:{alive:true,x:1,y:1}},classCombatController:()=>clock,classCombat:{basicAction:()=> 'attack'},classes:{sword:{skills:[{name:'Corte de Maré',type:'strike',cost:17,cd:7},{name:'Arco do Horizonte',type:'area',cost:25,cd:10}]}},getDerived:()=>({range:100,energyEfficiency:0}),MareUltimates:{selected:()=>null},distance:()=>1,combatLine:()=>true,faceCombatTarget(){},MareAkumaPassives:{cooldown:v=>v},MareAkuma:{itemData:()=>null},itemDefs:[]};
 vm.runInNewContext(source.slice(start,end)+';globalThis.run=useSkill;',box);assert.equal(box.run(0),true);assert.equal(clock.visualClip,'specialTide');assert.equal(box.game.energy,83);assert.equal(plays,1);assert.equal(box.run(1),true);assert.equal(clock.visualClip,'specialHorizon');assert.equal(plays,2);
});

test('queued native hurt cannot replay a finished special or fabricate a Zoro damage reaction',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(require.resolve('../game.js'),'utf8');let reaction=null;const box={fruitPunchPose:()=>null,MareVisualCompletoRenderer:{equipped:()=>true},MareSpriteCombatV2:{hurtProgress:()=>reaction},world:{time:1,hero:{combat:{locked:()=>true,visualClip:'specialTide'}}},game:{hp:100},session:{},scene:'hunt',lobby96:{draw:(_c,_p,o)=>o}};const start=source.indexOf('  function drawPaperDoll('),end=source.indexOf('  function drawPlayerSprite(',start);vm.runInNewContext(source.slice(start,end)+';globalThis.draw=drawPaperDoll;',box);
 const call=a=>box.draw({canvas:{}},0,0,a,'west',0,null,.8,{locked:true},true);assert.equal(call('hurt').action,'idle');reaction=.5;assert.equal(call('hurt').action,'hurt');assert.equal(call('hurt').direction,'west');assert.equal(call('attack').action,'specialTide');
});

test('confirmed online HP loss records the same cosmetic hurt reaction only for Zoro',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(require.resolve('../game.js'),'utf8');const start=source.indexOf("      if(e.type==='hurt')"),end=source.indexOf("      if(e.type==='skill')",start);let equipped=true,calls=[];const box={e:{type:'hurt',amount:8},game:{hp:42},world:{time:2,hero:{x:0,y:0}},spawnVisual(){},MareVisualCompletoRenderer:{equipped:()=>equipped},MareSpriteCombatV2:{hurt:(...args)=>calls.push(args)}};vm.runInNewContext(source.slice(start,end),box);assert.equal(calls.length,1);assert.equal(calls[0][1],8);equipped=false;vm.runInNewContext(source.slice(start,end),box);assert.equal(calls.length,1);
});
