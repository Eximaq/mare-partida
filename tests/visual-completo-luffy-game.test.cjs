'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
const Animation=require('../combat-animation.js'),Characters=require('../character-system.js');
const {classes}=require('../character-catalog.js').create({characters:Characters});
const Vfx=require('../combat-vfx.js');
const skinRenderer=require('../visual-completo-renderer.js'),skinAtlas=require('../assets/skins/visual-completo/luffy/atlas.json');

// Run the real game consumers without booting its unrelated browser application.
function declaration(name){
 const start=source.indexOf('  function '+name+'(');
 if(start<0)return '';
 const rest=source.slice(start+3),next=rest.search(/\n  (?:async )?function /);
 return next<0?source.slice(start):source.slice(start,start+3+next);
}
const consumers=['faceCombatTarget','captureWear','basicAttackIdentity','basicAttackPose','cancelBasicAttack','retimeAttack','syncBasicAttackVisual','stepBasicAttack','beginBasicAttack','restoreHero','useSkill','presentClassSkill','drawPaperDoll','drawPlayerSpriteBase','syncOnlineBattle','fruitPunchPose','actionLocked','classSkillReason','classSkillEffect','visualItemDetail'];
function harness(classId='sword',{controller=true,skin='visual_completo_luffy',target=true}={}){
 const impacts=[],effects=[],draws=[],clock=Animation.create({attack:{frames:4,fps:8,impact_frame:2,loop:false},hurt:{frames:4,fps:8,impact_frame:1,loop:false}});
 const presentation={update(){},sample(){return {x:20,y:0};}};
 const one={id:'one',type:'normal',x:20,y:0,alive:true,hp:100,maxHP:100,onlinePresentation:presentation};
 const two={id:'two',type:'normal',x:30,y:0,alive:true,hp:100,maxHP:100,onlinePresentation:presentation};
 const stats={maxHP:200,healing:40,range:1000,speed:2,energyEfficiency:0,damageCooldownReduction:0};
 const box={console,structuredClone,performance:{now:()=>1000},classes,ONLINE_GAME:null,DEV_ACTIVE:false,scene:'hunt',currentPanel:null,
  game:{classId,area:'beach',hp:100,energy:100,factionId:'pirate',equipment:{visual_completo:{def:skin==='visual_completo_luffy'?246:187}},inventory:[]},
  session:{cooldowns:[0,0],skillEnergySpent:0,skillUses:[0,0],guard:0,blessing:0,respawn:0,talents:{combatRemaining:0}},
  world:{time:10,hero:{x:0,y:0,direction:'right',walking:0,attackAnim:0,combatSequence:0,combat:controller?clock:null},target:target?one:null,mobs:[one,two],fx:[]},
  ctx:{canvas:{id:'world'}},onlineBattleSnapshot:null,onlineBattleSeq:1,autoPlay:false,
  getDerived:()=>stats,classCombatController:()=>controller?clock:null,classCombat:{basicAction:()=> 'attack'},
  MareCombatAnimation:Animation,MareAttributeRules:require('../attribute-rules.js'),MareForge:require('../forge-system.js'),MareCharacters:Characters,
  MareCombatPolicy:require('../combat-action-policy.js'),MareCombatVfx:Vfx,
  MareAkuma:{itemData:item=>item?.fruitId?{id:item.fruitId}:null},MareAkumaPassives:{cooldown:v=>v},
  MareUltimates:{selected:()=>null,start:()=>({}),heal:()=>[]},MareTalentCombat:{create:()=>({}),chainHeal(){}},MareHaki:{start:()=>({})},
  MareVisualCompletoRenderer:{skinId:player=>player.zoanTransformed?null:skin,equipped:player=>!player.zoanTransformed&&!!skin},
  MareSpriteCombatV2:{hurtProgress:()=>box.reaction??null,hurt(){}},
  MareOnlineGameUI:{createWorldPresentation:()=>presentation,fruitTimeline:m=>m},
  lobby96:{walkPose:hero=>({moving:hero.walking>0,time:box.world.time}),draw(_ctx,_player,options){draws.push(options);return options;}},
  heroAttack(...args){impacts.push({target:args[0].id,multiplier:args[1],skill:args[2]?.name,commit:args[4]});return true;},
  livingMobs:()=>box.world.mobs.filter(m=>m.alive),chooseTarget:()=>target?one:null,combatLine:()=>true,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  emitCombatVfx(kind,actor){effects.push({kind,actor:actor.id||'hero'});},spawnVisual(){},playOrangeSfx(){},orangeBasicSfx:()=> 'basic',applyUltimateActions(){},
  hoyaActive:()=>false,ryuSkillActive:()=>false,wolfSkillActive:()=>false,ushiSkillActive:()=>false,nekoSkillActive:()=>false,
  isRyuForm:()=>false,isWolfForm:()=>false,isNekoForm:()=>false,isUshiForm:()=>false,equippedZoan:()=>box.game.zoanTransformed?{id:'test-zoan'}:null,
  betaEquipped:()=>false,primePlayerWorldVisual(){},drawUpdatedZoan:()=>({transformed:true}),
  activeMap:()=>({id:'beach'}),monsterTypes:{normal:{name:'Target'}},syncOnlineFruit(){},launchCombatProjectile(){},toast(){},renderPanel(){},itemDefs:[],
  itemBase:item=>item.definition,hasEquipped:item=>box.game.equipment.visual_completo?.id===item.id,escapeHTML:value=>String(value),itemIcon:()=>'',BAG_CAPACITY:120,
  MareVisualCompleto:require('../visual-completo.js')
 };
 vm.createContext(box);vm.runInContext(consumers.map(declaration).join('\n')+'\nglobalThis.render=()=>drawPlayerSpriteBase(ctx,0,0);',box);
 function onlineEvent(event){
  const seq=(box.ONLINE_GAME?.data.online.battle.seq||1)+1;
  const battle={seq,mobs:[one,two],targetId:target?'one':null,events:[{seq,id:'one',...event}],auto:false,cooldowns:[3,4],guard:0,blessing:0,respawn:0};
  box.ONLINE_GAME={data:{online:{battle,world:{},haki:null}}};box.syncOnlineBattle();
 }
 return {box,clock,impacts,effects,draws,onlineEvent};
}

