'use strict';
// Release native Canvas allocations between trousers.
if(!process.env.ITEMS){
 const {spawnSync}=require('node:child_process');
 for(const item of [140,147,154,161,175]){
  const q=spawnSync(process.execPath,['--expose-gc',__filename],{env:{...process.env,ITEMS:String(item)},stdio:'inherit'});
  if(q.error)throw q.error;
  if(q.status!==0){console.error('trousers '+item+' '+(q.signal||q.status));process.exit(q.status??1);}
 }
 console.log('PASS',170);process.exit(0);
}
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),
 R=process.env.KAIZOKU_REPO||p.dirname(__dirname);
const {cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const objects=require(p.join(R,'tools/rework-modular-outfits-hd/index.json'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=require(process.env.KAIZOKU_SELECTOR||p.join(R,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});
const pieces=(process.env.ITEMS?.split(',').map(Number)||[140,147,154,161,175]),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const profiles=[{...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'blue'},{...raw,skinColor:'porcelain',hairColor:'pink'}];
const player=(appearance96,pants=168)=>({classId:'fighter',appearance96,equipment:{coat:{def:151},legs:{def:pants},boots:{def:155},gloves:{def:152}}});
const select=(r,keep,suffix)=>{
 const d=r.pack.directions.north;
 return {...r,id:r.id+':'+suffix,pack:{...r.pack,directions:{north:{...d,layers:d.layers.filter(keep)}}}};
};
const pixels=(q,p,opt,i,n)=>{
 let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...opt,progress:(i+.25)/n}));
 return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
};
(async()=>{
 await api.ready;let count=0;
 for(const item of pieces)for(const action of ['idle','walk'])for(const look of profiles){
  const opt={action,direction:'north',consumer:'world'},before=player(raw,item),after=player(look,item),save=JSON.stringify(after);
  const x=api.selectVisual(before,opt),y=api.selectVisual(after,opt);
  a(y?.id.endsWith(':verified-north'),y?.id);
  const declared=objects.records.find(r=>r.id===`frozen-male-pants${item}-north-${action}-v47`);
  a.deepEqual(x.pack,declared.pack);a.deepEqual(x.pack,y.pack);a.deepEqual(x.equipment,y.equipment);a.deepEqual(y.omitted,[]);
  a.equal(y.slotRoutes.gloves.item,152);a.equal(y.slotRoutes.legs.item,item);a.equal(y.slotRoutes.boots.item,155);
  a.equal(y.colorAppearance.skin,look.skinColor);a.equal(y.colorAppearance.hairColor,look.hairColor);a.equal(y.colorAppearance.eyeColor,look.eyeColor);
  for(const bad of [player({...look,hairStyle:'hair-cropped'},item),player({...look,eyeStyle:'face-calm'},item),player({...look,eyeColor:'amber'},item),player(look,133)]){
   a(!api.selectVisual(bad,opt)?.id.endsWith(':verified-north'));
  }
  const n=y.pack.directions.north.clip.frames;
  a.equal(n,action==='idle'?1:16);a.equal(Object.keys(y.paletteSourceMasks).length,7);
  const owns=new Set([...Object.keys(y.paletteSourceMasks),...Object.keys(y.baseMaterialSources)]);
  const isOwned=l=>(l.frames||[l.source]).some(h=>owns.has(h));
  const equipment=l=>!isOwned(l);
  const boot=l=>l.id.startsWith('boot155-'),pants=l=>l.id.startsWith('pants'+item+'-');
  const bare={...before,equipment:{...before.equipment}};delete bare.equipment.boots;
  const bd=api.selectVisual(bare,opt);
  a.deepEqual(bd.pack.directions.north.layers,x.pack.directions.north.layers.filter(l=>!boot(l)));
  a.deepEqual(y.pack.directions.north.layers.filter(boot).map(l=>l.depth).sort((a,b)=>a-b),[-1,-1,99,99]);
  a(y.pack.directions.north.layers.filter(l=>l.id.startsWith('pants'+item+'-')).every(equipment));
  const group=await Promise.all([[before,x],[after,y],[before,select(x,isOwned,'ownership')],[before,select(x,equipment,'equipment')],[after,select(y,equipment,'equipment')],[before,select(x,boot,'boot-alpha')],[before,bd],[before,select(x,pants,'pant-alpha')]].map(([p,source])=>api.prepareConfiguration([{player:p,source,options:opt}],{resolve:q=>q})));
  try{
   for(let i=0;i<n;i++){
    const [b,c,domain,bGear,cGear,bootMask,bareRaster,pantMask]=group.map((q,j)=>pixels(q,j===1||j===4?after:before,opt,i,n));
    a(bGear.equals(cGear),'gear changed with recolor');
    let delta=0,hem=0,showingSole=0;for(let j=0;j<b.length;j+=4){
     if(b.readUInt32LE(j)!==bareRaster.readUInt32LE(j)){a(bootMask[j+3],'boot diff outside authored source');if(pantMask[j+3])hem++;if(j>=430*512*4)showingSole++;}
     a.equal(b[j+3],c[j+3]);if(b.readUInt32LE(j)===c.readUInt32LE(j))continue;
     a(domain[j+3],String(j));delta++;
    }
    a(delta>1000);a(hem>0&&showingSole>0,'no proven hem/sole '+[item,action,i]);count++;
   }
  } finally {for(const q of group)q.release();}
  a.equal(JSON.stringify(after),save);global.gc?.();console.log(item,action,look.skinColor,n);
 }
 a.equal(count,34*pieces.length);console.log('PASS',count);
})().catch(e=>{console.error(e);process.exitCode=1;});
