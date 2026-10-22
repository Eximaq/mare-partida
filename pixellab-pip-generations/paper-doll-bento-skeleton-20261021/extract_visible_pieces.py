"""Inspect visible original Bento pixels as candidate layers, never reconstruct hidden art."""
import json,hashlib
from PIL import Image,ImageDraw
from assemble import HERE

# Selection controls, not new artwork. These regions follow the original eight poses.
WEAPON_REGIONS=[
 [(5,50),(5,42),(14,32),(16,29),(21,29),(21,35),(11,50)],
 [(0,5),(7,7),(23,22),(28,21),(29,29),(19,30),(14,25),(0,12)],
 [(18,1),(25,1),(29,17),(32,24),(28,27),(24,25),(22,19)],
 [(34,26),(54,26),(56,37),(35,37)],
 [(33,22),(47,9),(44,1),(63,1),(63,21),(45,30),(38,33)],
 [(33,24),(49,12),(63,6),(63,26),(41,33)],
 [(26,29),(54,28),(54,36),(26,37)],
 [(5,51),(5,42),(14,32),(16,29),(21,29),(21,35),(11,51)]
]

def select(source,gate,region):
    mask=Image.new('1',(64,64));ImageDraw.Draw(mask).polygon(region,fill=1)
    chosen={(x,y) for y in range(64) for x in range(64) if mask.getpixel((x,y)) and source.getpixel((x,y))[3] and gate(*source.getpixel((x,y))[:3])}
    # Copy existing adjacent contour pixels only. No pixels are invented or recoloured.
    contour={(x+dx,y+dy) for x,y in chosen for dx,dy in [(0,-1),(0,1),(-1,0),(1,0)] if 0<=x+dx<64 and 0<=y+dy<64}
    for x,y in contour:
        r,g,b,a=source.getpixel((x,y))
        if mask.getpixel((x,y)) and a and max(r,g,b)<=12:chosen.add((x,y))
    layer=Image.new('RGBA',(64,64))
    for xy in chosen:layer.putpixel(xy,source.getpixel(xy))
    return layer


def save_modular_gif(sheet):
    frames=[sheet.crop((i*84,0,(i+1)*84,84)) for i in range(8)]
    colors=sorted({c[:3] for frame in frames for c in frame.get_flattened_data() if c[3]})
    if len(colors)>255:raise ValueError('Cannot make an exact-palette GIF')
    lookup={c:i+1 for i,c in enumerate(colors)};palette=[0,0,0]+[v for c in colors for v in c];palette+=[0]*(768-len(palette));indexed=[]
    for frame in frames:
        image=Image.new('P',(84,84));image.putpalette(palette);image.putdata([lookup[c[:3]] if c[3] else 0 for c in frame.get_flattened_data()]);indexed.append(image)
    durations=[80,90,80,80,90,80,80,90]
    indexed[0].save(HERE/'modular-south.gif',save_all=True,append_images=indexed[1:],duration=durations,loop=0,disposal=2,transparency=0,optimize=False)
    from assemble import normalized
    with Image.open(HERE/'modular-south.gif') as gif:
        assert gif.n_frames==8
        for i,frame in enumerate(frames):
            gif.seek(i);assert normalized(gif.convert('RGBA'))==normalized(frame)
            assert gif.info['duration']==durations[i] and gif.disposal_method==2