// Literal expectations catch index-zero loss, class leakage, changed resources and extra impacts.
const skills=[
 ['sword',0,83,7,1,100,'special_sword_tide'],['sword',1,75,13,2,100,'special_sword_horizon'],
 ['brawler',0,83,8,1,100,'attack_brawler_gauntlets'],['brawler',1,80,14,0,146,'guard_brawler_gauntlets'],
 ['gunner',0,83,8,1,100,'attack_gunner_dual_pistols'],['gunner',1,72,14,2,100,'burst_gunner_dual_pistols'],
 ['rogue',0,82,7,1,100,'attack_rogue_dual_daggers'],['rogue',1,74,13,2,100,'dance_rogue_dual_daggers'],
 ['cyborg',0,80,12,2,100,'taunt_cyborg_cannon'],['cyborg',1,78,15,0,134,'guard_cyborg_cannon'],
 ['strategist',0,82,7,1,100,'attack_strategist_staff'],['strategist',1,72,14,2,100,'attack_strategist_staff'],
 ['healer',0,76,10,0,140,'attack_healer_reliquary'],['healer',1,73,16,0,100,'blessing_healer_reliquary']
];
const classWeapons={sword:0,brawler:2,gunner:114,rogue:12,cyborg:15,strategist:123,healer:32};
for(const controller of [true,false])test('all fourteen accepted skills reach the Luffy draw with their real class/index using '+(controller?'the class clock':'the fallback clock'),()=>{
 for(const [classId,index,energy,cooldown,hits,hp,clip] of skills){
  const h=harness(classId,{controller}),b=h.box,label=classId+':'+index;
  b.game.equipment.weapon={def:classWeapons[classId]};
  assert.equal(b.useSkill(index),true,label);
  const visual=b.render();assert.equal(visual.skillIndex,index,label+' visual skill');assert.equal(visual.classId,classId,label+' class');
  assert.equal(skinRenderer.pose(skinAtlas,b.game,visual)?.action,clip,label+' actual skin animation');
  assert.equal(b.game.energy,energy,label+' energy');assert.equal(b.session.cooldowns[index],cooldown,label+' cooldown');assert.equal(b.session.skillUses[index],1,label+' use count');
  const active=controller?h.clock:b.session.basicAttack?.clock;
  if(active){assert.equal(h.impacts.length,0,label+' before contact');active.step(.249);assert.equal(h.impacts.length,0,label+' before real hit frame');active.step(.001);}
  assert.equal(h.impacts.length,hits,label+' unchanged impact count');assert.equal(b.game.hp,hp,label+' unchanged self effect');
  const settled=JSON.stringify({hp:b.game.hp,energy:b.game.energy,cooldowns:b.session.cooldowns,guard:b.session.guard,blessing:b.session.blessing});
  for(let i=0;i<12;i++)b.render();
  active?.step(5);b.world.time+=5;if(!controller)b.stepBasicAttack(0);
  assert.equal(h.impacts.length,hits,label+' drawing and finishing add no impacts');
  assert.equal(JSON.stringify({hp:b.game.hp,energy:b.game.energy,cooldowns:b.session.cooldowns,guard:b.session.guard,blessing:b.session.blessing}),settled,label+' drawing changes no combat state');
  assert.equal(b.render().skillIndex,null,label+' finished tag ignored');
 }
});

