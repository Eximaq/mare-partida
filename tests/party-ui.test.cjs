'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),UI=require('../party-ui.js');
const islands=[{id:'dawn',name:'Ilha Dawn',region:'east-blue',minLevel:1,area:'beach',description:'Uma ilha costeira.'},{id:'alabasta-desert',name:'Deserto de Alabasta',region:'alabasta',minLevel:40,area:'alabasta'}];
const dungeons=[{id:'alvida',name:'Alvida',level:10,portrait:'assets/ui/boss-dungeons/alvida-hd.png',location:'Capitã Pirata'}];
const data={invites:[],group:{leaderId:'self',members:[{id:'self',name:'Lume',level:20,hp:100,maxHp:100,connected:true},{id:'peer',name:'Brisa',level:8,hp:100,maxHp:100,connected:true}]}};
const context={selfId:'self',available:true,islands,dungeons};
test('visual destination chooser uses canonical map and boss art, without technical rules or destination lists',()=>{
 const hunt=UI.render(data,{...context,selection:{kind:'hunt',huntId:'dawn',region:'east-blue'}});
 assert.ok(hunt.includes("assets/ui/voyage-hd/dawn.png"));assert.match(hunt,/data-party-destination="dawn"/);assert.doesNotMatch(hunt,/id="partyHunt"|id="partyDungeon"|Regras do grupo|XP-base|instância/);
 const boss=UI.render(data,{...context,selection:{kind:'dungeon',dungeonId:'alvida'}});assert.ok(boss.includes("assets/ui/boss-dungeons/alvida-hd.png"));assert.match(boss,/Todos precisam estar no nível 10/);
});
test('destination presentation preserves selection and blocks preparation below the weakest member level',()=>{
 const html=UI.render(data,{...context,selection:{kind:'hunt',huntId:'alabasta-desert',region:'alabasta'}});
 assert.match(html,/aria-pressed="true"[^>]*data-party-destination="alabasta-desert"/);assert.match(html,/data-party-action="prepare"[^>]*disabled/);
});
test('ready confirmation names the actual server plan and escapes character text',()=>{
 const html=UI.render({...data,group:{...data.group,preparation:{kind:'hunt',destination:'dawn',nonce:'nonce'}}},{...context,selection:{kind:'dungeon',dungeonId:'alvida'}});
 assert.match(html,/CONFIRMAÇÃO DOS MEMBROS/);assert.ok(html.includes("<h3>Ilha Dawn</h3>"));assert.doesNotMatch(UI.render({...data,group:{...data.group,members:[{...data.group.members[0],name:'<img onerror=bad>'}]}},context),/<img onerror=bad>/);
});

test('compact party navigation keeps every command but exposes only the selected section',()=>{
 const html=UI.render(data,context);
 assert.match(html,/data-party-view="members"[^>]*aria-pressed="true"/);
 assert.match(html,/id="party-pane-members"[^>]*class="party-pane party-roster"/);
 assert.match(html,/id="party-pane-invites"[^>]*hidden/);
 assert.match(html,/id="party-pane-adventure"[^>]*hidden/);
 for(const action of ['promote','kick','leave','invite','prepare'])assert.ok(html.includes('data-party-action="'+action+'"'));
 const adventure=UI.render(data,{...context,selection:{view:'adventure'}});
 assert.match(adventure,/data-party-view="adventure"[^>]*aria-pressed="true"/);
 assert.doesNotMatch(adventure,/id="party-pane-adventure"[^>]*hidden/);
 const fallback=UI.render(data,{...context,selection:{view:'invalid'}});
 assert.match(fallback,/data-party-view="members"[^>]*aria-pressed="true"/);
});
