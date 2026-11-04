'use strict';
// Focused render regression for the first five class armaments. Isolated art
// bench: no save, backend or user account is read or changed.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.argv[2]||'http://127.0.0.1:8175/').replace(/\/?$/,'/')+'tools/paper-doll-96-v3/');await page.waitForFunction(()=>window.__review96v3);
  const result=await page.evaluate(async()=>{
   const q=__review96v3,skin=new Set(MareAppearance96.skins.light.ramp.slice(1).map(hex=>hex.toLowerCase())),failures=[];let frames=0,coveredPixels=0;
   const colour=(p,i)=>'#'+[0,1,2].map(k=>p[i+k].toString(16).padStart(2,'0')).join('');
   for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-unarmed'])for(const direction of ['south','north','east']){
    const selected=q.selection(body,action,direction),spec=MareMotion96.clipSpec(q.manifest,selected.clip),look={hair:'hair-swept',face:'face-calm',skin:'light',hairColor:'brown',torso:'item-6',pants:'item-21',boots:'item-8',gloves:'original',inspectionBareHands:true};
    const images=new Map(await Promise.all(Object.values(selected.layers).map(async f=>[f,await q.image(f)])));
    for(let id=109;id<=112;id++)for(const [k,v]of await q.wardrobe.prepare(selected,{...look,weapon:'weapon-'+id}))images.set(k,v);
    const atlas=q.catalog.nativeOwnership.atlases[body][action],ownCanvas=document.createElement('canvas');ownCanvas.width=spec.width;ownCanvas.height=spec.height;
    const render=(frame,weapon,hidden=[])=>{const c=document.createElement('canvas');c.width=spec.width*3;c.height=spec.height*3;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.scale(3,3);q.wardrobe.draw(ctx,images,selected,frame,spec,hidden,{...look,weapon});return ctx.getImageData(0,0,c.width,c.height).data;};
    for(let f=0;f<selected.clip.frames;f++){
     const n=atlas.directions.indexOf(direction)*atlas.framesPerDirection+f,ox=ownCanvas.getContext('2d');ox.clearRect(0,0,spec.width,spec.height);ox.drawImage(images.get(atlas.file),n%atlas.columns*atlas.cell,Math.floor(n/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,spec.width,spec.height);const owned=MareTorso96.unpack(ox.getImageData(0,0,spec.width,spec.height).data),bare=render(f,'original'),headless=render(f,'original',['headBase','face','hair','head']);
     for(let id=109;id<=112;id++){
      const equipped=render(f,'weapon-'+id),entries=q.wardrobe.weaponPlan(selected,f,spec,{weapon:'weapon-'+id},owned),pixels=[];let leaks=0;
      for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
       const p=y*spec.width+x,i=((y*3+1)*spec.width*3+x*3+1)*4;if(!bare[i+3]||!skin.has(colour(bare,i))||![0,1,2,3].every(k=>bare[i+k]===headless[i+k]))continue;
       const hand=entries.some(e=>{const dx=x-e.x,dy=y-e.y;return Math.hypot(dx,dy)<=5.6&&dx*Math.cos(e.handAngle)+dy*Math.sin(e.handAngle)>=-4;});
       if(!hand&&!(id===110&&owned.arms[p]))continue;
       // Compare exact native skin colours, not broad gold/red thresholds.
       coveredPixels++;if([0,1,2,3].every(k=>bare[i+k]===equipped[i+k])){leaks++;if(pixels.length<6)pixels.push({x,y});}
      }
      frames++;if(leaks)failures.push({id,body,action,direction,frame:f,leaks,pixels});
     }
    }
   }
   // West is a pixel-exact mirror of the full East composite, including armour.
   let mirrors=0;for(const body of ['masculino','feminino'])for(let id=109;id<=113;id++){
    const look={weapon:'weapon-'+id,torso:'item-6',skin:'light',inspectionBareHands:true},east=await q.render(body,'walk','east',4,[],look),west=await q.render(body,'walk','west',4,[],look),a=east.getContext('2d').getImageData(0,0,east.width,east.height).data,b=west.getContext('2d').getImageData(0,0,west.width,west.height).data,d=east.mareDensity;
    for(let y=0;y<east.height;y++)for(let x=d;x<east.width;x++){const i=(y*east.width+x)*4,j=(y*east.width+east.width+d-1-x)*4;for(let k=0;k<4;k++)if(a[i+k]!==b[j+k])throw Error('West mirror differs');}mirrors++;
   }
   return {frames,coveredPixels,mirrors,failures};
  });
  assert.deepEqual(errors,[]);assert.deepEqual(result.failures,[],'native hand/arm skin remains uncovered');assert.equal(result.frames,480);assert.equal(result.mirrors,10);console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
