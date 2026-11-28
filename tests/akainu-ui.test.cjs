'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../weekly-boss-ui.js');
const now=Date.parse('2026-11-10T09:00:00Z');
const ready={available:true,controlled:true,mapId:'lobby',hp:100,level:1};
const event={id:'valid-event',mode:'official',status:'active',bossId:'akainu',mapId:'marineford',version:1,endsAt:'2026-11-10T10:00:00Z',members:1,maxPlayers:4,minLevel:1,boss:{name:'Akainu',hp:500,maxHp:1000}};
const approved={balanceApproved:true};
const configured={canManage:true,events:[],marinefordReady:true,profiles:{akainu:approved,aokiji:approved,kizaru:approved}};
const disabled=(html,op)=>html.includes('data-weekly-op="'+op+'" disabled');

test('the public weekly HUD shows the roster but does not offer entry or admin actions before opening',()=>{
 const data={canManage:false,events:[],current:null};
 const v=UI.model(data,ready,undefined,now);
 assert.deepEqual(v.cards.map(c=>c.id),['akainu','aokiji','kizaru']);
 assert.equal(v.canJoin,false);
 assert.equal(v.canLeave,false);
 const html=UI.render(data,ready,undefined,now);
 assert.match(html,/data-weekly-op="join" data-event="" disabled/);
 assert(!html.includes('data-weekly-countdown'));
 assert(!html.includes('data-weekly-op="activate"'));
 assert.equal(UI.renderAdmin(data,ready,''),'');
});
test('admin rehearsal and opening require the selected admiral profile, and opening also requires Marineford',()=>{
 for(const bossId of ['akainu','aokiji','kizaru']){
  let html=UI.renderAdmin({...configured,profiles:{}},ready,bossId);
  assert(disabled(html,'test'));
  assert(disabled(html,'activate'));
  html=UI.renderAdmin({...configured,marinefordReady:false},ready,bossId);
  assert(!disabled(html,'test'));
  assert(disabled(html,'activate'));
  html=UI.renderAdmin(configured,ready,bossId);
  assert(html.includes('value="'+bossId+'" selected'));
  assert(!disabled(html,'test'));
  assert(!disabled(html,'activate'));
 }
});
test('offline, stale controller, busy or pending admin UI cannot issue commands',()=>{
 for(const state of [{...ready,available:false},{...ready,controlled:false},{...ready,busy:true},{...ready,pending:true}]){
  const html=UI.renderAdmin(configured,state,'kizaru');
  assert(disabled(html,'activate'));
  assert(disabled(html,'test'));
  assert(html.includes('<fieldset disabled>'));
 }
});
test('the public HUD exposes one official entry, escapes event IDs, and neither leaks tests nor invents rewards',()=>{
 const data={canManage:false,events:[{...event,id:'<script>bad</script>'},{...event,id:'secret-test',mode:'test'}],current:null};
 const html=UI.render(data,ready,undefined,now);
 assert(!html.includes('<script>'));
 assert(html.includes('data-weekly-op="join" data-event="&lt;script&gt;bad&lt;/script&gt;"'));
 assert(!html.includes('secret-test'));
 assert(!html.includes('data-weekly-op="activate"'));
 assert(!html.includes('Recompensas possíveis'));
 assert(!html.includes('Resgatar'));
});
test('an active official event blocks a second opening for every admiral; an expired event has no active countdown',()=>{
 for(const bossId of ['akainu','aokiji','kizaru']){
  const html=UI.renderAdmin({...configured,events:[event]},ready,bossId);
  assert(disabled(html,'activate'));
 }
 const time=Date.parse(event.endsAt)+1;
 const html=UI.render({canManage:false,events:[event],current:null},ready,undefined,time);
 assert(!html.includes('data-weekly-countdown'));
 assert.equal(UI.model({events:[event]},ready,undefined,time).canJoin,false);
});
