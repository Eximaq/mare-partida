'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const atlas=mod('tools/rework-combat-wardrobe/index.json').orbGloves;
const weapon=Number(process.argv[2]),tone=process.argv[3]||'light';
assert([17,122].includes(weapon)&&['light','ebony'].includes(tone));
const tile=()=>cv.createCanvas(640,640);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(url,mirror,base){
 const c=tile(),x=c.getContext('2d');
 if(base){const im=x.createImageData(640,640);new Uint32Array(im.data.buffer).set(base);x.putImageData(im,0,0);}
 if(mirror){x.translate(640,0);x.scale(-1,1);}
 x.drawImage(await load(url),0,0);const out=pixels(c);c.width=1;return out;
}
async function main(){
 const api=make();await api.ready;
 const player=look.commit({classId:'strategist',equipment:{}},{gender:'masculino',skinColor:tone,hairColor:tone==='light'?'brown':'blue',
  eyeColor:tone==='light'?'brown':'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const raw={...player.appearance96,gender:'male'};delete raw.skinStyle;delete raw.version;
 const saved=JSON.stringify([raw,player.appearance96]),rows=[];
 for(const direction of ['east','west']){
  const options={action:'attack-focus',direction,consumer:'world'};
  async function pose(eq){
   const equipment=Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]));
   const p={...player,equipment},r=world.selectWorldHDOnly(api,catalog,p,options);
   assert(r&&!r.visualDegraded&&!r.appearanceAdapted);assert.deepEqual(r.omitted||[],[]);
   const legacy=world.selectWorldHDOnly(api,catalog,{...p,appearance96:raw},options);
   assert.deepEqual(legacy?.slotRoutes,r.slotRoutes);assert.deepEqual(legacy.timeline,r.timeline);
   for(const [slot,id] of Object.entries(eq))assert.equal(r.slotRoutes[slot].item,id);
   const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   function draw(f){
    let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(f+.1)/20}));
    assert.equal(api.snapshot().last.frame,Math.min(f,7));assert.equal(c.width,640);return pixels(c);
   }
   return {r,draw,release:()=>bundle.release()};
  }
  const fixed={weapon,head:19,coat:151,boots:169},bare=await pose({weapon}),dressed=await pose(fixed),base=[];
  assert.deepEqual(bare.r.timeline.map(Number),Array.from({length:20},(_,i)=>Math.min(i,7)));
  for(let f=0;f<8;f++){
   const s=bare.r.states[f],src='tools/rework-weapon-layers-hd/';
   const [metal,restore]=await Promise.all([s.layers[1].url,s.layers[2].mask.url].map(url=>plane(src+url,false)));
   base.push({bare:bare.draw(f),kit:dressed.draw(f),metal,restore});
  }
  assert.deepEqual(bare.draw(19),base[7].bare);
  for(const gloves of gear[3]){
   const solo=await pose({weapon,gloves}),kit=await pose({...fixed,gloves});
   assert.deepEqual(solo.r.slotRoutes.gloves,kit.r.slotRoutes.gloves);
   for(const slot of Object.keys(fixed))assert.deepEqual(dressed.r.slotRoutes[slot],kit.r.slotRoutes[slot]);
   for(let f=0;f<8;f++){
    const s=base[f],result=solo.draw(f),mixed=kit.draw(f);
    const image=(side,body)=>plane('tools/rework-combat-wardrobe/assets/'+atlas.items[gloves][side][f].art+'.png',direction==='west',body);
    const [left,right,onLeft,onRight]=await Promise.all([image('left'),image('right'),image('left',s.bare),image('right',s.bare)]);
    let palm=0,near=0,contacts=0,under=0,changed=0,withCoat=0;
    for(let i=0;i<result.length;i++){
     if(!left[i]&&!right[i]){assert.equal(result[i],s.bare[i]);assert.equal(mixed[i],s.kit[i]);continue;}
     assert(!(left[i]&&right[i]));
     if((s.restore[i]&255)||!s.metal[i]){
      assert.equal(result[i],left[i]?onLeft[i]:onRight[i]);if(left[i])palm++;else near++;
      if(s.restore[i]&255)contacts++;
     }else if(s.metal[i]>>>24===255){assert.equal(result[i],s.bare[i]);under++;}
     if(result[i]!==s.bare[i])changed++;if(mixed[i]!==s.kit[i])withCoat++;
    }
    assert(palm>100&&near>200&&changed>280&&withCoat>240,JSON.stringify({weapon,tone,direction,gloves,f,palm,near,changed,withCoat}));
    rows.push({direction,gloves,f,palm,near,contacts,under,changed,withCoat});
   }
   solo.release();kit.release();
  }
  bare.release();dressed.release();
 }
 assert.equal(rows.length,160);assert(rows.some(r=>r.contacts>0));assert(rows.some(r=>r.under>0));
 assert.equal(JSON.stringify([raw,player.appearance96]),saved);
 if(process.env.HD_ORB_GLOVE_RESULTS)fs.writeFileSync(process.env.HD_ORB_GLOVE_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'individual orb frames and 160 frames with coat, boots and helmet');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
