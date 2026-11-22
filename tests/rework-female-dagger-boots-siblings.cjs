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
(async()=>{
 await api.ready;
 const z=cv.createCanvas(640,640),zc=z.getContext('2d'),plane=im=>{zc.clearRect(0,0,640,640);zc.drawImage(im,0,0);return bytes(z);};
 let geometry=0;
 for(const [dir,items] of Object.entries(cat2.signedBootLayers).filter(([d])=>d==='north'||d==='south'))for(const [b,ls] of Object.entries(items)){
  for(let f=0;f<8;f++){
   const cloth=plane(await load(archive+cat2.frames[dir][f]+'.png')),rear=plane(await load(archive+ls[0].frames[f]+'.png')),shaft=plane(await load(archive+ls[1].frames[f]+'.png'));
   let bottom=-1,contact=-1;
   for(let i=3;i<cloth.length;i+=4)if(rear[i]||shaft[i]){
    bottom=Math.floor(i/2560);
    if(cloth[i])contact=bottom;
   }
   assert(contact>=0&&bottom-contact>=(dir==='north'?26:49),'authored cuff does not clear sole');geometry++;
  }
 }
 const counts={north:0,south:0};let frames=0,world=0;
 for(const direction of ['north','south'])for(const def of ws)for(const skinColor of Object.keys(A.skins)){
  const o={...o0,direction},appearance96=A.normalize({gender:'feminino',skinColor,
   ...(skinColor==='ebony'?{hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'}:{})});
  const actor=(pants,boots)=>({classId:'rogue',appearance96,equipment:{weapon:{def},legs:pants===null?null:{def:pants},boots:boots===null?null:{def:boots}}});
  const cloth=actor(22,null),existing=select(cloth,o);assert.equal(existing?.slotRoutes?.legs?.item,22);
  for(const b of [8,9,134,141,148,155,162,169,176,183]){
   const boot=actor(null,b),both=actor(22,b),before=JSON.stringify(both),solo=select(boot,o),r=select(both,o);
   if(solo?.slotRoutes?.boots?.item!==b){assert.notEqual(r?.slotRoutes?.boots?.item,b);continue;}
   assert.equal(r?.slotRoutes?.boots?.item,b,JSON.stringify([direction,def,skinColor,b,r?.id]));
   assert.deepEqual(r.slotRoutes.legs,existing.slotRoutes.legs);assert.deepEqual(r.omitted,[]);
   assert.equal(r.slotRoutes.weapon.item,def);assert.deepEqual(r.material,existing.material);
   assert.deepEqual(r.states,existing.states);assert.deepEqual(r.colorAppearance,existing.colorAppearance);
   assert.equal(r.ownLayerSources.boots,solo.ownLayerSources.boots);
   assert.equal(JSON.stringify(both),before);
   assert.equal(select(cloth,o).id,existing.id);assert.equal(select(boot,o).id,solo.id);
   assert.notEqual(select(actor(168,b),o)?.slotRoutes?.boots?.item,b,'unsupported sibling must not silently drop');
   for(const action of ['attack','skill']){
    const a=select(both,{...o,action});assert.equal(a?.slotRoutes?.boots?.item,b);assert.equal(a?.slotRoutes?.legs?.item,22);
   }
   const layers=solo.pack.directions[direction].layers.filter(l=>l.id.startsWith('adaga-overlap:boots:'+b+':'));
   assert.deepEqual(r.pack.directions[direction].layers,[...existing.pack.directions[direction].layers,...layers]);
   counts[direction]++;
   if(!['light','ebony'].includes(skinColor)||!(direction==='north'&&def===73&&[8,176].includes(b)||
     direction==='south'&&def===12&&[134,169].includes(b)))continue;
   for(let f=0;f<8;f++){
    const a=await draw(existing,f),x=await draw(solo,f),y=await draw(r,f),bootPlanes=[];
    assert(a.w.equals(y.w),'visible dagger contribution changed');
    for(const l of layers)bootPlanes.push(plane(await load(archive+l.frames[f]+'.png')));
    let changed=0,sole=0,last=0;
    for(let i=3;i<a.c.length;i+=4)if(bootPlanes.some(p=>p[i]))last=Math.floor(i/2560);
    for(let i=0;i<a.c.length;i+=4){
     assert(!a.c[i+3]||y.c[i+3],'new hole');
     assert(y.s[i+3]<=a.s[i+3],'newly exposed skin');
     if(a.c.readUInt32LE(i)!==y.c.readUInt32LE(i)){
      assert(bootPlanes.some(p=>p[i+3]),'changed outside boot');
      assert(!a.w[i+3],'blade framebuffer pixels changed despite strict noncontact');
      changed++;
     }
     if(bootPlanes.some(p=>p[i+3])&&Math.floor(i/2560)>last-12){
      assert.equal(y.c.readUInt32LE(i),x.c.readUInt32LE(i),'P22 changed sole');
      sole++;
     }
    }
    assert(changed>500&&sole>40);frames++;
    if(f===3){
     const [a0,a1]=await Promise.all([prep(cloth,o),prep(both,o)]);
     try{assert(rgba(a0,cloth,o,f).equals(a.c));assert(rgba(a1,both,o,f).equals(y.c));world++;}
     finally{a0.release();a1.release();}
    }
    global.gc?.();
   }
  }
 }
 assert.deepEqual(counts,{north:480,south:384});assert.deepEqual([geometry,frames,world],[144,64,8]);
 console.log('PASS',counts,geometry,'sole alpha bound phases,',frames,'full source renders,',world,'prepared World frames');
})().catch(e=>{console.error(e);process.exitCode=1});
