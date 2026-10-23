'use strict';
/* MARÉ PARTIDA — demonstração local, sem multiplayer e sem bibliotecas externas.
   Conteúdo original. Todo o progresso é salvo exclusivamente no navegador. */
(() => {
  const classCombat=MareCombatRegistry.create({sprites:MareFactionSprites,animation:MareCombatAnimation});
  const paperDoll=MarePaperDollCatalog.createRuntime({getImage:MareFactionSprites.image});
  const DEV_ACTIVE=MareDev.active(location.search);
  const STORAGE_KEY=MareDev.key(location.search);
  let suppressSave=false,devMessage='';
  MareDev.boot(localStorage,location.search);
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
  const worldZoom=MareHudTelemetry.createZoom(()=>resizeViewport());
  const navigators = Object.fromEntries(Object.entries(worldMaps).map(([id,map])=>[id,new Navigation(map,map.navigationCell||24)]));
  let travelPath = [], pursuit = new WeakMap();
  const keys = new Set(), rejectedTargets = new Map();
  const mapKey=()=>scene==='lobby'?'lobby':game?.area==='rare'&&worldMaps.rare?'rare':game?.area==='syrup'&&worldMaps.syrup?'syrup':game?.area==='baratie'&&worldMaps.baratie?'baratie':game?.area==='arlong'&&worldMaps.arlong?'arlong':game?.area==='swamp'&&worldMaps.conchas?'conchas':game?.area==='orange'&&worldMaps.orange?'orange':game?.area==='loguetown'&&worldMaps.loguetown?'loguetown':game?.area==='beach'&&worldMaps.dawn?'dawn':game?.area==='beach'&&worldMaps.embers?'embers':'hunt';
  const activeMap = () => worldMaps[mapKey()];
  const navigator = () => navigators[mapKey()];
  function resizeViewport(){
    const rect=canvas.getBoundingClientRect(), zoom=worldZoom.value;
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
    if(entity===world.hero&&classCombatController()?.locked())return true;
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
    if(world.hero.talentControl?.remaining>0)return false;
    if(currentPanel||!$('startOverlay').classList.contains('hidden'))return false;
    if(classCombatController()?.locked())return false;
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
  function drawMissingSprite(c,x,y){
    c.save();c.imageSmoothingEnabled=false;c.strokeStyle='#f07b7b';c.lineWidth=2;
    c.strokeRect(Math.round(x-7),Math.round(y-18),14,14);
    c.beginPath();c.moveTo(Math.round(x),Math.round(y-15));c.lineTo(Math.round(x),Math.round(y-10));c.stroke();
    c.fillStyle='#f07b7b';c.fillRect(Math.round(x-1),Math.round(y-7),2,2);c.restore();
  }
  function drawFactionSprite(c,x,y,fac,action='idle',size=70,flip=false,direction='south',time=world.time){
    if(globalThis.MareFactionSprites?.draw(c,fac,x,y,{action,direction,time,height:size}))return true;
    const state=globalThis.MareFactionSprites?.status(fac,action);
    if(state==='failed'||state==='missing'||state==='unsupported'){drawMissingSprite(c,x,y);return true;}
    return false;
  }
  function configureFactionVisual(){
    const f=factions[game?.factionId]||factions.pirate;
    document.documentElement.style.setProperty('--faction-accent',f.color);
    if($('heroFaction'))$('heroFaction').textContent=f.name.toUpperCase();
    if($('factionChip'))$('factionChip').textContent='◆ '+f.short;
  }

  const zones = {
    beach: { name:MareArchipelago.byArea('beach').name, sub:'Costa dos Navegantes', min:1, label:'RECOMENDADO · NV. 1–5', tint:'beach', mobs:['crab','bandit','spirit'] },
    orange:{name:MareArchipelago.byArea('orange').name,sub:'Porto das Laranjeiras',min:11,label:'RECOMENDADO · NV. 11–15',tint:'orange',mobs:['mr3','cabaji']},
    swamp: { name:MareArchipelago.byArea('swamp').name, sub:'Porto da Vigília', min:6, label:'RECOMENDADO · NV. 6–10', tint:'swamp', mobs:['spirit','bandit','crab'] },
    rare: { name:MareArchipelago.byArea('rare').name, sub:'Bosque dos Cocox', min:16, label:'RECOMENDADO · NV. 16–20', tint:'swamp', mobs:['cocox'] },
    syrup:{name:MareArchipelago.byArea('syrup').name,sub:'Bosque da Vila',min:21,label:'RECOMENDADO · NV. 21–25',tint:'swamp',mobs:['sham','buchi']},
    baratie:{name:MareArchipelago.byArea('baratie').name,sub:'Salão do Baratie',min:26,label:'RECOMENDADO · NV. 26–30',tint:'beach',mobs:['pearl','gin']},
    arlong:{name:MareArchipelago.byArea('arlong').name,sub:'Alas do Parque Arlong',min:31,label:'RECOMENDADO · NV. 31–35',tint:'beach',mobs:['kuroobi','chew']},
    loguetown:{name:MareArchipelago.byArea('loguetown').name,sub:'Ruas de Loguetown',min:36,label:'RECOMENDADO · NV. 36–40',tint:'orange',mobs:['marinheiro']}
  };
  const monsterTypes = {
    crab: { name:'Carapaça Ígnea', hp:45, atk:7, def:3, xp:22, gold:[6,13], reach:43, speed:42, attackSec:2.15, color:'#dd846c', icon:'◇' },
    bandit: { name:'Corsário de Brasa', hp:67, atk:10, def:5, xp:29, gold:[10,18], reach:51, speed:55, attackSec:1.95, color:'#e6b27d', icon:'⚔' },
    spirit: { name:'Sentinela Cinzenta', hp:52, atk:12, def:3, xp:34, gold:[10,19], reach:135, speed:34, attackSec:2.6, color:'#85d8c8', icon:'✧' },
    cesar: { name:'César', hp:211, atk:17, def:8, xp:70, gold:[22,35], reach:52, speed:55, attackSec:1.8, color:'#726770', icon:'◆' },
    boss: { name:'Guardião da Caldeira', hp:350, atk:17, def:10, xp:145, gold:[100,140], reach:56, speed:33, attackSec:2.45, color:'#e9c27b', icon:'♛' },
    cocox: { name:'Cocox', hp:620, atk:48, def:22, xp:140, gold:[45,70], reach:56, speed:82, attackSec:1.35, color:'#aaa797', icon:'◆' }
  };
  for(const id of ['sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro']){const m=MareMonsterCatalog[id];monsterTypes[id]={name:m.name,hp:m.max_hp,atk:m.physical_attack,def:m.physical_defense,xp:Math.round(140*1.055**(m.level-18)),gold:[90,135],reach:m.reach,speed:m.move_speed,attackSec:m.attack_seconds,color:'#d8aa79',icon:'◆'};}
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
  const slotNames = {head:'CABEÇA',necklace:'COLAR',coat:'TORSO',legs:'PERNEIRAS',boots:'PÉS',weapon:'ARMA PRINCIPAL',cloak:'CAPA',gloves:'MÃOS',ring:'ANEL',belt:'CINTO',charm:'ACESSÓRIO',akuma_no_mi:'AKUMA NO MI'};
  const inventorySlotsLeft=['head','necklace','coat','legs','boots'];
  const inventorySlotsRight=['weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'];
  const BAG_CAPACITY=120;
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
  itemDefs.push(...MarePrison.boxes);
  itemDefs.push(MareHaki.book); // Append only: existing save indices must remain stable.
  itemDefs.push(...MareAkuma.catalog.map(fruit=>({name:fruit.name,type:'akuma_no_mi',slot:'akuma_no_mi',fruitId:fruit.id,rank:fruit.rank,icon_path:fruit.icon_path,bonus_stats:fruit.bonus_stats,vfx_sprite_sheet:fruit.vfx_sprite_sheet,symbol:'✦',rarity:'epic'})));
  // Append only: preserve saved numeric item indices. All four reuse the existing 11 ATK Espadachim baseline; rarity multipliers remain centralized in MareForge.
  itemDefs.push(
    {name:'Katana da Maelstrom',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'legendary',fixedRarity:true,description:'Uma katana lendária que carrega a fúria dos redemoinhos. Sua lâmina canaliza correntes de vento em movimentos circulares, transformando cada golpe em uma tempestade cortante.',icon_path:'assets/ui/items-pixellab/katana-de-maelstrom.png?v=20261022'},
    {name:'Nodachi de Kairouseki',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'epic',fixedRarity:true,description:'Uma nodachi forjada com Kairouseki, o lendário mineral dos mares. Sua lâmina enfraquece usuários de Akuma no Mi ao contato, anulando sua resistência sobrenatural e tornando-os vulneráveis ao aço.',icon_path:'assets/ui/items-pixellab/nodachi-de-kairouseki.png?v=20261022'},
    {name:'Nodachi de Fogo',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'epic',fixedRarity:true,description:'Uma imponente nodachi envolta pelo calor das chamas. Seus golpes liberam energia flamejante, capazes de incendiar inimigos e deixar um rastro ardente pelo campo de batalha.',icon_path:'assets/ui/items-pixellab/nodachi-de-fogo.png?v=20261022'},
    {name:'Meito: Ame no Habakiri',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'supreme',fixedRarity:true,description:'Uma espada lendária empunhada por Kozuki Oden, reconhecida entre as grandes Meito de Wano. Diz-se que sua lâmina é capaz de cortar os próprios céus, carregando o legado de um dos maiores samurais da história.',icon_path:'assets/ui/items-pixellab/ame-no-habakiri.png?v=20261022'}
  );
  const questDefs = [
    {id:'crab',title:'Cascos de magma',desc:'Derrote 6 carapaças ígneas.',target:6,stat:'crab',gold:85,xp:65},
    {id:'bandit',title:'Chamas à espreita',desc:'Derrote 5 corsários de brasa.',target:5,stat:'bandit',gold:125,xp:100},
    {id:'boss',title:'Coração vulcânico',desc:'Derrote um chefe de ilha.',target:1,stat:'boss',gold:280,xp:190},
    {id:'dawn-patrol',title:'Dawn: liberar as ruas',desc:'Derrote 20 inimigos na Ilha Dawn.',target:20,area:'beach',metric:'kills',gold:150,xp:200},
    {id:'dawn-clear',title:'Dawn: enfrentar César',desc:'Derrote César na Ilha Dawn.',target:1,area:'beach',metric:'bosses',gold:300,xp:450},
    {id:'conchas-patrol',title:'Conchas: dissipar a névoa',desc:'Derrote 30 inimigos na Cidade das Conchas.',target:30,area:'swamp',metric:'kills',gold:450,xp:800},
    {id:'conchas-clear',title:'Conchas: vencer o bastião',desc:'Derrote o Guardião das Conchas.',target:1,area:'swamp',metric:'bosses',gold:900,xp:1400},
    {id:'orange-patrol',title:'Orange Town: recuperar o comércio',desc:'Derrote 40 inimigos em Orange Town.',target:40,area:'orange',metric:'kills',gold:900,xp:1600},
    {id:'orange-clear',title:'Orange Town: retomar as ruas',desc:'Derrote Mr. 3 ou Cabaji em Orange Town.',target:12,area:'orange',metric:'kills',gold:450,xp:800},
    {id:'rare-patrol',title:'Animais Raros: trilha segura',desc:'Derrote 20 Cocox na floresta.',target:20,area:'rare',metric:'kills',gold:1200,xp:2200}
  ];

  let game = null, session = null, world = { mobs:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:612,y:286,facing:1,attackAnim:0,walking:0}, target:null,spawnClock:0,bossCooldown:0,nextID:1 };
  let selectedClass = 'sword', selectedFaction = 'pirate', editingCharacter = false, currentPanel = null, selectedItem = null, forgeSlot = 'weapon', lastTime = 0, renderUIClock = 0, saveClock = 0, tickClock = 0;
  let autoPlay = true, autoSkills = true, reducedFX = false;
  let attributeDraft=MareCharacters.empty(),attributeQuantity=1,allocationMessage="";
  let hierarchyBackend=false,hierarchyBoard=[],hierarchyMessage='';
  let characterTab=null,akumaRank='E',talentDraft=null,selectedTalent=null,talentMessage='',talentDraftSeq=0,achievementCategory='all';
  const fruitAuraImages=Object.fromEntries(MareAkuma.catalog.filter(fruit=>fruit.vfx_sprite_sheet).map(fruit=>{const image=new Image();image.src=fruit.vfx_sprite_sheet;return [fruit.id,image];}));
  let current_fruit_vfx=null,fruitVfxImage=null,akumaBackend=false,akumaCorpseQueue=Promise.resolve();
  async function akumaRequest(route,payload){
    if(!akumaBackend)return null;
    const response=await fetch('/api/akuma/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player_id:game.akumaPlayerId,...payload})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Falha na habilidade');return result;
  }
  async function initAkumaBackend(){
    if(!game)return;
    try{const response=await fetch('/api/akuma/catalog',{cache:'no-store'});if(!response.ok)return;backendFruitCatalog=await response.json();akumaBackend=true;game.akumaPlayerId ||= crypto.randomUUID();
      const serverState=await akumaRequest('player',{});game.fruitCooldowns ||= {};for(const [id,readyAt] of Object.entries(serverState.cooldowns||{}))game.fruitCooldowns[id]=Math.max(game.fruitCooldowns[id]||0,readyAt*1000);session.fruitInvulnerable=Math.max(0,serverState.invulnerable_until-Date.now()/1000);game.zoanAltitudeUntil=Math.max(game.zoanAltitudeUntil||0,(serverState.high_altitude_until||0)*1000);for(const id of MareAkuma.registered(game))await akumaRequest('register',{fruit_id:id});
      const equipped=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs);if(equipped){await akumaRequest('equip',{fruit_id:equipped.id});if(MareAkuma.isZoan(equipped)&&game.zoanTransformed)await akumaRequest('transform',{enabled:true});}saveGame();
    }catch(error){akumaBackend=false;console.warn('API Akuma indisponível:',error);}
  }
  function syncFruitVfx(){
    const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);
    current_fruit_vfx=fruit?.vfx_sprite_sheet||null;
    fruitVfxImage=fruit?fruitAuraImages[fruit.id]:null;
  }
  const vfx_aura={draw(c,x,y,time,scale=1,fruitOverride=null){
    const fruit=fruitOverride||MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);if(!fruit||MareAkuma.isZoan(fruit))return;
    const auraImage=fruitAuraImages[fruit.id];
    c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=fruit.id==='akuma_kuku_kuku'?.48:.85;
    if(auraImage?.complete&&auraImage.naturalWidth>=48&&auraImage.naturalHeight>=48){
      const frames=Math.max(1,Math.floor(auraImage.naturalWidth/48)),frame=Math.floor(time*10)%frames;
      c.drawImage(auraImage,frame*48,0,48,48,Math.round(x-24*scale),Math.round(y-48*scale),Math.round(48*scale),Math.round(48*scale));
    }else if(fruit.id==='akuma_beri_beri'){
      for(let i=0;i<3;i++){const a=time*2.5+i*Math.PI*2/3;c.fillStyle=i%2?'#8a2be2':'#bb51f2';c.fillRect(Math.round(x+Math.cos(a)*22*scale-3*scale),Math.round(y-30*scale+Math.sin(a)*9*scale-3*scale),Math.round(6*scale),Math.round(6*scale));}
    }else{
      for(let i=0;i<4;i++){const phase=(time*1.7+i*.25)%1;c.globalAlpha=1-phase;c.fillStyle=i%2?'#ff9e2e':'#ffd700';c.fillRect(Math.round(x+((-1)**i)*(14+i%2*5)*scale),Math.round(y-(24+phase*31)*scale),Math.max(1,Math.round(3*scale)),Math.max(1,Math.round(3*scale)));}
    }
    c.restore();
  }};
  const fruitSkillSheets=Object.fromEntries(MareAkuma.catalog.filter(fruit=>fruit.skill_sprite_sheet).map(fruit=>{const image=new Image();image.src=fruit.skill_sprite_sheet;return [fruit.id,image];}));
  const FRUIT_VFX_FPS=12;
  function drawFruitFrame(c,x,y,fruitId,frame,scale=1){
    const fruit=MareAkuma.byId(fruitId),image=fruitSkillSheets[fruitId];
    const columns=fruit?.skill_columns||1,frames=fruit?.skill_frames||1;
    if(!image?.complete||image.naturalWidth<columns*48||image.naturalHeight<Math.ceil(frames/columns)*48)return false;
    const index=Math.max(0,Math.min(frames-1,frame));
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(image,(index%columns)*48,Math.floor(index/columns)*48,48,48,Math.round(x-24*scale),Math.round(y-48*scale),Math.round(48*scale),Math.round(48*scale));
    c.restore();return true;
  }
  function drawFruitBurst(c,x,y,fruitId,elapsed,scale=1){
    return drawFruitFrame(c,x,y,fruitId,Math.floor(Math.max(0,elapsed)*FRUIT_VFX_FPS),scale);
  }
  function captureBeriSprite(){
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;
    if(!drawPlayerSprite(c,24,48))return null;
    const source=c.getImageData(0,0,48,48).data;
    const regions=[[11,6],[25,6],[8,18],[27,18],[11,31],[25,31]];
    return regions.map(([sx,sy],part)=>{
      const sphere=document.createElement('canvas');sphere.width=12;sphere.height=12;
      const sc=sphere.getContext('2d'),pixels=sc.createImageData(12,12);
      for(let py=0;py<12;py++)for(let px=0;px<12;px++){
        const r=Math.hypot(px-5.5,py-5.5),at=(py*12+px)*4,src=((sy+py)*48+sx+px)*4;
        if(r>5.6)continue;
        const original=source[src+3]/255,edge=r>4.6,shine=px>=2&&px<=4&&py>=2&&py<=4;
        const tint=part%2?[169,49,213]:[125,38,207];
        pixels.data[at]=edge?38:shine?246:Math.round(tint[0]*(1-original*.52)+source[src]*original*.52);
        pixels.data[at+1]=edge?12:shine?163:Math.round(tint[1]*(1-original*.52)+source[src+1]*original*.52);
        pixels.data[at+2]=edge?66:shine?255:Math.round(tint[2]*(1-original*.52)+source[src+2]*original*.52);
        pixels.data[at+3]=255;
      }
      sc.putImageData(pixels,0,0);return sphere;
    });
  }
  function drawBeriSeparation(c,x,y,progress,scale=1){
    if(drawFruitBurst(c,x,y,'akuma_beri_beri',progress*1.5,scale))return;
    const spheres=session?.beriSpheres;if(!spheres)return;
    const spread=Math.sin(Math.PI*Math.min(1,progress)),radius=3+spread*29;
    c.save();c.imageSmoothingEnabled=false;
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3+progress*Math.PI*1.25;
      const bx=x+Math.cos(angle)*radius*scale,by=y-25*scale+Math.sin(angle)*radius*.68*scale;
      c.drawImage(spheres[i],Math.round(bx-6*scale),Math.round(by-6*scale),Math.round(12*scale),Math.round(12*scale));
    }
    c.restore();
  }
  async function registerFruit(id){const def=itemDefs.find(d=>d.fruitId===id);if(def&&!game.inventory.some(i=>i.fruitId===id)&&!Object.values(game.equipment).some(i=>i?.fruitId===id)&&game.inventory.length>=BAG_CAPACITY){toast('Libere um espaço na bolsa para registrar a fruta.','danger');return;}if(akumaBackend){try{await akumaRequest('register',{fruit_id:id});}catch(error){toast(error.message,'danger');return;}}const result=MareAkuma.register(game,id);if(!result.ok)return;game=result.state;if(def&&!game.inventory.some(i=>i.fruitId===id)&&!Object.values(game.equipment).some(i=>i?.fruitId===id)){if(game.inventory.length>=BAG_CAPACITY){toast('Libere um espaço na bolsa para registrar a fruta.','danger');return;}game.inventory.unshift(newItem(def));}saveGame();renderPanel();updateUI();toast('Fruta registrada no Compêndio.','good');}
  function equippedZoan(){const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);return MareAkuma.isZoan(fruit)?fruit:null;}
  function zoanDirection(){return ({front:[0,1],back:[0,-1],left:[-1,0],right:[1,0]})[world.hero.direction]||[0,1];}
  async function toggleZoanTransform(){
    const fruit=equippedZoan();if(!fruit||!game)return false;
    const enabled=!game.zoanTransformed;
    if(akumaBackend){try{await akumaRequest('transform',{enabled});}catch(error){toast(error.message,'danger');return false;}}
    game.zoanTransformed=enabled;world.hero.attackAnim=0;session.zoanDash=null;saveGame();updateUI();renderPortrait();
    if(currentPanel)renderPanel();toast(enabled?'Forma Zoan ativada.':'Forma humana restaurada.','good');return true;
  }
  async function useFruitSkill(manual=false){
    const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs),skill=MareAkuma.activeSkill(fruit?.id);
    if(!skill||scene!=='hunt'||session.respawn>0||game.hp<=0)return false;
    if(MareAkuma.isZoan(fruit)&&!game.zoanTransformed){if(manual)toast('Transforme-se para usar esta habilidade.');return false;}
    if(Date.now()<(game.fruitCooldowns?.[fruit.id]||0)){if(manual)toast('Habilidade em recarga.');return false;}
    const target=fruit.id==='akuma_inu_dachshund'?livingMobs().filter(m=>distance(m,world.hero)<=130&&navigator().clear(world.hero,m)).sort((a,b)=>distance(a,world.hero)-distance(b,world.hero))[0]:null;
    if(fruit.id==='akuma_inu_dachshund'&&!target){if(manual)toast('Nenhum alvo próximo para morder.');return false;}
    const beriSpheres=fruit.id==='akuma_beri_beri'?captureBeriSprite():null;
    if(fruit.id==='akuma_beri_beri'&&!beriSpheres){if(manual)toast('Aguarde o carregamento da sprite para usar esta habilidade.');return false;}
    let serverEffect=null;if(akumaBackend){try{await akumaCorpseQueue;const response=await akumaRequest('cast',{instance:game.area,x:world.hero.x,y:world.hero.y,enemies:livingMobs().map(m=>({id:m.id,x:m.x,y:m.y})),direction:zoanDirection()});serverEffect=response.effect;}catch(error){if(manual)toast(error.message,'danger');return false;}}
    if(fruit.id==='akuma_kuku_kuku'){
      const corpses=world.corpses.filter(c=>c.instance===game.area).sort((a,b)=>Math.hypot(a.x-world.hero.x,a.y-world.hero.y)-Math.hypot(b.x-world.hero.x,b.y-world.hero.y));
      const corpse=serverEffect?world.corpses.find(c=>String(c.id)===String(serverEffect.id))||serverEffect:corpses[0];if(!corpse){if(manual)toast('Nenhum monstro abatido nesta área.');return false;}
      world.corpses=world.corpses.filter(c=>String(c.id)!==String(corpse.id));world.food.push({id:corpse.id,x:corpse.x,y:corpse.y,readyAt:world.time+.75,expires:Infinity});world.fx.push({x:corpse.x,y:corpse.y,fruit:'akuma_kuku_kuku',life:.75,max:.75});
    }else if(fruit.id==='akuma_beri_beri'){
      session.beriSpheres=beriSpheres;session.fruitInvulnerable=1.5;session.fruitBurst=1.5;world.hero.visible=false;
      if(serverEffect){for(const moved of serverEffect.enemies){const mob=world.mobs.find(m=>m.id===moved.id&&m.alive);if(mob)navigator().move(mob,moved.x-mob.x,moved.y-mob.y);}}else for(const mob of livingMobs().filter(m=>distance(m,world.hero)<=130)){const dx=mob.x-world.hero.x,dy=mob.y-world.hero.y,d=Math.max(1,Math.hypot(dx,dy));navigator().move(mob,dx/d*65,dy/d*65);}
    }else if(fruit.id==='akuma_tori_albatroz'){
      game.zoanAltitudeUntil=Date.now()+5000;session.zoanActionUntil=world.time+.75;
      world.fx.push({x:world.hero.x,y:world.hero.y,zoanVfx:fruit.id,followHero:true,loop:true,life:5,max:5});
    }else if(fruit.id==='akuma_uma_uma'){
      const [dx,dy]=serverEffect?.direction||zoanDirection();session.zoanDash={dx,dy,remaining:Math.min(256,serverEffect?.distance||256),hitId:serverEffect?.hit_id??null,hit:false};session.zoanActionUntil=world.time+.75;
      world.fx.push({x:world.hero.x,y:world.hero.y,zoanVfx:fruit.id,followHero:true,life:2/3,max:2/3});
    }else if(fruit.id==='akuma_inu_dachshund'){
      const victim=world.mobs.find(m=>m.id===(serverEffect?.target_id??target.id)&&m.alive);
      if(victim){faceCombatTarget(victim);const d=Math.max(1,distance(world.hero,victim));navigator().move(world.hero,(victim.x-world.hero.x)/d*Math.max(0,d-35),(victim.y-world.hero.y)/d*Math.max(0,d-35));victim.zoanSlow={remaining:3,percent:.30};victim.zoanDefense={remaining:3,percent:.05};outputDamage(victim,MareCharacters.damage(getDerived(),enemyArmor(victim),{type:'physical',multiplier:.85}));world.fx.push({x:victim.x,y:victim.y,zoanVfx:fruit.id,life:2/3,max:2/3});}session.zoanActionUntil=world.time+.75;
    }
    game.fruitCooldowns ||= {};game.fruitCooldowns[fruit.id]=Date.now()+skill.cooldown*1000;session.fruitCooldown=skill.cooldown;saveGame();updateUI();return true;
  }
  const forgeUI={tab:'upgrade',itemId:null,pearlItemId:'',socket:0,fusionId:'pearl_for_1',fusionMode:'equipment',fusionIds:Array(5).fill(null),pearlFusionIds:Array(5).fill(null),pearlFilters:{},outputSlot:'weapon',reforgeMode:'line',filters:{},page:0,list:false};
  let forgeOutcome=null,forgeFusionStamp='';
  let inventoryFeedback=null,attributeSuccessUntil=0,forgeFeedback=null,rewardBuffer=null,rewardTimer=null;
  let factionShowcase=false,showcaseAction='idle',showcaseDirection='south';
  window.addEventListener('mare-faction-sprite-ready',()=>{if(game){renderPortrait();if($('inventorySprite'))drawCurrentPreview($('inventorySprite'),185);if($('characterSprite'))drawCurrentPreview($('characterSprite'),155);}});
  window.addEventListener('mare-zoan-sprite-ready',()=>{if(game){renderPortrait();if($('inventorySprite'))drawCurrentPreview($('inventorySprite'),185);if($('characterSprite'))drawCurrentPreview($('characterSprite'),155);}});
  let scene = 'lobby', lobbyDestination = null, lobbyAction = null;
  const npcs = [
    {name:'Capitã luffy',short:'Luffy',x:340,y:206,color:'#e5b87b',kind:'hunt',art:'luffy'},
    {name:'Ferreiro ryuma',short:'Ryuma',x:660,y:404,color:'#d9a782',kind:'forge',art:'ryuma'},
    {name:'nami · Navegadora',short:'Nami',x:660,y:206,color:'#c8a8eb',kind:'contracts',art:'nami'},
    {name:'Mercador ',short:'Donquixote',x:340,y:404,color:'#a5d7bf',kind:'shop',art:'donquixote'}
  ];
  for(const npc of npcs)Object.assign(npc,(globalThis.MareLobby?.npcs||MareIsland.npcs)[npc.art]);
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
  function newItem(def,level=1,rolled=false,forcedRarity=null){
    const item={id:'it'+Date.now().toString(36)+(world.nextID++).toString(36),def:itemDefs.indexOf(def),level:Math.max(1,level),plus:0,locked:false,obtainedAt:Date.now()};
    if(def.type==='akuma_no_mi'){Object.assign(item,{type:'akuma_no_mi',fruitId:def.fruitId,rank:def.rank,rarity:def.rarity});return item;}
    if(def.kind==='pearl')item.pearlId=def.pearlId;else item.rarity=def.fixedRarity?def.rarity:(forcedRarity||(rolled?MareTalentCombat.rarity(Math.random,game?getDerived().rareChance*(MareUltimates.selected(game)==='underworld'?2:1):0):def.rarity));
    return MareForge.normalizeItem(item,itemDefs,Math.random);
  }
  function eligibleGearForDrop(rarity,world=false){
    const worldAllowed=!world||MarePrison.canDrop('equipment','world');
    return itemDefs.filter(d=>worldAllowed&&!d.kind&&d.type!=='akuma_no_mi'&&(d.slot!=='weapon'||d.type===game.classId)&&(!d.fixedRarity||(d.rarity===rarity&&d.rarity!=='supreme')));
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
    return MareHierarchy.migrate(MareAkuma.migrate(MareHaki.migrate(MareTalents.migrate(MarePrison.migrate(MareHunt.migrate(g))))));
  }
  function getDerived(g=game,runtime=g===game?session?.talents:null) {
    if(!g)return{maxHP:100,maxEnergy:80,attack:0,defense:0,crit:0,speed:1,range:50,power:0};
    const gear=MareAkuma.applyGear(MareForge.aggregate(g.equipment,itemDefs),g.equipment?.akuma_no_mi,itemDefs);
    gear.akumaRegistered=MareAkuma.passiveCount(g);
    const stats=MareHaki.stats(MareTalents.applyStats(MareCharacters.derive(g,classes[g.classId],factions[g.factionId]||factions.pirate,gear),g,runtime),g,runtime&&g===game?session?.haki:null);
    if(g.zoanTransformed&&MareAkuma.isZoan(MareAkuma.itemData(g.equipment?.akuma_no_mi,itemDefs))){stats.range=65;stats.attack=stats.physical;if(g.equipment.akuma_no_mi.fruitId==='akuma_tori_albatroz'&&Date.now()<(g.zoanAltitudeUntil||0)){stats.moveSpeed*=1.30;stats.huntSpeed*=1.30;}}
    return stats;
  }
  function xpNeeded(level){return Math.round(80+25*Math.pow(level-1,1.55));}
  function observeAchievements(g=game){return MareAchievements.observe(g,{power:getDerived(g,null).power});}
  function saveGame(){if(!game||suppressSave)return;if(DEV_ACTIVE)game.devSandbox=true;game=observeAchievements(); try {localStorage.setItem(STORAGE_KEY,JSON.stringify(game));$('saveDot').style.background='#65c9bc';} catch(e) {toast('Não foi possível salvar o progresso no navegador.','danger');} }
  function preserveSave(raw,key=STORAGE_KEY+'-before-attributes-v1'){
    if(raw&&!localStorage.getItem(key))localStorage.setItem(key,raw);
  }
  function loadGame(){try{let data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!data||!classes[data.classId]||!Number.isInteger(data.level)||data.level<1||typeof data.name!=='string'||!data.equipment)return null;let clean={...data,claimed:Array.isArray(data.claimed)?data.claimed:[],inventory:Array.isArray(data.inventory)?data.inventory:[],stats:{kills:0,crab:0,bandit:0,spirit:0,boss:0,damage:0,goldEarned:0,xpEarned:0,...data.stats}};for(const slot of [...inventorySlotsLeft,...inventorySlotsRight])if(!(slot in clean.equipment))clean.equipment[slot]=null;
      if(!clean.preferences||typeof clean.preferences!=='object')clean.preferences={};
      if(!zones[clean.area])clean.area='beach';if(!factions[clean.factionId])clean.factionId='pirate';
      if(!clean.attributeVersion)preserveSave(localStorage.getItem(STORAGE_KEY));
      if(clean.attributeVersion!==2)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-attributes-v2');
      if(clean.forgeVersion!==MareForge.VERSION)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-forge-v3');
      if(clean.impelDown?.version!==MarePrison.VERSION)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-impel-v1');
      if(clean.talentVersion!==MareTalents.VERSION)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-talents-v2');
      if(!clean.haki)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-haki-v1');
      return MareHierarchy.migrate(MareAkuma.migrate(MareHaki.migrate(MareTalents.migrate(MarePrison.migrate(MareForge.migrate(MareCharacters.migrate(MareHunt.migrate(clean)),itemDefs))))));}catch(e){return null;}}
  function elapsedString(sec){let s=Math.floor(sec),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
  function log(text,type='normal'){let box=$('gameLog');let el=document.createElement('div');el.className='log-line '+type;let t=new Date();el.innerHTML=`<time>${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}</time>${escapeHTML(text)}`;box.prepend(el);while(box.children.length>45)box.lastChild.remove();}
  function toast(text,type='normal'){let box=$('toastContainer'),el=document.createElement('div');el.className='toast '+type;el.textContent=text;box.appendChild(el);while(box.children.length>3)box.firstElementChild.remove();setTimeout(()=>el.remove(),3500);}
  function rewardNotice({gold=0,xp=0,name='',rarity='common'}={}){
    rewardBuffer=rewardBuffer||{gold:0,xp:0,names:[],rarity:'common'};rewardBuffer.gold+=gold;rewardBuffer.xp+=xp;
    if(name)rewardBuffer.names.push(name);
    const order=['common','uncommon','rare','epic','legendary','supreme'];if(order.indexOf(rarity)>order.indexOf(rewardBuffer.rarity))rewardBuffer.rarity=rarity;
    if(rewardTimer)return;
    rewardTimer=setTimeout(()=>{const reward=rewardBuffer;rewardBuffer=null;rewardTimer=null;
      const parts=[];if(reward.gold)parts.push('+'+fmt(reward.gold)+' dobrões');if(reward.xp&&scene!=='hunt')parts.push('+'+fmt(reward.xp)+' XP');
      if(reward.names.length)parts.push(reward.names[0]+(reward.names.length>1?' +'+(reward.names.length-1)+' item(ns)':''));
      if(parts.length)toast(parts.join(' · '),'reward reward-'+reward.rarity);
    },650);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game)saveGame();});
  window.addEventListener('pagehide',()=>{if(game)saveGame();});
  Object.defineProperty(window,'has_haki_unlocked',{get:()=>game?.has_haki_unlocked===true,configurable:true});
  function initializeSession(){travelPath=[];keys.clear();rejectedTargets.clear();pursuit=new WeakMap();session={haki:MareHaki.start(),talents:MareTalentCombat.create(),start:performance.now()/1000,elapsed:0,xp:0,gold:0,recentLoot:[],cooldowns:[0,0],fruitCooldown:0,fruitInvulnerable:0,fruitBurst:0,guard:0,blessing:0,skillUses:[0,0],skillEnergySpent:0,healingDone:0,respawn:0,spent:0,attackClock:0,lastHit:0,heroKOs:0,bossNotice:0};world={mobs:[],corpses:[],food:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:scene==='lobby'?540:580,y:scene==='lobby'?338:313,facing:1,attackAnim:0,walking:0,visible:true},target:null,spawnClock:0,bossCooldown:0,nextID:Math.floor(Date.now()%1000000)};Object.assign(world.hero,activeMap().spawn,{direction:'front'});camera.update(world.hero,activeMap(),0,true);if(scene==='hunt')for(let i=0;i<7;i++)spawnMob();}
  function startGame(){scene='lobby';initializeSession();syncFruitVfx();void initAkumaBackend();void syncHierarchy();$('startOverlay').classList.add('hidden');autoPlay=true;autoSkills=true;setAreaLabels();configureFactionVisual();applySceneHudLayout();updateUI();renderPortrait();log('Bem-vindo ao Porto das Correntes.','good');log('Converse com os NPCs ou inicie sua expedição.');saveGame();}
  function enterHunt(){if(!game)return;factionShowcase=false;document.body.classList.remove('faction-showcase-open');$('factionInspection')?.classList.add('hidden');scene='hunt';autoPlay=true;autoSkills=true;lobbyDestination=null;lobbyAction=null;initializeSession();session.attackClock=0;world.target=null;setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Expedição iniciada: '+zones[game.area].name,'good');log('Você partiu para '+zones[game.area].name+'.','gold');saveGame();}
  function returnLobby(){if(!game)return;scene='lobby';lobbyDestination=null;lobbyAction=null;initializeSession();setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Você retornou ao Porto das Correntes.','good');log('De volta ao porto. Seus espólios foram preservados.','good');saveGame();}
  function activateNPC(npc){lobbyAction=null;if(npc.kind==='return'){returnLobby();return;}if(npc.kind==='hunt')openPanel('modes');else openPanel(npc.kind);}
  function setAreaLabels(){let inLobby=scene==='lobby';let z=inLobby?{name:'Porto das Correntes',sub:'Refúgio dos Navegantes',label:'ÁREA SEGURA · CIDADE'}:zones[game.area];$('locationName').textContent=z.name;$('mapTitle').textContent=z.name.toUpperCase();$('overlayArea').textContent=z.sub.toUpperCase();$('sceneEyebrow').textContent=inLobby?'PORTO PRINCIPAL':'REGIÃO DE CAÇA';$('dangerRating').textContent=z.label;
    $('enterHunt').classList.toggle('hidden',!inLobby);$('returnLobby').classList.toggle('hidden',inLobby);$('navLobby').classList.toggle('active',inLobby);$('navHunt').classList.toggle('active',!inLobby);
    $('sceneInfo').textContent=inLobby?'ÁREA SEGURA · CLIQUE PARA CAMINHAR':'COMBATE AUTOMÁTICO ATIVO';$('worldHint').textContent=inLobby?'Clique para caminhar · WASD / setas · Clique nos NPCs para interagir':'Clique no chão para caminhar · Monstro: retomar caçada · WASD / setas';document.body.classList.toggle('scene-lobby',inLobby);document.body.classList.toggle('scene-hunt',!inLobby);}

  function monsterName(m){return m?.name||monsterTypes[m?.type]?.name||'';}
  function huntAnchors(){return MareNewIslands[activeMap().id]?.districts||(activeMap().id==='dawn'?MareDawn.districts:activeMap().id==='conchas'?MareConchas.districts:activeMap().id==='orange'?MarePixelWorldMaps.orange.districts:activeMap().id==='loguetown'?MarePixelWorldMaps.loguetown.districts:activeMap().id==='embers'?MareEmber.districts:[]);}
  function questProgress(q){return q?.area?(game.hunts?.areas[q.area]?.[q.metric]||0):(game.stats[q?.stat]||0);}
  function updateHuntHUD(){
    $('huntRoute').classList.toggle('hidden',scene!=='hunt');if(scene!=='hunt')return;
    const s=MareHunt.sectorAt(game.area,world.hero,huntAnchors()),progress=game.hunts.areas[game.area];
    $('worldHint').textContent=s.name+' · Nv. '+s.min+'–'+s.max+' · '+(game.level<s.min?'Área perigosa para seu nível':MareHunt.get(game.area).boss&&progress.bosses?'Chefe vencido · confira suas recompensas':'Explore a rota da ilha');
  }
  function renderHuntRoute(body){
    const r=MareHunt.get(game.area),p=game.hunts.areas[game.area],list=MareHunt.sectors(game.area,huntAnchors()),current=MareHunt.sectorAt(game.area,world.hero,huntAnchors()),ready=p.bosses>0&&!p.firstRewardClaimed;
    body.innerHTML=`<section class="hunt-route"><header><div><h2>${escapeHTML(r.name)}</h2><p>Expedição Nv. ${r.min}–${r.max} · Você: Nv. ${game.level}</p></div><strong>${p.kills} abates${r.boss?' · '+p.bosses+' chefes':''}</strong></header><p>${r.boss?'Os níveis pertencem aos setores.':game.area==='rare'?'Os Cocox da ilha são Nv. 18.':game.area==='syrup'?'Sham e Buchi patrulham a vila no Nv. 23.':game.area==='baratie'?'Pearl e Gin defendem o Baratie no Nv. 28.':game.area==='orange'?'Mr. 3 e Cabaji patrulham Orange Town no Nv. 13.':game.area==='loguetown'?'Marinheiros patrulham as ruas no Nv. 40.':'Kuroobi e Chew protegem o Parque Arlong no Nv. 33.'} Escolha uma parada para caminhar até ela; ao chegar, retome a auto-caçada. A rota não teleporta o personagem.</p><div class="hunt-sectors">${list.map((s,i)=>`<button type="button" data-hunt-sector="${s.id}" ${scene!=='hunt'?'disabled':''} aria-current="${s.id===current.id?'location':'false'}"><span>${i+1}</span><div><strong>${escapeHTML(s.name)}</strong><small>Nv. ${s.min}–${s.max}${r.boss&&s.id===list.at(-1).id?' · Arena do chefe':''}${game.level<s.min?' · Perigo':''}</small></div><b>Seguir rota →</b></button>`).join('')}</div>${r.boss?`<section class="hunt-boss-brief"><h3>${escapeHTML(r.boss)} · Nv. ${r.bossLevel}</h3><p>Derrote 12 inimigos nesta ilha e aproxime-se do último setor para encontrar o chefe. Respawn: 90s após a derrota. Abates em outra ilha não contam.</p><p><strong>Leia o chão:</strong> círculos e faixas vermelhas mostram onde o ataque vai acertar. Saia antes de preencher. A auto-caçada tenta desviar quando existe caminho livre.</p><p>Primeira vitória: arma ${r.firstRarity==='rare'?'rara':'épica'} da sua classe + ${r.firstGold} dobrões. Resgate único, preservado com mochila cheia.</p><button class="dialog-button" type="button" data-hunt-first="${game.area}" ${!ready?'disabled':''}>${p.firstRewardClaimed?'Recompensa recebida':ready?'RESGATAR PRIMEIRA VITÓRIA':'Derrote o chefe para resgatar'}</button></section>`:`<section class="hunt-boss-brief"><h3>${game.area==='rare'?'Cocox · Nv. 18':game.area==='syrup'?'Sham e Buchi · Nv. 23':game.area==='baratie'?'Pearl e Gin · Nv. 28':game.area==='orange'?'Mr. 3 e Cabaji · Nv. 13':game.area==='loguetown'?'Marinheiro · Nv. 40':'Kuroobi e Chew · Nv. 33'}</h3><p>Os inimigos patrulham os setores e atacam quando você se aproxima.</p></section>`}<p class="hunt-economy">Drops: equipamento de tier ${Math.ceil(r.min/5)}–${Math.ceil(r.max/5)}, Ferro Salgado e poções. ${r.boss?'Chefes garantem um equipamento se houver espaço.':''} Monstros comuns não entregam gemas ou pérolas. Ao superar o inimigo em mais de três níveis, a XP diminui gradualmente até 15%.</p></section>`;
  }
  function claimHuntFirst(area){
    const r=MareHunt.get(area);if(!r)return;const item=newItem(itemDefs[starterWeapon(game.classId)],Math.ceil(r.bossLevel/5),false,r.firstRarity);item.origin='Primeira vitória · '+r.name;
    const result=MareHunt.claimFirst(game,area,item,BAG_CAPACITY);if(!result.ok){toast(result.message,'danger');return;}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(result.state));}catch{toast('Não foi possível salvar. Sua recompensa continua disponível.','danger');return;}
    game=result.state;session.gold+=r.firstGold;updateUI();renderPanel();toast('Arma da classe e '+r.firstGold+' dobrões recebidos!','good');
  }
  function followHuntSector(id){
    if(scene!=='hunt')return;const s=MareHunt.sectors(game.area,huntAnchors()).find(s=>s.id===id);if(!s)return;
    const candidates=[s];for(const radius of [30,60,100])for(let a=0;a<Math.PI*2;a+=Math.PI/4)candidates.push({x:s.x+Math.cos(a)*radius,y:s.y+Math.sin(a)*radius});
    const target=candidates.find(p=>navigator().walkable(p.x,p.y)&&navigator().path(world.hero,p).length);if(!target){toast('Não foi encontrado caminho livre para esse setor.','danger');return;}
    closePanel();if(walkTo(target))toast('Seguindo para '+s.name+'. Ao chegar, retome a auto-caçada.');
  }
  function spawnMob(forceBoss=false){
    if(livingMobs().length>=8)return;
    const region=MareHunt.get(game.area),anchors=huntAnchors(),arena=MareHunt.sectors(game.area,anchors).at(-1);let point=null,sector=null;
    if(forceBoss&&!region.boss)return;
    for(let k=0;k<90;k++){
      const a=Math.random()*Math.PI*2,r=forceBoss?50+Math.random()*120:['baratie','arlong','orange','loguetown'].includes(game.area)?70+Math.random()*125:game.area==='syrup'?140+Math.random()*230:180+Math.random()*270;
      const p={x:(forceBoss?arena.x:world.hero.x)+Math.cos(a)*r,y:(forceBoss?arena.y:world.hero.y)+Math.sin(a)*r};
      if(Math.hypot(p.x-activeMap().spawn.x,p.y-activeMap().spawn.y)<150||distance(p,world.hero)<120)continue;
      if(game.area==='rare'&&MareNewIslands.rare.at(Math.floor(p.x/64),Math.floor(p.y/64))!=='c')continue;
      if(activeMap().safeZones?.some(s=>Math.hypot(p.x-s.x,p.y-s.y)<s.radius))continue;
      if(world.mobs.some(m=>m.alive&&distance(m,p)<75)||world.mobs.filter(m=>m.alive&&distance(m,p)<220).length>=2)continue;
      const candidateSector=MareHunt.sectorAt(game.area,p,anchors);if(!forceBoss&&candidateSector.id!==MareHunt.sectorAt(game.area,world.hero,anchors).id)continue;
      if(navigator().walkable(p.x,p.y)&&navigator().path(world.hero,p).length){point=p;sector=candidateSector;break;}
    }
    if(!point)return;
     const type=forceBoss?'boss':pick(sector.roles),profile=MareHunt.profile(game.area,sector.id,type,Math.random()),skin=activeMap().id==='dawn'?MareEmber.skins.cesar:activeMap().id==='embers'?MareEmber.skins[type]:null;
    world.mobs.push({id:world.nextID++,area:game.area,source:'world',type,name:forceBoss?region.boss:skin?.name||monsterTypes[type]?.name,skin:skin?.id,district:sector.id,...point,anchorX:point.x,anchorY:point.y,...profile,hp:profile.maxHP,attackClock:rand(.8,2),attackCount:0,bob:rand(0,6.28),alive:true,hit:0,slow:0,telegraph:null,emberFacing:'south',emberElapsed:0,attackAnim:0,moving:0,patrolClock:0});
    if(forceBoss){session.bossNotice=3.3;$('bossBanner').classList.remove('hidden');log(region.boss+' aguarda no setor final.','danger');}
  }
  function spawnVisual(x,y,text,color='#f9e9bc',size=15){world.fx.push({x,y,text,color,life:1.25,max:1.25,dy:-28,size});if(world.fx.length>70)world.fx.splice(0,10);}
  function addProjectile(x,y,tx,ty,color='#f4dfa1'){world.projectiles.push({x,y,tx,ty,progress:0,color});}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function livingMobs(){return world.mobs.filter(m=>m.alive&&m.hp>0);}
  function classCombatAsset(){return classCombat.asset(game);}
  function classCombatController(){
    return classCombat.controller(game,world.hero,{inHunt:scene==='hunt',transformed:!!(game?.zoanTransformed&&equippedZoan())});
  }
  function faceCombatTarget(m){
    const dx=m.x-world.hero.x,dy=m.y-world.hero.y;
    world.hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
    if(dx)world.hero.facing=dx<0?-1:1;
  }
  function chooseTarget(){let monsters=livingMobs().filter(m=>(rejectedTargets.get(m.id)||0)<=world.time);if(!monsters.length)return null;return monsters.reduce((best,cur)=>!best||distance(world.hero,cur)<distance(world.hero,best)?cur:best,null);}
  function outputDamage(m,amount,crit=false){if(!m||!m.alive||amount<=0)return 0;MareHaki.touch(game,session.haki);const damage=Math.min(m.hp,Math.max(1,Math.floor(amount)));m.hp=Math.max(0,m.hp-damage);m.hit=.25;game.stats.damage+=damage;spawnVisual(m.x+rand(-8,8),m.y-40,String(damage),crit?'#ffcd73':'#fff5e4',crit?22:15);if(m.hp<=0)killMob(m);return damage;}
  function heroAttack(m,mult=1,skill=null,area=false,commit=false){
    let s=getDerived();
    if(scene!=='hunt'||!m||!m.alive||world.hero.talentControl?.remaining>0||session.respawn>0||distance(world.hero,m)>s.range+(area?125:1)||!navigator().clear(world.hero,m))return false;
    const controller=classCombatController();
    if(controller&&!commit){
      if(controller.locked())return false;
      faceCombatTarget(m);world.hero.walking=0;
      const action=skill?'skill':classCombat.basicAction(game,world.hero);
      const accepted=controller.play(action,{direction:world.hero.direction,onImpact:()=>heroAttack(m,mult,skill,area,true)});
      if(accepted&&!skill)world.hero.combatSequence++;
      return accepted;
    }
    MareHaki.touch(game,session.haki);s=getDerived();if(session.haki.active==='observation')session.haki.eyeFX=.25;
    if(session.talents.targetId!==m.id){session.talents.targetId=m.id;session.talents.combo=0;}
    const zoan=!!(game.zoanTransformed&&equippedZoan()),elemental=!zoan&&MareCharacters.roles[game.classId].magic;
    const type=skill?.damageType||(elemental?'elemental':'physical');
    if(type==='physical'&&Math.random()>s.accuracy){spawnVisual(m.x,m.y-40,'ERROU','#cec4a6',11);return true;}
    const rt=session.talents,ultimate=MareUltimates.selected(game),passiveArea=area||(!skill&&ultimate==='titan'),prepared=MareTalentCombat.beforeHit(game,rt,{target:m,hero:world.hero,stats:s,basic:!skill,magic:type==='elemental',area:passiveArea,critical:Math.random()<s.crit});
    const crit=prepared.critical,raw=prepared.trueAmount??MareCharacters.damage(prepared.critMultiplier?{...s,critMultiplier:prepared.critMultiplier}:s,prepared.armor,{type,multiplier:mult*prepared.multiplier,variance:rand(.90,1.12),critical:crit});
    world.hero.attackAnim=zoan ? .75 : .22;
    if(skill?.element==='lightning')m.slow=4.5;
    const color=skill?.element==='fire'?'#ff995b':skill?.element==='lightning'?'#dac2ff':elemental?'#70d9f1':classes[game.classId].color;
    if(!zoan&&['gunner','cyborg','strategist','healer'].includes(game.classId))addProjectile(world.hero.x+world.hero.facing*13,world.hero.y-27,m.x,m.y-24,color);
    else world.fx.push({x:m.x,y:m.y-9,slash:true,life:.22,max:.22,dy:0,color});
    if(elemental)world.fx.push({x:m.x,y:m.y-10,ring:1,life:.35,max:.35,color});
    if(['spatial','orbital'].includes(ultimate))addProjectile(world.hero.x,world.hero.y-24,m.x,m.y-24,'#8adcf5');
    const actual=outputDamage(m,raw,crit);
    const passive=MareTalentCombat.afterHit(game,rt,{target:m,stats:s,basic:!skill,magic:type==='elemental',projectile:['gunner','cyborg','strategist','healer'].includes(game.classId),critical:crit,damage:actual});
    applyTalentContact(passive,m);
    applyUltimateActions(MareUltimates.after(game,rt.ultimate,{target:m,hero:world.hero,stats:s,damage:actual,basic:!skill,magic:type==='elemental',critical:crit,projectile:['gunner','cyborg','strategist','healer'].includes(game.classId)||ultimate==='spatial',enemies:livingMobs(),clear:(a,b)=>navigator().clear(a,b)}));

    if(passive.notice&&m.alive)spawnVisual(m.x,m.y-65,passive.notice,'#a7d5a4',10);
    if(passive.pierce)for(const other of MareTalentCombat.piercingTargets(world.hero,m,livingMobs(),s.range+125)){if(!navigator().clear(m,other))continue;addProjectile(m.x,m.y-24,other.x,other.y-24,color);outputDamage(other,actual*.5);}
    if(skill)spawnVisual(world.hero.x,world.hero.y-59,skill.element==='fire'?'FOGO':skill.element==='lightning'?'RAIO':'HABILIDADE!',color,11);
    return true;
  }
  function applyTalentContact(passive,target){
    if(passive.heal>0)restoreHero(passive.heal);
    if(passive.gold){game.gold+=passive.gold;game.stats.goldEarned+=passive.gold;session.gold+=passive.gold;spawnVisual(target.x,target.y-60,'+'+passive.gold+' dobrões','#edcf83',11);}
  }
  function applyUltimateActions(actions){
    for(const action of actions){
      if(action.delay>0){session.talents.ultimate.delayed.push(action);continue;}
      if(action.selfBurn){takeDamage(action.selfBurn,null,false,true);continue;}
      if(action.visualOnly){world.fx.push({x:action.target.x,y:action.target.y,ring:1,life:.55,max:.55,color:{meteor:'#f79a53',lightning:'#d9c7fa',ice:'#a1ecff'}[action.kind]||'#a1ecff'});continue;}
      if(!action.target?.alive||session.respawn>0||game.hp<=0)continue;
      if(action.from)addProjectile(action.from.x,action.from.y-24,action.target.x,action.target.y-24,'#e1c983');
      const amount=['artillery','empathy'].includes(action.kind)?MareCharacters.damage({...getDerived(),elemental:action.amount},enemyArmor(action.target,true),{type:'elemental'}):action.amount;
      const actual=outputDamage(action.target,amount);
      world.fx.push({x:action.target.x,y:action.target.y-12,ring:1,life:.3,max:.3,color:action.kind==='clone'||action.kind==='asura'?'#b4a3e7':'#eac47f'});
      if(action.kind==='clone')applyTalentContact(MareTalentCombat.afterHit(game,session.talents,{target:action.target,...action.contact,damage:actual,contactScale:.5,fromClone:true}),action.target);
    }
  }
  function restoreHero(amount,{quiet=false,ignoreEfficiency=false}={}){
    if(game.hp<=0||session.respawn>0)return 0;
    const recipient={id:'hero',x:world.hero.x,y:world.hero.y,hp:game.hp,maxHP:getDerived().maxHP};
    const healed=MareCharacters.healRecipients([recipient],amount*(ignoreEfficiency?1:1+(getDerived().healingReceivedPercent||0)))[0].amount;game.hp=recipient.hp;
    if(healed>0&&!quiet)spawnVisual(world.hero.x,world.hero.y-59,'+'+Math.round(healed),'#88e0b3',17);
    if(scene==='hunt'&&(session.talents.combatRemaining>0||world.target?.alive))applyUltimateActions(MareUltimates.heal(game,session.talents.ultimate,{amount,effective:healed,stats:getDerived(),hero:world.hero,enemies:livingMobs(),clear:(a,b)=>navigator().clear(a,b)}));
    return healed;
  }
  function useSkill(i,manual=false){
    if(scene!=='hunt'||!game||!session||world.hero.talentControl?.remaining>0||session.respawn>0)return false;
    const controller=classCombatController();if(controller?.locked())return false;
    const skill=classes[game.classId].skills[i];if(!skill)return false;
    const m=world.target?.alive?world.target:chooseTarget(),d=getDerived();
    const self=['guard','heal','blessing'].includes(skill.type);
    const energyCost=MareUltimates.selected(game)==='archmage'?0:skill.cost*(1-d.energyEfficiency);
    if(session.cooldowns[i]>0||game.energy<energyCost){if(manual)toast('Habilidade indisponível: cooldown ou energia.');return false;}
    if((skill.type==='heal'&&game.hp>=d.maxHP&&!(MareUltimates.selected(game)==='eternalBlessing'&&(session.talents.combatRemaining>0||world.target?.alive)))||(skill.type==='blessing'&&session.blessing>0)){if(manual)toast('Você já está com vida cheia ou proteção ativa.');return false;}
    if(!self&&(!m||distance(world.hero,m)>d.range||!navigator().clear(world.hero,m))){if(manual)toast('Não há alvo ao alcance.');return false;}
    const impact=()=>{
      if(scene!=='hunt'||game.hp<=0||session.respawn>0)return;
      if(skill.type==='strike')heroAttack(m,skill.multiplier,skill,false,true);
      if(skill.type==='guard'){session.guard=7;restoreHero(Math.round(d.maxHP*(game.classId==='cyborg'?.12:.18)+d.healing*.25));}
      if(skill.type==='heal'){const healed=restoreHero(d.healing);session.healingDone=(session.healingDone||0)+healed;const self={id:'hero',x:world.hero.x,y:world.hero.y,hp:game.hp,maxHP:d.maxHP};MareTalentCombat.chainHeal(game,[self],self,healed);}
      if(skill.type==='blessing'){session.guard=8;session.blessing=8;world.fx.push({x:world.hero.x,y:world.hero.y,ring:1,life:.7,max:.7,color:'#8ce0b5'});}
      if(skill.type==='taunt'){
        session.guard=Math.max(session.guard,4);
        for(const other of livingMobs().filter(other=>distance(world.hero,other)<=d.range+125&&navigator().clear(world.hero,other))){
          other.taunt={targetId:'hero',remaining:5};heroAttack(other,skill.multiplier,skill,true,true);
        }
        world.fx.push({x:world.hero.x,y:world.hero.y,ring:1,life:.5,max:.5,color:'#e7bb81'});
      }
      if(skill.type==='area'){
        for(const other of livingMobs().filter(other=>distance(m,other)<125))heroAttack(other,skill.multiplier||1.55,skill,true,true);
        world.fx.push({x:m.x,y:m.y,ring:1,life:.42,max:.42,color:skill.element==='lightning'?'#dac2ff':classes[game.classId].color});
      }
    };
    if(controller){
      const action=classCombat.action(game,'skill-'+(i+1));
      if(!self)faceCombatTarget(m);
      if(!controller.play(action,{direction:world.hero.direction,onImpact:impact}))return false;
      world.hero.walking=0;
    }
    game.energy-=energyCost;session.skillEnergySpent+=energyCost;session.cooldowns[i]=skill.cd*(game.factionId==='government'?.92:1);
    session.skillUses=session.skillUses||[0,0];session.skillUses[i]++;
    if(!controller)impact();
    return true;
  }
  function useAutoSupport(stats){
    if(!autoPlay||!autoSkills)return;
    const threshold=clamp(Number(game.preferences?.healThreshold)||.70,.25,.90);
    for(const [i,skill] of classes[game.classId].skills.entries()){
      if(skill.type==='heal'&&(game.hp<stats.maxHP*threshold||(MareUltimates.selected(game)==='eternalBlessing'&&(session.talents.combatRemaining>0||world.target?.alive))))useSkill(i);
      if(skill.type==='blessing'&&game.hp<stats.maxHP*.85&&session.guard<=0)useSkill(i);
      if(skill.type==='guard'&&game.hp<stats.maxHP*(game.classId==='cyborg'?.85:.75)&&session.guard<=0)useSkill(i);
    }
  }
  function gainXP(amount){let g=game;g.xp+=amount;g.stats.xpEarned+=amount;session.xp+=amount;let loops=0;while(g.xp>=xpNeeded(g.level)&&loops++<20){g.xp-=xpNeeded(g.level);g.level++;g.attributePoints=MareCharacters.earned(g.level)-MareCharacters.spent(g.attributes);let st=getDerived();g.hp=st.maxHP;g.energy=st.maxEnergy;spawnVisual(world.hero.x,world.hero.y-69,'NÍVEL '+g.level,'#e8c680',25);toast('Nível '+g.level+' alcançado! +5 pontos de atributo e +1 PT. Confira suas Conquistas.','good');if(currentPanel==='character'||currentPanel==='map')renderPanel();void syncHierarchy();log('Você alcançou o nível '+g.level+'.','good');if(g.level===11)toast('Nova região desbloqueada: Cidade das Conchas!','good');renderPortrait();}}
  function killMob(m){if(!m.alive)return;m.alive=false;world.corpses.push({id:m.id,x:m.x,y:m.y,instance:game.area,expires:world.time+12});if(akumaBackend)akumaCorpseQueue=akumaCorpseQueue.then(()=>akumaRequest('corpse',{corpse_id:String(m.id),instance:game.area,x:m.x,y:m.y})).catch(error=>console.warn('Cadáver não sincronizado:',error));const mana=MareTalentCombat.onKill(game,session.talents,getDerived());if(mana>0){game.energy=Math.min(getDerived().maxEnergy,game.energy+mana);spawnVisual(world.hero.x,world.hero.y-56,'+'+Math.round(mana)+' ENERGIA','#8ccfef',11);}world.target=world.target===m?null:world.target;const area=m.area||game.area,reward=MareHunt.rewards(area,m,game.level,Math.random()),record=MareHunt.recordKill(game,area,m.type);game=record.state;let gold=Math.round(reward.gold*(factions[game.factionId]?.gold||1)),xp=reward.xp;game.gold+=gold;game.stats.goldEarned+=gold;session.gold+=gold;game.stats.kills++;game.stats[m.type]=(game.stats[m.type]||0)+1;gainXP(xp);rewardNotice({gold,xp});spawnVisual(m.x,m.y-70,'+'+gold+' ✦','#e7cb87',13);world.fx.push({x:m.x,y:m.y,ring:1,life:.7,max:.7,color:'#ffdb9b'});
    const lootMultiplier=MareUltimates.selected(game)==='underworld'?2:1;
    if(Math.random()<Math.min(1,reward.materialChance*lootMultiplier)){game.materials+=reward.materials;addLoot('+'+reward.materials+' Ferro Salgado','✦');}
    if(Math.random()<Math.min(1,reward.gearChance*lootMultiplier)){
      if(game.inventory.length<BAG_CAPACITY){const rarity=MareHunt.rarity(area,m.type==='boss'||MareMonsterCatalog[m.type]?.boss===true,Math.random(),getDerived().rareChance),def=pick(eligibleGearForDrop(rarity,true));const item=newItem(def,reward.gearLevel,false,rarity);item.origin=zones[area].name;game.inventory.unshift(item);addLoot(def.name,def.symbol);rewardNotice({name:def.name,rarity:itemRarity(item)});}
      else if(m.type==='boss'||MareMonsterCatalog[m.type]?.boss===true)toast('Mochila cheia: o equipamento do chefe não pôde ser recolhido.','danger');
    }
    if(Math.random()<Math.min(1,reward.potionChance*lootMultiplier)){game.potions+=reward.potions;addLoot('Poção de vida','♥');}
    if(lootMultiplier===2&&m.type!=='boss'&&game.inventory.length<BAG_CAPACITY){
      const special=MareUltimates.loot(game);
      if(special.box&&MarePrison.canDrop('pearl-box','underworld')){const box=newItem(itemDefs.find(d=>d.kind==='pearl-box'&&d.boxLevel===1));box.origin='Senhor do Submundo';game.inventory.unshift(box);addLoot('Caixa de Pérolas Nível 1','▣');}
      if(special.legendary&&game.inventory.length<BAG_CAPACITY){const def=pick(eligibleGearForDrop('legendary'));const it=newItem(def,reward.gearLevel,false,'legendary');it.origin='Senhor do Submundo';game.inventory.unshift(it);addLoot(def.name,'✦');}
    }
    if(MareHaki.drop(m)){if(game.inventory.length<BAG_CAPACITY){const it=newItem(MareHaki.book);it.origin=zones[game.area].name;game.inventory.unshift(it);addLoot(MareHaki.book.name,'▤');rewardNotice({name:MareHaki.book.name,rarity:'epic'});saveGame();}else toast('Um Livro da Vontade caiu, mas a mochila está cheia.','danger');}
    if(m.type==='boss'){toast(''+monsterName(m)+' derrotado! +'+gold+' dobrões','good');log('Você derrotou '+monsterName(m)+'!','gold');game.hasSeenBoss=true;world.bossCooldown=90;if(record.first)toast('Primeira vitória! Abra Rota & recompensas para resgatar sua arma.','good');saveGame();}
    else if(game.stats.kills===1){toast('Primeiro inimigo derrotado!','good');log('Primeira vitória! Continue sua caçada.','good');}
    if(game.stats.kills%6===0)saveGame();if(currentPanel==='hunt')renderPanel();
  }
  function addLoot(name,symbol){session.recentLoot.unshift({name,symbol});session.recentLoot=session.recentLoot.slice(0,4);}
  function lootIcon(name){const index=itemDefs.findIndex(item=>item.name===name);return index>=0?itemIcon(index,name):/ferro/i.test(name)?itemIcon('material',name):/poção/i.test(name)?itemIcon('potion',name):'';}
  function usePotion(manual=false){let d=getDerived();if(!game||!session||session.respawn>0)return false;if(game.potions<=0){if(manual)toast('Você não possui poções.','danger');return false;}if(game.hp>=d.maxHP){if(manual)toast('Sua vida já está cheia.');return false;}game.potions--;let heal=Math.round(d.maxHP*.44);restoreHero(heal);return true;}
  function buyPotion(){if(!game)return;if(game.gold<35){toast('Dobrões insuficientes.','danger');return;}game.gold-=35;game.potions++;toast('Poção adicionada à bolsa.','good');saveGame();updateUI();}
  function takeDamage(amount,source=null,physical=true,direct=false){
    if(session.respawn>0||game.hp<=0)return;
    if(!direct)MareHaki.touch(game,session.haki);
    if(DEV_ACTIVE&&game.devOptions?.godMode)return;
    if(session.fruitInvulnerable>0)return;
    const d=getDerived();if(!direct&&Math.random()<d.evasion){session.haki.eyeFX=.35;spawnVisual(world.hero.x,world.hero.y-46,'ESQUIVA','#b8a8ef',13);return;}
    const raw=direct?amount:MareCharacters.incoming(d,amount*(source?.hakiDebuff>0?.85:1)*(physical?1-(d.impactResistancePercent||0):1),session.guard>0,rand(.85,1.1)),reaction=direct?{damage:amount}:MareTalentCombat.receive(game,session.talents,{stats:d,amount:raw,physical,source,melee:!!source&&physical&&monsterTypes[source.type].reach<=60});
    if(reaction.untargetable||reaction.invulnerable)return;
    game.energy=Math.max(0,game.energy-(reaction.energyUsed||0));
    if(reaction.parry){spawnVisual(world.hero.x,world.hero.y-60,'APAROU','#e5d6a2',13);if(source?.alive&&distance(world.hero,source)<=d.range&&navigator().clear(world.hero,source))outputDamage(source,MareCharacters.damage(d,enemyArmor(source)*(1-d.penetration)));return;}
    const dmg=reaction.damage;game.hp=reaction.shieldTriggered||reaction.trigger==='immortal'?1:Math.max(0,game.hp-dmg);session.lastHit=.25;
    if(reaction.shieldTriggered){game.talentCooldowns.energyShieldUntil=Date.now()+MareUltimates.internalCooldown(game,90000);saveGame();spawnVisual(world.hero.x,world.hero.y-62,'ESCUDO DE ENERGIA','#8bd6f0',12);}
    if(reaction.reflect&&source?.alive)outputDamage(source,reaction.reflect);
    if(reaction.trigger){
      const u=reaction.trigger,now=Date.now();
      if(u==='immortal')game.talentCooldowns.immortalUntil=now+600000;
      if(u==='guardianAngel'){game.talentCooldowns.guardianUntil=now+600000;game.hp=d.maxHP;game.energy=d.maxEnergy;for(const m of onScreenMobs())m.talentControl={type:'stun',remaining:2};}
      if(u==='emp'){game.talentCooldowns.empUntil=now+45000;for(const m of onScreenMobs())m.empRemaining=10;}
      saveGame();spawnVisual(world.hero.x,world.hero.y-100,{immortal:'IMORTAL',guardianAngel:'ANJO GUARDIÃO',emp:'PULSO EMP'}[u],'#f4dd9f',16);
    }
    if(!direct&&dmg>0)spawnVisual(world.hero.x+10,world.hero.y-36,'-'+Math.round(dmg),'#ff9b94',14);
    if(reaction.explode&&game.hp>0)for(const m of livingMobs().filter(m=>distance(world.hero,m)<=120&&navigator().clear(world.hero,m)))outputDamage(m,MareCharacters.damage({...d,elemental:d.attack},enemyArmor(m,true)*(1-d.magicPen),{type:'elemental',multiplier:.6}));
    const controller=classCombatController();
    if(controller&&(!direct||game.hp<=0)){world.hero.walking=0;controller.play(game.hp<=0?'death':'hurt',{direction:world.hero.direction});}
    if(game.hp<=0){session.respawn=4.1;session.heroKOs++;MareHaki.stop(session.haki);session.talents=MareTalentCombat.create();toast('Você caiu em combate. Retornando em 4 segundos.','danger');log('Derrotado em batalha. Você renascerá em breve.','danger');world.target=null;}
  }
  function enemyArmor(m,magic=false){return m.empRemaining>0?0:(magic?(m.magicDefense??m.defense):m.defense)*(m.hakiDebuff>0?.85:1)*(m.zoanDefense?.remaining>0?.95:1);}
  function onScreenMobs(){return livingMobs().filter(m=>m.x>=camera.x&&m.x<=camera.x+W&&m.y>=camera.y&&m.y<=camera.y+H);}
  function tick(dt){if(!game||!session)return;world.time+=dt;session.elapsed+=dt;game.totalPlay+=dt;session.cooldowns=session.cooldowns.map(v=>Math.max(0,v-dt));session.fruitCooldown=Math.max(0,session.fruitCooldown-dt);session.fruitInvulnerable=Math.max(0,session.fruitInvulnerable-dt);session.fruitBurst=Math.max(0,session.fruitBurst-dt);if(session.fruitBurst<=0&&world.hero.visible===false){world.hero.visible=true;session.beriSpheres=null;}world.corpses=world.corpses.filter(c=>c.expires>world.time);world.food=world.food.filter(f=>f.expires>world.time);session.guard=Math.max(0,session.guard-dt);session.blessing=Math.max(0,session.blessing-dt);session.lastHit=Math.max(0,session.lastHit-dt);session.bossNotice=Math.max(0,session.bossNotice-dt);if(session.bossNotice<=0)$('bossBanner').classList.add('hidden');world.hero.attackAnim=Math.max(0,world.hero.attackAnim-dt);world.hero.walking=Math.max(0,world.hero.walking-dt);
    if(session.zoanDash){const dash=session.zoanDash,step=Math.min(dash.remaining,800*dt),beforeX=world.hero.x,beforeY=world.hero.y;navigator().move(world.hero,dash.dx*step,dash.dy*step);const moved=Math.hypot(world.hero.x-beforeX,world.hero.y-beforeY);dash.remaining-=step;world.hero.walking=.2;for(const mob of livingMobs())if(!dash.hit&&(dash.hitId==null||String(dash.hitId)===String(mob.id))&&Math.hypot(mob.x-world.hero.x,mob.y-world.hero.y)<45){dash.hit=true;outputDamage(mob,MareCharacters.damage(getDerived(),enemyArmor(mob),{type:'physical',multiplier:.55}));navigator().move(mob,dash.dx*45,dash.dy*45);world.fx.push({x:mob.x,y:mob.y,ring:1,life:.3,max:.3,color:'#e7a65a'});}if(dash.remaining<=0||moved<.1)session.zoanDash=null;}
    MareHaki.tick(game,session.haki,dt,{alive:game.hp>0&&session.respawn<=0,inHunt:scene==='hunt'});
    if(DEV_ACTIVE){if(game.devOptions?.infiniteWill&&game.has_haki_unlocked)game.haki.current=100;if(game.devOptions?.noCooldown){session.cooldowns=[0,0];game.talentCooldowns={};game.haki.kingReadyAt=0;}}
    for(const m of world.mobs)m.hakiDebuff=Math.max(0,(m.hakiDebuff||0)-dt);
    const combat=classCombatController();
    combat?.step(dt,{moving:world.hero.walking>0,inCombat:scene==='hunt',direction:world.hero.direction});
    world.fx=world.fx.filter(f=>(f.life-=dt)>0);for(let f of world.fx)if(Number.isFinite(f.dy))f.y+=f.dy*dt;world.projectiles=world.projectiles.filter(p=>(p.progress+=dt*3.7)<1);
    if(world.hero.talentControl)world.hero.talentControl.remaining=Math.max(0,world.hero.talentControl.remaining-dt);
    for(const action of MareTalentCombat.tick(session.talents,dt,scene==='hunt'?livingMobs():[])){if(scene==='hunt'&&session.respawn<=0&&action.target.alive)outputDamage(action.target,action.amount);}
    if(session.respawn<=0)applyUltimateActions(MareUltimates.tick(game,session.talents.ultimate,dt,{hero:world.hero,stats:getDerived(),inCombat:scene==='hunt'&&(session.talents.combatRemaining>0||!!world.target?.alive),inHunt:scene==='hunt',enemies:scene==='hunt'?livingMobs():[],clear:(a,b)=>navigator().clear(a,b),move:(m,dx,dy)=>navigator().move(m,dx,dy)}));
    if(MareUltimates.selected(game)==='armamentSkin'&&session.talents.ultimate.vigor>0&&world.hero.talentControl)world.hero.talentControl.remaining=0;
    const stats=getDerived();game.energy=Math.min(stats.maxEnergy,game.energy+dt*stats.energyRegen);
    if(scene==='lobby'){
      game.hp=Math.min(stats.maxHP,game.hp+dt*(stats.healthRegen+1.9));
      moveManually(dt);
      return;
    }
    if(session.respawn>0){session.respawn-=dt;if(session.respawn<=0){session.respawn=0;combat?.reset('front');world.hero.direction='front';game.hp=stats.maxHP;game.energy=stats.maxEnergy;Object.assign(world.hero,activeMap().spawn);travelPath=[];lobbyDestination=null;pursuit=new WeakMap();camera.update(world.hero,activeMap(),0,true);toast('Você retornou ao cais da ilha.','good');}return;}
    for(const food of [...world.food])if(!food.pending&&world.time>=(food.readyAt||0)&&Math.hypot(food.x-world.hero.x,food.y-world.hero.y)<25){food.pending=true;const collect=async()=>{try{if(akumaBackend)await akumaRequest('pickup',{food_id:String(food.id),instance:game.area,x:world.hero.x,y:world.hero.y});restoreHero(stats.maxHP*.15,{ignoreEfficiency:true});world.food=world.food.filter(f=>f!==food);spawnVisual(food.x,food.y-45,'COMIDA','#ffd700',12);}catch(error){food.pending=false;}};void collect();}
    restoreHero(dt*(stats.healthRegen+(session.blessing>0?stats.regenBuff:0)),{quiet:true});useAutoSupport(stats);if(autoPlay&&game.hp<stats.maxHP*.40&&game.potions>0)usePotion(false);
    moveManually(dt);
    if(scene!=='hunt')return; // The quay interaction may have returned to the lobby this tick.
    for(let mob of world.mobs){
      if(!mob.alive)continue;
      mob.emberElapsed=(mob.emberElapsed||0)+dt;mob.hit=Math.max(0,mob.hit-dt);mob.attackAnim=Math.max(0,(mob.attackAnim||0)-dt);
      const beforeX=mob.x,beforeY=mob.y;
      if(mob.telegraph){const resolved=MareHunt.stepWarning(mob,dt,world.hero,{blocked:mob.empRemaining>0||mob.talentControl?.remaining>0||session.talents.ultimate.hidden,clear:navigator().clear(mob,world.hero)});if(resolved){if(resolved.hit&&!(resolved.warning?.groundTrap&&game.zoanTransformed&&equippedZoan()?.id==='akuma_tori_albatroz'&&Date.now()<(game.zoanAltitudeUntil||0)))takeDamage(mob.attack*resolved.multiplier,mob,mob.type!=='spirit');else spawnVisual(world.hero.x,world.hero.y-55,'FORA DE ALCANCE','#b8e1ca',10);mob.attackClock=mob.attackSec||monsterTypes[mob.type].attackSec;}continue;}
      if(mob.talentControl?.remaining>0||session.talents.ultimate.hidden){mob.telegraph=null;continue;}
      mob.slow=Math.max(0,(mob.slow||0)-dt);if(mob.zoanSlow)mob.zoanSlow.remaining=Math.max(0,mob.zoanSlow.remaining-dt);if(mob.zoanDefense)mob.zoanDefense.remaining=Math.max(0,mob.zoanDefense.remaining-dt);mob.attackClock-=dt;mob.bob+=dt*2;
      if(mob.taunt)mob.taunt.remaining=Math.max(0,mob.taunt.remaining-dt);
      const reach=mob.reach||monsterTypes[mob.type].reach,md=distance(mob,world.hero);
      if(mob.attackClock<=0){if(md<=reach+10&&navigator().clear(mob,world.hero)&&!session.talents.ultimate.hidden&&!(mob.empRemaining>0)){mob.emberFacing=Math.abs(world.hero.x-mob.x)>Math.abs(world.hero.y-mob.y)?(world.hero.x<mob.x?'west':'east'):(world.hero.y<mob.y?'north':'south');mob.attackAnim=(['cocox','sham','buchi','pearl','gin','kuroobi','chew','cesar','mr3','cabaji','marinheiro'].includes(mob.type)||mob.type==='boss'&&mob.area==='beach')?.58:0;const warning=MareHunt.beginWarning(mob,world.hero);mob.attackCount=(mob.attackCount||0)+1;if(warning){mob.telegraph=warning;spawnVisual(mob.x,mob.y-95,warning.name,'#ffcb82',12);}else takeDamage(mob.attack,mob,mob.type!=='spirit');mob.attackClock=mob.attackSec||monsterTypes[mob.type].attackSec;}else mob.attackClock=.3;}
      if(mob.telegraph)continue;
      const fromAnchor=Math.hypot(world.hero.x-mob.anchorX,world.hero.y-mob.anchorY),aggro=mob.aggro||300;
      if(fromAnchor>500&&md>reach){navigateEntity(mob,{x:mob.anchorX,y:mob.anchorY},mob.speed*.65,dt,20);continue;}
      if(md>reach*.75&&(md<aggro||mob.taunt?.remaining>0))navigateEntity(mob,world.hero,mob.speed*Math.min(mob.slow>0?.55:1,mob.talentSlow?.remaining>0?1-mob.talentSlow.percent:1,mob.zoanSlow?.remaining>0?1-mob.zoanSlow.percent:1)*.65,dt,reach*.75);
      else if(['cocox','sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro'].includes(mob.type)&&md>=aggro){
        mob.patrolClock-=dt;
        if(mob.patrolClock<=0){const a=mob.bob+world.time*.7,r=65+40*Math.sin(mob.bob);mob.patrolTarget=navigator().nearest({x:mob.anchorX+Math.cos(a)*r,y:mob.anchorY+Math.sin(a)*r});mob.patrolClock=2.4;}
        if(mob.patrolTarget)navigateEntity(mob,mob.patrolTarget,mob.speed*.33,dt,9);
      }else if(md>=aggro)navigator().move(mob,Math.sin(world.time*.65+mob.bob)*dt*2,0);
      mob.moving=Math.hypot(mob.x-beforeX,mob.y-beforeY)>0.2?.2:Math.max(0,(mob.moving||0)-dt);
      const dx=mob.x-beforeX,dy=mob.y-beforeY;if(Math.hypot(dx,dy)>.01)mob.emberFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south');
    }

    // Descartar inimigos derrotados: eles não podem bloquear novos spawns.
    if(world.mobs.some(m=>!m.alive||m.hp<=0))world.mobs=world.mobs.filter(m=>m.alive&&m.hp>0);
    const activeSector=MareHunt.sectorAt(game.area,world.hero,huntAnchors()).id;world.mobs=world.mobs.filter(m=>m.type==='boss'||MareMonsterCatalog[m.type]?.boss===true||m.district===activeSector||distance(m,world.hero)<380||world.target===m);
    world.spawnClock-=dt;world.bossCooldown=Math.max(0,world.bossCooldown-dt);
    if(world.spawnClock<=0){world.spawnClock=2.4;if(livingMobs().filter(m=>m.type!=='boss').length<6)spawnMob();if(!livingMobs().some(m=>m.type==='boss')&&MareHunt.bossReady(game,game.area,world.hero,Date.now(),huntAnchors()))spawnMob(true);}
    if(!autoPlay||world.hero.talentControl?.remaining>0){session.attackClock=0;return;}
    // A transição entre cenas não pode deixar um alvo morto ou timer antigo congelar o Auto-Hunt.
    if(!Number.isFinite(session.attackClock)||session.attackClock>3)session.attackClock=0;
    const danger=livingMobs().find(m=>m.telegraph&&MareHunt.danger(m.telegraph,world.hero));
    if(danger){const candidates=[];for(const radius of [90,170,240])for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:world.hero.x+Math.cos(a)*radius,y:world.hero.y+Math.sin(a)*radius};if(!livingMobs().some(m=>m.telegraph&&MareHunt.danger(m.telegraph,p,22))&&navigator().walkable(p.x,p.y)&&navigator().clear(world.hero,p))candidates.push(p);}if(candidates.length){navigateEntity(world.hero,candidates[0],stats.huntSpeed,dt,2);session.attackClock=0;return;}}
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
        if(classCombatController()&&autoSkills&&!classCombatController().locked()){
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

  function showHakiRequirements(){showConfirmation('Haki bloqueado','Requisitos: alcançar o nível 50 e consumir um Livro da Vontade. O livro tem 5% de chance em chefes de mundo aberto ou diários de nível 30 ou superior. Nível atual: '+game.level+'.',()=>{},'ENTENDI',false);}
  function updateHakiHUD(){
    const show=game.has_haki_unlocked,row=$('miniWillpower'),widget=$('hakiQuickCast');row.classList.toggle('hidden',!show);widget.classList.toggle('hidden',!show);document.body.classList.toggle('has-haki',show);
    if(!show)return;$('willpowerFill').style.width=game.haki.current+'%';$('willpowerText').textContent=Math.floor(game.haki.current)+' / 100';row.setAttribute('aria-valuenow',Math.floor(game.haki.current));
    const unavailable=scene!=='hunt'||session.respawn>0||game.hp<=0,cd=MareHaki.cooldown(game);
    for(const b of widget.querySelectorAll('button')){
      const id=b.dataset.hakiToggle||'conqueror',king=id==='conqueror',active=king?session.haki.kingFX>0:session.haki.active===id,empty=king?game.haki.current<50:game.haki.current<=0;
      b.disabled=unavailable||empty||(king&&cd>0);b.classList.toggle('is-active',active);b.classList.toggle('is-empty',empty);b.classList.toggle('is-cooling',king&&cd>0);
      if(!king)b.setAttribute('aria-pressed',String(active));
      const status=unavailable?'Disponível em expedição':king&&cd>0?'Recarga: '+Math.ceil(cd)+'s':empty?'Vontade insuficiente':active?'Ativo':'Pronto';
       b.setAttribute('aria-label',MareHaki.catalog.find(c=>c.id===id).name+' · '+(king?'K · 50 Vontade':'armament'===id?'H · 5 Vontade/s':'J · 5 Vontade/s')+' · '+status);b.removeAttribute('title');
      b.querySelector('.haki-quick-state').textContent=king&&cd>0?Math.ceil(cd)+'s':!king&&active?'ON':'';
    }
    $('hakiKing').style.setProperty('--haki-cooldown',(cd/MareHaki.rules.kingCooldown*360)+'deg');
    $('hakiQuickStatus').textContent=unavailable?'Ative em uma expedição':game.haki.current<=0?'Vontade esgotada':session.haki.active?session.haki.active==='armament'?'Armamento ativo':'Observação ativa':'Haki pronto';
  }
  function toggleHaki(id){
    if(!game||!session)return;if(!game.has_haki_unlocked){showHakiRequirements();return;}
    const previous={haki:{...game.haki},runtime:{...session.haki}},result=MareHaki.toggle(game,session.haki,id,{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0});
    if(!result.ok)toast(result.message,'danger');else try{localStorage.setItem(STORAGE_KEY,JSON.stringify(game));}catch{game.haki=previous.haki;session.haki=previous.runtime;toast('Não foi possível salvar. Ativação cancelada.','danger');}updateUI();
  }
  function castHakiKing(){
    if(!game||!session)return;if(!game.has_haki_unlocked){showHakiRequirements();return;}
    const snapshot={haki:{...game.haki},runtime:{...session.haki},mobs:livingMobs().map(m=>[m,m.hakiDebuff,m.talentControl?{...m.talentControl}:null])};
    const result=MareHaki.cast(game,session.haki,world.hero,livingMobs(),{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0,clear:(a,b)=>navigator().clear(a,b)});
    if(!result.ok){toast(result.message,'danger');return;}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(game));}catch{game.haki=snapshot.haki;session.haki=snapshot.runtime;for(const [m,d,c] of snapshot.mobs){m.hakiDebuff=d;m.talentControl=c;}toast('Não foi possível salvar. Haki do Rei cancelado; Vontade preservada.','danger');return;}
    spawnVisual(world.hero.x,world.hero.y-65,'HAKI DO REI','#dc9aea',18);updateUI();
  }
  function hakiBookDetail(item){return `<div class="op-detail-wrap"><h3>Livro da Vontade</h3>${MareHakiUI.icon('book')}<p>Consumível de despertar. Requer nível 50 e desbloqueia Armamento, Observação e Rei permanentemente.</p><p>Origem: chefes de mundo aberto/diários Nv.30+ · Chance 5% por chefe.</p><button type="button" class="op-action primary" data-use-haki-book="${escapeHTML(item.id)}" ${item.locked||game.level<50||game.has_haki_unlocked?'disabled':''}>Despertar o Haki</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'Desbloquear':'Bloquear'}</button></div>`;}
  function consumeHakiBook(id){
    const result=MareHaki.unlock(game,id,itemDefs);if(!result.ok){toast(result.message,'danger');return;}
    let next=result.state;for(const id of MareHaki.ids)next=MareAchievements.record(next,'hakiUnlocked',id);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{toast('Não foi possível salvar. Seu livro foi preservado.','danger');return;}
    game=next;selectedItem=null;characterTab='haki';currentPanel='character';renderPanel();updateUI();toast('Sua Vontade despertou. Os três Hakis estão disponíveis.','good');
  }
  document.addEventListener('change',e=>{
    const id=e.target.dataset?.hakiAuto;if(!id||!game)return;
    const next=MareHaki.configure(game,id,e.target.checked);if(!next)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));game=next;session.haki.active=null;}catch{toast('Não foi possível salvar a preferência.','danger');}
    renderPanel();updateUI();
  });

  function updateTalentResource(){
    const el=$('talentResourceHUD');if(!el||!session)return;const u=MareUltimates.selected(game),rt=session.talents.ultimate,d=getDerived();let label='',value=0,max=1;
    if(u==='armamentSkin'){label='Vigor';value=rt.vigor??Math.round(d.maxHP*.25);max=Math.round(d.maxHP*.25);}
    else if(u==='archmage'){label='Escudo de Mana';value=game.energy;max=d.maxEnergy;}
    else if(rt.immortal>0){label='Invulnerável';value=rt.immortal;max=5;}
    else if(session.talents.shield>0){label='Escudo de Energia';value=session.talents.shield;max=Math.round(d.maxHP*.3);}
    el.classList.toggle('hidden',!label);$('miniTalentResource').classList.toggle('hidden',!label);if(label){$('miniTalentLabel').textContent={Vigor:'Vigor','Escudo de Mana':'Mana','Invulnerável':'Imune','Escudo de Energia':'Escudo'}[label];$('miniTalentResource').title=label;$('miniTalentText').textContent=fmt(value)+' / '+fmt(max);$('miniTalentFill').style.width=(Math.max(0,Math.min(1,value/max))*100)+'%';$('talentResourceLabel').textContent=label;$('talentResourceValue').textContent=fmt(value)+' / '+fmt(max);bar('talentResourceFill',value,max);}
  }
  function updateUI(){if(!game||!session)return;
    const telemetry=MareHudTelemetry.stats({scene,elapsed:session.elapsed,xp:session.xp,levelXP:game.xp,neededXP:xpNeeded(game.level)});
    const tracker=$('huntXpTracker');
    if(tracker){
      tracker.hidden=!telemetry.active;
      if(telemetry.active){
        $('huntXpTime').textContent=telemetry.duration;
        $('huntXpRate').textContent=telemetry.rate===null?'Calculando…':fmt(telemetry.rate)+' XP/h';
        $('huntXpEarned').textContent=fmt(telemetry.earned)+' XP';
        $('huntXpProgress').style.width=(telemetry.progress*100).toFixed(1)+'%';
        $('huntXpLevel').textContent='Próximo nível: '+fmt(game.xp)+' / '+fmt(xpNeeded(game.level))+' XP';
        tracker.setAttribute('aria-label','XP por hora '+(telemetry.rate===null?'calculando':fmt(telemetry.rate))+'; tempo de caçada '+telemetry.duration+'; XP obtido '+fmt(telemetry.earned));
      }
    }
    updateHuntHUD();updateHakiHUD();if(characterTab==='haki'&&currentPanel==='character')MareHakiUI.refresh($('dialogBody'),game,session.haki,{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0});game=observeAchievements();if(characterTab==='achievements'&&currentPanel==='character')MareTalentUI.refreshAchievements($('dialogBody'),game);updateTalentResource();if(currentPanel==='forge'&&forgeUI.tab==='fusion'&&forgeFusionStamp!==fusionInventoryStamp())renderPanel();let derived=getDerived(),c=classes[game.classId];$('heroLevel').textContent=game.level;$('heroClass').textContent=c.name.toUpperCase();configureFactionVisual();$('heroName').textContent=game.name;$('heroPower').textContent=fmt(derived.power);$('hpText').textContent=fmt(game.hp)+' / '+fmt(derived.maxHP);$('energyText').textContent=fmt(game.energy)+' / '+fmt(derived.maxEnergy);$('xpText').textContent=fmt(game.xp)+' / '+fmt(xpNeeded(game.level));bar('hpFill',game.hp,derived.maxHP);bar('energyFill',game.energy,derived.maxEnergy);bar('xpFill',game.xp,xpNeeded(game.level));$('goldAmount').textContent=fmt(game.gold);$('statAttack').textContent=fmt(derived.attack);$('statDefense').textContent=fmt(derived.defense);$('statCrit').textContent=Math.round(derived.crit*100)+'%';$('statSpeed').textContent=derived.speed.toFixed(2)+'/s';$('sessionTimer').textContent=elapsedString(session.elapsed);$('killsCount').textContent=fmt(game.stats.kills);$('bossCount').textContent=fmt(game.stats.boss);$('goldEarned').textContent=fmt(session.gold);$('damageTotal').textContent=fmt(game.stats.damage);$('expeditionState').textContent=scene==='lobby'?'NO PORTO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇANDO':'EM PAUSA';$('potionCount').textContent=game.potions;$('autoLabel').textContent=autoPlay?'ATIVADA':'PAUSADA';$('autoToggle').classList.toggle('active',autoPlay);$('autoToggle').disabled=scene==='lobby';$('autoToggle').classList.toggle('hidden',scene==='lobby');$('combatState').innerHTML='<i class="pulse-dot '+(autoPlay?'':'paused')+'"></i>'+(scene==='lobby'?'PORTO SEGURO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇADA AUTOMÁTICA':'CAÇADA PAUSADA');$('targetHint').textContent=scene==='lobby'?'NPCS · MISSÕES · FORJA · EXPEDIÇÕES':world.target?.alive?'ALVO: '+monsterName(world.target).toUpperCase():'PROCURANDO ALVO...';
    const hasTarget=scene==='hunt'&&world.target?.alive;
    $('targetHud').classList.toggle('hidden',scene!=='hunt'||!hasTarget);
    if(scene==='hunt'){
      if(['orange','loguetown','rare','syrup','baratie'].includes(activeMap().id))$('overlayArea').textContent=MareHunt.sectorAt(game.area,world.hero,huntAnchors()).name.toUpperCase();
      if(activeMap().id==='dawn')$('overlayArea').textContent=MareDawn.nearestDistrict(world.hero).name.toUpperCase();
      if(activeMap().id==='embers')$('overlayArea').textContent=MareEmber.nearestDistrict(world.hero).name.toUpperCase();
      const ratio=hasTarget?clamp(world.target.hp/world.target.maxHP,0,1):0;
      $('targetHudState').textContent=session.respawn>0?'RENASCENDO':autoPlay?'ALVO EM COMBATE':'CAÇADA PAUSADA';
      $('targetHudLevel').textContent=hasTarget?(world.target.type==='boss'?'CHEFE · NV '+world.target.level:'NV '+world.target.level):'—';
      $('targetHudName').textContent=hasTarget?monsterName(world.target).toUpperCase():'SEM ALVO';
      $('targetHudFill').style.width=(ratio*100).toFixed(1)+'%';
      $('targetHudHPText').textContent=hasTarget?fmt(world.target.hp)+' / '+fmt(world.target.maxHP):'PROCURANDO MONSTRO';
      $('targetHudHint').textContent=hasTarget?'ALVO BLOQUEADO · AUTO-ATAQUE':'SELECIONE OU AGUARDE O AUTO-ALVO';
    }
    const versionCaption=document.querySelector('.version-caption'); if(versionCaption)versionCaption.textContent='VERSÃO 1.3 · DEMO LOCAL';
    $('skill1').setAttribute('aria-label',c.skills[0].name);$('skill2').setAttribute('aria-label',c.skills[1].name);$('skill1').removeAttribute('title');$('skill2').removeAttribute('title');
    const fruitSkill=MareAkuma.activeSkill(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id);
    [0,1].forEach((i)=>{const fruitSlot=fruitSkill?.key===String(i+1),fruitId=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,remaining=fruitSlot?Math.max(0,((game.fruitCooldowns?.[fruitId]||0)-Date.now())/1000):session.cooldowns[i],el=$('cooldown'+(i+1)),button=$('skill'+(i+1)),icon=$('skill'+(i+1)+'Icon');
      const iconSrc=fruitSlot?MareAkuma.byId(fruitId)?.skill_icon_path||'':'';
      if(icon.dataset.fruitIcon!==iconSrc){icon.dataset.fruitIcon=iconSrc;icon.innerHTML=iconSrc?`<img src="${iconSrc}" alt="" draggable="false">`:'';}
      if(!iconSrc)icon.textContent=i===0?c.symbol:['guard','heal','blessing'].includes(c.skills[1].type)?'✚':c.skills[1].type==='area'?'✺':'✦';
      const cooling=remaining>.1;el.classList.toggle('cooling',cooling);el.textContent=cooling?remaining.toFixed(1)+'s':'';button.classList.toggle('is-cooling',cooling);button.style.setProperty('--cooldown-angle',`${Math.min(360,remaining/(fruitSlot?fruitSkill.cooldown:c.skills[i].cd||1)*360)}deg`);
      if(fruitSlot)button.setAttribute('aria-label',fruitSkill.name+' — '+fruitSkill.cooldown+'s');});
    const zoan=equippedZoan(),third=fruitSkill?.key==='3',thirdButton=$('skill3'),transformButton=$('zoanTransform');
    thirdButton.classList.toggle('hidden',!third);transformButton.classList.toggle('hidden',!zoan);transformButton.classList.toggle('active',!!game.zoanTransformed);transformButton.setAttribute('aria-pressed',String(!!game.zoanTransformed));
    if(zoan){const icon=$('zoanTransformIcon'),src=zoan.icon_path;if(icon.dataset.src!==src){icon.dataset.src=src;icon.innerHTML=`<img src="${src}" alt="" draggable="false">`;}transformButton.setAttribute('aria-label',(game.zoanTransformed?'Retornar à forma humana':'Transformar em '+zoan.name)+' (T)');transformButton.removeAttribute('title');}
    if(third){const icon=$('skill3Icon'),src=zoan.skill_icon_path,remaining=Math.max(0,((game.fruitCooldowns?.[zoan.id]||0)-Date.now())/1000);if(icon.dataset.src!==src){icon.dataset.src=src;icon.innerHTML=`<img src="${src}" alt="" draggable="false">`;}thirdButton.setAttribute('aria-label',fruitSkill.name+' — '+fruitSkill.cooldown+'s');thirdButton.removeAttribute('title');thirdButton.classList.toggle('is-cooling',remaining>.1);thirdButton.style.setProperty('--cooldown-angle',`${Math.min(360,remaining/fruitSkill.cooldown*360)}deg`);$('cooldown3').textContent=remaining>.1?remaining.toFixed(1)+'s':'';}
    syncExpeditionMini();
    $('xpPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.xp/session.elapsed*3600):'—';$('goldPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.gold/session.elapsed*3600):'—';$('questList').innerHTML=questDefs.map(q=>{let count=clamp(questProgress(q),0,q.target),done=game.claimed.includes(q.id),ready=count>=q.target&&!done;return `<div class="quest"><div class="quest-title"><span>${escapeHTML(q.title)}</span><b>${done?'CONCLUÍDO':count+' / '+q.target}</b></div><div class="quest-desc">${escapeHTML(q.desc)}</div><div class="progress-track"><i style="width:${count/q.target*100}%"></i></div>${ready?`<button data-claim="${q.id}">RESGATAR ${q.gold} ✦ + ${q.xp} XP</button>`:''}</div>`;}).join('');
    $('lootList').innerHTML=session.recentLoot.length?session.recentLoot.map(x=>`<div class="loot-entry"><span>${lootIcon(x.name)}${escapeHTML(x.name)}</span><b>OBTIDO</b></div>`).join(''):'<div class="empty-note">Sua próxima descoberta aparecerá aqui.</div>';
    updateMiniHud();const time=(6+Math.floor(world.time/90))%24; $('worldClock').textContent='DIA '+String(1+Math.floor(world.time/(90*24))).padStart(2,'0')+' · '+String(time).padStart(2,'0')+':00';
  }
  function renderPortrait(){if(!game)return;portrait.clearRect(0,0,72,72);portrait.fillStyle='#1b2632';portrait.fillRect(0,0,72,72);for(let i=0;i<18;i++){portrait.fillStyle=i%2?'#29394c':'#202f3f';portrait.fillRect((i*31)%72,(i*23)%72,4,4);}if(world.hero.visible!==false)vfx_aura.draw(portrait,36,70,world.time,64/48);if(world.hero.visible===false)drawBeriSeparation(portrait,36,70,1-session.fruitBurst/1.5,64/48);else if(game.zoanTransformed&&equippedZoan())MareZoanArt.draw(portrait,equippedZoan().id,36,70,{time:world.time,scale:equippedZoan().id==='akuma_tori_albatroz'?90/64:64/48});else drawConfiguredHuman(portrait,36,70,classCombat.entry(game)?'combat-idle':'idle','south',world.time,64);const mini=$('miniPortrait');if(mini){const mc=mini.getContext('2d');mc.imageSmoothingEnabled=false;mc.clearRect(0,0,64,64);mc.drawImage($('portrait'),0,0,64,64);}}
  function worldChange(area){if(!zones[area])return;if(game.level<zones[area].min){toast('Você precisa alcançar o nível '+zones[area].min+'.','danger');return;}game.area=area;const island=MareArchipelago.byArea(area);if(island)game=MareAchievements.record(game,'islandVisited',island.id);game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;enterHunt();toast('Você navegou até '+zones[area].name+'.','good');log('Nova região: '+zones[area].name,'good');saveGame();}
  function claimQuest(id){let q=questDefs.find(q=>q.id===id);if(!q||game.claimed.includes(id)||questProgress(q)<q.target)return;game.claimed.push(id);game.gold+=q.gold;gainXP(q.xp);session.gold+=q.gold;game.stats.goldEarned+=q.gold;toast('Contrato concluído! +'+q.gold+' dobrões','good');log('Recompensa do contrato: '+q.title,'gold');saveGame();updateUI();if(currentPanel==='contracts')renderPanel();}
  function getInventoryItem(id){return game.inventory.find(i=>i.id===id)||Object.values(game.equipment).find(i=>i?.id===id)||null;}
  function hasEquipped(item){return Object.values(game.equipment).some(i=>i?.id===item?.id);}
  async function equipItem(id){let i=game.inventory.find(i=>i.id===id);const fruit=MareAkuma.isFruit(i,itemDefs);if(!fruit&&!MareForge.isGear(i,itemDefs))return;let def=itemBase(i),slot=fruit?'akuma_no_mi':def.slot;if(fruit&&!MareAkuma.itemData(i,itemDefs))return;if(fruit&&akumaBackend){try{await akumaRequest('equip',{fruit_id:i.fruitId});}catch(error){toast(error.message,'danger');return;}}if(slot==='weapon'&&def.type!==game.classId){toast('Essa arma não pertence ao seu estilo de combate.','danger');return;}let d=getDerived(),hpFraction=game.hp/d.maxHP;let previous=game.equipment[slot];game.inventory=game.inventory.filter(it=>it.id!==id);game.equipment[slot]=i;if(slot==='akuma_no_mi'){game.zoanTransformed=false;session.zoanDash=null;}if(previous)game.inventory.push(previous);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=i.id;forgeUI.itemId=i.id;forgeOutcome=null;syncFruitVfx();recordEquipmentChange(d,slot,def.name+' equipado');toast(def.name+' equipado.','good');saveGame();renderPanel();updateUI();}
  async function unequip(slot){let item=game.equipment[slot];if(!item||game.inventory.length>=BAG_CAPACITY)return;if(slot==='akuma_no_mi'&&akumaBackend){try{await akumaRequest('equip',{fruit_id:null});}catch(error){toast(error.message,'danger');return;}}let d=getDerived(),hpFraction=game.hp/d.maxHP;game.equipment[slot]=null;if(slot==='akuma_no_mi'){game.zoanTransformed=false;session.zoanDash=null;}game.inventory.unshift(item);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=item.id;if(slot==='akuma_no_mi')syncFruitVfx();recordEquipmentChange(d,slot,itemBase(item).name+' retirado');saveGame();renderPanel();updateUI();}
  function sellItem(id){let i=game.inventory.find(i=>i.id===id);if(!i||itemBase(i).kind==='pearl-box')return;if(i.locked){toast('Destrave o item antes de vender.','danger');return;}let price=Math.round(14+i.level*7+i.plus*18);game.inventory=game.inventory.filter(it=>it.id!==id);game.gold+=price;game.stats.goldEarned+=price;selectedItem=null;toast('Item vendido por '+price+' dobrões.','good');saveGame();renderPanel();updateUI();}
  function forgeCost(item){return MareForge.upgradeCost(item);}
  function forgeItem(slot){runForgeOperation({type:'upgrade',itemId:forgeTarget()?.id,expectedSeq:game.forgeSeq});}
  function forgeTarget(){return [getInventoryItem(forgeUI.itemId),game.equipment[forgeSlot],...Object.values(game.equipment),...game.inventory].find(i=>MareForge.isGear(i,itemDefs))||null;}
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
      if(!MareForge.isGear(item,itemDefs)||item.locked||item.sockets.some(Boolean)||['legendary','supreme'].includes(item.rarity)||slots.includes(item.id)||(first&&first.rarity!==item.rarity))return null;
    }
    return {key,index:slot,id:item.id};
  }
  function addFusionMaterial(token,index=-1){const selection=fusionAddition(token,index);if(!selection)return false;forgeUI[selection.key][selection.index]=selection.id;forgeOutcome=null;renderPanel();return true;}
  function renderForge(body){
    let item=forgeTarget();if(item&&!MareForge.isGear(item,itemDefs))item=null;
    if(item){if(forgeUI.itemId!==item.id)forgeOutcome=null;forgeUI.itemId=item.id;forgeSlot=itemBase(item).slot;if(!Number.isInteger(forgeUI.socket)||forgeUI.socket<0||forgeUI.socket>=item.sockets.length)forgeUI.socket=Math.max(0,item.sockets.indexOf(null));}
    if(!game.inventory.some(i=>i.id===forgeUI.pearlItemId&&!i.locked))forgeUI.pearlItemId=game.inventory.find(i=>MareForge.isPearl(i,itemDefs)&&!i.locked)?.id||'';
    for(const key of ['fusionIds','pearlFusionIds']){
      const seen=new Set();forgeUI[key]=Array.from({length:5},(_,n)=>{const id=forgeUI[key][n],i=game.inventory.find(i=>i.id===id);if(!i||i.locked||seen.has(id)||(key==='fusionIds'?(!MareForge.isGear(i,itemDefs)||i.sockets.some(Boolean)):!MareForge.isPearl(i,itemDefs)))return null;seen.add(id);return id;});
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
  function pearlBoxDetail(item){
    const def=itemBase(item);
    return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${def.rarity}">${itemIcon(item.def,def.name)}</div><div><h3>${escapeHTML(def.name)}</h3><small>Consumível · Quantidade: 1</small></div></div><div class="op-detail-box"><p>Contém uma Pérola Nível ${def.boxLevel}. O atributo é sorteado entre Força, Destreza, Vitalidade, Inteligência e Espírito, com 20% de chance para cada tipo.</p><p>Abrir consome esta caixa e entrega exatamente uma pérola do mesmo nível.</p></div><p class="op-sell-line">Origem: ${escapeHTML(item.origin||'Impel Down')}.</p><button type="button" class="op-action primary" data-open-pearl-box="${escapeHTML(item.id)}" ${item.locked?'disabled':''}>ABRIR CAIXA</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button>${item.locked?'<p>Desbloqueie a caixa antes de abrir.</p>':''}</div>`;
  }
  function openPearlBox(id){
    const result=MarePrison.openBox(game,id,itemDefs);
    if(!result.ok){toast(result.message,'danger');return;}
    const nextState=MareForge.migrate(result.state,itemDefs);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(nextState));}
    catch{toast('Não foi possível salvar. Sua caixa foi preservada.','danger');return;}
    game=nextState;selectedItem=result.item.id;inventoryFeedback=null;
    renderPanel();updateUI();toast('Você recebeu '+result.name+'.','good');
  }
  function pearlInventoryDetail(item){
    const p=MareForge.pearlOf(item,itemDefs);return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${p.rarity}">${itemIcon(p.id,p.name)}</div><div><h3>${escapeHTML(p.name)}</h3><small>${rarityNames[p.rarity]} · Pérola · Quantidade: 1</small></div></div><div class="op-detail-box"><p>Concede +${p.level*2}% de ${MareForge.names[p.attribute]} quando instalada em um equipamento em uso. Os percentuais são somados antes de multiplicar o atributo total.</p><p>Multiplicador individual: ×${p.multiplier.toFixed(2)}.</p></div><button type="button" class="op-action primary" data-open-imbue="${escapeHTML(item.id)}">ABRIR IMBUIMENTO</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button><p class="op-sell-line">Origem: ${escapeHTML(item.origin||'Estoque anterior ou fusão na forja')}.</p><div class="op-bottom-actions"><button disabled>Anunciar no Mercado</button><button disabled>Depositar no Cofre</button></div></div>`;
  }

  // INVENTÁRIO V0.6 — layout RPG em três colunas, filtros e ações reais.
  function itemCategory(item){const def=itemBase(item),slot=def.slot;if(MareAkuma.isFruit(item,itemDefs))return 'fruits';if(['pearl-box','haki-book'].includes(def.kind))return 'consumables';return slot==='pearl'?'pearls':slot==='weapon'?'weapons':'armor';}
  function itemPower(item){if(!MareForge.isGear(item,itemDefs)&&!MareAkuma.isFruit(item,itemDefs))return 0;const slot=MareAkuma.isFruit(item,itemDefs)?'akuma_no_mi':itemBase(item).slot,before={...game,equipment:{...game.equipment,[slot]:null}},after={...game,equipment:{...game.equipment,[slot]:item}};return getDerived(after).power-getDerived(before).power;}
  function tooltipItem(item){
    if(!item)return null;
    const def=itemBase(item),fruit=MareAkuma.isFruit(item,itemDefs),gear=MareForge.isGear(item,itemDefs);
    if(!fruit&&!gear&&(!def||def===itemDefs[0]))return null;
    const fruitData=fruit?MareAkuma.itemData(item,itemDefs):null;
    const stats=fruit?MareAkuma.bonusStats(item,itemDefs):gear?itemStats(item):{};
    const slot=fruit?'akuma_no_mi':def.slot;
    const className=slot==='weapon'?classes[def.type]?.name||def.type:null;
    const pearl=def.kind==='pearl'?MareForge.pearlOf(item,itemDefs):null;
    const description=def.description||(pearl?`Concede +${Math.round(pearl.percent*100)}% de ${MareForge.names[pearl.attribute]} ao ser instalada.`:def.kind==='pearl-box'?'Contém uma pérola para usar na forja.':def.kind==='haki-book'?'Livro necessário para despertar a Vontade.':'');
    return {name:def.name,typeName:slotNames[slot]?.toLocaleLowerCase('pt-BR')||'item',rarity:itemRarity(item),rarityName:rarityNames[itemRarity(item)],level:item.level||1,rank:fruitData?.rank,className,allowed:!className||def.type===game.classId,stats,power:fruit||gear?itemPower(item):null,description,origin:item.origin||'',slot};
  }
  const fruitTooltipFallback={
    akuma_kuku_kuku:'Transforma o cadáver mais próximo em comida. Quem a recolher recupera 15% da Vida máxima.',
    akuma_beri_beri:'Divide o corpo em seis esferas: 1,5s de invulnerabilidade e empurrão nos inimigos próximos.',
    akuma_tori_albatroz:'Aumenta a velocidade de movimento em 30% por 5s e ignora armadilhas de chão.',
    akuma_uma_uma:'Avança 4 tiles em linha reta, causando dano físico leve e empurrando o primeiro inimigo.',
    akuma_inu_dachshund:'Salta até o alvo, causa dano físico e aplica 30% de lentidão e −5% de Defesa por 3s.'
  };
  let backendFruitCatalog=null;
  function tooltipSkill(button){
    const fruit=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs),active=MareAkuma.activeSkill(fruit?.id),key=button.id==='skill3'?'3':button.id==='skill2'?'2':'1';
    if(button.id==='zoanTransform')return {key:'T',name:game.zoanTransformed?'Retornar à forma humana':'Transformação Zoan',cooldown:0,cost:0,description:`Alterna entre a forma humana e ${fruit?.name||'a forma animal'}.`};
    if(active?.key===key){const backend=backendFruitCatalog?.[fruit.id]?.skill;return {key,name:backend?.name||active.name,cooldown:backend?.cooldown??active.cooldown,cost:backend?.cost||0,resource:backend?.resource||'Energia',description:backend?.description||fruitTooltipFallback[fruit.id],damageType:backend?.damage_type||(['akuma_uma_uma','akuma_inu_dachshund'].includes(fruit.id)?'physical':'')};}
    if(key==='3')return null;
    const skill=classes[game.classId].skills[Number(key)-1];
    return {key,name:skill.name,cooldown:skill.cd,cost:skill.cost,resource:'Energia',description:skill.desc,damageType:game.classId==='strategist'?'magic':skill.type==='strike'||skill.type==='area'?'physical':''};
  }
  MareTooltips.attach(element=>{
    if(!game)return null;
    if(element.matches('#skill1,#skill2,#skill3,#zoanTransform')){if(element.classList.contains('hidden'))return null;const skill=tooltipSkill(element);return skill?{kind:'skill',skill}:null;}
    if(element.matches('[data-haki-toggle],[data-haki-cast]')){const id=element.dataset.hakiToggle||'conqueror',haki=MareHaki.catalog.find(entry=>entry.id===id);return haki?{kind:'skill',skill:{key:id==='armament'?'H':id==='observation'?'J':'K',name:haki.name,cooldown:id==='conqueror'?MareHaki.rules.kingCooldown:0,costText:haki.cost,description:haki.description,damageType:id==='conqueror'?'magic':''}}:null;}
    if(element.dataset.talentSelect){const tree=MareTalents.getTree(game.classId),id=element.dataset.talentSelect,node=MareTalents.nodes(game.classId).find(entry=>entry.id===id),special=[...(tree?.keystones||[]),...(tree?.ultimates||[])].find(entry=>entry.id===id);if(!node&&!special)return null;return {kind:'skill',skill:{passive:true,name:node?.name||special.name,description:node?MareTalents.describeNode(node):special.description}};}
    if(currentPanel!=='inventory')return null;
    if(element.dataset.item==='virtual-potion')return {kind:'item',item:{name:'Poção de Vida',rarity:'uncommon',rarityName:'Incomum',level:1,stats:{},description:'Recupera 44% da Vida máxima.'}};
    if(element.dataset.item==='virtual-material')return {kind:'item',item:{name:'Ferro Salgado',rarity:'common',rarityName:'Comum',level:1,stats:{},description:'Material usado na forja.'}};
    const item=element.dataset.item?game.inventory.find(entry=>entry.id===element.dataset.item):element.dataset.invSlot?game.equipment[element.dataset.invSlot]:null;
    const data=tooltipItem(item);if(!data)return null;
    const equipped=element.dataset.item?game.equipment[data.slot]:null;
    return {kind:'item',item:data,equipped:equipped&&equipped.id!==item.id?tooltipItem(equipped):null};
  });
  function statDeltaHtml(before,after){
    return [['power','Poder'],['attack','Ataque'],['defense','Defesa'],['maxHP','Vida']].map(([key,label])=>{const delta=after[key]-before[key];return `<span class="delta-stat ${delta>0?'positive':delta<0?'negative':'neutral'}"><small>${label}</small><b>${delta>0?'+':delta<0?'−':''}${fmt(Math.abs(delta))}</b></span>`;}).join('');
  }
  function recordEquipmentChange(before,slots,message){inventoryFeedback={before,after:getDerived(),slots:Array.isArray(slots)?slots:[slots],message,until:performance.now()+2500};}
  function activeEquipmentFeedback(){return inventoryFeedback&&inventoryFeedback.until>performance.now()?inventoryFeedback:null;}
  function isWeaponCompatible(item){return MareForge.isGear(item,itemDefs)&&(itemBase(item).slot!=='weapon'||itemBase(item).type===game.classId);}
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
    const def=itemDefs[key];
    if(def?.icon_path)return `<img class="item-icon ${def.slot==='weapon'&&def.type==='sword'?'sword-weapon-art':''}" src="${escapeHTML(def.icon_path)}" alt="${escapeHTML(name||def.name)}" draggable="false">`;
    if(def?.type==='akuma_no_mi')return '<span aria-hidden="true">✦</span>';
    const pearl=MareForge.pearlById[key]||MareForge.pearlById[def?.pearlId];
    const artKey=def?.kind==='haki-book'?'book':def?.kind==='pearl-box'?'pearl-box-'+def.boxLevel:pearl?pearl.id:key;
    const src=`assets/ui/items-pixellab/${artKey}.png?v=20261020`;
    return `<img class="item-icon" src="${src}" alt="${escapeHTML(name||pearl?.name||def?.name||'')}" draggable="false">`;
  }
  function drawCurrentPreview(canvas,height){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    const armed=classCombatAsset();
    if(world.hero.visible!==false)vfx_aura.draw(c,canvas.width/2,canvas.height-10,world.time,height/48);
    if(world.hero.visible===false)drawBeriSeparation(c,canvas.width/2,canvas.height-10,1-session.fruitBurst/1.5,height/48);
    else if(game.zoanTransformed&&equippedZoan())MareZoanArt.draw(c,equippedZoan().id,canvas.width/2,canvas.height-10,{time:world.time,scale:equippedZoan().id==='akuma_tori_albatroz'?height*1.25/64:height/48});
    else if(drawPaperDoll(c,canvas.width/2,canvas.height-10,'idle','south',world.time,height/46)){}
    else drawConfiguredHuman(c,canvas.width/2,canvas.height-10,armed?'combat-idle':'idle','south',world.time,height);
  }
  function invSymbol(entry){return itemIcon(entry.kind==='gear'?entry.item.def:entry.kind,entry.name);}
  function invSlotHtml(slot){
    const item=game.equipment[slot],selected=item&&selectedItem===item.id, rarity=item?itemRarity(item):'';
    return `<button type="button" class="op-equip-slot ${activeEquipmentFeedback()?.slots.includes(slot)?'recent-equip':''} ${item?'filled rarity-'+rarity:''} ${selected?'selected':''}" data-inv-slot="${slot}" aria-label="${slotNames[slot]}${item?' · '+escapeHTML(itemBase(item).name):' · Vazio'}"><span class="op-slot-label">${slot==='weapon'?'ARMA':slotNames[slot]}</span><span class="op-slot-frame"><span class="op-slot-icon">${item?itemIcon(item.def,itemBase(item).name):'<span class="empty-slot-mark">·</span>'}</span>${item?.locked?'<span class="op-item-lock" role="img" aria-label="Item bloqueado"></span>':''}${item?`<span class="op-slot-refine">+${item.plus||0}</span>${slot==='akuma_no_mi'?`<span class="op-slot-power">Rank ${escapeHTML(MareAkuma.itemData(item,itemDefs)?.rank||'?')}</span>`:`<span class="op-slot-power">${fmt(itemPower(item))}</span>`}`:''}</span></button>`;
  }
  function invSelected(){
    if(selectedItem==='virtual-potion'&&game.potions>0)return {kind:'potion',id:'virtual-potion'};
    if(selectedItem==='virtual-material'&&game.materials>0)return {kind:'material',id:'virtual-material'};
    const item=getInventoryItem(selectedItem);
    return item?{kind:'gear',item,id:item.id}:null;
  }
  function renderInventory(body){
    const columns=innerWidth>1180?7:innerWidth>760?6:5;
    const BAG_PER_PAGE=columns*7;
    if(inventoryUI.pageSize&&inventoryUI.pageSize!==BAG_PER_PAGE)inventoryUI.page=Math.floor(inventoryUI.page*inventoryUI.pageSize/BAG_PER_PAGE);
    inventoryUI.pageSize=BAG_PER_PAGE;
    if(!invSelected())selectedItem=game.equipment.weapon?.id||game.inventory[0]?.id||(game.potions>0?'virtual-potion':game.materials>0?'virtual-material':null);
    const overlay=$('panelOverlay');overlay.classList.add('inventory-mode');
    const headMeta=$('inventoryHeadMeta');if(headMeta)headMeta.classList.add('hidden');
    const stats=getDerived();const f=factions[game.factionId]||factions.pirate;
    const filterCategories=[['all','TUDO'],['weapons','ARMAS'],['armor','ARMADURAS'],['fruits','AKUMA NO MI'],['consumables','CONSUMÍVEIS'],['materials','MATERIAIS'],['pearls','PÉROLAS']];
    const all=inventoryEntries();const pages=Math.max(1,Math.ceil(all.length/BAG_PER_PAGE));inventoryUI.page=Math.min(inventoryUI.page,pages-1);
    const shown=all.slice(inventoryUI.page*BAG_PER_PAGE,(inventoryUI.page+1)*BAG_PER_PAGE);
    const slots=shown.map(entry=>{
      const selected=selectedItem===entry.id; const item=entry.item; const icon=invSymbol(entry);
      return `<button class="op-item rarity-${entry.rarity} ${selected?'selected':''}" type="button" aria-pressed="${selected}" aria-label="${escapeHTML(entry.name)}" data-item="${entry.id}" ${item&&MareAkuma.isFruit(item,itemDefs)?'draggable="true" data-fruit-drag="'+escapeHTML(item.id)+'"':''}><span class="op-item-icon">${icon}</span>${item&&item.plus?`<span class="op-item-refine">+${item.plus}</span>`:''}${item&&item.locked?'<span class="op-item-lock" role="img" aria-label="Item bloqueado"></span>':''}${entry.qty>1?`<span class="op-item-qty">x${entry.qty}</span>`:''}</button>`;
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
    if(itemBase(sel.item).kind==='haki-book')return hakiBookDetail(sel.item);
    if(MareAkuma.isFruit(sel.item,itemDefs)){
      const fruit=MareAkuma.itemData(sel.item,itemDefs),eq=hasEquipped(sel.item),stats=MareAkuma.bonusStats(sel.item,itemDefs);
      return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon">${itemIcon(sel.item.def,fruit?.name||'Akuma no Mi')}</div><div><h3>${escapeHTML(fruit?.name||'Akuma no Mi')}</h3><small>Rank ${escapeHTML(fruit?.rank||'?')} · Akuma no Mi</small></div></div><div class="op-detail-box"><p>Fruta equipável por qualquer classe e rank.</p><div class="op-effect-list">${Object.entries(stats).map(([key,value])=>{const labels={healing_received_percent:'Cura recebida',max_hp_percent:'Vida máxima',impact_resistance_percent:'Resistência a impacto',move_speed_percent:'Velocidade de movimento',evasion_percent:'Esquiva',physical_defense_percent:'Defesa física'};return `<div><span>${escapeHTML(labels[key]||key.replace('bonus_','').replaceAll('_',' '))}</span><b>+${key.endsWith('_percent')?Math.round(value*100)+'%':value}</b></div>`;}).join('')}</div></div>${eq?`<button type="button" class="op-action primary" data-unequip="akuma_no_mi">RETIRAR</button>`:`<button type="button" class="op-action primary" data-equip="${escapeHTML(sel.item.id)}">EQUIPAR</button>`}</div>`;
    }
    if(itemBase(sel.item).kind==='pearl-box')return pearlBoxDetail(sel.item);
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
    const next=getDerived(projected,session?.talents);
    const stats=[['maxHP','Vida máxima'],['maxEnergy','Energia máxima'],['physical','Dano físico'],['elemental','Dano elemental'],['defense','Defesa'],['speed','Ataques por segundo'],['accuracy','Precisão'],['crit','Crítico'],['evasion','Esquiva'],['energyRegen','Energia por segundo'],['healthRegen','Vida por segundo']];
    if(['healer','brawler','cyborg'].includes(game.classId))stats.push(['healing','Potência de cura'],['protection','Redução sob proteção']);
    if(game.classId==='healer')stats.push(['regenBuff','Regeneração da bênção']);
    const value=(key,n)=>['crit','evasion','accuracy','protection'].includes(key)?(n*100).toFixed(1)+'%':['speed','energyRegen','healthRegen','regenBuff'].includes(key)?n.toFixed(2):fmt(n);
    body.innerHTML=`<div class="character-layout ${performance.now()<attributeSuccessUntil?'attributes-confirmed':''}">
      <section class="character-identity"><h3>Seu aventureiro</h3><canvas id="characterSprite" width="180" height="190" aria-label="Sprite do personagem"></canvas>
        <h2>${escapeHTML(game.name)}</h2><p>${escapeHTML(factions[game.factionId].name)}</p><strong>${escapeHTML(c.name)}</strong><p>Nível ${game.level} · ${r.role}</p>
        <div class="character-power">Poder de combate <b id="characterPower">${fmt(d.power)}${next.power!==d.power?` <span>→ ${fmt(next.power)}</span>`:''}</b></div>
        <p class="attribute-guide">Principal: ${MareCharacters.attributes[r.primary].name}<br>Secundário: ${MareCharacters.attributes[r.secondary].name}</p>
        <div class="character-skills">${c.skills.map(skill=>`<p><b>${escapeHTML(skill.name)}</b><br>${escapeHTML(skill.desc)}<small>${MareUltimates.selected(game)==='archmage'?0:Math.round(skill.cost*(1-d.energyEfficiency)*100)/100} energia · ${skill.cd}s de recarga</small></p>`).join('')}</div>
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
        <p class="attribute-guide">${MareCharacters.roles[game.classId].magic?'Ataques básicos e habilidades ofensivas usam dano elemental.':'Ataques e habilidades ofensivas usam dano físico.'} Equipamentos, facção e talentos confirmados já estão incluídos.</p>
      </section></div>`;
    drawCurrentPreview($('characterSprite'),155);
  }
  function hierarchySelf(){return {player_id:game.hierarchyPlayerId,name:game.name,faction:game.factionId,class_id:game.classId,portrait:portrait.canvas.toDataURL('image/png'),level:game.level,power:getDerived().power,tier:game.hierarchyTier};}
  async function hierarchyPost(route,payload){
    const response=await fetch('/api/hierarchy/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('API indisponível');
    const result=await response.json();if(!response.ok)throw Error(result.error||'Falha na hierarquia');return result;
  }
  async function syncHierarchy(){
    if(!game)return;
    MareHierarchy.migrate(game);
    renderPortrait();
    try{
      const result=await hierarchyPost('sync',hierarchySelf());
      hierarchyBackend=true;game.hierarchyTier=result.player.tier;hierarchyBoard=result.leaderboard;saveGame();
    }catch(error){hierarchyBackend=false;hierarchyBoard=[hierarchySelf()];}
    if(currentPanel==='character'&&characterTab==='hierarchy')renderPanel();
  }
  function renderHierarchy(body){
    body.innerHTML=MareHierarchyUI.render({game,factionName:factions[game.factionId].name,accent:factions[game.factionId].color,board:hierarchyBackend?hierarchyBoard:[hierarchySelf()],backend:hierarchyBackend,message:hierarchyMessage,power:getDerived().power});
  }
  async function promoteHierarchy(){
    const state=MareHierarchy.next(game.hierarchyTier,game.level);
    if(state.state!=='ready'){hierarchyMessage=state.message||'Nível necessário para esta promoção.';renderPanel();return;}
    try{
      if(hierarchyBackend){const result=await hierarchyPost('promote',{player_id:game.hierarchyPlayerId});game.hierarchyTier=result.player.tier;hierarchyBoard=result.leaderboard;}
      else game.hierarchyTier=state.target;
      hierarchyMessage='Promoção concluída: '+MareHierarchy.title(game.factionId,game.hierarchyTier)+'!';saveGame();updateUI();renderPanel();toast(hierarchyMessage,'good');
    }catch(error){hierarchyMessage=error.message;renderPanel();toast(hierarchyMessage,'danger');}
  }
  function confirmHierarchy(){
    const state=MareHierarchy.next(game.hierarchyTier,game.level);if(state.state!=='ready')return;
    const faction=game.factionId,old=game.hierarchyTier;
    showConfirmation('Confirmar promoção','Patamar '+old+' → Patamar '+state.target,promoteHierarchy,'CONFIRMAR PROMOÇÃO',false);
    document.querySelector('.confirmation-overlay #confirmationMessage')?.insertAdjacentHTML('afterend',MareHierarchyUI.transition(faction,old,state.target));
  }
  function renderCharacterHub(body){
    if(characterTab!=='talents')MareTalentUI.unmount();
    $('characterTabs')?.remove();
    if(!['status','talents','achievements','haki','akuma','hierarchy'].includes(characterTab))characterTab='status';
    $('dialogTitle').textContent=({status:'Personagem',talents:'Talentos',achievements:'Conquistas',haki:'Haki',akuma:'Akuma no Mi',hierarchy:'Hierarquia dos Mares'})[characterTab];
    if(characterTab==='hierarchy'){renderHierarchy(body);return;}
    if(characterTab==='status'){renderCharacter(body);body.insertAdjacentHTML('afterbegin','<button type="button" class="dungeon-back" data-panel="inventory">Abrir inventário e equipamentos</button>');return;}
    if(characterTab==='talents'){
      talentDraft=talentDraft||JSON.parse(JSON.stringify(MareTalents.buildFor(game)));
      body.innerHTML=MareTalentUI.render({game,draft:talentDraft,selected:selectedTalent,message:talentMessage,escapeHTML,canReset:scene==='lobby'});MareTalentUI.mount(body);return;
    }
    if(characterTab==='haki'){if(!game.has_haki_unlocked){body.innerHTML='<p>Alcance o nível 50 e consuma um Livro da Vontade para despertar.</p>';return;}body.innerHTML=MareHakiUI.render(game,session.haki,{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0});return;}
    if(characterTab==='akuma'){
      const count=MareAkuma.passiveCount(game);
      const owned=new Set(MareAkuma.registered(game));const fruits=MareAkuma.catalog.filter(fruit=>fruit.rank===akumaRank);const slots=Array.from({length:Math.max(MareAkuma.slotsPerRank,fruits.length)},(_,index)=>({index:index+1,fruit:fruits[index]}));
      body.innerHTML=`<section class="akuma-compendium" aria-label="Compêndio Akuma no Mi"><header><div><small>COMPÊNDIO DE FRUTAS</small><h2>Akuma no Mi</h2><p>Explore os ranks e registre as frutas para revelar sua aparência.</p></div><strong class="akuma-unavailable">Ranks D–S · Em breve</strong></header><p class="akuma-passive">${count} registrada(s) · Bônus permanente: +${(count*.1).toFixed(1).replace('.',',')}% Vida Máxima e +${(count*.1).toFixed(1).replace('.',',')}% Força <small>+0,1% de cada atributo base por fruta registrada</small></p><nav class="akuma-rank-tabs" role="tablist" aria-label="Ranks de Akuma no Mi">${MareAkuma.ranks.map(rank=>`<button type="button" id="akuma-rank-tab-${rank}" role="tab" data-akuma-rank="${rank}" aria-selected="${rank===akumaRank}" aria-controls="akuma-rank-panel">Rank ${rank}</button>`).join('')}</nav><section id="akuma-rank-panel" class="akuma-rank-panel" role="tabpanel" aria-labelledby="akuma-rank-tab-${akumaRank}"><h3>Rank ${akumaRank}</h3><div class="akuma-slot-grid">${slots.map(slot=>`<article class="akuma-slot ${slot.fruit?(owned.has(slot.fruit.id)?'is-filled':'is-locked'):'is-empty'}" aria-label="${slot.fruit?escapeHTML(slot.fruit.name):`Espaço ${slot.index} vazio`}"><span class="akuma-slot-icon akuma-icon" aria-hidden="true">${slot.fruit?`<canvas class="akuma-icon-aura" data-akuma-aura="${slot.fruit.id}" width="48" height="48"></canvas>`:''}${slot.fruit?((MareAkuma.isZoan(slot.fruit)&&!owned.has(slot.fruit.id)?slot.fruit.zoan_sprite_sheet:slot.fruit.icon_path)?`<img src="${escapeHTML(MareAkuma.isZoan(slot.fruit)&&!owned.has(slot.fruit.id)?slot.fruit.zoan_sprite_sheet:slot.fruit.icon_path)}" alt="">`:'✦'):'?'}</span><strong>${slot.fruit?escapeHTML(slot.fruit.name):'Espaço vazio'}</strong><small>${slot.fruit?(owned.has(slot.fruit.id)?'Registrada':'Não registrada'):`Slot ${String(slot.index).padStart(2,'0')}`}</small>${slot.fruit&&!owned.has(slot.fruit.id)?`<button type="button" data-fruit-register="${slot.fruit.id}">REGISTRAR FRUTA</button>`:''}</article>`).join('')}</div><p class="akuma-slot-hint">Registre as frutas Rank E para equipá-las e ampliar o bônus permanente.</p></section></section>`;
      return;
    }
    if(characterTab==='achievements'){body.innerHTML=MareTalentUI.renderAchievements({game,escapeHTML,message:talentMessage,category:achievementCategory});return;}
    renderCharacter(body); // Acesso direto ao perfil, sem tela intermediária.
  }
  function storeTalentChange(next){
    next=observeAchievements(next);const derived=getDerived(next,session?.talents);next.hp=Math.min(next.hp,derived.maxHP);next.energy=Math.min(next.energy,derived.maxEnergy);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{talentMessage='Não foi possível salvar. Nenhum ponto foi consumido.';renderPanel();return false;}
    game=next;updateUI();return true;
  }
  function confirmTalents(){
    const result=MareTalents.commit(game,{classId:game.classId,expectedSeq:talentDraftSeq,build:talentDraft});
    if(!result.ok){talentMessage=result.message;renderPanel();return;}
    if(storeTalentChange(result.state)){talentDraft=JSON.parse(JSON.stringify(MareTalents.buildFor(game)));talentDraftSeq=game.talentSeq;talentMessage='Talentos aplicados. Os bônus passivos já estão ativos.';renderPanel();}
  }
  function showConfirmation(title,message,accept,acceptLabel='RECOMEÇAR',danger=true){
    if(document.querySelector('.confirmation-overlay'))return;
    const prior=document.activeElement,overlay=document.createElement('div');overlay.className='confirmation-overlay';
    overlay.innerHTML=MareUI.confirmation({title,message,acceptLabel,cancelLabel:acceptLabel==='RECOMEÇAR'?'VOLTAR':'CANCELAR',danger});
    const close=()=>{overlay.remove();MareUI.syncModals();prior?.focus();};
    overlay.querySelector('[data-confirm-cancel]').onclick=close;
    let accepted=false;overlay.querySelector('[data-confirm-accept]').onclick=()=>{if(accepted)return;accepted=true;close();accept();};
    overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){event.preventDefault();const buttons=[...overlay.querySelectorAll('button')];buttons[document.activeElement===buttons[0]?1:0].focus();}});
    document.body.append(overlay);overlay.querySelector('button').focus();
  }
  function confirmAttributes(){
    if(!MareCharacters.commit(game,attributeDraft)){toast('Pontos insuficientes ou distribuição inválida.','danger');return;}
    attributeDraft=MareCharacters.empty();allocationMessage="";attributeSuccessUntil=performance.now()+1600;saveGame();updateUI();renderPanel();toast('Atributos aplicados ao combate.','good');
  }
  let mapReturnFocus=null;
  let voyageUI={region:'east-blue',selected:null};
  let prisonFloor=1;
  const monsterUnavailable=()=>'<span class="dungeon-silhouette" aria-hidden="true">?</span><strong>Indisponível</strong>';
  function selectVoyageRegion(id){
    const region=MareArchipelago.regions.find(r=>r.id===id);if(!region||region.locked)return;
    voyageUI={region:id,selected:null};renderPanel();$('voyageRegionTabs').querySelector('[data-voyage-region="'+id+'"]')?.focus({preventScroll:true});
  }
  function renderVoyages(body){
    let region=MareArchipelago.regions.find(r=>r.id===voyageUI.region);
    if(!region||region.locked){voyageUI={region:'east-blue',selected:null};region=MareArchipelago.regions[0];}
    const islands=MareArchipelago.list(voyageUI.region),selected=islands.find(i=>i.id===voyageUI.selected)||null;
    $('voyageRegionTabs')?.remove();
    $('dialogTitle').insertAdjacentHTML('afterend',`<nav id="voyageRegionTabs" class="voyage-region-tabs" role="tablist" aria-label="Regiões do arquipélago">${MareArchipelago.regions.map(r=>`<button type="button" role="tab" id="voyage-tab-${r.id}" data-voyage-region="${r.id}" data-status="${r.locked?'locked':'available'}" aria-selected="${r.id===voyageUI.region}" aria-controls="voyageRegionContent" ${r.locked?'disabled aria-disabled="true"':''}>${r.name}${r.locked?'<small>Bloqueado</small>':''}</button>`).join('')}</nav>`);
    const details=selected?`<section class="dungeon-details" aria-labelledby="dungeonName"><button type="button" class="dungeon-back" data-voyage-back>Voltar às ilhas</button><small class="dungeon-region-name">${escapeHTML(region.name)} · ${selected.area?'Mapa disponível':'Em desenvolvimento'}</small><h3 id="dungeonName" tabindex="-1">${escapeHTML(selected.name)}</h3><div class="dungeon-range">Nível recomendado <strong>${selected.recommended[0]}–${selected.recommended[1]}</strong></div><div class="dungeon-monster ${selected.monster?.sheet?'is-sheet':''}" data-state="${selected.monster?.src?'available':'unavailable'}">${selected.monster?.src?`<span class="dungeon-monster-crop"><img data-monster-preview src="${selected.monster.src}" alt="${escapeHTML(selected.monster.role+': '+selected.monster.name)}"></span>`:monsterUnavailable()}</div>${selected.monster?`<p class="dungeon-monster-name">${escapeHTML(selected.monster.role)} · ${escapeHTML(selected.monster.name)}</p>`:'<p class="dungeon-monster-name">Monstro/chefe ainda não configurado</p>'}<p class="dungeon-description">${escapeHTML(selected.description)}</p><dl class="dungeon-facts"><div><dt>Entrada</dt><dd>${selected.area?'Personagem Nv. '+zones[selected.area].min+'+':'Área em desenvolvimento'}</dd></div><div><dt>Taxa de sucesso</dt><dd>Não estimada</dd></div></dl><h4>Drops esperados</h4>${selected.drops?`<ul class="dungeon-drops">${selected.drops.map(d=>'<li>'+escapeHTML(d)+'</li>').join('')}</ul>`:'<p class="dungeon-pending">A definir</p>'}<button type="button" class="dialog-button dungeon-travel" data-travel-island="${selected.id}" ${selected.area?`data-travel-area="${selected.area}" data-area="${selected.area}"`:''} ${MareArchipelago.canTravel(selected.id,game.level)?'':'disabled'}>${!selected.area?'Área em desenvolvimento':game.level<zones[selected.area].min?'Requer personagem Nv. '+zones[selected.area].min:'Viajar para esta ilha'}</button></section>`:'<aside class="dungeon-placeholder"><span aria-hidden="true">✦</span><h3>Escolha sua próxima ilha</h3><p>Clique em um destino para conferir a faixa de nível, o chefe e os preparativos da viagem.</p></aside>';
    body.innerHTML=`<button type="button" class="dungeon-back navigation-back" data-mode="modes">Voltar aos modos de jogo</button><section id="voyageRegionContent" role="tabpanel" aria-labelledby="voyage-tab-${voyageUI.region}" class="voyage-window archipelago-window ${selected?'has-selection':''}"><div class="voyage-overview voyage-sea"><p class="voyage-intro">${islands.length} paradas na rota de ${escapeHTML(region.name)}. Escolha uma ilha para ver os detalhes.</p><div class="archipelago-islands">${islands.map(i=>`<button type="button" class="archipelago-island ${i.area?'':'is-future'}" data-island="${i.id}" data-current="${game.area===i.area}" aria-pressed="${i.id===voyageUI.selected}"><span class="voyage-ship-art" style="--ship-x:${(i.order%2)?0:100}%" aria-hidden="true"></span><span class="archipelago-island-copy"><strong>${escapeHTML(i.name)}</strong><span class="voyage-level">Nv. ${i.recommended[0]}–${i.recommended[1]}</span><small>${i.area?(scene==='hunt'&&game.area===i.area?'Você está aqui':'Ver detalhes'):'Em desenvolvimento'}</small></span></button>`).join('')||'<p class="voyage-empty">Nenhuma ilha disponível nesta região.</p>'}</div></div>${details}</section>`;
  }
  function renderModes(body){
    body.innerHTML=`<nav class="game-modes-list" aria-label="Escolha um modo de jogo"><button type="button" data-mode="map"><img src="icones_menu_pirata/png/48/mapa.png" alt=""><span>Mapa do Arquipélago<small>Ilhas e expedições</small></span></button><button type="button" data-mode="prison"><img src="assets/ui/modes/impel-down.svg" alt=""><span>Impel Down<small>Em breve · Prisão de 100 andares</small></span></button></nav>`;
  }
  function renderPrison(body){
    prisonFloor=Math.min(prisonFloor,MarePrison.unlockedThrough(game));
    const p=game.impelDown,floor=prisonFloor,info=MarePrison.floorDetails(floor,monsterTypes),reward=MarePrison.rewardFor(floor),max=MarePrison.unlockedThrough(game);
    body.innerHTML=`<section class="prison-window prison-phase-view">
      <button type="button" class="dungeon-back" data-mode="modes">Voltar aos modos de jogo</button>
      <header class="prison-masthead"><img class="prison-mode-art" src="assets/ui/modes/impel-down.svg" alt=""><div><h2>Impel Down</h2><p>Conquiste cada andar para abrir o próximo portão. Recompensas de marco na primeira vitória.</p></div><div class="prison-summary"><span>Maior andar <strong>${p.cleared} / 100</strong></span><span>Em breve · Entrada indisponível</span></div></header>
      <section class="prison-stage-panel" aria-label="Seleção do andar"><div class="prison-floor-navigation"><div class="prison-floor-selector"><button type="button" data-prison-step="-1" aria-label="Andar anterior" ${floor<=1?'disabled':''}>◀</button><div aria-live="polite"><small>${info.boss?'Andar de chefe':'Andar normal'}</small><h3 id="prisonFloorTitle">Andar ${floor}</h3></div><button type="button" data-prison-step="1" aria-label="Próximo andar" ${floor>=max?'disabled':''}>▶</button></div><div class="prison-entry"><button type="button" class="dialog-button prison-enter" data-prison-enter disabled>ENTRAR NO ANDAR ${floor}</button><small>Em breve · Temporariamente indisponível</small></div></div><div class="prison-phase-facts"><div><span>Nível dos monstros</span><strong>${info.level}</strong></div><div><span>Ondas</span><strong>${info.waves}</strong></div><div><span>Andares liberados</span><strong>${max} / 100</strong></div></div></section>
      <section class="prison-monsters-panel"><div class="prison-section-heading"><h3>Monstros do Andar</h3><span>${info.total} monstros em ${info.waves} ondas</span></div><p class="prison-planned-note">Composição prevista com monstros existentes. Encontros em desenvolvimento.</p><div class="prison-monster-cards">${info.monsters.map(m=>`<article class="prison-monster-card"><span class="prison-monster-count">×${m.quantity}</span><img src="${m.src}" alt="${escapeHTML(m.name)}"><h4>${escapeHTML(m.name)}</h4><span>Nível ${m.level}</span><dl><div><dt>Vida</dt><dd>${fmt(m.hp)}</dd></div><div><dt>Ataque</dt><dd>${fmt(m.attack)}</dd></div></dl></article>`).join('')||'<p>Indisponível · Monstros ainda não configurados.</p>'}</div></section>
      <div class="prison-bottom-panels"><div><section class="prison-first-clear"><h3>Recompensa da Primeira Conquista</h3>${reward?`<div class="prison-first-reward"><img src="assets/ui/items-pixellab/pearl-box-1.png?v=20261020" alt=""><span>1× Caixa de Pérolas Nível 1<small>${p.claimed.includes(floor)?'Recebida':'Na primeira vitória deste andar'}</small></span></div>`:`<p>${floor<=50?'Este andar abre o próximo portão. A próxima Caixa de Pérolas chega no marco do Andar '+Math.ceil(floor/5)*5+'.':'Recompensas deste andar ainda serão definidas.'}</p>`}</section><section class="prison-rules"><h3>Regras da prisão</h3><ul><li>Vença o andar atual para liberar o seguinte.</li><li>Marcos dos andares 5 a 50 entregam uma caixa, uma única vez.</li><li>Gemas e Pérolas vêm deste modo; Senhor do Submundo permite Caixas Nv.1 nas caçadas.</li><li>O modo está em pré-visualização; partidas e resgates indisponíveis.</li></ul></section></div><div><section class="prison-ascent"><h3>Configuração da Subida</h3><label><input type="checkbox" role="switch" data-prison-option="autoAdvance" ${p.options.autoAdvance?'checked':''}>Avançar automaticamente após cada vitória</label><label><input type="checkbox" role="switch" data-prison-option="pauseBeforeBoss" ${p.options.pauseBeforeBoss?'checked':''}>Pausar antes de chefes</label><p>Preferências salvas para quando o modo for liberado.</p></section><section class="prison-milestones"><h3>Marcos</h3><div>${MarePrison.milestones.map(f=>`<article data-prison-milestone="${f}"><div><b>Andar ${f}</b><small>${p.claimed.includes(f)?'Recebido':p.cleared>=f?'Pendente':'A conquistar'}</small></div><p><img src="assets/ui/items-pixellab/pearl-box-1.png?v=20261020" alt="">1× Caixa de Pérolas Nível 1</p></article>`).join('')}</div></section></div></div>
    </section>`;
  }
  function renderPanel(){if(!currentPanel||!game)return;$('panelOverlay').dataset.uiPanel=currentPanel;const body=$('dialogBody');$('panelOverlay').classList.toggle('character-mode',currentPanel==='character');$('panelOverlay').classList.toggle('voyage-mode',['map','prison'].includes(currentPanel));$('panelOverlay').classList.toggle('modes-mode',currentPanel==='modes');if(currentPanel!=='inventory'){$('panelOverlay').classList.remove('inventory-mode');$('inventoryHeadMeta')?.classList.add('hidden');}const titles={journal:'Jornal do Porto',myprofile:'Meu Perfil',settings:'Configurações',hunt:'Rota da caçada',dev:'Laboratório DEV',inventory:'Inventário',forge:'Forja das Correntes',character:'Personagem',modes:'Modos de jogo',prison:'Impel Down',map:'Mapa do Arquipélago',contracts:'Quadro de Contratos',shop:'Mercador do Porto',help:'Guia do Navegante'};$('dialogTitle').textContent=titles[currentPanel]||currentPanel;if(currentPanel!=='map')$('voyageRegionTabs')?.remove();body.dataset.view=currentPanel;document.querySelectorAll('.bottom-nav [data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===currentPanel||(b.dataset.panel==='modes'&&['map','prison'].includes(currentPanel)))));
    if(['journal','myprofile','settings'].includes(currentPanel)){
      const g=game,s=getDerived(),className=classes[game.classId]?.name||game.classId;
      const equipment=Object.entries(game.equipment||{}).filter(([,item])=>item).map(([slot,item])=>({slot:slotNames[slot]||slot,name:itemBase(item).name}));
      body.innerHTML=MarePlayerHub.render(currentPanel,{game:g,stats:s,className,factionName:factions[g.factionId]?.name,equipment});
      MarePlayerHub.hydrate(currentPanel);
    }
    if(currentPanel==='shop'){body.innerHTML=`<div class="mini-heading">MERCADOR donquixote · SUPRIMENTOS</div><div class="item-detail">${itemIcon('potion','Poção de vida')}<h3>Poção de vida</h3><p>Restaura 44% da vida máxima.<br>Preço: <strong>35 dobrões</strong><br>Seu saldo: <strong>${fmt(game.gold)}</strong></p><button class="dialog-button" data-buy-potion="1" ${game.gold<35?'disabled':''}>COMPRAR 1 POÇÃO</button></div>`;}
    if(currentPanel==='contracts'){body.innerHTML='<div class="mini-heading">CONTRATOS DO PORTO</div><div class="contracts-modal">'+questDefs.map(q=>{let n=Math.min(q.target,questProgress(q)),done=game.claimed.includes(q.id);return `<div class="contract-modal-entry"><h3>${escapeHTML(q.title)}</h3><p>${escapeHTML(q.desc)}</p><span>${done?'CONCLUÍDO':n+' / '+q.target}</span><p class="contract-reward">Recompensa: <b>${q.gold} dobrões · ${q.xp} XP</b></p><div class="progress-track"><i style="width:${n/q.target*100}%"></i></div>${n>=q.target&&!done?`<button class="dialog-button" data-claim="${q.id}">RESGATAR · ${q.gold} DOBRÕES + ${q.xp} XP</button>`:''}</div>`;}).join('')+'</div>';}
    if(currentPanel==='inventory'){renderInventory(body);}
    if(currentPanel==='forge')renderForge(body);
    if(currentPanel!=='character'){MareTalentUI.unmount();$('characterTabs')?.remove();}
    if(currentPanel==='character')renderCharacterHub(body);
    if(currentPanel==='map')renderVoyages(body);
    if(currentPanel==='modes')renderModes(body);
    if(currentPanel==='prison')renderPrison(body);
    if(currentPanel==='hunt')renderHuntRoute(body);
    if(currentPanel==='dev')body.innerHTML=MareDev.render({g:game,on:DEV_ACTIVE,classes,defs:itemDefs,E:escapeHTML,status:devMessage});
    if(currentPanel==='help'){body.innerHTML=`<div class="help-copy"><p><strong>Bem-vindo a Maré Partida.</strong> Esta é uma demonstração jogável offline de um futuro RPG Idle online, em um universo marítimo original.</p><ul><li><strong>Lobby:</strong> clique no chão para caminhar e nos NPCs para abrir seus serviços. Abra Modos de jogo (M) e escolha Arquipélago para viajar ou Impel Down para inspecionar a prisão, ainda em breve.</li><li><strong>Auto-caçada:</strong> seu personagem procura monstros, anda até eles e ataca sozinho. O botão AUTO-CAÇADA pausa ou retoma.</li><li><strong>Teclas 1 e 2:</strong> ativam habilidades; se a caçada estiver ligada, o personagem também usa habilidades automaticamente quando apropriado.</li><li><strong>Tecla Q:</strong> usa uma poção de vida. É possível comprar mais por 35 dobrões.</li><li><strong>Contratos:</strong> conclua as caçadas listadas à direita e resgate as recompensas.</li><li><strong>Inventário:</strong> equipe os itens encontrados. Equipamentos alteram atributos reais.</li><li><strong>Forja:</strong> consome materiais e dobrões para melhorar equipamentos até +5.</li><li><strong>Mapa:</strong> a Cidade das Conchas é desbloqueada no nível 6.</li><li><strong>Salvamento:</strong> seu progresso é salvo automaticamente neste navegador, com LocalStorage. Não existe conta online, chat real ou progresso com a página fechada nesta versão.</li></ul><p>Este é um protótipo gratuito de desenvolvimento. O MMORPG, o servidor multiplayer, o banco de dados e as relíquias estão planejados para fases posteriores.</p><button class="dialog-button secondary" data-export="1">EXPORTAR SAVE (JSON)</button><button class="dialog-button secondary" data-import="1">IMPORTAR SAVE</button><button class="dialog-button secondary" data-reset="1">RECOMEÇAR JOGO</button></div><input type="file" id="saveImport" accept=".json,application/json" style="display:none"/>`;}
    if(currentPanel==='help'){
      const list=body.querySelector('.help-copy ul'),items=[...list.children],sections=document.createElement('div');sections.className='help-sections';
      for(const [title,start,end] of [['Exploração e combate',0,4],['Progressão e equipamentos',4,8],['Seu progresso salvo',8,9]]){
        const section=document.createElement('section'),heading=document.createElement('h3'),group=document.createElement('ul');heading.textContent=title;items.slice(start,end).forEach(item=>group.append(item));section.append(heading,group);sections.append(section);
      }
      list.replaceWith(sections);
      const attributes=document.createElement('p');attributes.className='help-attributes';attributes.textContent='Atributos: cada classe nasce com 50 pontos fixos. A partir do nível 2, você ganha 5 pontos livres por nível. Em Personagem, escolha +1, +5, +10, +25 ou MÁX, confira a prévia e confirme para aplicar. Cancelar preserva seus pontos.';sections.children[1].append(attributes);
    }
  }
  function devApply(command){
    const result=MareDev.execute(game,command,{active:DEV_ACTIVE,defs:itemDefs,makeItem:(def,level,rarity)=>newItem(def,level,false,rarity),starterWeapon});
    if(!result.ok){devMessage=result.message;renderPanel();return;}
    const next=result.state,d=getDerived(next,null);
    if(['restore','level','class','build','haki-kit','haki-unlock'].includes(command.type)){next.hp=d.maxHP;next.energy=d.maxEnergy;if(command.type==='restore')next.haki.current=100;}
    next.hp=Math.min(next.hp,d.maxHP);next.energy=Math.min(next.energy,d.maxEnergy);
    if(command.type==='low-hp')next.hp=Math.max(1,Math.round(d.maxHP*.2));
    if(command.type==='cooldowns'){next.talentCooldowns={};next.haki.kingReadyAt=0;}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{devMessage='Não foi possível salvar. Comando cancelado.';renderPanel();return;}
    game=next;
    if(['class','build','talents-reset','attributes-reset','level','restore'].includes(command.type)){session.talents=MareTalentCombat.create();session.respawn=0;world.hero.combat=null;}
    if(command.type==='cooldowns')session.cooldowns=[0,0];
    if(command.type==='haki-lock'||game.haki.current<=0)MareHaki.stop(session.haki);
    attributeDraft=MareCharacters.empty();talentDraft=null;devMessage=result.message;updateUI();renderPanel();
  }
  function devSpawn(type){
    if(!DEV_ACTIVE||scene!=='hunt'){toast('Entre em uma expedição antes de criar inimigos.');return;}
    if(type==='boss'&&!MareHunt.get(game.area)?.boss){toast('Esta ilha ainda não tem chefe.');return;}
    if(type==='cocox'&&game.area!=='rare'){toast('Cocox só habita a Ilha dos Animais Raros.');return;}
    if(livingMobs().length>=15){toast('Limpe os inimigos antes de criar mais.');return;}
    const nav=navigator();let point=null;
    for(const r of [100,150,200]){for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:world.hero.x+Math.cos(a)*r,y:world.hero.y+Math.sin(a)*r};if(nav.walkable(p.x,p.y)&&nav.clear(world.hero,p)&&!livingMobs().some(m=>distance(m,p)<55)){point=p;break;}}if(point)break;}
    if(!point){toast('Não há espaço livre próximo. Mova o personagem.');return;}
    const sector=MareHunt.sectorAt(game.area,point,huntAnchors()),profile=MareHunt.profile(game.area,sector.id,type,Math.random()),skin=activeMap().id==='dawn'?MareEmber.skins.cesar:activeMap().id==='embers'?MareEmber.skins[type]:null;
    world.mobs.push({id:world.nextID++,level:profile.level,area:game.area,source:'world',type,name:type==='boss'?MareHunt.get(game.area).boss:skin?.name,skin:skin?.id,district:sector.id,...point,anchorX:point.x,anchorY:point.y,...profile,hp:profile.maxHP,attackClock:2,attackCount:2,bob:0,alive:true,hit:0,slow:0,telegraph:null,emberFacing:'south',emberElapsed:0,attackAnim:0,moving:0,patrolClock:0});
    toast('Inimigo de teste criado. Feche o laboratório para combater.');
  }
  document.addEventListener('click',e=>{
    const sector=e.target.closest('[data-hunt-sector]');if(sector){followHuntSector(sector.dataset.huntSector);return;}const first=e.target.closest('[data-hunt-first]');if(first&&!first.disabled){claimHuntFirst(first.dataset.huntFirst);return;}
    if(e.target.closest('[data-dev-open]')&&MareDev.ENABLED){openPanel('dev');return;}
    if(currentPanel!=='dev')return;
    if(e.target.closest('[data-dev-enter]')){const r=MareDev.seed(localStorage,game);if(r.ok)location.assign(MareDev.targetURL(location.href,true));else toast(r.message,'danger');return;}
    if(!DEV_ACTIVE)return;
    if(e.target.closest('[data-dev-exit]')){saveGame();location.assign(MareDev.targetURL(location.href,false));return;}
    if(e.target.closest('[data-dev-recopy]')){showConfirmation('Recriar laboratório?','Substitui somente o save de teste por uma nova cópia da aventura normal.',()=>{try{const normal=JSON.parse(localStorage.getItem(MareDev.NORMAL_KEY));const r=MareDev.seed(localStorage,normal,{replace:true});if(!r.ok){toast(r.message,'danger');return;}suppressSave=true;location.reload();}catch{toast('Save normal indisponível.','danger');}},'RECRIAR CÓPIA');return;}
    if(e.target.closest('[data-dev-close]')){closePanel();return;}
    const go=e.target.closest('[data-dev-go]');if(go){if(go.dataset.devGo==='haki'&&!game.has_haki_unlocked){showHakiRequirements();return;}openPanel('character');characterTab=go.dataset.devGo;renderPanel();return;}
    const travel=e.target.closest('[data-dev-travel]');if(travel){if(travel.dataset.devTravel==='lobby')returnLobby();else worldChange(travel.dataset.devTravel);return;}
    const spawn=e.target.closest('[data-dev-spawn]');if(spawn){devSpawn(spawn.dataset.devSpawn);return;}
    if(e.target.closest('[data-dev-clear]')){world.mobs=[];world.target=null;world.spawnClock=60;autoPlay=false;MareHaki.stop(session.haki);updateUI();toast('Inimigos removidos. Novos spawns em 60 segundos.');return;}
    const button=e.target.closest('[data-dev-command]');if(!button)return;
    const type=button.dataset.devCommand,value=id=>$(id).value,num=id=>Number(value(id)),command={type};
    if(type==='level')command.level=button.dataset.value?Number(button.dataset.value):num('devLevel');
    if(type==='class')command.classId=value('devClass');
    if(type==='will')command.amount=Number(button.dataset.value);
    if(type==='build'){command.keystone=value('devKeystone');command.ultimate=value('devUltimate');}
    if(type==='achievement')command.id=value('devAchievement');
    if(type==='prison-preview')command.floor=num('devFloor');
    if(type==='item')Object.assign(command,{index:num('devItem'),count:num('devCount'),level:num('devItemLevel'),plus:num('devPlus'),rarity:value('devRarity')});
    devApply(command);
  });
  $('dialogBody').addEventListener('change',e=>{if(currentPanel==='dev'&&e.target.dataset.devOption)devApply({type:'option',name:e.target.dataset.devOption,enabled:e.target.checked});});
  function closeCharacterMenu(restoreFocus=false){
    const menu=$('characterQuickMenu'),trigger=$('characterMenuTrigger');
    if(!menu||!trigger)return;
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus({preventScroll:true});
  }
  function closeCaptainMenu(restoreFocus=false){
    const menu=$('captainQuickMenu'),trigger=$('captainMenuTrigger');
    if(!menu||!trigger)return;
    menu.classList.add('hidden');trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus({preventScroll:true});
  }
  function toggleCaptainMenu(){
    const menu=$('captainQuickMenu'),trigger=$('captainMenuTrigger');
    if(!game||!menu||!trigger||!$('panelOverlay').classList.contains('hidden')||document.querySelector('.confirmation-overlay'))return;
    const opening=menu.classList.contains('hidden');
    closeModesMenu();closeCharacterMenu();
    menu.classList.toggle('hidden',!opening);
    trigger.setAttribute('aria-expanded',String(opening));
    if(opening)menu.querySelector('[role="menuitem"]')?.focus({preventScroll:true});
    else trigger.focus({preventScroll:true});
  }
  function closeModesMenu(restoreFocus=false){
    const menu=$('modesQuickMenu'),trigger=$('modesMenuTrigger');
    if(!menu||!trigger)return;
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus({preventScroll:true});
  }
  function toggleModesMenu(){
    const menu=$('modesQuickMenu'),trigger=$('modesMenuTrigger');
    if(!game||!menu||!trigger||!$('panelOverlay').classList.contains('hidden')||document.querySelector('.confirmation-overlay'))return;
    const opening=menu.classList.contains('hidden');
    closeCharacterMenu();closeCaptainMenu();
    menu.classList.toggle('hidden',!opening);
    trigger.setAttribute('aria-expanded',String(opening));
    if(opening)menu.querySelector('[role="menuitem"]')?.focus({preventScroll:true});
    else trigger.focus({preventScroll:true});
  }
  function toggleCharacterMenu(){
    const menu=$('characterQuickMenu'),trigger=$('characterMenuTrigger');
    if(!game||!menu||!trigger||!$('panelOverlay').classList.contains('hidden')||document.querySelector('.confirmation-overlay'))return;
    const opening=menu.classList.contains('hidden');
    closeModesMenu();closeCaptainMenu();
    menu.classList.toggle('hidden',!opening);
    trigger.setAttribute('aria-expanded',String(opening));
    $('characterMenuHakiHint').textContent=game.has_haki_unlocked?'Despertado':'Nível 50 + Livro da Vontade';
    menu.querySelector('[data-character-section="haki"]')?.classList.toggle('is-locked',!game.has_haki_unlocked);
    if(opening)menu.querySelector('[role="menuitem"]')?.focus({preventScroll:true});
    else trigger.focus({preventScroll:true});
  }
  function openPanel(panel,characterSection=null){
    if(!game)return;
    if(panel==='hunts')panel='modes';
    if(panel==='modes'){
      if(currentPanel)closePanel();
      toggleModesMenu();
      return;
    }
    MareUI.rememberFocus($('panelOverlay'));
    closeCharacterMenu();
    closeModesMenu();
    closeCaptainMenu();
    if(currentPanel==='character'&&panel==='dev'){MareTalentUI.unmount();$('characterTabs')?.remove();}
    const navigation=['modes','map','prison'];
    if(navigation.includes(panel)&&!navigation.includes(currentPanel)){const active=document.activeElement;mapReturnFocus=active?.closest('#modesQuickMenu')?$('modesMenuTrigger'):(active?.matches('button,a[href],input,select,[tabindex]')?active:$('modesMenuTrigger'));}
    if(panel==='map'&&currentPanel!=='map')voyageUI={region:'east-blue',selected:null};
    if(panel==='prison'&&currentPanel!=='prison')prisonFloor=Math.min(100,game.impelDown.cleared+1);
    if(panel==='inventory')inventoryUI.page=0;
    if(panel==='character'&&currentPanel!=='character'){attributeDraft=MareCharacters.empty();characterTab='status';talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;}
    if(panel==='character'&&['status','talents','achievements','haki','akuma','hierarchy'].includes(characterSection)){if(characterTab!==characterSection){attributeDraft=MareCharacters.empty();talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;}characterTab=characterSection;}
    currentPanel=panel;$('panelOverlay').classList.remove('hidden');renderPanel();if(panel==='character'&&characterTab==='hierarchy')void syncHierarchy();$('dialogBody').scrollTop=0;
    if(panel==='map')$('voyageRegionTabs').querySelector('[aria-selected=true]')?.focus({preventScroll:true});
    else if(panel==='character')$('dialogBody').querySelector('button:not(:disabled),input:not(:disabled)')?.focus({preventScroll:true});
    else if(navigation.includes(panel)||['dev','hunt'].includes(panel))$('dialogBody').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function closePanel(){closeCharacterMenu();closeModesMenu();closeCaptainMenu();MareTalentUI.unmount();$('characterTabs')?.remove();talentDraft=null;const wasNavigation=['modes','map','prison'].includes(currentPanel);$('voyageRegionTabs')?.remove();attributeDraft=MareCharacters.empty();allocationMessage="";currentPanel=null;document.querySelectorAll('.bottom-nav [aria-pressed]').forEach(b=>b.setAttribute('aria-pressed','false'));$('panelOverlay').classList.add('hidden');$('panelOverlay').classList.remove('inventory-mode','character-mode','voyage-mode','modes-mode');$('inventoryHeadMeta')?.classList.add('hidden');if(wasNavigation)(mapReturnFocus?.isConnected?mapReturnFocus:$('mainMenu').querySelector('[data-panel=modes]'))?.focus({preventScroll:true});MareUI.restoreFocus($('panelOverlay'));}
  function exportSave(){saveGame();const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=DEV_ACTIVE?'mare-partida-DEV-save.json':'mare-partida-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
  function importSave(file){let reader=new FileReader();reader.onload=()=>{try{let d=JSON.parse(reader.result);if(!classes[d.classId]||!Number.isInteger(d.level)||!d.equipment||typeof d.name!=='string')throw Error('Save inválido');if(d.level<1)throw Error('Nível inválido');if(!MareDev.canImport(d,DEV_ACTIVE)){toast('Save de laboratório só pode ser importado no modo DEV.','danger');return;}if(DEV_ACTIVE)d.devSandbox=true;preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-import');preserveSave(JSON.stringify(d),STORAGE_KEY+'-import-source');localStorage.setItem(STORAGE_KEY,JSON.stringify(MareAkuma.migrate(MareHaki.migrate(MareTalents.migrate(MarePrison.migrate(MareForge.migrate(MareCharacters.migrate(MareHunt.migrate(d)),itemDefs)))))));suppressSave=true;location.reload();}catch(err){toast('Arquivo de salvamento inválido.','danger');}};reader.readAsText(file);}

  MareUI.bindModal($('panelOverlay'),closePanel);
  MarePlayerHub.configure({redraw:()=>{if(['journal','myprofile','settings'].includes(currentPanel))renderPanel();},setReducedFX:on=>{reducedFX=!!on;}});
  for(const query of ['(max-width:1180px)','(max-width:760px)'])matchMedia(query).addEventListener('change',()=>{if(currentPanel==='inventory')renderPanel();});

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
      if(!globalThis.MareLobby)drawNPCProps(n);
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
    if(globalThis.MareLobby)for(const portal of MareLobby.portals){ctx.save();ctx.strokeStyle='#f0d089';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(portal.x,portal.y,26+Math.sin(world.time*2)*2,12,0,0,Math.PI*2);ctx.stroke();ctx.textAlign='center';ctx.font='800 10px Trebuchet MS';ctx.fillStyle='#fff1ca';ctx.fillText('MAPA DO MUNDO',portal.x,portal.y+27);ctx.restore();}
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
    if(activeMap().id==='lobby'&&globalThis.MareLobby){MareLobby.ground(ctx,camera,W,H);return;}
    if(MareNewIslands[activeMap().id]){MareNewIslands.ground(ctx,activeMap().id,camera,W,H);return;}
    if(activeMap().id==='dawn'){MareDawnRenderer.ground(ctx,camera,W,H);return;}
    if(activeMap().id==='conchas'){MareConchasRenderer.ground(ctx,camera,W,H,world.time,reducedFX);return;}
    if(['orange','loguetown'].includes(activeMap().id)){MarePixelMapRenderer.ground(ctx,activeMap().id,camera,W,H);return;}
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
  function drawPaperDoll(c,x,y,action,direction,time,scale=null){
    if(!MarePaperDollCatalog.eligible(game))return false;
    const appearance=MarePaperDollCatalog.appearance(game),pose=MarePaperDollCatalog.sample(paperDoll,game,action,direction,time);
    return pose?paperDoll.draw(c,appearance,pose,x,y,{scale}):false;
  }
  const reportedSpriteFailures=new Set();
  function drawConfiguredHuman(c,x,y,action,direction,time,height=74){
    const entry=classCombat.entry(game);
    if(!entry)return drawFactionSprite(c,x,y,game.factionId,action==='walk'?'walk':'idle',height,false,direction,time);
    const clip=classCombat.action(game,action);
    if(classCombat.draw(c,game,x,y,{action,direction,time,height}))return true;
    const state=MareFactionSprites.status(entry.assetId,clip);
    if(state==='failed'||state==='missing'||state==='unsupported'){
      const key=entry.assetId+':'+clip+':'+direction;
      if(!reportedSpriteFailures.has(key)){reportedSpriteFailures.add(key);console.error('[sprite] Asset atual indisponível:',key,state);}
      drawMissingSprite(c,x,y);return true;
    }
    return false;
  }
  function drawPlayerSprite(c,x,y){
    const hero=world.hero,attack=hero.attackAnim>0&&scene==='hunt',moving=hero.walking>0;
    const zoan=equippedZoan();
    if(game.zoanTransformed&&zoan){
      const skillActive=world.time<(session.zoanActionUntil||0),action=skillActive||attack?'attack':moving?'walk':'idle';
      const time=skillActive?world.time-(session.zoanActionUntil-.75):(attack?.75-hero.attackAnim:world.time);
      const drawn=MareZoanArt.draw(c,zoan.id,x,y,{action,direction:hero.direction,time,scale:zoan.id==='akuma_tori_albatroz'?104/64:74/48});
      if(!drawn&&MareZoanArt.status?.(zoan.id,action,hero.direction)==='failed')drawMissingSprite(c,x,y);
      return drawn;
    }
    const combat=classCombatController(),pose=combat?.snapshot(),requested=pose?.locked?pose.action:attack?'attack':moving?'walk':'idle';
    if((!attack||combat)&&drawPaperDoll(c,x,y,requested,pose?.locked?pose.direction:hero.direction,pose?.locked?pose.elapsed:world.time))return true;
    if(classCombat.entry(game)){
      const action=pose?.locked?pose.action:attack?'attack':'combat-idle';
      return drawConfiguredHuman(c,x,y,action,pose?.locked?pose.direction:hero.direction,pose?.locked?pose.elapsed:world.time);
    }
    if(['attack','skill','skill-1','skill-2','hurt','death','guard'].includes(requested))return true;
    return drawConfiguredHuman(c,x,y,moving?'walk':'idle',hero.direction,world.time);
  }
  function drawFactionShowcase(actor){
    const a=MareFactionSprites.assets[actor.id];
    ctx.fillStyle='#08131f8c';ctx.beginPath();ctx.ellipse(actor.x,actor.y,18,5,0,0,Math.PI*2);ctx.fill();
    if(!MareFactionSprites.draw(ctx,actor.id,actor.x,actor.y,{action:showcaseAction,direction:showcaseDirection,time:world.time})){const state=MareFactionSprites.status(actor.id,showcaseAction);if(state==='failed'||state==='missing'||state==='unsupported')drawMissingSprite(ctx,actor.x,actor.y);}
    ctx.font='bold 10px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#10242c';ctx.fillRect(actor.x-38,actor.y+12,76,26);
    ctx.fillStyle='#ffe4a2';ctx.fillText(a.meta.display_name.split(' ')[0],actor.x,actor.y+23);
    ctx.font='8px Trebuchet MS';ctx.fillText(({revolutionary:'Revolucionária',pirate:'Pirata',marine:'Marinheira',government:'Governo'})[actor.id],actor.x,actor.y+33);
  }
  // PNG com transparência: os monstros deixam de ser blocos procedurais.
  const mobSprites={};
  for(const id of ['crab','bandit','spirit','boss']){
    const img=new Image();img.src='assets/monsters/'+id+'.png';mobSprites[id]=img;
  }
  function drawMobArt(m){
    if(MareNewIslandArt.monster(ctx,m,world.time))return true;
    if(activeMap().id==='rare'&&MareRareRenderer.monster(ctx,m,world.time))return true;
        if(['embers','dawn'].includes(activeMap().id)&&MareEmberRenderer.monster(ctx,m,world.time))return true;
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
        const boss=m.type==='boss'||MareMonsterCatalog[m.type]?.boss===true,width=boss?88:65, ratio=Math.max(0,m.hp/m.maxHP);
        const artLayout=MareNewIslandArt.layout(m);let barY=artLayout?artLayout.top-22:activeMap().id==='rare'&&m.type==='cocox'?MareRareRenderer.cocoxHealthBarY(m):m.y-(['embers','dawn'].includes(activeMap().id)?79:boss?114:79);
        px(ctx,m.x-width/2,barY,width,8,'#101322');
        px(ctx,m.x-width/2+1,barY+1,(width-2)*ratio,6,boss?'#e5a35d':'#e27283');
        ctx.font='bold 12px Inter,Segoe UI,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;
        ctx.strokeStyle='#0b0e1b';ctx.strokeText(monsterName(m)+' · Nv.'+m.level,m.x,barY-7);
        ctx.fillStyle=boss?'#ffe5ad':'#f7edf1';ctx.fillText(monsterName(m)+' · Nv.'+m.level,m.x,barY-7);
        if(world.target===m){ctx.strokeStyle='#d9b777';ctx.lineWidth=2;ctx.strokeRect(m.x-width/2-3,barY-3,width+6,14);}
      }
      return;
    }
    let t=world.time,scale=m.type==='boss'?2.15:m.type==='crab'?1.65:1.8,bob=Math.round(Math.sin(t*3+m.bob)*2);ctx.save();ctx.translate(Math.round(m.x),Math.round(m.y+bob));ctx.scale(scale,scale);ctx.fillStyle='#071b20a0';ctx.beginPath();ctx.ellipse(0,2,13,4,0,0,Math.PI*2);ctx.fill();if(m.type==='crab'){px(ctx,-10,-12,20,12,'#7d3b36');px(ctx,-8,-17,16,10,'#d27b58');px(ctx,-11,-16,5,6,'#e6b477');px(ctx,6,-16,5,6,'#e6b477');px(ctx,-7,-14,3,3,'#182e32');px(ctx,5,-14,3,3,'#182e32');px(ctx,-17,-6,8,3,'#aa5444');px(ctx,9,-6,8,3,'#aa5444');px(ctx,-19,-16,8,7,'#d78563');px(ctx,11,-16,8,7,'#d78563');}else if(m.type==='bandit'){px(ctx,-5,-11,5,9,'#353a35');px(ctx,1,-11,5,9,'#353a35');px(ctx,-8,-26,17,15,'#8d5741');px(ctx,-6,-39,12,13,'#c08e6a');px(ctx,-12,-40,24,5,'#3e3a3a');px(ctx,-7,-46,16,8,'#55504b');px(ctx,10,-25,4,22,'#bdc7ba');px(ctx,9,-16,8,3,'#eac078');px(ctx,-5,-34,3,2,'#292e2c');px(ctx,2,-34,3,2,'#292e2c');}else if(m.type==='spirit'){ctx.globalAlpha=.85;px(ctx,-10,-28,21,22,'#2e7e75');px(ctx,-7,-39,15,13,'#a8e7c5');px(ctx,-13,-27,5,13,'#78c9b1');px(ctx,10,-27,5,13,'#78c9b1');px(ctx,-8,-5,7,5,'#77cabb');px(ctx,2,-5,7,5,'#80d5c4');px(ctx,-6,-33,4,3,'#295751');px(ctx,4,-33,4,3,'#295751');px(ctx,-13,-40,8,5,'#9ecbb1');ctx.globalAlpha=1;}else {px(ctx,-7,-13,7,11,'#24262d');px(ctx,2,-13,7,11,'#24262d');px(ctx,-11,-32,22,20,'#732f36');px(ctx,-7,-43,15,13,'#c09878');px(ctx,-16,-47,31,7,'#2c3434');px(ctx,-8,-54,17,9,'#423a36');px(ctx,-6,-36,12,4,'#e9c178');px(ctx,-14,-29,5,19,'#b1a18c');px(ctx,13,-39,5,30,'#cbd5cf');px(ctx,9,-19,14,4,'#e7b974');px(ctx,-3,-38,3,2,'#262a2a');px(ctx,4,-38,3,2,'#262a2a');}if(m.hit>0){ctx.globalCompositeOperation='screen';px(ctx,-11,-39,22,29,'#fff9d0aa');ctx.globalCompositeOperation='source-over';}ctx.restore();
    if(m.alive){let width=m.type==='boss'?88:56,ratio=Math.max(0,m.hp/m.maxHP);px(ctx,m.x-width/2,m.y-(m.type==='boss'?117:76),width,8,'#0b1e24');px(ctx,m.x-width/2+1,m.y-(m.type==='boss'?116:75),(width-2)*ratio,6,m.type==='boss'?'#d9aa6c':'#c87369');ctx.textAlign='center';ctx.font=(m.type==='boss'?'bold 15px':'bold 12px')+' Trebuchet MS';ctx.fillStyle='#071b1f';ctx.fillText(monsterName(m),m.x+1,m.y-(m.type==='boss'?125:83)+1);ctx.fillStyle=m.type==='boss'?'#ffe6a6':'#fff4dd';ctx.fillText(monsterName(m),m.x,m.y-(m.type==='boss'?125:83));if(world.target===m){ctx.strokeStyle='#e9d18d';ctx.lineWidth=2;ctx.strokeRect(m.x-width/2-4,m.y-(m.type==='boss'?121:80),width+8,16);}}}
  function drawTalentFields(){
    if(scene!=='hunt'||!session)return;ctx.save();
    for(const f of session.talents.ultimate.fields){
      if(f.kind==='gravity'){ctx.strokeStyle='#a895d099';ctx.fillStyle='#16102655';ctx.beginPath();ctx.ellipse(f.x,f.y,Math.max(15,f.remaining/2*80),Math.max(8,f.remaining/2*40),0,0,Math.PI*2);ctx.fill();ctx.stroke();}
      else{ctx.strokeStyle='#d35c3866';ctx.lineWidth=55;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.from.x,f.from.y);ctx.lineTo(f.to.x,f.to.y);ctx.stroke();ctx.strokeStyle='#efac4c66';ctx.lineWidth=13;ctx.stroke();}
    }ctx.restore();
  }
  function drawHuntWarnings(){
    if(scene!=='hunt')return;ctx.save();
    for(const m of livingMobs()){
      const w=m.telegraph;if(!w)continue;const fill=Math.max(0,1-w.remaining/w.total);
      ctx.strokeStyle='#ffb85c';ctx.fillStyle='#c833433b';ctx.lineWidth=3;
      ctx.beginPath();if(w.shape==='circle')ctx.arc(w.x,w.y,w.radius,0,Math.PI*2);else{const a=Math.atan2(w.to.y-w.y,w.to.x-w.x),dx=Math.sin(a)*w.width/2,dy=-Math.cos(a)*w.width/2;ctx.moveTo(w.x+dx,w.y+dy);ctx.lineTo(w.to.x+dx,w.to.y+dy);ctx.lineTo(w.to.x-dx,w.to.y-dy);ctx.lineTo(w.x-dx,w.y-dy);ctx.closePath();}ctx.fill();ctx.stroke();
      ctx.strokeStyle='#ff5b69';ctx.lineWidth=5;ctx.beginPath();if(w.shape==='circle')ctx.arc(w.x,w.y,w.radius-6,-Math.PI/2,-Math.PI/2+Math.PI*2*fill);else{ctx.moveTo(w.x,w.y);ctx.lineTo(w.x+(w.to.x-w.x)*fill,w.y+(w.to.y-w.y)*fill);}ctx.stroke();
    }
    ctx.restore();
  }
  function drawTalentedHero(x,y){
    const u=MareUltimates.selected(game),rt=session.talents.ultimate;
    if(u==='shadowClone'){ctx.save();ctx.globalAlpha=.3;drawPlayerSprite(ctx,x-38,y+16);ctx.restore();}
    if(world.hero.visible!==false)vfx_aura.draw(ctx,x,y,world.time,u==='titan'?1.35:1);
    ctx.save();if(rt.hidden)ctx.globalAlpha=.2;if(world.hero.visible===false){drawBeriSeparation(ctx,x,y,1-session.fruitBurst/1.5);}else if(u==='titan'){ctx.translate(x,y);ctx.scale(1.35,1.35);drawPlayerSprite(ctx,0,0);}else drawPlayerSprite(ctx,x,y);ctx.restore();
    globalThis.MareHakiArt?.draw(ctx,session.haki,world.hero,world.time,reducedFX,(c,x,y)=>{c.save();c.translate(x,y);if(u==='titan')c.scale(1.35,1.35);drawPlayerSprite(c,0,0);c.restore();},u==='titan'?1.35:1);
    if(u==='armamentSkin'&&rt.vigor>0){px(ctx,x-30,y-94,60,6,'#10222a');px(ctx,x-29,y-93,58*rt.vigor/rt.vigorMax,4,'#e4c77b');}
  }
  function drawForegroundLayer(actors){
    const mapId=activeMap().id;
    if(mapId==='dawn')for(const prop of MareDawn.props)MareDawnRenderer.prop(ctx,prop,actors);
    if(mapId==='lobby')MareLobby.foreground(ctx,actors);
    const overlay=(p,bounds,draw)=>{
      if(!actors.some(a=>a.y<p.y&&a.x+35>bounds.x&&a.x-35<bounds.x+bounds.w&&a.y>bounds.y&&a.y-120<bounds.y+bounds.h))return;
      ctx.save();ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.clip();draw(ctx,p);ctx.restore();
    };
    if(mapId==='conchas')for(const p of MareConchas.props){
      overlay(p,{x:p.x-p.width/2,y:p.y-p.height,w:p.width,h:p.height*.7},MareConchasRenderer.prop);
    }
    if(mapId==='embers')for(const p of MareEmber.props.filter(p=>!p.ground)){
      const size=128*p.scale,x=p.drawX??p.x-size/2,y=p.drawY??p.y-size*.85;
      overlay(p,{x,y,w:size,h:size*.68},MareEmberRenderer.prop);
    }
  }
  function drawEntityLayer(){
    let toDraw=[...(activeMap().id==='lobby'?MareLobby.depthObjects.map(o=>({kind:'lobby-prop',y:o.pivotY,obj:o})):[]),...(activeMap().id==='conchas'?MareConchas.props.map(p=>({kind:'conchas-prop',y:p.y,obj:p})):[]),...(activeMap().id==='embers'?MareEmber.props.filter(p=>!p.ground).map(p=>({kind:'ember-prop',y:p.y,obj:p})):[]),...world.mobs.filter(m=>scene==='hunt'&&m.alive).map(m=>({kind:'mob',y:m.y,obj:m})),...(scene==='lobby'?[...npcs.map(n=>({kind:'npc',y:n.y,obj:n})),...(!globalThis.MareLobby?MareIsland.buildings:[]).map(b=>({kind:'building',y:b.y-17,obj:b})),...(!globalThis.MareLobby?MareIsland.decorations.concat(harborArt.complete&&harborArt.naturalWidth?MareIsland.harborProps:[]):[]).map(d=>({kind:'decor',y:d.y,obj:d}))]:[]),...((scene==='lobby'&&factionShowcase&&globalThis.MareFactionSprites)?Object.keys(MareFactionSprites.assets).filter(id=>!MareFactionSprites.assets[id].meta.class_id).map((id,index)=>({kind:'faction',y:800,obj:{id,x:1240+index*80,y:800}})):[])].sort((a,b)=>a.y-b.y||(a.kind==='hero'?-1:b.kind==='hero'?1:0));for(let i of toDraw){if(i.kind==='lobby-prop')MareLobby.depthProp(ctx,i.obj);else if(i.kind==='rare-prop')MareRareRenderer.prop(ctx,i.obj);else if(i.kind==='conchas-prop')MareConchasRenderer.prop(ctx,i.obj);else if(i.kind==='ember-prop')MareEmberRenderer.prop(ctx,i.obj);else if(i.kind==='faction')drawFactionShowcase(i.obj);else if(i.kind==='npc')drawNPC(i.obj);else if(i.kind==='building')drawIslandBuilding(i.obj);else if(i.kind==='decor')drawIslandDecoration(i.obj);else drawMonster(i.obj);}
  }
  function drawHeroLayer(){if(session?.respawn>0&&!classCombatController()){ctx.globalAlpha=.5+Math.sin(world.time*8)*.25;}drawTalentedHero(world.hero.x,world.hero.y);ctx.globalAlpha=1;let name=game.name,hudLift=MareUltimates.selected(game)==='titan'?28:0,nameLift=MareUltimates.selected(game)==='armamentSkin'?14:0;ctx.textAlign='center';ctx.font='bold 13px Trebuchet MS';ctx.fillStyle='#03171c';ctx.fillText(name,world.hero.x+1,world.hero.y-85-hudLift-nameLift);ctx.fillStyle='#e7fcf1';ctx.fillText(name,world.hero.x,world.hero.y-86-hudLift-nameLift);let d=getDerived();px(ctx,world.hero.x-30,world.hero.y-79-hudLift,60,7,'#001819');px(ctx,world.hero.x-29,world.hero.y-78-hudLift,58*(game.hp/d.maxHP),5,'#5ed09c');if(session?.guard>0){ctx.strokeStyle='#78e2d3aa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(world.hero.x,world.hero.y-26,20,34,0,0,Math.PI*2);ctx.stroke();}}
  function drawWorld(){if(!game){ctx.fillStyle='#123740';ctx.fillRect(0,0,W,H);return;}ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));drawBackground();drawHuntWarnings();drawTalentFields();if(scene==='lobby')drawTownActors();drawEntityLayer();drawHeroLayer();
    drawForegroundLayer([world.hero,...world.mobs.filter(m=>scene==='hunt'&&m.alive),...(scene==='lobby'?npcs:[])]);
    for(const food of world.food){if(world.time<(food.readyAt||0))continue;if(drawFruitFrame(ctx,food.x,food.y,'akuma_kuku_kuku',MareAkuma.byId('akuma_kuku_kuku').skill_frames-1))continue;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#9c552c';ctx.fillRect(Math.round(food.x-8),Math.round(food.y-9),16,11);ctx.fillStyle='#ffd579';ctx.fillRect(Math.round(food.x-6),Math.round(food.y-11),12,5);ctx.restore();}
    if(MareNewIslands[activeMap().id])MareNewIslands.environment(ctx,activeMap().id,world.time);
    if(activeMap().id==='dawn')MareDawnRenderer.environment(ctx,world.time,reducedFX);
    if(activeMap().id==='conchas')MareConchasRenderer.environment(ctx,world.time,reducedFX);
    if(['orange','loguetown'].includes(activeMap().id))MarePixelMapRenderer.environment(ctx,activeMap().id,world.time,reducedFX);
    if(activeMap().id==='embers')MareEmberRenderer.environment(ctx,camera,W,H,world.time,reducedFX);
    for(let p of world.projectiles){let x=p.x+(p.tx-p.x)*p.progress,y=p.y+(p.ty-p.y)*p.progress;ctx.fillStyle=p.color;ctx.fillRect(x-3,y-3,11,6);ctx.fillStyle='#fff7db';ctx.fillRect(x+1,y-2,4,3);}
    for(let f of world.fx){ctx.globalAlpha=f.fruit||f.zoanVfx?1:clamp(f.life/f.max,0,1);if(f.zoanVfx){MareZoanArt.drawVfx(ctx,f.zoanVfx,f.followHero?world.hero.x:f.x,f.followHero?world.hero.y:f.y,{time:f.max-f.life,scale:74/48,loop:!!f.loop});}else if(f.fruit){drawFruitBurst(ctx,f.x,f.y,f.fruit,f.max-f.life);}else if(f.slash){ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y-17,29,-2.35,.2);ctx.stroke();}else if(f.ring){ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f.x,f.y-4,(1-f.life/f.max)*61+6,(1-f.life/f.max)*26+5,0,0,Math.PI*2);ctx.stroke();}else {ctx.textAlign='center';ctx.font='bold '+f.size+'px Trebuchet MS';ctx.lineWidth=3;ctx.strokeStyle='#0b2323';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}}ctx.globalAlpha=1;
    ctx.restore();
    if(scene==='hunt'&&session?.respawn>0){
      if(classCombatController()){
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
  function drawVfxPanels(){
    if(!game||document.hidden)return;
    renderPortrait();
    if(currentPanel==='inventory'){const canvas=$('inventorySprite');if(canvas)drawCurrentPreview(canvas,185);}
    if(currentPanel==='character'&&characterTab==='status'){const canvas=$('characterSprite');if(canvas)drawCurrentPreview(canvas,155);}
    if(currentPanel==='character'&&characterTab==='akuma')for(const canvas of document.querySelectorAll('canvas[data-akuma-aura]')){const fruit=MareAkuma.byId(canvas.dataset.akumaAura),c=canvas.getContext('2d');c.clearRect(0,0,48,48);c.imageSmoothingEnabled=false;vfx_aura.draw(c,24,48,world.time,1,fruit);}
  }
  function frame(t){if(!lastTime)lastTime=t;const dt=Math.min(.25,Math.max(0,(t-lastTime)/1000));lastTime=t;if(game&&!document.hidden){for(let remaining=dt;remaining>0;remaining-=.05)tick(Math.min(.05,remaining));renderUIClock+=dt;saveClock+=dt;if(renderUIClock>.27){renderUIClock=0;updateUI();}if(saveClock>(game.has_haki_unlocked?1:7)){saveClock=0;saveGame();}camera.update(world.hero,activeMap(),dt);}drawWorld();drawVfxPanels();requestAnimationFrame(frame);}


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
  // XP/h stays visually anchored immediately above the expedition widget.
  const tracker=document.createElement('section');
  tracker.id='huntXpTracker';tracker.className='hunt-xp-tracker';tracker.hidden=true;
  tracker.setAttribute('role','status');tracker.setAttribute('aria-live','off');
  tracker.innerHTML='<div class="hunt-xp-top"><span>✦ XP POR HORA</span><strong id="huntXpRate">Calculando…</strong></div><div class="hunt-xp-metrics"><span>Tempo <b id="huntXpTime">00:00</b></span><span id="huntXpEarned">0 XP</span></div><div class="hunt-xp-track" role="presentation"><i id="huntXpProgress"></i></div><span class="hunt-xp-level" id="huntXpLevel">Próximo nível</span>';
  document.querySelector('.dashboard').appendChild(tracker);
  let wheelDelta=0;
  canvas.addEventListener('wheel',event=>{
    // Never let Ctrl/Meta+wheel zoom the browser while playing.
    event.preventDefault();
    if(event.ctrlKey||event.metaKey)return;
    const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    wheelDelta=Math.max(-135,Math.min(135,wheelDelta+pixels));
    if(Math.abs(wheelDelta)>=55){
      const direction=wheelDelta<0?1:-1;
      wheelDelta-=Math.sign(wheelDelta)*55;
      worldZoom.step(direction);
    }
  },{passive:false});
  // Block native page zoom from Ctrl/Meta + scroll anywhere in the game.
  document.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.metaKey)event.preventDefault();
  },{passive:false,capture:true});
  MareUI.mountHUD();
  $('journeyToggle').addEventListener('click',()=>{const collapsed=journey.classList.toggle('collapsed');$('journeyToggle').setAttribute('aria-expanded',String(!collapsed));journey.querySelector('.journey-chevron').textContent=collapsed?'+':'−';});

  function syncExpeditionMini(){
    const open=floating.expedition.classList.contains('hud-open');
    expeditionMini.classList.toggle('open',open);
    expeditionMini.classList.toggle('hidden',scene!=='hunt');
    const lbl=expeditionMini.querySelector('.mini-label');
    if(lbl) lbl.textContent = scene!=='hunt' ? 'No porto' : (autoPlay ? 'Caçada ativa' : 'Caçada pausada');
  }

  function toggleFloating(kind,force){let el=floating[kind];if(!el)return;const open=force===undefined?!el.classList.contains('hud-open'):!!force;
    if(open&&innerWidth<=760)for(const other of Object.keys(floating))if(other!==kind)toggleFloating(other,false);
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
    const quest=questDefs.find(q=>!game.claimed.includes(q.id)&&(scene!=='hunt'||!['orange','swamp','beach','rare'].includes(game.area)||q.area===game.area));
    $('journeyTitle').textContent=quest?quest.title:'Contratos concluídos';
    const progress=quest?Math.min(quest.target,questProgress(quest)):1,total=quest?quest.target:1;
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
      const changed=game.classId!==selectedClass;if(changed){talentDraft=null;characterTab=null;}game.name=name;game.factionId=selectedFaction;game.classId=selectedClass;MareHierarchy.migrate(game);void syncHierarchy();
      if(changed){
        const old=game.equipment.weapon;if(old)game.inventory.push(old);
        game.equipment.weapon=newItem(itemDefs[starterWeapon(selectedClass)]);
      }
      const d=getDerived();game.hp=Math.min(d.maxHP,Math.max(1,game.hp));game.energy=Math.min(d.maxEnergy,Math.max(0,game.energy));
      session.talents=MareTalentCombat.create();session.cooldowns=[0,0];session.guard=0;session.blessing=0;toast('Facção e classe atualizadas!','good');$('startOverlay').classList.add('hidden');configureFactionVisual();renderPortrait();updateUI();saveGame();editingCharacter=false;
    }else{game=createGame(name,selectedClass);startGame();}
  });
  $('characterName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!$('factionStep').classList.contains('hidden'))$('nextToClass').click();else $('createCharacter').click();}});
  $('autoToggle').addEventListener('click',()=>{if(scene!=='hunt'||!game)return;autoPlay=!autoPlay;if(autoPlay){travelPath=[];lobbyDestination=null;lobbyAction=null;pursuit.delete(world.hero);}toast(autoPlay?'Auto-caçada retomada.':'Auto-caçada pausada.');updateUI();});
  $('hakiKing').addEventListener('click',castHakiKing);
  $('skill1').addEventListener('click',()=>{const skill=MareAkuma.activeSkill(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id);if(skill?.key==='1')void useFruitSkill(true);else useSkill(0,true);});$('skill2').addEventListener('click',()=>{const skill=MareAkuma.activeSkill(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id);if(skill?.key==='2')void useFruitSkill(true);else useSkill(1,true);});$('skill3').addEventListener('click',()=>void useFruitSkill(true));$('zoanTransform').addEventListener('click',()=>void toggleZoanTransform());$('usePotion').addEventListener('click',()=>usePotion(true));$('buyPotion').addEventListener('click',buyPotion);
  document.addEventListener('click',e=>{
    const captainTrigger=e.target.closest('[data-captain-menu-trigger]');
    if(captainTrigger){toggleCaptainMenu();return;}
    const captainSection=e.target.closest('[data-captain-section]');
    if(captainSection){closeCaptainMenu();openPanel(captainSection.dataset.captainSection);return;}
    if(!$('captainQuickMenu')?.contains(e.target))closeCaptainMenu();
    const modesTrigger=e.target.closest('[data-modes-menu-trigger]');
    if(modesTrigger){toggleModesMenu();return;}
    const quickMode=e.target.closest('[data-quick-mode]');
    if(quickMode){closeModesMenu();openPanel(quickMode.dataset.quickMode);return;}
    if(!$('modesQuickMenu')?.contains(e.target))closeModesMenu();
    const menuTrigger=e.target.closest('[data-character-menu-trigger]');
    if(menuTrigger){toggleCharacterMenu();return;}
    const section=e.target.closest('[data-character-section]');
    if(section){
      closeCharacterMenu();
      if(section.dataset.characterSection==='haki'&&!game.has_haki_unlocked){showHakiRequirements();return;}
      openPanel('character',section.dataset.characterSection);
      return;
    }
    if(!$('characterQuickMenu')?.contains(e.target))closeCharacterMenu();
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
    b=e.target.closest('[data-akuma-rank]');if(b&&MareAkuma.ranks.includes(b.dataset.akumaRank)){akumaRank=b.dataset.akumaRank;renderPanel();$('dialogBody')?.querySelector('[data-akuma-rank="'+akumaRank+'"]')?.focus({preventScroll:true});return;}
    if(e.target.closest('[data-hierarchy-promote]')){confirmHierarchy();return;}
    b=e.target.closest('[data-character-tab]');if(b){if(b.dataset.characterTab==='haki'&&!game.has_haki_unlocked){showHakiRequirements();return;}characterTab=b.dataset.characterTab;attributeDraft=MareCharacters.empty();talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;renderPanel();$('characterTabs')?.querySelector('[data-character-tab="'+characterTab+'"]')?.focus({preventScroll:true});return;}
    b=e.target.closest('[data-achievement-category]');if(b){achievementCategory=b.dataset.achievementCategory;renderPanel();return;}
    b=e.target.closest('[data-achievement-claim]');if(b&&!b.disabled){const result=MareAchievements.claim(game,b.dataset.achievementClaim,{power:getDerived(game,null).power});if(!result.ok){talentMessage=result.message;renderPanel();return;}if(storeTalentChange(result.state)){talentMessage='+'+result.points+' PT resgatados. A recompensa foi registrada no diário.';talentDraft=null;talentDraftSeq=game.talentSeq;renderPanel();}return;}
    b=e.target.closest('[data-talent-select]');if(b){selectedTalent=b.dataset.talentSelect;talentMessage='';renderPanel();if(matchMedia('(max-width:760px)').matches)$('dialogBody').querySelector('.talent-inspector')?.scrollIntoView({block:'nearest'});else $('dialogBody').querySelector('[data-talent-select="'+selectedTalent+'"]')?.focus({preventScroll:true});return;}
    b=e.target.closest('[data-talent-add]');if(b&&!b.disabled){const plan=MareTalents.invest(game,talentDraft,b.dataset.talentAdd);if(plan.ok){talentDraft=plan.build;talentMessage='Prévia atualizada. Confirme para aplicar.';}else talentMessage=plan.message;renderPanel();const add=$('dialogBody').querySelector('[data-talent-add="'+b.dataset.talentAdd+'"]:not(:disabled)');add?.focus({preventScroll:true});return;}
    if(e.target.closest('[data-talent-cancel]')){talentDraft=null;talentMessage='Prévia descartada. Seus pontos foram preservados.';renderPanel();return;}
    if(e.target.closest('[data-talent-confirm]')){if(MareTalents.spent(talentDraft)<=MareTalents.spent(MareTalents.buildFor(game)))return;showConfirmation('Confirmar talentos?','Aplique '+(MareTalents.spent(talentDraft)-MareTalents.spent(MareTalents.buildFor(game)))+' PT na árvore de '+MareTalents.getTree(game.classId).name+'.',confirmTalents,'APLICAR TALENTOS',false);return;}
    if(e.target.closest('[data-talent-reset]')){if(scene!=='lobby')return;showConfirmation('Redefinir talentos desta classe?','Todos os PT desta árvore voltarão a ficar disponíveis. Seus equipamentos, atributos e outras classes serão preservados.',()=>{if(scene==='lobby'&&storeTalentChange(MareTalents.reset(game))){session.talents=MareTalentCombat.create();talentDraft=null;talentDraftSeq=game.talentSeq;talentMessage='Pontos devolvidos para esta classe.';renderPanel();}},'REDEFINIR',false);return;}
    b=e.target.closest('[data-panel]');if(b){if(b.hasAttribute('data-modes-menu-trigger')||b.hasAttribute('data-character-menu-trigger'))return;openPanel(b.dataset.panel);if(b.id==='attributePointsHud'){characterTab='status';renderPanel();}return;}
    b=e.target.closest('[data-close-panel]');if(b){closePanel();return;}
    b=e.target.closest('[data-buy-potion]');if(b){buyPotion();renderPanel();return;}
    b=e.target.closest('[data-claim]');if(b){claimQuest(b.dataset.claim);return;}
    b=e.target.closest('[data-item]');if(b){selectedItem=b.dataset.item;renderPanel();return;}
    b=e.target.closest('[data-fruit-register]');if(b){registerFruit(b.dataset.fruitRegister);return;}
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
      const f=forgeUI.filters;const candidates=game.inventory.filter(i=>MareForge.isGear(i,itemDefs)&&!i.locked&&!i.sockets.some(Boolean)&&!['legendary','supreme'].includes(i.rarity)&&(!f.rarity||i.rarity===f.rarity)&&(!f.slot||itemBase(i).slot===f.slot)&&(!f.level||i.level>=Number(f.level))&&(!f.search||itemBase(i).name.toLocaleLowerCase('pt-BR').includes(f.search.toLocaleLowerCase('pt-BR')))&&f.where!=='equipped');
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
    b=e.target.closest('[data-mode]');if(b){if(['modes','map','prison'].includes(b.dataset.mode))openPanel(b.dataset.mode);return;}
    b=e.target.closest('[data-prison-step]');if(b&&currentPanel==='prison'&&!b.disabled){const floor=prisonFloor+Number(b.dataset.prisonStep);if(MarePrison.canInspect(game,floor)){prisonFloor=floor;renderPanel();$('dialogBody').querySelector('[data-prison-step="'+b.dataset.prisonStep+'"]:not(:disabled)')?.focus({preventScroll:true});}return;}
    b=e.target.closest('[data-voyage-region]');if(b){selectVoyageRegion(b.dataset.voyageRegion);return;}
    b=e.target.closest('[data-island]');if(b){const island=MareArchipelago.get(b.dataset.island);if(island&&island.region===voyageUI.region){voyageUI.selected=island.id;renderPanel();const card=$('dialogBody').querySelector('[data-island="'+island.id+'"]');if(matchMedia('(max-width:760px)').matches)$('dungeonName')?.focus();else card?.focus({preventScroll:true});}return;}
    b=e.target.closest('[data-voyage-back]');if(b){const previous=voyageUI.selected;voyageUI.selected=null;renderPanel();$('dialogBody').querySelector('[data-island="'+previous+'"]')?.focus();return;}
    b=e.target.closest('[data-travel-island]');if(b){const island=MareArchipelago.get(b.dataset.travelIsland);if(island&&island.id===voyageUI.selected&&MareArchipelago.canTravel(island.id,game.level))worldChange(island.area);return;}

    b=e.target.closest('[data-use-haki-book]');if(b){const id=b.dataset.useHakiBook;showConfirmation('Despertar o Haki?','O Livro da Vontade será consumido. Os três tipos de Haki serão desbloqueados permanentemente.',()=>consumeHakiBook(id),'DESPERTAR',false);return;}
    b=e.target.closest('[data-haki-toggle]');if(b){toggleHaki(b.dataset.hakiToggle);return;}
    b=e.target.closest('[data-haki-cast]');if(b){castHakiKing();return;}
    b=e.target.closest('[data-open-pearl-box]');if(b&&!b.disabled){const id=b.dataset.openPearlBox,item=game.inventory.find(i=>i.id===id);if(item&&itemBase(item).kind==='pearl-box'&&!item.locked)showConfirmation('Abrir '+itemBase(item).name+'?','A caixa será consumida para sortear uma pérola do mesmo nível. Os cinco atributos têm chances iguais.',()=>openPearlBox(id));return;}
    b=e.target.closest('[data-export]');if(b){exportSave();return;}
    b=e.target.closest('[data-import]');if(b){let input=$('saveImport');input.addEventListener('change',()=>{if(input.files[0])importSave(input.files[0]);},{once:true});input.click();return;}
    b=e.target.closest('[data-reset]');if(b){showConfirmation('Recomeçar aventura?','Seu personagem salvo neste navegador será apagado. Exporte o save pela Ajuda antes de continuar.',()=>{localStorage.removeItem(STORAGE_KEY);suppressSave=true;location.reload();});return;}
  });
  $('dialogBody').addEventListener('change',e=>{const key=e.target.dataset.prisonOption;if(currentPanel!=='prison'||!['autoAdvance','pauseBeforeBoss'].includes(key))return;const next=MarePrison.migrate(game);next.impelDown.options[key]=e.target.checked;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));game=next;}catch{e.target.checked=game.impelDown.options[key];toast('Não foi possível salvar a preferência.','danger');}});
  $('dialogBody').addEventListener('error',e=>{if(e.target.matches('[data-monster-preview]')){const frame=e.target.closest('.dungeon-monster');frame.dataset.state='unavailable';frame.innerHTML=monsterUnavailable();}},true);
  let fusionDragToken='';
  $('dialogBody').addEventListener('dragstart',e=>{const fruit=e.target.closest('[data-fruit-drag]');if(fruit){e.dataTransfer.setData('application/x-mare-fruit',fruit.dataset.fruitDrag);e.dataTransfer.effectAllowed='move';return;}const tile=e.target.closest('[data-fusion-drag]');if(!tile)return;fusionDragToken=tile.dataset.fusionDrag;e.dataTransfer.setData('application/x-mare-fusion',fusionDragToken);e.dataTransfer.effectAllowed='copy';});
  $('dialogBody').addEventListener('dragover',e=>{const fruitSlot=e.target.closest('[data-inv-slot="akuma_no_mi"]');if(fruitSlot){e.preventDefault();fruitSlot.classList.add('fruit-drop-target');e.dataTransfer.dropEffect='move';return;}const slot=e.target.closest('[data-fusion-slot-index]');if(!slot)return;e.preventDefault();const valid=!!fusionAddition(fusionDragToken,Number(slot.dataset.fusionSlotIndex));slot.classList.toggle('drop-valid',valid);slot.classList.toggle('drop-invalid',!valid);e.dataTransfer.dropEffect=valid?'copy':'none';});
  $('dialogBody').addEventListener('dragleave',e=>{e.target.closest('[data-inv-slot="akuma_no_mi"]')?.classList.remove('fruit-drop-target');e.target.closest('[data-fusion-slot-index]')?.classList.remove('drop-valid','drop-invalid');});
  $('dialogBody').addEventListener('drop',e=>{const fruitSlot=e.target.closest('[data-inv-slot="akuma_no_mi"]');if(fruitSlot){e.preventDefault();fruitSlot.classList.remove('fruit-drop-target');const id=e.dataTransfer.getData('application/x-mare-fruit');if(id)equipItem(id);return;}const slot=e.target.closest('[data-fusion-slot-index]');if(!slot)return;e.preventDefault();slot.classList.remove('drop-valid','drop-invalid');const token=e.dataTransfer.getData('application/x-mare-fusion');addFusionMaterial(token,Number(slot.dataset.fusionSlotIndex));fusionDragToken='';});
  $('dialogBody').addEventListener('dragend',()=>{fusionDragToken='';document.querySelectorAll('.drop-valid,.drop-invalid').forEach(el=>el.classList.remove('drop-valid','drop-invalid'));});
  $('dialogBody').addEventListener('change',e=>{if(e.target.matches('[data-forge-filter]')){forgeUI.filters[e.target.dataset.forgeFilter]=e.target.value;forgeUI.page=0;renderPanel();}if(e.target.matches('[data-forge-pearl-filter]')){forgeUI.pearlFilters[e.target.dataset.forgePearlFilter]=e.target.value;renderPanel();}if(e.target.id==='forgeOutputSlot'){forgeUI.outputSlot=e.target.value;renderPanel();}});
  $('dialogBody').addEventListener('input',e=>{if(['forgeSearch','forgePearlSearch'].includes(e.target.id)){const id=e.target.id,pos=e.target.selectionStart;(id==='forgeSearch'?forgeUI.filters:forgeUI.pearlFilters).search=e.target.value;forgeUI.page=0;renderPanel();const input=$(id);input.focus();input.setSelectionRange(pos,pos);}});
  $('changePath').addEventListener('click',()=>{if(game)openCreation(true);});
  $('enterHunt').addEventListener('click',e=>{e.stopPropagation();openPanel('modes');});
  $('returnLobby').addEventListener('click',returnLobby);
  $('navLobby').addEventListener('click',()=>{if(scene!=='lobby')returnLobby();});
  $('navHunt').addEventListener('click',()=>openPanel('modes'));
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
      const portal=globalThis.MareLobby?.portals.find(p=>Math.hypot(p.x-x,p.y-y)<p.radius);
      if(portal){walkTo(portal,portal);return;}
      const npc=npcs.find(n=>Math.hypot(n.x-x,n.y-30-y)<48);
      walkTo(npc?{x:npc.x-34,y:npc.y+13}:point,npc||null);return;
    }
    if(activeMap().id==='rare'&&Math.hypot(x-MareRare.returnPoint.x,y-MareRare.returnPoint.y)<42){walkTo({...MareRare.returnPoint},{...MareRare.returnPoint,kind:'return'});return;}
    if(activeMap().id==='dawn'&&Math.hypot(x-MareDawn.returnPoint.x,y-MareDawn.returnPoint.y)<42){walkTo({...MareDawn.returnPoint},{...MareDawn.returnPoint,kind:'return'});return;}
    if(activeMap().id==='conchas'&&Math.hypot(x-MareConchas.returnPoint.x,y-MareConchas.returnPoint.y)<42){walkTo({...MareConchas.returnPoint},{...MareConchas.returnPoint,kind:'return'});return;}
    if(['orange','loguetown'].includes(activeMap().id)&&Math.hypot(x-activeMap().returnPoint.x,y-activeMap().returnPoint.y)<42){walkTo({...activeMap().returnPoint},{...activeMap().returnPoint,kind:'return'});return;}
    if(activeMap().id==='embers'&&Math.hypot(x-MareEmber.returnPoint.x,y-MareEmber.returnPoint.y)<42){walkTo({...MareEmber.returnPoint},{...MareEmber.returnPoint,kind:'return'});return;}
    const target=livingMobs().find(m=>activeMap().id==='rare'&&m.type==='cocox'?MareRareRenderer.cocoxHitTest(m,x,y):Math.hypot(m.x-x,m.y-30-y)<48);
    if(target){world.target=target;autoPlay=true;travelPath=[];lobbyDestination=null;rejectedTargets.delete(target.id);updateUI();return;}
    walkTo(point);
  });

  window.addEventListener('keydown',(e)=>{
    const isTyping=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if(e.key==='Escape'){
      if(!$('startOverlay').classList.contains('hidden'))return;
      if(!$('characterQuickMenu').classList.contains('hidden')){e.preventDefault();closeCharacterMenu(true);return;}
      if(!$('modesQuickMenu').classList.contains('hidden')){e.preventDefault();closeModesMenu(true);return;}
      if(!$('captainQuickMenu').classList.contains('hidden')){e.preventDefault();closeCaptainMenu(true);return;}
      if(currentPanel){closePanel();return;}
      ['status','expedition','chat'].forEach(k=>toggleFloating(k,false));return;
    }
    const activeQuickMenu=!$('captainQuickMenu').classList.contains('hidden')?$('captainQuickMenu'):(!$('characterQuickMenu').classList.contains('hidden')?$('characterQuickMenu'):(!$('modesQuickMenu').classList.contains('hidden')?$('modesQuickMenu'):null));
    if(activeQuickMenu){
      const menu=activeQuickMenu,items=[...menu.querySelectorAll('[role="menuitem"]')];
      if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
        e.preventDefault();
        const index=items.indexOf(document.activeElement);
        const next=e.key==='Home'?0:e.key==='End'?items.length-1:
          (index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
        items[next]?.focus({preventScroll:true});return;
      }
      if(e.key==='Tab'){closeCharacterMenu();closeModesMenu();closeCaptainMenu();return;}
      if(['Enter',' '].includes(e.key)&&menu.contains(document.activeElement))return;
    }
    if(['modes','map','prison','character','dev','hunt'].includes(currentPanel)&&e.key==='Tab'){const items=[...$('panelOverlay').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(b=>b.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
    if(['modes','map','prison','character','dev','hunt'].includes(currentPanel)&&['Enter',' '].includes(e.key)&&document.activeElement?.tagName==='BUTTON')return;
    if(isTyping||!game||!session||!$('startOverlay').classList.contains('hidden'))return;
    if(e.key==='F8'&&MareDev.ENABLED){e.preventDefault();openPanel('dev');return;}
    const k=e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&!currentPanel&&!activeQuickMenu){e.preventDefault();keys.add(k);if(scene==='hunt'&&autoPlay){autoPlay=false;updateUI();}return;}
    if(['i','m','p','o','f','c','1','2','3','t','q',' '].includes(k))e.preventDefault();
    if(['h','j','k'].includes(k)){if(e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(e.repeat||currentPanel||document.querySelector('.confirmation-overlay'))return;if(k==='k')castHakiKing();else toggleHaki(k==='h'?'armament':'observation');return;}
    if(k==='i'){openPanel('inventory');return;}
    if(k==='m'){openPanel('modes');return;}
    if(k==='f'){openPanel('forge');return;}
    if(k==='c'){openPanel('contracts');return;}
    if(k==='p'){if(!currentPanel)toggleCharacterMenu();return;}
    if(k==='l'){e.preventDefault();toggleFloating('chat');return;}
    if(k==='o'){toggleFloating('expedition');return;}
    if(currentPanel)return;
    if(k==='t'){void toggleZoanTransform();return;}
    if(k==='3'){if(MareAkuma.activeSkill(equippedZoan()?.id)?.key==='3')void useFruitSkill(true);return;}
    if(k==='1'||k==='2'){const fruit=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs),skill=MareAkuma.activeSkill(fruit?.id);if(skill?.key===k){useFruitSkill(true);return;}useSkill(k==='1'?0:1,true);}
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
  $('devLauncher').hidden=!MareDev.ENABLED;$('devLauncher').textContent=DEV_ACTIVE?'DEV ATIVO':'DEV';document.body.classList.toggle('dev-sandbox',DEV_ACTIVE);if(DEV_ACTIVE){document.title='[DEV] '+document.title;const badge=document.createElement('div');badge.className='dev-badge';badge.textContent='LABORATÓRIO · SAVE DE TESTE';document.body.append(badge);}
  const previous=loadGame();if(previous){game=previous;let d=getDerived();game.hp=clamp(Number(game.hp)||1,0,d.maxHP);game.energy=clamp(Number(game.energy)||0,0,d.maxEnergy);startGame();toast('Bem-vindo de volta, '+game.name+'!','good');}else{$('startOverlay').classList.remove('hidden');openCreation(false);$('characterName').focus();}
  // Diagnóstico somente leitura para testes de regressão da demo local.
  window.__mareDiagnostics=()=>({dev:{active:DEV_ACTIVE,key:STORAGE_KEY,options:game?.devOptions},akuma:{registered:MareAkuma.registered(game),equipped:game?.equipment?.akuma_no_mi?.id||null,current_fruit_vfx},hakiBookDef:itemDefs.indexOf(MareHaki.book),haki:game?{...game.haki,...session?.haki,unlocked:game.has_haki_unlocked}:null,hunt:game?{progress:game.hunts,sector:MareHunt.sectorAt(game.area,world.hero,huntAnchors()),bossReady:MareHunt.bossReady(game,game.area,world.hero,Date.now(),huntAnchors())}:null,scene,autoPlay,hero:{...world.hero},camera:{x:camera.x,y:camera.y,width:W,height:H,zoom:worldZoom.value},telemetry:session?MareHudTelemetry.stats({scene,elapsed:session.elapsed,xp:session.xp,levelXP:game?.xp,neededXP:game?xpNeeded(game.level):1}):null,map:{id:activeMap().id,width:activeMap().width,height:activeMap().height},colliders:activeMap().colliders.map(o=>({...o})),npcs:npcs.map(n=>({...n})),path:travelPath.map(p=>({...p})),destination:lobbyDestination?{...lobbyDestination}:null,walkable:navigator().walkable(world.hero.x,world.hero.y),landmarks:scene==='lobby'?MareIsland.paths.map(p=>({...p})):activeMap().id==='rare'?MareRare.paths.map(p=>({...p})):activeMap().id==='dawn'?MareDawn.paths.map(p=>({...p})):activeMap().id==='conchas'?MareConchas.paths.map(p=>({...p})):['orange','loguetown'].includes(activeMap().id)?huntAnchors():activeMap().id==='embers'?MareEmber.paths.map(p=>({...p})):[],alive:livingMobs().length,attackClock:session?.attackClock??null,stats:game?getDerived():null,attributes:game?{...game.attributes}:null,attributePoints:game?.attributePoints??0,talents:session?.talents?MareTalentCombat.snapshot(session.talents):null,talentPoints:game?MareTalents.available(game):0,classId:game?.classId,combat:world.hero.combat?.snapshot()??null,combatAssetId:world.hero.combatAssetId??null,paperDoll:{...paperDoll.stats(),appearance:game?MarePaperDollCatalog.appearance(game):null},energy:game?.energy,hp:game?.hp,skillUses:session?.skillUses,skillEnergySpent:session?.skillEnergySpent,healingDone:session?.healingDone,guard:session?.guard,cooldowns:session?.cooldowns?.slice(),mobs:livingMobs().map(m=>({id:m.id,type:m.type,name:monsterName(m),skin:m.skin,district:m.district,area:m.area,maxHP:m.maxHP,attack:m.attack,defense:m.defense,telegraph:m.telegraph?{...m.telegraph}:null,x:m.x,y:m.y,hp:m.hp,poison:m.talentPoison?{...m.talentPoison}:null,level:m.level,hakiDebuff:m.hakiDebuff||0,control:m.talentControl?{...m.talentControl}:null,emp:m.empRemaining||0,marks:m.assassinMarks||0,burn:m.ultimateBurn?{...m.ultimateBurn}:null,clonePoison:m.clonePoison?{...m.clonePoison}:null,wear:m.talentWear?{...m.talentWear}:null,taunt:m.taunt?{...m.taunt}:null})),kills:game?.stats.kills??0,damage:game?.stats.damage??0,level:game?.level??0});
  requestAnimationFrame(frame);
})();