test('online skill events render all fourteen poses even while a native class controller is idle',()=>{
 for(const [classId,index,,,,,clip] of skills){
  const h=harness(classId),b=h.box;b.game.equipment.weapon={def:classWeapons[classId]};h.onlineEvent({type:'skill',index,duration:.7});
  const visual=b.render();assert.equal(visual.skillIndex,index,classId+':'+index);assert.equal(visual.classId,classId);assert.equal(visual.timing.locked,true);
  assert.equal(skinRenderer.pose(skinAtlas,b.game,visual)?.action,clip,classId+':'+index+' actual online skin animation');
  assert.equal(b.game.hp,100);assert.equal(b.game.energy,100);assert.deepEqual(Array.from(b.session.cooldowns),[3,4]);assert.equal(h.impacts.length,0,'server events never invoke local damage');
  b.world.time+=2;b.stepBasicAttack(2);assert.equal(b.render().skillIndex,null);assert.equal(h.impacts.length,0);
 }
});

test('self skills work without a target, retain facing and expire without scheduling a contact',()=>{
 for(const [classId,index] of [['brawler',1],['cyborg',1],['healer',0],['healer',1]]){
  const h=harness(classId,{controller:false,target:false}),b=h.box;
  assert.doesNotThrow(()=>assert.equal(b.useSkill(index),true),classId+':'+index+' needs no target');
  const visual=b.render();assert.equal(visual.skillIndex,index);assert.equal(visual.direction,'right');assert.equal(visual.timing.locked,true);
  if(index===1)assert.equal(b.session.basicAttack,undefined,'guard and blessing do not fabricate a combat clock');
  b.world.time+=.2;b.stepBasicAttack(.2);assert(b.render().progress>0);assert.equal(h.impacts.length,0);
  b.world.time+=2;b.stepBasicAttack(2);assert.equal(b.render().skillIndex,null);assert.equal(h.impacts.length,0);
 }
});

test('Luffy lightning follows the target without changing the underlying south-facing attack clock',()=>{
 const h=harness('strategist',{controller:false}),b=h.box;assert.equal(b.useSkill(1),true);
 assert.equal(b.session.basicAttack.clock.snapshot().direction,'south','existing combat timing stays unchanged');
 assert.equal(b.world.hero.direction,'right');assert.equal(b.render().direction,'right');
});

test('rejected skills cannot change the current presentation or spend resources',()=>{
 const {box:b,clock}=harness('sword');b.game.energy=0;assert.equal(b.useSkill(0),false);assert.equal(clock.visualSkillIndex,undefined);assert.equal(b.session.classSkillPose,undefined);
 b.game.energy=100;b.classCombat.basicAction=()=> 'missing';assert.equal(b.useSkill(1),false);assert.equal(clock.visualSkillIndex,undefined);assert.equal(b.game.energy,100);assert.equal(b.session.cooldowns[1],0);
});

