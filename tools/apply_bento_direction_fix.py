"""Replace only one inspected row, preserving all other pixels and original files."""
import json,sys,shutil
from pathlib import Path
from PIL import Image,ImageDraw
from package_bento_combat import gif_exact
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/bento-direction-fixes-20261018';PROD=ROOT/'pixellab-pip-generations/bento-combat-production-20261018'
def apply(key,action,direction,impact_frame=None):
    audit=json.loads((RUN/f'{key}-verification.json').read_text());meta_path=ROOT/'assets/classes/pirate-sword/metadata.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    gameaction='skill' if action=='corte-de-mare' else action
    a=meta['animations'][gameaction];cw,ch=meta['frame_size'];row=meta['directions'].index(direction);count=a['frames']
    if impact_frame is not None:
        assert 0<=impact_frame<count
        a.setdefault('direction_impact_frames',{})[direction]=impact_frame
    assert audit['frames']==count
    sourcefiles=[RUN/name for name in audit['files']];frames=[Image.open(path).convert('RGBA') for path in sourcefiles]
    assert all(im.width<=cw and im.height<=ch for im in frames),'New frames require explicit larger-cell assembly.'
    target=ROOT/f'assets/classes/pirate-sword/{action}.png';sheet=Image.open(target).convert('RGBA');before=sheet.copy()
    backup=RUN/'before-replacement';backup.mkdir(exist_ok=True)
    backupfile=backup/(action+'.png')
    if not backupfile.exists():shutil.copyfile(target,backupfile)
    sheet.paste(Image.new('RGBA',(sheet.width,ch)),(0,row*ch));padded=[];placements=[]
    for i,im in enumerate(frames):
        dx=(cw-im.width)//2;dy=(ch-im.height)//2
        sheet.paste(im,(i*cw+dx,row*ch+dy));cell=sheet.crop((i*cw,row*ch,(i+1)*cw,(row+1)*ch));padded.append(cell)
        assert cell.crop((dx,dy,dx+im.width,dy+im.height)).tobytes()==im.tobytes()
        placements.append({'frame':i,'offset':[dx,dy],'source_size':im.size})
    for other in range(4):
        if other!=row:assert before.crop((0,other*ch,sheet.width,(other+1)*ch)).tobytes()==sheet.crop((0,other*ch,sheet.width,(other+1)*ch)).tobytes()
    sheet.save(target)
    a['valid_directions']=[d for d in meta['directions'] if d in a.get('valid_directions',meta['directions']) or d==direction]
    review_path=PROD/'visual-review.json';review=json.loads(review_path.read_text(encoding='utf-8'));review['rejected'].pop(action+'/'+direction,None)
    review['accepted_for_runtime_with_recorded_caveats']=[x for x in review['reviewed'] if x not in review['rejected']]
    review.setdefault('corrections',{})[action+'/'+direction]={'group_id':audit['group_id'],'source_directory':'../bento-direction-fixes-20261018','verified':'Full clip inspected; direction maintained and source pixels preserved.'}
    pending=list(review['rejected']);meta['integration_status']='direction_fixes_pending' if pending else 'all_requested_directions_integrated'
    review['integration']=str(20-len(pending))+' animated combinations; remaining rejected clips use the original static armed guard: '+', '.join(pending)
    review_path.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8');meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'combat-assets.js').write_text('MareFactionSprites.register('+json.dumps({'pirate-sword':meta},ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
    gifpath=PROD/f'{action}-{direction}-preview.gif'
    if gifpath.exists() and not (backup/gifpath.name).exists():shutil.copyfile(gifpath,backup/gifpath.name)
    gif=gif_exact(padded,gifpath,round(1000/a['fps']));assert gif['created']
    strip=Image.new('RGBA',(count*cw,ch))
    for i,im in enumerate(padded):strip.paste(im,(i*cw,0))
    strip.save(RUN/f'{key}-runtime-sheet.png');grid=strip.resize((strip.width*2,ch*2),Image.Resampling.NEAREST);draw=ImageDraw.Draw(grid)
    for x in range(cw*2,grid.width,cw*2):draw.line((x,0,x,grid.height),fill='#eeb953')
    grid.save(RUN/f'{key}-runtime-inspection-grid.png')
    mappingpath=PROD/'animation-files.json';mapping=json.loads(mappingpath.read_text());mapping[action][direction]=['../bento-direction-fixes-20261018/'+f.name for f in sourcefiles];mappingpath.write_text(json.dumps(mapping,indent=2),encoding='utf-8')
    (RUN/f'{key}-integration.json').write_text(json.dumps({'action':action,'direction':direction,'frames':count,'other_rows_identical':True,'original_pixels_preserved':True,'fixed_canvas_anchor':meta['anchor'],'placements':placements,'gif':gif},indent=2),encoding='utf-8')
    (ROOT/'game.js').touch();print(key+': row integrated, all other rows byte-identical, original clip preserved.')
if __name__=='__main__':apply(sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]) if len(sys.argv)>4 else None)
