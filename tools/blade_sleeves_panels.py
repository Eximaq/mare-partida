"""Separate a profile coat into its own lining, torso and articulated sleeve.

All geometry is in the original padded 640-pixel coordinate system.
"""


def point(p,k):
    import numpy as np
    return np.array([p[k]['x'],p[k]['y']])*4


def map_panel(im,a,b,c,d,width=1.0):
    import numpy as np
    from PIL import Image
    def basis(axis,w):
        return np.stack((axis,np.array([-axis[1],axis[0]])*w/np.linalg.norm(axis)),axis=1)
    u,v=b-a,d-c
    if min(np.linalg.norm(u),np.linalg.norm(v))<5:raise ValueError('Unregistered projected limb')
    inv=basis(u,1)@np.linalg.inv(basis(v,width))
    return im.transform((640,640),Image.Transform.AFFINE,tuple(np.column_stack((inv,a-inv@c)).ravel()),Image.Resampling.NEAREST)


def clipped(im,mask):
    import numpy as np
    from PIL import Image
    rgba=np.array(im)
    rgba[:,:,3]=((rgba[:,:,3].astype(np.uint32)*mask+127)//255).astype('uint8');rgba[rgba[:,:,3]==0]=0
    return Image.fromarray(rgba)


def profile_panels(item,seams,records,bank,source):
    import numpy as np
    from PIL import Image,ImageDraw
    edge,side=seams
    yy,xx=np.indices((640,640))
    alpha=lambda image:np.asarray(image)[:,:,3]
    if item==151:
        name='male-pants133-idle-east-source-v18-candidate-coat151-native'
        r=records[name];d=r['pack']['directions']['east']
        if r['body']!='male' or r['equipment'].get('torso')!=item or r['pack']['pivot']!={'x':64,'y':112} or r['pack']['density']!=4:
            raise ValueError('Invalid isolated 151 donor')
        rest={k:{'x':v['x']+16,'y':v['y']+16} for k,v in d['rest'].items()}
        owner=Image.new('RGBA',(640,640));parts=[]
        for l in sorted(d['layers'],key=lambda l:l['depth']):
            if not l['id'].startswith(('equip-coat151-','equip-original-neck-coverage')):continue
            k=l['source']
            if k not in r['sourceRefs'] or l['slot']!='body':raise ValueError('Foreign reference garment')
            owner.alpha_composite(source(bank,k));parts.append([l['id'],k])
        if len(parts)!=9:raise ValueError('Incomplete isolated 151')
    else:
        name=f'male-torso{item}-east-frozen-attack-native-candidate'
        r=records[name];d=r['pack']['directions']['east'];rest=d['rest']
        original=records[f'male-torso{item}-east-frozen-idle-native']
        known={l['source'] for l in original['pack']['directions']['east']['layers']}
        if r['body']!='male' or r['equipment']!={'torso':item} or r['pack']['pivot']!={'x':80,'y':128}:raise ValueError(name)
        owner=Image.new('RGBA',(640,640));parts=[]
        for l in sorted(d['layers'],key=lambda l:l['depth']):
            if l['id'].startswith('base:'):continue
            key=l['source']
            if key not in known or r['sourceRasterPadding'][key]!={'sourceSize':512,'offset':64} or l['slot'] not in ('underArms','top'):raise ValueError('Foreign cloth')
            owner.alpha_composite(source(bank,key));parts.append([l['id'],key])
    poly=Image.new('L',(640,640));ImageDraw.Draw(poly).polygon(edge,fill=255)
    arm=clipped(owner,np.asarray(poly))
    # Recover the textile behind the resting sleeve from this same coat's
    # editable side lining. Apply it only to the exposed region of the male
    # coat, bounded by its existing side seam and carrying its original hem.
    lining_record=records[f'female-torso{item}-east-frozen-attack-native']
    lining,=[l for l in lining_record['pack']['directions']['east']['layers'] if l['id']==f'coat{item}-native-fabric-side-lining']
    if lining['slot']!='top' or lining['binding']!={'kind':'fixed'}:raise ValueError('Invalid fabric backing')
    fabric=source(bank,lining['source']);left,top,right,bottom=arm.getbbox()
    limit=np.interp(yy,*zip(*side))
    backing=Image.new('RGBA',(640,640));patch=fabric.crop(fabric.getbbox()).resize((right-left,bottom-top),Image.Resampling.NEAREST)
    backing.paste(patch,(left,top));backing=clipped(backing,np.where((xx>=limit)&(alpha(arm)>0),255,0))
    core=clipped(owner,255-np.asarray(poly));core.alpha_composite(backing)
    # Overlap at the elbow by a few original rows so the elbow turn
    # maintains the stitch. No pixels are taken from another item.
    elbow=point(rest,'RIGHT ELBOW')
    upper=clipped(arm,np.where(yy<=elbow[1]+3,255,0));lower=clipped(arm,np.where(yy>=elbow[1]-3,255,0))
    return name,parts,lining_record['id'],lining['source'],rest,owner,arm,core,upper,lower
