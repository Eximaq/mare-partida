'use strict';
// Real client and HUD in Chromium. HTTP fixtures here complement the separate server integration suite.
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const {chromium}=require('playwright');
const A=require('../character-appearance.js');
const classes=require('../character-system.js');
const catalog=require('../character-catalog.js').create({characters:classes});
const forge=require('../forge-system.js');
const itemCatalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const player={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const peer={id:'22222222-2222-4222-8222-222222222222',name:'Lia do Farol',classId:'healer',factionId:'marine',level:46,online:true,
  appearance96:A.defaults,equipment:{},crew:{tag:'FAR',flag:'1'.repeat(1024)},actions:{message:null,party:'party_full',crew:'crew_not_joined'}};
const letterId='33333333-3333-4333-8333-333333333333';
const tradeId='44444444-4444-4444-8444-444444444444';
const requestId='55555555-5555-4555-8555-555555555555';
const now=new Date().toISOString();
const item=(name,id,level)=>({id,def:Number(Object.entries(itemCatalog.items).find(([,x])=>x?.name?.includes(name))[0]),level,plus:2,rarity:'rare',potential:72,locked:false,origin:'Teste isolado'});
const weapon=item('Sabre','dev-sabre',28),armor=item('Casaco','dev-casaco',25),extra=item('Botas','dev-botas',26);
const stock=Array.from({length:49},(_,index)=>({...([extra,weapon,armor][index%3]),id:'stock-'+index}));
const equipment=Object.fromEntries([...itemCatalog.inventorySlotsLeft,...itemCatalog.inventorySlotsRight].map(key=>[key,null]));
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const stats=classes.derive({classId:'sword',level:45,attributes:allocated},catalog.classes.sword,catalog.factions.pirate,forge.aggregate(equipment,itemCatalog.items));
const wire={combatPreview:{rulesetId:'original-character-v1',stats,maxHp:stats.maxHP},socialAvailable:true,state:{characterId:player.id,version:1,level:45,experience:'5000',gold:'40000'},inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],
  originalInventory:{catalogId:'original-game-v1',inventory:[weapon],equipment,potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]},
  attributes:{allocated:{strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0},available:0},progression:{xpIntoLevel:'0',xpForNextLevel:'500'},
  journey:{started:false},hunt:{status:'locked'},combat:{status:'locked'}};

