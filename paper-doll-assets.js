'use strict';
/* Catalog only. Empty pieces are explicit missing assets, never invented artwork. */
((root)=>{
  const directions=['south','north','west','east'];
  const rig={id:'swordsman-v1',revision:1,frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:70/46,
    requiredSlots:['body','hair','outfit','weapon'],animations:{
      idle:{frames:4,fps:4,loop:true,directions},walk:{frames:8,fps:8,loop:true,directions},attack:{frames:8,fps:12,loop:false,directions}
    }};
  const definitions=[['prototype-body','body','Corpo-base'],['prototype-hair','hair','Cabelo'],['prototype-outfit','outfit','Roupa padrão'],['prototype-sword','weapon','Espada de Ferro Salgado'],
    ['prototype-sabre','weapon','Sabre de Coral'],['prototype-mist-coat','outfit','Casaco da Bruma'],['prototype-bandana','accessory','Bandana das Correntes']];
  const pieces=definitions.map(([id,slot,name])=>({id,name,slot,rigId:rig.id,revision:1,approved:false,available:false,animations:{},source:'missing; no modular source supplied'}));
  const defaults={body:'prototype-body',hair:'prototype-hair',outfit:'prototype-outfit',weapon:'prototype-sword'};
  const bindings={weapon:{slot:'weapon',items:{0:'prototype-sword',1:'prototype-sabre'}},coat:{slot:'outfit',items:{6:'prototype-outfit',7:'prototype-mist-coat'}},head:{slot:'accessory',items:{18:'prototype-bandana'}}};
  const reference={idle:{assetId:'pirate',action:'idle'},walk:{assetId:'pirate',action:'walk'},attack:{assetId:'pirate-sword',action:'attack'}};
  // A single human skeleton; action categories do not duplicate body identity by class/faction.
  const classes={
    sword:{name:'Espadachim',category:'sword',weapon:0},brawler:{name:'Lutador',category:'unarmed',weapon:2},
    gunner:{name:'Atirador',category:'firearm',weapon:4},rogue:{name:'Gatuno',category:'daggers',weapon:12},
    cyborg:{name:'Ciborgue',category:'tech',weapon:14},strategist:{name:'Estrategista Elemental',category:'focus',weapon:16},
    healer:{name:'Suporte',category:'focus',weapon:31}
  };
  const factions={pirate:{name:'Pirata'},marine:{name:'Marinheiro'},revolutionary:{name:'Revolucionário'},government:{name:'Governo Mundial'}};
  const categories={sword:'Espada',unarmed:'Punhos',firearm:'Arma de fogo',daggers:'Adagas',tech:'Tecnologia',focus:'Canalização'};
  const sharedRig={...rig,id:'human-v1',animations:{idle:{...rig.animations.idle},walk:{...rig.animations.walk},
    ...Object.fromEntries(Object.keys(categories).map(id=>['attack-'+id,{...rig.animations.attack}]))}};
  const weaponItems={0:['sword','Espada de Ferro Salgado'],1:['sword','Sabre de Coral'],2:['unarmed','Punhos de Bronze'],3:['unarmed','Luvas de Marfim'],
    4:['firearm','Mosquete de Convés'],5:['firearm','Mosquete dos Faróis'],12:['daggers','Adagas da Bruma'],13:['daggers','Lâminas Acrobáticas'],
    14:['tech','Manopla de Aço'],15:['tech','Canhão de Pulso'],16:['focus','Compasso de Tempestade'],17:['focus','Orbe das Correntes'],
    31:['focus','Cajado do Farol'],32:['focus','Relicário da Maré Viva']};
  const sharedDefinitions=[['human-body','body','Corpo humano comum'],['human-hair','hair','Cabelo comum'],
    ...Object.entries(factions).map(([id,f])=>['human-outfit-'+id,'outfit','Roupa · '+f.name]),
    ['human-coat-6','outfit','Casaco de Marinheiro'],['human-coat-7','outfit','Casaco da Bruma'],['human-head-18','accessory','Bandana das Correntes'],
    ...Object.entries(weaponItems).map(([id,[,name]])=>['human-weapon-'+id,'weapon',name])];
  const sharedPieces=sharedDefinitions.map(([id,slot,name])=>({id,slot,name,rigId:sharedRig.id,revision:1,approved:false,available:false,animations:{},source:'missing; no modular source supplied'}));
  const sharedBindings={weapon:{slot:'weapon',items:Object.fromEntries(Object.keys(weaponItems).map(id=>[id,'human-weapon-'+id]))},
    coat:{slot:'outfit',items:{6:'human-coat-6',7:'human-coat-7'}},head:{slot:'accessory',items:{18:'human-head-18'}}};
  // Equipment keys are existing save/inventory keys, not new gameplay slots.
  const equipmentLayers=Object.freeze({weapon:['weapon'],coat:['outfit'],legs:['pants'],boots:['boots'],gloves:['gloves'],cloak:['cloak'],head:['head','eyewear','accessory'],necklace:['necklace'],belt:['belt'],ring:['ring'],charm:['charm','accessory']});
  Object.values(equipmentLayers).forEach(Object.freeze);
  function equipmentBinding(pack,equipmentSlot,def){
    const allowed=equipmentLayers[equipmentSlot],binding=pack.bindings?.[equipmentSlot];
    if(!allowed||!binding?.items||!Object.hasOwn(binding.items,def))return [];
    const value=binding.items[def],layers=typeof value==='string'?{[binding.slot||allowed[0]]:value}:value?.layers;
    if(!layers||typeof layers!=='object'||Array.isArray(layers))return [];
    const entries=Object.entries(layers);
    if(!entries.length||entries.some(([slot,id])=>!allowed.includes(slot)||typeof id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(id)))return [];
    return entries.map(([slot,pieceId])=>({slot,pieceId}));
  }
  function equipmentBindings(pack){
    return Object.entries(pack.bindings||{}).flatMap(([equipmentSlot,binding])=>Object.keys(binding.items||{}).flatMap(def=>equipmentBinding(pack,equipmentSlot,def).map(entry=>({...entry,equipmentSlot,def}))));
  }
  function compatible(pack,piece,slot,{production=false}={}){
    if(!piece||piece.slot!==slot||piece.rigId!==pack.rig.id||piece.available!==true||piece.approved!==production)return false;
    return Object.entries(pack.rig.animations).every(([action,expected])=>{
      const clip=piece.animations?.[action],directions=pack.coverage?.[action]||expected.directions;
      return clip&&typeof clip.url==='string'&&clip.url.length>0&&clip.frames===expected.frames&&clip.fps===expected.fps&&clip.loop===expected.loop&&clip.frameWidth===pack.rig.frameWidth&&clip.frameHeight===pack.rig.frameHeight&&Array.isArray(clip.directions)&&new Set(clip.directions).size===clip.directions.length&&clip.directions.every(d=>expected.directions.includes(d))&&directions.every(d=>clip.directions.includes(d));
    });
  }
  function equipmentPieces(pack,player,{production=false,unavailablePieces=new Set()}={}){
    const pieces={},substitutions=[];
    for(const equipmentSlot of Object.keys(equipmentLayers)){
      if(equipmentSlot==='weapon')continue;
      const item=player?.equipment?.[equipmentSlot];if(!item)continue;
      const layers=equipmentBinding(pack,equipmentSlot,item.def);
      const usable=layers.length&&layers.every(({slot,pieceId})=>!unavailablePieces.has(pieceId)&&compatible(pack,pack.pieces.find(p=>p.id===pieceId),slot,{production}));
      const collision=layers.some(({slot,pieceId})=>pieces[slot]&&pieces[slot]!==pieceId);
      if(!usable||collision){substitutions.push({slot:equipmentSlot,def:item.def,reason:collision?'conflicting-layers':'missing-art'});continue;}
      for(const {slot,pieceId}of layers)pieces[slot]=pieceId;
    }
    return {pieces,substitutions};
  }
  const memo=new WeakMap();
  function eligible(player){return Object.hasOwn(classes,player?.classId)&&Object.hasOwn(factions,player?.factionId)&&!player?.zoanTransformed;}
  function profile(player){
    if(!eligible(player))return null;
    const c=classes[player.classId];
    return {rigId:sharedRig.id,bodyId:'human-body',hairId:'human-hair',outfitId:'human-outfit-'+player.factionId,weaponId:'human-weapon-'+c.weapon,
      category:c.category,classId:player.classId,factionId:player.factionId};
  }
  function usesBodyWeapon(player){return profile(player)?.category==='unarmed'&&(!player.equipment?.weapon||weaponItems[player.equipment.weapon.def]?.[0]==='unarmed');}
  function animationId(player,action){
    const p=profile(player);if(!p)return null;
    if(action==='idle'||action==='walk')return action;
    if(action==='attack')return 'attack-'+p.category;
    // Skills/hurt/death keep their real legacy animations until explicitly authored.
    return null;
  }
  function referenceFor(player,action){
    if(!eligible(player))return null;
    if(action==='idle'||action==='walk')return {assetId:player.factionId,action,animated:true};
    if(action==='attack'&&player.classId==='sword'&&player.factionId==='pirate')return {...reference.attack,animated:true};
    return {assetId:player.factionId,action:'idle',animated:false,note:'Ataque original indisponível; referência em repouso.'};
  }
  function appearance(player){
    const signature=JSON.stringify([player?.classId,player?.factionId,player?.zoanTransformed,...Object.keys(sharedBindings).map(s=>player?.equipment?.[s]?.def??null)]);
    if(player&&memo.get(player)?.signature===signature)return memo.get(player).value;
    const p=profile(player),value={rigId:sharedRig.id,pieces:p?{body:p.bodyId,hair:p.hairId,outfit:p.outfitId,weapon:p.weaponId}:{},blocked:[],category:p?.category||null};
    if(!p)value.blocked.push({slot:'body',pieceId:'',code:'unsupported-character'});
    for(const [equipmentSlot,binding]of Object.entries(sharedBindings)){
      const item=player?.equipment?.[equipmentSlot];if(!item)continue;
      const id=Object.hasOwn(binding.items,item.def)?binding.items[item.def]:null;
      if(equipmentSlot==='weapon'&&weaponItems[item.def]?.[0]!==p?.category){value.blocked.push({slot:'weapon',pieceId:String(item.def),code:'incompatible-weapon'});continue;}
      if(id)value.pieces[binding.slot]=id;
      else value.blocked.push({slot:binding.slot,pieceId:String(item.def),code:'unmapped-equipment'});
    }
    if(player)memo.set(player,{signature,value});return value;
  }
  function sample(runtime,player,action,direction,time,options={}){
    const id=animationId(player,action);return id?runtime.sample(sharedRig.id,id,direction,time,options):null;
  }
  function createRuntime(options){const runtime=root.MarePaperDoll.create(options);for(const r of [rig,sharedRig])runtime.registerRig(r);for(const p of [...pieces,...sharedPieces])runtime.registerPiece(p);return runtime;}
  const api={rig,pieces,defaults,bindings,reference,sharedRig,sharedPieces,sharedBindings,classes,factions,categories,weaponItems,equipmentLayers,equipmentBinding,equipmentBindings,equipmentPieces,compatible,profile,usesBodyWeapon,animationId,referenceFor,sample,appearance,eligible,createRuntime};root.MarePaperDollCatalog=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
