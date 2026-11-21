'use strict';
const path=require('node:path'),{spawnSync}=require('node:child_process');
const proof=path.join(__dirname,'rework-female-east-coat67-neck.cjs');
for(const SKIN of ['ebony','porcelain'])for(let f=0;f<40;f+=10){
 const env={...process.env,SKIN,FROM:String(f),TO:String(f+10)};
 delete env.SELECT_ONLY;
 const result=spawnSync(process.execPath,['--expose-gc',proof],{env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error(SKIN,f,result.signal||result.status);process.exit(result.status||1);}
}
