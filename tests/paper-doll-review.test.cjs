const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const review=require('../paper-doll-review.js'),pack=require('../pixellab-pip-generations/paper-doll-navy-starter-20261023/review-pack.json');
(async()=>{
  let requests=0;
  for(const [search,dev]of [['?paperDollReview=navy-starter',false],['?dev=1',true],['?dev=1&paperDollReview=unknown',true]]){
    const r=review.create({search,devActive:dev,fetch:()=>{requests++;},getImage:()=>{throw Error('No images expected');}});
    assert.equal((await r.ready).state,'off');assert.equal(r.draw(null,{},'idle','south',0,0,0),false);
  }
  assert.equal(requests,0);
  const p={classId:'sword',factionId:'pirate',equipment:{weapon:{def:0},coat:{def:6}}};
  for(const faction of Object.keys(MarePaperDollCatalog.factions)){
    p.factionId=faction;assert.deepEqual(review.appearance(pack,p).blocked,[]);
    assert.equal(review.appearance(pack,p).pieces.body,'navy-starter-body');
  }
  const before=JSON.stringify(p);review.appearance(pack,p);assert.equal(JSON.stringify(p),before);
  p.equipment.weapon={def:1};assert.equal(review.appearance(pack,p).blocked[0].code,'unmapped-equipment');
  p.equipment.weapon=null;assert.equal(review.appearance(pack,p).pieces.weapon,'navy-starter-weapon');
  p.equipment.coat={def:7};assert.equal(review.appearance(pack,p).blocked[0].slot,'outfit');
  p.equipment.coat=null;assert.deepEqual(review.appearance(pack,p).blocked,[]);
  p.equipment.head={def:18};assert.equal(review.appearance(pack,p).blocked.length,1);delete p.equipment.head;
  p.zoanTransformed=true;assert.equal(review.appearance(pack,p),null);p.zoanTransformed=false;
  for(const cls of ['gunner','brawler','rogue','cyborg','healer','strategist']){p.classId=cls;assert.equal(review.appearance(pack,p),null);}
  for(const data of [null,{...pack,productionEnabled:true},{...pack,pieces:[]},{...pack,pieces:pack.pieces.map(p=>({...p,approved:true}))}]){
    const r=review.create({search:'?dev=1&paperDollReview=navy-starter',devActive:true,baseURL:'http://localhost/game/',getImage:()=>{throw Error('Invalid pack must not load images');},fetch:async()=>({ok:true,json:async()=>data})});
    assert.equal((await r.ready).state,'failed');assert.equal(r.draw(null,{devSandbox:true},'idle','south',0,0,0),false);
  }
  console.log('DEV Paper Doll: explicit gate, no normal fetches, equipment/default binding, four factions, unsupported classes/Zoan, malformed pack and unchanged inputs passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
