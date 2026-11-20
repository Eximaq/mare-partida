'use strict';
const a=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const proof=path.join(__dirname,'rework-female-side-coat67-palettes.cjs'),data=new Map();
const sides=['east','west'],tones=['ebony','porcelain'],pairs=[['blonde','amber'],['silver','violet']];
for(const [HAIR,EYES] of pairs)for(const SIDE of sides)for(const SKIN of tones)for(let f=0;f<40;f+=10){
 const env={...process.env,HAIR,EYES,SIDE,SKIN,FROM:String(f),TO:String(f+10)};
 delete env.SELECT_ONLY;
 const x=spawnSync(process.execPath,['--expose-gc',proof],{env,encoding:'utf8',maxBuffer:2**21});
 if(x.error)throw x.error;
 if(x.status!==0){process.stderr.write(x.stderr||x.stdout||String(x.signal));process.exit(x.status||1);}
 for(const line of x.stdout.trim().split('\n')){
  const [,phase,j]=line.match(/^(?:ebony|porcelain) (\d+) (\{.*\})$/)||[];
  if(!j)continue;
  const datum=JSON.parse(j);a(datum.paletteOnly);
  const key=[HAIR,SIDE,SKIN,phase].join('/');
  a(!data.has(key));data.set(key,datum);
 }
 console.log(HAIR,EYES,SIDE,SKIN,f,'EXIT=0');
}
a.equal(data.size,320);
for(const side of sides)for(const tone of tones)for(let phase=0;phase<40;phase++){
 const [x,y]=pairs.map(([h])=>data.get([h,side,tone,phase].join('/')).paletteOnly);
 for(const k of ['A','B','bare']){
  a.equal(x[k].protected,y[k].protected,'visible body/chest/neck changed outside own iris/hair');
  a.equal(x[k].alpha,y[k].alpha,'alpha changed with hair/eye colors');
  a.notEqual(x[k].pigments,y[k].pigments,'missing authored pigment transition');
 }
}
console.log('320 rail/tone/palette phase results, 480 paired A/B/bare comparisons, change only in own hair/iris');
