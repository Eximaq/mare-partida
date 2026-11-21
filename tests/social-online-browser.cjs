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
  const contact=(index,name)=>({...peer,id:'66666666-6666-4666-8666-'+String(index).padStart(12,'0'),name,crew:null,actions:{message:null,party:null,crew:null}});
  const joao=contact(1,'João da Maré'),rui=contact(2,'Rui do Porto'),ana=contact(3,'Ana das Velas'),ivo=contact(4,'Ivo das Ilhas');
  const friendRequest=(index,character)=>({id:'77777777-7777-4777-8777-'+String(index).padStart(12,'0'),character,createdAt:now});
  const contacts={friends:[peer],incoming:[],outgoing:[],blocked:[]};
  let mailLetters=[{id:letterId,source:'dungeon',title:'Baú de Morgan',message:'Recompensa por vencer Morgan.',createdAt:now,readAt:null,claimedAt:null,attachments:[armor]}];
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
    await page.route('**/v1/**',async r=>{
      const request=new URL(r.request().url()),p=request.pathname,q=request.searchParams;
      const reply=body=>r.fulfill({json:body});
      if(p==='/v1/me')return reply({character:player});
      if(p.endsWith('/auth/csrf'))return reply({csrfToken:'fixture'});
      if(p.endsWith('/online-state'))return reply(wire);
      if(p.endsWith('/control')||p.endsWith('/renew'))return reply({epoch:1,token:'x'.repeat(43)});
      if(p.endsWith('/social')){
        const view=q.get('view');
        if(view==='badge')return reply({friendRequests:0,unreadMessages:unread,pending:claimed?0:1,tradeInvites:accepted?0:1});
        if(view==='contacts')return reply({...contacts,matches:q.get('q')?[{...joao,friendState:contacts.friends.some(p=>p.id===joao.id)?'accepted':contacts.outgoing.some(r=>r.character.id===joao.id)?'outgoing':'none'}]:[],onlineCount:contacts.friends.filter(p=>p.online).length,conversations:[{character:peer,lastMessage:last(),unread}]});
        if(view==='messages')return reply({character:peer,messages:messages.filter(m=>!q.has('after')||+m.id>+q.get('after')),hasMore:false});
        if(view==='mail'){
          if(q.has('before'))await new Promise(resolve=>setTimeout(resolve,250));
          const filtered=mailLetters.filter(l=>!l.archived&&(q.get('tab')==='claimed')===!!l.claimedAt),offset=q.has('before')?6:0;
          return reply({pending:mailLetters.filter(l=>!l.claimedAt).length,unread:mailLetters.filter(l=>!l.readAt&&!l.claimedAt).length,nextCursor:filtered.length>6&&!offset?'older':null,letters:filtered.slice(offset,offset+6)});
        }
        if(view==='trade')return reply({trade:completed||cancelled?null:availableTrade(),eligibleItems:offered?[extra,...stock]:[weapon,extra,...stock],invites:[],history:completed?[{id:tradeId,partnerName:peer.name,completedAt:now,sent:[{item:weapon,quantity:1}],received:[{item:armor,quantity:1}]}]:[]});
      }
      if(p.endsWith('/commands')){
        const c=r.request().postDataJSON();commands.push(c);
        if(c.action==='friend.request')contacts.outgoing.push(friendRequest(4,joao));
        if(c.action==='friend.cancel')contacts.outgoing=contacts.outgoing.filter(r=>r.id!==c.payload.requestId);
        if(c.action==='friend.respond'){
          const row=contacts.incoming.find(r=>r.id===c.payload.requestId);
          if(c.payload.accept)contacts.friends.push(row.character);
          contacts.incoming=contacts.incoming.filter(r=>r.id!==c.payload.requestId);
        }
        if(c.action==='friend.remove')contacts.friends=contacts.friends.filter(p=>p.id!==c.payload.targetId);
        if(c.action==='contact.block'){
          if(c.payload.blocked){
            const person=contacts.friends.find(p=>p.id===c.payload.targetId);
            contacts.blocked.push({...person,blockedByYou:true});contacts.friends=contacts.friends.filter(p=>p.id!==c.payload.targetId);
          }else contacts.blocked=contacts.blocked.filter(p=>p.id!==c.payload.targetId);
        }
        if(c.action==='message.read')unread=0;
        if(c.action==='message.send')messages.push({id:'2',senderId:player.id,body:c.payload.body,sentAt:now});
        if(c.action==='mail.read')mailLetters.find(l=>l.id===c.payload.mailId).readAt=now;
        if(c.action==='mail.archive')mailLetters.find(l=>l.id===c.payload.mailId).archived=true;
        if(c.action==='mail.archive-claimed')mailLetters.filter(l=>l.claimedAt).forEach(l=>l.archived=true);
        if(c.action==='mail.claim'||c.action==='mail.claim-all'){
          const rows=mailLetters.filter(l=>!l.claimedAt&&(c.action==='mail.claim-all'||l.id===c.payload.mailId));
          rows.forEach(l=>l.claimedAt=now);claimed=true;return reply({mail:{claimed:rows.map(l=>l.id),pending:[]}});
        }
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
    const friendsGlass=await page.locator('.social-mode .dialog').evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {width:r.width,height:r.height,border:s.borderTopWidth,image:s.borderImageSource,radius:s.borderTopLeftRadius,blur:s.backdropFilter};
    });
    assert(Math.abs(friendsGlass.width-400)<2&&Math.abs(friendsGlass.height-580)<2,'Friends uses a compact vertical frame: '+JSON.stringify(friendsGlass));
    assert.equal(friendsGlass.border,'1px');assert.equal(friendsGlass.image,'none');assert.equal(friendsGlass.radius,'12px');assert.match(friendsGlass.blur,/blur/);
    await screenshot('02-amigos.png');
    assert.equal(await page.locator('[data-social-action=profile] svg').count(),1,'Friends controls use labeled vectors');
    await page.getByRole('button',{name:'Ver perfil',exact:true}).click();
    await page.getByRole('heading',{name:'Perfil do personagem'}).waitFor();
    assert(await page.locator('.social-person-large').isVisible());
    await page.getByRole('button',{name:'Voltar',exact:true}).click();
    await page.locator('#socialFriendsFilter').fill('ninguém');
    await page.getByText('Nenhum amigo corresponde ao filtro.',{exact:true}).waitFor();
    await page.locator('#socialFriendsFilter').fill('Lia');
    await page.locator('[data-friends-section=contacts] [data-social-action=profile]').waitFor();
    assert.equal(await page.locator('#socialFriendsFilter').inputValue(),'Lia');
    await page.locator('#socialFriendsFilter').fill('');
    for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
      await page.setViewportSize({width,height});
      const box=await page.locator('.friends-desk').evaluate(el=>{
        const dialog=el.closest('.dialog').getBoundingClientRect(),list=el.querySelector('.friends-list');
        return {left:dialog.left,right:dialog.right,bottom:dialog.bottom,width:dialog.width,overflow:el.scrollWidth>el.clientWidth+1,listHeight:list.clientHeight};
      });
      assert(box.width<=401&&box.left>=0&&box.right<=width&&box.bottom<=height&&!box.overflow&&box.listHeight>80,'Compact Friends fits '+width+': '+JSON.stringify(box));
      if(width===390||width===844)await screenshot('02a-amigos-'+width+'.png');
    }
    await page.setViewportSize({width:1440,height:900});
    contacts.incoming=[friendRequest(1,rui),friendRequest(2,ana)];contacts.outgoing=[friendRequest(3,ivo)];
    await page.locator('#socialFriendSearch').fill('João');
    await page.locator('#socialFriendSearch').press('Enter');
    await page.locator('[data-social-action=friend-accept]').nth(1).waitFor();
    await screenshot('02b-amigos-solicitacoes.png');
    await page.getByRole('button',{name:'Adicionar amigo',exact:true}).click();
    await page.getByText('Solicitação enviada',{exact:true}).waitFor();
    assert.equal(commands.find(c=>c.action==='friend.request').payload.targetId,joao.id);
    await page.locator('[data-social-action=friend-accept][data-social-id="'+friendRequest(1,rui).id+'"]').click();
    await page.locator('[data-friends-section=contacts] [data-social-id="'+rui.id+'"]').first().waitFor();
    await page.locator('[data-social-action=friend-decline][data-social-id="'+friendRequest(2,ana).id+'"]').click();
    await page.locator('[data-social-action=friend-decline]').waitFor({state:'detached'});
    await page.locator('[data-social-action=friend-cancel][data-social-id="'+friendRequest(3,ivo).id+'"]').click();
    await page.locator('[data-social-action=friend-cancel][data-social-id="'+friendRequest(3,ivo).id+'"]').waitFor({state:'detached'});
    assert(commands.some(c=>c.action==='friend.respond'&&c.payload.accept)&&commands.some(c=>c.action==='friend.respond'&&!c.payload.accept));
    await page.locator('[data-social-action=party][data-social-id="'+rui.id+'"]').click();
    await page.getByText('Convite de grupo enviado.',{exact:true}).waitFor();
    await page.locator('[data-social-action=crew][data-social-id="'+rui.id+'"]').click();
    await page.getByText('Convite de tripulação enviado.',{exact:true}).waitFor();
    assert.equal(commands.find(c=>c.action==='party.invite').payload.targetId,rui.id);
    assert.equal(commands.find(c=>c.action==='crew.invite').payload.targetId,rui.id);
    await page.locator('[data-friends-section=contacts] [data-social-action=block][data-social-id="'+rui.id+'"]').click();
    const unblock=page.locator('[data-friends-section=blocked] [data-social-action=block][data-social-id="'+rui.id+'"]');
    await unblock.waitFor();await unblock.click();await unblock.waitFor({state:'detached'});
    assert(commands.some(c=>c.action==='contact.block'&&c.payload.blocked)&&commands.some(c=>c.action==='contact.block'&&!c.payload.blocked));
    await page.locator('[data-social-action=remove][data-social-id="'+peer.id+'"]').click();
    await page.getByText('Você ainda não adicionou amigos.',{exact:true}).waitFor();
    assert.equal(commands.find(c=>c.action==='friend.remove').payload.targetId,peer.id);
    contacts.friends=[peer];contacts.outgoing=[];

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
    const mailGlass=await page.locator('.social-mode .dialog').evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {width:r.width,height:r.height,border:s.borderTopWidth,image:s.borderImageSource,radius:s.borderTopLeftRadius,blur:s.backdropFilter};
    });
    assert(Math.abs(mailGlass.width-1180)<2&&Math.abs(mailGlass.height-702)<2,'Mail shares inventory dimensions: '+JSON.stringify(mailGlass));
    assert.equal(mailGlass.border,'1px');assert.equal(mailGlass.image,'none');assert.equal(mailGlass.radius,'12px');assert.match(mailGlass.blur,/blur/);
    await screenshot('04-correio.png');
    await page.getByRole('button',{name:'Marcar como lida',exact:true}).click();
    await page.locator('.social-letter[data-mail-state=read]').waitFor();
    assert.equal(commands.find(c=>c.action==='mail.read').payload.mailId,letterId);
    assert.equal(await page.locator('.social-letter .rarity-rare').count(),1,'Mail attachment keeps rarity');
    await page.getByRole('button',{name:'Resgatar',exact:true}).click();
    await page.getByText('Nenhuma recompensa pendente.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Resgatadas',exact:true}).click();
    await page.getByText('Baú de Morgan',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Arquivar',exact:true}).click();
    await page.getByText('Nenhuma recompensa resgatada.',{exact:true}).waitFor();
    assert.equal(commands.find(c=>c.action==='mail.archive').payload.mailId,letterId);
    mailLetters=Array.from({length:9},(_,i)=>({id:'33333333-3333-4333-8333-'+String(i+10).padStart(12,'0'),source:['dungeon','event','system','market'][i%4],title:['Baú de Morgan','Recompensa da temporada','Entrega do porto','Venda concluída'][i%4]+' · '+(i+1),message:'Sua recompensa está pronta para resgate. Obrigado por navegar conosco.',createdAt:now,readAt:i%2?now:null,claimedAt:null,attachments:[armor,weapon]}));
    await page.locator('[data-social-action=mail-tab][data-social-id=pending]').click();
    await page.locator('.social-letter').nth(5).waitFor();
    await screenshot('04a-correio-entregas.png');
    for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
      await page.setViewportSize({width,height});
      const layout=await page.locator('.mail-desk').evaluate(el=>{
        const list=el.querySelector('.mail-list'),toolbar=el.querySelector('.mail-toolbar'),dialog=el.closest('.dialog'),r=dialog.getBoundingClientRect();
        return {overflow:el.scrollWidth>el.clientWidth+1,listHeight:list.clientHeight,toolbarBottom:toolbar.getBoundingClientRect().bottom,bottom:r.bottom,left:r.left,right:r.right};
      });
      assert(!layout.overflow&&layout.listHeight>80&&layout.toolbarBottom<height&&layout.bottom<=height&&layout.left>=0&&layout.right<=width,'Mail fits '+width+': '+JSON.stringify(layout));
      assert(await page.locator('.social-tile').first().evaluate(el=>Math.abs(el.offsetWidth-el.offsetHeight)<1),'Square attachment slots');
      if(width===390||width===844)await screenshot('04b-correio-'+width+'.png');
    }
    await page.setViewportSize({width:1440,height:900});
    await page.getByRole('button',{name:'Carregar mais',exact:true}).click();
    await page.locator('.social-letter').nth(8).waitFor();
    assert.equal(await page.locator('.social-letter').count(),9,'Pagination preserves previous deliveries');
    await page.locator('.mail-list').evaluate(el=>el.scrollTop=100);
    await page.locator('[data-social-action=mail-read]').first().click();
    await page.waitForFunction(()=>document.querySelector('.social-letter')?.dataset.mailState==='read');
    assert(await page.locator('.mail-list').evaluate(el=>el.scrollTop>=95),'Reading preserves the delivery list position');
    await page.locator('[data-social-action=mail-claim-all]').click();
    await page.getByText('Nenhuma recompensa pendente.',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-social-action=mail-claim-all]').isDisabled(),true);
    await page.locator('[data-social-action=mail-tab][data-social-id=claimed]').click();
    await page.locator('.social-letter[data-mail-state=claimed]').nth(5).waitFor();
    await screenshot('04c-correio-resgatadas.png');
    await page.locator('[data-social-action=mail-archive-claimed]').click();
    await page.getByText('Nenhuma recompensa resgatada.',{exact:true}).waitFor();
    assert(commands.some(c=>c.action==='mail.claim-all')&&commands.some(c=>c.action==='mail.archive-claimed'));
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
