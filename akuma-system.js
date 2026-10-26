'use strict';
/* Akuma no Mi catalog and permanent compendium rules. Entries are append-only. */
((root) => {
  if(!root.MareNeko&&typeof module!=='undefined')require('./neko-system.js');
  if(!root.MareUshi&&typeof module!=='undefined')require('./ushi-system.js');
  if(!root.MareDoru&&typeof module!=='undefined')require('./doru-system.js');
  if(!root.MareWolf&&typeof module!=='undefined')require('./wolf-system.js');
  if(!root.MareAkumaPassives&&typeof module!=='undefined')require('./akuma-passives.js');
  if(!root.MareRankC&&typeof module!=='undefined')require('./rank-c-system.js');
  if(!root.MareRankCExpansion&&typeof module!=='undefined')require('./rank-c-expansion.js');
  if(!root.MareRankB&&typeof module!=='undefined')require('./rank-b-system.js');
  if(!root.MareHoya&&typeof module!=='undefined')require('./hoya-system.js');
  if(!root.MareJiki&&typeof module!=='undefined')require('./jiki-system.js');
  const ranks=Object.freeze(['E','D','C','B','A','S']);
  const slotsPerRank=5;
  // Keep in sync with assets/akuma/supa/rules.json (validated by regression tests).
  const supaRules={"radius":128,"duration":5000,"mitigation":0.4,"reflect":0.3,"skills":[{"key":"1","name":"Espiral Cortante","cooldown":10,"cost":20,"damage_multiplier":1.3,"damage_type":"physical","icon_path":"assets/akuma/supa/skill-1.png","description":"Corte físico instantâneo de 130% do ataque físico em todos os inimigos num raio de 2 tiles (128 px)."},{"key":"2","name":"Retaliação Metálica","cooldown":20,"cost":25,"damage_type":"physical","icon_path":"assets/akuma/supa/skill-2.png","description":"Durante 5s, reduz em 40% o dano físico recebido e devolve ao atacante 30% do dano original. O escudo acompanha o personagem."}]};
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
    new AkumaNoMiData('akuma_inu_dachshund','Inu-Inu no Mi: Dachshund','E','assets/akuma/zoan/inu-fruit.png',{evasion_percent:.10,physical_defense_percent:.03},'', 'assets/akuma/zoan/inu-skill-icon.png','',1,1,{family:'zoan',zoan_sprite_sheet:'assets/akuma/zoan/inu-idle-south.png'}),
    new AkumaNoMiData('akuma_supa_supa','Supa Supa no Mi','D','assets/akuma/supa/fruit.png',{},'','assets/akuma/supa/skill-1.png','',1,1,{family:'paramecia',skills:supaRules.skills}),
    new AkumaNoMiData('akuma_neko_leopard','Neko Neko no Mi: Modelo Leopardo','D','assets/akuma/neko/fruit.png',{},'','assets/akuma/neko/skill-1.png','',1,1,{family:'zoan',subtype:'Zoan Carnívora',zoan_sprite_sheet:'assets/akuma/neko/preview-south.png',skills:root.MareNeko.rules.skills,description:root.MareNeko.rules.description}),
    new AkumaNoMiData('akuma_ushi_giraffe','Ushi-Ushi no Mi: Modelo Girafa','D','assets/akuma/ushi/fruit.png',{},'','assets/akuma/ushi/skill-1.png','',1,1,{family:'zoan',zoan_sprite_sheet:'assets/akuma/ushi/preview-south.png',skills:root.MareUshi.rules.skills,description:root.MareUshi.rules.description}),
    new AkumaNoMiData('akuma_doru_doru','Doru Doru no Mi','D','assets/akuma/doru/fruit.png',{},'','assets/akuma/doru/skill-1.png','',1,1,{family:'paramecia',skills:root.MareDoru.rules.skills,description:root.MareDoru.rules.description}),
    new AkumaNoMiData('akuma_inu_wolf','Inu Inu no Mi: Modelo Lobo','D','assets/akuma/wolf/fruit.png',{},'','assets/akuma/wolf/skill-1.png','',1,1,{family:'zoan',subtype:'Zoan Carnívora',zoan_sprite_sheet:'assets/akuma/wolf/preview-south.png',skills:root.MareWolf.rules.skills,description:root.MareWolf.rules.description}),
    ...Object.entries(root.MareRankC.rules).map(([key,rule])=>new AkumaNoMiData(rule.id,rule.name,'C','assets/akuma/'+key+'/fruit.png',{},'','assets/akuma/'+key+'/skill-1.png','',1,1,{family:'paramecia',skills:rule.skills,description:rule.description})),
    ...Object.entries(root.MareRankCExpansion.rules).map(([key,rule])=>new AkumaNoMiData(rule.id,rule.name,'C','assets/akuma/'+key+'/fruit.png',{},'','assets/akuma/'+key+'/skill-1.png','',1,1,{family:rule.family,zoan_sprite_sheet:rule.family==='zoan'?'assets/akuma/bison/preview-south.png':null,skills:rule.skills,description:rule.description,isImmuneToExplosions:!!rule.isImmuneToExplosions})),
    ...Object.entries(root.MareRankB.rules).map(([key,r])=>new AkumaNoMiData(r.id,r.name,'B','assets/akuma/'+key+'/fruit.png',{},'','assets/akuma/'+key+'/skill-1.png','',1,1,{family:r.family,subtype:r.family==='logia'?'Logia':'Paramecia',skills:r.skills,description:r.description,physicalDamageReduction:r.physicalDamageReduction||0})),
    new AkumaNoMiData(root.MareHoya.rules.id,root.MareHoya.rules.name,'B','assets/akuma/hoya/fruit.png',{},'','assets/akuma/hoya/skill-1.png','',1,1,{family:'paramecia',subtype:'Paramecia',skills:root.MareHoya.rules.skills,description:root.MareHoya.rules.description}),
    new AkumaNoMiData(root.MareJiki.rules.id,root.MareJiki.rules.name,'B','assets/akuma/jiki/fruit.png',{},'','assets/akuma/jiki/skill-1.png','',1,1,{family:'paramecia',subtype:'Paramecia',skills:root.MareJiki.rules.skills,description:root.MareJiki.rules.description})
  ]);
  for(const fruit of catalog)if(root.MareAkumaPassives.stats[fruit.id])fruit.passiveStats={...root.MareAkumaPassives.stats[fruit.id]};
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
    if(data?.passiveStats)return {...data.passiveStats};
    const raw=data?.bonus_stats||item.bonus_stats||defs?.[item.def]?.bonus_stats||{};
    return Object.fromEntries(Object.entries(raw).filter(([key,value])=>/^(bonus_[a-z_]+|healing_received_percent|max_hp_percent|impact_resistance_percent|move_speed_percent|evasion_percent|physical_defense_percent)$/.test(key)&&Number.isFinite(value)).map(([key,value])=>[key,value]));
  }
  function applyGear(gear,item,defs,entries=catalog){
    if(!isFruit(item,defs))return gear;
    if(itemData(item,defs,entries)?.passiveStats)return gear;
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
  const legacySkill=(id)=>id==='akuma_kuku_kuku'?{key:'1',name:'Banquete Relâmpago',cooldown:15}:id==='akuma_beri_beri'?{key:'2',name:'Divisão Esférica',cooldown:18}:id==='akuma_tori_albatroz'?{key:'1',name:'Plano de Alta Altitude',cooldown:14}:id==='akuma_uma_uma'?{key:'2',name:'Arrancada Galopante',cooldown:12}:id==='akuma_inu_dachshund'?{key:'3',name:'Mordida de Calcanhar',cooldown:10}:null;
  const activeSkills=(id)=>byId(id)?.skills||(legacySkill(id)?[legacySkill(id)]:[]);
  const activeSkill=(id,key)=>activeSkills(id).find(skill=>key==null||skill.key===String(key))||null;
  const cooldownKey=(id,key)=>activeSkills(id).length>1?id+':'+key:id;
  function supaTargets(center,enemies){return enemies.filter(enemy=>enemy.alive!==false&&Number.isFinite(enemy.x)&&Number.isFinite(enemy.y)&&Math.hypot(enemy.x-center.x,enemy.y-center.y)<=supaRules.radius);}
  function retaliate(original,received,{active=false,physical=true,direct=false}={}){
    const enabled=active&&physical&&!direct&&original>0&&received>0;
    return {damage:enabled?received*(1-supaRules.mitigation):received,reflected:enabled?original*supaRules.reflect:0};
  }
  root.MareAkuma={ranks,slotsPerRank,AkumaNoMiData,catalog,byId,isZoan,isFruit,registered,slotsForRank,passiveCount,register,migrate,itemData,bonusStats,applyGear,activeSkill,activeSkills,cooldownKey,supaRules,supaTargets,retaliate};
  if(typeof module!=='undefined')module.exports=root.MareAkuma;
})(globalThis);
