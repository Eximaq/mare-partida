'use strict';
const assert=require('node:assert/strict');
module.exports=async function({page,put,remove,observeAttack,captureMapCycle}){
 for(const [weapon,direction,head,phases] of [[115,'south',157,8],[4,'north',19,3],[114,'east',18,8],[116,'west',129,8]]){
  const role='gunner',action='attack-firearm';
  const look={gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'hair-cropped',eyeStyle:'original'};
  const gear={weapon,coat:130,legs:168,boots:148,gloves:159},label='cabelo-curto-disparo-'+weapon+'-'+direction;
  await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:[...Object.values(gear),head],look});
  for(const id of Object.values(gear))await put(id);
  const saved=await page.evaluate(()=>__hdSlotQA.read().appearance);
  for(const [key,value] of Object.entries(look))assert.equal(saved[key],value);
  const bare=await observeAttack(action,label+'-sem-elmo',direction,gear);
  await captureMapCycle(action,gear,label+'-sem-elmo',phases,direction,true);
  await put(head);
  const worn={...gear,head},fitted=await observeAttack(action,label+'-com-elmo',direction,worn);
  for(const slot of Object.keys(gear))assert.deepEqual(fitted.visual.coverage[0].slotRoutes[slot],bare.visual.coverage[0].slotRoutes[slot]);
  await captureMapCycle(action,worn,label+'-com-elmo',phases,direction,true);
  await remove('head');
  const restored=await observeAttack(action,label+'-retirado',direction,gear);
  assert.deepEqual(restored.visual.coverage[0].slotRoutes,bare.visual.coverage[0].slotRoutes);
  assert.deepEqual(await page.evaluate(()=>__hdSlotQA.read().appearance),saved);
 }
};