import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {generate} from 'selfsigned';
import {authDatabase} from './integration/auth-support.mjs';
import {createHttpServer} from '../apps/game-server/src/http.js';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
import {createDevGateway} from '../tools/dev-gateway.mjs';
import {tickWeeklyBosses} from '../apps/game-server/src/characters/weekly-boss-worker.js';

// A disposable PostgreSQL database owns these two fixture accounts and this
// deliberately harmless official event. No live account, setting or save is used.
declare global {
  var MareGameSession:any;
  var __mareDiagnostics:any;
  var MareMarineford:any;
  var MareMarinefordLayout:any;
  var MareWorld:any;
  var __marinefordWeeklyDraws:Array<{src:string;map:string|null;natural:number[];smooth:boolean;count:number}>;
}
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve('.'),out=process.env.MARE_QA_DIR||resolve('.maintenance-local/browser/marineford-weekly');
const port=Number(process.env.MARE_WEEKLY_QA_PORT||9447),origin='https://localhost:'+port;
const sceneFile='assets/marineford/naval-headquarters/scene-hd.png';
const checksum=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const config={mapId:'marineford',spawn:{x:1536,y:1280},entry:{x:1536,y:1824},
  maxPlayers:4,minLevel:1,durationMinutes:15,balanceApproved:true,
  profile:{speed:70,reach:65,attackSec:3,aoeCooldown:7,aoeWindup:1.2,level:180,leash:700}};
const approved={...config,admiralId:'akainu',profile:{...config.profile,hp:300000,attack:1,defense:4500,magicDefense:1650,aoeRadius:217.6,aoeMultiplier:1}};
await mkdir(out,{recursive:true});

