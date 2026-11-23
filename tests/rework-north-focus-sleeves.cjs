'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const mod=file=>require(path.join(root,file)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),listed=require('../tools/audit-hd-wardrobe-product.cjs');
const clothes=mod('tools/rework-combat-wardrobe/index.json'),bank=clothes.northFocusSleeves;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
const ids=[16,17,31,32,121,122],pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const nativePath=url=>new URL(url,'https://art.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1);

// Reconstruct the published reference separately on the naked weapon rig.
// No wardrobe resolver, garment flags or previously dressed pixels are used.
async function reference(r,images,item,t){
 const rig=r.basePack,d=rig.pack.directions.north,panels=bank.items[item],parts=panels.frames[t];
 const map=new Map(images),bindings={...rig.images},layers=[...d.layers];
 const fore=d.layers.find(l=>l.id==='forearm-hand-far').frames[t],pin=bank.pins[t];
 const form=fore===pin.open?'open':r.w121IndependentNorth?'staff':'normal';
 const originals={},mask=new Uint8Array(640*640),canvas=()=>cv.createCanvas(640,640);
 function layer(name,im,depth){
  const key=require('node:crypto').createHash('sha256').update(name).digest('hex'),url='assets/'+key+'.png';
  bindings[key]=url;map.set(nativePath(url),im);
  layers.push({id:name,slot:'top',binding:{kind:'fixed'},source:key,depth});
 }
 for(const [group,p] of Object.entries(parts)){
  const key=typeof p==='string'?p:p[group.startsWith('far')?form:'normal'];
  const im=await load('tools/rework-combat-wardrobe/assets/'+key+'.png');
  const ref=canvas();ref.getContext('2d').drawImage(im,0,0);originals[group]=ref;
  const px=pixels(ref);
  for(let i=0;i<mask.length;i++)if(px[i*4+3])mask[i]=1;
 }
 const stock=d.layers.find(l=>l.id==='shorts').frames[t],url=nativePath(bindings[stock]);
 const hi=canvas(),lo=canvas(),hx=hi.getContext('2d'),lx=lo.getContext('2d');
 hx.drawImage(map.get(url),0,0);const top=hx.getImageData(0,0,640,640),bottom=lx.createImageData(640,640);
 const core=pixels(originals.core);
 for(const [p,len] of clothes.northFocusTrousers.phases[t].cut){
  for(let i=p;i<p+len;i++)if(core[i*4+3]){
   for(let ch=0;ch<4;ch++){bottom.data[i*4+ch]=top.data[i*4+ch];top.data[i*4+ch]=0;}
  }
 }
 lx.putImageData(bottom,0,0);hx.putImageData(top,0,0);map.set(url,hi);layer('waist',lo,2.1);
 for(const [k,depth] of [['back',-.1],['core',2.8],['farShoulder',3],['farUpper',3],['farLower',3],['nearShoulder',5.05],['nearUpper',5.1],['nearLower',6.1],['nearDrape',6.5]])if(originals[k])layer(k,originals[k],depth);
 if(originals.farLower){
  const cuff=canvas(),cx=cuff.getContext('2d');cx.drawImage(originals.farLower,0,0);
  cx.globalCompositeOperation='destination-in';cx.drawImage(map.get(nativePath(bindings[fore])),0,0);layer('cuff',cuff,4.1);
 }
 const copy={...r,basePack:{...rig,images:bindings,pack:{...rig.pack,directions:{north:{...d,layers}}}}};
 const c=canvas();weaponArt.render(c.getContext('2d'),copy,map,{frame:t,appearance:r.colorAppearance});
 return {c,mask,source:panels.source,parts:Object.keys(parts)};
}
// These points lie inside the original back, in the rectangles formerly
// missing after the far arm lifts. Test the source garment in its own space
// and its transformed positions in the real map output.
async function backSeam(r,item,f,actual,naked,images){
 const points={6:[[345,259],[346,263]],7:[[345,257],[346,262]],130:[[356,331],[358,342]],
  137:[[356,332],[358,344]],144:[[353,278],[352,289]],172:[[361,306],[365,312]]}[item];
 const gear=bank.items[item],outfit=mod('tools/rework-modular-outfits-hd/index.json').records.find(row=>row.id===gear.source);
 const d=outfit.pack.directions.north,pose=r.basePack.pack.directions.north.poses[f],rest=d.rest;
 const cloth=cv.createCanvas(640,640),cx=cloth.getContext('2d');
 for(const panel of gear.panels){
  const url='tools/rework-modular-outfits-hd/assets/'+panel.sha256+'.png';
  const im=await load(url);cx.drawImage(im,64,64);
 }
 const original=pixels(cloth);cloth.width=1;
 const sx=Math.abs((pose['RIGHT SHOULDER'].x-pose['LEFT SHOULDER'].x)/(rest['RIGHT SHOULDER'].x-rest['LEFT SHOULDER'].x));
 const sy=(pose.HIP.y-pose['BODY NECK'].y)/(rest.HIP.y-rest.NECK.y);
 const key=gear.frames[f].core,img=await load('tools/rework-combat-wardrobe/assets/'+key+'.png');
 const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(img,0,0);const textile=pixels(c);c.width=1;
 for(const [x,y] of points){
  const tx=Math.round((x-rest.NECK.x*4)*sx+pose['BODY NECK'].x*4),ty=Math.round((y-rest.NECK.y*4)*sy+pose['BODY NECK'].y*4);
  const k=(640*ty+tx)*4;assert(original[(640*y+x)*4+3]>240&&textile[k+3]>240,item+' original continuous seam at '+[x,y]);
  assert.notEqual(actual.readUInt32LE(k),naked.readUInt32LE(k),item+' exposed skin at '+[tx,ty]);
 }
}
(async()=>{
 const api=make();await api.ready;const rows=[];
 const sheet=process.env.HD_SLEEVE_SHEET&&cv.createCanvas(8*180,6*200);
 const sx=sheet?.getContext('2d');if(sx){sx.fillStyle='#28313b';sx.fillRect(0,0,sheet.width,sheet.height);sx.imageSmoothingEnabled=false;}
 for(const id of ids){
  const player=look.commit({classId:listed.weapons.find(w=>w.id===id).role,equipment:{weapon:{def:id}}},
   {gender:'masculino',skinColor:id%2?'ebony':'light',hairColor:'blue',eyeColor:'green'},()=>true);
  const o={consumer:'world',action:api.attackActionFor(id),direction:'north'},original=JSON.stringify(player);
  const select=p=>world.selectWorldHDOnly(api,catalog,p,o);
  const prepare=async p=>{const r=select(p),b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert.deepEqual(b.coverage[0].omitted,[],JSON.stringify(b.coverage[0].slotResolution));return b;};
  const draw=(b,p,t)=>{let frame;assert(b.draw({save(){},restore(){},drawImage(c){frame=c;}},p,{...o,progress:(t+.2)/8}));
   assert.equal(frame.width,640);return pixels(frame);};
  const base=select(player),r=base.independentPlan?.base||base,images=new Map();
  for(const file of weaponArt.requiredFiles(r))images.set(file,await load(file));
  const naked=await prepare(player);
  try{for(const [index,item] of [6,7,130,137,144,172].entries()){
   const coat={def:item},solo={...player,equipment:{...player.equipment,coat}};
   const off={...player,equipment:{...player.equipment,head:{def:listed.gear[4][index]},boots:{def:listed.gear[2][index]},legs:{def:listed.gear[1][index]},gloves:{def:listed.gear[3][index]}}};
   const on={...player,equipment:{...off.equipment,coat}};
   const single=await prepare(solo),kit=await prepare(on),control=await prepare(off);
   try{
    const a=single.coverage[0],b=kit.coverage[0];
    assert.equal(a.slotRoutes.coat.item,item);assert.equal(a.slotRoutes.coat.quality,'hd');assert.deepEqual(b.slotRoutes.coat,a.slotRoutes.coat);
    for(const slot of Object.keys(off.equipment))assert.deepEqual(b.slotRoutes[slot],control.coverage[0].slotRoutes[slot]);
    assert.deepEqual(select({...on,equipment:Object.fromEntries(Object.entries(on.equipment).reverse())}).slotRoutes,b.slotRoutes);
    for(let t=0;t<8;t++){
     const expected=await reference(r,images,item,t),full=draw(single,solo,t);
     assert(full.equals(pixels(expected.c)),[id,item,t,'original coat panels and receiving bones'].join('/'));expected.c.width=1;
     const before=draw(naked,player,t),mixed=draw(kit,on,t),other=draw(control,off,t);
     if(id===17&&(t===3||t===4))await backSeam(r,item,t,full,before,images);
     if(sx&&id===17){
      const im=cv.createCanvas(640,640),cx=im.getContext('2d'),data=cx.createImageData(640,640);data.data.set(full);cx.putImageData(data,0,0);
      sx.drawImage(im,205,170,230,265,t*180,index*200,180,188);im.width=1;
      sx.fillStyle='#ffffff';sx.fillText(item+' / '+t,t*180+6,index*200+197);
     }
     let soloChanged=0,mixedChanged=0;
     for(let i=0;i<expected.mask.length;i++){
      const k=i*4,diff=full.readUInt32LE(k)!==before.readUInt32LE(k),ensemble=mixed.readUInt32LE(k)!==other.readUInt32LE(k);
      if(diff||ensemble)assert(expected.mask[i],'coat affected another part at '+i);
      soloChanged+=Number(diff);mixedChanged+=Number(ensemble);
     }
     assert(soloChanged>3000&&mixedChanged>3000);
     rows.push({weapon:id,item,t,source:expected.source,parts:expected.parts,soloChanged,mixedChanged});
    }
   }finally{single.release();kit.release();control.release();}
  }}finally{naked.release();}
  assert.equal(JSON.stringify(player),original);console.log(id,'six original coats, 48 individual and 48 mixed phases');global.gc?.();
 }
 assert.equal(rows.length,288);
 if(sheet)fs.writeFileSync(process.env.HD_SLEEVE_SHEET,sheet.toBuffer('image/png'));
 if(process.env.HD_SLEEVE_RESULTS)fs.writeFileSync(process.env.HD_SLEEVE_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
