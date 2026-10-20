'use strict';
/* Akuma no Mi catalog and permanent compendium rules. Entries are append-only. */
((root) => {
  const ranks=Object.freeze(['E','D','C','B','A','S']);
  class AkumaNoMiData {
    constructor(id,name,rank,icon_path,bonus_stats,vfx_sprite_sheet){
      if(!id||!name||!ranks.includes(rank))throw Error('Akuma no Mi inválida');
      Object.assign(this,{id,name,rank,icon_path,bonus_stats:{...bonus_stats},vfx_sprite_sheet});
    }
  }
  // Add future batches of 3–5 AkumaNoMiData records here; no fruit is released yet.
  const catalog=Object.freeze([]);
  const byId=(id,entries=catalog)=>entries.find(fruit=>fruit.id===id)||null;
  const isFruit=(item,defs)=>!!item&&(item.type==='akuma_no_mi'||defs?.[item.def]?.type==='akuma_no_mi');
  function registered(game,entries=catalog){
    const ids=Array.isArray(game?.akumaCompendium)?game.akumaCompendium:[];
    return [...new Set(ids)].filter(id=>!!byId(id,entries));
  }
  const passiveCount=(game,entries=catalog)=>registered(game,entries).length;
  function register(game,id,entries=catalog){
    if(!byId(id,entries))return {ok:false,state:game};
    return {ok:true,state:{...game,akumaCompendium:[...new Set([...registered(game,entries),id])]}};
  }
  function migrate(game){return {...game,akumaCompendium:[...new Set((Array.isArray(game?.akumaCompendium)?game.akumaCompendium:[]).filter(id=>typeof id==='string'))]};}
  function itemData(item,defs,entries=catalog){return isFruit(item,defs)?byId(item.fruitId||defs?.[item.def]?.fruitId,entries):null;}
  function bonusStats(item,defs,entries=catalog){
    if(!isFruit(item,defs))return {};
    const data=itemData(item,defs,entries);
    const raw=data?.bonus_stats||item.bonus_stats||defs?.[item.def]?.bonus_stats||{};
    return Object.fromEntries(Object.entries(raw).filter(([key,value])=>/^bonus_[a-z_]+$/.test(key)&&Number.isFinite(value)).map(([key,value])=>[key,value]));
  }
  function applyGear(gear,item,defs,entries=catalog){
    if(!isFruit(item,defs))return gear;
    const stats=bonusStats(item,defs,entries),out={...gear,attributes:{...gear.attributes}};
    for(const [key,target] of Object.entries({bonus_attack:'attack',bonus_defense:'defense',bonus_hp:'hp',bonus_max_hp:'hp',bonus_energy:'energy',bonus_crit:'crit'}))out[target]=(out[target]||0)+(stats[key]||0);
    for(const key of ['strength','dexterity','vitality','intelligence','spirit'])out.attributes[key]=(out.attributes[key]||0)+(stats['bonus_'+key]||0);
    return out;
  }
  root.MareAkuma={ranks,AkumaNoMiData,catalog,byId,isFruit,registered,passiveCount,register,migrate,itemData,bonusStats,applyGear};
  if(typeof module!=='undefined')module.exports=root.MareAkuma;
})(globalThis);
