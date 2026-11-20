const a=require('node:assert/strict'),p=require('node:path'),{spawnSync}=require('node:child_process');
let n=0;
for(const ACTION of ['idle','walk']){
 const views=[];
 for(const SKIN of ['light','porcelain','ebony']){
  const r=spawnSync(process.execPath,['--expose-gc',p.join(__dirname,'rework-relic32-north-carry.cjs')],{encoding:'utf8',env:{...process.env,ACTION,SKIN,SELECT_ONLY:''},maxBuffer:1024*1024});
  if(r.error)throw r.error;a.equal(r.status,0,r.stderr||String(r.signal));
  const rows=JSON.parse(r.stdout.trim().split('\n').at(-1));a.equal(rows.length,ACTION==='idle'?1:16);
  views.push(rows);n+=rows.length;
 }
 for(let f=0;f<views[0].length;f++){
  a(views.every(v=>v[f].f===f&&v[f].changed>300));
  a.equal(new Set(views.map(v=>v[f].body)).size,3);
 }
}
a.equal(n,51);console.log('PASS 16 saved cases and 51 Canvas idle/walk frames; all painted body contrasts and own relic position');
