'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT');
const mod=file=>require(path.join(root,file));
mod('player-rework-sword0-checkpoint');
const {make}=require('./rework-integration-support.cjs'),{slots,gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const roles=[...new Set(weapons.map(w=>w.role))];assert.equal(roles.length,7);
const directions=['south','north','east','west'],actions=['idle','walk','attack-unarmed'], evidence=[];
const part=process.env.UNARMED_NAMED_DIRECTION;assert(!part||directions.includes(part));
const pigments=new Set(look.eyes.green.ramp.map(hex=>{
 const n=parseInt(hex.slice(1),16);return ((n>>16)&255)|(n&0xff00)|((n&255)<<16);
}));
const profiles=require(path.join(root,'player-rework-modular-outfits-hd.js'));
function irisPixels(before,after,direction,width){
 if(direction==='north')return 0;
 const profile=direction!=='south',anchors=profile?profiles.sideIrisSamples(direction):profiles.southIrisSamples();
 const seen=new Set(),offset=(width-(profile?512:640))/2;
 for(const [x,y] of anchors)for(let dy=-12;dy<=12;dy++){
  const j=(y+offset+dy)*width+x+offset;
  if((before[j]>>>24)===255&&pigments.has(before[j]&0xffffff)){
   assert.equal(after[j],before[j],'Saved green iris pixel changed when only the hairstyle changed');seen.add(j);
  }
 }
 assert(seen.size>=6,'Expected the signed visible iris');return seen.size;
}
async function main(){
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const rows=directions.filter(dir=>!part||dir===part);
 for(const direction of rows)for(const [i,action] of actions.entries()){
  const o={consumer:'world',action,direction};
  function study(role,style,eq){
   const p=look.commit({classId:role,equipment:Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]))},
    {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:style},()=>true);
   const r=world.selectWorldHDOnly(api,catalog,p,o),label=[role,style,direction,action,JSON.stringify(eq)].join('/');
   assert(r,label);assert.equal(r.resolvedAction||r.action,action,label);assert.equal(r.direction,direction,label);
   assert(!r.visualDegraded&&!r.appearanceAdapted,label);assert.deepEqual(r.omitted||[],[],label);
   for(const [slot,id] of Object.entries(eq)){assert.equal(r.slotRoutes?.[slot]?.item,id,label);assert.equal(r.slotRoutes[slot].quality,'hd',label);}
   return {p,r,label};
  }
  async function draw(entry){
   const {p,r,label}=entry,b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   try{
    assert.deepEqual(b.coverage[0].omitted||[],[],label);assert.equal(b.coverage[0].source,r.id);
    const count=b.coverage[0].frames,frames=[];
    for(let i=0;i<count;i++){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(i+.1)/count}),label);const width=r.pack.frame.width*r.pack.density,height=r.pack.frame.height*r.pack.density;
     assert.equal(r.pack.density,4);assert.equal(c.width,width,label);assert.equal(c.height,height,label);
     frames.push(new Uint32Array(c.getContext('2d').getImageData(0,0,width,height).data.buffer));}
    return frames;
   }finally{b.release();}
  }
  const namedBare=study('sword','hair-cropped',{}),originalBare=study('sword','original',{});
  assert.equal(namedBare.r.pack,originalBare.r.pack,'Named hair must use the same registered body motion');
  const missing=[],rolesPassed=[];
  for(const [k,role] of roles.entries()){
   for(const [s,slot] of slots.entries())for(const id of gear[s]){
    try{study(role,'hair-cropped',{[slot]:id});}catch(e){missing.push([role,slot,id,e.message.slice(0,180)]);}
   }
   const eq=Object.fromEntries(slots.map((s,n)=>[s,gear[n][(i+k+n)%gear[n].length]]));
   try{study(role,'hair-cropped',eq);rolesPassed.push(role);}catch(e){missing.push([role,'full',eq.head,e.message.slice(0,180)]);}
  }
  if(missing.length)console.error('selection gaps',direction,action,JSON.stringify(missing.slice(0,12)),missing.length);
  const equipment={coat:137,legs:133,boots:162,gloves:159},helmet=150;
  const styled=study('sword','hair-cropped',equipment),worn=study('sword','hair-cropped',{...equipment,head:helmet});
  const [original,changed,cap]=[await draw(study('sword','original',equipment)),await draw(styled),await draw(worn)];
  assert.equal(original.length,changed.length);assert.equal(changed.length,cap.length);
  let maxY=0,minimumHair=Infinity,minimumHelmet=Infinity,iris=0;
  for(let f=0;f<original.length;f++){
   iris+=irisPixels(original[f],changed[f],direction,styled.r.pack.frame.width*styled.r.pack.density);
   let hair=0,hat=0;
   for(let j=0;j<original[f].length;j++){const a=original[f][j]!==changed[f][j],b=changed[f][j]!==cap[f][j];if(!a&&!b)continue;
    if(a)hair++;if(b)hat++;maxY=Math.max(maxY,Math.floor(j/(styled.r.pack.frame.width*styled.r.pack.density)));}
   minimumHair=Math.min(minimumHair,hair);minimumHelmet=Math.min(minimumHelmet,hat);
   assert(hair>100&&hat>100,[direction,action,f,hair,hat]);}
  assert(maxY<styled.r.pack.pivot.y*4-210,[direction,action,maxY]);
  const row={direction,action,frames:original.length,selected:350-missing.filter(r=>r[1]!=='full').length,full:rolesPassed.length,maxY,minimumHair,minimumHelmet,iris,missing};
  evidence.push(row);console.log(JSON.stringify(row));global.gc?.();
 }
 if(process.env.WARDROBE_EVIDENCE)fs.writeFileSync(process.env.WARDROBE_EVIDENCE,JSON.stringify(evidence));
 assert.equal(evidence.length,rows.length*3);assert(evidence.every(r=>!r.missing.length),'All 50 equipment IDs and seven classes must pass');
}
main().catch(e=>{console.error(e);process.exitCode=1;});