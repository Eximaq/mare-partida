/* Shared cosmetic policy. Never owns equipment, combat stats or storage. */
(function(root){
  'use strict';
  const policies=Object.freeze({18:Object.freeze({hairOcclusion:'none'}),19:Object.freeze({hairOcclusion:'all'})});
  const hidden=player=>player?.preferences?.hideHeadgear===true;
  function resolve(item,{hidden=false,model=null}={}){
    const id=typeof item==='object'?item?.def:item,equipped=id!==null&&id!==undefined&&id!=='original'&&id!=='none';
    const visible=equipped&&!hidden;
    const policy=model?.hairOcclusion??(typeof model?.hideHair==='boolean'?(model.hideHair?'all':'none'):policies[id]?.hairOcclusion??'none');
    const hairOcclusion=visible&&['none','all','crown'].includes(policy)?policy:'none';
    return {equipped,visible,hidden:hidden===true,hairOcclusion,hideHair:hairOcclusion==='all'};
  }
  function withPreference(player,value){
    if(!player||typeof value!=='boolean')return null;
    return {...player,preferences:{...player.preferences,hideHeadgear:value}};
  }
  function button(player){
    const state=resolve(player?.equipment?.head,{hidden:hidden(player)}),label=state.hidden?'Mostrar capacete':'Ocultar capacete';
    const eye=state.hidden?'<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.3A12 12 0 0 1 12 5c5 0 9 7 9 7a18 18 0 0 1-3.1 3.8M6.2 6.2A22 22 0 0 0 3 12s4 7 9 7a11 11 0 0 0 5-1.3"/>':'<path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3"/>';
    return `<button type="button" class="op-headgear-toggle${state.hidden?' is-hidden':''}" data-headgear-visibility aria-label="${label}" title="${state.equipped?label:'Equipe um item de cabeça'}" aria-pressed="${state.visible}" ${state.equipped?'':'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${eye}</svg></button>`;
  }
  const api={policies,hidden,resolve,withPreference,button};root.MareHeadgear=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
