"""Audit native same-pose layer cells; splitting never repairs or invents artwork."""
import hashlib,json,tempfile
from pathlib import Path
from PIL import Image
from paper_doll_fit_audit import audit_changes_layer,pixels

def audit_batch(source_path,layer_path,mask_path,cell_size,anchors,allow_body_occlusion=False,output_dir=None):
    source=Image.open(source_path).convert('RGBA')
    layer=Image.open(layer_path).convert('RGBA')
    mask=Image.open(mask_path).convert('RGB')
    if source.size!=layer.size or source.size!=mask.size:
        return {'passed':False,'reason':'canvas-size-mismatch'}
    if not isinstance(cell_size,int) or cell_size<1 or source.width%cell_size or source.height%cell_size:
        raise ValueError('Cells must divide the native atlas exactly.')
    columns,rows=source.width//cell_size,source.height//cell_size
    if len(anchors)!=columns*rows:raise ValueError('Every native cell requires its own attachment point.')
    if any(c not in [(0,0,0),(255,255,255)] for c in pixels(mask)):
        raise ValueError('Mask must contain only pure black/white RGB.')
    reports=[];frames=[];visible_fingerprints=[]
    with tempfile.TemporaryDirectory(prefix='mare-layer-audit-') as directory:
        root=Path(directory)
        for i,anchor in enumerate(anchors):
            x,y=(i%columns)*cell_size,(i//columns)*cell_size
            box=(x,y,x+cell_size,y+cell_size)
            frame=layer.crop(box);frames.append(frame)
            visible_fingerprints.append(hashlib.sha256(bytes(v for color in pixels(frame) for v in (color if color[3] else (0,0,0,0)))).hexdigest())
            for name,image in [('source',source.crop(box)),('layer',frame),('mask',mask.crop(box))]:
                image.save(root/(name+'.png'))
            report=audit_changes_layer(root/'source.png',root/'layer.png',root/'mask.png',anchor,allow_body_occlusion)
            reports.append({'frame':i+1,'cell':[x,y,cell_size,cell_size],**report})
    unique=len(set(visible_fingerprints))
    passed=all(r['passed'] for r in reports) and (len(frames)==1 or unique>1)
    result={'passed':passed,'scope':'native batch structure; no artistic approval',
            'artwork_approved':False,'size':source.size,'cell_size':cell_size,
            'frame_order':'row-major','frames':reports,'unique_visible_frames':unique,
            'static_layer_rejected':len(frames)>1 and unique==1}
    if passed and output_dir:
        destination=Path(output_dir);destination.mkdir(parents=True,exist_ok=True)
        for i,frame in enumerate(frames,1):frame.save(destination/f'frame-{i:02}.png')
        result['exported_frames']=len(frames)
    return result
