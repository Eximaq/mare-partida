"""Build the original 3x5 HUD digit font; requires fonttools, no external artwork."""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
PATTERNS = {
 '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
 '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
 '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
 '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
 '+':['000','010','111','010','000']}
def main():
    fb=FontBuilder(700,isTTF=True)
    names={c:'digit'+c if c.isdigit() else 'plus' for c in PATTERNS}
    order=['.notdef','space',*names.values()]; fb.setupGlyphOrder(order)
    fb.setupCharacterMap({32:'space',**{ord(c):n for c,n in names.items()}})
    glyphs={n:TTGlyphPen(None).glyph() for n in order}
    for char,rows in PATTERNS.items():
        pen=TTGlyphPen(None)
        for y,row in enumerate(rows):
            for x,on in enumerate(row):
                if on=='1':
                    left=x*100; bottom=(4-y)*100
                    pen.moveTo((left,bottom));pen.lineTo((left,bottom+100));pen.lineTo((left+100,bottom+100));pen.lineTo((left+100,bottom));pen.closePath()
        glyphs[names[char]]=pen.glyph()
    fb.setupGlyf(glyphs);fb.setupHorizontalMetrics({n:(400,0) for n in order})
    fb.setupHorizontalHeader(ascent=600,descent=-100)
    fb.setupNameTable({'familyName':'Mare Badge Digits','styleName':'Regular','uniqueFontIdentifier':'MareBadgeDigits-Regular-1','fullName':'Mare Badge Digits Regular','psName':'MareBadgeDigits-Regular','version':'Version 1.0','copyright':'Original bitmap digit patterns for Mare Partida.'})
    fb.setupOS2(sTypoAscender=600,sTypoDescender=-100,usWinAscent=600,usWinDescent=100)
    fb.setupPost();fb.setupMaxp();fb.font.recalcTimestamp=False
    fb.font['head'].created=fb.font['head'].modified=2082844800
    output=Path(__file__).resolve().parents[1]/'assets/ui/notifications/pixel-digits.ttf'
    output.parent.mkdir(parents=True,exist_ok=True);fb.save(output)
if __name__=='__main__': main()
