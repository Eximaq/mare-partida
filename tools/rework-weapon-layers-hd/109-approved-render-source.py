from pathlib import Path
from PIL import Image,ImageDraw
import shutil,hashlib,json,subprocess
r=Path('refazer10917/v3');d=r/'delivery';d.mkdir(exist_ok=True);(d/'frames').mkdir(exist_ok=True);(d/'video').mkdir(exist_ok=True);frames=[];qa=[]
for i in range(7):
 p=r/'initial.png' if i==0 else Path(f'refazer10917/v2/delivery/Manopla109_SOUTH_Inicial_Maior_v2/frames/{i}.png');shutil.copy(p,d/'frames'/f'{i}.png');im=Image.open(p).convert('RGBA');c=Image.new('RGB',(640,710),(24,29,37));c.paste(im,(0,35),im);dr=ImageDraw.Draw(c);dr.text((12,10),f'MANOPLA 109 SOUTH | QUADRO {i}',fill='white');dr.text((12,680),'INICIAL: ENCAIXE E CONTORNOS AJUSTADOS',fill='white');frames.append(c);qa.append({'frame':i,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'unchanged':i!=0})
n=0
for _ in range(3):
 for i in [0,1,2,3,4,5,6,0]:
  for _ in range(12 if i==0 else 4):frames[i].save(d/'video'/f'{n:04}.png');n+=1
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(d/'video'/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','16',str(d/'Manopla109_SOUTH_EncaixeInicial_v3.mp4')],check=True);subprocess.run(['ffmpeg','-v','error','-i',str(d/'Manopla109_SOUTH_EncaixeInicial_v3.mp4'),'-f','null','-'],check=True);shutil.rmtree(d/'video')
canvas=Image.new('RGB',(1080,580),(24,29,37));im=Image.open(r/'initial.png').crop((235,320,415,410)).resize((1080,540),Image.Resampling.NEAREST);canvas.paste(im,(0,40),im);ImageDraw.Draw(canvas).text((15,12),'MANOPLA 109: DETALHE DO ENCAIXE INICIAL',fill='white');canvas.save(d/'Manopla109_Inicial_Detalhe_v3.png')
(d/'QA.json').write_text(json.dumps({'frames':qa,'rightGloveShiftPx':3,'contourFillPixels':60,'baseOriginalUnmodified':True,'remainingSkinInReviewedContourMask':0,'limits':'Original active poses unchanged; no new recovery poses.'},indent=2));shutil.copy(r/'overlay.png',d);shutil.copy(r/'build.py',d);shutil.copy(r/'render.py',d)
shutil.make_archive(str(r/'Manopla109_EncaixeInicial_v3_Editavel'),'zip',d)
