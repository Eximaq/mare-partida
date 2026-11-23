'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {make}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const root=path.resolve(__dirname,'..');
const opts={action:'walk',direction:'north',consumer:'world'};
function fixture(edit){return make({fetchJSON:async p=>{
 const f=path.join(root,p),j=JSON.parse(fs.readFileSync(fs.existsSync(f)?f:f+'.gz').toString());if(p==='tools/rework-female-north-rig/index.json')edit(j);return j;
}});}
const player=(def)=>A.commit({classId:([3].includes(def)?'brawler':'sword'),equipment:{weapon:{def},boots:{def:9}}},{gender:'feminino',skinColor:'light'},()=>true);
(async()=>{
 for(const edit of [
  j=>delete j.disjointBootOwnContours,
  j=>delete j.disjointBootOwnContours.weapons,
  j=>delete j.disjointBootOwnContours.shapes,
  j=>{j.disjointBootOwnContours.boots[9].keys[0][0]=12345},
  j=>{j.disjointBootOwnContours.matrices[j.disjointBootOwnContours.weapons[67].signature[0][0][1]][4]+=1}
 ]){
  const a=fixture(edit);await a.ready;
  assert(a.selectVisual(player(0),opts)?.northLayers?.lower);
  assert(!a.selectVisual(player(67),opts)?.northLayers?.lower?.disjointBootOnly);
 }
 console.log('PASS 5 fail-closed contour/matrix/boot-SHA mutation controls; original W0+B9 remains active');
})().catch(e=>{console.error(e);process.exitCode=1});
