import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
const session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}

test('achievement pending intents cannot contain caller-supplied progress, rewards or identity',()=>{
 assert(session.validIntent('achievement.claim',{achievementId:'level-0'}));
 for(const payload of [{achievementId:'level-0',points:5},{achievementId:'level-9'},{achievementId:'kills-0',accountId:'other'}])assert(!session.validIntent('achievement.claim',payload));
});
test('online achievement UI sends only an ID and never calls offline claim or storage',async()=>{
 const sent:any[]=[],box:any={ONLINE_GAME:{},game:{talentSeq:1},talentDraftSeq:0,talentDraft:{},talentMessage:'',renderPanel(){},async onlineItemCommand(a:string,p:any){sent.push([a,p]);return true;}};
 runInNewContext(extract('claimOnlineAchievement')+';globalThis.claim=claimOnlineAchievement;',box);await box.claim('level-0');assert.deepEqual(JSON.parse(JSON.stringify(sent)),[['achievement.claim',{achievementId:'level-0'}]]);assert.equal(box.talentDraft,null);
});
test('achievement journal respects server availability even when an offline module enables a future domain',()=>{
 require('../../achievement-system.js');const UI=require('../../achievement-ui.js');
 const a={id:'floors-0',category:'prison',metric:'floors',name:'Test',target:10,points:1,progress:0,claimed:false,enabled:false,ready:false};
 const summary=UI.summary({level:1,achievements:{claimed:[]},onlineAchievements:{entries:[a]}});assert.equal(summary.all.length,1);assert.equal(summary.total,0);assert.equal(summary.ready,0);
});


test('shared achievement IDs and SQL bounds cover the unchanged original catalog',async()=>{
 const A=require('../../achievement-system.js'),{achievementIdSchema}=await import('@mare/shared');
 assert.deepEqual(achievementIdSchema.options,A.catalog.map((a:any)=>a.id));
 assert.equal(A.catalog.reduce((n:number,a:any)=>n+a.points,0),72);
 const sql=readFileSync(new URL('../../apps/game-server/migrations/0023_original_achievements.sql',import.meta.url),'utf8').replaceAll('\r\n','\n');
 for(const a of A.catalog){assert(sql.includes(`WHEN '${a.id}' THEN ${a.points}\n`));assert(sql.includes(`WHEN '${a.id}' THEN ${a.target}\n`));}
});


test('opening the original online talent panel captures the latest server revision after a claim or reconnect',()=>{
 const box:any={ONLINE_GAME:{},game:{talentSeq:7},talentDraft:{},selectedTalent:'old',talentMessage:'old',talentDraftSeq:0,attributeDraft:{},currentPanel:null,characterTab:null,MareCharacters:{empty:()=>({})},closeCharacterMenu(){},closeModesMenu(){},closeCaptainMenu(){},renderPanel(){},$(){return {classList:{remove(){}}};}};
 runInNewContext(extract('openPanel')+';globalThis.open=openPanel;',box);box.open('character','talents');assert.equal(box.talentDraftSeq,7);assert.equal(box.talentDraft,null);assert.equal(box.characterTab,'talents');
});
