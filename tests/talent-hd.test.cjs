'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const T=require('../talent-system.js'),UI=require('../talent-ui.js');
const game=classId=>T.migrate({classId,level:100,achievements:{},talentVersion:2,talentBuilds:{}});
for(const id of Object.keys(T.trees)){
 const g=game(id),tree=T.getTree(id),draft=T.empty(),before=JSON.stringify(g),all=UI.configFor(g,draft);
 assert.equal(all.nodes.length,21);assert(UI.WIDTH<1000);assert(UI.HEIGHT<1380);
 for(const n of all.nodes){assert(n.x-95>=0&&n.x+95<=UI.WIDTH,n.id);assert(n.y-48>=0&&n.y+116<UI.HEIGHT,n.id);assert(fs.existsSync(n.icon));const m=UI.detailsFor(g,draft,n.id);assert.equal(m.rank,0);assert.equal(m.savedRank,0);assert.equal(m.changed,false);assert.equal(m.plan.ok,T.invest(g,draft,n.id).ok);assert(m.requirements.length>0);}
 for(const branch of tree.branches)for(const n of branch.nodes){
  draft.nodes[n.id]=5;const m=UI.detailsFor(g,draft,n.id);
  assert.equal(m.rank,5);assert.equal(m.savedRank,0);assert.equal(m.changed,true);
  assert.equal(m.bonus,UI.bonusText(n,5));assert.equal(m.plan.ok,T.invest(g,draft,n.id).ok);
 }
 assert.equal(JSON.stringify(g),before,'detail inspection must not mutate player');
}
const g=game('sword'),build={nodes:{'sword-1-0':10,'sword-1-1':10},keystone:'parry',ultimate:null};g.talentBuilds.sword=structuredClone(build);
const max=UI.detailsFor(g,build,'sword-1-1');assert.equal(max.bonus,'+3% Esquiva');assert.equal(max.savedBonus,'+3% Esquiva');assert(max.max);assert(!max.changed);
const exclusive=UI.detailsFor(g,build,'parry');assert.equal(exclusive.bonus,'Passiva ativa');assert(exclusive.description.includes('12%'));assert(!exclusive.bonus.includes('Esquiva'));
const draft=structuredClone(build);draft.nodes['sword-1-1']=9;assert.equal(UI.detailsFor(g,draft,'sword-1-1').bonus,'+2,7% Esquiva');
assert.equal(UI.detailsFor(g,build,'unknown'),null);
const min=UI.detailsFor(game('sword'),T.empty(),'sword-0-0');assert.equal(min.bonus,'+0% Chance crítica');
console.log('Talent HD: seven classes, tight bounds, unchanged 21-node catalogs, true total bonuses, canonical exclusive descriptions, eligibility and pure inspection passed.');
