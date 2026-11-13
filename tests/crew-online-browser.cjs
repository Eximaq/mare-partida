'use strict';

// The real menu and account client run against fixture responses. Server
// transactions and permissions are covered by the crew integration tests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');
const classes=require('../character-system.js');
const catalog=require('../character-catalog.js').create({characters:classes});
const forge=require('../forge-system.js');
const items=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const contracts=require('../contract-system.js');
const hierarchy=require('../hierarchy-system.js');
const maps=require('../world-catalog.cjs').load();

const character={id:'11111111-1111-4111-8111-111111111111',name:'José do Mar',classId:'sword',factionId:'pirate'};
const crewId='22222222-2222-4222-8222-222222222222';
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const now=new Date(),endAt=new Date(+now+86400000);
const equipment=Object.fromEntries([...items.inventorySlotsLeft,...items.inventorySlotsRight].map(key=>[key,null]));
const stats=classes.derive({classId:'sword',level:75,attributes:allocated},catalog.classes.sword,catalog.factions.pirate,forge.aggregate(equipment,items.items));
const wire={
  crewAvailable:true,
  state:{characterId:character.id,version:1,level:75,experience:'80',gold:'1240500'},
  inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],
  originalInventory:{catalogId:'original-game-v1',inventory:[],equipment,potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]},
  attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},
  journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:stats.maxHP,playerMaxHp:stats.maxHP},
  combatPreview:{rulesetId:'original-character-v1',stats,maxHp:stats.maxHP},
  world:{rulesetId:'original-world-v1',rulesHash:maps.rulesHash,mapId:'lobby',area:null,position:{...maps.maps.lobby.spawn},
    path:[],speed:162.2,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()},
  contracts:{rulesetId:contracts.rulesetId,progress:Object.fromEntries(contracts.quests.map(q=>[q.id,0])),claimed:[]},
  hierarchy:{rulesetId:'original-hierarchy-v1',tier:2,title:hierarchy.title('pirate',2),power:28470,next:hierarchy.next(2,75)},
};
const donation={used:200,limit:1000,resetsAt:endAt};
const listing=[{id:crewId,name:'Corsários do Norte',tag:'CDN',flag:'f'.repeat(1024),policy:'approval',minLevel:50,memberCount:3,capacity:12,level:3}];
const choice={id:'doctor',name:'Médico',benefit:'Melhora a potência de poções de cura na tripulação.',material:{name:'Páginas do Manual de Cirurgia',icon:'assets/ui/crew/professional-surgery-manual-pages.png'}};
const profession={profession:'doctor',choices:[choice],level:4,experience:1950,levelStartXp:1800,nextLevelXp:2800,
  history:[],futureBoss:{title:'Desafio do Médico',enabled:false},week:{startAt:now,endAt,earnedXp:0,limit:1000,objectives:[
    {id:'donation',title:'Contribuição à Tripulação',description:'Doe Berry à tesouraria.',progress:200,target:4900,xp:150,status:'active'},
    {id:'hunt',title:'Caçada Especial',description:'Derrote monstros de nível 77.',progress:140,target:882,xp:250,status:'active'},
    {id:'collection',title:'O Manual Perdido',description:'Colete Páginas do Manual de Cirurgia ao derrotar Satori.',progress:14,target:117,xp:400,status:'active'},
    {id:'prison',title:'Desafio em Impel Down',description:'Conclua o andar 13.',progress:0,target:1,xp:200,status:'active'},
  ]}};
function createGroup(payload){
  return {...payload,id:crewId,role:'captain',captainId:character.id,memberCount:1,capacity:12,xp:610,level:2,
    levelStartXp:500,nextLevelXp:1500,treasury:12000,shipStage:1,
    facilities:{hull:1,infirmary:1,galley:1,command:1,workshop:1,navigation:1,warehouse:1},
    members:[{...character,role:'captain',level:75,power:28470,contribution:200,profession:{id:'doctor',level:4}}],
    history:[],benefits:{doctor:.02},projects:[
      {facility:'hull',level:1,nextLevel:2,cost:24000,baseCost:24000,requiredCrewLevel:2},
      {facility:'infirmary',level:1,nextLevel:2,cost:12000,baseCost:12000,requiredCrewLevel:2},
    ],
    missions:[{type:'kills',title:'Caçada dos Mares',target:120000,progress:27000,xp:800,capacity:12,completedAt:null,endsAt:endAt}],
    futureMissions:[{title:'Guerra dos Mares',xp:1200}]};
}

