'use strict';
/* Akuma no Mi catalog and permanent compendium rules. Entries are append-only. */
((root) => {
  const ranks=Object.freeze(['E','D','C','B','A','S']);
  const slotsPerRank=5;
  class AkumaNoMiData {
    constructor(id,name,rank,icon_path,bonus_stats,vfx_sprite_sheet,skill_icon_path,skill_sprite_sheet,skill_frames=1,skill_columns=1,options={}){
      if(!id||!name||!ranks.includes(rank))throw Error('Akuma no Mi inválida');
      Object.assign(this,{id,name,rank,icon_path,bonus_stats:{...bonus_stats},vfx_sprite_sheet,skill_icon_path,skill_sprite_sheet,skill_frames,skill_columns,...options});
    }
  }
  const catalog=Object.freeze([
    new AkumaNoMiData('akuma_kuku_kuku','Kuku-Kuku no Mi','E','assets/akuma/kuku-icon.png',{healing_received_percent:.05,max_hp_percent:.03},'assets/akuma/kuku-aura.png','assets/akuma/kuku-skill-icon.png?v=grid-1','assets/akuma/kuku-skill-sheet.png?v=grid-1',9,3),
    new AkumaNoMiData('akuma_beri_beri','Beri-Beri no Mi','E','assets/akuma/beri-icon.png',{impact_resistance_percent:.15},'assets/akuma/beri-aura.png','assets/akuma/beri-skill-icon.png?v=grid-1','assets/akuma/beri-skill-sheet.png?v=grid-1',17,5),
    new AkumaNoMiData('akuma_tori_albatroz','Tori-Tori no Mi: Albatroz','E','assets/akuma/zoan/tori-fruit.png',{move_speed_percent:.12,evasion_percent:.05},'', 'assets/akuma/zoan/tori-skill-icon.png','',1,1,{family:'zoan',zoan_sprite_sheet:'assets/akuma/zoan/tori-idle-south.png'}),
    new AkumaNoMiData('akuma_uma_uma','Uma-Uma no Mi','E','assets/akuma/zoan/uma-fruit.png',{move_speed_percent:.15,max_hp_percent:.03},'', 'assets/akuma/zoan/uma-skill-icon.png','',1,1,{family:'zoan',zoan_sprite_sheet:'assets/akuma/zoan/uma-idle-south.png'}),
    new AkumaNoMiData('akuma_inu_dachshund','Inu-Inu no Mi: Dachshund','E','assets/akuma/zoan/inu-fruit.png',{evasion_percent:.10,physical_defense_percent:.03},'', 'assets/akuma/zoan/inu-skill-icon.png','',1,1,{family:'zoan',zoan_sprite_sheet:'assets/akuma/zoan/inu-idle-south.png'})
  ]);
  const byId=(id,entries=catalog)=>entries.find(fruit=>fruit.id===id)||null;
  const isZoan=(fruit)=>fruit?.family==='zoan';
  const isFruit=(item,defs)=>!!item&&(item.type==='akuma_no_mi'||defs?.[item.def]?.type==='akuma_no_mi');
  function registered(game,entries=catalog){
    const ids=Array.isArray(game?.akumaCompendium)?game.akumaCompendium:[];
    return [...new Set(ids)].filter(id=>!!byId(id,entries));
  }
  const passiveCount=(game,entries=catalog)=>registered(game,entries).length;
  function slotsForRank(game,rank,entries=catalog){
    if(!ranks.includes(rank))return [];
    const owned=new Set(registered(game,entries));
    const fruits=entries.filter(fruit=>fruit.rank===rank);
    return Array.from({length:Math.max(slotsPerRank,fruits.length)},(_,index)=>{
      const fruit=fruits[index];
      return {index:index+1,fruit:fruit&&owned.has(fruit.id)?fruit:null};
    });
  }
  function register(game,id,entries=catalog){
    if(!byId(id,entries))return {ok:false,state:game};
    return {ok:true,state:{...game,akumaCompendium:[...new Set([...registered(game,entries),id])]}};
  }
  function migrate(game){return {...game,akumaCompendium:[...new Set((Array.isArray(game?.akumaCompendium)?game.akumaCompendium:[]).filter(id=>typeof id==='string'))],zoanTransformed:!!game?.zoanTransformed&&isZoan(byId(game?.equipment?.akuma_no_mi?.fruitId))};}
  function itemData(item,defs,entries=catalog){return isFruit(item,defs)?byId(item.fruitId||defs?.[item.def]?.fruitId,entries):null;}
  function bonusStats(item,defs,entries=catalog){
    if(!isFruit(item,defs))return {};
    const data=itemData(item,defs,entries);
    const raw=data?.bonus_stats||item.bonus_stats||defs?.[item.def]?.bonus_stats||{};
    return Object.fromEntries(Object.entries(raw).filter(([key,value])=>/^(bonus_[a-z_]+|healing_received_percent|max_hp_percent|impact_resistance_percent|move_speed_percent|evasion_percent|physical_defense_percent)$/.test(key)&&Number.isFinite(value)).map(([key,value])=>[key,value]));
  }
  function applyGear(gear,item,defs,entries=catalog){
    if(!isFruit(item,defs))return gear;
    const stats=bonusStats(item,defs,entries),out={...gear,attributes:{...gear.attributes}};
    for(const [key,target] of Object.entries({bonus_attack:'attack',bonus_defense:'defense',bonus_hp:'hp',bonus_max_hp:'hp',bonus_energy:'energy',bonus_crit:'crit'}))out[target]=(out[target]||0)+(stats[key]||0);
    for(const key of ['strength','dexterity','vitality','intelligence','spirit'])out.attributes[key]=(out.attributes[key]||0)+(stats['bonus_'+key]||0);
    out.healingReceivedPercent=(out.healingReceivedPercent||0)+(stats.healing_received_percent||0);
    out.maxHpPercent=(out.maxHpPercent||0)+(stats.max_hp_percent||0);
    out.impactResistancePercent=(out.impactResistancePercent||0)+(stats.impact_resistance_percent||0);
    out.moveSpeedPercent=(out.moveSpeedPercent||0)+(stats.move_speed_percent||0);
    out.evasionPercent=(out.evasionPercent||0)+(stats.evasion_percent||0);
    out.physicalDefensePercent=(out.physicalDefensePercent||0)+(stats.physical_defense_percent||0);
    return out;
  }
  const activeSkill=(id)=>id==='akuma_kuku_kuku'?{key:'1',name:'Banquete Relâmpago',cooldown:15}:id==='akuma_beri_beri'?{key:'2',name:'Divisão Esférica',cooldown:18}:id==='akuma_tori_albatroz'?{key:'1',name:'Plano de Alta Altitude',cooldown:14}:id==='akuma_uma_uma'?{key:'2',name:'Arrancada Galopante',cooldown:12}:id==='akuma_inu_dachshund'?{key:'3',name:'Mordida de Calcanhar',cooldown:10}:null;
  root.MareAkuma={ranks,slotsPerRank,AkumaNoMiData,catalog,byId,isZoan,isFruit,registered,slotsForRank,passiveCount,register,migrate,itemData,bonusStats,applyGear,activeSkill};
  if(typeof module!=='undefined')module.exports=root.MareAkuma;
})(globalThis);
