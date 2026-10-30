const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.argv.find(v=>/^https?:\/\//.test(v))||'http://127.0.0.1:8154/';
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('tools/paper-doll-96-v3/?revision=wardrobe-audit',origin).href);
    await page.waitForFunction(()=>window.__review96v3);
    const audit=await page.evaluate(async()=>{
      const q=__review96v3,failures=[],counts={},all=[];
      for(const [body,b]of Object.entries(q.manifest.bodies)){
        for(const direction of ['south','north','west','east'])all.push({body,action:'static',direction,frames:1});
        for(const [action,dirs]of Object.entries(b.clips))if(action!=='attack-tech')for(const [direction,clip]of Object.entries(dirs))all.push({body,action,direction,frames:clip.frames});
      }
      for(const style of q.catalog.styles){
        let count=0;
        for(const clip of all)for(let f=0;f<clip.frames;f++){
          const c=await q.render(clip.body,clip.action,clip.direction,f,[],{[style.kind]:style.id,hairColor:'brown'});
          const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;
          let edge=0;for(let n=0;n<Math.max(w,h);n++)for(const p of[n<w?n:-1,n<h?n*w:-1,n<h?n*w+w-1:-1,n<w?(h-1)*w+n:-1])if(p>=0&&d[p*4+3]>100)edge++;
          if(edge)failures.push({style:style.id,...clip,frame:f,edge});count++;
        }
        counts[style.id]=count;
      }
      let kits=0,emptyCombinations=0;
      const slots=['pants','boots','gloves','cloak','head'];
      const ids=Object.fromEntries(slots.map(slot=>[slot,q.catalog.styles.filter(s=>s.kind===slot).map(s=>s.id)]));
      const checkEdge=(c,context)=>{const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;let edge=0;for(let n=0;n<Math.max(w,h);n++)for(const p of[n<w?n:-1,n<h?n*w:-1,n<h?n*w+w-1:-1,n<w?(h-1)*w+n:-1])if(p>=0&&d[p*4+3]>100)edge++;if(edge)failures.push({...context,edge});};
      for(const clip of all)for(let f=0;f<clip.frames;f++)for(let set=0;set<32;set++){
        const look={hair:q.catalog.styles.filter(s=>s.kind==='hair')[set%10].id,face:q.catalog.styles.filter(s=>s.kind==='face')[set%6].id,skin:Object.keys(MareAppearance96.skins)[set%8],hairColor:Object.keys(MareAppearance96.hairs)[set%10]};
        for(let s=0;s<slots.length;s++)look[slots[s]]=ids[slots[s]][(set>>s)&1];
        checkEdge(await q.render(clip.body,clip.action,clip.direction,f,[],look),{kit:set,...clip,frame:f});kits++;
      }
      for(const clip of all.filter(c=>c.action==='static'))for(let set=0;set<243;set++){
        let n=set;const look={hair:'hair-bob',face:'face-gentle',hairColor:'brown'};
        for(const slot of slots){const v=n%3;n=Math.floor(n/3);look[slot]=v===0?'original':ids[slot][v-1];}
        checkEdge(await q.render(clip.body,'static',clip.direction,0,[],look),{emptyKit:set,...clip});emptyCombinations++;
      }
      let mirroredPixels=0,mirroredMatrices=0;
      for(const body of ['masculino','feminino'])for(const style of [...q.catalog.styles.filter(s=>s.kind==='hair'),{layers:q.catalog.originalHairs}]){
        const pixels={};for(const direction of ['west','east']){const image=await q.image(style.layers[body][direction]),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(image,0,0);pixels[direction]=c.getContext('2d').getImageData(0,0,128,128).data;}
        const sum=q.catalog.sideMirroring.pixelCoordinateSums[body];
        for(let y=0;y<128;y++)for(let x=0;x<128;x++){const xx=sum-x,a=(y*128+x)*4,b=(y*128+xx)*4;for(let k=0;k<4;k++){const expected=xx>=0&&xx<128?pixels.east[b+k]:0;if(pixels.west[a+k]!==expected)mirroredPixels++;}}mirroredMatrices++;
      }
      let faceOutsideHead=0,containedFrames=0,raisedArmsLost=0;
      for(const clip of all)for(let f=0;f<clip.frames;f++){
        const a=await q.render(clip.body,clip.action,clip.direction,f,[],{face:'face-gentle',hair:'none'}),b=await q.render(clip.body,clip.action,clip.direction,f,[],{face:'none',hair:'none'}),w=a.width,h=a.height;
        const file=q.catalog.originalHeads[clip.body][clip.direction],image=await q.image(file),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(image,0,0);
        const r=q.appearanceRigs.clips[clip.body]?.[clip.action]?.[clip.direction],rest=r?.rest||q.appearanceRigs.rests[clip.body][clip.direction],pose=r?.poses[f]||rest,socket=r?.sockets[f]||{x:0,y:0,angle:0};
        const mask=MareAppearance96.attach(c.getContext('2d').getImageData(0,0,128,128).data,'head',rest,pose,socket,(w-128)/2,w,h).full;
        const aa=a.getContext('2d').getImageData(0,0,w,h).data,bb=b.getContext('2d').getImageData(0,0,w,h).data;
        for(let i=0;i<aa.length;i+=4)if(mask[i+3]===0&&[0,1,2,3].some(k=>aa[i+k]!==bb[i+k]))faceOutsideHead++;
        if(clip.action.startsWith('attack-')){
          const original=await q.render(clip.body,clip.action,clip.direction,f),op=original.getContext('2d').getImageData(0,0,w,h).data,pad=(w-128)/2;
          for(let y=0;y<Math.min(h,Math.floor(44+socket.y+pad));y++)for(let x=0;x<w;x++){
            if(x>=43+socket.x+pad&&x<=89+socket.x+pad)continue;
            const i=(y*w+x)*4;if(op[i+3]>200&&bb[i+3]===0)raisedArmsLost++;
          }
        }containedFrames++;
      }
      let facialGeometryChanges=0;
      const faceStyles=q.catalog.styles.filter(s=>s.kind==='face'&&s.physiognomy==='original');
      for(const body of ['masculino','feminino'])for(const direction of ['south','north','west','east']){
        const pixels=[];
        for(const face of faceStyles){const img=await q.image(face.layers[body][direction]),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(img,0,0);pixels.push(c.getContext('2d').getImageData(0,0,128,128).data);}
        for(const data of pixels.slice(1))for(let i=0;i<data.length;i+=4){
          if(data[i+3]!==pixels[0][i+3])facialGeometryChanges++;
          const iris=pixels[0][i+2]>pixels[0][i]*1.2&&pixels[0][i+2]>pixels[0][i+1]*1.05&&pixels[0][i+2]>60;
          if(!iris&&[0,1,2].some(c=>data[i+c]!==pixels[0][i+c]))facialGeometryChanges++;
        }
      }
      // A later face selection cannot paint over opaque hair.
      const hair=q.catalog.styles.find(s=>s.id==='hair-bob'),file=hair.layers.feminino.south,img=await q.image(file);
      const hc=document.createElement('canvas');hc.width=hc.height=128;hc.getContext('2d').drawImage(img,0,0);
      const mask=hc.getContext('2d').getImageData(0,0,128,128).data;
      const a=await q.render('feminino','static','south',0,[],{hair:hair.id,face:'face-gentle',hairColor:'brown'});
      const b=await q.render('feminino','static','south',0,[],{hair:hair.id,face:'face-sharp',hairColor:'brown'});
      const aa=a.getContext('2d').getImageData(0,0,128,128).data,bb=b.getContext('2d').getImageData(0,0,128,128).data;
      let faceOverHair=0;
      const dx=q.catalog.headCalibration?.south?.hairX||0,dy=q.catalog.headCalibration?.south?.hairY||0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(mask[(y*128+x)*4+3]===255){const xx=x+dx,yy=y+dy;if(xx<0||xx>=128||yy<0||yy>=128)continue;const i=(yy*128+xx)*4;if([0,1,2,3].some(c=>aa[i+c]!==bb[i+c]))faceOverHair++;}
      return {raisedArmsLost,mirroredPixels,mirroredMatrices,faceOutsideHead,containedFrames,emptyCombinations,counts,frames:Object.values(counts).reduce((a,b)=>a+b,0),kits,facialGeometryChanges,failures:failures.slice(0,20),failureCount:failures.length,faceOverHair,storage:localStorage.length,cache:q.cacheSize,images:q.imageCacheSize,textures:q.wardrobe.cacheSize,attachments:q.wardrobe.attachmentCacheSize};
    });
    console.log(JSON.stringify(audit));
    assert.equal(audit.frames,11024);
    assert.equal(audit.kits,13568);
    assert.equal(audit.emptyCombinations,1944);assert.equal(audit.mirroredMatrices,22);assert.equal(audit.mirroredPixels,0);assert.equal(audit.faceOutsideHead,0);assert.equal(audit.raisedArmsLost,0);assert.equal(audit.containedFrames,424);
    assert.equal(audit.facialGeometryChanges,0,'original facial features must keep their geometry');
    assert.equal(audit.failureCount,0,JSON.stringify(audit.failures));
    assert.equal(audit.faceOverHair,0,'face must remain below hair');
    assert.equal(audit.storage,0);assert.ok(audit.cache<=64);assert.ok(audit.images<=32);assert.ok(audit.textures<=32);assert.ok(audit.attachments<=96);
    for(const [slot,value]of Object.entries({hair:'hair-wavy',face:'face-cheerful',skin:'dark',pants:'item-22',boots:'item-9',gloves:'item-26',cloak:'item-24',head:'item-18'}))await page.selectOption('#look-'+slot,value);
    await page.selectOption('#action','attack-unarmed');await page.selectOption('#direction','south');
    await page.waitForFunction(()=>document.getElementById('status').textContent.includes('8 frames'));
    // Fully equipped active UI must survive rendering another body through the small image cache.
    await page.evaluate(async()=>{const q=__review96v3;for(const body of ['masculino','feminino'])for(const dir of ['south','north','west','east'])await q.render(body,'walk',dir,7,[],{hair:'hair-long',face:'face-resolute',head:'item-19',pants:'item-21',boots:'item-8',gloves:'item-25',cloak:'item-23'});q.draw(performance.now());});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
