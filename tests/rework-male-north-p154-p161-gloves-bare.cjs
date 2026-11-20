const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),A=require(p.join(R,'character-appearance.js'));
const api=make();
const I=id=>({def:id}),opts=action=>({action,direction:'north',consumer:'world'});
const player=(pants,glove,boot,skinColor)=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{coat:I(151),legs:I(pants),gloves:I(glove),...(boot?{boots:I(boot)}:{})}},{skinColor,hairColor:skinColor==='ebony'?'violet':'black',eyeColor:'blue'},()=>true)));
const layerBoot=l=>l.id.startsWith('boot155-'),sk=l=>l.id.startsWith('glove');
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{await api.ready;let count=0;
for(const [pants,gloves] of [[154,[26,131,166]],[161,[26]]])for(const action of ['idle','walk'])for(const glove of gloves){
 const o=opts(action),contrast=[];
 for(const skin of Object.keys(A.skins)){
  const a0=player(pants,glove,null,skin),save=JSON.stringify(a0),ids=[];
  for(const b of [null,155,null,155]){
   if(b)a0.equipment.boots=I(b);else delete a0.equipment.boots;
   const r=api.selectVisual(a0,o);a.equal(r?.slotRoutes?.gloves?.item,glove);a.equal(r?.slotRoutes?.boots?.item,b??undefined);ids.push(r.id);
  }
  delete a0.equipment.boots;a.equal(JSON.stringify(a0),save);a.equal(ids[0],ids[2]);a.equal(ids[1],ids[3]);
 }
 for(const [equipment,options] of [
  [{boots:I(9)},o],[{legs:I(147)},o],[{head:I(129)},o],[{gloves:I(999)},o],[{weapon:I(0)},o],[{}, {...o,direction:'south'}],[{}, {...o,action:'attack-unarmed'}]
 ]){const x=player(pants,glove,null,'ebony'); x.equipment={...x.equipment,...equipment};a(!/:p(?:154|161)-g\d+-owned:/.test(api.selectVisual(x,options)?.id||''));}

 for(const skin of ['porcelain','ebony']){
 const barefoot=player(pants,glove,null,skin),worn=player(pants,glove,155,skin),control=player(pants,152,null,skin),wornControl=player(pants,152,155,skin),gloveControl={...worn,equipment:{...worn.equipment,legs:I(133)}};
 const [B,W,C,CW,G]=[barefoot,worn,control,wornControl,gloveControl].map(x=>api.selectVisual(x,o));
 a(B?.slotRoutes?.gloves?.item===glove,'missing eligible saved bare route '+glove+'/'+action);a.equal(W.slotRoutes.boots.item,155);a.equal(B.slotRoutes.legs.item,pants);a.equal(W.slotRoutes.legs.item,pants);
 const d=x=>x.pack.directions.north;
 a.equal(B.equipment.boots,undefined);a(!B.slotRoutes.boots);a.deepEqual(d(B).layers,d(W).layers.filter(l=>!layerBoot(l)));
 const effect=d=>d.layers.filter(l=>!sk(l)).map(({source,frames,...r})=>({...r,frames:frames&&frames.length===d.clip.frames&&frames.every(Boolean)?frames:[source]}));a.deepEqual(effect(d(B)),effect(d(C)));a.deepEqual(effect(d(W)),effect(d(CW)));
 for(const k of ['paletteSourceMasks','colorAppearance','baseMaterialSources']){a.deepEqual(B[k],W[k]);a.deepEqual(B[k],C[k]);}
 for(const k of ['clip','rest','poses'])a.deepEqual(d(B)[k],d(W)[k]);
 a.deepEqual(d(B).layers.filter(sk),d(W).layers.filter(sk));a.deepEqual(d(B).layers.filter(sk),d(G).layers.filter(sk));
 for(const l of d(B).layers.filter(sk)){a(!B.paletteSourceMasks[l.source]);a(!B.baseMaterialSources[l.source]);}
 if(process.env.SELECT_ONLY)continue;
 const qs=await Promise.all([[barefoot,B],[worn,W],[wornControl,CW]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:v=>v})));
 const n=d(B).clip.frames, m=cv.createCanvas(512,512),ctx=m.getContext('2d'),per=[];
 const draw=(i,f)=>{let c;a(qs[i].draw({save(){},restore(){},drawImage(k){c=k;}},[barefoot,worn,wornControl][i],{...o,progress:(f+.2)/n}));return pix(c);};
 try{for(let i=0;i<n;i++){
  const x=draw(0,i),y=draw(1,i);ctx.clearRect(0,0,512,512);
  for(const l of d(W).layers.filter(layerBoot))ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[i]+'.png'),0,0);
  const z=pix(m),verify=draw(2,i);let change=0,toneFoot=0;
  for(let j=0;j<z.length;j+=4)if(z[j+3])a.equal(y.readUInt32LE(j),verify.readUInt32LE(j),'boot and sole differ against P154/G152');
  for(let j=0;j<z.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(z[j+3]>0);if(contrast[i]&&x.readUInt32LE(j)!==contrast[i].readUInt32LE(j))toneFoot++;change++;}
  a(change>1000);if(contrast[i])a(toneFoot>100,'no real skin color visible under removed boots');
  if(!contrast[i])per.push(x);
  a.deepEqual(draw(0,i),x);a.deepEqual(draw(1,i),y);
  count++;
 }contrast.push(...per);}finally{qs.forEach(q=>q.release());global.gc?.();}
 }
}
if(!process.env.SELECT_ONLY)a.equal(count,136);console.log('PASS 256 saved selection transitions and '+count+' verified pants/glove Canvas comparisons');
})().catch(e=>{console.error(e);process.exitCode=1});
