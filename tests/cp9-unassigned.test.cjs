'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function context(){
 const render=[];
 const c=vm.createContext({console,Image:class {
   addEventListener(){}
   set src(url){this.url=url;const png=fs.readFileSync(path.join(root,url));this.width=this.naturalWidth=png.readUInt32BE(16);this.height=this.naturalHeight=png.readUInt32BE(20);this.complete=true;}
 }});
 for(const file of ['character-system.js','cp9-monsters.js','cp9-sprites.js','sprite-combat-v2-data.js','sprite-combat-v2.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
 const ctx={save(){},restore(){},drawImage(image,...geometry){render.push({path:image.url,geometry});}};
 return {c,ctx,render};
}
test('six CP9 profiles remain outside active encounters and live world rule hashes are unchanged',()=>{
 const C=require('../cp9-monsters.js'),E=require('../world-battle.cjs'),D=require('../boss-dungeon-system.js');
 assert.deepEqual(Object.fromEntries(Object.entries(C.catalog).map(([id,m])=>[id,m.level])),{fukurou:97,'rob-lucci':100,kalifa:101,jabra:104,blueno:107,kaku:110});
 for(const m of Object.values(C.catalog)){
  assert.equal(m.availability,'unassigned');
  assert(!Object.hasOwn(m,'area')&&!Object.hasOwn(m,'mapId')&&!Object.hasOwn(m,'dungeonId'));
  assert(!Object.hasOwn(E.worldMonsterCatalog,m.id)&&!Object.hasOwn(E.prisonCatalog,m.id));
  assert(!D.catalog.some(d=>[d.id,d.monster].includes(m.id)));
 }
 assert.equal(E.rulesHash,'5fa0fe9ceb9c07af9b4b3510e97b31edcb816034683ee0eb8f2af4da7b3f1810');
 assert.equal(require('../world-catalog.cjs').load().rulesHash,'1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd');
});
test('Lucci uses the existing dungeon attributes curve from level 90, with no assigned rewards',()=>{
 const C=require('../cp9-monsters.js'),P=require('../character-system.js');
 const raw=C.catalog['rob-lucci'].normalCombat,stats=C.combatProfile('rob-lucci',P);
 const croc=require('../boss-dungeon-system.js').combatProfile('crocodile');
 assert.deepEqual([croc.maxHP,croc.attack,croc.defense,croc.magicDefense],[116730,3744,2547,945]);
 assert.deepEqual([raw.level,raw.maxHP,raw.attack,raw.defense],[100,10215,226,117]);
 assert.deepEqual([stats.maxHP,stats.attack,stats.defense,stats.magicDefense,stats.xp,stats.gold],[138274,4154,2835,1053,0,[0,0]]);
 assert.equal(C.catalog['rob-lucci'].rewardConfigured,false);
});
test('actual sprite renderer 132 directional strips share the intended pivots with world height calibration',()=>{
 const {c,ctx,render}=context(),R=c.MareSpriteCombatV2,C=c.MareCp9Monsters,S=c.MareCp9SpriteData;
 let checked=0;
 for(const [key,entry] of Object.entries(S)){
  for(const [action,frames] of Object.entries(entry.clips))for(const direction of Object.keys(frames)){
   const cl=frames[direction];assert.equal(R.status(key,action,direction),'ready');assert.equal(cl.anchor[0],64);assert.equal(cl.anchor[1],108);
   assert(R.draw(ctx,key,150,180,{action,direction,progress:.5}));
   assert.equal(render.at(-1).geometry[0],256);
   assert(cl.bounds.every(b=>b[0]<b[2]&&b[1]<b[3]&&b[3]<=128));checked++;
  }
 }
 assert.equal(checked,132);
 assert.equal(R.monsterHeight('rob-lucci-zoan'),126);assert.equal(R.monsterHeight('fukurou'),98);
 assert.equal(C.isMonster('rob-lucci-zoan'),false,'sprite form is not a second monster');
});
test('real monster renderer keeps CP9 damage transformation isolated per actor until disengagement',()=>{
 const {c,ctx,render}=context(),R=c.MareSpriteCombatV2;
 for(const key of ['kaku','jabra','rob-lucci']){
  const m={type:key,x:200,y:180,hp:900,alive:true,engaged:true,emberFacing:'east'},peer={...m};
  const draw=(time,a=m)=>{assert(R.monster(ctx,a,time));return render.at(-1).path;};
  assert.match(draw(1),new RegExp('/'+key+'/idle-east'));
  assert(!R.hurt(m,0,1.4));assert.match(draw(1.5),new RegExp('/'+key+'/idle-east'));
  assert(R.hurt(m,20,2));assert.match(draw(2.08),new RegExp('/'+key+'/hurt-east'));
  assert.match(draw(2.19),new RegExp('/'+key+'-zoan/idle-east'));
  assert.match(draw(2.19,peer),new RegExp('/'+key+'/idle-east'));
  m.attackAnim=.2;assert.match(draw(2.21),new RegExp('/'+key+'-zoan/attack-east'));
  m.attackAnim=0;assert(R.hurt(m,10,2.5));assert.match(draw(2.53),new RegExp('/'+key+'-zoan/hurt-east'));
  m.engaged=false;assert.match(draw(2.55),new RegExp('/'+key+'/idle-east'));
  m.engaged=true;assert(R.hurt(m,10,3));assert.match(draw(3.02),new RegExp('/'+key+'/hurt-east'));
 }
});
