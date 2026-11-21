// Native Canvas sessions are isolated per colour and equipped state.
const a=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const out=new Map();
for(const mode of ['bare','b9'])for(const skin of ['porcelain','ebony']){
 const r=spawnSync(process.execPath,['--expose-gc',path.join(__dirname,'rework-male-g25-north-punch-matte.cjs')],{encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,MODE:mode,SKIN:skin,SELECT_ONLY:''}});
 if(r.error)throw r.error;
 a.equal(r.status,0,r.stderr||String(r.signal));out.set(mode+skin,JSON.parse(r.stdout));
}
function contrasting(x,y){
 const q=new Map(y);
 return x.filter(([key,value])=>q.has(key)&&q.get(key)!==value).length;
}
let checks=0;
for(const mode of ['bare','b9']){
 const [a0,b0]=['porcelain','ebony'].map(s=>out.get(mode+s));
 a.equal(a0.length,8);a.equal(b0.length,8);
 for(let f=0;f<8;f++){
  const [x,y]=[a0[f],b0[f]];a.equal(x.f,f);a.equal(y.f,f);a.equal(x.alpha,y.alpha);
  if(mode==='b9'){a.equal(x.lower,y.lower);a(x.feet.concat(y.feet).every(v=>v.length===0));}
  else {a.notEqual(x.lower,y.lower);a(x.feet.every((v,i)=>contrasting(v,y.feet[i])>100));}
  a.equal(x.marks.length,y.marks.length);
  for(let i=0;i<x.marks.length;i++){const [p,q]=[x.marks[i],y.marks[i]];a.equal(p.right,q.right);a(contrasting(p.partial,q.partial)>0&&contrasting(p.open,q.open)>0);checks++;}
 }
}
for(const skin of ['porcelain','ebony'])for(let f=0;f<8;f++)a.deepEqual(out.get('bare'+skin)[f].marks,out.get('b9'+skin)[f].marks);
a.equal(checks,20);
console.log('PASS 16 distinct saved profiles; 32 Canvas checks; 20 paired mode×phase×hand mattes; hands exactly conserved with/without B9');
