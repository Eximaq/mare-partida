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


def audit(base_path,edit_path,region,layer_path=None):
    base=Image.open(base_path).convert('RGBA');edit=Image.open(edit_path).convert('RGBA')
    if base.size!=edit.size:
        return {'passed':False,'reason':'canvas-size-mismatch','base_size':base.size,'edit_size':edit.size}
    x,y,w,h=region
    if min(x,y)<0 or min(w,h)<=0 or x+w>base.width or y+h>base.height:
        raise ValueError('Allowed region must be a nonempty rectangle inside the canvas.')
    changes=meaningful_difference(base,edit);bp=list(pixels(base));ep=list(pixels(edit))
    outside=[i for i in changes if not(x<=i%base.width<x+w and y<=i//base.width<y+h)]
    erasures=[i for i in changes if ep[i][3]<bp[i][3]]
    layer=Image.new('RGBA',base.size)
    # Copy the generated edit pixel verbatim. No threshold/recolour/repair.
    for i in changes:layer.putpixel((i%base.width,i//base.width),ep[i])
    mismatch=meaningful_difference(Image.alpha_composite(base,layer),edit)
    passed=bool(changes) and not outside and not erasures and not mismatch
    result={'passed':passed,'scope':'static structural fit only; artwork approval required',
            'size':base.size,'allowed_region':region,'changed_pixels':len(changes),
            'changed_bbox':layer.getbbox(),'outside_region_pixels':len(outside),
            'alpha_erasure_pixels':len(erasures),'recomposition_mismatch_pixels':len(mismatch)}
    if layer_path and passed:
        Path(layer_path).parent.mkdir(parents=True,exist_ok=True);layer.save(layer_path)
        result['layer_file']=Path(layer_path).name
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('base');p.add_argument('edit')
    p.add_argument('--region',nargs=4,type=int,required=True,metavar=('X','Y','W','H'))
    p.add_argument('--layer');p.add_argument('--report')
    args=p.parse_args();result=audit(args.base,args.edit,args.region,args.layer)
    if args.report:Path(args.report).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
