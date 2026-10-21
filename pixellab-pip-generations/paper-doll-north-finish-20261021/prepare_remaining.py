"""Repack six still-missing outfits into one native row; no paid calls or art repair."""
import json
from PIL import Image,ImageDraw
from prepare_inputs import HERE,digest,write,normalized
def main():
    source=Image.new('RGBA',(192,64));mask=Image.new('RGB',source.size);indices=[3,4,5,6,7,8]
    for cell,index in enumerate(indices):
        body=Image.open(HERE/f'body-raw-{index:02}.png').convert('RGBA');cropped=body.crop((16,0,48,64));restored=Image.new('RGBA',(64,64));restored.paste(cropped,(16,0))
        if normalized(body)!=normalized(restored):raise ValueError('Horizontal compaction would remove visible body pixels')
        source.paste(cropped,(cell*32,0));native=Image.new('RGB',(64,64));d=ImageDraw.Draw(native);top=body.getbbox()[1]
        d.rectangle((23,top+11,42,34),fill='white');d.rectangle((23,28,25,34),fill='black');d.rectangle((40,28,42,34),fill='black');mask.paste(native.crop((16,0,48,64)),(cell*32,0))
    source.save(HERE/'outfit-remaining-input.png');mask.save(HERE/'outfit-remaining-mask.png')
    ref=Image.alpha_composite(Image.open(HERE/'body-raw-01.png').convert('RGBA'),Image.open(HERE/'outfit-first'/'frame-01.png').convert('RGBA'));ref.save(HERE/'outfit-remaining-reference.png')
    context=Image.new('RGBA',(256,64));context.paste(source,(0,0));context.paste(ref,(192,0));context.save(HERE/'outfit-remaining-context.png')
    inputs=json.loads((HERE/'inputs.json').read_text());inputs['cell_order']['outfit-remaining']=indices;inputs['remaining_cell']=[32,64];inputs['remaining_source_crop']=[16,0,48,64]
    for name in ['outfit-remaining-input.png','outfit-remaining-mask.png','outfit-remaining-reference.png','outfit-remaining-context.png']:inputs['files'][name]=digest(HERE/name)
    write('inputs.json',inputs)
    bg=Image.new('RGBA',source.size,(25,56,58,255));guide=Image.alpha_composite(bg,source).convert('RGB').resize((1152,384),Image.Resampling.NEAREST);d=ImageDraw.Draw(guide)
    for x in range(192,1152,192):d.line((x,0,x,384),fill='#e0b767')
    guide.save(HERE/'outfit-remaining-inspection-grid.png');print('Six original poses3-8 repacked in one row without losing body pixels.')
if __name__=='__main__':main()
