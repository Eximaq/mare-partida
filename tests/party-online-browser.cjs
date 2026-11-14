'use strict';
// Real game controls against isolated HTTP responses; server rules have their own integration suite.
const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const {chromium}=require('playwright');
const A=require('../character-appearance.js'),characters=require('../character-system.js');
const catalog=require('../character-catalog.js').create({characters}),forge=require('../forge-system.js');
const items=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const actor={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const peerId='22222222-2222-4222-8222-222222222222',inviteId='33333333-3333-4333-8333-333333333333',nonce='44444444-4444-4444-8444-444444444444';
const member=(id,name,extra={})=>({id,name,classId:'sword',factionId:'pirate',level:45,power:7637,hp:850,maxHp:1000,connected:true,ready:false,appearance96:A.defaults,equipment:{},...extra});
const self=member(actor.id,actor.name),peer=member(peerId,'Lia do Farol');
const equipment=Object.fromEntries([...items.inventorySlotsLeft,...items.inventorySlotsRight].map(k=>[k,null]));
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const stats=characters.derive({classId:'sword',level:45,attributes:allocated},catalog.classes.sword,catalog.factions.pirate,forge.aggregate(equipment,items.items));
const party={group:null,invites:[]};
const wire={combatPreview:{rulesetId:'original-character-v1',stats,maxHp:stats.maxHP},state:{characterId:actor.id,version:1,level:45,experience:'5000',gold:'40000'},inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],originalInventory:{catalogId:'original-game-v1',inventory:[],equipment,potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]},attributes:{allocated,available:0},progression:{xpIntoLevel:'0',xpForNextLevel:'500'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked'},party};
(async()=>{
 const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8191/',out=process.env.MARE_QA_DIR||path.join(os.tmpdir(),'mare-party-glass');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],commands=[];
 const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
 try{
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.route('https://**/*',r=>r.abort());
  await page.route(url,async r=>{const response=await r.fetch(),html=await response.text(),scripts='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await r.fulfill({response,body:html.includes('account-client/game-session.js')?html:html.replace(/<script defer src="game\.js/,scripts+'<script defer src="game.js')});});
  await page.route('**/v1/**',async r=>{
   const p=new URL(r.request().url()).pathname,reply=body=>r.fulfill({json:body});
   if(p==='/v1/me')return reply({character:actor});
   if(p.endsWith('/auth/csrf'))return reply({csrfToken:'fixture'});
   if(p.endsWith('/online-state'))return reply(wire);
   if(p.endsWith('/control')||p.endsWith('/renew'))return reply({epoch:1,token:'x'.repeat(43)});
   if(p.endsWith('/commands')){
    const c=r.request().postDataJSON();commands.push(c);const g=party.group;
    if(c.action==='party.create')party.group={id:nonce,leaderId:actor.id,members:[{...self}],preparation:null,activity:null};
    if(c.action==='party.invite')party.invites=[{id:inviteId,target_id:peerId,sender:actor.name,target:c.payload.name,members:1,status:'pending'}];
    if(c.action==='party.promote')g.leaderId=c.payload.memberId;
    if(c.action==='party.kick')g.members=g.members.filter(m=>m.id!==c.payload.memberId);
    if(c.action==='party.leave')party.group=null;
    if(c.action==='party.respond'){party.invites=[];if(c.payload.accept)party.group={id:nonce,leaderId:peerId,members:[{...self},{...peer}],preparation:null,activity:null};}
    if(c.action==='party.prepare'){g.preparation={...c.payload,nonce};g.members.forEach(m=>m.ready=m.id!==actor.id);}
    if(c.action==='party.ready')g.members.find(m=>m.id===actor.id).ready=c.payload.ready;
    if(c.action==='party.start'){g.activity={...g.preparation};g.preparation=null;}
    return reply({});
   }
   return reply({});
  });
  await page.goto(url);await page.waitForFunction(()=>window.MareGameSession?.controlled,{},{timeout:15000}).catch(async e=>{console.error(await page.evaluate(()=>({text:document.body.innerText.slice(0,600),control:MareGameSession?.controlled,available:MareGameSession?.available})));throw e;});
  const closeChat=page.locator('#floatingChat.hud-open [data-close-window]');if(await closeChat.isVisible())await closeChat.click();
  const open=async()=>{if(await page.locator('.party-mode #closePanel').isVisible())await page.locator('#closePanel').click();await page.locator('#socialMenuTrigger').click();await page.locator('#socialQuickMenu [data-party-open]').click();await page.locator('.party-layout').waitFor();};
  const tab=async view=>{await page.locator('[data-party-view="'+view+'"]').click();await page.locator('#party-pane-'+view+':not([hidden])').waitFor();};
  const refresh=async()=>{await page.evaluate(()=>MareGameSession.read(true));await open();};
  const action=async name=>{const n=commands.length;await page.locator('[data-party-action="'+name+'"]:visible').click();await page.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);assert(commands.length>n,'Command sent: '+name);assert.equal(commands.at(-1).action,'party.'+name);};
  await open();
  const glass=await page.locator('.party-mode .dialog').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,border:s.borderTopWidth,image:s.borderImageSource,blur:s.backdropFilter};});
  assert.equal(glass.width,440);assert.equal(glass.height,620);assert.equal(glass.border,'1px');assert.equal(glass.image,'none');assert.match(glass.blur,/blur/);
  await shot('01-empty');await action('create');await page.locator('.party-member').first().waitFor();
  await tab('invites');await page.locator('#partyInviteName').fill(peer.name);await tab('members');await tab('invites');assert.equal(await page.locator('#partyInviteName').inputValue(),peer.name);await action('invite');assert.equal(commands.at(-1).payload.name,peer.name);
  party.invites=[];party.group.members=[{...self},{...peer},member('55555555-5555-4555-8555-555555555555','Rui das Ilhas',{connected:false}),member('66666666-6666-4666-8666-666666666666','Joana da Maré')];await refresh();await tab('members');
  assert.equal(await page.locator('.party-pane:visible .party-member').count(),4);assert.equal(await page.locator('#partyMemberSelection').inputValue(),peerId,'New roster selects an existing member, not an expired empty selection');assert(await page.locator('[data-party-action=leave]').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('#party-pane-members').getBoundingClientRect().bottom),'Team actions stay visible with four members');assert(await page.locator('#party-pane-members .party-member').last().evaluate(el=>el.getBoundingClientRect().bottom<=el.parentElement.getBoundingClientRect().bottom+1),'Four standard member rows fit on desktop');await shot('02-four-members');
  for(const [width,height] of [[1920,1080],[1280,720],[1024,768],[768,1024],[390,844],[430,932],[844,390]]){
   await page.setViewportSize({width,height});
   for(const view of ['members','invites','adventure']){
    await tab(view);const box=await page.locator('.party-mode .dialog').evaluate(el=>{const r=el.getBoundingClientRect(),pane=el.querySelector('.party-pane:not([hidden])');return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:pane.scrollWidth-pane.clientWidth,height:pane.clientHeight};});
    assert(box.x>=0&&box.y>=0&&box.right<=width+1&&box.bottom<=height+1,'Dialog fits '+JSON.stringify({width,height,view,box}));assert(box.overflow<=1,'No horizontal overflow '+JSON.stringify({width,height,view,box}));assert(box.height>90,'Usable content height');
   }
   if(width===390||width===768||width===844)await shot('responsive-'+width+'x'+height);
  }
  await page.setViewportSize({width:1440,height:900});await tab('members');
  await page.locator('#partyMemberSelection').selectOption(peerId,{force:true});await action('promote');assert.equal(commands.at(-1).payload.memberId,peerId);assert.equal(await page.locator('[data-party-action=kick]').count(),0);
  party.group.leaderId=actor.id;party.group.members=[{...self},{...peer}];await refresh();await tab('members');
  await page.locator('[data-party-action=kick]').click();await page.locator('[data-confirm-cancel]').click();assert.equal(commands.at(-1).action,'party.promote');
  await page.locator('[data-party-action=kick]').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);assert.equal(commands.at(-1).action,'party.kick');
  party.group.members=[{...self},{...peer}];await refresh();await tab('adventure');
  await page.locator('[data-party-kind=dungeon]').click();await page.locator('[data-party-destination=alvida]').click();await action('prepare');assert.deepEqual(commands.at(-1).payload,{kind:'dungeon',destination:'alvida'});
  await action('ready');assert.equal(commands.at(-1).payload.nonce,nonce);assert.equal(commands.at(-1).payload.ready,true);await shot('03-ready');await action('start');await page.locator('.party-layout').waitFor({state:'hidden'});
  party.group.activity=null;await refresh();await tab('members');await page.locator('[data-party-action=leave]').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);assert.equal(commands.at(-1).action,'party.leave');
  party.invites=[{id:inviteId,target_id:actor.id,sender:peer.name,leader_name:peer.name,members:1,status:'pending'}];await refresh();await tab('invites');await shot('04-invitation');
  await page.locator('[data-party-respond][data-accept=false]').click();await page.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);assert.deepEqual(commands.at(-1).payload,{inviteId,accept:false});
  party.invites=[{id:inviteId,target_id:actor.id,sender:peer.name,leader_name:peer.name,members:1,status:'pending'}];await refresh();await tab('invites');await page.locator('[data-party-respond][data-accept=true]').click();await page.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);assert.deepEqual(commands.at(-1).payload,{inviteId,accept:true});
  assert.deepEqual(errors,[]);console.log('Party glass: eight viewports; create, invite, promote, kick/cancel, prepare, ready, start, leave and invite responses passed.');console.log(out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
