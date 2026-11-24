"""Bend an owned sleeve around its shoulder, elbow and wrist. No source pixels outside the garment are introduced."""
def bend(im,rest,tip):
    import numpy as np
    from PIL import Image,ImageDraw
    size=(640,640)
    shoulder,elbow,wrist=rest
    start,pivot,end=tip
    def axis(a,b,c,d):
        u=b-a;v=d-c
        def basis(k):return np.column_stack((k,np.array([-k[1],k[0]])/np.linalg.norm(k)))
        return (basis(v)@np.linalg.inv(basis(u)))[:,0]
    axes=(axis(shoulder,elbow,start,pivot),axis(elbow,wrist,pivot,end))
    def project(x,y):
        lower=y>=elbow[1]
        a,b=(elbow,wrist) if lower else (shoulder,elbow)
        c,d=(pivot,end) if lower else (start,pivot)
        frac=(y-a[1])/(b[1]-a[1]);origin=a+frac*(b-a)
        blend=np.clip((y-elbow[1]+12)/24,0.,1.)
        across=(1-blend)*axes[0]+blend*axes[1]
        across/=max(np.linalg.norm(across),.001)
        return c+frac*(d-c)+(x-origin[0])*across
    bounds=im.getbbox()
    tile=Image.new('RGBA',size)
    if not bounds:return tile
    l,t,r,b=bounds;t-=1;b+=1;l-=1;r+=1
    lines=sorted(set([t,b,*[int(elbow[1])+s for s in (-16,-12,-8,-4,0,4,8,12,16) if t<int(elbow[1])+s<b]]))
    for y0,y1 in reversed(list(zip(lines,lines[1:]))):
        source=np.array([(l,y0),(r,y0),(r,y1),(l,y1)])
        dest=np.array([project(*v) for v in source])
        for ids in ([0,1,2],[0,2,3]):
            dst=dest[ids];orig=source[ids]
            x0,y0t=dst.min(axis=0).astype(int)-1
            x1,y1t=np.ceil(dst.max(axis=0)).astype(int)+1
            if min(x1-x0,y1t-y0t)<1:continue
            local=dst-np.array((x0,y0t))
            coords=np.column_stack((local,np.ones(3)))
            if abs(np.linalg.det(coords))<.01:continue
            inv=np.linalg.solve(coords,orig).T
            shape=(x1-x0,y1t-y0t)
            warped=im.transform(shape,Image.Transform.AFFINE,tuple(inv.ravel()),Image.Resampling.NEAREST)
            mask=Image.new('1',shape)
            ImageDraw.Draw(mask).polygon(list(map(tuple,local.round().astype(int).tolist())),fill=1)
            warped.paste((0,0,0,0),mask=mask.point(lambda k:0 if k else 255))
            tile.alpha_composite(warped,(x0,y0t))
    return tile
