"""Download approved PixelLab outputs and build clearly labelled inspection sheets."""
import json,sys,urllib.request,zipfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/faccoes-base-20261018'
JOBS={'revolucionario':'290eac7e-4f8d-49e8-9f9e-1fd4b7a50433','pirata':'618c52a1-eb3a-41bd-a44d-d3b4f08d681b','marinheiro':'71b89b38-0479-4713-bfa1-66fb3150344a','governo_mundial':'625e7701-4b48-4ae7-8db7-ad56667e5a2f'}
CHARACTERS={'revolucionario':'ef501312-8e44-4a1d-adc7-be446bd44c22','pirata':'5d04e580-5ad5-4f89-82f3-47be52a99804','marinheiro':'ea8e0ab9-c0e4-46c2-985c-21889212ce12','governo_mundial':'3a9ea5a7-cd16-4f20-99cd-7682bd215c4e'}
def download(task):
    url,path=task
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request,timeout=90) as response:path.write_bytes(response.read())
    with Image.open(path) as im:im.verify()
    return path.name

def bases(key):
    folder=RUN/key;folder.mkdir(exist_ok=True)
    tasks=[(f'https://api.pixellab.ai/mcp/images/{JOBS[key]}/download?index={i}',folder/f'candidate-{i+1:02}.png') for i in range(25)]
    with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(download,tasks))
    sheet=Image.new('RGBA',(500,610));draw=ImageDraw.Draw(sheet)
    for i,(_,path) in enumerate(tasks):
        im=Image.open(path).convert('RGBA');assert im.size==(48,48)
        x=(i%5)*100;y=(i//5)*122
        sheet.paste(im.resize((96,96),Image.Resampling.NEAREST),(x+2,y))
        draw.text((x+44,y+100),str(i+1),fill='white',stroke_width=1,stroke_fill='black')
    sheet.save(folder/'candidates-inspection.png')
    print(key+': 25 native candidates downloaded, indexed inspection ready.')

if __name__=='__main__':
    if sys.argv[1]=='bases':bases(sys.argv[2])
    elif sys.argv[1]=='archive':
        key=sys.argv[2];folder=RUN/key
        request=urllib.request.Request('https://api.pixellab.ai/mcp/characters/'+CHARACTERS[key]+'/download',headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request,timeout=90) as response:(folder/'character.zip').write_bytes(response.read())
        with zipfile.ZipFile(folder/'character.zip') as archive:
            meta=json.loads(archive.read('metadata.json'))
            (folder/'zip-metadata.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
            state=meta['states'][0];animations=state['frames']['animations'];files={}
            for action in ['idle','walk']:
                rows=animations[action];assert set(rows)=={'south','north','west','east'}
                files[action]={}
                for direction,paths in rows.items():
                    files[action][direction]=[]
                    for index,path in enumerate(paths):
                        target=f'{action}-{direction}-{index:02}.png'
                        (folder/target).write_bytes(archive.read(path));files[action][direction].append(target)
            if key=='revolucionario':
                corrections=[(name,rows) for name,rows in animations.items() if name not in ['idle','walk'] and 'south' in rows]
                assert len(corrections)==1,'Iara must have one completed approved corrective south animation.'
                name,rows=corrections[0];files['walk']['south']=[]
                for index,path in enumerate(rows['south']):
                    target=f'walk-corrected-south-{index:02}.png'
                    (folder/target).write_bytes(archive.read(path));files['walk']['south'].append(target)
                (folder/'correction-selection.json').write_text(json.dumps({'animation':name,'direction':'south','frames':len(rows['south']),'rejected':'Original walking-8-frames south turns backward in frames 5–8; retained unchanged in ZIP and original walk-south PNGs.'},indent=2),encoding='utf-8')
            (folder/'animation-files.json').write_text(json.dumps(files,indent=2),encoding='utf-8')
        print(key+': complete idle/walk in four directions extracted from official MCP archive.')
    elif sys.argv[1]=='animations':
        folder=RUN/sys.argv[2]
        manifest=json.loads((folder/'animation-downloads.json').read_text(encoding='utf-8'))
        tasks=[];files={}
        for action,rows in manifest.items():
            files[action]={}
            for direction,urls in rows.items():
                files[action][direction]=[]
                for i,url in enumerate(urls):
                    relative=f'{action}-{direction}-{i:02}.png';tasks.append((url,folder/relative));files[action][direction].append(relative)
        with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(download,tasks))
        (folder/'animation-files.json').write_text(json.dumps(files,indent=2),encoding='utf-8')
        print(sys.argv[2]+': '+str(len(tasks))+' original animation frames downloaded.')
