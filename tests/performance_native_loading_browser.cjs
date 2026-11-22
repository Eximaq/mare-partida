'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
const reference=process.argv.find(a=>a.startsWith('--source-ref='))?.slice(13);
const root=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'));
(async()=>{
 const fixture=await require('./performance_server.cjs').create(root,'',reference);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(fixture.origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MarePaperDoll96Lobby&&window.MareReworkNativeHD&&window.MareCharacterAppearance);
  const result=await page.evaluate(async()=>{
   const provider=MareReworkNativeHD.create;
   let publications=0,releaseOld,signalStarted;
   const started=new Promise(r=>{signalStarted=r;}),gate=new Promise(r=>{releaseOld=r;});
   // Hold only the first decoded bundle just before publication. The normal
   // selector, network loader, decoder, compositor and canvas still run.
   MareReworkNativeHD.create=(...args)=>{
    const native=provider(...args),prepare=native.prepareConfiguration;
    return {...native,async prepareConfiguration(...inputs){
     const bundle=await prepare(...inputs);
     if(publications++===0){signalStarted();await gate;}
     return bundle;
    }};
   };
   let api;
   try{api=MarePaperDoll96Lobby.create({baseURL:location.href});}
   finally{MareReworkNativeHD.create=provider;}
   await api.ready;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=384;
   const ctx=canvas.getContext('2d'),o={action:'idle',direction:'south',consumer:'world',x:192,y:280};
   const actor=(gender,hairColor,gloves)=>MareCharacterAppearance.commit(
    {classId:'sword',equipment:{weapon:{def:1},gloves:{def:gloves}}},
    {gender,skinColor:'ebony',hairStyle:'original',hairColor,eyeStyle:'original',eyeColor:'green'},()=>true);
   const a=actor('masculino','blue',25),b=actor('feminino','violet',159);
   const first=api.requestWorldVisual(a,o);
   const pendingDraw=api.drawWorldVisual(ctx,o,a),blank=ctx.getImageData(0,0,384,384).data.every(v=>v===0);
   await started;
   let turns=0;await new Promise(r=>requestAnimationFrame(()=>{turns++;r();}));
   const next=api.requestWorldVisual(b,o);
   await next.promise;
   const drawnB=api.drawWorldVisual(ctx,o,b),stateB=api.worldVisual(),before=publications;
   const urls=()=>performance.getEntriesByType('resource').filter(x=>/rework-/.test(x.name)).map(x=>x.name);
   const networkBefore=urls();
   releaseOld();await first.promise;
   const stable=api.worldVisual().publishedKey===stateB.publishedKey;
   const warm=Array.from({length:12},()=>api.drawWorldVisual(ctx,o,b));
   return {pendingDraw,blank,turns,drawnB,stable,warm,reused:before===publications,
    networkReused:urls().length===networkBefore.length,requests:networkBefore.length,
    coverage:stateB.coverage[0],opaque:ctx.getImageData(0,0,384,384).data.some((v,i)=>i%4===3&&v)};
  });
  assert(!result.pendingDraw&&result.blank&&result.turns===1);
  assert(result.drawnB&&result.opaque&&result.stable&&result.warm.every(Boolean));
  assert(result.reused&&result.networkReused&&result.requests>0);
  assert.equal(result.coverage.direction,'south');assert.deepEqual(result.coverage.omitted||[],[]);
  assert.equal(result.coverage.slotRoutes.gloves.item,159);assert.equal(result.coverage.slotRoutes.weapon.item,1);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({warmDraws:12,stalePublication:false,hdRequests:result.requests}));
 }finally{await browser.close();await new Promise(r=>fixture.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
