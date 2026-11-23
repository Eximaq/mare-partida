'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=name=>require(path.join(root,name)),read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const {make,cv}=require('./rework-integration-support.cjs'),{weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),prefix='tools/rework-weapon-layers-hd/';
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod(prefix+'index.json'),{makeCanvas:cv.createCanvas});
const weapon=Number(process.argv[2]),tone=process.argv[3]||'ebony';
assert([2,3,14,110].includes(weapon)&&['ebony','light'].includes(tone),'Specify a South twelve-state punch and appearance');
function tile(im){const c=cv.createCanvas(640,640);if(im)c.getContext('2d').drawImage(im,0,0);return c;}
async function main(){
 const api=make();await api.ready;
 const role=weapons.find(w=>w.id===weapon).role,equipment={weapon:{def:weapon}};
 const player=look.commit({classId:role,equipment},{gender:'masculino',skinColor:tone,hairColor:tone==='ebony'?'blue':'black',eyeColor:tone==='ebony'?'green':'blue',eyeStyle:'original',hairStyle:'original'},()=>true);
 const options={consumer:'world',action:'attack-unarmed',direction:'south'},select=p=>world.selectWorldHDOnly(api,catalog,p,options);
 const bare=select(player),clock=Array.from({length:12},(_,i)=>String(i));assert.deepEqual(bare.timeline,clock);
 const index=mod(prefix+'index.json'),ordered=index.orderedAttackProfiles.find(r=>r.id==='authored-ordered-14-south');
 const model=mod('tools/rework-base-hd/index.json').records.find(r=>r.id==='male-attack-unarmed-south-drawn8'),d=model.pack.directions.south;
 const heads=d.layers.filter(l=>['headBase','face','hair'].includes(l.slot)),images=new Map(),own=new Map();
 for(const l of heads)own.set(l.source,await load('tools/rework-base-hd/assets/'+l.source+'.png'));
 const mask=read(tile(own.get(heads.find(l=>l.slot==='hair').source)));
 const head=tile();for(const l of heads)head.getContext('2d').drawImage(own.get(l.source),0,0);const stockHead=read(head);head.width=1;
 const bald=tile(),apiBody=mod('player-rework-base-hd.js').create({schema:'rework-full-hd-v1',records:[]},{vendor:mod('tools/rework-accessories/vendor.js'),prefix:''});
 const bareHead={...model.pack,directions:{south:{...d,layers:heads.filter(l=>l.slot!=='hair')}}};
 apiBody.render(bald.getContext('2d'),{id:model.id,pack:bareHead,direction:'south',body:'male',sourceRefs:[...own.keys()]},own,
  {frame:0,makeCanvas:cv.createCanvas,appearance:{skin:tone,face:'original'}});
 const scalp=read(bald);bald.width=1;
 const masked=[];for(let i=0;i<mask.length;i+=4)if(mask[i+3])masked.push(i);
 assert(masked.length>4000);const samples=mod('player-rework-modular-outfits-hd.js').southIrisSamples();
 for(const [x,y] of samples)assert.equal(mask[(y*640+x)*4+3],0,'iris separately owned');
 // Independently recover the metal from the signed ordered body and item
 // registry. The neutral route may use the flattened original by itself.
 const colorWitness=look.commit({classId:role,equipment},{...player.appearance96,skinColor:'ebony'},()=>true);
 const layered=select(colorWitness);assert(layered.states.every(s=>s.layers.length===2));
 const body={...bare,states:bare.states.map((s,i)=>({...s,layers:[ordered.states[i].layers[0]]}))};
 for(const file of new Set([...weaponArt.requiredFiles(bare),...weaponArt.requiredFiles(body)]))images.set(file,await load(file));
 const refs=[];
 for(let f=0;f<12;f++){
  const plain=tile(),original=tile();
  const opts={frame:f,appearance:bare.colorAppearance};
  weaponArt.render(plain.getContext('2d'),body,images,opts);weaponArt.render(original.getContext('2d'),bare,images,opts);
  const raw=tile(await load(prefix+ordered.states[f].layers[0].url)),rawPixels=read(raw);raw.width=1;
  const metal=await load(prefix+layered.states[f].layers[1].url),metalTile=tile(metal),metalPixels=read(metalTile);metalTile.width=1;
  for(const i of masked){assert.equal(rawPixels.readUInt32LE(i),stockHead.readUInt32LE(i),'head identity at phase '+f);assert.equal(metalPixels[i+3],0,'metal in scalp');}
  refs.push({plain,original,metal,metalPixels});
 }
 const rules=mod('headgear-visibility.js'),art=mod('tools/rework-accessories/head-layer-index.json');
 const rows=[];
 for(const id of gear[4]){
  const wearer={...player,equipment:{...equipment,head:{def:id}}},r=select(wearer);
  assert.equal(r.slotRoutes.head.item,id);assert.equal(r.slotRoutes.weapon.item,weapon);assert.deepEqual(r.omitted,[]);
  assert.deepEqual(r.timeline,clock);assert.equal(r.action,options.action);assert.equal(r.direction,'south');
  const reg=global.MareOriginalHairHelmetsHD.create(art).resolve({body:'male',direction:'south',item:id});
  assert(r.slotRoutes.head.source.endsWith(reg.gear.source));const receipt=reg.sourceRecord,adjust=receipt.adjustmentRecord.adjustment;
  const prior=receipt.entry.pack.directions.south.headgearPolicy.headAdjustment||{},cx=Math.round(4*(d.rest.NECK.x-receipt.rest.NECK.x+(prior.x||0)+(adjust.gearX||0))),
   cy=Math.round(4*(d.rest.NECK.y-receipt.rest.NECK.y+(prior.y||0)+(adjust.gearY||0)));
  const helmet=await load('tools/rework-accessories/assets/'+reg.gear.source+'.png'),plane=tile();
  plane.getContext('2d').drawImage(helmet,cx,cy);const fabric=read(plane);plane.width=1;
  const bundle=await api.prepareConfiguration([{player:wearer,options}],{resolve:()=>({player:wearer,options,source:r})});
  try{for(let f=0;f<12;f++){
   const {plain,original,metal,metalPixels}=refs[f],ref=tile(original),ctx=ref.getContext('2d');
   const reveal=c=>{const x=c.getContext('2d'),im=x.getImageData(0,0,640,640);
    for(const i of masked)im.data.set(scalp.subarray(i,i+4),i);x.putImageData(im,0,0);};
   if(rules.resolve({def:id}).hideHair)reveal(ref);
   ctx.drawImage(helmet,cx,cy);
   const direct=ctx.getImageData(0,0,640,640),source=read(original),under=tile(plain),ux=under.getContext('2d');
   if(rules.resolve({def:id}).hideHair)reveal(under);
   ux.drawImage(helmet,cx,cy);const clothedBody=read(under),nakedBody=read(plain);ux.drawImage(metal,0,0);const orderedPixels=read(under);under.width=1;
   let changed=0,metalOverlap=0;
   for(let k=0;k<fabric.length;k+=4){
    if(fabric[k+3]&&metalPixels[k+3]){
     // A subpixel of cloth can round back to the original skin.
     // Preserve the signed flattened edge in that case (110/136, phase 1).
     if(metalPixels[k+3]===255||clothedBody.readUInt32LE(k)===nakedBody.readUInt32LE(k))direct.data.set(source.subarray(k,k+4),k);
     else direct.data.set(orderedPixels.subarray(k,k+4),k);metalOverlap++;
    }
    if(source.readUInt32LE(k)!==direct.data[k]+256*direct.data[k+1]+65536*direct.data[k+2]+16777216*direct.data[k+3])changed++;
   }
   let actual;assert(bundle.draw({save(){},restore(){},drawImage(c){actual=c;}},wearer,{...options,progress:(f+.25)/12}));
   const got=read(actual),expected=Buffer.from(direct.data);
   assert(got.equals(expected),'final raster '+weapon+'/'+id+'/'+f+'; first byte '+got.findIndex((v,i)=>v!==expected[i]));
   assert(changed>100);rows.push({item:id,phase:f,changed,metalOverlap});ref.width=1;
  }}finally{bundle.release();}
 }
 for(const b of refs){b.original.width=1;b.plain.width=1;}
 assert.equal(rows.length,120);if(process.env.HD_HEAD_RESULTS)fs.writeFileSync(process.env.HD_HEAD_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'complete phase comparisons',masked.length,'owned scalp pixels');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
