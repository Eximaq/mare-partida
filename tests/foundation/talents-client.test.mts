import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
const session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}
test('pending talent intents survive reload only when bounded and free of client authority fields',()=>{
 const b={nodes:{'sword-0-0':1},keystone:null,ultimate:null};assert(session.validIntent('talents.commit',{build:b}));assert(session.validIntent('talents.reset',{}));
 for(const payload of [{build:b,points:999},{build:{...b,cooldowns:{}}},{build:{...b,nodes:{'sword-0-0':99}}},{build:{...b,nodes:[]}}])assert(!session.validIntent('talents.commit',payload));
});
test('online talent confirmation sends only the build and never writes a browser save',async()=>{
 const calls:any[]=[],build={nodes:{'sword-0-0':1},keystone:null,ultimate:null};
 const box:any={ONLINE_GAME:{},MareTalents:{buildFor:()=>build,commit(){throw Error('Offline commit');}},game:{talentSeq:1},talentDraft:null,talentDraftSeq:0,talentMessage:'',renderPanel(){},async onlineItemCommand(action:string,payload:any){calls.push([action,payload]);return true;},storeTalentChange(){throw Error('Local save written');}};
 runInNewContext(extract('confirmTalents')+';globalThis.confirm=confirmTalents;',box);assert.equal(await box.confirm({classId:'sword',expectedSeq:0,build}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['talents.commit',{build}]]);
});
test('online storage guard preserves every demo save even if an old local UI handler is invoked',()=>{
 const box:any={ONLINE_GAME:{},observeAchievements(){throw Error('Demo path executed');},localStorage:{setItem(){throw Error('Demo save written');}}};
 runInNewContext(extract('storeTalentChange')+';globalThis.store=storeTalentChange;',box);assert.equal(box.store({}),false);
});
