'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../boss-dungeon-system.js');
const defs=[...S.fragments,{fruitId:'fruit-e-1'},{fruitId:'fruit-e-2'}],fruits=[{id:'fruit-e-1',rank:'E'},{id:'fruit-e-2',rank:'E'},{id:'fruit-s',rank:'S'}],xp=l=>Math.round(80+25*Math.pow(l-1,1.55));
const base=(level=10,id='character-1')=>S.migrate({characterId:id,level,xp:0,gold:0,inventory:[],equipment:{},stats:{goldEarned:50000,xpEarned:0}},id);
const win=(g,id='alvida',run='run-a')=>{const start=S.begin(g,id,run);assert(start.ok);const r=S.defeat(start.state,id,{runId:run,encounterId:run+':enemy'},xp);assert(r.ok);return r.state;};
const claim=(g,id='alvida',commit=()=>true)=>S.claim(g,id,{runId:g.bossDungeons.records[id].runId,position:{x:0,y:0},chest:{x:0,y:0,radius:90},defs,applyXP:(s,n)=>{s.xp+=n;s.stats.xpEarned+=n;},commit});
test('nine real dungeons, strict levels, six stable fragment types and official rarities',()=>{assert.equal(S.catalog.length,9);assert.equal(S.status(base(9),'alvida'),'locked');assert.equal(S.status(base(10),'alvida'),'available');assert.equal(S.status(base(19),'morgan'),'locked');assert.equal(S.status(base(20),'morgan'),'available');assert.equal(S.fragments.length,6);assert.deepEqual(S.fragments.map(f=>f.rarity),['rare','epic','epic','legendary','legendary','supreme']);assert.equal(new Set(S.fragments.map(f=>f.materialId)).size,6);});
test('only the matching enemy and instance can unlock the chest; retry before victory is allowed',()=>{let g=S.begin(base(),'alvida','one').state;assert(!S.defeat(g,'alvida',{runId:'one',encounterId:'wrong'},xp).ok);assert(!S.defeat(g,'alvida',{runId:'two',encounterId:'one:enemy'},xp).ok);assert(!claim(g).ok);const again=S.begin(g,'alvida','two');assert(again.ok);assert.equal(again.record.encounterId,'two:enemy');assert(!S.defeat(again.state,'alvida',{runId:'one',encounterId:'one:enemy'},xp).ok);});
test('XP uses fixed next-level bases and is snapshotted at victory',()=>{let at=win(base(10)),above=win(base(11));assert.equal(at.bossDungeons.records.alvida.reward.xp,Math.round(xp(10)*.2));assert.equal(above.bossDungeons.records.alvida.reward.xp,Math.round(xp(10)*.1));at.level=40;assert.equal(claim(at).reward.xp,Math.round(xp(10)*.2));assert.equal(win(base(20),'morgan').bossDungeons.records.morgan.reward.xp,Math.round(xp(20)*.2));});
test('one atomic claim gives exactly five bound fragments, Berry and XP; replay never writes',()=>{let g=win(base()),writes=0,received=claim(g,'alvida',()=>{writes++;return true;});assert(received.ok);assert.equal(writes,1);assert.equal(S.count(received.state),5);assert.equal(received.state.gold,500);assert.equal(received.state.inventory[0].boundToCharacter,g.characterId);assert(!claim(received.state,'alvida',()=>{writes++;return true;}).ok);assert.equal(writes,1);assert.equal(g.inventory.length,0);assert.equal(g.gold,0);});
test('full bag, failed persistence, distant interaction and wrong character preserve pending rewards',()=>{let g=win(base());g.inventory=Array.from({length:120},(_,i)=>({id:'other-'+i,def:10}));assert(!claim(g).ok);assert.equal(g.bossDungeons.records.alvida.phase,'pending');g.inventory=[];assert(!claim(g,'alvida',()=>{throw Error('quota');}).ok);assert.equal(g.gold,0);assert.equal(g.inventory.length,0);assert(!S.claim(g,'alvida',{runId:'run-a',position:{x:200,y:0},chest:{x:0,y:0,radius:90},defs}).ok);g.characterId='other-character';assert(!claim(g).ok);});
test('pending victory survives reload and resumes without a new enemy, while claimed cannot re-enter',()=>{let g=JSON.parse(JSON.stringify(win(base()))),resumed=S.begin(g,'alvida','new');assert(resumed.ok&&resumed.resume);assert.equal(resumed.record.runId,'run-a');g=claim(g).state;assert.equal(S.status(g,'alvida'),'claimed');assert(!S.begin(g,'alvida','again').ok);});
test('two chest rewards stack to ten without mixing owners or free materials',()=>{let g=claim(win(base())).state;g.level=20;g=claim(win(g,'morgan','run-m'),'morgan').state;assert.equal(g.inventory.length,1);assert.equal(S.count(g),10);assert.equal(g.inventory[0].sources.length,2);g.inventory.push({...g.inventory[0],id:'foreign',boundToCharacter:'foreign',quantity:40},{...g.inventory[0],id:'free',boundToCharacter:null,quantity:50});assert.equal(S.count(g),10);assert(!S.owner(g.inventory[1],g));assert(S.owner(g.inventory[2],g));});
const ten=()=>{let g=claim(win(base())).state;g.level=20;return claim(win(g,'morgan','run-m'),'morgan').state;};
test('forming consumes exactly ten and rolls only once among official Rank E, retaining the binding',()=>{const g=ten();let rolls=0,writes=0;const r=S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>{rolls++;return .9;},commit:()=>{writes++;return true;}});assert(r.ok);assert.equal(rolls,1);assert.equal(writes,1);assert.equal(S.count(r.state),0);assert.equal(r.item.fruitId,'fruit-e-2');assert.equal(r.item.boundToCharacter,g.characterId);assert.equal(r.state.inventory.length,1);assert.equal(g.inventory[0].quantity,10);assert.equal(r.state.bossDungeons.reveal.itemId,r.item.id);assert(!S.craft(r.state,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>{throw Error('replay');}}).ok);});
test('insufficient, locked, foreign and missing catalog fail before RNG; full bag checks the resulting slot count',()=>{for(const mutate of [g=>g.inventory[0].quantity=9,g=>g.inventory[0].locked=true,g=>g.inventory[0].boundToCharacter='someone-else']){const g=ten();mutate(g);assert(!S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>{throw Error('must not roll');}}).ok);}let g=ten();g.inventory[0].quantity=11;g.inventory.push(...Array.from({length:119},(_,i)=>({id:'x'+i,def:90})));assert(!S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>{throw Error('must not roll');}}).ok);});
test('failed formation writes no partial changes and can retry the same sampled fruit without another draw',()=>{const g=ten();let rolls=0;const r=S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>{rolls++;return .1;},commit:()=>false});assert(!r.ok);assert.equal(S.count(g),10);assert(r.chosenId);const retried=S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,chosenId:r.chosenId,random:()=>{rolls++;return .9;},commit:()=>true});assert(retried.ok);assert.equal(rolls,1);assert.equal(retried.item.fruitId,r.chosenId);});
test('reveal survives reload; acknowledging never draws or adds another item',()=>{const g=ten(),r=S.craft(g,{expectedSeq:g.bossDungeons.seq,defs,catalog:fruits,random:()=>0,commit:()=>true});const loaded=JSON.parse(JSON.stringify(r.state)),ack=S.acknowledge(loaded,r.item.id,()=>true);assert(ack.ok);assert.equal(ack.state.inventory.length,1);assert.equal(ack.state.bossDungeons.reveal,null);assert(!S.acknowledge(ack.state,r.item.id,()=>true).ok);});
test('the arena gate connects the lower spawn to the exported chest',()=>{
 const c=require('../tools/audit_maps.cjs').loadMaps(),map=c.MareWorld.maps['quest-dungeons'];
 const {chest,props,enemySpawn}=c.MareMapExports.get(map.id);
 const artwork=props.find(p=>p.id==='1cb97a09-0a88-4167-9627-1fd4b1e6ca0b');
 const n=new c.MareWorld.Navigation(map,16);
 assert.deepEqual({...chest.bounds},{x:artwork.x,y:artwork.y,w:artwork.w,h:artwork.h});
 assert(n.path(map.spawn,enemySpawn).length);
 assert(n.path(enemySpawn,chest).length);
 assert(!n.walkable(artwork.ground.x+artwork.ground.w/2,artwork.base-12));
});

