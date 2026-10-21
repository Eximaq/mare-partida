"""Real art: one rigid weapon source, four original body poses, exact socket composition."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-rigid-weapon-20261021/'
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
COMPARE='''async ({url,canvas,sx=0,size=84})=>{
 const image=new Image();image.src=url;await image.decode();
 const c=document.createElement('canvas');c.width=c.height=84;
 c.getContext('2d').drawImage(image,sx,0,size,size,0,0,size,size);
 const a=c.getContext('2d').getImageData(0,0,84,84).data;
 const b=document.getElementById(canvas).getContext('2d').getImageData(0,0,84,84).data;
 for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))return false;
 return true;
}'''
with sync_playwright() as p:
 b=p.chromium.launch();context=b.new_context(viewport={'width':1366,'height':900})
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","rigid-review-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.clock.install();q.goto(BASE+REL+'preview.html',wait_until='networkidle')
 q.wait_for_function('window.__paperDollRigidInspection?.().ready')
 urls=set()
 for i,offset in enumerate([(10,13),(8,12),(10,13),(9,12)]):
  q.locator('#frame').fill(str(i));s=q.evaluate('__paperDollRigidInspection()')
  assert s['frameIndex']==i and not s['artworkApproved'] and s['newGenerations']==0
  assert s['audit']['body_pixel_changes']==0 and s['audit']['hand_contact_pixels']==7
  assert s['audit']['visible_weapon_pixels']==79
  weapon=next(l for l in s['layers'] if l['slot']=='weapon');urls.add(weapon['url'])
  assert weapon['kind']=='rigid-attachment'
  assert [weapon['sx'],weapon['sy'],weapon['width'],weapon['height']]==[0,0,64,64]
  assert (weapon['offsetX'],weapon['offsetY'])==offset
  assert q.evaluate(COMPARE,{'url':f'composite-{i+1:02}.png','canvas':'newCanvas'})
  assert q.evaluate(COMPARE,{'url':'body-idle-south.png','canvas':'bodyCanvas','sx':i*84})
  q.locator('#showWeapon').uncheck()
  assert q.evaluate(COMPARE,{'url':'body-idle-south.png','canvas':'newCanvas','sx':i*84})
  q.locator('#showWeapon').check()
 assert urls=={'rigid-weapon.png'},'must use one asset instead of four copied weapon images'
 # Use actual image alpha validation, not the Node test double.
 checks=q.evaluate('''async()=>{
  const data=await(await fetch('review.json')).json(),images=new Map();
  for(const url of ['body-idle-south.png','rigid-weapon.png']){const image=new Image();image.src=url;await image.decode();images.set(url,image)}
  const engine=MarePaperDoll.create({getImage:url=>images.get(url)});engine.registerRig(data.rig);data.pieces.forEach(p=>engine.registerPiece(p));
  const pose={animationId:'idle',direction:'south',frameIndex:0};
  const unapproved=engine.resolve(data.appearance,pose).missing.every(m=>m.code==='unapproved-piece');
  const missingDirection=!engine.resolve(data.appearance,{...pose,direction:'north'},{allowDraft:true}).valid;
  const candidate=structuredClone(data.pieces[1]);delete candidate.animations.idle.sockets.south[3];engine.registerPiece(candidate);
  const c=document.createElement('canvas');c.width=c.height=84;const ctx=c.getContext('2d');
  const atomic=!engine.draw(ctx,data.appearance,pose,42,65,{allowDraft:true})&&!ctx.getImageData(0,0,84,84).data.some(Boolean);
  const missingSocket=engine.resolve(data.appearance,pose,{allowDraft:true}).missing.some(m=>m.code==='missing-socket');
  engine.registerPiece(data.pieces[1]);const empty=document.createElement('canvas');empty.width=empty.height=64;
  const image=new Image();image.src=empty.toDataURL();await image.decode();images.set('rigid-weapon.png',image);
  const emptyRejected=engine.resolve(data.appearance,pose,{allowDraft:true}).missing.some(m=>m.code==='empty-frame');
  return {unapproved,missingDirection,atomic,missingSocket,emptyRejected};
 }''')
 assert all(checks.values()),checks
 q.locator('#frame').fill('0');q.locator('#play').click()
 for expected in [1,2,3,0]:
  q.clock.run_for(300);assert q.evaluate('__paperDollRigidInspection().frameIndex')==expected
 q.locator('#play').click();q.locator('#frame').fill('0')
 q.screenshot(path=str(OUT/'rigid-weapon-1366.png'),full_page=True)
 for i in range(4):
  q.locator('#frame').fill(str(i));q.locator('.boards').screenshot(path=str(OUT/f'rigid-weapon-frame-{i+1}.png'))
 q.locator('#guides').check();q.screenshot(path=str(OUT/'rigid-weapon-guides.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'rigid-weapon-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='rigid-review-sentinel'
 assert not errors,errors;b.close()
print('Rigid weapon browser passed: exact RGBA on4 real body frames, one79px source, integer sockets, toggles, empty/missing/unapproved fallback, loop, desktop/mobile and save preservation.')
