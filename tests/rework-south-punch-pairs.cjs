'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {make}=require('./rework-integration-support.cjs'),{weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);const mod=n=>require(path.join(root,n));
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const weapon=Number(process.argv[2]);assert([2,3,14,110,111,118,119,120].includes(weapon));const options={action:'attack-unarmed',direction:'south',consumer:'world'};
const clockFor=weapon=>[111,118,119,120].includes(weapon)?'0 0 1 1 2 2 3 3 4 4 5 5 6 6 7 8 9 10 11 11'.split(' '):Array.from({length:12},(_,i)=>String(i));
const digest=(ctx,y,h)=>createHash('sha256').update(ctx.getImageData(0,y,640,h).data).digest('hex');
async function main(){
 const api=make();await api.ready;const actor=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},
  {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
 async function phases(kit){
  const p={...actor,equipment:Object.fromEntries(Object.entries(kit).map(([k,id])=>[k,{def:id}]))};
  const source=world.selectWorldHDOnly(api,catalog,p,options);
  assert.deepEqual(source.omitted||[],[]);assert.equal(source.states.length,12);assert.deepEqual(source.timeline,clockFor(weapon));
  for(const [k,id] of Object.entries(kit))assert.equal(source.slotRoutes[k].item,id);
  const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
  const rows=[];try{assert.deepEqual(bundle.coverage[0].omitted||[],[]);
   for(let f=0;f<12;f++){
    let c;assert(bundle.draw({save(){},restore(){},drawImage(frame){c=frame;}},p,{...options,progress:(source.timeline.indexOf(String(f))+.25)/source.timeline.length}));assert.equal(c.width,640);
    const x=c.getContext('2d');rows.push([digest(x,0,380),digest(x,380,260)]);
   }
  }finally{bundle.release();}return rows;
 }
 const bare=await phases({weapon}),heads=new Map(),feet=new Map(),rows=[];
 for(const head of gear[4])heads.set(head,await phases({head,weapon}));
 for(const boots of gear[2])feet.set(boots,await phases({weapon,boots}));
 for(const [i,head] of gear[4].entries())for(const [j,boots] of gear[2].entries()){
  const actual=await phases((i+j)%2?{head,boots,weapon}:{weapon,boots,head});
  for(let f=0;f<12;f++){
   assert.equal(heads.get(head)[f][1],bare[f][1]);assert.equal(feet.get(boots)[f][0],bare[f][0]);
   assert.notEqual(heads.get(head)[f][0],bare[f][0]);assert.notEqual(feet.get(boots)[f][1],bare[f][1]);
   assert.deepEqual(actual[f],[heads.get(head)[f][0],feet.get(boots)[f][1]],head+'/'+boots+'/'+f);
  }
  rows.push({head,boots,phases:actual.length});
 }
 assert.equal(rows.length,100);if(process.env.HD_PAIR_RESULTS)fs.writeFileSync(process.env.HD_PAIR_RESULTS,JSON.stringify(rows));
 console.log(weapon,rows.length,'pairs,',rows.length*12,'fully drawn frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
