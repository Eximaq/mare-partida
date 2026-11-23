'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {make}=require('./rework-integration-support.cjs');
const appearance=require('../character-appearance.js');
const world=require('../paper-doll-96-lobby.js');
const weapons=require('../tools/paper-doll-96-v3/weapons.json');
const root=process.env.HD_PUBLISHED_ROOT;
if(!root)throw Error('Set HD_PUBLISHED_ROOT to the built game directory');

const {records,targets}=require(path.resolve(root,'tools/rework-female-dagger-wardrobe/index.json'));
const visual=make();
const look=appearance.normalize({gender:'feminino',skinStyle:'natural',skinColor:'light',
 hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'});
const keys={pants:'legs',boots:'boots',gloves:'gloves'};
const actor=(weapon,rows)=>({classId:'rogue',appearance96:look,equipment:Object.fromEntries(
 [['weapon',{def:weapon}],...rows.map(r=>[keys[r.slot],{def:r.item}])])});
const select=(player,options)=>world.selectWorldHDOnly(visual,weapons,player,options);
function expected(r,rows,label){
 assert.equal(r?.action,'attack-daggers',label);
 assert.deepEqual(r.omitted??[],[],label);
 for(const row of rows){
  const slot=r.slotRoutes[keys[row.slot]];
  assert.equal(slot?.item,row.item,label);
  assert.equal(slot?.quality,'hd',label);
 }
}
async function prepare(player,options,source){
 const b=await visual.prepareConfiguration([{player,options}],{resolve:()=>({player,options,source})});
 assert.deepEqual(b.coverage[0].omitted,[],JSON.stringify(b.coverage[0].slotResolution));
 assert.equal(b.coverage[0].frames,8);
 return b;
}
function pixels(b,p,o,i){
 let img;
 assert(b.draw({save(){},restore(){},drawImage(c){img=c;}},p,{...o,progress:(i+.25)/8}));
 return img.getContext('2d').getImageData(0,0,img.width,img.height).data;
}
(async()=>{
 await visual.ready;
 const totals={solitary:0,pairs:0,triples:0,renderedCycles:0,renderedFrames:0,unchangedPhases:0};
 const issues=[];
 for(const key of Object.keys(targets).filter(k=>!process.env.HD_DAGGER_TARGET||k===process.env.HD_DAGGER_TARGET)){
  const [weapon,direction]=key.split('/'),id=Number(weapon),options={consumer:'world',direction,action:'attack-daggers'};
  const groups=Object.keys(keys).map(slot=>records.filter(r=>r.slot===slot&&r.direction===direction));
  assert.deepEqual(groups.map(g=>g.length),[10,10,10]);
  const one=[];
  for(const row of groups.flat()){
   const r=select(actor(id,[row]),options);expected(r,[row],key+' '+row.slot+'/'+row.item);
   one.push(r.slotRoutes[keys[row.slot]]);totals.solitary++;
  }
  const singles=new Map(groups.flat().map((row,i)=>[row,one[i]]));
  const check=rows=>{
   const label=key+' '+rows.map(r=>r.slot+'/'+r.item).join(' ');
   const r=select(actor(id,rows),options);expected(r,rows,label);
   for(const row of rows)assert.deepEqual(r.slotRoutes[keys[row.slot]],singles.get(row),label);
   assert.equal(select(actor(id,[...rows].reverse()),options).id,r.id,label);
  };
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++)
   for(const left of groups[a])for(const right of groups[b]){check([left,right]);totals.pairs++;}
  // Deterministic rotations cover every item with 20 two-slot surroundings per pose.
  for(let offset=0;offset<20;offset++)for(let i=0;i<10;i++){
   check([groups[0][i],groups[1][(i+offset)%10],groups[2][(i+Math.floor(offset/2))%10]]);
   totals.triples++;
  }
  // These static plates use a single anatomical projection across all six daggers.
  // Raster every direction/slot/item on weapon 73 and check every phase for visibility.
  if(id!==73||process.env.HD_SELECTION_ONLY)continue;
  const p=actor(id,[]),bare=await prepare(p,options,select(p,options));
  try{
   for(const row of groups.flat()){
    const q=actor(id,[row]),source=select(q,options);
    let drawn;
    try{
     drawn=await prepare(q,options,source);
     let visible=0;
     for(let i=0;i<8;i++){
      const a=pixels(drawn,q,options,i),b=pixels(bare,p,options,i);
      assert.equal(a.length,b.length);
      if(a.some((v,n)=>v!==b[n]))visible++;else totals.unchangedPhases++;
      totals.renderedFrames++;
     }
     if(!visible)issues.push({direction,slot:row.slot,item:row.item,reason:'no visible phases'});
     totals.renderedCycles++;
    }catch(error){
     issues.push({direction,slot:row.slot,item:row.item,reason:error.message});
    }finally{drawn?.release();}
   }
  }finally{bare.release();}
  global.gc?.();
 }
 console.log(JSON.stringify({totals,issues},null,2));
 assert.deepEqual(issues,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
