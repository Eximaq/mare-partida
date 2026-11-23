'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
const Module=require('node:module');
if(process.env.COMPOSE_TRIAL){
 for(const filename of ['player-rework-female-equipment-hd.js','player-rework-native-hd.js','player-rework-sword0-checkpoint.js']){
  const f=base+'/'+filename,m=new Module(f);m.filename=f;m.paths=Module._nodeModulePaths(base);
  m._compile(fs.readFileSync(process.env.COMPOSE_TRIAL+'/'+filename,'utf8'),f);m.loaded=true;require.cache[f]=m;
 }
}
require(base+'/player-rework-sword0-checkpoint.js');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance');
const loader=require(base+'/tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
const R=f=>require(path.join(base,f)),skin=global.MareFemaleNamedHairHD.create(R('tools/rework-accessories/head-layer-index.json'),R('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(R('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:R('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:skin});
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function capture(rec,f){
 const imgs=new Map(),c=cv.createCanvas(1,1),size=640+2*(rec.paddingPhysical||0),gear=cv.createCanvas(size,size),g=gear.getContext('2d');
 for(const file of reg.requiredFiles(rec,{frame:f}))imgs.set(file,await (file.startsWith(prefix)?cv.loadImage(path.join(release,file)):loader(file)));
 reg.render(c.getContext('2d'),rec,imgs,{frame:f,captureOps:({op,canvas})=>{
  g.globalCompositeOperation=op.part?'source-over':'destination-out';g.drawImage(canvas,0,0);canvas.width=1;
 }});
 const res={c:pixels(c),w:pixels(gear)};c.width=gear.width=1;return res;
}
// The pre-existing authored trouser silhouette differs from the shorts
// silhouette. Lost outer contour is intentional; don't permit interior holes.
function outsideAlpha(data,width,height){
 const size=width*height,marked=new Uint8Array(size),queue=new Int32Array(size);let n=0;
 const add=i=>{if(!marked[i]&&!data[i*4+3]){marked[i]=1;queue[n++]=i;}};
 for(let x=0;x<width;x++){add(x);add(size-width+x);}
 for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
 for(let head=0;head<n;head++){
  const i=queue[head],x=i%width;
  if(x>0)add(i-1);if(x+1<width)add(i+1);if(i>=width)add(i-width);if(i<size-width)add(i+width);
 }
 return marked;
}
(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint ready');
 const dirs=['east','west'],stock=[0,1,67,68,69,70],skinColors=Object.keys(global.MareAppearance96.skins);
 let selector=0,frames=0,corrections=0,world=0,natural=0;
 for(const direction of dirs)for(const [wi,def] of stock.entries())for(const skinColor of skinColors){
  const appearance96=A.normalize({gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor});
  const outfit=p=>({classId:'sword',appearance96,equipment:{weapon:{def},legs:p?{def:22}:null}}),
   equipped=outfit(true),absent=outfit(false),o={action:'attack-sword',consumer:'world',direction};
  const base=api.selectVisual(absent,o),fix=api.selectVisual(equipped,o),before=JSON.stringify(equipped);
  a.equal(fix?.slotRoutes?.legs?.item,22,JSON.stringify([direction,def,skinColor]));
  a.equal(fix.slotRoutes.weapon.item,def);a.deepEqual(fix.states,base.states);
  a.deepEqual(fix.colorAppearance,base.colorAppearance);a.deepEqual(fix.material,base.material);a.deepEqual(fix.omitted,[]);
  a.equal(JSON.stringify(equipped),before);a.equal(api.selectVisual(absent,o).id,base.id);selector++;
  if(skinColor!==(wi%2?'ebony':'light'))continue;
  const pad=base.paddingPhysical||0,size=640+2*pad;
  for(let f=0;f<8;f++){
   const x=await capture(base,f),y=await capture({...fix,checkpointPantsApertures:undefined},f),z=await capture(fix,f);
   a(x.w.equals(z.w));a(y.w.equals(z.w));
   const expected=fix.checkpointPantsApertures.points[f],holes=new Set(expected.map(([xx,yy])=>(xx+pad)+(yy+pad)*size)),outer=outsideAlpha(y.c,size,size);
   for(let i=0;i<outer.length;i++){
    const j=4*i,old=x.c.readUInt32LE(j),raw=y.c.readUInt32LE(j),fixed=z.c.readUInt32LE(j);
    if(!holes.has(i))a(fixed===raw,'unowned pixel changed');
    if(old&&raw!==fixed){
     a(holes.has(i)&&!outer[i],'source contour changed');a.equal(fixed,old);
     if(y.c[j+3]){
      a(y.c[j+3]<255);a.equal(y.c[j+3],y.w[j+3]);natural++;
     }else a(x.c[j]<40&&x.c[j+1]<40&&x.c[j+2]<55,'donor RGB did not belong to dark shorts');
     corrections++;
    }
   }
   if(def===0&&holes.size){
    const noWeapon=x=>({...x,states:x.states.map(s=>({...s,parts:[]}))});
    const bareBody=await capture(noWeapon(base),f),rawBody=await capture(noWeapon({...fix,checkpointPantsApertures:undefined}),f),
     top=outsideAlpha(rawBody.c,size,size);
    for(const q of holes){
     const j=4*q;a(!rawBody.c[j+3]&&!top[q]&&bareBody.c[j+3]===255,'not an enclosed body-only aperture');
     a(bareBody.c[j]<40&&bareBody.c[j+1]<40&&bareBody.c[j+2]<55,'not pants cloth');
    }
   }
   const outside=outsideAlpha(z.c,size,size);
   for(let i=0;i<outside.length;i++)a(!x.c[4*i+3]||z.c[4*i+3]||outside[i],'remaining interior aperture');
   if(f===2&&[0,70].includes(def)){
    const b=await api.prepareConfiguration([{player:equipped,options:o}]);
    try{
     let c;a(b.draw({save(){},restore(){},drawImage(t){c=t}},equipped,{...o,progress:(f+.25)/8}));
     a(pixels(c).equals(z.c));world++;
    }finally{b.release();}
   }
   frames++;global.gc?.();
  }
 }
 a.deepEqual([selector,frames,corrections,world,natural],[96,96,36,4,1]);
 console.log('PASS',selector,'exact saved selectors;',frames,'all side native phases,',corrections,'pants-only pinholes repaired,',world,'prepared World draws');
})().catch(e=>{console.error(e);process.exitCode=1});
