'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n)),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const app=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const archive=mod('tools/rework-combat-wardrobe/index.json').southPunchGloves;
const weapon=Number(process.argv[2]),tone=process.argv[3];assert([2,3,14,110,111,118,119,120].includes(weapon)&&['ebony','light'].includes(tone));
const opt={consumer:'world',action:'attack-unarmed',direction:'south'},tile=()=>cv.createCanvas(640,640);
const colors=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function main(){
 const api=make();await api.ready;
 const actor=app.commit({classId:weapons.find(row=>row.id===weapon).role,equipment:{}},
  {gender:'masculino',skinColor:tone,hairColor:tone==='ebony'?'blue':'black',eyeColor:tone==='ebony'?'green':'blue'},()=>true);
 const saved=JSON.stringify(actor.appearance96),rows=[];
 const clock=[111,118,119,120].includes(weapon)?'0 0 1 1 2 2 3 3 4 4 5 5 6 6 7 8 9 10 11 11'.split(' '):Array.from({length:12},(_,f)=>String(f));
 async function pose(eq){
  const p={...actor,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
  const r=world.selectWorldHDOnly(api,catalog,p,opt);
  assert.deepEqual(r.omitted||[],[]);assert(!r.visualDegraded&&!r.appearanceAdapted);
  assert.deepEqual(r.timeline,clock);
  for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
  const bundle=await api.prepareConfiguration([{player:p,options:opt}],{resolve:()=>({player:p,options:opt,source:r})});
  function draw(f){let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...opt,progress:(clock.indexOf(String(f))+.1)/clock.length}));
   assert.equal(api.snapshot().last.frame,f);return colors(c);}
  return {r,draw,release:()=>bundle.release()};
 }
 const fixed={weapon,head:19,boots:169},bare=await pose({weapon}),kit=await pose(fixed),base=[];
 const proof=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
 const sources=proof.southPunchHeadLayers(bare.r);assert(sources);
 for(let f=0;f<12;f++){
  const c=tile(),x=c.getContext('2d');for(const url of sources.metal[f])x.drawImage(await load('tools/rework-weapon-layers-hd/'+url),0,0);
  base.push({bare:bare.draw(f),kit:kit.draw(f),metal:colors(c)});c.width=1;
 }
 for(const gloves of gear[3]){
  const solo=await pose({weapon,gloves}),dressed=await pose({...fixed,gloves});
  assert.deepEqual(solo.r.slotRoutes.gloves,dressed.r.slotRoutes.gloves);
  for(const slot of Object.keys(fixed))assert.deepEqual(kit.r.slotRoutes[slot],dressed.r.slotRoutes[slot]);
  for(let f=0;f<12;f++){
   const bareFrame=base[f],s=solo.draw(f),k=dressed.draw(f),c=tile(),x=c.getContext('2d');
   const images={},textures=[];
   for(const side of ['left','right']){
    const h=archive.items[gloves][side][f].art;
    const cloth=await load('tools/rework-combat-wardrobe/assets/'+h+'.png');
    textures.push(cloth);x.clearRect(0,0,640,640);x.drawImage(cloth,0,0);images[side]=colors(c);
   }
   const unoccluded=back=>{const im=x.createImageData(640,640);new Uint32Array(im.data.buffer).set(back);x.putImageData(im,0,0);for(const cloth of textures)x.drawImage(cloth,0,0);return colors(c);};
   const open=unoccluded(bareFrame.bare),openKit=unoccluded(bareFrame.kit);
   let visible=0,covered=0,near=0,far=0,neighbors=0,partial=0;
   for(let i=0;i<s.length;i++){
    const l=images.left[i],r=images.right[i],metal=bareFrame.metal[i],m=metal>>>24,cloth=l||r;
    if(!cloth){assert.equal(s[i],bareFrame.bare[i]);assert.equal(k[i],bareFrame.kit[i]);continue;}
    assert(!(l&&r),'Glove panels overlap');
    if(!m){assert.equal(s[i],open[i]);assert.equal(k[i],openKit[i]);if(l)far++;else near++;}
    if(m===255){assert.equal(s[i],bareFrame.bare[i]);assert.equal(k[i],bareFrame.kit[i]);covered++;}
    if(m>0&&m<255){
     if((bareFrame.bare[i]>>>24)===255&&(cloth>>>24)>192){
      const alpha=(cloth>>>24)/255,occlusion=m/255;
      for(const shift of [0,8,16]){
       const pigment=(cloth>>>shift)&255,hardware=(metal>>>shift)&255,old=(bareFrame.bare[i]>>>shift)&255;
       const expected=(1-alpha)*old+alpha*((1-occlusion)*pigment+occlusion*hardware);
       assert(Math.abs(((s[i]>>>shift)&255)-expected)<4,'Translucent metal must keep its own pigment');
      }
     }
     partial++;
    }
    if(s[i]!==bareFrame.bare[i])visible++;if(k[i]!==bareFrame.kit[i])neighbors++;
   }
   assert(visible>0&&neighbors>0&&far+near+covered+partial>220,JSON.stringify({weapon,gloves,f,visible,neighbors,far,near}));
   rows.push({gloves,f,visible,neighbors,covered,partial,near,far});c.width=1;
  }
  solo.release();dressed.release();
 }
 bare.release();kit.release();
 assert.equal(rows.length,120);assert(rows.some(r=>r.covered+r.partial>0));assert.equal(saved,JSON.stringify(actor.appearance96));
 if(process.env.HD_SOUTH_GLOVE_RESULTS)fs.writeFileSync(process.env.HD_SOUTH_GLOVE_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'individual and dressed frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
