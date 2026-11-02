import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {prisonStateSchema} from '@mare/shared';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
const session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}

test('pending prison/box intents cannot restore forged rewards, progress or identities from browser storage',()=>{
 for(const action of ['prison.prepare','prison.enter','prison.claim']){
  assert(session.validIntent(action,{floor:5}));
  for(const p of [{floor:0},{floor:101},{floor:1.5},{floor:'5'},{floor:5,victory:true},{floor:5,ownerId:'other'}])assert(!session.validIntent(action,p));
 }
 assert(session.validIntent('items.open-box',{itemId:'impel-milestone-5'}));
 assert(!session.validIntent('items.open-box',{itemId:'impel-milestone-5',reward:{def:1}}));
});

test('online prison and pearl-box UI send intentions without calling the offline economy or save paths',()=>{
 const sent:any[]=[],box:any={ONLINE_GAME:{},onlineWorldCommand(a:string,p:any){sent.push([a,p]);},onlineItemCommand(a:string,p:any){sent.push([a,p]);}};
 for(const name of ['enterImpelDown','claimImpelMilestone','openPearlBox'])runInNewContext(extract(name)+`;globalThis.${name}=${name};`,box);
 box.enterImpelDown(5);box.claimImpelMilestone(5);box.openPearlBox('impel-milestone-5');
 assert.deepEqual(JSON.parse(JSON.stringify(sent)),[['prison.enter',{floor:5}],['prison.claim',{floor:5}],['items.open-box',{itemId:'impel-milestone-5'}]]);
});

test('unconfirmed online prison previews cannot roll a monster or write a demo save',()=>{
 const box:any={ONLINE_GAME:{},game:{impelDown:{cleared:0}},MarePrison:{resolveEncounter:()=>null},monsterTypes:{}};
 runInNewContext(extract('ensurePrisonEncounter')+';globalThis.preview=ensurePrisonEncounter;',box);
 assert.equal(box.preview(1),null);
});

test('persisted prison progress rejects impossible claims and encounter sequences',()=>{
 const p={version:1,cleared:5,claimed:[5],options:{autoAdvance:false,pauseBeforeBoss:true}};
 assert(prisonStateSchema.safeParse(p).success);
 const e={floor:6,type:'rat',token:'impel-6-rat-1',spawnId:'11111111-1111-4111-8111-111111111111'};
 assert(prisonStateSchema.safeParse({...p,encounter:e}).success);
 for(const invalid of [{...p,claimed:[10]},{...p,claimed:[5,5]},{...p,encounter:{...e,floor:7}},{...p,lastEncounter:e}])assert(!prisonStateSchema.safeParse(invalid).success);
});
