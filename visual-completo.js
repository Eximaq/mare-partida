/* Complete visuals use the original inventory and equipment, without combat modifiers. */
(function(root){
 'use strict';
 const slot='visual_completo',id='visual_completo_zoro';
 const definition=Object.freeze({id,name:'Zoro — Visual Completo',slot,kind:'visual-completo',cosmeticOnly:true,requiredClass:'sword',
  description:'Substitui somente a aparência e as animações do personagem. Não concede atributos nem habilidades.',
  icon_path:'assets/skins/visual-completo/zoro/icon-96.png'});
 const isVisual=(item,defs)=>!!item&&defs?.[item.def]?.kind==='visual-completo'&&defs[item.def].slot===slot&&defs[item.def].id===id;
 function equip(player,itemId,defs){
  const item=player?.inventory?.find(i=>i.id===itemId);
  if(!isVisual(item,defs)||item.boundToCharacter&&item.boundToCharacter!==player.characterId)return {ok:false,error:'item_not_equippable'};
  if(player.classId!==defs[item.def].requiredClass)return {ok:false,error:'item_class_mismatch'};
  const previous=player.equipment?.[slot],inventory=player.inventory.filter(i=>i.id!==itemId);
  if(previous)inventory.push(previous);
  return {ok:true,state:{...player,inventory,equipment:{...player.equipment,[slot]:item}}};
 }
 function unequip(player,defs,capacity=120){
  const item=player?.equipment?.[slot];
  if(!isVisual(item,defs))return {ok:false,error:'equipment_empty'};
  if(player.inventory.length>=capacity)return {ok:false,error:'inventory_full'};
  return {ok:true,state:{...player,inventory:[item,...player.inventory],equipment:{...player.equipment,[slot]:null}}};
 }
 const api={slot,id,definition,isVisual,equip,unequip};
 root.MareVisualCompleto=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
