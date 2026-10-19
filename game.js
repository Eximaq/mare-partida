'use strict';
/* MARÉ PARTIDA — demonstração local, sem multiplayer e sem bibliotecas externas.
   Conteúdo original. Todo o progresso é salvo exclusivamente no navegador. */
(() => {
  const STORAGE_KEY = 'mare-partida-save-v1';
  const VERSION = '1.3.0';
  const $ = (id) => document.getElementById(id);
  const canvas = $('worldCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const portrait = $('portrait').getContext('2d');
  portrait.imageSmoothingEnabled = false;
  let W = canvas.width, H = canvas.height;
  const {maps:worldMaps, Camera, Navigation} = MareWorld;
  const camera = new Camera();
  const navigators = Object.fromEntries(Object.entries(worldMaps).map(([id,map])=>[id,new Navigation(map)]));
  let travelPath = [], pursuit = new WeakMap();
  const keys = new Set(), rejectedTargets = new Map();
  const mapKey=()=>scene==='lobby'?'lobby':game?.area==='beach'&&worldMaps.embers?'embers':'hunt';
  const activeMap = () => worldMaps[mapKey()];
  const navigator = () => navigators[mapKey()];
  function resizeViewport(){
    const rect=canvas.getBoundingClientRect(), zoom=1;
    W=Math.max(1,Math.round(rect.width/zoom));H=Math.max(1,Math.round(rect.height/zoom));
    canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;
    camera.width=W;camera.height=H;
    if(game)camera.update(world.hero,activeMap(),0,true);
  }
  new ResizeObserver(resizeViewport).observe(canvas);
  function walkTo(point,action=null){
    const path=navigator().path(world.hero,point);
    if(!path.length){toast('Nao ha caminho livre ate esse ponto.');return false;}
    travelPath=path;lobbyDestination={...path[path.length-1]};lobbyAction=action;
    if(scene==='hunt'){autoPlay=false;world.target=null;updateUI();}
    return true;
  }
  function navigateEntity(entity,goal,speed,dt,range=0){
    if(entity===world.hero&&bentoController()?.locked())return true;
    const nav=navigator(),dist=Math.hypot(goal.x-entity.x,goal.y-entity.y);
    if(dist<=range&&nav.clear(entity,goal))return true;
    let route=pursuit.get(entity);
    if(!route||world.time>=route.until||Math.hypot(route.goal.x-goal.x,route.goal.y-goal.y)>40){
      route={goal:{x:goal.x,y:goal.y},path:nav.path(entity,goal),until:world.time+1};pursuit.set(entity,route);
    }
    if(!route.path.length)return false;
    nav.follow(entity,route.path,speed,Math.min(dt,Math.max(1,dist-range)/speed));return true;
  }
  function moveManually(dt){
    if(currentPanel||!$('startOverlay').classList.contains('hidden'))return false;
    if(bentoController()?.locked())return false;
    const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    if(dx||dy){
      travelPath=[];lobbyDestination=null;lobbyAction=null;const length=Math.hypot(dx,dy),hero=world.hero;
      const speed=getDerived().moveSpeed;navigator().move(hero,dx/length*speed*dt,dy/length*speed*dt);hero.walking=.2;
      hero.facing=dx<0?-1:dx>0?1:hero.facing;
      hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');return true;
    }
    if(travelPath.length){
      navigator().follow(world.hero,travelPath,getDerived().moveSpeed,dt);
      if(!travelPath.length){
        const action=lobbyAction,destination=lobbyDestination;lobbyAction=null;lobbyDestination=null;
        if(action&&destination&&Math.hypot(world.hero.x-destination.x,world.hero.y-destination.y)<5&&Math.hypot(world.hero.x-action.x,world.hero.y-action.y)<80)activateNPC(action);
      }
      return true;
    }
    return false;
  }
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) => min + Math.random() * (max - min);
  const fmt = (v) => Math.floor(v).toLocaleString('pt-BR');
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (v) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[v]));
  const classes = {
    sword: { name:'Espadachim', baseHP:136, hpStep:12, attack:14, attackStep:3, defense:7, defenseStep:1.2, speed:1.25, range:48, energy:90, energyStep:4, crit:.16, color:'#71c8c5', symbol:'⚔', skills:[{name:'Corte de Maré', cost:17, cd:7, type:'strike', multiplier:2.5, desc:'Golpe concentrado com 250% do ataque.'}, {name:'Postura Firme', cost:23, cd:14, type:'guard', desc:'Recupera vida e reduz dano por 7 segundos.'}] },
    brawler: { name:'Lutador / Pugilista', baseHP:182, hpStep:17, attack:12, attackStep:2.5, defense:10, defenseStep:1.6, speed:1.05, range:45, energy:85, energyStep:4, crit:.10, color:'#d7af74', symbol:'✹', skills:[{name:'Impacto de Âncora', cost:17, cd:8, type:'strike', multiplier:3.0, desc:'Golpe poderoso com 300% do ataque.'}, {name:'Fôlego de Ferro', cost:20, cd:14, type:'guard', desc:'Recupera vida e reduz dano por 7 segundos.'}] },
    gunner: { name:'Atirador / Franco-Atirador', baseHP:112, hpStep:10, attack:15, attackStep:3.2, defense:5, defenseStep:1, speed:1.05, range:210, energy:100, energyStep:5, crit:.22, color:'#e2b77a', symbol:'◎', skills:[{name:'Disparo Preciso', cost:17, cd:8, type:'strike', multiplier:2.7, desc:'Disparo certeiro com 270% do ataque.'}, {name:'Rajada de Estilhaços', cost:28, cd:14, type:'area', desc:'Ataca todos os inimigos próximos ao alvo.'}] }
  };

  // Facção é a origem social; classe é uma escolha independente.
  const factions = {
    revolutionary:{name:'Exército Revolucionário',short:'REVOLUCIONÁRIO',color:'#77c69b',accent:'#2d785a',desc:'Mobilidade, sabotagem e independência.',bonus:'Vel. ataque +8% · crítico +5%',attack:1,defense:1,hp:1,energy:1,speed:1.08,crit:.05,gold:1},
    pirate:{name:'Pirata',short:'PIRATA',color:'#ef9a76',accent:'#a44a48',desc:'Liberdade, conquista e espólios.',bonus:'Ataque +10% · dobrões +8%',attack:1.10,defense:1,hp:1,energy:1,speed:1,crit:0,gold:1.08},
    marine:{name:'Marinheiro',short:'MARINHEIRO',color:'#82bdf3',accent:'#396c9c',desc:'Disciplina, proteção e resistência.',bonus:'HP +8% · defesa +10%',attack:1,defense:1.10,hp:1.08,energy:1,speed:1,crit:0,gold:1},
    government:{name:'Governo Mundial',short:'GOVERNO MUNDIAL',color:'#c8b7f3',accent:'#7161a6',desc:'Tática, precisão e influência.',bonus:'Energia +10% · recarga -8%',attack:1,defense:1,hp:1,energy:1.10,speed:1,crit:0,gold:1}
  };
  Object.assign(classes, {
    rogue:{name:'Gatuno / Acrobata',baseHP:124,hpStep:11,attack:15,attackStep:3.1,defense:5,defenseStep:1.0,speed:1.72,range:44,energy:98,energyStep:5,crit:.26,color:'#ad9af1',symbol:'✧',skills:[{name:'Ataque ao Ponto Fraco',cost:18,cd:7,type:'strike',multiplier:2.65,desc:'Golpe veloz de dano elevado.'},{name:'Dança das Adagas',cost:26,cd:13,type:'area',multiplier:1.45,desc:'Atinge inimigos em volta do alvo.'}]},
    cyborg:{name:'Ciborgue / Engenheiro',baseHP:205,hpStep:16,attack:13,attackStep:2.7,defense:12,defenseStep:1.9,speed:.89,range:145,energy:100,energyStep:6,crit:.10,color:'#e7bb81',symbol:'⚙',skills:[{name:'Explosão de Engrenagens',cost:25,cd:9,type:'area',multiplier:1.65,desc:'Dano tecnológico em área.'},{name:'Blindagem Ativa',cost:22,cd:15,type:'guard',desc:'Reduz dano por 7 segundos e recupera vida.'}]},
    strategist:{name:'Estrategista / Elemental',baseHP:128,hpStep:11,attack:13,attackStep:2.8,defense:6,defenseStep:1.2,speed:1.10,range:190,energy:125,energyStep:7,crit:.16,color:'#8ad6ee',symbol:'❖',skills:[{name:'Tempestade Tática',cost:24,cd:9,type:'area',multiplier:1.5,desc:'Afeta vários oponentes com energia elemental.'},{name:'Escudo de Correntes',cost:23,cd:15,type:'guard',desc:'Escudo temporário e recuperação.'}]}
  });
  MareCharacters.configure(classes);
  // Somente artes fornecidas pelo usuário: quatro visualizações de facção.
  const spriteBank = {};
  const spriteActions=['idle','idle2','back','side','walk1','walk2','walk3','attack1','attack2','attack3','attack4'];
  for(const fac of Object.keys(factions)){
    spriteBank[fac]={};
    for(const action of spriteActions){
      const img=new Image(); img.src='assets/sprites/'+fac+'/'+action+'.png';
      spriteBank[fac][action]=img; if(action==='idle')img.addEventListener('load',()=>{if(game&&game.factionId===fac)renderPortrait();});
    }
  }
  function readySprite(fac,act){let img=spriteBank[fac]?.[act];return img?.complete&&img.naturalWidth>0?img:null;}
  function drawFactionSprite(c,x,y,fac,action='idle',size=70,flip=false){
    if(globalThis.MareFactionSprites?.draw(c,fac,x,y,{action:'idle',direction:'south',time:0,height:size}))return true;
    let img=readySprite(fac,action)||readySprite(fac,'idle');if(!img)return false;
    let w=size*img.width/Math.max(1,img.height),h=size;
    c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
    c.imageSmoothingEnabled=false;c.drawImage(img,-Math.round(w/2),-Math.round(h),Math.round(w),Math.round(h));c.restore();return true;
  }
  function configureFactionVisual(){
    const f=factions[game?.factionId]||factions.pirate;
    document.documentElement.style.setProperty('--faction-accent',f.color);
    if($('heroFaction'))$('heroFaction').textContent=f.name.toUpperCase();
    if($('factionChip'))$('factionChip').textContent='◆ '+f.short;
  }

  const zones = {
    beach: { name:'Ruínas de Brasas', sub:'Ilha do Porto Calcinado', min:1, label:'MASMORRA · NV. 1–12', tint:'beach', mobs:['crab','bandit','spirit'] },
    swamp: { name:'Fenda da Névoa', sub:'Catacumbas Nebulosas', min:8, label:'MASMORRA · NV. 8–25', tint:'swamp', mobs:['spirit','bandit','crab'] }
  };
  const monsterTypes = {
    crab: { name:'Carapaça Ígnea', hp:45, atk:7, def:3, xp:22, gold:[6,13], reach:43, speed:42, attackSec:2.15, color:'#dd846c', icon:'◇' },
    bandit: { name:'Corsário de Brasa', hp:67, atk:10, def:5, xp:29, gold:[10,18], reach:51, speed:55, attackSec:1.95, color:'#e6b27d', icon:'⚔' },
    spirit: { name:'Sentinela Cinzenta', hp:52, atk:12, def:3, xp:34, gold:[10,19], reach:135, speed:34, attackSec:2.6, color:'#85d8c8', icon:'✧' },
    boss: { name:'Guardião da Caldeira', hp:350, atk:17, def:10, xp:145, gold:[100,140], reach:56, speed:33, attackSec:2.45, color:'#e9c27b', icon:'♛' }
  };
  const itemDefs = [
    {name:'Espada de Ferro Salgado',slot:'weapon',type:'sword',attack:6,defense:0,hp:0,symbol:'⚔',rarity:'common'},
    {name:'Sabre de Coral',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'uncommon'},
    {name:'Punhos de Bronze',slot:'weapon',type:'brawler',attack:7,defense:1,hp:0,symbol:'✦',rarity:'common'},
    {name:'Luvas de Marfim',slot:'weapon',type:'brawler',attack:11,defense:2,hp:0,symbol:'✦',rarity:'uncommon'},
    {name:'Mosquete de Convés',slot:'weapon',type:'gunner',attack:7,defense:0,hp:0,symbol:'◎',rarity:'common'},
    {name:'Mosquete dos Faróis',slot:'weapon',type:'gunner',attack:12,defense:0,hp:0,symbol:'◎',rarity:'rare'},
    {name:'Casaco de Marinheiro',slot:'coat',attack:0,defense:4,hp:17,symbol:'◈',rarity:'common'},
    {name:'Casaco da Bruma',slot:'coat',attack:0,defense:7,hp:27,symbol:'◈',rarity:'uncommon'},
    {name:'Botas de Navegante',slot:'boots',attack:0,defense:3,hp:7,symbol:'⌁',rarity:'common'},
    {name:'Botas do Recifal',slot:'boots',attack:0,defense:6,hp:14,symbol:'⌁',rarity:'rare'},
    {name:'Amuleto das Correntes',slot:'charm',attack:3,defense:0,hp:10,symbol:'✧',rarity:'uncommon'},
    {name:'Pingente de Madrepérola',slot:'charm',attack:5,defense:2,hp:25,symbol:'✧',rarity:'rare'},
    {name:'Adagas da Bruma',slot:'weapon',type:'rogue',attack:8,defense:0,hp:0,symbol:'✧',rarity:'common'},
    {name:'Lâminas Acrobáticas',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,symbol:'✦',rarity:'rare'},
    {name:'Manopla de Aço',slot:'weapon',type:'cyborg',attack:8,defense:3,hp:12,symbol:'⚙',rarity:'common'},
    {name:'Canhão de Pulso',slot:'weapon',type:'cyborg',attack:14,defense:2,hp:0,symbol:'✺',rarity:'rare'},
    {name:'Compasso de Tempestade',slot:'weapon',type:'strategist',attack:8,defense:0,hp:0,symbol:'❖',rarity:'common'},
    {name:'Orbe das Correntes',slot:'weapon',type:'strategist',attack:14,defense:1,hp:0,symbol:'◇',rarity:'rare'}
  ];
  const rarityNames = Object.fromEntries(Object.entries(MareForge.rarity).map(([id,r])=>[id,r.name]));
  const slotNames = {head:'CABEÇA',necklace:'COLAR',coat:'TORSO',legs:'PERNEIRAS',boots:'PÉS',weapon:'ARMA PRINCIPAL',cloak:'CAPA',gloves:'MÃOS',ring:'ANEL',belt:'CINTO',charm:'ACESSÓRIO'};
  const inventorySlotsLeft=['head','necklace','coat','legs','boots'];
  const inventorySlotsRight=['weapon','cloak','gloves','ring','belt','charm'];
  const BAG_CAPACITY=120, BAG_PER_PAGE=35;
  const inventoryUI={query:'',category:'all',sort:'recent',rarity:'all',page:0,tab:'equipment'};
  // Novas categorias seguem o mesmo modelo de equipamento dos saves anteriores.
  itemDefs.push(
    {name:'Bandana das Correntes',slot:'head',attack:1,defense:2,hp:8,symbol:'♜',rarity:'common'},
    {name:'Capacete do Corsário',slot:'head',attack:2,defense:5,hp:18,symbol:'♜',rarity:'rare'},
    {name:'Colar das Marés',slot:'necklace',attack:3,defense:1,hp:7,symbol:'♢',rarity:'uncommon'},
    {name:'Grevas de Navegante',slot:'legs',attack:0,defense:4,hp:13,symbol:'▥',rarity:'common'},
    {name:'Calças da Maré Alta',slot:'legs',attack:0,defense:8,hp:24,symbol:'▥',rarity:'rare'},
    {name:'Manto do Faroleiro',slot:'cloak',attack:1,defense:3,hp:14,symbol:'◭',rarity:'uncommon'},
    {name:'Capa do Horizonte',slot:'cloak',attack:3,defense:5,hp:20,symbol:'◭',rarity:'rare'},
    {name:'Luvas de Cordame',slot:'gloves',attack:2,defense:2,hp:5,symbol:'✥',rarity:'common'},
    {name:'Luvas do Vigia',slot:'gloves',attack:4,defense:3,hp:9,symbol:'✥',rarity:'uncommon'},
    {name:'Anel de Coral Cinzento',slot:'ring',attack:2,defense:1,hp:11,symbol:'◉',rarity:'uncommon'},
    {name:'Anel da Caldeira',slot:'ring',attack:5,defense:3,hp:16,symbol:'◉',rarity:'rare'},
    {name:'Cinto do Grumete',slot:'belt',attack:0,defense:3,hp:8,symbol:'▣',rarity:'common'},
    {name:'Cinto do Capitão',slot:'belt',attack:2,defense:5,hp:19,symbol:'▣',rarity:'rare'}
  );
  // Append only: saved equipment refers to numeric indices in this array.
  const healerWeaponIndex=itemDefs.length;
  itemDefs.push(
    {name:'Cajado do Farol',slot:'weapon',type:'healer',attack:7,defense:1,hp:0,symbol:'✚',rarity:'common'},
    {name:'Relicário da Maré Viva',slot:'weapon',type:'healer',attack:12,defense:2,hp:8,symbol:'✚',rarity:'rare'}
  );
  itemDefs.push(...MareForge.pearls.map(p=>({name:p.name,kind:'pearl',pearlId:p.id,slot:'pearl',rarity:p.rarity,attack:0,defense:0,hp:0,symbol:'◉'})));
  const questDefs = [
    {id:'crab',title:'Cascos de magma',desc:'Derrote 6 carapaças ígneas.',target:6,stat:'crab',gold:85,xp:65},
    {id:'bandit',title:'Chamas à espreita',desc:'Derrote 5 corsários de brasa.',target:5,stat:'bandit',gold:125,xp:100},
    {id:'boss',title:'Coração vulcânico',desc:'Derrote o Guardião da Caldeira.',target:1,stat:'boss',gold:280,xp:190}
  ];

  let game = null, session = null, world = { mobs:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:612,y:286,facing:1,attackAnim:0,walking:0}, target:null,spawnClock:0,bossCooldown:0,nextID:1 };
  let selectedClass = 'sword', selectedFaction = 'pirate', editingCharacter = false, currentPanel = null, selectedItem = null, forgeSlot = 'weapon', lastTime = 0, renderUIClock = 0, saveClock = 0, tickClock = 0;
  let autoPlay = true, autoSkills = true, reducedFX = false;
  let attributeDraft=MareCharacters.empty(),attributeQuantity=1,allocationMessage="";
  const forgeUI={tab:'upgrade',itemId:null,pearlItemId:'',socket:0,fusionId:'pearl_for_1',fusionMode:'equipment',fusionIds:Array(5).fill(null),pearlFusionIds:Array(5).fill(null),pearlFilters:{},outputSlot:'weapon',reforgeMode:'line',filters:{},page:0,list:false};
  let forgeOutcome=null,forgeFusionStamp='';
  let inventoryFeedback=null,attributeSuccessUntil=0,forgeFeedback=null,rewardBuffer=null,rewardTimer=null;
  let factionShowcase=false,showcaseAction='idle',showcaseDirection='south';
  window.addEventListener('mare-faction-sprite-ready',()=>{if(game){renderPortrait();if($('inventorySprite'))drawCurrentPreview($('inventorySprite'),185);if($('characterSprite'))drawCurrentPreview($('characterSprite'),155);}});
  let scene = 'lobby', lobbyDestination = null, lobbyAction = null;
  const npcs = [
    {name:'Capitã luffy',short:'Luffy',x:340,y:206,color:'#e5b87b',kind:'hunt',art:'luffy'},
    {name:'Ferreiro ryuma',short:'Ryuma',x:660,y:404,color:'#d9a782',kind:'forge',art:'ryuma'},
    {name:'nami · Navegadora',short:'Nami',x:660,y:206,color:'#c8a8eb',kind:'contracts',art:'nami'},
    {name:'Mercador ',short:'Donquixote',x:340,y:404,color:'#a5d7bf',kind:'shop',art:'donquixote'}
  ];
  for(const npc of npcs)Object.assign(npc,MareIsland.npcs[npc.art]);
  const islandImages={};
  for(const [key,data] of Object.entries(MareIslandAssets)){
    const image=new Image();image.src=data.url;image.addEventListener('load',()=>{delete expandedAtlas.lobby;});islandImages[key]=image;
  }
  const islandBuildings=new Image();islandBuildings.src='pixellab-pip-generations/ilha-porto-20261018/port-buildings.png';
  const harborArt=new Image();if(globalThis.MareHarborArt)harborArt.src=MareHarborArt.url;
  const npcArt={};
  for(const key of ['donquixote','luffy','nami','ryuma']){
    const img=new Image();img.src='assets/npcs/'+key+'.png';npcArt[key]=img;
  }
  const seeded = (x,y,extra=0) => { let n = Math.sin(x*127.1+y*311.7+extra*39.81)*43758.5453; return n-Math.floor(n); };
  function newItem(def,level=1,rolled=false){
    const item={id:'it'+Date.now().toString(36)+(world.nextID++).toString(36),def:itemDefs.indexOf(def),level:Math.max(1,level),plus:0,locked:false,obtainedAt:Date.now()};
    if(def.kind==='pearl')item.pearlId=def.pearlId;else item.rarity=rolled?MareForge.rollRarity(Math.random):def.rarity;
    return MareForge.normalizeItem(item,itemDefs,Math.random);
  }
  function itemBase(item){return itemDefs[item?.def]||itemDefs[0];}
  function itemRarity(item){return item?.rarity||itemBase(item).rarity;}
  function itemStats(item){return MareForge.itemStats(item,itemDefs);}
  function starterWeapon(cls){return {sword:0,brawler:2,gunner:4,rogue:12,cyborg:14,strategist:16,healer:healerWeaponIndex}[cls]??0;}
  function createGame(name, cls) {
    world.nextID=1;
    const initialWeapon = starterWeapon(cls);
    const g={version:VERSION,name,classId:cls,factionId:selectedFaction,level:1,xp:0,gold:120,hp:0,energy:0,inventory:[],equipment:Object.fromEntries([...inventorySlotsLeft,...inventorySlotsRight].map(key=>[key,null])),potions:4,materials:3,stats:{kills:0,crab:0,bandit:0,spirit:0,boss:0,damage:0,goldEarned:0,xpEarned:0},claimed:[],area:'beach',created:Date.now(),totalPlay:0,hasSeenBoss:false,preferences:{hideItems:false}};
    Object.assign(g,MareCharacters.migrate(g),{forgeVersion:MareForge.VERSION,forgeSeq:0,forgeHistory:[]});
    g.equipment.weapon = newItem(itemDefs[initialWeapon]); g.equipment.coat = newItem(itemDefs[6]); g.inventory.push(newItem(itemDefs[8])); g.hp=getDerived(g).maxHP;g.energy=getDerived(g).maxEnergy;
    return g;
  }
  function getDerived(g=game) {
    if(!g)return{maxHP:100,maxEnergy:80,attack:0,defense:0,crit:0,speed:1,range:50,power:0};
    const gear=MareForge.aggregate(g.equipment,itemDefs);
    return MareCharacters.derive(g,classes[g.classId],factions[g.factionId]||factions.pirate,gear);
  }
  function xpNeeded(level){return Math.round(80+25*Math.pow(level-1,1.55));}
  function saveGame(){if(!game)return; try {localStorage.setItem(STORAGE_KEY,JSON.stringify(game));$('saveDot').style.background='#65c9bc';} catch(e) {toast('Não foi possível salvar o progresso no navegador.','danger');} }
  function preserveSave(raw,key=STORAGE_KEY+'-before-attributes-v1'){
    if(raw&&!localStorage.getItem(key))localStorage.setItem(key,raw);
  }
  function loadGame(){try{let data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!data||!classes[data.classId]||!Number.isInteger(data.level)||data.level<1||typeof data.name!=='string'||!data.equipment)return null;let clean={...data,claimed:Array.isArray(data.claimed)?data.claimed:[],inventory:Array.isArray(data.inventory)?data.inventory:[],stats:{kills:0,crab:0,bandit:0,spirit:0,boss:0,damage:0,goldEarned:0,xpEarned:0,...data.stats}};for(const slot of [...inventorySlotsLeft,...inventorySlotsRight])if(!(slot in clean.equipment))clean.equipment[slot]=null;
      if(!clean.preferences||typeof clean.preferences!=='object')clean.preferences={};
      if(!zones[clean.area])clean.area='beach';if(!factions[clean.factionId])clean.factionId='pirate';
      if(!clean.attributeVersion)preserveSave(localStorage.getItem(STORAGE_KEY));
      if(clean.attributeVersion!==2)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-attributes-v2');
      if(clean.forgeVersion!==MareForge.VERSION)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-forge-v3');
      return MareForge.migrate(MareCharacters.migrate(clean),itemDefs);}catch(e){return null;}}
  function elapsedString(sec){let s=Math.floor(sec),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
  function log(text,type='normal'){let box=$('gameLog');let el=document.createElement('div');el.className='log-line '+type;let t=new Date();el.innerHTML=`<time>${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}</time>${escapeHTML(text)}`;box.prepend(el);while(box.children.length>45)box.lastChild.remove();}
  function toast(text,type='normal'){let box=$('toastContainer'),el=document.createElement('div');el.className='toast '+type;el.textContent=text;box.appendChild(el);while(box.children.length>3)box.firstElementChild.remove();setTimeout(()=>el.remove(),3500);}
  function rewardNotice({gold=0,xp=0,name='',rarity='common'}={}){
    rewardBuffer=rewardBuffer||{gold:0,xp:0,names:[],rarity:'common'};rewardBuffer.gold+=gold;rewardBuffer.xp+=xp;
    if(name)rewardBuffer.names.push(name);
    const order=['common','uncommon','rare','epic','legendary','supreme'];if(order.indexOf(rarity)>order.indexOf(rewardBuffer.rarity))rewardBuffer.rarity=rarity;
    if(rewardTimer)return;
    rewardTimer=setTimeout(()=>{const reward=rewardBuffer;rewardBuffer=null;rewardTimer=null;
      const parts=[];if(reward.gold)parts.push('+'+fmt(reward.gold)+' dobrões');if(reward.xp)parts.push('+'+fmt(reward.xp)+' XP');
      if(reward.names.length)parts.push(reward.names[0]+(reward.names.length>1?' +'+(reward.names.length-1)+' item(ns)':''));
      toast(parts.join(' · '),'reward reward-'+reward.rarity);
    },650);
  }
  function initializeSession(){travelPath=[];keys.clear();rejectedTargets.clear();pursuit=new WeakMap();session={start:performance.now()/1000,elapsed:0,xp:0,gold:0,recentLoot:[],cooldowns:[0,0],guard:0,blessing:0,skillUses:[0,0],healingDone:0,respawn:0,spent:0,attackClock:0,lastHit:0,heroKOs:0,bossNotice:0};world={mobs:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:scene==='lobby'?540:580,y:scene==='lobby'?338:313,facing:1,attackAnim:0,walking:0},target:null,spawnClock:0,bossCooldown:0,nextID:Math.floor(Date.now()%1000000)};Object.assign(world.hero,activeMap().spawn,{direction:'front'});camera.update(world.hero,activeMap(),0,true);if(scene==='hunt')for(let i=0;i<7;i++)spawnMob();}
  function startGame(){scene='lobby';initializeSession();$('startOverlay').classList.add('hidden');autoPlay=true;autoSkills=true;setAreaLabels();configureFactionVisual();applySceneHudLayout();updateUI();renderPortrait();log('Bem-vindo ao Porto das Correntes.','good');log('Converse com os NPCs ou inicie sua expedição.');saveGame();}
  function enterHunt(){if(!game)return;factionShowcase=false;document.body.classList.remove('faction-showcase-open');$('factionInspection')?.classList.add('hidden');scene='hunt';autoPlay=true;autoSkills=true;lobbyDestination=null;lobbyAction=null;initializeSession();session.attackClock=0;world.target=null;setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Expedição iniciada: '+zones[game.area].name,'good');log('Você partiu para '+zones[game.area].name+'.','gold');saveGame();}
  function returnLobby(){if(!game)return;scene='lobby';lobbyDestination=null;lobbyAction=null;initializeSession();setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Você retornou ao Porto das Correntes.','good');log('De volta ao porto. Seus espólios foram preservados.','good');saveGame();}
  function activateNPC(npc){lobbyAction=null;if(npc.kind==='return'){returnLobby();return;}if(npc.kind==='hunt')openPanel('map');else openPanel(npc.kind);}
  function setAreaLabels(){let inLobby=scene==='lobby';let z=inLobby?{name:'Porto das Correntes',sub:'Refúgio dos Navegantes',label:'ÁREA SEGURA · CIDADE'}:zones[game.area];$('locationName').textContent=z.name;$('mapTitle').textContent=z.name.toUpperCase();$('overlayArea').textContent=z.sub.toUpperCase();$('sceneEyebrow').textContent=inLobby?'PORTO PRINCIPAL':'REGIÃO DE CAÇA';$('dangerRating').textContent=z.label;
    $('enterHunt').classList.toggle('hidden',!inLobby);$('returnLobby').classList.toggle('hidden',inLobby);$('navLobby').classList.toggle('active',inLobby);$('navHunt').classList.toggle('active',!inLobby);
    $('sceneInfo').textContent=inLobby?'ÁREA SEGURA · CLIQUE PARA CAMINHAR':'COMBATE AUTOMÁTICO ATIVO';$('worldHint').textContent=inLobby?'Clique para caminhar · WASD / setas · Clique nos NPCs para interagir':'Clique no chão para caminhar · Monstro: retomar caçada · WASD / setas';document.body.classList.toggle('scene-lobby',inLobby);document.body.classList.toggle('scene-hunt',!inLobby);}

  function monsterName(m){return m?.name||monsterTypes[m?.type]?.name||'';}
  function spawnMob(forceBoss=false){
    if(livingMobs().length>=11)return;
    const ember=activeMap().id==='embers',district=ember?(forceBoss?MareEmber.districts.find(d=>d.id==='caldeira'):MareEmber.nearestDistrict(world.hero)):null;
    const type=forceBoss?'boss':pick(district?.roles||zones[game.area].mobs),base=monsterTypes[type],areaScale=game.area==='swamp'?1.9:1,scale=areaScale*(1+Math.max(0,game.level-8)*.04);
    let x,y,valid=false;
    for(let k=0;k<70;k++){
      if(ember){
        const angle=Math.random()*Math.PI*2,radius=forceBoss?220+Math.random()*220:170+Math.random()*330;
        x=forceBoss?MareEmber.districts.find(d=>d.id==='caldeira').x+rand(-110,110):world.hero.x+Math.cos(angle)*radius;y=forceBoss?MareEmber.districts.find(d=>d.id==='caldeira').y+rand(-110,110):world.hero.y+Math.sin(angle)*radius;
        // Every spawn is grounded and reachable; the return quay is a combat-free arrival pocket.
        if(Math.hypot(x-MareEmber.map.spawn.x,y-MareEmber.map.spawn.y)<150)continue;
      }else{
        const zone=activeMap().spawnZones[k<40?0:Math.floor(Math.random()*activeMap().spawnZones.length)];x=rand(zone.x,zone.x+zone.w);y=rand(zone.y,zone.y+zone.h);
      }
      if(navigator().walkable(x,y)&&Math.hypot(x-world.hero.x,y-world.hero.y)>120&&world.mobs.every(m=>!m.alive||Math.hypot(x-m.x,y-m.y)>55)&&(!ember||navigator().path(world.hero,{x,y}).length)){valid=true;break;}
    }
    if(!valid)return;
    const skin=ember?MareEmber.skins[type]:null,maxHP=Math.round(base.hp*scale);
    world.mobs.push({id:world.nextID++,type,name:skin?.name,skin:skin?.id,district:district?.id,x,y,anchorX:x,anchorY:y,hp:maxHP,maxHP,attack:Math.round(base.atk*scale),defense:Math.round(base.def*scale),speed:base.speed,attackClock:rand(.4,2),bob:rand(0,6.28),alive:true,hit:0,slow:0,telegraph:0,emberFacing:'south',emberElapsed:0});
    if(type==='boss'){session.bossNotice=3.3;$('bossBanner').classList.remove('hidden');log((skin?.name||base.name)+' surgiu nas ruínas!','danger');}
  }
  function spawnVisual(x,y,text,color='#f9e9bc',size=15){world.fx.push({x,y,text,color,life:1.25,max:1.25,dy:-28,size});if(world.fx.length>70)world.fx.splice(0,10);}
  function addProjectile(x,y,tx,ty,color='#f4dfa1'){world.projectiles.push({x,y,tx,ty,progress:0,color});}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function livingMobs(){return world.mobs.filter(m=>m.alive&&m.hp>0);}
  function bentoAsset(){
    const asset=globalThis.MareFactionSprites?.assets['pirate-sword'];
    const ready=asset&&Object.values(asset.sheets).every(image=>image.complete&&image.naturalWidth);
    return game?.factionId==='pirate'&&game?.classId==='sword'&&asset?.meta.production_approved&&ready?asset:null;
  }
  function bentoController(){
    const asset=bentoAsset();if(!asset||scene!=='hunt')return null;
    if(!world.hero.combat)world.hero.combat=MareCombatAnimation.create(asset.meta.animations);
    return world.hero.combat;
  }
  function faceCombatTarget(m){
    const dx=m.x-world.hero.x,dy=m.y-world.hero.y;
    world.hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
    if(dx)world.hero.facing=dx<0?-1:1;
  }
  function chooseTarget(){let monsters=livingMobs().filter(m=>(rejectedTargets.get(m.id)||0)<=world.time);if(!monsters.length)return null;return monsters.reduce((best,cur)=>!best||distance(world.hero,cur)<distance(world.hero,best)?cur:best,null);}
  function outputDamage(m, amount, crit=false){if(!m||!m.alive)return;const damage=Math.max(1,Math.floor(amount));m.hp=Math.max(0,m.hp-damage);m.hit=.25;game.stats.damage+=damage;spawnVisual(m.x+rand(-8,8),m.y-40,String(damage),crit?'#ffcd73':'#fff5e4',crit?22:15);if(m.hp<=0)killMob(m);}
  function heroAttack(m,mult=1,skill=null,area=false,commit=false){
    const s=getDerived();
    if(scene!=='hunt'||!m||!m.alive||session.respawn>0||distance(world.hero,m)>s.range+(area?125:1)||!navigator().clear(world.hero,m))return false;
    const controller=bentoController();
    if(controller&&!commit){
      if(controller.locked())return false;
      faceCombatTarget(m);world.hero.walking=0;
      const action=skill?'skill':'attack';
      return controller.play(action,{direction:world.hero.direction,onImpact:()=>heroAttack(m,mult,skill,area,true)});
    }
    const elemental=MareCharacters.roles[game.classId].magic;
    const type=skill?.damageType||(elemental?'elemental':'physical');
    if(type==='physical'&&Math.random()>s.accuracy){spawnVisual(m.x,m.y-40,'ERROU','#cec4a6',11);return true;}
    const crit=Math.random()<s.crit,raw=MareCharacters.damage(s,m.defense,{type,multiplier:mult,variance:rand(.90,1.12),critical:crit});
    world.hero.attackAnim=.22;
    if(skill?.element==='lightning')m.slow=4.5;
    const color=skill?.element==='fire'?'#ff995b':skill?.element==='lightning'?'#dac2ff':elemental?'#70d9f1':classes[game.classId].color;
    if(['gunner','cyborg','strategist','healer'].includes(game.classId))addProjectile(world.hero.x+world.hero.facing*13,world.hero.y-27,m.x,m.y-24,color);
    else world.fx.push({x:m.x,y:m.y-9,slash:true,life:.22,max:.22,dy:0,color});
    if(elemental)world.fx.push({x:m.x,y:m.y-10,ring:1,life:.35,max:.35,color});
    outputDamage(m,raw,crit);if(skill)spawnVisual(world.hero.x,world.hero.y-59,skill.element==='fire'?'FOGO':skill.element==='lightning'?'RAIO':'HABILIDADE!',color,11);
    return true;
  }
  function restoreHero(amount){
    const recipient={id:'hero',hp:game.hp,maxHP:getDerived().maxHP};
    const healed=MareCharacters.healRecipients([recipient],amount)[0].amount;game.hp=recipient.hp;
    if(healed>0)spawnVisual(world.hero.x,world.hero.y-59,'+'+Math.round(healed),'#88e0b3',17);
    return healed;
  }
  function useSkill(i,manual=false){
    if(scene!=='hunt'||!game||!session||session.respawn>0)return false;
    const controller=bentoController();if(controller?.locked())return false;
    const skill=classes[game.classId].skills[i];if(!skill)return false;
    const m=world.target?.alive?world.target:chooseTarget(),d=getDerived();
    const self=['guard','heal','blessing'].includes(skill.type);
    if(session.cooldowns[i]>0||game.energy<skill.cost){if(manual)toast('Habilidade indisponível: cooldown ou energia.');return false;}
    if((skill.type==='heal'&&game.hp>=d.maxHP)||(skill.type==='blessing'&&session.blessing>0)){if(manual)toast('Você já está com vida cheia ou proteção ativa.');return false;}
    if(!self&&(!m||distance(world.hero,m)>d.range||!navigator().clear(world.hero,m))){if(manual)toast('Não há alvo ao alcance.');return false;}
    game.energy-=skill.cost;session.cooldowns[i]=skill.cd*(game.factionId==='government'?.92:1);
    session.skillUses=session.skillUses||[0,0];session.skillUses[i]++;
    if(skill.type==='strike')heroAttack(m,skill.multiplier,skill);
    if(skill.type==='guard'){session.guard=7;restoreHero(Math.round(d.maxHP*(game.classId==='cyborg'?.12:.18)+d.healing*.25));}
    if(skill.type==='heal'){session.healingDone=(session.healingDone||0)+restoreHero(d.healing);}
    if(skill.type==='blessing'){session.guard=8;session.blessing=8;world.fx.push({x:world.hero.x,y:world.hero.y,ring:1,life:.7,max:.7,color:'#8ce0b5'});}
    if(skill.type==='taunt'){
      session.guard=Math.max(session.guard,4);
      for(const other of livingMobs().filter(other=>distance(world.hero,other)<=d.range+125&&navigator().clear(world.hero,other))){
        other.taunt={targetId:'hero',remaining:5};heroAttack(other,skill.multiplier,skill,true);
      }
      world.fx.push({x:world.hero.x,y:world.hero.y,ring:1,life:.5,max:.5,color:'#e7bb81'});
    }
    if(skill.type==='area'){
      const impact=()=>{
        for(const other of livingMobs().filter(other=>distance(m,other)<125))heroAttack(other,skill.multiplier||1.55,skill,true,!!controller);
        world.fx.push({x:m.x,y:m.y,ring:1,life:.42,max:.42,color:skill.element==='lightning'?'#dac2ff':classes[game.classId].color});
      };
      if(controller){faceCombatTarget(m);world.hero.walking=0;controller.play('skill',{direction:world.hero.direction,onImpact:impact});}
      else impact();
    }
    return true;
  }
  function useAutoSupport(stats){
    if(!autoPlay||!autoSkills)return;
    const threshold=clamp(Number(game.preferences?.healThreshold)||.70,.25,.90);
    for(const [i,skill] of classes[game.classId].skills.entries()){
      if(skill.type==='heal'&&game.hp<stats.maxHP*threshold)useSkill(i);
      if(skill.type==='blessing'&&game.hp<stats.maxHP*.85&&session.guard<=0)useSkill(i);
      if(skill.type==='guard'&&game.hp<stats.maxHP*(game.classId==='cyborg'?.85:.75)&&session.guard<=0)useSkill(i);
    }
  }
  function gainXP(amount){let g=game;g.xp+=amount;g.stats.xpEarned+=amount;session.xp+=amount;let loops=0;while(g.xp>=xpNeeded(g.level)&&loops++<20){g.xp-=xpNeeded(g.level);g.level++;g.attributePoints=MareCharacters.earned(g.level)-MareCharacters.spent(g.attributes);let st=getDerived();g.hp=st.maxHP;g.energy=st.maxEnergy;spawnVisual(world.hero.x,world.hero.y-69,'NÍVEL '+g.level,'#e8c680',25);toast('Nível '+g.level+' alcançado! +5 pontos de atributo.','good');if(currentPanel==='character'||currentPanel==='map')renderPanel();log('Você alcançou o nível '+g.level+'.','good');if(g.level===8)toast('Nova região desbloqueada: Fenda da Névoa!','good');renderPortrait();}}
  function killMob(m){m.alive=false;world.target=world.target===m?null:world.target;let b=monsterTypes[m.type],areaScale=game.area==='swamp'?1.75:1;let gold=Math.round(rand(...b.gold)*areaScale*(factions[game.factionId]?.gold||1)),xp=Math.round(b.xp*areaScale);game.gold+=gold;game.stats.goldEarned+=gold;session.gold+=gold;game.stats.kills++;game.stats[m.type]++;gainXP(xp);rewardNotice({gold,xp});spawnVisual(m.x,m.y-70,'+'+gold+' ✦','#e7cb87',13);world.fx.push({x:m.x,y:m.y,ring:1,life:.7,max:.7,color:'#ffdb9b'});
    if(Math.random()<.36){let mats=m.type==='boss'?4:1;game.materials+=mats;addLoot('+'+mats+' Ferro Salgado','✦');}
    if(Math.random()<(m.type==='boss'?.95:.16)&&game.inventory.length<BAG_CAPACITY){let eligible=itemDefs.filter(d=>d.kind!=='pearl'&&(d.slot!=='weapon'||d.type===game.classId));let def=pick(eligible);if(m.type==='boss')def=pick(eligible.filter(d=>d.rarity!=='common'));let item=newItem(def, Math.max(1,Math.floor(game.level/5)),true);item.origin=zones[game.area].name;game.inventory.unshift(item);addLoot(def.name,def.symbol);rewardNotice({name:def.name,rarity:itemRarity(item)});}
    if(Math.random()<.095){game.potions++;addLoot('Poção de vida','♥');}
    if(m.type==='boss'){toast(''+monsterName(m)+' derrotado! +'+gold+' dobrões','good');log('Você derrotou '+monsterName(m)+'!','gold');game.hasSeenBoss=true;world.bossCooldown=10;}
    else if(game.stats.kills===1){toast('Primeiro inimigo derrotado!','good');log('Primeira vitória! Continue sua caçada.','good');}
    if(game.inventory.length<BAG_CAPACITY&&Math.random()<.05){const p=pick(MareForge.pearls.filter(p=>p.level===1)),def=itemDefs.find(d=>d.pearlId===p.id),item=newItem(def);game.inventory.unshift(item);addLoot(p.name,'◉');rewardNotice({name:p.name,rarity:p.rarity});}
    if(game.stats.kills%6===0)saveGame();
  }
  function addLoot(name,symbol){session.recentLoot.unshift({name,symbol});session.recentLoot=session.recentLoot.slice(0,4);}
  function lootIcon(name){const index=itemDefs.findIndex(item=>item.name===name);return index>=0?itemIcon(index,name):/ferro/i.test(name)?itemIcon('material',name):/poção/i.test(name)?itemIcon('potion',name):'';}
  function usePotion(manual=false){let d=getDerived();if(!game||!session||session.respawn>0)return false;if(game.potions<=0){if(manual)toast('Você não possui poções.','danger');return false;}if(game.hp>=d.maxHP){if(manual)toast('Sua vida já está cheia.');return false;}game.potions--;let heal=Math.round(d.maxHP*.44);game.hp=Math.min(d.maxHP,game.hp+heal);spawnVisual(world.hero.x,world.hero.y-48,'+'+heal,'#8cedb3',18);return true;}
  function buyPotion(){if(!game)return;if(game.gold<35){toast('Dobrões insuficientes.','danger');return;}game.gold-=35;game.potions++;toast('Poção adicionada à bolsa.','good');saveGame();updateUI();}
  function takeDamage(amount){
    const d=getDerived();if(Math.random()<d.evasion){spawnVisual(world.hero.x,world.hero.y-46,'ESQUIVA','#b8a8ef',13);return;}
    const dmg=MareCharacters.incoming(d,amount,session.guard>0,rand(.85,1.1));
    game.hp=Math.max(0,game.hp-dmg);session.lastHit=.25;spawnVisual(world.hero.x+10,world.hero.y-36,'-'+dmg,'#ff9b94',14);
    const controller=bentoController();
    if(controller){world.hero.walking=0;controller.play(game.hp<=0?'death':'hurt',{direction:world.hero.direction});}
    if(game.hp<=0){session.respawn=4.1;session.heroKOs++;toast('Você caiu em combate. Retornando em 4 segundos.','danger');log('Derrotado em batalha. Você renascerá em breve.','danger');world.target=null;}
  }
  function tick(dt){if(!game||!session)return;world.time+=dt;session.elapsed+=dt;game.totalPlay+=dt;session.cooldowns=session.cooldowns.map(v=>Math.max(0,v-dt));session.guard=Math.max(0,session.guard-dt);session.blessing=Math.max(0,session.blessing-dt);session.lastHit=Math.max(0,session.lastHit-dt);session.bossNotice=Math.max(0,session.bossNotice-dt);if(session.bossNotice<=0)$('bossBanner').classList.add('hidden');world.hero.attackAnim=Math.max(0,world.hero.attackAnim-dt);world.hero.walking=Math.max(0,world.hero.walking-dt);
    const combat=bentoController();
    combat?.step(dt,{moving:world.hero.walking>0,inCombat:scene==='hunt',direction:world.hero.direction});
    world.fx=world.fx.filter(f=>(f.life-=dt)>0);for(let f of world.fx)if(!f.slash&&!f.ring)f.y+=f.dy*dt;world.projectiles=world.projectiles.filter(p=>(p.progress+=dt*3.7)<1);
    const stats=getDerived();game.energy=Math.min(stats.maxEnergy,game.energy+dt*stats.energyRegen);
    if(scene==='lobby'){
      game.hp=Math.min(stats.maxHP,game.hp+dt*(stats.healthRegen+1.9));
      moveManually(dt);
      return;
    }
    if(session.respawn>0){session.respawn-=dt;if(session.respawn<=0){session.respawn=0;combat?.reset('front');world.hero.direction='front';game.hp=stats.maxHP;game.energy=stats.maxEnergy;Object.assign(world.hero,activeMap().spawn);travelPath=[];lobbyDestination=null;pursuit=new WeakMap();camera.update(world.hero,activeMap(),0,true);toast('Você retornou ao porto.','good');}return;}
    game.hp=Math.min(stats.maxHP,game.hp+dt*(stats.healthRegen+(session.blessing>0?stats.regenBuff:0)));useAutoSupport(stats);if(autoPlay&&game.hp<stats.maxHP*.40&&game.potions>0)usePotion(false);
    moveManually(dt);
    if(scene!=='hunt')return; // The quay interaction may have returned to the lobby this tick.
    for(let mob of world.mobs){
      if(!mob.alive)continue;
      mob.emberElapsed=(mob.emberElapsed||0)+dt;
      if(activeMap().id==='embers'){const dx=world.hero.x-mob.x,dy=world.hero.y-mob.y;mob.emberFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south');}
      mob.hit=Math.max(0,mob.hit-dt);mob.slow=Math.max(0,(mob.slow||0)-dt);mob.attackClock-=dt;mob.bob+=dt*2;
      if(mob.taunt)mob.taunt.remaining=Math.max(0,mob.taunt.remaining-dt);
      const reach=monsterTypes[mob.type].reach,md=distance(mob,world.hero);
      if(mob.attackClock<=0){if(md<=reach+10&&navigator().clear(mob,world.hero)){takeDamage(mob.attack);mob.attackClock=monsterTypes[mob.type].attackSec;}else mob.attackClock=.3;}
      if(md>reach*.75&&(md<440||mob.taunt?.remaining>0))navigateEntity(mob,world.hero,mob.speed*(mob.slow>0?.55:1)*.65,dt,reach*.75);
      else if(md>=440)navigator().move(mob,Math.sin(world.time*.65+mob.bob)*dt*2,0);
    }

    // Descartar inimigos derrotados: eles não podem bloquear novos spawns.
    if(world.mobs.some(m=>!m.alive||m.hp<=0))world.mobs=world.mobs.filter(m=>m.alive&&m.hp>0);
    if(activeMap().id==='embers'){world.mobs=world.mobs.filter(m=>m.type==='boss'||distance(m,world.hero)<900||world.target===m);}
    world.spawnClock-=dt;world.bossCooldown=Math.max(0,world.bossCooldown-dt);
    if(world.spawnClock<=0){world.spawnClock=1.8;if(livingMobs().length<7)spawnMob();let hasBoss=livingMobs().some(m=>m.type==='boss');if(!hasBoss&&(activeMap().id!=='embers'||Math.hypot(world.hero.x-MareEmber.districts.find(d=>d.id==='caldeira').x,world.hero.y-MareEmber.districts.find(d=>d.id==='caldeira').y)<550)&&world.bossCooldown<=0&&game.stats.kills>=10&&game.stats.kills>=10+game.stats.boss*15)spawnMob(true);}
    if(!autoPlay){session.attackClock=0;return;}
    // A transição entre cenas não pode deixar um alvo morto ou timer antigo congelar o Auto-Hunt.
    if(!Number.isFinite(session.attackClock)||session.attackClock>3)session.attackClock=0;
    let target=world.target?.alive&&world.target.hp>0?world.target:chooseTarget();world.target=target;
    if(target){let dist=distance(world.hero,target), desired=stats.range-8;
      if(dist>desired||!navigator().clear(world.hero,target)){
        const speed=stats.huntSpeed;
        if(!navigateEntity(world.hero,target,speed,dt,desired)){rejectedTargets.set(target.id,world.time+4);world.target=null;}
      }

      else{
        // Ranged classes keep space when the local navigation permits a retreat.
        if(['gunner','strategist','healer'].includes(game.classId)&&dist<stats.range*.45&&dist>0){
          const dx=(world.hero.x-target.x)/dist,dy=(world.hero.y-target.y)/dist;
          navigator().move(world.hero,dx*stats.huntSpeed*dt,dy*stats.huntSpeed*dt);
        }
        if(bentoController()&&autoSkills&&!bentoController().locked()){
          for(const [i,skill] of classes[game.classId].skills.entries()){
            if(skill.type==='strike'||(skill.type==='area'&&livingMobs().filter(m=>distance(m,target)<125).length>=2))useSkill(i);
          }
        }
        session.attackClock-=dt;if(session.attackClock<=0&&heroAttack(target))session.attackClock=1/Math.max(.35,stats.speed);
        if(autoSkills)for(const [i,skill] of classes[game.classId].skills.entries()){
          if(skill.type==='strike'||skill.type==='taunt'||(skill.type==='area'&&livingMobs().filter(m=>distance(m,target)<125).length>=2))useSkill(i);
        }
      }
    }
  }
  function bar(id,value,max){$(id).style.width=(clamp(value/max,0,1)*100).toFixed(1)+'%';}
  function updateUI(){if(!game||!session)return;if(currentPanel==='forge'&&forgeUI.tab==='fusion'&&forgeFusionStamp!==fusionInventoryStamp())renderPanel();let derived=getDerived(),c=classes[game.classId];$('heroLevel').textContent=game.level;$('heroClass').textContent=c.name.toUpperCase();configureFactionVisual();$('heroName').textContent=game.name;$('heroPower').textContent=fmt(derived.power);$('hpText').textContent=fmt(game.hp)+' / '+fmt(derived.maxHP);$('energyText').textContent=fmt(game.energy)+' / '+fmt(derived.maxEnergy);$('xpText').textContent=fmt(game.xp)+' / '+fmt(xpNeeded(game.level));bar('hpFill',game.hp,derived.maxHP);bar('energyFill',game.energy,derived.maxEnergy);bar('xpFill',game.xp,xpNeeded(game.level));$('goldAmount').textContent=fmt(game.gold);$('statAttack').textContent=fmt(derived.attack);$('statDefense').textContent=fmt(derived.defense);$('statCrit').textContent=Math.round(derived.crit*100)+'%';$('statSpeed').textContent=derived.speed.toFixed(2)+'/s';$('sessionTimer').textContent=elapsedString(session.elapsed);$('killsCount').textContent=fmt(game.stats.kills);$('bossCount').textContent=fmt(game.stats.boss);$('goldEarned').textContent=fmt(session.gold);$('damageTotal').textContent=fmt(game.stats.damage);$('expeditionState').textContent=scene==='lobby'?'NO PORTO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇANDO':'EM PAUSA';$('potionCount').textContent=game.potions;$('autoLabel').textContent=autoPlay?'ATIVADA':'PAUSADA';$('autoToggle').classList.toggle('active',autoPlay);$('autoToggle').disabled=scene==='lobby';$('autoToggle').classList.toggle('hidden',scene==='lobby');$('combatState').innerHTML='<i class="pulse-dot '+(autoPlay?'':'paused')+'"></i>'+(scene==='lobby'?'PORTO SEGURO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇADA AUTOMÁTICA':'CAÇADA PAUSADA');$('targetHint').textContent=scene==='lobby'?'NPCS · MISSÕES · FORJA · EXPEDIÇÕES':world.target?.alive?'ALVO: '+monsterName(world.target).toUpperCase():'PROCURANDO ALVO...';
    const hasTarget=scene==='hunt'&&world.target?.alive;
    $('targetHud').classList.toggle('hidden',scene!=='hunt'||!hasTarget);
    if(scene==='hunt'){
      if(activeMap().id==='embers')$('overlayArea').textContent=MareEmber.nearestDistrict(world.hero).name.toUpperCase();
      const ratio=hasTarget?clamp(world.target.hp/world.target.maxHP,0,1):0;
      $('targetHudState').textContent=session.respawn>0?'RENASCENDO':autoPlay?'ALVO EM COMBATE':'CAÇADA PAUSADA';
      $('targetHudLevel').textContent=hasTarget?(world.target.type==='boss'?'CHEFE':'NV '+Math.max(1,Math.round(game.level*0.9+(world.target.type==='spirit'?1:0)))):'—';
      $('targetHudName').textContent=hasTarget?monsterName(world.target).toUpperCase():'SEM ALVO';
      $('targetHudFill').style.width=(ratio*100).toFixed(1)+'%';
      $('targetHudHPText').textContent=hasTarget?fmt(world.target.hp)+' / '+fmt(world.target.maxHP):'PROCURANDO MONSTRO';
      $('targetHudHint').textContent=hasTarget?'ALVO BLOQUEADO · AUTO-ATAQUE':'SELECIONE OU AGUARDE O AUTO-ALVO';
    }
    const versionCaption=document.querySelector('.version-caption'); if(versionCaption)versionCaption.textContent='VERSÃO 1.3 · DEMO LOCAL';
    $('skill1').title=c.skills[0].name+' — '+c.skills[0].desc;$('skill2').title=c.skills[1].name+' — '+c.skills[1].desc;$('skill1Icon').textContent=c.symbol;$('skill2Icon').textContent=['guard','heal','blessing'].includes(c.skills[1].type)?'✚':c.skills[1].type==='area'?'✺':'✦';
    [0,1].forEach((i)=>{let el=$('cooldown'+(i+1));el.classList.toggle('cooling',session.cooldowns[i]>.1);el.textContent=session.cooldowns[i]>.1?session.cooldowns[i].toFixed(1)+'s':'';});
    syncExpeditionMini();
    $('xpPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.xp/session.elapsed*3600):'—';$('goldPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.gold/session.elapsed*3600):'—';$('questList').innerHTML=questDefs.map(q=>{let count=clamp(game.stats[q.stat]||0,0,q.target),done=game.claimed.includes(q.id),ready=count>=q.target&&!done;return `<div class="quest"><div class="quest-title"><span>${escapeHTML(q.title)}</span><b>${done?'CONCLUÍDO':count+' / '+q.target}</b></div><div class="quest-desc">${escapeHTML(q.desc)}</div><div class="progress-track"><i style="width:${count/q.target*100}%"></i></div>${ready?`<button data-claim="${q.id}">RESGATAR ${q.gold} ✦ + ${q.xp} XP</button>`:''}</div>`;}).join('');
    $('lootList').innerHTML=session.recentLoot.length?session.recentLoot.map(x=>`<div class="loot-entry"><span>${lootIcon(x.name)}${escapeHTML(x.name)}</span><b>OBTIDO</b></div>`).join(''):'<div class="empty-note">Sua próxima descoberta aparecerá aqui.</div>';
    updateMiniHud();const time=(6+Math.floor(world.time/90))%24; $('worldClock').textContent='DIA '+String(1+Math.floor(world.time/(90*24))).padStart(2,'0')+' · '+String(time).padStart(2,'0')+':00';
  }
  function renderPortrait(){if(!game)return;portrait.clearRect(0,0,72,72);portrait.fillStyle='#1b2632';portrait.fillRect(0,0,72,72);for(let i=0;i<18;i++){portrait.fillStyle=i%2?'#29394c':'#202f3f';portrait.fillRect((i*31)%72,(i*23)%72,4,4);}if(!drawFactionSprite(portrait,36,70,game.factionId,'idle',64))drawHero(portrait,36,66,game.classId,0,1.18,true);const mini=$('miniPortrait');if(mini){const mc=mini.getContext('2d');mc.imageSmoothingEnabled=false;mc.clearRect(0,0,64,64);mc.drawImage($('portrait'),0,0,64,64);}}
  function worldChange(area){if(!zones[area])return;if(game.level<zones[area].min){toast('Você precisa alcançar o nível '+zones[area].min+'.','danger');return;}game.area=area;game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;enterHunt();toast('Você navegou até '+zones[area].name+'.','good');log('Nova região: '+zones[area].name,'good');saveGame();}
  function claimQuest(id){let q=questDefs.find(q=>q.id===id);if(!q||game.claimed.includes(id)||game.stats[q.stat]<q.target)return;game.claimed.push(id);game.gold+=q.gold;gainXP(q.xp);session.gold+=q.gold;game.stats.goldEarned+=q.gold;toast('Contrato concluído! +'+q.gold+' dobrões','good');log('Recompensa do contrato: '+q.title,'gold');saveGame();updateUI();if(currentPanel==='contracts')renderPanel();}
  function getInventoryItem(id){return game.inventory.find(i=>i.id===id)||Object.values(game.equipment).find(i=>i?.id===id)||null;}
  function hasEquipped(item){return Object.values(game.equipment).some(i=>i?.id===item?.id);}
  function equipItem(id){let i=game.inventory.find(i=>i.id===id);if(!i||MareForge.isPearl(i,itemDefs))return;let def=itemBase(i);if(def.slot==='weapon'&&def.type!==game.classId){toast('Essa arma não pertence ao seu estilo de combate.','danger');return;}let d=getDerived(),hpFraction=game.hp/d.maxHP;let previous=game.equipment[def.slot];game.inventory=game.inventory.filter(it=>it.id!==id);game.equipment[def.slot]=i;if(previous)game.inventory.push(previous);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=i.id;forgeUI.itemId=i.id;forgeOutcome=null;recordEquipmentChange(d,def.slot,def.name+' equipado');toast(def.name+' equipado.','good');saveGame();renderPanel();updateUI();}
  function unequip(slot){let item=game.equipment[slot];if(!item||game.inventory.length>=BAG_CAPACITY)return;let d=getDerived(),hpFraction=game.hp/d.maxHP;game.equipment[slot]=null;game.inventory.unshift(item);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=item.id;recordEquipmentChange(d,slot,itemBase(item).name+' retirado');saveGame();renderPanel();updateUI();}
  function sellItem(id){let i=game.inventory.find(i=>i.id===id);if(!i)return;if(i.locked){toast('Destrave o item antes de vender.','danger');return;}let price=Math.round(14+i.level*7+i.plus*18);game.inventory=game.inventory.filter(it=>it.id!==id);game.gold+=price;selectedItem=null;toast('Item vendido por '+price+' dobrões.','good');saveGame();renderPanel();updateUI();}
  function forgeCost(item){return MareForge.upgradeCost(item);}
  function forgeItem(slot){runForgeOperation({type:'upgrade',itemId:forgeTarget()?.id,expectedSeq:game.forgeSeq});}
  function forgeTarget(){return getInventoryItem(forgeUI.itemId)||game.equipment[forgeSlot]||Object.values(game.equipment).find(Boolean)||game.inventory.find(i=>!MareForge.isPearl(i,itemDefs))||null;}
  function fusionInventoryStamp(){return JSON.stringify([game.gold,game.materials,game.inventory.map(i=>[i.id,i.locked,i.pearlId,i.rarity,i.level,i.plus,i.sockets])]);}
  function fusionSlotKey(){return forgeUI.fusionMode==='pearls'?'pearlFusionIds':'fusionIds';}
  function fusionAddition(token,index=-1){
    if(currentPanel!=='forge'||forgeUI.tab!=='fusion')return null;
    const key=fusionSlotKey(),slots=forgeUI[key],slot=index<0?slots.indexOf(null):index;
    if(!Number.isInteger(slot)||slot<0||slot>=5||slots[slot])return null;
    let item;
    if(key==='pearlFusionIds'){
      item=game.inventory.find(i=>MareForge.pearlOf(i,itemDefs)?.id===token&&!i.locked&&!slots.includes(i.id));
      const pearl=MareForge.pearlOf(item,itemDefs),first=MareForge.pearlOf(game.inventory.find(i=>i.id===slots.find(Boolean)),itemDefs);
      if(!pearl||pearl.level>=5||(first&&first.id!==pearl.id))return null;
    }else{
      item=game.inventory.find(i=>i.id===token);const first=game.inventory.find(i=>i.id===slots.find(Boolean));
      if(!item||item.locked||MareForge.isPearl(item,itemDefs)||item.sockets.some(Boolean)||['legendary','supreme'].includes(item.rarity)||slots.includes(item.id)||(first&&first.rarity!==item.rarity))return null;
    }
    return {key,index:slot,id:item.id};
  }
  function addFusionMaterial(token,index=-1){const selection=fusionAddition(token,index);if(!selection)return false;forgeUI[selection.key][selection.index]=selection.id;forgeOutcome=null;renderPanel();return true;}
  function renderForge(body){
    let item=forgeTarget();if(item&&MareForge.isPearl(item,itemDefs))item=null;
    if(item){if(forgeUI.itemId!==item.id)forgeOutcome=null;forgeUI.itemId=item.id;forgeSlot=itemBase(item).slot;if(!Number.isInteger(forgeUI.socket)||forgeUI.socket<0||forgeUI.socket>=item.sockets.length)forgeUI.socket=Math.max(0,item.sockets.indexOf(null));}
    if(!game.inventory.some(i=>i.id===forgeUI.pearlItemId&&!i.locked))forgeUI.pearlItemId=game.inventory.find(i=>MareForge.isPearl(i,itemDefs)&&!i.locked)?.id||'';
    for(const key of ['fusionIds','pearlFusionIds']){
      const seen=new Set();forgeUI[key]=Array.from({length:5},(_,n)=>{const id=forgeUI[key][n],i=game.inventory.find(i=>i.id===id);if(!i||i.locked||seen.has(id)||(key==='fusionIds'?(MareForge.isPearl(i,itemDefs)||i.sockets.some(Boolean)):!MareForge.isPearl(i,itemDefs)))return null;seen.add(id);return id;});
    }
    forgeFusionStamp=fusionInventoryStamp();
    body.innerHTML=MareForgeUI.render({game,defs:itemDefs,item,ui:forgeUI,result:forgeOutcome,derive:getDerived,icon:itemIcon,escapeHTML,fmt});
  }
  function runForgeOperation(command){
    const transition=MareForge.execute(game,command,itemDefs,Math.random);
    if(!transition.ok){forgeOutcome={type:command.type,success:false,message:transition.message};renderPanel();return;}
    game=transition.state;forgeOutcome=transition.result;const d=getDerived();game.hp=Math.min(game.hp,d.maxHP);game.energy=Math.min(game.energy,d.maxEnergy);
    if(command.itemId)selectedItem=command.itemId;saveGame();updateUI();renderPanel();renderPortrait();$('dialogBody').scrollTop=0;
  }
  function extraListHtml(extras){return (extras||[]).map(x=>`<span>${escapeHTML(MareForge.names[x.stat]||x.stat)} <b>+${x.stat==='crit'?(x.value*100).toFixed(2)+'%':fmt(x.value)}</b></span>`).join('');}
  function forgeItemDetails(item){
    const r=MareForge.rarity[itemRarity(item)],sums=MareForge.keys.map(k=>{const percent=(item.sockets||[]).reduce((sum,id)=>sum+(MareForge.pearlById[id]?.attribute===k?MareForge.pearlById[id].percent:0),0);return percent?`<span>${MareCharacters.attributes[k].short} +${Math.round(percent*100)}%</span>`:'';}).join('');
    return `<details class="op-forge-details"><summary>Nv.${item.level} · ${r.extras} extras · Sockets ${(item.sockets||[]).filter(Boolean).length}/${item.sockets?.length||0}</summary><p>Base: ATQ ${item.baseStats?.attack||0} · DEF ${item.baseStats?.defense||0} · VIDA ${item.baseStats?.hp||0}. Raridade ×${r.mult}; refinamento +${item.plus}.</p><div class="forge2-extras-inline">${extraListHtml(item.extras)}</div><div class="forge2-pearl-strip">${(item.sockets||[]).map(id=>id?itemIcon(id,MareForge.pearlById[id]?.name):'<span class="forge2-empty">·</span>').join('')}</div>${sums?`<p>Bônus somados: ${sums}</p>`:''}</details>`;
  }
  function pearlInventoryDetail(item){
    const p=MareForge.pearlOf(item,itemDefs);return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${p.rarity}">${itemIcon(p.id,p.name)}</div><div><h3>${escapeHTML(p.name)}</h3><small>${rarityNames[p.rarity]} · Pérola · Quantidade: 1</small></div></div><div class="op-detail-box"><p>Concede +${p.level*2}% de ${MareForge.names[p.attribute]} quando instalada em um equipamento em uso. Os percentuais são somados antes de multiplicar o atributo total.</p><p>Multiplicador individual: ×${p.multiplier.toFixed(2)}.</p></div><button type="button" class="op-action primary" data-open-imbue="${escapeHTML(item.id)}">ABRIR IMBUIMENTO</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button><p class="op-sell-line">Origem: ${escapeHTML(item.origin||'Caçadas ou fusão na forja')}.</p><div class="op-bottom-actions"><button disabled>Anunciar no Mercado</button><button disabled>Depositar no Cofre</button></div></div>`;
  }

  // INVENTÁRIO V0.6 — layout RPG em três colunas, filtros e ações reais.
  function itemCategory(item){const slot=itemBase(item).slot;return slot==='pearl'?'pearls':slot==='weapon'?'weapons':'armor';}
  function itemPower(item){if(!item||MareForge.isPearl(item,itemDefs))return 0;const slot=itemBase(item).slot,before={...game,equipment:{...game.equipment,[slot]:null}},after={...game,equipment:{...game.equipment,[slot]:item}};return getDerived(after).power-getDerived(before).power;}
  function statDeltaHtml(before,after){
    return [['power','Poder'],['attack','Ataque'],['defense','Defesa'],['maxHP','Vida']].map(([key,label])=>{const delta=after[key]-before[key];return `<span class="delta-stat ${delta>0?'positive':delta<0?'negative':'neutral'}"><small>${label}</small><b>${delta>0?'+':delta<0?'−':''}${fmt(Math.abs(delta))}</b></span>`;}).join('');
  }
  function recordEquipmentChange(before,slots,message){inventoryFeedback={before,after:getDerived(),slots:Array.isArray(slots)?slots:[slots],message,until:performance.now()+2500};}
  function activeEquipmentFeedback(){return inventoryFeedback&&inventoryFeedback.until>performance.now()?inventoryFeedback:null;}
  function isWeaponCompatible(item){return !MareForge.isPearl(item,itemDefs)&&(itemBase(item).slot!=='weapon'||itemBase(item).type===game.classId);}
  function sellPrice(item){return Math.round(14+item.level*7+item.plus*18);}
  function inventoryEntries(){
    const items=game.inventory.map((item,index)=>({kind:'gear',item,index,id:item.id,category:itemCategory(item),name:itemBase(item).name,rarity:itemRarity(item),qty:1}));
    if(game.potions>0)items.push({kind:'potion',id:'virtual-potion',category:'consumables',name:'Poção de Vida',rarity:'uncommon',qty:game.potions,index:-1});
    if(game.materials>0)items.push({kind:'material',id:'virtual-material',category:'materials',name:'Ferro Salgado',rarity:'common',qty:game.materials,index:-2});
    let found=items.filter(entry=>{
      const q=inventoryUI.query.trim().toLocaleLowerCase('pt-BR');
      return(!q||entry.name.toLocaleLowerCase('pt-BR').includes(q))&&(inventoryUI.category==='all'||inventoryUI.category===entry.category)&&(inventoryUI.rarity==='all'||inventoryUI.rarity===entry.rarity);
    });
    const rarityOrder={common:0,uncommon:1,rare:2,epic:3,legendary:4,supreme:5};
    found.sort((a,b)=>{
      if(inventoryUI.sort==='rarity')return rarityOrder[b.rarity]-rarityOrder[a.rarity]||a.name.localeCompare(b.name,'pt-BR');
      if(inventoryUI.sort==='power')return (b.kind==='gear'?itemPower(b.item):0)-(a.kind==='gear'?itemPower(a.item):0);
      if(inventoryUI.sort==='name')return a.name.localeCompare(b.name,'pt-BR');
      return (b.kind==='gear'?b.item.obtainedAt||0:0)-(a.kind==='gear'?a.item.obtainedAt||0:0)||b.index-a.index;
    });
    return found;
  }

  function itemIcon(key,name=''){
    const p=MareForge.pearlById[key]||MareForge.pearlById[itemDefs[key]?.pearlId];if(p)return `<img class="item-icon" src="assets/ui/pearls/${p.id}.svg" alt="${escapeHTML(name||p.name)}" draggable="false">`;
    return `<img class="item-icon" src="assets/ui/items/${key}.svg" alt="${escapeHTML(name)}" draggable="false">`;
  }
  function drawCurrentPreview(canvas,height){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    const armed=bentoAsset();
    if(armed&&MareFactionSprites.draw(c,'pirate-sword',canvas.width/2,canvas.height-10,{action:'guard',direction:'south',time:0,height}))return;
    drawFactionSprite(c,canvas.width/2,canvas.height-10,game.factionId,'idle',height);
  }
  function invSymbol(entry){return itemIcon(entry.kind==='gear'?entry.item.def:entry.kind,entry.name);}
  function invSlotHtml(slot){
    const item=game.equipment[slot],selected=item&&selectedItem===item.id, rarity=item?itemRarity(item):'';
    return `<button type="button" class="op-equip-slot ${activeEquipmentFeedback()?.slots.includes(slot)?'recent-equip':''} ${item?'filled rarity-'+rarity:''} ${selected?'selected':''}" data-inv-slot="${slot}" title="${slotNames[slot]}${item?' · '+escapeHTML(itemBase(item).name):' · Vazio'}"><span class="op-slot-label">${slot==='weapon'?'ARMA':slotNames[slot]}</span><span class="op-slot-frame"><span class="op-slot-icon">${item?itemIcon(item.def,itemBase(item).name):'<span class="empty-slot-mark">·</span>'}</span>${item?.locked?'<span class="op-item-lock" role="img" aria-label="Item bloqueado"></span>':''}${item?`<span class="op-slot-refine">+${item.plus||0}</span><span class="op-slot-power">${fmt(itemPower(item))}</span>`:''}</span></button>`;
  }
  function invSelected(){
    if(selectedItem==='virtual-potion'&&game.potions>0)return {kind:'potion',id:'virtual-potion'};
    if(selectedItem==='virtual-material'&&game.materials>0)return {kind:'material',id:'virtual-material'};
    const item=getInventoryItem(selectedItem);
    return item?{kind:'gear',item,id:item.id}:null;
  }
  function renderInventory(body){
    if(!invSelected())selectedItem=game.equipment.weapon?.id||game.inventory[0]?.id||(game.potions>0?'virtual-potion':game.materials>0?'virtual-material':null);
    const overlay=$('panelOverlay');overlay.classList.add('inventory-mode');
    const headMeta=$('inventoryHeadMeta');if(headMeta)headMeta.classList.add('hidden');
    const stats=getDerived();const f=factions[game.factionId]||factions.pirate;
    const filterCategories=[['all','TUDO'],['weapons','ARMAS'],['armor','ARMADURAS'],['consumables','CONSUMÍVEIS'],['materials','MATERIAIS'],['pearls','PÉROLAS']];
    const all=inventoryEntries();const pages=Math.max(1,Math.ceil(all.length/BAG_PER_PAGE));inventoryUI.page=Math.min(inventoryUI.page,pages-1);
    const shown=all.slice(inventoryUI.page*BAG_PER_PAGE,(inventoryUI.page+1)*BAG_PER_PAGE);
    const slots=shown.map(entry=>{
      const selected=selectedItem===entry.id; const item=entry.item; const icon=invSymbol(entry);
      return `<button class="op-item rarity-${entry.rarity} ${selected?'selected':''}" type="button" aria-pressed="${selected}" data-item="${entry.id}" title="${escapeHTML(entry.name)}"><span class="op-item-icon">${icon}</span>${item&&item.plus?`<span class="op-item-refine">+${item.plus}</span>`:''}${item&&item.locked?'<span class="op-item-lock" role="img" aria-label="Item bloqueado"></span>':''}${entry.qty>1?`<span class="op-item-qty">x${entry.qty}</span>`:''}</button>`;
    }).join('') + Array.from({length:BAG_PER_PAGE-shown.length},()=>'<span class="op-item empty" aria-hidden="true"></span>').join('');
    const sel=invSelected(); const detail=inventoryDetail(sel);
    const left=inventorySlotsLeft.map(invSlotHtml).join('')+'<span class="op-equip-spacer" aria-hidden="true"></span>'; const right=inventorySlotsRight.map(invSlotHtml).join('');
    const tab=inventoryUI.tab,feedback=activeEquipmentFeedback();
    const avatarExtra=tab==='visual'?`<div class="op-avatar-note"><strong>${escapeHTML(f.name)}</strong><p>${escapeHTML(f.desc)}</p></div>`:tab==='style'?`<div class="op-avatar-note"><strong>ESTILO</strong><p>${escapeHTML(classes[game.classId].skills[0].name)} · ${escapeHTML(classes[game.classId].skills[1].name)}</p></div>`:'';
    body.innerHTML=`<div class="op-inventory-shell">
      <div class="op-topbar">
        <div class="op-title-banner"><span class="op-jolly">☠</span><strong>INVENTÁRIO</strong></div>
        <div class="op-bag-capacity"><img class="menu-inline-icon" src="icones_menu_pirata/png/64/inventario.png" alt=""> MOCHILA <b>${game.inventory.length} / ${BAG_CAPACITY}</b></div>
        <div class="op-top-actions"><kbd>[I]</kbd><button type="button" class="op-close" data-close-panel aria-label="Fechar inventário">✕</button></div>
      </div>
      <div class="op-body-grid">
        <section class="op-panel op-character-panel">
          <div class="op-tabs">${[['equipment','EQUIPAMENTO'],['visual','VISUAL'],['style','ESTILO']].map(([id,label])=>`<button type="button" data-inv-tab="${id}" class="${tab===id?'active':''}">${label}</button>`).join('')}</div>
          <div class="op-character-core">
            <div class="op-equip-side left">${left}</div>
            <div class="op-avatar-column">
              <div class="op-avatar-stage"><canvas id="inventorySprite" width="180" height="220" aria-label="Visual atual do personagem"></canvas></div>
              <div class="op-avatar-meta"><strong>${escapeHTML(game.name)}</strong><span>Nível ${game.level}</span><span>Classe: ${escapeHTML(classes[game.classId].name.replace(' / ',' · '))}</span></div>
              <div class="op-power-banner ${feedback?'power-updated':''}"><span>⚔⚔</span><label>PODER TOTAL</label><b>${fmt(stats.power)}</b></div>
              <div class="op-stats-list"><div><span>❤ Vida</span><b>${fmt(stats.maxHP)}</b></div><div><span>⚔ Ataque</span><b>${fmt(stats.attack)}</b></div><div><span>🛡 Defesa</span><b>${fmt(stats.defense)}</b></div></div>
              ${feedback?`<output class="op-equip-feedback" aria-live="polite">${escapeHTML(feedback.message)}<span>${statDeltaHtml(feedback.before,feedback.after)}</span></output>`:''}${avatarExtra}
            </div>
            <div class="op-equip-side right">${right}</div>
          </div>
          <label class="op-hide-check"><input type="checkbox" id="invHideProfile" ${game.preferences?.hideItems?'checked':''}><span>Ocultar itens no perfil</span></label>
        </section>
        <section class="op-panel op-bag-panel">
          <div class="op-panel-head"><div class="op-head-left"><img class="menu-inline-icon" src="icones_menu_pirata/png/64/inventario.png" alt=""><h3>MOCHILA</h3></div><button type="button" class="op-best-btn" data-auto-equip>EQUIPAR MELHORES</button></div>
          <div class="op-tool-row"><label class="op-search"><span>⌕</span><input id="invSearch" type="search" placeholder="Buscar pelo nome..." value="${escapeHTML(inventoryUI.query)}" autocomplete="off"></label><select id="invSort" aria-label="Ordenação"><option value="recent" ${inventoryUI.sort==='recent'?'selected':''}>Recentes</option><option value="rarity" ${inventoryUI.sort==='rarity'?'selected':''}>Raridade</option><option value="power" ${inventoryUI.sort==='power'?'selected':''}>Maior poder</option><option value="name" ${inventoryUI.sort==='name'?'selected':''}>Nome (A–Z)</option></select><select id="invRarity" aria-label="Filtro de raridade">${[['all','Todas'],['common','Comum'],['uncommon','Incomum'],['rare','Raro'],['epic','Épico'],['legendary','Lendário'],['supreme','Supremo']].map(([v,l])=>`<option value="${v}" ${inventoryUI.rarity===v?'selected':''}>${l}</option>`).join('')}</select></div>
          <div class="op-category-tabs">${filterCategories.map(([id,label])=>`<button type="button" data-inv-category="${id}" class="${inventoryUI.category===id?'active':''}">${label}</button>`).join('')}</div>
          <div class="op-grid-wrap"><div class="op-grid">${slots}</div></div>
          <div class="op-pagination"><span class="op-page-count">${all.length?inventoryUI.page*BAG_PER_PAGE+1:0}–${Math.min((inventoryUI.page+1)*BAG_PER_PAGE,all.length)} de ${all.length}</span><button type="button" data-inv-page="${inventoryUI.page-1}" ${inventoryUI.page===0?'disabled':''}>‹</button>${Array.from({length:pages},(_,n)=>`<button type="button" data-inv-page="${n}" class="${n===inventoryUI.page?'active':''}">${n+1}</button>`).join('')}<button type="button" data-inv-page="${inventoryUI.page+1}" ${inventoryUI.page===pages-1?'disabled':''}>›</button></div>
        </section>
        <section class="op-panel op-detail-panel">${detail}</section>
      </div>
    </div>`;
    drawCurrentPreview($('inventorySprite'),185);
  }
  function inventoryDetail(sel){
    if(!sel)return `<div class="op-detail-wrap op-detail-empty"><div class="op-detail-icon empty">?</div><div><h3>Nenhum item selecionado</h3><small>Escolha um item da mochila ou um slot equipado.</small></div><p>Use os filtros centrais para localizar armas, armaduras, consumíveis e materiais.</p></div>`;
    if(sel.kind==='potion'||sel.kind==='material'){
      const potion=sel.kind==='potion'; const qty=potion?game.potions:game.materials;
      const icon=itemIcon(potion?'potion':'material',potion?'Poção de Vida':'Ferro Salgado');
      return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${potion?'uncommon':'common'}">${icon}</div><div><h3>${potion?'Poção de Vida':'Ferro Salgado'}</h3><small>${potion?'Incomum · Consumível':'Comum · Material'} · Quantidade: ${qty}</small></div></div><div class="op-detail-box"><p>${potion?'Elixir de uso rápido que restaura 44% da vida máxima do aventureiro.':'Material utilizado na forja e no aprimoramento de equipamentos marítimos.'}</p></div><div class="op-effect-list"><div><span>Efeito</span><b>${potion?'Recupera Vida':'Material de Forja'}</b></div><div><span>Origem</span><b>Recompensa de caçada</b></div></div><div class="op-origin-row"><div><span>Valor de venda</span><b>${potion?'35':'—'}</b></div><div><span>Origem</span><b>${potion?'Mercador donquixote':'Ruínas e contratos'}</b></div></div>${potion?`<button type="button" class="op-action primary" data-inv-use-potion ${game.hp>=getDerived().maxHP?'disabled':''}>USAR</button><button type="button" class="op-action secondary" data-panel="shop">COMPRAR MAIS</button>`:`<button type="button" class="op-action primary" data-panel="forge">ABRIR FORJA</button><button type="button" class="op-action secondary" disabled>ITEM DE MATERIAL</button>`}<div class="op-bottom-actions"><button type="button" disabled>Anunciar no Mercado</button><button type="button" disabled>Depositar no Cofre</button></div></div>`;
    }
    if(MareForge.isPearl(sel.item,itemDefs))return pearlInventoryDetail(sel.item);
    const item=sel.item,def=itemBase(item),a=itemStats(item),eq=hasEquipped(item),price=sellPrice(item),compatible=isWeaponCompatible(item);
    const category = ({weapon:'Arma',head:'Armadura',necklace:'Acessório',coat:'Armadura',legs:'Armadura',boots:'Armadura',cloak:'Visual',gloves:'Armadura',ring:'Acessório',belt:'Acessório',charm:'Acessório'})[def.slot]||'Item';
    const quote = def.slot==='weapon'?'“Uma arma confiável muda o destino da expedição.”':def.slot==='charm'||def.slot==='ring'||def.slot==='necklace'?'“Relíquias carregam histórias de marés antigas.”':'“Equipamentos sólidos mantêm a tripulação de pé.”';
    const comparison=!eq&&compatible?`<section class="op-comparison" aria-label="Mudança ao equipar"><strong>Ao equipar</strong><div>${statDeltaHtml(getDerived(),getDerived({...game,equipment:{...game.equipment,[def.slot]:item}}))}</div></section>`:'';
    const desc=`${def.slot==='weapon'?'Arma adaptada ao estilo de combate da sua classe.':'Peça de expedição reforçada para aventuras em alto-mar.'} Este item aumenta seu poder total imediatamente quando equipado.`;
    return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${itemRarity(item)}">${itemIcon(item.def,def.name)}</div><div><h3>${escapeHTML(def.name)} ${item.plus?`+${item.plus}`:''}</h3><small>${rarityNames[itemRarity(item)]} · ${category} · Quantidade: 1</small></div></div><div class="op-detail-box"><p>${escapeHTML(desc)}</p><div class="op-effect-list"><div><span>+ Ataque</span><b>${a.attack}</b></div><div><span>+ Defesa</span><b>${a.defense}</b></div><div><span>+ Vida</span><b>${a.hp}</b></div><div><span>Poder</span><b>${fmt(itemPower(item))}</b></div></div><blockquote>${quote}</blockquote></div>${forgeItemDetails(item)}${comparison}<div class="op-origin-row"><div><span>Valor de venda</span><b>${fmt(price)}</b></div><div><span>Origem</span><b>${escapeHTML(item.origin||'Espólio de aventura')}</b></div></div>${eq?`<button type="button" class="op-action primary" data-unequip="${def.slot}">RETIRAR</button>`:`<button type="button" class="op-action primary" data-equip="${escapeHTML(item.id)}" ${!compatible?'disabled':''}>${compatible?'EQUIPAR':'INCOMPATÍVEL'}</button>`}<button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button><div class="op-bottom-actions"><button type="button" disabled>Anunciar no Mercado</button><button type="button" disabled>Depositar no Cofre</button></div>${!eq?`<div class="op-sell-line">Venda rápida ao Mercador donquixote: <button type="button" class="op-sell-link" data-sell="${escapeHTML(item.id)}" ${item.locked?'disabled':''}>${fmt(price)} dobrões</button></div>`:''}</div>`;
  }
  function equipBest(){
    if(!game)return;
    const was=getDerived(),fraction=was.maxHP?game.hp/was.maxHP:1;
    let count=0,changedSlots=[];
    for(const slot of [...inventorySlotsLeft,...inventorySlotsRight]){
      const options=game.inventory.filter(i=>itemBase(i).slot===slot&&isWeaponCompatible(i));
      if(!options.length)continue;
      options.sort((a,b)=>itemPower(b)-itemPower(a));
      const best=options[0],old=game.equipment[slot];
      if(old&&itemPower(old)>=itemPower(best))continue;
      game.inventory=game.inventory.filter(i=>i.id!==best.id);
      game.equipment[slot]=best;
      if(old)game.inventory.push(old);
      count++;changedSlots.push(slot);
    }
    if(count){game.hp=Math.max(1,Math.min(getDerived().maxHP,Math.round(getDerived().maxHP*fraction)));selectedItem=game.equipment[changedSlots[0]]?.id||null;recordEquipmentChange(was,changedSlots,'Melhores equipamentos aplicados');saveGame();updateUI();toast(count+' equipamento(s) melhorado(s)!','good');}
    else toast('Os melhores itens já estão equipados.');
    renderPanel();
  }
  function renderCharacter(body){
    const d=getDerived(),c=classes[game.classId],r=MareCharacters.roles[game.classId];
    const available=MareCharacters.earned(game.level)-MareCharacters.spent(game.attributes);
    const pending=MareCharacters.spent(attributeDraft),remaining=available-pending;
    const projected={...game,attributes:Object.fromEntries(MareCharacters.keys.map(k=>[k,game.attributes[k]+attributeDraft[k]]))};
    const next=getDerived(projected);
    const stats=[['maxHP','Vida máxima'],['maxEnergy','Energia máxima'],['physical','Dano físico'],['elemental','Dano elemental'],['defense','Defesa'],['speed','Ataques por segundo'],['accuracy','Precisão'],['crit','Crítico'],['evasion','Esquiva'],['energyRegen','Energia por segundo'],['healthRegen','Vida por segundo']];
    if(['healer','brawler','cyborg'].includes(game.classId))stats.push(['healing','Potência de cura'],['protection','Redução sob proteção']);
    if(game.classId==='healer')stats.push(['regenBuff','Regeneração da bênção']);
    const value=(key,n)=>['crit','evasion','accuracy','protection'].includes(key)?(n*100).toFixed(1)+'%':['speed','energyRegen','healthRegen','regenBuff'].includes(key)?n.toFixed(2):fmt(n);
    body.innerHTML=`<div class="character-layout ${performance.now()<attributeSuccessUntil?'attributes-confirmed':''}">
      <section class="character-identity"><h3>Seu aventureiro</h3><canvas id="characterSprite" width="180" height="190" aria-label="Sprite do personagem"></canvas>
        <h2>${escapeHTML(game.name)}</h2><p>${escapeHTML(factions[game.factionId].name)}</p><strong>${escapeHTML(c.name)}</strong><p>Nível ${game.level} · ${r.role}</p>
        <div class="character-power">Poder de combate <b id="characterPower">${fmt(d.power)}${next.power!==d.power?` <span>→ ${fmt(next.power)}</span>`:''}</b></div>
        <p class="attribute-guide">Principal: ${MareCharacters.attributes[r.primary].name}<br>Secundário: ${MareCharacters.attributes[r.secondary].name}</p>
        <div class="character-skills">${c.skills.map(skill=>`<p><b>${escapeHTML(skill.name)}</b><br>${escapeHTML(skill.desc)}<small>${skill.cost} energia · ${skill.cd}s de recarga</small></p>`).join('')}</div>
      </section>
      <section class="character-allocation"><h3>Distribuir atributos</h3><p class="attribute-guide">50 pontos de nascimento definidos pela classe, preservados separadamente. Você ganha 5 pontos livres por nível a partir do nível 2.</p>
        <div class="attribute-budget"><span>Pontos disponíveis</span><strong id="pointsAvailable">${remaining}</strong></div><div class="allocation-presets" role="group" aria-label="Quantidade de pontos">${[1,5,10,25,'max'].map(q=>`<button type="button" data-attribute-quantity="${q}" aria-pressed="${attributeQuantity===q}" class="${attributeQuantity===q?'active':''}">${q==='max'?'MÁX':'+'+q}</button>`).join('')}</div>
        ${MareCharacters.keys.map(key=>{const a=MareCharacters.attributes[key];return `<div class="attribute-row" data-attribute-row="${key}"><div><b>${a.name} <small>${a.short}</small></b><span>${a.description}<small class="attribute-breakdown">Base ${MareCharacters.birth[game.classId][key]} · Investidos ${game.attributes[key]} · Equip. +${Math.round((d.preAttributes[key]-MareCharacters.birth[game.classId][key]-game.attributes[key])*100)/100}${d.pearlPercent[key]?` · Pérolas +${Math.round(d.pearlPercent[key]*100)}%`:''}</small></span></div><strong data-attribute-value="${key}">${next.attributes[key]}${attributeDraft[key]?` <em>(+${attributeDraft[key]})</em>`:''}</strong><button type="button" data-attribute-remove="${key}" aria-label="Retirar ponto de ${a.name}" ${attributeDraft[key]<=0?'disabled':''}>−</button><button type="button" data-attribute-add="${key}" aria-label="Adicionar ponto em ${a.name}" ${remaining<=0?'disabled':''}>+</button></div>`;}).join('')}
        <p id="allocationStatus" class="attribute-guide" aria-live="polite">${allocationMessage|| (pending?`${pending} ponto(s) na prévia. Confirme para aplicar ao combate.`:'Escolha onde investir. Apenas a confirmação gasta seus pontos.')}</p>
        <button type="button" class="dialog-button" id="confirmAttributes" ${pending===0?'disabled':''}>CONFIRMAR DISTRIBUIÇÃO</button>
        <button type="button" class="dialog-button secondary" id="resetAttributeDraft" ${pending===0?'disabled':''}>LIMPAR DISTRIBUIÇÃO PENDENTE</button><button type="button" class="dialog-button secondary" id="cancelAttributes">CANCELAR ALTERAÇÕES</button>
        ${game.classId==='healer'?`<label class="healing-preference">Curar automaticamente abaixo de <select id="healThreshold">${[.4,.5,.6,.7,.8,.9].map(n=>`<option value="${n}" ${Math.abs((Number(game.preferences.healThreshold)||.7)-n)<.001?'selected':''}>${Math.round(n*100)}% da vida</option>`).join('')}</select></label>`:''}
      </section>
      <section class="character-derived"><h3>Resultado em combate</h3><p class="attribute-guide">Atual <span class="preview-key">→ Após confirmar</span></p>
        <div class="derived-list">${stats.map(([key,label])=>`<div data-derived="${key}"><span>${label}</span><b>${value(key,d[key])}${Math.abs(next[key]-d[key])>.00001?` <em>→ ${value(key,next[key])}</em>`:''}</b></div>`).join('')}</div>
        <p class="attribute-guide">${MareCharacters.roles[game.classId].magic?'Ataques básicos e habilidades ofensivas usam dano elemental.':'Ataques e habilidades ofensivas usam dano físico.'} Equipamentos e bônus de facção já estão incluídos.</p>
      </section></div>`;
    drawCurrentPreview($('characterSprite'),155);
  }
  function showConfirmation(title,message,accept,acceptLabel='RECOMEÇAR',danger=true){
    if(document.querySelector('.confirmation-overlay'))return;
    const prior=document.activeElement,overlay=document.createElement('div');overlay.className='confirmation-overlay';
    overlay.innerHTML=`<section class="confirmation-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationMessage"><h2 id="confirmationTitle">${escapeHTML(title)}</h2><p id="confirmationMessage">${escapeHTML(message)}</p><footer><button type="button" class="dialog-button secondary" data-confirm-cancel>${acceptLabel==='RECOMEÇAR'?'VOLTAR':'CANCELAR'}</button><button type="button" class="dialog-button ${danger?'danger':''}" data-confirm-accept>${escapeHTML(acceptLabel)}</button></footer></section>`;
    const close=()=>{overlay.remove();prior?.focus();};
    overlay.querySelector('[data-confirm-cancel]').onclick=close;
    let accepted=false;overlay.querySelector('[data-confirm-accept]').onclick=()=>{if(accepted)return;accepted=true;close();accept();};
    overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){event.preventDefault();const buttons=[...overlay.querySelectorAll('button')];buttons[document.activeElement===buttons[0]?1:0].focus();}});
    document.body.append(overlay);overlay.querySelector('button').focus();
  }
  function confirmAttributes(){
    if(!MareCharacters.commit(game,attributeDraft)){toast('Pontos insuficientes ou distribuição inválida.','danger');return;}
    attributeDraft=MareCharacters.empty();allocationMessage="";attributeSuccessUntil=performance.now()+1600;saveGame();updateUI();renderPanel();toast('Atributos aplicados ao combate.','good');
  }
  // Ship levels identify destinations; character requirements come from the existing zones.
  const voyageDestinations=[
    {id:'ship-1',level:1,area:'beach',ship:0,x:23,y:70},
    {id:'ship-2',level:2,area:'swamp',ship:1,x:23,y:30},
    {id:'ship-3',level:3,area:null,ship:0,x:50,y:20},
    {id:'ship-4',level:4,area:null,ship:1,x:77,y:30},
    {id:'ship-5',level:5,area:null,ship:0,x:77,y:70},
    {id:'ship-6',level:6,area:null,ship:1,x:50,y:80}
  ];
  let mapReturnFocus=null;
  function renderVoyages(body){
    body.innerHTML=`<section class="voyage-window" aria-label="Destinos de viagem"><p class="voyage-intro">Escolha um navio e navegue até sua próxima caçada.</p><div class="voyage-sea"><div class="voyage-ring" aria-hidden="true"></div><div class="voyage-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 100 100"><path d="M50 4 61 39 96 50 61 61 50 96 39 61 4 50 39 39Z" fill="#c8ad6b"/><path d="M50 4 50 50 39 39ZM96 50 50 50 61 39ZM50 96 50 50 61 61ZM4 50 50 50 39 61Z" fill="#506e6f"/><circle cx="50" cy="50" r="8" fill="#142e39" stroke="#dac18d"/></svg></div>${voyageDestinations.map(d=>{
      const zone=zones[d.area],future=!zone,locked=!future&&game.level<zone.min,name=zone?.name||'Destino futuro',status=future?'Em breve':locked?'Requer personagem Nv. '+zone.min:'Personagem Nv. '+zone.min+'+';
      return `<button type="button" class="voyage-destination ${future?'is-future':locked?'is-locked':'is-available'}" data-voyage-id="${d.id}" ${zone?`data-area="${d.area}" data-current="${game.area===d.area}"`:''} style="--port-x:${d.x}%;--port-y:${d.y}%;--ship-x:${d.ship?100:0}%" ${future||locked?'disabled':''} aria-label="Navio nível ${d.level}, ${escapeHTML(name)}, ${status}"><span class="voyage-level">Nível ${d.level}</span><span class="voyage-ship-art" aria-hidden="true"></span><strong>${escapeHTML(name)}</strong><small>${status}</small>${zone&&scene==='hunt'&&game.area===d.area?'<em>Você está aqui</em>':''}</button>`;
    }).join('')}</div><footer class="voyage-footer"><span>Rotas conhecidas do arquipélago</span><p>O nível do navio identifica a rota. Os requisitos do personagem aparecem em cada destino.</p></footer></section>`;
  }
  function renderPanel(){if(!currentPanel||!game)return;const body=$('dialogBody');$('panelOverlay').classList.toggle('character-mode',currentPanel==='character');$('panelOverlay').classList.toggle('voyage-mode',currentPanel==='map');if(currentPanel!=='inventory'){$('panelOverlay').classList.remove('inventory-mode');$('inventoryHeadMeta')?.classList.add('hidden');}const titles={inventory:'Inventário',forge:'Forja das Correntes',character:'Seu aventureiro',map:'Mapa do Arquipélago',contracts:'Quadro de Contratos',shop:'Mercador do Porto',help:'Guia do Navegante'};$('dialogTitle').textContent=titles[currentPanel]||currentPanel;body.dataset.view=currentPanel;document.querySelectorAll('.bottom-nav [data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===currentPanel)));
    if(currentPanel==='shop'){body.innerHTML=`<div class="mini-heading">MERCADOR donquixote · SUPRIMENTOS</div><div class="item-detail">${itemIcon('potion','Poção de vida')}<h3>Poção de vida</h3><p>Restaura 44% da vida máxima.<br>Preço: <strong>35 dobrões</strong><br>Seu saldo: <strong>${fmt(game.gold)}</strong></p><button class="dialog-button" data-buy-potion="1" ${game.gold<35?'disabled':''}>COMPRAR 1 POÇÃO</button></div>`;}
    if(currentPanel==='contracts'){body.innerHTML='<div class="mini-heading">CONTRATOS DO PORTO</div><div class="contracts-modal">'+questDefs.map(q=>{let n=Math.min(q.target,game.stats[q.stat]||0),done=game.claimed.includes(q.id);return `<div class="contract-modal-entry"><h3>${escapeHTML(q.title)}</h3><p>${escapeHTML(q.desc)}</p><span>${done?'CONCLUÍDO':n+' / '+q.target}</span><p class="contract-reward">Recompensa: <b>${q.gold} dobrões · ${q.xp} XP</b></p><div class="progress-track"><i style="width:${n/q.target*100}%"></i></div>${n>=q.target&&!done?`<button class="dialog-button" data-claim="${q.id}">RESGATAR · ${q.gold} DOBRÕES + ${q.xp} XP</button>`:''}</div>`;}).join('')+'</div>';}
    if(currentPanel==='inventory'){renderInventory(body);}
    if(currentPanel==='forge')renderForge(body);
    if(currentPanel==='character')renderCharacter(body);
    if(currentPanel==='map')renderVoyages(body);
    if(currentPanel==='help'){body.innerHTML=`<div class="help-copy"><p><strong>Bem-vindo a Maré Partida.</strong> Esta é uma demonstração jogável offline de um futuro RPG Idle online, em um universo marítimo original.</p><ul><li><strong>Lobby:</strong> clique no chão para caminhar e nos NPCs para abrir seus serviços. Abra o Mapa e escolha um navio para viajar.</li><li><strong>Auto-caçada:</strong> seu personagem procura monstros, anda até eles e ataca sozinho. O botão AUTO-CAÇADA pausa ou retoma.</li><li><strong>Teclas 1 e 2:</strong> ativam habilidades; se a caçada estiver ligada, o personagem também usa habilidades automaticamente quando apropriado.</li><li><strong>Tecla Q:</strong> usa uma poção de vida. É possível comprar mais por 35 dobrões.</li><li><strong>Contratos:</strong> conclua as caçadas listadas à direita e resgate as recompensas.</li><li><strong>Inventário:</strong> equipe os itens encontrados. Equipamentos alteram atributos reais.</li><li><strong>Forja:</strong> consome materiais e dobrões para melhorar equipamentos até +5.</li><li><strong>Mapa:</strong> a Fenda da Névoa é desbloqueada no nível 8.</li><li><strong>Salvamento:</strong> seu progresso é salvo automaticamente neste navegador, com LocalStorage. Não existe conta online, chat real ou progresso com a página fechada nesta versão.</li></ul><p>Este é um protótipo gratuito de desenvolvimento. O MMORPG, o servidor multiplayer, o banco de dados e as relíquias estão planejados para fases posteriores.</p><button class="dialog-button secondary" data-export="1">EXPORTAR SAVE (JSON)</button><button class="dialog-button secondary" data-import="1">IMPORTAR SAVE</button><button class="dialog-button secondary" data-reset="1">RECOMEÇAR JOGO</button></div><input type="file" id="saveImport" accept=".json,application/json" style="display:none"/>`;}
    if(currentPanel==='help'){
      const list=body.querySelector('.help-copy ul'),items=[...list.children],sections=document.createElement('div');sections.className='help-sections';
      for(const [title,start,end] of [['Exploração e combate',0,4],['Progressão e equipamentos',4,8],['Seu progresso salvo',8,9]]){
        const section=document.createElement('section'),heading=document.createElement('h3'),group=document.createElement('ul');heading.textContent=title;items.slice(start,end).forEach(item=>group.append(item));section.append(heading,group);sections.append(section);
      }
      list.replaceWith(sections);
      const attributes=document.createElement('p');attributes.className='help-attributes';attributes.textContent='Atributos: cada classe nasce com 50 pontos fixos. A partir do nível 2, você ganha 5 pontos livres por nível. Em Personagem, escolha +1, +5, +10, +25 ou MÁX, confira a prévia e confirme para aplicar. Cancelar preserva seus pontos.';sections.children[1].append(attributes);
    }
  }
  function openPanel(panel){if(!game)return;if(panel==='hunts')panel='map';if(panel==='map'&&currentPanel!=='map')mapReturnFocus=document.activeElement;if(panel==='inventory'){inventoryUI.page=0;}if(panel==='character'&&currentPanel!=='character')attributeDraft=MareCharacters.empty();currentPanel=panel;$('panelOverlay').classList.remove('hidden');renderPanel();if(panel==='map')$('dialogBody').querySelector('.voyage-destination:not(:disabled)')?.focus({preventScroll:true});}
  function closePanel(){const wasMap=currentPanel==='map';attributeDraft=MareCharacters.empty();allocationMessage="";currentPanel=null;document.querySelectorAll('.bottom-nav [aria-pressed]').forEach(b=>b.setAttribute('aria-pressed','false'));$('panelOverlay').classList.add('hidden');$('panelOverlay').classList.remove('inventory-mode','character-mode','voyage-mode');$('inventoryHeadMeta')?.classList.add('hidden');if(wasMap&&mapReturnFocus?.isConnected)mapReturnFocus.focus({preventScroll:true});}
  function exportSave(){saveGame();const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mare-partida-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
  function importSave(file){let reader=new FileReader();reader.onload=()=>{try{let d=JSON.parse(reader.result);if(!classes[d.classId]||!Number.isInteger(d.level)||!d.equipment||typeof d.name!=='string')throw Error('Save inválido');if(d.level<1)throw Error('Nível inválido');preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-import');preserveSave(JSON.stringify(d),STORAGE_KEY+'-import-source');localStorage.setItem(STORAGE_KEY,JSON.stringify(MareForge.migrate(MareCharacters.migrate(d),itemDefs)));location.reload();}catch(err){toast('Arquivo de salvamento inválido.','danger');}};reader.readAsText(file);}

  // Cenas 0.3: cenários originais proceduralmente desenhados e armazenados em cache.
  const sceneAtlas = {};
  function sceneCanvas(kind){
    if(sceneAtlas[kind])return sceneAtlas[kind];
    let cvs=document.createElement('canvas');const W=960,H=570;cvs.width=W;cvs.height=H;
    let c=cvs.getContext('2d');c.imageSmoothingEnabled=false;
    const fill=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const disc=(x,y,r,col)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    const line=(pts,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
    const stone=(x,y,size,col,i)=>{
      fill(x,y,size-1,size-1,col);
      fill(x,y,size-1,2,'#dfc7ac10');fill(x,y+size-3,size-1,2,'#070b1599');fill(x+size-3,y,2,size-2,'#06091288');
      for(let j=0;j<6;j++){let rx=seeded(i,j,2),ry=seeded(j,i,3);fill(x+3+rx*(size-7),y+3+ry*(size-7),1+Math.floor(seeded(i,j,6)*3),1,i%2?'#9aabc01c':'#060c1f32');}
    };
    const light=(x,y,r,clr)=>{let g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,clr);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);};
    if(kind==='lobby'){
      fill(0,0,W,H,'#222737');
      // porto oceânico com espuma na margem ocidental
      fill(0,0,205,H,'#173950');
      for(let y=0;y<H;y+=13)for(let x=0;x<212;x+=14){let z=seeded(x,y,4);fill(x,y,13,12,['#15334a','#1b3e58','#214963','#24536b'][Math.floor(z*4)]);if(z>.83)fill(x+3,y+5,7,1,'#6bb8b7a2');}
      for(let y=0;y<H;y+=32)for(let x=206;x<W;x+=32){const j=x/32+y*31;const palette=['#343b50','#3c4559','#454b60','#30384b','#485065'];stone(x,y,32,palette[Math.floor(seeded(j,9)*5)],j);}
      // faixas de calçamento
      fill(207,0,13,H,'#697081');fill(221,0,3,H,'#1a2437');fill(228,0,5,H,'#70788c');
      for(let y=0;y<H;y+=27){fill(206,y,14,3,'#252e40');fill(222,y+9,9,2,'#29344a');}
      // cais e degraus de madeira
      fill(68,385,218,78,'#1b2535');fill(76,394,209,58,'#765641');
      for(let x=79;x<283;x+=22){fill(x,395,19,56,['#7c5c46','#836249','#6e513e'][Math.floor(seeded(x,2)*3)]);fill(x,393,2,62,'#a47b5a');fill(x+16,399,1,48,'#302821');}
      for(let x=80;x<290;x+=48){fill(x,393,12,69,'#433225');fill(x,387,12,8,'#aa8057');}
      // travessia central / praça iluminada
      c.save();c.translate(511,284);c.rotate(Math.PI/4);fill(-142,-142,284,284,'#6a6978');fill(-130,-130,260,260,'#373c50');
      for(let y=-128;y<128;y+=27)for(let x=-128;x<128;x+=27){let n=Math.floor(seeded(x,y,6)*4);fill(x+1,y+1,25,25,['#444b63','#53576a','#5a5d75','#3a425b'][n]);fill(x+2,y+1,23,2,'#a7a5ae16');}
      c.restore();
      // rosa dos ventos, dourado fosco
      disc(511,284,70,'#111b2a90');disc(511,284,65,'#97876d');disc(511,284,60,'#323c50');disc(511,284,53,'#6b6e7b');
      line([[511,230],[523,283],[511,337],[500,283],[511,230]],'#d0b782',2);line([[461,284],[511,274],[560,284],[511,296],[461,284]],'#bba77f',2);
      disc(511,284,9,'#d2b778');disc(511,284,4,'#2a3449');
      // canteiros, bancos, faixas, arandelas
      for(let n=0;n<15;n++){let x=250+n*43;fill(x,60,34,9,'#1e2a3c');fill(x,508,35,11,'#202b3d');}
      // bancas dos mercadores
      function booth(x,y,roof){fill(x-33,y-10,72,51,'#382d34');fill(x-29,y+17,65,23,'#876349');fill(x-35,y-29,76,21,roof);fill(x-29,y-27,12,18,'#dfc9a0');fill(x-6,y-27,12,18,'#dfc9a0');fill(x+18,y-27,12,18,'#dfc9a0');fill(x-32,y-10,5,49,'#493a31');fill(x+34,y-10,5,49,'#493a31');}
      booth(294,280,'#67546e');booth(688,265,'#7f584c');
      // fachadas de edifícios com telhado e janelas
      function hall(x,y,w,h,roof){fill(x+7,y+10,w,h,'#242436');fill(x,y+19,w,h-20,'#6b5c59');fill(x+12,y+24,w-24,h-32,'#403749');fill(x-11,y+5,w+22,22,roof);fill(x-6,y,w+12,12,'#55516a');for(let p=x+20;p<x+w-10;p+=46){fill(p,y+34,23,23,'#121e30');fill(p+4,y+38,15,15,'#e4bb72');fill(p+6,y+41,10,11,'#67533f');}fill(x+w/2-16,y+h-42,32,40,'#192c3b');fill(x+w/2-12,y+h-36,24,33,'#4f6471');}
      hall(302,-66,205,158,'#555771');hall(677,-65,210,162,'#55495f');hall(310,495,220,140,'#524a61');hall(697,501,230,135,'#5a4c65');
      // monumentos e braseiros
      const statues=[[330,174],[747,170],[340,460],[745,459]];
      for(const [x,y] of statues){fill(x-13,y-4,26,12,'#242e42');fill(x-9,y-19,18,16,'#7a7e83');fill(x-6,y-32,12,14,'#494c62');fill(x-12,y-6,24,4,'#b2a38d');}
      for(const [x,y] of [[260,112],[814,113],[256,490],[811,490]]){fill(x-7,y-6,15,12,'#343743');fill(x-4,y-16,9,11,'#e8a866');fill(x-2,y-25,5,12,'#fce1a0');light(x,y-19,38,'#d9a25e48');}
      // partículas fixas leves sobre a cidade
      for(let i=0;i<420;i++){let x=215+seeded(i,7)*742,y=seeded(i,8)*570;fill(x,y,1,1,i%3?'#aab9c016':'#dbcfb535');}
    } else {
      fill(0,0,W,H,'#211923');
      // basalto em padrão de tijolo e rachaduras
      for(let y=0;y<H;y+=25)for(let x=0;x<W;x+=31){let off=(Math.floor(y/25)%2)*15,n=Math.floor(seeded(x,y,11)*5);stone(x+off-15,y,31,['#242330','#2d2933','#343039','#302a33','#38323b'][n],x*3+y);}
      // regiões rochosas, cinzas e cristais
      for(let i=0;i<550;i++){let x=seeded(i,6)*W,y=seeded(i,9)*H,size=1+Math.floor(seeded(i,12)*4);fill(x,y,size,size,i%5?'#78676937':'#ad755035');}
      // braços de lava nas laterais sem invadir o caminho central
      const lavaPath=(pts)=>{line(pts,'#0d0c18',95);line(pts,'#4d1a21',80);line(pts,'#a33e20',61);line(pts,'#f15c20',44);line(pts,'#ff9733',26);line(pts,'#ffc653',9);};
      lavaPath([[-70,63],[50,73],[108,117],[166,123],[175,32]]);
      lavaPath([[900,4],[836,119],[872,174],[965,204],[1034,250]]);
      lavaPath([[1012,533],[895,500],[850,546],[835,610]]);
      lavaPath([[-35,458],[58,477],[82,555]]);
      // linhas quebradas no magma
      for(let i=0;i<150;i++){let x=seeded(i,22)*W,y=seeded(i,24)*H;if(x<180||x>815){let col=i%2?'#f9b548aa':'#521f2b';fill(x,y,5+seeded(i,25)*20,2,col);}}
      // calçada / travessia central
      for(let y=0;y<570;y+=33)for(let x=276;x<781;x+=35){let dx=(Math.floor(y/33)%2)*17;fill(x+dx,y,33,31,['#49404a','#514650','#57474d','#403946'][Math.floor(seeded(x,y,3)*4)]);fill(x+dx,y,32,2,'#9d88833b');fill(x+dx,y+28,32,3,'#171822a8');}
      for(let x=255;x<806;x+=27){fill(x,12,10,13,'#4b404a');fill(x,550,10,13,'#50454b');}
      // ossuário antigo, runas, altares
      function obelisk(x,y){fill(x-17,y-4,38,19,'#15141f');fill(x-11,y-36,24,36,'#5b4e5f');fill(x-7,y-41,16,9,'#857582');fill(x-3,y-30,7,22,'#4dd1d5');fill(x-1,y-26,3,16,'#b4ffff');light(x,y-19,54,'#3be9d02d');}
      obelisk(247,291);obelisk(791,373);obelisk(758,125);
      // portão / portal central de retorno
      fill(509,448,84,96,'#14141e');fill(502,440,99,13,'#5d4850');fill(508,450,14,92,'#5a474d');fill(581,450,14,92,'#5a474d');fill(512,440,77,13,'#936259');
      disc(549,496,36,'#246c9b');disc(549,496,28,'#4ac3d3');disc(548,496,22,'#3268a6');disc(556,489,9,'#ccf5f5');light(549,493,92,'#36a9db23');
      // cristais ígneos e aranhas de pedra
      for(let i=0;i<38;i++){let x=120+seeded(i,30)*730,y=55+seeded(i,34)*455;if(x>270&&x<740&&y>75&&y<460)continue;fill(x-7,y,15,6,'#251820');fill(x-3,y-14,7,15,i%3?'#b04a41':'#6a97aa');fill(x,y-18,2,8,'#e4a78e');}
      for(let i=0;i<65;i++){let x=210+seeded(i,19)*670,y=seeded(i,23)*570;fill(x,y,3,2,'#ba5d4488');}
      // tochas, suportes de metal, luz
      for(const [x,y] of [[249,195],[766,217],[260,469],[777,478],[547,89]]){fill(x-5,y,12,25,'#221c25');fill(x-6,y-6,15,8,'#9f6b4d');fill(x-3,y-18,9,16,'#ec6f29');fill(x-1,y-22,5,14,'#ffd275');light(x,y-10,44,'#ff7b283f');}
      // relevo escuro nas bordas
      let mask=c.createRadialGradient(510,290,140,510,290,630);mask.addColorStop(0,'#00000000');mask.addColorStop(1,'#090713a9');c.fillStyle=mask;c.fillRect(0,0,W,H);
    }
    // Camada de ruído de terreno em escala pequena para casar melhor com os sprites detalhados.
    // Elementos desenhados uma vez no canvas em cache; nenhuma textura externa é necessária.
    for(let i=0;i<1550;i++){
      const x=Math.floor(seeded(i,73,9)*W), y=Math.floor(seeded(i,77,10)*H);
      if(kind==='lobby'&&x<230)continue;
      const n=seeded(i,81,11);let col=kind==='lobby'?(n>.66?'#c8c0ab13':'#101c2a26'):(n>.64?'#d5a27d1c':'#100f202d');
      fill(x,y,1+Math.floor(n*3),1+Math.floor(n*2),col);
      if(i%57===0&&x>230){
        fill(x,y,7,1,kind==='lobby'?'#a9abb227':'#a17c7824');
        fill(x+6,y-2,1,3,kind==='lobby'?'#a9abb21b':'#ca745125');
      }
    }
    sceneAtlas[kind]=cvs;return cvs;
  }
  function drawCityWorld(){
    const t=world.time;
    for(let i=0;i<35;i++){const x=24+(i*61)%250,y=(i*83)%2000;ctx.fillStyle='rgba(153,214,228,'+(.15+.16*Math.sin(t*1.2+i))+')';ctx.fillRect(x,y,10,2);}
  }
  function drawAshWorld(){ctx.save();ctx.translate(activeMap().origin.x,activeMap().origin.y);const t=world.time;
    for(let i=0;i<60;i++){let x=seeded(i,44)*960,y=(seeded(i,46)*570-t*(8+i%5*4))%570;if(y<0)y+=570;ctx.fillStyle=i%4?'#ff9a514d':'#fff0ae88';ctx.fillRect(Math.round(x),Math.round(y),1+i%3,2+i%2);}
    let g=ctx.createRadialGradient(547,494,4,547,494,65);g.addColorStop(0,'#69d8f94d');g.addColorStop(1,'#2d61a400');ctx.fillStyle=g;ctx.fillRect(482,429,130,130);
    ctx.strokeStyle='#a1efffc3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(549,494,25+Math.sin(t*2)*3,t*.5,t*.5+Math.PI*1.4);ctx.stroke();ctx.restore();
  }
  function drawNPCProps(n){
    const x=n.x,y=n.y;
    const rect=(dx,dy,w,h,c)=>px(ctx,Math.round(x+dx),Math.round(y+dy),w,h,c);
    // Bancadas e objetos organizados junto aos quatro serviços do porto.
    if(n.art==='donquixote'){
      for(const [dx,dy] of [[-60,-5],[-43,-11],[37,-9]]){
        rect(dx,dy,20,16,'#332736');rect(dx+2,dy+2,16,12,'#956c4d');rect(dx+7,dy+3,2,10,'#55392e');rect(dx+2,dy+5,16,2,'#be9161');
      }
      rect(-57,10,19,10,'#31252a');rect(-54,6,15,13,'#c3a06d');rect(-50,10,7,2,'#dfc28e');
      for(const [dx,dy] of [[37,10],[45,9],[52,11],[47,5]]){rect(dx,dy,5,3,'#aa7839');rect(dx+1,dy,3,1,'#f6cf6c');}
    }else if(n.art==='luffy'){
      rect(-48,-32,3,43,'#463c38');rect(-44,-32,21,18,'#8c3b4e');rect(-42,-29,16,2,'#d7aa6b');rect(-38,-25,7,6,'#e7cb97');
      rect(35,0,21,11,'#2c2c37');rect(37,2,17,7,'#674d3b');rect(39,4,11,2,'#ba865d');
    }else if(n.art==='nami'){
      rect(-58,-7,30,18,'#322d39');rect(-55,-5,26,14,'#c7aa76');rect(-50,-2,18,2,'#766755');rect(-47,3,14,1,'#725b4b');
      rect(37,0,19,12,'#332b31');rect(40,2,14,8,'#9c7454');rect(43,4,9,3,'#e2c68b');
      ctx.strokeStyle='#e6cc8f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+49,y+6,5,0,Math.PI*2);ctx.stroke();
    }else if(n.art==='ryuma'){
      rect(-61,-4,38,7,'#332f39');rect(-53,-19,22,19,'#969ca3');rect(-59,-20,34,5,'#626a79');rect(-52,3,19,7,'#42363a');
      rect(35,-14,4,29,'#75553d');rect(30,-17,16,7,'#949da5');rect(41,4,19,10,'#41333a');rect(43,6,15,6,'#805343');
      rect(51,-16,3,8,'#ff7b38');rect(51,-19,2,4,'#ffd381');
    }
  }
  function drawNPC(n){
      drawNPCProps(n);
      const img=npcArt[n.art],ready=img&&img.complete&&img.naturalWidth;
      const h=n.art==='ryuma'?72:76,w=Math.min(76,h*(ready?img.naturalWidth/img.naturalHeight:.68));
      const spriteTop=Math.round(n.y-h);
      ctx.fillStyle='#08121e8d';ctx.beginPath();ctx.ellipse(n.x,n.y,18,5,0,0,Math.PI*2);ctx.fill();
      if(ready){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,Math.round(n.x-w/2),spriteTop,Math.round(w),h);ctx.restore();}
      else {px(ctx,n.x-11,n.y-50,22,49,n.color);}
      const nameY=spriteTop-8;
      const labelW=154,labelH=20;
      px(ctx,n.x-labelW/2,nameY-14,labelW,labelH,'#0c1220dd');
      ctx.strokeStyle='#d1b07a';ctx.lineWidth=1;ctx.strokeRect(Math.round(n.x-labelW/2)+.5,nameY-13.5,labelW-1,labelH-1);
      ctx.font='800 10px Trebuchet MS, Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff4da';ctx.fillText(n.short+' · '+({hunt:'Expedições',forge:'Forja',contracts:'Navegação',shop:'Mercado'}[n.kind]),n.x,nameY);
      px(ctx,n.x-14,nameY-39,28,22,'#1b1830f0');ctx.strokeStyle='#b29bdf';ctx.strokeRect(n.x-14+.5,nameY-39+.5,27,21);
      ctx.font='bold 14px Segoe UI, sans-serif';ctx.fillStyle='#dfd2ff';ctx.fillText(n.kind==='hunt'?'⚔':n.kind==='forge'?'⚒':n.kind==='contracts'?'!':'$',n.x,nameY-23);
      ctx.font='800 9px Trebuchet MS, Segoe UI, sans-serif';ctx.fillStyle='#d8dfde';ctx.fillText('INTERAGIR',n.x,n.y+18);
  }
  function drawTownActors(){
    if(lobbyDestination){ctx.strokeStyle='#e5c47bbb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(lobbyDestination.x,lobbyDestination.y,9+Math.sin(world.time*7)*2,0,Math.PI*2);ctx.stroke();}
  }

  // Construção procedural do mundo: todas as formas são desenhadas, sem assets externos.
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const expandedAtlas={};
  function drawIslandTerrain(){
    const map=activeMap(),terrain=document.createElement('canvas');terrain.width=map.width;terrain.height=map.height;
    const c=terrain.getContext('2d');c.imageSmoothingEnabled=false;
    const coastData=MareIslandAssets['ocean-sand'],grassData=MareIslandAssets['sand-grass'];
    const coastImage=islandImages['ocean-sand'],grassImage=islandImages['sand-grass'];
    const coastLookup=Object.fromEntries(coastData.tiles.map(t=>[t.mask,t]));
    const grassLookup=grassData?Object.fromEntries(grassData.tiles.map(t=>[t.mask,t])):null;
    const maskAt=(fn,x,y)=>(fn(x,y)?8:0)|(fn(x+32,y)?4:0)|(fn(x,y+32)?2:0)|(fn(x+32,y+32)?1:0);
    for(let y=0;y<map.height;y+=32)for(let x=0;x<map.width;x+=32){
      const coast=maskAt(MareIsland.land,x,y);
      const green=coast===15&&grassImage?.complete&&grassImage.naturalWidth;
      const tile=green?grassLookup[maskAt(MareIsland.grass,x,y)]:coastLookup[coast];
      c.drawImage(green?grassImage:coastImage,tile.x,tile.y,tile.width,tile.height,x,y,32,32);
    }
    // Preserve the original user's wooden pier pixels rather than repainting them.
    const source=sceneCanvas('lobby'),plank=document.createElement('canvas');plank.width=22;plank.height=56;
    plank.getContext('2d').drawImage(source,79,395,22,56,0,0,22,56);
    for(const dock of MareIsland.docks){
      c.save();c.beginPath();c.rect(dock.x,dock.y,dock.w,dock.h);c.clip();
      c.translate(dock.x,dock.y);
      const vertical=dock.h>dock.w;
      if(vertical){c.translate(dock.w,0);c.rotate(Math.PI/2);}
      const width=vertical?dock.h:dock.w,height=vertical?dock.w:dock.h;
      for(let y=0;y<height;y+=56)for(let x=0;x<width;x+=22)c.drawImage(plank,x,y);
      c.restore();
      if(dock.w>=dock.h){
        for(let x=dock.x;x<dock.x+dock.w;x+=64){c.drawImage(source,80,387,12,14,x,dock.y-7,12,14);c.drawImage(source,80,387,12,14,x,dock.y+dock.h-7,12,14);}
      }else{
        for(let y=dock.y;y<dock.y+dock.h;y+=64){c.drawImage(source,80,387,12,14,dock.x-6,y,12,14);c.drawImage(source,80,387,12,14,dock.x+dock.w-6,y,12,14);}
      }
    }
    return terrain;
  }
  function drawIslandBuilding(b){
    if(!islandBuildings.complete||!islandBuildings.naturalWidth)return;
    ctx.drawImage(islandBuildings,(b.cell%2)*256,Math.floor(b.cell/2)*256,256,256,b.x-128,b.y-256,256,256);
  }
  function drawIslandDecoration(d){
    if(d.kind==='harbor'){
      if(!harborArt.complete||!harborArt.naturalWidth)return;
      const bob=d.cell<2?Math.round(Math.sin(world.time*1.1+d.cell)*1):0;
      ctx.drawImage(harborArt,(d.cell%2)*256,Math.floor(d.cell/2)*256,256,256,d.x-128,d.y-256+bob,256,256);
    }
    else if(d.kind==='palm')drawPalm(d.x,d.y,1.4,world.time);
    else if(d.kind==='crate')drawCrate(d.x,d.y);
    else drawRock(d.x,d.y,1);
  }
  function expandedTerrain(){
    const map=activeMap();if(expandedAtlas[map.id])return expandedAtlas[map.id];
    if(scene==='lobby'&&islandImages['ocean-sand']?.complete&&islandImages['ocean-sand'].naturalWidth){expandedAtlas.lobby=drawIslandTerrain();return expandedAtlas.lobby;}
    const terrain=document.createElement('canvas');terrain.width=map.width;terrain.height=map.height;
    const c=terrain.getContext('2d');c.imageSmoothingEnabled=false;
    const source=sceneCanvas(map.id),tile=document.createElement('canvas');tile.width=32;tile.height=32;
    const tc=tile.getContext('2d');tc.drawImage(source,scene==='lobby'?900:320,scene==='lobby'?300:250,32,32,0,0,32,32);
    c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,map.width,map.height);
    if(scene==='lobby'){
      const water=document.createElement('canvas');water.width=28;water.height=26;
      water.getContext('2d').drawImage(source,14,13,28,26,0,0,28,26);
      c.fillStyle=c.createPattern(water,'repeat');c.fillRect(0,0,1105,map.height);
      c.fillStyle='#697081';c.fillRect(1105,0,13,map.height);
    }
    c.drawImage(source,map.origin.x,map.origin.y);
    expandedAtlas[map.id]=terrain;return terrain;
  }
  function drawBackground(){
    if(activeMap().id==='embers'){MareEmberRenderer.setFallback(sceneCanvas('hunt'),sceneCanvas('lobby'));MareEmberRenderer.ground(ctx,camera,W,H,world.time);for(const p of MareEmber.props.filter(p=>p.ground))MareEmberRenderer.prop(ctx,p);return;}
    ctx.drawImage(expandedTerrain(),0,0);
    if(scene==='lobby')drawCityWorld();else drawAshWorld();
  }

  function drawDock(t){let x=207,y=363;px(ctx,190,343,205,100,'#344c49');px(ctx,197,345,195,85,'#77684f');for(let i=0;i<8;i++){px(ctx,197+i*24,345,2,85,'#554934');px(ctx,200+i*24,351,1,70,'#b9a177');}px(ctx,180,336,18,115,'#624f3a');px(ctx,385,336,18,115,'#675039');px(ctx,180,334,18,8,'#c7a875');px(ctx,385,334,18,8,'#c7a875');drawBoat(120,252,t);}
  function drawBoat(x,y,t){ctx.save();ctx.translate(x,y+Math.sin(t*1.2)*2);px(ctx,-48,9,96,16,'#593e33');px(ctx,-34,25,69,10,'#4c302b');px(ctx,-19,-54,5,73,'#4b4434');px(ctx,-14,-48,46,47,'#e7d6ad');px(ctx,-12,-45,39,40,'#c8c2a2');px(ctx,-13,-48,4,50,'#f7e4bd');px(ctx,13,-37,3,30,'#a19275');px(ctx,-28,6,17,5,'#8f6c4d');px(ctx,22,3,15,5,'#8f6c4d');ctx.restore();}
  function drawSwamp(t){for(let i=0;i<7;i++){let x=75+i*30,y=68+seeded(i,7)*460;px(ctx,x,y,12,70,'#425946');px(ctx,x+2,y-16,5,19,'#667b4a');px(ctx,x-17,y+1,48,6,'#405b43');px(ctx,x+15,y-8,5,30,'#546e4d');}for(let i=0;i<14;i++){let x=30+seeded(i,7)*270,y=seeded(i,9)*H;ctx.fillStyle='#b7d4b0b0';ctx.fillRect(x+Math.sin(t+i)*5,y,3,3);}}
  function drawPalm(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const sway=Math.sin(t*.9+x)*3;px(ctx,-5,0,12,39,'#604e35');px(ctx,-3,-17,11,32,'#8b7147');px(ctx,3,-27,11,18,'#967b4c');px(ctx,-4,-38+sway,10,15,'#8e7342');const leaves=[[-50,-31,60,11],[-38,-50,44,10],[5,-52,49,10],[-2,-70,13,48],[-34,-21,43,11],[4,-24,48,11]];for(let i=0;i<leaves.length;i++){let [lx,ly,lw,lh]=leaves[i];px(ctx,lx+sway,ly,lw,lh,i%2?'#325e42':'#3b744c');px(ctx,lx+sway,ly,lw-9,3,'#659764');}px(ctx,-6,-38,12,12,'#668347');ctx.restore();}
  function drawRock(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);px(ctx,-22,-5,45,19,'#40534e');px(ctx,-17,-17,33,14,'#728377');px(ctx,-11,-21,22,6,'#93a397');px(ctx,-15,-4,25,3,'#536e68');ctx.restore();}
  function drawCoral(x,y){px(ctx,x-4,y-18,8,28,'#c78375');px(ctx,x-15,y-19,7,12,'#de9b82');px(ctx,x+12,y-28,7,31,'#d3857c');px(ctx,x-20,y-20,17,6,'#e4a190');px(ctx,x+4,y-23,20,7,'#e7aa93');px(ctx,x-11,y+2,28,8,'#92735f');}
  function drawCrate(x,y){px(ctx,x-13,y-17,30,26,'#634e38');px(ctx,x-10,y-13,24,20,'#9f8158');px(ctx,x-10,y-12,24,3,'#c29b66');px(ctx,x-2,y-13,3,20,'#5f4938');px(ctx,x-10,y+3,24,3,'#614b36');}
  function drawRuin(x,y){px(ctx,x-10,y-18,23,24,'#52635c');px(ctx,x-12,y-25,27,9,'#859385');px(ctx,x-8,y-19,5,25,'#98a18a');px(ctx,x+8,y-19,5,25,'#3e594d');px(ctx,x-18,y+6,39,9,'#53695e');}
  function drawPlayerSprite(c,x,y){
    const hero=world.hero, attack=hero.attackAnim>0&&scene==='hunt',moving=hero.walking>0;
    const combat=bentoController();
    if(combat){
      const state=combat.snapshot();
      if(state.action!=='idle'&&state.action!=='walk'){
        c.fillStyle='#08131f8c';c.beginPath();c.ellipse(x,y,19,5,0,0,Math.PI*2);c.fill();
        if(MareFactionSprites.draw(c,'pirate-sword',x,y,{action:state.action,direction:state.direction,time:state.elapsed}))return true;
        if(MareFactionSprites.draw(c,'pirate-sword',x,y,{action:'guard',direction:state.direction,time:0}))return true;
      }
    }
    if(globalThis.MareFactionSprites?.assets[game.factionId]){
      c.fillStyle='#08131f8c';c.beginPath();c.ellipse(x,y,19,5,0,0,Math.PI*2);c.fill();
      if(MareFactionSprites.draw(c,game.factionId,x,y,{action:moving?'walk':'idle',direction:hero.direction,time:world.time}))return true;
    }
    let action=attack?(game.classId==='sword'?'attack'+(1+Math.floor(world.time*12)%3):'attack1'):moving?(['walk1','walk2','walk3'][Math.floor(world.time*9)%3]):'idle';
    if(!attack&&hero.direction==='back')action='back';
    else if(!attack&&(hero.direction==='left'||hero.direction==='right'))action='side';
    else if(!moving&&!attack)action=Math.floor(world.time*2)%2?'idle2':'idle';
    if(!readySprite(game.factionId,action))action='idle';
    c.fillStyle='#08131f8c';c.beginPath();c.ellipse(x,y,19,5,0,0,Math.PI*2);c.fill();
    return drawFactionSprite(c,x,y,game.factionId,action,74,hero.direction==='left'&&(action==='side'||attack));
  }
  function drawFactionShowcase(actor){
    const a=MareFactionSprites.assets[actor.id];
    ctx.fillStyle='#08131f8c';ctx.beginPath();ctx.ellipse(actor.x,actor.y,18,5,0,0,Math.PI*2);ctx.fill();
    MareFactionSprites.draw(ctx,actor.id,actor.x,actor.y,{action:showcaseAction,direction:showcaseDirection,time:world.time});
    ctx.font='bold 10px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#10242c';ctx.fillRect(actor.x-38,actor.y+12,76,26);
    ctx.fillStyle='#ffe4a2';ctx.fillText(a.meta.display_name.split(' ')[0],actor.x,actor.y+23);
    ctx.font='8px Trebuchet MS';ctx.fillText(({revolutionary:'Revolucionária',pirate:'Pirata',marine:'Marinheira',government:'Governo'})[actor.id],actor.x,actor.y+33);
  }
  function drawHero(c,x,y,classId,t,scale=1.95,portraitMode=false){
    const moving=world.hero.walking>0&&!portraitMode;
    const step=moving?Math.round(Math.sin(t*16)*1):0;
    const attack=world.hero.attackAnim>0&&!portraitMode;
    const pal={
      sword:{body:'#6f7d45',trim:'#e2cb81',cape:'#496f43',capeDark:'#35553a',hair:'#e5e7df',band:'#8c9ab3',skin:'#d4b08b',boots:'#3b332d',pants:'#433d37',metal:'#dce3dc',gold:'#ddc174'},
      brawler:{body:'#72503c',trim:'#e0b56f',cape:'#6b4431',capeDark:'#4f2f24',hair:'#f0efe8',band:'#9a5c4c',skin:'#cfa27f',boots:'#40322d',pants:'#46372f',metal:'#c4b8aa',gold:'#d7ae66'},
      gunner:{body:'#4f5966',trim:'#e5c684',cape:'#464d5f',capeDark:'#313748',hair:'#e7e6dc',band:'#6d7d93',skin:'#d0ac89',boots:'#312c2a',pants:'#403936',metal:'#d9ddcf',gold:'#e2bc73'}
    }[classId]||{body:'#5d6c52',trim:'#e2cb81',cape:'#496f43',capeDark:'#35553a',hair:'#ece9dd',band:'#8490a6',skin:'#d4b08b',boots:'#3b332d',pants:'#433d37',metal:'#dce3dc',gold:'#ddc174'};
    c.save();
    c.translate(Math.round(x),Math.round(y));
    c.scale(scale,scale);
    if(!portraitMode){c.fillStyle='#0a161880';c.beginPath();c.ellipse(0,1,10,3,0,0,Math.PI*2);c.fill();}
    // capa atrás do corpo
    px(c,-7,-25,14,4,pal.capeDark);px(c,-6,-21,12,11,pal.cape);px(c,-5,-9,10,3,pal.capeDark);
    // pernas
    px(c,-4,-11+step,3,8,pal.pants);px(c,1,-11-step,3,8,pal.pants);px(c,-4,-4+step,3,3,pal.boots);px(c,1,-4-step,3,3,pal.boots);
    // tronco
    px(c,-6,-23,12,13,pal.body);px(c,-4,-24,8,2,pal.trim);px(c,-2,-17,4,3,pal.gold);px(c,-6,-10,12,2,'#2d2a24');
    // braços
    px(c,-8,-22,2,10,pal.skin);px(c,6,-22,2,10,pal.skin);px(c,-8,-17,2,5,pal.body);px(c,6,-17,2,5,pal.body);
    // pescoço e cabeça
    px(c,-1,-28,2,3,pal.skin);px(c,-5,-37,10,10,pal.skin);
    // cabelo / faixa
    px(c,-7,-39,14,4,pal.hair);px(c,-6,-36,12,3,pal.hair);px(c,-5,-34,10,2,pal.hair);px(c,-6,-33,12,2,pal.band);
    px(c,-6,-32,2,3,pal.hair);px(c,4,-32,2,3,pal.hair);
    // rosto
    px(c,-3,-34,2,2,'#1e262a');px(c,1,-34,2,2,'#1e262a');px(c,-1,-31,2,1,'#8c5d51');
    // ombros/luvas
    px(c,-8,-23,2,2,pal.trim);px(c,6,-23,2,2,pal.trim);
    // arma por classe
    if(classId==='sword'){
      if(attack){px(c,7,-35,2,18,pal.metal);px(c,6,-20,6,2,pal.gold);px(c,9,-38,1,4,'#f7f8f4');}
      else {px(c,7,-31,2,15,pal.metal);px(c,6,-18,6,2,pal.gold);}
    } else if(classId==='brawler'){
      px(c,-10,-18,4,4,pal.metal);px(c,6,-18,4,4,pal.metal);px(c,-10,-14,4,2,pal.gold);px(c,6,-14,4,2,pal.gold);
    } else if(classId==='gunner'){
      px(c,7,attack?-26:-20,12,3,'#69493a');px(c,18,attack?-26:-20,4,2,pal.metal);px(c,5,attack?-28:-22,2,7,pal.gold);
    }
    // bordas da capa na frente
    px(c,-7,-23,2,13,pal.capeDark);px(c,5,-23,2,13,pal.capeDark);
    c.restore();
  }
  // PNG com transparência: os monstros deixam de ser blocos procedurais.
  const mobSprites={};
  for(const id of ['crab','bandit','spirit','boss']){
    const img=new Image();img.src='assets/monsters/'+id+'.png';mobSprites[id]=img;
  }
  function drawMobArt(m){
    if(activeMap().id==='embers'&&MareEmberRenderer.monster(ctx,m,world.time))return true;
    const img=mobSprites[m.type];if(!img?.complete||!img.naturalWidth)return false;
    const t=world.time, size=m.type==='boss'?98:m.type==='crab'?56:m.type==='spirit'?64:66;
    const width=size*(img.naturalWidth/img.naturalHeight),bob=Math.sin(t*2.7+m.bob)*1.5;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(m.hit>0)ctx.filter='brightness(1.55)';
    ctx.drawImage(img,Math.round(m.x-width/2),Math.round(m.y-size+bob),Math.round(width),Math.round(size));
    ctx.restore();return true;
  }
  function drawMonster(m){
    if(drawMobArt(m)){
      if(m.alive){
        const width=m.type==='boss'?88:65, ratio=Math.max(0,m.hp/m.maxHP),boss=m.type==='boss';
        let barY=m.y-(activeMap().id==='embers'?79:boss?114:79);
        px(ctx,m.x-width/2,barY,width,8,'#101322');
        px(ctx,m.x-width/2+1,barY+1,(width-2)*ratio,6,boss?'#e5a35d':'#e27283');
        ctx.font='bold 12px Inter,Segoe UI,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;
        ctx.strokeStyle='#0b0e1b';ctx.strokeText(monsterName(m),m.x,barY-7);
        ctx.fillStyle=boss?'#ffe5ad':'#f7edf1';ctx.fillText(monsterName(m),m.x,barY-7);
        if(world.target===m){ctx.strokeStyle='#d9b777';ctx.lineWidth=2;ctx.strokeRect(m.x-width/2-3,barY-3,width+6,14);}
      }
      return;
    }
    let t=world.time,scale=m.type==='boss'?2.15:m.type==='crab'?1.65:1.8,bob=Math.round(Math.sin(t*3+m.bob)*2);ctx.save();ctx.translate(Math.round(m.x),Math.round(m.y+bob));ctx.scale(scale,scale);ctx.fillStyle='#071b20a0';ctx.beginPath();ctx.ellipse(0,2,13,4,0,0,Math.PI*2);ctx.fill();if(m.type==='crab'){px(ctx,-10,-12,20,12,'#7d3b36');px(ctx,-8,-17,16,10,'#d27b58');px(ctx,-11,-16,5,6,'#e6b477');px(ctx,6,-16,5,6,'#e6b477');px(ctx,-7,-14,3,3,'#182e32');px(ctx,5,-14,3,3,'#182e32');px(ctx,-17,-6,8,3,'#aa5444');px(ctx,9,-6,8,3,'#aa5444');px(ctx,-19,-16,8,7,'#d78563');px(ctx,11,-16,8,7,'#d78563');}else if(m.type==='bandit'){px(ctx,-5,-11,5,9,'#353a35');px(ctx,1,-11,5,9,'#353a35');px(ctx,-8,-26,17,15,'#8d5741');px(ctx,-6,-39,12,13,'#c08e6a');px(ctx,-12,-40,24,5,'#3e3a3a');px(ctx,-7,-46,16,8,'#55504b');px(ctx,10,-25,4,22,'#bdc7ba');px(ctx,9,-16,8,3,'#eac078');px(ctx,-5,-34,3,2,'#292e2c');px(ctx,2,-34,3,2,'#292e2c');}else if(m.type==='spirit'){ctx.globalAlpha=.85;px(ctx,-10,-28,21,22,'#2e7e75');px(ctx,-7,-39,15,13,'#a8e7c5');px(ctx,-13,-27,5,13,'#78c9b1');px(ctx,10,-27,5,13,'#78c9b1');px(ctx,-8,-5,7,5,'#77cabb');px(ctx,2,-5,7,5,'#80d5c4');px(ctx,-6,-33,4,3,'#295751');px(ctx,4,-33,4,3,'#295751');px(ctx,-13,-40,8,5,'#9ecbb1');ctx.globalAlpha=1;}else {px(ctx,-7,-13,7,11,'#24262d');px(ctx,2,-13,7,11,'#24262d');px(ctx,-11,-32,22,20,'#732f36');px(ctx,-7,-43,15,13,'#c09878');px(ctx,-16,-47,31,7,'#2c3434');px(ctx,-8,-54,17,9,'#423a36');px(ctx,-6,-36,12,4,'#e9c178');px(ctx,-14,-29,5,19,'#b1a18c');px(ctx,13,-39,5,30,'#cbd5cf');px(ctx,9,-19,14,4,'#e7b974');px(ctx,-3,-38,3,2,'#262a2a');px(ctx,4,-38,3,2,'#262a2a');}if(m.hit>0){ctx.globalCompositeOperation='screen';px(ctx,-11,-39,22,29,'#fff9d0aa');ctx.globalCompositeOperation='source-over';}ctx.restore();
    if(m.alive){let width=m.type==='boss'?88:56,ratio=Math.max(0,m.hp/m.maxHP);px(ctx,m.x-width/2,m.y-(m.type==='boss'?117:76),width,8,'#0b1e24');px(ctx,m.x-width/2+1,m.y-(m.type==='boss'?116:75),(width-2)*ratio,6,m.type==='boss'?'#d9aa6c':'#c87369');ctx.textAlign='center';ctx.font=(m.type==='boss'?'bold 15px':'bold 12px')+' Trebuchet MS';ctx.fillStyle='#071b1f';ctx.fillText(monsterName(m),m.x+1,m.y-(m.type==='boss'?125:83)+1);ctx.fillStyle=m.type==='boss'?'#ffe6a6':'#fff4dd';ctx.fillText(monsterName(m),m.x,m.y-(m.type==='boss'?125:83));if(world.target===m){ctx.strokeStyle='#e9d18d';ctx.lineWidth=2;ctx.strokeRect(m.x-width/2-4,m.y-(m.type==='boss'?121:80),width+8,16);}}}
  function drawWorld(){if(!game){ctx.fillStyle='#123740';ctx.fillRect(0,0,W,H);return;}ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));drawBackground();if(scene==='lobby')drawTownActors();let toDraw=[...(activeMap().id==='embers'?MareEmber.props.filter(p=>!p.ground).map(p=>({kind:'ember-prop',y:p.y,obj:p})):[]),...world.mobs.filter(m=>scene==='hunt'&&m.alive).map(m=>({kind:'mob',y:m.y,obj:m})),{kind:'hero',y:world.hero.y,obj:world.hero},...(scene==='lobby'?[...npcs.map(n=>({kind:'npc',y:n.y,obj:n})),...MareIsland.buildings.map(b=>({kind:'building',y:b.y-17,obj:b})),...MareIsland.decorations.concat(harborArt.complete&&harborArt.naturalWidth?MareIsland.harborProps:[]).map(d=>({kind:'decor',y:d.y,obj:d}))]:[]),...((scene==='lobby'&&factionShowcase&&globalThis.MareFactionSprites)?Object.keys(MareFactionSprites.assets).filter(id=>!MareFactionSprites.assets[id].meta.class_id).map((id,index)=>({kind:'faction',y:800,obj:{id,x:1240+index*80,y:800}})):[])].sort((a,b)=>a.y-b.y);for(let i of toDraw){if(i.kind==='hero'){if(session?.respawn>0&&!bentoController()){ctx.globalAlpha=.5+Math.sin(world.time*8)*.25;}if(!drawPlayerSprite(ctx,world.hero.x,world.hero.y))drawHero(ctx,world.hero.x,world.hero.y,game.classId,world.time,1.92);ctx.globalAlpha=1;let name=game.name;ctx.textAlign='center';ctx.font='bold 13px Trebuchet MS';ctx.fillStyle='#03171c';ctx.fillText(name,world.hero.x+1,world.hero.y-85);ctx.fillStyle='#e7fcf1';ctx.fillText(name,world.hero.x,world.hero.y-86);let d=getDerived();px(ctx,world.hero.x-30,world.hero.y-79,60,7,'#001819');px(ctx,world.hero.x-29,world.hero.y-78,58*(game.hp/d.maxHP),5,'#5ed09c');if(session?.guard>0){ctx.strokeStyle='#78e2d3aa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(world.hero.x,world.hero.y-26,20,34,0,0,Math.PI*2);ctx.stroke();}}else if(i.kind==='ember-prop')MareEmberRenderer.prop(ctx,i.obj);else if(i.kind==='faction')drawFactionShowcase(i.obj);else if(i.kind==='npc')drawNPC(i.obj);else if(i.kind==='building')drawIslandBuilding(i.obj);else if(i.kind==='decor')drawIslandDecoration(i.obj);else drawMonster(i.obj);}
    if(activeMap().id==='embers')MareEmberRenderer.environment(ctx,camera,W,H,world.time,reducedFX);
    for(let p of world.projectiles){let x=p.x+(p.tx-p.x)*p.progress,y=p.y+(p.ty-p.y)*p.progress;ctx.fillStyle=p.color;ctx.fillRect(x-3,y-3,11,6);ctx.fillStyle='#fff7db';ctx.fillRect(x+1,y-2,4,3);}
    for(let f of world.fx){ctx.globalAlpha=clamp(f.life/f.max,0,1);if(f.slash){ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y-17,29,-2.35,.2);ctx.stroke();}else if(f.ring){ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f.x,f.y-4,(1-f.life/f.max)*61+6,(1-f.life/f.max)*26+5,0,0,Math.PI*2);ctx.stroke();}else {ctx.textAlign='center';ctx.font='bold '+f.size+'px Trebuchet MS';ctx.lineWidth=3;ctx.strokeStyle='#0b2323';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}}ctx.globalAlpha=1;
    ctx.restore();
    if(scene==='hunt'&&session?.respawn>0){
      if(bentoController()){
        const width=Math.min(360,W-28),top=H-164;
        ctx.fillStyle='#06151be6';ctx.fillRect((W-width)/2,top,width,48);
        ctx.strokeStyle='#b79454';ctx.strokeRect((W-width)/2,top,width,48);
        ctx.textAlign='center';ctx.fillStyle='#f2d5b4';ctx.font='bold 18px Georgia';
        ctx.fillText('RENASCENDO EM '+Math.ceil(session.respawn)+'s',W/2,top+30);
      }else{
        ctx.fillStyle='#06151bb8';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#f2d5b4';ctx.font='32px Georgia';ctx.fillText('RETORNANDO AO PORTO',W/2,H/2-7);ctx.font='22px Georgia';ctx.fillText(Math.ceil(session.respawn)+'s',W/2,H/2+27);
      }
    }
  }
  function frame(t){if(!lastTime)lastTime=t;const dt=Math.min(.25,Math.max(0,(t-lastTime)/1000));lastTime=t;if(game&&!document.hidden){for(let remaining=dt;remaining>0;remaining-=.05)tick(Math.min(.05,remaining));renderUIClock+=dt;saveClock+=dt;if(renderUIClock>.27){renderUIClock=0;updateUI();}if(saveClock>7){saveClock=0;saveGame();}camera.update(world.hero,activeMap(),dt);}drawWorld();requestAnimationFrame(frame);}


const targetHud=document.createElement('div');
targetHud.className='target-hud hidden';
targetHud.id='targetHud';
targetHud.innerHTML=`<div class="target-hud-top"><span id="targetHudState">PORTO SEGURO</span><strong id="targetHudLevel">—</strong></div><div class="target-hud-name" id="targetHudName">SEM ALVO</div><div class="target-hud-bar"><i id="targetHudFill"></i></div><div class="target-hud-meta"><span id="targetHudHPText">—</span><span id="targetHudHint">Aguardando combate</span></div>`;
$('gameFrame').appendChild(targetHud);

  // Janelas flutuantes: nada é fixado nas laterais do mapa.
  const floating={status:document.querySelector('.left-panel'),expedition:document.querySelector('.right-panel'),chat:null};
  const journal=document.querySelector('.journal-block');
  const chatWindow=document.createElement('section');chatWindow.className='floating-chat';chatWindow.id='floatingChat';
  chatWindow.innerHTML='<div class="floating-title"><span>◈ CANAL DO PORTO <small>· ANOTAÇÕES LOCAIS</small></span><button type="button" data-close-window="chat" aria-label="Fechar canal">×</button></div>';
  journal.parentNode.removeChild(journal);chatWindow.appendChild(journal);
  document.querySelector('.dashboard').appendChild(chatWindow);floating.chat=chatWindow;
  floating.status.id='floatingStatus';floating.expedition.id='floatingExpedition';
  const expeditionMini=document.createElement('button');
  expeditionMini.id='expeditionMini';
  expeditionMini.className='expedition-mini hidden';
  expeditionMini.innerHTML='<span class="mini-dot">●</span><span class="mini-label">Caçada ativa</span><span class="mini-key">O</span>';
  document.querySelector('.dashboard').appendChild(expeditionMini);
  const journey=document.createElement('section');journey.id='journeyHud';journey.className='journey-hud';
  journey.innerHTML='<button class="journey-heading" id="journeyToggle" aria-expanded="true">⌖ <span>Diário de bordo</span><span class="journey-chevron">−</span></button><div class="journey-content"><small id="journeyChapter">Contratos do porto</small><strong id="journeyTitle">Uma nova travessia</strong><div class="journey-track"><i id="journeyFill"></i></div><div class="journey-footer"><span id="journeyProgress">0 / 6</span><button id="journeyAction" data-panel="contracts">Ver contrato</button></div></div>';
  document.querySelector('.dashboard').appendChild(journey);
  $('journeyToggle').addEventListener('click',()=>{const collapsed=journey.classList.toggle('collapsed');$('journeyToggle').setAttribute('aria-expanded',String(!collapsed));journey.querySelector('.journey-chevron').textContent=collapsed?'+':'−';});

  function syncExpeditionMini(){
    const open=floating.expedition.classList.contains('hud-open');
    expeditionMini.classList.toggle('open',open);
    expeditionMini.classList.toggle('hidden',scene!=='hunt');
    const lbl=expeditionMini.querySelector('.mini-label');
    if(lbl) lbl.textContent = scene!=='hunt' ? 'No porto' : (autoPlay ? 'Caçada ativa' : 'Caçada pausada');
  }

  function toggleFloating(kind,force){let el=floating[kind];if(!el)return;const open=force===undefined?!el.classList.contains('hud-open'):!!force;
    el.classList.toggle('hud-open',open);
    document.querySelectorAll('[data-hud]').forEach(btn=>{if(btn.dataset.hud===kind){btn.classList.toggle('selected',open);btn.setAttribute('aria-expanded',String(open));}});
    syncExpeditionMini();
    const chatButton=$('chatCornerToggle');if(chatButton)chatButton.classList.toggle('is-open',floating.chat.classList.contains('hud-open'));
    document.body.classList.toggle('chat-open',floating.chat.classList.contains('hud-open'));
  }

function applySceneHudLayout(){
  const inHunt=scene==='hunt';
  toggleFloating('status', false);
  toggleFloating('expedition', false);
  toggleFloating('chat', window.innerWidth>=1000);
  document.body.classList.toggle('hunt-hud-layout', inHunt);
  syncExpeditionMini();
}

  expeditionMini.addEventListener('click',()=>toggleFloating('expedition'));
  $('chatCornerToggle').addEventListener('click',()=>toggleFloating('chat'));
  document.querySelectorAll('[data-hud]').forEach(btn=>btn.addEventListener('click',()=>btn.dataset.hud==='status'?openPanel('character'):toggleFloating(btn.dataset.hud)));
  document.addEventListener('click',e=>{const b=e.target.closest('[data-close-window]');if(b)toggleFloating(b.dataset.closeWindow,false);});
  // Indicadores compactos mantêm informações críticas legíveis com as janelas fechadas.
  function updateMiniHud(){if(!game)return;const s=getDerived();
    $('attributePointsHud').textContent=game.attributePoints+' ponto'+(game.attributePoints===1?'':'s');$('attributePointsHud').classList.toggle('has-points',game.attributePoints>0);
    if($('miniName')){$('miniName').textContent=game.name;$('miniName').title=game.name;$('miniLevel').textContent='Nv.'+game.level;}
    if($('miniHP'))$('miniHP').style.width=(100*clamp(game.hp/s.maxHP,0,1)).toFixed(1)+'%';
    if($('miniEnergy'))$('miniEnergy').style.width=(100*clamp(game.energy/s.maxEnergy,0,1)).toFixed(1)+'%';
    if($('miniGold'))$('miniGold').textContent=fmt(game.gold)+' ✦';
    $('miniClass').textContent=classes[game.classId].name;$('miniClass').title=classes[game.classId].name;
    $('miniPower').textContent=fmt(s.power);
    $('miniHPText').textContent=fmt(game.hp)+' / '+fmt(s.maxHP);
    $('miniEnergyText').textContent=fmt(game.energy)+' / '+fmt(s.maxEnergy);
    $('miniXPText').textContent=fmt(game.xp)+' / '+fmt(xpNeeded(game.level));
    $('miniXP').style.width=(100*clamp(game.xp/xpNeeded(game.level),0,1)).toFixed(1)+'%';
    const quest=questDefs.find(q=>!game.claimed.includes(q.id));
    $('journeyTitle').textContent=quest?quest.title:'Contratos concluídos';
    const progress=quest?Math.min(quest.target,game.stats[quest.stat]||0):1,total=quest?quest.target:1;
    $('journeyProgress').textContent=quest?progress+' / '+total:'Boa viagem, capitão';
    $('journeyFill').style.width=(100*progress/total)+'%';
    $('journeyChapter').textContent=scene==='lobby'?'Porto das Correntes':'Expedição · '+zones[game.area].name;
    const action=$('journeyAction');
    action.textContent=quest&&progress>=total?'Resgatar':'Ver contrato';
    if(quest&&progress>=total){action.dataset.claim=quest.id;delete action.dataset.panel;}else{action.dataset.panel='contracts';delete action.dataset.claim;}

  }
  // Eventos de interface
  function showCreationStep(step){
    $('factionStep').classList.toggle('hidden',step!==1);$('classStep').classList.toggle('hidden',step!==2);
    $('stepFaction').classList.toggle('active',step===1);$('stepClass').classList.toggle('active',step===2);
    $('creationError').textContent='';
  }
  function openCreation(edit=false){
    editingCharacter=edit;
    if(edit&&game){selectedFaction=game.factionId;selectedClass=game.classId;$('characterName').value=game.name;}
    document.querySelectorAll('[data-faction]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.faction===selectedFaction));
    document.querySelectorAll('[data-class]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.class===selectedClass));
    $('createCharacter').innerHTML=edit?'ATUALIZAR PERSONAGEM <span>→</span>':'COMEÇAR AVENTURA <span>→</span>';
    showCreationStep(1);$('startOverlay').classList.remove('hidden');
  }
  document.querySelectorAll('[data-faction]').forEach(btn=>btn.addEventListener('click',()=>{selectedFaction=btn.dataset.faction;document.querySelectorAll('[data-faction]').forEach(b=>b.classList.toggle('chosen',b===btn));}));
  document.querySelectorAll('[data-class]').forEach(btn=>btn.addEventListener('click',()=>{selectedClass=btn.dataset.class;document.querySelectorAll('[data-class]').forEach(b=>b.classList.toggle('chosen',b===btn));}));
  $('nextToClass').addEventListener('click',()=>{let name=$('characterName').value.trim().replace(/\s+/g,' ');if(name.length<3||name.length>18){$('creationError').textContent='Use um nome de 3 a 18 caracteres.';return;}showCreationStep(2);});
  $('backToFaction').addEventListener('click',()=>showCreationStep(1));
  $('createCharacter').addEventListener('click',()=>{
    const name=$('characterName').value.trim().replace(/\s+/g,' ');
    if(name.length<3||name.length>18){$('creationError').textContent='Use um nome de 3 a 18 caracteres.';return;}
    if(editingCharacter&&game){
      if(game.classId!==selectedClass&&game.equipment.weapon&&game.inventory.length>=BAG_CAPACITY){$('creationError').textContent='Libere um espaço na mochila para guardar sua arma atual antes de trocar a classe.';return;}
      const changed=game.classId!==selectedClass;game.name=name;game.factionId=selectedFaction;game.classId=selectedClass;
      if(changed){
        const old=game.equipment.weapon;if(old)game.inventory.push(old);
        game.equipment.weapon=newItem(itemDefs[starterWeapon(selectedClass)]);
      }
      const d=getDerived();game.hp=Math.min(d.maxHP,Math.max(1,game.hp));game.energy=Math.min(d.maxEnergy,Math.max(0,game.energy));
      session.cooldowns=[0,0];session.guard=0;session.blessing=0;toast('Facção e classe atualizadas!','good');$('startOverlay').classList.add('hidden');configureFactionVisual();renderPortrait();updateUI();saveGame();editingCharacter=false;
    }else{game=createGame(name,selectedClass);startGame();}
  });
  $('characterName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!$('factionStep').classList.contains('hidden'))$('nextToClass').click();else $('createCharacter').click();}});
  $('autoToggle').addEventListener('click',()=>{if(scene!=='hunt'||!game)return;autoPlay=!autoPlay;if(autoPlay){travelPath=[];lobbyDestination=null;lobbyAction=null;pursuit.delete(world.hero);}toast(autoPlay?'Auto-caçada retomada.':'Auto-caçada pausada.');updateUI();});
  $('skill1').addEventListener('click',()=>useSkill(0,true));$('skill2').addEventListener('click',()=>useSkill(1,true));$('usePotion').addEventListener('click',()=>usePotion(true));$('buyPotion').addEventListener('click',buyPotion);
  document.addEventListener('click',e=>{
    let b=e.target.closest('[data-attribute-add]');
    if(b&&game&&!b.disabled){const key=b.dataset.attributeAdd,remaining=MareCharacters.earned(game.level)-MareCharacters.spent(game.attributes)-MareCharacters.spent(attributeDraft),amount=attributeQuantity==='max'?remaining:attributeQuantity;
      if(!MareCharacters.keys.includes(key))return;
      if(amount>remaining||amount<=0){allocationMessage=`Pontos insuficientes: ${remaining} disponíveis para +${amount}. Escolha uma quantidade menor.`;renderPanel();return;}
      allocationMessage='';attributeDraft[key]+=amount;renderPanel();return;}
    b=e.target.closest('[data-attribute-quantity]');if(b){attributeQuantity=b.dataset.attributeQuantity==='max'?'max':Number(b.dataset.attributeQuantity);allocationMessage='';renderPanel();return;}
    if(e.target.closest('#cancelAttributes')){closePanel();return;}
    b=e.target.closest('[data-attribute-remove]');if(b&&!b.disabled){const key=b.dataset.attributeRemove;if(MareCharacters.keys.includes(key)){attributeDraft[key]=Math.max(0,attributeDraft[key]-(attributeQuantity==='max'?attributeDraft[key]:attributeQuantity));allocationMessage='';renderPanel();}return;}
    if(e.target.closest('#showFactionPreview')){
      if(scene!=='lobby')returnLobby();closePanel();factionShowcase=true;document.body.classList.add('faction-showcase-open');$('factionInspection').classList.remove('hidden');return;
    }
    if(e.target.closest('#closeFactionPreview')){factionShowcase=false;document.body.classList.remove('faction-showcase-open');$('factionInspection').classList.add('hidden');return;}
    b=e.target.closest('[data-faction-action]');if(b){showcaseAction=b.dataset.factionAction;return;}
    if(e.target.closest('#confirmAttributes')){confirmAttributes();return;}
    if(e.target.closest('#resetAttributeDraft')){attributeDraft=MareCharacters.empty();allocationMessage='';renderPanel();return;}
    b=e.target.closest('[data-inv-tab]');if(b){inventoryUI.tab=b.dataset.invTab;renderPanel();return;}
    b=e.target.closest('[data-inv-category]');if(b){inventoryUI.category=b.dataset.invCategory;inventoryUI.page=0;renderPanel();return;}
    b=e.target.closest('[data-inv-page]');if(b&&!b.disabled){inventoryUI.page=Number(b.dataset.invPage);renderPanel();return;}
    b=e.target.closest('[data-inv-slot]');if(b){const it=game.equipment[b.dataset.invSlot];selectedItem=it?.id||null;renderPanel();return;}
    b=e.target.closest('[data-auto-equip]');if(b){equipBest();return;}
    b=e.target.closest('[data-inv-lock]');if(b){const it=getInventoryItem(b.dataset.invLock);if(it){it.locked=!it.locked;saveGame();renderPanel();}return;}
    b=e.target.closest('[data-inv-use-potion]');if(b){if(usePotion(true)){saveGame();updateUI();renderPanel();}return;}
    b=e.target.closest('[data-panel]');if(b){openPanel(b.dataset.panel);return;}
    b=e.target.closest('[data-close-panel]');if(b){closePanel();return;}
    b=e.target.closest('[data-buy-potion]');if(b){buyPotion();renderPanel();return;}
    b=e.target.closest('[data-claim]');if(b){claimQuest(b.dataset.claim);return;}
    b=e.target.closest('[data-item]');if(b){selectedItem=b.dataset.item;renderPanel();return;}
    b=e.target.closest('[data-equip]');if(b){equipItem(b.dataset.equip);return;}
    b=e.target.closest('[data-unequip]');if(b){unequip(b.dataset.unequip);return;}
    b=e.target.closest('[data-sell]');if(b){sellItem(b.dataset.sell);return;}
    b=e.target.closest('[data-forge-tab]');if(b){forgeUI.tab=b.dataset.forgeTab;renderPanel();return;}
    b=e.target.closest('[data-forge-fusion-mode]');if(b){forgeUI.fusionMode=b.dataset.forgeFusionMode;forgeOutcome=null;renderPanel();return;}
    b=e.target.closest('[data-forge-reforge-mode]');if(b){forgeUI.reforgeMode=b.dataset.forgeReforgeMode;forgeOutcome=null;renderPanel();return;}
    b=e.target.closest('[data-forge-item]');if(b){
      if(b.getAttribute('aria-disabled')==='true')return;
      const id=b.dataset.forgeItem;
      if(forgeUI.tab==='fusion'&&forgeUI.fusionMode==='equipment'){addFusionMaterial(id);return;}
      else{forgeUI.itemId=id;forgeUI.socket=0;}
      forgeOutcome=null;renderPanel();return;
    }
    b=e.target.closest('[data-forge-page]');if(b&&!b.disabled){forgeUI.page+=Number(b.dataset.forgePage);renderPanel();return;}
    b=e.target.closest('[data-forge-list]');if(b){forgeUI.list=!forgeUI.list;renderPanel();return;}
    b=e.target.closest('[data-forge-clear]');if(b){forgeUI[fusionSlotKey()]=Array(5).fill(null);forgeOutcome=null;renderPanel();return;}
    b=e.target.closest('[data-fusion-slot-index]');if(b){forgeUI[fusionSlotKey()][Number(b.dataset.fusionSlotIndex)]=null;forgeOutcome=null;renderPanel();return;}
    b=e.target.closest('[data-forge-auto]');if(b){
      const f=forgeUI.filters;const candidates=game.inventory.filter(i=>!MareForge.isPearl(i,itemDefs)&&!i.locked&&!i.sockets.some(Boolean)&&!['legendary','supreme'].includes(i.rarity)&&(!f.rarity||i.rarity===f.rarity)&&(!f.slot||itemBase(i).slot===f.slot)&&(!f.level||i.level>=Number(f.level))&&(!f.search||itemBase(i).name.toLocaleLowerCase('pt-BR').includes(f.search.toLocaleLowerCase('pt-BR')))&&f.where!=='equipped');
      const rarity=candidates.find(i=>candidates.filter(x=>x.rarity===i.rarity).length>=5)?.rarity;
      forgeUI.fusionIds=rarity?candidates.filter(i=>i.rarity===rarity).sort((a,b)=>a.plus-b.plus||a.level-b.level).slice(0,5).map(i=>i.id):Array(5).fill(null);forgeOutcome=rarity?null:{type:'fuseEquipment',success:false,message:'Não há cinco equipamentos elegíveis da mesma raridade nos filtros atuais.'};renderPanel();return;
    }
    b=e.target.closest('[data-forge-pearl]');if(b){forgeUI.pearlItemId=b.dataset.forgePearl;renderPanel();return;}
    b=e.target.closest('[data-forge-fusion-pearl]');if(b){if(b.getAttribute('aria-disabled')!=='true')addFusionMaterial(b.dataset.forgeFusionPearl);return;}
    b=e.target.closest('[data-forge-socket]');if(b){forgeUI.socket=Number(b.dataset.forgeSocket);renderPanel();return;}
    b=e.target.closest('[data-forge-action]');if(b&&!b.disabled){
      const item=forgeTarget(),command={type:b.dataset.forgeAction,itemId:item?.id,expectedSeq:Number(b.dataset.forgeSeq),pearlItemId:forgeUI.pearlItemId,pearlId:forgeUI.fusionId,socket:b.dataset.forgeRemove!==undefined?Number(b.dataset.forgeRemove):forgeUI.socket,line:Number(b.dataset.forgeLine),itemIds:[...(b.dataset.forgeAction==='fuse'?forgeUI.pearlFusionIds:forgeUI.fusionIds)],slot:forgeUI.outputSlot};
      let title='Confirmar operação?',message='',label='CONFIRMAR';
      const money=c=>`${fmt(c.gold)} dobrões e ${c.materials||0} Ferro Salgado`;
      if(['reforge','reforgeLine'].includes(command.type)){
        const line=command.type==='reforgeLine',extras=line?[item.extras[command.line]]:item.extras,cost=MareForge.reforgeCost(item,line);
        title='Confirmar reforja?';label='CONFIRMAR REFORJA';message=`${itemBase(item).name} +${item.plus} · Nv.${item.level}. Alterar: ${extras.map(x=>MareForge.names[x.stat]+' +'+(x.stat==='crit'?(x.value*100).toFixed(2)+'%':fmt(x.value))).join(', ')}. Custo: ${money(cost)}. O resultado pode ser inferior. Os demais dados da peça serão preservados.`;
      }else if(command.type==='fuseEquipment'){
        const plan=MareForge.equipmentFusion(game,command.itemIds,command.slot,itemDefs);if(plan.error)return;
        title='Confirmar fusão de equipamentos?';label='CONFIRMAR FUSÃO';message=`Consumir permanentemente: ${plan.items.map(i=>itemBase(i).name+' +'+i.plus+' Nv.'+i.level).join(', ')}. Custo: ${money(plan.cost)}. Receber: ${itemDefs[plan.def].name}, ${MareForge.rarity[plan.source].name} → ${MareForge.rarity[plan.target].name}, Nv.${plan.level}, +0. Extras e refinamentos dos materiais serão perdidos.`;
      }else if(command.type==='fuse'){
        const plan=MareForge.pearlFusion(game,command.itemIds,itemDefs);if(plan.error)return;
        title='Confirmar fusão de pérolas?';label='CONFIRMAR FUSÃO';message=`Consumir definitivamente: ${plan.items.map((i,n)=>'Slot '+(n+1)+': '+MareForge.pearlOf(i,itemDefs).name).join('; ')}. Custo: ${plan.gold} dobrões. Resultado possível: ${plan.next.name}. Chance: ${plan.chance*100}%. Em caso de falha, as cinco pérolas e os dobrões serão perdidos.`;
      }else if(command.type==='upgrade'){title='Confirmar aprimoramento?';label='CONFIRMAR APRIMORAMENTO';message=`${itemBase(item).name}: +${item.plus} → +${item.plus+1}. Custo: ${money(MareForge.upgradeCost(item))}. Chance: ${Math.round(MareForge.upgradeChance(item)*100)}%. ${item.plus<5?'Aprimoramento garantido.':'Na falha os custos são perdidos, sem rebaixar a peça.'}`;}
      else if(command.type==='remove'){const pearl=MareForge.pearlById[item.sockets[command.socket]];title='Confirmar remoção?';label='REMOVER PÉROLA';message=`Devolver ${pearl.name} à mochila por ${MareForge.removalCost(item,pearl)} dobrões.`;}
      else if(command.type==='imbue'){const pearl=game.inventory.find(i=>i.id===command.pearlItemId);title='Confirmar imbuimento?';label='INSTALAR PÉROLA';message=`Instalar ${MareForge.pearlOf(pearl,itemDefs).name} em ${itemBase(item).name}, socket ${command.socket+1}. A pérola sai da mochila. Instalação gratuita; remoção custa dobrões.`;}
      if(message)showConfirmation(title,message,()=>runForgeOperation(command),label,false);else runForgeOperation(command);return;
    }
    b=e.target.closest('[data-open-imbue]');if(b){forgeUI.tab='imbue';forgeUI.pearlItemId=b.dataset.openImbue;openPanel('forge');return;}
    b=e.target.closest('[data-forge-slot]');if(b){forgeSlot=b.dataset.forgeSlot;renderPanel();return;}
    b=e.target.closest('[data-forge]');if(b){forgeItem(b.dataset.forge);return;}
    b=e.target.closest('[data-area]');if(b){worldChange(b.dataset.area);return;}
    b=e.target.closest('[data-export]');if(b){exportSave();return;}
    b=e.target.closest('[data-import]');if(b){let input=$('saveImport');input.addEventListener('change',()=>{if(input.files[0])importSave(input.files[0]);},{once:true});input.click();return;}
    b=e.target.closest('[data-reset]');if(b){showConfirmation('Recomeçar aventura?','Seu personagem salvo neste navegador será apagado. Exporte o save pela Ajuda antes de continuar.',()=>{localStorage.removeItem(STORAGE_KEY);location.reload();});return;}
  });
  let fusionDragToken='';
  $('dialogBody').addEventListener('dragstart',e=>{const tile=e.target.closest('[data-fusion-drag]');if(!tile)return;fusionDragToken=tile.dataset.fusionDrag;e.dataTransfer.setData('application/x-mare-fusion',fusionDragToken);e.dataTransfer.effectAllowed='copy';});
  $('dialogBody').addEventListener('dragover',e=>{const slot=e.target.closest('[data-fusion-slot-index]');if(!slot)return;e.preventDefault();const valid=!!fusionAddition(fusionDragToken,Number(slot.dataset.fusionSlotIndex));slot.classList.toggle('drop-valid',valid);slot.classList.toggle('drop-invalid',!valid);e.dataTransfer.dropEffect=valid?'copy':'none';});
  $('dialogBody').addEventListener('dragleave',e=>{e.target.closest('[data-fusion-slot-index]')?.classList.remove('drop-valid','drop-invalid');});
  $('dialogBody').addEventListener('drop',e=>{const slot=e.target.closest('[data-fusion-slot-index]');if(!slot)return;e.preventDefault();slot.classList.remove('drop-valid','drop-invalid');const token=e.dataTransfer.getData('application/x-mare-fusion');addFusionMaterial(token,Number(slot.dataset.fusionSlotIndex));fusionDragToken='';});
  $('dialogBody').addEventListener('dragend',()=>{fusionDragToken='';document.querySelectorAll('.drop-valid,.drop-invalid').forEach(el=>el.classList.remove('drop-valid','drop-invalid'));});
  $('dialogBody').addEventListener('change',e=>{if(e.target.matches('[data-forge-filter]')){forgeUI.filters[e.target.dataset.forgeFilter]=e.target.value;forgeUI.page=0;renderPanel();}if(e.target.matches('[data-forge-pearl-filter]')){forgeUI.pearlFilters[e.target.dataset.forgePearlFilter]=e.target.value;renderPanel();}if(e.target.id==='forgeOutputSlot'){forgeUI.outputSlot=e.target.value;renderPanel();}});
  $('dialogBody').addEventListener('input',e=>{if(['forgeSearch','forgePearlSearch'].includes(e.target.id)){const id=e.target.id,pos=e.target.selectionStart;(id==='forgeSearch'?forgeUI.filters:forgeUI.pearlFilters).search=e.target.value;forgeUI.page=0;renderPanel();const input=$(id);input.focus();input.setSelectionRange(pos,pos);}});
  $('changePath').addEventListener('click',()=>{if(game)openCreation(true);});
  $('enterHunt').addEventListener('click',()=>openPanel('map'));
  $('returnLobby').addEventListener('click',returnLobby);
  $('navLobby').addEventListener('click',()=>{if(scene!=='lobby')returnLobby();});
  $('navHunt').addEventListener('click',()=>openPanel('map'));
  $('chatForm').addEventListener('submit',e=>{e.preventDefault();let msg=$('chatInput').value.trim();if(!msg)return;log('Anotação local: '+msg);$('chatInput').value='';});
  // Controles de inventário: preservam o foco ao filtrar a mochila.
  $('dialogBody').addEventListener('input',e=>{
    if(e.target.id!=='invSearch'||currentPanel!=='inventory')return;
    const pos=e.target.selectionStart??e.target.value.length;
    inventoryUI.query=e.target.value;inventoryUI.page=0;renderPanel();
    const next=$('invSearch');if(next){next.focus();next.setSelectionRange(pos,pos);}
  });
  document.addEventListener('change',e=>{if(e.target.id==='factionInspectionDirection')showcaseDirection=e.target.value;});
  $('dialogBody').addEventListener('change',e=>{
    if(currentPanel==='character'&&e.target.id==='healThreshold'){game.preferences.healThreshold=clamp(Number(e.target.value),.25,.90);saveGame();return;}
    if(currentPanel!=='inventory')return;
    if(e.target.id==='invSort'){inventoryUI.sort=e.target.value;inventoryUI.page=0;renderPanel();}
    if(e.target.id==='invRarity'){inventoryUI.rarity=e.target.value;inventoryUI.page=0;renderPanel();}
    if(e.target.id==='invHideProfile'){game.preferences=game.preferences||{};game.preferences.hideItems=e.target.checked;saveGame();renderPanel();}
  });
  $('btnHelp')?.addEventListener('click',()=>openPanel('help'));$('closePanel').addEventListener('click',closePanel);$('panelOverlay').addEventListener('click',e=>{if(e.target===$('panelOverlay'))closePanel();});
  canvas.addEventListener('pointerdown',(event)=>{if(!game||!session)return;let rect=canvas.getBoundingClientRect();
    const point=camera.screenToWorld((event.clientX-rect.left)*W/rect.width,(event.clientY-rect.top)*H/rect.height);
    const {x,y}=point;
    if(scene==='lobby'){
      const npc=npcs.find(n=>Math.hypot(n.x-x,n.y-30-y)<48);
      walkTo(npc?{x:npc.x-34,y:npc.y+13}:point,npc||null);return;
    }
    if(activeMap().id==='embers'&&Math.hypot(x-MareEmber.returnPoint.x,y-MareEmber.returnPoint.y)<42){walkTo({...MareEmber.returnPoint},{...MareEmber.returnPoint,kind:'return'});return;}
    const target=livingMobs().find(m=>Math.hypot(m.x-x,m.y-30-y)<48);
    if(target){world.target=target;autoPlay=true;travelPath=[];lobbyDestination=null;rejectedTargets.delete(target.id);updateUI();return;}
    walkTo(point);
  });

  window.addEventListener('keydown',(e)=>{
    const isTyping=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
    if(e.key==='Escape'){
      if(!$('startOverlay').classList.contains('hidden'))return;
      if(currentPanel){closePanel();return;}
      ['status','expedition','chat'].forEach(k=>toggleFloating(k,false));return;
    }
    if(currentPanel==='map'&&e.key==='Tab'){const items=[...$('panelOverlay').querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
    if(currentPanel==='map'&&['Enter',' '].includes(e.key)&&document.activeElement?.tagName==='BUTTON')return;
    if(isTyping||!game||!session||!$('startOverlay').classList.contains('hidden'))return;
    const k=e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&!currentPanel){e.preventDefault();keys.add(k);if(scene==='hunt'&&autoPlay){autoPlay=false;updateUI();}return;}
    if(['i','m','p','j','o','f','c','1','2','q',' '].includes(k))e.preventDefault();
    if(k==='i'){openPanel('inventory');return;}
    if(k==='m'){openPanel('map');return;}
    if(k==='f'){openPanel('forge');return;}
    if(k==='c'){openPanel('contracts');return;}
    if(k==='p'){openPanel('character');return;}
    if(k==='j'){toggleFloating('chat');return;}
    if(k==='o'){toggleFloating('expedition');return;}
    if(currentPanel)return;
    if(k==='1')useSkill(0,true);
    if(k==='2')useSkill(1,true);
    if(k==='q')usePotion(true);
    if(k===' '&&scene==='hunt')$('autoToggle').click();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){keys.clear();hiddenAt=Date.now();saveGame();}
    else {if(hiddenAt&&game&&session){const seconds=Math.min(45,(Date.now()-hiddenAt)/1000);for(let left=seconds;left>0;left-=.06)tick(Math.min(.06,left));hiddenAt=0;}lastTime=performance.now();updateUI();}
  });
  window.addEventListener('beforeunload',()=>saveGame());
  const previous=loadGame();if(previous){game=previous;let d=getDerived();game.hp=clamp(Number(game.hp)||1,0,d.maxHP);game.energy=clamp(Number(game.energy)||0,0,d.maxEnergy);startGame();toast('Bem-vindo de volta, '+game.name+'!','good');}else{$('startOverlay').classList.remove('hidden');openCreation(false);$('characterName').focus();}
  // Diagnóstico somente leitura para testes de regressão da demo local.
  window.__mareDiagnostics=()=>({scene,autoPlay,hero:{...world.hero},camera:{x:camera.x,y:camera.y,width:W,height:H},map:{id:activeMap().id,width:activeMap().width,height:activeMap().height},colliders:activeMap().colliders.map(o=>({...o})),npcs:npcs.map(n=>({...n})),path:travelPath.map(p=>({...p})),destination:lobbyDestination?{...lobbyDestination}:null,walkable:navigator().walkable(world.hero.x,world.hero.y),landmarks:scene==='lobby'?MareIsland.paths.map(p=>({...p})):activeMap().id==='embers'?MareEmber.paths.map(p=>({...p})):[],alive:livingMobs().length,attackClock:session?.attackClock??null,stats:game?getDerived():null,attributes:game?{...game.attributes}:null,attributePoints:game?.attributePoints??0,classId:game?.classId,combat:world.hero.combat?.snapshot()??null,energy:game?.energy,hp:game?.hp,skillUses:session?.skillUses,healingDone:session?.healingDone,guard:session?.guard,cooldowns:session?.cooldowns?.slice(),mobs:livingMobs().map(m=>({id:m.id,type:m.type,name:monsterName(m),skin:m.skin,district:m.district,x:m.x,y:m.y,hp:m.hp,taunt:m.taunt?{...m.taunt}:null})),kills:game?.stats.kills??0,damage:game?.stats.damage??0,level:game?.level??0});
  requestAnimationFrame(frame);
})();

