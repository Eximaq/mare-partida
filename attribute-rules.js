'use strict';
((root)=>{
 const keys=['strength','dexterity','vitality','intelligence','spirit'];
 const rules=Object.freeze({strengthHalf:500,strengthDamage:.0024,strengthMelee:.0028,strengthDefense:.24,speedHalf:500,evasionHalf:600,critHalf:400,cooldownHalf:500,vitalityHp:.003,cyborgHp:.0045,vitalityDefense:.002,vitalityRegen:.00002,cyborgRegen:.0002,regenCap:.02,intDamage:.0034,casterDamage:.004,intEnergy:.0025,casterEnergy:.0035,spiritDamage:.002,spiritEnergy:.005,spiritRegen:.0025,spiritHealing:.004,spiritProtection:.0025,protectionCap:.8,speedCap:1,rogueSpeedCap:1.5,swordSpeedCap:1.1,evasionCap:.25,rogueEvasionCap:.35,critCap:.45,rogueCritCap:.55,damageCooldownCap:.2});
 const profiles=Object.freeze(Object.fromEntries(Object.entries({brawler:['Lutador — dano e resistência',[45,20,30,0,5]],sword:['Espadachim — dano físico',[45,30,20,0,5]],rogue:['Gatuno — velocidade e esquiva',[30,45,20,0,5]],gunner:['Atirador — dano físico à distância',[40,35,20,0,5]],cyborg:['Ciborgue — resistência e combate físico',[30,15,40,0,15]],strategist:['Mago — dano elemental',[0,15,20,45,20]],healer:['Curandeiro — cura e suporte',[0,10,25,15,50]]}).map(([id,[name,weights]])=>[id,{id,name,weights:Object.fromEntries(keys.map((k,i)=>[k,weights[i]]))}])));
 const empty=()=>Object.fromEntries(keys.map(k=>[k,0]));
 function bonuses(a,classId){
  const [S,D,V,I,E]=keys.map(k=>Math.max(0,Number(a[k])||0)),r=rules;
  const caster=['strategist','healer'].includes(classId),melee=['brawler','sword'].includes(classId),cyborg=classId==='cyborg',rogue=classId==='rogue';
  const adjusted=r.strengthHalf*Math.log1p(S/r.strengthHalf);
  return {physical:adjusted*(melee?r.strengthMelee:r.strengthDamage),strengthDefense:adjusted*r.strengthDefense,
   elemental:I*(caster?r.casterDamage:r.intDamage)+E*r.spiritDamage,energy:I*(caster?r.casterEnergy:r.intEnergy)+E*r.spiritEnergy,
   hp:V*(cyborg?r.cyborgHp:r.vitalityHp),defense:V*r.vitalityDefense,
   speed:(rogue?r.rogueSpeedCap:classId==='sword'?r.swordSpeedCap:r.speedCap)*D/(D+r.speedHalf),
   evasion:(rogue?r.rogueEvasionCap:r.evasionCap)*D/(D+r.evasionHalf),crit:(rogue?r.rogueCritCap:r.critCap)*D/(D+r.critHalf),
   damageCooldown:r.damageCooldownCap*D/(D+r.cooldownHalf),vitalityRegen:Math.min(V*(cyborg?r.cyborgRegen:r.vitalityRegen),r.regenCap),
   energyRegen:E*r.spiritRegen,healing:E*r.spiritHealing,protection:E*r.spiritProtection};
 }
 function distribute(count,profileId,credits=empty()){if(!Number.isSafeInteger(count)||count<0||count>1000000||!profiles[profileId])throw Error('Distribuição inválida');const next={...empty(),...credits},allocation=empty(),weights=profiles[profileId].weights;for(const k of keys)if(!Number.isFinite(next[k]))throw Error('Crédito inválido');for(let n=0;n<count;n++){for(const k of keys)next[k]+=weights[k];let winner=keys[0];for(const k of keys)if(next[k]>next[winner])winner=k;allocation[winner]++;next[winner]-=100;}return {allocation,credits:next};}
 function damageSkill(skill){return ['strike','area','taunt'].includes(skill?.type)||skill?.kind==='damage';}
 function cooldown(base,skill,stats){return base*(damageSkill(skill)?1-(stats.damageCooldownReduction||0):1);}
 function finalize(stats){const d={...stats};d.healthRegen=Math.max(0,d.healthRegen-(d.vitalityHealthRegen||0));d.vitalityHealthRegen=d.maxHP*(d.vitalityRegenRate||0);d.healthRegen+=d.vitalityHealthRegen;d.power=Math.round(d.attack*8+d.defense*5+d.maxHP*.22+d.maxEnergy*.1+d.crit*100+d.evasion*220+(d.penetration||0)*250+(d.accuracy||0)*450+(d.damageCooldownReduction||0)*100+d.healing*2+d.speed*100+d.healthRegen*10+d.energyRegen*10);return d;}
 const api={keys,rules,profiles,empty,bonuses,distribute,damageSkill,cooldown,finalize};root.MareAttributeRules=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
