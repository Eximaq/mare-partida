/* Complete visuals use the original inventory and equipment, without combat modifiers. */
(function(root){
 'use strict';
 const slot='visual_completo',id='visual_completo_zoro';
 const definition=Object.freeze({id,name:'Zoro — Visual Completo',slot,kind:'visual-completo',cosmeticOnly:true,requiredClass:'sword',
  description:'Substitui somente a aparência e as animações do personagem. Não concede atributos nem habilidades.',
  icon_path:'assets/skins/visual-completo/zoro/icon-96.png'});
 const luffyDefinition=Object.freeze({id:'visual_completo_luffy',name:'Luffy — Visual Completo',slot,kind:'visual-completo',cosmeticOnly:true,
  requiredClasses:Object.freeze(['sword','brawler','gunner','rogue','cyborg','strategist','healer']),
  description:'Substitui somente a aparência e as animações do personagem nas sete classes. Não concede atributos nem habilidades.',
  icon_path:'assets/skins/visual-completo/luffy/icon.png'});
 const definitions=[definition,luffyDefinition];
 const resolveDefinition=def=>def?.kind==='visual-completo'&&def.slot===slot?definitions.find(visual=>visual.id===def.id):null;
 const isVisual=(item,defs)=>!!item&&!!resolveDefinition(defs?.[item.def]);
 function canEquip(player,def){
  const visual=resolveDefinition(def);
  return !!visual&&(visual.requiredClass?player?.classId===visual.requiredClass:visual.requiredClasses.includes(player?.classId));
 }
 function equip(player,itemId,defs){
  const item=player?.inventory?.find(i=>i.id===itemId);
  if(!isVisual(item,defs)||item.boundToCharacter&&item.boundToCharacter!==player.characterId)return {ok:false,error:'item_not_equippable'};
  if(!canEquip(player,defs[item.def]))return {ok:false,error:'item_class_mismatch'};
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
 const api={slot,id,definition,luffyDefinition,isVisual,canEquip,equip,unequip};
 root.MareVisualCompleto=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
