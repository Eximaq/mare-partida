'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
module.exports=async({page,put,remove,menu,close,observeAttack,captureMapCycle})=>{
 const role='gunner',action='attack-firearm';
 for(const [weapon,direction,style,head,phases] of [[115,'south','hair-cropped',178,8],[114,'east','none',19,8]]){
  const look={gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'blue',hairStyle:style,eyeStyle:'face-calm'},
   gear={weapon,coat:130,legs:168,boots:148,gloves:159},worn={...gear,head},label='disparo-expressao-'+weapon+'-'+direction;
  await page.evaluate(({role,ids,look})=>__hdSlotQA.seedWardrobe(role,ids,look),{role,ids:Object.values(worn),look});
  for(const item of Object.values(worn))await put(item);
  const fitted=await observeAttack(action,label+'-com-elmo',direction,worn);await captureMapCycle(action,worn,label+'-com-elmo',phases,direction,true);
  if(style==='none'){
   await menu();await page.locator('[data-headgear-visibility]').click();await close();
   const hidden=await observeAttack(action,label+'-elmo-oculto',direction,gear);
   const state=await page.evaluate(()=>__hdSlotQA.read());assert.equal(state.equipment.head,19);assert(state.hideHead);
   await captureMapCycle(action,gear,label+'-elmo-oculto',phases,direction,true);
   for(const key of Object.keys(gear))assert.deepEqual(hidden.visual.coverage[0].slotRoutes[key],fitted.visual.coverage[0].slotRoutes[key]);
   await menu();await page.locator('[data-headgear-visibility]').click();await close();
  }
  await remove('head');const restored=await observeAttack(action,label+'-retirado',direction,gear);
  if(style==='none'){
   await captureMapCycle(action,gear,label+'-retirado',phases,direction,true);
   const capture=s=>fs.readFile(path.join(process.env.MARE_EVIDENCE_DIR,label+'-'+s+'-ciclo.png'));
   assert.deepEqual(await capture('retirado'),await capture('elmo-oculto'),'The same bald head must be drawn in all eight recoil frames');
  }
  const state=await page.evaluate(()=>__hdSlotQA.read());assert(!state.equipment.head);
  for(const [k,v] of Object.entries(look))assert.equal(state.appearance[k],v);
  for(const key of Object.keys(gear))assert.deepEqual(restored.visual.coverage[0].slotRoutes[key],fitted.visual.coverage[0].slotRoutes[key]);
 }
};
