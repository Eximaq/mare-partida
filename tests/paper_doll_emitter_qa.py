"""Independent source-pixel/Canvas check; markers exist only in test image copies."""
import os,json,base64
from pathlib import Path
JS=r"""async ({base})=>{
 const folder=new URL('pixellab-pip-generations/paper-doll-complete-20261026/',base),raw=await fetch(new URL('review-pack.json',folder)).then(r=>r.json());
 const cases=[['firearm','gunner',4,[[31,19],[32,6],[4,21],[60,20]]],['tech','cyborg',14,[[23,15],[45,14],[12,25],[43,26]]],['compass','strategist',16,[[45,19],[46,16],[16,18],[44,23]]],['staff','healer',31,[[19,17],[46,11],[13,13],[43,12]]]],directions=['south','north','west','east'],images=new Map();
 const image=async url=>{const i=new Image();i.src=url;await i.decode();return i;};
 for(const [kind,,,points]of cases){const piece=raw.pieces.find(p=>p.id==='complete-'+kind),clip=piece.animations[Object.keys(piece.animations).find(k=>k.startsWith('attack-'))];
  for(let d=0;d<4;d++){const source=clip.sources[directions[d]],url=new URL(source.url,folder).href,i=await image(url),c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);const [px,py]=points[d];if(!x.getImageData(px,py,1,1).data[3])throw Error('Reference emitter is transparent: '+kind+'/'+directions[d]);x.fillStyle='#ff00ff';x.fillRect(px,py,1,1);images.set(url,await image(c.toDataURL()));}
 }
 const getImage=url=>images.get(String(url))||MareFactionSprites.image(String(url)),rows=[],sheet=document.createElement('canvas');sheet.width=640;sheet.height=640;const sc=sheet.getContext('2d');sc.fillStyle='#203333';sc.fillRect(0,0,640,640);
 for(let turn=0;turn<4;turn++){
  const pack=structuredClone(raw);for(const p of pack.pieces.filter(p=>p.slot==='weapon'))for(const [id,a]of Object.entries(p.animations))if(id.startsWith('attack-')&&a.kind==='rigid-attachment')for(const d of directions)a.sockets[d][3].quarterTurns=turn;
  const probe=MarePaperDollReview.create({search:'?paperDollReview=complete',devActive:true,baseURL:base,getImage,fetch:async()=>({ok:true,json:async()=>structuredClone(pack)})});const ready=await probe.ready;if(ready.state!=='ready')throw Error(ready.message);
  const runtime=MarePaperDollCatalog.createRuntime({getImage});runtime.registerRig(pack.rig);
  for(const original of pack.pieces){const p=structuredClone(original);for(const a of Object.values(p.animations)){a.url=new URL(a.url,folder).href;for(const source of Object.values(a.sources||{}))source.url=new URL(source.url,folder).href;}runtime.registerPiece(p);}
  for(let k=0;k<cases.length;k++){const [kind,classId,def]=cases[k],player={devSandbox:true,classId,factionId:'pirate',equipment:{weapon:{id:'fixture',def}}},config=MarePaperDollReview.appearance(pack,player),category=MarePaperDollCatalog.classes[classId].category;
   for(let d=0;d<4;d++)for(const outer of [1,1.35,2]){
    const direction=directions[d],canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const c=canvas.getContext('2d'),actor={x:240.25,y:400.75},timing={locked:true,direction,progress:.5,hitFrameRatio:.5,simulationTime:10},pose=runtime.sample(pack.rig.id,'attack-'+category,direction,0,{progress:3/8});
    c.imageSmoothingEnabled=false;if(outer!==1){c.save();c.translate(actor.x,actor.y);c.scale(outer,outer);runtime.draw(c,config,pose,0,0,{hidden:['body','hair','outfit'],allowDraft:true});c.restore();}else runtime.draw(c,config,pose,actor.x,actor.y,{hidden:['body','hair','outfit'],allowDraft:true});
    const origin=probe.projectileOrigin(player,actor,timing,outer),pixels=c.getImageData(0,0,640,640).data,marked=[];
    for(let y=0;y<640;y++)for(let x=0;x<640;x++){const i=(y*640+x)*4;if(pixels[i]>220&&pixels[i+1]<30&&pixels[i+2]>220&&pixels[i+3]>80)marked.push([x,y]);}
    const matched=origin&&marked.some(([x,y])=>origin.x>=x-.01&&origin.x<=x+1.01&&origin.y>=y-.01&&origin.y<=y+1.01);
    rows.push({kind,direction,turn,outer,origin,marked,matched});
    if(turn===0&&outer===1.35){const x=d*160,y=k*160;sc.imageSmoothingEnabled=false;sc.drawImage(canvas,actor.x-100,actor.y-100,200,200,x,y,160,160);if(origin){sc.strokeStyle=matched?'#76ff90':'#ff5252';sc.beginPath();sc.moveTo(x+(origin.x-actor.x+100)*.8-5,y+(origin.y-actor.y+100)*.8);sc.lineTo(x+(origin.x-actor.x+100)*.8+5,y+(origin.y-actor.y+100)*.8);sc.stroke();}}
    probe.cancelVisual?.();
   }
  }
 }
 return {rows,image:sheet.toDataURL()};
}"""
def verify_emitters(page,base,out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True);result=page.evaluate(JS,{'base':base})
 (out/'emitter-geometry.png').write_bytes(base64.b64decode(result.pop('image').split(',')[1]));(out/'emitter-geometry.json').write_text(json.dumps(result,indent=2))
 failures=[r for r in result['rows'] if not r['matched']]
 assert not failures,failures[:5]
 print('Independent emitter geometry: 4 weapons x 4 directions x 4 rotations x 3 scales passed (source-pixel markers, not lastRelease).')
