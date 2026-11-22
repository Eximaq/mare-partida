'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),q=f=>require(path.join(R,f)),{make}=q('tests/rework-integration-support.cjs');
const actual=path.join(R,'paper-doll-96-lobby.js'),trial=process.env.LOBBY_TRIAL;
let W=require(actual);
if(trial){
 const mod=new Module(actual,module);mod.filename=actual;mod.paths=Module._nodeModulePaths(R);
 mod._compile(fs.readFileSync(trial,'utf8'),actual);W=mod.exports;
}
const A=q('character-appearance.js'),C=q('tools/paper-doll-96-v3/weapons.json'),api=make();
const o={consumer:'world',action:'idle',direction:'south'};
const save=(equipment,skinColor,hairColor)=>A.commit({classId:'sword',factionId:'pirate',equipment},
 {gender:'masculino',hairStyle:'original',hairColor,skinStyle:'natural',skinColor,eyeStyle:'original',eyeColor:'blue'},()=>true);
async function paint(player,source){
 const before=JSON.stringify(player),conf=await api.prepareConfiguration([{player,options:o,source}],{resolve:x=>x});
 try{
  let c;assert(conf.draw({save(){},restore(){},drawImage(img){c=img}},player,{...o,progress:0}));
  assert.equal(c.width,768);assert.equal(c.height,768);assert.equal(JSON.stringify(player),before);
  return new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
 }finally{conf.release();global.gc?.();}
}
(async()=>{
 await api.ready;const tones=process.env.TONE==='all'?Object.keys(A.skins):process.env.TONE?[process.env.TONE]:['light','ebony'];let cases=0;
 for(const skin of tones)for(const hair of ['black','blue'])for(const coat of [false,true]){
  const kit={weapon:{def:0},...(coat?{coat:{def:6}}:{})};
  const select=e=>{const actor=save(e,skin,hair);return [actor,W.selectWorldHDOnly(api,C,actor,o)];};
  const entries=[kit,{...kit,legs:{def:21}},{...kit,gloves:{def:25}},{...kit,legs:{def:21},gloves:{def:25}}].map(select);
  const [p,r]=entries[3];
  assert.equal(r?.slotRoutes?.legs?.quality,'hd','P21 is mounted in the full case');
  assert.equal(r?.slotRoutes?.gloves?.quality,'hd','G25 is mounted in the full case');
  assert.deepEqual(r.omitted,[]);assert.equal(r.colorAppearance.skin,skin);assert.equal(r.colorAppearance.hairColor,hair);
  if(coat)assert.equal(r.slotRoutes.coat.quality,'hd');
  const rendered=[];for(const row of entries)rendered.push(await paint(...row));
  const [off,legs,gloves,both]=rendered;
  // A test-only retained-pose witness isolates the already visible sword.
  // In production the pose and weapon bytes are left at their original depth.
  const withoutSword=x=>{
   const plan={...x.plan,parts:[]},g=x.independentCarryGlove;
   return {...x,id:x.id+':test-weapon-witness',plan,
    ...(g?{independentCarryGlove:{...g,base:{...g.base,plan}}}:{}),
    ...(x.nativeSlotPack?{nativeSlotPack:{...x.nativeSlotPack,mounted:{...x.nativeSlotPack.mounted,plan}}}:{})};
  };
  const shadow=await paint(entries[1][0],withoutSword(entries[1][1]));
  const shadowBoth=await paint(p,withoutSword(r));
  let pxLeg=0,pxGlove=0,weaponPixels=0;
  for(let i=0;i<both.length;i++){
   const l=legs[i]!==off[i],g=gloves[i]!==off[i];
   assert(!(l&&g),'Gloves and trousers cannot paint the same native pixel '+i);
   assert.equal(both[i],l?legs[i]:g?gloves[i]:off[i],'slot toggles must not repaint their peers at '+i);
   if(legs[i]!==shadow[i]){
    // At this exact contact two already-authored black alpha=1 edge
    // samples blend normally (alpha=2). They do not repaint steel.
    if(i===436*768+329){
     assert.equal(legs[i],0x01000000);assert.equal(shadowBoth[i],0x01000000);
     assert.equal(both[i],0x02000000);
    }else assert.equal(both[i],legs[i],'glove must not repaint the visible signed sword at '+i);
    assert.notEqual(both[i],shadowBoth[i]);weaponPixels++;
   }
   pxLeg+=+l;pxGlove+=+g;
  }
  assert(pxLeg>100&&pxGlove>100&&weaponPixels>100);
  const [withOther,s]=select({...p.equipment,head:{def:99999},boots:{def:99999}});
  assert.deepEqual(s.omitted.slice().sort(),['boots','head']);
  assert.equal(s.slotRoutes.weapon.quality,'hd');assert.equal(s.slotRoutes.legs.quality,'hd');assert.equal(s.slotRoutes.gloves.quality,'hd');
  assert.deepEqual(await paint(withOther,s),both);
  ++cases;
 }
 assert.equal(cases,tones.length*4);
 console.log('PASS independently mounted G25 + P21; no peer pixels change, save unchanged, and unregistered test slots do not erase HD:',cases,'native cohorts');
})().catch(e=>{console.error(e);process.exitCode=1;});
