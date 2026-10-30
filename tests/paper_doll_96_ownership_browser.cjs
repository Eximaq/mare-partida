'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{chromium}=require('playwright');
const origin=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8156/',evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const sample=process.argv.includes('--sample');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('tools/paper-doll-96-v3/?revision=ownership-audit',origin).href);await page.waitForFunction(()=>window.__review96v3);
 const result=await page.evaluate(async(sample)=>{
  const q=__review96v3,issues=[],counts={poses:0,kits:0,palmPixels:0,forearmPixels:0,shoulderPixels:0,underwearPixels:0},metrics={handChanged:0,forearmChanged:0,shoulderUncovered:0,underwearUncovered:0,fullGloveBare:0},examples=[];
  const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const pixels=async(file,size,f)=>{const im=await q.image(file),c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(im,f*size,0,size,size,0,0,size,size);return read(c);};
  const skin=(r,g,b)=>r>65&&r>b*1.28&&g/r>.33&&g/r<.9;
  const note=(key,n,where)=>{metrics[key]+=n;if(n&&examples.length<1000)examples.push({key,n,...where});};
  for(const [body,b]of Object.entries(q.manifest.bodies))for(const action of ['static',...Object.keys(b.clips).filter(a=>a!=='attack-tech')])for(const dir of ['south','north','east']){
   const clip=b.clips[action]?.[dir],size=clip?.frame?.width||128,pad=(size-128)/2,layers=clip?.layers||b.layers[dir],rig=q.appearanceRigs.clips[body]?.[action]?.[dir];
   for(let f=0;f<(clip?.frames||1);f++){
    const native=await pixels(layers.body,size,f),pose=rig?.poses[f]||q.appearanceRigs.rests[body][dir],j=Object.fromEntries(pose.map(p=>[p.label,{x:p.x*128+pad,y:p.y*128+pad,z:p.z_index||0}])),hipY=(j['LEFT HIP'].y+j['RIGHT HIP'].y)/2;
    const palms=new Set(),forearms=new Set(),shoulders=new Set(),grey=[];
    for(const side of ['LEFT','RIGHT']){
     if(j[side+' ARM'].z>=j.NECK.z){const a=j[side+' ARM'];for(let y=Math.floor(a.y-2);y<=a.y+2;y++)for(let x=Math.floor(a.x-2);x<=a.x+2;x++){const p=y*size+x,i=p*4;if(x>=0&&y>=0&&x<size&&y<size&&Math.hypot(x-a.x,y-a.y)<=2&&native[i+3]&&skin(native[i],native[i+1],native[i+2]))palms.add(p);}}
     if(j[side+' ARM'].z>=j.NECK.z)for(const t of [.4,.65,.85]){const a=j[side+' ELBOW'],b=j[side+' ARM'],sx=a.x+(b.x-a.x)*t,sy=a.y+(b.y-a.y)*t;for(let y=Math.floor(sy-2);y<=sy+2;y++)for(let x=Math.floor(sx-2);x<=sx+2;x++){const p=y*size+x,i=p*4;if(x>=0&&y>=0&&x<size&&y<size&&Math.hypot(x-sx,y-sy)<=1.6&&native[i+3]&&skin(native[i],native[i+1],native[i+2]))forearms.add(p);}}
     const a=j[side+' SHOULDER'],e=j[side+' ELBOW'],sx=a.x+(e.x-a.x)*.18,sy=a.y+(e.y-a.y)*.18;
     for(let y=Math.floor(sy-1);y<=sy+1;y++)for(let x=Math.floor(sx-1);x<=sx+1;x++){const p=y*size+x,i=p*4;
      const crossed=['LEFT','RIGHT'].some(s=>j[s+' ARM'].z>=j.NECK.z&&(MareMotion96.distanceToSegment({x,y},j[s+' ELBOW'],j[s+' ARM'])<4.2||Math.hypot(x-j[s+' ARM'].x,y-j[s+' ARM'].y)<6.3));
      if(!crossed&&x>=0&&y>=0&&x<size&&y<size&&Math.hypot(x-sx,y-sy)<=1.3&&native[i+3]&&skin(native[i],native[i+1],native[i+2]))shoulders.add(p);}
    }
    for(let y=Math.max(0,Math.floor(j.NECK.y-7));y<=Math.min(size-1,hipY+15);y++)for(let x=0;x<size;x++){const p=y*size+x,i=p*4,r=native[i],g=native[i+1],bb=native[i+2];if(native[i+3]&&r>=120&&Math.max(r,g,bb)-Math.min(r,g,bb)<=10)grey.push(p);}
    for(const skinId of sample?['original']:['original','ebony']){
     const ramp=MareAppearance96.skins[skinId]?.ramp,expected=ramp?MareAppearance96.recolor(native,MareAppearance96.materialMask(native,'skin'),ramp):native;
     for(const torso of ['original','item-6','item-7'])for(const cloak of sample?['original']:['original','item-23','item-24']){
      const where={body,action,dir,f,skin:skinId,torso,cloak},look={skin:skinId,hair:'none',face:'none',torso,cloak},actual=read(await q.render(body,action,dir,f,[],look));let handBad=0,armBad=0,shoulderBad=0,greyBad=0;
      for(const p of palms){const i=p*4;counts.palmPixels++;if([0,1,2,3].some(k=>actual[i+k]!==expected[i+k]))handBad++;}
      for(const p of forearms){const i=p*4;counts.forearmPixels++;if([0,1,2,3].some(k=>actual[i+k]!==expected[i+k]))armBad++;}
      if(torso!=='original')for(const p of shoulders){const i=p*4;counts.shoulderPixels++;if([0,1,2].every(k=>actual[i+k]===expected[i+k]))shoulderBad++;}
      for(const p of grey){const i=p*4;counts.underwearPixels++;if([0,1,2].every(k=>actual[i+k]===native[i+k]))greyBad++;}
      note('handChanged',handBad,where);note('forearmChanged',armBad,where);note('shoulderUncovered',shoulderBad,where);note('underwearUncovered',greyBad,where);counts.kits++;
     }
     const full=read(await q.render(body,action,dir,f,[],{skin:skinId,hair:'hair-long',face:'face-gentle',torso:'item-7',cloak:'item-24',pants:'item-22',boots:'item-9',gloves:'item-26',head:'item-19'}));let bare=0;
     for(const p of palms){const i=p*4;if([0,1,2].every(k=>full[i+k]===expected[i+k]))bare++;}note('fullGloveBare',bare,{body,action,dir,f,skin:skinId});counts.kits++;
    }
    counts.poses++;
   }
  }
  for(const [key,n]of Object.entries(metrics))if(n)issues.push({key,n});return {mode:sample?'sample':'full',revision:q.manifest.visualRevision,counts,metrics,issues,examples,storage:localStorage.length};
 },sample);console.log(JSON.stringify(result));if(evidence){await fs.mkdir(evidence,{recursive:true});await fs.writeFile(evidence+'/ownership-audit.json',JSON.stringify(result,null,2));}assert.equal(result.counts.poses,318);assert.ok(result.counts.palmPixels>10000);assert.deepEqual(result.issues,[]);assert.equal(result.storage,0);assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