GROUND_JS=r"""async ({base})=>{
 const folder=new URL('pixellab-pip-generations/paper-doll-complete-20261026/',base),pack=await fetch(new URL('review-pack.json',folder)).then(r=>r.json()),images=new Map();
 for(const piece of pack.pieces)for(const a of Object.values(piece.animations)){a.url=new URL(a.url,folder).href;for(const source of Object.values(a.sources||{}))source.url=new URL(source.url,folder).href;}
 const urls=new Set(pack.pieces.flatMap(p=>Object.values(p.animations).flatMap(a=>[a.url,...Object.values(a.sources||{}).map(s=>s.url)])));
 await Promise.all([...urls].map(async url=>{const i=new Image();i.src=url;await i.decode();images.set(url,i);}));
 const runtime=MarePaperDollCatalog.createRuntime({getImage:u=>images.get(u)});runtime.registerRig(pack.rig);for(const piece of pack.pieces)runtime.registerPiece(piece);
 const rows=[],canvas=document.createElement('canvas');canvas.width=168;canvas.height=168;const c=canvas.getContext('2d');
 for(const direction of ['south','north','west','east'])for(let frame=0;frame<8;frame++){
  c.clearRect(0,0,168,168);runtime.draw(c,pack.appearance,{animationId:'walk',direction,frameIndex:frame},84,100,{scale:1,hidden:['hair','outfit','weapon'],allowDraft:true});
  const data=c.getImageData(0,0,168,168).data;let bottom=0;for(let y=0;y<168;y++)for(let x=0;x<168;x++)if(data[(y*168+x)*4+3])bottom=Math.max(bottom,y+1);rows.push({direction,frame,bottom});
 }
 return rows;
}"""
def verify_grounding(page,base,out):
 rows=page.evaluate(GROUND_JS,{'base':base});Path(out).mkdir(parents=True,exist_ok=True);(Path(out)/'grounding.json').write_text(json.dumps(rows,indent=2));assert all(r['bottom']==100 for r in rows),[r for r in rows if r['bottom']!=100]
 print('Shared walk grounding: all 32 body poses end at the same native foot plane.')
