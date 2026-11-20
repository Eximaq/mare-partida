if(!process.env.GLOVE){
 for(const glove of [131,138,145,159,166,173,180]){
  const out=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,GLOVE:String(glove)}});
  if(out.error)throw out.error;
  if(out.status!==0)process.exit(out.status??1);
 }
 console.log('PASS 448 saved transitions and 238 Canvas with ordered glove proof');process.exit(0);
}
const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),A=require(p.join(R,'character-appearance.js'));
const api=make();
const I=id=>({def:id}),opts=action=>({action,direction:'north',consumer:'world'});
const player=(glove,boot,skinColor)=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{coat:I(151),legs:I(140),gloves:I(glove),...(boot?{boots:I(boot)}:{})}},{skinColor,hairColor:skinColor==='ebony'?'violet':'black',eyeColor:'blue'},()=>true)));
const layerBoot=l=>l.id.startsWith('boot155-'),sk=l=>l.id.startsWith('glove');
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const vendor=global.ReworkAccessoryVendor, compositor=vendor.compositor;
const mats=global.MareReworkModularOutfitsHD.create({schema:'rework-modular-outfits-hd-v1'},{vendor:{...vendor,compositor:{...compositor,render(ctx,pack,images,cfg){
 const d=pack.directions.north;
 a(!d.renderMirrorFrom&&!d.headgearPolicy);
 const ops=compositor.plan(pack,'north',cfg.frame);
 let found=0;
 for(const op of ops){
  const isGlove=sk(op);
  if(!isGlove&&!found)continue;
  if(isGlove)found++;
  ctx.globalCompositeOperation=isGlove?'source-over':'destination-out';
  const l=d.layers.find(l=>l.id===op.id);
  compositor.render(ctx,{...pack,directions:{north:{...d,layers:[l]}}},images,{...cfg,clear:false});
 }
 a.equal(found,2);
 ctx.globalCompositeOperation='source-over';
}}}});
async function gloveRaster(record){
 a(!record.headRecord&&!record.mirrorLayerIDs?.length);
 const images=new Map(await Promise.all(mats.requiredFiles(record).map(async f=>[f,await load(f)])));
 const c=cv.createCanvas(512,512),cx=c.getContext('2d');
 return {get(i){cx.clearRect(0,0,512,512);mats.render(cx,record,images,{frame:i,makeCanvas:cv.createCanvas});return pix(c);},release(){c.width=1;}};
}
(async()=>{await api.ready;let count=0;
for(const action of ['idle','walk'])for(const glove of [Number(process.env.GLOVE)]){
 const o=opts(action),contrast=[];
 for(const skin of Object.keys(A.skins)){
  const a0=player(glove,null,skin),save=JSON.stringify(a0),ids=[];
  for(const b of [null,155,null,155]){
   if(b)a0.equipment.boots=I(b);else delete a0.equipment.boots;
   const r=api.selectVisual(a0,o);a.equal(r?.slotRoutes?.gloves?.item,glove);a.equal(r?.slotRoutes?.boots?.item,b??undefined);ids.push(r.id);
  }
  delete a0.equipment.boots;a.equal(JSON.stringify(a0),save);a.equal(ids[0],ids[2]);a.equal(ids[1],ids[3]);
 }
 for(const [equipment,options] of [
  [{boots:I(9)},o],[{legs:I(182)},o],[{head:I(129)},o],[{gloves:{def:25,variant:"other"}},o],[{gloves:I(999)},o],[{weapon:I(0)},o],[{}, {...o,direction:'south'}],[{}, {...o,action:'attack-unarmed'}]
 ]){const x=player(glove,null,'ebony'); x.equipment={...x.equipment,...equipment};a(!new RegExp(':p'+140+'-g[0-9]+-owned:').test(api.selectVisual(x,options)?.id||''));}

 for(const skin of ['porcelain','ebony']){
 const barefoot=player(glove,null,skin),worn=player(glove,155,skin),control=player(152,null,skin),wornControl=player(152,155,skin),gloveControl={...worn,equipment:{...worn.equipment,legs:I(133)}};
 const [B,W,C,CW,G]=[barefoot,worn,control,wornControl,gloveControl].map(x=>api.selectVisual(x,o));
 a(B?.slotRoutes?.gloves?.item===glove,'missing eligible saved bare route '+glove+'/'+action);a.equal(W.slotRoutes.boots.item,155);
 const d=x=>x.pack.directions.north;
 a.equal(B.equipment.torso,151);a.equal(B.equipment.pants,140);
 a.deepEqual(d(B).layers.filter(sk).map(l=>[l.id,l.depth,l.binding]),['LEFT','RIGHT'].map(side=>['glove'+glove+'-north-'+side.toLowerCase(),99.5,{kind:'bone',a:side+' ELBOW',b:side+' ARM'}]));
 a.deepEqual(d(B).layers.filter(l=>l.id.startsWith('pants'+140+'-')),d(C).layers.filter(l=>l.id.startsWith('pants'+140+'-')));
 a(d(B).layers.some(l=>l.id.startsWith('pants'+140+'-')));a(!d(B).layers.some(l=>l.id.startsWith('pants133-')));
 a.equal(B.colorAppearance.skin,skin);
 
 a.equal(B.equipment.boots,undefined);a(!B.slotRoutes.boots);a.deepEqual(d(B).layers,d(W).layers.filter(l=>!layerBoot(l)));
 const effect=d=>d.layers.filter(l=>!sk(l)).map(({source,frames,...r})=>({...r,frames:frames&&frames.length===d.clip.frames&&frames.every(Boolean)?frames:[source]}));a.deepEqual(effect(d(B)),effect(d(C)));a.deepEqual(effect(d(W)),effect(d(CW)));
 for(const k of ['paletteSourceMasks','colorAppearance','baseMaterialSources']){a.deepEqual(B[k],W[k]);a.deepEqual(B[k],C[k]);}
 for(const k of ['clip','rest','poses'])a.deepEqual(d(B)[k],d(W)[k]);
 a.deepEqual(d(B).layers.filter(sk),d(W).layers.filter(sk));a.deepEqual(d(B).layers.filter(sk),d(G).layers.filter(sk));
 for(const l of d(B).layers.filter(sk)){a(!B.paletteSourceMasks[l.source]);a(!B.baseMaterialSources[l.source]);}
 const noBootDonor=api.selectVisual({...gloveControl,equipment:{...gloveControl.equipment,boots:undefined}},o);
 a.equal(noBootDonor?.slotRoutes.gloves.item,glove);
 const describe=(x,y)=>{let count=0,alpha=0,opaque=0,max=0,pex=null;for(let j=0;j<x.length;j+=4){if(x.readUInt32LE(j)===y.readUInt32LE(j))continue;count++;const d=Math.abs(x[j+3]-y[j+3]);if(d){alpha++;if(x[j+3]===255||y[j+3]===255)opaque++;max=Math.max(max,d);}pex||=[(j/4)%512,Math.floor(j/(4*512)),Array.from(x.subarray(j,j+4)),Array.from(y.subarray(j,j+4))];}return JSON.stringify({count,alpha,opaque,max,pex})};
 const [matB,matW,matD,matDW]=await Promise.all([B,W,noBootDonor,G].map(gloveRaster));
 const qs=await Promise.all([[barefoot,B],[worn,W],[wornControl,CW]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:v=>v})));
 const n=d(B).clip.frames, m=cv.createCanvas(512,512),ctx=m.getContext('2d'),per=[];
 const draw=(i,f)=>{let c;a(qs[i].draw({save(){},restore(){},drawImage(k){c=k;}},[barefoot,worn,wornControl][i],{...o,progress:(f+.2)/n}));return pix(c);};
 try{for(let i=0;i<n;i++){
  const vb=matB.get(i),vw=matW.get(i);
  const refB=matD.get(i),refW=matDW.get(i); a(vb.equals(refB),'glove RGBA differs against same-P133 glove after ordered occlusion: bare '+[glove,action,skin,i]+' '+describe(vb,refB));
  a(vw.equals(refW),'glove RGBA differs against same-P133 glove after ordered occlusion: B155 '+[glove,action,skin,i]+' '+describe(vw,refW));
  a(vb.equals(vw),'B155 changes visible glove RGBA');
  a(vb.some((value,i)=>i%4===3&&value===255),'no opaque glove paint is visible');
  const x=draw(0,i),y=draw(1,i);ctx.clearRect(0,0,512,512);
  for(const l of d(W).layers.filter(layerBoot))ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[i]+'.png'),0,0);
  const z=pix(m),verify=draw(2,i);let change=0,toneFoot=0;
  for(let j=0;j<z.length;j+=4)if(z[j+3])a.equal(y.readUInt32LE(j),verify.readUInt32LE(j),'boot and sole differ against target G152');
  for(let j=0;j<z.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(z[j+3]>0);if(contrast[i]&&x.readUInt32LE(j)!==contrast[i].readUInt32LE(j))toneFoot++;change++;}
  a(change>1000);if(contrast[i])a(toneFoot>100,'no real skin color visible under removed boots');
  if(!contrast[i])per.push(x);
  a.deepEqual(draw(0,i),x);a.deepEqual(draw(1,i),y);
  count++;
 }contrast.push(...per);}finally{qs.forEach(q=>q.release());[matB,matW,matD,matDW].forEach(m=>m.release());global.gc?.();}
 }
}
a.equal(count,34);console.log('PASS 64 save transitions, 34 Canvas',140,process.env.GLOVE);
})().catch(e=>{console.error(e);process.exitCode=1});
