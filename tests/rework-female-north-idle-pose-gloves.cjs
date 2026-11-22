'use strict';
const assert=require('node:assert/strict'),R=require('node:path').resolve(__dirname,'..'),req=s=>require(R+'/'+s);
const {make,cv}=req('tests/rework-integration-support.cjs'),A=req('character-appearance'),api=make(),load=req('tools/rework-hd-test-loader.cjs').create(R);
const I=req('item-catalog').create({forge:req('forge-system'),prison:req('prison-system'),haki:req('haki-system'),akuma:req('akuma-system'),hakiProgression:req('haki-progression')}).items;
const r=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:req('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{
 appearanceRegistry:global.MareFemaleNamedHairHD.create(req('tools/rework-accessories/head-layer-index.json'),req('tools/rework-accessories/female-original-face-ownership.json'),{
   baseRegistry:global.MareReworkBaseHD.create(req('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas}),makeCanvas:cv.createCanvas});
const moving=process.env.PROOF_ACTION==='walk',o={action:moving?'walk':'idle',direction:'north',consumer:'world'},px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const own=(p,g)=>({classId:I[p].type,appearance96:A.normalize({gender:'feminino',skinColor:g||'light',hairStyle:'original',hairColor:g==='ebony'?'blue':'black',eyeColor:'blue'}),equipment:{weapon:{def:p}}});
async function draw(src,frame=0){const c=cv.createCanvas(1,1),images=new Map(await Promise.all(r.requiredFiles(src,{frame}).map(async k=>[k,await load(k)])));
 r.render(c.getContext('2d'),src,images,{frame});return c;}
(async()=>{await api.ready;const colors=['light','ebony'];let samples=0;
 for(const p of (moving?[2,14,125,128]:[2,14,17,125,128]))for(const tone of colors){
  const actor=own(p,tone),bare=api.selectVisual(actor,o);
  for(let f=0;f<bare.states.length;f++){
  const prev=await draw(bare,f);
  const aplha=cv.createCanvas(prev.width,prev.height),ctx=aplha.getContext('2d'),pad=bare.paddingPhysical||0;
  const W=cv.createCanvas(prev.width,prev.height),wc=W.getContext('2d'),bytes=px(prev);
  for(const item of (p===2?[25,26,131,138,145,152,159,166,173,180]:[25,180])){
   const worn={...actor,equipment:{...actor.equipment,gloves:{def:item}}},before=JSON.stringify(worn),dressed=api.selectVisual(worn,o);
   assert.equal(dressed?.slotRoutes?.gloves?.item,item,'compatible signed hand must select independent glove '+JSON.stringify({p,tone,item}));
   assert.equal(dressed.slotRoutes.weapon.item,p);assert.deepEqual(dressed.states,bare.states);
   assert.deepEqual(dressed.material,bare.material);assert.equal(dressed.paddingPhysical,bare.paddingPhysical);
   const d=dressed.pack.directions.north,pass=d.layers.find(l=>l.id==='own-female'+item+'-visible-gloves');
   assert.deepEqual(d.layers.filter(l=>l!==pass),bare.pack.directions.north.layers);
   assert.equal(pass.depth,4.001);assert.deepEqual(d.poses,bare.pack.directions.north.poses);
   const c=await draw(dressed,f),output=px(c);ctx.clearRect(0,0,aplha.width,aplha.height);ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+pass.frames[f]+'.png'),pad,pad);
   const mask=px(aplha),drawSteel=async(bg)=>{
    wc.imageSmoothingEnabled=false;wc.clearRect(0,0,W.width,W.height);if(bg){wc.fillStyle=bg;wc.fillRect(0,0,W.width,W.height);}
    for(const part of bare.states[f].parts){
     wc.save();wc.translate(pad,pad);wc.transform(...part.matrix);
     if(part.sourceClip){wc.beginPath();wc.rect(...part.sourceClip);wc.clip();}
     wc.drawImage(await load(part.url),0,0);wc.restore();
    }
    return px(W);
   };
   const blade=await drawSteel(),black=await drawSteel('#000'),white=await drawSteel('#fff');let changes=0;
   for(let i=0;i<output.length;i+=4)if(bytes.readUInt32LE(i)!==output.readUInt32LE(i)){
    assert(mask[i+3]>0,'changed pixel outside original glove');
    if(blade[i+3]===255)assert.notEqual(black.readUInt32LE(i),white.readUInt32LE(i),'glove covered original opaque weapon '+JSON.stringify({p,tone,item,i,before:bytes.readUInt32LE(i),after:output.readUInt32LE(i)}));
    changes++;
   }
   assert(changes>100,'visible glove was not drawn');assert.deepEqual(api.selectVisual(actor,o),bare);
   assert.equal(JSON.stringify(worn),before);c.width=1;samples++;global.gc?.();
  }
  prev.width=1;W.width=1;aplha.width=1;
  }
 }
 for(const id of [67,119]){
  const unsupported=own(id),equipped={...unsupported,equipment:{...unsupported.equipment,gloves:{def:25}}};
  assert(!api.selectVisual(equipped,o)?.id.includes('pose-own-female-gloves'),'weapon under hand or owns its mask: held, not retimed');
 }
 console.log('PASS',samples,'North',o.action,'glove renderings independent of weapon, exact alpha scope and save');
})().catch(e=>{console.error(e);process.exitCode=1});
