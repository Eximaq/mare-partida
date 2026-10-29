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
      let kits=0;
      for(let set=0;set<2;set++)for(const clip of all)for(let f=0;f<clip.frames;f++){
        const look=set?{hair:'hair-wavy',face:'face-cheerful',skin:'dark',hairColor:'silver',pants:'item-21',boots:'item-9',gloves:'item-26',cloak:'item-24',head:'item-19'}
          :{hair:'hair-bob',face:'face-gentle',skin:'original',hairColor:'brown',pants:'item-22',boots:'item-8',gloves:'item-25',cloak:'item-23',head:'item-18'};
        const c=await q.render(clip.body,clip.action,clip.direction,f,[],look),w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;
        let edge=0;for(let n=0;n<w;n++)for(const p of[n,n*w,n*w+w-1,(h-1)*w+n])if(d[p*4+3]>100)edge++;
        if(edge)failures.push({kit:set,...clip,frame:f,edge});kits++;
      }
      let facialGeometryChanges=0;
      const faceStyles=q.catalog.styles.filter(s=>s.kind==='face');
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
      for(let y=0;y<128;y++)for(let x=0;x<127;x++)if(mask[(y*128+x)*4+3]===255){const i=(y*128+x+1)*4;if([0,1,2,3].some(c=>aa[i+c]!==bb[i+c]))faceOverHair++;}
      return {counts,frames:Object.values(counts).reduce((a,b)=>a+b,0),kits,facialGeometryChanges,failures:failures.slice(0,20),failureCount:failures.length,faceOverHair,storage:localStorage.length,cache:q.cacheSize,images:q.imageCacheSize,textures:q.wardrobe.cacheSize};
    });
    assert.equal(audit.frames,6880);
    assert.equal(audit.kits,688);
    assert.equal(audit.facialGeometryChanges,0,'original facial features must keep their geometry');
    assert.equal(audit.failureCount,0,JSON.stringify(audit.failures));
    assert.equal(audit.faceOverHair,0,'face must remain below hair');
    assert.equal(audit.storage,0);assert.ok(audit.cache<=64);assert.ok(audit.images<=32);assert.ok(audit.textures<=32);
    for(const [slot,value]of Object.entries({hair:'hair-wavy',face:'face-cheerful',skin:'dark',pants:'item-22',boots:'item-9',gloves:'item-26',cloak:'item-24',head:'item-18'}))await page.selectOption('#look-'+slot,value);
    await page.selectOption('#action','attack-unarmed');await page.selectOption('#direction','south');
    await page.waitForFunction(()=>document.getElementById('status').textContent.includes('8 frames'));
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);console.log(JSON.stringify(audit));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
