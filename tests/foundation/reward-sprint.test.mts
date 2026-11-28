import {test} from 'node:test';
import {originalItemSchema,originalSlotSchema} from '@mare/shared';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {awardWorldLoot} from '../../apps/game-server/src/gameplay/inventory.js';
import {dungeonStateSchema} from '../../packages/shared/src/schemas/dungeons.js';
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
 const world=(level:number)=>({source:'world',level});
 const roll=(level:number,n:number)=>F.rollMapFragment(world(level),()=>n);
 assert.equal(F.rollMapFragment(world(39),()=>assert.fail('Monstro inelegível não rola')),null);
 assert.equal(F.rollMapFragment({source:'boss-dungeon',level:180},()=>assert.fail('Masmorra não rola loot de caçada')),null);
 for(const level of [40,99,100]){
  assert.equal(roll(level,0),'D');
  assert.equal(roll(level,.006-Number.EPSILON),'D');
 }
 assert.equal(roll(40,.006),null);
 assert.equal(roll(99,.006),null);
 assert.equal(roll(100,.006),'C');
 assert.equal(roll(100,.009-Number.EPSILON),'C');
 assert.equal(roll(100,.009),null);
});

test('weekly boss retains separate B and Haki chances at their exact boundaries',()=>{
 const roll=(...values:number[])=>rollWeeklyBossLoot(()=>values.shift()!);
 assert.deepEqual(roll(0,0,0),{rank_b:true,haki:'armament'});
 assert.deepEqual(roll(0,.01),{rank_b:true,haki:null});
 assert.deepEqual(roll(.01,0,.5),{rank_b:false,haki:'observation'});
 assert.deepEqual(roll(.01,.01),{rank_b:false,haki:null});
});

test('one tradable Rank C goes to the existing Correio with a full bag',async()=>{
 const id=randomUUID(),killId=randomUUID(),letters=new Map<string,{id:string;attachments:unknown[]}>();
 const stock=Array.from({length:120},(_,i)=>({id:'bag-'+i,def:0,level:1,plus:0,locked:false,obtainedAt:0}));
 const equipment=Object.fromEntries(originalSlotSchema.options.map(slot=>[slot,null]));
 const client={query:async(sql:string,args:unknown[]=[]):Promise<{rows:unknown[];rowCount?:number}>=>{
  if(sql.includes('SELECT i.inventory'))return {rows:[{inventory:stock,equipment,materials:0,potions:0,forge_seq:0,forge_history:[]}]};
  if(sql.includes('SELECT class_id,faction_id'))return {rows:[{class_id:'sword',faction_id:'pirate'}]};
  if(sql.includes('SELECT id FROM mare_game.characters'))return {rows:[{id}],rowCount:1};
  if(sql.includes('SELECT id FROM mare_game.social_mail'))return {rows:[letters.get(args.slice(0,4).join(':'))].filter(Boolean)};
  if(sql.includes('INSERT INTO mare_game.social_mail')){
   const letter={id:randomUUID(),attachments:JSON.parse(String(args[6]))};
   letters.set(args.slice(0,4).join(':'),letter);
   return {rows:[letter]};
  }
  if(sql.includes('UPDATE mare_game.game_inventory')){
   assert.deepEqual(JSON.parse(String(args[1])),stock);
   return {rows:[]};
  }
  if(sql.includes('UPDATE mare_game.character_progression')||sql.includes('INSERT INTO mare_game.game_inventory_events'))return {rows:[]};
  throw Error('Consulta inesperada: '+sql);
 }} as unknown as PoolClient;
 const kill={id:killId,area:'enies-lobby-02',monster:{type:'kalifa',source:'world',level:101},reward:{xp:0,gold:0,potionChance:0}};
 for(const roll of [.008,.004])await awardWorldLoot(client,id,randomUUID(),{level:101,gold:'0',experience:'0',version:0} as Parameters<typeof awardWorldLoot>[3],[kill],undefined,0,{rng:()=>roll});
 assert.equal(letters.size,1);
 const [item]=[...letters.values()][0]!.attachments as {rank:string;materialId:string;quantity:number}[];
 assert(item);
 assert.equal(item.rank,'C');
 assert.equal(item.materialId,'akuma_fragment_c');
 assert.equal(item.quantity,1);
 assert.equal(itemTradeRestriction(item as Parameters<typeof itemTradeRestriction>[0]),null);
 assert(originalItemSchema.safeParse(item).success);
});

