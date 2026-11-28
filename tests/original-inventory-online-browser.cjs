'use strict';
// UI contract test only. PostgreSQL transactions/authorization are exercised by
// server-original-inventory.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,manaPotions:2,materials:11,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
const wire={state:{characterId:character.id,version:1,level:2,experience:'80',gold:'535'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
function refreshFighter(){
 const stats=chars.derive({classId:'sword',level:wire.state.level,attributes:wire.attributes.allocated},birth.classes.sword,birth.factions.pirate,forge.aggregate(wire.originalInventory.equipment,catalog.items));
 wire.combatPreview={rulesetId:'original-character-v1',stats,maxHp:stats.maxHP};
}
refreshFighter();
wire.kairoseki='120';
wire.kairosekiShop={vipUntil:0,dropBoostUntil:0,serverNow:Date.now(),crewCreationCost:10,
 prices:{'xp-1h':5,'drop-1h':5,'vip-7d':10,'vip-30d':20}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const out=process.env.MARE_QA_DIR||'tmp/original-online-inventory';fs.mkdirSync(out,{recursive:true});
 let activePage,rejectForge=false,slowForge=false,dropForge=false;const receipts=new Map();
 try{
 const context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:'block'}),p=await context.newPage(),errors=[],commands=[];
  activePage=p;p.setDefaultTimeout(30000);
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',message=>{if(message.text().startsWith('[game] bootstrap_failed'))console.error(message.text());});
  await p.route('https://**/*',route=>route.abort());
  await p.route('**/v1/**',async route=>{
   const request=route.request(),pathname=new URL(request.url()).pathname;
   let body={};
   if(pathname==='/v1/me')body={character};
   else if(pathname==='/v1/auth/csrf')body={csrfToken:'ui-fixture-no-provider'};
   else if(pathname.endsWith('/online-state'))body=wire;
   else if(pathname.endsWith('/control')||pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(pathname.endsWith('/commands')){
    const input=request.postDataJSON();commands.push(input);
    if(receipts.has(input.requestId)){assert.deepEqual(input,receipts.get(input.requestId));await route.fulfill({status:200,contentType:'application/json',body:'{}'});return;}
    if(input.action==='forge.execute'&&rejectForge){rejectForge=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'forge_operation_rejected'})});return;}
    if(input.action==='forge.execute'&&slowForge){slowForge=false;await new Promise(resolve=>setTimeout(resolve,300));}
    assert.equal(input.expectedVersion,wire.state.version);
    assert.deepEqual(Object.keys(input).sort(),['action','control','expectedVersion','payload','requestId']);
    if(input.action==='kairoseki.buy'){
     const {product}=input.payload;
     assert.deepEqual(input.payload,{product});
     assert(['vip-7d','xp-1h','drop-1h'].includes(product));
     wire.kairoseki=String(Number(wire.kairoseki)-wire.kairosekiShop.prices[product]);
     if(product==='vip-7d')wire.kairosekiShop.vipUntil=Date.now()+7*86_400_000;
     else wire.originalInventory.inventory.push({...make(product==='xp-1h'?247:248,'shop-'+product),binding:'character',boundToCharacter:character.id});
    }else if(['items.use-xp-boost','items.use-drop-boost'].includes(input.action)){
     const xp=input.action==='items.use-xp-boost',itemId=xp?'shop-xp-1h':'shop-drop-1h';
     assert.deepEqual(input.payload,{itemId});assert(wire.originalInventory.inventory.some(item=>item.id===itemId));
     wire.originalInventory.inventory=wire.originalInventory.inventory.filter(item=>item.id!==itemId);
     wire.kairosekiShop.serverNow=Date.now();
     const until=wire.kairosekiShop.serverNow+90_000;
     if(xp)wire.contracts={rulesetId:'original-contracts-v1',progress:{},claimed:[],xpBoostUntil:until,xpBoostPercent:50};
     else wire.kairosekiShop.dropBoostUntil=until;
    }else if(input.action==='items.equip'){
     assert.deepEqual(Object.keys(input.payload),['itemId']);const item=wire.originalInventory.inventory.find(i=>i.id===input.payload.itemId);assert(item);
     const slot=catalog.items[item.def].slot,old=wire.originalInventory.equipment[slot];wire.originalInventory.inventory=wire.originalInventory.inventory.filter(i=>i.id!==item.id);wire.originalInventory.equipment[slot]=item;if(old)wire.originalInventory.inventory.push(old);
    }else if(input.action==='forge.execute'){
     assert.deepEqual(Object.keys(input.payload.operation).sort(),['expectedSeq',input.payload.operation.type==='dismantle'?'itemIds':'itemId','type']);
     const result=forge.execute({...wire.originalInventory,gold:Number(wire.state.gold),classId:'sword'},input.payload.operation,catalog.items,()=>0,1);assert(result.ok,result.message);
     const {gold,classId,...next}=result.state;wire.state.gold=String(gold);wire.originalInventory=next;
    }else if(input.action==='attributes.allocate'){
     assert.deepEqual(input.payload,{allocation:{strength:1,dexterity:0,vitality:0,intelligence:0,spirit:0}});
     wire.attributes.allocated.strength++;wire.attributes.available--;
    }else throw Error('Unexpected UI intent '+input.action);
    wire.state.version++;refreshFighter();body={};receipts.set(input.requestId,input);
    if(input.action==='forge.execute'&&dropForge){dropForge=false;await route.abort('failed');return;}
   }else throw Error('Unexpected local API path '+pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{
   const r=await route.fetch(),html=await r.text();
   const boot='<link rel="stylesheet" href="/apps/account-client/game.css"><script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';
   assert.match(html,/<script defer src="game\.js/);
   await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});
  });
  await p.goto(process.env.MARE_TEST_URL);await p.locator('#gameLoading').waitFor({state:'hidden'});
  await p.waitForFunction(()=>window.MareGameSession?.controlled&&!document.body.classList.contains('online-session-loading'));
  await p.waitForFunction(()=>document.querySelector('#miniKairoseki')?.textContent==='120');
  assert.equal(await p.locator('#miniGold').innerText(),'535');
  await p.waitForFunction(()=>document.querySelector('#hudKairoseki img')?.naturalWidth>0);
  for(const width of [1366,390,360]){
    await p.setViewportSize({width,height:768});
    const gold=await p.locator('.profile-berry').boundingBox();
    const kairoseki=await p.locator('#hudKairoseki').boundingBox();
    assert(gold&&kairoseki&&Math.abs(gold.y-kairoseki.y)<1);
    assert(gold.x+gold.width<=kairoseki.x&&kairoseki.x+kairoseki.width<=width);
    for(const id of ['miniGold','miniKairoseki'])assert(await p.locator('#'+id).evaluate(e=>e.scrollWidth<=e.clientWidth));
    await p.locator('.nautical-profile').screenshot({path:path.join(out,'kairoseki-hud-'+width+'.png')});
  }
  await p.setViewportSize({width:1366,height:768});
  assert.match(await p.locator('#hudVip img').evaluate(img=>getComputedStyle(img).filter),/grayscale\(1\)/);
  await p.locator('#hudVip[data-active="false"]').click();
  assert.match(await p.locator('#dialogTitle').innerText(),/Loja de Kairoseki/);
  assert.deepEqual(await p.locator('.kairoseki-offer .kairoseki-currency strong').allTextContents(),['5','5','10','20']);
  assert.deepEqual((await p.locator('.kairoseki-offer h3').allTextContents()).slice(0,2),['Boost de XP (1h)','Boost de Drop (1h)']);
  assert.doesNotMatch(await p.locator('.kairoseki-store').innerText(),/tripulação|\+50% de XP/i);
  await p.locator('[data-kairoseki-help="xp-1h"]').hover();
  await p.locator('#gameTooltip').waitFor({state:'visible'});
  assert.match(await p.locator('#gameTooltip').innerText(),/\+50% de XP.*Não negociável/);
  await p.locator('#dialogTitle').hover();
  await p.waitForFunction(()=>document.querySelectorAll('.kairoseki-offer-art img').length===4&&[...document.querySelectorAll('.kairoseki-offer-art img')].every(img=>img.naturalWidth>0));
  assert(await p.locator('#hudVip span').evaluate(span=>{
    const label=span.getBoundingClientRect(),crown=span.previousElementSibling.getBoundingClientRect();
    return label.top>crown.top+crown.height/2&&Math.abs(label.bottom-crown.bottom)<3;
  }));
  assert.equal(await p.locator('#panelOverlay .dialog').evaluate(dialog=>getComputedStyle(dialog).backgroundColor),'rgba(20, 22, 25, 0.85)');
  assert((await p.locator('#panelOverlay .dialog').boundingBox()).width<=500);
  await p.locator('#panelOverlay .dialog').first().screenshot({path:path.join(out,'loja-kairoseki.png')});
  await p.setViewportSize({width:390,height:844});
  await p.locator('#panelOverlay .dialog').first().screenshot({path:path.join(out,'loja-kairoseki-390.png')});
  await p.locator('[data-kairoseki-help="vip-7d"]').click();
  assert.match(await p.locator('#gameTooltip').innerText(),/Ativação imediata e pessoal/);
  await p.keyboard.press('Escape');
  assert(await p.locator('#gameTooltip').isHidden());
  await p.setViewportSize({width:1366,height:768});
  await p.locator('[data-kairoseki-buy="vip-7d"]').click();
  assert.match(await p.locator('.confirmation-card').innerText(),/10 Kairoseki/);
  assert.equal(await p.locator('.kairoseki-confirmation .confirmation-card').evaluate(card=>getComputedStyle(card).backgroundColor),'rgba(20, 22, 25, 0.85)');
  await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>document.querySelector('#miniKairoseki').textContent==='110'&&document.querySelector('#hudVip').dataset.active==='true');
  assert.doesNotMatch(await p.locator('#hudVip img').evaluate(img=>getComputedStyle(img).filter),/grayscale/);
  await p.locator('#closePanel').click();
  await p.locator('.nautical-profile').screenshot({path:path.join(out,'vip-ativo.png')});
  await p.locator('#socialMenuTrigger').click();
  assert.equal(await p.locator('#kairosekiShopMenu').evaluate(el=>el.previousElementSibling.hasAttribute('data-market-open')),true);
  await p.locator('#kairosekiShopMenu').click();
  assert.match(await p.locator('.kairoseki-store-status').innerText(),/VIP ativo/);
  await p.locator('#closePanel').click();
  await p.keyboard.press('i');await p.waitForSelector('#invSearch');
  await p.locator('[data-item="server-boots"]').click();await p.locator('[data-equip="server-boots"]').click();
  await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.equipment.boots?.id==='server-boots'&&!MareGameSession.busy);
  assert.equal(await p.locator('[data-unequip="boots"]').isEnabled(),true);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#buyPotion').count(),0);
  await p.keyboard.press('f');await p.waitForSelector('[data-forge-action="upgrade"]');
  await p.locator('[data-forge-action="upgrade"]').click();await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.forgeSeq===1&&!MareGameSession.busy);
  assert.equal(wire.state.gold,'35');assert.equal(wire.originalInventory.materials,1);
  assert.equal(await p.locator('[data-forge-tab="imbue"]').isEnabled(),true);
  await p.screenshot({path:path.join(out,'original-online-forge.png')});
  // Revalidation never sends a changed intention; failed responses keep the dialog.
  wire.state.gold='10000';wire.originalInventory.materials=100;wire.state.version++;await p.evaluate(()=>MareGameSession.read());
  await p.locator('[data-forge-action="upgrade"]').click();const beforeStale=commands.length;
  wire.state.version++;await p.evaluate(()=>MareGameSession.read());await p.locator('[data-confirm-accept]').click();
  assert.equal(commands.length,beforeStale);assert.match(await p.locator('.confirmation-card').innerText(),/dados foram atualizados/i);await p.locator('[data-confirm-cancel]').click();
  await p.locator('[data-forge-action="upgrade"]').click();rejectForge=true;const beforeReject=JSON.stringify(wire);
  await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>!MareGameSession.busy&&document.querySelector('[data-confirm-accept]')?.textContent!=='PROCESSANDO…');
  assert.equal(JSON.stringify(wire),beforeReject);assert.equal(await p.locator('.confirmation-overlay').count(),1);
  await p.screenshot({path:path.join(out,'online-confirmation-rejected.png')});await p.locator('[data-confirm-cancel]').click();
  await p.locator('[data-forge-action="upgrade"]').click();slowForge=true;const beforeDouble=commands.length;
  await p.locator('[data-confirm-accept]').evaluate(b=>{b.click();b.click();});
  await p.waitForFunction(()=>!MareGameSession.busy&&MareGameSession.data.online.originalInventory.forgeSeq===2);
  assert.equal(commands.length,beforeDouble+1);await p.waitForSelector('.confirmation-overlay',{state:'detached'});
  // Server applied the next request, but its reply was lost. Resume the SAME request.
  await p.locator('[data-forge-action="upgrade"]').click();dropForge=true;await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>!MareGameSession.busy&&!!MareGameSession.pending);
  assert.equal(wire.originalInventory.forgeSeq,3);const uncertain=JSON.stringify(wire),retained=commands.at(-1).requestId;
  assert.equal(await p.locator('[data-confirm-accept]').isDisabled(),true);
  await p.screenshot({path:path.join(out,'online-confirmation-pending.png')});await p.locator('[data-confirm-cancel]').click();
  await p.locator('[data-online-action="resume"]').click();await p.waitForFunction(()=>!MareGameSession.pending&&!MareGameSession.busy);
  assert.equal(JSON.stringify(wire),uncertain);assert.equal(commands.at(-1).requestId,retained);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),null,'online actions must not create a demo save');
  await p.keyboard.press('Escape');await p.locator('#attributePointsHud').click();
  await p.waitForSelector('[data-attribute-add="strength"]');
  await p.locator('[data-attribute-add="strength"]').click();await p.locator('#confirmAttributes').click();
  await p.waitForFunction(()=>MareGameSession.data.online.attributes.allocated.strength===1&&!MareGameSession.busy);
  await p.waitForFunction(()=>{const c=document.getElementById('characterSprite');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);},null,{timeout:90000});
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(out,'original-online-character.png')});
  assert.equal(await p.locator('#heroPower').textContent(),new Intl.NumberFormat('pt-BR').format(wire.combatPreview.stats.power));

  wire.kairoseki='0';
  await p.reload();await p.locator('#gameLoading').waitFor({state:'hidden'});await p.waitForFunction(()=>window.MareGameSession?.controlled&&!document.body.classList.contains('online-session-loading'));
  await p.waitForFunction(()=>!document.querySelector('#hudKairoseki').hidden&&document.querySelector('#miniKairoseki').textContent==='0');
  assert.deepEqual(await p.evaluate(()=>{const {potions,manaPotions}=MareGameSession.data.online.originalInventory;return [potions,manaPotions];}),[4,2]);
  await p.waitForFunction(()=>document.getElementById('potionCount')?.textContent==='4'&&document.getElementById('manaPotionCount')?.textContent==='2');
  assert.equal(await p.evaluate(()=>MareGameSession.data.online.attributes.allocated.strength),1);
  await p.setViewportSize({width:760,height:900});await p.keyboard.press('i');await p.waitForSelector('#invSearch');
  await p.waitForFunction(()=>window.__mareDiagnostics?.().lobby96.state==='ready',null,{timeout:90000});
  await p.waitForFunction(()=>{const c=document.getElementById('inventorySprite');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);},null,{timeout:90000});
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(out,'original-online-inventory.png')});
  assert.deepEqual(commands.map(c=>c.action),['kairoseki.buy','items.equip','forge.execute','forge.execute','forge.execute','forge.execute','forge.execute','attributes.allocate']);
  const scraps=[make(8,'salvage-a'),{...make(6,'salvage-b'),level:41}];
  wire.originalInventory.inventory.push(...scraps);
  wire.state.version++;await p.evaluate(()=>MareGameSession.read());
  await p.keyboard.press('Escape');await p.setViewportSize({width:390,height:844});await p.keyboard.press('f');
  await p.locator('[data-forge-tab="dismantle"]').click();
  for(const item of scraps)await p.locator('[data-forge-item="'+item.id+'"]').click();
  assert.match(await p.locator('.forge2-operation-content').innerText(),/^\+5\s+Fragmento de Item\b/);
  const before=wire.originalInventory.materials;
  await p.locator('[data-forge-action="dismantle"]').click();
  assert.match(await p.locator('.confirmation-card').innerText(),/Fragmento de Item/);
  await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.forgeSeq===4&&!MareGameSession.busy);
  assert.deepEqual(commands.at(-1).payload.operation,{type:'dismantle',expectedSeq:3,itemIds:scraps.map(i=>i.id)});
  assert.equal(wire.originalInventory.materials,before+5);
  assert(wire.originalInventory.inventory.every(i=>!scraps.some(s=>s.id===i.id)));

  await p.keyboard.press('Escape');
  wire.kairoseki='10';wire.state.version++;await p.evaluate(()=>MareGameSession.read());
  await p.locator('#hudVip').click();
  for(const product of ['xp-1h','drop-1h']){
    await p.locator('[data-kairoseki-buy="'+product+'"]').click();
    await p.locator('[data-confirm-accept]').click();
    await p.waitForFunction(id=>MareGameSession.data.online.originalInventory.inventory.some(item=>item.id===id),'shop-'+product);
    await p.locator('.confirmation-overlay').waitFor({state:'detached'});
  }
  assert(await p.locator('#hudActiveBoosts').isHidden(),'purchase leaves each boost in stock');
  await p.locator('#closePanel').click();
  await p.keyboard.press('i');
  for(const [product,kind] of [['xp-1h','xp'],['drop-1h','drop']]){
    await p.locator('[data-item="shop-'+product+'"]').click();
    assert(await p.getByText('Não negociável',{exact:true}).isVisible());
    await p.locator('[data-use-'+kind+'-boost="shop-'+product+'"]').click();
    await p.waitForFunction(id=>!MareGameSession.busy&&!MareGameSession.data.online.originalInventory.inventory.some(item=>item.id===id),'shop-'+product);
  }
  await p.keyboard.press('Escape');
  const xp=p.locator('#hudBoostXp'),drop=p.locator('#hudBoostDrop');
  await xp.waitFor();await drop.waitFor();
  assert.equal(await xp.locator('b').innerText(),'XP +50%');assert.equal(await drop.locator('b').innerText(),'Drop 2×');
  const initial=await xp.locator('time').textContent();
  await p.waitForFunction(value=>document.querySelector('#hudBoostXp time')?.textContent!==value,initial);
  await p.setViewportSize({width:390,height:844});
  await p.locator('.nautical-profile').screenshot({path:path.join(out,'boosts-mobile.png')});
  await p.setViewportSize({width:1366,height:768});
  await p.locator('#hudActiveBoosts').screenshot({path:path.join(out,'boosts-desktop.png')});
  await p.reload();await p.locator('#gameLoading').waitFor({state:'hidden'});
  await xp.waitFor();await drop.waitFor();
  wire.kairosekiShop.serverNow=Date.now();
  wire.contracts.xpBoostUntil=wire.kairosekiShop.serverNow+800;
  wire.kairosekiShop.dropBoostUntil=wire.kairosekiShop.serverNow-1;
  wire.state.version++;await p.evaluate(()=>MareGameSession.read());
  await p.locator('#hudActiveBoosts').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('Original online HUD contract: inventory, forge, Kairoseki purchases, boost activation, countdown, expiry and reload passed. Provider is a UI fixture; PostgreSQL is tested separately.');
  await context.close();
 }catch(error){if(activePage)await activePage.screenshot({path:path.join(out,'original-online-failure.png')}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
