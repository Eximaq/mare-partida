'use strict';
// UI contract test only. PostgreSQL transactions/authorization are exercised by
// server-original-inventory.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
original.inventory.push({id:'server-fragments',def:catalog.items.findIndex(d=>d.kind==='weapon-fragment'),materialId:forge.weaponFragment.id,quantity:20,rarity:'epic',level:1,plus:0,locked:false,obtainedAt:1,binding:'character',boundToCharacter:character.id});
const wire={state:{characterId:character.id,version:1,level:2,experience:'80',gold:'85'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
function refreshFighter(){
 const stats=chars.derive({classId:'sword',level:wire.state.level,attributes:wire.attributes.allocated},birth.classes.sword,birth.factions.pirate,forge.aggregate(wire.originalInventory.equipment,catalog.items));
 wire.combatPreview={rulesetId:'original-character-v1',stats,maxHp:stats.maxHP};
}
refreshFighter();
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const out=process.env.MARE_QA_DIR||'tmp/original-online-inventory';fs.mkdirSync(out,{recursive:true});
 let activePage,rejectForge=false,slowForge=false,dropForge=false;const receipts=new Map();
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage(),errors=[],commands=[];
  activePage=p;p.setDefaultTimeout(30000);
  p.on('pageerror',e=>errors.push(e.message));
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
    if(input.action==='items.equip'){
     assert.deepEqual(Object.keys(input.payload),['itemId']);const item=wire.originalInventory.inventory.find(i=>i.id===input.payload.itemId);assert(item);
     const slot=catalog.items[item.def].slot,old=wire.originalInventory.equipment[slot];wire.originalInventory.inventory=wire.originalInventory.inventory.filter(i=>i.id!==item.id);wire.originalInventory.equipment[slot]=item;if(old)wire.originalInventory.inventory.push(old);
    }else if(input.action==='forge.execute'){
     const synthesis=input.payload.operation.type==='formEpicWeapon';
     assert.deepEqual(Object.keys(input.payload.operation).sort(),synthesis?['expectedSeq','type']:['expectedSeq','itemId','type']);
     const result=forge.execute({...wire.originalInventory,gold:Number(wire.state.gold),classId:'sword',characterId:character.id,level:wire.state.level},input.payload.operation,catalog.items,()=>0,1);assert(result.ok,result.message);
     const {gold,classId,characterId,level,...next}=result.state;wire.state.gold=String(gold);wire.originalInventory=next;
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
  await p.goto(process.env.MARE_TEST_URL);
  await p.waitForFunction(()=>window.MareGameSession?.controlled&&!document.body.classList.contains('online-session-loading'));
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
  wire.state.gold='5000';wire.originalInventory.materials=100;wire.state.version++;await p.evaluate(()=>MareGameSession.read());
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

  await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&!document.body.classList.contains('online-session-loading'));
  assert.equal(await p.locator('#potionCount').textContent(),'4');assert.equal(await p.evaluate(()=>MareGameSession.data.online.attributes.allocated.strength),1);
  await p.setViewportSize({width:760,height:900});await p.keyboard.press('i');await p.waitForSelector('#invSearch');
  await p.waitForFunction(()=>window.__mareDiagnostics?.().lobby96.state==='ready',null,{timeout:90000});
  await p.waitForFunction(()=>{const c=document.getElementById('inventorySprite');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);},null,{timeout:90000});
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(out,'original-online-inventory.png')});
  await p.locator('[data-item="server-fragments"]').click();
  await p.locator('[data-form-epic-weapon]').click();
  await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>!MareGameSession.busy&&MareGameSession.data.online.originalInventory.inventory.some(i=>i.generation?.source==='synthesis'));
  assert.deepEqual(commands.at(-1).payload,{operation:{type:'formEpicWeapon',expectedSeq:3}});
  assert.equal(wire.originalInventory.inventory.some(i=>i.id==='server-fragments'),false);
  assert.deepEqual(commands.map(c=>c.action),['items.equip','forge.execute','forge.execute','forge.execute','forge.execute','forge.execute','attributes.allocate','forge.execute']);assert.deepEqual(errors,[]);
  console.log('Original online HUD contract: native inventory/forge, strict intents, stock, equipment, stale confirmation, rejection, double click, same-request recovery and reload passed. Provider is a UI fixture; PostgreSQL is tested separately.');
  await context.close();
 }catch(error){if(activePage)await activePage.screenshot({path:path.join(out,'original-online-failure.png')}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
