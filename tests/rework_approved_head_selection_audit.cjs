const fs=require('node:fs'),{make}=require('./rework-integration-support.cjs');
const [,,out]=process.argv;
const base='../tools/';
const head=require(base+'rework-accessories/head-layer-index.json');
const key=(r)=>[r.body,r.style,r.item??'',r.direction,r.snapshot].join('/');
(async()=>{
 const api=make();await api.ready;
 const result=[];
 for(const r of head.records.filter(r=>r.status==='approved-adjustment')){
  const player={appearance96:{gender:r.body,hairStyle:'hair-'+r.style,skinColor:'light',hairColor:'black',eyeColor:'blue',eyeStyle:'original'},equipment:r.item==null?{}:{head:{def:r.item}}};
  for(const action of ['idle','walk','attack']){
   const selected=api.select(player,{action,direction:r.direction});
   const record=selected?.headRecord||selected?.femaleNamedHairRecord?.gearRecord||selected?.femaleNamedHairRecord?.source||selected?.gearOnlyRecord;
   result.push({target:r.adjustmentRecord.target,package:r.package,action,selection:selected?.id??null,snapshotExact:!!record&&key(r)===key(record)&&record.adjustmentRecord?.sourceAdjustmentIndex===r.adjustmentRecord.sourceAdjustmentIndex});
  }
 }
 fs.writeFileSync(out,JSON.stringify(result));
 console.log('Ajustes exatos por pose',result.filter(r=>r.snapshotExact).length,'/',result.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
