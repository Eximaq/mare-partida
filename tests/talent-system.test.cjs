const assert=require('node:assert/strict'),T=require('../talent-system.js'),C=require('../talent-combat.js');
let count=0;const test=(n,fn)=>{fn();count++;console.log(n+': passed');};
const make=(classId='sword',level=30)=>T.migrate({classId,level,hp:100,energy:0,gold:300,inventory:[{id:'kept',def:0}],equipment:{},stats:{kills:2}});
function withKey(classId,key){const g=make(classId),tree=T.getTree(classId);g.talentBuilds[classId]={nodes:{[tree.branches[0].nodes[0].id]:10},keystone:key};return g;}
const stats={physical:100,elemental:120,attack:100,maxHP:100,maxEnergy:100,lifesteal:0,penetration:0,magicPen:0,aoeBonus:0};
const target=(id=1,x=40,y=0)=>({id,x,y,hp:500,maxHP:500,defense:50,alive:true,emberFacing:'east'}),hero={id:'hero',x:0,y:0};
test('Seven independent trees have three branches, ordered tiers and 21 unique keystones',()=>{
 assert.equal(Object.keys(T.trees).length,7);const unique=new Set();for(const tree of Object.values(T.trees)){
  assert.equal(tree.branches.length,3);assert.equal(tree.keystones.length,3);assert.equal(T.nodes(tree.classId).length,15);
  tree.keystones.forEach(k=>unique.add(k.id));tree.branches.forEach(b=>b.nodes.forEach((n,i)=>assert.equal(n.tier,i)));
 }assert.equal(unique.size,21);
});
test('One PT per level including level one, deterministic migration, no save or item loss',()=>{
 for(const level of [1,2,30,100]){const g=make('sword',level);assert.equal(T.available(g),level);assert.deepEqual(T.migrate(g),g);assert.equal(g.inventory[0].id,'kept');assert.equal(g.gold,300);}
});
test('Third branch, missing prerequisites, overdraft, malformed ranks and second keystone are rejected',()=>{
 const g=make(),tree=T.getTree('sword');let draft=T.empty();
 for(let b=0;b<2;b++)draft=T.invest(g,draft,tree.branches[b].nodes[0].id).build;
 assert(!T.invest(g,draft,tree.branches[2].nodes[0].id).ok);assert(!T.invest(g,T.empty(),tree.branches[0].nodes[1].id).ok);
 assert(!T.invest(make('sword',1),{nodes:{[tree.branches[0].nodes[0].id]:1},keystone:null},tree.branches[0].nodes[0].id).ok);
 assert(!T.invest(g,draft,'wear').ok);draft.nodes[tree.branches[0].nodes[0].id]=10;draft=T.invest(g,draft,'wear').build;
 assert(draft);assert(!T.invest(g,draft,'parry').ok);assert(T.validate('sword',{nodes:{bad:1},keystone:null},30));
 assert(T.validate('sword',{nodes:{[tree.branches[0].nodes[0].id]:-1},keystone:null},30));
});
test('Commit is atomic, stale confirmations fail and class switches never apply another tree',()=>{
 const g=make(),id=T.nodes('sword')[0].id,build=T.invest(g,T.empty(),id).build,before=JSON.stringify(g);
 const r=T.commit(g,{classId:'sword',expectedSeq:0,build});assert(r.ok);assert.equal(JSON.stringify(g),before);assert.equal(T.available(r.state),29);
 assert(!T.commit(r.state,{classId:'sword',expectedSeq:0,build}).ok);assert(!T.commit(g,{classId:'rogue',expectedSeq:0,build}).ok);
 const changed={...r.state,classId:'rogue'};assert.equal(T.available(changed),30);assert.deepEqual(T.bonuses(changed),{});
 assert.equal(T.spent(T.buildFor(T.reset(r.state))),0);
});
test('Corrupt saved builds normalize to budget, two branches, valid tiers and one known keystone',()=>{
 const g=make('sword',5);g.talentBuilds.sword={nodes:Object.fromEntries(T.nodes('sword').map(n=>[n.id,99])),keystone:'wrong'};
 const r=T.migrate(g);assert(T.spent(T.buildFor(r))<=5);assert(T.branchCount('sword',T.buildFor(r))<=2);assert.equal(T.buildFor(r).keystone,null);assert.deepEqual(T.migrate(r),r);
});
const hit=(g,rt,m,extra={})=>C.beforeHit(g,rt,{target:m,hero,stats,basic:true,magic:false,area:false,critical:false,...extra});
const after=(g,rt,m,extra={})=>C.afterHit(g,rt,{target:m,stats,basic:true,magic:false,projectile:false,critical:false,damage:100,random:()=>0,...extra});
test('Fighter: stun stops a real status timer, fury mitigates/leaches, consecutive stacks reset on target',()=>{
 let g=withKey('brawler','concussion'),rt=C.create(),m=target();after(g,rt,m);assert.equal(m.talentControl.remaining,1);C.tick(rt,.4,[m]);assert(Math.abs(m.talentControl.remaining-.6)<1e-8);
 g=withKey('brawler','fury');g.hp=20;assert.equal(C.receive(g,rt,{stats,amount:40}).damage,30);assert.equal(after(g,rt,m).heal,12);
 g=withKey('brawler','growing');rt=C.create();assert.equal(hit(g,rt,m).multiplier,1.04);for(let i=0;i<20;i++)hit(g,rt,m);assert.equal(rt.combo,8);assert.equal(hit(g,rt,target(2)).multiplier,1.04);
});
test('Sword: armor wear caps/expires without editing base armor, kill haste expires, physical-only parry',()=>{
 let g=withKey('sword','wear'),rt=C.create(),m=target();for(let i=0;i<8;i++)after(g,rt,m);assert.equal(m.talentWear.stacks,5);assert.equal(hit(g,rt,m).armor,40);assert.equal(m.defense,50);C.tick(rt,5,[m]);assert.equal(hit(g,rt,m).armor,50);
 g=withKey('sword','bloodlust');C.onKill(g,rt,stats);assert.equal(rt.bloodlust,6);C.tick(rt,6,[]);assert.equal(rt.bloodlust,0);
 g=withKey('sword','parry');assert(C.receive(g,rt,{stats,amount:999,random:()=>0}).parry);assert(!C.receive(g,rt,{stats,amount:10,physical:false,random:()=>0}).parry);
});
test('Gunner: distance scales, piercing selects only enemies behind and full-health first hit forces critical',()=>{
 let g=withKey('gunner','longshot'),rt=C.create();assert.equal(hit(g,rt,target(1,180,0)).multiplier,1.3);
 g=withKey('gunner','pierce');assert(after(g,rt,target(),{projectile:true}).pierce);
 const first=target(1,50,0),behind=target(2,90,5),side=target(3,90,80),front=target(4,20,0);assert.deepEqual(C.piercingTargets(hero,first,[first,behind,side,front]),[behind]);
 g=withKey('gunner','focus');rt=C.create();assert(hit(g,rt,first).critical);assert(!hit(g,rt,first).critical);g.hp=99;assert(!hit(g,rt,target(9)).critical);
});
test('Rogue: poison ticks exactly four times and refreshes, theft caps, rare chance keeps ordinary rarity types, rear hit only once',()=>{
 let g=withKey('rogue','poison'),rt=C.create(),m=target();after(g,rt,m);let damage=0;for(let i=0;i<80;i++)damage+=C.tick(rt,.05,[m]).reduce((s,a)=>s+a.amount,0);assert.equal(damage,80);
 g=withKey('rogue','lightHands');m=target();let gold=0;for(let i=0;i<10;i++)gold+=after(g,rt,m,{critical:true}).gold;assert.equal(gold,6);assert.equal(C.rarity(()=>.3,0),'uncommon');assert.equal(C.rarity(()=>.3,.2),'rare');
 g=withKey('rogue','backstab');rt=C.create();m=target();assert.equal(hit(g,rt,m).trueAmount,150);assert.equal(hit(g,rt,m).trueAmount,null);assert.equal(hit(g,rt,target(2),{hero:{x:80,y:0}}).trueAmount,null);
});
test('Cyborg: lethal shield and persistent cooldown, absorption, explosion chance and adaptive combat lifetime',()=>{
 let g=withKey('cyborg','energyShield'),rt=C.create();g.hp=20;let r=C.receive(g,rt,{stats,amount:50,now:1000});assert(r.shieldTriggered);assert.equal(r.damage,19);assert.equal(rt.shield,30);
 g.hp=20.7;assert.equal(C.receive(g,C.create(),{stats,amount:50,now:1000}).damage,19.7);
 g.hp=1;g.talentCooldowns.energyShieldUntil=91000;assert.equal(C.receive(g,rt,{stats,amount:20,now:2000}).damage,0);assert(!C.receive(g,C.create(),{stats,amount:2,now:2000}).shieldTriggered);
 g=withKey('cyborg','unstable');assert(C.receive(g,rt,{stats,amount:10,random:()=>0}).explode);
 g=withKey('cyborg','adaptive');rt=C.create();for(let i=0;i<25;i++)C.receive(g,rt,{stats,amount:10});assert.equal(rt.adaptive,15);C.tick(rt,6,[]);assert.equal(rt.adaptive,0);
});
test('Mage: delayed half-damage echo is one-shot, slow refreshes and kills return mana',()=>{
 let g=withKey('strategist','echo'),rt=C.create(),m=target();after(g,rt,m,{magic:true});assert.equal(C.tick(rt,.1,[m]).length,0);const actions=C.tick(rt,.08,[m]);assert.equal(actions.length,1);assert.equal(actions[0].amount,50);assert.equal(C.tick(rt,1,[m]).length,0);
 g=withKey('strategist','freeze');after(g,rt,m,{magic:true});assert.equal(m.talentSlow.percent,.25);assert.equal(m.talentSlow.remaining,3);
 g=withKey('strategist','siphon');assert.equal(C.onKill(g,rt,stats),10);
});
test('Support uses actual recipients only: overflow, same-screen regeneration and halved CC without fake allies',()=>{
 let g=withKey('healer','chain'),rt=C.create(),self={id:'self',x:0,y:0,hp:50,maxHP:100};assert.deepEqual(C.chainHeal(g,[self],self,50),[]);
 const a={id:'ally',x:10,y:0,hp:50,maxHP:100},far={id:'far',x:900,y:0,hp:0,maxHP:100};assert.deepEqual(C.chainHeal(g,[self,a,far],self,50),[{id:'ally',amount:15}]);assert.equal(a.hp,65);assert.equal(far.hp,0);
 g=withKey('healer','rejuvenation');assert.equal(C.auraRecipients(g,self,[self,a,far],{left:-20,right:200,top:-10,bottom:100}).length,2);
 g=withKey('healer','intervention');assert.equal(C.applyControl(g,self,a,'stun',4),2);assert.equal(C.applyControl(g,self,far,'freeze',4),4);assert.equal(C.applyControl(g,self,a,'poison',4),4);assert.equal(a.talentControl.type,'stun');
 const dead={id:'dead',x:1,y:1,hp:0,maxHP:100};assert.deepEqual(C.chainHeal(withKey('healer','chain'),[self,dead],self,50),[]);assert.equal(C.auraRecipients(withKey('healer','rejuvenation'),self,[dead]).length,0);
});
test('Common passives modify the active class once, preserve base stats and clamp caps',()=>{
 const base={physical:100,elemental:80,maxHP:100,maxEnergy:100,defense:20,speed:2.99,crit:.64,evasion:.44,accuracy:.99,range:50,moveSpeed:150,huntSpeed:150,healing:30,protection:.3,mitigation:.59,energyRegen:3,healthRegen:2};
 let g=make('sword');const original=JSON.stringify(base);g.talentBuilds.sword.nodes={'sword-0-0':10,'sword-1-0':10};const d=T.applyStats(base,g);
 assert.equal(d.crit,.65);assert.equal(d.speed,3);assert.equal(d.physical,100);assert.equal(JSON.stringify(base),original);
 assert.equal(T.applyStats(base,{...g,classId:'rogue'}).crit,base.crit);
 g=withKey('healer','rejuvenation');assert(Math.abs(T.applyStats(base,g).energyRegen-3.6)<1e-8);assert.equal(T.applyStats(base,g).healthRegen,2.4);
 const F=require('../forge-system.js');for(let i=0;i<1000;i++)assert.equal(C.rarity(()=>i/1000,0),F.rollRarity(()=>i/1000));
});
console.log(count+' talent architecture and passive combat groups passed.');
