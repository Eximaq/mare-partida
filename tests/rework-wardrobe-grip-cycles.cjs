'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),baseDir=path.join(__dirname,'..');
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require(path.join(baseDir,'tests/rework-integration-support.cjs'));
const load=require(path.join(baseDir,'tools/rework-hd-test-loader.cjs')).create(root);
const {weapons}=require(path.join(baseDir,'tools/audit-hd-wardrobe-product.cjs'));
const look=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function compare(api,w,direction){
 const set={coat:{def:6},legs:{def:22},boots:{def:148},gloves:{def:159},head:{def:18}};
 const actor=look.commit({classId:weapons.find(a=>a.id===w).role,equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const o={direction,action:'attack-unarmed',consumer:'world'},opts=e=>({...actor,equipment:e});
 async function prepare(e){
  const p=opts(e),s=world.selectWorldHDOnly(api,catalog,p,o);assert(s&&!s.omitted?.length,'select '+w+'/'+direction+' '+JSON.stringify(e));
  const bundle=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:s})});
  const draw=i=>{let canvas;assert(bundle.draw({save(){},restore(){},drawImage(c){canvas=c;}},p,{...o,progress:(i+.25)/(s.timeline?.length||8)}));return canvas;};
  return {s,draw,release:()=>bundle.release()};
 }
 const gun={weapon:{def:w}},bare=await prepare({}),weapon=await prepare(gun),shirt=await prepare(set),armed=await prepare({...set,...gun});
 try{
  assert.deepEqual(armed.s.omitted,[]);
  for(const [slot,{def}] of Object.entries({...set,...gun}))assert.equal(armed.s.slotRoutes[slot].item,def);
  for(let phase=0;phase<8;phase++){
   const layers=weapon.s.states[phase].layers,stock=weapon.draw(phase),ref=cv.createCanvas(stock.width,stock.height),ctx=ref.getContext('2d');
   const drawMetal=async()=>{
    for(const part of layers){
     assert(['weapon-far','weapon-near','own-w117-metal','equipment'].includes(part.role));
     let im=await load('tools/rework-weapon-layers-hd/'+part.url),tile;
     if(part.cannonSideSupport){
      tile=cv.createCanvas(640,640);const x=tile.getContext('2d');x.drawImage(await load('tools/rework-weapon-layers-hd/'+part.mask.url),0,0);
      const data=x.getImageData(0,0,640,640);for(let j=0;j<data.data.length;j+=4)data.data[j+3]=data.data[j]?255:0;
      x.putImageData(data,0,0);x.globalCompositeOperation='source-in';x.drawImage(im,0,0);im=tile;
     }
     ctx.save();if(part.mirrorX){ctx.translate(ref.width,0);ctx.scale(-1,1);}ctx.drawImage(im,0,0);ctx.restore();
     if(tile)tile.width=tile.height=1;
    }
   };
   ctx.drawImage(bare.draw(phase),0,0);await drawMetal();
   assert(read(ref).equals(read(stock)),[w,direction,phase,'armed body and saved appearance'].join('/'));
   ctx.clearRect(0,0,ref.width,ref.height);ctx.drawImage(shirt.draw(phase),0,0);await drawMetal();
   assert(read(ref).equals(read(armed.draw(phase))),[w,direction,phase,'clothes under original hardware'].join('/'));
   ref.width=ref.height=1;
  }
  return 8;
 }finally{for(const v of [bare,weapon,shirt,armed])v.release();}
}
(async()=>{const api=make();await api.ready;await api.warmSwordCheckpoint();let phases=0;for(const [w,directions] of [[109,['east','west']],[15,['east','west']],[117,['north']]])for(const d of directions)phases+=await compare(api,w,d);assert.equal(phases,40);console.log(JSON.stringify({phases,comparisons:phases*2}));})().catch(e=>{console.error(e);process.exitCode=1});
