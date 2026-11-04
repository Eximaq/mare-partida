'use strict';
// Offline registration of already generated PixelLab sheets. No API calls or
// credits are consumed by rerunning this importer.
const fs=require('node:fs/promises'),path=require('node:path');
const {register,palette}=require('./equipment56_materials.cjs');
async function main(){
 const root=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]),sharp=require(path.resolve(process.argv[3])),set=Number(process.argv[4]||0);
 const map=JSON.parse(await fs.readFile(path.join(input,'mapa_56_itens.json'))),rig=JSON.parse(await fs.readFile(path.join(root,'tools/paper-doll-96-v3/appearance-rig.json'))),catalogPath=path.join(root,'tools/paper-doll-96-v3/appearance-catalog.json'),catalog=JSON.parse(await fs.readFile(catalogPath));
 const rows=map.slice(set*7,set*7+7),bodies=['masculino','feminino'],dirs=['south','north','east'],kind={head:'head',coat:'torso',gloves:'gloves',legs:'pants',boots:'boots'};
 const png=async(data,file)=>sharp(Buffer.from(data),{raw:{width:128,height:128,channels:4}}).png().toFile(path.join(root,'tools/paper-doll-96-v3',file));
 await fs.mkdir(path.join(root,'assets/ui/items-hd'),{recursive:true});
 for(let n=0;n<7;n++){
  const row=rows[n],sheet=n<4?`icons-${rows[0].id}-${rows[3].id}.png`:`icons-${rows[4].id}-${rows[6].id}.png`,cell=n<4?n:n-4;
  await sharp(path.join(input,sheet)).extract({left:cell%2*128,top:Math.floor(cell/2)*128,width:128,height:128}).png().toFile(path.join(root,`assets/ui/items-hd/equipment-${row.id}.png`));
  if(!row.visivel)continue;
  const style={id:'item-'+row.id,itemId:row.id,kind:kind[row.slotJogo],name:row.nome,reviewed:false,equipmentSlot:row.slotJogo,nativeFit:'registered-panels-v1',layers:{},parts:{},sourceReference:row.arquivo};
  if(style.kind==='head')style.hairOcclusion='all';
  if(style.kind==='gloves')style.fingerCoverage='full';
  let colours=[];
  for(let b=0;b<2;b++){
   const body=bodies[b];style.layers[body]={};style.parts[body]={};
   for(let d=0;d<3;d++){
    const dir=dirs[d],sheet=await sharp(path.join(input,`wearable-${row.id}.png`)).extract({left:d*96,top:b*128,width:96,height:128}).extend({left:16,right:16,top:0,bottom:0,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer(),guide=await sharp(path.join(input,`base-${body}-${dir}.png`)).ensureAlpha().raw().toBuffer();
    const material=register(new Uint8ClampedArray(sheet),rig.rests[body][dir],style.kind,new Uint8ClampedArray(guide),{matte:row.id===130?'white':'skin',rearTiara:row.id===164&&dir==='north',longTorso:/Manto|Vestes/.test(row.nome),headType:row.id===136?'hood':[157,164,178].includes(row.id)?'diadem':'hat'});
    // One source-cell registration: the generated Corsair rear female hat was
    // six native pixels below her crown. All frames share this same binding.
    if(row.id===129&&body==='feminino'&&dir==='north'){const shifted=new Uint8ClampedArray(material.full.length);shifted.set(material.full.subarray(6*128*4));material.full=shifted;}
    if(!colours.length)colours=palette(material.full);
    const file=`assets/custom-item-${row.id}-${body}-${dir}.png`;await png(material.full,file);style.layers[body][dir]=file;style.parts[body][dir]={};
    for(const [part,data]of Object.entries(material.parts||{})){const pf=file.replace('.png','-'+part.toLowerCase()+'.png');await png(data,pf);style.parts[body][dir][part]=pf;}
    if(dir==='east'){
     const wf=file.replace('-east.','-west.');await sharp(Buffer.from(material.full),{raw:{width:128,height:128,channels:4}}).flop().png().toFile(path.join(root,'tools/paper-doll-96-v3',wf));style.layers[body].west=wf;style.parts[body].west={};
     for(const [part,data]of Object.entries(material.parts||{})){const pf=wf.replace('.png','-'+part.toLowerCase()+'.png');await sharp(Buffer.from(data),{raw:{width:128,height:128,channels:4}}).flop().png().toFile(path.join(root,'tools/paper-doll-96-v3',pf));style.parts[body].west[part]=pf;}
    }
   }
  }
  style.materialPalette=colours;
  if(['pants','gloves','boots'].includes(style.kind)){
   const sorted=colours.slice().sort((a,b)=>a.reduce((x,v)=>x+v,0)-b.reduce((x,v)=>x+v,0));
   style.nativeMaterial={preserveTexture:true,ramp:[0,.25,.5,.75,1].map(f=>sorted[Math.round(f*(sorted.length-1))]),fingerCoverage:'full',cuffStart:style.kind==='boots'?.2:.55};
   if(style.kind==='boots'&&[1,5].includes(set))style.nativeMaterial.openToes=true;
  }
  const old=catalog.styles.findIndex(s=>s.id===style.id);if(old>=0)catalog.styles[old]=style;else catalog.styles.push(style);
 }
 await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
 console.log(JSON.stringify({set:rows[0].conjunto,icons:7,visible:5,bodies:2}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
