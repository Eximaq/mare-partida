const a=require('node:assert/strict'),p=require('node:path'),{spawnSync}=require('node:child_process');
const [light,dark]=['porcelain','ebony'].map(SKIN=>{
 const r=spawnSync(process.execPath,['--expose-gc',p.join(__dirname,'rework-male-north-p22-g25-no-coat-matte.cjs')],{encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,SKIN,SELECT_ONLY:''}});
 if(r.error)throw r.error;
 a.equal(r.status,0,r.stderr||String(r.signal));return JSON.parse(r.stdout);
});
function contrasting(x,y){const m=new Map(y);return x.filter(([k,v])=>m.has(k)&&m.get(k)!==v).length;}
a.equal(light.length,8);a.equal(dark.length,8);let pairs=0;
for(let f=0;f<8;f++){
 const [x,y]=[light[f],dark[f]];
 a.equal(x.f,f);a.equal(y.f,f);
 for(const k of ['alpha0','alpha1','outerGlove'])a.equal(x[k],y[k]);
 a.notEqual(x.lower,y.lower);a(x.feet.every((v,i)=>contrasting(v,y.feet[i])>100));
 a.equal(x.marks.length,y.marks.length);
 for(let i=0;i<x.marks.length;i++){
  const [u,v]=[x.marks[i],y.marks[i]];a.equal(u.right,v.right);
  for(const key of ['partial','open','sharedPartial','sharedOpen'])a(contrasting(u[key],v[key])>0);
  pairs++;
 }
}
a.equal(pairs,10);console.log('PASS 8 saves, 16 Canvas, 10 own hand/phase proofs with and without C151; P22/G25 retained independently');
