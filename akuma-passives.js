'use strict';
((root)=>{
 const stats={"akuma_inu_wolf":{"physical_attack":12,"attack_speed":0.08,"lifesteal":0.05,"movement_speed":0.05},"akuma_doru_doru":{"special_attack":14,"physical_defense":10,"max_hp":100,"cooldown_reduction":0.05},"akuma_ushi_giraffe":{"max_hp":180,"physical_defense":15,"physical_attack":10,"armor_penetration":0.05},"akuma_neko_leopard":{"crit_chance":0.1,"crit_damage":0.15,"physical_attack":10,"movement_speed":0.08},"akuma_supa_supa":{"physical_defense":18,"physical_attack":10,"damage_reflection":0.05,"max_hp":80}};
 const labels={physical_attack:'Ataque físico',special_attack:'Ataque especial',physical_defense:'Defesa física',max_hp:'Vida máxima',crit_chance:'Chance de crítico',crit_damage:'Dano crítico',attack_speed:'Velocidade de ataque',movement_speed:'Velocidade de movimento',lifesteal:'Roubo de vida',damage_reflection:'Refletir dano',armor_penetration:'Penetração de armadura',cooldown_reduction:'Redução de recarga'};
 const percent=key=>!['physical_attack','special_attack','physical_defense','max_hp'].includes(key),cap=(n,a,b)=>Math.min(b,Math.max(a,n));
 function apply(base,id,{magic=false,healer=false}={}){
  const p=stats[id];if(!p)return base;const out={...base};
  out.physical+=(p.physical_attack||0);out.elemental+=(p.special_attack||0);out.defense+=(p.physical_defense||0);out.maxHP+=(p.max_hp||0);
  out.speed*=1+(p.attack_speed||0);out.moveSpeed*=1+(p.movement_speed||0);out.huntSpeed*=1+(p.movement_speed||0);
  out.crit=cap(out.crit+(p.crit_chance||0),0,.65);out.critMultiplier=(out.critMultiplier||1.65)+(p.crit_damage||0);out.penetration=cap((out.penetration||0)+(p.armor_penetration||0),0,.6);
  out.fruitLifesteal=Math.min(p.lifesteal||0,Math.max(0,.3-(out.lifesteal||0)));out.lifesteal=(out.lifesteal||0)+out.fruitLifesteal;
  out.damageReflection=p.damage_reflection||0;out.cooldownReduction=p.cooldown_reduction||0;out.fruitSpecialAttack=p.special_attack||0;
  out.attack=magic?out.elemental:out.physical;out.power=Math.round(out.attack*8+out.defense*5+out.maxHP*.22+out.maxEnergy*.1+out.crit*100+out.evasion*100+(healer&&out.healing?out.healing*2:0));return out;
 }
 const cooldown=(seconds,id)=>Number((seconds*(1-(stats[id]?.cooldown_reduction||0))).toFixed(6));
 const reflection=(received,id,{physical=true,direct=false,reflected=false}={})=>physical&&!direct&&!reflected&&received>0?received*(stats[id]?.damage_reflection||0):0;
 const api={stats,labels,percent,apply,cooldown,reflection};root.MareAkumaPassives=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
