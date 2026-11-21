const p=require('node:path'),a=require('node:assert/strict'),root=p.resolve(__dirname,'..'),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
const api=make(),load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root),o={action:'walk',direction:'north',consumer:'world'};
const db=require(p.join(root,'tools/rework-modular-outfits-hd/index.json')),rig=require(p.join(root,'tools/rework-female-north-rig/index.json'));
const prefix='tools/rework-modular-outfits-hd/assets/',memo=new Map(),speed={frames:40,fps:40,loop:true};
const newC=()=>cv.createCanvas(512,512),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
const css=(options,frame,player,bd)=>{let canvas;a(bd.draw({save(){},restore(){},drawImage(x){canvas=x;}},player,{...options,progress:(frame+.1)/40}));return canvas;};
function img(l,frame){const h=l.frames[frame];if(!memo.has(h))memo.set(h,load(prefix+h+'.png'));return memo.get(h);}
async function bundle(p){return await api.prepareConfiguration([{player:p,options:o,source:api.selectVisual(p,o)}],{resolve:x=>x});}
(async()=>{await api.ready;let ticks=0;
const cases={8:[168,182],9:[168,182],141:[168,182],148:[168],176:[168,182],183:[168,182]};
for(const [key,items] of Object.entries(cases)){const id=Number(key);
const profiles=[{}, {skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}], bootRow=db.records.find(r=>r.id===`frozen-v47-female-151-boot${id}-north-walk`);
const bootLayers=bootRow.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+id+'-'));
for(const fields of profiles){
const look=global.MareCharacterAppearance.normalize({gender:'feminino',...fields}), actor=e=>({classId:'brawler',appearance96:look,equipment:Object.fromEntries(Object.entries(e).map(([slot,def])=>[slot,{def}]))});
const bare=actor({}), boot=actor({boots:id}), bb=await bundle(bare), wb=await bundle(boot);
for(const pants of items){
 const p=actor({legs:pants}),p9=actor({legs:pants,boots:id}),save=JSON.stringify(p9),pb=await bundle(p),both=await bundle(p9),r=api.selectVisual(p9,o);
 a.deepEqual(r.pack.directions.north.clip,speed);a.deepEqual(r.northLayers.spec.frameToPhase,rig.frameToPhase);
 a.deepEqual(r.northLayers.lower.gear,bootLayers);a.deepEqual(r.omitted,[]);a.equal(r.slotRoutes.legs.item,pants);a.equal(r.slotRoutes.boots.item,id);
 const sources=db.independentPants.records.find(x=>x.equipment.pants===pants&&x.direction==='north').pack.directions.north.layers;
 const cloth=sources.find(l=>l.slot==='pants'),owner=sources.find(l=>/owner/i.test(l.id));
 for(let j=0;j<40;j++){
  const raws=await Promise.all(bootLayers.map(l=>img(l,j))), pc=newC(),pt=pc.getContext('2d');pt.drawImage(await img(owner,j),0,0);
  const m=pixels(pc);pt.clearRect(0,0,512,512);pt.drawImage(await img(cloth,j),0,0);
  const cn=pt.getImageData(0,0,512,512);for(let i=0;i<m.length;i+=4)if(m[i+3]){a.equal(m[i+3],255);cn.data.fill(0,i,i+4);}pt.putImageData(cn,0,0);
  const dc=newC(),dt=dc.getContext('2d');for(const b of raws)dt.drawImage(b,0,0);const domain=pixels(dc);let bottom=0;
  for(let i=0;i<domain.length;i+=4)if(domain[i+3])bottom=Math.floor(i/2048);
  const nc=css(o,j,bare,bb), all=newC(),ac=all.getContext('2d');
  for(const [k,l]of bootLayers.entries())if(l.depth===-1)ac.drawImage(raws[k],0,0);
  ac.drawImage(nc,0,0);ac.drawImage(pc,0,0);
  for(const [k,l]of bootLayers.entries())if(l.depth===45)ac.drawImage(raws[k],0,0);
  const v=pixels(css(o,j,p9,both)), u=pixels(css(o,j,p,pb)), b=pixels(css(o,j,boot,wb));a.deepEqual(v,pixels(all),`${pants}/${j} original ordered passes`);
  let boots=0,legs=0;
  for(let i=0;i<v.length;i+=4){
   if(v.readUInt32LE(i)!==u.readUInt32LE(i)){a(domain[i+3]);boots++;}
   if(v.readUInt32LE(i)!==b.readUInt32LE(i)){a(cn.data[i+3]);legs++;}
   if(domain[i+3]&&Math.floor(i/2048)>=bottom-15)a.equal(v.readUInt32LE(i),b.readUInt32LE(i),'sole');
  }
  a(legs&&boots);ticks++;
  for(const x of [dc,pc,all])x.width=1;
 }
 a.equal(JSON.stringify(p9),save);
 for(const e of [{legs:pants,boots:169},{legs:pants,boots:id,head:129},{legs:pants,boots:id,weapon:0},{legs:21,boots:id},{legs:pants,boots:id,coat:151}]){
  a(!api.selectVisual(actor(e),o)?.northLayers?.lower);
 }
 pb.release();both.release();console.log(id,pants,look.skinColor,'40 frames exact');
}
// Removing the last garment still leaves the selected HD boot, not the
// fallback body. Test all excluded boots plus the rejected P182 contact.
for(const b of [134,155,162,169])a(!api.selectVisual(actor({legs:168,boots:b}),o)?.northLayers?.lower);
a(!api.selectVisual(actor({legs:182,boots:148}),o)?.northLayers?.lower);
bb.release();wb.release();}}

const original=global.MareCharacterAppearance.normalize({gender:'feminino',hairColor:'brown',eyeColor:'brown'});
for(const pants of [168,182]){
 const p={classId:'brawler',appearance96:original,equipment:{legs:{def:pants}}};
 a(api.selectVisual(p,o)?.independentPants);
 a(!api.selectVisual({...p,equipment:{...p.equipment,boots:{def:8}}},o)?.northLayers?.lower);
}
a.equal(ticks,880);console.log('PASS',ticks);
})().catch(e=>{console.error(e);process.exitCode=1});