LIFECYCLE_JS=r"""async ({base})=>{
 const folder=new URL('pixellab-pip-generations/paper-doll-complete-20261026/',base),pack=await fetch(new URL('review-pack.json',folder)).then(r=>r.json());
 const probe=MarePaperDollReview.create({search:'?paperDollReview=complete',devActive:true,baseURL:base,getImage:MareFactionSprites.image,fetch:async()=>({ok:true,json:async()=>structuredClone(pack)})});
 if((await probe.ready).state!=='ready')throw Error(probe.snapshot().message);
 const player={devSandbox:true,classId:'gunner',factionId:'pirate',equipment:{weapon:{id:'qa',def:4}}},actor={x:100,y:180},c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d'),checks=[];
 const ok=(name,v)=>{if(!v)throw Error(name);checks.push(name);},queue=()=>probe.projectileOrigin(player,actor,{locked:true,direction:'east',progress:.7,hitFrameRatio:.5,simulationTime:10,token:{}});
 let e=queue();ok('pending release is held',probe.holdProjectile(e.releaseId));probe.prepareFrame(player,actor,10);probe.draw(ctx,player,'idle','east',0,100,180,1,null,null,true);ok('late draw still shows emission pose',probe.snapshot().lastPose.frameIndex===3);probe.finishFrame();ok('presentation releases projectile',!probe.holdProjectile(e.releaseId));
 probe.synchronize(player,10.1);ok('new tick invalidates pose and release',!probe.snapshot().lastPose&&!probe.snapshot().lastRelease);
 e=queue();probe.cancelVisual();ok('cancellation clears visual queue',!probe.holdProjectile(e.releaseId)&&probe.snapshot().presentation.pending===0);
 e=queue();player.equipment.boots={id:'kept',def:8};const before=JSON.stringify(player);probe.synchronize(player,10);probe.prepareFrame(player,actor,10);ok('equipment change cancels stale release',probe.snapshot().presentation.pending===0);ok('unsupported gear falls back without stripping it',!probe.draw(ctx,player,'walk','east',0,100,180,1,null,null,true)&&JSON.stringify(player)===before);delete player.equipment.boots;
 e=queue();player.zoanTransformed=true;probe.synchronize(player,10);ok('Zoan cancels human release and uses legacy',!probe.holdProjectile(e.releaseId)&&!probe.draw(ctx,player,'attack','east',0,100,180,1,.5,null,true));player.zoanTransformed=false;
 e=queue();probe.setSuspended(true);ok('hidden tab clears pending shot',probe.snapshot().presentation.pending===0);e=queue();ok('offline catch-up cannot enqueue a stale presentation',!e.releaseId);probe.setSuspended(false);probe.prepareFrame(player,actor,11);ok('resume has no stale release or pose',!probe.snapshot().lastRelease&&!probe.snapshot().lastPose);
 e=queue();player.classId='cyborg';player.equipment.weapon.def=14;probe.synchronize(player,12);ok('class switch invalidates pending shot',probe.snapshot().presentation.pending===0);
 return checks;
}"""
def verify_lifecycle(page,base,out):
 checks=page.evaluate(LIFECYCLE_JS,{'base':base});Path(out).mkdir(parents=True,exist_ok=True);(Path(out)/'lifecycle.json').write_text(json.dumps(checks,indent=2));print('Visual release lifecycle:',len(checks),'checks passed.')
if __name__=='__main__':
 from playwright.sync_api import sync_playwright
 base=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8148/dist/');out=os.environ.get('MARE_EVIDENCE_ROOT','docs/evidence-paper-doll/refinement/geometry')
 with sync_playwright() as p:
  b=p.chromium.launch();q=b.new_page();q.goto(base,wait_until='networkidle');verify_emitters(q,base,out);verify_grounding(q,base,out);verify_lifecycle(q,base,out);b.close()
