"""Register each North staff's nine painted phases to the original clothing panels."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from export_north_focus_coats import SOURCES
from export_staff_coats import BANK, weapons
from register_south_focus_trousers import BASE, OUTFITS, ROOT

ARCHIVE=ROOT/'tools/rework-combat-wardrobe/north-staff-wardrobe.zip'
BARE128=["375c41e33e6ae3ab67a13d355d5af3694b089074d67d5114f3d2ac0017bc8e4c","5bb2ea0a55e33c1bf02ecad7e44ea4edc130d5e92652386b27f4b61f81bc3707","4c1a1658b50c8998710edc612843510e68fd64b3cfde2c98cea46e11de33ae33","8077446c35edffc20c687cf984f75f60c5f8794803ac515ecd62f097a75168c2","787559cf15af4a265688a7653e9b9b3c632cecdb35e9a113d57ff8e9ce5b870c","0e53369901048563497a8d7285cda0ac66757ef248fd04009bd8306205499b73","435f81f647570bdfc7bda80042a7bc4d633fe53a4cedae99e5a2eabc602f3826","41084c9e165baa3f7fd6739508b2c44e9e7ba435ea922847dbe1d83e5bcb535c","f866e23c01a62a2061b947789c359b066a429d888d16a86657c4ab9103c949ba"]
RANKS={"123":["e0026c6154197a9fca8877e4943c9606f05135fdf4294bde1e358d1075da2592","7c4ac7f9a7c5903e1deaa61628ccfd9a778859ae7346a716daa72ec0508cc494","6ac9eaa4a1933ca420caa16c2b119149541e6c7635daebf82b749d41d8d47a51","36c63991ee52353dbee89690b819f3354bc158abffad8e97a1936da9c9341824","9375abd2daeaa74a90122e484239ddc04e77192010619119f2fc9a65e47e5a0a","7bde9b0b36d3282a1c4e5e5d4ce95df7d8d51fd4bb1747dd3ba4c77801639055","fd767a2a8c3ad78a7ca754e177aa341c69ec9886914320572f8c5d1e3c0b7c3c","cbedc89f7b5fe9b9049ccdf64ab3ccfd45872eb3a1801b3322a60510c808cb9a","349f380861fb1370ad908e51614d5e9ca0f0bcd234d587d0232ecdc69e40697f"],"124":["c070b14e5af24804c6d5e6d83d6d7c6a4b775dae6928f098def43915057d0c22","eec4b2a964f9acbadd5d60ba2cc570787364a485a6a8140798ec1237395b4267","8c284b7f1c9d96c18f6e080e1e470b8313476a754124afbb9691be951d781e9f","585fb294932f2f691432536d0ed504f02c92fa345939abe1c1f49d0aa657b727","3c6c0df787f9659983251752907bda0451300092736f125bbfc785a2fde907f0","2d677150136ffedd6214d8b9cf8ed1f7e8e706dcd6f58acd295dfa1736ca3969","6917a9d1fc699d3e343f6ba6836f1e3be71e9218209eff423f4299ffdee24e22","d404487408f96cb401a568b25790d49a4e9acffc498b14c57b093a50796f8353","7da33e8a964b3a9858fff8a0c8d6147c42d7602cf88c5f7d3dde720446492b77"],"125":["930f20c961283f822d4b2ccc7c6e2943e7c531bf0f70b0aa10bdad254f72c22a","523f5b3811edc85f4149383611e699e1f42de2d9105ed7003b2782575a1c90e0","1694355c12ba6ed21a960426cc6d7137aca71b75d2563a7d9ba49c07826d9809","4f800b75602fbf99eb0680099019fa9325a239176fc7529fd6f6f9de23e457b5","c61538fa7094caafa5195da66edd696a5d9a7b148729a43c759f1aa3da8fb2f5","562fc56097bf426ff48fa057d3e429d1128b838fffc05339fc5c931d68044a03","2f71cba961a1b47f35ca4b2897f60515e440eeb51662091d493068c5ff39351b","8f62f46cfcf306a36defa6e05d72f6eb04490bd5e2f57c5c9e2a56c216230570","42efe48ca185a31d5b8f70311c52f2d798763feb88fb0e283b0a6851cb86d833"],"126":["3afa07a7cd9f8a753f9520c744f1c862dfcaa77d7740c22f14b2b235773ed196","e8a6ffb11b753b6bb6d36557ac5540be710e4c18281d4d28013f83f1af28fda7","713955f8b81623cf5b1164d94790ef45090549b5e687f2d435c530154cd2d84c","289e9d403294f8ab27c58c79268934edd41661eff7a84d5df2722ed2967fa29d","82f68253ac7cc677b6e9a0f17ee6d4c11563816b999424b4e1915ea4a6b8c280","399b5a90cd63a8dff195e46982201290c9eea63cf5ba16038b52e950d1c2ebbe","73bb5e51283a9da2bb8bd8f5b4b70355d35d1ea3647108f8ccc088cd3dd70c01","b64e68aa7157a9b3638606f8d5a22cc1760f3b3572d29322eb8c7c6a20f8729e","0942b214988ccf79736655e2c924482e1efab2442aeedb19346092e323c1604e"],"127":["544c3175be1c39f1e440cd8b2fbecd2926fc23c121bad3e3c753d09df516559a","d534d5d072f15f2a999f95485d8f41de663f29918482a9ace79ca5b48ca53fa2","41151b1c102fb19d70e51c8e2129aa75b21f1a42678089db1306119dad592d6d","6aaa4c3b2a0d5b66fd4545ef355b43dab7e21fca2968c4a13fc75de20ac9b425","df3ba7ffab12ef6032f629ec7a87987676842e58fcb9fef969389654a8f3c179","59c6a378117eca7619c857b359793bbe5af78c47c6468f775776e39e8713778c","176d7faff962868a8fd58126d9a00ca252ff68e83360a4e8b313fdd499746a36","5f91b5493f0b90762f6ebb32491f38ffed9ba438865eae360a928add03aeb75f","d11a1df7fc2075e3c5d543ec643f4c9d103577441255064d3c0cb01648ebb7b6"],"128":["58b86220895886f411c080f69cffa98acd6a82f0e5a0c9fb1d00ca196906543f","49c83df9110c1e16509e59b8877d0c8dd26e60aa5801907085a521479107d3c7","01886d47513762022fdbe6871dae6229753ab918facdc138b9dcc9b20967979c","f4242020193bb0974fd5f513bfb55a2cd8c62d66c1450bac23397a1eeb10791b","a50cb5671725fd6feea654725c2747d3a787cff3d63b677a43b549e584abb835","a44cb992dfbe11b9f8573e1dee0ca907ba8d65750d5822d5fbe2ae6f9d79f7ca","f0b738271d32c316214cb3818e96daa892a147f224f40d4769cd4688508135a6","0b25dfb49fd1641143cbaa774efc11e09c0972f0b83bd154016ce8b9a1c83d38","d7091dec4b179aded5e34f72014970c98f48843dde22037ac754b34754597042"]}
SIZE=(640,640)

def register():
 import numpy as np
 from PIL import Image,ImageDraw,ImageFilter
 assets={}
 def save(im):
  mem=io.BytesIO();im.save(mem,format='PNG',compress_level=6);raw=mem.getvalue()
  h=hashlib.sha256(raw).hexdigest();assets[h+'.png']=raw;return h
 def owned_png(archive,key):
  raw=archive.read(key+'.png')
  if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed owned garment '+key)
  return Image.open(io.BytesIO(raw)).convert('RGBA')
 pools=[(d,json.loads((d/'archives/archive-index.json').read_bytes())['sources']) for d in [BANK,BASE,OUTFITS]]
 @lru_cache(maxsize=72)
 def source(h):
  for d,entries in pools:
   if h in entries:
    r=entries[h]
    with zipfile.ZipFile(d/'archives'/r['archive']) as z: raw=z.read(r['path'])
    break
  else:
   with zipfile.ZipFile(BANK/'archives/staff128-north-own-bare.zip') as z: raw=z.read(h+'.png')
  if hashlib.sha256(raw).hexdigest()!=h:raise ValueError('Changed raster '+h)
  im=Image.open(io.BytesIO(raw)).convert('RGBA')
  if im.size!=SIZE:raise ValueError('Unexpected source dimensions')
  return im
 bank=ARCHIVE.parent;clothes=json.loads((bank/'north-focus-trousers.json').read_bytes())
 boots=zipfile.ZipFile(bank/'north-articulated-boots.zip')
 bootlib=json.loads(boots.read('registration.json'))
 rig=next(r for r in bootlib['rigs'].values() if r['source']==clothes['source'])
 donor=clothes['phases'][0];anatomy=Image.new('RGBA',SIZE)
 for part in rig['anatomy']:anatomy.alpha_composite(source(part['frames'][0]))
 legrows=np.asarray(anatomy)[:,:,3]
 def segments(line,mid):
  runs=np.where(np.diff(np.r_[False,line>45,False]))[0].reshape(-1,2)
  return np.asarray([(a,b) for a,b in runs if b-a>7 and abs((a+b)/2-mid)<75])
 def feet_rows(a,mid,sole):
  return segments(a[sole-6],mid)
 def lower(im):
  p=np.asarray(im).astype('int16');r,g,b,a=p.transpose(2,0,1);yy,xx=np.indices(a.shape)
  sole=int(np.where((a>75)&(yy>470)&(xx>180)&(xx<405))[0].max())
  mid=int(np.where((a>75)&(yy>sole-10)&(xx>180)&(xx<405))[1].mean())
  feet=feet_rows(a,mid,sole);assert feet.shape==(2,2)
  skin=(r>g+13)&(g>b+2)&(a>12)
  blue=(b>r+4)&(g>r)&(b>g)&(a>0)&(abs(xx-mid)<58)&(yy>300)&(yy<450)
  m=Image.fromarray(blue.astype('uint8')).copy()
  x=int(min(np.where(blue[350])[0],key=lambda k:abs(k-(mid-12))));ImageDraw.floodfill(m,(x,350),2)
  cut=np.asarray(m)==2
  if not 4500<cut.sum()<9500:raise ValueError('Unexpected shorts component')
  for _ in range(4):
   cut|=(np.asarray(Image.fromarray(cut.astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0)&(a>0)&~skin
  seam=int(np.where(cut)[0].min())
  if not (303<=seam<330 and 510<=sole<=535):raise ValueError('Changed waist or sole')
  return [*feet.mean(1),seam,sole],cut,mid
 def matrix(src,dst):
  l,r,n,f=src;L,R,N,F=dst;sx=(R-L)/(r-l);sy=(F-N)/(f-n)
  if not (.82<sx<1.25 and .92<sy<1.2):raise ValueError('Different lower anatomy')
  return [float(sx),0,0,float(sy),float(L-sx*l),float(N-sy*n)]
 def warp(im,src,dst):
  sx,_,_,sy,x,y=matrix(src,dst)
  return im.transform(SIZE,Image.Transform.AFFINE,(1/sx,0,-x/sx,0,1/sy,-y/sy),Image.Resampling.NEAREST)
 def boot_sources(slot):
  p=rig['tracks'][slot][0]
  def load(k):return np.asarray(owned_png(boots,p[k])) if k in p else None
  return load('art'),load('rear')
 bootart={slot:boot_sources(slot) for slot in rig['tracks']}
 # Register both calf boundaries on every row. The shoe's outer welt keeps
 # its width outside the receiving skin even where the leg is foreshortened.
 def foot_maps(a,fit,mid):
  x,y=np.meshgrid(np.arange(175,420),np.arange(368,550))
  dstsole=fit[3];seam=fit[2];srcsole=511;srcseam=donor['receiverFit'][2]
  sy=np.rint((y[:,0]-seam)*(srcsole-srcseam)/(dstsole-seam)+srcseam).astype(int)
  dx=np.empty_like(x)
  for j,source_y in enumerate(sy):
   src=segments(legrows[np.clip(source_y,405,504)],320)
   ty=np.clip(y[j,0],int(dstsole-99),int(dstsole-8))
   dest=segments(a[ty],mid)
   # An independent weapon may reach calf height. It is separated from
   # the skin by a transparent gap; only the two actual calves are fitted.
   if len(dest)>2:dest=sorted(dest,key=lambda ab: min(abs((ab[0]+ab[1])/2-mu) for mu in fit[:2]))[:2];dest=np.array(sorted(dest,key=lambda ab:ab[0]))
   if src.shape!=(2,2) or dest.shape!=(2,2):raise ValueError(('Calf boundaries',ty,source_y,dest))
   for n in (0,1):
    A,B=src[n];C,D=dest[n];take=x[j]<(dest[0,1]+dest[1,0])/2
    if n:take=~take
    dx[j,take]=np.floor(x[j,take]+.5+np.interp(x[j,take]+.5,[C,D],[A-C,B-D])).astype(int)-230
  inside=(sy[:,None]>=373)&(sy[:,None]<536)&(dx>=0)&(dx<185)
  return np.clip(sy-373,0,162)[:,None],np.clip(dx,0,184),inside
 records=weapons()['records'];groups={}
 skull=source('767c435b05d1f85eed23fde9603e1ca722ed095609b17af82634522024c95969');modelhair=source('c5eb1d2d523d85acb584eee39a8e1e66b0ffbbf5cf2a118dc796f91b69bea8ea')
 h_y,h_x=np.where(np.asarray(modelhair)[:,:,3]>45);hX=np.percentile(h_x,(.5,50,99.5));hY=np.percentile(h_y,(.5,50,99.5))
 gloves=zipfile.ZipFile(bank/'north-focus-gloves.zip')
 handrows=json.loads(gloves.read('registration.json'))['items']
 orb=next(r for r in records if r['id']=='orb17-north-native-layers')['basePack']['pack']['directions']['north']
 def vec(p,role):
  a=p[role+' ARM'];b=p[role+' HAND CENTER'];return np.array([b['x']-a['x'],b['y']-a['y']])
 @lru_cache(maxsize=140)
 def handtex(sha):
  return owned_png(gloves,sha)
 from register_staff_gloves import bind
 coats=zipfile.ZipFile(bank/'north-focus-sleeves.zip');citems=json.loads(coats.read('register.json'))['items']
 signed_coats=zipfile.ZipFile(bank/'north-focus-coats.zip');declared=json.loads(signed_coats.read('registration.json'))
 edits128={str(r['approvedEquipment']['coat']):r for r in records if r['id'].startswith('staff128-north-base127-male-')}
 @lru_cache(maxsize=96)
 def panel(key):
  return owned_png(coats,key)
 def pin(p,name):return np.array([p[name]['x'],p[name]['y']],float)*4
 def segment(material,origA,origB,newA,newB,width=1):
  da=origB-origA;db=newB-newA
  def pair(d,w):return np.column_stack((d,np.array([-d[1],d[0]])*w/np.linalg.norm(d)))
  if min(np.linalg.norm(da),np.linalg.norm(db))<5:raise ValueError('Degenerate sleeve bone')
  M=pair(da,1)@np.linalg.inv(pair(db,width));T=origA-M@newA
  return material.transform(SIZE,Image.Transform.AFFINE,tuple(np.column_stack((M,T)).ravel()),Image.Resampling.NEAREST)
 for weapon in range(123,129):
  if weapon==128:
   rr=next(r for r in records if r['id']=='staff128-north-base127-male-151-approved')
   poses=BARE128;identity='staff128-north-base127-male-bare'
  else:
   rr=next(r for r in records if r['id']==f'staff{weapon}-north-native-original-source')
   poses=[s['approved']['sha256'] for s in rr['states']];identity=rr['id']
  if rr['density']!=4 or rr['pivot']!=[80,128] or rr['fps']!=12 or len(poses)!=9:raise ValueError('Changed staff anatomy')
  path=next(d for d in sorted(SOURCES.glob(f'{min(weapon,127)}_N_M*')) if '179' not in d.name)
  original=zipfile.ZipFile(io.BytesIO(b''.join(q.read_bytes() for q in sorted(path.glob('*zip*')))))
  prefix='M151/' if 'M151/0-protected.png' in original.namelist() else ''
  tracks=groups[weapon]=dict(source=identity,sequence=rr['timeline'],frames=[])
  for f,h in enumerate(poses):
   im=source(h);p=np.asarray(im);a=p[:,:,3];fit,cut,mid=lower(im)
   reserve=np.asarray(Image.open(io.BytesIO(original.read(f'{prefix}{f}-protected.png'))).convert('L'))>0
   yy,xx=np.indices(a.shape)
   if weapon==128:
    bare127=np.asarray(source(groups[127]['frames'][f]['pose']))
    reserve|=(p!=bare127).any(2)&(a>0)&(xx>mid+38)
   reserve|=(a>0)&(xx<mid-35)&(yy>246)&(yy<390)&~(np.asarray(Image.fromarray(cut.astype('uint8')).filter(ImageFilter.MaxFilter(7)))>0)
   # Recover underlying thigh tones from the same personalized receiver's
   # calf. A lookup on its own painted luminance follows all saved palettes.
   exposed=warp(anatomy,donor['receiverFit'],fit);E=np.asarray(exposed)
   lum=lambda pix: np.rint(pix[:,:,0]*.2126+pix[:,:,1]*.7152+pix[:,:,2]*.0722).astype('uint8')
   Y=lum(p);under=lum(E);samples=[]
   sample=(yy>fit[3]-90)&(yy<fit[3]-20)&(abs(xx-mid)<68)&(a>240)&(p[:,:,0].astype(int)>p[:,:,1].astype(int)+8)
   ys,xs=np.where(sample);brightness=Y[ys,xs].astype(int)
   if len(xs)<800:raise ValueError('Insufficient own leg material')
   for k in range(32):
    i=np.argmin(abs(brightness-(k*8+3)));samples.append(int(ys[i]*640+xs[i]))
   atlas=np.zeros((640,640,4),dtype='uint8');atlas[:,:,0]=E[:,:,3];atlas[:,:,1]=under//8;atlas[:,:,2]=reserve.astype('uint8')*255
   atlas[:,:,3]=(cut|reserve).astype('uint8')*255
   # Emit semantics separately: reserved pixels outside the shorts do not
   # replace adjacent body, including garment-independent skirt overlaps.
   atlas[:,:,0][~cut]=0;atlas[:,:,1][~cut]=0
   distal=(yy>=fit[3]-14)&(yy<=fit[3]+2)&(a>0)&(abs(xx-mid)<80)&~reserve
   edges=np.flatnonzero(np.diff(np.r_[False,distal.ravel(),False])).reshape(-1,2)
   toe=[[int(v),int(e-v)] for v,e in edges]
   dst=dict(pose=h,mask=save(Image.fromarray(atlas)),samples=samples,sole=toe,
            transform=matrix(donor['donorFit'],fit),boots={})
   pigment=source(RANKS[str(weapon)][f]);rank=np.asarray(pigment)[:,:,0]
   hair=(rank==2) if weapon<126 else (rank>5)&(rank<=10)
   hy,hx=np.where(hair)
   def corners(x):return np.percentile(x,(.5,50,99.5))
   X,Y=corners(hx),corners(hy);sx=(X[2]-X[0])/(hX[2]-hX[0]);sy=(Y[2]-Y[0])/(hY[2]-hY[0])
   if not (.9<sx<1.2 and .89<sy<1.16 and 6200<hair.sum()<8900):raise ValueError(('Different head attachment',weapon,f,sx,sy,hair.sum()))
   tx=X[1]-sx*hX[1];ty=Y[1]-sy*hY[1]
   skullfit=skull.transform(SIZE,Image.Transform.AFFINE,(1/sx,0,-tx/sx,0,1/sy,-ty/sy),Image.Resampling.NEAREST)
   scalp=np.asarray(skullfit);hair=hair.copy()
   # Ranks own the native hair pigments. Recover its low-alpha outline,
   # while keeping adjoining face, shoulder or moving-weapon material local.
   soft=np.array(Image.fromarray(hair.astype('uint8')).filter(ImageFilter.MaxFilter(5)))!=0
   hair|=soft&(a<64)&(a>0)
   H=np.zeros((640,640,4),dtype='uint8');H[:,:,0]=scalp[:,:,3];H[:,:,1]=lum(scalp)//8;H[:,:,3]=hair.astype('uint8')*255
   dst['head']=dict(mask=save(Image.fromarray(H[105:248,180:445])),affine=[float(sx),0,0,float(sy),float(tx),float(ty)],material=RANKS[str(weapon)][f])
   seam=fit[2];skin=(rank==1) if weapon<126 else (rank>0)&(rank<6)
   rawkeep=np.asarray(Image.open(io.BytesIO(original.read(f'{prefix}{f}-protected.png'))).convert('L'))>0
   far=skin&rawkeep&(xx>mid+28)&(yy<398)
   near=skin&(xx<mid-36)&(yy>seam-3)&(yy<seam+77)
   bottom=float(np.percentile(yy[near],99));near&=yy>=bottom-33
   def center(region):
    yv,xv=np.where(region);return np.array([np.mean(xv),np.mean(yv)])
   far_center=center(far);near_center=center(near)
   far_ring=np.asarray(Image.fromarray(far.astype('uint8')).filter(ImageFilter.MaxFilter(13)))>0
   wrist=far_ring&skin&~rawkeep&(xx>mid+28);far_wrist=center(wrist)
   if wrist.sum()<10:raise ValueError(('Missing glove cuff',weapon,f))
   near_y=int(np.min(yy[near]));near_wrist=center(near&(yy<near_y+6));target=[near_center-near_wrist,far_center-far_wrist]
   if not (300<near.sum()<1260 and 350<far.sum()<1180 and all(np.linalg.norm(q)>3.5 for q in target)):raise ValueError(('Unregistered hands',weapon,f,near.sum(),far.sum(),target))
   dst['gloves']={}
   for gid,chain in handrows.items():
    final=Image.new('RGBA',SIZE)
    for j,(hand,name,joint,axis) in enumerate(zip([near,far],['near','far'],['RIGHT','LEFT'],target)):
     axes=[vec(p,joint) for p in orb['poses']]
     m=max(range(8),key=lambda k:np.dot(axes[k],axis)/np.linalg.norm(axes[k])/np.linalg.norm(axis))
     sha=chain[name][m]['normal']['hand']
     art=bind(handtex(sha),np.where(hand,a,0),axis,axes[m])
     if np.count_nonzero(np.array(art)[:,:,3])<hand.sum()*.53:raise ValueError(('Lost grip texture',weapon,gid,f,name))
     final.alpha_composite(art)
    dst['gloves'][gid]=save(final.crop((175,172,450,406)))
   def forearm_center(x):
    candidate=skin&(np.abs(xx-x)<3)&(yy>seam-123)&(yy<seam+57)&~rawkeep
    if candidate.sum()<7:raise ValueError(('Missing elbow',weapon,f,x))
    return np.array([x,float(np.median(yy[candidate]))])
   body=matrix(donor['receiverFit'],fit)
   def place(q):return np.array([body[0]*q[0]+body[4],body[3]*q[1]+body[5]])
   near_shoulder=place(pin(orb['poses'][0],'RIGHT SHOULDER'))
   far_shoulder=place(pin(orb['poses'][0],'LEFT SHOULDER'))
   elbow_x=(far_shoulder[0]+far_wrist[0])/2
   far_elbow=forearm_center(elbow_x);y=(near_shoulder[1]+near_wrist[1])/2
   cross=skin&(xx<mid-32)&(np.abs(yy-y)<3)
   near_elbow=np.array([float(np.median(xx[cross])),y])
   joints={'near':(near_shoulder,near_elbow,near_wrist),'far':(far_shoulder,far_elbow,far_wrist)}
   for side,(s0,e0,w0) in joints.items():
    if not (15<np.linalg.norm(s0-e0)<82 and 14<np.linalg.norm(e0-w0)<79):raise ValueError(('Arm registration',weapon,f,side,s0,e0,w0))
   clips=rawkeep|near
   if weapon==128:clips|=(p!=bare127).any(2)&(a>0)&(xx>mid+38)
   dst['coats']={}
   for cid,group in citems.items():
    layers={}
    for name in ('back','core','farShoulder','farUpper','farLower','nearShoulder','nearUpper','nearLower','nearDrape'):
     if name not in group['frames'][0]:continue
     if name in ('back','core','farShoulder','nearShoulder','nearDrape'):
      textile=panel(group['frames'][0][name]);paint=warp(textile,donor['receiverFit'],fit)
     else:
      side='near' if name.startswith('near') else 'far';bone='RIGHT' if side=='near' else 'LEFT';s0,e0,w0=joints[side]
      if name.endswith('Upper'):a0,b0='SHOULDER','ELBOW';newA,newB=s0,e0
      else:
       a0,b0='ELBOW','ARM';newA,newB=e0,w0
       # A folded cuff meets the closed grip beyond the wrist crease.
       # The signed hand matte trims this overlap to the actual fingers.
       if side=='far':newB=w0+.72*(far_center-w0)
      vector=newB-newA
      def rating(j):
       pose=orb['poses'][j];v=pin(pose,bone+' '+b0)-pin(pose,bone+' '+a0)
       return np.dot(vector,v)/np.linalg.norm(vector)/np.linalg.norm(v)-.12*abs(np.log(np.linalg.norm(vector)/np.linalg.norm(v)))
      j=max(range(8),key=rating);pose=orb['poses'][j]
      cell=group['frames'][j][name];key=cell['normal'] if isinstance(cell,dict) else cell
      paint=segment(panel(key),pin(pose,bone+' '+a0),pin(pose,bone+' '+b0),newA,newB,body[0])
     label='rear' if name=='back' else 'front'
     layers.setdefault(label,Image.new('RGBA',SIZE)).alpha_composite(paint)
    reg={}
    for label,layer in layers.items():
     own=np.array(layer);cover=np.where(clips,a,0).astype('uint32')
     own[:,:,3]=((own[:,:,3].astype('uint32')*(255-cover)+127)//255).astype('uint8');own[own[:,:,3]==0]=0
     clean=Image.fromarray(own);extent=clean.getbbox()
     if not extent:continue
     key=save(clean.crop(extent));reg[label]=[key,*extent[:2]]
    if 'front' not in reg:raise ValueError('Incomplete coat '+cid)
    dst['coats'][cid]=reg
   if weapon==128:
    # These four plates are authored on the native 127 body inherited by the
    # 128. Use the 128 signed garment to recover exposed edge pixels where
    # the original staff differs. Never copy unowned body or weapon colors.
    for cid,approved in edits128.items():
     sha=declared['127']['coats'][cid]['cloth'][f];raw=owned_png(signed_coats,sha)
     cloth=np.array(raw);ref=np.asarray(source(approved['states'][f]['approved']['sha256']))
     comp=np.array(Image.alpha_composite(im,raw));changed=(comp!=ref).any(2)
     same=(ref==p).all(2);cloth[changed&same]=0
     close=np.asarray(Image.fromarray((cloth[:,:,3]>0).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0
     exposed=changed&~same&close&(a==0);cloth[exposed]=ref[exposed]
     # Where the ink overlaps opaque skin or metal use only the donor's own
     # ink. Occlusion is determined by this weapon's signed foreground.
     protected=clips&(ref==p).all(2);cloth[protected]=0
     clean=Image.fromarray(cloth);extent=clean.getbbox()
     dst['coats'][cid]={'front':[save(clean.crop(extent)),*extent[:2]]}
   iy,ix,valid=foot_maps(a,fit,mid)
   for slot,(front,rear) in bootart.items():
    result={}
    for label,part in [('front',front),('rear',rear)]:
     if part is None:continue
     value=part[iy,ix].copy();value[~valid]=0;value[reserve[368:550,175:420]]=0
     if not value[:,:,3].any() and label=='front':raise ValueError('Empty shoe')
     if value[:,:,3].any():result[label]=save(Image.fromarray(value))
    dst['boots'][slot]=result
   tracks['frames'].append(dst)
  original.close()
 gloves.close();coats.close();signed_coats.close();boots.close()
 assets['register.json']=json.dumps(dict(items=groups,boots=bootlib['sources'],coats={**{k:v['source'] for k,v in citems.items()},**{k:v['id'] for k,v in edits128.items()}},gloves={g:v['near'][0]['normal']['source']+'+'+v['far'][0]['normal']['source'] for g,v in handrows.items()},trousers={k:{'source':v['source'],'cloth':v['cloth'][0]} for k,v in clothes['items'].items()}),separators=(',',':')).encode()
 return assets

def materialize(bank):
 with zipfile.ZipFile(ARCHIVE) as z:
  data=json.loads(z.read('register.json'))
  if set(map(int,data['items']))!=set(range(123,129)) or any(len(data[k])!=10 for k in ('boots','gloves','coats','trousers')):raise ValueError('Incomplete North staff catalogue')
  for wid,row in data['items'].items():
   if len(row['frames'])!=9 or list(map(int,row['sequence']))!=list(range(9))+([8]*6 if wid=='128' else []):raise ValueError('Incomplete North staff cadence')
   for f in row['frames']:
    if len(f['boots'])!=10 or len(f['gloves'])!=10 or len(f['coats'])!=(10 if wid=='128' else 6) or len(f['samples'])!=32:raise ValueError('Incomplete staff garment frame')
  for n in z.namelist():
   if n=='register.json':continue
   raw=z.read(n)
   if hashlib.sha256(raw).hexdigest()+'.png'!=n or not all(0<v<=640 for v in struct.unpack('>II',raw[16:24])):raise ValueError('Invalid North staff panel')
   (bank/n).write_bytes(raw)
  return data

if __name__=='__main__':
 data=register()
 if '--verify' in sys.argv:
  from PIL import Image
  def expand(v,library):
   if isinstance(v,list):return [expand(x,library) for x in v]
   if isinstance(v,dict):return {k:expand(x,library) for k,x in v.items()}
   if isinstance(v,str) and len(v)==64 and v+'.png' in library:
    return hashlib.sha256(Image.open(io.BytesIO(library[v+'.png'])).tobytes()).hexdigest()
   return v
  with zipfile.ZipFile(ARCHIVE) as z:
   stored={n:z.read(n) for n in z.namelist()}
   if expand(json.loads(stored['register.json']),stored)!=expand(json.loads(data['register.json']),data):raise ValueError('Changed registration')
 else:
  with zipfile.ZipFile(ARCHIVE,'w') as z:
   for n,b in sorted(data.items()):z.writestr(zipfile.ZipInfo(n),b,compress_type=zipfile.ZIP_DEFLATED)
