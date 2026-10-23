"""Offline verification of PixelLab Workbench output, never an artwork generator."""
import json,hashlib
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent

def rgba(im):
 return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))

def workbench_frames(direction):
 sheet=Image.open(HERE/f'{direction}-final-frames.png').convert('RGBA')
 assert sheet.size==(192,192),'Expected the returned3x3 contact sheet, not a guessed8-column strip'
 assert not sheet.crop((128,128,192,192)).getbbox(),'Unexpected ninth frame'
 return [sheet.crop(((i%3)*64,(i//3)*64,(i%3+1)*64,(i//3+1)*64)) for i in range(8)]

def verify():
 audit={}
 for direction in ('north','east'):
  sources=[Image.open(HERE/direction/f'original-{i:02}.png').convert('RGBA') for i in range(8)]
  outputs=workbench_frames(direction);expected=[im.copy() for im in sources]
  changes=json.loads((HERE/direction/'changes.json').read_text())
  allowed=[set() for _ in range(8)]
  for change in changes:
   assert change['operation']=='copy_region' and change['layer']==change['source_layer']=='image'
   x0,y0,x1,y1=change['region'];x,y=change['at'];region=sources[change['source_frame']-1].crop((x0,y0,x1+1,y1+1))
   for frame in change['frames']:
    # Verification reference only: these pixels are never exported as artwork.
    expected[frame-1].paste(region,(x,y));allowed[frame-1].update((a,b) for a in range(x,x+x1-x0+1) for b in range(y,y+y1-y0+1))
  records=[]
  for i,(source,output,reference) in enumerate(zip(sources,outputs,expected)):
   assert rgba(output)==rgba(reference),(direction,i,'PixelLab edit differs from recorded commands')
   assert set(output.getchannel('A').get_flattened_data())=={0,255}
   changed={(x,y) for y in range(64) for x in range(64) if rgba(source.crop((x,y,x+1,y+1)))!=rgba(output.crop((x,y,x+1,y+1)))}
   assert changed<=allowed[i]
   output.save(HERE/direction/f'body-{i:02}.png')
   records.append({'frame':i,'changed_pixels':len(changed),'source_ground_line':source.getbbox()[3],'ground_line':output.getbbox()[3],'body_sha256_rgba':hashlib.sha256(rgba(output)).hexdigest(),'outside_declared_regions_unchanged':True})
  ground={r['ground_line'] for r in records};assert len(ground)==1,(direction,ground)
  with Image.open(HERE/f'{direction}-final-animation.gif') as gif:
   assert gif.n_frames==8
   for i,frame in enumerate(outputs):gif.seek(i);assert rgba(gif.convert('RGBA'))==rgba(frame)
  audit[direction]={'frames':records,'ground_line':next(iter(ground)),'pixel_origin':'PixelLab Workbench exact copy operations on existing PixelLab frames; not locally painted','unchanged_motion_outside_regions':True}
 (HERE/'retouch-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
 print('Retouch verified:16 frames, exact source-copy commands, outside regions unchanged, stable ground and lossless returned GIFs.')
 return audit
if __name__=='__main__':verify()
