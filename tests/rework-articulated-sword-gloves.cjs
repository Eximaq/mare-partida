'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const atlas=mod('tools/rework-combat-wardrobe/index.json').swordGloves;
const weapon=Number(process.argv[2]),tone=process.argv[3]||'light';
assert(weapons.filter(w=>w.role==='sword').map(w=>w.id).includes(weapon)&&['light','ebony'].includes(tone));
const cv640=()=>cv.createCanvas(640,640);
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(sha,bank,mirror,base){
 const c=cv640(),x=c.getContext('2d');
 if(base){const rgba=x.createImageData(640,640);new Uint32Array(rgba.data.buffer).set(base);x.putImageData(rgba,0,0);}
 if(mirror){x.translate(640,0);x.scale(-1,1);}
 x.drawImage(await load('tools/'+bank+'/assets/'+sha+'.png'),0,0);const out=read(c);c.width=1;return out;
}
async function main(){
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const player=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',
  skinColor:tone,hairColor:tone==='light'?'brown':'blue',eyeColor:tone==='light'?'brown':'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const saved=JSON.stringify(player.appearance96),rows=[];
 for(const direction of ['east','west']){
  const options={action:'attack-sword',direction,consumer:'world'};
  async function pose(eq){
   const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]))};
   const r=world.selectWorldHDOnly(api,catalog,p,options);assert.deepEqual(r.omitted||[],[]);
   if(Object.keys(eq).length>1)for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
   const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   return {r,draw(f){let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(f+.1)/8}));const pad=(r.nativeCanvas[0]-640)/2;assert.equal(c.width,640+2*pad);
    const ctx=c.getContext('2d'),rgba=ctx.getImageData(0,0,c.width,c.height).data;
    const px=new Uint32Array(rgba.buffer),hash=require('node:crypto').createHash('sha256');
    const stride=c.width,bytes=Buffer.from(rgba.buffer);
    if(pad){hash.update(bytes.subarray(0,4*pad*stride));hash.update(bytes.subarray(4*(pad+640)*stride));
     for(let y=pad;y<pad+640;y++){hash.update(bytes.subarray(4*y*stride,4*(y*stride+pad)));hash.update(bytes.subarray(4*(y*stride+pad+640),4*((y+1)*stride)));}}
    const core=new Uint32Array(640*640);for(let y=0;y<640;y++)core.set(px.subarray((y+pad)*stride+pad,(y+pad)*stride+pad+640),y*640);
    return {core,border:hash.digest('hex')};},release:()=>bundle.release()};
  }
  const fixed={head:19,coat:151,boots:169,weapon};
  const bare=await pose({weapon}),clothed=await pose(fixed),phases=[];
  const rig=bare.r.basePack?.pack,dir=rig?.directions[direction],native=url=>new URL(url,'https://test.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1);
  const maps=new Map();for(const [id,url] of Object.entries(bare.r.basePack?.images||{}))maps.set(id,await load(native(url)));
  const vendor=mod('tools/rework-accessories/vendor.js');
  const ordered=atlas.ordered[bare.r.id];
  assert(rig||ordered);
  for(let f=0;f<8;f++){
   if(ordered){
    const s=bare.r.states[f],pad=(bare.r.nativeCanvas[0]-640)/2;
    async function local(url){const c=cv640();c.getContext('2d').drawImage(await load(native(url)),-pad,-pad);const px=read(c);c.width=1;return px;}
    const metal=await local(s.layers[1].url),contact=await local(s.layers[2].mask.url);
    const cover=metal.map((v,k)=>(contact[k]&255)?0:v);
    phases.push({stock:bare.draw(f),dressed:clothed.draw(f),afterFar:cover,afterNear:cover});continue;
   }
   const at=bare.r.states[f].attachment,metal=cv640(),mx=metal.getContext('2d');
   mx.imageSmoothingEnabled=false;mx.save();mx.transform(...at.matrix);
   if(at.mirrorX){mx.translate(at.size[0],0);mx.scale(-1,1);}
   mx.drawImage(await load(native(at.url)),0,0);mx.restore();
   function over(depth,blade){
    const canvas=cv640(),x=canvas.getContext('2d');
    if(blade)x.drawImage(metal,0,0);
    vendor.compositor.render(x,{...rig,directions:{[direction]:{...dir,layers:dir.layers.filter(l=>l.depth>depth)}}},maps,
     {direction,frame:f,density:4,clear:false});const out=read(canvas);canvas.width=1;return out;
   }
   phases.push({stock:bare.draw(f),dressed:clothed.draw(f),afterFar:over(4,true),afterNear:over(6,false)});
   metal.width=1;
  }
  for(const gloves of gear[3]){
   const solo=await pose({weapon,gloves}),kit=await pose({...fixed,gloves});
   assert.deepEqual(solo.r.slotRoutes.gloves,kit.r.slotRoutes.gloves);
   for(const key of Object.keys(fixed))assert.deepEqual(clothed.r.slotRoutes[key],kit.r.slotRoutes[key]);
   for(let f=0;f<8;f++){
    const {stock,dressed,afterFar,afterNear}=phases[f],a=solo.draw(f),b=kit.draw(f);
    assert.equal(a.border,stock.border);assert.equal(b.border,dressed.border);
    const image=(side,base)=>{const row=atlas.items[gloves][side][f];
     const sha=side==='right'&&ordered?.phases[f].turned?row.turned:row.art;
     return plane(sha,'rework-combat-wardrobe',direction==='west',base);};
    const [far,near,farOnBody,nearOnBody]=await Promise.all([image('left'),image('right'),image('left',stock.core),image('right',stock.core)]);
    let farExact=0,nearExact=0,contacts=0,changed=0,mixed=0;
    for(let i=0;i<far.length;i++){
     const fa=far[i]>>>24,na=near[i]>>>24,actual=a.core[i],before=stock.core[i];
     if(!fa&&!na){assert.equal(actual,before);assert.equal(b.core[i],dressed.core[i]);continue;}
     if(fa&&!na&&!afterFar[i]){assert.equal(actual,farOnBody[i]);farExact++;}
     if(na&&!fa&&!afterNear[i]){assert.equal(actual,nearOnBody[i]);nearExact++;}
     if(fa&&!na&&(afterFar[i]>>>24)===255||ordered&&(fa||na)&&(afterNear[i]>>>24)===255){assert.equal(actual,before);contacts++;}
     if(actual!==before)changed++;if(b.core[i]!==dressed.core[i])mixed++;
    }
    assert(nearExact>120&&changed>200&&mixed>170,JSON.stringify({weapon,gloves,direction,f,farExact,nearExact,changed,mixed}));
    rows.push({direction,gloves,f,farExact,nearExact,contacts,changed,mixed});
   }
   solo.release();kit.release();
  }
  bare.release();clothed.release();
 }
 assert.equal(saved,JSON.stringify(player.appearance96));assert.equal(rows.length,160);
 assert(rows.some(r=>r.f===4&&r.farExact>120));assert(rows.some(r=>r.contacts>0));
 if(process.env.HD_SWORD_GLOVE_RESULTS)fs.writeFileSync(process.env.HD_SWORD_GLOVE_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'individual sword glove frames and 160 mixed frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
