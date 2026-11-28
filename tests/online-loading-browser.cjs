'use strict';
// Real game boot and content worker, with only the account API replaced by a
// local fixture. No production account, Supabase session or save is touched.
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {createReadStream, readFileSync, mkdirSync} = require('node:fs');
const {stat} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const forge = require('../forge-system.js');
const catalog = require('../item-catalog.js').create({forge,
  prison:require('../prison-system.js'), haki:require('../haki-system.js'),
  akuma:require('../akuma-system.js'), hakiProgression:require('../haki-progression.js')});
const characters = require('../character-system.js');
const birth = require('../character-catalog.js').create({characters});
const maps = require('../world-catalog.cjs').load();
const onDemand = process.argv.includes('--on-demand');
const root = path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--')) || 'dist');
const character = {id:'11111111-1111-4111-8111-111111111111', name:'Navegante', classId:'sword', factionId:'pirate'};
const equipment = Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(slot => [slot,null]));
for (const [slot,def] of [['weapon',0],['coat',6]]) equipment[slot] = forge.normalizeItem({def,id:'fixture-'+slot,level:1,plus:0,rarity:'common',obtainedAt:1},catalog.items,()=>0);
const allocated = {strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const stats = characters.derive({classId:'sword',level:2,attributes:allocated},birth.classes.sword,birth.factions.pirate,forge.aggregate(equipment,catalog.items));
const wire = {
  state:{characterId:character.id,version:1,level:2,experience:'80',gold:'120'},
  originalInventory:{catalogId:'original-game-v1',inventory:[],equipment,potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]},
  inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],
  attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},
  journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},
  combatPreview:{rulesetId:'original-character-v1',stats,maxHp:stats.maxHP},
  world:{rulesetId:'original-world-v1',rulesHash:maps.rulesHash,mapId:'dawn',area:'beach',
    position:maps.maps.dawn.spawn,path:[],speed:162.2,direction:'front',
    serverNow:new Date().toISOString(),motionUntil:new Date().toISOString()}
};
let releaseControl;
const controlGate = new Promise(resolve => {releaseControl = resolve;});
let stateFailure = false, transfers = 0;
let transferBytes = 0, unexpectedPath, detectUnexpected, resumeMap;
const unexpected = new Promise(resolve => { detectUnexpected = file => { unexpectedPath ??= file; resolve(file); }; });
const requested = new Map();
const mapGate = new Promise(resolve => {resumeMap = resolve;});
const remoteRegion = path => path.startsWith('assets/impel-down/') || /^assets\/exported-maps\/(?!lobby\/|dawn\/)/.test(path);
const html = readFileSync(path.join(root,'index.html'),'utf8').replace('<head>',
  '<head><script defer src="/online/game-session.js"></script><script defer src="/online/game-ui.js"></script><link rel="stylesheet" href="/online/game.css">');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server = createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if (url.pathname.startsWith('/v1/')) {
    let body = {};
    if (url.pathname === '/v1/me') body = {character};
    else if (url.pathname === '/v1/auth/csrf') body = {csrfToken:'local-fixture'};
    else if (url.pathname.endsWith('/online-state')) {
      if (stateFailure) {res.writeHead(503,{'Content-Type':'application/json'}).end('{"error":"unavailable"}');return;}
      body = wire;
    }
    else if (url.pathname.endsWith('/control')) {
      await controlGate;
      body = {epoch:1,token:'x'.repeat(43)};
    } else if (url.pathname.endsWith('/renew')) body = {epoch:1};
    else if (url.pathname.endsWith('/commands')) {
      let input = '';
      for await (const chunk of req) input += chunk;
      const command = JSON.parse(input);
      assert.equal(command.action,'world.return');
      wire.world = {...wire.world,mapId:'lobby',area:null,position:maps.maps.lobby.spawn};
      // Public peers carry projected item definitions, including combinations
      // that only the layered world renderer can assemble.
      wire.lobby={players:[{id:'equipped-peer',name:'Vigia',classId:'sword',factionId:'pirate',
        appearance96:{version:1,gender:'masculino',hairStyle:'original',skinStyle:'natural',skinColor:'light',eyeStyle:'original',eyeColor:'blue',hairColor:'black'},
        equipment:{weapon:{def:68},head:{def:143},coat:{def:137},legs:{def:21},gloves:{def:25},boots:{def:9},cloak:{def:156}},
        world:{...wire.world,position:{x:wire.world.position.x+32,y:wire.world.position.y}}}]};
      wire.state.version++;
    }
    else {res.writeHead(404).end(); return;}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return;
  }
  if (url.pathname === '/game') {res.setHeader('Content-Type','text/html');res.end(html);return;}
  const relative = decodeURIComponent(url.pathname).slice(1);
  if (onDemand && remoteRegion(relative)) {
    detectUnexpected(relative);
    res.writeHead(503).end();
    return;
  }
  if (onDemand && relative==='assets/exported-maps/dawn/map.png') await mapGate;
  const online = relative.startsWith('online/');
  const base = online ? path.resolve('apps/account-client') : root;
  const file = path.resolve(base,online ? relative.slice(7) : relative);
  if (!file.startsWith(base+path.sep)) {res.writeHead(404).end();return;}
  try {
    const info = await stat(file);
    if (!info.isFile()) throw Error('not a file');
    if (url.searchParams.has('install')) transfers++;
    res.once('finish', () => {
      transferBytes += info.size;
      requested.set(relative, (requested.get(relative) || 0) + info.size);
    });
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Content-Length':info.size});
    createReadStream(file).pipe(res);
  } catch {res.writeHead(404).end();}
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  if (process.argv.includes('--serve')) {
    releaseControl();
    console.log('Local loading fixture: http://127.0.0.1:'+server.address().port+'/game');
    return;
  }
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
  try {
    const context = await browser.newContext({viewport:{width:1366,height:768}});
    const page = await context.newPage(), errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error')console.error('browser:',message.text());});
    const session = await context.newCDPSession(page);
    await session.send('Storage.overrideQuotaForOrigin',{origin:'http://127.0.0.1:'+server.address().port,quotaSize:2*1024**3});
    await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-byte-for-byte'));
    const acquire = page.waitForRequest(request =>
      request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/control'),
    {timeout:240000});
    const start = performance.now();
    const navigation = Promise.all([page.goto('http://127.0.0.1:'+server.address().port+'/game',{waitUntil:'domcontentloaded'}), acquire]);
    if (onDemand) await Promise.race([navigation, unexpected.then(file => assert.fail('Entry requested a resource too soon: '+file))]);
    else await navigation;
    assert.notEqual(await page.locator('#gameLoading output').textContent(),'100%','100% must wait for the online session, not just the initial lobby image');
    assert(await page.locator('#gameLoading').isVisible());
    releaseControl();
    const shell = page.locator('#gameLoading').waitFor({state:'hidden',timeout:240000});
    if (onDemand) {
      await page.waitForTimeout(450);
      assert(await page.locator('#gameLoading').isVisible(),'a confirmed session still waits for the destination map');
      resumeMap();
      if (process.argv.includes('--fast-entry')) {
        const quick = page.getByRole('button',{name:'Entrar com meu equipamento'});
        await quick.click({timeout:90000});
      }
      await Promise.race([shell, unexpected.then(file => assert.fail('Entry requested deferred art: '+file))]);
    } else await shell;
    await page.waitForFunction(()=>document.querySelector('#gameFrame').dataset.worldState==='ready');
    if (onDemand) {
      assert.equal(unexpectedPath,undefined);
      const entryBytes = transferBytes;
      const largest = [...requested].sort((a,b)=>b[1]-a[1]).slice(0,10);
      console.log('Cold playable: '+Math.round(performance.now()-start)+' ms, '+entryBytes+' bytes, '+requested.size+' files');
      console.log('Largest transfer totals:', JSON.stringify(largest));
      assert(await page.evaluate(()=>window.__mareDiagnostics().lobby96.worldVisual?.firstDrawAt != null),
        'the equipped character must have been drawn before releasing input');
      const inventory = page.getByRole('button',{name:'Inventário',exact:true});
      await inventory.click();
      await page.locator('#panelOverlay').waitFor({state:'visible'});
      await page.keyboard.press('Escape');
      await page.locator('#panelOverlay').waitFor({state:'hidden'});
    }
    assert.equal(await page.evaluate(()=>window.__mareDiagnostics().map.id),'dawn','the restored server map must be ready before entry');
    assert.equal(await page.evaluate(()=>window.__mareDiagnostics().map.navigation.ready),true);
    assert.equal(await page.evaluate(()=>window.MareGameSession.controlled),true);
    assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('#app').evaluate(el=>getComputedStyle(el).visibility),'visible');
    if (onDemand) assert.equal(await page.locator('#worldLoading').isVisible(),false);
    else assert.equal(await page.locator('#worldLoading').count(),0,'there must be no second in-game loading overlay');
    assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-byte-for-byte');
    const installed = transfers;
    if (onDemand) await page.waitForFunction(() => window.__mareDiagnostics().lobby96.worldVisual?.firstDrawAt != null);
    if (process.env.MARE_QA_DIR) {
      mkdirSync(process.env.MARE_QA_DIR,{recursive:true});
      await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'online-entry-desktop.png')});
    }
    await page.setViewportSize({width:393,height:852});
    await page.reload();
    await page.locator('#gameLoading').waitFor({state:'hidden',timeout:240000});
    if (!onDemand) assert.equal(transfers,installed,'a warm mobile reload must reuse the complete installation');
    await page.waitForFunction(()=>document.querySelector('#gameFrame').dataset.worldState==='ready');
    assert.equal(await page.evaluate(()=>window.__mareDiagnostics().map.id),'dawn');
    if (onDemand) await page.waitForFunction(() => window.__mareDiagnostics().lobby96.worldVisual?.firstDrawAt != null);
    if (process.env.MARE_QA_DIR) await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'online-entry-mobile.png')});
    stateFailure = true;
    await page.reload();
    await page.getByRole('button',{name:'Tentar novamente'}).waitFor({state:'visible'});
    assert.match(await page.locator('#gameLoading [role=status]').innerText(),/carregar seu personagem/);
    assert.notEqual(await page.locator('#gameLoading output').textContent(),'100%');
    assert.equal(await page.locator('#gameLoading').count(),1,'a server failure keeps the same loader and its retry button');
    stateFailure = false;
    await page.getByRole('button',{name:'Tentar novamente'}).click();
    await page.locator('#gameLoading').waitFor({state:'hidden',timeout:240000});
    if (!onDemand) assert.equal(transfers,installed,'retrying session setup must not reinstall game content');
    await page.locator('#returnLobby').click();
    await page.waitForFunction(()=>window.__mareDiagnostics().map.id==='lobby' &&
      document.querySelector('#gameFrame').dataset.worldState==='ready' && document.querySelector('#gameLoading').hidden);
    if (!onDemand) assert.equal(transfers,installed,'travelling uses the installed maps, not another download');
    if (onDemand) assert.equal(unexpectedPath,undefined);
    await page.waitForFunction(()=>{
      const lobby=window.__mareDiagnostics().sharedLobby;
      return lobby.players.some(p=>p.name==='Vigia')&&lobby.draws>=3;
    },null,{timeout:45000});
    assert.deepEqual(errors,[]);
    console.log('Online loading: delayed control, restored map, one overlay, desktop/mobile, warm cache and demo isolation passed.');
    await context.close();
  } finally {
    resumeMap();releaseControl();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
