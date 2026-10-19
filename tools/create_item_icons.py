"""Original code-native SVG item art on a 32px grid; no external generation."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/ui/items';OUT.mkdir(parents=True,exist_ok=True)
source=(ROOT/'game.js').read_text(encoding='utf-8')
entries=re.findall(r"\{name:'([^']+)',slot:'([^']+)'(?:,type:'([^']+)')?",source)
gold='#d7ac57';steel='#b9d2d5';ink='#201b19'
def shape(kind,i):
    accent=['#9d4340','#327a8a','#56825d','#9c68a2','#be7e3f'][i%5]
    def p(d,fill):return f'<path d="{d}" fill="{fill}"/>'
    def r(x,y,w,h,c):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
    if kind=='sabre':return p('M10 21L14 16L22 11L27 3L28 10L25 17L16 23Z',steel)+p('M6 19L17 26L20 23L9 16Z','#d78c6d')+p('M5 27L9 21L13 24L9 30Z','#79513b')
    if kind=='cannon':return p('M3 10H23L29 14V21L23 25H9L3 20Z','#586c78')+p('M19 10L26 13V23L19 25Z',steel)+p('M23 14H28V21H23Z','#19272c')+r(6,11,4,12,gold)+r(13,13,4,5,accent)+p('M9 23H17V29H11Z','#7f5634')
    if kind=='bandana':return p('M6 13L10 7H22L27 14L25 20H7Z',accent)+r(6,15,19,5,gold)+p('M24 16L30 20L28 27L24 22L21 24L22 19Z',accent)+r(12,9,7,3,'#d5bd87')
    if kind=='legs':return p('M7 4H25V14L23 28H17L16 17L14 28H8L6 14Z',accent)+r(7,4,18,4,gold)+r(10,10,4,4,'#d3c2a0')+r(19,10,4,4,'#c7ae7b')+p('M8 24H14V28H8ZM18 24H24V28H18Z','#49616a')
    if kind=='cloak':return p('M12 3H20L24 10L28 28L19 26L16 29L12 26L4 28L8 10Z',accent)+p('M12 3L16 8L20 3L22 9L16 13L10 9Z','#ead8ac')+p('M10 13L8 25H11L13 14ZM21 13L24 25H21L19 14Z','#332d32')+r(14,9,4,3,gold)
    if kind=='compass':return p('M10 3H22L29 10V22L22 29H10L3 22V10Z',gold)+p('M11 6H21L26 11V21L21 26H11L6 21V11Z','#246d7e')+p('M16 7L20 16L16 25L12 16Z','#e6d7a7')+p('M7 16L16 12L25 16L16 20Z','#8ed0c7')+p('M16 8V16H12Z','#bc4c43')
    if kind=='reliquary':return p('M7 5H25V27H7Z',gold)+p('M10 8H22V24H10Z','#8b4442')+p('M16 10L21 16L16 22L11 16Z','#72c6b5')+r(4,10,3,3,steel)+r(4,20,3,3,steel)+r(15,12,2,8,'#f7e5b4')
    if kind in ('sword','rogue'):
        blade=p('M11 21V17L23 5H27V9L15 21Z',steel)+p('M14 17L24 7H25L15 18Z','#f4f1d6')+p('M8 18L17 27L20 24L11 15Z',gold)+p('M5 25L10 20L13 23L8 28Z','#79513b')
        return (f'<g transform="translate(-3 -1)">{blade}</g>'+p('M18 25V20L27 11V16L22 22Z',accent)) if kind=='rogue' else blade+r(23,6,3,3,accent)
    if kind in ('brawler','cyborg','gloves'):
        return p('M7 15V8H11V6H16V8H21V11H25V23L20 28H10L6 24V18H3V13H6Z',steel if kind=='cyborg' else accent)+r(8,19,15,5,gold)+r(10,9,3,7,'#efcf99')+r(16,10,3,7,'#efcf99')+r(12,24,7,3,'#5b4437')
    if kind=='gunner':return p('M3 11H27V15H18L13 19L16 26H10L6 17H3Z','#876243')+r(3,9,25,4,steel)+r(19,13,7,3,gold)+p('M12 17H18V21H14Z',gold)+r(7,18,3,6,accent)
    if kind=='strategist':return p('M16 3L26 10V23L16 29L6 23V10Z',gold)+p('M16 6L23 12V21L16 25L9 21V12Z',accent)+p('M16 9L20 16L16 22L12 16Z','#a3e4dc')+r(14,2,4,4,'#f6e3aa')
    if kind=='healer':return p('M9 28L13 11H18L14 28Z','#89542e')+p('M7 9L11 3H21L25 9L21 15H11Z',gold)+p('M12 7H20V11H12Z',accent)+r(15,4,2,10,'#e9f4d0')
    if kind in ('coat','cloak'):
        return p('M12 4H20L27 10L29 20L24 22L23 15V28H9V15L8 22L3 20L5 10Z',accent)+p('M12 4L16 9L20 4V28H12Z','#e6d8b9')+r(15,11,2,14,gold)+r(9,25,14,3,gold)
    if kind in ('boots','legs'):
        return p('M7 5H25L24 16L23 23L28 25V29H18L16 17L14 29H4V25L8 23L7 16Z',accent if kind=='legs' else '#875735')+r(7,6,18,4,gold)+r(5,26,8,3,'#cba96e')+r(19,26,8,3,'#cba96e')+r(11,12,2,7,'#bd9d6a')+r(8,15,5,3,accent)+r(19,15,5,3,accent)
    if kind=='head':return p('M4 18V14H7V8L12 4H21L26 9V15H29V19L24 22H8Z',accent)+r(7,14,18,5,gold)+p('M12 4H20V12H12Z',steel)+r(14,15,5,4,'#f2d9a0')
    if kind=='belt':return p('M3 12H29V22H3Z','#87603b')+r(11,10,11,14,gold)+r(14,13,5,8,'#34281c')+r(18,15,7,2,steel)+r(5,15,3,4,accent)
    if kind in ('necklace','charm','ring'):
        ring=p('M10 5H22L27 10V22L22 27H10L5 22V10Z',gold)+p('M12 9H20L23 12V20L20 23H12L9 20V12Z','#233039')
        return ring+p('M12 4L16 1L21 5V11L16 15L11 11Z' if kind=='ring' else 'M10 21H22V27H10Z' if kind=='necklace' else 'M11 22L16 17L23 23L17 30L10 26Z',accent)+r(14,5 if kind=='ring' else 22,3,3,'#e3f4d9')
    if kind=='potion':return p('M12 3H20V11L25 17V26L22 29H10L7 26V17L12 11Z',steel)+p('M10 18H22V25L20 27H12L10 25Z','#c74549')+r(12,2,8,5,'#966b3c')+r(10,17,3,6,'#f0e8cd')
    return p('M4 18L9 9L21 6L28 15L25 25L12 28L4 24Z','#728a93')+p('M9 9L16 14L12 28L4 24V18Z','#455763')+p('M16 14L21 6L28 15L25 25Z','#a5bbc0')+r(17,16,5,3,'#d3c098')
manifest=[]
special={1:'sabre',15:'cannon',16:'compass',18:'bandana',32:'reliquary'}
for i,(name,slot,typ) in enumerate(entries):
    manifest.append((str(i),name,special.get(i,typ or slot),i))
manifest += [('potion','Poção de Vida','potion',33),('material','Ferro Salgado','material',34)]
for key,name,kind,i in manifest:
    body=shape(kind,i)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><title>{name}</title><g stroke="{ink}" stroke-width="1.5" stroke-linejoin="miter">{body}</g></svg>'
    (OUT/f'{key}.svg').write_text(svg,encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps([dict(id=k,name=n,type=t,file=f'{k}.svg',origin='Original code-native SVG, 32px grid') for k,n,t,i in manifest],ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(manifest)} item icons created')
