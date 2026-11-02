import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url),{derived}=require('../../apps/account-client/game-ui.js'),{validIntent}=require('../../apps/account-client/game-session.js');
const chars=require('../../character-system.js'),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
test('original HUD uses the authorized formulas and does not alias the server snapshot',()=>{
 const stats={attack:80,physical:80,elemental:12,maxHP:520,maxEnergy:110,power:900,attributes:{strength:15}};
 const data={online:{combat:{status:'claimed'},combatPreview:{rulesetId:'original-character-v1',stats}}};
 const view=derived({},data);assert.equal(view.power,900);assert.equal(view.maxHP,520);assert.equal(view.maxEnergy,110);
 view.attributes.strength=999;assert.equal(stats.attributes.strength,15);
});
test('native attribute confirmation sends only the draft and never commits local progress',async()=>{
 const calls:any[]=[],draft={...chars.empty(),strength:5};
 const box:any={ONLINE_GAME:{},attributeDraft:draft,performance:{now:()=>1},allocationMessage:'',attributeSuccessUntil:0,
  MareCharacters:{empty:chars.empty,commit(){throw Error('Local mutation forbidden');}},
  onlineItemCommand:async(a:string,p:any)=>{calls.push([a,JSON.parse(JSON.stringify(p))]);return true;},renderPanel(){},toast(){}};
 const a=source.search(/  (?:async )?function confirmAttributes\(/),b=source.indexOf('  let mapReturnFocus',a);
 runInNewContext(source.slice(a,b)+';globalThis.confirm=confirmAttributes;',box);await box.confirm();
 assert.deepEqual(calls,[['attributes.allocate',{allocation:draft}]]);assert.deepEqual(JSON.parse(JSON.stringify(box.attributeDraft)),chars.empty());
});
test('higher-level attribute intentions remain bounded and reject injected authority',()=>{
 const allocation={...chars.empty(),strength:100};assert.equal(validIntent('attributes.allocate',{allocation}),true);
 for(const extra of [{earned:1000},{accountId:'other'},{xp:10}])assert.equal(validIntent('attributes.allocate',{allocation,...extra}),false);
 assert.equal(validIntent('attributes.allocate',{allocation:{...allocation,strength:2147483648}}),false);
});

test('new demo dungeon actions cannot write saves or rewards from online mode',async()=>{
 const box:any={ONLINE_GAME:{},game:{gold:10},localStorage:{setItem(){throw Error('Save touched');}}};
 for(const name of ['persistDungeonState','applyDungeonXP','enterBossDungeon','completeBossDungeonEnemy','persistBossVictory','claimDungeonChest','formDungeonAkuma']){
  const match=new RegExp('  (?:async )?function '+name+'\\(').exec(source);assert(match);const a=match.index,next=source.slice(a+match[0].length).search(/  (?:async )?function /),b=a+match[0].length+next;assert(next>=0&&b>a);
  runInNewContext(source.slice(a,b)+';globalThis.run='+name,box);
  if(name==='persistDungeonState')assert.throws(()=>box.run({}),/online_action_unavailable/);else assert.equal(await box.run({}),false);
 }
 assert.equal(box.game.gold,10);
});