test('a new basic attack clears the previous class skill on native and fallback paths',()=>{
 const native=harness('sword'),b=native.box;assert.equal(b.useSkill(1),true);native.clock.step(1);
 vm.runInContext(declaration('heroAttack'),b);assert.equal(b.heroAttack(b.world.target),true);
 assert.equal(b.render().skillIndex,null);assert.equal(native.clock.visualSkillIndex,null);assert.equal(native.clock.visualClip,null);
 const fallback=harness('brawler',{controller:false}),f=fallback.box;assert.equal(f.useSkill(1),true);assert.equal(f.render().skillIndex,1);
 assert.equal(f.beginBasicAttack(f.world.target,1,false,2),true);assert.equal(f.render().skillIndex,null);
});

test('a new online basic attack ends a self pose and carries no stale class skill index',()=>{
 const h=harness('healer'),b=h.box;h.onlineEvent({type:'skill',index:1,duration:1});assert.equal(b.render().skillIndex,1);
 h.onlineEvent({type:'attack'});assert.equal(b.render().skillIndex,null);assert.equal(b.render().action,'attack');assert.equal(h.impacts.length,0);
});

test('self presentation cannot survive cancellation, map changes or class changes',()=>{
 for(const change of [b=>b.cancelBasicAttack(),b=>{b.game.area='orange';},b=>{b.game.classId='sword';}]){
  const {box:b}=harness('brawler',{controller:false});assert.equal(b.useSkill(1),true);assert.equal(b.render().skillIndex,1);
  change(b);assert.equal(b.render().skillIndex,null);
 }
});

test('hurt and free-hand powers override class tags and Zoan bypasses the human skin',()=>{
 const h=harness('brawler',{controller:false}),b=h.box;assert.equal(b.useSkill(1),true);
 b.reaction=.3;assert.equal(b.render().action,'hurt');assert.equal(b.render().skillIndex,null);b.reaction=null;
 b.game.equipment.akuma_no_mi={fruitId:'test-fruit'};b.session.fruitAction={fruit:'test-fruit',area:'beach',direction:'left',elapsed:.1};
 const fruit=b.render();assert.equal(fruit.action,'attack-unarmed');assert.equal(fruit.freeHandPower,true);assert.equal(fruit.weaponless,true);assert.equal(fruit.skillIndex,null);assert.equal(fruit.direction,'left');
 b.session.fruitAction=null;b.world.time+=2;assert.equal(b.render().weaponless,false);assert.equal(b.render().freeHandPower,false);
 b.game.zoanTransformed=true;assert.equal(b.render().transformed,true);
});

test('queued hurt never reuses a finished native skill tag',()=>{
 const {box:b,clock}=harness('sword');assert.equal(b.useSkill(0),true);clock.play('hurt');clock.step(.5);
 b.reaction=.4;const visual=b.render();assert.equal(visual.action,'hurt');assert.equal(visual.skillIndex,null);
});

test('the visual item consumer shows Luffy as universal while enforcing canEquip and Zoro exclusivity',()=>{
 const {box:b}=harness('brawler');
 const luffy={id:'luffy-item',def:246,definition:{id:'visual_completo_luffy',name:'Luffy',slot:'visual_completo',kind:'visual-completo',description:'Cosmetic'}},zoro={id:'zoro-item',def:187,definition:{id:'visual_completo_zoro',name:'Zoro',slot:'visual_completo',kind:'visual-completo',requiredClass:'sword',description:'Cosmetic'}};
 for(const classId of ['sword','brawler','gunner','rogue','cyborg','strategist','healer']){
  b.game.classId=classId;const html=b.visualItemDetail(luffy);assert.match(html,/Todas as classes/);assert.doesNotMatch(html,/data-equip="luffy-item"[^>]*disabled/);
 }
 b.game.classId='unknown';assert.match(b.visualItemDetail(luffy),/data-equip="luffy-item"[^>]*disabled/);
 b.game.classId='brawler';const locked=b.visualItemDetail(zoro);assert.match(locked,/Exclusivo de Espadachim/);assert.match(locked,/data-equip="zoro-item"[^>]*disabled/);
 b.game.classId='sword';assert.doesNotMatch(b.visualItemDetail(zoro),/data-equip="zoro-item"[^>]*disabled/);
});
