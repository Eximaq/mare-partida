'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const expected={
 absalom:[114,219449,6705,2560,286,26000],perona:[118,248553,7440,2807,308,28000],
 ryuma:[122,281547,8256,3080,334,30000],oars:[127,329060,9407,3458,368,32600],
 'gecko-moria':[110,161606,4573,3114,1161,null]
};
test('five reference profiles match reference attributes without granting rewards',()=>{
 const T=require('../thriller-monsters.js');
 assert.deepEqual(Object.keys(T.catalog).sort(),Object.keys(expected).sort());
 for(const [id,want] of Object.entries(expected)){
  const p=T.combatProfile(id),m=T.catalog[id];assert(p);
  assert.deepEqual([p.level,p.maxHP,p.attack,p.defense,p.magicDefense,p.nominalXP??null],want);
  assert.deepEqual([p.xp,p.gold,m.rewardConfigured,m.availability],[0,[0,0],false,id==='gecko-moria'?'boss-dungeon':'unassigned']);
  assert(!Object.hasOwn(m,'area')&&!Object.hasOwn(m,'mapId')&&!Object.hasOwn(m,'dungeonId'));
 }
 assert.equal(T.catalog['gecko-moria'].profileKind,'boss-dungeon');
 assert.equal(T.combatProfile('unknown'),null);
});
test('only Moria enters the dungeon catalog and no Thriller species enters random pools',()=>{
 const E=require('../world-battle.cjs'),D=require('../boss-dungeon-system.js');
 for(const id of Object.keys(expected)){
  assert(!Object.hasOwn(E.worldMonsterCatalog,id)&&!Object.hasOwn(E.prisonCatalog,id));
  if(id==='gecko-moria')assert.equal(D.byId[id].monster,'dungeon-gecko-moria');
  else assert(!D.catalog.some(d=>[d.id,d.monster].includes(id)));
 }
});
test('80 legal authored strips load through normal directional sprite adapter',()=>{
 const drawn=[];
 const globals=vm.createContext({console,Image:class {
   addEventListener(){}
   set src(s){this.srcId=s;const raw=fs.readFileSync(path.join(root,s));this.naturalWidth=raw.readUInt32BE(16);this.naturalHeight=raw.readUInt32BE(20);this.complete=true;}
 }});
 for(const file of ['character-system.js','sprite-combat-v2-data.js','sprite-combat-v2.js','thriller-sprites.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),globals,{filename:file});
 const R=globals.MareSpriteCombatV2,S=globals.MareThrillerSpriteData;
 const ctx={save(){},restore(){},drawImage(im,...args){drawn.push([im.srcId,args]);}};
 let count=0;
 for(const [id,e] of Object.entries(S)){
  for(const [action,dirs] of Object.entries(e.clips)){
   assert.deepEqual(Object.keys(dirs).sort(),['east','north','south','west']);
   for(const [direction,cl] of Object.entries(dirs)){
    const size=id==='gecko-moria'?192:id==='oars'?256:128;
    assert.equal(cl.size,size);assert.equal(cl.frames,4);assert.equal(cl.anchor[0],size/2);
    assert.equal(cl.anchor[1],size===192?162:size===256?220:108);
    const src=fs.readFileSync(path.join(root,cl.image));
    assert.equal(crypto.createHash('sha256').update(src).digest('hex'),cl.png_sha256);
    assert.equal(R.status(id,action,direction),'ready');
    assert(R.draw(ctx,id,300,320,{action,direction,progress:.5,height:R.monsterHeight(id)}));
    assert.equal(drawn.at(-1)[0],cl.image);
    assert.equal(drawn.at(-1)[1][0],size*2);count++;
   }
  }
 }
 assert.equal(count,80);
 assert(R.monsterHeight('oars')>R.monsterHeight('gecko-moria'));
 assert(R.monsterHeight('gecko-moria')>R.monsterHeight('ryuma'));
});
