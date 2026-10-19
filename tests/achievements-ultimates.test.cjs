const assert=require('node:assert/strict');
const A=require('../achievement-system.js'),U=require('../ultimate-system.js'),T=require('../talent-system.js'),C=require('../talent-combat.js'),P=require('../prison-system.js');
let groups=0;const test=(name,fn)=>{fn();groups++;console.log(name+': passed');};
const make=(classId='sword',level=80)=>T.migrate({classId,level,hp:100,energy:100,gold:120,stats:{kills:0,goldEarned:0},inventory:[{id:'keep'}],equipment:{}});
function built(cls,u){const g=make(cls),tree=T.getTree(cls);g.talentBuilds[cls]={nodes:Object.fromEntries(tree.branches[0].nodes.map(n=>[n.id,10])),keystone:tree.keystones[0].id,ultimate:u};return g;}
const stats={physical:100,elemental:100,attack:100,maxHP:100,maxEnergy:100,defense:50,speed:1,range:250,moveSpeed:100,huntSpeed:100,lifesteal:0,penetration:0,magicPen:0,aoeBonus:0};
const hero={id:'hero',x:0,y:0,hp:100,maxHP:100},mob=(id=1,x=50,y=0)=>({id,x,y,hp:500,maxHP:1000,defense:50,type:'bandit',alive:true});
const after=(g,rt,m,more={})=>U.after(g,rt,{target:m,hero,stats,damage:100,basic:true,magic:false,critical:false,projectile:false,enemies:[m],...more});
const tick=(g,rt,dt,more={})=>U.tick(g,rt,dt,{hero,stats,inCombat:true,enemies:[],...more});
test('31 exact milestones, 72 total bonus PT, eight categories, nonlinear thresholds',()=>{
 assert.equal(A.catalog.length,31);assert.equal(A.catalog.reduce((s,a)=>s+a.points,0),72);assert.equal(A.categories.length,8);
 assert.deepEqual(A.catalog.filter(a=>a.category==='kills').map(a=>[a.target,a.points]),[[100,1],[500,1],[2000,2],[10000,3]]);
 assert.deepEqual(A.catalog.filter(a=>a.category==='level').map(a=>[a.target,a.points]),[[5,1],[10,1],[20,2],[50,3],[100,5]]);
});
test('Claims are atomic, manual, permanent and single-use; points cannot be claimed on previews',()=>{
 let g=make('sword',5);g.stats.kills=500;const original=JSON.stringify(g);const r=A.claim(g,'kills-0');assert(r.ok);assert.equal(JSON.stringify(g),original);assert.equal(A.bonus(g),0);g=r.state;
 assert.equal(T.totalEarned(g),6);assert(!A.claim(g,'kills-0').ok);assert(!A.claim(g,'kills-2').ok);g=A.claim(g,'kills-1').state;assert.equal(A.bonus(g),2);
 g.stats.kills=1;assert.equal(A.bonus(T.migrate(g)),2);assert.equal(g.inventory[0].id,'keep');
});
test('Power records use committed observed power and wealth survives spending without double-counting',()=>{
 let g=make();g.stats.goldEarned=10000;g=A.observe(g,{power:5000});assert.equal(A.progress(g,A.catalog.find(a=>a.id==='power-1')),5000);
 g=A.observe(g,{power:100});g.gold=0;assert.equal(g.achievements.records.peakPower,5000);assert.equal(A.progress(g,A.catalog.find(a=>a.id==='coins-0')),10120);
 const r=A.claim(g,'coins-0');assert(r.ok);assert.equal(A.bonus(r.state),1);assert.equal(A.observe(r.state).achievements.records.coins,10120);
 let tracker=make();tracker.gold=5120;tracker.stats.goldEarned=5000;tracker=A.observe(tracker);tracker.gold=0;tracker=A.observe(tracker);tracker.stats.goldEarned=11000;tracker.gold=6000;tracker=A.observe(tracker);assert.equal(tracker.achievements.records.coins,11120);assert(A.claim(tracker,'coins-0').ok);assert.deepEqual(A.observe(A.observe(tracker)),A.observe(tracker));
});
test('Future features stay locked; domain hooks deduplicate real discoveries and require all three maxed Hakis',()=>{
 let g=make();for(let i=0;i<6;i++){g=A.record(g,'fruitUnlocked','fruit-'+i);g=A.record(g,'fruitUnlocked','fruit-'+i);}
 g=A.record(g,'fruitAwakened','fruit-0');for(const id of ['observation','armament','conqueror']){g=A.record(g,'hakiUnlocked',id);g=A.record(g,'hakiMaximized',id);}
 for(const id of A.travelIds)g=A.record(g,'islandVisited',id);g=A.record(g,'islandVisited','dawn');
 assert.equal(g.achievements.records.fruits.length,6);assert(!A.claim(g,'fruits-1').ok);assert(A.claim(g,'fruits-1',{}, {...A.features,fruit:true}).ok);
 assert.equal(A.progress(g,A.catalog.find(a=>a.metric==='hakiMastery')),3);assert(A.claim(g,'hakiMastery-0',{}, {...A.features,haki:true}).ok);
 assert(A.claim(g,'islands-0').ok);assert(!A.claim(g,'fastTravel-0').ok);assert(!A.claim(g,'bounties-0').ok);
 assert.deepEqual(A.migrate(A.migrate(g)),A.migrate(g));
});
test('Version-one builds and cooldowns survive; new advanced investments require the intermediate bridge',()=>{
 const g=make();g.talentVersion=1;g.talentBuilds.sword={nodes:{'sword-0-0':5,'sword-0-1':5,'sword-0-2':5},keystone:null};g.talentCooldowns.energyShieldUntil=12345;
 const next=T.migrate(g);assert.equal(next.talentVersion,2);assert.equal(next.talentBuilds.sword.nodes['sword-0-2'],5);assert.equal(next.talentCooldowns.energyShieldUntil,12345);
 assert(!T.invest(next,T.buildFor(next),'sword-0-2').ok);const bridge=T.invest(next,T.buildFor(next),'wear');assert(bridge.ok);assert(T.invest(next,bridge.build,'sword-0-2').ok);
 const fresh=make();assert(!T.invest(fresh,{nodes:{'sword-0-0':5,'sword-0-1':5},keystone:null},'sword-0-2').ok);
});
test('Every class has three unique finals; one final, 50 common PT and final-tier prerequisite; no stale commit',()=>{
 const ids=new Set();for(const [cls,tree] of Object.entries(T.trees)){assert.equal(tree.ultimates.length,3);tree.ultimates.forEach(u=>ids.add(u.id));
  const g=built(cls,null);assert(!T.invest(g,T.empty(),tree.ultimates[0].id).ok);let draft=T.invest(g,T.buildFor(g),tree.ultimates[0].id);assert(draft.ok);assert.equal(T.spent(draft.build),54);assert(!T.invest(g,draft.build,tree.ultimates[1].id).ok);
  const r=T.commit(g,{classId:cls,expectedSeq:g.talentSeq,build:draft.build});assert(r.ok);assert.equal(T.migrate(r.state).talentBuilds[cls].ultimate,tree.ultimates[0].id);
  const claimed=A.claim(g,'level-0');assert(claimed.ok);assert(!T.commit(claimed.state,{classId:cls,expectedSeq:g.talentSeq,build:draft.build}).ok);
 }assert.equal(ids.size,21);
});
test('Titan ignores 20% remaining armor and deals real area actions',()=>{
 const g=built('brawler','titan'),rt=C.create(),m=mob(),other=mob(2,90,0),far=mob(3,300,0);
 assert.equal(C.beforeHit(g,rt,{target:m,hero,stats,basic:true,magic:false,area:true,critical:false}).armor,40);
 assert.deepEqual(after(g,rt.ultimate,m,{enemies:[m,other,far]}).map(a=>a.target.id),[2]);
});
test('Vigor absorbs, reflects only melee and grants actual CC immunity until exhausted',()=>{
 const g=built('brawler','armamentSkin'),rt=C.create();let r=U.receive(g,rt.ultimate,{amount:20,stats,physical:true,melee:true});assert.equal(r.damage,0);assert.equal(r.reflect,5);assert.equal(rt.ultimate.vigor,5);
 assert.equal(C.applyControl(g,hero,{...hero},'stun',4,rt),0);r=U.receive(g,rt.ultimate,{amount:20,stats,physical:true,melee:false});assert.equal(r.reflect,0);assert.equal(r.damage,15);
 assert.equal(C.applyControl(g,hero,{...hero},'freeze',4,rt),4);tick(g,rt.ultimate,1,{inCombat:false});assert.equal(rt.ultimate.vigor,25);
});
test('Immortality gives five seconds, 60% leech and a persistent long cooldown',()=>{
 const g=built('brawler','immortal'),rt=C.create();g.hp=10;let r=U.receive(g,rt.ultimate,{amount:20,stats,now:1000});assert.equal(r.trigger,'immortal');assert.equal(rt.ultimate.immortal,5);
 assert.equal(U.receive(g,rt.ultimate,{amount:200,stats,now:1001}).damage,0);assert.equal(C.afterHit(g,rt,{target:mob(),stats,damage:100,basic:true}).heal,60);
 g.talentCooldowns.immortalUntil=601000;assert.equal(U.receive(T.migrate(g),U.start(),{amount:20,stats,now:2000}).trigger,null);tick(g,rt.ultimate,5);assert.equal(rt.ultimate.immortal,0);
});
test('Asura schedules exactly two nonrecursive phantom hits; execution handles bosses separately',()=>{
 let g=built('sword','asura'),rt=U.start(),m=mob();let actions=after(g,rt,m);assert.deepEqual(actions.map(a=>[a.amount,a.delay]),[[30,.12],[30,.24]]);
 rt.delayed.push(...actions);assert.equal(tick(g,rt,.12).length,1);assert.equal(tick(g,rt,.12).length,1);assert.equal(tick(g,rt,1).length,0);
 g=built('sword','execution');assert.equal(after(g,U.start(),m,{random:()=>0})[0].amount,500);m.type='boss';assert.equal(after(g,U.start(),m,{random:()=>0})[0].amount,100);assert.equal(after(g,U.start(),m,{random:()=>.9}).length,0);
});
test('Spatial cuts gain range and hit aligned foes, never across obstructed sight lines',()=>{
 const g=built('sword','spatial'),m=mob(),line=mob(2,150,1),side=mob(3,120,90);assert.equal(U.stats({...stats,range:40},g).range,220);
 assert.deepEqual(after(g,U.start(),m,{enemies:[m,line,side]}).map(a=>a.target.id),[2]);assert.equal(after(g,U.start(),m,{enemies:[m,line],clear:()=>false}).length,0);
});
test('Artillery fires every fifth hit; camouflage needs stillness and consumes a guaranteed 300% critical',()=>{
 let g=built('gunner','artillery'),rt=U.start(),m=mob();for(let i=0;i<4;i++)assert.equal(after(g,rt,m).length,0);assert.equal(after(g,rt,m)[0].amount,400);
 g=built('gunner','camouflage');rt=U.start();tick(g,rt,0);tick(g,rt,2);assert(rt.hidden);assert(U.receive(g,rt,{amount:200,stats}).untargetable);
 const r=U.before(g,rt,{basic:true,critical:false});assert(r.critical);assert.equal(r.critMultiplier,3);assert(!rt.hidden);tick(g,rt,.5,{hero:{...hero,x:20}});assert.equal(rt.still,0);
});
test('Ricochets revisit living targets over time, lose 15% per bounce and stop with no next target',()=>{
 const g=built('gunner','ricochet'),rt=U.start(),m=mob(),other=mob(2,90,0);after(g,rt,m,{projectile:true,enemies:[m,other]});assert.equal(rt.ricochets.length,1);
 let a=tick(g,rt,.12,{enemies:[m,other]});assert.equal(a[0].target.id,2);assert.equal(a[0].amount,85);a=tick(g,rt,.12,{enemies:[m,other]});assert.equal(a[0].target.id,1);assert.equal(a[0].amount,72.25);
 other.alive=false;tick(g,rt,.12,{enemies:[m,other]});assert.equal(rt.ricochets.length,0);
});
test('Assassin consumes five critical marks; clone copies 50% damage and poison without generating clones',()=>{
 let g=built('rogue','assassinMark'),m=mob(),rt=U.start();for(let i=0;i<4;i++)assert.equal(after(g,rt,m,{critical:true}).length,0);assert.equal(after(g,rt,m,{critical:true})[0].amount,120);assert.equal(m.assassinMarks,0);
 g=built('rogue','shadowClone');rt=C.create();const a=after(g,rt.ultimate,m)[0];assert.equal(a.amount,50);assert.equal(a.kind,'clone');
 C.afterHit(g,rt,{target:m,stats,damage:100,basic:true});C.afterHit(g,rt,{target:m,stats,damage:50,basic:true,contactScale:.5,fromClone:true});assert.equal(m.talentPoison.power,20);assert.equal(m.clonePoison.power,10);assert.equal(C.tick(rt,1,[m]).reduce((s,a)=>s+a.amount,0),30);
});
test('Underworld is the only world-loot exception for boxes and never grants direct gems or pearls',()=>{
 assert.deepEqual(U.loot(make('rogue'),()=>0),{box:false,legendary:false});assert.deepEqual(U.loot(built('rogue','underworld'),()=>0),{box:true,legendary:true});assert.deepEqual(U.loot(built('rogue','underworld'),()=>.9),{box:false,legendary:false});
 const defs=[...require('../forge-system.js').pearls.map(p=>({name:p.name,kind:'pearl',pearlId:p.id})),...P.boxes],g=make('rogue');g.inventory=[{id:'special-box',def:25,origin:'Senhor do Submundo'}];const opened=P.openBox(g,'special-box',defs,()=>0);assert(opened.ok);assert(opened.item.origin.startsWith('Senhor do Submundo'));
 assert(P.canDrop('pearl-box','underworld'));assert(!P.canDrop('pearl','underworld'));assert(!P.canDrop('gem','underworld'));assert(!P.canDrop('pearl-box','world'));
});
test('Overclock doubles speed, removes internal shield cooldown, pays unavoidable HP cost; EMP detects crossing',()=>{
 let g=built('cyborg','overclock'),d=U.stats(stats,g);assert.equal(d.speed,2);assert.equal(d.moveSpeed,200);assert.equal(U.internalCooldown(g,90000),0);assert.equal(U.internalCooldown(make(),90000),90000);assert.equal(tick(g,U.start(),1)[0].selfBurn,1);
 g.hp=10;g.talentCooldowns.energyShieldUntil=999999;assert(C.receive(g,C.create(),{stats,amount:200,now:100}).shieldTriggered);
 g=built('cyborg','emp');g.hp=51;assert.equal(U.receive(g,U.start(),{amount:2,stats,now:10}).trigger,'emp');g.talentCooldowns.empUntil=1000;assert.equal(U.receive(g,U.start(),{amount:2,stats,now:20}).trigger,null);
 const m=mob();m.empRemaining=10;assert.equal(C.beforeHit(g,C.create(),{target:m,hero,stats,basic:true,critical:false}).armor,0);
});
test('Orbital halves cadence and burns the beam path for four real ticks',()=>{
 const g=built('cyborg','orbital'),rt=U.start(),m=mob();assert.equal(U.stats(stats,g).speed,.5);assert.equal(U.before(g,rt,{basic:true}).multiplier,2.5);after(g,rt,m);
 let damage=0;for(let i=0;i<4;i++)damage+=tick(g,rt,1,{enemies:[m]}).filter(a=>a.target).reduce((s,a)=>s+a.amount,0);assert.equal(damage,140);assert.equal(rt.fields.length,0);
 const fractional=U.start();after(g,fractional,m);let sum=0;for(let i=0;i<80;i++)sum+=tick(g,fractional,.05,{enemies:[m]}).filter(a=>a.target).reduce((s,a)=>s+a.amount,0);assert.equal(sum,140);
});
test('Cataclysm rotates elements and applies all three real statuses; mana shield uses energy before HP',()=>{
 const g=built('strategist','cataclysm'),rt=U.start(),names=[];for(const random of [0,.4,.99]){const m=mob();U.before(g,rt,{basic:true});names.push(after(g,rt,m,{magic:true,random:()=>random}).find(a=>a.visualOnly).kind);assert(m.ultimateBurn||m.talentControl);}
 assert.deepEqual(names,['meteor','lightning','ice']);const mana=built('strategist','archmage');mana.energy=80;const r=U.receive(mana,U.start(),{amount:110,stats});assert.equal(r.energyUsed,80);assert.equal(r.damage,30);
});
test('Singularity pulls for two seconds and respects navigation obstacles',()=>{
 const g=built('strategist','singularity'),rt=U.start(),m=mob(),other=mob(2,150,0);after(g,rt,m,{magic:true,critical:true});let moved=0;
 tick(g,rt,.5,{enemies:[other],move:(m,dx)=>{m.x+=dx;moved++;}});assert(moved>0);assert(other.x<150);const x=other.x;tick(g,rt,.5,{enemies:[other],clear:()=>false,move:()=>assert.fail('wall')});assert.equal(other.x,x);tick(g,rt,1);assert.equal(rt.fields.length,0);
});
test('Eternal overheal bonuses expire at combat end and never change the permanent base',()=>{
 const g=built('healer','eternalBlessing'),rt=U.start();U.heal(g,rt,{amount:100,effective:40,stats});assert.equal(rt.holyHP,6);assert.equal(rt.holyAttack,1.2);assert.equal(U.stats(stats,g,rt).maxHP,106);assert.equal(stats.maxHP,100);
 tick(g,rt,1,{inCombat:false});assert.equal(rt.holyHP,0);assert.equal(rt.holyAttack,0);
});
test('Guardian revives self/allies once per ten minutes; empathy divides damage, replicates healing and reflects solo healing',()=>{
 let g=built('healer','guardianAngel'),rt=U.start();g.hp=5;assert.equal(U.receive(g,rt,{amount:10,stats,now:0}).trigger,'guardianAngel');const ally={id:'ally',x:10,y:0,hp:0,maxHP:120,energy:0,maxEnergy:80};assert(U.reviveAlly(g,rt,hero,ally,stats,100,{left:-100,right:100,top:-100,bottom:100}));assert.equal(ally.hp,120);assert.equal(ally.energy,80);ally.hp=0;assert(!U.reviveAlly(g,rt,hero,ally,stats,101,{left:-100,right:100,top:-100,bottom:100}));
 g=built('healer','empathy');rt=U.start();const live={...ally,hp:50};assert.deepEqual(U.distributeDamage(g,hero,[hero,live],100).map(a=>a.amount),[50,50]);assert.equal(U.replicateHeal(g,hero,[hero,live],30)[0].amount,30);
 const attacker=mob();U.receive(g,rt,{amount:10,stats,source:attacker});const actions=U.heal(g,rt,{amount:40,effective:40,stats,hero,enemies:[attacker,mob(9)]});assert.equal(actions.length,1);assert.equal(actions[0].amount,20);
});
console.log(groups+' achievement, migration and final passive groups passed.');
