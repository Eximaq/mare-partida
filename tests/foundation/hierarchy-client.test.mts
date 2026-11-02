import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8'),session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}
test('online hierarchy accepts expected tier only and skips legacy sync/save authority',async()=>{
 assert(session.validIntent('hierarchy.promote',{expectedTier:1}));for(const p of [{expectedTier:6},{expectedTier:1,power:1e9},{expectedTier:1,ownerId:'x'}])assert(!session.validIntent('hierarchy.promote',p));
 const calls:any[]=[],box:any={ONLINE_GAME:{},game:{hierarchyTier:2},onlineItemCommand:async(a:string,p:any)=>{calls.push([a,p]);return true;},hierarchyView:null,loadHierarchyRanking:async()=>{},hierarchyPost:()=>{throw Error('legacy');},localStorage:{setItem(){throw Error('demo');}}};
 for(const n of ['promoteHierarchy','syncHierarchy'])runInNewContext(extract(n)+`;globalThis.${n}=${n};`,box);
 await box.syncHierarchy();await box.promoteHierarchy(2);assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['hierarchy.promote',{expectedTier:2}]]);
});
