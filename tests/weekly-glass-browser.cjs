'use strict';
// Event windows in the real game UI with a controlled online clock and session.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/weekly-glass';

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {
  const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.MARE_TEST_URL);
  await p.locator('#characterName').fill('Nauta');
  await p.locator('#nextToClass').click();
  await p.locator('#nextToAppearance').click();
  await p.locator('#createCharacter').click();
  await p.locator('[data-confirm-accept]').click();
  await p.evaluate(()=>{
   const serverNow='2026-11-28T23:10:00.000Z',openedAt='2026-11-28T23:00:00.000Z',endsAt='2026-11-29T00:00:00.000Z';
   const event={id:'ui-event',bossId:'akainu',mode:'official',mapId:'marineford',status:'active',members:3,maxPlayers:16,minLevel:50,version:1,openedAt,endsAt};
   const daily={boss:'daily-zoro',status:'waiting',minLevel:100,maxPlayers:16,members:0,serverNow,opensAt:openedAt,endsAt};
   const weekly={events:[event],daily,serverNow,canManage:false,marinefordReady:true,lootRules:{rankBChance:.01,hakiChance:.01,armamentShare:.5}};
   const listeners=[];
   window.__weeklyFixture={weekly,event,sent:[],reads:0,refresh:()=>listeners.forEach(f=>f())};
   window.MareGameSession={available:true,controlled:true,busy:false,pending:null,data:{online:{weeklyBoss:weekly,state:{level:100},world:{mapId:'lobby'},battle:{hp:100}}},subscribe:f=>{listeners.push(f);return()=>{};},read:async()=>{
    __weeklyFixture.reads++;
    __weeklyFixture.beforeRead?.();
    __weeklyFixture.refresh();
   },command:async(action,payload)=>{
    __weeklyFixture.sent.push({action,payload});
    if(payload.op==='join')weekly.current={...event,boss:{name:'Akainu',hp:800,maxHp:1000}};
    if(payload.op==='leave')weekly.current=null;
    __weeklyFixture.refresh();
   }};
  });
  const open=async selector=>{
   await p.locator('#modesMenuTrigger').click();
   await p.locator(selector).click();
  };
  const close=selector=>p.locator(selector).click();
  const rectFits=async(id,width,height)=>{
   const rect=await p.locator(id).boundingBox();
   assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1);
   assert(await p.locator(id).evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  };
  const join=p.locator('#weeklyBossDialog [data-weekly-op=join]');
  const swordJoin=p.locator('[data-sword-event-join]');
  for(const [width,height] of [[1366,768],[390,844]]) {
   await p.setViewportSize({width,height});
   await open('#weeklyBossMenu');
   await rectFits('#weeklyBossDialog',width,height);
   assert.equal(await p.locator('[data-weekly-preview]').count(),3);
   await p.waitForFunction(()=>[...document.querySelectorAll('[data-weekly-preview] img')].every(img=>img.complete&&img.naturalWidth>0));
   assert.doesNotMatch(await p.locator('#weeklyBossDialog .event-rewards').innerText(),/\d(?:,\d+)?\s*%/);
   assert(await join.isEnabled());
   assert.equal(await p.locator('#weeklyBossDialog [data-weekly-op=test]').count(),0);
   await p.locator('[data-weekly-preview=aokiji]').click();
   assert(await join.isDisabled());
   assert.match(await p.locator('#weeklyBossDialog .event-hero h3').textContent(),/Aokiji/);
   await p.locator('[data-weekly-preview=kizaru]').click();
   assert(await join.isDisabled());
   await p.locator('[data-weekly-preview=akainu]').click();
   await p.waitForFunction(()=>document.querySelector('[data-weekly-countdown]')?.textContent.includes('Encerra em'));
   await p.screenshot({path:path.join(out,'weekly-'+width+'.png')});
   await close('[data-weekly-close]');
   await open('#swordEventMenu');
   await rectFits('#swordEventDialog',width,height);
   assert.equal(await p.locator('[data-sword-preview]').count(),7);
   await p.waitForFunction(()=>[...document.querySelectorAll('[data-sword-preview] img')].every(img=>img.complete&&img.naturalWidth>0));
   assert(await swordJoin.isDisabled());
   assert.match(await p.locator('[data-sword-preview=daily-zoro]').textContent(),/Libera às 20h/);
   await p.evaluate(()=>{__weeklyFixture.weekly.daily.status='open';__weeklyFixture.refresh();});
   assert(await swordJoin.isEnabled());
   const filters=await p.locator('[data-sword-preview] img').evaluateAll(imgs=>imgs.map(img=>getComputedStyle(img).filter));
   assert.equal(filters.filter(x=>x==='grayscale(1)').length,6);
   await p.locator('#swordEventDialog .event-card img,#swordEventDialog .event-hero img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   await p.screenshot({path:path.join(out,'sete-laminas-'+width+'.png')});
   await p.locator('[data-sword-preview=daily-shiki]').click();
   assert(await swordJoin.isDisabled());
   await p.evaluate(()=>{__weeklyFixture.weekly.daily.status='won';__weeklyFixture.refresh();});
   await p.locator('[data-sword-preview=daily-zoro]').click();
   assert(await swordJoin.isDisabled());
   assert.equal(await p.locator('[data-sword-preview=daily-zoro] .event-state').textContent(),'Encerrado');
   await p.evaluate(()=>{__weeklyFixture.weekly.daily.status='waiting';__weeklyFixture.refresh();});
   await close('[data-sword-event-close]');
  }
  await open('#weeklyBossMenu');
  await p.evaluate(()=>{__weeklyFixture.beforeRead=()=>{__weeklyFixture.weekly.events=[];};});
  await join.click();
  await p.waitForFunction(()=>document.querySelector('#weeklyBossDialog [data-event-message]')?.textContent.includes('não está mais disponível'));
  assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent),[]);
  await p.evaluate(()=>{delete __weeklyFixture.beforeRead;__weeklyFixture.weekly.events=[__weeklyFixture.event];__weeklyFixture.refresh();});
  await join.click();
  await p.waitForFunction(()=>!document.querySelector('#weeklyBossDialog').open);
  assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent[0]),{action:'weeklyBoss.execute',payload:{op:'join',eventId:'ui-event'}});
  assert(await p.locator('#weeklyBossHUD').isVisible());
  await open('#weeklyBossMenu');
  await p.locator('#weeklyBossDialog [data-weekly-op=leave]').click();
  await p.waitForFunction(()=>!__weeklyFixture.weekly.current);
  assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent[1]),{action:'weeklyBoss.execute',payload:{op:'leave'}});
  await open('#swordEventMenu');
  await p.evaluate(()=>{__weeklyFixture.weekly.daily.status='open';__weeklyFixture.refresh();});
  await swordJoin.click();
  await p.waitForFunction(()=>!document.querySelector('#swordEventDialog').open);
  assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent[2]),{action:'weeklyBoss.execute',payload:{op:'join-swords'}});
  await p.evaluate(()=>{__weeklyFixture.weekly.canManage=true;__weeklyFixture.weekly.marinefordReady=false;__weeklyFixture.refresh();});
  await p.locator('#captainMenuTrigger').click();
  await p.locator('#weeklyBossAdminMenu').click();
  const admin=p.locator('#weeklyBossAdminDialog');
  assert(await admin.locator('[data-weekly-op=activate]').isDisabled());
  await admin.locator('summary').click();
  assert(await admin.locator('#weeklyBossConfig').isVisible());
  await admin.locator('input[name="profile.hp"]').fill('2000');
  await p.evaluate(()=>__weeklyFixture.refresh());
  assert.equal(await admin.locator('input[name="profile.hp"]').inputValue(),'2000');
  await close('[data-weekly-admin-close]');
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile, seleção e agenda, entrada revalidada, estados das Sete Lâminas e administração isolada.');
 } finally {
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
