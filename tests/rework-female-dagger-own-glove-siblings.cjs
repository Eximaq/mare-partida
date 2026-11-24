const fs=require('node:fs'),path=require('node:path'),R=path.resolve(process.env.PROOF_STAGE||path.join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance');
const fileLoad=require(R+'/tools/rework-hd-test-loader.cjs').create(R),prefix='tools/rework-female-dagger-p22/assets/';
const api=make(),load=fileLoad;
const skin=require(R+'/player-rework-skin-hd.js'), local=f=>require(R+'/'+f);
const baseRegistry=MareReworkBaseHD.create(local('tools/rework-base-hd/index.json'));
const hair=MareFemaleNamedHairHD.create(local('tools/rework-accessories/head-layer-index.json'),local('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry,makeCanvas:cv.createCanvas});
const reg=MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:local('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:hair});
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const handIds=new Set(['left-hand','right-hand']);
const draw=async (source,frame)=>{
 const imgs=new Map(await Promise.all(reg.requiredFiles(source,{frame}).map(async f=>[f,await load(f)]))),
  c=cv.createCanvas(1,1);let weapon=null;const ops=[];const size=source.pack.frame.width*4+source.paddingPhysical*2,
  s=cv.createCanvas(size,size),sk=s.getContext('2d'), u=cv.createCanvas(size,size),uc=u.getContext('2d');
 reg.render(c.getContext('2d'),source,imgs,{frame,captureOps:({op,canvas})=>{
  ops.push({id:op.layer?.id,pixels:bytes(canvas)});
  const anatomical=op.layer&&!handIds.has(op.layer.id)&&skin.ownership([op.layer])==='anatomy';
  sk.globalCompositeOperation=anatomical?'source-over':'destination-out';sk.drawImage(canvas,0,0);
  if(op.part){if(!weapon)weapon=cv.createCanvas(size,size);const w=weapon.getContext('2d');w.globalCompositeOperation='source-over';w.drawImage(canvas,0,0);}
  else if(weapon){const w=weapon.getContext('2d');w.globalCompositeOperation='destination-out';w.drawImage(canvas,0,0);}
  if(op.layer&&handIds.has(op.layer.id))uc.drawImage(canvas,0,0);
  canvas.width=canvas.height=1;
 }});
 if(!weapon)weapon=cv.createCanvas(size,size);
 const result={w:bytes(weapon),s:bytes(s),c:bytes(c),u:bytes(u),ops};
 c.width=s.width=u.width=weapon.width=1;return result;
};
const assert=require('node:assert/strict');
const select=(p,o)=>require(R+'/paper-doll-96-lobby.js').selectWorldHD(api,local('tools/paper-doll-96-v3/weapons.json'),p,o);
const dims=['north','south','east','west'], ws=[12,13,71,72,73,74], gl=[25,26,131,138,145,152,159,166,173,180];
const fits=d=>d==='east'||d==='west';
const opts={action:'attack-daggers',consumer:'world'};
const prefix64='tools/rework-female-dagger-p22/assets/';
async function worldRGBA(bundle,p,o,f){
 let c;assert(bundle.draw({save(){},restore(){},drawImage(q){c=q;}},p,{...o,progress:(f+.25)/8}));return bytes(c);
}
const prepared=(p,o)=>api.prepareConfiguration([{player:p,options:o}],{resolve:q=>({...q,source:select(q.player,q.options)})});
function alphaSame(a,b){
 for(let i=3;i<a.length;i+=4)assert.equal(a[i],b[i],'mount changed alpha');
}
// Independent center reflection; the actual renderer uses drawOwnLayerAt.
const reflect=(i,mirror)=>mirror?(Math.floor(i/2560)*2560+2556-(i%2560)):i;
const over=(old,color,alpha)=>Math.round((color*alpha+old*(255-alpha))/255);
function correctSourceOver(before,after,own,mirror){
 const left='left-hand',right='right-hand';let changed=0,edge=0,maximum=0;
 for(let i=0;i<before.c.length;i+=4){
  const j=reflect(i,mirror),l=own[0][j+3],r=own[1][j+3];
  assert.equal(before.c[i+3],after.c[i+3],'actor silhouette changed');
  const actualDiff=before.c.readUInt32LE(i)!==after.c.readUInt32LE(i);
  if(!l&&!r||before.w[i+3]===255)assert(!actualDiff,'changed outside glove ownership or at opaque blade');
  if(!l&&!r)continue;
  // At the first targeted hand the source is opaque. Everything above it
  // is the exact saved witness operation, then an authored glove pixel
  // immediately after its own hand. Compare independent integer RGBA.
  const corrected=[0,0,0];let start=false;
  for(const {id,pixels} of before.ops){
   const g=id===left?0:id===right?1:-1,a=pixels[i+3],ga=g<0?0:own[g][j+3];
   if(ga){assert.equal(a,255);start=true;}
   if(!start)continue;
   for(let n=0;n<3;n++){
    corrected[n]=over(corrected[n],pixels[i+n],a);
    if(ga)corrected[n]=over(corrected[n],own[g][j+n],ga);
   }
  }
  for(let n=0;n<3;n++)maximum=Math.max(maximum,Math.abs(corrected[n]-after.c[i+n]));
  if(actualDiff){changed++;if(before.w[i+3])edge++;}
 }
 assert(maximum<=1,'independent source-over component rounding exceeds 1: '+maximum);
 assert(changed>100,'glove not visible');
 return edge;
}
(async()=>{
 await api.ready;const counts={'legs/22':0,'head/157':0,'head/164':0,'head/178':0};let frames=0,worldFrames=0;
 const z=cv.createCanvas(640,640),zc=z.getContext('2d');
 const plane=im=>{zc.clearRect(0,0,640,640);zc.drawImage(im,0,0);return bytes(z);};
 for(const direction of ['east','west'])for(const w of ws)for(const skinColor of Object.keys(A.skins)){
  const o={...opts,direction},wear=(style='original')=>A.normalize({gender:'feminino',skinColor,
   hairStyle:style,hairColor:skinColor==='ebony'?'blue':'black',eyeColor:skinColor==='ebony'?'green':'blue'});
  for(const [slot,def] of [['legs',22],['head',157],['head',164],['head',178],['legs',168]]){
   const appearance96=wear(slot==='legs'&&skinColor==='ebony'?'hair-bob':'original');
   const actor=(sib,glove)=>({classId:'rogue',appearance96,equipment:{weapon:{def:w},[slot]:sib===null?null:{def:sib},gloves:glove===null?null:{def:glove}}});
   const sibling=actor(def,null),receiver=select(sibling,o),existing=receiver?.slotRoutes?.[slot];
   for(const g of gl){
    const on=actor(def,g),before=JSON.stringify(on),result=select(on,o);
    if(existing?.quality!=='hd'){
     assert.notEqual(result?.slotRoutes?.gloves?.quality,'hd','must not cover only the glove and omit the unsupported sibling');continue;
    }
    assert.equal(result?.slotRoutes?.gloves?.item,g,JSON.stringify([direction,w,skinColor,slot,def,g,result?.id]));
    assert.deepEqual(result.slotRoutes[slot],existing);assert.equal(result.slotRoutes.weapon.item,w);
    assert.deepEqual(result.omitted,[]);assert.deepEqual(result.pack,receiver.pack);assert.deepEqual(result.baseRecord,receiver.baseRecord);
    assert.deepEqual(result.states,receiver.states);assert.deepEqual(result.material,receiver.material);
    assert.deepEqual(result.colorAppearance,receiver.colorAppearance);assert.equal(JSON.stringify(on),before);
    assert.equal(select(sibling,o).id,receiver.id);
    const alone=select(actor(null,g),o);
    assert.deepEqual(result.daggerOwnHands,alone.daggerOwnHands,'independent sibling must never choose a different glove');
    assert.equal(select({...on,equipment:{...on.equipment,[slot]:{def,variant:'unverified'}}},o)?.slotRoutes?.gloves?.quality,undefined);
    for(const action of ['attack','skill']){
     const alias=select(on,{...o,action});assert.equal(alias?.slotRoutes?.gloves?.item,g);assert.equal(alias?.slotRoutes?.[slot]?.item,def);
    }
    counts[slot+'/'+def]++;
    const example=slot==='legs'&&(def===22&&[12,74].includes(w))||slot==='head'&&w===73&&skinColor==='light';
    if(!example||g!==159||!['light','ebony'].includes(skinColor))continue;
    for(let f=0;f<8;f++){
     const a=await draw(receiver,f),b=await draw(result,f),c=await draw(alone,f);
     assert(a.w.equals(b.w));alphaSame(a.u,b.u);alphaSame(a.s,b.s);
     const handOps=x=>x.ops.filter(q=>handIds.has(q.id));
     assert.deepEqual(handOps(b),handOps(c),'the mounted hand pixels must be exact with or without sibling');
     assert.deepEqual(a.ops.filter(q=>!handIds.has(q.id)),b.ops.filter(q=>!handIds.has(q.id)),'non-hand operations changed');
     const images=[];for(const l of result.daggerOwnHands.source)images.push(plane(await load(prefix64+l.frames[f]+'.png')));
     correctSourceOver(a,b,images,result.daggerOwnHands.mirrorX);
     if(f===3){
      const [base,own]=await Promise.all([prepared(sibling,o),prepared(on,o)]);
      try{assert((await worldRGBA(base,sibling,o,f)).equals(a.c));assert((await worldRGBA(own,on,o,f)).equals(b.c));worldFrames++;}
      finally{base.release();own.release();}
     }
     frames++;global.gc?.();
    }
   }
  }
 }
 assert.deepEqual(counts,{'legs/22':960,'head/157':480,'head/164':240,'head/178':480});
 console.log('PASS',counts,frames,'full layered frames,',worldFrames,'prepared World draws');
})().catch(e=>{console.error(e);process.exitCode=1});
