'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=async function({page,out,draw,walk,put,remove,observeAttack,captureMapCycle}){
 const gear={coat:137,legs:133,boots:162,gloves:159};
 const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'hair-cropped',eyeStyle:'original'};
 await page.evaluate(({items,look})=>__hdSlotQA.seedWardrobe('brawler',items,look),{items:[...Object.values(gear),18,19],look});
 for(const id of Object.values(gear))await put(id);
 const saved=await page.evaluate(()=>__hdSlotQA.read().appearance);
 for(const [key,value] of Object.entries(look))assert.equal(saved[key],value);
 for(const [direction,key,helmet] of [['west','a',18],['north','w',19]]){
  const label='desarmado-cabelo-curto-'+direction,worn={...gear,head:helmet};
  await page.evaluate(dir=>__hdSlotQA.target(dir),direction);
  await put(helmet);
  await walk(key,direction,worn,label+'-andando');
  await page.evaluate(({direction,worn})=>__hdSlotQA.startCycle('walk',direction,worn,true),{direction,worn});
  let phases=[];
  for(let i=0;i<5&&phases.length<16;i++){
   await page.evaluate(dir=>__hdSlotQA.lane(dir),direction);await page.keyboard.down(key);
   try{await page.waitForFunction(()=>__hdSlotQA.cycleFrames().length===16,null,{timeout:3000}).catch(()=>{});}
   finally{await page.keyboard.up(key);}
   phases=await page.evaluate(()=>__hdSlotQA.cycleFrames());
  }
  assert.deepEqual(phases,Array.from({length:16},(_,i)=>i),label+' walking cycle');
  const png=await page.evaluate(()=>__hdSlotQA.finishCycle());
  await fs.writeFile(path.join(out,label+'-caminhada.png'),Buffer.from(png.split(',')[1],'base64'));
  await draw(label+'-repouso','idle',direction,worn,true);
  const first=await observeAttack('attack-unarmed',label+'-soco',direction,worn);
  await captureMapCycle('attack-unarmed',worn,label+'-soco',8,direction,true);
  await remove('head');const bare=await observeAttack('attack-unarmed',label+'-sem-elmo',direction,gear);
  for(const slot of Object.keys(gear))assert.deepEqual(first.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
  await put(helmet);const back=await observeAttack('attack-unarmed',label+'-elmo-restaurado',direction,worn);
  assert.deepEqual(back.visual.coverage[0].slotRoutes,first.visual.coverage[0].slotRoutes);
  assert.deepEqual(await page.evaluate(()=>__hdSlotQA.read().appearance),saved);
  await remove('head');
 }
};
