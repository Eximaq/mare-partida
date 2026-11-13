'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {choices}=require('../character-appearance.js');
const {make}=require('../tests/rework-integration-support.cjs');

const directions=['south','north','east','west'];
const actions=['idle','walk','attack-sword'];
const cohorts=[
 ...[6,7,130,137,144,151,158,165,172,179].map(def=>({coat:{def}})),
 ...[140,147,154,161,175,182].map(def=>({legs:{def}})),
 ...[18,19,129,157].map(def=>({coat:{def:6},head:{def}})),
];
async function audit(output){
 const api=make();
 await api.ready;
 const rows=[];
 for(const gender of Object.keys(choices.gender))for(const gear of cohorts){
  const equipment={weapon:{def:0},...gear};
  const summary={gender,equipment,selected:{idle:0,walk:0,'attack-sword':0},missing:{idle:0,walk:0,'attack-sword':0}};
  const cases=[];
  for(const hairStyle of Object.keys(choices.hairStyle))for(const hairColor of Object.keys(choices.hairColor)){
   const player={appearance96:{gender,hairStyle,hairColor,skinColor:'dark',eyeStyle:'face-almond',eyeColor:'green'},equipment};
   for(const action of actions)for(const direction of directions){
    const selected=api.select(player,{action,direction});
    summary[selected?'selected':'missing'][action]++;
    cases.push({hairStyle,hairColor,action,direction,source:selected?.id||null});
   }
  }
  rows.push({...summary,cases});
 }
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'hair-source-matrix.json'),JSON.stringify({
  scope:'Source selection with sword 0. Physical fit, pixel color and occlusion require rendering and visual inspection.',
  configurations:rows.reduce((sum,row)=>sum+row.cases.length/(directions.length*actions.length),0),
  queries:rows.reduce((sum,row)=>sum+row.cases.length,0),rows,
 },null,2));
 console.log(JSON.stringify(rows.map(({cases,...row})=>row)));
}
audit(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
