'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs');
const R=process.env.STAGE||path.resolve(__dirname,'..'),req=f=>require(path.join(R,f)),{make,cv}=req('tests/rework-integration-support.cjs');
const A=req('character-appearance'),lookup=req('item-catalog').create({forge:req('forge-system'),prison:req('prison-system'),haki:req('haki-system'),akuma:req('akuma-system'),hakiProgression:req('haki-progression')}).items;
const o={consumer:'world',action:'walk',direction:'north'},p=(weapon,boots,skinColor='light')=>A.commit({classId:lookup[weapon].type,equipment:{weapon:{def:weapon},boots:{def:boots}}},{gender:'feminino',skinColor},()=>true);
const asset='tools/rework-female-north-rig/index.json';
const get=(file)=>{const f=path.join(R,file);return JSON.parse(fs.existsSync(f)?fs.readFileSync(f):require('node:zlib').gunzipSync(fs.readFileSync(f+'.gz')));};
const plain=get(asset);
const metadata=Object.values(plain.disjointBootOwnContours.weapons||plain.disjointBootOwnContours.projections),ids=Object.keys(plain.disjointBootOwnContours.weapons||{}).map(Number);
const second=()=>{const q=structuredClone(plain);delete q.disjointBootOwnContours.weapons;q.disjointBootOwnContours.projections=metadata.map(structuredCloneSafe);return q;};
function structuredCloneSafe(v){return structuredClone(v);}
function create(custom){return make({fetchJSON:async f=>f===asset?custom:get(f)});}
const b=(api,player)=>api.selectVisual(player,o);
const fingerprint=(c)=>crypto.createHash('sha256').update(Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)).digest('hex');
async function render(api,player,source){
 const bundle=await api.prepareConfiguration([{player,options:o,source}],{resolve:x=>x});
 const hashes=[];
 try{for(let i=0;i<40;i++){
  let canvas;assert(bundle.draw({save(){},restore(){},drawImage(c){canvas=c;}},player,{...o,progress:(i+.125)/40}));
  hashes.push(fingerprint(canvas));
 }}finally{bundle.release();global.gc?.();}
 return hashes;
}
(async()=>{
 const mutated=second(),source=create(plain),trial=create(mutated),corrupt=second();
 // Change every checked projection matrix without changing the selected gait
 // or legitimately registered weapon. Never authorize by index position.
 const q=corrupt.disjointBootOwnContours;
 for(const row of q.projections) row.pad+=256;
 const guard=create(corrupt);
 await Promise.all([source.ready,trial.ready,guard.ready]);
 const fixtures=[...new Set([67,70,69,110,3,114,74,...ids])];
 let pass=0,held=0;
 for(const weapon of fixtures)for(const boots of [8,9,141,148,176,183]){
  const actor=p(weapon,boots),normal=b(source,actor),r=b(trial,actor);
  if(normal?.northLayers?.lower?.disjointBootOnly){ 
   assert(r?.northLayers?.lower?.disjointBootOnly,weapon+' B'+boots+' must ignore weapon-ID keyed contour lookup');
   assert.equal(r.id,normal.id);assert.deepEqual(r.slotRoutes,normal.slotRoutes);assert.deepEqual(r.northLayers.lower,normal.northLayers.lower);
   assert(!b(guard,actor)?.northLayers?.lower?.disjointBootOnly);
   pass++;
  }else {assert.equal(r?.id,normal?.id);held++;}
 }
 assert(pass>150);assert(held>40);
 const samples=[[67,9,1],[110,8,2],[114,148,2]];
 for(const [weapon,boots,parts] of samples)for(const tone of ['light','ebony']){
   const actor=p(weapon,boots,tone),normal=b(source,actor),r=b(trial,actor),saved=JSON.stringify(actor);
   assert(normal?.northLayers?.lower?.disjointBootOnly && r?.northLayers?.lower?.disjointBootOnly);
   assert.equal(r.northLayers.body.states[0].parts.length,parts);
   const base=await render(source,actor,normal),projected=await render(trial,actor,r);
   assert.deepEqual(projected,base,'same boot, body, weapon, and pose RGBA');
   const off={...actor,equipment:{...actor.equipment,boots:null}},without=b(trial,off);
   assert(without?.northLayers?.lower==null);
   const originalOff=b(source,off);assert.equal(without?.id,originalOff?.id);
   assert.deepEqual(await render(trial,off,without),await render(source,off,originalOff));
   assert.equal(JSON.stringify(actor),saved);
   console.log('PASS',weapon,boots,parts,tone,40);
 }
 console.log('PASS',pass,'certified and',held,'held both index shapes; 240 exact dressed pixels/pose and 240 original removal checks across six saves.');
})().catch(e=>{console.error(e);process.exitCode=1;});
