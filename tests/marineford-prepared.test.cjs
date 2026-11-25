'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),ids=['izo','jozu','little-oars-jr','onigumo','squard','vista'];
const expected={
 squard:[151,696887,17651,6064,589,46900],onigumo:[156,815064,20137,6824,649,50200],
 'little-oars-jr':[161,953372,22976,7679,716,53600],izo:[166,1115228,26221,8647,791,57200],
 vista:[171,1304655,29929,9737,871,60900],jozu:[176,1526357,34165,10968,961,64700]
};
test('six Marineford profiles follow the normal curve without enabling live encounters',()=>{
 const S=require('../marineford-sprites.js'),M=require('../marineford-monsters.js'),E=require('../world-battle.cjs'),D=require('../boss-dungeon-system.js');
 assert.deepEqual(Object.keys(S).sort(),ids);
 assert.deepEqual(Object.keys(M.catalog).sort(),ids);
 for(const id of ids){
  assert.equal(S[id].availability,'unassigned');
  const p=M.combatProfile(id),m=M.catalog[id];
  assert.deepEqual([p.level,p.maxHP,p.attack,p.defense,p.magicDefense,p.nominalXP],expected[id]);
  assert.deepEqual([p.xp,p.gold,m.availability,m.profileKind,m.rewardConfigured],[0,[0,0],'unassigned','common',false]);
  for(const k of ['level','xp','area','mapId','dungeonId','normalCombat','reward'])assert(!Object.hasOwn(S[id],k),id+': '+k);
  assert(!Object.hasOwn(E.worldMonsterCatalog,id)&&!Object.hasOwn(E.prisonCatalog,id));
  assert(!D.catalog.some(d=>[d.id,d.monster].includes(id)));
 }
 assert.equal(E.rulesHash,'5fa0fe9ceb9c07af9b4b3510e97b31edcb816034683ee0eb8f2af4da7b3f1810');
 assert.equal(require('../world-catalog.cjs').load().rulesHash,'1d59b830667d4842300bf0a74d9a898cdb74a910bc5819877ddcb32827bac1cd');
});
test('96 approved strips use four frames with directional hurt and separate giant anchor',()=>{
 const drawn=[];
 const c=vm.createContext({console,MareNewIslandArt:{monster:()=>false},Image:class {
  addEventListener(){}
  set src(url){this.srcId=url;const png=fs.readFileSync(path.join(root,url));this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);this.complete=true;}
 }});
 for(const file of ['character-system.js','sprite-combat-v2-data.js','sprite-combat-v2.js','thriller-sprites.js','marineford-sprites.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
 const R=c.MareSpriteCombatV2,S=c.MareMarinefordSpriteData;
 const ctx={save(){},restore(){},drawImage(im,...args){drawn.push([im.srcId,args]);}};
 let n=0;
 for(const [key,s] of Object.entries(S)){
  assert.equal(s.directionalHurt,true);
  assert.deepEqual(Object.keys(s.clips).sort(),['attack','hurt','idle','walk']);
  for(const [act,dirs] of Object.entries(s.clips)){
   assert.deepEqual(Object.keys(dirs).sort(),['east','north','south','west']);
   for(const [direction,clip] of Object.entries(dirs)){
    const giant=key==='little-oars-jr',size=giant?256:192;
    assert.equal(clip.size,size);assert.equal(clip.frames,4);
    assert.deepEqual(Array.from(clip.anchor),giant?[128,220]:[96,166]);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,clip.image))).digest('hex'),clip.png_sha256);
    assert.equal(R.status(key,act,direction),'ready');
    assert(R.draw(ctx,key,240,260,{action:act,direction,progress:.5,height:R.monsterHeight(key)}));
    assert.equal(drawn.at(-1)[0],clip.image);assert.equal(drawn.at(-1)[1][0],size*2);n++;
   }
  }
 }
 assert.equal(n,96);
 assert(R.monsterHeight('little-oars-jr')>R.monsterHeight('jozu'));
 const older=c.MareThrillerSpriteData.oars;
 assert.equal(R.resolve('oars','idle','south').clip.image,older.clips.idle.south.image);
 assert.notEqual(R.resolve('little-oars-jr','idle','south').clip.image,older.clips.idle.south.image);
});