def main():
    review=json.loads((HERE/'review.json').read_text(encoding='utf-8'))
    fit=review.get('visible_piece_fit_gate_passed') is True
    layers={slot:Image.new('RGBA',(672,84)) for slot in ['pants','boots','hair','outfit','weapon']}
    composite=Image.new('RGBA',(672,84));records=[];grips=[]
    for i in range(8):
        source=Image.open(HERE/f'bento-south-{i:02}.png').convert('RGBA')
        body=Image.open(HERE/f'body-south-{i:02}.png').convert('RGBA')
        hair=select(source,lambda r,g,b: (max(r,g,b)<=55 or (g>r*1.4 and b>r*1.4)),[(27,4),(41,4),(41,13),(37,14),(37,11),(29,11),(29,14),(27,13)])
        outfit=select(source,lambda r,g,b:(r>g*1.5 and b>g*1.1 and r<170) or (r>175 and g>r*.75 and b>r*.62 and b<r*.85),[(22,15),(42,15),(43,33),(22,33)])
        pants=select(source,lambda r,g,b:b>r*1.5 and b>g*1.3,[(15,32),(47,32),(47,47),(15,47)])
        boots=select(source,lambda r,g,b:True,[(15,47),(47,47),(47,54),(15,54)])
        weapon=select(source,lambda r,g,b:(max(r,g,b)-min(r,g,b)<25 and max(r,g,b)>75) or (r>70 and r*.65<=g<=r*.95 and b<g*.8 and g<150),WEAPON_REGIONS[i])
        if fit:
            x,y=review['grip_contact_proxy']['points'][i]
            skin=[(a,c) for a in range(x-3,x+4) for c in range(y-3,y+4) if (lambda q:q[3]>0 and q[0]>q[1]>q[2] and q[0]>90)(body.getpixel((a,c)))]
            grip=[(a,c) for a in range(x-3,x+4) for c in range(y-3,y+4) if weapon.getpixel((a,c))[3]]
            distance=min((max(abs(a-e),abs(c-f)) for a,c in skin for e,f in grip),default=99)
            if distance>1:raise ValueError('Grip proxy failed on frame '+str(i))
            grips.append({'frame':i,'hand_region_center':[x,y],'distance':distance,'note':'Auxiliary geometric evidence; not artistic approval.'})
        frame=Image.new('RGBA',(84,84));frame.paste(body,(10,13))
        for slot,image in [('pants',pants),('boots',boots),('outfit',outfit),('hair',hair),('weapon',weapon)]:
            padded=Image.new('RGBA',(84,84));padded.paste(image,(10,13));layers[slot].paste(padded,(i*84,0));frame=Image.alpha_composite(frame,padded)
            assert all(not image.getpixel((x,y))[3] or image.getpixel((x,y))==source.getpixel((x,y)) for y in range(64) for x in range(64))
            records.append({'frame':i,'slot':slot,'visible_pixels':sum(c[3]>0 for c in image.get_flattened_data()),'sha256_rgba':hashlib.sha256(image.tobytes()).hexdigest()})
        composite.paste(frame,(i*84,0))
    for slot,sheet in layers.items():sheet.save(HERE/f'visible-{slot}-south.png')
    composite.save(HERE/'visible-pieces-inspection.png')
    composite.save(HERE/'visible-pieces-south-sheet.png')
    pack={'status':('Draft south attack: original visible pieces with generated body; final artwork unapproved' if fit else 'Rejected body: diagnostic pieces unavailable'),
          'rig':{'id':'human-v1','revision':1,'frameWidth':84,'frameHeight':84,'pivotX':42,'pivotY':65,'scale':70/46,'requiredSlots':['body','pants','boots','outfit','hair','weapon'],'animations':{'attack-sword':{'frames':8,'fps':12,'loop':False,'directions':['south']}}},
          'pieces':[],'appearance':{'rigId':'human-v1','pieces':{}},'coverage':{'attack-sword':['south']},'reviewOnly':True,'productionEnabled':False,'full_character_artwork_approved':False}
    for z,slot in enumerate(['body','pants','boots','outfit','hair','weapon']):
        name='candidate-south-sheet.png' if slot=='body' else f'visible-{slot}-south.png'
        identity='bento-motion-'+slot
        pack['pieces'].append({'id':identity,'rigId':'human-v1','slot':slot,'available':fit,'approved':False,'zIndex':z*10,'animations':{'attack-sword':{'kind':'sheet','frames':8,'fps':12,'loop':False,'directions':['south'],'frameWidth':84,'frameHeight':84,'url':name}}})
        pack['appearance']['pieces'][slot]=identity
    (HERE/'review-pack.json').write_text(json.dumps(pack,indent=2)+'\n',encoding='utf-8')
    (HERE/'visible-pieces-audit.json').write_text(json.dumps({'status':'unapproved extraction study','source':'original Bento south frames','source_pixels_only':True,'hidden_pixels_reconstructed':False,'anatomy_from':'PixelLab Skeleton v3 output','weapon_includes_original_contact_effects':True,'known_limitation':'This isolates visible source colours only, not full garments, grip under the hand, or an interchangeable sword asset. Must inspect anatomical alignment before use.','weapon_selection_polygons':WEAPON_REGIONS,'grip_checks':grips,'records':records,'production_enabled':False},indent=2)+'\n',encoding='utf-8')
    if fit:save_modular_gif(composite)
    print('Visible original pixels isolated for inspection only; no semantic layer approval.')

if __name__=='__main__':main()
