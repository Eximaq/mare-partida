'use strict';
// Exercises the real game HUD and commands against an isolated wire fixture.
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const {chromium}=require('playwright');
const characters=require('../character-system.js');
const catalog=require('../character-catalog.js').create({characters});
const forge=require('../forge-system.js');
const itemCatalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const actor={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const peer={id:'22222222-2222-4222-8222-222222222222',name:'Lia do Farol'};
const listingId='33333333-3333-4333-8333-333333333333';
const auctionId='44444444-4444-4444-8444-444444444444';
const proposalId='55555555-5555-4555-8555-555555555555';
const ownId='66666666-6666-4666-8666-666666666666';
const fruitId='77777777-7777-4777-8777-777777777777';
const incomingId='88888888-8888-4888-8888-888888888888';
const saleId='99999999-9999-4999-8999-999999999999';
const mailId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now=new Date().toISOString(), tomorrow=new Date(Date.now()+86400000).toISOString();
const weaponDef=itemCatalog.items[1];
const sabre={instanceId:'dev-sabre',catalogId:1,name:weaponDef.name,slot:'weapon',classId:'sword',category:'weapons',rarity:'epic',level:28,potential:72,upgrade:2,origin:'native',attributes:{attack:52,strength:9},pearls:[{name:'Pérola de Força'}],quantity:1};
const coat={instanceId:'dev-coat',catalogId:6,name:itemCatalog.items[6].name,slot:'coat',category:'armor',rarity:'rare',level:20,potential:66,upgrade:1,origin:'basic',attributes:{defense:15},quantity:1};
const fruitDef=Object.keys(itemCatalog.items).find(id=>/Mera[- ]Mera/i.test(itemCatalog.items[id].name));
const fruit={instanceId:'dev-fruit',catalogId:Number(fruitDef),name:'Mera-Mera no Mi',slot:'akuma_no_mi',category:'fruits',rarity:'supreme',rank:'S',fruitType:'logia',quantity:1};
const npc={...peer,name:'<b>Lia</b> do Farol'};
const base={status:'active',feeBps:1000,createdAt:now,expiresAt:tomorrow,version:3,quantity:1};
const direct={...base,id:listingId,item:sabre,seller:peer,mode:'direct',directPrice:19000};
const auction={...base,id:auctionId,item:coat,seller:peer,mode:'auction',minOffer:1000,buyNow:9000,highestOffer:2600};
const foreignFruit={...base,id:fruitId,item:fruit,seller:npc,mode:'direct',directPrice:26500};
const incoming={id:incomingId,version:1,amount:10019,status:'pending',buyer:peer,createdAt:now};
const ownAuction={...base,id:ownId,feeBps:1500,item:coat,seller:actor,mode:'auction',minOffer:8000,buyNow:null,highestOffer:10019,proposals:[incoming]};
const equipment=Object.fromEntries([...itemCatalog.inventorySlotsLeft,...itemCatalog.inventorySlotsRight].map(key=>[key,null]));
const allocation={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const stats=characters.derive({classId:'sword',level:45,attributes:allocation},catalog.classes.sword,catalog.factions.pirate,forge.aggregate(equipment,itemCatalog.items));
const wire={marketAvailable:true,socialAvailable:true,combatPreview:{rulesetId:'original-character-v1',stats,maxHp:stats.maxHP},state:{characterId:actor.id,version:1,level:45,experience:'5000',gold:'40000'},inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],
  originalInventory:{catalogId:'original-game-v1',inventory:[{id:'dev-sabre',def:1,level:28,plus:2,rarity:'epic',potential:72,locked:false}],equipment,potions:4,manaPotions:2,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]},
  attributes:{allocated:allocation,available:0},progression:{xpIntoLevel:'0',xpForNextLevel:'500'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked'}};
(async()=>{
  const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8194/';
  const out=process.env.MARE_QA_DIR||path.join(os.tmpdir(),'mare-market-browser');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[], commands=[], queries=[];
  let bought=false, offered=null, published=false, sold=false, collected=false, noticesRead=false, droppedBuy=false, showAccepted=false;
  const activeListings=()=>[...(bought?[]:[direct]), {...auction,ownProposal:offered?.status==='pending'?offered:null}, foreignFruit];
  const wallet=()=>({available:40000-(offered?.reserved??0)-(bought?19000:0)+(collected?8517:0),reserved:offered?.reserved??0,receivable:sold&&!collected?8517:0});
  const pending=()=>!sold&&!noticesRead || (sold&&!collected) ? 1 : 0;
  const marketData=(view,q)=>{
    const summary={wallet:wallet(),feeBps:1000,durations:[24,48,72],page:1,hasMore:false,pending:pending()};
    if(view==='badge')return {pending:pending()};
    if(view==='market')return {...summary,entries:activeListings().filter(l=>
      (!q.has('q') || l.item.name.toLowerCase().includes(q.get('q').toLowerCase()))&&
      (!q.has('rank') || l.item.rank===q.get('rank'))&&(!q.has('rarity') || l.item.rarity===q.get('rarity'))&&
      (!q.has('mode') || l.mode===q.get('mode')))};
    if(view==='inventory')return {...summary,entries:published?[]:[sabre]};
    if(view==='offers')return {...summary,entries:[...(offered?[{...offered,listing:auction,buyer:actor}]:[]), ...(showAccepted?[{id:'accepted-fixture',status:'accepted',amount:19000,reserved:0,createdAt:now,listing:direct,buyer:actor}]:[])]};
    if(view==='sales')return {...summary,notices:sold||noticesRead?[]:[{id:incomingId,kind:'proposal_received',listingId:ownId,createdAt:now}],
      entries:[...(sold?[{...ownAuction,status:'sold',proposals:[],sale:{id:saleId,buyer:peer,gross:10019,fee:1502,net:8517,soldAt:now,collectedAt:collected?now:null}}]:[ownAuction]),
      ...(published?[{...base,id:'fresh',item:sabre,mode:'direct',directPrice:10019,seller:actor}]:[])]};
    if(view==='purchases')return {...summary,entries:bought&&(!q.has('listingId')||q.get('listingId')===listingId)?[{id:listingId,listing:direct,buyer:actor,gross:19000,fee:1900,net:17100,soldAt:now,mailId,deliveredAt:null}]:[]};
    throw new Error('Unexpected view '+view);
  };
  const screenshot=file=>page.screenshot({path:path.join(out,file)});
  const tab=title=>page.locator('.market-tabs').getByRole('button',{name:title,exact:true});
  const confirm=()=>page.locator('[data-confirm-accept]');
  const cmd=kind=>commands.find(c=>c.payload?.kind===kind)?.payload;
  const submitAndWait=async (kind,message)=>{
    await confirm().click();
    await page.waitForFunction(expected=>document.querySelector('.market-notice')?.textContent.includes(expected),message);
    await page.waitForFunction(()=>!MareGameSession.busy&&!document.querySelector('.confirmation-overlay')&&document.querySelector('.market-scroll')?.getAttribute('aria-busy')==='false');
    assert(cmd(kind),kind+' did not reach the server');
  };
  try {
    page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
    await page.route('https://**/*',r=>r.abort());
    await page.route(url,async r=>{
      const response=await r.fetch(),html=await response.text();
      const scripts='<script defer src="apps/account-client/game-session.js"></script><script defer src="apps/account-client/game-ui.js"></script>';
      await r.fulfill({response,body:html.includes('account-client/game-session.js')?html:html.replace(/<script defer src="game\.js/,scripts+'<script defer src="game.js')});
    });
    // Reach the real NPC interaction function without depending on camera coordinates.
    await page.route(new URL('game.js',url).href+'*',async r=>{
      const response=await r.fetch(),js=await response.text();
      const marker='  function activateNPC(npc)';
      assert(js.includes(marker));
      const hook="  window.__openTestMerchant=()=>activateNPC(npcs.find(npc=>npc.kind==='shop'));\n";
      await r.fulfill({response,body:js.replace(marker,hook+marker)});
    });
    await page.route('**/v1/**',r=>{
      const request=new URL(r.request().url()),p=request.pathname,q=request.searchParams;
      const reply=body=>r.fulfill({json:body});
      if(p==='/v1/me')return reply({character:actor});
      if(p.endsWith('/auth/csrf'))return reply({csrfToken:'fixture'});
      if(p.endsWith('/online-state'))return reply(wire);
      if(p.endsWith('/control')||p.endsWith('/renew'))return reply({epoch:1,token:'x'.repeat(43)});
      if(p.endsWith('/market')){
        queries.push(Object.fromEntries(q));
        return reply(marketData(q.get('view')||'market',q));
      }
      if(p.endsWith('/social')){
        if(q.get('view')==='badge')return reply({friendRequests:0,unreadMessages:0,pending:bought?1:0,tradeInvites:0,marketPending:pending()});
        if(q.get('view')==='mail')return reply({pending:1,unread:1,nextCursor:null,letters:[{id:mailId,source:'market',title:'Compra do Mercado',message:'Sua encomenda chegou.',createdAt:now,readAt:null,claimedAt:null,attachments:[{id:'dev-purchase',def:1,level:28,plus:2,rarity:'epic',potential:72}]}]});
      }
      if(p.endsWith('/commands')){
        const c=r.request().postDataJSON(), input=c.payload;commands.push(c);
        if(input.kind==='market_buy'){
          bought=true;
          if(!droppedBuy){droppedBuy=true;return r.abort('failed');}
        }
        if(input.kind==='market_read_notices')noticesRead=true;
        if(input.kind==='market_publish')published=true;
        if(input.kind==='market_offer')offered={id:proposalId,version:(offered?.version??0)+1,status:'pending',amount:input.amount,reserved:input.amount,createdAt:now};
        if(input.kind==='market_withdraw')offered={...offered,status:'withdrawn',reserved:0};
        if(input.kind==='market_accept')sold=true;
        if(input.kind==='market_collect')collected=true;
        return reply({});
      }
      return reply({});
    });
    await page.goto(url);
    await page.waitForFunction(()=>window.MareGameSession?.controlled&&document.querySelector('#socialMenuTrigger'),{},{timeout:15000});
    const chatClose=page.locator('#floatingChat.hud-open [data-close-window]');
    if(await chatClose.isVisible())await chatClose.click();
    assert.equal(await page.locator('#mainMenu > [data-panel=market]').count(),0);
    await page.locator('#socialMenuTrigger').click();
    const menu=page.locator('#socialQuickMenu');
    assert.equal(await menu.locator('[role=menuitem]').count(),7);
    assert.equal(await menu.locator('[data-social-open=trade]').count(),1);
    await menu.getByRole('menuitem',{name:/Mercado dos Mares/i}).waitFor();
    await menu.locator('[data-market-badge]:not([hidden])').waitFor();
    await screenshot('01-social.png');
    await menu.locator('[data-market-open]').click();
    await page.locator('.market-listing').first().waitFor();
    assert.equal(await page.locator('.market-tabs button:not([data-market-action=help])').count(),5);
    await page.waitForFunction(()=>[...document.querySelectorAll('.market-results .market-item-art img')].some(i=>i.complete&&i.naturalWidth>0));
    await screenshot('02-mercado.png');
    const socialRows=await page.locator('.market-listing').allTextContents();
    const socialWallet=await page.locator('.market-wallet').textContent();
    const socialQuery=queries.find(q=>q.view==='market');
    await page.locator('#closePanel').click();
    await page.evaluate(()=>window.__openTestMerchant());
    await page.locator('.merchant-shop').waitFor();
    assert.equal(await page.locator('.merchant-shop [data-merchant-order=mana]').count(),1);
    assert.equal(await page.locator('.merchant-shop [data-merchant-order=health]').count(),1);
    assert.equal(await page.locator('.market-tabs').count(),0);
    await screenshot('08-mercador.png');
    await page.locator('.merchant-market-link [data-market-open]').click();
    await page.locator('.market-listing').first().waitFor();
    assert.deepEqual(await page.locator('.market-listing').allTextContents(),socialRows);
    assert.equal(await page.locator('.market-wallet').textContent(),socialWallet);
    assert.deepEqual(queries.findLast(q=>q.view==='market'),socialQuery);
    await page.locator('.market-advanced summary').click();
    await page.locator('select[name=rank]').evaluate(el=>{el.value='S';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.locator('select[name=rarity]').evaluate(el=>{el.value='supreme';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.getByRole('button',{name:'Aplicar filtros'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.market-listing').length===1);
    assert(queries.some(q=>q.rank==='S'&&q.rarity==='supreme'));
    assert.match(await page.locator('.market-listing').textContent(),/Mera-Mera/);
    assert.equal(await page.locator('.market-inspect dd b').count(),0,'Public seller name is plain text');
    assert.match(await page.locator('.market-inspect').textContent(),/<b>Lia<\/b> do Farol/);
    await page.getByRole('button',{name:'Limpar filtros'}).click();
    await page.locator('.market-listing[data-market-id="'+auctionId+'"]').click();
    await page.locator('.market-inspect [name=amount]').fill('12000');
    await page.getByRole('button',{name:'Revisar proposta'}).click();
    assert.match(await page.locator('.confirmation-result').textContent(),/9\.000 Berry/);
    await page.locator('[data-confirm-cancel]').click();
    assert.equal(commands.length,0,'An offer above buy-now waits for a separate explicit confirmation');
    await page.locator('.market-inspect [name=amount]').fill('2800');
    await page.getByRole('button',{name:'Revisar proposta'}).click();
    await submitAndWait('market_offer','Proposta enviada');
    assert.equal(cmd('market_offer').amount,2800);
    await tab('Minha Proposta').click();
    await page.locator('.market-record').first().waitFor();
    assert.match(await page.locator('.market-record').textContent(),/2\.800 Berry/);
    await screenshot('03-minha-proposta.png');
    await page.locator('.market-record [name=amount]').fill('3000');
    await page.getByRole('button',{name:'Revisar valor'}).click();
    await submitAndWait('market_offer','Proposta enviada');
    assert.equal(commands.filter(c=>c.payload?.kind==='market_offer').at(-1).payload.proposalVersion,1);
    await page.getByRole('button',{name:'Retirar',exact:true}).click();
    await submitAndWait('market_withdraw','Proposta retirada');
    assert.equal(cmd('market_withdraw').proposalVersion,2);
    await tab('Anunciar').click();
    await page.locator('.market-publish-form [name=price]').fill('10019');
    await screenshot('04-anunciar.png');
    await page.getByRole('button',{name:'Revisar anúncio'}).click();
    assert.match(await page.locator('.confirmation-result').textContent(),/taxa 10% \(1\.001 Berry\).*9\.018 Berry/);
    await submitAndWait('market_publish','Anúncio publicado');
    assert.equal(cmd('market_publish').itemId,'dev-sabre');
    await tab('Minhas Vendas').click();
    await page.locator('.market-proposals summary').click();
    await screenshot('05-minhas-vendas.png');
    await page.locator('.market-notices summary').click();
    await page.getByRole('button',{name:'Marcar como lidos'}).click();
    await page.waitForFunction(()=>!document.querySelector('.market-notices')&&!MareGameSession.busy);
    assert.deepEqual(cmd('market_read_notices').noticeIds,[incomingId]);
    await page.getByRole('button',{name:'Aceitar',exact:true}).click();
    assert.match(await page.locator('.confirmation-result').textContent(),/taxa 15% \(1\.502 Berry\).*8\.517 Berry/);
    await submitAndWait('market_accept','Venda concluída');
    assert.equal(cmd('market_accept').proposalVersion,1);
    await page.getByRole('button',{name:'Receber',exact:true}).click();
    await submitAndWait('market_collect','Berry recebido');
    await tab('Mercado').click();
    await page.locator('.market-listing[data-market-id="'+listingId+'"]').click();
    await page.getByRole('button',{name:'Comprar',exact:true}).click();
    await confirm().click();
    await page.waitForFunction(()=>MareGameSession.pending?.payload?.kind==='market_buy'&&!MareGameSession.busy&&!document.querySelector('.confirmation-overlay'));
    await page.getByRole('button',{name:'Consultar operação'}).click();
    await page.waitForFunction(()=>!MareGameSession.pending&&document.querySelector('.market-notice')?.textContent.includes('Operação consultada'));
    const attempts=commands.filter(c=>c.payload?.kind==='market_buy');
    assert.equal(attempts.length,2);
    assert.equal(attempts[0].requestId,attempts[1].requestId,'Recovery replays the original idempotency key');
    assert.deepEqual(attempts[0].payload,attempts[1].payload);
    assert.equal(cmd('market_buy').amount,19000);
    assert.equal(cmd('market_buy').version,3);
    showAccepted=true;
    await tab('Minha Proposta').click();
    await page.getByRole('button',{name:'Ver compra',exact:true}).click();
    await page.getByRole('button',{name:'Abrir Correio'}).waitFor();
    assert(queries.some(q=>q.view==='purchases'&&q.listingId===listingId));
    await screenshot('06-minhas-compras.png');
    await page.getByRole('button',{name:'Abrir Correio'}).click();
    await page.getByText('Compra do Mercado',{exact:true}).waitFor();
    await page.locator('#closePanel').click();
    async function marketViews() {
      const views=[];
      for(const name of ['Mercado','Minha Proposta','Minhas Vendas','Minhas Compras']){
        await tab(name).click();
        await page.locator('.market-scroll[aria-busy="false"]').waitFor();
        views.push([await page.locator('.market-scroll').textContent(),await page.locator('.market-wallet').textContent()]);
      }
      await page.locator('#closePanel').click();
      return views;
    }
    await page.evaluate(()=>window.__openTestMerchant());
    await page.locator('.merchant-market-link [data-market-open]').click();
    const npcViews=await marketViews();
    await page.locator('#socialMenuTrigger').click();
    await menu.locator('[data-market-open]').click();
    assert.deepEqual(await marketViews(),npcViews,'Both entry points expose the same offers, proposals, sales, purchases and wallet');
    await page.setViewportSize({width:430,height:844});
    await page.locator('#socialMenuTrigger').click();
    await menu.locator('[data-market-open]').click();
    await page.locator('.market-listing').first().waitFor();
    assert(await page.locator('.market-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Market has no horizontal overflow on mobile');
    await screenshot('07-mobile.png');
    assert.deepEqual(errors,[]);
    console.log('Mercado aberto pelo Social. Cinco abas, filtros, inspeção, publicação, propostas, aceite, compra com retomada, mesmo mercado pelo NPC, Correio e mobile validados no Chromium.');
    console.log(out);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
