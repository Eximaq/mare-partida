"""Evaluate rigid attachment geometry only. Does not render or export any artwork."""
from pathlib import Path
import hashlib,json
from PIL import Image

HERE=Path(__file__).resolve().parent

def main():
    source=HERE/'weapon/frame-01.png'
    image=Image.open(source).convert('RGBA')
    points={(x,y) for y in range(image.height) for x in range(image.width) if image.getpixel((x,y))[3]}
    reference_anchor=(20,36)
    anchors=[(20,36),(18,35),(20,36),(19,35)]
    records=[]
    for i,anchor in enumerate(anchors,1):
        file=HERE/f'body-source-{i:02}.png'
        body=Image.open(file).convert('RGBA')
        dx,dy=anchor[0]-reference_anchor[0],anchor[1]-reference_anchor[1]
        target={(x+dx,y+dy) for x,y in points}
        clipped={(x,y) for x,y in target if not(0<=x<body.width and 0<=y<body.height)}
        body_points={(x,y) for y in range(body.height) for x in range(body.width) if body.getpixel((x,y))[3]}
        hand={(x,y) for x,y in body_points if max(abs(x-anchor[0]),abs(y-anchor[1]))<=2}
        contacts={p for p in target if any(max(abs(p[0]-q[0]),abs(p[1]-q[1]))<=1 for q in hand)}
        overlap=target&body_points
        records.append({'frame':i,'body_source':file.name,'body_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
                        'hand_anchor':anchor,'translation_from_reference':[dx,dy],
                        'clipped_pixels':len(clipped),'body_overlap_pixels':len(overlap),
                        'hand_contact_pixels':len(contacts),
                        'geometry_fits':bool(points) and bool(contacts) and not clipped and not overlap})
    result={'status':'proposal only; explicit authorization required before rendering rigid reuse',
            'scope':'Idle/south four existing body frames; does not validate other actions or directions',
            'artwork_rendered':False,'runtime_changed':False,'new_generations':0,
            'candidate_weapon_source':'weapon/frame-01.png','candidate_weapon_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'candidate_visible_pixels':len(points),'weapon_reference_anchor':reference_anchor,
            'candidate_is_not_art_approved':True,'all_four_geometries_fit':all(r['geometry_fits'] for r in records),
            'frames':records}
    (HERE/'attachment-plan-audit.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))

if __name__=='__main__':main()
