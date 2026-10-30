'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const origin=process.argv.find(v=>/^https?:\/\//.test(v))||'http://127.0.0.1:8154/';
const evidence=process.argv.find(v=>v.startsWith('--evidence='))?.slice(11);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('tools/paper-doll-96-v3/?revision=torso-profile-audit',origin).href);
  await page.waitForFunction(()=>window.__review96v3);
  const result=await page.evaluate(async()=>{
   const q=__review96v3,api=MareAppearance96,issues=[],counts={poses:0,torsoFrames:0,skinCases:0,helmetCases:0,headwearMatrices:0,visibleArmPixels:0},metrics={bakedMismatch:0,torsoOutsideBody:0,torsoOverNativeArm:0,visibleArmChanged:0,skinMismatch:0,hairUnderHelmet:0,bakedFlesh:0};
   const cache=new Map(),pixels=async(file,size=128,frame=0)=>{const key=[file,size,frame].join(':');if(cache.has(key))return cache.get(key);const im=await q.image(file),c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(im,frame*size,0,size,size,0,0,size,size);const d=c.getContext('2d').getImageData(0,0,size,size).data;cache.set(key,d);return d;};
   const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const different=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;};
   const overlay=(to,from)=>{for(let i=0;i<to.length;i+=4)if(from[i+3])to.set(from.subarray(i,i+4),i);};
   const mirrored=(src,size)=>{const out=new Uint8ClampedArray(src.length);for(let y=0;y<size;y++)for(let x=1;x<size;x++)out.set(src.subarray((y*size+x)*4,(y*size+x+1)*4),(y*size+size-x)*4);return out;};
   const atlasPixels=async(atlas,dir,f)=>{const im=await q.image(atlas.file),n=atlas.directions.indexOf(dir)*atlas.framesPerDirection+f,c=document.createElement('canvas');c.width=c.height=atlas.cell;c.getContext('2d').drawImage(im,n%atlas.columns*atlas.cell,Math.floor(n/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,atlas.cell,atlas.cell);return read(c);};
   for(const style of q.catalog.styles.filter(s=>s.kind==='head'))for(const body of Object.keys(q.manifest.bodies))for(const dir of q.manifest.directions){
    const d=await pixels(style.layers[body][dir]);for(let i=0;i<d.length;i+=4)if(d[i+3]&&d[i]>90&&d[i]>d[i+1]*1.12&&d[i]>d[i+2]*1.25)metrics.bakedFlesh++;
    counts.headwearMatrices++;
   }
   for(const [body,b]of Object.entries(q.manifest.bodies))for(const dir of q.manifest.directions){
    const head=await pixels(q.catalog.originalHeads[body][dir]);
    for(const skin of Object.keys(api.skins))for(const headId of ['original','item-18','item-19']){
     const look={skin,hair:'none',face:'none',head:headId},actual=read(await q.render(body,'static',dir,0,[],look));
     const expected=api.recolor(head,api.materialMask(head,'headSkin'),api.skins[skin].ramp),style=q.catalog.styles.find(s=>s.id===headId),hat=style?await pixels(style.layers[body][dir]):null;
     for(let i=0;i<head.length;i+=4)if(head[i+3]&&!hat?.[i+3]&&[0,1,2,3].some(k=>actual[i+k]!==expected[i+k]))metrics.skinMismatch++;
     counts.skinCases++;
    }
    const actions=[{action:'static',frames:1},...Object.entries(b.clips).filter(([a])=>a!=='attack-tech').map(([action,dirs])=>({action,frames:dirs[dir].frames}))];
    for(const {action,frames}of actions)for(let f=0;f<frames;f++){
     const selected=q.selection(body,action,dir),size=selected.clip?.frame?.width||128,pad=(size-128)/2,rig=q.appearanceRigs.clips[body]?.[action]?.[dir],rest=rig?.rest||q.appearanceRigs.rests[body][dir],pose=rig?.poses[f]||rest;
     const neutral=new Uint8ClampedArray(size*size*4),primary=new Uint8ClampedArray(neutral.length),hand=new Uint8ClampedArray(neutral.length);
     for(const slot of ['body','underArms','foreground'])if(selected.layers[slot]){const data=await pixels(selected.layers[slot],size,f);overlay(neutral,data);if(slot==='body')overlay(primary,data);else overlay(hand,data);}
     const joints=MareTorso96.geometry(pose).j,armBones=['LEFT','RIGHT'].flatMap(side=>[[' SHOULDER',' ELBOW'],[' ELBOW',' ARM']].map(([a,b])=>({axis:MareSurface96.axis(joints[side+a],joints[side+b]),z:joints[side+b].z})));
     const frontAt=i=>{const x=i/4%size-pad,y=Math.floor(i/4/size)-pad;let best=null;for(const bone of armBones){const p=bone.axis.at(x,y),d=Math.hypot(p.across,p.along-Math.max(0,Math.min(bone.axis.length,p.along)));if(!best||d<best.d)best={d,z:bone.z};}return best.z>=joints.NECK.z;};
     const baseLook={skin:'original',hair:'none',face:'none'},baseline=read(await q.render(body,action,dir,f,[],baseLook));
     for(const style of q.catalog.styles.filter(s=>s.kind==='torso')){
      const source=await pixels(style.layers[body][dir]),atlas=style.animations?.[body]?.[action];
      let expected=MareTorso96.fit(source,primary,rest,pose,pad,size,size,hand).full;
      if(dir==='west'){
       const east=q.selection(body,action,'east'),er=q.appearanceRigs.clips[body]?.[action]?.east,erest=er?.rest||q.appearanceRigs.rests[body].east,epose=er?.poses[f]||erest,en=new Uint8ClampedArray(neutral.length),eh=new Uint8ClampedArray(neutral.length);
       for(const slot of ['body','underArms','foreground'])if(east.layers[slot]){const data=await pixels(east.layers[slot],size,f);if(slot==='body')overlay(en,data);else overlay(eh,data);}
       expected=mirrored(MareTorso96.fit(await pixels(style.layers[body].east),en,erest,epose,pad,size,size,eh).full,size);
      }
      const baked=atlas?await atlasPixels(atlas,dir,f):expected;
      metrics.bakedMismatch+=different(expected,baked);
      const composite=read(await q.render(body,action,dir,f,[],{...baseLook,torso:style.id}));
      let visible=0;
      for(let i=0;i<baked.length;i+=4){
       if(baked[i+3]&&!primary[i+3])metrics.torsoOutsideBody++;
       const skin=hand[i+3]&&hand[i]>65&&hand[i]>hand[i+2]*1.25&&hand[i+1]/hand[i]>.3&&hand[i+1]/hand[i]<.93&&frontAt(i);
       if(skin&&baked[i+3])metrics.torsoOverNativeArm++;
       if(skin&&[0,1,2,3].every(k=>baseline[i+k]===hand[i+k])){visible++;if([0,1,2,3].some(k=>composite[i+k]!==baseline[i+k]))metrics.visibleArmChanged++;}
      }
      counts.visibleArmPixels+=visible;counts.torsoFrames++;
     }
     const hatLook={hair:'hair-long',head:'item-19',skin:'dark',face:'face-gentle',torso:'item-6'};
     metrics.hairUnderHelmet+=different(read(await q.render(body,action,dir,f,[],hatLook)),read(await q.render(body,action,dir,f,[],{...hatLook,hair:'none'})));
     counts.helmetCases++;counts.poses++;
    }
   }
   for(const [key,n]of Object.entries(metrics))if(n)issues.push({key,n});
   return {revision:q.manifest.visualRevision,counts,metrics,issues,storage:localStorage.length};
  });
  console.log(JSON.stringify(result));
  if(evidence){await fs.mkdir(evidence,{recursive:true});await fs.writeFile(evidence+'/torso-audit.json',JSON.stringify(result,null,2));}
  assert.equal(result.counts.poses,424);assert.equal(result.counts.torsoFrames,848);assert.equal(result.counts.skinCases,192);assert.equal(result.counts.helmetCases,424);assert.equal(result.counts.headwearMatrices,16);assert.ok(result.counts.visibleArmPixels>1000);
  assert.deepEqual(result.issues,[]);assert.equal(result.storage,0);assert.deepEqual(errors,[]);
  await page.selectOption('#look-torso','item-6');await page.selectOption('#body','feminino');await page.selectOption('#direction','west');await page.selectOption('#action','attack-firearm');
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('8 frames'));
  await page.selectOption('#look-torso','item-7');await page.selectOption('#look-torso','original');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
