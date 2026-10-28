"""Audit an anchored PixelLab edit; extract existing pixels only, never repair art.

This checks one static pose. It does not approve artwork or animation coverage.
"""
import argparse,json,math
from pathlib import Path
from PIL import Image


def pixels(image):
    return getattr(image,'get_flattened_data',image.getdata)()


def meaningful_difference(a,b):
    return [i for i,(x,y) in enumerate(zip(pixels(a),pixels(b)))
            if x!=y and (x[3] or y[3])]


def allowed_pixels(base,region=None,mask_path=None):
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
    return allowed


def audit(base_path,edit_path,region=None,layer_path=None,mask_path=None):
    base=Image.open(base_path).convert('RGBA');edit=Image.open(edit_path).convert('RGBA')
    if base.size!=edit.size:
        return {'passed':False,'reason':'canvas-size-mismatch','base_size':base.size,'edit_size':edit.size}
    allowed=allowed_pixels(base,region,mask_path)
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


def audit_changes_layer(base_path,layer_path,mask_path,contact,allow_body_occlusion=False):
    """Validate isolated output. Clothing may cover only explicitly allowed body pixels."""
    base=Image.open(base_path).convert('RGBA');layer=Image.open(layer_path).convert('RGBA')
    if base.size!=layer.size:
        return {'passed':False,'reason':'canvas-size-mismatch','base_size':base.size,'layer_size':layer.size}
    allowed=allowed_pixels(base,mask_path=mask_path)
    a=list(pixels(base));b=list(pixels(layer));w,h=base.size
    x,y=contact
    if not isinstance(x,int) or not isinstance(y,int) or not(0<=x<w and 0<=y<h):
        raise ValueError('Contact must be an integer coordinate inside the native canvas.')
    visible={i for i,c in enumerate(b) if c[3]}
    body={i for i,c in enumerate(a) if c[3]}
    hand={i for i in body if max(abs(i%w-x),abs(i//w-y))<=2}
    contacts=set()
    for i in visible:
        for dy in [-1,0,1]:
            for dx in [-1,0,1]:
                px,py=i%w+dx,i//w+dy
                if 0<=px<w and 0<=py<h and py*w+px in hand:contacts.add(i)
    outside=visible-allowed;overlap=visible&body
    fractional=sum(0<c[3]<255 for c in b)
    composite=Image.alpha_composite(base,layer)
    cp=list(pixels(composite));body_changes=sum(cp[i]!=a[i] for i in body)
    unprotected_body=allowed&body
    unmasked_changes=sum(cp[i]!=a[i] for i in body-allowed)
    body_valid=not unmasked_changes if allow_body_occlusion else not overlap and not body_changes and not unprotected_body
    passed=bool(visible) and bool(hand) and bool(contacts) and not outside and not fractional and body_valid
    return {'passed':passed,'scope':'structural contact only; artistic approval required',
            'artwork_approved':False,'size':base.size,'contact_anchor':[x,y],
            'visible_layer_pixels':len(visible),'outside_mask_pixels':len(outside),
            'body_occlusion_allowed':allow_body_occlusion,
            'unprotected_body_pixels':0 if allow_body_occlusion else len(unprotected_body),
            'permitted_body_occlusion_pixels':len(unprotected_body) if allow_body_occlusion else 0,
            'changed_unmasked_body_pixels':unmasked_changes,
            'body_overlap_pixels':len(overlap),'partial_alpha_pixels':fractional,
            'changed_body_pixels':body_changes,'hand_contact_pixels':len(contacts),
            'anchor_contact_pixels':len(contacts),
            'layer_bbox':layer.getbbox()}


def audit_material_coverage(base_path,edited_path,required_mask_path,reference_layer_path,min_ratio=.95,max_rgb_distance=48):
    """Detect unchanged skin where an isolated reference garment must cover it.

    The caller supplies an explicit, nonempty required region (e.g. calves),
    not the whole editable mask. This is a rejection gate, never art approval.
    It neither extracts nor changes pixels and cannot certify pose continuity.
    """
    if isinstance(min_ratio,bool) or not math.isfinite(min_ratio) or not 0<min_ratio<=1:
        raise ValueError('Coverage ratio must be finite and in (0,1].')
    if isinstance(max_rgb_distance,bool) or not math.isfinite(max_rgb_distance) or max_rgb_distance<=0:
        raise ValueError('Color distance must be finite and positive.')
    base=Image.open(base_path).convert('RGBA');edited=Image.open(edited_path).convert('RGBA');ref=Image.open(reference_layer_path).convert('RGBA')
    if base.size!=edited.size or ref.size!=base.size:raise ValueError('Native canvases must match.')
    required=allowed_pixels(base,mask_path=required_mask_path)
    bp=list(pixels(base));ep=list(pixels(edited));material={c[:3] for c in pixels(ref) if c[3]==255}
    if not material or any(bp[i][3]!=255 for i in required):raise ValueError('Reference and required body pixels must be visible.')
    original={bp[i][:3] for i in required};covered=[];missing=[]
    def distance(c,colors):return min(sum((c[k]-other[k])**2 for k in range(3)) for other in colors)
    for i in sorted(required):
        c=ep[i];d=distance(c,material)
        ok=c[3]==255 and d<=max_rgb_distance**2 and d<distance(c,original)
        (covered if ok else missing).append(i)
    ratio=len(covered)/len(required)
    return {'passed':ratio>=min_ratio,'artwork_approved':False,
            'scope':'material coverage only; pose, motion and artwork require visual inspection',
            'required_pixels':len(required),'covered_pixels':len(covered),'coverage_ratio':ratio,
            'minimum_ratio':min_ratio,'uncovered_pixels':len(missing),
            'uncovered_sample':[[i%base.width,i//base.width] for i in missing[:16]]}


def inspection_draft(base_path,edit_path,layer_path,composite_path,region=None,mask_path=None):
    """Explicit review-only composition; never silently accept the raw edit as fitted."""
    outputs=[Path(layer_path),Path(composite_path)]
    if outputs[0].resolve()==outputs[1].resolve():
        raise ValueError('Layer and composite require distinct output files.')
    for output in outputs:
        if output.exists():raise FileExistsError(output)
    raw=audit(base_path,edit_path,region,mask_path=mask_path)
    if raw.get('reason')=='canvas-size-mismatch':raise ValueError('Draft cannot rescale images.')
    base=Image.open(base_path).convert('RGBA');edit=Image.open(edit_path).convert('RGBA')
    allowed=allowed_pixels(base,region,mask_path);layer=Image.new('RGBA',base.size)
    a=list(pixels(base));b=list(pixels(edit));copied=0;erasures=[]
    for i in allowed:
        if a[i]==b[i] or not(a[i][3] or b[i][3]):continue
        if b[i][3]<a[i][3]:erasures.append([i%base.width,i//base.width]);continue
        layer.putpixel((i%base.width,i//base.width),b[i]);copied+=1
    for output,image in zip(outputs,[layer,Image.alpha_composite(base,layer)]):
        with output.open('xb') as stream:image.save(stream,format='PNG')
    return {'status':'unapproved inspection derivation; not final artwork',
            'artwork_approved':False,'productionEnabled':False,'raw_audit':raw,
            'draft_audit':audit(base_path,composite_path,region,mask_path=mask_path),
            'copied_generated_pixels':copied,'skipped_alpha_erasures':erasures,
            'layer_file':Path(layer_path).name,'composite_file':Path(composite_path).name}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('base');p.add_argument('edit')
    bounds=p.add_mutually_exclusive_group(required=True)
    bounds.add_argument('--region',nargs=4,type=int,metavar=('X','Y','W','H'))
    bounds.add_argument('--mask',help='Same-size binary mask: white=allowed, black=frozen.')
    p.add_argument('--layer');p.add_argument('--report')
    p.add_argument('--inspection-draft',action='store_true',help='Explicit review-only masked extraction, preserving the original body outside the mask.')
    p.add_argument('--changes-layer',action='store_true',help='Audit an already isolated generated layer without extraction or repair.')
    p.add_argument('--contact',nargs=2,type=int,metavar=('X','Y'),help='Native attachment point for --changes-layer.')
    p.add_argument('--allow-body-occlusion',action='store_true',help='For hair/clothing only: allow coverage of body pixels inside the explicit mask.')
    p.add_argument('--composite',help='Required with --inspection-draft; output must remain labelled as draft.')
    args=p.parse_args()
    if args.changes_layer:
        if args.inspection_draft or not args.mask or not args.contact:p.error('Changes-only audit requires --mask and --contact, without --inspection-draft.')
        result=audit_changes_layer(args.base,args.edit,args.mask,args.contact,allow_body_occlusion=args.allow_body_occlusion)
    elif args.inspection_draft:
        if not args.layer or not args.composite:p.error('Draft extraction requires --layer and --composite.')
        result=inspection_draft(args.base,args.edit,args.layer,args.composite,args.region,args.mask)
    else:result=audit(args.base,args.edit,args.region,args.layer,args.mask)
    if args.report:Path(args.report).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result));raise SystemExit(0 if result.get('draft_audit',result)['passed'] else 1)
