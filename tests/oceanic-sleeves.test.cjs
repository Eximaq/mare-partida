'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{fit}=require('../tools/equipment56_oceanic_sleeves.cjs'),rig=require('../tools/paper-doll-96-v3/appearance-rig.json');
test('oceanic sleeves bind authored cloth to both bodies without borrowing dark outside contours',()=>{
 for(const body of ['masculino','feminino'])for(const direction of ['south','north','east']){
  const source=new Uint8ClampedArray(128*128*4);for(let i=0;i<source.length;i+=4)source.set([240,235,230,255],i);
  // Outside contour of an isolated garment is not a sleeve's interior.
  for(let y=0;y<128;y++)for(const x of [0,127])source.set([3,2,4,255],(y*128+x)*4);
  const old=source.slice(),result=fit(source,rig.rests[body][direction],body,direction);assert.deepEqual(source,old);
  for(const side of ['LEFT','RIGHT'])for(const[part,joint]of [['upper',' SHOULDER'],['lower',' ELBOW']]){
   const j=rig.rests[body][direction].find(j=>j.label===side+joint),p=(Math.round(j.y*128)*128+Math.round(j.x*128))*4;
   assert.deepEqual(Array.from(result.parts[side+part].slice(p,p+4)),[240,235,230,255]);
  }
  assert.ok(result.parts.DRAPE.some(v=>v===255));assert.ok(result.parts.DRAPE.filter((v,i)=>i%4===3&&v).length<result.full.filter((v,i)=>i%4===3&&v).length);
 }
});
test('separated oceanic drape is explicit and does not replace ordinary torso material',()=>{
 const catalog=require('../tools/paper-doll-96-v3/appearance-catalog.json');
 for(const s of catalog.styles.filter(s=>s.kind==='torso'))for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west']){
  assert.equal(Boolean(s.parts?.[body]?.[dir]?.DRAPE),s.itemId===165);
 }
});
