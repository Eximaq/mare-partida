"""Rank B combat contracts for the existing locally simulated game."""
import json,math,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RULES=json.loads((ROOT/'assets/akuma/rank-b-rules.json').read_text(encoding='utf8'))
BETA=RULES['beta']['id'];HANA=RULES['hana']['id']
def duration(path):return [f['duration']/1000 for f in json.loads((ROOT/path).read_text())['frames']]
PUNCH_FRAMES=duration('assets/akuma/hana/power-aura-take-7.json');CHOKE_FRAMES=duration('assets/akuma/hana/power-aura-take-8.json')
PUNCH_DURATION=sum(PUNCH_FRAMES);CHOKE_LEAD=sum(CHOKE_FRAMES[:12]);CHOKE_END=sum(CHOKE_FRAMES)+5-CHOKE_FRAMES[12]
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def visible(e,v):return isinstance(v,dict) and all(finite(v.get(k)) for k in ['x','y','width','height']) and v['width']>0 and v['height']>0 and v['x']<=e['x']<=v['x']+v['width'] and v['y']<=e['y']<=v['y']+v['height']
def mitigate(amount,fruit,physical=True,has_haki=False):return amount*.7 if fruit==BETA and physical and not has_haki else amount
class RankBService:
 def __init__(self,clock):self.clock=clock;self.jobs={}
 def clear(self,player):self.jobs={k:j for k,j in self.jobs.items() if j['owner']!=player}
 def state(self,player):
  now=self.clock();return [{'token':k,'kind':j['kind'],'target_id':j['target_id'],'started':j['started'],'end':j['end'],'control_from':j.get('control_from')} for k,j in self.jobs.items() if j['owner']==player and j['end']>now]
 def cast(self,store,player,fruit,instance,x,y,enemies,key,energy,attack,ctx):
  now=self.clock();self.jobs={k:j for k,j in self.jobs.items() if j['expires']>now};ctx=ctx or {};rule=RULES['beta' if fruit==BETA else 'hana'];skill=next((s for s in rule['skills'] if s['key']==key),None)
  if not skill or not instance or not all(finite(v) for v in [x,y,energy]) or energy<0 or ctx.get('controlled'):raise ValueError('Habilidade, posição ou controle inválido')
  power=ctx.get('special_attack') if fruit==BETA else attack;pen=ctx.get('magic_penetration',0) if fruit==BETA else ctx.get('penetration',0)
  if not finite(power) or power<0 or not finite(pen) or not 0<=pen<=.6:raise ValueError('Poder ou penetração inválida')
  live=[e for e in enemies if e.get('alive',True) and e.get('hp',1)>0 and all(finite(e.get(k)) for k in ['x','y'])];target=next((e for e in live if str(e.get('id'))==str(ctx.get('target_id'))),None)
  if not (fruit==BETA and key=='1'):
   if not target or not visible(target,ctx.get('view',{})) or fruit==HANA and key=='1' and math.hypot(target['x']-x,target['y']-y)>128:raise ValueError('Selecione um alvo vivo, visível e ao alcance')
  cdkey=fruit+':'+key
  if store.state(player)['cooldowns'].get(cdkey,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  targets=[e for e in live if math.hypot(e['x']-x,e['y']-y)<=128] if fruit==BETA and key=='1' else [target] if fruit==HANA and key=='2' else []
  armor_key='magicDefense' if fruit==BETA else 'defense'
  if any(not finite(e.get(armor_key,e.get('defense',0))) or e.get(armor_key,e.get('defense',0))<0 for e in targets):raise ValueError('Defesa inválida')
  multiplier=1.5 if fruit==BETA else 1
  hits=[{'id':e['id'],'damage':max(1,math.floor(power*multiplier-e.get(armor_key,e.get('defense',0))*(1-pen)*.3))} for e in targets]
  effect={'type':'sticky_burst' if fruit==BETA and key=='1' else 'rank_b_target','hits':hits}
  if not (fruit==BETA and key=='1'):
   token=uuid.uuid4().hex;kind='root' if fruit==BETA else 'punch' if key=='1' else 'choke';length=4 if kind=='root' else PUNCH_DURATION if kind=='punch' else CHOKE_END
   due=[] if kind=='root' else [PUNCH_DURATION*(i+1)/4 for i in range(4)] if kind=='punch' else [CHOKE_LEAD+i+1 for i in range(5)]
   self.jobs[token]={'owner':player,'instance':instance,'fruit':fruit,'kind':kind,'target_id':target['id'],'started':now,'end':now+length,'expires':now+length+2,'control_from':now+CHOKE_LEAD if kind=='choke' else now,'power':power,'pen':pen,'due':due,'used':[]}
   effect.update(token=token,target_id=target['id'],kind=kind,expires_at=now+length,control_from=self.jobs[token]['control_from'])
  ready=now+skill['cooldown']*(1-rule['passiveStats'].get('cooldown_reduction',0))
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,fruit,key,ready))
  return {'effect':{**effect,'ready_at':ready},'energy_spent':skill['cost'],'energy_remaining':energy-skill['cost']}
 def tick(self,player,token,index,instance,enemies):
  j=self.jobs.get(token);now=self.clock()
  if not j or j['owner']!=player or j['instance']!=instance or j['expires']<=now or not isinstance(index,int) or isinstance(index,bool) or not 0<=index<len(j['due']) or index in j['used'] or now+.025<j['started']+j['due'][index]:raise ValueError('Tick inválido, antecipado ou repetido')
  target=next((e for e in enemies if str(e.get('id'))==str(j['target_id']) and e.get('alive',True) and e.get('hp',1)>0),None)
  if not target:raise ValueError('Alvo indisponível')
  armor=target.get('defense',0)
  if not finite(armor) or armor<0:raise ValueError('Defesa inválida')
  j['used'].append(index);mult=.8 if j['kind']=='punch' else .9
  return {'target_id':j['target_id'],'damage':max(1,math.floor(j['power']*mult-armor*(1-j['pen'])*.3)),'index':index}
