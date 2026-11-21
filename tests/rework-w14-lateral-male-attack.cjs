const p=require('path'),A=require('assert/strict'),R=p.resolve(__dirname,'..'),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),S=require(R+'/character-appearance'),a=make(),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R);
(async()=>{await a.ready;let n=0;const W='tools/rework-weapon-layers-hd/',snapshot=x=>Buffer.from(x.getContext('2d').getImageData(0,0,640,640).data),decode=async url=>{const canvas=cv.createCanvas(640,640);canvas.getContext('2d').drawImage(await load(W+url),0,0);return snapshot(canvas);};let history,arms;

 for(const c of process.env.QUICK?['ebony']:Object.keys(S.skins)){const q=JSON.parse(JSON.stringify(S.commit({classId:'cyborg',equipment:{weapon:{def:14}}},{gender:'masculino',skinColor:c},()=>true))), b=JSON.stringify(q),o=['east','west'].map(direction=>({direction,action:'attack-unarmed',consumer:'world'}));
  for(const e of o){const s=a.selectVisual(q,e);A(s?.w14LateralTone===c);A.equal(a.selectVisual(q,{...e,action:'attack'})?.id,s.id);}
  if(!history){
    const e=a.selectVisual(q,o[0]);history=await Promise.all(e.states.map(s=>decode(s.approved.url)));arms=await Promise.all(e.states.map(s=>decode(s.layers[1].url)));
   }
   for(const x of [{...q,classId:'brawler'},{...q,equipment:{weapon:{def:14},coat:{def:151}}},{...q,equipment:{weapon:{def:14,variant:'other'}}},{...q,zoanTransformed:true}])A(!a.selectVisual(x,o[0])?.w14LateralTone);
   for(const change of [{consumer:'portrait'},{direction:'north'},{action:'walk'},{weaponless:true},{action:'attack-tech'}])A(!a.selectVisual(q,{...o[0],...change})?.w14LateralTone);
   const bank=await a.prepareConfiguration(o.map(options=>({player:q,options})));
  try{for(let f=0;f<8;f++){const rs=o.map(e=>{let q0;A(bank.draw({save(){},restore(){},drawImage(c){q0=Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);}},q,{...e,progress:(f+.25)/8}));return q0;});
   let changed=0,metal=0,aD=0;for(let j=0;j<rs[0].length;j+=4){
      if(rs[0][j+3]!==history[f][j+3])aD++;if(arms[f][j+3]===255){A.equal(rs[0].readUInt32LE(j),arms[f].readUInt32LE(j),'metal');metal++;}
      if(rs[0].readUInt32LE(j)!==history[f].readUInt32LE(j))changed++;
    }
    A(changed>5000&&metal>0);A.equal(aD,0,'shape alpha '+c+'/'+f);
    for(let y=0;y<640;y++)for(let x=0;x<640;x++)A.equal(rs[0].readUInt32LE((y*640+x)*4),rs[1].readUInt32LE((y*640+639-x)*4));n+=2;}}
  finally{bank.release();}
  A.equal(JSON.stringify(q),b);
 }
 console.log('PASS',n,'actual normal saved male W14 World frames, exact E/W mirror');
})().catch(e=>{console.error(e);process.exitCode=1});
