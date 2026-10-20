"""Download no-auth PixelLab exports already generated and authorized (no paid calls)."""
import json,re,sys,urllib.request,zipfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/orange-town-20261020'
for call in json.loads((RUN/'calls.json').read_text(encoding='utf-8-sig')):
    if call['kind']!='character' or call['name'] not in sys.argv[1:]:continue
    name=call['name'];text='\n'.join(c['text'] for c in call['response']['content'] if c['type']=='text');identifier=re.search(r'^id: (\S+)',text).group(1)
    folder=RUN/name;folder.mkdir(exist_ok=True);archive=folder/'source.zip'
    req=urllib.request.Request('https://api.pixellab.ai/mcp/characters/'+identifier+'/download',headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=60) as r:archive.write_bytes(r.read())
    source=folder/'source';source.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        assert all((source/p).resolve().is_relative_to(source.resolve()) for p in z.namelist());z.extractall(source)
    data=json.loads((source/'metadata.json').read_text(encoding='utf-8'));frames=data['states'][0]['frames']
    sheet=Image.new('RGBA',(192,96))
    for i,(d,f) in enumerate(frames['rotations'].items()):
        im=Image.open(source/f);assert im.size==(48,48);sheet.paste(im,(i%4*48,i//4*48))
    sheet.save(folder/'rotations.png');sheet.resize((768,384),Image.Resampling.NEAREST).save(folder/'rotations-inspection.png')
    if set(frames['animations'].get('walk',{}))>={'south','north','west','east'}:
        config={'idle':{d:['source/'+f] for d,f in frames['rotations'].items()},'walk':{d:['source/'+f for f in files] for d,files in frames['animations']['walk'].items()}}
        (folder/'frames.json').write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
    print(name,'walk directions',list(frames['animations'].get('walk',{})))
