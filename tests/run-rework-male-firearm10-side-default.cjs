const p=require('node:path'),a=require('node:assert/strict'),{spawnSync}=require('node:child_process');
for(const w of [4,5,113,115,116]){
 const env={...process.env,WEAPON:String(w)};delete env.SELECT_ONLY;
 const r=spawnSync(process.execPath,['--expose-gc',p.join(__dirname,'rework-male-firearm10-side-default.cjs')],{env,stdio:'inherit'});
 if(r.error)throw r.error;a.equal(r.status,0,r.signal||String(w));
}
console.log('PASS 10 saved attacks and 80 original Canvas phases with only 18 authored eye pixels changed');
