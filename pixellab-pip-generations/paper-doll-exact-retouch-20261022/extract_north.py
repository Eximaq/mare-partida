"""Select only visible original Bento pixels for the north inspection layers."""
import json,sys
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent;BASE=HERE.parent/'paper-doll-bento-directions-20261021'
sys.path.insert(0,str(HERE.parent/'paper-doll-bento-skeleton-20261021'))
from extract_visible_pieces import select
SLOTS=['body','pants','boots','outfit','hair','weapon']
def main():
 sheets={slot:Image.new('RGBA',(672,84)) for slot in SLOTS};records=[]
 for i in range(8):
  source=Image.open(BASE/'north'/f'bento-{i:02}.png').convert('RGBA');body=Image.open(HERE/'north'/f'body-{i:02}.png').convert('RGBA')
  hair=select(source,lambda r,g,b:max(r,g,b)<=55 or (g>r*1.4 and b>r*1.4),[(24,4),(43,4),(43,18),(24,18)])
  tail=select(source,lambda r,g,b:g>r*1.4 and b>r*1.4,[(30,4),(50,4),(50,20),(30,20)]);hair=Image.alpha_composite(hair,tail)
  outfit=select(source,lambda r,g,b:(r>g*1.5 and b>g*1.1 and r<170) or (r>175 and g>r*.75 and r*.62<b<r*.85),[(20,16),(45,16),(45,36),(20,36)])
  pants=select(source,lambda r,g,b:b>r*1.5 and b>g*1.3,[(17,31),(47,31),(47,48),(17,48)])
  boots=select(source,lambda r,g,b:r>g>b and r>40,[(17,46),(48,46),(48,54),(17,54)])
  weapon=select(source,lambda r,g,b:max(r,g,b)-min(r,g,b)<25 and max(r,g,b)>75,[(40,23),(63,23),(63,53),(40,53)])
  hilt=select(source,lambda r,g,b:r>70 and g>=r*.6 and b<g*.5,[(40,28),(50,28),(50,37),(40,37)])
  weapon=Image.alpha_composite(weapon,hilt)
  parts={'body':body,'hair':hair,'outfit':outfit,'pants':pants,'boots':boots,'weapon':weapon}
  for slot,image in parts.items():
   if slot!='body':assert all(not c[3] or c==s for c,s in zip(image.get_flattened_data(),source.get_flattened_data()))
   canvas=Image.new('RGBA',(84,84));canvas.paste(image,(10,13));sheets[slot].paste(canvas,(i*84,0))
   records.append({'slot':slot,'frame':i,'visible_pixels':sum(c[3]>0 for c in image.get_flattened_data()),'source_pixels_only':slot!='body'})
 for slot,sheet in sheets.items():sheet.save(HERE/f'north-{slot}.png')
 (HERE/'north-layer-audit.json').write_text(json.dumps(records,indent=2)+'\n')
if __name__=='__main__':main()
