'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../character-system.js'),T=require('../talent-system.js'),UI=require('../creation-selection.js');
const ids=['sword','brawler','gunner','rogue','cyborg','strategist','healer'];
const classes=Object.fromEntries(ids.map(id=>[id,{name:T.getTree(id).name,range:['gunner','strategist','healer'].includes(id)?200:48,skills:[{name:'Habilidade cadastrada'}]}]));
const icons=Object.fromEntries(ids.map(id=>[id,'assets/ui/items-hd/0.png']));
const before=JSON.stringify({classes,birth:C.birth,trees:T.trees});
const all=new Set();
for(const id of ids){
 const tree=T.getTree(id),specials=UI.talents(id);
 assert.equal(specials.length,6,id+' has three intermediates and three finals');
 assert.deepEqual(specials.map(x=>x.id),[...tree.keystones,...tree.ultimates].map(x=>x.id));
 const html=UI.detail(id,classes,icons);
 for(const n of specials){assert(html.includes(n.name.replace(/&/g,'&amp;')));assert(html.includes('data-creation-talent="'+n.id+'"'));assert(html.includes('data-studio-help'));assert(n.requirement.includes('PT'));assert(fs.existsSync(path.join(__dirname,'../assets/ui/talents/special',n.id+'.png')));all.add(n.id);}
 assert.equal((html.match(/data-creation-talent=/g)||[]).length,6);
 assert(!html.includes('data-talent-select'),'creation must not call the investment action');
 for(const [key,value]of Object.entries(C.birth[id]))assert(html.includes('data-birth-attribute="'+key+'">'+value));
 assert.equal(Object.values(C.birth[id]).reduce((a,b)=>a+b,0),50);
}
assert.equal(all.size,42);assert.equal(JSON.stringify({classes,birth:C.birth,trees:T.trees}),before,'presentation never alters definitions');
const list=UI.list(classes,icons,'healer');assert.equal((list.match(/data-class=/g)||[]).length,7);assert.equal((list.match(/aria-pressed="true"/g)||[]).length,1);
const f={name:'<Pirata>',desc:'Mar & aventura',bonus:'Ataque +10% · Berry +8%'};
assert(UI.factionCard('pirate',f).includes('&lt;Pirata&gt;'));assert(UI.factionSummary('pirate',f).includes('Ataque +10%'));assert(!UI.factionSummary('pirate',f).includes('não poderá'));
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
for(const f of ['game.js','creation-selection.js'])new vm.Script(read(f));
assert(read('game.js').includes('MareCharacterStudio.appearance({value:creationAppearanceDraft'));
assert(read('gameplay-harmony.css').includes('var(--rpg-workshop-surface)'));
for(const property of ['width','height','padding','margin','inset','top','bottom','left','right','display','font-size','font-family']){
 const lines=read('gameplay-harmony.css').split('\n').filter(l=>!l.includes('::after'));
 assert(!lines.some(l=>new RegExp('(?:[;{])\\s*'+property+'\\s*:').test(l)),'gameplay finish must not alter '+property);
}
console.log('Creation HD: seven canonical classes, 42 existing specials, real birth attributes, escaped presentation and geometric style scope passed');
