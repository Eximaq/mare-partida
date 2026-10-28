const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('./paper_doll_complete_browser.py'),'utf8');
const hook=source.match(/HOOK="""([\s\S]*?)"""/)[1];
const target={alive:false,hp:0,maxHP:50,x:0,y:0};
const context={window:{},world:{hero:{x:0,y:0},mobs:[target]},game:{},
 navigator:()=>({map:{width:512,height:512},walkable:()=>true,clear:()=>true}),
 MarePaperDollCatalog:{profile:()=>({category:'sword'})},
 paperDollReview:{inspect:()=>({emission:{x:192,y:192}})},combatChest:m=>m};
vm.createContext(context);vm.runInContext(hook,context);
context.window.__completeTest.combatFixture('east');
assert.equal(target.alive,true,'each independent browser case must revive its retained fixed-spawn target');
assert.equal(target.hp,100000);
assert.equal(target.anchorX,context.world.hero.x+15,'test spawn anchor follows the controlled fixture position');
assert.equal(target.anchorY,context.world.hero.y);
context.world.mobs=[];assert.throws(()=>context.window.__completeTest.combatFixture('east'),/fixture.*target/i);
console.log('Combat QA fixture safely reuses dead fixed-spawn records without changing gameplay');
