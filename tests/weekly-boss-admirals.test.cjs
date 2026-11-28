'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../weekly-admirals.js'),A=require('../akainu-combat.js'),art=require('../weekly-admiral-art.js'),E=require('../world-battle.cjs');
const profile={hp:200,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:110,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:600};
const origin={x:0,y:0},make=id=>D.initialize(A.create({id:'b',...origin,profile,now:0}),id);
const p=(id,x,y)=>({id,connected:true,b:{hp:90},hero:{x,y}});
const nav={projectileClear:()=>true,path:(m,to)=>[to],follow:(m,path)=>Object.assign(m,path[0])};
test('old profile is never selected and each new profile is explicit and independent',()=>{
 const prior={balanceApproved:true,profile};assert.deepEqual(D.profiles(prior),{});
 const next=D.withProfile(prior,'kizaru',{profile:{...profile,hp:300}}),last=D.withProfile(next,'aokiji',{profile:{...profile,hp:400}});
 assert.equal(D.profiles(last).akainu,undefined);assert.equal(D.profiles(last).kizaru.profile.hp,300);assert.equal(D.profiles(last).aokiji.profile.hp,400);assert.equal(last.legacyConfig,prior);
});
test('four directions resolve walks, attacks, casts and mirrored west with no hurt clip',()=>{
 for(const id of D.ids){const b=make(id);
  for(const [dir,v] of Object.entries(D.dirs)){
   b.action=null;b.emberFacing=dir;b.moving=1;assert.equal(art.pose(b,0).clip,'walk');assert.equal(art.pose(b,0).mirror,dir==='west');
   for(const [action,clip] of [['punch','attack'],['special','special_2'],['aoe','special_area']]){
    b.action={kind:action,facing:dir,startedAt:0,impactAt:500};assert.equal(art.pose(b,455).clip,clip);
    if(action==='special'&&id!=='kizaru'){const g=D.shape(id,'line',origin,dir);assert.equal(g.to.x,v.x*D.tile*D.roster[id].line);assert.equal(g.to.y,v.y*D.tile*D.roster[id].line);assert(D.contains(g,g.to));}
   }
  }
  b.action=null;b.moving=0;b.alive=false;b.defeatedAt=10;assert.equal(art.pose(b,50).clip,'idle');assert.equal(art.pose(b,1210).alpha,0);
 }
});
test('Aokiji circle uses a 5-tile true radius and hits only eligible targets once',()=>{
 const b=make('aokiji'),actors=[p('near',0,70),p('edge',320,0),p('corner',300,300),p('wall',-150,0)];
 const map={...nav,projectileClear:(from,to)=>to.x!==-150};
 b.nextAoeAt=0;
 assert.deepEqual(D.step(b,actors,{nav:map,now:10}),[]);assert.equal(b.action.geometry.radius,320);
 assert.deepEqual(D.step(b,actors,{nav:map,now:1209}),[]);
 assert.deepEqual(D.step(b,actors,{nav:map,now:1210}).map(h=>h.targetId),['near','edge']);
 assert.deepEqual(D.step(b,actors,{nav:map,now:1300}),[]);
});
test('Kizaru hops once per target, no hit on return or on a target that dodges',()=>{
 const b=make('kizaru'),actors=[p('a',100,0),p('b',190,0),p('c',240,20),p('d',290,15),p('e',320,0)];
 b.nextSpecialAt=0;b.nextAoeAt=9000;
 D.step(b,actors,{nav,now:0});
 assert.equal(b.action.hops.length,4);assert.equal(b.action.kind,'special');assert.equal(b.action.facing,'east');
 actors[1].hero.y=100;
 const hits=[500,627,754,881,1008,1135].flatMap(now=>D.step(b,actors,{nav,now}));
 assert.deepEqual(hits.map(h=>h.targetId),['a','c','d']);
});
test('exact predecessor changes only the battle hash',()=>{
 const s={rulesHash:'66b265a4555b30e71c6b6974e6e2de3475ead6403b1bb4f960b3f9a38bf3d47e',hp:51,area:'marineford',mobs:[{id:'x',x:123}],pending:{a:1}};
 const copy=structuredClone(s);E.upgradeBalance(s);assert.deepEqual(s,{...copy,rulesHash:E.rulesHash});
});
test('natively packed body and effect textures have the exact frame dimensions',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'../assets/weekly-boss/admirals');
 function dimensions(f){const b=fs.readFileSync(f);assert.equal(b.toString('ascii',8,16),'WEBPVP8L');assert.equal(b[20],47);const bits=b.readUInt32LE(21);assert(bits&(1<<28));return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
 for(const id of D.ids)for(const d of ['north','east','south'])for(const [k,n] of Object.entries({idle:4,walk:8,attack:5,special_2:6,special_area:6}))assert.deepEqual(dimensions(path.join(root,id,d+'-'+k+'.webp')),[384*n,384]);
 for(const f of fs.readdirSync(path.join(root,'vfx')))assert.deepEqual(dimensions(path.join(root,'vfx',f)),[516,516]);
});
test('balance applies all three approval values while leaving old profiles inert',()=>{
 for(const id of D.ids){
  const p=D.balanceProfile(id,{hp:1,attack:30000,defense:0,magicDefense:0,aoeMultiplier:9,reach:73});
  assert.deepEqual([p.hp,p.defense,p.magicDefense,p.attack,p.aoeMultiplier,p.reach],[300000,4500,1650,1,1,73]);
  assert.deepEqual([D.attackAmount(2000),D.attackAmount(14000),D.attackAmount(0)],[100,700,0]);
  const config=D.defaultConfig(id,{spawn:{x:1,y:2},entry:{x:3,y:4}});assert(!config.balanceApproved);assert.deepEqual(config.profile,D.balanceProfile(id));
 }
});
