"""Hoya summon contracts for the existing client-simulated world."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/hoya/rules.json').read_text(encoding='utf8'));HOYA=RULES['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def scaled(base,factor):
 out={k:v*factor for k,v in base.items()}
 for k,cap in {'crit':.65,'evasion':.65,'accuracy':1,'penetration':.6,'magicPen':.6,'lifesteal':.3,'mitigation':.8}.items():
  if k in out:out[k]=min(cap,out[k])
 return out
class HoyaService:
 def __init__(self,clock):self.clock=clock;self.pets={}
 def clear(self,player):self.pets.pop(player,None)
 def active(self,player):
  p=self.pets.get(player)
  if p and (p['until']<=self.clock() or p['hp']<=0):self.clear(player);return False
  return bool(p)
 def stats(self,p):return scaled(p['base'],2 if p['buff_until']>self.clock() else 1)
 def sync(self,p):
  factor=2 if p['buff_until']>self.clock() else 1
  if factor!=p['factor']:p['hp']*=factor/p['factor'];p['factor']=factor
 def advance(self,p):
  a=p.get('attack');now=self.clock()
  if not a:return
  start=a['last'];split=p['buff_until'];speed=p['base']['speed']
  if start<split<now:a['progress']+=(split-start)/max(.15,1/(speed*2))+(now-split)/max(.15,1/speed)
  else:a['progress']+=(now-start)/max(.15,1/(speed*(2 if split>start else 1)))
  a['last']=now
 def state(self,player):
  if not self.active(player):return {'active':False,'isUntargetable':False,'isInvulnerable':False}
  p=self.pets[player];self.sync(p);return {'active':True,'isUntargetable':True,'isInvulnerable':True,'expires_at':p['until'],'buff_until':p['buff_until'],'hp':p['hp'],'stats':self.stats(p),'x':p['x'],'y':p['y']}
 def cast(self,store,player,instance,x,y,key,energy,ctx):
  if key not in ['1','2'] or not instance or not all(finite(v) for v in [x,y,energy]) or energy<0 or ctx.get('controlled'):raise ValueError('Invocação ou posição inválida')
  skill=RULES['skills'][int(key)-1];now=self.clock();active=self.active(player);cd=HOYA+':'+key
  if key=='1' and active or key=='2' and not active:raise ValueError('É necessário um Gênio ativo' if key=='2' else 'Gênio já invocado')
  if store.state(player)['cooldowns'].get(cd,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  if key=='1':
   base=ctx.get('stats',{});point=ctx.get('summon',{})
   if not isinstance(base,dict) or not all(finite(v) and v>=0 for v in base.values()) or any(not finite(base.get(k)) or base[k]<=0 for k in ['maxHP','attack','speed','moveSpeed']) or not all(finite(point.get(k)) for k in ['x','y']) or math.hypot(point['x']-x,point['y']-y)>160:raise ValueError('Atributos ou local de invocação inválidos')
   base=scaled(base,1.5);self.pets[player]={'instance':instance,'base':base,'hp':base['maxHP'],'until':now+60,'buff_until':0,'factor':1,'x':point['x'],'y':point['y'],'target_id':None,'attack':None}
  else:
   p=self.pets[player]
   if p['instance']!=instance:raise ValueError('Instância diferente')
   self.advance(p);self.sync(p);p['buff_until']=now+10;self.sync(p)
  ready=now+skill['cooldown']
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,HOYA,key,ready))
  return {'energy_spent':skill['cost'],'effect':{**self.state(player),'ready_at':ready}}
 def cancel(self,player,instance):
  p=self.pets.get(player)
  if p and p['instance']!=instance:raise ValueError('Instância diferente')
  self.clear(player)
  return {'cancelled':True,**self.state(player)}
 def command(self,player,instance,x,y,target_id=None):
  if not self.active(player) or self.pets[player]['instance']!=instance or not all(finite(v) for v in [x,y]):raise ValueError('Gênio ou comando inválido')
  self.pets[player]['target_id']=target_id;return {'accepted':True}
 def start_attack(self,player,instance,x,y,target):
  if not self.active(player):raise ValueError('Gênio ausente')
  p=self.pets[player];self.advance(p)
  if p['instance']!=instance or not all(finite(v) for v in [x,y,target.get('x'),target.get('y')]) or not target.get('alive',True) or math.hypot(target['x']-x,target['y']-y)>RULES['range']+2 or p.get('attack') and p['attack']['progress']<1-1e-6:raise ValueError('Alvo fora de alcance ou ataque em curso')
  p['x']=x;p['y']=y;token=uuid.uuid4().hex;p['attack']={'token':token,'target_id':target['id'],'progress':0,'last':self.clock(),'used':False};return {'token':token,'duration':max(.15,1/self.stats(p)['speed'])}
 def impact(self,player,token,instance,x,y,target):
  if not self.active(player):raise ValueError('Gênio ausente')
  p=self.pets[player];self.advance(p);a=p.get('attack')
  if not a or a['token']!=token or a['used'] or a['progress']+1e-6<RULES['hitFrameRatio'] or p['instance']!=instance or str(a['target_id'])!=str(target.get('id')) or not target.get('alive',True) or not all(finite(v) for v in [x,y,target.get('x'),target.get('y'),target.get('defense',0)]) or target.get('defense',0)<0 or math.hypot(target['x']-x,target['y']-y)>RULES['range']+2:raise ValueError('Impacto inválido, antecipado ou repetido')
  a['used']=True;s=self.stats(p);damage=max(1,math.floor(s['attack']-target.get('defense',0)*(1-s.get('penetration',0))*.3));self.sync(p);p['hp']=min(s['maxHP'],p['hp']+damage*s.get('lifesteal',0));return {'damage':damage}
 def receive(self,player,amount,physical=True):
  if not self.active(player) or not finite(amount) or amount<0:raise ValueError('Gênio ou dano inválido')
  p=self.pets[player];self.sync(p);s=self.stats(p);defense=s.get('defense',0) if physical else s.get('magicDefense',s.get('defense',0));damage=0 if amount==0 else max(1,math.floor(amount*100/(100+defense*3)*(1-s.get('mitigation',0))));p['hp']=max(0,p['hp']-damage);state=self.state(player);return {'damage':damage,**state}
