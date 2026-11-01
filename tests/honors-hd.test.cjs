'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.MarePrison={available:true};global.MareHaki={available:true};
global.MareAchievements=require('../achievement-system.js');global.MareHierarchy=require('../hierarchy-system.js');
const A=global.MareAchievements,U=require('../achievement-ui.js'),H=require('../hierarchy-ui.js');
const fixture=()=>A.observe({name:'QA',factionId:'pirate',hierarchyTier:2,hierarchyPlayerId:'self',level:43,gold:0,stats:{kills:2000,goldEarned:100000},impelDown:{cleared:8},achievements:{version:1,claimed:['kills-0'],records:{}}},{power:2107});
test('global summary counts eligible completions, true claimed points and real pending reward',()=>{
 const g=fixture(),s=U.summary(g);
 assert.equal(s.total,A.list(g).filter(a=>a.enabled).length);
 assert.equal(s.done,A.list(g).filter(a=>a.enabled&&a.progress>=a.target).length);
 assert.equal(s.points,1);assert(s.ready>0);assert(s.featured.ready);
 assert(A.catalog.some(a=>a.id===s.featured.id));assert.equal(g.gold,0);
 const all=U.render({game:g}),filtered=U.render({game:g,category:'kills'});
 assert(all.includes(s.done+' / '+s.total));assert(filtered.includes(s.done+' / '+s.total));
 assert(!all.includes('data-achievement-claim="kills-0"'));assert(all.includes('Resgatado'));
 assert(!all.includes('recompensa especial'));assert(!all.includes('Pontos de Título'));
});
test('claimed points stay independent of free talent balance; ledger rejects repeat',()=>{
 const g=fixture(),r=A.claim(g,'kills-1');assert(r.ok);
 const claimed=r.state;claimed.talentBuilds={sword:{ranks:{},keystones:[]}};
 assert.equal(U.summary(claimed).points,2);assert(!A.claim(claimed,'kills-1').ok);
 assert(!U.render({game:claimed}).includes('data-achievement-claim="kills-1"'));
});
test('faction consultation shows all 32 canonical titles without mutating the character',()=>{
 const g=fixture(),before=JSON.stringify(g);
 for(const [f,titles]of Object.entries(MareHierarchy.titles))for(let i=0;i<8;i++){
  const html=H.render({game:g,view:{faction:f,tier:i+1,status:'ready',board:[]}});
  assert(html.includes(titles[i].replaceAll('&','&amp;')));
  assert(html.includes('data-rank-art="'+f+':'+(i+1)+'"'));
  assert(html.includes('value="'+(i+1)+'" selected'));
  if(f!=='pirate')assert(html.includes('MODO DE CONSULTA'));
 }
 assert.equal(JSON.stringify(g),before);
});
test('ranking is honest when offline, empty when empty, and escapes real names',()=>{
 const g=fixture();
 const unavailable=H.render({game:g,view:{faction:'pirate',status:'error'}});
 assert(unavailable.includes('Ranking indisponível'));assert(!unavailable.includes('hierarchy-rank-row'));
 const empty=H.render({game:g,view:{faction:'marine',status:'ready',board:[]}});
 assert(empty.includes('Nenhum jogador registrado'));assert(!empty.includes('hierarchy-rank-row'));
 const html=H.render({game:g,view:{faction:'pirate',status:'ready',board:[{player_id:'self',name:'<img src=x>',faction:'pirate',tier:2,level:43,power:2000}]}});
 assert(html.includes('&lt;img src=x&gt;'));assert(!html.includes('<img src=x>'));assert(html.includes('Retrato ainda não sincronizado'));
});
test('promotion art maps all canonical IDs and rejects invalid IDs',()=>{
 for(const [f,titles]of Object.entries(MareHierarchy.titles))for(let i=0;i<titles.length;i++){
  const a=MareHierarchy.art(f,i+1);assert.equal(a.id,f+':'+(i+1));assert(a.x>=0&&a.x<=100);assert([0,100].includes(a.y));
 }
 assert.equal(MareHierarchy.art('other',1),null);assert.equal(MareHierarchy.art('pirate',0),null);
});

test('permanent claimed achievements keep their completed presentation after legacy metric loss',()=>{const g=fixture();g.stats.kills=0;const a=U.summary(g).all.find(a=>a.id==='kills-0');assert.equal(a.progress,a.target);assert(a.claimed);assert(!U.render({game:g}).includes('data-achievement-claim="kills-0"'));});