(async()=>{
  const url=process.env.MARE_TEST_URL||'http://127.0.0.1:8160/';
  const out=process.env.MARE_QA_DIR||path.join(os.tmpdir(),'mare-crew-browser');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const context=await browser.newContext({viewport:{width:1440,height:950}});
  const page=await context.newPage();
  const errors=[],sent=[],requests=[];
  let failRead=true,group=null,search;
  let release;
  const firstRead=new Promise(resolve=>{release=resolve;});
  try{
    page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>{if(request.resourceType()==='script')requests.push([request.url(),request.failure()?.errorText]);});
    await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-crew'));
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/v1/**',async route=>{
      const requestUrl=new URL(route.request().url()),requestPath=requestUrl.pathname;
      requests.push(requestPath);
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',json:body});
      if(requestPath==='/v1/me')return reply({character});
      if(requestPath==='/v1/auth/csrf')return reply({csrfToken:'local-fixture'});
      if(requestPath.endsWith('/online-state'))return reply(wire);
      if(requestPath.endsWith('/control')||requestPath.endsWith('/renew'))return reply({epoch:1,token:'x'.repeat(43)});
      if(requestPath.endsWith('/party'))return reply({party:null,invites:[]});
      if(requestPath==='/v1/crews/ranking')return reply({leaderboard:group?[{...group,rank:1,power:28470,captain:character.name}]:[]});
      if(requestPath==='/v1/hierarchy/ranking')return reply({leaderboard:[{player_id:character.id,name:character.name,faction:'pirate',class_id:'sword',tier:2,rank_title:wire.hierarchy.title,level:75,power:28470}]});
      if(requestPath.endsWith('/crew')){
        if(requestUrl.searchParams.get('view')==='identity')return reply({identity:group&&{id:group.id,flag:group.flag,name:group.name,tag:group.tag}});
        await firstRead;
        if(failRead){failRead=false;return reply({error:'crew_unavailable'},503);}
        search=requestUrl.searchParams.get('q');
        return reply({crew:{serverNow:now,blockedUntil:null,group,listing:group?[]:listing,invites:[],applications:[],donation,contribution:200},profession});
      }
      if(requestPath.endsWith('/commands')){
        const command=route.request().postDataJSON();
        sent.push(command);
        assert.equal(command.action,'crew.create');
        assert.equal(command.expectedVersion,wire.state.version);
        assert.match(command.payload.flag,/^[0-9a-f]{1024}$/);
        assert.notEqual(command.payload.flag,'0'.repeat(1024));
        assert.match(command.payload.flag,/0/);
        group=createGroup(command.payload);
        wire.state.version++;
        return reply({});
      }
      return reply({});
    });
    await page.route(url,async route=>{
      const response=await route.fetch(),html=await response.text();
      const session='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';
      await route.fulfill({response,body:html.includes('account-client/game-session.js')?html:html.replace(/<script defer src="game\.js/,session+'<script defer src="game.js')});
    });
    await page.goto(url);
    await page.waitForFunction(()=>document.querySelector('.online-boot-error')||(window.MareGameSession?.controlled&&document.querySelector('#socialMenuTrigger')));
    assert.equal(await page.locator('.online-boot-error').count(),0);

    const open=async()=>{
      await page.locator('#socialMenuTrigger').click();
      const option=page.locator('#socialQuickMenu [data-crew-open]');
      assert.equal(await option.count(),1);
      assert.equal(await page.locator('#mainMenu [data-crew-open]').count(),1);
      await option.click();
    };
    const view=page.locator('.crew-window');
    await open();
    await view.getByRole('heading',{name:'Consultando o servidor'}).waitFor();
    assert.equal(await view.getByText('Sem tripulação',{exact:true}).count(),0);
    release();
    await view.getByRole('heading',{name:'Tripulações indisponíveis'}).waitFor();
    assert.equal(await view.getByText('Sem tripulação',{exact:true}).count(),0);
    await view.getByRole('button',{name:'Tentar novamente'}).click();
    await view.getByRole('heading',{name:'Sem tripulação'}).waitFor();
    await page.screenshot({path:path.join(out,'tripulacao-recrutamento.png')});
    await view.getByLabel('Buscar por nome ou sigla').fill('Norte');
    await view.getByRole('button',{name:'Buscar',exact:true}).click();
    await view.getByText('Corsários do Norte',{exact:false}).waitFor();
    assert.equal(search,'Norte');
    await view.getByRole('button',{name:'Criar tripulação'}).click();
    await view.getByLabel('Nome',{exact:true}).fill('Bando do Porto');
    await view.getByLabel('Sigla',{exact:true}).fill('GPO');
    await view.getByRole('button',{name:'Revisar criação'}).click();
    await view.getByRole('alert').waitFor();
    const canvas=view.locator('[data-crew-draw]');
    await canvas.focus();
    await canvas.press('Space');
    await view.getByRole('button',{name:'Desfazer'}).click();
    await view.getByRole('button',{name:'Refazer'}).click();
    await view.getByRole('button',{name:'Preencher'}).click();
    await view.getByRole('button',{name:'Carvão',exact:true}).click();
    await canvas.click({position:{x:100,y:100}});
    await view.getByRole('button',{name:'Lápis',exact:true}).click();
    await view.getByRole('button',{name:'Marfim',exact:true}).click();
    const bounds=await canvas.boundingBox();
    const point=(x,y)=>[bounds.x+(x+.5)*bounds.width/32,bounds.y+(y+.5)*bounds.height/32];
    const stroke=async(x,y,toX,toY)=>{
      await page.mouse.move(...point(x,y));await page.mouse.down();
      await page.mouse.move(...point(toX,toY));await page.mouse.up();
    };
    await stroke(6,5,25,26);
    await stroke(25,5,6,26);
    for(let y=7;y<=21;y++) {
      const edge=y===7?13:y===8?11:y===9?10:y>=19?12:9;
      await stroke(edge,y,31-edge,y);
    }
    await view.getByRole('button',{name:'Borracha',exact:true}).click();
    for(const x of [11,12,13,18,19,20])await stroke(x,12,x,14);
    await stroke(15,16,16,17);
    for(const x of [14,16,18])await stroke(x,20,x,21);
    await page.screenshot({path:path.join(out,'tripulacao-bandeira.png')});
    await view.getByRole('button',{name:'Revisar criação'}).click();
    assert.equal(sent.length,0);
    await page.locator('[data-confirm-accept]').click();
    await view.getByRole('heading',{name:'[GPO] Bando do Porto'}).waitFor();
    assert.equal(sent.length,1);
    assert.equal(await view.locator('[data-crew-draw]').count(),0);
    assert.equal(await page.locator('#crewHudIdentity').innerText(),'[GPO]\nBando do Porto');
    await page.evaluate(()=>document.fonts.ready);
    await view.locator('.crew-vessel-art:not([hidden])').waitFor();
    await page.screenshot({path:path.join(out,'tripulacao-geral.png')});
    const crewBox=()=>page.locator('#panelOverlay > .dialog').boundingBox();
    // All nine live views share the inventory frame; scrolling is contained to content.
    for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]) {
      await page.mouse.move(0,0);await page.setViewportSize({width,height});
      for(const tab of ['overview','members','profession','missions','contracts','ship','treasury','store','recruitment']) {
        await view.locator('[data-crew-view="'+tab+'"]').click();
        const rect=await crewBox();
        const expectedWidth=Math.min(width<=1100?800:1180,width-16);
        const expectedHeight=width<=760?height-42:Math.min(720,height-40)-18;
        assert(Math.abs(rect.width-expectedWidth)<2&&Math.abs(rect.height-expectedHeight)<2,'inventory frame '+width+' '+tab+' '+JSON.stringify(rect));
        assert(await view.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'content fits '+width+' '+tab);
        assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'body contains scrolling');
        assert.equal(await page.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none');
        assert(await view.locator('button').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderImageSource==='none')),'no old button frames');
        assert(await view.locator('.crew-nav button').evaluateAll(es=>es.every(e=>getComputedStyle(e).fontFamily.includes('Inter')&&parseFloat(getComputedStyle(e).borderLeftWidth)<=1)),'modern navigation');
        if(tab==='overview'||tab==='treasury')await page.screenshot({path:path.join(out,'crew-'+tab+'-'+width+'.png')});
      }
    }
    await page.setViewportSize({width:1440,height:950});
    await view.locator('[data-crew-view="overview"]').click();
    const overviewSize=await crewBox();
    await view.getByRole('button',{name:'Navio e instalações'}).click();
    const shipSize=await crewBox();
    assert.equal(shipSize.width,overviewSize.width,'Crew width stays fixed across views');
    assert.equal(shipSize.height,overviewSize.height,'Crew height stays fixed across views');
    await view.locator('.crew-ship-preview summary').click();
    const nextShip=view.locator('.crew-ship-preview [data-stage="2"] .crew-vessel-art:not([hidden])');
    await nextShip.waitFor();
    assert.match(await nextShip.getAttribute('src'),/hull-2\.png$/);
    await nextShip.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'tripulacao-proximo-casco.png')});
    await view.getByRole('button',{name:/Enfermaria/}).click();
    await view.locator('.crew-ship-preview summary').click();
    assert.equal(await view.locator('.crew-ship-preview').getAttribute('open'),'');
    assert.equal(await view.locator('.crew-cabin-comparison figure').count(),2);
    await page.screenshot({path:path.join(out,'tripulacao-instalacoes.png')});
    await view.getByRole('button',{name:'Contratos profissionais',exact:true}).click();
    await view.getByText('Contribuição à Tripulação',{exact:true}).waitFor();
    assert.equal(await view.getByRole('button',{name:/resgatar/i}).count(),0);
    await page.setViewportSize({width:390,height:844});
    await view.getByRole('button',{name:'Visão geral'}).click();
    assert(await view.evaluate(element=>element.scrollWidth<=element.clientWidth+1));
    await page.screenshot({path:path.join(out,'tripulacao-mobile.png')});
    await page.locator('#closePanel').click();
    assert.equal(await page.locator('#panelOverlay').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'socialMenuTrigger');
    await page.keyboard.press('c');
    await page.locator('[data-contract-period="professional"]').click();
    await page.locator('[data-contract-board]').getByText('Caçada Especial',{exact:true}).waitFor();
    await page.locator('.contracts-professional .crew-cycle').waitFor();
    assert.equal(await page.locator('.contracts-professional .contracts-art').isVisible(),false);
    assert(await page.locator('.contracts-tabs').evaluate(element=>element.scrollWidth<=element.clientWidth+1));
    await page.screenshot({path:path.join(out,'tripulacao-contratos.png')});
    await page.locator('#closePanel').click();
    await page.setViewportSize({width:1440,height:950});
    await page.locator('#characterMenuTrigger').click();
    await page.locator('[data-character-section="hierarchy"]').click();
    await page.locator('[data-hierarchy-crews]').click();
    await page.locator('.crew-rank-list').getByText('[GPO] Bando do Porto',{exact:true}).waitFor();
    await page.screenshot({path:path.join(out,'tripulacao-ranking.png')});
    await page.locator('#closePanel').click();
    await open();
    await view.getByRole('heading',{name:'[GPO] Bando do Porto'}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-crew');
    assert.deepEqual(errors,[]);
    console.log('Tripulação no menu Social, carregamento, erro, busca, edição da bandeira, confirmação, evolução do casco, instalações, contratos, ranking, mobile e reabertura validados.');
    console.log(out);
  }catch(error){
    await page.screenshot({path:path.join(out,'falha-tripulacao.png')}).catch(()=>{});
    console.error({errors,sent:sent.map(entry=>entry.action),requests:requests.slice(-30),boot:await page.evaluate(()=>({
      session:Boolean(window.MareGameSession),available:window.MareGameSession?.available,controlled:window.MareGameSession?.controlled,
      diagnostic:Boolean(window.__mareDiagnostics),navigation:window.__mareDiagnostics?.().map.navigation.ready,
      message:document.body.textContent.trim().slice(0,160)
    }))});
    throw error;
  }finally{
    await context.close();
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
