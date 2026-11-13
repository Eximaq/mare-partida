'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {choices}=require('../character-appearance.js');
const {createHash}=require('node:crypto');
const {make,cv}=require('../tests/rework-integration-support.cjs');

const directions=['south','north','east','west'];
const actions=['idle','walk','attack-sword'];
const cohorts=[
 ...[6,7,130,137,144,151,158,165,172,179].map(def=>({coat:{def}})),
 ...[140,147,154,161,175,182].map(def=>({legs:{def}})),
 ...[18,19,129,157].map(def=>({coat:{def:6},head:{def}})),
];
async function audit(output){
 const render=process.env.MARE_HAIR_RENDER==='1';
 const cohortFilter=new Set((process.env.MARE_HAIR_EQUIPMENT||'').split(',').filter(Boolean).map(Number));
 const directionsToCheck=process.env.MARE_HAIR_DIRECTION?[process.env.MARE_HAIR_DIRECTION]:directions;
 const actionsToCheck=render?['idle']:actions;
 const loader=require('./rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const cache=new Map();
 const api=make(render?{loadImage:p=>{
  if(!cache.has(p)){
   cache.set(p,loader(p));
   if(cache.size>384)cache.delete(cache.keys().next().value);
  }
  return cache.get(p);
 }}:{});
 const canvas=render&&cv.createCanvas(170,185),ctx=canvas&&canvas.getContext('2d');
 await api.ready;
 const rows=[];
 fs.mkdirSync(output,{recursive:true});
 for(const gender of Object.keys(choices.gender))for(const gear of cohorts){
  if(cohortFilter.size&&!cohortFilter.has(Object.values(gear).at(-1).def))continue;
  const equipment={weapon:{def:0},...gear};
  const summary={gender,equipment,selected:{idle:0,walk:0,'attack-sword':0},missing:{idle:0,walk:0,'attack-sword':0}};
  const cases=[];
  for(const hairStyle of Object.keys(choices.hairStyle))for(const hairColor of Object.keys(choices.hairColor)){
   const player={appearance96:{gender,hairStyle,hairColor,skinColor:'dark',eyeStyle:'face-almond',eyeColor:'green'},equipment};
   for(const action of actionsToCheck)for(const direction of directionsToCheck){
    const selected=api.select(player,{action,direction});
    summary[selected?'selected':'missing'][action]++;
    const result={hairStyle,hairColor,action,direction,source:selected?.id||null};
    if(render&&selected){
     const options={action,direction,x:85,y:155};
     let prepared;
     try{
      prepared=await api.prepareConfiguration([{player,options}]);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(!prepared.draw(ctx,player,options))throw Error('Selected clip did not draw');
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      if(!pixels.some((n,i)=>i%4===3&&n))throw Error('Empty sprite');
      result.raster=createHash('sha256').update(pixels).digest('hex');
     }catch(error){result.error=error.message;}
     finally{prepared?.release();}
    }
    cases.push(result);
   }
  }
  rows.push({...summary,cases});
  if(render){
   fs.writeFileSync(path.join(output,'hair-raster-checkpoint.json'),JSON.stringify(rows));
   console.log(gender,JSON.stringify(gear),cases.filter(row=>row.raster).length,cases.filter(row=>row.error).length);
  }
 }
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'hair-source-matrix.json'),JSON.stringify({
  scope:render?'Native idle raster at map scale. Hash comparison measures visible color changes. Artistic fit requires visual inspection.':'Source selection with sword 0. Physical fit, pixel color and occlusion require rendering and visual inspection.',
  configurations:rows.reduce((sum,row)=>sum+row.cases.length/(directionsToCheck.length*actionsToCheck.length),0),
  queries:rows.reduce((sum,row)=>sum+row.cases.length,0),rows,
 },null,2));
 console.log(JSON.stringify(rows.map(({cases,...row})=>row)));
}
audit(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
