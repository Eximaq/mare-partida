'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'rank_s_browser.cjs'),'utf8');
test('paused browser fixture completes navigation without advancing simulation',()=>{
 const method=source.match(/prepareArt\(\)\{const nav=navigator\(\);.*?\},save:saveGame/)[0].replace(/,save:saveGame$/,'');
 const nav={ready:false,cells:0,buildCells(count){this.cells+=count;this.ready=this.cells>=3072;}};
 const world={time:12.25},loading={dataset:{state:'loading'}},context=vm.createContext({world,tick(){throw Error("Preparation must not tick simulation")},navigator:()=>nav,document:{getElementById:()=>loading}});
 const fixture=vm.runInContext('({'+method+'})',context);fixture.world=world;fixture.refresh=()=>{loading.dataset.state=nav.ready?'ready':'loading'};
 assert.equal(fixture.prepareArt(),false);assert.equal(fixture.prepareArt(),false);assert.equal(fixture.prepareArt(),true);assert.equal(fixture.prepareArt(),true);
 assert.equal(nav.cells,3072);assert.equal(world.time,12.25);
});
test('reload expects the integrated Mera aura and screenshots require ready map',()=>{
 assert(source.includes("'assets/akuma/reworks/rank-s/meraAura.png'"));
 assert(source.includes("getAttribute('data-state'),'ready'"));
 assert(source.includes("__rankSQA.world.time),time,'art preparation must not advance combat'"));
});
