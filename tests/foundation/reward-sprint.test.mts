import {test} from 'node:test';
import {originalItemSchema} from '@mare/shared';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {rollWeeklyBossLoot} from '../../apps/game-server/src/characters/weekly-boss-loot.js';
import {getGameCatalog} from '../../apps/game-server/src/gameplay/catalog.js';
import {itemTradeRestriction} from '../../apps/game-server/src/characters/item-negotiability.js';
const require=createRequire(import.meta.url);
const A=require('../../akuma-system.js'),D=require('../../boss-dungeon-system.js'),F=require('../../forge-system.js');

test('Zoan ranks and map fragment rolls use the official boundaries',()=>{
 const zoan=A.byId('akuma_ushi_giraffe');
 assert.deepEqual(['E','D','C','B','A','S'].map(rank=>A.zoanBasicMultiplier({...zoan,rank},true)),[1.2,1.35,1.55,1.65,1.75,2]);
 assert.equal(A.zoanBasicMultiplier(zoan,false),1);
 assert.equal(F.mapFragmentChance({source:'world',level:39}),0);
 assert.equal(F.mapFragmentChance({source:'boss-dungeon',level:80}),0);
 assert.equal(F.mapFragmentChance({source:'world',level:40}),.006);
});

test('seeded million-roll simulation matches Epic, Rank D and independent boss categories',()=>{
 const seeded=(seed:number)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const random=seeded(128377),rankDRandom=seeded(1753143),gearRandom=seeded(4018839);
 const total=1_000_000,counts={rankB:0,armament:0,observation:0,both:0,rankD:0,epic:0};
 for(let i=0;i<total;i++){
  const draw=rollWeeklyBossLoot(random);
  if(draw.rank_b)counts.rankB++;
  if(draw.haki)counts[draw.haki]++;
  if(draw.rank_b&&draw.haki)counts.both++;
  if(rankDRandom()<F.mapFragmentChance({source:'world',level:40}))counts.rankD++;
  if(gearRandom()<F.generationRules.normalGearChance&&F.rollRarity(gearRandom)==='epic')counts.epic++;
 }
 for(const [key,rate] of [['rankB',.01],['armament',.005],['observation',.005],['both',.0001],['rankD',.006],['epic',.006]] as const){
  assert(Math.abs(counts[key]-total*rate)<=4*Math.sqrt(total*rate*(1-rate)),key);
 }
 console.log(JSON.stringify({total,counts}));
});

test('dungeon boxes preserve the victory level and the binding; map fragments remain tradable',()=>{
 const defs=getGameCatalog().items,save={level:174,characterId:'00000000-0000-4000-8000-000000000001',inventory:[]};
 const reward=D.reward(save,'arlong'),box=D.rewardItem(defs,reward,'arlong','box-1',0);
 const opened=D.openEpicBox({...save,level:190,inventory:[box]},box.id,defs,()=>.4,1);
 assert(opened.ok);assert.equal(opened.item.level,174);assert(originalItemSchema.safeParse(box).success);assert(originalItemSchema.safeParse(opened.item).success);assert.equal(opened.item.rarity,'epic');assert.equal(opened.item.potential,70);
 assert.equal(itemTradeRestriction(box),'bound');assert.equal(itemTradeRestriction(opened.item),'bound');
 for(const id of ['wapol','crocodile']){const r=D.reward(save,id),fragment=D.rewardItem(defs,r,id,id,0);assert.equal(fragment.quantity,10);assert.equal(fragment.rank,'B');assert.equal(itemTradeRestriction(fragment),'bound');}
 const stock:any[]=[];D.addMapFragment(stock,defs,'test',()=> 'fragment',0);D.addMapFragment(stock,defs,'test',()=> 'duplicate',0);
 assert.equal(stock.length,1);assert.equal(stock[0].quantity,2);assert.equal(itemTradeRestriction(stock[0]),null);
});

test('Rank B formation preserves binding only when it spends bound fragments',()=>{
 const defs=getGameCatalog().items;
 const characterId='00000000-0000-4000-8000-000000000001';
 const bound=D.rewardItem(defs,D.reward({characterId,level:82},'wapol'),'wapol','bound-b',0);
 const free={...bound,id:'free-b',origin:'Boss Semanal'};
 delete free.binding;
 delete free.boundToCharacter;
 const make=(inventory:any[])=>D.migrate({characterId,level:82,inventory});
 const craft=(save:any)=>D.craft(save,{rank:'B',expectedSeq:save.bossDungeons.seq,defs,catalog:A.catalog,
  random:()=>.4,commit:()=>true,now:1});
 for(const [inventory,expected] of [[[{...free,quantity:D.recipes.B.quantity}],false],[[free,bound],true]] as const){
  const before=make([...inventory]);
  assert.equal(D.formationPlan(before,'B').bound,expected);
  const result=craft(before);
  assert(result.ok);
  assert.equal(itemTradeRestriction(result.item),expected?'bound':null);
  assert.equal(result.state.inventory.length,1);
  assert.equal(craft(JSON.parse(JSON.stringify(result.state))).ok,false);
 }
});
