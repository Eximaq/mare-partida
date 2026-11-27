from PIL import Image, ImageDraw, ImageFont
from math import sin,cos,pi,sqrt
from pathlib import Path
import random, json, hashlib
ROOT=Path('.'); BASE=ROOT/'assets/vfx/daily-sword-bosses'
P={
 'daily-mihawk':('#103b37','#17986b','#55ffb0','#e4fff2'),
 'daily-shanks':('#241521','#931b3c','#ff4f5b','#fff0d9'),
 'daily-ryuma-alive':('#1c344f','#496d9e','#81d6f4','#eafaff'),
 'daily-oden':('#482148','#a73779','#ff9a63','#fff0ac'),
 'daily-rayleigh':('#182944','#465eaa','#b4baff','#fff5ce'),
 'daily-zoro':('#19253e','#4d32a1','#b568ff','#b2fff3'),
 'daily-shiki':('#63482b','#b37331','#f8be55','#fff3a1'),
}
keys=list(P);travel={keys[0],keys[1],keys[6]}
def art(key,kind,f):
 idx=keys.index(key); colors=P[key]; rng=random.Random(470+idx*31)
 im=Image.new('RGBA',(96,96)); d=ImageDraw.Draw(im)
 def xy(p):return tuple(round(u+48) for u in p)
 def poly(ps,c):d.polygon([xy(p) for p in ps],fill=colors[c])
 def line(ps,c,w=1):d.line([xy(p) for p in ps],fill=colors[c],width=max(1,round(w)),joint='curve')
 def dot(x,y,r,c):
  poly([(x-r,y),(x,y-r),(x+r,y),(x,y+r)],c)
 def quad(a,b,c,t):
  return tuple((1-t)**2*a[i]+2*t*(1-t)*b[i]+t*t*c[i] for i in (0,1))
 def blade(a,b,c,w=7,portion=1,col=2):
  ts=[i*portion/28 for i in range(29)]
  def band(w):
   hi=[];lo=[]
   for u in ts:
    x,y=quad(a,b,c,u);dx,dy=(b[0]-a[0])*(1-u)+(c[0]-b[0])*u,(b[1]-a[1])*(1-u)+(c[1]-b[1])*u
    ll=max(1,sqrt(dx*dx+dy*dy));v=w*(.20+.8*sin(pi*u)**.7)
    hi.append((x-dy/ll*v,y+dx/ll*v));lo.append((x+dy/ll*v*.55,y-dx/ll*v*.55))
   return hi+lo[::-1]
  poly(band(w+1.6),0);poly(band(w),1);poly(band(w*.68),col);poly(band(max(.7,w*.22)),3)
 def sparks(n,rx,ry,speed=1,cx=0,cy=0):
  for i in range(n):
   a=rng.uniform(-pi,pi); frac=rng.uniform(.2,1); radius=.34+f*.145*speed
   x,y=cx+cos(a)*rx*frac*radius,cy+sin(a)*ry*frac*radius
   s=rng.choice([1,1,2,3])*(1.15-f*.095)
   if (i+f)%7!=0:dot(x,y,max(1,s),2+(i%3==0))
 def ring(r,flat=.54,broken=False):
  for band,w in [(0,5),(1,4),(2,2),(3,1)]:
   for s in range(6):
    if broken and (s+f)%6==0:continue
    a=(s/6)*2*pi+.075
    b=((s+1)/6)*2*pi-.08
    line([(r*cos(a+(b-a)*i/18),r*flat*sin(a+(b-a)*i/18)) for i in range(19)],band,w)
 def lightning(x,y,n=4):
  pts=[(x,y)]
  for j in range(n):
   px,py=pts[-1];pts.append((px+rng.randrange(3,8),py+rng.randrange(-8,9)))
  line(pts,0,5);line(pts,2,3);line(pts,3,1)
 w=[.45,.78,1,.76,.46,.18][f]
 spread=[.58,.83,1,.98,.9,.76][f]
 if idx==0 and kind=='travel':
  for shift,ww in [(-8,2),(4,8),(10,2)]:
   blade((-14*spread,-29+shift),(36*spread,shift),(0,31-shift),ww*w)
  for y in [-20,2,19]: line([(-39+f*2,y),(2+f*2,y-4)],1,max(1,3*w))
  sparks(14,39,34,cx=-8)
 elif idx==0:
  blade((-18,22),(26,-8),(15,-29),8*w);blade((-17,15),(8,5),(31,-7),3*w)
  sparks(38,41,37);dot(1,-2,max(1,9*w),3)
 elif idx==1 and kind=='travel':
  for i in range(5):
   y=-21+i*9
   blade((-44+i*4,y+5),(-10,y-12),(32-i*2,y-10),6*w,portion=.80+f*.035)
  for y in (-18,-7,8,18):lightning(-28+f*2,y)
  sparks(24,50,28)
 elif idx==1:
  blade((-34,18),(7,-1),(34,-30),12*w)
  blade((-34,27),(2,14),(38,-20),5*w)
  for x,y in [(-32,-6),(-15,15),(8,-19),(0,28)]:lightning(x,y)
  for i in range(7):
   a=i*pi*2/7
   poly([(2,0),(cos(a-.08)*23*w,sin(a-.08)*23*w),(cos(a)*40*w,sin(a)*38*w),(cos(a+.08)*24*w,sin(a+.08)*23*w)],2)
  dot(2,0,max(1,10*w),3);sparks(33,46,40)
 elif idx==2:
  blade((-23,-34),(31,-23),(24,33),10*w,portion=min(1,.62+f*.14))
  blade((-27,-22),(19,-20),(14,30),4*w)
  blade((-24,24),(12,40),(41,23),4*w)
  sparks(34,43,28,cy=13)
 elif idx==3:
  blade((-32,-32),(5,2),(34,28),10*w,portion=min(1,.68+f*.15))
  blade((-34,28),(-3,6),(36,-33),10*w,portion=min(1,.68+f*.15))
  dot(1,1,max(1,12*w),3)
  for i in range(4):line([(-13+i*8,-22),(0,0),(15-i*7,25)],2,1)
  sparks(40,44,43)
 elif idx==4:
  ring([9,15,24,31,37,42][f],.68,True)
  blade((-21,21),(-28,-10),(20,-34),8*w)
  blade((-13,20),(-16,-12),(15,-35),4*w)
  for i in range(12):
   x=rng.randint(-30,30);y=rng.randint(-30,22)
   line([(x,y),(x+3,y-7-f)],2,1)
  sparks(28,41,34)
 elif idx==5:
  for j in (-1,0,1):
   y=j*25
   blade((-34,y+12),(1,y-16),(39,y-3),8*w,portion=min(1,.68+f*.16))
   blade((-32,y+17),(4,y-4),(41,y+3),3*w)
  sparks(45,43,39)
 elif idx==6 and kind=='travel':
  for j in range(5):
   x,y=rng.randint(-32,32),rng.randint(-5,27)-f*4;r=rng.randint(4,9)
   poly([(x-r,y+r),(x-r,y-2),(x,y-r),(x+r,y-4),(x+r,y+r)],0)
   poly([(x-r+2,y-1),(x,y-r+1),(x+r-2,y-4),(x+2,y+2),(x-r+2,y+r)],1)
   line([(x-r+2,y-2),(x,y-r+1),(x+r-2,y-4)],2,2)
   line([(x,y+r),(x-2,y+r+7)],2,1)
  sparks(32,45,42)
 elif idx==6:
  ring([9,17,25,34,39,42][f],.72,True)
  for k in range(9):
   a=k*2*pi/9+rng.random()*.4;r=(12+f*4.2)*rng.uniform(.65,1.1)
   x,y=r*cos(a),r*.65*sin(a)-max(0,8-f)
   s=max(2,rng.randrange(4,10)*w); x=max(-43+s,min(43-s,x))
   poly([(x-s,y+s),(x-s,y-2),(x,y-s),(x+s,y-2),(x+s,y+s)],0)
   poly([(x-s,y-2),(x,y-s),(x+s,y-2),(x+1,y+1)],1)
   line([(x-s,y-2),(x,y-s),(x+s,y-2)],2,1)
  sparks(39,40,37,cy=2)
 # Bounded brightness; fade rather than looping the hit.
 if f>=3:
  opacity=[1,1,1,.86,.62,.31][f]
  im.putalpha(im.getchannel('A').point(lambda a:round(a*opacity)))
 return im.resize((192,192),Image.Resampling.NEAREST)
meta={}
for key in keys:
 meta[key]={}
 for kind in (['travel','impact'] if key in travel else ['impact']):
  path=BASE/key/(kind+'.png');path.parent.mkdir(parents=True,exist_ok=True)
  o=Image.new('RGBA',(1152,192));frames=[art(key,kind,k) for k in range(6)]
  for j,i in enumerate(frames):o.paste(i,(192*j,0))
  o.save(path,optimize=True)
  assert all(im.getbbox() and all(s>0 for s in im.getbbox()[0:2]) and max(im.getbbox()[2:4])<192 for im in frames),(key,kind,[im.getbbox() for im in frames])
  meta[key][kind]={'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(__import__('sys').stdout).write(json.dumps(meta,indent=2)+'\n')
print(len(keys),sum(map(len,meta.values())))
