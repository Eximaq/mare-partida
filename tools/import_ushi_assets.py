"""Import supplied Ushi art and an existing PixelLab character ZIP, without resampling.

Usage: python tools/import_ushi_assets.py character.zip supplied-art-folder
The source ZIP remains outside the repository. No generation/API costs.
"""
import hashlib,io,json,shutil,sys,zipfile
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/akuma/ushi'

def main():
    archive,source=Path(sys.argv[1]),Path(sys.argv[2])
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={'character_id':'f7a9fca3-6336-42f6-91cb-9fb31e46bb64','source':'PixelLab existing character export; item/icons/effect supplied by owner','zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'assets':[]}
    for original,target in [('Usha Usha No Mi.png','fruit.png'),('Skill 1.png','skill-1.png'),('Buff Skill 2.png','skill-2.png'),('effect.png','effect.png'),('effect.json','effect.json')]:
        shutil.copyfile(source/original,OUT/target)
        manifest['assets'].append({'asset':target,'sha256':hashlib.sha256((OUT/target).read_bytes()).hexdigest()})
    clips={}
    with zipfile.ZipFile(archive) as z:
        for action,folder,fps in [('idle',None,2),('walk','Walking',10),('attack','Roundhouse_Kick',12),('headbutt','Picking_Up',12)]:
            clips[action]={}
            for direction in ['south','north','east','west']:
                names=[f'Idle/rotations/{direction}.png'] if folder is None else sorted(n for n in z.namelist() if n.startswith(f'Idle/animations/{folder}/{direction}/') and n.endswith('.png'))
                assert names,(action,direction)
                frames=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in names]
                size=max(96,max(max(im.size) for im in frames))
                sheet=Image.new('RGBA',(size*len(frames),size));feet=[];hashes=[];sizes=[]
                for i,im in enumerate(frames):
                    x,y=(size-im.width)//2,(size-im.height)//2
                    sheet.paste(im,(i*size+x,y))
                    assert sheet.crop((i*size+x,y,i*size+x+im.width,y+im.height)).tobytes()==im.tobytes()
                    feet.append(im.getbbox()[3]+y)
                    hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
                    sizes.append(list(im.size))
                filename=f'{action}-{direction}.png';sheet.save(OUT/filename)
                clips[action][direction]={'image':f'assets/akuma/ushi/{filename}','frames':len(frames),'size':size,'feet':feet,'fps':fps,'source':names,'source_sizes':sizes,'rgba_sha256':hashes}
        shutil.copyfile(OUT/'idle-south.png',OUT/'preview-south.png')
    (OUT/'clips.json').write_text(json.dumps(clips,indent=2)+'\n',encoding='utf8')
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    effect=json.loads((OUT/'effect.json').read_text())
    vfx={'image':'assets/akuma/ushi/effect.png','anchor':effect['meta']['anchor'],'frames':[{**f['frame'],'duration':f['duration']} for f in effect['frames']]}
    vfx['duration']=sum(f['duration'] for f in vfx['frames'])
    # Embedded data supports index.html opened directly without fetch/CORS.
    (ROOT/'ushi-art-data.js').write_text("'use strict';\nglobalThis.MareUshiArtData="+json.dumps({'clips':clips,'vfx':vfx},separators=(',',':'))+';\n',encoding='utf8')
    rules=json.loads((OUT/'rules.json').read_text(encoding='utf8'))
    (ROOT/'ushi-rules.js').write_text("'use strict';\nglobalThis.MareUshiRules="+json.dumps(rules,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
    print('Imported',sum(c['frames'] for dirs in clips.values() for c in dirs.values()),'original frames and supplied VFX/icons')

if __name__=='__main__':main()
