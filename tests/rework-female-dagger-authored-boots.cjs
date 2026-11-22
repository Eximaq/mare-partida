'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const R=path.resolve(process.env.PROOF_STAGE||path.join(__dirname,'..'));
const {make,cv}=require(path.join(R,'tests/rework-integration-support.cjs'));
const {selectWorldHD}=require(path.join(R,'paper-doll-96-lobby.js'));
const A=require(path.join(R,'character-appearance.js'));
const catalog=require(path.join(R,'tools/paper-doll-96-v3/weapons.json'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const dirs=['north'];
const boots=[8,9,134,141,148,155,162,169,183],probe=process.env.BOOT?[Number(process.env.BOOT)]:[8,9,183],weapons=[12,13,71,72,73,74],api=make();
const select=(p,o)=>selectWorldHD(api,catalog,p,o);
const prep=(p,o)=>api.prepareConfiguration([{player:p,options:o}], {resolve:row=>({...row,source:select(row.player,row.options)})});
const paint=(b,p,o,f)=>{let c;assert(b.draw({save(){},restore(){},drawImage(q){c=q;}},p,{...o,progress:(f+.25)/8}));return new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);};
const rgbs=async (c,p,o)=>{const b=await prep(p,o);try{return Array.from({length:8},(_,f)=>paint(b,p,o,f));}finally{b.release();}};
(async()=>{await api.ready;let selected=0,frames=0;
 for(const direction of dirs)for(const weapon of weapons)for(const skinColor of Object.keys(A.skins)){
  const o={action:'attack-daggers',direction,consumer:'world'};
  const p=A.commit({classId:'rogue',equipment:{weapon:{def:weapon},coat:null,legs:null,boots:null,head:null,gloves:null}},
   {gender:'feminino',skinColor,...(skinColor==='ebony'?{hairColor:'blue',eyeColor:'green'}:{})},()=>true);
  const stock=select(p,o);assert(stock?.femaleDaggerSavedTones);
  for(const id of boots){const on={...p,equipment:{...p.equipment,boots:{def:id}}},before=JSON.stringify(on),r=select(on,o);
   assert.equal(r?.slotRoutes?.boots?.item,id,JSON.stringify({direction,weapon,skinColor,id}));
   assert.equal(r.slotRoutes.weapon.item,weapon);assert.equal(r.slotRoutes.boots.quality,'hd');
   assert.deepEqual(r.omitted,[]);assert.deepEqual(r.states,stock.states);
   assert.deepEqual(r.material,stock.material);assert.deepEqual(r.colorAppearance,stock.colorAppearance);
   for(const action of ['attack','skill'])assert.equal(select(on,{...o,action})?.slotRoutes?.boots?.item,id);
   assert.equal(select({...on,equipment:{...on.equipment,boots:{def:id,variant:'unverified'}}},o)?.slotRoutes?.boots,undefined);
   assert.equal(JSON.stringify(on),before);selected+=3;
  }
  // Full RGBA for all boots on reference W73; W12–74 weapon-material interaction
  // is proven separately from the receiving weapon's actual alpha projection.
  if(process.env.SELECT_ONLY||weapon!==73||!['light','ebony'].includes(skinColor)||process.env.TONE&&skinColor!==process.env.TONE)continue;
  const x=await rgbs(cv,p,o), sw=cv.createCanvas(640,640), sc=sw.getContext('2d');
  for(const id of probe){
   const on={...p,equipment:{...p.equipment,boots:{def:id}}},r=select(on,o),b=await prep(on,o);
   const layers=r.pack.directions[direction].layers.filter(l=>l.id.startsWith('adaga-overlap:boots:'+id+':'));
   assert.deepEqual(layers.map(l=>l.depth),[-1,.7]);try{for(let f=0;f<8;f++){
    sc.clearRect(0,0,640,640);for(const l of layers)sc.drawImage(await load('tools/rework-female-dagger-p22/assets/'+l.frames[f]+'.png'),0,0);
    const mask=new Uint32Array(sc.getImageData(0,0,640,640).data.buffer),y=paint(b,on,o,f);let delta=0;
    for(let j=0;j<y.length;j++)if(x[f][j]!==y[j]){assert(mask[j]>>>24,'modification outside the signed passes');delta++;}
    assert(delta>200,'boot not visible');frames++;
   }}finally{b.release();}global.gc?.();
  }
  // Same full frame after removing the piece, without mutating the save.
  const off=await prep(p,o);try{assert.deepEqual(paint(off,p,o,0),x[0]);}finally{off.release();}
  sw.width=1;global.gc?.();console.log(direction,skinColor,frames);
 }
 assert.equal(selected,dirs.length*weapons.length*boots.length*Object.keys(A.skins).length*3);
 assert.equal(frames,process.env.SELECT_ONLY?0:dirs.length*probe.length*(process.env.TONE?1:2)*8);
 console.log('PASS',selected,'World selector declarations,',frames,'Canvas poses on the exact material, equip and restore');
})().catch(e=>{console.error(e);process.exitCode=1});
