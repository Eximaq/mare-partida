"""Import supplied Zoro sources without repainting, color-keying, or normalizing frame bounds."""
import argparse, hashlib, json, shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/skins/visual-completo/zoro'
DIRECTIONS=['south','west','east','north']
# Explicit source partitions, reviewed against the RGBA sources on a light background.
# Each tuple describes row boundaries, per-row column boundaries, feet anchors and neutral body height.
SPECS={
 'walk':('sprite_de_caminhada_do_espadachim_verde.png',[0,315,623,943,1254],
  [[0,315,628,941,1254]]*4,[[[158,303],[473,303],[787,303],[1100,303]],[[155,612],[473,612],[787,612],[1100,612]],[[156,929],[473,929],[787,929],[1100,929]],[[157,1240],[473,1240],[787,1240],[1100,1240]]],287),
 'attack':('combo_de_espadachim_verde_em_pixel_art.png',[0,320,635,948,1254],
  [[0,237,485,739,999,1254],[0,238,438,695,978,1254],[0,236,468,718,977,1254],[0,225,449,712,980,1254]],
  [[[140,292],[370,292],[617,292],[874,292],[1127,292]],[[110,603],[345,603],[587,603],[851,603],[1102,603]],[[114,916],[337,916],[576,916],[839,916],[1118,916]],[[118,1232],[344,1232],[586,1232],[850,1232],[1111,1232]]],268),
 'castPalm':('sprite_sheet_do_espadachim_verde_em_ação.png',[0,315,623,943,1254],
  [[0,315,628,941,1254],[0,315,628,920,1254],[0,315,628,941,1254],[0,315,628,941,1254]],
  [[[158,303],[473,303],[787,303],[1100,303]],[[155,612],[462,612],[780,612],[1092,612]],[[156,929],[474,929],[781,929],[1100,929]],[[157,1240],[473,1240],[787,1240],[1100,1240]]],287),
 'hurt':('espadachim_verde_em_quatro_momentos.png',[0,724],[[0,550,1086,1635,2172]],
  [[[260,680],[808,680],[1344,680],[1890,680]]],635),
 'specialHorizon':('sprite_de_espadachim_em_arco_horizontal.png',[0,335,620,910,1254],
  [[0,185,340,546,748,1075,1254],[0,185,336,530,746,1082,1254],[0,185,335,535,746,1082,1254],[0,185,335,538,751,1085,1254]],
  [[[99,304],[270,304],[451,304],[650,304],[911,304],[1152,304]],[[87,589],[262,589],[449,589],[645,589],[910,589],[1154,589]],[[94,878],[267,878],[447,878],[642,878],[912,878],[1155,878]],[[94,1163],[263,1163],[447,1163],[645,1163],[912,1163],[1158,1163]]],217),
 'specialTide':('sprite_de_golpe_maré_verde.png',[0,310,605,905,1254],
  [[0,166,345,557,790,1044,1254],[0,169,337,547,779,1042,1254],[0,168,333,552,780,1044,1254],[0,169,335,551,786,1043,1254]],
  [[[94,283],[264,283],[456,283],[660,283],[899,283],[1148,283]],[[88,578],[261,578],[452,578],[644,578],[893,578],[1146,578]],[[85,858],[251,858],[453,858],[666,858],[922,858],[1156,858]],[[90,1175],[263,1175],[451,1175],[650,1175],[907,1175],[1154,1175]]],219)
}

# Non-rectangular separators follow transparent gaps where weapons or VFX cross
# the nominal columns. Coordinates are in the unchanged original source.
BOUNDARIES={
 ('attack',0,4):[(1015,0),(1015,210),(990,250),(990,320)],
 ('attack',2,4):[(995,635),(995,810),(975,870),(975,948)],
 ('attack',3,2):[(462,948),(462,1138),(445,1178),(445,1254)],
 ('attack',3,4):[(995,948),(995,1145),(970,1190),(970,1254)],
 ('specialTide',0,4):[(795,0),(795,177),(755,212),(755,310)],
 ('specialTide',1,4):[(780,310),(780,460),(744,486),(744,605)],
 ('specialTide',3,4):[(792,905),(792,1050),(763,1080),(763,1254)],
 ('specialTide',0,5):[(1050,0),(1050,190),(1022,270),(1022,310)],
 ('specialTide',1,5):[(1050,310),(1050,475),(1020,565),(1020,605)],
 ('specialTide',2,5):[(1050,605),(1050,750),(1035,810),(1035,905)],
 ('specialTide',3,5):[(1050,905),(1050,1085),(1022,1165),(1022,1254)]
}

def run(source):
 OUT.mkdir(parents=True,exist_ok=True)
 originals=OUT/'sources';originals.mkdir(exist_ok=True)
 manifest={'version':1,'id':'visual_completo_zoro','referenceBodyHeight':96,'directions':DIRECTIONS,'anchor':'feet','clips':{},'sources':{}}
 for key,(name,ys,xrows,anchors,bodyHeight) in SPECS.items():
  path=source/name;im=Image.open(path)
  if im.mode!='RGBA' or im.getchannel('A').getextrema()!=(0,255):raise ValueError(f'{name}: RGBA transparency required')
  if im.size!=(xrows[0][-1],ys[-1]):raise ValueError(f'{name}: source dimensions changed')
  shutil.copyfile(path,originals/name)
  manifest['sources'][key]={'file':'sources/'+name,'size':list(im.size),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  frames={}
  for row,xs in enumerate(xrows):
   frames[DIRECTIONS[row]]=[]
   for col in range(len(xs)-1):
    x,y,w,h=xs[col],ys[row],xs[col+1]-xs[col],ys[row+1]-ys[row]
    ax,ay=anchors[row][col]
    if not(x<=ax<x+w and y<=ay<=y+h):raise ValueError(f'{key}/{row}/{col}: anchor outside frame')
    left=BOUNDARIES.get((key,row,col),[(xs[col],ys[row]),(xs[col],ys[row+1])])
    right=BOUNDARIES.get((key,row,col+1),[(xs[col+1],ys[row]),(xs[col+1],ys[row+1])])
    polygon=left+list(reversed(right))
    x=min(p[0] for p in polygon); w=max(p[0] for p in polygon)-x
    frame={'rect':[x,y,w,h],'anchor':[ax-x,ay-y]}
    if (key,row,col) in BOUNDARIES or (key,row,col+1) in BOUNDARIES:
     frame['clipPolygon']=[[px-x,py-y] for px,py in polygon]
    frames[DIRECTIONS[row]].append(frame)
  manifest['clips'][key]={'source':key,'bodyHeight':bodyHeight,'scale':96/bodyHeight,'frames':frames}
 icon=source/'icone_rpg_do_espadachim_verde_em_moldura_dourada.png'
 shutil.copyfile(icon,originals/icon.name)
 Image.open(icon).resize((96,96),Image.Resampling.NEAREST).save(OUT/'icon-96.png')
 manifest['sources']['icon']={'file':'sources/'+icon.name,'size':list(Image.open(icon).size),'sha256':hashlib.sha256(icon.read_bytes()).hexdigest()}
 (OUT/'atlas.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Imported 7 unchanged originals; 104 directional frames plus idle from walk column 0.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);run(parser.parse_args().source)
