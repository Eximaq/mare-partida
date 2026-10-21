"""Assemble the accepted south-only layers without repainting, scaling or fake frames."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
from inspect_layer import inspect

HERE=Path(__file__).resolve().parent

def visible(image):return [(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in image.get_flattened_data()]
def pad(image):
    result=Image.new('RGBA',(84,84));result.paste(image,(10,13));return result

def main():
    quality=json.loads((HERE/'quality-review.json').read_text())
    if not all(quality[slot]['prototype_gate_passed'] for slot in ['hair','outfit']):
        raise ValueError('An artistic gate failed; do not assemble a complete-looking pack')
    reports={slot:inspect(slot) for slot in ['hair','outfit']}
    if not all(r['passed'] for r in reports.values()):raise ValueError('Structural layer audit failed')
    charged=sum(json.loads((HERE/f'{slot}-job.json').read_text())['reported_usage']['generations'] for slot in ['hair','outfit'])
    rig=json.loads((HERE/'shared-rig.json').read_text())
    if rig['id']!='human-v1' or rig['frameWidth']!=84 or rig['frameHeight']!=84:raise ValueError('Unexpected shared rig')
    bodies=Image.open(HERE/'body-idle-south.png').convert('RGBA')
    weapon=Image.open(HERE/'rigid-weapon.png').convert('RGBA')
    sockets=[{'x':30,'y':49},{'x':28,'y':48},{'x':30,'y':49},{'x':29,'y':48}]
    frames=[];records=[];sheets={slot:Image.new('RGBA',(336,84)) for slot in ['hair','outfit']}
    comparison=Image.new('RGBA',(336,168))
    for index in range(4):
        body=bodies.crop((index*84,0,(index+1)*84,84))
        native=Image.open(HERE/f'body-source-{index+1:02}.png').convert('RGBA')
        if visible(body)!=visible(pad(native)):raise ValueError('Body frame changed')
        combined=body.copy();mask=Image.new('L',(84,84))
        for slot in ['outfit','hair']:
            layer=pad(Image.open(HERE/slot/f'frame-{index+1:02}.png').convert('RGBA'))
            sheets[slot].paste(layer,(index*84,0));combined=Image.alpha_composite(combined,layer)
            x,y=(index%2)*64,(index//2)*64
            source_mask=Image.open(HERE/f'{slot}-mask-input.png').convert('L').crop((x,y,x+64,y+64))
            for py in range(64):
                for px in range(64):
                    if source_mask.getpixel((px,py)):mask.putpixel((px+10,py+13),255)
        layer=Image.new('RGBA',(84,84));socket=sockets[index]
        layer.paste(weapon,(socket['x']-20,socket['y']-36));combined=Image.alpha_composite(combined,layer)
        changed_unmasked=sum(a!=b and bool(a[3]) and not m for a,b,m in zip(body.get_flattened_data(),combined.get_flattened_data(),mask.get_flattened_data()))
        if changed_unmasked:raise ValueError('Anatomy changed outside its permitted garment/scalp region')
        combined.save(HERE/f'composite-{index+1:02}.png');frames.append(combined)
        comparison.paste(body,(index*84,0));comparison.paste(combined,(index*84,84))
        records.append({'frame':index+1,'unmasked_body_changes':changed_unmasked,'socket':socket,
                        'hair':reports['hair']['frames'][index],'outfit':reports['outfit']['frames'][index]})
    for slot,sheet in sheets.items():sheet.save(HERE/f'{slot}-idle-south.png')
    comparison.save(HERE/'comparison-sheet.png')
    guide=comparison.copy();draw=ImageDraw.Draw(guide)
    for x in [84,168,252]:draw.line((x,0,x,167),fill=(248,210,110,255))
    draw.line((0,84,335,84),fill=(248,210,110,255));guide.save(HERE/'comparison-inspection-grid.png')
    colors=sorted({(r,g,b) for frame in frames for r,g,b,a in frame.get_flattened_data() if a})
    if len(colors)>255:raise ValueError('GIF would lose colors')
    palette=[0,0,0]+[v for color in colors for v in color];palette += [0]*(768-len(palette))
    indices={c:i+1 for i,c in enumerate(colors)};indexed=[]
    for frame in frames:
        image=Image.new('P',(84,84));image.putpalette(palette)
        image.putdata([indices[(r,g,b)] if a else 0 for r,g,b,a in frame.get_flattened_data()]);indexed.append(image)
    indexed[0].save(HERE/'human-idle-review.gif',save_all=True,append_images=indexed[1:],duration=250,
                    loop=0,disposal=2,transparency=0,optimize=False)
    with Image.open(HERE/'human-idle-review.gif') as decoded:
        assert decoded.n_frames==4 and decoded.info['loop']==0
        for i,frame in enumerate(frames):
            decoded.seek(i)
            assert decoded.disposal_method==2 and decoded.info['duration']==250 and visible(decoded.convert('RGBA'))==visible(frame)
    clip={**rig['animations']['idle'],'directions':['south'],'frameWidth':84,'frameHeight':84}
    pieces=[{'id':'review-'+slot,'slot':slot,'rigId':rig['id'],'approved':False,'available':True,'zIndex':z,
             'animations':{'idle':{**clip,'url':slot+'-idle-south.png'}}}
            for slot,z in [('body',20),('outfit',50),('hair',60)]]
    pieces.append({'id':'review-weapon','slot':'weapon','rigId':rig['id'],'approved':False,'available':True,'zIndex':80,
                   'animations':{'idle':{**clip,'kind':'rigid-attachment','url':'rigid-weapon.png',
                     'source':{'width':64,'height':64,'anchorX':20,'anchorY':36},'sockets':{'south':sockets}}}})
    data={'status':'south Idle prototype; other directions and actions missing','rig':rig,'pieces':pieces,
          'appearance':{'rigId':rig['id'],'pieces':{slot:'review-'+slot for slot in ['body','hair','outfit','weapon']}},
          'audits':records,'scope':'four required real layers in Idle/south only; rigid weapon authorized',
          'full_character_artwork_approved':False,'new_generations':charged}
    (HERE/'review-pack.json').write_text(json.dumps(data,indent=2)+'\n')
    print('Assembled four required layers in Idle/south; no unmasked anatomy changes; other poses fall back.')

if __name__=='__main__':main()
