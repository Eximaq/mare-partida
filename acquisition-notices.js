'use strict';
/* Explicit receipt buffer only; never watches inventory or persisted saves. */
((root)=>{
 function create({limit=24,history=256}={}){
  const pending=new Map(),seen=new Set();const overflow=new Map();
  function push({id,gains=[]}={}){
   if(id&&seen.has(id))return false;if(id){seen.add(id);while(seen.size>history)seen.delete(seen.values().next().value);}
   for(const g of gains){if(!Number.isFinite(g.quantity)||g.quantity<=0)continue;
    const key=g.key||JSON.stringify([g.type,g.name,g.icon,g.rarity,g.binding,g.properties]);const old=pending.get(key);
    if(old){old.quantity+=g.quantity;continue;}if(pending.size>=limit){const kind=['berry','xp'].includes(g.type)?g.type:'items',old=overflow.get(kind);if(old)old.quantity+=g.quantity;else overflow.set(kind,kind==='items'?{type:'summary',name:'Unidades adicionais de itens recebidas',quantity:g.quantity,detail:'Itens diferentes; confira suas características nos espólios e na mochila.'}:{...g});continue;}pending.set(key,{...g,key});
   }return true;
  }
  function drain(max=Infinity){const rows=[];for(const [key,row] of pending){if(rows.length>=max)break;rows.push(row);pending.delete(key);}if(!pending.size)for(const [key,row] of overflow){if(rows.length>=max)break;rows.push(row);overflow.delete(key);}return rows;}
  return {push,drain,get size(){return pending.size+overflow.size;},get remembered(){return seen.size;}};
 }
 root.MareAcquisitionNotices={create};if(typeof module!=='undefined')module.exports=root.MareAcquisitionNotices;
})(globalThis);
