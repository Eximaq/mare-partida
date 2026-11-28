'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Sword=require('../sword-compendium.js');
const UI=require('../weekly-boss-ui.js');
const ready={available:true,controlled:true,level:100,mapId:'lobby',hp:1000};
const now=Date.parse('2026-11-28T23:10:00Z');
const official={
 id:'official',bossId:'akainu',mode:'official',mapId:'marineford',status:'active',
 openedAt:'2026-11-28T23:00:00Z',endsAt:'2026-11-29T00:00:00Z',
 minLevel:50,maxPlayers:16,members:3
};
const daily={
 boss:Sword.day(now).boss,status:'open',minLevel:100,maxPlayers:16,members:5,
 opensAt:'2026-11-28T23:00:00Z',endsAt:'2026-11-29T00:00:00Z'
};
const lootRules={rankBChance:.01,hakiChance:.01,armamentShare:.5};
test('weekly consultation shows three admirals and only permits the live matching event',()=>{
 const data={canManage:true,events:[official,{mode:'test',status:'active',id:'private'}],lootRules};
 const active=UI.model(data,ready,undefined,now);
 assert.deepEqual(active.cards.map(x=>x.name),['Akainu','Aokiji','Kizaru']);
 assert.equal(active.canJoin,true);
 assert.match(active.card.schedule,/20h – 21h/);
 for(const id of ['aokiji','kizaru']){
  const result=UI.model(data,ready,id,now);
  assert.equal(result.card.label,'Sem data definida');
  assert.equal(result.canJoin,false);
  assert.match(UI.render(data,ready,id,now),/data-weekly-op="join" data-event="" disabled/);
 }
 assert.equal(UI.model(data,{...ready,level:40},undefined,now).canJoin,false);
 assert.match(UI.model(data,{...ready,mapId:'dawn'},undefined,now).reason,/Porto/);
 assert.equal(UI.model(data,ready,undefined,Date.parse(official.endsAt)).card.label,'Encerrado');
 const markup=UI.render(data,ready,undefined,now);
 assert.match(markup,/Sorteio individual por participante elegível/);
 assert.match(markup,/Fragmento de Akuma no Mi · Rank B/);
 assert.doesNotMatch(markup,/\d(?:,\d+)?\s*%/);
 assert.doesNotMatch(markup,/id="weeklyBossConfig"|data-weekly-op="test"|data-event="private"|Simular|vida compartilhada/i);
 assert.match(UI.renderAdmin(data,ready),/id="weeklyBossConfig"/);
 assert.equal(UI.renderAdmin({...data,canManage:false},ready),'');
});
test('daily roster follows the real Brasília schedule and a defeated boss cannot be joined',()=>{
 const data={daily};
 const active=UI.dailyModel(data,ready,undefined,now,Sword);
 assert.deepEqual(active.cards.map(x=>x.id),Object.values(Sword.rotation));
 assert.equal(active.cards.filter(x=>x.isToday).length,1);
 assert.equal(active.card.name,'Zoro');
 assert.equal(active.card.label,'Disponível agora');
 assert.equal(active.canJoin,true);
 const waiting={daily:{...daily,status:'waiting'}};
 assert.equal(UI.dailyModel(waiting,ready,undefined,stampBefore(),Sword).card.label,'Libera às 20h');
 assert.equal(UI.dailyModel(waiting,ready,undefined,stampBefore(),Sword).canJoin,false);
 function stampBefore(){return Date.parse(daily.opensAt)-1000;}
 const other=UI.dailyModel(data,ready,'daily-shiki',now,Sword);
 assert.equal(other.card.status,'other-day');
 assert.match(other.card.next,/Domingo \(29\/11\) às 20h/);
 assert.equal(other.canJoin,false);
 const won={daily:{...daily,status:'won'}};
 const closed=UI.dailyModel(won,ready,undefined,now,Sword);
 assert.equal(closed.card.label,'Encerrado');
 assert.equal(closed.canJoin,false);
 assert.match(closed.card.next,/Sábado \(05\/12\) às 20h/);
 assert.equal(UI.dailyModel(data,{...ready,level:99},undefined,now,Sword).canJoin,false);
 assert.equal(UI.dailyModel({daily:{...daily,members:16}},ready,undefined,now,Sword).canJoin,false);
 const markup=UI.renderDaily(won,ready,undefined,now,Sword);
 assert.match(markup,/aria-current="date"/);
 assert.match(markup,/Hoje · Sábado/);
 assert.match(markup,/Fragmentos do Compêndio|resgate os fragmentos pelo Correio/);
});