(async()=>{
  const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8191/';
  const out=process.env.MARE_QA_DIR||path.join(os.tmpdir(),'mare-social-browser');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],commands=[],faults=[];
  let unread=1, claimed=false, accepted=false, locked=false, peerLocked=false, confirmed=false, offered=false, completed=false, cancelled=false, offerVersion=2;
  let messages=[{id:'1',senderId:peer.id,body:'<b>Olá!</b> Tudo pronto para zarpar?',sentAt:now}];
  const last=()=>messages.at(-1);
  const availableTrade=()=>({id:tradeId,status:accepted?'active':'pending',initiatorId:peer.id,partnerId:peer.id,partnerName:peer.name,expiresAt:new Date(Date.now()+80000).toISOString(),offerVersion,ownLocked:locked,peerLocked,ownConfirmed:confirmed,peerConfirmed:false,ownItems:offered?[{item:weapon,quantity:1}]:[],peerItems:accepted?[{item:armor,quantity:1}]:[]});
  const screenshot=filename=>page.screenshot({path:path.join(out,filename)});
  try{
    page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
    page.on('response',r=>{if(r.status()>=400&&/social-ui/.test(r.url()))faults.push(r.url());});
    await page.route('https://**/*',r=>r.abort());
    await page.route(url,async r=>{
      const response=await r.fetch(),html=await response.text();
      const scripts='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';
      await r.fulfill({response,body:html.includes('account-client/game-session.js')?html:html.replace(/<script defer src="game\.js/,scripts+'<script defer src="game.js')});
    });
    await page.route('**/v1/**',r=>{
      const request=new URL(r.request().url()),p=request.pathname,q=request.searchParams;
      const reply=body=>r.fulfill({json:body});
      if(p==='/v1/me')return reply({character:player});
      if(p.endsWith('/auth/csrf'))return reply({csrfToken:'fixture'});
      if(p.endsWith('/online-state'))return reply(wire);
      if(p.endsWith('/control')||p.endsWith('/renew'))return reply({epoch:1,token:'x'.repeat(43)});
      if(p.endsWith('/social')){
        const view=q.get('view');
        if(view==='badge')return reply({friendRequests:0,unreadMessages:unread,pending:claimed?0:1,tradeInvites:accepted?0:1});
        if(view==='contacts')return reply({friends:[peer],incoming:[],outgoing:[],blocked:[],matches:q.get('q')?[{...peer,friendState:'accepted'}]:[],onlineCount:1,conversations:[{character:peer,lastMessage:last(),unread}]});
        if(view==='messages')return reply({character:peer,messages:messages.filter(m=>!q.has('after')||+m.id>+q.get('after')),hasMore:false});
        if(view==='mail')return reply({pending:claimed?0:1,unread:claimed?0:1,nextCursor:null,letters:(q.get('tab')==='claimed')===claimed?[{id:letterId,source:'dungeon',title:'Baú de Morgan',message:'Recompensa por vencer Morgan.',createdAt:now,readAt:null,claimedAt:claimed?now:null,attachments:[armor]}]:[]});
        if(view==='trade')return reply({trade:completed||cancelled?null:availableTrade(),eligibleItems:offered?[extra,...stock]:[weapon,extra,...stock],invites:[],history:completed?[{id:tradeId,partnerName:peer.name,completedAt:now,sent:[{item:weapon,quantity:1}],received:[{item:armor,quantity:1}]}]:[]});
      }
      if(p.endsWith('/commands')){
        const c=r.request().postDataJSON();commands.push(c);
        if(c.action==='message.read')unread=0;
        if(c.action==='message.send')messages.push({id:'2',senderId:player.id,body:c.payload.body,sentAt:now});
        if(c.action==='mail.claim'||c.action==='mail.claim-all'){claimed=true;return reply({mail:{claimed:[letterId],pending:[]}});}
        if(c.action==='trade.respond')accepted=true;
        if(c.action==='trade.offer'){offered=true;offerVersion++;}
        if(c.action==='trade.lock')locked=c.payload.locked;
        if(c.action==='trade.confirm')confirmed=true;
        if(c.action==='trade.cancel')cancelled=true;
        return reply({});
      }
      return reply({});
    });
    await page.goto(url);
    await page.waitForFunction(()=>window.MareGameSession?.controlled&&document.querySelector('#socialMenuTrigger'),{},{timeout:12000}).catch(async e=>{console.error(await page.evaluate(()=>({text:document.body.innerText.slice(0,300),control:window.MareGameSession?.controlled,available:window.MareGameSession?.available,data:window.MareGameSession?.data?.character,title:document.title})));throw e;});
    const chatClose=page.locator('#floatingChat.hud-open [data-close-window]');
    if(await chatClose.isVisible())await chatClose.click();
    const open=async(id)=>{
      const close=page.locator('.social-mode #closePanel');
      if(await close.isVisible())await close.click();
      await page.locator('#socialMenuTrigger').click();
      await page.locator('#socialQuickMenu [data-social-open="'+id+'"]').click();
      assert.equal(await page.locator('#dialogBody [data-social-open]').count(),0,'Independent Social panel; shortcuts belong only to the main Social menu');
    };
    await page.locator('#socialMenuTrigger').click();
    await page.locator('#chatCornerToggle[data-private-unread="1"]').waitFor({state:'attached'});
    assert.equal(await page.locator('#socialQuickMenu [role=menuitem]').count(),6);
    await screenshot('01-social.png');
    await page.locator('#socialQuickMenu [data-social-open="friends"]').click();
    await page.getByText('1 de 1 online',{exact:false}).waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelector('canvas[data-social-portrait]').getContext('2d').getImageData(0,0,48,52).data).some((n,i)=>i%4===3&&n>0));
    assert.equal(await page.getByRole('button',{name:'Convidar para Party'}).isDisabled(),true);
    await screenshot('02-amigos.png');
    await page.locator('#closePanel').click();
    assert.equal(await page.locator('#socialQuickMenu [data-social-open=messages]').count(),0);
    await page.locator('#chatCornerToggle').click();
    await page.locator('#floatingChat [data-private-tab]').click();
    await page.locator('.social-chat-log article').waitFor();
    assert.equal(await page.locator('.social-chat-log p b').count(),0);
    assert.match(await page.locator('.social-chat-log p').textContent(),/<b>Olá!<\/b>/);
    await page.waitForFunction(()=>!window.MareGameSession.busy);
    await page.locator('#chatInput').fill('Vamos, tripulação!');
    await page.locator('#chatInput').press('Enter');
    await page.getByText('Vamos, tripulação!',{exact:true}).waitFor();
    assert(!commands.some(c=>c.action==='battle.skill'));
    assert(await page.locator('.social-chat-log').evaluate(el=>el.clientHeight>=76),'Private chat needs room for more than one line');
    await screenshot('03-mensagem-privada.png');
    await page.locator('[data-chat-channel="system"]').click();
    assert.equal(await page.locator('.social-thread').isVisible(),false);
    await page.locator('#floatingChat [data-close-window]').click();
    await open('mail');await page.getByText('Baú de Morgan',{exact:true}).waitFor();
    await screenshot('04-correio.png');
    await page.getByRole('button',{name:'Resgatar',exact:true}).click();
    await page.getByText('Nenhuma recompensa pendente.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Resgatadas',exact:true}).click();
    await page.getByText('Baú de Morgan',{exact:true}).waitFor();
    await open('trade');
    await page.locator('.trade-invite[data-trade-tone="proposed"]').waitFor();
    await page.getByRole('button',{name:'Aceitar',exact:true}).click();
    await page.getByText('Seu inventário negociável',{exact:true}).waitFor();
    await page.locator('.trade-steps [aria-current="step"]').getByText('Propor itens').waitFor();
    await page.locator('.social-offer[data-trade-tone="proposed"]').first().waitFor();
    const glass=await page.locator('.social-mode .dialog').evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {width:r.width,height:r.height,border:s.borderTopWidth,image:s.borderImageSource,radius:s.borderTopLeftRadius,blur:s.backdropFilter,font:getComputedStyle(document.querySelector('.trade-desk')).fontFamily};
    });
    assert(Math.abs(glass.width-1180)<2&&Math.abs(glass.height-702)<2,'Trade shares inventory dimensions: '+JSON.stringify(glass));
    assert.equal(glass.border,'1px');assert.equal(glass.image,'none');assert.equal(glass.radius,'12px');assert.match(glass.blur,/blur/);assert.match(glass.font,/Inter|system-ui/);
    assert.equal(await page.locator('.trade-steps svg').count(),3,'Steps use crisp vector icons');
    await screenshot('05a-troca-proposta.png');
    for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
      await page.setViewportSize({width,height});
      assert(await page.locator('.trade-actions').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'Ações visíveis durante a edição');
      assert(await page.locator('.social-content').evaluate(el=>el.scrollWidth<=el.clientWidth+2),'Troca cabe sem rolagem horizontal');
      assert(await page.locator('.social-bag-grid').evaluate(el=>el.scrollHeight>el.clientHeight),'Mochila extensa rola dentro da grade');
      assert(await page.locator('.social-tile').first().evaluate(el=>Math.abs(el.offsetWidth-el.offsetHeight)<=1),'Item slots stay square');
      if(height===390){
        await page.locator('.trade-workspace').evaluate(el=>el.scrollTop=50);
        peer.name='Lia do Farol — navegadora';
        await page.locator('.trade-offer-head').getByText(peer.name,{exact:true}).waitFor();
        assert(await page.locator('.trade-workspace').evaluate(el=>el.scrollTop>=45),'Live refresh preserves the negotiation scroll position');
        peer.name='Lia do Farol';
      }
      await screenshot('05b-troca-'+width+'.png');
    }
    await page.setViewportSize({width:1440,height:900});
    const confirm=page.getByRole('button',{name:'Confirmar troca',exact:true});
    assert.equal(await confirm.isDisabled(),true);
    await page.locator('[data-social-action="offer-add"][data-social-id="dev-sabre"]').click();
    await page.getByRole('button',{name:'Aplicar',exact:true}).click();
    await page.locator('[data-social-action="offer-edit"]').waitFor();
    await page.getByRole('button',{name:'Travar minha oferta',exact:true}).click();
    await page.getByText('Aguardando o outro jogador travar a oferta.').waitFor();
    assert.equal(await page.locator('.social-offer[data-trade-tone="accepted"]').count(),1);
    assert.equal(await confirm.isDisabled(),true);
    peerLocked=true;
    await page.getByText('Você entrega',{exact:true}).waitFor();
    await page.locator('.trade-steps [aria-current="step"]').getByText('Confirmar troca').waitFor();
    assert.equal(await page.locator('.social-bag-grid').count(),0);
    await screenshot('05-troca.png');
    await confirm.click();
    await page.locator('.social-offer[data-trade-tone="confirmed"]').getByText('Confirmada').waitFor();
    assert.equal(commands.find(c=>c.action==='trade.confirm').payload.expectedOfferVersion,3);
    assert.equal(commands.find(c=>c.action==='message.send').payload.targetId,peer.id);
    await page.setViewportSize({width:430,height:860});
    await page.waitForFunction(()=>document.querySelector('.social-mode .dialog')?.getBoundingClientRect().width<430);
    const fits=await page.locator('.social-content').evaluate(el=>el.scrollWidth<=el.clientWidth+2);assert(fits,'Social content must fit mobile width');
    await screenshot('06-social-mobile.png');
    completed=true;
    await page.locator('.trade-outcome[data-trade-tone="confirmed"]').getByText('Troca concluída').waitFor();
    await page.getByText('Histórico de trocas',{exact:true}).click();
    await page.locator('.social-receipt').getByText('Lia do Farol',{exact:false}).first().waitFor();
    completed=false;
    accepted=false;
    await page.locator('.trade-invite').getByRole('button',{name:'Recusar',exact:true}).waitFor();
    await page.getByRole('button',{name:'Aceitar',exact:true}).click();
    await page.getByRole('button',{name:'Cancelar troca',exact:true}).click();
    await page.locator('.trade-outcome[data-trade-tone="closed"]').getByText('Negociação encerrada').waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(faults,[]);
    console.log('Social no Chromium: seis acessos, retrato real, chat e leitura, resgate, oferta/versão, duas etapas de confirmação.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
