"""Shared Rank D equipment passives. Inputs to apply_stats are unmodified base stats."""
import json,math
from pathlib import Path
DEVIL_FRUIT_STATS=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-d-passives.json').read_text(encoding='utf8'))
DEVIL_FRUIT_STATS.update({rule['id']:rule.get('passiveStats',{}) for rule in json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-c-rules.json').read_text(encoding='utf8')).values()})
DEVIL_FRUIT_STATS.update({rule['id']:rule.get('passiveStats',{}) for rule in json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-c-expansion-rules.json').read_text(encoding='utf8')).values()})
DEVIL_FRUIT_STATS.update({r['id']:r['passiveStats'] for r in json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-b-rules.json').read_text(encoding='utf8')).values()})
def passive_stats(fruit_id):return dict(DEVIL_FRUIT_STATS.get(fruit_id,{}))
def apply_stats(base,fruit_id):
    out=dict(base);p=passive_stats(fruit_id)
    for key,value in base.items():
        if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<0:raise ValueError('Atributos base inválidos')
    for key in ['physical_attack','special_attack','physical_defense','max_hp']:out[key]=out.get(key,0)+p.get(key,0)
    for key in ['attack_speed','movement_speed']:out[key]=out.get(key,1)*(1+p.get(key,0))
    out['crit_chance']=min(.65,out.get('crit_chance',0)+p.get('crit_chance',0))
    out['crit_damage']=out.get('crit_damage',1.65)+p.get('crit_damage',0)
    out['armor_penetration']=min(.6,out.get('armor_penetration',0)+p.get('armor_penetration',0))
    out['lifesteal']=min(.3,out.get('lifesteal',0)+p.get('lifesteal',0))
    out['cooldown_reduction']=min(.4,out.get('cooldown_reduction',0)+p.get('cooldown_reduction',0))
    out['healing_received_percent']=out.get('healing_received_percent',0)+p.get('healing_received_percent',0)
    out['damage_reflection']=out.get('damage_reflection',0)+p.get('damage_reflection',0)
    return out
