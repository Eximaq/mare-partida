'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {make}=require('./rework-integration-support.cjs'),appearance=require('../character-appearance');
const world=require('../paper-doll-96-lobby'),weapons=require('../tools/paper-doll-96-v3/weapons.json');
const {complete,weapons:catalog}=require('../tools/audit-hd-wardrobe-product.cjs');
const sourceFile=path.join(__dirname,'../docs/native-hd/editable-female-equipment/checkpoint-2026-11-18/fuzil113-ns.zip');
const options={consumer:'world',action:'attack-firearm',direction:'north'};
async function main(){
 const zip=await global.MareReworkZip.loadArchive(fs.readFileSync(sourceFile),'cdd9889e5d96f92f826536779298fa86b9af0e0b52f2af2af41ac382a0087377');
 const original=JSON.parse(Buffer.from(await zip.read('fuzil113-ns/catalog.json')));
 const api=make();await api.ready;
 const guns=catalog.filter(w=>w.role==='gunner');assert.equal(guns.length,6);
 function reference(bare,gear){
  const authored=original.originals.north.pack.directions.north.layers;
  const body=bare.pack.directions.north;
  assert.deepEqual(authored.slice(0,body.layers.length),body.layers);
  const parts=authored.slice(body.layers.length).filter(l=>
   l.id.startsWith('coat151-')||gear.legs===154&&l.id==='candidate-pants154'||
   gear.boots===148&&l.id.startsWith('candidate-boot148-')||gear.gloves===166&&l.id.startsWith('candidate-glove166-'));
  const add=(frames,id,slot,depth)=>parts.push({id,slot,depth,binding:{kind:'fixed'},source:frames[0],frames});
  for(const [slot,value,defaultItem] of [['pants',gear.legs,154],['boots',gear.boots,148]]){
   if(value!==defaultItem){
    const {frames}=original.northVariants.find(r=>r.slot===slot&&r.item===value);
    add(frames,'control-'+slot,slot==='pants'?'pants':'body',slot==='pants'?3.1:.5);
   }
  }
  if(gear.gloves!==166)for(const side of ['left','right']){
   const phases=original.northGloves.filter(r=>r.item===gear.gloves&&r.side===side).sort((a,b)=>a.phase-b.phase);
   assert.equal(phases.length,8);
   add(phases.map(r=>r.sha),'control-glove-'+side,'foreground',6.1);
  }
  const pack={...bare.pack,directions:{north:{...body,layers:[...body.layers,...parts]}}};
  const refs=[...new Set(parts.flatMap(l=>l.frames))];
  return {...bare,id:bare.id+'-archive-'+JSON.stringify(gear),pack,combatWardrobeSources:refs,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...bare.baseRecord.sourceRefs,...refs]}};
 }
 async function render(p,source){
  const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
  try{
   assert.equal(bundle.coverage[0].frames,8);assert.deepEqual(bundle.coverage[0].omitted||[],[]);
   return Array.from({length:8},(_,i)=>{
    let canvas;assert(bundle.draw({save(){},restore(){},drawImage(c){canvas=c;}},p,{...options,progress:(i+.25)/8}));
    return require('node:crypto').createHash('sha256').update(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data).digest('hex');
   });
  }finally{bundle.release();}
 }
 let phases=0;
 for(const {id} of guns)for(const skinColor of ['light','ebony'])for(const gear of [
  {coat:151,legs:154,boots:148,gloves:166},{coat:151,legs:168,boots:9,gloves:25}]){
  const from=parts=>appearance.commit({classId:'gunner',equipment:Object.fromEntries(
   Object.entries({weapon:id,...parts}).map(([s,def])=>[s,{def}]))},
   {gender:'feminino',skinColor,hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'green'},()=>true);
  const bare=world.selectWorldHDOnly(api,weapons,from({}),options),player=from(gear);
  const actual=world.selectWorldHDOnly(api,weapons,player,options);assert(complete(actual,Object.entries(gear),id,options));
  assert.deepEqual(await render(player,actual),await render(player,reference(bare,gear)),
   'Original rifle group order, source pixels and weapon pose '+JSON.stringify({id,skinColor,gear}));
  phases+=8;
 }
 assert.equal(phases,192);console.log(JSON.stringify({phases,firearms:guns.map(w=>w.id)}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
