import pathlib,json,zipfile,io,math,hashlib,copy
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parents[1];d=root/'tools/rework-modular-outfits-hd';x=json.loads((d/'index.json').read_text());a=json.loads((d/'archives/archive-index.json').read_text())
def load(s):
 p=d/'assets'/(s+'.png')
 if p.exists():return Image.open(p).convert('RGBA')
 e=a['sources'][s]
 with zipfile.ZipFile(d/'archives'/e['archive'])as z:return Image.open(io.BytesIO(z.read(e['path']))).convert('RGBA')
r=next(r for r in x['records']if r.get('isolatedCoat151')and r['direction']=='south'and r['action']=='idle');ls={l['id'].replace('coat151-own-original-control-',''):l for l in r['pack']['directions']['south']['layers']if l['id'].startswith('coat151')}
P=[([(276,258),(261,303),(254,358)],[(364,258),(379,303),(386,358)]), ([(285,260),(273,292),(292,272)],[(357,260),(369,292),(350,273)]), ([(291,254),(267,285),(278,298)],[(360,264),(374,293),(362,278)]), ([(289,254),(281,270),(285,274)],[(359,265),(372,293),(360,278)]), ([(287,250),(281,266),(288,271)],[(358,268),(369,294),(358,281)]), ([(287,253),(280,273),(291,280)],[(358,268),(369,294),(358,281)]), ([(285,260),(273,292),(292,272)],[(357,260),(369,292),(350,273)]), ([(279,260),(266,306),(258,355)],[(366,260),(383,306),(388,354)])]
H=[[], [[(281,240),(306,240),(307,263),(294,279),(281,270)],[(336,240),(359,240),(364,262),(353,278),(340,272)]], [[(263,287),(283,284),(294,301),(286,318),(269,316)],[(347,246),(367,246),(373,269),(362,285),(348,273)]], [[(249,254),(294,241),(309,255),(307,279),(289,292),(253,291)],[(347,248),(368,248),(373,272),(362,285),(348,273)]], [[(253,239),(307,237),(326,257),(326,278),(300,287),(263,281)],[(345,248),(365,248),(372,270),(362,285),(348,274)]], [[(253,256),(302,245),(316,263),(312,285),(286,295),(257,287)],[(345,248),(365,248),(372,270),(362,285),(348,274)]], [[(281,240),(306,240),(307,263),(294,279),(281,270)],[(336,240),(359,240),(364,262),(353,278),(340,272)]], []]
rest={'right':[(211.9043+64,193.8373+64),(197.2057+64,239.4641+64),(189.8565+64,293.6651+64)],'left':[(300.0957+64,193.8373+64),(314.7943+64,239.4641+64),(322.1435+64,293.6651+64)]}
def padded(im):o=Image.new('RGBA',(640,640));o.paste(im,(64,64));return o
def rigid(im,oldA,oldB,newA,newB,distal=False):
 ang=math.atan2(newB[1]-newA[1],newB[0]-newA[0])-math.atan2(oldB[1]-oldA[1],oldB[0]-oldA[0]);c,s=math.cos(ang),math.sin(ang);op,np=(oldB,newB)if distal else(oldA,newA);tx=np[0]-c*op[0]+s*op[1];ty=np[1]-s*op[0]-c*op[1];out=im.transform((640,640),Image.Transform.AFFINE,(c,s,-c*tx-s*ty,-s,c,s*tx-c*ty),Image.Resampling.NEAREST)
 mask=Image.new('L',(640,640));dr=ImageDraw.Draw(mask);dr.line([newA,newB],fill=255,width=40);rr=20
 for p in[newA,newB]:dr.ellipse((p[0]-rr,p[1]-rr,p[0]+rr,p[1]+rr),fill=255)
 import PIL.ImageChops
 out.putalpha(PIL.ImageChops.multiply(out.getchannel('A'),mask));return out
assets={};frames=[]
for i,pose in enumerate(P):
 out=Image.new('RGBA',(640,640))
 for name in ['coat151-rear-openings','core','hem']:
  part=padded(load(ls[name]['source']))
  if name=='coat151-rear-openings':part.paste((0,0,0,0),(0,300,640,640))
  part.paste((0,0,0,0),(0,330,245,365));part.paste((0,0,0,0),(398,330,640,365))
  out.alpha_composite(part)
 for side,pts in zip(['right','left'],pose):
  for segment,u,v in [('upper',0,1),('lower',1,2)]:out.alpha_composite(rigid(padded(load(ls[side+'-'+segment]['source'])),rest[side][u],rest[side][v],pts[u],pts[v],segment=='lower'))
 mask=out.getchannel('A');dr=ImageDraw.Draw(mask)
 for poly in H[i]:dr.polygon(poly,fill=0)
 out.putalpha(mask);b=io.BytesIO();out.save(b,format='PNG');v=b.getvalue();sha=hashlib.sha256(v).hexdigest();assets[sha]=v;frames.append(sha)
base=next(r for r in x['records']if r['direction']=='south'and r['action']=='attack-unarmed'and r['equipment']=={'pants':133,'boots':9});new=copy.deepcopy(base)
for k in['paletteSourceMasks','paletteRefs','palettePolicy']:new.pop(k,None)
new['id']=base['id']+'-coat151-south-registered';new['equipment']['torso']=151;new['isolatedCoat151']={'candidate':True,'source':'original south idle garment components','registration':'eight manually annotated arm poses; rigid scale1, proximal overlap clipped; original hand ownership retained'};new['pack']['directions']['south']['layers'].append({'id':'coat151-registered-south','slot':'body','frames':frames,'depth':100,'binding':{'kind':'fixed'}});new['sourceRefs']=sorted(set(new['sourceRefs']+frames));new['candidate']=True;new['status']='native-coat151-manual-registration-candidate'
path=pathlib.Path('/tmp/coat151south');path.mkdir(exist_ok=True)
for s,v in assets.items():(path/(s+'.png')).write_bytes(v)
(path/'record.json').write_text(json.dumps(new));(path/'registration.json').write_text(json.dumps({'poses':P,'handOwnership':H,'scale':1,'sources':{k:v['source']for k,v in ls.items()}},indent=2));print(path)
