'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const expected={
 kuma:[120,186615,4982,3393,1260,null],kizaru:[130,213413,5392,3681,1368,null],
 pacifista:[131,372822,10443,3796,398,34800],urouge:[136,435851,11903,4266,439,37600],
 hawkins:[141,509606,13572,4794,485,40600],'x-drake':[146,595902,15475,5392,534,43700]
};
test('Sabaody profiles feed world encounters and two level-gated dungeons without entering Impel Down',()=>{
 const C=require('../sabaody-monsters.js'),E=require('../world-battle.cjs'),D=require('../boss-dungeon-system.js');
 assert.deepEqual(Object.keys(C.catalog).sort(),Object.keys(expected).sort());
 for(const [id,want] of Object.entries(expected)){
  const m=C.catalog[id],p=C.combatProfile(id);
  assert.deepEqual([p.level,p.maxHP,p.attack,p.defense,p.magicDefense,p.nominalXP??null],want);
  const boss=want[5]===null;
  assert.deepEqual([p.xp,p.gold,m.availability,m.rewardConfigured],[0,[0,0],boss?'boss-dungeon':'world',false]);
  assert.equal(m.profileKind,want[5]===null?'boss-dungeon':'common');
  assert(!m.mapId&&!m.dungeonId&&!m.area);
  assert(!Object.hasOwn(E.prisonCatalog,id));
  if(boss){
   assert(!Object.hasOwn(E.worldMonsterCatalog,id));assert.equal(D.byId[id].monster,'dungeon-'+id);
   assert.equal(D.byId[id].level,want[0]);assert(E.worldMonsterCatalog['dungeon-'+id].worldOnly);assert(!E.prisonCatalog['dungeon-'+id]);
  }else{
   assert(E.worldMonsterCatalog[id].worldOnly);assert.equal(E.worldMonsterCatalog[id].xp,want[5]);
   assert(!D.catalog.some(d=>[d.id,d.monster].includes(id)));
  }
 }
});
function renderer(){
 const root=path.join(__dirname,'..'),drawn=[],c=vm.createContext({console,MareNewIslandArt:{monster:()=>false},Image:class {
  addEventListener(){}
  set src(url){this.srcId=url;const png=fs.readFileSync(path.join(root,url));this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);this.complete=true;}
 }});
 for(const f of ['character-system.js','sprite-combat-v2-data.js','sprite-combat-v2.js','sabaody-monsters.js','sabaody-sprites.js','sabaody-rendering.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
 const ctx={save(){},restore(){},drawImage(im){drawn.push(im.srcId)}};
 return {c,ctx,drawn};
}
test('all nine forms and all 144 directional strips load from the common compositor',()=>{
 const {c,ctx}=renderer(),R=c.MareSpriteCombatV2,S=c.MareSabaodySpriteData;
 assert.equal(Object.keys(S).length,9);
 let count=0;
 for(const [key,sprite] of Object.entries(S))for(const [act,dirs] of Object.entries(sprite.clips)) {
  assert.deepEqual(Object.keys(dirs).sort(),['east','north','south','west']);
  for(const [dir,cl] of Object.entries(dirs)){
   assert.deepEqual(Array.from(cl.anchor),[96,166]);assert.equal(cl.size,192);assert.equal(cl.frames,4);
   assert.equal(cl.png_sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',cl.image))).digest('hex'));
   assert.equal(R.status(key,act,dir),'ready');assert(R.draw(ctx,key,240,260,{action:act,direction:dir}));count++;
  }
 }
 assert.equal(count,144);
});
test('only damage to Drake triggers Zoan; prepared alternatives and resets are actor-specific',()=>{
 const {c,ctx,drawn}=renderer(),R=c.MareSpriteCombatV2,C=c.MareSabaodyMonsters;
 const actor=(type)=>({type,x:220,y:230,hp:950,alive:true,engaged:true,emberFacing:'east'});
 const m=actor('x-drake'),peer=actor('x-drake');
 function draw(a,t){assert(c.MareNewIslandArt.monster(ctx,a,t));return drawn.at(-1);}
 assert.match(draw(m,1),/\/x-drake\/idle-east/);
 assert(!R.hurt(m,0,1.1));assert.match(draw(m,1.2),/\/x-drake\/idle-east/);
 assert(R.hurt(m,30,2));assert.match(draw(m,2.1),/\/x-drake\/hurt-east/);
 assert.match(draw(m,2.2),/\/x-drake-zoan\/idle-east/);
 assert.match(draw(peer,2.2),/\/x-drake\/idle-east/);
 m.attackAnim=.2;assert.match(draw(m,2.21),/\/x-drake-zoan\/attack-east/);
 m.attackAnim=0;assert(R.hurt(m,3,2.4));assert.match(draw(m,2.45),/\/x-drake-zoan\/hurt-east/);
 m.engaged=false;assert.match(draw(m,2.5),/\/x-drake\/idle-east/);
 for(const key of ['urouge','hawkins']){
  const x=actor(key);
  assert(R.hurt(x,7,1));assert.match(draw(x,1.2),new RegExp('/'+key+'/idle-east'));
  assert(C.setPreparedForm(x,true));assert.match(draw(x,1.3),new RegExp('/'+C.catalog[key].alternateSprite+'/idle-east'));
  x.returning=true;assert.match(draw(x,1.4),new RegExp('/'+key+'/idle-east'));
 }
 assert(!C.setPreparedForm(peer,true));
});
