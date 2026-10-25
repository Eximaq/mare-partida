"""Rank C Bison/Bomu/Kobu contracts for the existing client-simulated world."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-c-expansion-rules.json').read_text(encoding='utf8'))
BISON=RULES['bison']['id'];BOMU=RULES['bomu']['id'];KOBU=RULES['kobu']['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def visible(p,v):return all(finite(v.get(k)) for k in ['x','y','width','height']) and v['width']>0 and v['height']>0 and v['x']<=p['x']<=v['x']+v['width'] and v['y']<=p['y']<=v['y']+v['height']
class RankCExpansionService:
 def __init__(self,clock):self.clock=clock;self.shells={};self.flags={};self.shots={};self.support={};self.party_provider=None
 def clear(self,player):
  self.shells.pop(player,None);self.flags.pop(player,None);self.shots={k:v for k,v in self.shots.items() if v['owner']!=player}
  for entries in self.support.values():entries.pop(player,None)
 def apply_stats(self,player,stats):
  out=dict(stats);now=self.clock()
  if self.shells.get(player,0)>now:
   out['max_hp']=out.get('max_hp',0)*1.2;out['special_defense']=out.get('special_defense',out.get('physical_defense',0))
   for key in ['physical_defense','special_defense']:out[key]=out.get(key,0)*1.35
  if any(until>now for until in self.support.get(player,{}).values()):
   out['special_defense']=out.get('special_defense',out.get('physical_defense',0))
   for key in ['physical_attack','special_attack','physical_defense','special_defense']:out[key]=out.get(key,0)*1.2
   out['crit_chance']=min(.65,out.get('crit_chance',0)+.1)
  return out
 def cast(self,store,player,fruit,instance,x,y,enemies,direction,key,energy,attack,ctx):
  now=self.clock();self.shots={k:p for k,p in self.shots.items() if p['expires']>now};rules=next(r for r in RULES.values() if r['id']==fruit);skill=next((s for s in rules['skills'] if s['key']==key),None);ctx=ctx or {}
  if not skill or not instance or not all(finite(v) for v in [x,y,energy,attack]) or min(energy,attack)<0:raise ValueError('Atributos ou habilidade inválidos')
  state=store.state(player)
  if fruit==BISON and not state['transformed']:raise ValueError('Transforme-se para usar a habilidade')
  if ctx.get('controlled'):raise ValueError('Aguarde o fim do controle')
  cdkey=fruit+':'+key
  if state['cooldowns'].get(cdkey,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  target=next((e for e in enemies if str(e.get('id'))==str(ctx.get('target_id')) and e.get('alive',True)),None)
  if fruit==BISON and key=='1' or fruit==BOMU:
   if not target or not all(finite(target.get(k)) for k in ['x','y']) or math.hypot(target['x']-x,target['y']-y)>rules['range']:raise ValueError('Alvo fora de alcance')
  if fruit==KOBU:
   point={'x':x,'y':y} if key=='1' else ctx.get('point',{})
   if not all(finite(point.get(k)) for k in ['x','y']) or not visible(point,ctx.get('view',{})):raise ValueError('Escolha um chão visível')
  if fruit==BISON and key=='2':
   hp=ctx.get('self',{});current=hp.get('hp');maximum=hp.get('maxHP')
   if not all(finite(v) for v in [current,maximum]) or not 0<current<=maximum:raise ValueError('Vida inválida')
   self.shells[player]=now+30;effect={'type':'bison_shell','expires_at':now+30,'hp':current*1.2,'maxHP':maximum*1.2}
  elif fruit==KOBU:
   flag={'kind':'revolution' if key=='1' else 'deposition',**point,'instance':instance,'started':now,'until':now+skill['duration']/1000,'view':{'x':point['x']-ctx['view']['width']/2,'y':point['y']-ctx['view']['height']/2,'width':ctx['view']['width'],'height':ctx['view']['height']}}
   self.flags.setdefault(player,{})[key]=flag;effect={'type':'kobu_flag','flag':flag};self.tick(player,instance,x,y,ctx['view'],enemies)
  else:
   token=uuid.uuid4().hex;count=1 if fruit==BISON else 6 if key=='1' else 2;self.shots[token]={'owner':player,'fruit':fruit,'key':key,'x':x,'y':y,'instance':instance,'attack':attack,'expires':now+8,'remaining':set(range(count))};effect={'type':'bison_dash' if fruit==BISON else 'bomu_volley','token':token,'count':count}
  ready=now+skill['cooldown']*(1-rules.get('passiveStats',{}).get('cooldown_reduction',0))
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,fruit,key,ready))
  return {'effect':{**effect,'ready_at':ready},'energy_spent':skill['cost'],'energy_remaining':energy-skill['cost']}
 def impact(self,player,token,index,instance,x,y,enemies):
  p=self.shots.get(token);now=self.clock()
  if not p or p['owner']!=player or p['instance']!=instance or p['expires']<=now or index not in p['remaining'] or not all(finite(v) for v in [x,y]):raise ValueError('Impacto inválido ou repetido')
  if math.hypot(x-p['x'],y-p['y'])>RULES['bison' if p['fruit']==BISON else 'bomu']['range']+30:raise ValueError('Impacto fora de alcance')
  live=[e for e in enemies if e.get('alive',True) and all(finite(e.get(k)) for k in ['x','y'])]
  near=[e for e in live if math.hypot(e['x']-x,e['y']-y)<=30]
  if p['fruit']==BISON or p['key']=='1':targets=near[:1]
  else:targets=[e for e in live if abs(e['x']-x)<=64 and abs(e['y']-y)<=64]
  if not targets:raise ValueError('Impacto sem alvo')
  if any(not finite(e.get('defense',0)) or e.get('defense',0)<0 for e in targets):raise ValueError('Defesa inválida')
  p['remaining'].remove(index);mult=1.8 if p['fruit']==BISON else .75 if p['key']=='1' else 1.5
  result={'hits':[{'id':e['id'],'damage':max(1,math.floor(p['attack']*mult-e.get('defense',0)*.3)),'stun':2 if p['fruit']==BISON else 0} for e in targets]}
  if not p['remaining']:self.shots.pop(token)
  return result
 def tick(self,player,instance,x,y,view,enemies):
  now=self.clock();flags=self.flags.get(player,{})
  for key in list(flags):
   if flags[key]['until']<=now or flags[key]['instance']!=instance:flags.pop(key)
  self.support.setdefault(player,{}).pop(player,None)
  for entries in self.support.values():entries.pop(player,None)
  buff=flags.get('1');debuff=flags.get('2');party=self.party_provider(player,instance) if self.party_provider else None
  actors=[{'id':player,'x':x,'y':y,'view':view}]
  if party and party.get('partyId'):
   actors += [m for m in party.get('members',[]) if m.get('partyId')==party['partyId'] and m.get('instance')==instance and m.get('alive',True) and m.get('hp',1)>0 and m.get('id') is not None]
  if buff:
   for m in actors:
    v=m.get('view',{'x':m['x']-buff['view']['width']/2,'y':m['y']-buff['view']['height']/2,'width':buff['view']['width'],'height':buff['view']['height']})
    if visible(buff,v):self.support.setdefault(str(m['id']),{})[player]=min(buff['until'],now+1.1)
  ids=[e['id'] for e in enemies if debuff and all(finite(e.get(k)) for k in ['x','y']) and visible(e,debuff['view'])]
  return {'flags':list(flags.values()),'support':any(t>now for t in self.support.get(player,{}).values()),'debuff_ids':ids,'attack_multiplier':.8,'defense_multiplier':.8}
