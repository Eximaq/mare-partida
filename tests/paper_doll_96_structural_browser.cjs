'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/';
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const baseline=process.argv.find(a=>a.startsWith('--library-dir='))?.slice(14);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(baseline)await p.route('**/tools/paper-doll-96-v3/**',async route=>{const relative=new URL(route.request().url()).pathname.split('/tools/paper-doll-96-v3/')[1]||'index.html';if(relative.includes('..'))throw Error('Invalid baseline path');await route.fulfill({body:await fs.readFile(path.join(baseline,relative)),contentType:relative.endsWith('.png')?'image/png':relative.endsWith('.json')?'application/json':relative.endsWith('.js')?'application/javascript':'text/html'});});
 await p.goto(new URL('tools/paper-doll-96-v3/',origin).href);await p.waitForFunction(()=>window.__review96v3);
 const result=await p.evaluate(async()=>{
  const q=__review96v3,issues=[],counts={poses:0,capeCases:0,capeInterior:0,exposedHands:0,abdomenWitnesses:0,headContacts:0,depthReferences:0,backGlovePixels:0,farPalmPixels:0},metrics={capePierced:0,exposedHandsChanged:0,abdomenBare:0,headReferenceInvalid:0,depthInvalid:0,backGlovePierced:0,farPalmUncovered:0};
  const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const raw=async(file)=>{const im=await q.image(file),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return read(c);};
  const same=(a,b,i)=>[0,1,2,3].every(k=>a[i+k]===b[i+k]);
  for(const [body,b]of Object.entries(q.manifest.bodies))for(const action of ['static',...Object.keys(b.clips).filter(a=>a!=='attack-tech')]){
   const clip=b.clips[action]?.north,size=clip?.frame?.width||128,pad=(size-128)/2,rig=q.appearanceRigs.clips[body]?.[action]?.north,rest=rig?.rest||q.appearanceRigs.rests[body].north;
   for(let f=0;f<(clip?.frames||1);f++){
    const pose=rig?.poses[f]||rest,neck=pose.find(j=>j.label==='NECK');
    for(const style of q.catalog.styles.filter(s=>s.kind==='cloak')){
     const cape=MareAppearance96.attach(await raw(style.layers[body].north),'cloak',rest,pose,{},pad,size,size).full;
     for(const torso of ['original','item-6','item-7'])for(const gloves of ['original','item-25','item-26']){
      const look={skin:'original',hair:'hair-swept',face:'face-gentle',torso,gloves,pants:'item-21',boots:'item-8'},bare=read(await q.render(body,action,'north',f,[],look)),actual=read(await q.render(body,action,'north',f,[],{...look,cloak:style.id}));
      if(gloves!=='original'&&style.id==='item-23'){
       const expected=read(await q.render(body,action,'north',f,[],{...look,gloves:'original'})),j=Object.fromEntries(pose.map(j=>[j.label,j])),hip=(j['LEFT HIP'].y+j['RIGHT HIP'].y)*64+pad,half=Math.min(7,Math.abs(j['LEFT SHOULDER'].x-j['RIGHT SHOULDER'].x)*128*.3);
       for(let y=Math.ceil(neck.y*128+pad+6);y<hip-6;y++)for(let x=Math.ceil(neck.x*128+pad-half);x<=neck.x*128+pad+half;x++){
        const i=(y*size+x)*4;counts.backGlovePixels++;if(!same(bare,expected,i))metrics.backGlovePierced++;
       }
      }
      for(let y=Math.ceil(neck.y*128+pad+5);y<size;y++)for(let x=0;x<size;x++){
       const i=(y*size+x)*4;
       if(cape[i+3]===255){counts.capeInterior++;if(!same(actual,cape,i))metrics.capePierced++;}
       // Outside the opaque back panel, an arm/glove stays as rendered without
       // the cape. This prevents 'fixing' depth by deleting whole limbs.
       else if(!cape[i+3]&&bare[i+3]&&y<((pose.find(j=>j.label==='LEFT HIP').y+pose.find(j=>j.label==='RIGHT HIP').y)/2)*128+pad){counts.exposedHands++;if(!same(actual,bare,i))metrics.exposedHandsChanged++;}
      }counts.capeCases++;
     }
    }counts.poses++;
   }
  }
  // Independent witnesses selected on the native lateral chest, not generated
  // from the ownership mask being tested. The far forearm is behind this area.
  for(const torso of ['item-6','item-7'])for(const dir of ['east','west'])for(const cloak of ['original','item-23','item-24'])for(const gloves of ['original','item-25','item-26']){
   const d=read(await q.render('masculino','walk',dir,0,[],{torso,cloak,gloves,skin:'original',hair:'none',face:'none'})),style=q.catalog.styles.find(s=>s.id===torso),allowed=new Set(style.materialPalette.map(c=>c.join(',')));
   for(let y=60;y<=66;y++)for(let x=64;x<=68;x++){const xx=dir==='west'?128-x:x,i=(y*128+xx)*4;counts.abdomenWitnesses++;if(d[i+3]!==255||!allowed.has(Array.from(d.subarray(i,i+3)).join(',')))metrics.abdomenBare++;}
  }
  // Camera depth must not erase an exposed far hand or leave its full glove
  // unpainted. Compare visible native pixels, rather than trusting a z flag.
  for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus']){
   const rig=q.appearanceRigs.clips[body][action].east,clip=q.manifest.bodies[body].clips[action].east,size=clip.frame?.width||128,pad=(size-128)/2,native=await raw(clip.layers.body);
   for(let f=0;f<rig.poses.length;f++){
    const look={torso:'item-7',hair:'none',face:'none',skin:'original'},a=read(await q.render(body,action,'east',f,[],look)),z=read(await q.render(body,action,'east',f,[],{...look,gloves:'item-26'})),j=rig.poses[f].find(p=>p.label==='LEFT ARM');
    for(let y=Math.floor(j.y*128+pad-2);y<=j.y*128+pad+2;y++)for(let x=Math.floor(j.x*128+pad-2);x<=j.x*128+pad+2;x++){
     if(x<0||y<0||x>=size||y>=size||Math.hypot(x-j.x*128-pad,y-j.y*128-pad)>2)continue;
     const i=(y*size+x)*4,n=(y*clip.frames*size+f*size+x)*4,r=a[i],g=a[i+1],b=a[i+2];
     if(!a[i+3]||r<65||r<b*1.28||g/r<.33||g/r>.9||[0,1,2,3].some(k=>a[i+k]!==native[n+k]))continue;
     counts.farPalmPixels++;if(same(a,z,i))metrics.farPalmUncovered++;
    }
   }
  }
  for(const [body,actions]of Object.entries(q.appearanceRigs.clips))for(const [action,dirs]of Object.entries(actions))for(const [dir,rig]of Object.entries(dirs))for(const pose of rig.poses){
   const j=Object.fromEntries(pose.map(p=>[p.label,p])),n=j.NECK,l=j['LEFT SHOULDER'],r=j['RIGHT SHOULDER'];
   const span=Math.hypot(l.x-r.x,l.y-r.y)*128,offset=Math.hypot(n.x-(l.x+r.x)/2,n.y-(l.y+r.y)/2)*128;
   if(offset>Math.max(4,span*.3))metrics.headReferenceInvalid++;counts.headContacts++;
   if(dir==='east'||dir==='west')for(const side of ['LEFT','RIGHT']){if((j[side+' ARM'].z_index>n.z_index)!==(side==='RIGHT'))metrics.depthInvalid++;counts.depthReferences++;}
  }
  for(const [key,n]of Object.entries(metrics))if(n)issues.push({key,n});return {revision:q.manifest.visualRevision,counts,metrics,issues,storage:localStorage.length};
 });console.log(JSON.stringify(result));if(output){await fs.mkdir(output,{recursive:true});await fs.writeFile(output+'/structural-audit.json',JSON.stringify(result,null,2));}assert.equal(result.counts.poses,106);assert.equal(result.counts.capeCases,1908);assert.ok(result.counts.capeInterior>100000);assert.ok(result.counts.farPalmPixels>500);assert.equal(result.storage,0);assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
