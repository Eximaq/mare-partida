"""Reuse the original rigid sword on eight observed hand positions, without repainting."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
HANDS=[(22,35),(21,35),(22,36),(23,36),(22,35),(21,35),(22,36),(22,36)]

def main():
    body_audit=json.loads((HERE/'body-audit.json').read_text())
    if not body_audit['passed']:raise ValueError('Body correction failed')
    source=HERE.parent/'paper-doll-expansion-20261021/weapon-south.png';shutil.copy2(source,HERE/'rigid-weapon.png')
    sword=Image.open(source).convert('RGBA');assert sword.size==(64,64)
    sheet=Image.new('RGBA',(256,128));records=[]
    for i,(x,y) in enumerate(HANDS):
        body=Image.open(HERE/f'body-corrected-{i+1:02}.png').convert('RGBA');layer=Image.new('RGBA',(64,64));layer.paste(sword,(x-20,y-36))
        bp=list(body.get_flattened_data());wp=list(layer.get_flattened_data());hand={n for n,c in enumerate(bp) if c[3] and max(abs(n%64-x),abs(n//64-y))<=2}
        visible={n for n,c in enumerate(wp) if c[3] and not bp[n][3]}
        contact=sum(any(abs(n%64-h%64)<=1 and abs(n//64-h//64)<=1 for h in hand) for n in visible)
        if not hand or not contact:raise ValueError('No visible grip contact in frame'+str(i))
        composite=Image.alpha_composite(layer,body)
        assert all(a==b for a,b in zip(bp,composite.get_flattened_data()) if a[3]),'Body must occlude the grip naturally'
        composite.save(HERE/f'body-weapon-{i+1:02}.png');sheet.paste(composite,((i%4)*64,(i//4)*64))
        records.append({'frame':i,'hand_anchor':[x,y],'socket':{'x':x+10,'y':y+13},'contact_pixels':contact,'zIndex':10,'body_pixel_changes':0})
    sheet.save(HERE/'body-weapon-atlas.png');sheet.resize((1024,512),Image.Resampling.NEAREST).save(HERE/'attachment-inspection.png')
    result={'passed':True,'weapon_source':'../paper-doll-expansion-20261021/weapon-south.png','weapon_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source_anchor':[20,36],'rig_pivot':[42,65],'padding':[10,13],'frame_count':8,'frames':records,'artwork_approved':False}
    (HERE/'attachment-audit.json').write_text(json.dumps(result,indent=2)+'\n');print('Eight observed grips passed; body untouched; same original rigid sword.')

if __name__=='__main__':main()
