'use strict';
((root)=>{
 const stats={"akuma_inu_wolf":{"physical_attack":12,"attack_speed":0.08,"lifesteal":0.05,"movement_speed":0.05},"akuma_doru_doru":{"special_attack":14,"physical_defense":10,"max_hp":100,"cooldown_reduction":0.05},"akuma_ushi_giraffe":{"max_hp":180,"physical_defense":15,"physical_attack":10,"armor_penetration":0.05},"akuma_neko_leopard":{"crit_chance":0.1,"crit_damage":0.15,"physical_attack":10,"movement_speed":0.08},"akuma_supa_supa":{"physical_defense":18,"physical_attack":10,"damage_reflection":0.05,"max_hp":80},"akuma_horu_horu":{"max_hp":160,"physical_attack":12,"special_attack":14,"healing_received_percent":0.08},"akuma_mato_mato":{"physical_attack":16,"attack_speed":0.06,"armor_penetration":0.06,"movement_speed":0.05},"akuma_ushi_bison":{"max_hp":240,"physical_defense":18,"physical_attack":12},"akuma_bomu_bomu":{"physical_attack":20,"crit_chance":0.06,"max_hp":80},"akuma_kobu_kobu":{"max_hp":140,"special_attack":12,"physical_defense":10,"cooldown_reduction":0.05},"akuma_beta_beta":{"max_hp":240,"special_attack":26,"physical_defense":14,"cooldown_reduction":0.06},"akuma_hana_hana":{"max_hp":100,"physical_attack":28,"crit_chance":0.08,"armor_penetration":0.08},"akuma_hoya_hoya":{"max_hp":180,"physical_attack":20,"special_attack":20,"movement_speed":0.05},"akuma_jiki_jiki":{"max_hp":180,"physical_attack":24,"physical_defense":10,"armor_penetration":0.06}};
 stats.akuma_ryu_ryu={max_hp:220,physical_attack:32,physical_defense:12,armor_penetration:.05};
 const labels={healing_received_percent:'Cura recebida',physical_attack:'Ataque físico',special_attack:'Ataque especial',physical_defense:'Defesa física',max_hp:'Vida máxima',crit_chance:'Chance de crítico',crit_damage:'Dano crítico',attack_speed:'Velocidade de ataque',movement_speed:'Velocidade de movimento',lifesteal:'Roubo de vida',damage_reflection:'Refletir dano',armor_penetration:'Penetração de armadura',cooldown_reduction:'Redução de recarga'};
 const percent=key=>!['physical_attack','special_attack','physical_defense','max_hp'].includes(key),cap=(n,a,b)=>Math.min(b,Math.max(a,n));
 function apply(base,id,{magic=false,healer=false}={}){
  const p=stats[id];if(!p)return base;const out={...base};
  out.physical+=(p.physical_attack||0);out.elemental+=(p.special_attack||0);out.defense+=(p.physical_defense||0);out.maxHP+=(p.max_hp||0);
  out.speed*=1+(p.attack_speed||0);out.moveSpeed*=1+(p.movement_speed||0);out.huntSpeed*=1+(p.movement_speed||0);
  out.crit=cap(out.crit+(p.crit_chance||0),0,.65);out.critMultiplier=(out.critMultiplier||1.65)+(p.crit_damage||0);out.penetration=cap((out.penetration||0)+(p.armor_penetration||0),0,.6);
  out.fruitLifesteal=Math.min(p.lifesteal||0,Math.max(0,.3-(out.lifesteal||0)));out.lifesteal=(out.lifesteal||0)+out.fruitLifesteal;
  out.healingReceivedPercent=(out.healingReceivedPercent||0)+(p.healing_received_percent||0);out.damageReflection=p.damage_reflection||0;out.cooldownReduction=p.cooldown_reduction||0;out.fruitSpecialAttack=p.special_attack||0;
  out.attack=magic?out.elemental:out.physical;out.power=Math.round(out.attack*8+out.defense*5+out.maxHP*.22+out.maxEnergy*.1+out.crit*100+out.evasion*100+(healer&&out.healing?out.healing*2:0));return out;
 }
 const cooldown=(seconds,id)=>Number((seconds*(1-(stats[id]?.cooldown_reduction||0))).toFixed(6));
 const reflection=(received,id,{physical=true,direct=false,reflected=false}={})=>physical&&!direct&&!reflected&&received>0?received*(stats[id]?.damage_reflection||0):0;
 const api={stats,labels,percent,apply,cooldown,reflection};root.MareAkumaPassives=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
