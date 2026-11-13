'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

(async()=>{
  const out=process.env.MARE_QA_DIR||'tmp/nameplate-browser';
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.MARE_QA_URL||'http://127.0.0.1:8175/');
    await page.locator('#characterName').fill('NaveganteSul');
    await page.locator('#nextToClass').click();
    await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();
    await page.locator('[data-confirm-accept]').click();
    await page.waitForFunction(()=>document.querySelector('#worldLoading').dataset.state==='ready');
    await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');
    await page.evaluate(()=>{
      const draw=MareMapPlayerHud.draw;
      MareMapPlayerHud.draw=function(ctx,x,y,name,resources,identity){
        const rect=ctx.canvas.getBoundingClientRect(),scale=rect.height/ctx.canvas.height;
        const transform=ctx.getTransform(),fill=ctx.fillText,track=ctx.roundRect,image=ctx.drawImage;
        const result={labels:[],tracks:[],icons:0,identity};
        ctx.fillText=function(text,tx,ty,...rest){
          const metrics=this.measureText(text);
          result.labels.push({text,x:rect.left+(tx+transform.e)*scale,
            top:rect.top+(ty+transform.f-metrics.actualBoundingBoxAscent)*scale,
            bottom:rect.top+(ty+transform.f+metrics.actualBoundingBoxDescent)*scale});
          return fill.call(this,text,tx,ty,...rest);
        };
        ctx.roundRect=function(bx,by,w,h,...rest){
          result.tracks.push({x:rect.left+(bx+w/2+transform.e)*scale,
            top:rect.top+(by+transform.f)*scale,height:h*scale});
          return track.call(this,bx,by,w,h,...rest);
        };
        ctx.drawImage=function(...args){result.icons++;return image.apply(this,args);};
        try{return draw.apply(this,arguments);}
        finally{delete ctx.fillText;delete ctx.roundRect;delete ctx.drawImage;if(resources)window.nameplateQA=result;}
      };
    });
    for(const [device,width,height] of [['desktop',1366,768],['tablet',820,1180],['phone',390,844]]){
      await page.setViewportSize({width,height});
      for(const [label,deltaY,zoom] of [['min',55,.9],['max',-55,1.1]]){
        await page.locator('#worldCanvas').evaluate((canvas,deltaY)=>{
          for(let i=0;i<20;i++)canvas.dispatchEvent(new WheelEvent('wheel',{deltaY,cancelable:true,bubbles:true}));
        },deltaY);
        await page.waitForFunction(z=>__mareDiagnostics().camera.zoom===z,zoom);
        // Allow the camera's intentional interpolation to settle after resize.
        await page.waitForTimeout(850);
        const result=await page.evaluate(()=>({plate:window.nameplateQA,menu:document.querySelector('#mainMenu').getBoundingClientRect().toJSON()}));
        const {plate,menu}=result;
        assert.deepEqual(plate.labels.map(p=>p.text),['Pirata Novato','NaveganteSul','Nv 1']);
        assert(plate.icons>0,'the real hierarchy insignia loaded');
        assert(plate.labels[0].bottom<plate.labels[1].top,'title and name do not overlap');
        assert(plate.labels[1].bottom<plate.labels[2].top,'name and level do not overlap');
        for(const bar of plate.tracks)assert(Math.abs(bar.x-plate.labels[1].x)<1,'bars centered on name');
        assert(plate.tracks[0].top>plate.labels[2].bottom,'level clears life');
        await page.screenshot({path:path.resolve(out,device+'-'+label+'.png')});
        if(device==='desktop'&&label==='max')await page.screenshot({path:path.resolve(out,'nameplate-detail.png'),
          clip:{x:Math.floor(plate.labels[1].x-125),y:Math.floor(plate.labels[0].top-12),width:250,height:210}});
        if(device==='phone')assert(plate.labels[0].top>menu.bottom+2,'title is visible below the phone menu: '+JSON.stringify(result));
        console.log(device,label,'title top',plate.labels[0].top.toFixed(1),'menu bottom',menu.bottom,'aligned labels and bars; insignia loaded');
      }
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