test('dungeon boxes preserve the victory level and the binding; map fragments remain tradable',()=>{
 const defs=getGameCatalog().items,save={level:174,characterId:'00000000-0000-4000-8000-000000000001',inventory:[]};
 const reward=D.reward(save,'arlong'),box=D.rewardItem(defs,reward,'arlong','box-1',0);
 const opened=D.openEpicBox({...save,level:190,inventory:[box]},box.id,defs,()=>.4,1);
 assert(opened.ok);assert.equal(opened.item.level,174);assert(originalItemSchema.safeParse(box).success);assert(originalItemSchema.safeParse(opened.item).success);assert.equal(opened.item.rarity,'epic');assert.equal(opened.item.potential,70);
 assert.equal(itemTradeRestriction(box),'bound');assert.equal(itemTradeRestriction(opened.item),'bound');
 for(const id of ['wapol','crocodile']){
  const [fragment]=D.rewardItems(defs,D.reward(save,id),id,id,0);
  assert.equal(fragment.quantity,10);assert.equal(fragment.rank,'C');assert.equal(itemTradeRestriction(fragment),'bound');
 }
 const [freeBox,b]=D.rewardItems(defs,D.reward(save,'gecko-moria'),'gecko-moria','box-2',0);
 assert.notEqual(freeBox.id,b.id);
 assert(originalItemSchema.safeParse(freeBox).success);assert(originalItemSchema.safeParse(b).success);
 assert.equal(freeBox.level,174);assert.equal(itemTradeRestriction(freeBox),null);
 assert.equal(b.rank,'B');assert.equal(b.quantity,10);assert.equal(itemTradeRestriction(b),'bound');
 const free=D.openEpicBox({...save,level:190,inventory:[freeBox]},freeBox.id,defs,()=>.4,1);
 assert(free.ok);assert.equal(free.item.level,174);assert.equal(free.item.potential,70);assert.equal(itemTradeRestriction(free.item),null);
 assert.equal(D.openEpicBox({...save,characterId:'other',inventory:[box]},box.id,defs,()=>.4,1).ok,false);
 const stock:any[]=[];D.addTradeableFragment(stock,defs,'D','test',()=> 'fragment',0);D.addTradeableFragment(stock,defs,'D','test',()=> 'duplicate',0);
 assert.equal(stock.length,1);assert.equal(stock[0].quantity,2);assert.equal(itemTradeRestriction(stock[0]),null);
});

