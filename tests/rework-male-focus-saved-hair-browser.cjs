'use strict';
const assert=require('node:assert/strict');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
module.exports=async function({page,put,remove,observeAttack,captureMapCycle}){
 const cases=process.argv.includes('--north-focus-hair')?[[17,'north',18,8],[121,'north',157,8]]:
  [[16,'east',18,8],[122,'west',164,8],[128,'north',19,9],[31,'south',143,8]];
 for(const [weapon,direction,head,phases] of cases){
  const role=weapons.find(w=>w.id===weapon).role,action='attack-focus';
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'hair-cropped',eyeStyle:'original'};
  const gear={weapon,coat:130,legs:168,boots:148,gloves:159},label='cabelo-curto-foco-'+weapon+'-'+direction;
  await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(gear),head],look});
  for(const id of Object.values(gear))await put(id);
  const saved=await page.evaluate(()=>__hdSlotQA.read().appearance);
  for(const [key,value] of Object.entries(look))assert.equal(saved[key],value);
  const bare=await observeAttack(action,label+'-sem-elmo',direction,gear);
  await captureMapCycle(action,gear,label+'-sem-elmo',phases,direction);
  await put(head);
  const worn={...gear,head},fitted=await observeAttack(action,label+'-com-elmo',direction,worn);
  for(const slot of Object.keys(gear))assert.deepEqual(fitted.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
  await captureMapCycle(action,worn,label+'-com-elmo',phases,direction);
  await remove('head');
  const restored=await observeAttack(action,label+'-retirado',direction,gear);
  assert.deepEqual(restored.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
  assert.deepEqual(await page.evaluate(()=>__hdSlotQA.read().appearance),saved);
 }
};