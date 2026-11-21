'use strict';
const a=require('node:assert/strict'), p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs');
const root=p.resolve(__dirname,'..'),api=make();
const load=require('../tools/rework-hd-test-loader.cjs').create(root),memo=new Map();
const index=require('../tools/rework-modular-outfits-hd/index.json');
const reg=global.MareReworkModularOutfitsHD.create(index,{allowCandidates:true});
const d='north',opt={direction:d,consumer:'world'};
const own=(l,i)=>l.id.startsWith('coat'+i+'-')||
 l.id.startsWith('sleeve-aperture-')||l.id.startsWith('cuff-emergence-')||l.id.startsWith('coat-front-')||l.id.startsWith('original-neck-coverage-');
const orig={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const p1=(coat,boot,appearance96=orig)=>({classId:'fighter',appearance96,equipment:{coat:{def:coat},legs:{def:133},...(boot?{boots:{def:boot}}:{})}});
function pix(c){return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);}
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const take=(b,player,o,i,frames)=>{let c;a(b.draw({save(){},restore(){},drawImage(x){c=x;}},player,{...o,progress:(i+.15)/frames}));return pix(c);};
async function layerImage(r,keep,frame){
 const row=r.pack.directions[d],layers=row.layers.filter(keep);
 const part={...r,pack:{...r.pack,directions:{[d]:{...row,layers}}},paletteRefs:undefined,paletteSourceMasks:undefined,
  sourceRefs:[...new Set(layers.flatMap(l=>l.frames||[l.source]))]};
 const uris=reg.requiredFiles(part,{frame});const images=new Map(await Promise.all(uris.map(async f=>{if(!memo.has(f))memo.set(f,load(f));return [f,await memo.get(f)];})));
 const c=cv.createCanvas(r.pack.frame.width*4,r.pack.frame.height*4),ctx=c.getContext('2d');
 reg.render(ctx,part,images,{frame,makeCanvas:cv.createCanvas});
 const result=pix(c);c.width=c.height=1;return result;
}
(async()=>{
 await api.ready;
 let selected=0,rendered=0,largestBootAffection=0;
 for(const action of ['idle','walk'])for(const boot of [null,9,148])for(const item of [6,7,130,137,144,158,165,172,179]){
  const o={...opt,action},base=p1(151,boot),withItem=p1(item,boot),safe=JSON.stringify(withItem);
  const r=api.selectVisual(base,o),q=api.selectVisual(withItem,o);
  if(action==='walk'&&![6,7,137,144].includes(item)){
   a(!q?.id.includes('slot-on:')&&!q?.id.includes('male-pants133-walk-north-isolated-r2:slots:'));
   continue;
  }
  a.equal(q?.slotRoutes?.coat?.item,item,JSON.stringify([action,boot,item,q?.id]));
  const rd=r.pack.directions[d],qd=q.pack.directions[d],strip=(all,i)=>all.filter(l=>!own(l,i));
  a.deepEqual(strip(rd.layers,151),strip(qd.layers,item));
  a.deepEqual(rd.clip,qd.clip);a.deepEqual(rd.poses,qd.poses);
  selected++;
  if(process.env.SELECT_ONLY||process.env.SMOKE&&item!==137)continue;
  const old=await prep(base,r,o),current=await prep(withItem,q,o);
  let lostMax=0,minVisible=Infinity;
  const b0=p1(151,null),b1=p1(item,null),p0=boot?await prep(b0,api.selectVisual(b0,o),o):null,p2=boot?await prep(b1,api.selectVisual(b1,o),o):null;
  try{
   for(let i=0;i<rd.clip.frames;i++){
    const x=take(old,base,o,i,rd.clip.frames),y=take(current,withItem,o,i,rd.clip.frames);
    const m=await layerImage(r,l=>own(l,151),i),n=await layerImage(q,l=>own(l,item),i);
    let diff=0,bootTouched=0;
    const boots=boot!=null?await layerImage(r,l=>l.id.startsWith('boot'+boot+'-'),i):null;
    for(let j=0;j<x.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){
     a(m[j+3]||n[j+3],`outside coat ${[item,boot,action,i,j]}`);diff++;
     if(boots?.[j+3])bootTouched++;
    }
    if(boot){
     const noBoot0=take(p0,b0,o,i,rd.clip.frames),noBoot1=take(p2,b1,o,i,rd.clip.frames);
     let lost=0,still=0;
     for(let j=0;j<boots.length;j+=4)if(boots[j+3]){
      const old=x.readUInt32LE(j)!==noBoot0.readUInt32LE(j),neo=y.readUInt32LE(j)!==noBoot1.readUInt32LE(j);
      if(old&&!neo)lost++;
      if(neo)still++;
     }
     lostMax=Math.max(lost,lostMax);minVisible=Math.min(still,minVisible);
    }
    largestBootAffection=Math.max(largestBootAffection,bootTouched);
    a(diff>2500);rendered++;
   }
  }finally{old.release();current.release();p0?.release();p2?.release();}
  if(boot){a.equal(lostMax,0,'new coat hides an originally visible boot pixel');a(minVisible>6000);}
  a.equal(JSON.stringify(withItem),safe);global.gc?.();
 }
 a.equal(selected,39);console.log({selected,rendered,largestBootAffection});
})().catch(e=>{console.error(e);process.exitCode=1});
