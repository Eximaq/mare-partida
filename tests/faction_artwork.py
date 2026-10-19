"""Validate shipped native pixels, transparent margins, ground anchors and GIF playback."""
import json,hashlib,statistics
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/faccoes-base-20261018'
results=[];total=0
for key in ['revolucionario','pirata','marinheiro','governo_mundial']:
    folder=RUN/key;target=ROOT/'assets/factions'/key
    meta=json.loads((target/'metadata.json').read_text(encoding='utf-8'))
    files=json.loads((folder/'animation-files.json').read_text(encoding='utf-8'))
    if (folder/'playback-overrides.json').exists():
        for action,rows in json.loads((folder/'playback-overrides.json').read_text()).items():
            for direction,options in rows.items():files[action][direction]=options['files']
    audit=json.loads((folder/'assembly-audit.json').read_text())
    w,h=meta['frame_size'];ax,ay=meta['anchor']
    assert Image.open(target/'preview.png').size==(48,48)
    assert (target/'preview.png').read_bytes()==(folder/'selected-base.png').read_bytes()
    for action,rows in files.items():
        animation=meta['animations'][action];sheet=Image.open(target/(action+'.png')).convert('RGBA')
        assert sheet.size==(w*animation['frames'],h*4)
        for row,direction in enumerate(meta['directions']):
            heights=[];distinct=set()
            assert animation['direction_frames'][direction]==len(rows[direction])
            for index,path in enumerate(rows[direction]):
                source=Image.open(folder/path).convert('RGBA');native_bounds=source.getbbox();assert native_bounds
                cell=sheet.crop((index*w,row*h,(index+1)*w,(row+1)*h));bounds=cell.getbbox();assert bounds
                assert bounds[0]>=2 and bounds[1]>=2 and bounds[2]<=w-2 and bounds[3]==ay
                assert cell.crop(bounds).tobytes()==source.crop(native_bounds).tobytes(),(key,action,direction,index)
                assert cell.crop(bounds).size==source.crop(native_bounds).size
                heights.append(bounds[3]-bounds[1]);distinct.add(hashlib.sha256(cell.tobytes()).hexdigest());total+=1
            assert len(distinct)>1,(key,action,direction,'static animation')
            native_height=animation['visible_height'][direction]
            displayed=[height*meta['render_height']/native_height for height in heights]
            assert min(displayed)>=66 and max(displayed)<=75,(key,action,direction,displayed)
        gif=Image.open(folder/(action+'-preview.gif'))
        assert gif.info.get('loop')==0
        for index in range(gif.n_frames):
            gif.seek(index);assert gif.disposal_method==2
            assert gif.convert('RGBA').getextrema()[3][0]==0
    results.append({'faction':key,'result':'passed','pixel_fidelity':True,'feet_anchor':ay,'display_height':meta['render_height'],'frames':{a:dict(v['direction_frames']) for a,v in meta['animations'].items()}})
(RUN/'artwork-verification.json').write_text(json.dumps({'verified_runtime_frames':total,'results':results},indent=2),encoding='utf-8')
print(f'{total} runtime frames: original pixels preserved, transparent margins, stable feet, 66–75px visible height and looping GIF disposal verified.')
