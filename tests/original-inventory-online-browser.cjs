'use strict';
// UI contract test only. PostgreSQL transactions/authorization are exercised by
// server-original-inventory.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
const wire={state:{characterId:character.id,version:1,level:1,experience:'0',gold:'120'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:0},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const out=process.env.MARE_QA_DIR||'tmp/original-online-inventory';fs.mkdirSync(out,{recursive:true});
 let activePage;
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
    assert.equal(input.expectedVersion,wire.state.version);
    assert.deepEqual(Object.keys(input).sort(),['action','control','expectedVersion','payload','requestId']);
    if(input.action==='potions.buy'){assert.deepEqual(input.payload,{});wire.state.gold=String(BigInt(wire.state.gold)-35n);wire.originalInventory.potions++;}
    else if(input.action==='items.equip'){
     assert.deepEqual(Object.keys(input.payload),['itemId']);const item=wire.originalInventory.inventory.find(i=>i.id===input.payload.itemId);assert(item);
     const slot=catalog.items[item.def].slot,old=wire.originalInventory.equipment[slot];wire.originalInventory.inventory=wire.originalInventory.inventory.filter(i=>i.id!==item.id);wire.originalInventory.equipment[slot]=item;if(old)wire.originalInventory.inventory.push(old);
    }else if(input.action==='forge.execute'){
     assert.deepEqual(Object.keys(input.payload.operation).sort(),['expectedSeq','itemId','type']);
     const result=forge.execute({...wire.originalInventory,gold:Number(wire.state.gold),classId:'sword'},input.payload.operation,catalog.items,()=>0,1);assert(result.ok,result.message);
     const {gold,classId,...next}=result.state;wire.state.gold=String(gold);wire.originalInventory=next;
    }else throw Error('Unexpected UI intent '+input.action);
    wire.state.version++;body={};
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
  await p.keyboard.press('Escape');await p.locator('#buyPotion').click();
  await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.potions===5&&!MareGameSession.busy);
  await p.keyboard.press('f');await p.waitForSelector('[data-forge-action="upgrade"]');
  await p.locator('[data-forge-action="upgrade"]').click();await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.forgeSeq===1&&!MareGameSession.busy);
  assert.equal(wire.state.gold,'35');assert.equal(wire.originalInventory.materials,1);
  assert.equal(await p.locator('[data-forge-tab="imbue"]').isEnabled(),true);
  await p.screenshot({path:path.join(out,'original-online-forge.png')});
  await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&!document.body.classList.contains('online-session-loading'));
  assert.equal(await p.locator('#potionCount').textContent(),'5');
  await p.setViewportSize({width:760,height:900});await p.keyboard.press('i');await p.waitForSelector('#invSearch');
  await p.screenshot({path:path.join(out,'original-online-inventory.png')});
  assert.deepEqual(commands.map(c=>c.action),['items.equip','potions.buy','forge.execute']);assert.deepEqual(errors,[]);
  console.log('Original online HUD contract: native inventory/forge, strict intents, stock, equipment, busy recovery and reload passed. Provider is a UI fixture; PostgreSQL is tested separately.');
  await context.close();
 }catch(error){if(activePage)await activePage.screenshot({path:path.join(out,'original-online-failure.png')}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
