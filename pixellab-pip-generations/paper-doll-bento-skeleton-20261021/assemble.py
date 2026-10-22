"""Package original PixelLab frames without repainting or manufacturing poses."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent

def normalized(im):
    return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))

def main():
    frames=[];records=[]
    for i in range(8):
        path=HERE/f'body-south-{i:02}.png'
        im=Image.open(path).convert('RGBA')
        if im.size!=(64,64):raise ValueError('Unexpected canvas; do not rescale the generation')
        alpha=set(im.getchannel('A').get_flattened_data())
        if not im.getbbox():raise ValueError('Empty generated frame')
        if alpha-{0,255}:raise ValueError('Partial alpha: inspect before packaging pixel art')
        if 0 not in alpha:raise ValueError('Missing transparency')
        canvas=Image.new('RGBA',(84,84));canvas.paste(im,(10,13));frames.append(canvas)
        records.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bounds':im.getbbox(),'visible_pixels':sum(c[3]>0 for c in im.get_flattened_data())})
    sheet=Image.new('RGBA',(672,84))
    for i,frame in enumerate(frames):sheet.paste(frame,(i*84,0))
    sheet.save(HERE/'candidate-south-sheet.png')
    # Inspection guide is separate from the art. No original pixels are modified.
    guide=sheet.copy();draw=ImageDraw.Draw(guide)
    for x in range(84,672,84):draw.line((x,0,x,83),fill='#efc66f')
    guide.save(HERE/'candidate-inspection-grid.png')
    colors=sorted({c[:3] for im in frames for c in im.get_flattened_data() if c[3]})
    if len(colors)>255:raise ValueError('GIF would quantize source; use PNG/Canvas')
    palette=[0,0,0]+[v for c in colors for v in c];palette+=[0]*(768-len(palette))
    lookup={c:i+1 for i,c in enumerate(colors)};indexed=[]
    for frame in frames:
        out=Image.new('P',(84,84));out.putpalette(palette);out.putdata([lookup[c[:3]] if c[3] else 0 for c in frame.get_flattened_data()]);indexed.append(out)
    durations=[80,90,80,80,90,80,80,90]
    indexed[0].save(HERE/'candidate-south.gif',save_all=True,append_images=indexed[1:],duration=durations,transparency=0,disposal=2,loop=0,optimize=False)
    with Image.open(HERE/'candidate-south.gif') as gif:
        assert gif.n_frames==8
        for i,frame in enumerate(frames):
            gif.seek(i);assert normalized(gif.convert('RGBA'))==normalized(frame)
            assert gif.info['duration']==durations[i] and gif.disposal_method==2
    audit={'structural_checks_passed':True,'artwork_approved':False,'production_enabled':False,'frames':records,'unique_frames':len({normalized(im) for im in frames}),'padding':[10,13],'canvas':[84,84],'pivot':[42,65],'fps':12,'frame_order':'unchanged 0..7','gif_exact_rgba':True,'gif_durations_ms':durations,'gif_loop':0,'gif_disposal':2,'note':'Geometry, palette and PNG/GIF fidelity do not approve choreography or anatomical quality.'}
    (HERE/'assembly-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
    print('Eight original generated frames, exact-palette GIF, fixed padding and source hashes verified.')

if __name__=='__main__':main()