await authDatabase(async f=>{
  assert.match(new URL(f.pool.options.connectionString!).pathname,/^\/mare_test_[a-f0-9]{32}$/,'only an isolated test database may host this official fixture');
  for(const [email,name,operator]of [['marine-admin@example.invalid','MarineAdmin',true],['marine-player@example.invalid','MarinePlayer',false]] as const){
    const login=await f.service.login(email,'fixture');
    await f.service.createCharacter(login.token,{name,classId:'sword',factionId:'pirate'});
    if(operator)await f.pool.query('INSERT INTO mare_game.weekly_boss_operators(account_id,slot) VALUES($1,1)',[(await f.service.me(login.token)).account.id]);
  }
  // Ephemeral TLS is generated in memory. Nothing is installed in a trust store.
  const certificate=await generate([{name:'commonName',value:'localhost'}],{
    extensions:[{name:'basicConstraints',cA:false},{name:'keyUsage',digitalSignature:true,keyEncipherment:true},
      {name:'extKeyUsage',serverAuth:true},{name:'subjectAltName',altNames:[{type:2,value:'localhost'},{type:7,ip:'127.0.0.1'}]}]
  });
  const handler=createAuthHandler({service:f.service,vault:f.vault,origin,cookieSeconds:3600});
  const api=createHttpServer({isReady:async()=>true,handle:handler});api.listen(0,'127.0.0.1');await once(api,'listening');
  const gateway=createDevGateway({key:certificate.private,cert:certificate.cert,staticRoot:resolve(root,'dist'),
    onlineRoot:resolve(root,'apps/account-client'),upstream:new URL('http://127.0.0.1:'+(api.address() as any).port)});
  gateway.listen(port,'127.0.0.1');await once(gateway,'listening');
  const errors:string[]=[],workerErrors:any[]=[],sqlErrors:any[]=[],missing:Array<{status:number;url:string}>=[],pages:any[]=[],contexts:any[]=[];
  let browser:any,flight:Promise<unknown>|null=null,phase='boot';
  const results:any={config,viewports:[],commands:[]};
  // Preserve the cause of any SQL contention swallowed by the shared worker.
  // This observes only the disposable fixture and does not change retry policy.
  const {Client}=require('pg'),query=Client.prototype.query;
  Client.prototype.query=function(...args:any[]){
    const capture=(error:any)=>sqlErrors.push({phase,at:Date.now(),code:error.code,message:error.message,query:String(typeof args[0]==='string'?args[0]:args[0]?.text).slice(0,300)});
    const callback=args.at(-1);
    if(typeof callback==='function')args[args.length-1]=function(this:any,error:any,...rest:any[]){if(error)capture(error);return callback.call(this,error,...rest);};
    const result=query.apply(this,args);
    return typeof callback!=='function'&&result?.catch?result.catch((error:any)=>{capture(error);throw error;}):result;
  };
  const timer=setInterval(()=>{if(!flight)flight=tickWeeklyBosses(f.pool).catch(e=>workerErrors.push({phase,at:Date.now(),message:e.message})).finally(()=>{flight=null;});},120);
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
    async function login(email:string,mobile=false){
      const viewport=mobile?{width:393,height:852}:{width:1366,height:768};
      const context=await browser.newContext({viewport,deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:true});contexts.push(context);
      await context.addInitScript(()=>{
        if(localStorage.getItem('mare-partida-save-v1')===null)localStorage.setItem('mare-partida-save-v1','sentinel-marineford-weekly');
        performance.setResourceTimingBufferSize(10000);globalThis.__marinefordWeeklyDraws=[];
        const original=CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage=function(...args:any[]){
          const image=args[0],src=image?.src;
          if(this.canvas.id==='worldCanvas'&&typeof src==='string'&&(/\/assets\/weekly-boss\/admirals\//.test(src)||src.includes('/assets/marineford/naval-headquarters/'))){
            const map=globalThis.__mareDiagnostics?.().map?.id??null;
            const key=globalThis.__marinefordWeeklyDraws.find(d=>d.src===src&&d.map===map);
            if(key)key.count++;else globalThis.__marinefordWeeklyDraws.push({src,map,natural:[image.naturalWidth,image.naturalHeight],smooth:this.imageSmoothingEnabled,count:1});
          }
          return (original as any).apply(this,args);
        };
      });
      const page=await context.newPage();pages.push(page);page.setDefaultTimeout(30000);
      page.on('pageerror',(e:any)=>errors.push(e.message));
      page.on('response',(r:any)=>{if(r.status()>=400&&/marineford|weekly-boss|akainu|map-depth\/objects/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
      page.on('dialog',(d:any)=>d.accept());
      await page.route(/^https?:\/\//,(route:any)=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      await page.goto(origin+'/online/',{waitUntil:'domcontentloaded'});await page.locator('#email').fill(email);await page.locator('#password').fill('Fixture password only 123');
      await page.locator('#login-submit').click();
      await page.waitForFunction(()=>globalThis.MareGameSession?.controlled&&MareGameSession.data?.online?.battle&&MareGameSession.data?.online?.weeklyBoss,null,{timeout:60000});
      await exactPlayer(page);
      results.viewports.push({email,viewport,dpr:await page.evaluate(()=>devicePixelRatio)});return page;
    }
    async function exactPlayer(page:any){
      await page.waitForFunction(()=>{const v=globalThis.__mareDiagnostics?.().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
    }
    async function openEvent(page:any){
      if(await page.locator('#weeklyBossDialog').evaluate((d:any)=>d.open))return;
      await page.locator('#modesMenuTrigger').click();await page.locator('#weeklyBossMenu').click();await page.locator('#weeklyBossDialog').waitFor();
    }
    const adminPanel='#weeklyBossAdminDialog';
    async function openAdmin(page:any){
      if(await page.locator(adminPanel).evaluate((d:any)=>d.open))return;
      await page.locator('#captainMenuTrigger').click();
      await page.locator('#weeklyBossAdminMenu').click();
      await page.locator(adminPanel).waitFor();
    }
    async function clickCommand(page:any,op:string,selector:string,bossId?:string){
      for(let attempt=0;attempt<4;attempt++){
        const [response]=await Promise.all([page.waitForResponse((r:any)=>r.url().endsWith('/commands')&&r.request().postDataJSON()?.action==='weeklyBoss.execute'&&r.request().postDataJSON()?.payload?.op===op),page.locator(selector).click()]);
        if(bossId)assert.equal(response.request().postDataJSON().payload.bossId,bossId);
        const receipt=await response.json();results.commands.push({op,attempt,status:response.status(),error:receipt.error??null});
        if(response.ok()){await page.waitForFunction(()=>!MareGameSession.busy);return receipt;}
        assert.equal(response.status(),409,'an unsuccessful command must be an explicit concurrency conflict');
        assert(['party_member_busy','state_version_conflict','weekly_boss_revision_conflict','weekly_boss_busy'].includes(receipt.error),'unexpected command failure: '+JSON.stringify(receipt));
        await page.waitForFunction(()=>!MareGameSession.busy);await page.evaluate(()=>MareGameSession.read());
      }throw new Error('The '+op+' command never completed');
    }
    const admin=await login('marine-admin@example.invalid'),player=await login('marine-player@example.invalid',true);
    phase='configure isolated official event';
    await openEvent(player);
    assert(await player.locator('#weeklyBossDialog [data-weekly-op=join]').isDisabled(),'ordinary player cannot join before activation');
    await player.locator('#weeklyBossDialog [data-weekly-close]').click();
    await openAdmin(admin);
    assert(await admin.locator(adminPanel+' [data-weekly-op=activate]').isDisabled(),'null settings do not activate an official event');
    async function configureAdmiral(bossId:string){
      await openAdmin(admin);
      await admin.locator(adminPanel+' [data-weekly-admiral]').selectOption(bossId);
      const details=admin.locator(adminPanel+' details');
      if(!await details.evaluate((d:any)=>d.open))await details.locator('summary').click();
      const fields:Record<string,number>={...Object.fromEntries(Object.entries(config.spawn).map(([k,v])=>['spawn.'+k,v])),
        ...Object.fromEntries(Object.entries(config.entry).map(([k,v])=>['entry.'+k,v])),maxPlayers:config.maxPlayers,minLevel:config.minLevel,durationMinutes:config.durationMinutes,
        ...Object.fromEntries(Object.entries(config.profile).map(([k,v])=>['profile.'+k,v]))};
      for(const [name,value]of Object.entries(fields))await admin.locator('#weeklyBossConfig [name="'+name+'"]').fill(String(value));
      await admin.locator('#weeklyBossConfig [name=balanceApproved]').check();
      await clickCommand(admin,'configure',adminPanel+' [data-weekly-op=configure]',bossId);
      await admin.waitForFunction((id:string)=>{
        const saved=MareGameSession.data.online.weeklyBoss.profiles?.[id];
        return saved?.balanceApproved===true&&saved.spawn?.x===1536&&saved.spawn?.y===1280;
      },bossId);
    }
    await configureAdmiral('akainu');
    await clickCommand(admin,'activate',adminPanel+' [data-weekly-op=activate]','akainu');
    await admin.waitForFunction(()=>MareGameSession.data.online.weeklyBoss.events.some((e:any)=>e.mode==='official'&&e.status==='active'));
    const event=await admin.evaluate(()=>MareGameSession.data.online.weeklyBoss.events.find((e:any)=>e.mode==='official'));
    assert.equal(event.mapId,'marineford');assert.equal(event.bossId,'akainu');assert.equal(event.boss.maxHp,300000);results.event={id:event.id,mode:event.mode,mapId:event.mapId};
    const persisted=(await f.pool.query('SELECT mode,map_id,config,status FROM mare_game.weekly_boss_events WHERE id=$1',[event.id])).rows[0];
    assert.equal(persisted.mode,'official');assert.equal(persisted.map_id,'marineford');assert.equal(persisted.status,'active');assert.deepEqual(persisted.config,approved);
    await admin.locator(adminPanel+' [data-weekly-admin-close]').click();
    await openEvent(admin);
    await clickCommand(admin,'join','#weeklyBossDialog [data-weekly-op=join][data-event="'+event.id+'"]');
    await player.evaluate(()=>MareGameSession.read());await openEvent(player);await clickCommand(player,'join','#weeklyBossDialog [data-weekly-op=join][data-event="'+event.id+'"]');
    phase='official renderer and shared boss';
    for(const page of [admin,player]){
      await page.waitForFunction(()=>__mareDiagnostics().map.id==='marineford'&&MareGameSession.data.online.weeklyBoss.current?.mode==='official'&&MareGameSession.data.online.battle.mobs.some((m:any)=>m.type==='weekly-akainu'),null,{timeout:30000});
      await page.waitForFunction(()=>__mareDiagnostics().sharedLobby.players.length===1,null,{timeout:20000});await exactPlayer(page);
      assert.equal(await page.locator('#locationName').textContent(),'Marineford · Akainu');
    }
    const map=await admin.evaluate(()=>{const m=MareWorld.maps.marineford,im=MareMarineford.prepare();return {map:__mareDiagnostics().map.id,width:m.width,height:m.height,returnPoint:m.returnPoint||null,safeZones:m.safeZones||[],interactions:m.interactions||[],natural:[im.naturalWidth,im.naturalHeight],src:new URL(im.src).pathname,declared:[MareMarinefordLayout.imageWidth,MareMarinefordLayout.imageHeight]};});
    assert.deepEqual([map.width,map.height],[3072,2304]);assert.equal(map.returnPoint,null);assert.deepEqual(map.safeZones,[]);assert.deepEqual(map.interactions,[]);
    assert.deepEqual(map.natural,[1448,1086]);assert.deepEqual(map.declared,[1448,1086]);assert(map.src.endsWith('/'+sceneFile));results.map=map;
    const source=await readFile(resolve(root,sceneFile)),served=await admin.request.get(origin+'/'+sceneFile);
    assert.equal(served.status(),200);assert.equal(checksum(await served.body()),checksum(source),'online gateway serves the complete native PNG');results.sceneSha256=checksum(source);
    await admin.waitForFunction(()=>__marinefordWeeklyDraws.some(d=>d.map==='marineford'&&d.src.includes('/assets/marineford/naval-headquarters/')&&d.count>0),null,{timeout:30000});
    phase='Akainu AoE in the real world canvas';
    await admin.waitForFunction(()=>MareGameSession.data.online.battle.mobs[0]?.action?.kind==='aoe',null,{timeout:30000});
    await admin.screenshot({path:resolve(out,'marineford-weekly-aoe-warning-desktop.png')});
    for(const page of [admin,player])await page.waitForFunction(()=>__marinefordWeeklyDraws.some(d=>d.map==='marineford'&&d.src.includes('/vfx/magma_eruption.webp')),null,{timeout:20000});
    await player.screenshot({path:resolve(out,'marineford-weekly-mobile.png')});
    const draws=[];
    for(const [index,page]of [admin,player].entries()){
      const actual=await page.evaluate(()=>__marinefordWeeklyDraws.filter(d=>d.map==='marineford'));
      assert(actual.some((d:any)=>d.src.includes('/vfx/magma_eruption.webp')),'magma VFX is actually drawn on the game canvas');
      assert(actual.some((d:any)=>/\/weekly-boss\/admirals\/akainu\/(south|north|east)-(idle|walk|attack|special_area)\.webp/.test(d.src)),'weekly Akainu body is actually drawn on the game canvas');
      assert(actual.some((d:any)=>d.src.endsWith('/'+sceneFile)&&d.natural[0]===1448&&d.natural[1]===1086&&d.smooth===false),'Marineford is drawn directly from the HD PNG');
      draws.push({viewport:index===0?'desktop':'mobile',actual});
    }results.draws=draws;
    for(const page of pages)assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'sentinel-marineford-weekly');
    const before=await player.evaluate(()=>({id:MareGameSession.data.online.weeklyBoss.current.id,hp:MareGameSession.data.online.battle.mobs[0].hp}));
    phase='official reconnect';await player.reload({waitUntil:'domcontentloaded'});
    await player.waitForFunction(()=>globalThis.MareGameSession?.data?.online?.weeklyBoss?.current?.mode==='official'&&globalThis.__mareDiagnostics?.().map.id==='marineford',null,{timeout:60000});await exactPlayer(player);
    assert.equal(await player.evaluate(()=>MareGameSession.data.online.weeklyBoss.current.id),before.id);
    assert(await player.evaluate(()=>MareGameSession.data.online.battle.mobs[0].hp)<=before.hp);results.reconnect=true;
    phase='leave and close official event';
    await player.locator('#returnLobby').click();await player.waitForFunction(()=>MareGameSession.data.online.world.mapId==='lobby'&&!MareGameSession.data.online.battle.weeklyBossInstanceId,null,{timeout:30000});
    await openAdmin(admin);await clickCommand(admin,'cancel',adminPanel+' [data-weekly-op=cancel][data-event="'+event.id+'"]');
    await admin.waitForFunction(()=>MareGameSession.data.online.world.mapId==='lobby'&&!MareGameSession.data.online.battle.weeklyBossInstanceId,null,{timeout:30000});
    results.returned=true;
    phase='Aokiji private rehearsal from the real admin form';
    await configureAdmiral('aokiji');
    await clickCommand(admin,'test',adminPanel+' [data-weekly-op=test]','aokiji');
    await admin.waitForFunction(()=>MareGameSession.data.online.weeklyBoss.current?.mode==='test'
      &&MareGameSession.data.online.weeklyBoss.current?.bossId==='aokiji'
      &&MareGameSession.data.online.battle.mobs.some((m:any)=>m.type==='weekly-aokiji'),null,{timeout:30000});
    const privateId=await admin.evaluate(()=>MareGameSession.data.online.weeklyBoss.current.id);
    await player.evaluate(()=>MareGameSession.read());
    assert.equal(await player.evaluate((id:string)=>MareGameSession.data.online.weeklyBoss.events.some((e:any)=>e.id===id),privateId),false);
    await openAdmin(admin);
    await clickCommand(admin,'cancel',adminPanel+' [data-weekly-op=cancel][data-event="'+privateId+'"]');
    await admin.waitForFunction(()=>MareGameSession.data.online.world.mapId==='lobby'&&!MareGameSession.data.online.battle.weeklyBossInstanceId,null,{timeout:30000});
    results.privateAdmiral='aokiji';
    for(const page of pages)assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'sentinel-marineford-weekly');
    for(const table of ['weekly_boss_victories','weekly_boss_entitlements','weekly_boss_loot'])assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.'+table)).rows[0].n,0,'closing the QA event creates no victory or rewards');
    assert.deepEqual(errors,[]);assert.deepEqual(workerErrors,[]);assert.deepEqual(missing,[]);
    results.errors=errors;results.workerErrors=workerErrors;results.sqlErrors=sqlErrors;results.missing=missing;
    await writeFile(resolve(out,'marineford-weekly-browser-results.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify({official:true,map:map.map,players:2,native:map.natural,viewports:results.viewports,canvasVfx:true,reconnect:true,returned:true,errors,workerErrors,missing}));
  }catch(error){
    const diagnostics=[];for(const [i,page]of pages.entries()){
      await page.screenshot({path:resolve(out,'failure-'+i+'.png')}).catch(()=>{});
      diagnostics.push(await page.evaluate(()=>({map:globalThis.__mareDiagnostics?.().map,weekly:globalThis.MareGameSession?.data?.online?.weeklyBoss,draws:globalThis.__marinefordWeeklyDraws,body:document.body.innerText.slice(0,2000)})).catch(()=>null));
    }
    await writeFile(resolve(out,'failure-results.json'),JSON.stringify({...results,phase,message:String(error),diagnostics,errors,workerErrors,sqlErrors,missing},null,2)+'\n');
    console.error({phase,errors,workerErrors,sqlErrors,missing});throw error;
  }finally{
    clearInterval(timer);if(flight)await flight;for(const context of contexts)await context.close();await browser?.close();
    await new Promise<void>(r=>gateway.close(()=>r()));await new Promise<void>(r=>api.close(()=>r()));
    Client.prototype.query=query;
  }
});
