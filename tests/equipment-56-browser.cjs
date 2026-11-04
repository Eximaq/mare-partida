'use strict';
// Run against a local preview. Evidence is optional and stays outside production.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.EQUIPMENT56_URL||'http://127.0.0.1:8176')+'/tools/paper-doll-96-v3/');await page.waitForFunction(()=>window.__review96v3);
 const report=await page.evaluate(async()=>{
  const q=__review96v3,bodies=['masculino','feminino'],dirs=['south','north','east','west'],actions=['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'];
  const counts={fullFrames:0,isolatedFrames:0,mixedFrames:0,headgearChecks:0},skins=Object.keys(MareAppearance96.skins),leaks=[];
  const baseline={hair:'hair-wavy',hairColor:'purple',face:'face-calm',skin:'light',head:'original',torso:'original',gloves:'original',pants:'original',boots:'original',cloak:'original',weapon:'weapon-0'};
  const outfit=set=>{const n=129+set*7;return {...baseline,head:'item-'+n,torso:'item-'+(n+1),gloves:'item-'+(n+2),pants:'item-'+(n+4),boots:'item-'+(n+5)};};
  const weapon=a=>a==='attack-unarmed'?'weapon-109':a==='attack-firearm'?'weapon-113':a==='attack-daggers'?'weapon-12':a==='attack-focus'?'weapon-124':a==='attack-tech'?'weapon-117':'weapon-0';
  const valid=c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;if(n<300)throw Error('Empty avatar');};
  for(let set=0;set<8;set++)for(const body of bodies)for(const dir of dirs)for(const action of actions){const frames=action==='idle'?4:8;for(let f=0;f<frames;f++){valid(await q.render(body,action,dir,f,[],{...outfit(set),weapon:weapon(action)}));counts.fullFrames++;}}
  for(const s of q.catalog.styles.filter(s=>s.nativeFit==='registered-panels-v1'))for(const body of bodies)for(const dir of dirs)for(const [action,frame]of [['idle',0],['walk',3],['attack-sword',3]]){valid(await q.render(body,action,dir,frame,[],{...baseline,[s.kind]:s.id}));counts.isolatedFrames++;}
  for(let set=0;set<8;set++)for(const body of bodies)for(const dir of dirs)for(const [action,frame]of [['idle',0],['walk',3],['attack-focus',3]]){const look=outfit(set);look.gloves=outfit((set+1)%8).gloves;look.boots=outfit((set+3)%8).boots;look.pants=outfit((set+5)%8).pants;look.weapon=weapon(action);valid(await q.render(body,action,dir,frame,[],look));counts.mixedFrames++;}
  for(let set=0;set<8;set++)for(const body of bodies)for(const dir of dirs){const look=outfit(set),hidden=await q.render(body,'idle',dir,0,[],{...look,hideHeadgear:true}),bare=await q.render(body,'idle',dir,0,[],{...look,head:'original'});if(hidden.toDataURL()!==bare.toDataURL())throw Error('Hair not restored '+set+'/'+body+'/'+dir);counts.headgearChecks++;}
  // A closed boot cannot borrow the selected skin colour below the ankle.
  for(let set=0;set<8;set++){if([1,5].includes(set))continue;for(const body of bodies)for(const dir of dirs)for(const [action,f]of [['idle',0],['walk',3],['attack-sword',3]]){
   const look=outfit(set),a=await q.render(body,action,dir,f,[],look),b=await q.render(body,action,dir,f,[],{...look,skin:skins.at(-1)}),aa=a.getContext('2d').getImageData(0,0,a.width,a.height).data,bb=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
   const pose=q.appearanceRigs.clips[body][action][dir].poses[f],pad=(a.width-128)/2,feet=['LEFT','RIGHT'].map(side=>{const knee=pose.find(j=>j.label===side+' KNEE'),ankle=pose.find(j=>j.label===side+' LEG');return {a:{x:knee.x*128+pad,y:knee.y*128+pad},b:{x:ankle.x*128+pad,y:ankle.y*128+pad}};});let n=0;
   for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){if(!feet.some(({a,b})=>{const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),along=((x-a.x)*dx+(y-a.y)*dy)/len,across=Math.abs((x-a.x)*dy-(y-a.y)*dx)/len;return along>=len-1&&along<len+17&&across<=9;}))continue;const i=(y*a.width+x)*4;if(aa[i+3]&&[0,1,2].some(k=>aa[i+k]!==bb[i+k]))n++;}
   if(n)leaks.push({set,body,dir,action,frame:f,pixels:n});
  }}
  const gloveLeaks=[];
  for(let set=0;set<8;set++)for(const body of bodies)for(const dir of dirs)for(const [action,f]of [['idle',0],['walk',3],['attack-sword',3]]){
   const look=outfit(set),a=await q.render(body,action,dir,f,[],look),b=await q.render(body,action,dir,f,[],{...look,skin:skins.at(-1)}),aa=a.getContext('2d').getImageData(0,0,a.width,a.height).data,bb=b.getContext('2d').getImageData(0,0,b.width,b.height).data,pose=q.appearanceRigs.clips[body][action][dir].poses[f],pad=(a.width-128)/2;
   const atlas=q.catalog.nativeOwnership.atlases[body][action],index=atlas.directions.indexOf(dir)*atlas.framesPerDirection+f,mask=document.createElement('canvas');mask.width=mask.height=a.width;mask.getContext('2d').drawImage(await q.image(atlas.file),index%atlas.columns*atlas.cell,Math.floor(index/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,a.width,a.height);const ownership=mask.getContext('2d').getImageData(0,0,a.width,a.height).data;
   const hands=['LEFT','RIGHT'].map(side=>{const e=pose.find(j=>j.label===side+' ELBOW'),w=pose.find(j=>j.label===side+' ARM');return {a:{x:e.x*128+pad,y:e.y*128+pad},b:{x:w.x*128+pad,y:w.y*128+pad}};});let n=0;
   for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){if(ownership[(y*a.width+x)*4+1]<128||!hands.some(({a,b})=>{const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),along=((x-a.x)*dx+(y-a.y)*dy)/len;return along>len&&Math.hypot(x-b.x,y-b.y)<4.5;}))continue;const i=(y*a.width+x)*4;if(aa[i+3]&&[0,1,2].some(k=>aa[i+k]!==bb[i+k]))n++;}if(n)gloveLeaks.push({set,body,dir,action,frame:f,pixels:n});
  }
  return {counts,closedBootSkinLeaks:leaks,closedGloveSkinLeaks:gloveLeaks};
 });
 const oceanic=await require('./oceanic_sleeves_browser.cjs')(p);assert.deepEqual(oceanic.issues,[],'oceanic sleeves must cover native arm cores and retain no floating cloth');console.log(JSON.stringify({oceanic}));
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report));if(process.env.EQUIPMENT56_REPORT)await fs.writeFile(process.env.EQUIPMENT56_REPORT,JSON.stringify(report,null,2));assert.deepEqual(report.closedBootSkinLeaks,[]);assert.deepEqual(report.closedGloveSkinLeaks,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
