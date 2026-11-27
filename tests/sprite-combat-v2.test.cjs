'use strict';
const assert=require('node:assert/strict');
// A missing damage gate, refreshed timestamp on every hit, or wrong priority must fail here.
require('../sprite-combat-v2.js');
const S=globalThis.MareSpriteCombatV2,actor={};
assert.equal(S.hurt(actor,0,1),false);
assert.equal(S.hurtProgress(actor,1),null);
assert.equal(S.hurt(actor,5,1),true);
assert.equal(S.hurtProgress(actor,1),0);
assert.equal(S.hurt(actor,5,1.05),false);
assert.ok(Math.abs(S.hurtProgress(actor,1.09)-.5)<1e-8);
assert.equal(S.hurtProgress(actor,1.181),null,'consecutive hits cannot extend the reaction');
assert.equal(S.hurt(actor,5,1.2,{protected:true}),false,'skill/transition/death never queue stale hurt');
assert.equal(S.hurtProgress(actor,1.2),null);
assert.equal(S.hurt(actor,5,1.3),true);
assert.equal(S.hurtProgress(actor,1.29),null,'scene clock reset must clear stale reactions');
console.log('Visual Hurt: effective damage only, immediate start, 180ms bound, multi-hit coalescing, protected actions and clock reset passed');
require('../sprite-combat-v2-data.js');
// South Hurt is now the explicit art direction, independent of actor facing.
assert.equal(S.resolve('kuroobi','attack','west').requested,true);
assert.equal(S.resolve('ryu','bite','east').clip.source_animation,'Ataque_special_haki_1');
assert.equal(S.resolve('ryu','tail','east').clip.source_animation,'Ataque_especial_2');
assert.equal(S.resolve('uma','walk','east').clip.source_animation,'Corrida');
assert.equal(S.resolve('wolf','hurt','south').requested,true);
assert.equal(S.resolve('tori','hurt','west').clip.image,'assets/sprites-combat-v2/tori/hurt-south.png');
const hurtClip=S.resolve('cocox','hurt','south').clip;
assert.equal(S.frameAt(hurtClip,{progress:0}),3);assert.equal(S.frameAt(hurtClip,{progress:1}),6);
const attack=S.resolve('neko','attack','south').clip;
assert.equal(S.frameAt(attack,{progress:4/9,hitRatio:4/9}),19,'new contact pose aligns to unchanged logical impact');
console.log('Presentation: direction-safe fallback, separate Ryu specials, native run fallback, inspected Hurt ranges and visual-only contact alignment passed');

const {test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
test('Cocox keeps its HD attack through a pending resource, bounded retries and reconnection',()=>{
 const loads=[],drawn=[],hud=[],network={};let now=10_000;
 const read=file=>fs.readFileSync(require.resolve('../'+file),'utf8');
 const context=vm.createContext({
  console:{error(){}},Date:{now:()=>now},addEventListener(type,listener){network[type]=listener;},
  Image:class{
   constructor(){this.complete=false;this.listeners={};}
   set src(url){this.url=url;loads.push(this);}
   addEventListener(type,listener){this.listeners[type]=listener;}
   completeWith(width,height){Object.assign(this,{naturalWidth:width,naturalHeight:height,complete:true});}
   fail(){this.completeWith(0,0);this.listeners.error();}
  },
  MareCharacters:{monsterAttackVisualDuration:()=>.6},
  MareMapPlayerHud:{drawEnemy(){hud.push('drawn');}},
  MareNewIslandArt:{monster(){throw Error('Cocox must not reach a legacy renderer');}},
  ctx:{save(){},restore(){},drawImage(image){drawn.push(image.url);}},
  world:{time:5,target:null},enemyHudBox:()=>({})
 });
 for(const file of ['sprite-combat-v2-data.js','sprite-combat-v2.js','rare-renderer.js'])vm.runInContext(read(file),context,{filename:file});
 const game=read('game.js');
 vm.runInContext(game.slice(game.indexOf('  function drawMobArt('),game.indexOf('  function drawTalentFields(')),context,{filename:'game.js:monster-rendering'});
 const enemy={type:'cocox',alive:true,x:210,y:180,emberFacing:'south',moving:0,attackAnim:0};
 const other={...enemy,x:420},idle='assets/sprites-combat-v2/cocox/idle-south.png',attack='assets/sprites-combat-v2/cocox/attack-south.png';
 const attempts=()=>loads.filter(image=>image.url===attack);
 const ready=(file,action)=>{
  const clip=context.MareSpriteCombatV2.resolve('cocox',action,'south').clip;
  loads.filter(image=>image.url===file).at(-1).completeWith(clip.size*clip.frames,clip.size);
 };
 context.drawMonster(enemy);ready(idle,'idle');
 context.drawMonster(enemy);assert.deepEqual(drawn,[idle]);
 enemy.attackAnim=.45;
 context.drawMonster(enemy);context.drawMonster(other);
 assert.deepEqual(drawn,[idle,idle],'the loaded control still draws while the attack is pending');
 assert.equal(hud.length,4,'the map keeps the HP labels while a sprite is pending');
 assert.equal(attempts().length,1);
 attempts()[0].fail();
 now+=999;context.drawMonster(enemy);assert.equal(attempts().length,1);
 now+=1;context.drawMonster(enemy);assert.equal(attempts().length,2);
 attempts()[1].completeWith(12,12);
 context.drawMonster(enemy);
 now+=2_000;context.drawMonster(enemy);assert.equal(attempts().length,3);
 attempts()[2].fail();
 now+=60_000;context.drawMonster(enemy);assert.equal(attempts().length,3);
 assert.deepEqual(drawn,[idle,idle],'failed attacks never draw a substitute');
 network.online();
 context.drawMonster(enemy);assert.equal(attempts().length,4);
 ready(attack,'attack');
 context.drawMonster(enemy);assert.deepEqual(drawn,[idle,idle,attack]);
 assert(!loads.some(image=>image.url.startsWith('assets/rare-animals/cocox/')));
});
