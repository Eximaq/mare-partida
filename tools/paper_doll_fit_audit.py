"""Audit an anchored PixelLab edit; extract existing pixels only, never repair art.

This checks one static pose. It does not approve artwork or animation coverage.
"""
import argparse,json
from pathlib import Path
from PIL import Image


def pixels(image):
    return getattr(image,'get_flattened_data',image.getdata)()


def meaningful_difference(a,b):
    return [i for i,(x,y) in enumerate(zip(pixels(a),pixels(b)))
            if x!=y and (x[3] or y[3])]


def audit(base_path,edit_path,region=None,layer_path=None,mask_path=None):
    base=Image.open(base_path).convert('RGBA');edit=Image.open(edit_path).convert('RGBA')
    if base.size!=edit.size:
        return {'passed':False,'reason':'canvas-size-mismatch','base_size':base.size,'edit_size':edit.size}
    if mask_path:
        mask=Image.open(mask_path).convert('RGB')
        if mask.size!=base.size or any(c not in [(0,0,0),(255,255,255)] for c in pixels(mask)):
            raise ValueError('Mask must match the native canvas and contain only black/white RGB.')
        allowed={i for i,c in enumerate(pixels(mask)) if c==(255,255,255)}
        if not allowed:raise ValueError('Mask has no allowed pixels.')
    else:
        if not region:raise ValueError('An allowed region or mask is required.')
        x,y,w,h=region
        if min(x,y)<0 or min(w,h)<=0 or x+w>base.width or y+h>base.height:
            raise ValueError('Allowed region must be a nonempty rectangle inside the canvas.')
        allowed={row*base.width+col for row in range(y,y+h) for col in range(x,x+w)}
    changes=meaningful_difference(base,edit);bp=list(pixels(base));ep=list(pixels(edit))
    outside=[i for i in changes if i not in allowed]
    erasures=[i for i in changes if ep[i][3]<bp[i][3]]
    layer=Image.new('RGBA',base.size)
    # Copy the generated edit pixel verbatim. No threshold/recolour/repair.
    for i in changes:layer.putpixel((i%base.width,i//base.width),ep[i])
    mismatch=meaningful_difference(Image.alpha_composite(base,layer),edit)
    passed=bool(changes) and not outside and not erasures and not mismatch
    result={'passed':passed,'scope':'static structural fit only; artwork approval required',
            'size':base.size,'allowed_region':region,'allowed_mask':Path(mask_path).name if mask_path else None,'changed_pixels':len(changes),
            'changed_bbox':layer.getbbox(),'outside_region_pixels':len(outside),
            'alpha_erasure_pixels':len(erasures),'recomposition_mismatch_pixels':len(mismatch)}
    if layer_path and passed:
        Path(layer_path).parent.mkdir(parents=True,exist_ok=True);layer.save(layer_path)
        result['layer_file']=Path(layer_path).name
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('base');p.add_argument('edit')
    bounds=p.add_mutually_exclusive_group(required=True)
    bounds.add_argument('--region',nargs=4,type=int,metavar=('X','Y','W','H'))
    bounds.add_argument('--mask',help='Same-size binary mask: white=allowed, black=frozen.')
    p.add_argument('--layer');p.add_argument('--report')
    args=p.parse_args();result=audit(args.base,args.edit,args.region,args.layer,args.mask)
    if args.report:Path(args.report).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
