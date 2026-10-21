"""Inspect measured north grips with the original rear sword; no pixel edits."""
from PIL import Image
from prepare_review import HERE,OLD,write,grid_preview
HANDS=[(41,37),(41,37),(41,37),(42,36),(41,33),(40,32),(40,33),(42,35)]
def main():
    sword=Image.open(OLD/'weapon-north.png').convert('RGBA');sheet=Image.new('RGBA',(256,128));records=[]
    for i,(x,y) in enumerate(HANDS):
        body=Image.open(HERE/f'body-raw-{i+1:02}.png').convert('RGBA');weapon=Image.new('RGBA',(64,64));weapon.paste(sword,(x-42,y-35))
        bp=list(body.get_flattened_data());wp=list(weapon.get_flattened_data());hand={n for n,c in enumerate(bp) if c[3] and max(abs(n%64-x),abs(n//64-y))<=2};visible={n for n,c in enumerate(wp) if c[3] and not bp[n][3]}
        contact=sum(any(abs(n%64-h%64)<=1 and abs(n//64-h//64)<=1 for h in hand) for n in visible)
        if not contact:raise ValueError('No exposed sword contact: '+str(i))
        composite=Image.alpha_composite(weapon,body);assert all(a==b for a,b in zip(bp,composite.get_flattened_data()) if a[3])
        sheet.paste(composite,((i%4)*64,(i//4)*64));records.append({'frame':i,'hand':[x,y],'socket':{'x':x+10,'y':y+13},'contact_pixels':contact,'body_pixel_changes':0})
    sheet.save(HERE/'body-weapon.png');grid_preview(sheet,64,64,'weapon-fit-inspection-grid.png');write('weapon-fit.json',{'passed':True,'frames':records,'artwork_approved':False})
    print('All eight native grip contacts passed; body unchanged.')
if __name__=='__main__':main()
