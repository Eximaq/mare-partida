"""Extract generated garment/weapon pixels; never paint replacement anatomy."""
from pathlib import Path
from PIL import Image
import json

P = Path(__file__).resolve().parent
BASE = P.parent/'paper-doll-navy-starter-20261023'
cloth_colors = {(37,38,56),(52,52,74),(84,84,105),(238,224,192),(221,187,153)}
hair = Image.open(BASE/'hair-idle.png').convert('RGBA').crop((10,265,74,329))
weapon_source = Image.open(P/'musket-east-raw.png').convert('RGBA')
weapon = Image.new('RGBA',(64,64))
# Only the generated barrel/stock ahead of the hand, excluding source anatomy.
for y in range(18,26):
    for x in range(42,62):
        px=weapon_source.getpixel((x,y));r,g,b,a=px
        if a and not (r>g*1.2 and g>b*1.2 and r>150):
            weapon.putpixel((x,y),px)
weapon.save(P/'musket-east-layer.png')
sheets={s:Image.new('RGBA',(672,84)) for s in ['body','outfit','hair','weapon','composed']}
audit=[]
for index in range(8):
    body=Image.open(P/f'body-east-corrected-raw/{index+1:02}.png').convert('RGBA')
    dress=Image.open(P/f'outfit-east-{index:02}.png').convert('RGBA')
    outfit=Image.new('RGBA',(64,64))
    selected={(x,y) for y in range(18,34) for x in range(25,40) if dress.getpixel((x,y))[:3] in cloth_colors and dress.getpixel((x,y))[3]}
    for x,y in selected:outfit.putpixel((x,y),dress.getpixel((x,y)))
    # Classify only the generated olive firearm. Its pixels are archived separately;
    # skin stays unchanged and occluded anatomy is never reconstructed.
    olive={(44,40,28),(94,87,68),(163,154,127)}
    region=[(35,27,38,30),(39,20,49,25),(41,18,51,23),(41,20,51,25),(41,19,51,24),(39,20,49,25),(34,24,45,29),None][index]
    removed=[]
    if region:
        x0,y0,x1,y1=region
        for y in range(y0,y1):
            for x in range(x0,x1):
                px=body.getpixel((x,y))
                if px[:3] in olive or px[:3]==(0,0,0):
                    if px[3]:removed.append([x,y,list(px)])
                    body.putpixel((x,y),(0,0,0,0))
    socket=[(39,29),(41,25),(43,23),(43,25),(43,24),(41,25),(39,29),(31,33)][index]
    placed=Image.new('RGBA',(84,84))
    if index==7:
        rotated=weapon.transpose(Image.Transpose.ROTATE_270)
        placed.alpha_composite(rotated,(10+socket[0]-(63-24),13+socket[1]-43))
    else:placed.alpha_composite(weapon,(10+socket[0]-43,13+socket[1]-24))
    body84=Image.new('RGBA',(84,84));body84.paste(body,(10,13))
    outfit84=Image.new('RGBA',(84,84));outfit84.paste(outfit,(10,13))
    hair84=Image.new('RGBA',(84,84));hair84.paste(hair,(10,13))
    composed=placed.copy();composed.alpha_composite(body84);composed.alpha_composite(outfit84);composed.alpha_composite(hair84)
    for s,im in [('body',body84),('outfit',outfit84),('hair',hair84),('weapon',placed),('composed',composed)]:sheets[s].paste(im,(index*84,0))
    audit.append({'frame':index,'socket':socket,'outfit_pixels':len(selected),'removed_generated_weapon_pixels':removed,'status':'diagnostic-not-approved'})
for s,im in sheets.items():im.save(P/f'pilot-{s}.png')
sheets['composed'].resize((2016,252),Image.Resampling.NEAREST).save(P/'pilot-inspection.png')
(P/'pilot-audit.json').write_text(json.dumps({'productionEnabled':False,'frames':audit,'limitations':['body still includes generated firearm fragments','hair sockets pending head alignment review','weapon is extraction candidate, not final approved equipment']},indent=2)+'\n')
