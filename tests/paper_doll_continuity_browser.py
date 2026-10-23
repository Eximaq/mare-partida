"""Inspect actual Canvas transitions without changing sprites, gameplay or saves."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();q=browser.new_page(viewport={'width':1366,'height':900})
 errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.add_init_script('localStorage.setItem("mare-partida-save-v1","sequence-sentinel")')
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=bento-east-fit',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 state=lambda:q.evaluate('__paperDollInspector.state()')
 # A non-looping attack ends at its final pose; Play restarts it explicitly.
 q.locator('#play').click()
 q.wait_for_function('__paperDollInspector.state().playback.finished')
 assert state()['pose']['frameIndex']==7 and not state()['playback']['playing']
 q.wait_for_timeout(300);assert state()['pose']['frameIndex']==7
 q.locator('#play').click();q.wait_for_function('__paperDollInspector.state().pose.frameIndex<7')
 q.wait_for_function('__paperDollInspector.state().playback.finished')
 # Real frame scheduling records every stage and all four views.
 q.evaluate('''window.stageRecords=[];window.sample=()=>{const s=__paperDollInspector.state();if(s.playback.sequenceIndex>=0)stageRecords.push({step:s.playback.sequenceIndex,frame:s.pose.frameIndex,action:s.pose.animationId,mode:s.mode,directions:s.readyDirections});window.sampleId=requestAnimationFrame(sample)};sample()''')
 q.locator('#playbackMode').select_option('sequence');q.locator('#play').click()
 q.wait_for_function('__paperDollInspector.state().playback.finished',timeout=15000)
 records=q.evaluate('cancelAnimationFrame(sampleId);stageRecords')
 assert sorted(set(r['step'] for r in records))==[0,1,2,3]
 for step,action in enumerate(['idle','walk','attack-sword','idle']):
  stage=[r for r in records if r['step']==step]
  assert stage and all(r['action']==action for r in stage)
  if step==2:assert all(r['mode']=='draft' and len(r['directions'])==4 for r in stage)
  else:assert all(r['mode']=='fallback' and not r['directions'] for r in stage)
 assert state()['playback']['sequenceIndex']==3 and not state()['playback']['playing']
 q.screenshot(path=str(OUT/'continuity-1366.png'),full_page=True)
 # Pausing freezes the current pose; a manual selection cancels the sequence.
 q.locator('#play').click();q.wait_for_timeout(200);q.locator('#play').click()
 frozen=state()['pose'];q.wait_for_timeout(300);assert state()['pose']==frozen
 q.locator('#animation').select_option('attack');assert state()['playback']['sequenceIndex']==-1
 q.locator('#playbackMode').select_option('single');q.locator('#animation').select_option('walk')
 q.locator('#play').click();q.wait_for_timeout(1800)
 assert state()['playback']['playing'] and not state()['playback']['finished']
 q.locator('#play').click()
 # Mobile retains real controls and has no horizontal document overflow.
 q.set_viewport_size({'width':393,'height':852})
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'continuity-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='sequence-sentinel'
 assert not errors,errors
 browser.close()
print('Continuity: one-shot attack, explicit replay, four-stage playback in four views, missing-art fallback, pause, cancel, looping walk, mobile and save passed.')