test('Rank B formation preserves binding only when it spends bound fragments',()=>{
 const defs=getGameCatalog().items;
 const characterId='00000000-0000-4000-8000-000000000001';
 const bound={...D.addTradeableFragment([],defs,'B','Masmorra',()=> 'bound-b',0),quantity:10,binding:'character',boundToCharacter:characterId};
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

test('formation consumes exactly the recipe for E through S and preserves inaccessible stacks',()=>{
 const defs=getGameCatalog().items,characterId=randomUUID();
 for(const [rank,quantity] of [['E',10],['D',20],['C',20],['B',20],['A',20],['S',20]] as const){
  const stack=(name:string,amount:number)=>({...D.addTradeableFragment([],defs,rank,'Caçada',()=>name,0),quantity:amount});
  const blocked={...stack('locked',100),locked:true};
  const other={...stack('other',100),boundToCharacter:randomUUID(),binding:'character'};
  const wrong={...D.addTradeableFragment([],defs,rank==='E'?'D':'E','Other',()=> 'wrong',0),quantity:100};
  const free=stack('free',quantity-1),bound={...stack('bound',3),boundToCharacter:characterId,binding:'character'};
  const save=D.migrate({characterId,inventory:[free,blocked,other,wrong]});
  const craft=(original:any,options:Record<string,unknown>={})=>D.craft(original,{expectedSeq:save.bossDungeons.seq,rank,defs,catalog:A.catalog,random:()=>.4,commit:()=>true,now:1,...options});
  assert.equal(D.recipes[rank].quantity,quantity);
  assert.equal(craft(save,{commit:()=>assert.fail('Não grava sem material suficiente')}).ok,false);
  const full={...save,inventory:[...save.inventory,bound]};
  const before=structuredClone(full);
  const unavailable=craft(full,{catalog:[],commit:()=>assert.fail('Não grava sem fruta elegível')});
  assert.equal(unavailable.code,'dungeon_craft_rank_unavailable');
  assert.equal(craft(full,{commit:()=>false}).ok,false);
  assert.deepEqual(full,before);
  const result=craft(full);
  assert(result.ok,rank+': '+result.message);
  assert.equal(result.item.rank,rank);
  assert.equal(A.byId(result.item.fruitId).rank,rank);
  assert.equal(result.item.boundToCharacter,characterId);
  assert(originalItemSchema.safeParse(result.item).success);
  assert(dungeonStateSchema.safeParse(result.state.bossDungeons).success);
  assert.deepEqual(result.state.inventory.slice(0,-1),[blocked,other,wrong,{...bound,quantity:2}]);
  assert.deepEqual(full,before);
  assert.equal(craft(result.state).ok,false);
  const separable={...save,inventory:[stack('free',quantity)]};
  const tradable=craft(separable);
  assert.equal(tradable.ok,true);
  assert.equal(itemTradeRestriction(tradable.item),null);
  const noSpace={...save,inventory:[...Array.from({length:119},(_,i)=>stack('locked-'+i,1)).map(i=>({...i,locked:true})),stack('remaining',quantity+1)]};
  assert.equal(craft(noSpace,{commit:()=>assert.fail('Não grava sem espaço de entrega')}).ok,false);
 }
});

test('late dungeon rewards persist, stay atomic, and keep legendary synthesis separate',()=>{
 const defs=getGameCatalog().items,owner='00000000-0000-4000-8000-000000000001';
 const base={level:180,characterId:owner,inventory:[],equipment:{},gold:0,forgeSeq:0,materials:0,classId:'sword',bossDungeons:{version:3,seq:0,records:{},reveal:null}};
 const options={runId:'run',position:{x:0,y:0},chest:{x:0,y:0,radius:1},defs,applyXP:(_save:unknown,xp:number)=>assert.equal(xp,0),commit:()=>true};
 const won=(s:typeof base,id:string)=>{
  const running=D.begin(s,id,'run',0).state;
  return D.defeat(running,id,{runId:'run',encounterId:'run:enemy'},()=>0,1,()=>.99).state;
 };
 const moria=won(base,'gecko-moria');
 const full={...moria,inventory:Array.from({length:119},(_,n)=>({id:'filler:'+n,def:0}))};
 let calls=0;
 assert(!D.claim(full,'gecko-moria',{...options,commit:()=>{calls++;return true;}}).ok);
 assert.equal(calls,0);assert.equal(full.inventory.length,119);
 const claimed=D.claim(moria,'gecko-moria',options);
 assert(claimed.ok);assert.equal(claimed.state.inventory.length,2);
 assert(!D.claim(claimed.state,'gecko-moria',options).ok);
 assert.equal(moria.bossDungeons.records['gecko-moria'].phase,'pending');
 const past={...base,bossDungeons:{...base.bossDungeons,records:{wapol:{phase:'claimed',ownerId:owner,reward:{xp:0,berry:0,materialId:'akuma_fragment_b',quantity:10,boundToCharacter:owner}}}}};
 assert.deepEqual(D.migrate(past).bossDungeons,past.bossDungeons);
 assert(!D.claim(past,'wapol',options).ok);
 for(const id of ['wapol','crocodile']){
  const historicalReward={xp:0,berry:0,materialId:'akuma_fragment_b',quantity:10,boundToCharacter:owner};
  const pending={...base,bossDungeons:{...base.bossDungeons,records:{[id]:{phase:'pending',runId:'run',ownerId:owner,reward:historicalReward}}}};
  const result=D.claim(D.migrate(pending),id,options);
  assert(result.ok);assert.equal(result.state.inventory.length,1);
  assert.equal(result.state.inventory[0].materialId,'akuma_fragment_c');
  assert.equal(result.state.inventory[0].quantity,10);
  assert.equal(pending.bossDungeons.records[id]?.reward.materialId,'akuma_fragment_b');
 }

 let state:any=base;
 for(const id of ['kuma','kizaru','hancock','magellan']){
  const result=D.claim(won(state,id),id,options);
  assert(result.ok,result.message);
  state=result.state;
 }
 const recipe=F.weaponRecipe('formLegendaryWeapon');
 const stack=state.inventory.find((item:any)=>item.materialId===recipe.material.id);
 assert(originalItemSchema.safeParse(stack).success);
 assert.equal(stack.quantity,20);assert.equal(itemTradeRestriction(stack),null);
 assert.equal(F.weaponFragmentCount(state),0);
 const result=F.execute(state,{type:'formLegendaryWeapon',expectedSeq:0},defs,()=>.3,2);
 assert(result.ok,result.message);
 const weapon=result.state.inventory.find((item:any)=>item.generation?.source==='synthesis');
 assert.equal(defs[weapon.def]?.slot,'weapon');assert.equal(weapon.rarity,'legendary');assert.equal(itemTradeRestriction(weapon),null);
 assert.equal(result.state.inventory.find((item:any)=>item.materialId==='akuma_fragment_b')?.quantity,10);
 assert(!result.state.inventory.some((item:any)=>item.materialId==='legendary_weapon_fragment'));

 const swords=require('../../sword-compendium.js');
 for(const [id,rank] of [['ace','B'],['aokiji','B'],['akainu','A']] as const){
  const victory=won(base,id),reward=victory.bossDungeons.records[id].reward;
  const reload=D.migrate(JSON.parse(JSON.stringify(victory)));
  assert.deepEqual(reload.bossDungeons.records[id].reward,reward);
  const [sword]=D.rewardItems(defs,reward,id,'receipt',2);
  const item=originalItemSchema.parse(sword),model=defs[item.def];
  assert(model);
  assert.equal(model.kind,'sword-collection');assert.equal(model.rank,rank);
  assert.equal(itemTradeRestriction(item),null);assert.equal(F.isGear(item,defs),false);
  const activated=swords.activateComplete({[String(model.swordId)]:{active:false,fragments:4}},model.swordId);
  assert.equal(activated.excess[String(model.swordId)],4);
  assert.equal(swords.activateComplete(activated.collection,model.swordId),null);
 }
});
