"""Validation of additional Rank A casts and indexed, non-repeating impacts."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-a-rules.json').read_text(encoding='utf8'))
IDS={RULES[k]['id']:k for k in ['bari','doku','ito']}
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def live(m):return m and m.get('alive',True) and m.get('hp',1)>0 and all(finite(m.get(k)) for k in ['x','y'])
def distance(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
class RankAExpansionService:
 def __init__(self,clock):self.clock=clock;self.jobs={};self.domes={}
 def clear(self,p):self.domes.pop(p,None);self.jobs={k:j for k,j in self.jobs.items() if j['owner']!=p}
 def active(self,p):return self.domes.get(p,0)>self.clock()
 def protect(self,p,amount,projectile=False,melee=False,reflected=False):
  active=self.active(p);damage=amount*(0 if projectile else .2) if active else amount
  return {'damage':damage,'reflected':damage*.2 if active and melee and not reflected else 0,'cc_immune':active}
 def cast(self,store,p,fruit,instance,x,y,enemies,key,energy,attack,ctx,direction):
  now=self.clock();ctx=ctx or {};family=IDS[fruit];r=RULES[family];skill=next((s for s in r['skills'] if s['key']==key),None)
  if not skill or not instance or not all(finite(v) and v>=0 for v in [energy,attack,ctx.get('special_attack')]) or not all(finite(v) for v in [x,y]) or ctx.get('controlled'):raise ValueError('Lançamento inválido')
  if not isinstance(direction,(list,tuple)) or len(direction)!=2 or not all(finite(v) for v in direction) or not .99<=math.hypot(*direction)<=1.01:raise ValueError('Direção inválida')
  origin={'x':x,'y':y};target=next((m for m in enemies if live(m) and str(m.get('id'))==str(ctx.get('target_id'))),None)
  if family=='ito' and key in ('1','2') or family=='doku' and key=='1':
   if not target or distance(origin,target)>(320 if family=='ito' else 256):raise ValueError('Alvo fora de alcance')
  if store.state(p)['cooldowns'].get(fruit+':'+key,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  if family=='bari' and key=='2':self.domes[p]=now+10;effect={'type':'bariDome','until':now+10}
  else:
   kind=({'1':'bariPush','3':'bariCharge'} if family=='bari' else {'1':'hydra','2':'gasBomb','3':'redPoison'} if family=='doku' else {'1':'tamaito','2':'parasite','3':'overheat'})[key]
   point={'x':target['x'],'y':target['y']} if target else {'x':x+direction[0]*192,'y':y+direction[1]*192}
   if kind=='redPoison':point={'x':math.floor(x/64)*64+32,'y':math.floor(y/64)*64+32}
   if kind=='gasBomb' and distance(origin,point)>192:
    d=distance(origin,point);point={'x':x+(point['x']-x)*192/d,'y':y+(point['y']-y)*192/d}
   token='e:'+uuid.uuid4().hex;self.jobs={k:j for k,j in self.jobs.items() if j['expires']>now}
   self.jobs[token]={'owner':p,'instance':instance,'fruit':fruit,'kind':kind,'started':now,'expires':now+12,'origin':origin,'point':point,'target':target.get('id') if target else None,'direction':direction,'physical':attack,'special':ctx['special_attack'],'attack':ctx.get('attack',attack),'used':set()}
   if len(self.jobs)>512:self.jobs.pop(next(iter(self.jobs)))
   effect={'type':kind,'token':token}
  ready=now+skill['cooldown']
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(p,fruit,key,ready))
  return {'effect':{**effect,'ready_at':ready},'energy_spent':skill['cost'],'energy_remaining':energy-skill['cost']}
 def impact(self,p,token,instance,enemies,target_id,event,context):
  now=self.clock();j=self.jobs.get(token);m=next((m for m in enemies if live(m) and str(m.get('id'))==str(target_id)),None);context=context or {};event=event or 'initial'
  if not j or j['owner']!=p or j['instance']!=instance or now>j['expires'] or not m or (str(target_id),event) in j['used']:raise ValueError('Impacto inválido ou repetido')
  point=context.get('impact_point')
  if j['kind']=='gasBomb' and isinstance(point,dict) and all(finite(point.get(k)) for k in ['x','y']) and distance(j['origin'],point)<=192.01:j={**j,'point':point}
  kind=j['kind'];age=now-j['started'];delay=0;magic=kind in ('hydra','gasBomb','redPoison');absolute=kind=='redPoison';mult=1;power=j['special'] if magic else j['physical'];dot=False
  if event.startswith('dot:'):
   bits=event.split(':')
   if len(bits)!=3 or not bits[2].isdigit():raise ValueError('Tick inválido')
   typ=bits[1];index=int(bits[2]);expected={'hydra':('severe',5,.8),'redPoison':('corrosion',3,.6),'tamaito':('bleed',4,distance(j['origin'],j['point'])/1000)}.get(kind)
   if not expected or typ!=expected[0] or not 1<=index<=expected[1] or str(m.get('id'))!=str(j['target']) and kind!='redPoison':raise ValueError('Tick incompatível')
   if kind in ('hydra','redPoison') and (str(target_id),'initial') not in j['used'] or kind=='tamaito' and not any((str(target_id),'shot:'+str(i)) in j['used'] for i in range(3)):raise ValueError('Veneno sem acerto inicial')
   delay=expected[2]+index;dot=True
   if kind=='redPoison':
    hp=m.get('maxHP')
    if not finite(hp) or hp<=0:raise ValueError('HP máximo inválido')
    power=hp*.05
   else:power=j['attack']*.2 if kind=='hydra' else j['physical']*.15
  elif kind in ('bariPush','bariCharge'):
   x=m['x']-j['origin']['x'];y=m['y']-j['origin']['y'];dx,dy=j['direction'];along=x*dx+y*dy
   if along<0 or along>258 or abs(x*dy-y*dx)>50 or event not in ('initial','wall') or event=='wall' and kind!='bariPush':raise ValueError('Fora da barreira')
   if event=='wall' and (str(target_id),'initial') not in j['used']:raise ValueError('Colisão sem arrasto')
   delay=max(0,(along-48)/640);mult=1 if event=='wall' else 3.5 if kind=='bariPush' else 3
  elif kind=='hydra':
   if event!='initial' or str(m.get('id'))!=str(j['target']):raise ValueError('Alvo incorreto')
   delay=.8;mult=2.5
  elif kind=='gasBomb':
   if distance(j['point'],m)>128:raise ValueError('Fora do gás')
   delay=distance(j['origin'],j['point'])/640
   if event=='initial':mult=1.5
   elif event.startswith('gas:') and event[4:].isdigit() and 1<=int(event[4:])<=4:delay+=int(event[4:]);power=j['special']*.2;dot=True
   else:raise ValueError('Tick de gás inválido')
  elif kind=='redPoison':
   if event!='initial' or distance(j['point'],m)>192:raise ValueError('Fora da poça')
   delay=.6;mult=5
  elif kind=='tamaito':
   if event not in ('shot:0','shot:1','shot:2') or str(m.get('id'))!=str(j['target']) or distance(j['origin'],m)>320:raise ValueError('Disparo inválido')
   delay=int(event[-1])*.12+distance(j['origin'],m)/1000;mult=1.8
  elif kind=='parasite':
   if event not in ('self:1.5','self:3.5') or str(m.get('id'))!=str(j['target']):raise ValueError('Marionete inválida')
   delay=float(event[5:]);power=m.get('attack',0)
  elif kind=='overheat':
   if event not in ['whip:'+str(i) for i in range(6)]:raise ValueError('Corte inválido')
   index=int(event[-1]);hero=context.get('hero') or j['origin']
   if not all(finite(hero.get(k)) for k in ['x','y']) or distance(hero,m)>192:raise ValueError('Fora do chicote')
   dx,dy=j['direction'];cross=(m['x']-hero['x'])*-dy+(m['y']-hero['y'])*dx
   if (1 if cross>=0 else -1)!=(1 if index%2==0 else -1):raise ValueError('Lado incorreto')
   delay=.15+index*.3;mult=2.5
  else:raise ValueError('Efeito inválido')
  if age+.035<delay:raise ValueError('Impacto antecipado')
  armor=0 if absolute or dot else m.get('magicDefense',m.get('defense',0)) if magic else m.get('defense',0)
  if not finite(armor) or armor<0 or not finite(power) or power<0:raise ValueError('Atributos inválidos')
  damage=math.floor(power) if dot else max(1,math.floor(power*mult-armor*.3));j['used'].add((str(target_id),event))
  return {'damage':damage,'target_id':target_id,'event':event,'ignore_armor':absolute,'dot':dot}
