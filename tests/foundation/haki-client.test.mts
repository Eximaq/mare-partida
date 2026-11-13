import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8'),session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}
test('Haki client accepts intentions only, never willpower, rank grants, time or targets',()=>{
 for(const [a,p] of [['haki.unlock',{itemId:'book'}],['haki.invest',{nodeId:'coating',expectedSeq:0}],['haki.configure',{branch:'armament',enabled:true}],['haki.toggle',{branch:'observation'}],['haki.cast',{}]])assert(session.validIntent(a,p));
 for(const [a,p] of [['haki.unlock',{itemId:'book',level:50}],['haki.invest',{nodeId:'coating',expectedSeq:0,ranks:{coating:3}}],['haki.configure',{branch:'conqueror',enabled:true}],['haki.toggle',{branch:'armament',current:100}],['haki.cast',{now:1}],['haki.cast',{targets:[]}]])assert(!session.validIntent(a,p));
});
test('online Haki clicks send only intents and never call local rules or save',async()=>{
 let visualReady=true;
 const calls:any[]=[],box:any={lobby96:{worldReady:()=>visualReady},game:{},itemDefs:[],selectedItem:null,openPanel(){},document:{addEventListener(){}},ONLINE_GAME:{},onlineItemCommand:async(a:string,p:any)=>{calls.push([a,p]);return true;},localStorage:{setItem(){throw Error('demo save');}},MareHaki:{unlock(){throw Error('local unlock');}}};
 for(const name of ['consumeHakiBook','toggleHaki','castHakiKing'])runInNewContext(extract(name)+`;globalThis.${name}=${name};`,box);
 await box.consumeHakiBook('book');box.toggleHaki('armament');visualReady=false;box.castHakiKing();visualReady=true;box.castHakiKing();assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['haki.unlock',{itemId:'book'}],['haki.toggle',{branch:'armament'}],['haki.cast',{}]]);
});
