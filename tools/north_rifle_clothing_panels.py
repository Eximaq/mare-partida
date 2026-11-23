"""Original North garment boundaries used to retarget flexed arms."""
def split_front(item,panels,*,rifle=False):
    import numpy as np
    from PIL import Image
    size=(640,640)
    # Trace the inside edge of each sleeve in the 512px source, expressed
    # in its padded 640px coordinates. The original authoring panels cut
    # straight through the shirt and skirt. Those cuts are only invisible
    # when both arms hang down. Keep the continuous waist/back on the body.
    guides={
        151:([228,244,258,273,284,297,308,321,328],[281,281,284,287,287,284,282,279,277],[359,359,356,353,353,356,358,361,363],329),
        165:([238,250,267,281,292,305,319,330,338],[282,282,285,288,287,285,281,278,275],[358,358,355,352,353,355,359,362,365],339),
        158:([258,268,283,300,319,339,351],[281,280,277,272,268,263,259],[359,360,363,368,372,377,381],347),
        172:([258,270,280,290,300,310,320,330,337,341],[281,280,279,276,273,271,268,265,262,260],[359,359,361,364,367,369,372,375,378,380],346),
        6:([227,239,252,261,268],[282,282,285,286,288],[357,356,354,353,351],271),
        7:([225,238,250,263,271,277],[278,279,282,285,286,290],[363,361,359,355,353,350],278),
        130:([233,243,256,271,278,294,308,318,324],[280,282,284,287,287,285,282,278,275],[359,357,355,352,352,355,358,362,365],325),
        137:([229,240,255,271,280,295,306,315,322,331],[277,280,283,287,287,286,282,279,277,274],[365,361,357,353,354,355,359,362,365,368],333),
    }
    ys,ls,rs,end=guides[item]
    whole=Image.new('RGBA',size);back=[]
    for part in panels:
        name,a,b,im=part
        if 'rear' in name:back.append(part)
        else:whole.alpha_composite(im)
    rgba=np.asarray(whole);y,x=np.indices((640,640));taken=np.zeros((640,640),dtype=bool)
    result=[]
    for side,edge in (('LEFT',ls),('RIGHT',rs)):
        seam=np.interp(y,ys,edge)
        outer=x<seam if side=='LEFT' else x>seam
        sleeve=outer&(y>=ys[0])&(y<end)
        if rifle:
            # Track the real, disjoint distal cuff past the authoring crop.
            # Use the first clear gap from the central skirt; no rectangular
            # sliver of the cuff may stay behind at the old wrist position.
            if item not in (158,172):
                sleeve |= outer&(y<ys[0])&(y>=ys[0]-22)
            else:
                fur=(rgba[:,:,1]>76)&(rgba[:,:,0].astype(int)-rgba[:,:,1]<56)
                sleeve &= ~((y<282)&fur)
            tip=end+14
            coords=np.arange(640)
            center=320
            for row in range(end-12,tip):
                outside=np.nonzero(rgba[tip,:,3]>24)[0]
                if not len(outside):continue
                terminal=outside.min() if side=='LEFT' else outside.max()
                line=np.interp(row,[end-12,tip],[np.interp(end-12,ys,edge),terminal])
                xs=np.arange(center,224,-1) if side=='LEFT' else np.arange(center,416)
                opacity=rgba[row,xs,3]
                # A true gap must have the cuff's solid fabric on its far side.
                gap=np.flatnonzero((opacity<6)&(np.maximum.accumulate(opacity[::-1])[::-1]>128))
                if gap.size:line=xs[gap[0]]
                sleeve[row]=coords<line if side=='LEFT' else coords>line
        taken|=sleeve
        for band,a,b in ((y<296,'SHOULDER','ELBOW'),(y>=296,'ELBOW','ARM')):
            out=rgba.copy();out[~(sleeve&band)]=0
            if np.any(out[:,:,3]):result.append(('sleeve',side+' '+a,side+' '+b,Image.fromarray(out)))
    body=rgba.copy();body[taken]=0
    rebuilt=Image.fromarray(body.copy())
    for _,_,_,panel in result:rebuilt.alpha_composite(panel)
    if rebuilt.tobytes()!=whole.tobytes():raise ValueError('Lost front seam pixels')
    # At the sewn shoulder, the cloth sits over the joint under the mobile
    # outer sleeve. Keep the existing material there during arm rotation.
    joint=(y>=ys[0])&(y<254)&(x>273)&(x<367)
    if rifle:
        joint=(((x-282)**2+(y-239)**2<19**2)|((x-358)**2+(y-239)**2<19**2))
    body[joint]=rgba[joint]
    return back+[('core','NECK','HIP',Image.fromarray(body))]+result
