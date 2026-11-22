'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),R=process.env.STAGE||path.resolve(__dirname,'..'),n=f=>require(R+'/'+f);
const {make,cv}=n('tests/rework-integration-support.cjs'),A=n('character-appearance'),W=n('paper-doll-96-lobby'),C=n('tools/paper-doll-96-v3/weapons.json');
const load=n('tools/rework-hd-test-loader.cjs').create(R);
const src=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const api=make(),own=l=>l.id.startsWith('boot9-');
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(tone,boots,hair='black')=>({classId:'brawler',appearance96:A.normalize({gender:'masculino',skinColor:tone,hairStyle:'original',hairColor:hair,eyeStyle:'original',eyeColor:'blue'}),
 equipment:{coat:{def:6},legs:{def:133},...(boots&&{boots:{def:9}})}});
const layerId=':saved-signed-side-punch-b9';
async function frames(p,q,options){
 const prepared=await api.prepareConfiguration([{player:p,source:q,options}],{resolve:x=>x});
 try{const frames=[];for(let i=0;i<8;i++){
   let c;a(prepared.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...options,progress:(i+.25)/8}));
   frames.push({w:c.width,h:c.height,p:pixels(c)});
 }return frames;}finally{prepared.release();global.gc?.();}
}
(async()=>{await api.ready;let rendered=0;
 for(const direction of ['east']){
  const options={consumer:'world',action:'attack-unarmed',direction};
  const world=(p,o=options)=>W.selectWorldHDOnly(api,C,p,o);
  const literal=p=>({...p,appearance96:{gender:'masculino',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'}});
  const archive=world(literal(actor('light',true))), signed=archive.pack.directions[direction].layers.filter(own);
  const archiveShot=await frames(literal(actor('light',true)),archive,options);
  const hold=await frames(literal(actor('light',false)),world(literal(actor('light',false))),options);
  const mask=cv.createCanvas(archiveShot[0].w,archiveShot[0].h),mc=mask.getContext('2d'),bootArt=cv.createCanvas(mask.width,mask.height),bc=bootArt.getContext('2d');
  for(const l of signed){a.equal(l.binding.kind,'fixed');const im=await load(src(l.source));a.equal(im.width,mask.width);mc.drawImage(im,0,0);if(!l.id.endsWith('backing'))bc.drawImage(im,0,0);}
  const m=pixels(mask),art=pixels(bootArt);let soleY=0;for(let j=3;j<art.length;j+=4)if(art[j]>127)soleY=(j/4/mask.width)|0;
  let lookWitness;for(const tone of Object.keys(A.skins)){
   const p=actor(tone,true),off=actor(tone,false),before=JSON.stringify(p),r=world(p),q=world(off);
   a(r?.id.endsWith(layerId),'signed B9 missing '+[direction,tone,r?.id]);
   a.equal(r.colorAppearance.skin,tone);a.equal(r.colorAppearance.hairColor,'black');
   a.equal(r.slotRoutes.legs.item,133);a.equal(r.slotRoutes.coat.item,6);a.equal(r.slotRoutes.boots.item,9);
   a.deepEqual(r.omitted,[]);a.deepEqual(r.paletteSourceMasks,q.paletteSourceMasks);
   a.deepEqual(r.pack.directions[direction].layers.filter(own),signed);
   a.deepEqual(r.pack.directions[direction].layers.filter(l=>!own(l)),q.pack.directions[direction].layers);
   for(const k of ['clip','rest','poses'])a.deepEqual(r.pack.directions[direction][k],q.pack.directions[direction][k]);
   for(const action of ['attack'])a.equal(world(p,{...options,action})?.id,r.id);
   const yes=await frames(p,r,options),no=await frames(off,q,options),out=[];
   for(let k=0;k<8;k++){
    const x=yes[k].p,y=no[k].p,ox=archiveShot[k].p,oy=hold[k].p;let changed=0,sole=0,wit=0;
    for(let j=0;j<x.length;j+=4){
     if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(m[j+3],'outside B9 alpha');changed++;}
     if((ox.readUInt32LE(j)!==oy.readUInt32LE(j))&&(art[j+3]===255)&&(j/4/mask.width>=soleY-22)){
      let diff=0;for(let i=0;i<4;i++)diff=Math.max(diff,Math.abs(x[j+i]-ox[j+i])); a(diff<=3,'signed opaque sole color '+[direction,tone,k,j>>>2,diff]); if(x.readUInt32LE(j)===ox.readUInt32LE(j))sole++;
     }
     if((j/4/mask.width<soleY-20)&&!m[j+3]&&lookWitness&&lookWitness[k].readUInt32LE(j)!==x.readUInt32LE(j))wit++;
    }
    a(changed>100&&sole>20, JSON.stringify({direction,tone,k,changed,sole,soleY}));if(lookWitness)a(wit>20,'no visible skin palette change');
    rendered++;
   }
   if(!lookWitness)lookWitness=yes.map(c=>c.p);
   a.equal(JSON.stringify(p),before);global.gc?.();
  }
  const saved=actor('ebony',true,'blue');
  a(world(saved)?.id.endsWith(layerId));a.equal(world(saved)?.colorAppearance.hairColor,'blue');
  const variants=[{...saved,equipment:{...saved.equipment,boots:{def:9,variant:'wrong'}}},
   {...saved,equipment:{...saved.equipment,legs:{def:140}}},

   {...saved,appearance96:{...saved.appearance96,skin:'light'}},
   {...saved,appearance96:{...saved.appearance96,eyeColor:'violet'}}];
  for(const x of variants)a(!world(x)?.id.endsWith(layerId));
  for(const o of [{consumer:'portrait'},{action:'walk'},{direction:'north'},{weaponless:true}])a(!world(saved,{...options,...o})?.id.endsWith(layerId));
  console.log('PASS',direction,Object.keys(A.skins).length*8);
 }
 a.equal(rendered,64);
 const derivative=make({fetchJSON:async file=>{
   const p=path.join(R,file),data=JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')));
   if(file==='tools/rework-modular-outfits-hd/index.json'){
    for(const x of data.records)if(x.direction==='east'&&x.id.includes('boots9-isolated-candidate')){
     const l=x.pack.directions.east.layers.find(l=>l.id==='boot9-near-front-pilot');
     if(l)l.depth+=.01;
    }
   }
   return data;
 }});
 await derivative.ready;
 const o={consumer:'world',action:'attack-unarmed',direction:'east'};
 a(!W.selectWorldHDOnly(derivative,C,actor('light',true),o)?.id.endsWith(layerId),'changed authored order must fail closed');
 a.equal(W.selectWorldHDOnly(derivative,C,actor('light',false),o)?.slotRoutes.coat.item,6,'existing saved coat must remain valid');
})().catch(e=>{console.error(e);process.exit(1)});
