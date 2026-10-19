"""Verify integrated replacements against the untouched downloaded originals."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-direction-fixes-20261018'
meta=json.loads((ROOT/'assets/classes/pirate-sword/metadata.json').read_text(encoding='utf-8'))
cw,ch=meta['frame_size'];count=0;replacements=[]
for record in sorted(RUN.glob('*-integration.json')):
    data=json.loads(record.read_text());key=record.name.removesuffix('-integration.json');source=json.loads((RUN/f'{key}-verification.json').read_text())
    sheet=Image.open(ROOT/f"assets/classes/pirate-sword/{data['action']}.png").convert('RGBA');row=meta['directions'].index(data['direction'])
    for item,name in zip(data['placements'],source['files']):
        original=Image.open(RUN/name).convert('RGBA');dx,dy=item['offset'];i=item['frame']
        actual=sheet.crop((i*cw+dx,row*ch+dy,i*cw+dx+original.width,row*ch+dy+original.height))
        assert actual.tobytes()==original.tobytes(),(key,i)
        count+=1
    runtimekey='skill' if data['action']=='corte-de-mare' else data['action']
    assert data['direction'] in meta['animations'][runtimekey]['valid_directions']
    assert data['other_rows_identical'] and data['gif']['exact_visible_pixels']
    replacements.append(key)
assert meta['anchor']==[42,65] and meta['reference_height']==46
baseline=RUN/'before-replacement/death.png'
# Death was never replaced; compare it directly with the pre-fix runtime checkpoint.
old=ROOT.parent/'backups/mare-partida-v12-before-bento-direction-fixes-20261018/pirate-sword/death.png'
assert old.read_bytes()==(ROOT/'assets/classes/pirate-sword/death.png').read_bytes()
result={'replacements':replacements,'frames_checked':count,'exact_original_pixels':True,'fixed_anchor':True,'death_unchanged':True}
(RUN/'runtime-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
