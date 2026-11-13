'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.MARE_TEST_URL||'http://127.0.0.1:8175/';
const out=process.env.MARE_QA_DIR||path.join(require('node:os').tmpdir(),'mare-glass-hud');
const hook='  window.__glassQA={get game(){return game},refresh:updateUI,crew:updateCrewIdentity};\n  window.__mareDiagnostics=';
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('  window.__mareDiagnostics=',hook)});});
    await page.goto(base);
    await page.locator('#characterName').fill('Teste Alfa');
    await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
    await page.waitForFunction(()=>window.__glassQA&&window.__mareDiagnostics?.().lobby96.visualState==='ready',null,{timeout:90000});
    await page.evaluate(()=>{
      const g=__glassQA.game;g.level=20;g.attributePoints=10;g.gold=31492;g.hierarchyTier=2;g.hierarchyFaction='pirate';__glassQA.refresh();
      __glassQA.crew({name:'Os Mamonas',tag:'OM'});
    });
    // Mount the production telemetry presenter with isolated inputs; no account/server mutation.
    // The online stylesheet loads after the HUD in the real gateway, so exercise that order too.
    await page.addStyleTag({path:path.resolve('apps/account-client/game.css')});
    await page.addScriptTag({path:path.resolve('apps/account-client/game-ui.js')});
    await page.evaluate(()=>{
      window.__telemetryClient={available:true,network:{rttMs:93,intervalMs:756,ageMs:120},data:{online:{}},subscribe(){},read:async()=>{},renew:async()=>{}};
      const ui=MareOnlineGameUI.mount(__telemetryClient,{sync(){},message(){}});
      function frame(t){ui.frame(t);requestAnimationFrame(frame);}requestAnimationFrame(frame);
    });
    await page.waitForFunction(()=>document.querySelector('#onlinePerformance .online-updates')?.textContent==='Atualizações: 756 ms');
    assert.equal(await page.locator('#miniGold').innerText(),'31.492');
    assert.match(await page.locator('#crewHudIdentity').innerText(),/\[OM\]\s+Os Mamonas/);
    const layouts=[];
    for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[412,915],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(160);
      if(await page.locator('#floatingChat').evaluate(e=>e.classList.contains('hud-open')))await page.locator('#floatingChat [data-close-window]').click();
      const profile=await page.locator('.topbar').boundingBox(),dock=await page.locator('#mainMenu').boundingBox(),telemetry=await page.locator('#onlinePerformance').boundingBox();
      for(const [name,r] of Object.entries({profile,dock,telemetry}))assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,`${name} fits ${width}: ${JSON.stringify(r)}`);
      assert(!intersects(profile,dock),`status and dock do not overlap at ${width}`);
      assert(!intersects(telemetry,dock),`telemetry and dock do not overlap at ${width}`);
      assert(Math.abs(telemetry.x-profile.x)<1&&telemetry.y>=profile.y+profile.height+7,`telemetry follows status at ${width}`);
      assert(await page.locator('#onlinePerformance').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'telemetry text fits');
      assert(await page.locator('#onlinePerformance .online-updates').isVisible(),'update interval remains visible on phones');
      // Emblem and the separate + action must remain independently clickable.
      await page.locator('#characterPosterToggle').click();assert(await page.locator('#characterPoster').isVisible());await page.keyboard.press('Escape');
      await page.locator('#attributePointsHud').click();assert(await page.locator('#panelOverlay').isVisible());await page.locator('#closePanel').click();
      for(const id of ['characterMenuTrigger','socialMenuTrigger','modesMenuTrigger','captainMenuTrigger']){
        const trigger=page.locator('#'+id);await trigger.click();
        const menu=page.locator('#'+await trigger.getAttribute('aria-controls')),r=await menu.boundingBox();
        assert(r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=height+1,`${id} dropdown fits ${width}: ${JSON.stringify(r)}`);
        const t=await trigger.boundingBox(),left=Math.max(8,Math.min(width-r.width-8,t.x+t.width/2-r.width/2));
        assert(Math.abs(r.x-left)<1,`${id} anchored to its own icon at ${width}`);
        assert(await menu.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${id} no horizontal scrolling`);
        if(id==='characterMenuTrigger'){
          const first=menu.locator('button[role=menuitem]').first();await first.hover();
          await page.screenshot({path:path.join(out,`hud-${width}x${height}.png`)});
        }
        await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      }
      layouts.push({width,height,profile,dock,telemetry});
    }
    await page.setViewportSize({width:1366,height:768});
    await page.evaluate(()=>{__glassQA.game.name='Almirante dos Mares Distantes';__glassQA.game.hierarchyTier=8;__glassQA.game.level=53;__glassQA.refresh();});
    await page.locator('#characterPosterToggle').click();assert(await page.locator('#characterPoster').isVisible());await page.keyboard.press('Escape');
    assert(await page.locator('#hudPlayerName').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'long nickname wraps without clipping');
    assert(await page.locator('#miniWillpower').isVisible(),'optional Willpower retained');
    await page.evaluate(()=>{__telemetryClient.available=false;});
    await page.waitForFunction(()=>document.querySelector('#onlinePerformance').dataset.stale==='true');
    assert.equal(await page.locator('#onlinePerformance strong').innerText(),'Sem conexão');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#characterMenuTrigger').focus();await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'characterMenuTrigger','keyboard returns focus to trigger');
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(out,'results.json'),JSON.stringify({layouts,errors,telemetry:true,controls:true},null,2));
    console.log(JSON.stringify({viewports:layouts.length,liveTelemetry:true,crew:true,longName:true,controls:true,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
