"""Download and inspect approved PixelLab pilot frames without changing source pixels."""
import json, urllib.request, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/bento-combat-pilot-20261018'
JOBS={'combat-idle':('d3e53bd6-0b12-493c-8a94-ac43a7e237c0',5,200),
      'attack':('f2a70700-58c6-484e-922e-3a644beb4707',7,100)}

def main():
    audit={}
    for name,(job,count,delay) in JOBS.items():
        if len(sys.argv)>1 and name!=sys.argv[1]:continue
        frames=[]
        for i in range(count):
            path=RUN/f'{name}-{i:02}.png'
            if not path.exists():
                url=f'https://api.pixellab.ai/mcp/images/{job}/download?index={i}'
                request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
                path.write_bytes(urllib.request.urlopen(request,timeout=90).read())
            im=Image.open(path).convert('RGBA');assert im.size==(64,64)
            frames.append(im)
        # One shared exact palette and a dedicated transparent entry, with no quantization.
        colors=sorted({pixel[:3] for im in frames for pixel in im.getdata() if pixel[3]})
        assert len(colors)<=255, 'GIF cannot preserve this palette exactly; keep original PNGs.'
        palette=[0,0,0]+[v for color in colors for v in color]
        palette += [0]*(768-len(palette));lookup={color:i+1 for i,color in enumerate(colors)}
        indexed=[]
        for im in frames:
            out=Image.new('P',im.size);out.putpalette(palette)
            out.putdata([lookup[pixel[:3]] if pixel[3] else 0 for pixel in im.getdata()])
            out.info['transparency']=0;indexed.append(out)
        gifpath=RUN/f'{name}-preview.gif'
        indexed[0].save(gifpath,save_all=True,append_images=indexed[1:],duration=delay,
                        loop=0,transparency=0,disposal=2,optimize=False)
        gif=Image.open(gifpath);assert gif.n_frames==count and gif.info['loop']==0
        for i,source in enumerate(frames):
            gif.seek(i);actual=gif.convert('RGBA')
            assert gif.disposal_method==2
            assert all(a[3]==b[3] and (a[3]==0 or a[:3]==b[:3])
                       for a,b in zip(actual.getdata(),source.getdata())), f'GIF mismatch {name} {i}'
        sheet=Image.new('RGBA',(64*count,64))
        for i,im in enumerate(frames):sheet.paste(im,(64*i,0))
        sheet.save(RUN/f'{name}-sheet.png')
        inspection=sheet.resize((sheet.width*3,192),Image.Resampling.NEAREST)
        draw=ImageDraw.Draw(inspection)
        for i in range(1,count):draw.line((i*192,0,i*192,191),fill='#f0b55a')
        inspection.save(RUN/f'{name}-inspection-grid.png')
        source=Image.open(RUN/'bento-guard-corrected.png').convert('RGBA')
        first=frames[0]
        echo=all(a[3]==b[3] and (not a[3] or a[:3]==b[:3]) for a,b in zip(source.getdata(),first.getdata()))
        audit[name]={'frames':count,'size':[64,64],'original_order':True,'first_frame_matches_visible_source':echo,
          'bounds':[im.getchannel('A').getbbox() for im in frames],'distinct_frames':len({im.tobytes() for im in frames}),
          'gif_exact_visible_pixels':True,'gif_disposal':2,'gif_loop':0,'preview_frame_ms':delay,'colors':len(colors)}
    path=RUN/'animation-verification.json'
    previous=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    previous.update(audit)
    path.write_text(json.dumps(previous,indent=2),encoding='utf-8')
    print(json.dumps(audit))

if __name__=='__main__':main()