test('Berry uses 1 percent of lifetime earnings at entry, never current wallet or later earnings',()=>{
 let g=base();g.gold=7;g.stats.goldEarned=123456;const entered=S.begin(g,'alvida','snapshot').state;
 assert.equal(entered.bossDungeons.records.alvida.berryReward,1234);entered.gold=999999;entered.stats.goldEarned=999999;
 const pending=S.defeat(entered,'alvida',{runId:'snapshot',encounterId:'snapshot:enemy'},xp).state;
 assert.equal(pending.bossDungeons.records.alvida.reward.berry,1234);assert.equal(claim(pending).reward.berry,1234);
 const zero=base();zero.stats.goldEarned=0;assert.equal(S.reward(zero,'alvida',xp).berry,0);
});

test('nine profiles preserve level and scale common attributes, with four early encounters calibrated',()=>{
 const C=require('../character-system.js');assert.deepEqual(S.catalog.map(d=>d.level),[10,20,30,40,50,60,70,80,90]);assert.equal(new Set(S.catalog.map(d=>d.monster)).size,9);
 const tuned={alvida:[3185,351,238,101],morgan:[4206,704,432,169],buggy:[8522,1150,778,300],kuro:[10390,1687,743,281]};
 for(const d of S.catalog){const p=S.combatProfile(d.id),baseProfile=d.normalCombat,normal=C.monsterProfile(baseProfile),fields=['maxHP','attack','defense','magicDefense'];assert.equal(p.attributePoints,C.earned(d.level)*3);
 if(tuned[d.id]){assert.deepEqual(fields.map(k=>p[k]),tuned[d.id]);assert(p.attackSec>=baseProfile.attackSec/2.25);}
 else{for(const k of fields)assert(Math.abs(p[k]-normal[k]*7.5)<=4,k);assert.equal(p.attackSec,baseProfile.attackSec/2.25);}
 assert.equal(p.speed,baseProfile.speed*2);for(const k of ['level','reach','aggro'])assert.equal(p[k],baseProfile[k]);assert.equal(S.status(base(d.level-1),d.id),'locked');assert.equal(S.status(base(d.level),d.id),'available');}
});
test('unconfigured rewards preserve each victory and do not grant currency or fragments',()=>{
 let g=base(90);for(const d of S.catalog.filter(d=>!d.rewardConfigured)){g=win(g,d.id,'run-'+d.id);assert.equal(S.reward(g,d.id,xp),null);assert.equal(g.bossDungeons.records[d.id].reward,null);const before=JSON.stringify(g);assert(!claim(g,d.id).ok);assert.equal(JSON.stringify(g),before);assert(S.begin(g,d.id,'new').resume);}
 assert.equal(Object.keys(g.bossDungeons.records).length,4);assert.equal(g.inventory.length,0);assert.equal(g.gold,0);
});
test('existing pending/claimed records survive idempotent migration independently',()=>{
 const g=claim(win(base())).state;g.bossDungeons.records.morgan={phase:'pending',ownerId:g.characterId,runId:'old',reward:{quantity:5}};
 const migrated=S.migrate(S.migrate(g));assert.deepEqual(migrated,g);assert.equal(S.status(migrated,'alvida'),'claimed');assert.equal(S.status(migrated,'morgan'),'pending');assert.equal(S.status(migrated,'buggy'),'locked');
});
