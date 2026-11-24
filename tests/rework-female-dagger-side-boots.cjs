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
const o0={action:'attack-daggers',consumer:'world'}, archive='tools/rework-female-dagger-p22/assets/';
const cat2=local('tools/rework-female-dagger-p22/index.json');
const rgba=(bundle,p,o,f)=>{let tile;assert(bundle.draw({save(){},restore(){},drawImage(c){tile=c;}},p,{...o,progress:(f+.25)/8}));return bytes(tile);};
const prep=(p,o)=>api.prepareConfiguration([{player:p,options:o}],{resolve:q=>({...q,source:select(q.player,q.options)})});
const saturate=(value,inv)=>Math.floor((value*inv+127)/255);
function expectedSourceOver(ops,i){
 let rgba=[0,0,0,0];
 for(const {pixels} of ops){
  const a=pixels[i+3],inv=255-a;
  if(!a)continue;
  for(let c=0;c<3;c++)rgba[c]=saturate(pixels[i+c],a)+saturate(rgba[c],inv);
  rgba[3]=a+saturate(rgba[3],inv);
 }
 return rgba;
}
// Reflect the original whole fixed raster around the registered local
// lower-rig midpoint without using the runtime canvas mirror function.
function flipped(plane){
 const out=Buffer.allocUnsafe(plane.length);
 for(let y=0;y<640;y++)for(let x=0;x<640;x++)out.writeUInt32LE(plane.readUInt32LE(4*(y*640+639-x)),4*(y*640+x));
 return out;
}
(async()=>{
 await api.ready;const counts={east:0,west:0,pants:0,gloves:0,triple:0};let frames=0,world=0,edges=0,soleFrames=0,maxDeviation=0,bounds=0;
 const z=cv.createCanvas(640,640),zc=z.getContext('2d'),plane=im=>{zc.clearRect(0,0,640,640);zc.drawImage(im,0,0);return bytes(z);};
 const scope=process.env.DAGGER_BOOT_PROOF_DIRECTION,dirs=['east','west'].filter(d=>!scope||d===scope);assert(dirs.length);
 const fixtures=[8,9,134,148,176,183],items=cat2.signedBootLayers.east;
 for(const direction of dirs){
  for(const layers of Object.values(items))for(let f=0;f<8;f++){
   const cloth=plane(await load(archive+cat2.frames[direction][f]+'.png')),b=[];
   for(const l of layers){const p=plane(await load(archive+l.frames[f]+'.png'));b.push(direction==='west'?flipped(p):p);}
   let last=-1,both=-1;
   for(let i=3;i<cloth.length;i+=4)if(b.some(x=>x[i])){last=Math.floor(i/2560);if(cloth[i])both=last;}
   assert(last-both>=24&&both>=0,'unsupported cuff approaches sole');bounds++;
  }
  for(const [wi,def] of ws.entries())for(const skinColor of Object.keys(A.skins)){
   const o={...o0,direction},appearance96=A.normalize({gender:'feminino',skinColor,
    ...(skinColor==='ebony'?{hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'}:{})});
   const actor=(boot,pants,glove)=>({classId:'rogue',appearance96,equipment:{weapon:{def},boots:boot?{def:boot}:null,legs:pants?{def:pants}:null,gloves:glove?{def:glove}:null}});
   const bare=actor(),existing=select(bare,o),p22=select(actor(null,22),o),hand=select(actor(null,null,159),o);
   assert.equal(p22?.slotRoutes?.legs?.item,22);assert.equal(hand?.slotRoutes?.gloves?.item,159);
   for(const b of [8,9,134,141,148,155,162,169,176,183]){
    const on=actor(b),before=JSON.stringify(on),r=select(on,o),record=items[b];
    assert.equal(r?.slotRoutes?.boots?.item,b,JSON.stringify([direction,def,skinColor,b,r?.id]));
    assert.deepEqual(r.omitted,[]);assert.deepEqual(r.states,existing.states);assert.deepEqual(r.material,existing.material);
    assert.deepEqual(r.colorAppearance,existing.colorAppearance);assert.equal(r.slotRoutes.weapon.item,def);
    assert.equal(r.ownLayerSources.boots,JSON.stringify(['boots',b,'female',o.action,direction]));
    assert.equal(!!r.daggerBootMirror,direction==='west');assert.equal(JSON.stringify(on),before);counts[direction]++;
    assert.equal(select(bare,o).id,existing.id);
    for(const action of ['attack','skill'])assert.equal(select(on,{...o,action})?.slotRoutes?.boots?.item,b);
    const p22b=select(actor(b,22),o), handb=select(actor(b,null,159),o), combo=select(actor(b,22,159),o);
    for(const [rec,slot,authority] of [[p22b,'legs',p22],[handb,'gloves',hand],[combo,'legs',p22]]){
     assert.deepEqual(rec?.slotRoutes?.[slot],authority.slotRoutes[slot]);
     assert.equal(rec.ownLayerSources.boots,r.ownLayerSources.boots);
    }
    assert.deepEqual(combo.daggerOwnHands,hand.daggerOwnHands);
    assert.notEqual(select(actor(b,168),o)?.slotRoutes?.boots?.item,b,'unsupported pants dropped');
    counts.pants++;counts.gloves++;counts.triple++;
    if(skinColor!==(wi%2?'ebony':'light')||b!==fixtures[wi])continue;
    for(let f=0;f<8;f++){
     const a=await draw(existing,f), baked=await draw(r,f), bootPlanes=[];
     assert(a.w.equals(baked.w),'own visible dagger RGBA changed');
     for(const l of record){const p=plane(await load(archive+l.frames[f]+'.png'));bootPlanes.push(direction==='west'?flipped(p):p);}
     const ids=record.map(l=>l.id),ord=[{pixels:bootPlanes[0]},...a.ops];ord.splice(2,0,{pixels:bootPlanes[1]});
     assert.deepEqual(baked.ops.filter(p=>!ids.includes(p.id)),a.ops,'non-boot operation changed');
     for(const [i,id] of ids.entries())assert(baked.ops.find(p=>p.id===id).pixels.equals(bootPlanes[i]),'native boot RGBA differs from original/mirror');
     let changed=0;
     for(let i=0;i<a.c.length;i+=4){
      const old=a.c.readUInt32LE(i),got=baked.c.readUInt32LE(i),hasBoot=bootPlanes.some(x=>x[i+3]);
      assert(!a.c[i+3]||baked.c[i+3],'new hole');assert(baked.s[i+3]<=a.s[i+3],'new exposure');
      // The union's quantized 8-bit alpha can round to 255 even when
      // both weapon inputs are translucent (e.g. alphas 248 and 253).
      // Test a *real* opaque weapon operation, not that rounded union.
      if(!hasBoot||a.ops.some(op=>op.id===undefined&&op.pixels[i+3]===255))
       assert.equal(got,old,'outside boot/opaque blade changed');
      if(got===old)continue;
      changed++;if(!a.w[i+3])continue;
      const expected=expectedSourceOver(ord,i),actualAlpha=baked.c[i+3];
      maxDeviation=Math.max(maxDeviation,Math.abs(expected[3]-actualAlpha));
      for(let c=0;c<3;c++)maxDeviation=Math.max(maxDeviation,Math.abs(expected[c]-saturate(baked.c[i+c],actualAlpha)));
      edges++;
     }
     assert(changed>500,'boot rendered invisibly');frames++;
     if(def===73){
      const child=await draw(combo,f),without=await draw(select(actor(null,22,159),o),f);
      let last=-1,bottom=0;
      for(let i=3;i<a.c.length;i+=4)if(bootPlanes.some(x=>x[i]))last=Math.floor(i/2560);
      assert(child.w.equals(without.w),'triple changes blade');
      for(let i=0;i<a.c.length;i+=4){
       if(Math.floor(i/2560)>last-12&&bootPlanes.some(x=>x[i+3])){
        assert.equal(child.c.readUInt32LE(i),baked.c.readUInt32LE(i),'triple changed sole');
        bottom++;
       }
       assert(child.s[i+3]<=without.s[i+3],'triple exposes skin');
      }
      assert(bottom>40);soleFrames++;
     }
     if(f===5){
      const [a0,a1]=await Promise.all([prep(bare,o),prep(on,o)]);
      try{assert(rgba(a0,bare,o,f).equals(a.c));assert(rgba(a1,on,o,f).equals(baked.c));world++;}
      finally{a0.release();a1.release();}
     }
     global.gc?.();
    }
   }
  }
 }
 assert.deepEqual(counts,{east:dirs.includes('east')?480:0,west:dirs.includes('west')?480:0,pants:480*dirs.length,gloves:480*dirs.length,triple:480*dirs.length});
 assert.deepEqual([bounds,frames,world,soleFrames],[80*dirs.length,48*dirs.length,6*dirs.length,8*dirs.length]);
 assert(edges>0);assert(maxDeviation<=1,'source-over premultiplied rounding '+maxDeviation);
 console.log('PASS',counts,bounds,'cuff phases,',frames,'source-over frames,',world,'World draws,',soleFrames,'triple sole frames,',edges,'translucent edge pixels; max',maxDeviation);
})().catch(e=>{console.error(e);process.exitCode=1});
