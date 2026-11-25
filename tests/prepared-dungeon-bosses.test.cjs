'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const project=path.join(__dirname,'..');
const wanted={
 hancock:[130,'Perfume Femur','Mero Mero Mellow',['area']],
 magellan:[140,'Golpe de Veneno','Hydra',['projectile','area']],
 ace:[150,'Hiken','Entei',['projectile','area']],
 aokiji:[160,'Ice Saber','Ice Age',['area']],
 akainu:[170,'Punho de Magma','Ryusei Kazan',['projectile','area']]
};
const stats={
 hancock:[213413,5392,3681,1368],magellan:[241886,5801,3960,1467],ace:[272149,6221,4248,1575],
 aokiji:[304088,6630,4527,1674],akainu:[337815,7040,4797,1773]
};
test('prepared boss IDs have independent basics, skills and visual effects and no live access',()=>{
 const P=require('../prepared-dungeon-bosses.js'),A=require('../prepared-dungeon-boss-art-data.js');
 const D=require('../boss-dungeon-system.js'),W=require('../world-battle.cjs'),T=require('../dungeon-timing.cjs');
 assert.deepEqual(Object.keys(P.catalog).sort(),Object.keys(wanted).sort());
 for(const [id,[level,basic,skill,fx]] of Object.entries(wanted)){
  const e=P.catalog[id],b=P.combatProfile(id);
  assert.deepEqual([e.level,e.normalAttack.name,e.skill.name,Object.keys(A.effects[id])],[level,basic,skill,fx]);
  assert.deepEqual([e.normalAttack.action,e.skill.action,e.skill.impactFrame,e.availability,e.rewardConfigured],['attack','special',2,'unassigned',false]);
  assert.deepEqual([b.level,b.xp,b.gold],[level,0,[0,0]]);
  assert.deepEqual([b.maxHP,b.attack,b.defense,b.magicDefense],stats[id]);
  assert(!D.byId[id]&&!Object.hasOwn(W.worldMonsterCatalog,e.monster)&&!Object.hasOwn(W.prisonCatalog,e.monster)&&!Object.hasOwn(T,e.monster));
  assert.notEqual(A.actors[e.monster].clips.attack.south.image,A.actors[e.monster].clips.special.south.image);
 }
 assert.equal(W.rulesHash,'5fa0fe9ceb9c07af9b4b3510e97b31edcb816034683ee0eb8f2af4da7b3f1810');
 assert.equal(require('../world-catalog.cjs').load().rulesHash,'1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd');
});
test('art loader resolves and draws all clips independently plus eight separate ground/projectile effects',()=>{
 const drawn=[],a=vm.createContext({console,MareNewIslandArt:{monster:()=>false},Image:class {
  addEventListener(){}
  set src(url){this.srcId=url;const png=fs.readFileSync(path.join(project,url));this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);this.complete=true;}
 }});
 for(const file of ['character-system.js','sprite-combat-v2-data.js','sprite-combat-v2.js','prepared-dungeon-boss-art-data.js','prepared-dungeon-boss-fx.js'])
  vm.runInContext(fs.readFileSync(path.join(project,file),'utf8'),a,{filename:file});
 const R=a.MareSpriteCombatV2,S=a.MarePreparedDungeonBossArtData,F=a.MarePreparedDungeonBossFx;
 const g={save(){},restore(){},drawImage(im,...args){drawn.push([im.srcId,args]);}};
 function verify(clip){
  assert.equal(clip.size,256);assert.equal(clip.frames,4);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(project,clip.image))).digest('hex'),clip.png_sha256);
 }
 let count=0;
 for(const [id,entry] of Object.entries(S.actors))for(const [act,dirs] of Object.entries(entry.clips)){
  assert.deepEqual(Object.keys(dirs).sort(),['east','north','south','west']);
  for(const [direction,clip] of Object.entries(dirs)){
   verify(clip);assert.deepEqual(Array.from(clip.anchor),[128,213]);
   if(act==='attack'||act==='special')assert.equal(clip.impact_frame,2);
   assert.equal(R.resolve(id,act,direction).requested,true);
   assert(R.draw(g,id,260,300,{action:act,direction,progress:.5,height:R.monsterHeight(id)}));
   assert.deepEqual(drawn.at(-1),[clip.image,[512,0,256,256,...drawn.at(-1)[1].slice(4)]]);
   count++;
  }
 }
 assert.equal(count,100);
 let effects=0;
 for(const [id,byKind] of Object.entries(S.effects))for(const [kind,clip] of Object.entries(byKind)){
  verify(clip);assert(F.draw(g,id,kind,300,300,{frame:2,scale:1}));
  assert.deepEqual(drawn.at(-1),[clip.image,[512,0,256,256,300-clip.anchor[0],300-clip.anchor[1],256,256]]);
  effects++;
 }
 assert.equal(effects,8);
 assert(!F.draw(g,'akainu','unknown',300,300,{frame:2}));
});
