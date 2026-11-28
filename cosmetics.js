/* Cosmetic ownership and slot selection shared by the client and server. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MareCosmetics=api;
})(globalThis,()=>{
  'use strict';
  const slots=Object.freeze(['head','coat','legs','gloves','boots','weapon']);
  const artRoot='assets/ui/cosmetics/east-blue/';
  const definitions=Object.freeze([
    {id:'east-blue-hat',slot:'head',layer:'hat',name:'Chapéu de Palha do Alísio',description:'Palha trançada com faixa rubra para as primeiras travessias.'},
    {id:'east-blue-vest',slot:'coat',layer:'vest',name:'Colete Rubro da Aurora',description:'Colete aberto de lona escarlate, com fechos de latão.'},
    {id:'east-blue-shorts',slot:'legs',layer:'shorts',name:'Bermuda de Lona Índigo',description:'Lona azul com barras viradas e costuras reforçadas.'},
    {id:'east-blue-sandals',slot:'boots',layer:'sandals',name:'Sandálias do Convés',description:'Sandálias de sola trançada e tiras cruzadas de couro.'},
    {id:'straw-hat-v3',slot:'head',layer:'hat-v3',name:'Chapéu de Palha',description:'Chapéu de palha trançada com faixa vermelha.',grantOnly:true,icon:'assets/player-cosmetics/straw-hat-v3/icon.png'},
  ].map(item=>Object.freeze({...item,kind:'cosmetic',body:'masculino',binding:item.binding??null,icon:item.icon??artRoot+item.layer+'.png'})));
  const byId=new Map(definitions.map(item=>[item.id,item]));
  const demoIds=Object.freeze(definitions.filter(item=>!item.grantOnly).map(item=>item.id));
  const get=id=>byId.get(id);
  function available(item,appearance){
    const body=['feminino','female'].includes(appearance?.gender??appearance?.body)?'feminino':'masculino';
    return !!item&&(!item.body||item.body===body);
  }
  const supportsDemo=appearance=>demoIds.every(id=>available(get(id),appearance));
  function visualSelection(value){
    const result={};
    for(const slot of slots){
      const id=value?.[slot];
      if(get(id)?.slot===slot)result[slot]=id;
    }
    return result;
  }
  function normalize(state){
    const owned=Array.isArray(state?.owned)?[...new Set(state.owned.filter(id=>get(id)))]:[];
    const equipped=Object.fromEntries(Object.entries(visualSelection(state?.equipped)).filter(([,id])=>owned.includes(id)));
    return {owned,equipped,demoClaimed:state?.demoClaimed===true};
  }
  function fail(code){throw Object.assign(new Error(code),{code});}
  function execute(state,action,payload={},appearance){
    const next=normalize(state);
    switch(action){
      case 'cosmetics.claim-demo':
        if(!supportsDemo(appearance))fail('cosmetic_body_unsupported');
        if(next.demoClaimed)return next;
        return {...next,owned:[...new Set([...next.owned,...demoIds])],demoClaimed:true};
      case 'cosmetics.equip':{
        const item=get(payload.cosmeticId);
        if(!item)fail('cosmetic_unknown');
        if(!available(item,appearance))fail('cosmetic_body_unsupported');
        if(!next.owned.includes(item.id))fail('cosmetic_not_owned');
        return {...next,equipped:{...next.equipped,[item.slot]:item.id}};
      }
      case 'cosmetics.unequip':
        if(!slots.includes(payload.slot))fail('cosmetic_slot_invalid');
        delete next.equipped[payload.slot];
        return next;
      default:fail('cosmetic_action_invalid');
    }
  }
  return Object.freeze({definitions,slots,demoIds,get,available,supportsDemo,visualSelection,normalize,execute});
});
