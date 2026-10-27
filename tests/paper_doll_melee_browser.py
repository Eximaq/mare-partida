"""Melee appearance must survive equipped fists, skill and hurt without swapping identity."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8126/dist/')
OUT=Path('docs/evidence-paper-doll/melee-continuity');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();q=b.new_page();q.goto(BASE,wait_until='networkidle')
 result=q.evaluate('''async base=>{
 const folder=new URL('pixellab-pip-generations/paper-doll-complete-20261026/',base),pack=await fetch(new URL('review-pack.json',folder)).then(r=>r.json());
 const r=MarePaperDollReview.create({search:'?paperDollReview=complete',devActive:true,baseURL:base,getImage:MareFactionSprites.image,fetch:async()=>({ok:true,json:async()=>structuredClone(pack)})});await r.ready;
 const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d'),failures=[],results=[];
 for(const [classId,def]of [['sword',0],['brawler',2],['brawler',3]])for(const factionId of ['pirate','marine','revolutionary','government'])for(const direction of ['south','north','west','east']){
  const player={devSandbox:true,classId,factionId,equipment:{weapon:{id:'kept',def,plus:3,level:5},coat:{id:'coat',def:6}}},before=JSON.stringify(player);
  for(const action of ['idle','walk','attack',...(classId==='sword'?['combat-idle','guard','hurt','skill']:[])])for(let frame=0;frame<8;frame++){
   ctx.clearRect(0,0,200,200);const ok=r.draw(ctx,player,action,direction,frame/12,100,160,2,frame/8,{locked:action!=='idle'&&action!=='walk',action,hitFrameRatio:5/12},true);
   if(!ok)failures.push({classId,def,factionId,direction,action,frame,reason:r.snapshot().lastReason});
  }
  if(JSON.stringify(player)!==before)throw Error('Rendering changed equipment');results.push({classId,def,factionId,direction});
 }
 return {failures,checked:results.length};
}''',BASE)
 (OUT/'render-matrix.json').write_text(json.dumps(result,indent=2));b.close()
 assert not result['failures'],{'total':len(result['failures']),'examples':result['failures'][:2],'sword':next((x for x in result['failures'] if x['classId']=='sword'),None),'brawler':next((x for x in result['failures'] if x['classId']=='brawler'),None)}
print('Melee continuity: 48 identities/directions, equipped fists, skill/hurt and equipment preservation passed.')
