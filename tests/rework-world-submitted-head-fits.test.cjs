'use strict';
// Prove that imported head-fit values are consumed once by live World routes.
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.join(__dirname,'..');
const load=f=>require(path.join(R,f));
const P='tools/rework-accessories/',A=load('character-appearance.js'),W=load('paper-doll-96-lobby.js'),
 C=load('tools/paper-doll-96-v3/weapons.json'), index=load(P+'head-layer-index.json'),
 {make}=load('tests/rework-integration-support.cjs');
const packages=[
 ['hair_user_adjustments_source-only_v1',27,'female',false],
 ['headgear_user_adjustments_source-only_v1',372,'female',true],
 ['male_headgear_user_adjustments_source-only_v1',408,'male',true],
];
const neutralKeys=new Set([
 '143/curly/north',
 ...['braided','undercut','bob','swept','spiky','topknot','ponytail','curly','long'].map(s=>'178/'+s+'/south'),
]);
const neutral={gearX:0,gearY:0,gearScale:100,hairX:0,hairY:0,hairScale:100,lineOffset:0,policy:'calibrated',hideHair:false};
const neutralKey=t=>[t.item,t.style,t.direction].join('/');
const key=t=>JSON.stringify([t.snapshot,t.packSHA256,t.body,t.style,t.item??null,t.direction]);
const actions=['idle','walk','attack'];
(async()=>{
 const api=make({makeCanvas(){throw Error('World selector proof must not rasterize');}});
 await api.ready;
 const counts={}, all=new Set();
 for(const [pkg,count,body,gear] of packages){
  const src=load(P+pkg+'/adjustments.json');
  const rows=[...src.adjustments], records=index.records.filter(r=>r.package===pkg);
  const byKey=new Map(records.map(r=>[key(r),r]));
  assert.equal(byKey.size,records.length,'duplicate runtime target '+pkg);
  if(pkg==='headgear_user_adjustments_source-only_v1'){
   assert.equal(rows.length,362,'historical female gear list must stay pinned');
   const extra=load(P+'female-headgear-neutral-import.json');
   for(const k of ['schema','previewOnly','catalogVersion','catalogSHA256'])assert.deepEqual(extra[k],src[k],'neutral source '+k);
   assert.equal(extra.adjustments.length,10);
   rows.push(...extra.adjustments);
   const explicit=rows.filter(r=>neutralKeys.has(neutralKey(r.target)));
   assert.equal(explicit.length,neutralKeys.size);
   assert.deepEqual(new Set(explicit.map(r=>neutralKey(r.target))),neutralKeys);
   for(const r of explicit)assert.deepEqual(r.adjustment,neutral,neutralKey(r.target));
  }
  assert.equal(rows.length,count,pkg+' normalized source count');
  counts[pkg]=Object.fromEntries(actions.map(a=>[a,0]));
  for(const {target:t,adjustment} of rows){
   assert.equal(t.body,body); assert.equal(t.item!=null,gear);
   const k=key(t), indexed=byKey.get(k); assert(!all.has(k),'duplicate input '+k); all.add(k);
   assert(indexed,'missing exact indexed target '+k); assert.deepEqual(indexed.adjustmentRecord.adjustment,adjustment,k);
   const player=A.commit({classId:'brawler',equipment:gear?{head:{def:t.item}}:{}},
    {gender:body==='female'?'feminino':'masculino',hairStyle:'hair-'+t.style,
     skinColor:'light',skinStyle:'natural',hairColor:'black',eyeColor:'blue',eyeStyle:'original'},()=>true);
   for(const action of actions){
    const r=W.selectWorldHDOnly(api,C,player,{consumer:'world',action,direction:t.direction});
    const label=[pkg,t.style,t.item,t.direction,action].join('/');
    assert(r&&!r.visualDegraded&&!r.omitted?.length,label);
    const materials=[r.femaleNamedHairRecord,r.material,r.baseRecord?.femaleNamedHairRecord];
    const candidates=gear?[r.headRecord,...materials.map(m=>m?.gearRecord),r.gearOnlyRecord?.sourceRecord,r.originalHairGearRecord?.sourceRecord]
      :[r.headRecord,...materials.filter(m=>m&&!m.gearRecord).map(m=>m.source)];
    const exact=candidates.find(x=>x?.package===pkg&&key(x)===k);
    assert(exact,label+' exact source target skipped: '+r.id);
    assert.deepEqual(exact.adjustmentRecord.adjustment,adjustment,label);
    if(body==='female'&&gear)assert(materials.some(m=>m?.gearRecord===exact&&m.gearPolicy==='approved-same-hairstyle-policy'),label+' saved gear policy not rendered');
    ++counts[pkg][action];
   }
  }
 }
 assert.equal(all.size,807);
 assert.equal(Object.values(counts).flatMap(Object.values).reduce((a,b)=>a+b,0),2421);
 console.log(JSON.stringify({sources:all.size,worldSelections:2421,counts},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
