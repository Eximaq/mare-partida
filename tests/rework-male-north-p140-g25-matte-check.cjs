// Use a separate Canvas process for each combination to bound native memory.
const a=require('node:assert/strict'),p=require('node:path'),{spawnSync}=require('node:child_process');
let comparisons=0;
for(const [action,frames] of [['idle',1],['walk',16]]) for(const hand of ['Left','Right']){
 const [porcelain,ebony]=['porcelain','ebony'].map(skin=>{
  const r=spawnSync(process.execPath,['--expose-gc',p.join(__dirname,'rework-male-north-p140-g25-matte.cjs')],{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,ACTION:action,HAND:hand,SKIN:skin}});
  if(r.error)throw r.error;
  a.equal(r.status,0,r.stderr||String(r.signal));
  return JSON.parse(r.stdout);
 });
 a.equal(porcelain.length,frames);a.equal(ebony.length,frames);
 for(let f=0;f<frames;f++){
  const [x,y]=[porcelain[f],ebony[f]];
  a.deepEqual([x.action,x.hand,x.f],[action,hand,f]);
  a.deepEqual([x.action,x.hand,x.f,x.alpha],[y.action,y.hand,y.f,y.alpha]);
  const yd=new Map(y.delta);
  a(x.delta.filter(([i,value])=>yd.has(i)&&yd.get(i)!==value).length>100);
  a(x.soft>0&&y.soft>0);comparisons++;
 }
}
a.equal(comparisons,34);
console.log('PASS 34 own hand-matte phase comparisons incl. partial glove edges across contrasting Save tones');
