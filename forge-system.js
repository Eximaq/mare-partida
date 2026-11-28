'use strict';
/* Pure, versioned forge transitions. RNG and expected revision are explicit inputs. */
((root)=>{
  const VERSION=5,CAPACITY=120,keys=['strength','dexterity','vitality','intelligence','spirit'];
  const rarity=Object.freeze({common:{name:'Comum',color:'#9b968b',extras:1,sockets:0,mult:1},uncommon:{name:'Incomum',color:'#62ac7c',extras:2,sockets:1,mult:1.3},rare:{name:'Raro',color:'#65a7d6',extras:3,sockets:2,mult:1.7},epic:{name:'Épico',color:'#b182db',extras:4,sockets:3,mult:2.4},legendary:{name:'Lendário',color:'#e7c64c',extras:5,sockets:4,mult:4},supreme:{name:'Supremo',color:'#e66c62',extras:6,sockets:5,mult:6}});
  const names={strength:'Força',dexterity:'Destreza',vitality:'Vitalidade',intelligence:'Inteligência',spirit:'Espírito',hp:'Vida',energy:'Energia',crit:'Crítico',attackSpeedPercent:'Velocidade de ataque',critDamage:'Dano crítico'};
  const short={strength:'for',dexterity:'des',vitality:'vit',intelligence:'int',spirit:'esp'};
  const pearls=Object.freeze(keys.flatMap(attribute=>Array.from({length:5},(_,i)=>Object.freeze({id:`pearl_${short[attribute]}_${i+1}`,name:`Pérola de ${names[attribute]} Nv.${i+1}`,attribute,level:i+1,percent:(i+1)*.02,multiplier:1+(i+1)*.02,rarity:['common','uncommon','rare','epic','legendary'][i]}))));
  const pearlById=Object.fromEntries(pearls.map(p=>[p.id,p]));
  const refinement=Object.freeze({
    max:20,
    guaranteed:1,
    chances:Object.freeze([1,.70,.68,.66,.64,.62,.60,.58,.56,.55,.54,.53,.52,.51,.50,.49,.48,.47,.46,.45]),
    fragmentCosts:Object.freeze([10,12,15,18,22,27,33,40,48,57,67,78,90,103,117,132,148,165,183,202])
  });
  // The legacy materials field is the only stored stack for this character-bound
  // resource. A saved Ferro Salgado balance is already the 1:1 fragment quantity.
  const itemFragment=Object.freeze({
    id:'item_fragment',name:'Fragmento de Item',category:'materials',rarity:'common',binding:'character',
    iconKey:'material',iconPath:'assets/ui/items-hd/material.png',
    description:'Obtido ao desmontar equipamentos. Utilizado para aprimorar itens na forja.'
  });
  const fragmentYield=Object.freeze({common:2,uncommon:5,rare:10,epic:20,legendary:35,supreme:60});
  const fragmentCapacity=1_000_000_000;
  const refinementBonuses=[[0,0,0],[.012,.01,.01],[.025,.025,.025],[.04,.04,.04],[.055,.05,.05]];
  function refinementBonus(plus){
    const level=Math.min(refinement.max,int(plus)),step=Math.floor(level/5),fraction=(level%5)/5;
    const base=refinementBonuses[step],next=refinementBonuses[step+1]||base;
    return base.map((value,i)=>value+(next[i]-value)*fraction);
  }
  const fusion=Object.freeze([{chance:.8,gold:40},{chance:.5,gold:160},{chance:.1,gold:650},{chance:.05,gold:2500}]);
  const int=n=>Number.isSafeInteger(n)&&n>=0?n:0,clone=v=>JSON.parse(JSON.stringify(v));
  function draw(random){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('RNG inválido');return n;}
  function range(lo,hi,random){return lo+Math.floor(draw(random)*(hi-lo+1));}
  const normalRarityScale=1000,legendaryLootMinLevel=100,legendaryRarityWeight=25;
  const worldMonsterAtLeast=(monster,level)=>monster?.source==='world'&&monster.level>=level;
  function rarityFromRoll(n,monster){
    if(!Number.isInteger(n)||n<1||n>normalRarityScale)throw Error('Roleta inválida');
    // The 12% gear gate makes 25 of these 1,000 outcomes 0.3% per kill.
    // Shift the thresholds so only common gives up that weight.
    if(worldMonsterAtLeast(monster,legendaryLootMinLevel))n+=legendaryRarityWeight;
    return n<=600?'common':n<=850?'uncommon':n<=950?'rare':n<=normalRarityScale?'epic':'legendary';
  }
  const rollRarity=(random=Math.random,monster)=>rarityFromRoll(range(1,normalRarityScale,random),monster);
  function seeded(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  const isGear=(item,defs)=>!!item&&!!defs[item.def]&&!defs[item.def].kind&&defs[item.def].type!=='akuma_no_mi'&&item.type!=='akuma_no_mi'&&!item.pearlId;
  const hitsPerPercent = 1000;
  const maxDurability = 100 * hitsPerPercent;
  const repairWeights = Object.freeze({weapon:25,coat:18,legs:12,head:10,gloves:8,boots:8,cloak:6,belt:4,necklace:3,ring:3,charm:3});
  const repairRarity = Object.freeze({common:100,uncommon:120,rare:150,epic:180,legendary:220,supreme:270});
  const durabilityOf = item => Number.isSafeInteger(item?.durability) ? Math.max(0,Math.min(maxDurability,item.durability)) : maxDurability;
  const hasDurability = (item,defs) => isGear(item,defs) && Object.hasOwn(repairWeights,defs[item.def].slot);

  const points = [[0,.50,.75],[20,.70,.85],[40,.85,.925],[50,.90,.95],[60,.95,.975],[80,1,1]];
  function efficiency(item) {
    const condition = durabilityOf(item) / hitsPerPercent;
    if (condition >= 80) return {attack:1,defense:1};
    const i = points.findIndex(point => condition < point[0]);
    const [from, attack, defense] = points[i-1];
    const [to, nextAttack, nextDefense] = points[i];
    const weight = (condition-from)/(to-from);
    return {attack:attack+(nextAttack-attack)*weight,defense:defense+(nextDefense-defense)*weight};
  }

  function repairCost(item,defs) {
    if (!hasDurability(item,defs)) return 0;
    const def = defs[item.def];
    const level = BigInt(Math.max(1,int(item.level)));
    const base = 12000n + 1000n*level + 20n*level*level;
    const denominator = 10000n*BigInt(maxDurability);
    const numerator = base * BigInt(repairRarity[item.rarity] ?? repairRarity[def.rarity] ?? 100)
      * BigInt(repairWeights[def.slot]) * BigInt(maxDurability-durabilityOf(item));
    return Number((numerator + denominator - 1n)/denominator);
  }

  function repairPlan(game,type,id,defs) {
    const equipment = game.equipment || {};
    const selected = type==='repairAll' ? Object.values(equipment) : [find(game,id)];
    const items = selected.filter(item=>hasDurability(item,defs) && durabilityOf(item)<maxDurability &&
      (!item.boundToCharacter||item.boundToCharacter===game.characterId))
      .map(item=>({item,cost:repairCost(item,defs)}))
      .sort((a,b)=>a.item.id.localeCompare(b.item.id,'en'));
    return {items,total:items.reduce((sum,entry)=>sum+entry.cost,0)};
  }

  function beginWear(equipment,defs) {
    return {ids:Object.entries(equipment||{}).filter(([slot,item])=>hasDurability(item,defs)&&defs[item.def].slot===slot).map(([,item])=>item.id),confirmed:false};
  }

  function confirmWear(action,game,defs) {
    if (!action || action.confirmed) return false;
    action.confirmed = true;
    const ids = new Set(action.ids);
    let changed=false;
    const wear=item=>{
      if (!item||!ids.delete(item.id)||!hasDurability(item,defs)) return;
      const units=durabilityOf(item);
      if(units===0)return;
      item.durability=units-1;
      changed=true;
    };
    for(const item of Object.values(game.equipment||{}))wear(item);
    if(ids.size)for(const item of game.inventory||[]){
      wear(item);
      if(!ids.size)break;
    }
    return changed;
  }

  function isPearl(item,defs){return !!item&&(!!item.pearlId||defs[item.def]?.kind==='pearl');}
  function pearlOf(item,defs){return pearlById[item?.pearlId||defs[item?.def]?.pearlId]||null;}
  function extraRange(level,r){const f=Math.sqrt(rarity[r].mult);return {min:Math.ceil((.8+level*.14)*f),max:Math.ceil((2+level*.30)*f)};}
  function rollExtras(item,def,random){
    const r=rarity[item.rarity],bounds=extraRange(item.level,item.rarity);
    const pool=[...(def.extraPool||[...keys,'hp','energy','crit'])].filter(k=>!(def.slot==='weapon'&&(def.type==='strategist'||def.type==='healer'?k==='strength':k==='intelligence')));
    return Array.from({length:r.extras},()=>{const stat=pool.splice(range(0,pool.length-1,random),1)[0];let value=range(bounds.min,bounds.max,random);if(stat==='hp')value*=8;if(stat==='energy')value*=4;if(stat==='crit')value=Math.min(.04,value*.0015);return {stat,value};});
  }

  // Generation v1: persistent quality, separate from refinement and pearls.
  const generationRules=Object.freeze({version:1,lambda:.06,normalGearChance:(root.MareCharacters||(typeof module!=='undefined'?require('./character-system.js'):null))?.monsterBalance.gearChance??.12,basicFusionGrowth:.35,potentialGrowth:.015,potentialHpStep:5,nativeRankGrowth:1.6,basicRankGrowth:1.2,synthesisLevel:'character-level',chestLevel:'catalog'});
  function potentialProbabilities(lambda=generationRules.lambda){if(!Number.isFinite(lambda)||lambda<0)throw Error('Curva inválida');const p=Array.from({length:101},(_,i)=>Math.exp(-lambda*i)),sum=p.reduce((a,b)=>a+b,0);return p.map(n=>n/sum);}
  function rollPotential(random=Math.random){let n=draw(random);const p=potentialProbabilities();for(let i=0;i<100;i++){n-=p[i];if(n<0)return i;}return 100;}
  function lootLevel(level,region){if(!region||!Number.isInteger(region.min)||!Number.isInteger(region.max)||region.min>region.max)throw Error('Faixa do mapa inválida');return Math.min(region.max,Math.max(region.min,Math.max(1,int(level))));}
  const units={strength:1,dexterity:1,vitality:1,intelligence:1,spirit:1,hp:8,energy:4,crit:.0015,attackSpeedPercent:.0025,critDamage:.01};
  const caps={crit:26,attackSpeedPercent:100,critDamage:50};
  const themes={sword:{strength:5,dexterity:3,vitality:2,attackSpeedPercent:3},brawler:{strength:5,vitality:4,hp:3},gunner:{dexterity:6,strength:2,critDamage:4},rogue:{dexterity:5,attackSpeedPercent:5,crit:4,critDamage:3},cyborg:{vitality:6,strength:3,hp:4},strategist:{intelligence:7,spirit:4,energy:2},healer:{spirit:7,intelligence:4,energy:3}};
  function qualityPool(def){const p=[...(def.extraPool||[...keys,'hp','energy','crit'])];if(def.slot==='weapon'){if(['sword','rogue'].includes(def.type))p.push('attackSpeedPercent');if(['rogue','gunner'].includes(def.type))p.push('critDamage');}return [...new Set(p)].filter(k=>units[k]);}
  function weighted(pool,def,random){const weights=pool.map(k=>def.slot==='weapon'?(themes[def.type]?.[k]||.5):1),sum=weights.reduce((a,b)=>a+b,0);let v=draw(random)*sum;for(let i=0;i<pool.length;i++){v-=weights[i];if(v<0)return pool[i];}return pool[pool.length-1];}
  function qualityExtras(item,def,random){const pool=qualityPool(def),chosen=[];for(let i=0;i<Math.min(rarity[item.rarity].extras,pool.length);i++){const k=weighted(pool,def,random);chosen.push({stat:k,points:1});pool.splice(pool.indexOf(k),1);}if(chosen.every(e=>caps[e.stat]))chosen[0]={stat:def.type==='healer'?'spirit':def.type==='strategist'?'intelligence':'vitality',points:1};let left=item.generation.extraBudget-chosen.length;while(left-->0){const available=chosen.filter(e=>e.points<(caps[e.stat]||Infinity)),e=available[Math.floor(draw(random)*available.length)];e.points++;}return chosen.map(e=>({...e,value:Number((e.points*units[e.stat]).toFixed(6))}));}
  function generateItem(original,defs,random=Math.random,{potential,source='catalog',family,nativeRarity}={}){const item=normalizeItem(original,defs),d=defs[item.def];if(!isGear(item,defs))return item;const p=potential===undefined?rollPotential(random):potential;if(!Number.isInteger(p)||p<0||p>100)throw Error('Potencial inválido');family ||=d.rarity==='common'?'basic':'native';nativeRarity ||=d.rarity||'common';const mult=family==='basic'&&item.rarity!==nativeRarity?1+(rarity[item.rarity].mult-1)*generationRules.basicFusionGrowth:rarity[item.rarity].mult;
    const bounds=extraRange(item.level,item.rarity),count=rarity[item.rarity].extras,factor=family==='basic'&&item.rarity!==nativeRarity?mult/rarity[item.rarity].mult:1,min=Math.max(count,Math.ceil(count*bounds.min*factor)),max=Math.max(min,Math.ceil(count*bounds.max*factor));item.potential=p;item.generation={version:1,family,nativeRarity,source,baseMultiplier:mult,extraBudget:Math.round(min+(max-min)*p/100),minBudget:min,maxBudget:max};item.baseStats={attack:d.attack||0,defense:d.defense||0,hp:d.hp||0};item.baseAttributes=Object.fromEntries(keys.map(k=>[k,d.attributes?.[k]||0]));item.extras=qualityExtras(item,d,random);return item;}
  const weaponFragment=Object.freeze({id:'epic_weapon_fragment',materialId:'epic_weapon_fragment',name:'Fragmento de arma épica',kind:'weapon-fragment',slot:'material',rarity:'epic',fixedRarity:true,attack:0,defense:0,hp:0,icon_path:'assets/ui/items-hd/epic-weapon-fragment.png',description:'Combine 20 fragmentos para formar uma arma Épica nativa aleatória e negociável. O resultado pode pertencer a qualquer classe.'});
  const legendaryWeaponFragment=Object.freeze({...weaponFragment,id:'legendary_weapon_fragment',materialId:'legendary_weapon_fragment',name:'Fragmento de Arma Lendária',rarity:'legendary',description:'Combine 20 fragmentos para formar uma arma Lendária nativa aleatória e negociável. O resultado pode pertencer a qualquer classe.'});
  const weaponRecipes=Object.freeze({
    formEpicWeapon:Object.freeze({material:weaponFragment,rarity:'epic',label:'Épica',quantity:20}),
    formLegendaryWeapon:Object.freeze({material:legendaryWeaponFragment,rarity:'legendary',label:'Lendária',quantity:20})
  });
  const weaponRecipe=type=>Object.hasOwn(weaponRecipes,type)?weaponRecipes[type]:null;
  const weaponPool=(defs,recipe)=>defs.map((d,i)=>({d,i})).filter(({d})=>d.slot==='weapon'&&d.rarity===recipe.rarity&&d.fixedRarity&&d.icon_path&&!d.unavailable).map(({i})=>i);
  const epicWeaponPool=defs=>weaponPool(defs,weaponRecipes.formEpicWeapon);
  const weaponFragments=(g,recipe=weaponRecipes.formEpicWeapon)=>(g.inventory||[]).filter(i=>i.materialId===recipe.material.id&&!i.locked&&(!i.boundToCharacter||i.boundToCharacter===g.characterId));
  const weaponFragmentCount=(g,recipe)=>weaponFragments(g,recipe).reduce((n,i)=>n+int(i.quantity),0);
  const legendaryLootChance=()=>generationRules.normalGearChance*legendaryRarityWeight/normalRarityScale;
  const mapFragmentRules=Object.freeze({dMinLevel:40,cMinLevel:100,dWeight:60,cWeight:30,scale:10000});
  function rollMapFragment(monster,random=Math.random,multiplier=1){
    if(!worldMonsterAtLeast(monster,mapFragmentRules.dMinLevel))return null;
    const roll=draw(random);
    const {dWeight,cWeight,scale}=mapFragmentRules;
    if(roll<dWeight*multiplier/scale)return 'D';
    if(worldMonsterAtLeast(monster,mapFragmentRules.cMinLevel)&&roll<(dWeight+cWeight)*multiplier/scale)return 'C';
    return null;
  }
  function normalLoot(defs,level,region,random=Math.random,monster,multiplier=1){if(draw(random)>=generationRules.normalGearChance*multiplier)return null;const r=rollRarity(random,monster),pool=defs.map((d,def)=>({d,def})).filter(({d})=>!d.kind&&d.type!=='akuma_no_mi'&&d.rarity===r&&!d.unavailable);if(!pool.length)throw Error('Pool de equipamentos vazio: '+r);return {def:pool[Math.floor(draw(random)*pool.length)].def,rarity:r,level:lootLevel(level,region)};}
  function gearName(item,defs){const d=defs[item?.def];return isGear(item,defs)?'LV. '+item.level+' '+d.name+(item.plus?' +'+item.plus:''):d?.name||'Item';}

  function normalizeItem(original,defs,random=null){
    const item=clone(original),def=defs[item.def];if(!def)return item;
    if(def.kind==='visual-completo'||def.type==='akuma_no_mi'||item.type==='akuma_no_mi')return item;
    if(['pearl-box','epic-equipment-box','haki-book','haki-fragment','akuma-fragment','weapon-fragment','sword-fragment'].includes(def.kind))return item;
    if(isPearl(item,defs)){const p=pearlOf(item,defs);if(p)item.pearlId=p.id;item.forgeVersion=VERSION;return item;}
    if(hasDurability(item,defs))item.durability=durabilityOf(item);
    const fixedRarityUpgrade=def.fixedRarity&&rarity[def.rarity]&&item.rarity!==def.rarity;
    item.level=Math.max(1,int(item.level));item.plus=int(item.plus);item.rarity=def.fixedRarity&&rarity[def.rarity]?def.rarity:(rarity[item.rarity]?item.rarity:(rarity[def.rarity]?def.rarity:'common'));
    item.baseStats=item.baseStats&&['attack','defense','hp'].every(k=>Number.isFinite(item.baseStats[k])&&item.baseStats[k]>=0)?item.baseStats:{attack:def.attack||0,defense:def.defense||0,hp:def.hp||0};
    // Legacy extras are rolled once from a stable item identity, never from global RNG.
    if(!Array.isArray(item.extras))item.extras=rollExtras(item,def,random||seeded(`${item.id}|${item.def}|${item.level}|${item.rarity}`));
    else if(fixedRarityUpgrade){while(item.extras.length<rarity[item.rarity].extras){const used=new Set(item.extras.map(extra=>extra?.stat)),generated=rollExtras(item,def,seeded(`${item.id}|${item.def}|${item.level}|${item.rarity}|rank-up|${item.extras.length}`)),extra=generated.find(candidate=>!used.has(candidate.stat));if(!extra)break;item.extras.push(extra);}}
    if(!Array.isArray(item.sockets))item.sockets=Array(rarity[item.rarity].sockets).fill(null);
    // Never truncate saved sockets or reroll existing extras on load.
    while(item.sockets.length<rarity[item.rarity].sockets)item.sockets.push(null);
    if(!item.generation){item.potential=null;item.generation={version:0,family:'legacy',source:'legacy',nativeRarity:null};}
    item.reforgeAttempts=int(item.reforgeAttempts);item.forgeVersion=VERSION;return item;
  }
  function migrate(original,defs){
    const g=clone(original);g.inventory=(g.inventory||[]).map(item=>normalizeItem(item,defs));g.equipment=Object.fromEntries(Object.entries(g.equipment||{}).map(([slot,item])=>[slot,item?normalizeItem(item,defs):null]));
    g.forgeVersion=VERSION;g.forgeSeq=int(g.forgeSeq);g.forgeHistory=Array.isArray(g.forgeHistory)?g.forgeHistory.slice(-12):[];return g;
  }
  // Component-wise rarity floors prevent an older catalogue model from reversing rank strength.
  const qualityCache=new WeakMap(),coreKeys=['attack','defense','hp',...keys];
  function qualityFloors(defs,def,rank,basic){
    let groups=qualityCache.get(defs);if(!groups){groups=new Map();qualityCache.set(defs,groups);}
    const group=def.slot==='weapon'?'weapon:'+def.type:def.slot;
    if(!groups.has(group)){
      const tiers=[],order=Object.keys(rarity);let previous=Object.fromEntries(coreKeys.map(k=>[k,0]));
      for(const name of order){const entries=defs.filter(d=>!d.kind&&d.type!=='akuma_no_mi'&&(d.slot==='weapon'?'weapon:'+d.type:d.slot)===group&&d.rarity===name),floor=Object.fromEntries(coreKeys.map(k=>[k,Math.max(previous[k]*generationRules.nativeRankGrowth,keys.includes(k)?rarity[name].extras:0)])),maximum={...floor};
        for(const d of entries)for(const k of coreKeys)maximum[k]=Math.max(maximum[k],(d.attributes?.[k]||d[k]||0)*rarity[name].mult);
        tiers.push({floor,previous:{...previous},maximum});previous=maximum;
      }groups.set(group,tiers);
    }
    const tier=groups.get(group)[Object.keys(rarity).indexOf(rank)];return basic?Object.fromEntries(coreKeys.map(k=>[k,tier.previous[k]*generationRules.basicRankGrowth])):tier.floor;
  }
  function itemStats(item,defs){
    const zero={attack:0,defense:0,hp:0,energy:0,crit:0,attackSpeedPercent:0,critDamage:0,attributes:Object.fromEntries(keys.map(k=>[k,0]))};if(!isGear(item,defs))return zero;
    const d=defs[item.def]||{},r=rarity[item.rarity||d.rarity]||rarity.common,quality=item.generation?.version===1,p=quality?Math.max(0,Math.min(100,item.potential||0)):0,q=1+p*generationRules.potentialGrowth,floor=quality?qualityFloors(defs,d,item.rarity,item.generation.family==='basic'&&item.rarity!=='common'):null,b=item.baseStats||d,core=k=>Math.max((keys.includes(k)?(item.baseAttributes||d.attributes)?.[k]:b[k])||0,0)*(item.generation?.baseMultiplier??r.mult),basis=k=>quality?Math.max(core(k),floor[k])*q:core(k),m=1+(item.generation?.version===1?Math.max(0,(item.level||1)-1):Math.min(20,Math.max(0,(item.level||1)-1)))*.09,plus=int(item.plus);
    const [attackBonus,defenseBonus,hpBonus]=refinementBonus(plus),round=quality?Math.ceil:Math.round;
    const result={...zero,
      attack:round((basis('attack')+plus*3)*m*(1+attackBonus)),
      defense:round((basis('defense')+plus*2)*m*(1+defenseBonus)),
      hp:round((basis('hp')+plus*10)*m*(1+hpBonus)+(quality?p*generationRules.potentialHpStep*r.mult:0))
    };
    // Intrinsic class attributes are separate from extras; quality stats always round upward.
    for(const key of keys)result.attributes[key]=quality?Math.ceil(basis(key)*m):Math.round(basis(key)*m);
    result.crit=(d.crit||0)*r.mult;
    for(const extra of item.extras||[]){if(!Number.isFinite(extra.value)||extra.value<0)continue;if(keys.includes(extra.stat))result.attributes[extra.stat]+=extra.value;else if(['hp','energy','crit','attackSpeedPercent','critDamage'].includes(extra.stat))result[extra.stat]+=extra.value;}
    if(hasDurability(item,defs)&&durabilityOf(item)<80*hitsPerPercent){
      const effective=efficiency(item);
      result.attack*=effective.attack;
      result.defense*=effective.defense;
    }
    return result;
  }
  function aggregate(equipment,defs){
    const gear={attack:0,defense:0,hp:0,energy:0,crit:0,attackSpeedPercent:0,critDamage:0,attributes:Object.fromEntries(keys.map(k=>[k,0])),pearlPercent:Object.fromEntries(keys.map(k=>[k,0]))};
    for(const item of Object.values(equipment||{})){if(!isGear(item,defs))continue;const s=itemStats(item,defs);for(const k of ['attack','defense','hp','energy','crit','attackSpeedPercent','critDamage'])gear[k]+=s[k];for(const k of keys)gear.attributes[k]+=s.attributes[k];for(const id of item.sockets||[]){const p=pearlById[id];if(p)gear.pearlPercent[p.attribute]+=p.percent;}}
    return gear;
  }
  const fragmentLevelFactor=item=>1000+15*(Math.max(1,int(item.level))-1);
  function upgradeCost(item){
    const plus=int(item.plus),base=refinement.fragmentCosts[plus];
    if(base===undefined)return {gold:0,materials:0};
    const oldLevelFactor=1+(Math.max(1,item.level||1)-1)*.04;
    return {gold:10*Math.ceil(50*(plus+1)**2*oldLevelFactor),materials:Math.ceil(base*fragmentLevelFactor(item)/1000)};
  }
  const upgradeChance=item=>refinement.chances[int(item.plus)]||0;
  const failedRefinement=item=>Math.max(0,int(item.plus)-(int(item.plus)>=5?1:0));
  function dismantleReturn(item,g,defs){
    if(!isGear(item,defs)||item.locked||item.reserved||g.reservedItemIds?.includes(item.id)
       ||item.dismantlable===false||defs[item.def].dismantlable===false
       ||item.boundToCharacter&&item.boundToCharacter!==g.characterId
       ||item.binding==='character'&&!item.boundToCharacter
       ||item.sockets?.some(Boolean)||Object.values(g.equipment||{}).some(i=>i?.id===item.id))return 0;
    const base=fragmentYield[item.rarity];
    return base?Math.floor(base*fragmentLevelFactor(item)/1000):0;
  }
  function dismantlePlan(g,ids,defs){
    if(!Array.isArray(ids)||!ids.length||ids.length>CAPACITY||new Set(ids).size!==ids.length)
      return {error:'Selecione equipamentos diferentes da mochila.'};
    const bag=new Map(g.inventory.map(item=>[item.id,item])),items=[];
    for(const id of ids){
      const item=bag.get(id),fragments=dismantleReturn(item,g,defs);
      if(!fragments)return {error:'A seleção contém equipamento indisponível. Revise os itens equipados, bloqueados, reservados ou com pérolas.'};
      items.push({item,fragments});
    }
    const total=items.reduce((sum,row)=>sum+row.fragments,0);
    if(!Number.isSafeInteger(g.materials+total)||g.materials+total>fragmentCapacity)
      return {error:'O saldo de Fragmento de Item está no limite.'};
    return {items,total};
  }
  function removalCost(item,p){return Math.ceil((20+item.level*4)*rarity[item.rarity].mult*(1+p.level*.75));}
  function reforgeCost(item,line=false){const r=rarity[item.rarity],factor=1.3**int(item.reforgeAttempts),portion=line?.45:1;return {gold:Math.ceil((30+item.level*12)*r.mult*(1+r.extras*.35)*factor*portion),materials:Math.ceil(((1+item.level/8)*Math.sqrt(r.mult)+r.extras)*factor*portion)};}
  function equipmentFusion(g,ids,slot,defs){
    if(!Array.isArray(ids)||ids.length!==5||new Set(ids).size!==5)return {error:'Selecione cinco equipamentos diferentes.'};
    const items=ids.map(id=>g.inventory.find(i=>i.id===id));
    if(items.some(i=>!isGear(i,defs)||i.locked||i.sockets?.some(Boolean)))return {error:'Use somente equipamentos da mochila, desbloqueados e sem pérolas instaladas.'};
    const source=items[0].rarity,order=['common','uncommon','rare','epic','legendary'];
    if(items.some(i=>i.rarity!==source))return {error:'Os cinco equipamentos precisam ter a mesma raridade.'};
    const rank=order.indexOf(source);if(rank<0||rank>=4)return {error:'Lendário → Supremo exige receita especial e permanece desabilitado.'};
    const def=defs.map((d,i)=>({...d,index:i})).filter(d=>d.slot===slot&&!d.kind&&d.rarity==='common'&&!d.fixedRarity&&d.type!=='akuma_no_mi'&&(slot!=='weapon'||d.type===g.classId)).sort((a,b)=>((a.attack||0)+(a.defense||0)+(a.hp||0))-((b.attack||0)+(b.defense||0)+(b.hp||0))||a.index-b.index)[0];
    if(!def)return {error:'Escolha um tipo de equipamento compatível com sua classe.'};
    const level=Math.min(...items.map(i=>i.level)),target=order[rank+1],mult=rarity[target].mult;
    return {items,source,target,level,def:def.index,cost:{gold:Math.ceil((100+level*25)*mult),materials:Math.ceil((3+level/5)*Math.sqrt(mult))}};
  }
  function pearlFusion(g,ids,defs){
    if(!Array.isArray(ids)||ids.length!==5||new Set(ids).size!==5)return {error:'Preencha os cinco slots com unidades diferentes.'};
    const items=ids.map(id=>g.inventory.find(i=>i.id===id));
    if(items.some(i=>!i||i.locked||!pearlOf(i,defs)))return {error:'Use somente pérolas da mochila e desbloqueadas.'};
    const pearl=pearlOf(items[0],defs);
    if(items.some(i=>pearlOf(i,defs).id!==pearl.id))return {error:'As cinco pérolas precisam ter o mesmo atributo e nível.'};
    if(pearl.level>=5)return {error:'Nv.5 é o limite de fusão.'};
    return {items,pearl,next:pearls.find(p=>p.attribute===pearl.attribute&&p.level===pearl.level+1),...fusion[pearl.level-1]};
  }
  function rollLine(item,def,index,random){
    if(item.generation?.version===1){const points=item.extras[index].points,occupied=new Set(item.extras.filter((_,i)=>i!==index).map(e=>e.stat)),pool=qualityPool(def).filter(k=>!occupied.has(k)&&points<=(caps[k]||Infinity)),stat=weighted(pool,def,random);if(!stat)throw Error('Pool vazio');return {stat,points,value:Number((points*units[stat]).toFixed(6))};}
    const occupied=new Set(item.extras.filter((_,i)=>i!==index).map(x=>x.stat));
    const pool=[...(def.extraPool||[...keys,'hp','energy','crit'])].filter(k=>!occupied.has(k)&&!(def.slot==='weapon'&&(def.type==='strategist'||def.type==='healer'?k==='strength':k==='intelligence')));
    const stat=pool[range(0,pool.length-1,random)],bounds=extraRange(item.level,item.rarity);let value=range(bounds.min,bounds.max,random);
    if(stat==='hp')value*=8;if(stat==='energy')value*=4;if(stat==='crit')value=Math.min(.04,value*.0015);return {stat,value};
  }
  const allGear=g=>[...Object.values(g.equipment||{}).filter(Boolean),...(g.inventory||[])];
  function find(g,id){return allGear(g).find(item=>item.id===id);}
  function execute(original,command,defs,random=Math.random,now=Date.now()){
    const fail=message=>({ok:false,message});
    if(!original||typeof original!=='object'||!command||typeof command!=='object')return fail('Comando inválido.');
    if(!Number.isFinite(original.gold)||original.gold<0||!Number.isFinite(original.materials)||original.materials<0)return fail('Saldo inválido; nenhum recurso foi consumido.');
    if(command.expectedSeq!==int(original.forgeSeq))return fail('A operação está desatualizada. Confira os valores e tente novamente.');
    const type=command.type,repairing=type==='repair'||type==='repairAll';
    const g=repairing?clone(original):migrate(original,defs),item=find(g,command.itemId);let result,cost;
    g.forgeSeq=int(g.forgeSeq);
    g.forgeHistory??=[];
    const requireItem=()=>isGear(item,defs)&&!item.locked;
    function pay(price){if(!Object.values(price).every(n=>Number.isSafeInteger(n)&&n>=0))return false;if(!Number.isFinite(g.gold)||g.gold<price.gold||!Number.isFinite(g.materials)||g.materials<(price.materials||0))return false;g.gold-=price.gold;g.materials-=price.materials||0;return true;}
    function pearlItem(id){const def=defs.findIndex(d=>d.pearlId===id);if(def<0)throw Error('Pérola ausente do catálogo');let suffix=0,newId;do{newId=`forge-${g.forgeSeq+1}-${suffix++}`;}while(find(g,newId));return {id:newId,def,pearlId:id,level:1,plus:0,locked:false,obtainedAt:int(now),forgeVersion:VERSION};}
    try{
      if(repairing){
        const plan=repairPlan(g,type,command.itemId,defs);
        if(!plan.items.length)return fail('Nenhum equipamento precisa de reparo.');
        if(!Array.isArray(command.quote)||command.quote.length!==plan.items.length||
          plan.items.some(({item,cost},index)=>command.quote[index]?.id!==item.id||command.quote[index]?.cost!==cost)){
          return {...fail('O orçamento mudou. Confira a condição e confirme novamente.'),reason:'repair_quote_changed'};
        }
        cost={gold:plan.total};
        if(!pay(cost))return fail('Berry insuficientes para o reparo.');
        for(const {item} of plan.items)item.durability=maxDurability;
        result={type,success:true,cost,itemIds:plan.items.map(({item})=>item.id),message:plan.items.length+' equipamento(s) restaurado(s) a 100%.'};
      }else if(weaponRecipe(type)){
        const recipe=weaponRecipe(type),pool=weaponPool(defs,recipe);if(!pool.length)return fail('Pool de armas indisponível.');if(weaponFragmentCount(g,recipe)<recipe.quantity)return fail('São necessários '+recipe.quantity+' fragmentos desbloqueados deste personagem.');
        let left=recipe.quantity;const consume=new Map();for(const i of weaponFragments(g,recipe)){const n=Math.min(left,int(i.quantity));consume.set(i.id,n);left-=n;if(!left)break;}
        const remaining=g.inventory.filter(i=>!consume.has(i.id)||int(i.quantity)>consume.get(i.id));if(remaining.length>=CAPACITY)return fail('Libere um espaço na mochila.');
        const def=pool[Math.floor(draw(random)*pool.length)];let suffix=0,id;do{id='forge-weapon-'+(g.forgeSeq+1)+'-'+suffix++;}while(find(g,id));const output=generateItem({id,def,level:Math.min(100,Math.max(1,int(g.level))),rarity:recipe.rarity,plus:0,locked:false,obtainedAt:int(now),origin:'Síntese de '+recipe.quantity+' Fragmentos de arma '+recipe.label.toLowerCase()},defs,random,{family:'native',source:'synthesis'});
        g.inventory=remaining.map(i=>consume.has(i.id)?{...i,quantity:i.quantity-consume.get(i.id)}:i);g.inventory.push(output);result={type,success:true,itemId:id,message:'Arma '+recipe.label+' formada: '+gearName(output,defs)+'. Negociável.',consumed:recipe.quantity};
      }else if(type==='dismantle'){
        const plan=dismantlePlan(g,command.itemIds,defs);
        if(plan.error)return fail(plan.error);
        const ids=new Set(command.itemIds);
        g.inventory=g.inventory.filter(item=>!ids.has(item.id));
        g.materials+=plan.total;
        result={type,success:true,itemIds:[...ids],fragments:plan.total,
          message:plan.items.length+' equipamento(s) desmontado(s). Fragmento de Item recebido: '+plan.total+'.'};
      }else if(type==='upgrade'){
        if(!requireItem()||item.plus>=refinement.max)return fail('Selecione um equipamento desbloqueado abaixo de +20.');cost=upgradeCost(item);if(!pay(cost))return fail('Recursos insuficientes.');const before=item.plus,success=before<refinement.guaranteed||draw(random)<upgradeChance(item);item.plus=success?before+1:failedRefinement(item);
        result={type,success,before,after:item.plus,cost,message:success?`Aprimoramento concluído: +${item.plus}.`:before===item.plus?`Falha: equipamento preservado em +${item.plus}.`:`Falha: o aprimoramento voltou de +${before} para +${item.plus}.`};
      }else if(type==='imbue'){
        const pearl=g.inventory.find(i=>i.id===command.pearlItemId),p=pearlOf(pearl,defs),socket=command.socket;
        if(!requireItem()||!Number.isInteger(socket)||socket<0||socket>=rarity[item.rarity].sockets||item.sockets[socket]!==null)return fail('Escolha um socket livre.');
        if(!p||pearl.locked)return fail('Escolha uma pérola disponível e desbloqueada.');
        g.inventory=g.inventory.filter(i=>i.id!==pearl.id);item.sockets[socket]=p.id;result={type,success:true,message:`${p.name} instalada no socket ${socket+1}.`};
      }else if(type==='remove'){
        const socket=command.socket,p=pearlById[item?.sockets?.[socket]];
        if(!requireItem()||!Number.isInteger(socket)||socket<0||socket>=item.sockets.length||!p)return fail('Escolha um socket ocupado.');
        if(g.inventory.length>=CAPACITY)return fail('Libere um espaço na mochila antes de remover a pérola.');cost={gold:removalCost(item,p)};if(!pay(cost))return fail('Berry insuficientes.');
        g.inventory.push(pearlItem(p.id));item.sockets[socket]=null;result={type,success:true,cost,message:`${p.name} devolvida à mochila.`};
      }else if(type==='fuse'){
        const plan=pearlFusion(g,command.itemIds,defs);if(plan.error)return fail(plan.error);const p=plan.pearl;
        cost={gold:plan.gold};if(!pay(cost))return fail('Berry insuficientes.');const ids=new Set(command.itemIds);g.inventory=g.inventory.filter(i=>!ids.has(i.id));
        const success=draw(random)<plan.chance,next=pearls.find(q=>q.attribute===p.attribute&&q.level===p.level+1);if(success)g.inventory.push(pearlItem(next.id));result={type,success,cost,message:success?`Fusão concluída: ${next.name}.`:'Fusão falhou. As cinco pérolas e os Berry foram consumidos.'};
      }else if(type==='fuseEquipment'){
        const plan=equipmentFusion(g,command.itemIds,command.slot,defs);if(plan.error)return fail(plan.error);cost=plan.cost;if(!pay(cost))return fail('Recursos insuficientes.');
        const ids=new Set(command.itemIds);g.inventory=g.inventory.filter(i=>!ids.has(i.id));let suffix=0,id;do{id=`forge-gear-${g.forgeSeq+1}-${suffix++}`;}while(find(g,id));
        const output=generateItem({id,def:plan.def,rarity:plan.target,level:plan.level,plus:0,locked:false,obtainedAt:int(now),origin:'Fusão de equipamentos'},defs,random,{family:'basic',nativeRarity:'common',source:'fusion'});g.inventory.push(output);
        result={type,success:true,cost,itemId:output.id,message:`Fusão concluída: ${defs[output.def].name} · ${rarity[plan.target].name} · Nv.${output.level}.`};
      }else if(type==='reforge'||type==='reforgeLine'){
        if(!requireItem())return fail('Selecione um equipamento desbloqueado.');
        const line=type==='reforgeLine';if(line&&(!Number.isInteger(command.line)||command.line<0||command.line>=item.extras.length))return fail('Escolha uma linha de atributo válida.');
        cost=reforgeCost(item,line);if(!pay(cost))return fail('Recursos insuficientes.');const before=clone(item.extras);
        if(line)item.extras[command.line]=rollLine(item,defs[item.def],command.line,random);else item.extras=item.generation?.version===1?qualityExtras(item,defs[item.def],random):rollExtras(item,defs[item.def],random);
        item.reforgeAttempts=int(item.reforgeAttempts)+1;result={type,success:true,cost,before,after:clone(item.extras),message:line?'Atributo reforjado; demais linhas preservadas.':'Todos os atributos extras foram sorteados novamente.'};
      }else return fail('Operação desconhecida.');
      g.forgeSeq++;g.forgeHistory.push({seq:g.forgeSeq,at:int(now),itemId:item?.id||result.itemId||null,...clone(result)});g.forgeHistory=g.forgeHistory.slice(-12);assertBudget(g);return {ok:true,state:g,result};
    }catch(error){return fail('A operação não foi concluída; nenhum recurso foi consumido.');}
  }
  function assertBudget(g){if(!Number.isFinite(g.gold)||!Number.isFinite(g.materials)||g.gold<0||g.materials<0||g.inventory.length>CAPACITY)throw Error('Saldo inválido');const ids=allGear(g).map(i=>i.id);if(new Set(ids).size!==ids.length)throw Error('IDs duplicados');}
  const api={hitsPerPercent,maxDurability,durabilityOf,hasDurability,efficiency,repairCost,repairPlan,beginWear,confirmWear,itemFragment,fragmentYield,dismantleReturn,dismantlePlan,failedRefinement,refinementBonus,weaponFragment,legendaryWeaponFragment,weaponRecipe,weaponFragmentCount,weaponFragments,weaponPool,epicWeaponPool,normalLoot,rollMapFragment,mapFragmentRules,legendaryLootMinLevel,legendaryLootChance,generationRules,generateItem,rollPotential,potentialProbabilities,lootLevel,gearName,VERSION,CAPACITY,refinement,equipmentFusion,pearlFusion,rarity,names,keys,pearls,pearlById,fusion,isGear,isPearl,pearlOf,normalizeItem,migrate,itemStats,aggregate,rarityFromRoll,rollRarity,rollExtras,extraRange,upgradeCost,upgradeChance,removalCost,reforgeCost,execute};root.MareForge=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
