'use strict';
const assert=require('node:assert/strict');const {chromium}=require('playwright');
const origin=process.argv.find(v=>/^https?:\/\//.test(v))||'http://127.0.0.1:8154/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{const page=await browser.newPage();await page.goto(new URL('tools/paper-doll-96-v3/',origin).href);await page.waitForFunction(()=>window.__review96v3);const audit=await page.evaluate(async()=>{
 const q=__review96v3,cache=new Map(),count={materials:0,sourceFrames:0,composites:0},failures=[];
 const pixels=async(f,w=128,h=128,frame=0)=>{const key=[f,w,h,frame].join(':');if(cache.has(key))return cache.get(key);const img=await q.image(f),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,frame*w,0,w,h,0,0,w,h);const p=c.getContext('2d').getImageData(0,0,w,h).data;cache.set(key,p);return p;};
 const compare=(east,west,w,h,context)=>{let bad=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=w-x,a=(y*w+x)*4,b=(y*w+sx)*4;for(let c=0;c<4;c++)if(west[a+c]!== (sx<w?east[b+c]:0))bad++;}if(bad)failures.push({...context,pixels:bad});};
 for(const body of Object.keys(q.manifest.bodies)){
  const maps=[...q.catalog.styles.map(s=>({id:s.id,map:s.layers})),...['originalHeads','originalHairs','originalHands','fitBases'].map(k=>({id:k,map:q.catalog[k]}))];
  for(const {id,map}of maps){compare(await pixels(map[body].east),await pixels(map[body].west),128,128,{body,id,kind:'material'});count.materials++;}
  const b=q.manifest.bodies[body];const frames=[{action:'static',frames:1,east:{layers:b.layers.east},west:{layers:b.layers.west}}];
  for(const[action,d]of Object.entries(b.clips))if(action!=='attack-tech')frames.push({action,frames:d.east.frames,east:d.east,west:d.west});
  for(const clip of frames){const w=clip.east.frame?.width||128,h=clip.east.frame?.height||128;
   for(let fi=0;fi<clip.frames;fi++){
    for(const[slot,f]of Object.entries(clip.east.layers)){compare(await pixels(f,w,h,fi),await pixels(clip.west.layers[slot],w,h,fi),w,h,{body,action:clip.action,fi,slot,kind:'source'});count.sourceFrames++;}
    const looks=[{},...q.catalog.styles.map(s=>({[s.kind]:s.id,hairColor:'brown'})),{hair:'hair-wavy',face:'face-gentle',skin:'dark',hairColor:'silver',pants:'item-22',boots:'item-8',gloves:'item-25',cloak:'item-24',head:'item-18'},{hair:'hair-braided',face:'face-calm',skin:'porcelain',hairColor:'pink',pants:'item-21',boots:'item-9',gloves:'item-26',cloak:'item-23',head:'item-19'}];
    for(let k=0;k<looks.length;k++){const a=await q.render(body,clip.action,'east',fi,[],looks[k]),b=await q.render(body,clip.action,'west',fi,[],looks[k]);compare(a.getContext('2d').getImageData(0,0,w,h).data,b.getContext('2d').getImageData(0,0,w,h).data,w,h,{body,action:clip.action,fi,look:k,kind:'composite'});count.composites++;}
   }
  }
 }
 return {revision:q.manifest.visualRevision,count,failures:failures.slice(0,12),failureCount:failures.length,storage:localStorage.length};
});console.log(JSON.stringify(audit));assert.equal(audit.failureCount,0,JSON.stringify(audit.failures));assert.equal(audit.count.composites,3074);assert.equal(audit.storage,0);}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
