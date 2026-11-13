'use strict';
((root)=>{
 const protectedKinds=new Set(['visual-completo','pearl-box','epic-equipment-box','haki-fragment','akuma-fragment','weapon-fragment']);
 const quantity=item=>item?.quantity??item?.qty??1;
 const price=item=>Math.round(14+item.level*7+item.plus*18);
 function reason(item,defs,equipment={}){if(!item)return 'Item não encontrado';if(Object.values(equipment).some(i=>i?.id===item.id))return 'Item equipado';if(item.locked)return 'Item bloqueado';if(item.reserved)return 'Item reservado';if(!defs[item.def]||protectedKinds.has(defs[item.def].kind))return 'Este item não pode ser vendido ao NPC';return '';}
 function preview(state,ids,defs){const rows=[],seen=new Set();let error='';for(const id of ids){if(seen.has(id)){error='Seleção repetida';break;}seen.add(id);const item=state.inventory.find(i=>i.id===id);const problem=reason(item,defs,state.equipment);if(problem){error=problem;break;}const count=quantity(item),unitPrice=price(item);if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(unitPrice)||unitPrice<0){error='Quantidade ou preço inválido';break;}rows.push({itemId:id,quantity:count,unitPrice,name:defs[item.def].name,total:count*unitPrice});}if(!ids.length)error='Selecione ao menos um item';const total=rows.reduce((n,r)=>n+r.total,0),items=rows.map(({itemId,quantity,unitPrice})=>({itemId,quantity,unitPrice}));return {rows,items,total,error,fingerprint:JSON.stringify([items,error])};}
 const api={price,quantity,reason,preview};root.MareInventoryBatch=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
