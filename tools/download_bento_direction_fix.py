"""Download one completed managed animation group, keeping every frame intact."""
import json,re,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
from package_bento_combat import fetch,gif_exact
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-direction-fixes-20261018'
def main(key,direction,group,fps):
    result=json.loads((RUN/(key+'-completed.json')).read_text(encoding='utf-8'))
    text='\n'.join(c.get('text','') for c in result['content']);active=False;url=None;count=None
    for line in text.splitlines():
        if re.match(r'  [\w-]+ — ',line):active=group in line
        m=re.match(r'    '+direction+r': (https://\S+) \(i=0\.\.(\d+)\)',line)
        if active and m:url=m[1];count=int(m[2])+1;break
    assert url and count,'Requested group and direction must be completed.'
    paths=[RUN/f'{key}-{i:02}.png' for i in range(count)]
    with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda x:fetch(url.replace('{i}',str(x[0])),x[1]),enumerate(paths)))
    frames=[Image.open(p).convert('RGBA') for p in paths];w,h=frames[0].size
    assert all(im.size==(w,h) for im in frames)
    sheet=Image.new('RGBA',(w*count,h))
    for i,im in enumerate(frames):sheet.paste(im,(i*w,0))
    sheet.save(RUN/f'{key}-sheet.png')
    grid=sheet.resize((sheet.width*3,h*3),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
    for x in range(w*3,grid.width,w*3):draw.line((x,0,x,grid.height),fill='#eeb953')
    grid.save(RUN/f'{key}-inspection-grid.png')
    audit={'key':key,'group_id':group,'direction':direction,'frames':count,'size':[w,h],
      'source_url':url,'files':[p.name for p in paths],'bounds':[im.getchannel('A').getbbox() for im in frames],
      'gif':gif_exact(frames,RUN/f'{key}-preview.gif',round(1000/fps))}
    (RUN/f'{key}-verification.json').write_text(json.dumps(audit,indent=2),encoding='utf-8');print(json.dumps(audit))
if __name__=='__main__':main(sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]))
