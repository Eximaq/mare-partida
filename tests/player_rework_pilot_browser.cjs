'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1280,390])for(const item of [109,17]){
  const page=await browser.newPage({viewport:{width,height:800}});
  await page.goto(`http://127.0.0.1:8769/dist/index.html?reworkTest=${item}`);
  await page.waitForFunction(()=>window.MarePlayerReworkTest&&window.MarePaperDoll96Lobby);
  const result=await page.evaluate(async item=>{
   const runtime=MarePaperDoll96Lobby.create({search:location.search,baseURL:location.href});
   const player={classId:'fighter',equipment:{weapon:{def:5}},appearance96:{body:'feminino'}};
   const before=JSON.stringify(player),save=JSON.stringify(localStorage);
   const c=document.createElement('canvas');c.width=c.height=640;const ctx=c.getContext('2d');
   runtime.preview(ctx,player,{action:'attack',direction:'south',time:0});
   for(let n=0;n<100&&runtime.snapshot().rework.state==='loading';n++)await new Promise(r=>setTimeout(r,50));
   runtime.draw(ctx,player,{action:'attack',direction:'south',progress:1,x:320,y:512,scale:4*96/46});
   const image=new Image();image.src=`tools/rework10917/assets/${item}/${item===109?6:7}-final.png`;await image.decode();const e=document.createElement('canvas');e.width=e.height=640;e.getContext('2d').drawImage(image,0,0);
   const exact=c.toDataURL()===e.toDataURL();ctx.clearRect(0,0,640,640);
   const handled=runtime.draw(ctx,player,{action:'walk',direction:'north'});
   const blank=!ctx.getImageData(0,0,640,640).data.some(Boolean);
   return {exact,blank,handled,notice:document.getElementById('rework-test-notice')?.textContent,unchanged:JSON.stringify(player)===before&&JSON.stringify(localStorage)===save};
  },item);
  assert.equal(result.exact,true);assert.equal(result.blank,true);assert.equal(result.handled,true);assert.equal(result.unchanged,true);assert.match(result.notice,/walk\/north/);
  await page.close();
 }console.log('Pilot browser: both items pixel-exact; desktop/mobile; uncovered poses blank with diagnostic; save unchanged');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
