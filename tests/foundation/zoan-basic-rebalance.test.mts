import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const E=require('../../world-battle.cjs'),C=require('../../character-system.js');
const A=require('../../akuma-system.js'),H=require('../../haki-system.js');

function basic(classId:string,fruitId:string,transformed:boolean){
 const stats={...C.derive({classId,level:50,attributes:C.empty()},E.catalog.classes[classId],E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),
  physical:200,elemental:400,attack:classId==='strategist'?400:200,crit:0,accuracy:1,range:180};
 const rng=()=>5/11,b=E.create('beach',stats,1000,rng),m=b.mobs[0];
 Object.assign(m,{hp:10000,maxHP:10000,defense:0,magicDefense:0,attackClock:999,patrolClock:999});
 b.mobs=[m];b.auto=false;
 b.haki={...H.migrate({}).haki,unlocked:true,mastery:{version:1,seq:1,ranks:{imbuement:2,presence:3},completedVersions:{},migration:null}};
 const hero={x:m.x-30,y:m.y,direction:'right'};
 const nav={map:{width:4000,height:4000,spawn:hero},walkable:()=>true,projectileClear:()=>true,path:()=>[],follow(){}};
 const ctx={hero,nav,stats,baseStats:stats,classId,factionId:'pirate',level:50,fruitId,rng};
 assert.equal(E.fruitTransform(b,transformed,ctx),true);
 b.pending={targetId:m.id,remaining:0};
 for(let i=1;i<=30&&m.hp===10000;i++)E.step(b,{...ctx,now:1000+i*50,dt:.05});
 assert(m.hp<10000);
 return 10000-m.hp;
}

test('real basic attacks apply each Zoan multiplier once, including elemental classes and permanent Haki',()=>{
 const results=[];
 for(const [rank,multiplier] of Object.entries(A.zoanBasicByRank) as [string,number][]){
  const native=A.catalog.find((fruit:any)=>fruit.rank===rank&&A.isZoan(fruit));
  const fruit=native??A.byId('akuma_ushi_giraffe'),lookup=A.byId;
  // The catalogue has no Rank A Zoan. Exercise that rank in the same engine
  // with a test-only rank override; the production catalogue is unchanged.
  if(!native)A.byId=(id:string)=>id===fruit.id?{...fruit,rank}:lookup(id);
  try{
   for(const cls of ['sword','strategist']){
    const normal=basic(cls,fruit.id,false),transformed=basic(cls,fruit.id,true);
    assert(Math.abs(transformed-normal*multiplier)<=2,JSON.stringify({cls,rank,normal,transformed,multiplier}));
    results.push({rank,cls,normal,transformed,fixture:!native});
   }
  }finally{A.byId=lookup;}
 }
 console.log(JSON.stringify(results));
});
