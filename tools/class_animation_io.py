"""Download only returned MCP URLs; preview original pixels without repairing frames."""
import json,re,time,urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image,ImageDraw
from package_bento_combat import gif_exact
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/class-combat-v2-20261020/pirate-brawler'
DIRS=['south','north','west','east']
FPS={'combat-idle':5,'attack':12,'combo':12,'skill-1':12,'skill-2':12,'hurt':14,'death':8,'idle':4,'walk':8}

def calls():
 result=[]
 manifest=json.loads((RUN/'manifest.json').read_text(encoding='utf-8'))
 for call in manifest['calls']:result.append((call['request'],call['result_text']))
 for path in RUN.glob('*request.json'):
  data=json.loads(path.read_text(encoding='utf-8'))
  text='\n'.join(c.get('text','') for c in data['result']['content'])
  result.append((data['req'],text))
 return result

def download():
 groups={}
 for req,text in calls():
  group=re.search(r'^group: ([\w-]+)',text,re.M)
  if group:groups[group[1]]=req['animation_name'].removeprefix('brawler-v2-')
 status=(RUN/'status.txt').read_text(encoding='utf-8');action=None;mapping={};tasks=[]
 for line in status.splitlines():
  heading=re.match(r'  (.*?) — .*\[group: ([\w-]+)\]',line)
  if heading:
   name,group=heading.groups();action=groups.get(group,name if name in ['idle','walk'] else None)
  image=re.match(r'    (south|north|west|east): (https://\S+) \(i=0\.\.(\d+)\)',line)
  if image and action:
   direction,url,last=image.groups();paths=[]
   for i in range(int(last)+1):
    relative=f'source/{action}/{direction}/{i:02}.png';paths.append(relative)
    tasks.append((url.replace('{i}',str(i)),RUN/relative))
   mapping.setdefault(action,{})[direction]=paths
 def fetch(task):
  url,path=task;path.parent.mkdir(parents=True,exist_ok=True)
  if not path.exists():
   for attempt in range(3):
    try:
     with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MarePartida-asset-import'}),timeout=45)as response:data=response.read()
     path.write_bytes(data);break
    except Exception:
     if attempt==2:raise
     time.sleep(2+attempt*3)
  with Image.open(path)as im:im.verify()
 with ThreadPoolExecutor(max_workers=4)as pool:list(pool.map(fetch,tasks))
 audit={}
 for action,rows in mapping.items():
  for direction,paths in rows.items():
   frames=[Image.open(RUN/path).convert('RGBA')for path in paths]
   assert all(im.getchannel('A').getbbox()for im in frames),(action,direction,'empty frame')
   w=max(im.width for im in frames);h=max(im.height for im in frames)
   sheet=Image.new('RGBA',(w*len(frames),h))
   for i,im in enumerate(frames):sheet.paste(im,(i*w,0))
   stem=f'{action}-{direction}';sheet.save(RUN/(stem+'-sheet.png'))
   grid=sheet.resize((sheet.width*3,h*3),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
   for x in range(w*3,grid.width,w*3):draw.line((x,0,x,grid.height-1),fill='#d2a455')
   grid.save(RUN/(stem+'-inspection-grid.png'))
   audit[stem]={'frames':len(frames),'sizes':[im.size for im in frames],'unique_frames':len({im.tobytes()for im in frames}),'bounds':[im.getchannel('A').getbbox()for im in frames],'gif':gif_exact(frames,RUN/(stem+'-preview.gif'),round(1000/FPS[action]))}
 (RUN/'animation-files.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')
 (RUN/'inspection.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
 gallery='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Lutador — inspeção de frames PixelLab</title><style>body{background:#172b30;color:#f4dfb6;font:16px system-ui}section{padding:20px;border:1px solid #927345;margin:16px}img{image-rendering:pixelated;max-width:100%}.clip{width:204px}small{display:block}</style><h1>Lutador Pirata — arte original em inspeção</h1><p>Sem aprovação final de qualidade. Grids são auxiliares de inspeção separados da arte.</p>'
 for key,value in audit.items():
  gallery+=f'<section><h2>{key}</h2><small>{value["frames"]} frames · {value["unique_frames"]} distintos</small>'
  if value['gif']['created']:gallery+=f'<img class="clip" src="{key}-preview.gif" alt="Animação original {key}">'
  gallery+=f'<details><summary>Inspeção da grade (auxiliar)</summary><img src="{key}-inspection-grid.png"></details></section>'
 (RUN/'preview.html').write_text(gallery,encoding='utf-8')
 print(json.dumps({a:{d:len(p)for d,p in rows.items()}for a,rows in mapping.items()}))

if __name__=='__main__':download()
