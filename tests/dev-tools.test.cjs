const assert=require('node:assert/strict');
const C=require('../character-system.js'),F=require('../forge-system.js'),P=require('../prison-system.js'),H=require('../haki-system.js'),T=require('../talent-system.js'),A=require('../achievement-system.js'),D=require('../dev-tools.js');
const defs=[{name:'Espada',rarity:'common',slot:'weapon'},H.book];let seq=0;
const ctx={active:true,defs,makeItem:(def,level,rarity)=>({id:'dev-'+seq++,def:defs.indexOf(def),level,rarity}),starterWeapon:()=>0};
const base=()=>D.copy(H.migrate(T.migrate(P.migrate(C.migrate({name:'Tester',classId:'sword',level:1,hp:100,energy:100,gold:0,materials:0,potions:0,equipment:{weapon:{id:'old',def:0}},inventory:[],stats:{kills:0,goldEarned:0}})))));
assert(!D.active(''));assert(D.active('?dev=1'));assert(!D.active('?dev=0'));assert.equal(D.key(''),D.NORMAL_KEY);
assert.equal(new URL(D.targetURL('https://example.com/game/?v=3',true)).search,'?v=3&dev=1');
assert(!D.canImport({devSandbox:true},false));assert(D.canImport({devSandbox:true},true));
let g=base(),original=JSON.stringify(g);
assert(!D.execute(g,{type:'level',level:100},{...ctx,active:false}).ok);
assert(!D.execute({...g,devSandbox:false},{type:'level',level:100},ctx).ok);
for(const level of [0,201,1.5,NaN])assert(!D.execute(g,{type:'level',level},ctx).ok);
assert.equal(JSON.stringify(g),original);
for(const cls of Object.keys(T.trees)){
 let next=D.execute(g,{type:'class',classId:cls},ctx);assert(next.ok);assert.equal(next.state.classId,cls);
 const tree=T.getTree(cls);
 for(const u of tree.ultimates){next=D.execute(next.state,{type:'build',keystone:tree.keystones[0].id,ultimate:u.id},ctx);assert(next.ok);assert.equal(T.buildFor(next.state).ultimate,u.id);assert(!T.validate(cls,T.buildFor(next.state),T.totalEarned(next.state)));}
}
let r=D.execute(g,{type:'haki-kit'},ctx);assert(r.ok);assert.equal(r.state.level,50);assert.equal(r.state.inventory.length,1);
r=D.execute(r.state,{type:'haki-unlock'},ctx);assert(r.ok);assert(r.state.has_haki_unlocked);assert.equal(r.state.inventory.length,0);
assert(!D.execute(g,{type:'prison-preview',floor:101},ctx).ok);assert(P.available);assert(!P.canEnter(g,2));
let full={...g,inventory:Array.from({length:120},(_,i)=>({id:String(i),def:0}))};const frozen=JSON.stringify(full);
assert(!D.execute(full,{type:'item',index:0,count:2,level:1,plus:0,rarity:'common'},ctx).ok);assert(!D.execute(full,{type:'class',classId:'brawler'},ctx).ok);assert.equal(JSON.stringify(full),frozen);
r=D.execute(g,{type:'achievement',id:'kills-0'},ctx);assert(r.ok);assert.equal(r.state.stats.kills,100);assert.equal(A.bonus(r.state),0);assert(!D.execute(g,{type:'achievement',id:'floors-0'},ctx).ok);
const entries=new Map([[D.NORMAL_KEY,original]]),writes=[];const storage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>{writes.push(k);entries.set(k,v)}};
assert(D.boot(storage,'?dev=1').ok);assert.deepEqual(writes,[D.DEV_KEY]);assert.equal(entries.get(D.NORMAL_KEY),original);
const copied=entries.get(D.DEV_KEY);assert(D.seed(storage,{...g,level:50}).ok);assert.equal(entries.get(D.DEV_KEY),copied);assert(D.seed(storage,{...g,level:50},{replace:true}).ok);assert.equal(JSON.parse(entries.get(D.DEV_KEY)).level,50);
assert(!D.seed({getItem:()=>null,setItem:()=>{throw Error('quota')}},g).ok);
console.log('DEV: save isolation, transactions, bounds, seven classes / 21 final builds, Haki and future-mode restrictions passed');
