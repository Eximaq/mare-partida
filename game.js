'use strict';
/* MARÉ PARTIDA — demonstração local, sem multiplayer e sem bibliotecas externas.
   Conteúdo original. Todo o progresso é salvo exclusivamente no navegador. */
(() => {
  const classCombat=MareCombatRegistry.create({sprites:MareFactionSprites,animation:MareCombatAnimation,loadVisuals:false});
  const DEV_ACTIVE=MareDev.active(location.search);
  const lobby96=MarePaperDoll96Lobby.create({search:location.search,onChange:()=>{if(game){renderPortrait();if(currentPanel==='character'&&characterTab==='appearance')renderPanel();}}});
  let paperDollDebug=DEV_ACTIVE&&new URLSearchParams(location.search).get('paperDollDebug')==='1';
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
  const {Camera, Navigation} = MareWorld;
  const worldMaps={...MareWorld.maps,...(MarePixelWorldMaps?.conchas?{conchas:MarePixelWorldMaps.conchas.map}:{})};
  const camera = new Camera();
  const worldZoom=MareHudTelemetry.createZoom(()=>resizeViewport());
  const navigators = Object.fromEntries(Object.entries(worldMaps).map(([id,map])=>[id,new Navigation(map,map.navigationCell||24)]));
  for(const nav of Object.values(navigators))MareDoru.guardNavigation(nav,()=>world?.time||0);
  let travelPath = [], pursuit = new WeakMap(), conchasRouteReplans = 0;
  const keys = new Set(), rejectedTargets = new Map();
  const mapKey=()=>scene==='lobby'?'lobby':impelRun?'impel-down':MareAlubarna.worlds[game?.area]?game.area:game?.area==='alabasta'&&worldMaps.alabasta?'alabasta':game?.area==='rare'&&worldMaps.rare?'rare':game?.area==='syrup'&&worldMaps.syrup?'syrup':game?.area==='baratie'&&worldMaps.baratie?'baratie':game?.area==='arlong'&&worldMaps.arlong?'arlong':game?.area==='swamp'&&worldMaps.conchas?'conchas':game?.area==='orange'&&worldMaps.orange?'orange':game?.area==='loguetown'&&worldMaps.loguetown?'loguetown':game?.area==='beach'&&worldMaps.dawn?'dawn':game?.area==='beach'&&worldMaps.embers?'embers':'hunt';
  const activeMap = () => worldMaps[mapKey()];
  const navigator = () => navigators[mapKey()];
  // Combat rays ignore floor/water and low scenery; movement retains feet collisions.
  function combatLine(a,b){return navigator().projectileClear(a,b);}
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
    travelPath=path;lobbyDestination={...path[path.length-1]};lobbyAction=action;conchasRouteReplans=0;
    if(scene==='hunt'){autoPlay=false;world.target=null;updateUI();}
    return true;
  }
  function navigateEntity(entity,goal,speed,dt,range=0){
    if(entity===world.hero&&(classCombatController()?.locked()||basicAttackPose()))return true;
    const nav=navigator(),dist=Math.hypot(goal.x-entity.x,goal.y-entity.y);
    if(dist<=range&&nav.projectileClear(entity,goal))return true;
    let route=pursuit.get(entity);
    if(!route||world.time>=route.until||Math.hypot(route.goal.x-goal.x,route.goal.y-goal.y)>40){
      route={goal:{x:goal.x,y:goal.y},path:nav.path(entity,goal),until:world.time+1};pursuit.set(entity,route);
    }
    if(!route.path.length)return false;
    if(entity===world.hero&&betaEquipped())MareRankB.followGlide(entity,route.path,speed,Math.min(dt,Math.max(1,dist-range)/speed),nav);else nav.follow(entity,route.path,speed,Math.min(dt,Math.max(1,dist-range)/speed));return true;
  }
  function moveManually(dt){
    if(hoyaActive())return false;
    if(ryuSkillActive()||wolfSkillActive()||bisonSkillActive())return true;
    if(world.hero.talentControl?.remaining>0||nekoSkillActive()||ushiSkillActive())return false;
    if(currentPanel||!$('startOverlay').classList.contains('hidden'))return false;
    if(classCombatController()?.locked()||basicAttackPose())return false;
    const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    if(dx||dy){
      travelPath=[];lobbyDestination=null;lobbyAction=null;const length=Math.hypot(dx,dy),hero=world.hero;
      const speed=getDerived().moveSpeed;if(betaEquipped())MareRankB.glide(hero,{x:hero.x+dx/length*speed*dt,y:hero.y+dy/length*speed*dt},speed,dt,navigator());else navigator().move(hero,dx/length*speed*dt,dy/length*speed*dt);hero.walking=.2;
      hero.facing=dx<0?-1:dx>0?1:hero.facing;
      hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');return true;
    }
    if(travelPath.length){
      if(betaEquipped())MareRankB.followGlide(world.hero,travelPath,getDerived().moveSpeed,dt,navigator());else navigator().follow(world.hero,travelPath,getDerived().moveSpeed,dt);
      // Conchas has tight PixelLab collision margins: a partially blocked segment
      // can cancel the current route even though a different A* path exists.
      // Replan from the actual feet position without bypassing solid scenery.
      if(!travelPath.length&&activeMap().id==='conchas'&&lobbyDestination&&
        Math.hypot(world.hero.x-lobbyDestination.x,world.hero.y-lobbyDestination.y)>8&&conchasRouteReplans<3){
        conchasRouteReplans++;
        const recovery=navigator().path(world.hero,lobbyDestination);
        if(recovery.length){travelPath=recovery;return true;}
      }
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
    pirate:{name:'Pirata',short:'PIRATA',color:'#ef9a76',accent:'#a44a48',desc:'Liberdade, conquista e espólios.',bonus:'Ataque +10% · Berry +8%',attack:1.10,defense:1,hp:1,energy:1,speed:1,crit:0,gold:1.08},
    marine:{name:'Marinha',short:'MARINHA',color:'#82bdf3',accent:'#396c9c',desc:'Disciplina, proteção e resistência.',bonus:'HP +8% · defesa +10%',attack:1,defense:1.10,hp:1.08,energy:1,speed:1,crit:0,gold:1},
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
  function configureFactionVisual(){
    const f=factions[game?.factionId]||factions.pirate;
    document.documentElement.style.setProperty('--faction-accent',f.color);
    if($('heroFaction'))$('heroFaction').textContent=f.name.toUpperCase();
    if($('factionChip'))$('factionChip').textContent='◆ '+f.short;
  }

  const zones = {
    ...Object.fromEntries(MareAlubarna.specs.map(s=>[s.id,{name:s.name,sub:'Cidade de Alubarna',min:s.min,label:'RECOMENDADO · NV. '+s.min+'–'+s.max,tint:'orange',mobs:[s.type]}])),
    alabasta:{name:MareArchipelago.byArea('alabasta').name,sub:'Oásis e Santuários',min:40,label:'RECOMENDADO · NV. 40–50',tint:'orange',mobs:['bananawani']},
    beach: { name:MareArchipelago.byArea('beach').name, sub:'Costa dos Navegantes', min:1, label:'RECOMENDADO · NV. 1–5', tint:'beach', mobs:['crab','bandit','spirit'] },
    orange:{name:MareArchipelago.byArea('orange').name,sub:'Porto das Laranjeiras',min:11,label:'RECOMENDADO · NV. 11–15',tint:'orange',mobs:['mr3','cabaji']},
    swamp: { name:MareArchipelago.byArea('swamp').name, sub:'Cidade das Conchas', min:8, label:'RECOMENDADO · NV. 8', tint:'swamp', mobs:['helmeppo'] },
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
  for(const id of ['sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro','helmeppo','bananawani',...MareAlubarna.specs.map(s=>s.type)]){const m=MareMonsterCatalog[id];monsterTypes[id]={name:m.name,hp:m.max_hp,atk:m.physical_attack,def:m.physical_defense,xp:Math.round(140*1.055**(m.level-18)),gold:[90,135],reach:m.reach,speed:m.move_speed,attackSec:m.attack_seconds,color:'#d8aa79',icon:'◆'};}
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
  let inventoryForgeReturn=null;
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
  const fruitItemDef=fruit=>({name:fruit.name,description:fruit.description||'',type:'akuma_no_mi',slot:'akuma_no_mi',fruitId:fruit.id,rank:fruit.rank,icon_path:fruit.icon_path,bonus_stats:fruit.bonus_stats,vfx_sprite_sheet:fruit.vfx_sprite_sheet,symbol:'✦',rarity:MareAkuma.rarityFor(fruit)});
  // The first five fruits precede saved weapon indices; future fruits append below.
  itemDefs.push(...MareAkuma.catalog.slice(0,5).map(fruitItemDef));
  // Append only: preserve saved numeric item indices. All four reuse the existing 11 ATK Espadachim baseline; rarity multipliers remain centralized in MareForge.
  itemDefs.push(
    {name:'Katana da Maelstrom',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'legendary',fixedRarity:true,description:'Uma katana lendária que carrega a fúria dos redemoinhos. Sua lâmina canaliza correntes de vento em movimentos circulares, transformando cada golpe em uma tempestade cortante.',icon_path:'assets/ui/items-pixellab/katana-de-maelstrom.png?v=20261022',slotAnimation:{spriteSheet:'assets/ui/items-pixellab/katana-de-maelstrom-animation.png?v=20261023-slot',frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5,className:'maelstrom-katana-slot-animation'}},
    {name:'Nodachi de Kairouseki',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'epic',fixedRarity:true,description:'Uma nodachi forjada com Kairouseki, o lendário mineral dos mares. Sua lâmina enfraquece usuários de Akuma no Mi ao contato, anulando sua resistência sobrenatural e tornando-os vulneráveis ao aço.',icon_path:'assets/ui/items-pixellab/nodachi-de-kairouseki.png?v=20261022'},
    {name:'Nodachi de Fogo',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'legendary',fixedRarity:true,description:'Uma imponente nodachi envolta pelo calor das chamas. Seus golpes liberam energia flamejante, capazes de incendiar inimigos e deixar um rastro ardente pelo campo de batalha.',icon_path:'assets/ui/items-pixellab/nodachi-de-fogo.png?v=20261022',slotAnimation:{spriteSheet:'assets/ui/items-pixellab/nodachi-de-fogo-animation.png?v=20261022-slot',frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5,className:'nodachi-fire-slot-animation'}},
    {name:'Meito: Ame no Habakiri',slot:'weapon',type:'sword',attack:11,defense:0,hp:0,symbol:'⚔',rarity:'supreme',fixedRarity:true,description:'Uma espada lendária empunhada por Kozuki Oden, reconhecida entre as grandes Meito de Wano. Diz-se que sua lâmina é capaz de cortar os próprios céus, carregando o legado de um dos maiores samurais da história.',icon_path:'assets/ui/items-pixellab/ame-no-habakiri.png?v=20261022',slotAnimation:{spriteSheet:'assets/ui/items-pixellab/ame-no-habakiri-animation.png?v=20261023-slot',frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5,className:'ame-habakiri-slot-animation'}}
  );
  // Append only: preserve save indices and reuse the 13 ATK Lâminas Acrobáticas baseline.
  itemDefs.push(
    {name:'Adaga de Cristal',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,symbol:'✧',rarity:'epic',fixedRarity:true,description:'Uma adaga forjada a partir de cristais raros, cuja lâmina reluz com energia arcana. Sua precisão mortal permite desferir cortes rápidos e penetrantes, capazes de atravessar as defesas dos inimigos.',icon_path:'assets/ui/items-pixellab/adaga-de-cristal.png?v=20261023'},
    {name:'Punhal de Netuno',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,symbol:'✧',rarity:'legendary',fixedRarity:true,description:'Um punhal lendário que carrega a bênção do soberano dos mares. Sua lâmina canaliza o poder das profundezas oceânicas, desencadeando correntes devastadoras contra aqueles que desafiam sua autoridade.',icon_path:'assets/ui/items-pixellab/punhal-de-netuno.png?v=20261023'},
    {name:'Punhal Flamejante',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,symbol:'✧',rarity:'legendary',fixedRarity:true,description:'Um punhal ancestral envolto em chamas que jamais se apagam. Cada golpe libera um calor abrasador, consumindo os inimigos em um fogo implacável que persiste mesmo após o corte.',icon_path:'assets/ui/items-pixellab/punhal-flamejante.png?v=20261023'},
    {name:'Lâmina das Trevas',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,symbol:'✧',rarity:'supreme',fixedRarity:true,description:'Uma lâmina suprema nascida das profundezas da escuridão absoluta. Sua essência absorve a luz ao redor, canalizando uma energia sombria capaz de dilacerar até os adversários mais poderosos. Dizem que cada inimigo derrotado fortalece ainda mais sua maldição.',icon_path:'assets/ui/items-pixellab/lamina-das-trevas.png?v=20261023',slotAnimation:{spriteSheet:'assets/ui/items-pixellab/lamina-das-trevas-animation.png?v=20261023',frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5,className:'lamina-trevas-slot-animation'}}
  );
  itemDefs.push(...MareAkuma.catalog.slice(5).map(fruitItemDef));
  const questDefs = [
    {id:'crab',title:'Cascos de magma',desc:'Derrote 6 carapaças ígneas.',target:6,stat:'crab',gold:85,xp:65},
    {id:'bandit',title:'Chamas à espreita',desc:'Derrote 5 corsários de brasa.',target:5,stat:'bandit',gold:125,xp:100},
    {id:'boss',title:'Coração vulcânico',desc:'Derrote um chefe de ilha.',target:1,stat:'boss',gold:280,xp:190},
    {id:'dawn-patrol',title:'Dawn: liberar as ruas',desc:'Derrote 20 inimigos na Ilha Dawn.',target:20,area:'beach',metric:'kills',gold:150,xp:200},
    {id:'dawn-clear',title:'Dawn: enfrentar César',desc:'Derrote César na Ilha Dawn.',target:1,area:'beach',metric:'bosses',gold:300,xp:450},
    {id:'conchas-patrol',title:'Conchas: patrulha de Helmeppo',desc:'Derrote 30 Helmeppos na Cidade das Conchas.',target:30,area:'swamp',metric:'kills',gold:450,xp:800},
    {id:'conchas-clear',title:'Conchas: derrotar Helmeppo',desc:'Derrote Helmeppo na Cidade das Conchas.',target:1,area:'swamp',metric:'kills',gold:160,xp:240},
    {id:'orange-patrol',title:'Orange Town: recuperar o comércio',desc:'Derrote 40 inimigos em Orange Town.',target:40,area:'orange',metric:'kills',gold:900,xp:1600},
    {id:'orange-clear',title:'Orange Town: retomar as ruas',desc:'Derrote Mr. 3 ou Cabaji em Orange Town.',target:12,area:'orange',metric:'kills',gold:450,xp:800},
    {id:'rare-patrol',title:'Animais Raros: trilha segura',desc:'Derrote 20 Cocox na floresta.',target:20,area:'rare',metric:'kills',gold:1200,xp:2200}
  ];

  let game = null, session = null, world = { mobs:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:612,y:286,facing:1,attackAnim:0,walking:0}, target:null,spawnClock:0,bossCooldown:0,nextID:1 };
  let selectedClass = 'sword', selectedFaction = 'pirate', editingCharacter = false, currentPanel = null, selectedItem = null, forgeSlot = 'weapon', lastTime = 0, renderUIClock = 0, saveClock = 0, tickClock = 0;
  let autoPlay = true, autoSkills = true, reducedFX = false;
  let attributeDraft=MareCharacters.empty(),attributeQuantity=1,allocationMessage="";
  let hierarchyBackend=false,hierarchyMessage='',hierarchyView=null,hierarchyRequest=0,hierarchyRankingAbort=null,hierarchyPromoting=false,hierarchyMutation=0,hierarchySyncing=false,hierarchySyncSeq=0;
  let dollLookMessage='',creationLookDraft=MareCharacterAppearance.legacyLook(null),creationAppearanceDraft=MareCharacterAppearance.read(null),appearanceDraft=null,creationDirection='south',profileDirection='south',creationStep=1;
  let contractPeriod='daily';
  const compendiumUI=MareCompendium.createState();
  let characterTab=null,talentDraft=null,selectedTalent=null,talentMessage='',talentDraftSeq=0,achievementCategory='all';
  const fruitAuraImages=Object.fromEntries(MareAkuma.catalog.filter(fruit=>fruit.vfx_sprite_sheet).map(fruit=>{const image=new Image();image.src=fruit.vfx_sprite_sheet;return [fruit.id,image];}));
  let current_fruit_vfx=null,fruitVfxImage=null,akumaBackend=false,akumaInitPending=null,combatVfxBackend=false,akumaCorpseQueue=Promise.resolve();
  async function akumaRequest(route,payload){
    if(!akumaBackend)return null;
    if(route==='cast')payload={...payload,rank_c_context:{...payload.rank_c_context,silenced:MareRankS.silenced(world.hero,world.time)}};
    const response=await fetch('/api/akuma/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player_id:game.akumaPlayerId,...payload})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Falha na habilidade');return result;
  }
  function initAkumaBackend(){
    if(akumaInitPending)return akumaInitPending;
    const pending=initAkumaBackendNow();akumaInitPending=pending;
    const complete=()=>{if(akumaInitPending===pending)akumaInitPending=null;};pending.then(complete,complete);return pending;
  }
  async function initAkumaBackendNow(){
    if(!game)return;
    try{const response=await fetch('/api/akuma/catalog',{cache:'no-store'});if(!response.ok)return;backendFruitCatalog=await response.json();akumaBackend=true;game.akumaPlayerId ||= crypto.randomUUID();
      const serverState=await akumaRequest('player',{});try{const vfxResponse=await fetch('/api/akuma/vfx-catalog',{cache:'no-store'});combatVfxBackend=vfxResponse.ok&&(await vfxResponse.json()).version===1;}catch{combatVfxBackend=false;}game.fruitCooldowns ||= {};for(const [id,readyAt] of Object.entries(serverState.cooldowns||{}))game.fruitCooldowns[id]=Math.max(game.fruitCooldowns[id]||0,readyAt*1000);session.fruitInvulnerable=Math.max(0,serverState.invulnerable_until-Date.now()/1000);game.zoanAltitudeUntil=Math.max(game.zoanAltitudeUntil||0,(serverState.high_altitude_until||0)*1000);for(const id of MareAkuma.registered(game))await akumaRequest('register',{fruit_id:id});
      const equipped=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs);if(equipped){await akumaRequest('equip',{fruit_id:equipped.id});if(MareAkuma.isZoan(equipped)&&(game.zoanTransformed||[MareUshi.rules.id,MareWolf.rules.id,MareRyu.rules.id].includes(equipped.id)))await akumaRequest('transform',{enabled:!!game.zoanTransformed});if([MareUshi.rules.id,MareWolf.rules.id,MareRankC.rules.horu.id,MareRankC.rules.mato.id,...Object.values(MareRankCExpansion.rules).map(r=>r.id),...Object.values(MareRankB.rules).map(r=>r.id),...Object.values(MareRankA.rules).map(r=>r.id),MareHoya.rules.id,MareJiki.rules.id,MareRyu.rules.id].includes(equipped.id))await akumaRequest('end-protection',{});}saveGame();
    }catch(error){akumaBackend=false;console.warn('API Akuma indisponível:',error);}
  }
  function syncFruitVfx(){
    const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);
    if(fruit&&['akuma_tori_albatroz','akuma_tori_phoenix','akuma_uma_uma','akuma_inu_dachshund'].includes(fruit.id))MareSpriteCombatV2.preload(MareSpriteCombatV2.fruits[fruit.id]);
    if(fruit?.id==='akuma_neko_leopard')MareNeko.preload();
    if(fruit?.id===MareUshi.rules.id)MareUshi.preload();
    if(fruit?.id===MareDoru.rules.id)MareDoru.preload();
    if(fruit?.id===MareRyu.rules.id)MareRyu.preload();
    if(fruit?.id===MareWolf.rules.id)MareWolf.preload();else clearWolfState();clearRyuState();
    if(session?.rankCFruitId&&session.rankCFruitId!==fruit?.id)clearRankC();
    if([MareRankC.rules.horu.id,MareRankC.rules.mato.id].includes(fruit?.id)){MareRankC.preload();session.rankCFruitId=fruit.id;}else if(session)session.rankCFruitId=null;
    if(fruit?.id!==MareUshi.rules.id)clearUshiState();
    if(fruit?.id!=='akuma_supa_supa'&&session)session.supaShieldUntil=0;
    if(session?.expansionFruitId&&session.expansionFruitId!==fruit?.id)clearExpansion();
    if(MareRankCExpansion.has(fruit?.id)){MareRankCExpansion.preload();session.expansionFruitId=fruit.id;}
    if(session?.rankBFruitId&&session.rankBFruitId!==fruit?.id)clearRankB();
    if(MareRankB.has(fruit?.id)){MareRankB.preload();session.rankBFruitId=fruit.id;}
    if(session?.rankAFruitId&&session.rankAFruitId!==fruit?.id)clearRankA();
    if(MareRankA.has(fruit?.id)){MareRankA.preload(fruit.id);session.rankAFruitId=fruit.id;}
    if(fruit?.id===MareHoya.rules.id)MareHoya.preload();else clearHoya();
    if(fruit?.id===MareJiki.rules.id)MareJiki.preload();else clearJiki();
    syncZoanTransition();
    current_fruit_vfx=fruit?.passive_aura_sheet||fruit?.vfx_sprite_sheet||null;
    fruitVfxImage=fruit?fruitAuraImages[fruit.id]:null;
  }
  const vfx_aura={draw(c,x,y,time,scale=1,fruitOverride=null,layer='back'){
    const fruit=fruitOverride||MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);if(!fruit||(MareAkuma.isZoan(fruit)&&fruit.id!==MareRankS.rules.phoenix.id)||fruit.id==='akuma_supa_supa')return;
    if(MareRankS.has(fruit.id)){const auraScale=fruit.id===MareRankS.rules.phoenix.id&&!game?.zoanTransformed?scale*.7:scale;MareRankS.drawAura(c,fruit.id,x,y,time,auraScale,layer);return;}
    if(layer==='front'||MareRankB.has(fruit.id)||fruit.id===MareHoya.rules.id)return;
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
  const supaImages=Object.fromEntries(Object.entries(MareSupaArt.animations).map(([kind,animation])=>{const image=new Image();image.src=animation.image;return [kind,image];}));
  function clearSupaProtection(){if(!session?.supaShieldUntil)return;session.supaShieldUntil=0;if(akumaBackend)void akumaRequest('end-protection',{}).catch(error=>console.warn('Proteção não sincronizada:',error));}
  function supaShieldActive(){return game?.hp>0&&session?.respawn<=0&&MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id==='akuma_supa_supa'&&Date.now()<(session.supaShieldUntil||0);}
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
  const pendingFruitRegistrations=new Set();
  async function registerFruit(id){
    if(!MareAkuma.byId(id)||MareAkuma.registered(game).includes(id)||pendingFruitRegistrations.has(id))return;
    const def=itemDefs.find(d=>d.fruitId===id),needsCopy=()=>def&&!game.inventory.some(i=>i.fruitId===id)&&!Object.values(game.equipment).some(i=>i?.fruitId===id);
    if(needsCopy()&&game.inventory.length>=BAG_CAPACITY){toast('Libere um espaço na bolsa para registrar a fruta.','danger');return;}
    const registeringPlayerId=game.akumaPlayerId;
    pendingFruitRegistrations.add(id);
    try{
      if(akumaBackend)await akumaRequest('register',{fruit_id:id});
      if(game.akumaPlayerId!==registeringPlayerId||MareAkuma.registered(game).includes(id))return;
      if(needsCopy()&&game.inventory.length>=BAG_CAPACITY){toast('Libere um espaço na bolsa para registrar a fruta.','danger');return;}
      const result=MareAkuma.register(game,id);if(!result.ok)return;
      let next={...result.state,inventory:[...game.inventory]};
      if(needsCopy())next.inventory.unshift(newItem(def));
      next=observeAchievements(next);if(DEV_ACTIVE)next.devSandbox=true;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(next));game=next;
      $('saveDot').style.background='#65c9bc';renderPanel();updateUI();toast('Fruta registrada no Compêndio.','good');
    }catch(error){toast('Não foi possível registrar a fruta: '+error.message,'danger');}
    finally{pendingFruitRegistrations.delete(id);}
  }
  function equippedZoan(){const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs);return MareAkuma.isZoan(fruit)?fruit:null;}
  function stepDoruProjectiles(dt){
    if(!session||!world)return;
    for(const mob of world.mobs){mob.isRooted=MareDoru.isRooted(mob,world.time)||MareRankB.rooted(mob,world.time);if(mob.isRooted)mob.moving=0;}
    for(const shot of session.doruProjectiles||[]){
      MareDoru.step(shot,dt,world.mobs,(from,to)=>combatLine(from,to),{impact:(projectile,target)=>{
        const point={x:projectile.impactX,y:projectile.impactY},enemies=livingMobs().filter(m=>combatLine(point,m)).map(m=>({id:m.id,x:m.x,y:m.y,alive:true,defense:enemyArmor(m)}));
        if(akumaBackend&&projectile.serverId){
          const activeSession=session;activeSession.doruImpactPending=(activeSession.doruImpactPending||0)+1;
          void akumaRequest('doru-impact',{projectile_id:projectile.serverId,x:point.x,y:point.y,enemies,hit_id:target?.id}).catch(error=>{activeSession.doruSyncError=error.message;console.warn('Impacto Doru não sincronizado:',error);}).finally(()=>activeSession.doruImpactPending--);
        }
        if(projectile.key==='1')for(const mob of MareDoru.targets(point,livingMobs()).filter(m=>combatLine(point,m)))outputDamage(mob,MareDoru.damage(projectile.attack,enemyArmor(mob)));
      }},world.time);
    }
    session.doruProjectiles=(session.doruProjectiles||[]).filter(p=>!p.done);
  }
  function isNekoForm(){return !!(game?.zoanTransformed&&equippedZoan()?.id==='akuma_neko_leopard');}
  function ryuSkillActive(){return !!(isRyuForm()&&session?.ryuAction);}
  function clearRyuState(){if(session?.ryuAction){session.ryuAction.cancelled=true;if(akumaBackend)void akumaRequest('end-protection',{}).catch(error=>console.warn('Ação Ryu não sincronizada:',error));}if(session)session.ryuAction=null;}
  function ryuEnemies(){return livingMobs().map(m=>({id:m.id,x:m.x,y:m.y,alive:m.alive,defense:enemyArmor(m),fruitId:m.fruitId||m.equippedFruitId,physicalDamageReduction:m.physicalDamageReduction||0,isUntargetable:!!m.isUntargetable,isInvulnerable:!!m.isInvulnerable}));}
  function ryuTargetValid(m){return m?.alive&&!m.isUntargetable&&!m.isInvulnerable&&distance(world.hero,m)<=MareRyu.rules.range&&combatLine(world.hero,m);}
  async function useRyuSkill(fruit,skill,manual){
    if(scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||ryuSkillActive())return false;
    const target=world.target,stats=getDerived(),id=MareAkuma.cooldownKey(fruit.id,skill.key);
    if(!isRyuForm()||world.hero.talentControl?.remaining>0||!ryuTargetValid(target)){if(manual)toast('Transforme-se e selecione um alvo vivo a até 1,5 tile.');return false;}
    if(Date.now()<(game.fruitCooldowns?.[id]||0)||game.energy<skill.cost){if(manual)toast(game.energy<skill.cost?'Energia insuficiente.':'Habilidade em recarga.');return false;}
    const active=session,area=game.area,hasHaki=!!skill.hasHaki||session.haki.active==='armament';active.fruitCastPending=true;
    try{
      const response=akumaBackend?await akumaRequest('cast',{instance:area,x:world.hero.x,y:world.hero.y,enemies:ryuEnemies(),skill_key:skill.key,energy:game.energy,physical_attack:stats.physical,target_id:target.id,rank_c_context:{penetration:stats.penetration||0,hasHaki,controlled:false}}):null;
      if(session!==active||game.area!==area||scene!=='hunt'||game.hp<=0||!isRyuForm()||world.hero.talentControl?.remaining>0)return false;
      cancelBasicAttack();faceCombatTarget(target);travelPath=[];world.hero.walking=0;world.hero.attackAnim=0;
      active.ryuAction={key:skill.key,targetId:target.id,started:world.time,direction:world.hero.direction,attack:stats.physical,penetration:stats.penetration||0,hasHaki,hit:false,token:response?.effect?.token,area};
      game.energy=Math.max(0,game.energy-skill.cost);active.skillEnergySpent+=skill.cost;active.skillUses[Number(skill.key)-1]++;
      game.fruitCooldowns ||= {};game.fruitCooldowns[id]=Date.now()+skill.cooldown*1000;active.fruitCooldown=skill.cooldown;saveGame();updateUI();return true;
    }catch(error){if(manual)toast(error.message,'danger');return false;}finally{active.fruitCastPending=false;}
  }
  function stepRyuAction(){
    for(const m of world.mobs)if(m.ryuStunUntil&&world.time>=m.ryuStunUntil){delete m.ryuStunUntil;m.isStunned=MareRankB.stunned(m,world.time)||m.talentControl?.remaining>0||m.bisonStunUntil>world.time;}
    const a=session.ryuAction;if(!a)return;
    if(!isRyuForm()||scene!=='hunt'||game.hp<=0||session.respawn>0||a.area!==game.area||world.hero.talentControl?.remaining>0){clearRyuState();return;}
    const elapsed=world.time-a.started,timing=MareRyu.timing(a.key,a.direction);
    if(!a.hit&&elapsed>=timing.impact){
      a.hit=true;const target=world.mobs.find(m=>String(m.id)===String(a.targetId)),active=session,skill=MareRyu.skill(a.key);
      if(ryuTargetValid(target)){
        const apply=result=>{if(a.cancelled||session!==active||!isRyuForm()||scene!=='hunt'||a.area!==game.area||game.hp<=0||world.hero.talentControl?.remaining>0||!target.alive)return;outputDamage(target,result.damage,false,{skillKey:a.key});if(result.stunDuration&&target.alive)MareRyu.stun(target,world.time);};
        if(akumaBackend&&a.token){active.ryuImpactPending=(active.ryuImpactPending||0)+1;void akumaRequest('ryu-impact',{token:a.token,instance:game.area,x:world.hero.x,y:world.hero.y,enemies:ryuEnemies(),controlled:false}).then(apply).catch(error=>{active.ryuSyncError=error.message;console.warn('Impacto Ryu não sincronizado:',error);}).finally(()=>active.ryuImpactPending--);}
        else apply({damage:MareRyu.damage(a.attack,enemyArmor(target),skill.multiplier,a.penetration,target,a.hasHaki),stunDuration:skill.stunDuration||0});
      }
    }
    if(elapsed>=timing.duration)session.ryuAction=null;
  }
  function isRyuForm(){return !!(game?.zoanTransformed&&equippedZoan()?.id===MareRyu.rules.id);}
  function isWolfForm(){return !!(game?.zoanTransformed&&equippedZoan()?.id===MareWolf.rules.id);}
  function wolfAuraActive(){return !!session&&MareWolf.auraActive({equipped:equippedZoan()?.id,transformed:game?.zoanTransformed,hp:game?.hp,until:session.wolfAuraUntil});}
  function wolfSkillActive(){return !!(isWolfForm()&&session?.wolfAction);}
  function clearWolfState(){if(!session)return;const active=session.wolfAuraUntil>0;session.wolfAction=null;session.wolfAuraUntil=0;session.wolfBasicUntil=0;if(active&&akumaBackend)void akumaRequest('end-protection',{}).catch(error=>console.warn('Aura não sincronizada:',error));}
  function stepWolfAction(dt){
    const a=session?.wolfAction;if(!a)return;
    if(!isWolfForm()||scene!=='hunt'||game.hp<=0||session.respawn>0||world.hero.talentControl?.remaining>0){session.wolfAction=null;return;}
    if(a.phase==='finish'){if(world.time-a.finished>=4/12)session.wolfAction=null;return;}
    const target=world.mobs.find(m=>String(m.id)===String(a.targetId)&&m.alive);
    if(!target||world.time-a.started>=MareWolf.rules.chargeTimeout){session.wolfAction=null;return;}
    let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    if(!dx&&!dy){dx=target.x-world.hero.x;dy=target.y-world.hero.y;}
    const length=Math.hypot(dx,dy);if(length>.001){a.dx=dx/length;a.dy=dy/length;world.hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');world.hero.facing=dx<0?-1:dx>0?1:world.hero.facing;}
    let budget=Math.min(MareWolf.rules.range-a.travel,MareWolf.rules.chargeSpeed*dt);
    while(budget>0&&a.phase==='charge'){
      const amount=Math.min(budget,8),from={x:world.hero.x,y:world.hero.y},to={x:from.x+a.dx*amount,y:from.y+a.dy*amount};
      if(!navigator().clear(from,to)||!navigator().walkable(to.x,to.y)){session.wolfAction=null;return;}
      navigator().move(world.hero,a.dx*amount,a.dy*amount);const moved=distance(from,world.hero);if(moved<.01){session.wolfAction=null;return;}a.travel+=moved;budget-=amount;world.hero.walking=.2;
      if(MareNeko.segmentHit(from,world.hero,target,MareWolf.rules.hitRadius)){
        a.phase='finish';a.finished=world.time;world.hero.walking=0;
        outputDamage(target,MareWolf.damage(a.attack,enemyArmor(target),1));
        if(target.alive)target.wolfBleed={started:world.time,nextTick:1,attack:a.attack};else world.fx.push({wolfImpact:true,x:target.x,y:target.y,started:world.time,life:MareWolf.effects.bleed.duration/1000,max:MareWolf.effects.bleed.duration/1000});
      }
    }
    if(a.phase==='charge'&&a.travel>=MareWolf.rules.range-.01)session.wolfAction=null;
  }
  function stepWolfBleeds(){for(const mob of world.mobs){const bleed=mob.wolfBleed;if(!bleed)continue;if(!mob.alive){delete mob.wolfBleed;continue;}for(const tick of MareWolf.dueTicks(bleed,world.time)){if(!mob.alive)break;outputDamage(mob,MareWolf.damage(bleed.attack,enemyArmor(mob),.2),false,{exclusive:true});}if(bleed.nextTick>5)delete mob.wolfBleed;}}
  function isUshiForm(){return !!(game?.zoanTransformed&&equippedZoan()?.id===MareUshi.rules.id);}
  function ushiSkillActive(){return !!(isUshiForm()&&session?.ushiAction);}
  function ushiBuffActive(){return !!session&&MareUshi.buffActive({equipped:equippedZoan()?.id,transformed:game?.zoanTransformed,hp:game?.hp,until:session.ushiBuffUntil});}
  function clearUshiState(){if(!session)return;const active=session.ushiBuffUntil>0;session.ushiAction=null;session.ushiBasicUntil=0;session.ushiBuffUntil=0;if(active&&akumaBackend)void akumaRequest('end-protection',{}).catch(error=>console.warn('Proteção não sincronizada:',error));}
  function stepUshiAction(){
    const action=session?.ushiAction;if(!action)return;
    if(!isUshiForm()||scene!=='hunt'||game.hp<=0||session.respawn>0||world.hero.talentControl?.remaining>0){session.ushiAction=null;return;}
    const elapsed=world.time-action.started;
    if(!action.hit&&elapsed>=MareUshi.rules.impactAt){
      action.hit=true;const target=world.mobs.find(m=>String(m.id)===String(action.targetId)&&m.alive);
      if(target&&distance(world.hero,target)<=MareUshi.rules.range&&MareUshi.frontal(world.hero,target,action.direction||zoanDirection())&&combatLine(world.hero,target)){
        outputDamage(target,MareUshi.damage(getDerived().physical,enemyArmor(target),getDerived().penetration));
        if(target.alive&&!MareDoru.isRooted(target,world.time)){const dest=MareUshi.knockback(world.hero,target,(from,to)=>navigator().clear(from,to)&&navigator().walkable(to.x,to.y)&&!livingMobs().some(m=>m!==target&&distance(m,to)<24));target.x=dest.x;target.y=dest.y;target.patrolTarget=null;}
      }
    }
    if(elapsed>=MareUshi.rules.headbuttDuration)session.ushiAction=null;
  }
  function nekoSkillActive(){return !!(isNekoForm()&&session?.nekoAction);}
  function cancelNekoAction(){if(session){session.nekoAction=null;session.nekoBasicUntil=0;}if(world?.hero)world.hero.attackAnim=0;}
  function stepNekoAction(dt){
    const action=session?.nekoAction;if(!action)return;
    if(!isNekoForm()||scene!=='hunt'||game.hp<=0||session.respawn>0||world.hero.talentControl?.remaining>0){cancelNekoAction();return;}
    const target=world.mobs.find(m=>String(m.id)===String(action.targetId)&&m.alive),elapsed=(world.time-action.started)*1000;
    if(action.kind==='dash'){
      let budget=MareNeko.rules.dashSpeed*dt;
      while(action.remaining>0&&budget>0){
        const step=Math.min(action.remaining,budget,8),from={x:world.hero.x,y:world.hero.y},next={x:from.x+action.dx*step,y:from.y+action.dy*step};
        if(!navigator().clear(from,next)||!navigator().walkable(next.x,next.y)){action.remaining=0;}
        else{navigator().move(world.hero,action.dx*step,action.dy*step);action.remaining-=step;budget-=step;
          if(!action.hit&&target&&MareNeko.segmentHit(from,world.hero,target)){
            action.hit=true;action.visualHitAt=world.time;const critical=MareNeko.backstab(world.hero.x-from.x,world.hero.y-from.y,target.emberFacing||'south');
            outputDamage(target,MareCharacters.damage(getDerived(),enemyArmor(target),{type:'physical',multiplier:MareNeko.rules.skills[0].damage_multiplier,critical}),critical);
          }
        }
      }
      if(elapsed>=750)cancelNekoAction();
    }else{
      if(!target){cancelNekoAction();return;}
      for(const hit of MareNeko.dueHits(action,elapsed)){
        if(!target.alive)break;
        if(distance(world.hero,target)<=MareNeko.rules.comboRange&&combatLine(world.hero,target))outputDamage(target,MareCharacters.damage(getDerived(),enemyArmor(target),{type:'physical',multiplier:MareNeko.rules.skills[1].damage_multiplier}));
      }
      if(elapsed>=MareNeko.rules.comboDuration)cancelNekoAction();
    }
  }
  function zoanDirection(){return ({front:[0,1],back:[0,-1],left:[-1,0],right:[1,0]})[world.hero.direction]||[0,1];}
  function syncZoanTransition(){
    if(!game||!session||!world)return;
    session.zoanTransition ||= MareZoanTransition.create();
    if(game.hp<=0||session.respawn>0){MareZoanTransition.clear(session.zoanTransition);return;}
    MareZoanTransition.observe(session.zoanTransition,MareZoanTransition.profile(equippedZoan(),!!game.zoanTransformed,MareUltimates.selected(game)==='titan'?1.35:1),world.time);
  }
  async function toggleZoanTransform(){
    const fruit=equippedZoan();if(!fruit||!game)return false;
    const enabled=!game.zoanTransformed;
    if(akumaBackend){try{await akumaRequest('transform',{enabled});}catch(error){toast(error.message,'danger');return false;}}
    cancelBasicAttack();cancelNekoAction();clearUshiState();clearWolfState();clearRyuState();clearExpansion();game.zoanTransformed=enabled;syncZoanTransition();world.hero.attackAnim=0;session.zoanDash=null;saveGame();updateUI();renderPortrait();
    if(currentPanel)renderPanel();toast(enabled?'Forma Zoan ativada.':'Forma humana restaurada.','good');return true;
  }


  function jikiEquipped(){return MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id===MareJiki.rules.id;}
  function jikiElapsed(c){return Math.max(0,(world.time-c.started)*1000,Date.now()-c.realStarted);}
  function clearJiki(sync=true){if(!session)return;const active=!!session.jikiCharge||(session.jikiShots||[]).length>0;session.jikiCharge=null;session.jikiShots=[];session.jikiFx=[];session.jikiFruitId=null;if(active&&sync&&akumaBackend)void akumaRequest('end-protection',{}).catch(()=>{});}
  function jikiClear(a,b){return combatLine(a,b);}
  function jikiPoint(){
    const h=world.hero,c=session.jikiCharge,m=world.target?.alive?world.target:null;let point=m&&distance(h,m)<=MareJiki.rules.range?{x:m.x,y:m.y}:c?.point;
    if(!point){const d=zoanDirection();point={x:h.x+d[0]*MareJiki.rules.range,y:h.y+d[1]*MareJiki.rules.range};}
    const d=distance(h,point);if(d>MareJiki.rules.range)point={x:h.x+(point.x-h.x)/d*MareJiki.rules.range,y:h.y+(point.y-h.y)/d*MareJiki.rules.range};return point;
  }
  async function releaseJiki(manual=false){
    const c=session.jikiCharge;if(!c||c.releasing||!jikiEquipped()||scene!=='hunt'||game.hp<=0||MareRankC.controlled(world.hero,world.time))return false;
    c.releasing=true;const initial=session,area=game.area,origin={x:world.hero.x,y:world.hero.y},point=jikiPoint();let v=MareJiki.chargeValues(jikiElapsed(c)),response;
    try{
      if(akumaBackend)response=await akumaRequest('jiki-release',{token:c.token,instance:area,...origin,point,controlled:false});
      if(session!==initial||session.jikiCharge!==c||!jikiEquipped()||game.area!==area||scene!=='hunt'||game.hp<=0)return false;
      if(response)v={...v,...response.effect};session.jikiCharge=null;session.jikiShots ||= [];
      session.jikiShots.push(MareJiki.projectile('mass',origin,point,null,{attack:c.attack,penetration:c.penetration,multiplier:v.multiplier,scale:v.scale,token:response?.effect.token,launched:world.time,initialDistance:distance(origin,point),lift:120+48*v.scale}));updateUI();return true;
    }catch(e){if(manual)toast(e.message,'danger');if(session===initial&&session.jikiCharge===c){session.jikiCharge=null;if(akumaBackend)void akumaRequest('jiki-cancel-charge',{}).catch(()=>{});}return false;}
  }
  async function useJikiSkill(fruit,skill,manual){
    if(skill.key==='1'&&session.jikiCharge)return manual?releaseJiki(true):false;
    if(scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||MareRankC.controlled(world.hero,world.time))return false;
    const target=world.target?.alive?world.target:null;if(skill.key==='2'&&(!target||distance(world.hero,target)>MareJiki.rules.range||!jikiClear(world.hero,target))){if(manual)toast('Selecione um alvo vivo a até 4 tiles, com caminho livre.');return false;}
    const cd=MareAkuma.cooldownKey(fruit.id,skill.key);if(game.energy<skill.cost||Date.now()<(game.fruitCooldowns?.[cd]||0))return false;
    const initial=session,area=game.area,stats=getDerived(),origin={x:world.hero.x,y:world.hero.y};session.fruitCastPending=true;let response;
    try{
      if(akumaBackend)response=await akumaRequest('cast',{instance:area,...origin,skill_key:skill.key,energy:game.energy,physical_attack:stats.physical,target_id:target?.id,enemies:rankBEnemies(),rank_c_context:{penetration:stats.penetration||0,controlled:false}});
      if(session!==initial||scene!=='hunt'||game.area!==area||!jikiEquipped()||game.hp<=0)return false;
      session.jikiFruitId=fruit.id;session.jikiShots ||= [];session.jikiFx ||= [];
      if(skill.key==='1'){cancelBasicAttack();classCombatController()?.reset(world.hero.direction);session.jikiCharge={started:world.time,realStarted:Date.now(),attack:stats.physical,penetration:stats.penetration||0,token:response?.effect.token,point:target?{x:target.x,y:target.y}:null};}
      else if(target?.alive)session.jikiShots.push(MareJiki.projectile('rocket',origin,target,target.id,{attack:stats.physical,penetration:stats.penetration||0,multiplier:2.5,token:response?.effect.token,launched:world.time}));
      game.energy=Math.max(0,game.energy-(response?.energy_spent??skill.cost));game.fruitCooldowns ||= {};game.fruitCooldowns[cd]=response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+skill.cooldown*1000;session.skillEnergySpent+=skill.cost;session.skillUses[Number(skill.key)-1]++;saveGame();updateUI();return true;
    }catch(e){if(manual)toast(e.message,'danger');return false;}finally{initial.fruitCastPending=false;}
  }
  function jikiImpact(p,result){
    session.jikiFx ||= [];session.jikiFx.push({kind:p.kind==='mass'?'blast':'rocket',x:p.x,y:p.y-24,started:world.time,angle:p.angle||0});
    const initial=session,area=game.area,targets=result.hit?livingMobs().filter(m=>(p.kind==='mass'?distance(p,m)<=MareJiki.rules.radius:String(m.id)===String(p.targetId)&&distance(p,m)<=MareJiki.rules.hitRadius+2)&&jikiClear(p,m)):[];
    const apply=hits=>{if(session!==initial||game.area!==area||!jikiEquipped()||scene!=='hunt'||game.hp<=0)return;for(const hit of hits){const m=world.mobs.find(m=>String(m.id)===String(hit.id)&&m.alive);if(m)outputDamage(m,hit.damage);}};
    if(akumaBackend&&p.token)void akumaRequest('jiki-impact',{token:p.token,instance:area,x:p.x,y:p.y,hit:!!result.hit,enemies:targets.map(m=>({id:m.id,x:m.x,y:m.y,hp:m.hp,alive:m.alive,defense:enemyArmor(m)}))}).then(r=>apply(r.hits)).catch(e=>console.warn('Impacto Jiki:',e.message));
    else apply(targets.map(m=>({id:m.id,damage:MareCharacters.damage({physical:p.attack},enemyArmor(m)*(1-p.penetration),{type:'physical',multiplier:p.multiplier})})));
  }
  function stepJiki(dt){
    if(!jikiEquipped()||scene!=='hunt'||game.hp<=0||session.respawn>0){if(session.jikiFruitId||session.jikiCharge||(session.jikiShots||[]).length||(session.jikiFx||[]).length)clearJiki();return;}
    const c=session.jikiCharge;if(c){if(MareRankC.controlled(world.hero,world.time)){session.jikiCharge=null;if(akumaBackend)void akumaRequest('jiki-cancel-charge',{}).catch(()=>{});}else{const m=world.target;if(m?.alive&&distance(world.hero,m)<=MareJiki.rules.range)c.point={x:m.x,y:m.y};if(jikiElapsed(c)>=MareJiki.rules.chargeDuration&&!c.releasing)void releaseJiki();}}
    for(const p of session.jikiShots||[]){const hit=MareJiki.step(p,Math.min(dt,Math.max(0,world.time-p.launched)),world.mobs,jikiClear);if(hit)jikiImpact(p,hit);}
    session.jikiShots=(session.jikiShots||[]).filter(p=>!p.done);session.jikiFx=(session.jikiFx||[]).filter(f=>MareJiki.frame(f.kind,(world.time-f.started)*1000,f.kind==='rocket'?'impact':'once'));
  }
  function drawJiki(){
    const J=MareJiki,c=session.jikiCharge;if(c){const v=J.chargeValues(jikiElapsed(c)),size=96*v.scale,x=world.hero.x,y=world.hero.y-120-size/2;J.draw(ctx,'charge',x,y,0,{width:size});
      for(let i=0;i<14;i++){const phase=(world.time*1.7+i/14)%1,angle=i*2.399,r=(1-phase)*95,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r;ctx.fillStyle=i%2?'#9a8f7f':'#514a42';ctx.fillRect(Math.round(px),Math.round(py),3+i%3,2+i%2);}
      px(ctx,x-50,world.hero.y-108,100,8,'#10202b');px(ctx,x-49,world.hero.y-107,98*v.progress,6,'#d2b17d');ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillStyle='#f3e2c6';ctx.fillText('Sucata '+(v.progress*6).toFixed(1)+' / 6s · '+Math.round(v.multiplier*100)+'%',x,world.hero.y-113);
    }
    for(const p of session.jikiShots||[]){const lift=p.kind==='mass'?24+(p.lift-24)*(1-Math.min(1,p.travel/(p.initialDistance||1))):24;J.draw(ctx,p.kind==='mass'?'charge':'rocket',p.x,p.y-lift,p.elapsed*1000,{width:p.kind==='mass'?96*p.scale:96,phase:p.kind==='mass'?'once':'flight',angle:p.kind==='rocket'?(p.angle||0)+Math.PI/4:0});}
    for(const f of session.jikiFx||[])J.draw(ctx,f.kind,f.x,f.y,(world.time-f.started)*1000,{width:f.kind==='blast'?320:96,phase:f.kind==='rocket'?'impact':'once',angle:f.kind==='rocket'?f.angle+Math.PI/4:0});
  }

  function hoyaEquipped(){return MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id===MareHoya.rules.id;}
  function hoyaActive(){return scene==='hunt'&&hoyaEquipped()&&game?.hp>0&&MareHoya.active(session?.genie,world.time);}
  function combatFocus(){return hoyaActive()?session.genie:world.hero;}
  function clearHoya(sync=true){
    const g=session?.genie;if(g){g.commandSeq++;g.clock.reset();session.genie=null;if(sync&&akumaBackend)void akumaRequest('end-protection',{}).catch(()=>{});for(const m of world?.mobs||[])m.telegraph=null;}
    if(world?.hero){world.hero.isUntargetable=false;world.hero.isInvulnerable=false;}
  }
  async function cancelHoya(){
    if(!hoyaActive()||session.fruitCastPending)return false;
    const initial=session,g=session.genie;session.fruitCastPending=true;
    try{
      if(akumaBackend)await akumaRequest('hoya-cancel',{instance:game.area});
      if(session!==initial||session.genie!==g)return false;
      clearHoya(false);world.hero.walking=0;camera.update(world.hero,activeMap(),0,true);saveGame();updateUI();
      toast('Gênio cancelado. A recarga continua contando.');return true;
    }catch(error){toast(error.message,'danger');return false;}finally{initial.fruitCastPending=false;}
  }
  async function useHoyaSkill(fruit,skill,manual){
    if(skill.key==='1'&&hoyaActive())return manual?cancelHoya():false;
    if(scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||MareRankC.controlled(world.hero,world.time))return false;
    if(skill.key==='2'&&!hoyaActive()||skill.key==='1'&&hoyaActive())return false;
    const cd=MareAkuma.cooldownKey(fruit.id,skill.key);if(game.energy<skill.cost||Date.now()<(game.fruitCooldowns?.[cd]||0))return false;
    const origin={x:world.hero.x,y:world.hero.y},total=getDerived(),stats=Object.fromEntries(Object.entries(total).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)&&v>=0));
    const summon=[{x:origin.x+96,y:origin.y},{x:origin.x-96,y:origin.y},{x:origin.x,y:origin.y+96},{x:origin.x,y:origin.y-96}].find(p=>navigator().walkable(p.x,p.y)&&navigator().clear(origin,p));
    if(skill.key==='1'&&!summon){if(manual)toast('Libere espaço ao lado do personagem.');return false;}
    const initial=session,area=game.area;let response;session.fruitCastPending=true;
    try{
      if(akumaBackend){try{response=await akumaRequest('cast',{instance:area,...origin,skill_key:skill.key,energy:game.energy,rank_c_context:{stats,summon,controlled:false}});}catch(e){if(manual)toast(e.message,'danger');return false;}}
      if(session!==initial||scene!=='hunt'||game.area!==area||!hoyaEquipped()||game.hp<=0)return false;
      if(skill.key==='1'){
        cancelBasicAttack();classCombatController()?.reset(world.hero.direction);travelPath=[];session.zoanDash=null;world.hero.walking=0;
        session.genie=MareHoya.create(stats,summon.x,summon.y,world.time);session.genie.started=world.time;session.genie.area=area;MareRankC.cleanse(world.hero);
        world.hero.isUntargetable=true;world.hero.isInvulnerable=true;for(const m of world.mobs)m.telegraph=null;
        toast('Gênio invocado: clique no chão ou em um inimigo para comandá-lo.','good');
      }else if(!MareHoya.empower(session.genie,world.time))return false;
      game.energy=Math.max(0,game.energy-(response?.energy_spent??skill.cost));game.fruitCooldowns ||= {};game.fruitCooldowns[cd]=response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+skill.cooldown*1000;
      session.skillEnergySpent+=skill.cost;session.skillUses[Number(skill.key)-1]++;saveGame();updateUI();return true;
    }finally{initial.fruitCastPending=false;}
  }
  function commandHoya(point){
    if(!hoyaActive())return false;const g=session.genie;
    const target=livingMobs().find(m=>activeMap().id==='rare'&&m.type==='cocox'?MareRareRenderer.cocoxHitTest(m,point.x,point.y):Math.hypot(m.x-point.x,m.y-30-point.y)<48);
    const goal=target||point,path=navigator().path(g,goal);if(!path.length&&distance(g,goal)>MareHoya.rules.range)return false;
    g.commandSeq++;g.targetId=target?.id??null;g.path=path;pursuit.delete(g);world.target=target||null;
    // Finish the current swing before accepting a new attack, preserving its single impact latch.
    if(akumaBackend)void akumaRequest('hoya-command',{instance:game.area,x:goal.x,y:goal.y,target_id:target?.id}).catch(()=>{});
    updateUI();return true;
  }
  async function startHoyaAttack(g,target){
    const seq=g.commandSeq,initial=session,area=game.area;g.pending=true;
    const enemy=()=>({id:target.id,x:target.x,y:target.y,alive:target.alive,defense:enemyArmor(target)});let response;
    try{
      if(akumaBackend)response=await akumaRequest('hoya-attack',{instance:area,x:g.x,y:g.y,target:enemy()});
      if(session!==initial||session.genie!==g||!hoyaActive()||seq!==g.commandSeq||!target.alive)return;
      const dx=target.x-g.x,dy=target.y-g.y;g.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';
      g.clock.play('attack',{direction:g.direction,attackSpeed:MareHoya.stats(g,world.time).speed,onImpact:()=>{
        if(!hoyaActive()||session.genie!==g||!target.alive||g.targetId!==target.id||distance(g,target)>MareHoya.rules.range+2||!combatLine(g,target))return;
        const apply=result=>{if(session!==initial||session.genie!==g||!hoyaActive()||!target.alive||g.targetId!==target.id||distance(g,target)>MareHoya.rules.range+2||!combatLine(g,target))return;const s=MareHoya.stats(g,world.time);const dealt=outputDamage(target,result?.damage??MareCharacters.damage({physical:s.attack},enemyArmor(target)*(1-(s.penetration||0)),{type:'physical'}));g.hp=Math.min(s.maxHP,g.hp+dealt*(s.lifesteal||0));};
        if(akumaBackend)void akumaRequest('hoya-impact',{token:response.token,instance:area,x:g.x,y:g.y,target:enemy()}).then(apply).catch(()=>{});else apply();
      }});
    }catch{g.retryUntil=world.time+.25;}finally{g.pending=false;}
  }
  function stepHoya(dt){
    const g=session?.genie;if(!g)return;if(!hoyaActive()||g.area!==game.area){clearHoya();return;}
    MareHoya.sync(g,world.time,dt);MareRankC.cleanse(world.hero);world.hero.isUntargetable=true;world.hero.isInvulnerable=true;world.hero.walking=0;
    g.walking=Math.max(0,g.walking-dt);g.clock.step(dt,{moving:g.walking>0,inCombat:true,direction:g.direction});
    if(g.clock.locked()||g.pending||g.retryUntil>world.time)return;
    const target=world.mobs.find(m=>m.id===g.targetId&&m.alive&&m.hp>0),s=MareHoya.stats(g,world.time),before={x:g.x,y:g.y};
    if(target){if(distance(g,target)>MareHoya.rules.range-8||!combatLine(g,target))navigateEntity(g,target,s.moveSpeed,dt,MareHoya.rules.range-8);else void startHoyaAttack(g,target);}
    else{g.targetId=null;MareRankB.followGlide(g,g.path,s.moveSpeed,dt,navigator());}
    if(distance(before,g)>.01){g.walking=.15;const dx=g.x-before.x,dy=g.y-before.y;g.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';}
  }
  function receiveEnemyAttack(opponent,amount,source,physical=true,direct=false,reflected=false,damageType=null){
    if(opponent===world.hero)return takeDamage(amount,source,physical,direct,reflected,damageType);
    if(!hoyaActive()||opponent!==session.genie)return;const g=opponent,s=MareHoya.stats(g,world.time),defense=physical?s.defense:s.magicDefense??s.defense;
    const damage=Math.max(1,Math.floor(amount*100/(100+defense*3)*(1-(s.mitigation||0))));const hpBefore=g.hp;g.hp=Math.max(0,g.hp-damage);MareSpriteCombatV2.hurt(g,hpBefore-g.hp,world.time,{protected:g.hp<=0});spawnVisual(g.x,g.y-80,'−'+damage,'#f79c90',14);
    if(akumaBackend)void akumaRequest('hoya-damage',{amount,physical}).catch(()=>{});
    if(g.hp<=0){clearHoya();toast('O Gênio foi derrotado. Sua proteção terminou.','danger');}
  }
  function drawHoyaGenie(g){
    if(MareHoya.empowered(g,world.time))MareHoya.drawEffect(ctx,'buff',g.x,g.y-64*g.scale,(world.time-g.started)*1000,{width:128*g.scale,height:128*g.scale});
    MareHoya.drawActor(ctx,g,world.time);const stats=MareHoya.stats(g,world.time);drawCombatHeader(g,'Gênio · '+Math.ceil(Math.min(g.until-world.time,(g.realUntil-Date.now())/1000))+'s',g.hp,stats.maxHP,64,'#67d8f3');
  }

  function betaEquipped(){return MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id===MareRankB.rules.beta.id;}
  function clearRankB(){
    if(!session)return;const active=(session.rankBJobs||[]).length>0;session.rankBJobs=[];session.rankBBursts=[];session.rankBFruitId=null;
    for(const m of world?.mobs||[]){delete m.betaRootUntil;delete m.hanaStunFrom;delete m.hanaStunUntil;m.isRooted=MareDoru.isRooted(m,world.time);m.isStunned=m.talentControl?.remaining>0||m.bisonStunUntil>world.time;m.isImmobilized=false;}
    if(active&&akumaBackend)void akumaRequest('end-protection',{}).catch(()=>{});
  }
  function rankBEnemies(){return livingMobs().map(m=>({id:m.id,x:m.x,y:m.y,hp:m.hp,maxHP:m.maxHP,attack:m.attack,alive:m.alive,defense:enemyArmor(m),magicDefense:enemyArmor(m,true)}));}
  function rankBHit(m,power,multiplier,magic=false,penetration=0,visual={}){return outputDamage(m,MareCharacters.damage({physical:magic?0:power,elemental:magic?power:0},enemyArmor(m,magic)*(1-penetration),{type:magic?'elemental':'physical',multiplier}),false,visual);}
  function stepRankB(){
    const now=world.time,X=MareRankB;session.rankBJobs=(session.rankBJobs||[]).filter(job=>{
      const m=world.mobs.find(m=>String(m.id)===String(job.targetId)&&m.alive&&m.hp>0);if(!m)return false;
      const elapsed=(now-job.started)*1000;
      if(job.kind==='root'){m.isRooted=X.rooted(m,now)||MareDoru.isRooted(m,now);return X.rooted(m,now);}
      if(job.kind==='choke'){if(!Number.isFinite(m.hanaStunUntil))return false;m.isStunned=X.stunned(m,now)||m.talentControl?.remaining>0||m.bisonStunUntil>now;m.isImmobilized=X.stunned(m,now);if(X.stunned(m,now))m.telegraph=null;}
      for(const index of X.due(job,elapsed)){
        if(!m.alive)break;
        if(akumaBackend&&job.token)void akumaRequest('rank-b-tick',{token:job.token,index,instance:game.area,enemies:rankBEnemies()}).catch(e=>console.warn('Tick Rank B:',e.message));
        rankBHit(m,job.power,job.kind==='punch'?.8:.9,false,job.penetration,{exclusive:job.kind==='choke'});
      }
      if(elapsed>=(job.kind==='punch'?X.effects.punch.duration:X.chokeEnd)||!m.alive){if(job.kind==='choke'){delete m.hanaStunFrom;delete m.hanaStunUntil;m.isStunned=m.talentControl?.remaining>0||m.bisonStunUntil>now;m.isImmobilized=false;}return false;}return true;
    });
    for(const m of world.mobs){if(m.betaRootUntil<=now){delete m.betaRootUntil;m.isRooted=MareDoru.isRooted(m,now);}if(m.hanaStunUntil<=now){delete m.hanaStunFrom;delete m.hanaStunUntil;m.isStunned=m.talentControl?.remaining>0||m.bisonStunUntil>now;m.isImmobilized=false;}}
    session.rankBBursts=(session.rankBBursts||[]).filter(f=>(now-f.started)*1000<X.effects.burst.duration);
  }
  async function useRankBSkill(fruit,skill,manual){
    const X=MareRankB,beta=fruit.id===X.rules.beta.id,target=world.target?.alive?world.target:null,view={x:camera.x,y:camera.y,width:W,height:H},cd=MareAkuma.cooldownKey(fruit.id,skill.key);
    if(scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||MareRankC.controlled(world.hero,world.time))return false;
    if(!(beta&&skill.key==='1')&&(!target||!X.visible(target,view)||!beta&&skill.key==='1'&&distance(world.hero,target)>128)){if(manual)toast('Selecione um alvo vivo, visível e ao alcance.');return false;}
    if(game.energy<skill.cost||Date.now()<(game.fruitCooldowns?.[cd]||0))return false;
    const initial=session,area=game.area,origin={x:world.hero.x,y:world.hero.y},stats=getDerived(),power=beta?stats.elemental:stats.physical,penetration=beta?stats.magicPen||0:stats.penetration||0;let response;session.fruitCastPending=true;
    try{
      if(akumaBackend){try{response=await akumaRequest('cast',{instance:area,...origin,enemies:rankBEnemies(),skill_key:skill.key,energy:game.energy,physical_attack:stats.physical,target_id:target?.id,rank_c_context:{view,special_attack:stats.elemental,penetration:stats.penetration||0,magic_penetration:stats.magicPen||0,controlled:false}});}catch(e){if(manual)toast(e.message,'danger');return false;}}
      if(session!==initial||scene!=='hunt'||area!==game.area||game.hp<=0||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;
      session.rankBJobs ||= [];session.rankBBursts ||= [];session.rankBFruitId=fruit.id;
      if(beta&&skill.key==='1'){
        session.rankBBursts.push({...origin,started:world.time});for(const m of livingMobs())if(distance(origin,m)<=128)rankBHit(m,power,1.5,true,penetration);
      }else{
        if(!target?.alive||!world.mobs.includes(target))return false;const kind=beta?'root':skill.key==='1'?'punch':'choke';
        const job={kind,targetId:target.id,started:world.time,power,penetration,next:0,token:response?.effect.token};session.rankBJobs.push(job);
        if(kind==='root'){target.betaRootUntil=world.time+4;target.isRooted=true;target.moving=0;}
        if(kind==='choke'){rankBHit(target,power,1,false,penetration,{skillKey:'2'});target.hanaStunFrom=world.time+X.chokeLead/1000;target.hanaStunUntil=world.time+X.chokeEnd/1000;}
      }
      game.energy=Math.max(0,game.energy-(response?.energy_spent??skill.cost));game.fruitCooldowns ||= {};game.fruitCooldowns[cd]=response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+MareAkumaPassives.cooldown(skill.cooldown,fruit.id)*1000;session.skillEnergySpent+=skill.cost;session.skillUses[Number(skill.key)-1]++;saveGame();updateUI();return true;
    }finally{initial.fruitCastPending=false;}
  }
  function drawRankB(){
    const X=MareRankB;
    for(const f of session.rankBBursts||[])X.drawBurst(ctx,f,(world.time-f.started)*1000);
    for(const job of session.rankBJobs||[]){const m=world.mobs.find(m=>String(m.id)===String(job.targetId)&&m.alive);if(!m)continue;const elapsed=(world.time-job.started)*1000;if(job.kind==='root'){X.drawTether(ctx,world.hero,m,elapsed);X.drawLegs(ctx,m,elapsed);}else if(job.kind==='choke')X.draw(ctx,job.kind,m.x,m.y-40,elapsed,{width:104,height:104});}
  }
  function isBisonForm(){return !!(game?.zoanTransformed&&equippedZoan()?.id===MareRankCExpansion.rules.bison.id);}
  function bisonSkillActive(){return !!(isBisonForm()&&session?.bisonAction);}
  function bisonShellActive(){return !!(isBisonForm()&&game.hp>0&&session?.bisonShellUntil>Date.now());}
  function clearExpansion(){
    if(game?.bisonHPScale){game.hp=Math.max(0,game.hp/game.bisonHPScale);delete game.bisonHPScale;}
    if(!session)return;for(const ally of session.kobuRecipients||[])delete (ally.status||ally).kobuSupportUntil;session.kobuRecipients=[];const active=session.expansionFruitId;session.bisonAction=null;session.bisonShellUntil=0;session.expansionShots=[];session.expansionFx=[];session.kobuFlags=[];session.kobuSupportUntil=0;session.kobuTickAt=0;session.expansionFruitId=null;
    if(world?.mobs)for(const m of world.mobs)delete m.kobuDebuffUntil;
    if(active&&akumaBackend)void akumaRequest('end-protection',{}).catch(()=>{});
  }
  function expansionView(){return {x:camera.x,y:camera.y,width:W,height:H};}
  function expansionEnemies(){return livingMobs().map(m=>({id:m.id,x:m.x,y:m.y,alive:m.alive,defense:enemyArmor(m)}));}
  function expansionImpact(shot,hit){
    if(hit){shot.x=hit.x;shot.y=hit.y;}
    const X=MareRankCExpansion,kind=shot.key==='1'?'breath':'bomb',targets=shot.key==='1'?(hit?[hit]:[]):livingMobs().filter(m=>X.inSplash(shot,m));
    if(!session.expansionFx.some(f=>f.group===shot.group&&f.index===(shot.key==='1'?0:shot.index)))session.expansionFx.push({kind,x:shot.x,y:shot.y-24,started:world.time,group:shot.group,index:shot.key==='1'?0:shot.index});
    if(akumaBackend&&shot.token&&targets.length)void akumaRequest('expansion-impact',{token:shot.token,index:shot.index,instance:game.area,x:shot.x,y:shot.y,enemies:expansionEnemies()}).catch(e=>console.warn('Impacto Bomu:',e.message));
    for(const m of targets)outputDamage(m,MareCharacters.damage({physical:shot.attack,elemental:0},enemyArmor(m)*(1-shot.penetration),{type:'physical',multiplier:shot.key==='1'?.75:1.5}));
  }
  function refreshKobu(now){
    const X=MareRankCExpansion,view=expansionView(),flags=session.kobuFlags||[];session.kobuSupportUntil=0;
    for(const m of world.mobs)delete m.kobuDebuffUntil;
    const allies=MareRankC.partyMembers({player:game,world,instance:game.area,view});
    for(const ally of session.kobuRecipients||[])delete (ally.status||ally).kobuSupportUntil;session.kobuRecipients=[];
    for(const flag of flags){
      if(flag.kind==='revolution'){
        if(X.affected(flag,world.hero,view,now))session.kobuSupportUntil=flag.until;
        if(game.party?.id||game.partyId)for(const ally of allies)if(ally&&ally.partyId===(game.party?.id||game.partyId)&&ally.instance===game.area&&ally.hp>0&&X.affected(flag,ally,ally.view,now)){const status=ally.status||ally;status.kobuSupportUntil=flag.until;session.kobuRecipients.push(ally);}
      }else for(const m of livingMobs())if(X.visible(m,flag.view))m.kobuDebuffUntil=flag.until;
    }
    if(akumaBackend&&flags.length)void akumaRequest('expansion-field',{instance:game.area,x:world.hero.x,y:world.hero.y,view,enemies:expansionEnemies()}).catch(()=>{});
  }
  function stepExpansion(dt){
    const now=Date.now(),X=MareRankCExpansion;
    for(const m of world.mobs)if(m.bisonStunUntil&&world.time>=m.bisonStunUntil){m.isStunned=MareRankB.stunned(m,world.time)||m.talentControl?.remaining>0;delete m.bisonStunUntil;}
    if(game.bisonHPScale&&!bisonShellActive()){game.hp=Math.max(0,game.hp/game.bisonHPScale);delete game.bisonHPScale;session.bisonShellUntil=0;}
    session.kobuFlags=(session.kobuFlags||[]).filter(f=>f.until>now);
    if(now>=(session.kobuTickAt||0)){refreshKobu(now);session.kobuTickAt=now+1000;}
    if(!session.kobuFlags.some(f=>f.kind==='revolution'))session.kobuSupportUntil=0;
    if(!session.kobuFlags.some(f=>f.kind==='deposition'))for(const m of world.mobs)delete m.kobuDebuffUntil;
    for(const shot of session.expansionShots||[]){if(world.time<shot.launch)continue;const was=shot.done;MareRankC.stepProjectile(shot,dt,world.mobs,(a,b)=>combatLine(a,b),(m,p)=>{p.resolved=true;expansionImpact(p,m);});if(!was&&shot.done&&!shot.resolved){shot.resolved=true;expansionImpact(shot,null);}}
    session.expansionShots=(session.expansionShots||[]).filter(p=>!p.done);
    session.expansionFx=(session.expansionFx||[]).filter(f=>X.effectFrame(f.kind,(world.time-f.started)*1000,'impact'));
    const a=session.bisonAction;if(!a)return;
    if(!isBisonForm()||game.hp<=0||MareRankC.controlled(world.hero,world.time)){session.bisonAction=null;return;}
    if(a.finished){if(world.time-a.started>=.67)session.bisonAction=null;return;}
    let budget=Math.min(640*dt,256-a.travel);
    while(budget>0&&!a.finished){const step=Math.min(8,budget),from={x:world.hero.x,y:world.hero.y},to={x:from.x+a.dx*step,y:from.y+a.dy*step};if(!navigator().clear(from,to)||!navigator().walkable(to.x,to.y)){session.bisonAction=null;return;}navigator().move(world.hero,a.dx*step,a.dy*step);a.travel+=distance(from,world.hero);budget-=step;
      const hit=livingMobs().find(m=>MareNeko.segmentHit(from,world.hero,m,24));
      if(hit){a.finished=true;a.visualHitAt=world.time;world.hero.walking=0;if(akumaBackend&&a.token)void akumaRequest('expansion-impact',{token:a.token,index:0,instance:game.area,x:hit.x,y:hit.y,enemies:expansionEnemies()}).catch(()=>{});outputDamage(hit,MareCharacters.damage({physical:a.attack,elemental:0},enemyArmor(hit)*(1-a.penetration),{type:'physical',multiplier:1.8}));if(hit.alive){hit.talentControl={type:'stun',remaining:2};hit.isStunned=true;hit.bisonStunUntil=world.time+2;hit.telegraph=null;}}
    }
    if(a.travel>=256&&!a.finished)session.bisonAction=null;
  }
  async function useExpansionSkill(fruit,skill,manual){
    const X=MareRankCExpansion,target=world.target?.alive?world.target:null,bison=fruit.id===X.rules.bison.id,bomu=fruit.id===X.rules.bomu.id;
    if(scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||MareRankC.controlled(world.hero,world.time)||bisonSkillActive())return false;
    if(bison&&!isBisonForm())return false;
    if((bomu||bison&&skill.key==='1')&&(!target||distance(world.hero,target)>(bomu?384:256)||!combatLine(world.hero,target)))return false;
    const cdkey=MareAkuma.cooldownKey(fruit.id,skill.key),cost=skill.cost;if(game.energy<cost||Date.now()<(game.fruitCooldowns?.[cdkey]||0))return false;
    const point=skill.key==='2'&&!bison&&!bomu?(session.kobuGround||{x:world.hero.x,y:world.hero.y}):{x:world.hero.x,y:world.hero.y},view=expansionView();
    if(!X.visible(point,view)||!navigator().walkable(point.x,point.y))return false;
    const before=session,area=game.area,origin={x:world.hero.x,y:world.hero.y},stats=getDerived();let response;session.fruitCastPending=true;
    try{
      if(akumaBackend){try{response=await akumaRequest('cast',{instance:area,...origin,enemies:expansionEnemies(),direction:zoanDirection(),skill_key:skill.key,energy:game.energy,physical_attack:stats.physical,target_id:target?.id,rank_c_context:{view,point,controlled:false,self:{hp:game.hp,maxHP:stats.maxHP}}});}catch(e){if(manual)toast(e.message,'danger');return false;}}
      if(session!==before||game.area!==area||scene!=='hunt'||game.hp<=0||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;
      session.expansionFruitId=fruit.id;
      if(bison&&skill.key==='1'){
        if(!target?.alive)return false;faceCombatTarget(target);cancelBasicAttack();travelPath=[];const d=distance(origin,target);session.bisonAction={dx:(target.x-origin.x)/d,dy:(target.y-origin.y)/d,travel:0,started:world.time,attack:stats.physical,penetration:stats.penetration||0,token:response?.effect.token};
      }else if(bison){session.bisonShellUntil=response?.effect.expires_at?response.effect.expires_at*1000:Date.now()+30000;session.bisonShellStarted=Date.now();if(!game.bisonHPScale){game.bisonHPScale=1.2;game.hp*=1.2;}}
      else if(bomu){
        const d=distance(origin,target)||1,direction=[(target.x-origin.x)/d,(target.y-origin.y)/d],count=skill.key==='1'?6:2,group=Date.now()+'-'+Math.random();session.expansionShots ||= [];session.expansionFx ||= [];
        for(let index=0;index<count;index++){const p=MareRankC.projectile(origin,direction,null,stats.physical,false,activeMap());Object.assign(p,{key:skill.key,index,group,launch:world.time+(skill.key==='2'?index*.18:0),penetration:stats.penetration||0,token:response?.effect.token});session.expansionShots.push(p);}
      }else{
        const kind=skill.key==='1'?'revolution':'deposition';session.kobuFlags=(session.kobuFlags||[]).filter(f=>f.kind!==kind);session.kobuFlags.push({kind,...point,started:Date.now(),until:Date.now()+skill.duration,view:X.flagArea(point,view)});refreshKobu(Date.now());session.kobuTickAt=Date.now()+1000;
      }
      game.energy-=response?.energy_spent??cost;game.fruitCooldowns ||= {};game.fruitCooldowns[cdkey]=response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+MareAkumaPassives.cooldown(skill.cooldown,fruit.id)*1000;session.skillEnergySpent+=cost;session.skillUses[Number(skill.key)-1]++;saveGame();updateUI();return true;
    }finally{before.fruitCastPending=false;}
  }
  function drawExpansion(){
    const X=MareRankCExpansion;
    for(const flag of session.kobuFlags||[])X.drawEffect(ctx,flag.kind,flag.x,flag.y-32,Date.now()-flag.started,{width:64,mode:flag.kind==='deposition'?'hold':'loop'});
    for(const p of session.expansionShots||[])if(world.time>=p.launch)X.drawEffect(ctx,p.key==='1'?'breath':'bomb',p.x,p.y-24,p.elapsed*1000,{width:64,mode:'flight'});
    for(const f of session.expansionFx||[])X.drawEffect(ctx,f.kind,f.x,f.y,(world.time-f.started)*1000,{width:f.kind==='bomb'?256:96,mode:'impact',mirror:f.kind==='breath'});
  }
  function horuBuffActive(){return !!(game?.hp>0&&MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id===MareRankC.rules.horu.id&&session?.horuBuffUntil>Date.now());}
  function rankCFreeCasts(){return MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id===MareRankC.rules.mato.id&&MareRankC.marked(world.target)&&world.target.matoCharges>0;}
  function clearRankC(){if(!session)return;const active=session.horuBuffUntil>0||(session.rankCProjectiles||[]).length>0||world?.mobs?.some(m=>m.hasMatoMark);session.horuBuffUntil=0;session.rankCProjectiles=[];session.horuHealFx=[];if(world?.hero)world.hero.horuSpeedUntil=0;for(const m of world?.mobs||[])MareRankC.clearMark(m);if(active&&akumaBackend)void akumaRequest('end-protection',{}).catch(error=>console.warn('Efeitos Rank C não sincronizados:',error));}
  function stepRankC(dt){
    for(const mob of world.mobs)if(mob.hasMatoMark&&!MareRankC.marked(mob))MareRankC.clearMark(mob);
    for(const p of session.rankCProjectiles||[])MareRankC.stepProjectile(p,dt,world.mobs,(a,b)=>combatLine(a,b),(mob,shot)=>{
      if(akumaBackend&&shot.serverId)void akumaRequest('rank-c-impact',{projectile_id:shot.serverId,instance:game.area,x:shot.x,y:shot.y,target_id:mob.id,enemies:[{id:mob.id,x:mob.x,y:mob.y,alive:mob.alive,defense:enemyArmor(mob)}]}).catch(error=>console.warn('Impacto Mato não sincronizado:',error));
      outputDamage(mob,MareCharacters.damage({physical:shot.attack,elemental:0},enemyArmor(mob)*(1-shot.penetration),{type:'physical',multiplier:1.1}));
    });
    session.rankCProjectiles=(session.rankCProjectiles||[]).filter(p=>!p.done);
    session.horuHealFx=(session.horuHealFx||[]).filter(f=>Date.now()-f.started<MareRankC.effects.heal.duration/MareRankC.rules.horu.healPlaybackRate);
  }
  function retainRankCTarget(m){return (session.jikiShots||[]).some(p=>p.kind==='rocket'&&String(p.targetId)===String(m.id))||(session.rankBJobs||[]).some(j=>String(j.targetId)===String(m.id))||MareRankC.marked(m)||(session.rankCProjectiles||[]).some(p=>p.homing&&String(p.targetId)===String(m.id));}
  async function useRankCSkill(fruit,skill,manual){
    if(scene!=='hunt'||session.respawn>0||game.hp<=0||session.fruitCastPending)return false;
    const horu=fruit.id===MareRankC.rules.horu.id,healing=horu&&skill.key==='2',controlled=MareRankC.controlled(world.hero,world.time),target=world.target?.alive?world.target:null,view={x:camera.x,y:camera.y,width:W,height:H};
    if(controlled&&!healing){if(manual)toast('Aguarde o fim do controle.');return false;}
    if(!horu&&skill.key==='2'&&(!target||!MareRankC.visible(target,view))){if(manual)toast('Selecione um inimigo visível.');return false;}
    const homing=!horu&&skill.key==='1'&&MareRankC.marked(target),free=homing&&target.matoCharges>0,cost=free?0:skill.cost,key=MareAkuma.cooldownKey(fruit.id,skill.key);
    if(game.energy<cost||!free&&Date.now()<(game.fruitCooldowns?.[key]||0)){if(manual)toast('Habilidade em recarga ou energia insuficiente.');return false;}
    const initial=session,area=game.area,position={x:world.hero.x,y:world.hero.y},stats=getDerived(),d=target?[target.x-position.x,target.y-position.y]:zoanDirection(),length=Math.hypot(...d),direction=length>0?d.map(n=>n/length):zoanDirection();let response=null;
    session.fruitCastPending=true;
    try{
      if(akumaBackend){try{response=await akumaRequest('cast',{instance:area,x:position.x,y:position.y,enemies:livingMobs().map(m=>({id:m.id,x:m.x,y:m.y,hp:m.hp,alive:m.alive,defense:enemyArmor(m)})),direction,skill_key:skill.key,energy:game.energy,physical_attack:stats.physical,target_id:target?.id,rank_c_context:{view,controlled,penetration:stats.penetration||0,self:{hp:game.hp,maxHP:stats.maxHP}}});}catch(error){if(manual)toast(error.message,'danger');return false;}}
      if(session!==initial||scene!=='hunt'||game.area!==area||game.hp<=0||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;
      if(!horu&&skill.key==='2'&&(!target?.alive||!world.mobs.includes(target)))return false;
      if(horu&&skill.key==='1'){session.horuBuffUntil=response?.effect.expires_at?response.effect.expires_at*1000:Date.now()+30000;session.horuBuffStarted=Date.now();}
      else if(healing){
        cancelBasicAttack();classCombatController()?.reset(world.hero.direction);
        const self={id:game.akumaPlayerId||'hero',partyId:game.party?.id||game.partyId,instance:area,x:world.hero.x,y:world.hero.y,hp:game.hp,maxHP:getDerived().maxHP,status:world.hero};
        const recipients=MareRankC.healParty(self,MareRankC.partyMembers({player:game,world,instance:area,view}),view);session.healingDone+=restoreHero(self.hp-game.hp,{ignoreEfficiency:true});
        session.horuHealFx ||= [];for(const member of recipients)session.horuHealFx.push({member:member===self?null:member,started:Date.now()});
      }else if(skill.key==='2'){for(const mob of world.mobs)MareRankC.clearMark(mob);MareRankC.mark(target);}
      else{const shot=MareRankC.projectile(position,direction,target,stats.physical,homing,activeMap());shot.penetration=stats.penetration||0;shot.serverId=response?.effect.projectile_id;session.rankCProjectiles ||= [];session.rankCProjectiles.push(shot);if(free)target.matoCharges--;}
      game.energy=Math.max(0,game.energy-(response?.energy_spent??cost));session.skillEnergySpent+=response?.energy_spent??cost;session.skillUses[Number(skill.key)-1]++;
      game.fruitCooldowns ||= {};if(!free||target.matoCharges===0){game.fruitCooldowns[key]=Math.max(game.fruitCooldowns[key]||0,response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+skill.cooldown*1000);}
      saveGame();updateUI();return true;
    }finally{initial.fruitCastPending=false;}
  }
  function currentFruitSkill(key){const id=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id;return MareRankA.has(id)?MareRankA.skill(id,key??'1',session?.rankA,world.time):MareAkuma.activeSkill(id,key);}
  let rankAClearQueue=Promise.resolve();
  function clearRankA(){if(session?.rankA){const active=session.rankA.room||session.rankA.jobs.length||session.rankA.expansion?.dome||session.rankA.expansion?.jobs.length||session.rankA.expansion?.fields.length||session.rankA.expansion?.dots.length||session.rankA.rankS?.jobs.length||session.rankA.rankS?.burns.length;MareRankA.clear(session.rankA,world?.mobs||[]);if(active&&akumaBackend)rankAClearQueue=rankAClearQueue.then(()=>akumaRequest('rank-a-clear',{})).catch(()=>{});}}
  function rankAContext(fruit,key){return {fruit,key:String(key),now:world.time,epoch:Date.now(),hero:world.hero,target:world.target,enemies:world.mobs,stats:getDerived(),view:{x:camera.x,y:camera.y,width:W,height:H},path:(a,b)=>navigator().path(a,b),clear:combatLine,move(m,dx,dy){const nav=navigator(),length=Math.hypot(dx,dy),n=Math.ceil(length/4),from={x:m.x,y:m.y};for(let i=0;i<n;i++){const next={x:m.x+dx/n,y:m.y+dy/n};if(!nav.clear(m,next))break;const before={x:m.x,y:m.y};nav.move(m,dx/n,dy/n);if(distance(before,m)<.01)break;}return distance(from,m);},walkable:p=>navigator().walkable(p.x,p.y),heal(ratio){game.hp=Math.min(getDerived().maxHP,game.hp+getDerived().maxHP*ratio);},onSwap(){cancelBasicAttack();classCombatController()?.reset(world.hero.direction);travelPath=[];lobbyDestination=null;pursuit=new WeakMap();world.hero.walking=0;camera.update(world.hero,activeMap(),0,true);},damage(m,power,mult,magic,pen,absolute){return MareRankA.damage({...m,defense:enemyArmor(m),magicDefense:enemyArmor(m,true)},power,mult,magic,pen,absolute);},hit(m,amount,flags){if(akumaBackend&&flags.token)void akumaRequest('rank-a-impact',{token:flags.token,event_key:flags.eventKey,context:{hero:{x:world.hero.x,y:world.hero.y},impact_point:flags.impactPoint,effect_age:flags.effectAge},instance:game.area,enemies:rankBEnemies(),target_id:m.id}).catch(e=>console.warn('Impacto Rank A:',e.message));outputDamage(m,amount,false,{exclusive:true,skillKey:String(key),...flags});}};}
  function stepRankA(){if(!session.rankA)return;const id=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id;if(session.rankAFruitId!==id||scene!=='hunt'||game.hp<=0||session.respawn>0){clearRankA();return;}if(session.rankA.room?.realUntil<=Date.now())session.rankA.room=null;if(MareRankC.controlled(world.hero,world.time))session.rankA.jobs=[];MareRankA.step(session.rankA,rankAContext(id,'1'));}
  async function useRankASkill(fruit,key,manual){
    const state=session.rankA ||= MareRankA.create(),skill=MareRankA.skill(fruit.id,key,state,world.time),cd=MareRankA.cooldownKey(fruit.id,key,state,world.time);
    if(!skill||scene!=='hunt'||game.hp<=0||session.respawn>0||session.fruitCastPending||MareRankC.controlled(world.hero,world.time))return false;
    if(game.energy<skill.cost||Date.now()<(game.fruitCooldowns?.[cd]||0)){if(manual)toast(game.energy<skill.cost?'Energia insuficiente.':'Habilidade em recarga.');return false;}
    if(fruit.id===MareRankS.rules.phoenix.id&&!game.zoanTransformed){if(manual)toast('Transforme-se para usar esta habilidade.');return false;}
    if(!MareRankA.valid(state,rankAContext(fruit.id,key))){if(manual)toast('Selecione um alvo válido ao alcance e com caminho livre.');return false;}
    const initial=session,area=game.area,selectedTarget=world.target;session.fruitCastPending=true;try{
      let response;await akumaInitPending;await rankAClearQueue;if(!await MareRankA.preload(fruit.id)){if(manual)toast('Não foi possível carregar o efeito da habilidade. Recarregue a página.','danger');return false;}if(session!==initial||scene!=='hunt'||area!==game.area||game.hp<=0||game.energy<skill.cost||world.target!==selectedTarget||MareRankA.skill(fruit.id,key,state,world.time)?.name!==skill.name||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;const rankSTargeted=[MareRankS.rules.gura.id,MareRankS.rules.hie.id,MareRankS.rules.phoenix.id].includes(fruit.id)&&selectedTarget&&!(fruit.id===MareRankS.rules.gura.id&&key==='2');const delta=rankSTargeted?[selectedTarget.x-world.hero.x,selectedTarget.y-world.hero.y]:null;const length=delta?Math.hypot(...delta):0;const castDirection=length>0?delta.map(v=>v/length):MareRankA.direction(world.hero);if(akumaBackend)response=await akumaRequest('cast',{instance:area,direction:castDirection,x:world.hero.x,y:world.hero.y,enemies:rankBEnemies(),skill_key:String(key),energy:game.energy,physical_attack:getDerived().physical,target_id:world.target?.id,rank_c_context:{special_attack:getDerived().elemental,attack:getDerived().attack,magic_penetration:getDerived().magicPen||0,controlled:false}});
      if(session!==initial||scene!=='hunt'||area!==game.area||game.hp<=0||game.energy<skill.cost||world.target!==selectedTarget||MareRankA.skill(fruit.id,key,state,world.time)?.name!==skill.name||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;
      if(rankSTargeted)faceCombatTarget(selectedTarget);const context=rankAContext(fruit.id,key);if(!MareRankA.cast(state,{...context,token:response?.effect.token}))return false;
      if(fruit.id===MareRankA.rules.ope.id&&skill.name==='ROOM'){state.room.realUntil=Date.now()+30250;world.fx.push({x:world.hero.x,y:combatHudBox(world.hero,60,game.name).nameY-30,text:'ROOOM!',color:'#ff9d32',size:22,life:2,max:2});}
      session.rankAFruitId=fruit.id;game.energy=Math.max(0,game.energy-(response?.energy_spent??skill.cost));game.fruitCooldowns ||= {};game.fruitCooldowns[cd]=response?.effect.ready_at?response.effect.ready_at*1000:Date.now()+MareAkumaPassives.cooldown(skill.cooldown,fruit.id)*1000;session.skillUses[Number(key)-1]++;session.skillEnergySpent+=skill.cost;saveGame();updateUI();return true;
    }catch(error){if(manual)toast(error.message,'danger');return false;}finally{initial.fruitCastPending=false;}
  }
  async function useFruitSkill(manual=false,key=null){
    if(MareRankS.silenced(world.hero,world.time)){if(manual)toast('Suas habilidades de Akuma no Mi estão silenciadas.','danger');return false;}
    const fruit=MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs),skill=currentFruitSkill(key);
    if(skill&&MareRankA.has(fruit?.id))return useRankASkill(fruit,String(key??skill.key),manual);
    if(skill&&fruit?.id===MareRyu.rules.id)return useRyuSkill(fruit,skill,manual);
    if(skill&&fruit?.id===MareJiki.rules.id)return useJikiSkill(fruit,skill,manual);
    if(skill&&fruit?.id===MareHoya.rules.id)return useHoyaSkill(fruit,skill,manual);
    if(skill&&MareRankB.has(fruit?.id))return useRankBSkill(fruit,skill,manual);
    if(skill&&MareRankCExpansion.has(fruit?.id))return useExpansionSkill(fruit,skill,manual);
    if(skill&&[MareRankC.rules.horu.id,MareRankC.rules.mato.id].includes(fruit?.id))return useRankCSkill(fruit,skill,manual);
    if(!skill||scene!=='hunt'||session.respawn>0||game.hp<=0||session.fruitCastPending||nekoSkillActive()||ushiSkillActive()||ryuSkillActive()||wolfSkillActive()||bisonSkillActive())return false;
    if(fruit.id==='akuma_neko_leopard'&&world.hero.talentControl?.remaining>0){if(manual)toast('Aguarde o fim do controle para usar a habilidade.');return false;}
    const wolfTarget=fruit.id===MareWolf.rules.id&&skill.key==='1'?world.target:null;
    if(fruit.id===MareWolf.rules.id&&(world.hero.talentControl?.remaining>0||skill.key==='1'&&(!wolfTarget?.alive||distance(world.hero,wolfTarget)>MareWolf.rules.range||distance(world.hero,wolfTarget)<1||!navigator().clear(world.hero,wolfTarget)))){if(manual)toast('Selecione um alvo vivo a até 4 tiles e aguarde o fim do controle.');return false;}
    const doruTarget=fruit.id===MareDoru.rules.id?world.target:null;
    if(fruit.id===MareDoru.rules.id&&(world.hero.talentControl?.remaining>0||!doruTarget?.alive||distance(world.hero,doruTarget)>MareDoru.rules.range||distance(world.hero,doruTarget)<1)){if(manual)toast('Selecione um alvo vivo a até 4 tiles.');return false;}
    const doruDirection=doruTarget?[(doruTarget.x-world.hero.x)/distance(world.hero,doruTarget),(doruTarget.y-world.hero.y)/distance(world.hero,doruTarget)]:null,doruPower=fruit.id===MareDoru.rules.id?getDerived().attack+(MareCharacters.roles[game.classId].magic?0:(getDerived().fruitSpecialAttack||0)):null;
    const ushiTarget=fruit.id===MareUshi.rules.id&&skill.key==='1'?world.target:null;
    if(fruit.id===MareUshi.rules.id&&(world.hero.talentControl?.remaining>0||skill.key==='1'&&(!ushiTarget?.alive||distance(world.hero,ushiTarget)>MareUshi.rules.range||!combatLine(world.hero,ushiTarget)))){if(manual)toast('Selecione um alvo vivo ao alcance e aguarde o fim do controle.');return false;}
    const nekoTarget=fruit.id==='akuma_neko_leopard'?world.target:null;
    if(fruit.id==='akuma_neko_leopard'&&(!nekoTarget?.alive||distance(world.hero,nekoTarget)>(skill.key==='1'?MareNeko.rules.dashRange:MareNeko.rules.comboRange)||!(skill.key==='1'?navigator().clear(world.hero,nekoTarget):combatLine(world.hero,nekoTarget))||skill.key==='1'&&distance(world.hero,nekoTarget)<1)){if(manual)toast('Selecione um alvo vivo e ao alcance.','danger');return false;}
    if(game.energy<(skill.cost||0)){if(manual)toast('Energia insuficiente.','danger');return false;}
    if(MareAkuma.isZoan(fruit)&&!game.zoanTransformed){if(manual)toast('Transforme-se para usar esta habilidade.');return false;}
    const cooldownId=MareAkuma.cooldownKey(fruit.id,skill.key);
    if(Date.now()<(game.fruitCooldowns?.[cooldownId]||0)){if(manual)toast('Habilidade em recarga.');return false;}
    const castingSession=session,castArea=game.area,castPosition={x:world.hero.x,y:world.hero.y};
    session.fruitCastPending=true;
    try{
    const target=fruit.id==='akuma_inu_dachshund'?livingMobs().filter(m=>distance(m,world.hero)<=130&&combatLine(world.hero,m)).sort((a,b)=>distance(a,world.hero)-distance(b,world.hero))[0]:null;
    if(fruit.id==='akuma_inu_dachshund'&&!target){if(manual)toast('Nenhum alvo próximo para morder.');return false;}
    const beriSpheres=fruit.id==='akuma_beri_beri'?captureBeriSprite():null;
    if(fruit.id==='akuma_beri_beri'&&!beriSpheres){if(manual)toast('Aguarde o carregamento da sprite para usar esta habilidade.');return false;}
    let serverEffect=null;if(akumaBackend){try{await akumaCorpseQueue;const response=await akumaRequest('cast',{instance:castArea,x:castPosition.x,y:castPosition.y,enemies:livingMobs().map(m=>({id:m.id,x:m.x,y:m.y,alive:m.alive,defense:enemyArmor(m),facing:m.emberFacing||'south'})),direction:doruDirection||zoanDirection(),skill_key:skill.key,energy:game.energy,physical_attack:doruPower??getDerived().physical,target_id:wolfTarget?.id??ushiTarget?.id??nekoTarget?.id,crit_multiplier:getDerived().critMultiplier||1.65});serverEffect=response.effect;}catch(error){if(manual)toast(error.message,'danger');return false;}}
    if(session!==castingSession||scene!=='hunt'||game.area!==castArea||game.hp<=0||MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id!==fruit.id)return false;
    if(game.zoanTransformed&&!(skill.key==='2'&&[MareWolf.rules.id,MareUshi.rules.id].includes(fruit.id)))cancelBasicAttack();
    if(fruit.id===MareWolf.rules.id){
      if(!isWolfForm()||world.hero.talentControl?.remaining>0)return false;
      if(skill.key==='1'){faceCombatTarget(wolfTarget);travelPath=[];world.hero.walking=0;world.hero.attackAnim=0;session.wolfAction={phase:'charge',targetId:wolfTarget.id,started:world.time,travel:0,attack:getDerived().physical,dx:zoanDirection()[0],dy:zoanDirection()[1]};}
      else{session.wolfAuraStartedAt=Date.now();session.wolfAuraUntil=serverEffect?.expires_at?serverEffect.expires_at*1000:Date.now()+MareWolf.rules.auraDuration;retimeAttack(session.basicAttack?.clock,getDerived().speed);syncBasicAttackVisual();}
    }else if(fruit.id===MareDoru.rules.id){
      faceCombatTarget(doruTarget);session.doruProjectiles ||= [];session.doruProjectiles.push(MareDoru.create(skill.key,castPosition,doruDirection,doruPower,serverEffect?.projectile_id));
    }else if(fruit.id===MareUshi.rules.id){
      if(!isUshiForm()||world.hero.talentControl?.remaining>0)return false;
      if(skill.key==='1'){faceCombatTarget(ushiTarget);travelPath=[];world.hero.walking=0;world.hero.attackAnim=0;session.ushiAction={targetId:ushiTarget.id,hit:false,direction:zoanDirection(),started:world.time};}
      else{session.ushiBuffStartedAt=Date.now();session.ushiBuffUntil=serverEffect?.expires_at?serverEffect.expires_at*1000:Date.now()+MareUshi.rules.duration;}
    }else if(fruit.id==='akuma_neko_leopard'){
      faceCombatTarget(nekoTarget);travelPath=[];world.hero.walking=0;world.hero.attackAnim=0;
      if(skill.key==='1'){
        const dx=nekoTarget.x-world.hero.x,dy=nekoTarget.y-world.hero.y,length=Math.hypot(dx,dy);
        if(length<1)return false;
        session.nekoAction={kind:'dash',targetId:nekoTarget.id,dx:dx/length,dy:dy/length,remaining:Math.min(MareNeko.rules.dashRange+MareNeko.rules.dashBeyond,length+MareNeko.rules.dashBeyond),hit:false,started:world.time};
      }else{session.nekoAction={kind:'combo',targetId:nekoTarget.id,x:nekoTarget.x,y:nekoTarget.y-24,nextHit:0,started:world.time};stepNekoAction(0);}
    }else if(fruit.id==='akuma_supa_supa'){
      if(skill.key==='1'){
        const ids=serverEffect?new Set(serverEffect.target_ids.map(String)):null;
        const targets=ids?livingMobs().filter(m=>ids.has(String(m.id))):MareAkuma.supaTargets(castPosition,livingMobs());
        for(const mob of targets)outputDamage(mob,serverEffect?serverEffect.hits.find(hit=>String(hit.id)===String(mob.id)).damage:MareCharacters.damage(getDerived(),enemyArmor(mob),{type:'physical',multiplier:skill.damage_multiplier}));
        const duration=MareSupaArt.animations.slash.duration/1000;
        world.fx.push({x:castPosition.x,y:castPosition.y-32,supaVfx:'slash',startedAt:Date.now(),life:duration,max:duration});
      }else{session.supaShieldStartedAt=Date.now();session.supaShieldUntil=serverEffect?.expires_at?serverEffect.expires_at*1000:session.supaShieldStartedAt+MareAkuma.supaRules.duration;}
    }else if(fruit.id==='akuma_kuku_kuku'){
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
      const [dx,dy]=serverEffect?.direction||zoanDirection();session.zoanVisualHitAt=null;session.zoanDash={dx,dy,remaining:Math.min(256,serverEffect?.distance||256),hitId:serverEffect?.hit_id??null,hit:false};session.zoanActionUntil=world.time+.75;
      world.fx.push({x:world.hero.x,y:world.hero.y,zoanVfx:fruit.id,followHero:true,life:2/3,max:2/3});
    }else if(fruit.id==='akuma_inu_dachshund'){
      const victim=world.mobs.find(m=>m.id===(serverEffect?.target_id??target.id)&&m.alive);
      if(victim){faceCombatTarget(victim);const d=Math.max(1,distance(world.hero,victim));navigator().move(world.hero,(victim.x-world.hero.x)/d*Math.max(0,d-35),(victim.y-world.hero.y)/d*Math.max(0,d-35));victim.zoanSlow={remaining:3,percent:.30};victim.zoanDefense={remaining:3,percent:.05};outputDamage(victim,MareCharacters.damage(getDerived(),enemyArmor(victim),{type:'physical',multiplier:.85}));world.fx.push({x:victim.x,y:victim.y,zoanVfx:fruit.id,life:2/3,max:2/3});}session.zoanActionUntil=world.time+.75;
    }
    game.energy=Math.max(0,game.energy-(skill.cost||0));session.skillEnergySpent+=skill.cost||0;
    if(Number(skill.key)<=2)session.skillUses[Number(skill.key)-1]++;
    game.fruitCooldowns ||= {};const effectiveCooldown=MareAkumaPassives.cooldown(skill.cooldown,fruit.id);game.fruitCooldowns[cooldownId]=Date.now()+effectiveCooldown*1000;session.fruitCooldown=effectiveCooldown;saveGame();updateUI();return true;
    }finally{castingSession.fruitCastPending=false;}
  }
  const forgeUI={tab:'upgrade',itemId:null,pearlItemId:'',socket:0,fusionId:'pearl_for_1',fusionMode:'equipment',fusionIds:Array(5).fill(null),pearlFusionIds:Array(5).fill(null),pearlFilters:{},outputSlot:'weapon',reforgeMode:'line',filters:{},page:0,list:false};
  let forgeOutcome=null,forgeFusionStamp='';
  let inventoryFeedback=null,attributeSuccessUntil=0,forgeFeedback=null,rewardBuffer=null,rewardTimer=null;
  let factionShowcase=false,showcaseAction='idle',showcaseDirection='south';
  window.addEventListener('mare-faction-sprite-ready',()=>{if(game){renderPortrait();if($('inventorySprite'))drawCurrentPreview($('inventorySprite'),185);if($('characterSprite'))drawCurrentPreview($('characterSprite'),175,{aura:false});}});
  window.addEventListener('mare-zoan-sprite-ready',()=>{if(game){renderPortrait();if($('inventorySprite'))drawCurrentPreview($('inventorySprite'),185);if($('characterSprite'))drawCurrentPreview($('characterSprite'),175,{aura:false});}});
  let impelRun=null;
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
  function itemRarity(item){const fruit=MareAkuma.itemData(item,itemDefs);return fruit?MareAkuma.rarityFor(fruit):item?.rarity||itemBase(item).rarity;}
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
    Object.assign(stats,MareAkumaPassives.apply(stats,MareAkuma.itemData(g.equipment?.akuma_no_mi,itemDefs)?.id,{magic:!!MareCharacters.roles[g.classId].magic,healer:g.classId==='healer'}));
    if(g.zoanTransformed&&MareAkuma.isZoan(MareAkuma.itemData(g.equipment?.akuma_no_mi,itemDefs))){stats.range=[MareUshi.rules.id,MareWolf.rules.id,MareRyu.rules.id].includes(g.equipment.akuma_no_mi.fruitId)?96:65;stats.attack=stats.physical;if(g.equipment.akuma_no_mi.fruitId==='akuma_tori_albatroz'&&Date.now()<(g.zoanAltitudeUntil||0)){stats.moveSpeed*=1.30;stats.huntSpeed*=1.30;}}
    stats.magicDefense=stats.magicDefense??stats.defense;
    stats.physicalDamageReduction=MareAkuma.itemData(g.equipment?.akuma_no_mi,itemDefs)?.id===MareRankB.rules.beta.id?.3:0;
    stats.isImmuneToExplosions=MareAkuma.itemData(g.equipment?.akuma_no_mi,itemDefs)?.id===MareRankCExpansion.rules.bomu.id;
    if(runtime&&g===game&&bisonShellActive()){stats.maxHP*=1.2;stats.defense*=1.35;stats.magicDefense*=1.35;}
    if(runtime&&g===game&&session.kobuSupportUntil>Date.now()){stats.physical*=1.2;stats.elemental*=1.2;stats.defense*=1.2;stats.magicDefense*=1.2;stats.crit=Math.min(.65,stats.crit+.1);stats.attack=g.zoanTransformed||!MareCharacters.roles[g.classId].magic?stats.physical:stats.elemental;}
    if(runtime&&g===game&&horuBuffActive()){stats.physical*=1.3;stats.elemental*=1.3;stats.defense*=1.3;stats.magicDefense*=1.3;stats.attack=MareCharacters.roles[g.classId].magic?stats.elemental:stats.physical;}
    if(runtime&&g===game&&world?.hero?.horuSpeedUntil>Date.now()){stats.moveSpeed*=1.25;stats.huntSpeed*=1.25;}
    if(runtime&&g===game&&wolfAuraActive())stats.speed*=1+MareWolf.rules.attackSpeed;
    if(runtime&&g===game&&session?.rankA?.rankS?.jobs.some(j=>j.kind==='guraBuff'&&world.time<j.until)){stats.physical*=1.6;stats.elemental*=1.6;stats.attack*=1.6;stats.defense*=1.6;stats.magicDefense*=1.6;}
    if(runtime&&g===game&&MareRankA.roomActive(session?.rankA,world.time)){stats.physical*=1.3;stats.elemental*=1.3;stats.attack*=1.3;stats.defense*=1.3;stats.magicDefense*=1.3;stats.speed*=1.3;}
    return stats;
  }
  function xpNeeded(level){return Math.round(80+25*Math.pow(level-1,1.55));}
  function observeAchievements(g=game){return MareAchievements.observe(g,{power:getDerived(g,null).power});}
  function saveGame(){if(!game||suppressSave)return;if(DEV_ACTIVE)game.devSandbox=true;game=observeAchievements(); try {localStorage.setItem(STORAGE_KEY,JSON.stringify(game));$('saveDot').style.background='#65c9bc';} catch(e) {toast('Não foi possível salvar o progresso no navegador.','danger');} }
  function preserveSave(raw,key=STORAGE_KEY+'-before-attributes-v1'){
    if(raw&&!localStorage.getItem(key))localStorage.setItem(key,raw);
  }
  function loadGame(){try{let data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!data||!classes[data.classId]||!Number.isInteger(data.level)||data.level<1||typeof data.name!=='string'||!data.equipment)return null;let clean={...data,claimed:Array.isArray(data.claimed)?data.claimed:[],inventory:Array.isArray(data.inventory)?data.inventory:[],stats:{kills:0,crab:0,bandit:0,spirit:0,boss:0,damage:0,goldEarned:0,xpEarned:0,...data.stats}};for(const slot of [...inventorySlotsLeft,...inventorySlotsRight])if(!(slot in clean.equipment))clean.equipment[slot]=null;
      if(clean.appearance96)clean.appearance96=MareCharacterAppearance.normalize(clean.appearance96);
      if(!clean.preferences||typeof clean.preferences!=='object')clean.preferences={};
      if(!zones[clean.area])clean.area='beach';if(!factions[clean.factionId])clean.factionId='pirate';
      if(!clean.attributeVersion)preserveSave(localStorage.getItem(STORAGE_KEY));
      if(clean.attributeVersion!==2)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-attributes-v2');
      if(clean.forgeVersion!==MareForge.VERSION)preserveSave(localStorage.getItem(STORAGE_KEY),STORAGE_KEY+'-before-forge-v'+MareForge.VERSION);
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
      const parts=[];if(reward.gold)parts.push('+'+fmt(reward.gold)+' Berry');if(reward.xp&&scene!=='hunt')parts.push('+'+fmt(reward.xp)+' XP');
      if(reward.names.length)parts.push(reward.names[0]+(reward.names.length>1?' +'+(reward.names.length-1)+' item(ns)':''));
      if(parts.length)toast(parts.join(' · '),'reward reward-'+reward.rarity);
    },650);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game)saveGame();});
  window.addEventListener('pagehide',()=>{if(game)saveGame();});
  Object.defineProperty(window,'has_haki_unlocked',{get:()=>game?.has_haki_unlocked===true,configurable:true});
  function initializeSession(){clearRankA();if(session)for(const p of session.combatProjectiles||[])p.phase='done';clearJiki();clearHoya();clearRankB();clearExpansion();clearRankC();clearWolfState();clearRyuState();clearUshiState();clearSupaProtection();travelPath=[];keys.clear();rejectedTargets.clear();pursuit=new WeakMap();session={haki:MareHaki.start(),talents:MareTalentCombat.create(),start:performance.now()/1000,elapsed:0,xp:0,gold:0,recentLoot:[],cooldowns:[0,0,0],fruitCooldown:0,fruitInvulnerable:0,fruitBurst:0,guard:0,blessing:0,skillUses:[0,0,0],skillEnergySpent:0,healingDone:0,respawn:0,spent:0,attackClock:0,lastHit:0,heroKOs:0,bossNotice:0};world={mobs:[],corpses:[],food:[],fx:[],projectiles:[],decor:[],time:0,hero:{x:scene==='lobby'?540:580,y:scene==='lobby'?338:313,facing:1,attackAnim:0,walking:0,visible:true},target:null,spawnClock:0,bossCooldown:0,nextID:Math.floor(Date.now()%1000000)};Object.assign(world.hero,activeMap().spawn,{direction:'front'});syncZoanTransition();camera.update(world.hero,activeMap(),0,true);if(scene==='hunt')for(let i=0;i<7;i++)spawnMob();}
  function startGame(){scene='lobby';initializeSession();syncFruitVfx();void initAkumaBackend();void syncHierarchy();$('startOverlay').classList.add('hidden');autoPlay=true;autoSkills=true;setAreaLabels();configureFactionVisual();applySceneHudLayout();updateUI();renderPortrait();log('Bem-vindo ao Porto das Correntes.','good');log('Converse com os NPCs ou inicie sua expedição.');saveGame();void lobby96.ready.then(()=>lobby96.ensure(game)).then(()=>{if(game&&scene==='lobby')prepareRegion(game.area);});}
  function enterHunt(){if(!game)return;prepareRegion(game.area);if(impelRun?.pending&&!persistImpelVictory())return;impelRun=null;factionShowcase=false;document.body.classList.remove('faction-showcase-open');$('factionInspection')?.classList.add('hidden');scene='hunt';autoPlay=true;autoSkills=true;lobbyDestination=null;lobbyAction=null;initializeSession();session.attackClock=0;world.target=null;setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Expedição iniciada: '+zones[game.area].name,'good');log('Você partiu para '+zones[game.area].name+'.','gold');saveGame();}
  function returnLobby(){if(!game)return;if(impelRun?.pending&&!persistImpelVictory())return;impelRun=null;scene='lobby';lobbyDestination=null;lobbyAction=null;initializeSession();setAreaLabels();applySceneHudLayout();closePanel();updateUI();toast('Você retornou ao Porto das Correntes.','good');log('De volta ao porto. Seus espólios foram preservados.','good');saveGame();}
  function enterImpelDown(floor){
    if(impelRun||!MarePrison.canEnter(game,floor))return;
    const prepared=ensurePrisonEncounter(floor);if(!prepared){toast('Não foi possível salvar o encontro. Tente novamente.','danger');return;}impelRun=MarePrison.createRun({floor,catalog:monsterTypes,prepared:game.impelDown.encounter});scene='hunt';autoPlay=true;autoSkills=true;lobbyDestination=null;lobbyAction=null;initializeSession();startImpelFloor();applySceneHudLayout();closePanel();updateUI();
  }
  function startImpelFloor(){
    if(impelRun.phase==='idle'){
      const prepared=ensurePrisonEncounter(impelRun.currentFloor);
      if(!prepared){impelRun.preparationPending=true;toast('Não foi possível salvar o próximo encontro. Abra os andares para tentar novamente.','danger');return false;}
      impelRun.prepareFloor(game.impelDown.encounter);impelRun.preparationPending=false;
    }
    clearJiki();clearHoya();clearRankB();clearExpansion();clearRankC();clearWolfState();clearRyuState();clearUshiState();clearSupaProtection();cancelBasicAttack();cancelNekoAction();classCombatController()?.reset('front');
    for(const p of session.combatProjectiles||[])p.phase='done';session.combatProjectiles=[];world.projectiles=[];world.fx=[];world.corpses=[];world.food=[];
    const spec=impelRun.startFloor(),point=MareImpel.enemySpawn;
    world.mobs=[{...spec,id:world.nextID++,source:'impel-down',prisonToken:spec.token,area:game.area,maxHP:spec.hp,hp:spec.hp,attack:spec.atk,defense:spec.def,magicDefense:spec.def,level:impelRun.currentFloor,...point,anchorX:point.x,anchorY:point.y,aggro:activeMap().width,attackClock:1,attackCount:0,bob:0,alive:true,hit:0,slow:0,telegraph:null,emberFacing:'west',emberElapsed:0,attackAnim:0,moving:0,patrolClock:0}];
    Object.assign(world.hero,activeMap().spawn,{talentControl:null,walking:0,attackAnim:0});world.target=null;session.attackClock=0;travelPath=[];keys.clear();rejectedTargets.clear();pursuit=new WeakMap();game.hp=getDerived().maxHP;camera.update(world.hero,activeMap(),0,true);prisonFloor=impelRun.currentFloor;setAreaLabels();if(currentPanel==='prison')renderPanel();
    if(spec.placeholder)toast('Andar '+impelRun.currentFloor+' · Guardião provisório','danger');
  }
  function completeImpelEnemy(m){
    if(m.source!=='impel-down'||!impelRun.defeat(m.prisonToken))return;
    m.alive=false;world.target=null;impelRun.pending={floor:impelRun.currentFloor,type:m.type};persistImpelVictory();
  }
  function persistImpelVictory(){
    const pending=impelRun?.pending;if(!pending)return true;
    const result=MarePrison.completeFloor(game,pending.floor,true,itemDefs);if(!result.ok){toast(result.message,'danger');return false;}
    result.state.stats.kills++;result.state.stats[pending.type]=(result.state.stats[pending.type]||0)+1;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(result.state));}catch{toast('Não foi possível salvar a vitória. Abra os andares e tente salvar novamente.','danger');return false;}
    game=result.state;impelRun.pending=null;impelRun.transitionAt=world.time+.85;toast('Andar Concluído · '+pending.floor,'good');log('Impel Down · Andar '+pending.floor+' concluído.','good');if(result.rewardPending)toast('Caixa de marco pendente: libere espaço na mochila.');if(currentPanel==='prison')renderPanel();return true;
  }
  function claimImpelMilestone(floor){
    const result=MarePrison.claimMilestone(game,floor,itemDefs);if(!result.ok){toast(result.message,'danger');return;}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(result.state));}catch{toast('Não foi possível salvar. A recompensa continua disponível.','danger');return;}
    game=result.state;renderPanel();updateUI();toast('Caixa de Pérolas recebida.','good');
  }
  function activateNPC(npc){lobbyAction=null;if(npc.kind==='return'){returnLobby();return;}if(npc.kind==='hunt')openPanel('modes');else openPanel(npc.kind);}
  function setAreaLabels(){let inLobby=scene==='lobby';let z=inLobby?{name:'Porto das Correntes',sub:'Refúgio dos Navegantes',label:'ÁREA SEGURA · CIDADE'}:impelRun?{name:'Impel Down',sub:'Andar '+impelRun.currentFloor,label:'DUELO · ANDAR '+impelRun.currentFloor}:zones[game.area];$('locationName').textContent=z.name;$('mapTitle').textContent=z.name.toUpperCase();$('overlayArea').textContent=z.sub.toUpperCase();$('sceneEyebrow').textContent=inLobby?'PORTO PRINCIPAL':'REGIÃO DE CAÇA';$('dangerRating').textContent=z.label;
    $('enterHunt').classList.toggle('hidden',!inLobby);$('returnLobby').classList.toggle('hidden',inLobby);$('navLobby').classList.toggle('active',inLobby);$('navHunt').classList.toggle('active',!inLobby);
    $('sceneInfo').textContent=inLobby?'ÁREA SEGURA · CLIQUE PARA CAMINHAR':'COMBATE AUTOMÁTICO ATIVO';$('worldHint').textContent=inLobby?'Clique para caminhar · WASD / setas · Clique nos NPCs para interagir':'Clique no chão para caminhar · Monstro: retomar caçada · WASD / setas';document.body.classList.toggle('scene-lobby',inLobby);document.body.classList.toggle('scene-hunt',!inLobby);}

  function monsterName(m){return m?.name||monsterTypes[m?.type]?.name||'';}
  function huntAnchors(){if(MareAlubarna.worlds[activeMap().id])return MareAlubarna.worlds[activeMap().id].districts;if(activeMap().id==='alabasta')return MareAlabasta.districts;return MareNewIslands[activeMap().id]?.districts||(activeMap().id==='dawn'?MareDawn.districts:activeMap().id==='conchas'?MarePixelWorldMaps.conchas.districts:activeMap().id==='orange'?MarePixelWorldMaps.orange.districts:activeMap().id==='loguetown'?MarePixelWorldMaps.loguetown.districts:activeMap().id==='embers'?MareEmber.districts:[]);}
  function contractsBoardData(){return {quests:questDefs,period:contractPeriod,progress:questProgress,claimed:game.claimed};}
  function refreshContractsBoard(){MareContractsBoard.refresh($('dialogBody'),contractsBoardData());}
  function questProgress(q){return q?.area?(game.hunts?.areas[q.area]?.[q.metric]||0):(game.stats[q?.stat]||0);}
  function updateHuntHUD(){
    $('huntRoute').classList.toggle('hidden',scene!=='hunt'||!!impelRun);if(impelRun){$('worldHint').textContent='Impel Down · Andar '+impelRun.currentFloor+' · 1 adversário';return;}if(scene!=='hunt')return;
    const s=MareHunt.sectorAt(game.area,world.hero,huntAnchors()),progress=game.hunts.areas[game.area];
    $('worldHint').textContent=s.name+' · Nv. '+s.min+'–'+s.max+' · '+(game.level<s.min?'Área perigosa para seu nível':MareHunt.get(game.area).boss&&progress.bosses?'Chefe vencido · confira suas recompensas':'Explore a rota da ilha');
  }
  function renderHuntRoute(body){
    const r=MareHunt.get(game.area),p=game.hunts.areas[game.area],list=MareHunt.sectors(game.area,huntAnchors()),current=MareHunt.sectorAt(game.area,world.hero,huntAnchors()),ready=p.bosses>0&&!p.firstRewardClaimed;
    body.innerHTML=`<section class="hunt-route"><header><div><h2>${escapeHTML(r.name)}</h2><p>Expedição Nv. ${r.min}–${r.max} · Você: Nv. ${game.level}</p></div><strong>${p.kills} abates${r.boss?' · '+p.bosses+' chefes':''}</strong></header><p>${r.boss?'Os níveis pertencem aos setores.':game.area==='rare'?'Os Cocox da ilha são Nv. 18.':game.area==='syrup'?'Sham e Buchi patrulham a vila no Nv. 23.':game.area==='baratie'?'Pearl e Gin defendem o Baratie no Nv. 28.':game.area==='orange'?'Mr. 3 e Cabaji patrulham Orange Town no Nv. 13.':game.area==='loguetown'?'Marinheiros patrulham as ruas no Nv. 40.':'Kuroobi e Chew protegem o Parque Arlong no Nv. 33.'} Escolha uma parada para caminhar até ela; ao chegar, retome a auto-caçada. A rota não teleporta o personagem.</p><div class="hunt-sectors">${list.map((s,i)=>`<button type="button" data-hunt-sector="${s.id}" ${scene!=='hunt'?'disabled':''} aria-current="${s.id===current.id?'location':'false'}"><span>${i+1}</span><div><strong>${escapeHTML(s.name)}</strong><small>Nv. ${s.min}–${s.max}${r.boss&&s.id===list.at(-1).id?' · Arena do chefe':''}${game.level<s.min?' · Perigo':''}</small></div><b>Seguir rota →</b></button>`).join('')}</div>${r.boss?`<section class="hunt-boss-brief"><h3>${escapeHTML(r.boss)} · Nv. ${r.bossLevel}</h3><p>Derrote 12 inimigos nesta ilha e aproxime-se do último setor para encontrar o chefe. Respawn: 90s após a derrota. Abates em outra ilha não contam.</p><p><strong>Leia o chão:</strong> círculos e faixas vermelhas mostram onde o ataque vai acertar. Saia antes de preencher. A auto-caçada tenta desviar quando existe caminho livre.</p><p>Primeira vitória: arma ${r.firstRarity==='rare'?'rara':'épica'} da sua classe + ${r.firstGold} Berry. Resgate único, preservado com mochila cheia.</p><button class="dialog-button" type="button" data-hunt-first="${game.area}" ${!ready?'disabled':''}>${p.firstRewardClaimed?'Recompensa recebida':ready?'RESGATAR PRIMEIRA VITÓRIA':'Derrote o chefe para resgatar'}</button></section>`:`<section class="hunt-boss-brief"><h3>${game.area==='rare'?'Cocox · Nv. 18':game.area==='syrup'?'Sham e Buchi · Nv. 23':game.area==='baratie'?'Pearl e Gin · Nv. 28':game.area==='orange'?'Mr. 3 e Cabaji · Nv. 13':game.area==='loguetown'?'Marinheiro · Nv. 40':'Kuroobi e Chew · Nv. 33'}</h3><p>Os inimigos patrulham os setores e atacam quando você se aproxima.</p></section>`}<p class="hunt-economy">Drops: equipamento de tier ${Math.ceil(r.min/5)}–${Math.ceil(r.max/5)}, Ferro Salgado e poções. ${r.boss?'Chefes garantem um equipamento se houver espaço.':''} Monstros comuns não entregam gemas ou pérolas. Ao superar o inimigo em mais de três níveis, a XP diminui gradualmente até 15%.</p></section>`;
  }
  function claimHuntFirst(area){
    const r=MareHunt.get(area);if(!r)return;const item=newItem(itemDefs[starterWeapon(game.classId)],Math.ceil(r.bossLevel/5),false,r.firstRarity);item.origin='Primeira vitória · '+r.name;
    const result=MareHunt.claimFirst(game,area,item,BAG_CAPACITY);if(!result.ok){toast(result.message,'danger');return;}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(result.state));}catch{toast('Não foi possível salvar. Sua recompensa continua disponível.','danger');return;}
    game=result.state;session.gold+=r.firstGold;updateUI();renderPanel();toast('Arma da classe e '+r.firstGold+' Berry recebidos!','good');
  }
  function followHuntSector(id){
    if(scene!=='hunt')return;const s=MareHunt.sectors(game.area,huntAnchors()).find(s=>s.id===id);if(!s)return;
    const candidates=[s];for(const radius of [30,60,100])for(let a=0;a<Math.PI*2;a+=Math.PI/4)candidates.push({x:s.x+Math.cos(a)*radius,y:s.y+Math.sin(a)*radius});
    const target=candidates.find(p=>navigator().walkable(p.x,p.y)&&navigator().path(world.hero,p).length);if(!target){toast('Não foi encontrado caminho livre para esse setor.','danger');return;}
    closePanel();if(walkTo(target))toast('Seguindo para '+s.name+'. Ao chegar, retome a auto-caçada.');
  }
  function spawnMob(forceBoss=false){
    if(impelRun)return;
    const region=MareHunt.get(game.area);if(!region||forceBoss&&!region.boss)return;
    const slots=MareMonsterBehavior.ready(game.area,world.mobs,game.hunts.areas[game.area]?.respawns,Date.now(),forceBoss);
    for(const slot of slots){
      const sector=region.sectors.find(s=>s.id===slot.sector),type=slot.type,profile=MareHunt.profile(game.area,slot.sector,type,.5),skin=activeMap().id==='dawn'?MareEmber.skins.cesar:activeMap().id==='embers'?MareEmber.skins[type]:null;
      world.mobs.push({id:world.nextID++,spawnId:slot.id,area:game.area,source:'world',type,name:forceBoss?region.boss:skin?.name||monsterTypes[type]?.name,skin:skin?.id,district:sector.id,x:slot.x,y:slot.y,anchorX:slot.x,anchorY:slot.y,...profile,hp:profile.maxHP,engaged:false,returning:false,attackClock:1,attackCount:0,bob:rand(0,6.28),alive:true,hit:0,slow:0,telegraph:null,emberFacing:'south',emberElapsed:0,attackAnim:0,moving:0,patrolClock:0});
      if(forceBoss){session.bossNotice=3.3;$('bossBanner').classList.remove('hidden');log(region.boss+' aguarda no setor final.','danger');}
    }
  }
  function spawnVisual(x,y,text,color='#f9e9bc',size=15){world.fx.push({x,y,text,color,life:1.25,max:1.25,dy:-28,size});if(world.fx.length>70)world.fx.splice(0,10);}
  function combatActorHeight(actor){
    if(actor===world.hero){let height=isRyuForm()?MareRyu.rules.worldSize:isBisonForm()?MareRankCExpansion.rules.bison.visuals.worldSize:isUshiForm()?74+MareUshi.visuals.labelLift:isWolfForm()?74+MareWolf.visuals.labelLift:isNekoForm()?74+MareNeko.visuals.labelLift:74;if(horuBuffActive())height*=MareRankC.rules.horu.scale;if(MareUltimates.selected(game)==='titan')height*=1.35;return height;}
    if(actor===session?.genie)return 106*(actor.scale||1);
    if(activeMap().id==='rare'&&actor.type==='cocox')return actor.y-(MareRareRenderer.cocoxHealthBarY(actor)+22);
    const art=MareNewIslandArt.layout(actor);return art?Math.max(48,actor.y-art.top):actor.type==='boss'?92:64;
  }
  function combatChest(actor){return {x:actor.x,y:actor.y-combatActorHeight(actor)*.45,alive:actor.alive!==false,isUntargetable:actor.isUntargetable,isInvulnerable:actor.isInvulnerable};}
  function combatVisualHeight(actor){
    const logical=combatActorHeight(actor);
    if(actor!==world.hero){
      const genie=actor===session?.genie,entry=MareSpriteCombatV2Data[genie?'hoya':actor.type];
      return entry?.world_scale?Math.max(logical,Math.ceil(entry.worldHeight*entry.world_scale*(genie?(actor.scale||1):1))):logical;
    }
    if(!game.zoanTransformed){const height=lobby96.height(game,scene);return height?height*logical/74:logical;}
    const key=MareSpriteCombatV2.fruits[equippedZoan()?.id],height=MareSpriteCombatV2Data[key]?.world_header_height;
    return height?Math.max(logical,Math.ceil(height*(MareUltimates.selected(game)==='titan'?1.35:1))):logical;
  }
  function emitCombatVfx(kind,actor){
    if(!kind||!MareCombatVfx.data.effects[kind])return;
    session.combatHits ||= [];if(kind==='heal'&&session.combatHits.some(f=>f.kind===kind&&f.actor===actor&&world.time-f.started<.15))return;
    const point=combatChest(actor),start=MareCombatVfx.impactStart(kind);session.combatHits.push({kind,actor,x:point.x,y:point.y,started:world.time,start,rate:kind==='heal'?1:MareCombatVfx.data.impactPlaybackRate});if(session.combatHits.length>96)session.combatHits.shift();
  }
  function launchCombatProjectile(kind,origin,target,onHit){
    const active=session,area=game.area,identity=basicAttackIdentity(),equippedFruitId=game.equipment?.akuma_no_mi?.fruitId||null,reach=getDerived().range+125;
    const p=MareCombatVfx.projectile(kind,origin,target.id,{target,commit:onHit,session:active,area,identity,equippedFruitId,born:world.time,releaseId:origin.releaseId??null,originOffset:{x:origin.x-world.hero.x,y:origin.y-world.hero.y}});if(kind==='cyborg'){const point=combatChest(target);p.x=point.x;p.y=point.y;}
    if(combatVfxBackend&&akumaBackend){const point=combatChest(target);p.launchReady=false;p.receipt=akumaRequest('vfx-launch',{instance:area,kind,x:origin.x,y:origin.y,target:{...point,id:target.id},reach}).then(r=>{p.launchReady=true;p.age=0;p.born=world.time;return r.token;});p.receipt.catch(()=>{if(p.phase!=='impact')p.phase='done';});}
    active.combatProjectiles ||= [];active.combatProjectiles.push(p);if(active.combatProjectiles.length>64){active.combatProjectiles[0].phase='done';active.combatProjectiles.shift();}return p;
  }
  function combatBeamOrigin(p){return p.mode==='beam'?{x:world.hero.x+p.originOffset.x,y:world.hero.y+p.originOffset.y}:p.origin;}
  function autoAttackLine(target,hero=world.hero){
    if(!combatLine(hero,target))return false;
    if(game.zoanTransformed||!MareCombatVfx.data.flightEnds[MareCombatVfx.data.classHits[game.classId]])return true;
    // The native weapon emitter can be behind scenery even when the feet ray is clear.
    // Use the same emission point and collision projection as the actual projectile.
    const dx=target.x-hero.x,dy=target.y-hero.y,direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
    const muzzle=lobby96.projectileOrigin(game,hero,{direction},horuBuffActive()?MareRankC.rules.horu.scale:1);
    const origin=muzzle||{x:hero.x+(dx<0?-1:dx>0?1:hero.facing)*13,y:hero.y-27},point=combatChest(target);
    return combatLine({x:origin.x,y:origin.y+24},{x:point.x,y:point.y+24});
  }
  function stepCombatVfx(dt){
    session.combatHits=(session.combatHits||[]).filter(f=>(world.time-f.started)*1000*(f.rate||1)<MareCombatVfx.data.effects[f.kind].frames.slice(f.start||0).reduce((sum,frame)=>sum+frame.duration,0)+(f.kind==='heal'?0:83));
    for(const p of session.combatProjectiles||[]){const valid=()=>session===p.session&&game.area===p.area&&scene==='hunt'&&game.hp>0&&session.respawn<=0&&basicAttackIdentity()===p.identity&&(game.equipment?.akuma_no_mi?.fruitId||null)===p.equippedFruitId&&(world.mobs.includes(p.target)||p.target.alive===false);if(p.phase!=='impact'&&!valid()){p.phase='done';continue;}if(p.phase!=='impact'&&p.target.alive===false){MareCombatVfx.finishImpact(p,combatChest(p.target));p.launchReady=true;continue;}if(p.launchReady===false){p.age+=dt;if(p.age>MareCombatVfx.data.maxFlight)p.phase='done';continue;}MareCombatVfx.step(p,p.born===world.time?0:dt,{
      target:combatChest(p.target),origin:combatBeamOrigin(p),valid,
      clear:(a,b)=>combatLine({x:a.x,y:a.y+24},{x:b.x,y:b.y+24}),
      authorize:()=>p.receipt?p.receipt.then(token=>{const point=combatChest(p.target);return akumaRequest('vfx-impact',{token,instance:p.area,x:p.x,y:p.y,target:{...point,id:p.target.id}});}):true,
      onHit:()=>p.commit()
    });}
    session.combatProjectiles=(session.combatProjectiles||[]).filter(p=>p.phase!=='done');
  }
  function combatStatus(actor){
    const hero=actor===world.hero,genie=actor===session.genie,rt=session.talents,rankA={stun:MareRankA.stunned(actor,world.time),bind:MareRankA.attackBlocked(actor,world.time),armorDown:MareRankA.defenseFactor(actor,world.time)<1},room=MareRankA.roomActive(session.rankA,world.time)||MareRankA.domeActive(session.rankA,world.time);
    return MareCombatVfx.statuses(actor,world.time,Date.now(),hero?{...rankA,armorUp:room||session.guard>0||supaShieldActive()||bisonShellActive()||rt.shield>0&&rt.shieldTime>0||session.haki.active==='armament',buff:room||session.blessing>0||bisonShellActive()||ushiBuffActive()||wolfAuraActive()||horuBuffActive()||session.kobuSupportUntil>Date.now()||rt.bloodlust>0||hoyaActive()||rt.ultimate.immortal>0||rt.ultimate.holyHP>0||rt.ultimate.holyAttack>0}:genie?{...rankA,buff:MareHoya.empowered(actor,world.time)}:rankA);
  }
  function combatHudBox(actor,width=60,name=''){ctx.save();ctx.font='bold 13px Trebuchet MS';const nameWidth=ctx.measureText(name).width;ctx.restore();return MareCombatVfx.layout(actor.x,actor.y,{height:combatVisualHeight(actor),barWidth:width,nameWidth});}
  function drawCombatHeader(actor,name,hp,maxHP,width=60,color='#5ed09c'){
    const box=combatHudBox(actor,width,name);ctx.save();ctx.textAlign='center';ctx.font='bold 13px Trebuchet MS';ctx.lineWidth=3;ctx.strokeStyle='#03171c';ctx.strokeText(name,actor.x,box.nameY);ctx.fillStyle='#effcf5';ctx.fillText(name,actor.x,box.nameY);px(ctx,actor.x-width/2,box.barY,width,7,'#001819');px(ctx,actor.x-width/2+1,box.barY+1,(width-2)*Math.max(0,Math.min(1,hp/Math.max(1,maxHP))),5,color);if(world.target===actor){ctx.strokeStyle='#d9b777';ctx.lineWidth=2;ctx.strokeRect(actor.x-width/2-3,box.barY-3,width+6,13);}ctx.restore();
  }
  function drawCombatVfx(){
    for(const p of session.combatProjectiles||[])MareCombatVfx.drawProjectile(ctx,p,{origin:combatBeamOrigin(p)});
    for(const f of session.combatHits||[]){const point=f.actor?combatChest(f.actor):f;MareCombatVfx.draw(ctx,f.kind,point.x,point.y,Math.min((world.time-f.started)*1000*(f.rate||1),MareCombatVfx.data.effects[f.kind].frames.slice(f.start||0).reduce((sum,frame)=>sum+frame.duration,0)-.001),{width:f.kind==='explosion'?96:f.kind==='heal'?Math.min(120,combatActorHeight(f.actor)+16):64,start:f.start||0});}
    if(game.hp>0&&session.respawn<=0)MareCombatVfx.drawStatuses(ctx,combatHudBox(world.hero,60,game.name),combatStatus(world.hero),world.time);
    for(const actor of livingMobs())MareCombatVfx.drawStatuses(ctx,combatHudBox(actor,actor.type==='boss'?88:65,monsterName(actor)+' · Nv.'+actor.level),combatStatus(actor),world.time);
    if(hoyaActive())MareCombatVfx.drawStatuses(ctx,combatHudBox(session.genie,64,'Gênio'),combatStatus(session.genie),world.time);
  }
  function addProjectile(x,y,tx,ty,color='#f4dfa1',born=null,releaseId=null){world.projectiles.push({x,y,tx,ty,progress:0,color,born,releaseId});}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function livingMobs(){return world.mobs.filter(m=>m.alive&&m.hp>0&&!m.returning);}
  function classCombatController(){
    return classCombat.controller(game,world.hero,{inHunt:scene==='hunt',transformed:!!(game?.zoanTransformed&&equippedZoan())});
  }
  function faceCombatTarget(m){
    const dx=m.x-world.hero.x,dy=m.y-world.hero.y;
    world.hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
    if(dx)world.hero.facing=dx<0?-1:1;
  }
  function chooseTarget(){let monsters=livingMobs().filter(m=>(rejectedTargets.get(m.id)||0)<=world.time);if(!monsters.length)return null;return monsters.reduce((best,cur)=>!best||distance(world.hero,cur)<distance(world.hero,best)?cur:best,null);}
  function outputDamage(m,amount,crit=false,visual={}){if(!m||!m.alive||m.returning||amount<=0)return 0;MareMonsterBehavior.hurt(m);MareHaki.touch(game,session.haki);if(m.rankSFreezeUntil>world.time){amount+=m.rankSFreezePower||0;m.rankSFreezeUntil=0;m.rankAStunUntil=0;m.rankSIceSlowUntil=world.time+3;m.rankSIceHeavyAttackUntil=world.time+3;}const damage=Math.min(m.hp,Math.max(1,Math.floor(amount)));m.hp=Math.max(0,m.hp-damage);MareSpriteCombatV2.hurt(m,damage,world.time,{protected:m.hp<=0||!!m.telegraph});m.hit=.25;game.stats.damage+=damage;const fruitVisual=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs);emitCombatVfx(MareCombatVfx.classify({fruitId:fruitVisual?.id,name:fruitVisual?.skills?.[0]?.name||'',damageType:fruitVisual?.family==='logia'?'magic':undefined,...visual}),m);spawnVisual(m.x+rand(-8,8),m.y-40,String(damage),crit?'#ffcd73':'#fff5e4',crit?22:15);if(((getDerived().fruitLifesteal||0)>0||wolfAuraActive())&&!session.wolfLeechResolving){session.wolfLeechResolving=true;try{session.healingDone+=restoreHero(damage*((getDerived().fruitLifesteal||0)+(wolfAuraActive()?MareWolf.rules.lifesteal:0)),{ignoreEfficiency:true});}finally{session.wolfLeechResolving=false;}}if(m.hp<=0)killMob(m);return damage;}
  function basicAttackIdentity(){return game?.zoanTransformed&&equippedZoan()?equippedZoan().id:game?.classId+':'+game?.factionId;}
  function basicAttackPose(){const a=session?.basicAttack;return a?.clock.locked()?a.clock.snapshot():null;}
  function cancelBasicAttack(){if(session?.basicAttack)session.basicAttack.clock.reset();if(session)session.basicAttack=null;if(world?.hero)world.hero.attackAnim=0;}
  function retimeAttack(clock,speed){
    const before=clock?.snapshot();if(!before?.scaled||!clock.setAttackSpeed(speed))return;
    const after=clock.snapshot();if(session.attackClock>0)session.attackClock*=after.duration/before.duration;
  }
  function syncBasicAttackVisual(){
    const pose=basicAttackPose();if(!pose)return;world.hero.attackAnim=Math.max(0,pose.duration-pose.elapsed);
    if(isWolfForm()){session.wolfBasicDuration=pose.duration;session.wolfBasicUntil=world.time+world.hero.attackAnim;}
    if(isNekoForm())session.nekoBasicUntil=world.time+world.hero.attackAnim;
    if(isUshiForm())session.ushiBasicUntil=world.time+world.hero.attackAnim;
  }
  function stepBasicAttack(dt){
    const a=session.basicAttack;if(!a)return;
    if(scene!=='hunt'||game.area!==a.area||basicAttackIdentity()!==a.identity||game.hp<=0||session.respawn>0||world.hero.talentControl?.remaining>0){cancelBasicAttack();return;}
    retimeAttack(a.clock,getDerived().speed);a.clock.step(dt,{inCombat:true,direction:world.hero.direction});
    if(!a.clock.locked()){session.basicAttack=null;world.hero.attackAnim=0;}else syncBasicAttackVisual();
  }
  function beginBasicAttack(m,mult,area,speed){
    if(basicAttackPose())return false;
    const fruit=game.zoanTransformed?equippedZoan():null;faceCombatTarget(m);
    const clip=fruit?MareZoanArt.attackTiming(fruit.id,world.hero.direction):{frames:4,fps:8,impact_frame:2,loop:false};if(!clip)return false;
    const clock=MareCombatAnimation.create({attack:clip}),identity=basicAttackIdentity(),zone=game.area;
    clock.play('attack',{direction:world.hero.direction,attackSpeed:speed,onImpact:()=>{
      if(basicAttackIdentity()===identity&&game.area===zone&&world.mobs.includes(m))heroAttack(m,mult,null,area,true);
    }});
    session.basicAttack={clock,identity,area:zone};world.hero.walking=0;syncBasicAttackVisual();return true;
  }
  function heroAttack(m,mult=1,skill=null,area=false,commit=false){
    if(hoyaActive()||session.jikiCharge)return false;
    if(ryuSkillActive()||wolfSkillActive()||ushiSkillActive()||nekoSkillActive()||!commit&&basicAttackPose())return false;
    if(isNekoForm()||isUshiForm()||isWolfForm()||isRyuForm())faceCombatTarget(m||world.hero);
    let s=getDerived();
    if(scene!=='hunt'||!m||!m.alive||world.hero.talentControl?.remaining>0||session.respawn>0||distance(world.hero,m)>s.range+(area?125:1)||!combatLine(world.hero,m))return false;
    const controller=classCombatController();
    if(controller&&!commit){
      if(controller.locked())return false;
      faceCombatTarget(m);world.hero.walking=0;
      const action=skill?'skill':classCombat.basicAction(game,world.hero);
      const accepted=controller.play(action,{direction:world.hero.direction,...(!skill?{attackSpeed:s.speed}:{}),onImpact:()=>heroAttack(m,mult,skill,area,true)});
      if(accepted&&!skill)world.hero.combatSequence++;
      return accepted;
    }
    if(!controller&&!commit&&!skill)return beginBasicAttack(m,mult,area,s.speed);
    MareHaki.touch(game,session.haki);s=getDerived();if(session.haki.active==='observation')session.haki.eyeFX=.25;
    if(session.talents.targetId!==m.id){session.talents.targetId=m.id;session.talents.combo=0;}
    const zoan=!!(game.zoanTransformed&&equippedZoan()),elemental=!zoan&&MareCharacters.roles[game.classId].magic;
    const type=skill?.damageType||(elemental?'elemental':'physical');
    if(type==='physical'&&!MareRankC.marked(m)&&Math.random()>s.accuracy){spawnVisual(m.x,m.y-40,'ERROU','#cec4a6',11);return true;}
    const rt=session.talents,ultimate=MareUltimates.selected(game),passiveArea=area||(!skill&&ultimate==='titan'),prepared=MareTalentCombat.beforeHit(game,rt,{target:m,hero:world.hero,stats:s,basic:!skill,magic:type==='elemental',area:passiveArea,critical:Math.random()<s.crit});
    const crit=prepared.critical,baseRaw=prepared.trueAmount??MareCharacters.damage(prepared.critMultiplier?{...s,critMultiplier:prepared.critMultiplier}:s,prepared.armor,{type,multiplier:mult*prepared.multiplier,variance:rand(.90,1.12),critical:crit});
    const raw=isUshiForm()&&!skill?baseRaw*MareUshi.basicMultiplier(ushiBuffActive()):baseRaw;
    if(!commit)world.hero.attackAnim=zoan?.75:.22;
    const color=skill?.element==='fire'?'#ff995b':skill?.element==='lightning'?'#dac2ff':elemental?'#70d9f1':classes[game.classId].color;
    const land=()=>{
    if(!m.alive||m.isUntargetable||m.isInvulnerable)return 0;
    if(skill?.element==='lightning')m.slow=4.5;
    const actual=outputDamage(m,isRyuForm()&&type==='physical'?MareRyu.mitigate(raw,m,session.haki.active==='armament'):raw,crit,{source:'class',classId:game.classId,category:zoan?MareCombatVfx.classify({fruitId:equippedZoan()?.id}):null,exclusive:!zoan&&!!MareCombatVfx.data.flightEnds[MareCombatVfx.data.classHits[game.classId]]});
    const passive=MareTalentCombat.afterHit(game,rt,{target:m,stats:s,basic:!skill,magic:type==='elemental',projectile:['gunner','cyborg','strategist','healer'].includes(game.classId),critical:crit,damage:actual});
    applyTalentContact(passive,m);
    applyUltimateActions(MareUltimates.after(game,rt.ultimate,{target:m,hero:world.hero,stats:s,damage:actual,basic:!skill,magic:type==='elemental',critical:crit,projectile:['gunner','cyborg','strategist','healer'].includes(game.classId)||ultimate==='spatial',enemies:livingMobs(),clear:(a,b)=>combatLine(a,b)}));

    if(passive.notice&&m.alive)spawnVisual(m.x,m.y-65,passive.notice,'#a7d5a4',10);
    if(passive.pierce)for(const other of MareTalentCombat.piercingTargets(world.hero,m,livingMobs(),s.range+125)){if(!combatLine(m,other))continue;const hit=()=>outputDamage(other,actual*.5,false,{source:'class',classId:game.classId,exclusive:true});launchCombatProjectile(MareCombatVfx.data.classHits[game.classId] in MareCombatVfx.data.flightEnds?MareCombatVfx.data.classHits[game.classId]:'gunner',combatChest(m),other,hit);}
    if(skill)spawnVisual(world.hero.x,world.hero.y-59,skill.element==='fire'?'FOGO':skill.element==='lightning'?'RAIO':'HABILIDADE!',color,11);
    return actual;
    };
    if(!zoan&&MareCombatVfx.data.flightEnds[MareCombatVfx.data.classHits[game.classId]]){
      const muzzle=!skill?(lobby96.projectileOrigin(game,world.hero,classCombatController()?.snapshot()||basicAttackPose()||{},horuBuffActive()?MareRankC.rules.horu.scale:1)):null;
      launchCombatProjectile(MareCombatVfx.data.classHits[game.classId],{x:muzzle?.x??world.hero.x+world.hero.facing*13,y:muzzle?.y??world.hero.y-27,releaseId:muzzle?.releaseId??null},m,land);
    }else land();
    return true;
  }
  function applyTalentContact(passive,target){
    if(passive.heal>0)restoreHero(passive.heal);
    if(passive.gold){game.gold+=passive.gold;game.stats.goldEarned+=passive.gold;session.gold+=passive.gold;spawnVisual(target.x,target.y-60,'+'+passive.gold+' Berry','#edcf83',11);}
  }
  function applyUltimateActions(actions){
    for(const action of actions){
      if(action.delay>0){session.talents.ultimate.delayed.push(action);continue;}
      if(action.selfBurn){takeDamage(action.selfBurn,null,false,true);continue;}
      if(action.visualOnly){world.fx.push({x:action.target.x,y:action.target.y,ring:1,life:.55,max:.55,color:{meteor:'#f79a53',lightning:'#d9c7fa',ice:'#a1ecff'}[action.kind]||'#a1ecff'});continue;}
      if(!action.target?.alive||session.respawn>0||game.hp<=0)continue;
      const amount=['artillery','empathy'].includes(action.kind)?MareCharacters.damage({...getDerived(),elemental:action.amount},enemyArmor(action.target,true),{type:'elemental'}):action.amount;
      const kind=MareCombatVfx.classify({source:'ability',name:action.kind,damageType:['artillery','empathy','meteor','lightning'].includes(action.kind)?'elemental':'physical'});
      const hit=()=>{if(!action.target.alive)return;const actual=outputDamage(action.target,amount,false,{source:'ability',category:kind,exclusive:!!action.from||['burn','poison'].includes(action.kind)});if(action.kind==='clone')applyTalentContact(MareTalentCombat.afterHit(game,session.talents,{target:action.target,...action.contact,damage:actual,contactScale:.5,fromClone:true}),action.target);};
      if(action.from)launchCombatProjectile(MareCombatVfx.data.classHits[game.classId] in MareCombatVfx.data.flightEnds?MareCombatVfx.data.classHits[game.classId]:'mage',{x:action.from.x,y:action.from.y-24},action.target,hit);else hit();
    }
  }
  function restoreHero(amount,{quiet=false,ignoreEfficiency=false}={}){
    if(game.hp<=0||session.respawn>0)return 0;
    const recipient={id:'hero',x:world.hero.x,y:world.hero.y,hp:game.hp,maxHP:getDerived().maxHP};
    const healed=MareCharacters.healRecipients([recipient],amount*(ignoreEfficiency?1:1+(getDerived().healingReceivedPercent||0)))[0].amount;game.hp=recipient.hp;
    if(healed>0&&!quiet)emitCombatVfx('heal',world.hero);
    if(healed>0&&!quiet)spawnVisual(world.hero.x,world.hero.y-59,'+'+Math.round(healed),'#88e0b3',17);
    if(scene==='hunt'&&(session.talents.combatRemaining>0||world.target?.alive))applyUltimateActions(MareUltimates.heal(game,session.talents.ultimate,{amount,effective:healed,stats:getDerived(),hero:world.hero,enemies:livingMobs(),clear:(a,b)=>combatLine(a,b)}));
    return healed;
  }
  function useSkill(i,manual=false){
    if(hoyaActive()||session.jikiCharge)return false;
    if(isNekoForm()||isUshiForm()||isWolfForm()||isRyuForm())return false;
    if(scene!=='hunt'||!game||!session||world.hero.talentControl?.remaining>0||session.respawn>0)return false;
    const controller=classCombatController();if(controller?.locked())return false;
    const skill=classes[game.classId].skills[i];if(!skill)return false;
    const m=world.target?.alive?world.target:chooseTarget(),d=getDerived();
    const self=['guard','heal','blessing'].includes(skill.type);
    const energyCost=MareUltimates.selected(game)==='archmage'?0:skill.cost*(1-d.energyEfficiency);
    if(session.cooldowns[i]>0||game.energy<energyCost){if(manual)toast('Habilidade indisponível: cooldown ou energia.');return false;}
    if((skill.type==='heal'&&game.hp>=d.maxHP&&!(MareUltimates.selected(game)==='eternalBlessing'&&(session.talents.combatRemaining>0||world.target?.alive)))||(skill.type==='blessing'&&session.blessing>0)){if(manual)toast('Você já está com vida cheia ou proteção ativa.');return false;}
    if(!self&&(!m||distance(world.hero,m)>d.range||!combatLine(world.hero,m))){if(manual)toast('Não há alvo ao alcance.');return false;}
    const impact=()=>{
      if(scene!=='hunt'||game.hp<=0||session.respawn>0)return;
      if(skill.type==='strike')heroAttack(m,skill.multiplier,skill,false,true);
      if(skill.type==='guard'){session.guard=7;restoreHero(Math.round(d.maxHP*(game.classId==='cyborg'?.12:.18)+d.healing*.25));}
      if(skill.type==='heal'){const healed=restoreHero(d.healing);session.healingDone=(session.healingDone||0)+healed;const self={id:'hero',x:world.hero.x,y:world.hero.y,hp:game.hp,maxHP:d.maxHP};MareTalentCombat.chainHeal(game,[self],self,healed);}
      if(skill.type==='blessing'){session.guard=8;session.blessing=8;world.fx.push({x:world.hero.x,y:world.hero.y,ring:1,life:.7,max:.7,color:'#8ce0b5'});}
      if(skill.type==='taunt'){
        session.guard=Math.max(session.guard,4);
        for(const other of livingMobs().filter(other=>distance(world.hero,other)<=d.range+125&&combatLine(world.hero,other))){
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
    game.energy-=energyCost;session.skillEnergySpent+=energyCost;session.cooldowns[i]=MareAkumaPassives.cooldown(skill.cd,MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id)*(game.factionId==='government'?.92:1);
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
  function killMob(m){if(!m.alive)return;if(m.spawnId){const p=game.hunts.areas[m.area||game.area];p.respawns||={};p.respawns[m.spawnId]=Date.now()+MareMonsterBehavior.RESPAWN_MS;}if(impelRun){completeImpelEnemy(m);return;}m.alive=false;world.corpses.push({id:m.id,x:m.x,y:m.y,instance:game.area,expires:world.time+12});if(akumaBackend)akumaCorpseQueue=akumaCorpseQueue.then(()=>akumaRequest('corpse',{corpse_id:String(m.id),instance:game.area,x:m.x,y:m.y})).catch(error=>console.warn('Cadáver não sincronizado:',error));const mana=MareTalentCombat.onKill(game,session.talents,getDerived());if(mana>0){game.energy=Math.min(getDerived().maxEnergy,game.energy+mana);spawnVisual(world.hero.x,world.hero.y-56,'+'+Math.round(mana)+' ENERGIA','#8ccfef',11);}world.target=world.target===m?null:world.target;const area=m.area||game.area,reward=MareHunt.rewards(area,m,game.level,Math.random()),record=MareHunt.recordKill(game,area,m.type);game=record.state;let gold=Math.round(reward.gold*(factions[game.factionId]?.gold||1)),xp=reward.xp;game.gold+=gold;game.stats.goldEarned+=gold;session.gold+=gold;game.stats.kills++;game.stats[m.type]=(game.stats[m.type]||0)+1;gainXP(xp);rewardNotice({gold,xp});spawnVisual(m.x,m.y-70,'+'+gold+' ✦','#e7cb87',13);world.fx.push({x:m.x,y:m.y,ring:1,life:.7,max:.7,color:'#ffdb9b'});
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
    if(m.type==='boss'){toast(''+monsterName(m)+' derrotado! +'+gold+' Berry','good');log('Você derrotou '+monsterName(m)+'!','gold');game.hasSeenBoss=true;world.bossCooldown=90;if(record.first)toast('Primeira vitória! Abra Rota & recompensas para resgatar sua arma.','good');saveGame();}
    else if(game.stats.kills===1){toast('Primeiro inimigo derrotado!','good');log('Primeira vitória! Continue sua caçada.','good');}
    if(game.stats.kills%6===0)saveGame();if(currentPanel==='hunt')renderPanel();
  }
  function addLoot(name,symbol){session.recentLoot.unshift({name,symbol});session.recentLoot=session.recentLoot.slice(0,4);}
  function lootIcon(name){const index=itemDefs.findIndex(item=>item.name===name);return index>=0?itemIcon(index,name):/ferro/i.test(name)?itemIcon('material',name):/poção/i.test(name)?itemIcon('potion',name):'';}
  function usePotion(manual=false){let d=getDerived();if(!game||!session||session.respawn>0)return false;if(game.potions<=0){if(manual)toast('Você não possui poções.','danger');return false;}if(game.hp>=d.maxHP){if(manual)toast('Sua vida já está cheia.');return false;}game.potions--;let heal=Math.round(d.maxHP*.44);restoreHero(heal);return true;}
  function buyPotion(){if(!game)return;if(game.gold<35){toast('Berry insuficientes.','danger');return;}game.gold-=35;game.potions++;toast('Poção adicionada à bolsa.','good');saveGame();updateUI();}
  function takeDamage(amount,source=null,physical=true,direct=false,reflected=false,damageType=null,hasHaki=false){
    if(hoyaActive())return;
    const bariActive=MareRankA.domeActive(session?.rankA,world.time),{projectile:bariProjectile,melee:bariMelee}=MareRankA.attackTags(world.hero,source,{physical,damageType:damageType||source?.damageType||'',reach:monsterTypes[source?.type]?.reach||60});
    if(bariActive&&bariProjectile)return;
    if(MareRankCExpansion.explosionImmune(MareAkuma.itemData(game?.equipment?.akuma_no_mi,itemDefs)?.id,damageType||source?.damageType||source?.damage_type))return;
    if(session.respawn>0||game.hp<=0)return;
    if(!direct)MareHaki.touch(game,session.haki);
    if(DEV_ACTIVE&&game.devOptions?.godMode)return;
    if(session.fruitInvulnerable>0)return;
    const d=getDerived();if(!direct&&Math.random()<d.evasion){session.haki.eyeFX=.35;spawnVisual(world.hero.x,world.hero.y-46,'ESQUIVA','#b8a8ef',13);return;}
    const rawBeforeLogia=direct?amount:MareCharacters.incoming(physical?d:{...d,defense:d.magicDefense??d.defense},amount*(source?.kobuDebuffUntil>Date.now()?.8:1)*(source?.hakiDebuff>0?.85:1)*(physical?1-(d.impactResistancePercent||0):1),session.guard>0,rand(.85,1.1)),raw=MareRankB.reduction(rawBeforeLogia,{equipped:MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,physical,hasHaki:hasHaki===true||source?.hasHaki===true}),retaliation=MareAkuma.retaliate(amount,raw,{active:supaShieldActive()&&!reflected,physical,direct}),reaction=direct?{damage:raw*(bariActive?.2:1)}:MareTalentCombat.receive(game,session.talents,{stats:d,amount:retaliation.damage*(bariActive?.2:1),physical,source,melee:!!source&&physical&&monsterTypes[source.type].reach<=60});
    if(reaction.untargetable||reaction.invulnerable)return;
    game.energy=Math.max(0,game.energy-(reaction.energyUsed||0));
    if(reaction.parry){spawnVisual(world.hero.x,world.hero.y-60,'APAROU','#e5d6a2',13);if(source?.alive&&distance(world.hero,source)<=d.range&&combatLine(world.hero,source))outputDamage(source,MareCharacters.damage(d,enemyArmor(source)*(1-d.penetration)));return;}
    const hpBefore=game.hp,dmg=MareUshi.receive(reaction.damage,ushiBuffActive());game.hp=reaction.shieldTriggered||reaction.trigger==='immortal'?1:Math.max(0,game.hp-dmg);const appliedDamage=Math.max(0,hpBefore-game.hp);MareSpriteCombatV2.hurt(world.hero,appliedDamage,world.time,{protected:game.hp<=0||ryuSkillActive()||wolfSkillActive()||ushiSkillActive()||nekoSkillActive()||bisonSkillActive()||world.time<(session.zoanActionUntil||0)||!!session.zoanTransition?.effect});if(dmg>0)emitCombatVfx(physical?'punch':'mage',world.hero);session.lastHit=.25;
    if(reaction.shieldTriggered){game.talentCooldowns.energyShieldUntil=Date.now()+MareUltimates.internalCooldown(game,90000);saveGame();spawnVisual(world.hero.x,world.hero.y-62,'ESCUDO DE ENERGIA','#8bd6f0',12);}
    if(dmg>0&&source?.alive){const fruitId=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,reflectedDamage=(retaliation.reflected||0)+MareAkumaPassives.reflection(dmg,fruitId,{physical,direct,reflected});if(reflectedDamage>0)outputDamage(source,reflectedDamage);}
    if(reaction.reflect&&source?.alive)outputDamage(source,reaction.reflect);
    if(bariActive&&bariMelee&&!reflected&&appliedDamage>0&&source?.alive)outputDamage(source,appliedDamage*.2,false,{exclusive:true,kind:'bari-reflect'});
    if(reaction.trigger){
      const u=reaction.trigger,now=Date.now();
      if(u==='immortal')game.talentCooldowns.immortalUntil=now+600000;
      if(u==='guardianAngel'){game.talentCooldowns.guardianUntil=now+600000;game.hp=d.maxHP;game.energy=d.maxEnergy;for(const m of onScreenMobs())m.talentControl={type:'stun',remaining:2};}
      if(u==='emp'){game.talentCooldowns.empUntil=now+45000;for(const m of onScreenMobs())m.empRemaining=10;}
      saveGame();spawnVisual(world.hero.x,world.hero.y-100,{immortal:'IMORTAL',guardianAngel:'ANJO GUARDIÃO',emp:'PULSO EMP'}[u],'#f4dd9f',16);
    }
    if(!direct&&dmg>0)spawnVisual(world.hero.x+10,world.hero.y-36,'-'+Math.round(dmg),'#ff9b94',14);
    if(reaction.explode&&game.hp>0)for(const m of livingMobs().filter(m=>distance(world.hero,m)<=120&&combatLine(world.hero,m)))outputDamage(m,MareCharacters.damage({...d,elemental:d.attack},enemyArmor(m,true)*(1-d.magicPen),{type:'elemental',multiplier:.6}));
    const controller=classCombatController();
    if(controller&&(!direct||game.hp<=0)){world.hero.walking=0;controller.play(game.hp<=0?'death':'hurt',{direction:world.hero.direction});}
    if(game.hp<=0){clearRankA();clearRankB();clearExpansion();clearRankC();cancelBasicAttack();cancelNekoAction();clearUshiState();clearWolfState();clearRyuState();clearSupaProtection();session.respawn=4.1;for(const mob of world.mobs)if(mob.alive)MareMonsterBehavior.disengage(mob);session.heroKOs++;MareHaki.stop(session.haki);session.talents=MareTalentCombat.create();toast('Você caiu em combate. Retornando em 4 segundos.','danger');log('Derrotado em batalha. Você renascerá em breve.','danger');world.target=null;}
  }
  function enemyArmor(m,magic=false){return (magic?1:MareRankA.defenseFactor(m,world.time))*(m.rankSDefenseUntil>world.time?.2:1)*(m.rankSPhoenixDefenseUntil>world.time?.5:1)*(m.kobuDebuffUntil>Date.now()?.8:1)*(m.empRemaining>0?0:(magic?(m.magicDefense??m.defense):m.defense)*(m.hakiDebuff>0?.85:1)*(m.zoanDefense?.remaining>0?.95:1));}
  function onScreenMobs(){return livingMobs().filter(m=>m.x>=camera.x&&m.x<=camera.x+W&&m.y>=camera.y&&m.y<=camera.y+H);}
  function tick(dt){
    if(!game||!session)return;
    const actor=world.hero,from={x:actor.x,y:actor.y},identity=scene+':'+game.area+':'+basicAttackIdentity();
    try{tickSimulation(dt);}finally{
      if(world.hero===actor){
        const context=scene+':'+game.area+':'+basicAttackIdentity(),active=identity===context&&!game.zoanTransformed&&actor.walking>0&&!classCombatController()?.locked()&&!basicAttackPose();
        lobby96.stepWalk(actor,world.time,active,{from,dt,context});
      }
    }
  }
  function tickSimulation(dt){if(!game||!session)return;if(impelRun?.pending||impelRun?.preparationPending)return;if(impelRun?.transitionAt!=null&&world.time>=impelRun.transitionAt){impelRun.transitionAt=null;impelRun.advance();if(impelRun.phase==='complete'){toast('Impel Down concluído!','good');returnLobby();return;}if(startImpelFloor()===false)return;}world.time+=dt;syncZoanTransition();session.elapsed+=dt;
    if(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id===MareRankS.rules.phoenix.id){session.phoenixRegen=(session.phoenixRegen||0)+dt;while(session.phoenixRegen>=10){session.phoenixRegen-=10;const d=getDerived();game.hp=Math.min(d.maxHP,game.hp+d.maxHP*.1);game.energy=Math.min(d.maxEnergy,game.energy+d.maxEnergy*.1);}}else session.phoenixRegen=0;game.totalPlay+=dt;session.cooldowns=session.cooldowns.map(v=>Math.max(0,v-dt));session.fruitCooldown=Math.max(0,session.fruitCooldown-dt);session.fruitInvulnerable=Math.max(0,session.fruitInvulnerable-dt);session.fruitBurst=Math.max(0,session.fruitBurst-dt);if(session.fruitBurst<=0&&world.hero.visible===false){world.hero.visible=true;session.beriSpheres=null;}world.corpses=world.corpses.filter(c=>c.expires>world.time);world.food=world.food.filter(f=>f.expires>world.time);session.guard=Math.max(0,session.guard-dt);session.blessing=Math.max(0,session.blessing-dt);session.lastHit=Math.max(0,session.lastHit-dt);session.bossNotice=Math.max(0,session.bossNotice-dt);if(session.bossNotice<=0)$('bossBanner').classList.add('hidden');world.hero.attackAnim=Math.max(0,world.hero.attackAnim-dt);world.hero.walking=Math.max(0,world.hero.walking-dt);
    if(session.zoanDash){const dash=session.zoanDash,step=Math.min(dash.remaining,800*dt),beforeX=world.hero.x,beforeY=world.hero.y;navigator().move(world.hero,dash.dx*step,dash.dy*step);const moved=Math.hypot(world.hero.x-beforeX,world.hero.y-beforeY);dash.remaining-=step;world.hero.walking=.2;for(const mob of livingMobs())if(!dash.hit&&(dash.hitId==null||String(dash.hitId)===String(mob.id))&&Math.hypot(mob.x-world.hero.x,mob.y-world.hero.y)<45){dash.hit=true;session.zoanVisualHitAt=world.time;outputDamage(mob,MareCharacters.damage(getDerived(),enemyArmor(mob),{type:'physical',multiplier:.55}));navigator().move(mob,dash.dx*45,dash.dy*45);world.fx.push({x:mob.x,y:mob.y,ring:1,life:.3,max:.3,color:'#e7a65a'});}if(dash.remaining<=0||moved<.1)session.zoanDash=null;}
    stepRankA();stepJiki(dt);stepHoya(dt);stepRankB();stepExpansion(dt);stepRankC(dt);stepBasicAttack(dt);stepNekoAction(dt);stepUshiAction();stepDoruProjectiles(dt);stepWolfAction(dt);stepWolfBleeds();stepRyuAction();stepCombatVfx(dt);
    MareHaki.tick(game,session.haki,dt,{alive:game.hp>0&&session.respawn<=0,inHunt:scene==='hunt'});
    if(DEV_ACTIVE){if(game.devOptions?.infiniteWill&&game.has_haki_unlocked)game.haki.current=100;if(game.devOptions?.noCooldown){session.cooldowns=[0,0,0];game.talentCooldowns={};game.haki.kingReadyAt=0;}}
    for(const m of world.mobs)m.hakiDebuff=Math.max(0,(m.hakiDebuff||0)-dt);
    const combat=classCombatController();
    retimeAttack(combat,getDerived().speed);
    combat?.step(dt,{moving:world.hero.walking>0,inCombat:scene==='hunt',direction:world.hero.direction});
    world.fx=world.fx.filter(f=>(f.life-=dt)>0);for(let f of world.fx)if(Number.isFinite(f.dy))f.y+=f.dy*dt;world.projectiles=world.projectiles.filter(p=>(p.progress+=(p.born===world.time)?0:dt*3.7)<1);
    if(world.hero.talentControl)world.hero.talentControl.remaining=Math.max(0,world.hero.talentControl.remaining-dt);
    for(const action of MareTalentCombat.tick(session.talents,dt,scene==='hunt'?livingMobs():[])){if(scene==='hunt'&&session.respawn<=0&&action.target.alive)outputDamage(action.target,action.amount,false,{exclusive:true});}
    if(session.respawn<=0)applyUltimateActions(MareUltimates.tick(game,session.talents.ultimate,dt,{hero:world.hero,stats:getDerived(),inCombat:scene==='hunt'&&(session.talents.combatRemaining>0||!!world.target?.alive),inHunt:scene==='hunt',enemies:scene==='hunt'?livingMobs():[],clear:(a,b)=>combatLine(a,b),move:(m,dx,dy)=>navigator().move(m,dx,dy)}));
    if(MareUltimates.selected(game)==='armamentSkin'&&session.talents.ultimate.vigor>0&&world.hero.talentControl)world.hero.talentControl.remaining=0;
    const stats=getDerived();game.energy=Math.min(stats.maxEnergy,game.energy+dt*stats.energyRegen);
    if(scene==='lobby'){
      game.hp=Math.min(stats.maxHP,game.hp+dt*(stats.healthRegen+1.9));
      moveManually(dt);
      return;
    }
    if(session.respawn>0){session.respawn-=dt;if(session.respawn<=0){session.respawn=0;combat?.reset('front');world.hero.direction='front';game.hp=stats.maxHP;game.energy=stats.maxEnergy;Object.assign(world.hero,activeMap().spawn);travelPath=[];lobbyDestination=null;pursuit=new WeakMap();camera.update(world.hero,activeMap(),0,true);if(impelRun)startImpelFloor();toast(impelRun?'Tente novamente este andar.':'Você retornou ao cais da ilha.','good');}return;}
    for(const food of [...world.food])if(!food.pending&&world.time>=(food.readyAt||0)&&Math.hypot(food.x-world.hero.x,food.y-world.hero.y)<25){food.pending=true;const collect=async()=>{try{if(akumaBackend)await akumaRequest('pickup',{food_id:String(food.id),instance:game.area,x:world.hero.x,y:world.hero.y});restoreHero(stats.maxHP*.15,{ignoreEfficiency:true});world.food=world.food.filter(f=>f!==food);spawnVisual(food.x,food.y-45,'COMIDA','#ffd700',12);}catch(error){food.pending=false;}};void collect();}
    restoreHero(dt*(stats.healthRegen+(session.blessing>0?stats.regenBuff:0)),{quiet:true});useAutoSupport(stats);if(autoPlay&&game.hp<stats.maxHP*.40&&game.potions>0)usePotion(false);
    moveManually(dt);
    if(scene!=='hunt')return; // The quay interaction may have returned to the lobby this tick.
    for(let mob of world.mobs){
      if(!mob.alive)continue;
      const enemyTarget=combatFocus();
      mob.emberElapsed=(mob.emberElapsed||0)+dt;mob.hit=Math.max(0,mob.hit-dt);mob.attackAnim=Math.max(0,(mob.attackAnim||0)-dt);
      const beforeX=mob.x,beforeY=mob.y;
      const behavior=MareMonsterBehavior.intent(mob,enemyTarget,game.hp>0&&session.respawn<=0,!!impelRun);
      if(behavior!=='fight'){
        mob.telegraph=null;mob.attackAnim=0;
        const controlled=mob.empRemaining>0||mob.talentControl?.remaining>0||MareRyu.stunned(mob,world.time)||MareRankB.stunned(mob,world.time)||MareRankA.stunned(mob,world.time)||MareRankA.dragged(mob,world.time)||MareDoru.isRooted(mob,world.time)||mob.isRooted||mob.isImmobilized;
        if(behavior==='idle'){
          const nav=navigator(),goal=MareMonsterBehavior.patrol(mob,dt,(from,to)=>{
            const steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4);
            for(let i=1;i<=steps;i++)if(!nav.walkable(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps))return false;
            return true;
          },controlled);
          if(goal){const d=Math.hypot(goal.x-mob.x,goal.y-mob.y),step=Math.min(d,mob.speed*MareRankA.slowFactor(mob,world.time)*.45*dt);if(d>0)nav.move(mob,(goal.x-mob.x)/d*step,(goal.y-mob.y)/d*step);}
        }
        if(behavior==='return'&&!controlled){if(world.target===mob)world.target=null;if(Math.hypot(mob.x-mob.anchorX,mob.y-mob.anchorY)<=8)MareMonsterBehavior.home(mob);else navigateEntity(mob,{x:mob.anchorX,y:mob.anchorY},mob.speed*MareRankA.slowFactor(mob,world.time),dt,4);}mob.moving=Math.hypot(mob.x-beforeX,mob.y-beforeY)>.2?.2:0;const dx=mob.x-beforeX,dy=mob.y-beforeY;if(Math.hypot(dx,dy)>.01)mob.emberFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south');continue;}
      if(mob.telegraph){const resolved=MareHunt.stepWarning(mob,dt,enemyTarget,{blocked:mob.empRemaining>0||mob.talentControl?.remaining>0||MareRyu.stunned(mob,world.time)||MareRankB.stunned(mob,world.time)||MareRankA.stunned(mob,world.time)||MareRankA.dragged(mob,world.time)||(enemyTarget===world.hero&&session.talents.ultimate.hidden),clear:combatLine(mob,enemyTarget)});if(resolved){if(resolved.hit&&!(resolved.warning?.groundTrap&&game.zoanTransformed&&equippedZoan()?.id==='akuma_tori_albatroz'&&Date.now()<(game.zoanAltitudeUntil||0)))receiveEnemyAttack(enemyTarget,mob.attack*resolved.multiplier,mob,mob.type!=='spirit',false,false,resolved.warning?.damageType);else spawnVisual(enemyTarget.x,enemyTarget.y-55,'FORA DE ALCANCE','#b8e1ca',10);mob.attackClock=mob.attackSec||monsterTypes[mob.type].attackSec;}continue;}
      if(mob.bisonStunUntil&&world.time>=mob.bisonStunUntil){mob.isStunned=MareRankB.stunned(mob,world.time)||MareRankA.stunned(mob,world.time)||mob.talentControl?.remaining>0;delete mob.bisonStunUntil;}
      if(mob.talentControl?.remaining>0||MareRyu.stunned(mob,world.time)||MareRankB.stunned(mob,world.time)||MareRankA.stunned(mob,world.time)||(enemyTarget===world.hero&&session.talents.ultimate.hidden)){mob.telegraph=null;continue;}
      mob.slow=Math.max(0,(mob.slow||0)-dt);if(mob.zoanSlow)mob.zoanSlow.remaining=Math.max(0,mob.zoanSlow.remaining-dt);if(mob.zoanDefense)mob.zoanDefense.remaining=Math.max(0,mob.zoanDefense.remaining-dt);mob.attackClock-=dt*(mob.rankSIceHeavyAttackUntil>world.time?.5:mob.rankSIceAttackUntil>world.time?.6:1);mob.bob+=dt*2;
      if(mob.taunt)mob.taunt.remaining=Math.max(0,mob.taunt.remaining-dt);
      const reach=mob.reach||monsterTypes[mob.type].reach,md=distance(mob,enemyTarget);
       if(mob.attackClock<=0){if(!MareRankA.attackBlocked(mob,world.time)&&md<=reach+10&&combatLine(mob,enemyTarget)&&!(enemyTarget===world.hero&&session.talents.ultimate.hidden)&&!(mob.empRemaining>0)){mob.emberFacing=Math.abs(enemyTarget.x-mob.x)>Math.abs(enemyTarget.y-mob.y)?(enemyTarget.x<mob.x?'west':'east'):(enemyTarget.y<mob.y?'north':'south');mob.attackAnim=mob.type==='bananawani'?.9:(['cocox','sham','buchi','pearl','gin','kuroobi','chew','cesar','mr3','cabaji','marinheiro','helmeppo',...MareAlubarna.specs.map(s=>s.type)].includes(mob.type)||mob.type==='boss'&&mob.area==='beach')?.58:0;const warning=MareHunt.beginWarning(mob,enemyTarget);mob.attackCount=(mob.attackCount||0)+1;if(warning){mob.telegraph=warning;spawnVisual(mob.x,mob.y-95,warning.name,'#ffcb82',12);}else receiveEnemyAttack(enemyTarget,mob.attack,mob,mob.type!=='spirit');mob.attackClock=mob.attackSec||monsterTypes[mob.type].attackSec;}else mob.attackClock=.3;}
      if(mob.telegraph)continue;
      if(MareDoru.isRooted(mob,world.time)||MareRankB.rooted(mob,world.time)){mob.moving=0;continue;}
      const fromAnchor=Math.hypot(enemyTarget.x-mob.anchorX,enemyTarget.y-mob.anchorY),aggro=mob.aggro||300;
      if(!impelRun&&fromAnchor>500&&md>reach){navigateEntity(mob,{x:mob.anchorX,y:mob.anchorY},mob.speed*MareRankA.slowFactor(mob,world.time)*.65,dt,20);continue;}
      if(md>reach*.75&&(md<aggro||mob.taunt?.remaining>0))navigateEntity(mob,enemyTarget,mob.speed*MareRankA.slowFactor(mob,world.time)*Math.min(mob.slow>0?.55:1,mob.talentSlow?.remaining>0?1-mob.talentSlow.percent:1,mob.zoanSlow?.remaining>0?1-mob.zoanSlow.percent:1)*.65,dt,reach*.75);
       else if(['cocox','sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro','helmeppo','bananawani'].includes(mob.type)&&md>=aggro){
        mob.patrolClock-=dt;
        if(mob.patrolClock<=0){const a=mob.bob+world.time*.7,r=65+40*Math.sin(mob.bob);mob.patrolTarget=navigator().nearest({x:mob.anchorX+Math.cos(a)*r,y:mob.anchorY+Math.sin(a)*r});mob.patrolClock=2.4;}
        if(mob.patrolTarget)navigateEntity(mob,mob.patrolTarget,mob.speed*MareRankA.slowFactor(mob,world.time)*.33,dt,9);
      }else if(md>=aggro)navigator().move(mob,Math.sin(world.time*.65+mob.bob)*dt*2,0);
      mob.moving=Math.hypot(mob.x-beforeX,mob.y-beforeY)>0.2?.2:Math.max(0,(mob.moving||0)-dt);
      const dx=mob.x-beforeX,dy=mob.y-beforeY;if(Math.hypot(dx,dy)>.01)mob.emberFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south');
    }

    // Descartar inimigos derrotados: eles não podem bloquear novos spawns.
    if(world.mobs.some(m=>!m.alive||m.hp<=0))world.mobs=world.mobs.filter(m=>m.alive&&m.hp>0);
    const activeSector=MareHunt.sectorAt(game.area,combatFocus(),huntAnchors()).id;if(!impelRun)world.mobs=world.mobs.filter(m=>m.spawnId||m.type==='boss'||MareMonsterCatalog[m.type]?.boss===true||m.district===activeSector||distance(m,world.hero)<380||world.target===m||retainRankCTarget(m));
    world.spawnClock-=dt;world.bossCooldown=Math.max(0,world.bossCooldown-dt);
    if(!impelRun&&world.spawnClock<=0){world.spawnClock=2.4;spawnMob();if(!livingMobs().some(m=>m.type==='boss')&&MareHunt.bossReady(game,game.area,combatFocus(),Date.now(),huntAnchors()))spawnMob(true);}
    if(hoyaActive())return;
    if(!autoPlay||world.hero.talentControl?.remaining>0||nekoSkillActive()||ushiSkillActive()||ryuSkillActive()||wolfSkillActive()||bisonSkillActive()){session.attackClock=0;return;}
    // A transição entre cenas não pode deixar um alvo morto ou timer antigo congelar o Auto-Hunt.
    if(!Number.isFinite(session.attackClock)||session.attackClock>3)session.attackClock=0;
    const danger=livingMobs().find(m=>m.telegraph&&MareHunt.danger(m.telegraph,world.hero));
    if(danger){const candidates=[];for(const radius of [90,170,240])for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:world.hero.x+Math.cos(a)*radius,y:world.hero.y+Math.sin(a)*radius};if(!livingMobs().some(m=>m.telegraph&&MareHunt.danger(m.telegraph,p,22))&&navigator().walkable(p.x,p.y)&&navigator().clear(world.hero,p))candidates.push(p);}if(candidates.length){navigateEntity(world.hero,candidates[0],stats.huntSpeed,dt,2);session.attackClock=0;return;}}
    let target=world.target?.alive&&world.target.hp>0?world.target:chooseTarget();world.target=target;
    if(target){let dist=distance(world.hero,target), desired=stats.range-8;const attackLine=autoAttackLine(target);
      if(dist>desired||!attackLine){
        const speed=stats.huntSpeed;
        if(!navigateEntity(world.hero,target,speed,dt,attackLine?desired:0)){rejectedTargets.set(target.id,world.time+4);world.target=null;}
      }

      else{
        // Ranged classes keep space when the local navigation permits a retreat.
        if(['gunner','strategist','healer'].includes(game.classId)&&dist<stats.range*.45&&dist>0){
          const dx=(world.hero.x-target.x)/dist,dy=(world.hero.y-target.y)/dist;
          const retreat={...world.hero,x:world.hero.x+dx*stats.huntSpeed*dt,y:world.hero.y+dy*stats.huntSpeed*dt};
          if(autoAttackLine(target,retreat))navigator().move(world.hero,dx*stats.huntSpeed*dt,dy*stats.huntSpeed*dt);
        }
        if(classCombatController()&&autoSkills&&!classCombatController().locked()){
          for(const [i,skill] of classes[game.classId].skills.entries()){
            if(skill.type==='strike'||(skill.type==='area'&&livingMobs().filter(m=>distance(m,target)<125).length>=2))useSkill(i);
          }
        }
        session.attackClock-=dt;if(session.attackClock<=0&&heroAttack(target))session.attackClock=MareCombatAnimation.attackDuration(stats.speed);
        if(autoSkills)for(const [i,skill] of classes[game.classId].skills.entries()){
          if(skill.type==='strike'||skill.type==='taunt'||(skill.type==='area'&&livingMobs().filter(m=>distance(m,target)<125).length>=2))useSkill(i);
        }
      }
    }
  }
  function bar(id,value,max){$(id).style.width=(clamp(value/max,0,1)*100).toFixed(1)+'%';}

  function showHakiRequirements(){showConfirmation('Haki bloqueado','Requisitos: alcançar o nível 50 e consumir um Livro da Vontade. O livro tem 5% de chance em chefes de mundo aberto ou diários de nível 30 ou superior. Nível atual: '+game.level+'.',()=>{},'ENTENDI',false);}
  function updateHakiHUD(){
    const show=game.level>=MareHaki.rules.level,unlocked=show&&game.has_haki_unlocked,row=$('miniWillpower'),widget=$('hakiQuickCast');
    row.classList.toggle('hidden',!show);widget.classList.toggle('hidden',!unlocked);document.body.classList.toggle('has-haki',unlocked);
    if(show){const max=MareHaki.rules.maxWillpower,current=game.haki.current;
      $('willpowerFill').style.width=(clamp(current/max,0,1)*100)+'%';$('willpowerText').textContent=Math.floor(current)+' / '+max;
      row.setAttribute('aria-valuenow',Math.floor(current));row.setAttribute('aria-valuemax',max);
    }
    // Displaying the reserve at level 50 does not grant the book-gated Haki skills.
    if(!unlocked)return;
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
    const result=MareHaki.cast(game,session.haki,world.hero,livingMobs(),{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0,clear:(a,b)=>combatLine(a,b)});
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
  const notificationManager=MareNotifications.create();
  window.NotificationManager=notificationManager;
  const notificationLabels=new WeakMap();
  notificationManager.subscribe(state=>{
    for(const button of document.querySelectorAll('[data-notification]')){
      if(!notificationLabels.has(button))notificationLabels.set(button,button.getAttribute('aria-label')||button.querySelector('span')?.textContent||'Personagem');
      const count=state[button.dataset.notification]||0;
      let badge=button.querySelector('.hud-notification-badge');
      if(!badge){badge=document.createElement('span');badge.className='hud-notification-badge';badge.setAttribute('aria-hidden','true');button.append(badge);}
      badge.textContent=MareNotifications.label(count);badge.hidden=count<=0;
      button.setAttribute('aria-label',notificationLabels.get(button)+(count>0?', '+count+' pendência'+(count===1?'':'s'):''));
    }
    const trigger=$('characterMenuTrigger');
    trigger.setAttribute('aria-expanded',String(!$('characterQuickMenu').classList.contains('hidden')));
    let announcement=$('hudNotificationStatus');
    if(!announcement){announcement=document.createElement('span');announcement.id='hudNotificationStatus';announcement.className='hud-notification-status';announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');$('mainMenu').append(announcement);}
    announcement.textContent=state.character>0?'Personagem: '+state.character+' pendências.':'';
  });
  function updateNotifications(){
    notificationManager.update({attributes:game.attributePoints,talents:MareTalents.available(game),canBePromoted:MareHierarchy.next(game.hierarchyTier,game.level).state==='ready',unclaimedAchievements:MareAchievements.list(game).filter(a=>a.ready).map(a=>a.id)});
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
    updateHuntHUD();updateHakiHUD();if(currentPanel==='contracts')refreshContractsBoard();if(currentPanel==='inventory')refreshInventoryComparison();if(characterTab==='haki'&&currentPanel==='character')MareHakiUI.refresh($('dialogBody'),game,session.haki,{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0});game=observeAchievements();updateNotifications();if(characterTab==='achievements'&&currentPanel==='character')MareTalentUI.refreshAchievements($('dialogBody'),game);updateTalentResource();if(currentPanel==='forge'&&forgeUI.tab==='fusion'&&forgeFusionStamp!==fusionInventoryStamp())renderPanel();let derived=getDerived(),c=classes[game.classId];$('heroLevel').textContent=game.level;$('heroClass').textContent=c.name.toUpperCase();configureFactionVisual();$('heroName').textContent=game.name;$('heroPower').textContent=fmt(derived.power);$('hpText').textContent=fmt(game.hp)+' / '+fmt(derived.maxHP);$('energyText').textContent=fmt(game.energy)+' / '+fmt(derived.maxEnergy);$('xpText').textContent=fmt(game.xp)+' / '+fmt(xpNeeded(game.level));bar('hpFill',game.hp,derived.maxHP);bar('energyFill',game.energy,derived.maxEnergy);bar('xpFill',game.xp,xpNeeded(game.level));$('goldAmount').textContent=fmt(game.gold);$('statAttack').textContent=fmt(derived.attack);$('statDefense').textContent=fmt(derived.defense);$('statCrit').textContent=Math.round(derived.crit*100)+'%';$('statSpeed').textContent=derived.speed.toFixed(2)+'/s';$('sessionTimer').textContent=elapsedString(session.elapsed);$('killsCount').textContent=fmt(game.stats.kills);$('bossCount').textContent=fmt(game.stats.boss);$('goldEarned').textContent=fmt(session.gold);$('damageTotal').textContent=fmt(game.stats.damage);$('expeditionState').textContent=scene==='lobby'?'NO PORTO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇANDO':'EM PAUSA';$('potionCount').textContent=game.potions;$('autoLabel').textContent=autoPlay?'ATIVADA':'PAUSADA';$('autoToggle').classList.toggle('active',autoPlay);$('autoToggle').disabled=scene==='lobby';$('autoToggle').classList.toggle('hidden',scene==='lobby');$('combatState').innerHTML='<i class="pulse-dot '+(autoPlay?'':'paused')+'"></i>'+(scene==='lobby'?'PORTO SEGURO':session.respawn>0?'RENASCENDO':autoPlay?'CAÇADA AUTOMÁTICA':'CAÇADA PAUSADA');$('targetHint').textContent=scene==='lobby'?'NPCS · MISSÕES · FORJA · EXPEDIÇÕES':world.target?.alive?'ALVO: '+monsterName(world.target).toUpperCase():'PROCURANDO ALVO...';
    const hasTarget=scene==='hunt'&&world.target?.alive;
    $('targetHud').classList.toggle('hidden',scene!=='hunt'||!hasTarget);
    if(scene==='hunt'){
      if(['orange','loguetown','rare','syrup','baratie','alabasta',...MareAlubarna.specs.map(s=>s.id)].includes(activeMap().id))$('overlayArea').textContent=MareHunt.sectorAt(game.area,world.hero,huntAnchors()).name.toUpperCase();
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
    const fruitSkill=currentFruitSkill('1');
    [0,1,2].forEach((i)=>{const fruitId=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,slotSkill=currentFruitSkill(String(i+1)),fruitSlot=!!slotSkill,remaining=fruitId===MareRankC.rules.mato.id&&i===0&&rankCFreeCasts()?0:fruitSlot?Math.max(0,((game.fruitCooldowns?.[(MareRankA.has(fruitId)?MareRankA.cooldownKey(fruitId,slotSkill.key,session.rankA,world.time):MareAkuma.cooldownKey(fruitId,slotSkill.key))]||0)-Date.now())/1000):session.cooldowns[i],el=$('cooldown'+(i+1)),button=$('skill'+(i+1)),icon=$('skill'+(i+1)+'Icon');
      if(i===2){button.classList.toggle('hidden',!fruitSlot);if(!fruitSlot)return;}
      button.disabled=fruitId===MareHoya.rules.id&&i===1&&!hoyaActive();
      if(i===0){let label=$('hoyaSkillAction');if(!label){label=document.createElement('span');label.id='hoyaSkillAction';label.className='hoya-action-label hidden';button.append(label);}const hoya=fruitId===MareHoya.rules.id;label.classList.toggle('hidden',!hoya);const action=hoyaActive()?'cancel':game.fruitCooldowns?.[MareHoya.rules.id+':1']?'recast':'summon';label.textContent=action==='cancel'?'Cancelar Gênio':action==='recast'?'Reconjurar':'Invocar Gênio';button.dataset.hoyaAction=hoya?action:'';}
      if(i===0){let label=$('jikiSkillAction');if(!label){label=document.createElement('span');label.id='jikiSkillAction';label.className='jiki-action-label hidden';button.append(label);}label.classList.toggle('hidden',fruitId!==MareJiki.rules.id||!session.jikiCharge);label.textContent=session.jikiCharge?.releasing?'Lançando…':'Lançar sucata';}
      const iconSrc=fruitSlot?slotSkill.icon_path||MareAkuma.byId(fruitId)?.skill_icon_path||'':MareCharacterStudio.skillIcon(game.classId,i);
      if(icon.dataset.fruitIcon!==iconSrc){icon.dataset.fruitIcon=iconSrc;icon.innerHTML=iconSrc?`<img src="${iconSrc}" alt="" draggable="false">`:'';}
      if(!iconSrc)icon.textContent=i===0?c.symbol:['guard','heal','blessing'].includes(c.skills[1].type)?'✚':c.skills[1].type==='area'?'✺':'✦';
      const cooling=remaining>.1;el.classList.toggle('cooling',cooling);el.textContent=cooling?remaining.toFixed(1)+'s':'';button.classList.toggle('is-cooling',cooling);button.style.setProperty('--cooldown-angle',`${Math.min(360,remaining/(fruitSlot?MareAkumaPassives.cooldown(slotSkill.cooldown,fruitId):MareAkumaPassives.cooldown(c.skills[i].cd||1,fruitId)*(game.factionId==='government'?.92:1))*360)}deg`);
      if(fruitSlot)button.setAttribute('aria-label',(fruitId===MareHoya.rules.id&&i===0?(hoyaActive()?'Cancelar Gênio — recarga preservada':game.fruitCooldowns?.[MareHoya.rules.id+':1']?'Reconjurar Gênio':slotSkill.name):slotSkill.name)+(fruitId===MareRankC.rules.mato.id&&i===0&&rankCFreeCasts()?' — '+world.target.matoCharges+' cargas gratuitas':' — '+MareAkumaPassives.cooldown(slotSkill.cooldown,fruitId)+'s'));if(fruitId===MareJiki.rules.id&&i===0&&session.jikiCharge)button.setAttribute('aria-label','Lançar sucata — sem custo adicional (1)');});
    const zoan=equippedZoan(),transformButton=$('zoanTransform');
    transformButton.classList.toggle('hidden',!zoan);transformButton.classList.toggle('active',!!game.zoanTransformed);transformButton.setAttribute('aria-pressed',String(!!game.zoanTransformed));
    if(zoan){const icon=$('zoanTransformIcon'),src=zoan.icon_path;if(icon.dataset.src!==src){icon.dataset.src=src;icon.innerHTML=`<img src="${src}" alt="" draggable="false">`;}transformButton.setAttribute('aria-label',(game.zoanTransformed?'Retornar à forma humana':'Transformar em '+zoan.name)+' (T)');transformButton.removeAttribute('title');}

    syncExpeditionMini();
    $('xpPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.xp/session.elapsed*3600):'—';$('goldPerHour').textContent=scene==='hunt'&&session.elapsed>=20?fmt(session.gold/session.elapsed*3600):'—';$('questList').innerHTML=questDefs.map(q=>{let count=clamp(questProgress(q),0,q.target),done=game.claimed.includes(q.id),ready=count>=q.target&&!done;return `<div class="quest"><div class="quest-title"><span>${escapeHTML(q.title)}</span><b>${done?'CONCLUÍDO':count+' / '+q.target}</b></div><div class="quest-desc">${escapeHTML(q.desc)}</div><div class="progress-track"><i style="width:${count/q.target*100}%"></i></div>${ready?`<button data-claim="${q.id}">RESGATAR ${q.gold} ✦ + ${q.xp} XP</button>`:''}</div>`;}).join('');
    $('lootList').innerHTML=session.recentLoot.length?session.recentLoot.map(x=>`<div class="loot-entry"><span>${lootIcon(x.name)}${escapeHTML(x.name)}</span><b>OBTIDO</b></div>`).join(''):'<div class="empty-note">Sua próxima descoberta aparecerá aqui.</div>';
    updateMiniHud();const time=(6+Math.floor(world.time/90))%24; $('worldClock').textContent='DIA '+String(1+Math.floor(world.time/(90*24))).padStart(2,'0')+' · '+String(time).padStart(2,'0')+':00';
  }
  function renderPortrait(){if(!game)return;portrait.clearRect(0,0,72,72);portrait.fillStyle='#1b2632';portrait.fillRect(0,0,72,72);for(let i=0;i<18;i++){portrait.fillStyle=i%2?'#29394c':'#202f3f';portrait.fillRect((i*31)%72,(i*23)%72,4,4);}if(world.hero.visible!==false)vfx_aura.draw(portrait,36,70,world.time,64/48);if(world.hero.visible===false)drawBeriSeparation(portrait,36,70,1-session.fruitBurst/1.5,64/48);else if(game.zoanTransformed&&equippedZoan())MareZoanArt.draw(portrait,equippedZoan().id,36,70,{fit:64,time:world.time,scale:equippedZoan().id===MareRyu.rules.id?64/MareRyu.rules.worldSize:equippedZoan().id==='akuma_tori_albatroz'?90/64:['akuma_neko_leopard',MareUshi.rules.id,MareWolf.rules.id,MareRankCExpansion.rules.bison.id,MareRyu.rules.id].includes(equippedZoan().id)?1:64/48});else drawPaperDoll(portrait,36,70,'idle','south',world.time,64/46);vfx_aura.draw(portrait,36,70,world.time,64/48,null,'front');window.MareCharacterHUD?.portrait((c,canvas)=>{lobby96.draw(c,{...game,zoanTransformed:false},{scene:'lobby',action:'idle',direction:'south',time:0,x:canvas.width/2,y:canvas.height-12,scale:192/46,consumer:'wantedPortrait'});});}
  // Prepare only the selected destination, before sailing or a direct transition.
  function prepareRegion(area){
    if(!zones[area]||game.level<zones[area].min)return;
    const id=area==='swamp'?'conchas':area==='beach'?'dawn':area;
    if(id==='dawn')void MareEmberRenderer.prepareMonsters(['cesar']);
    if(MareAlubarna.worlds[id])MareAlubarna.prepare();
    else if(id==='alabasta')MareAlabasta.prepare();
    else if(MareNewIslands[id])MareNewIslands.prepare(id);
    else if(['orange','loguetown','conchas'].includes(id))MarePixelWorldMaps.prepare(id);
    for(const type of ({syrup:['sham','buchi'],baratie:['pearl','gin'],arlong:['chew','kuroobi'],orange:['mr3','cabaji'],loguetown:['marinheiro'],conchas:['helmeppo'],alabasta:['bananawani']})[id]||[])MareNewIslandArt.prepare(type);
    MareWorldDepth.regions(id);
  }
  function worldChange(area){if(!zones[area])return;if(game.level<zones[area].min){toast('Você precisa alcançar o nível '+zones[area].min+'.','danger');return;}game.area=area;const island=MareArchipelago.byArea(area);if(island)game=MareAchievements.record(game,'islandVisited',island.id);game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;enterHunt();toast('Você navegou até '+zones[area].name+'.','good');log('Nova região: '+zones[area].name,'good');saveGame();}
  function claimQuest(id){let q=questDefs.find(q=>q.id===id);if(!q||game.claimed.includes(id)||questProgress(q)<q.target)return;game.claimed.push(id);game.gold+=q.gold;gainXP(q.xp);session.gold+=q.gold;game.stats.goldEarned+=q.gold;toast('Contrato concluído! +'+q.gold+' Berry','good');log('Recompensa do contrato: '+q.title,'gold');saveGame();updateUI();}
  function getInventoryItem(id){return game.inventory.find(i=>i.id===id)||Object.values(game.equipment).find(i=>i?.id===id)||null;}
  function hasEquipped(item){return Object.values(game.equipment).some(i=>i?.id===item?.id);}
  async function equipItem(id){let i=game.inventory.find(i=>i.id===id);const fruit=MareAkuma.isFruit(i,itemDefs);if(!fruit&&!MareForge.isGear(i,itemDefs))return;let def=itemBase(i),slot=fruit?'akuma_no_mi':def.slot;if(fruit&&!MareAkuma.itemData(i,itemDefs))return;if(fruit&&akumaBackend){try{await akumaRequest('equip',{fruit_id:i.fruitId});}catch(error){toast(error.message,'danger');return;}}if(slot==='weapon'&&def.type!==game.classId){toast('Essa arma não pertence ao seu estilo de combate.','danger');return;}let d=getDerived(),hpFraction=game.hp/d.maxHP;let previous=game.equipment[slot];game.inventory=game.inventory.filter(it=>it.id!==id);game.equipment[slot]=i;if(slot==='akuma_no_mi'){clearJiki();clearHoya();clearRankB();clearExpansion();cancelNekoAction();clearUshiState();clearWolfState();clearRyuState();game.zoanTransformed=['akuma_neko_leopard',MareUshi.rules.id,MareWolf.rules.id,MareRankCExpansion.rules.bison.id,MareRyu.rules.id].includes(i?.fruitId);session.zoanDash=null;}if(previous)game.inventory.push(previous);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=i.id;forgeUI.itemId=i.id;forgeOutcome=null;syncFruitVfx();recordEquipmentChange(d,slot,def.name+' equipado');toast(def.name+' equipado.','good');saveGame();renderPanel();updateUI();}
  async function unequip(slot){let item=game.equipment[slot];if(!item||game.inventory.length>=BAG_CAPACITY)return;if(slot==='akuma_no_mi'&&akumaBackend){try{await akumaRequest('equip',{fruit_id:null});}catch(error){toast(error.message,'danger');return;}}let d=getDerived(),hpFraction=game.hp/d.maxHP;if(slot==='akuma_no_mi'){clearJiki();clearHoya();clearRankB();clearExpansion();}game.equipment[slot]=null;if(slot==='akuma_no_mi'){cancelNekoAction();clearUshiState();clearWolfState();clearRyuState();game.zoanTransformed=false;session.zoanDash=null;}game.inventory.unshift(item);game.hp=Math.round(getDerived().maxHP*hpFraction);selectedItem=item.id;if(slot==='akuma_no_mi')syncFruitVfx();recordEquipmentChange(d,slot,itemBase(item).name+' retirado');saveGame();renderPanel();updateUI();}
  function sellItem(id){let i=game.inventory.find(i=>i.id===id);if(!i||itemBase(i).kind==='pearl-box')return;if(i.locked){toast('Destrave o item antes de vender.','danger');return;}let price=Math.round(14+i.level*7+i.plus*18);game.inventory=game.inventory.filter(it=>it.id!==id);game.gold+=price;game.stats.goldEarned+=price;selectedItem=null;toast('Item vendido por '+price+' Berry.','good');saveGame();renderPanel();updateUI();}
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
  function extraListHtml(extras,hideZero=false){return (extras||[]).filter(x=>!hideZero||x.value!==0).map(x=>`<span>${escapeHTML(MareForge.names[x.stat]||x.stat)} <b>${Number.isFinite(x.value)?(x.value>0?'+':'')+(x.stat==='crit'?(x.value*100).toFixed(2)+'%':fmt(x.value)):'—'}</b></span>`).join('');}
  function forgeItemDetails(item){
    const r=MareForge.rarity[itemRarity(item)],sums=MareForge.keys.map(k=>{const percent=(item.sockets||[]).reduce((sum,id)=>sum+(MareForge.pearlById[id]?.attribute===k?MareForge.pearlById[id].percent:0),0);return percent?`<span>${MareCharacters.attributes[k].short} +${Math.round(percent*100)}%</span>`:'';}).join('');
    const base=MareUI.inventoryNumericRows([{name:'ATQ',value:item.baseStats?.attack},{name:'DEF',value:item.baseStats?.defense},{name:'VIDA',value:item.baseStats?.hp}]).map(r=>r.name+' '+(Number.isFinite(r.value)?fmt(r.value):'—')).join(' · ');
    return `<details class="op-forge-details"><summary>Nv.${item.level} · ${r.extras} extras · Sockets ${(item.sockets||[]).filter(Boolean).length}/${item.sockets?.length||0}</summary><p>${base?'Base: '+base+'. ':''}Raridade ×${r.mult}${item.plus?'; refinamento +'+item.plus:''}.</p><div class="forge2-extras-inline">${extraListHtml(item.extras,true)}</div><div class="forge2-pearl-strip">${(item.sockets||[]).map(id=>id?itemIcon(id,MareForge.pearlById[id]?.name):'<span class="forge2-empty">·</span>').join('')}</div>${sums?`<p>Bônus somados: ${sums}</p>`:''}</details>`;
  }
  function pearlBoxDetail(item){
    const def=itemBase(item);
    return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${def.rarity}">${itemIcon(item.def,def.name)}</div><div><h3>${escapeHTML(def.name)}</h3><small>Consumível · <span class="op-quantity">Quantidade: 1</span></small></div></div><div class="op-detail-box"><p>Contém uma Pérola Nível ${def.boxLevel}. O atributo é sorteado entre Força, Destreza, Vitalidade, Inteligência e Espírito, com 20% de chance para cada tipo.</p><p>Abrir consome esta caixa e entrega exatamente uma pérola do mesmo nível.</p></div><p class="op-sell-line">Origem: ${escapeHTML(item.origin||'Impel Down')}.</p><button type="button" class="op-action primary" data-open-pearl-box="${escapeHTML(item.id)}" ${item.locked?'disabled':''}>ABRIR CAIXA</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button>${item.locked?'<p>Desbloqueie a caixa antes de abrir.</p>':''}</div>`;
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
    const p=MareForge.pearlOf(item,itemDefs);return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${p.rarity}">${itemIcon(p.id,p.name)}</div><div><h3>${escapeHTML(p.name)}</h3><small>${rarityNames[p.rarity]} · Pérola · <span class="op-quantity">Quantidade: 1</span></small></div></div><div class="op-detail-box"><p>Concede +${p.level*2}% de ${MareForge.names[p.attribute]} quando instalada em um equipamento em uso. Os percentuais são somados antes de multiplicar o atributo total.</p><p>Multiplicador individual: ×${p.multiplier.toFixed(2)}.</p></div><button type="button" class="op-action primary" data-open-imbue="${escapeHTML(item.id)}">FORJA</button><button type="button" class="op-action secondary" data-inv-lock="${escapeHTML(item.id)}">${item.locked?'DESBLOQUEAR':'BLOQUEAR'}</button><p class="op-sell-line">Origem: ${escapeHTML(item.origin||'Estoque anterior ou fusão na forja')}.</p></div>`;
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
    return {name:def.name,typeName:slotNames[slot]?.toLocaleLowerCase('pt-BR')||'item',rarity:itemRarity(item),rarityName:rarityNames[itemRarity(item)],level:item.level||1,rank:fruitData?.rank,className,allowed:!className||def.type===game.classId,stats,power:fruit||gear?itemPower(item):null,description:description+(fruitData?.physicalDamageReduction?' Intangibilidade Logia: −30% de dano físico. Ataques com Haki anulam essa redução.':''),origin:item.origin||'',slot};
  }
  let backendFruitCatalog=null;
  function tooltipSkill(button){
    const fruit=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs),key=button.id==='skill3'?'3':button.id==='skill2'?'2':'1',active=currentFruitSkill(key);
    if(button.id==='zoanTransform')return {key:'T',name:game.zoanTransformed?'Retornar à forma humana':'Transformação Zoan',cooldown:0,cost:0,description:`Alterna entre a forma humana e ${fruit?.name||'a forma animal'}.`};
    if(fruit?.id===MareJiki.rules.id&&key==='1'&&session.jikiCharge){const v=MareJiki.chargeValues(jikiElapsed(session.jikiCharge));return {key,name:'Lançar Grande Devorador',cost:0,cooldown:0,description:'Arremessa a sucata acumulada: '+Math.round(v.multiplier*100)+'% de dano físico. Lançamento automático aos 6s. A recarga original continua contando.'};}
    if(fruit?.id===MareHoya.rules.id&&key==='1'&&hoyaActive())return {key,name:'Cancelar Gênio',cooldown:0,cost:0,description:'Encerra a invocação, o controle, o buff e a proteção. O personagem volta ao normal. A recarga original continua contando; reconjure quando ela terminar.'};
    if(MareRankA.has(fruit?.id)&&active)return {...active,resource:'Energia',cooldown:MareAkumaPassives.cooldown(active.cooldown,fruit.id)};
    if(active?.key===key){const backend=backendFruitCatalog?.[fruit.id]?.skills?.find(skill=>skill.key===key)||backendFruitCatalog?.[fruit.id]?.skill;return {key,name:fruit.id===MareHoya.rules.id&&key==='1'&&game.fruitCooldowns?.[MareHoya.rules.id+':1']?'Reconjurar Gênio':backend?.name||active.name,cooldown:MareAkumaPassives.cooldown(backend?.cooldown??active.cooldown,fruit.id),cost:fruit.id===MareRankC.rules.mato.id&&key==='1'&&rankCFreeCasts()?0:backend?.cost??active.cost??0,costText:fruit.id===MareRankC.rules.mato.id&&key==='1'&&rankCFreeCasts()?'Gratuito · '+world.target.matoCharges+' cargas':null,resource:backend?.resource||'Energia',description:backend?.description||active.description||fruit.description,damageType:backend?.damage_type||active.damage_type||(['akuma_uma_uma','akuma_inu_dachshund'].includes(fruit.id)?'physical':'')};}
    if(key==='3')return null;
    const skill=classes[game.classId].skills[Number(key)-1];
    return {key,name:skill.name,cooldown:MareAkumaPassives.cooldown(skill.cd,fruit?.id)*(game.factionId==='government'?.92:1),cost:skill.cost,resource:'Energia',description:skill.desc,damageType:game.classId==='strategist'?'magic':skill.type==='strike'||skill.type==='area'?'physical':''};
  }
  const gameTooltip=MareTooltips.attach(element=>{
    if(element.hasAttribute('data-studio-help'))return {kind:'help',title:element.dataset.helpTitle,description:element.dataset.helpText};
    if(!game)return null;
    if(element.hasAttribute('data-compendium-fruit'))return {kind:'compendium',fruit:MareCompendium.tooltip(game,element.dataset.compendiumFruit)};
    if(element.matches('[data-talent-select]')&&$('panelOverlay').classList.contains('talents-hd-mode'))return null;
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
    return [['power','Poder'],['attack','Ataque'],['defense','Defesa'],['maxHP','Vida']].map(([key,label])=>({label,delta:after[key]-before[key]})).filter(r=>r.delta!==0).map(({label,delta})=>'<span class="delta-stat '+(delta>0?'positive':delta<0?'negative':'neutral')+'"><small>'+label+'</small><b>'+(Number.isFinite(delta)?(delta>0?'+':delta<0?'−':'')+fmt(Math.abs(delta)):'—')+'</b></span>').join('');
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

  function itemIcon(key,name='',animatedSlot=false){
    const def=itemDefs[key];
    const hd=['inventory','forge'].includes(currentPanel)&&window.MareItemArt?.path(key,def);
    if(hd)return `<img class="item-icon item-icon-hd" src="${escapeHTML(hd)}" alt="${escapeHTML(name||def?.name||'Item')}" draggable="false" decoding="async">`;
    if(animatedSlot&&def?.slotAnimation){const animation=def.slotAnimation,className=/^[a-z0-9-]+$/.test(animation.className)?animation.className:'slot-item-animation',style="--slot-sprite-sheet:url('"+escapeHTML(animation.spriteSheet)+"');--slot-sprite-size:"+(animation.columns*100)+"% "+(animation.rows*100)+"%;--slot-sprite-duration:"+animation.duration+"s";return '<span class="item-icon slot-item-animation '+className+'" style="'+style+'" role="img" aria-label="'+escapeHTML(name||def.name)+'"></span>';}
    if(def?.icon_path)return `<img class="item-icon ${def.slot==='weapon'&&def.type==='sword'?'sword-weapon-art':''} ${def.slot==='weapon'&&def.type==='rogue'?'rogue-weapon-art':''}" src="${escapeHTML(def.icon_path)}" alt="${escapeHTML(name||def.name)}" draggable="false">`;
    if(def?.type==='akuma_no_mi')return '<span aria-hidden="true">✦</span>';
    const pearl=MareForge.pearlById[key]||MareForge.pearlById[def?.pearlId];
    const artKey=def?.kind==='haki-book'?'book':def?.kind==='pearl-box'?'pearl-box-'+def.boxLevel:pearl?pearl.id:key;
    const src=`assets/ui/items-pixellab/${artKey}.png?v=20261020`;
    return `<img class="item-icon" src="${src}" alt="${escapeHTML(name||pearl?.name||def?.name||'')}" draggable="false">`;
  }
  function drawCurrentPreview(canvas,height,{aura=true}={}){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    if(aura&&world.hero.visible!==false)vfx_aura.draw(c,canvas.width/2,canvas.height-10,world.time,height/48);
    if(world.hero.visible===false)drawBeriSeparation(c,canvas.width/2,canvas.height-10,1-session.fruitBurst/1.5,height/48);
    else if(game.zoanTransformed&&equippedZoan())MareZoanArt.draw(c,equippedZoan().id,canvas.width/2,canvas.height-10,{fit:Math.min(canvas.width-16,height),time:world.time,scale:equippedZoan().id===MareRyu.rules.id?height/MareRyu.rules.worldSize:equippedZoan().id==='akuma_tori_albatroz'?height*1.25/64:['akuma_neko_leopard',MareUshi.rules.id,MareWolf.rules.id,MareRankCExpansion.rules.bison.id,MareRyu.rules.id].includes(equippedZoan().id)?height/64:height/48});
    else drawPaperDoll(c,canvas.width/2,canvas.height-10,'idle','south',world.time,height/46);
  }
  function invSymbol(entry){return itemIcon(entry.kind==='gear'?entry.item.def:entry.kind,entry.name,true);}
  function invSlotHtml(slot){
    const item=game.equipment[slot],selected=item&&selectedItem===item.id, rarity=item?itemRarity(item):'';
    return `<button type="button" class="op-equip-slot ${activeEquipmentFeedback()?.slots.includes(slot)?'recent-equip':''} ${item?'filled rarity-'+rarity:''} ${selected?'selected':''}" data-inv-slot="${slot}" aria-label="${slotNames[slot]}${item?' · '+escapeHTML(itemBase(item).name):' · Vazio'}"><span class="op-slot-label">${slot==='weapon'?'ARMA':slotNames[slot]}</span><span class="op-slot-frame"><span class="op-slot-icon">${item?itemIcon(item.def,itemBase(item).name,true):'<span class="empty-slot-mark">·</span>'}</span>${item?.locked?'<span class="op-item-lock" role="img" aria-label="Item bloqueado"></span>':''}${item?`${Number.isFinite(item.plus)&&item.plus!==0?`<span class="op-slot-refine">${item.plus>0?'+':''}${item.plus}</span>`:''}${slot==='akuma_no_mi'?`<span class="op-slot-power">Rank ${escapeHTML(MareAkuma.itemData(item,itemDefs)?.rank||'?')}</span>`:`<span class="op-slot-power">${fmt(itemPower(item))}</span>`}`:''}</span></button>`;
  }
  function invSelected(){
    if(selectedItem==='virtual-potion'&&game.potions>0)return {kind:'potion',id:'virtual-potion'};
    if(selectedItem==='virtual-material'&&game.materials>0)return {kind:'material',id:'virtual-material'};
    const item=getInventoryItem(selectedItem);
    return item?{kind:'gear',item,id:item.id}:null;
  }
  function renderInventory(body){
    const {pageSize:BAG_PER_PAGE}=MareUI.inventoryGrid(innerWidth);
    if(inventoryUI.pageSize&&inventoryUI.pageSize!==BAG_PER_PAGE)inventoryUI.page=MareUI.inventoryPageAtResize(inventoryUI.page,inventoryUI.pageSize,BAG_PER_PAGE);
    inventoryUI.pageSize=BAG_PER_PAGE;
    if(!invSelected())selectedItem=game.equipment.weapon?.id||game.inventory[0]?.id||(game.potions>0?'virtual-potion':game.materials>0?'virtual-material':null);
    const overlay=$('panelOverlay');overlay.classList.add('inventory-mode','pirate-hd');
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
    const left=inventorySlotsLeft.map(invSlotHtml).join('')+'<span class="op-equip-spacer" aria-hidden="true"></span>'; const right=inventorySlotsRight.filter(slot=>slot!=='akuma_no_mi').map(invSlotHtml).join('');
    const tab=inventoryUI.tab,feedback=activeEquipmentFeedback();
    const avatarExtra=tab==='visual'?`<div class="op-avatar-note"><strong>${escapeHTML(f.name)}</strong><p>${escapeHTML(f.desc)}</p></div>`:tab==='style'?`<div class="op-avatar-note"><strong>ESTILO</strong><p>${escapeHTML(classes[game.classId].skills[0].name)} · ${escapeHTML(classes[game.classId].skills[1].name)}</p></div>`:'';
    body.innerHTML=`<div class="op-inventory-shell ui-hd">
      <div class="op-topbar">
        <div class="op-title-banner"><img class="op-jolly" src="assets/ui/faction-emblems/${escapeHTML(factions[game.factionId]?game.factionId:'pirate')}.png" alt=""><strong>INVENTÁRIO</strong></div>

        <div class="op-top-actions"><kbd>[I]</kbd><button type="button" class="op-close" data-close-panel aria-label="Fechar inventário">${inventoryIcon('close')}</button></div>
        <nav class="op-section-nav" aria-label="Seções do inventário"><a href="#inventory-equipment">Equipamentos</a><a href="#inventory-bag">Mochila</a><a href="#inventory-detail">Detalhes</a></nav>
      </div>
      <div class="op-body-grid">
        <section id="inventory-equipment" tabindex="-1" class="hd-frame op-panel op-character-panel">
          ${inventoryHeading('EQUIPAMENTO')}<div class="op-tabs" aria-label="Apresentação do personagem">${[['equipment','Equipamento'],['visual','Visual'],['style','Estilo']].map(([id,label])=>`<button type="button" data-inv-tab="${id}" class="${tab===id?'active':''}">${inventoryIcon(({equipment:'equipment',visual:'eye',style:'shirt'})[id])}<span>${label}</span></button>`).join('')}</div>
          <div class="op-character-core">
            <div class="op-equip-side left">${left}</div>
            <div class="op-avatar-column">
              <div class="op-avatar-stage"><canvas id="inventorySprite" width="180" height="220" aria-label="Visual atual do personagem"></canvas>${MareHeadgear.button(game)}</div>
              <div class="op-avatar-meta"><strong>${escapeHTML(game.name)}</strong><span>Nível ${game.level}</span><span>Classe: ${escapeHTML(classes[game.classId].name.replace(' / ',' · '))}</span></div>
${avatarExtra}
            </div>
            <div class="op-equip-side right">${right}</div>
          </div>
          <div class="op-character-summary">
            <div class="op-power-banner ${feedback?'power-updated':''}">${inventoryIcon('power')}<label>PODER TOTAL</label><b>${fmt(stats.power)}</b></div>
              <div class="op-stats-list"><div>${inventoryIcon('heart')}<span>Vida</span><b>${fmt(stats.maxHP)}</b></div><div>${inventoryIcon('attack')}<span>Ataque</span><b>${fmt(stats.attack)}</b></div><div>${inventoryIcon('shield')}<span>Defesa</span><b>${fmt(stats.defense)}</b></div></div>
          </div>
          ${feedback?`<output class="op-equip-feedback" aria-live="polite">${escapeHTML(feedback.message)}<span>${statDeltaHtml(feedback.before,feedback.after)}</span></output>`:''}<div class="op-fruit-equipped">${invSlotHtml('akuma_no_mi')}<div><strong>AKUMA NO MI</strong><span>${escapeHTML(MareAkuma.itemData(game.equipment.akuma_no_mi,itemDefs)?.name||'Nenhuma fruta equipada')}</span></div></div>
          <label class="op-hide-check"><input type="checkbox" id="invHideProfile" ${game.preferences?.hideItems?'checked':''}><span>Ocultar itens no perfil</span></label>
        </section>
        <section id="inventory-bag" tabindex="-1" class="hd-frame op-panel op-bag-panel">
          <div class="op-panel-head"><div class="op-head-left">${inventoryIcon('bag')}<h3>MOCHILA</h3></div><div class="op-bag-capacity">${inventoryIcon('bag')}<b>${game.inventory.length} / ${BAG_CAPACITY}</b></div><button type="button" class="op-best-btn" data-auto-equip>${inventoryIcon('power')}<span>EQUIPAR MELHORES</span></button></div>
          <div class="op-tool-row"><label class="op-search">${inventoryIcon('search')}<input id="invSearch" type="search" aria-label="Buscar item pelo nome" placeholder="Buscar pelo nome..." value="${escapeHTML(inventoryUI.query)}" autocomplete="off"></label><select id="invSort" aria-label="Ordenação"><option value="recent" ${inventoryUI.sort==='recent'?'selected':''}>Recentes</option><option value="rarity" ${inventoryUI.sort==='rarity'?'selected':''}>Raridade</option><option value="power" ${inventoryUI.sort==='power'?'selected':''}>Maior poder</option><option value="name" ${inventoryUI.sort==='name'?'selected':''}>Nome (A–Z)</option></select><select id="invRarity" aria-label="Filtro de raridade">${[['all','Todas'],['common','Comum'],['uncommon','Incomum'],['rare','Raro'],['epic','Épico'],['legendary','Lendário'],['supreme','Supremo']].map(([v,l])=>`<option value="${v}" ${inventoryUI.rarity===v?'selected':''}>${l}</option>`).join('')}</select></div>
          <div class="op-category-tabs">${filterCategories.map(([id,label])=>`<button type="button" data-inv-category="${id}" class="${inventoryUI.category===id?'active':''}">${label}</button>`).join('')}</div>
          <div class="op-grid-wrap"><div class="op-grid">${slots}</div></div>
          <div class="op-pagination"><span class="op-page-count">${all.length?inventoryUI.page*BAG_PER_PAGE+1:0}–${Math.min((inventoryUI.page+1)*BAG_PER_PAGE,all.length)} de ${all.length}</span><button type="button" data-inv-page="${inventoryUI.page-1}" ${inventoryUI.page===0?'disabled':''} aria-label="Página anterior">${inventoryIcon('previous')}</button>${Array.from({length:pages},(_,n)=>`<button type="button" data-inv-page="${n}" class="${n===inventoryUI.page?'active':''}">${n+1}</button>`).join('')}<button type="button" data-inv-page="${inventoryUI.page+1}" ${inventoryUI.page===pages-1?'disabled':''} aria-label="Próxima página">${inventoryIcon('next')}</button></div>
        </section>
        <section id="inventory-detail" tabindex="-1" class="hd-frame op-panel op-detail-panel">${inventoryHeading('DETALHES DO ITEM')}${detail}</section>
      </div>
    </div>`;
    layoutInventoryDetail();
    const preview=$('inventorySprite');
    const redraw=()=>{if(currentPanel==='inventory'&&preview.isConnected)drawCurrentPreview(preview,185,{aura:false});};
    redraw();void lobby96.ready.then(()=>lobby96.ensure(game)).then(redraw);
  }
  function layoutInventoryDetail(){
    const wrap=$('inventory-detail')?.querySelector('.op-detail-wrap');if(!wrap)return;
    const content=document.createElement('div'),actions=document.createElement('footer');content.className='op-detail-content';actions.className='op-detail-actions';
    for(const child of [...wrap.children]){if(child.matches('.op-detail-head'))continue;(child.matches('.op-action,.op-item-actions,.op-comparison,.op-bottom-actions,.op-sell-line')?actions:content).append(child);}
    wrap.append(content,actions);
    for(const button of actions.querySelectorAll('.op-action'))if(!button.querySelector('.inv-ui-icon')){const icon=button.hasAttribute('data-unequip')?'remove':button.hasAttribute('data-inv-lock')?(invSelected()?.item?.locked?'unlock':'lock'):button.hasAttribute('data-inv-use-potion')?'heart':button.hasAttribute('data-open-imbue')||button.dataset.panel==='forge'?'forge':'equip';button.insertAdjacentHTML('afterbegin',inventoryIcon(icon));}
    refreshInventoryComparison();MareUI.upgrade(wrap);
  }
  function selectInventoryItem(id){
    selectedItem=id;
    for(const button of $('dialogBody').querySelectorAll('[data-item],[data-inv-slot]')){const chosen=button.dataset.item?button.dataset.item===id:game.equipment[button.dataset.invSlot]?.id===id;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));}
    const panel=$('inventory-detail');panel.innerHTML=inventoryHeading('DETALHES DO ITEM')+inventoryDetail(invSelected());layoutInventoryDetail();
  }
  // Recalculate the visible page only when the responsive column tier changes.
  // Keep search, selected item, save data, and all inventory actions intact.
  window.addEventListener('resize',()=>{
    if(currentPanel==='inventory'&&inventoryUI.pageSize!==MareUI.inventoryGrid(innerWidth).pageSize)renderPanel();
  },{passive:true});
  function inventoryIcon(name){
    if(name==='close')return '<svg class="inv-ui-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="m7 8 18 18M25 8 7 26" fill="none" stroke="#593514" stroke-width="5"/><path d="m7 6 18 18M25 6 7 24" fill="none" stroke="#f5d38a" stroke-width="3"/></svg>';
    if(name==='previous'||name==='next'){const d=name==='previous'?'m20 7-9 9 9 9':'m12 7 9 9-9 9';return '<svg class="inv-ui-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="'+d+'" fill="none" stroke="#f5d38a" stroke-width="3" stroke-linejoin="round"/></svg>';}
    if(!/^[a-z-]+$/.test(name))return '';
    const files={equip:'attack',remove:'down',previous:'up',next:'up'};
    const file=name==='berry'?'berry.png':'icons/'+(files[name]||name)+'.png';
    return '<img class="inv-ui-icon inv-ui-'+name+'" src="assets/ui/inventory-final/'+file+'" alt="" draggable="false">';
  }
  function inventoryHeading(title){return '<h3 class="hd-panel-heading">'+inventoryIcon('anchor')+'<span>'+escapeHTML(title)+'</span></h3>';}
  function inventoryItemStatRows(item){
    const a=itemStats(item),rows=MareUI.inventoryNumericRows([{key:'attack',name:'Ataque',icon:'attack',value:a.attack},{key:'defense',name:'Defesa',icon:'shield',value:a.defense},{key:'hp',name:'Vida',icon:'heart',value:a.hp},{key:'power',name:'Poder',icon:'power',value:itemPower(item)}]);
    return rows.length?'<div class="op-item-stats" role="list">'+rows.map(r=>'<div class="op-stat-row" role="listitem" data-item-stat="'+r.key+'">'+inventoryIcon(r.icon)+'<span>'+r.name+'</span><b>'+ (Number.isFinite(r.value)?fmt(r.value):'<span title="Informação indisponível">—</span>')+'</b></div>').join('')+'</div>':'';
  }
  function inventoryComparisonData(item){
    if(!item||!MareForge.isGear(item,itemDefs))return null;
    const def=itemBase(item),equipped=hasEquipped(item),compatible=isWeaponCompatible(item),reference=game.equipment[def.slot];
    // Evaluate permanent power with the shared game calculation and identical runtime inputs.
    const before=getDerived(game,null),after=equipped||!compatible?null:getDerived({...game,equipment:{...game.equipment,[def.slot]:item}},null);
    return {...MareUI.inventoryPowerState({equipped,compatible,hasReference:!!reference,beforePower:before.power,afterPower:after?.power}),slot:def.slot,reference:reference?.id||null,deltas:after?[['attack','Ataque'],['defense','Defesa'],['maxHP','Vida']].map(([k,name])=>({name,value:after[k]-before[k]})).filter(r=>r.value!==0):[]};
  }
  function refreshInventoryComparison(){
    const node=$('invPowerComparison');if(currentPanel!=='inventory'||!node)return;
    const selected=invSelected(),data=selected?.kind==='gear'?inventoryComparisonData(selected.item):null;if(!data)return;
    const signature=JSON.stringify(data);if(node.dataset.signature===signature)return;
    const states={better:['MAIOR PODER QUE O EQUIPADO','up','Diferença de poder: +'+fmt(data.delta)],worse:['MENOR PODER QUE O EQUIPADO','down','Diferença de poder: '+fmt(data.delta)],equal:['MESMO PODER QUE O EQUIPADO','equal','Nenhuma alteração de poder.'],empty:['SLOT LIVRE','equipment','Sem item equipado neste slot.'],equipped:['EQUIPAMENTO EM USO','equipment','Este item já está equipado.'],incompatible:['ITEM INCOMPATÍVEL','lock','Requisitos de equipamento não atendidos.'],unavailable:['COMPARAÇÃO INDISPONÍVEL','equal','Aguarde as informações do equipamento.']};
    const [title,icon,detail]=states[data.state];node.dataset.state=data.state;node.dataset.signature=signature;
    node.innerHTML='<div class="op-comparison-plate">'+inventoryIcon(icon)+'<div><strong>'+title+'</strong><small>'+detail+'</small></div></div>'+(data.delta!==null&&data.deltas.length?'<div class="op-comparison-deltas">'+data.deltas.map(r=>'<span>'+r.name+' <b>'+(Number.isFinite(r.value)?(r.value>0?'+':'')+fmt(r.value):'—')+'</b></span>').join('')+'</div>':'');
  }

  function inventoryGearActions(item){
    const def=itemBase(item),eq=hasEquipped(item),compatible=isWeaponCompatible(item),id=escapeHTML(item.id),saleDisabled=eq||item.locked;
    const primary=eq?'<button type="button" class="op-action primary" data-unequip="'+def.slot+'" '+(game.inventory.length>=BAG_CAPACITY?'disabled title="Mochila cheia"':'')+'>'+inventoryIcon('remove')+'<span class="op-action-copy">RETIRAR</span></button>':'<button type="button" class="op-action primary" data-equip="'+id+'" '+(compatible?'':'disabled')+'>'+inventoryIcon('equip')+'<span class="op-action-copy">'+(compatible?'EQUIPAR':'INCOMPATÍVEL')+'</span></button>';
    return '<div class="op-item-actions">'+primary+'<button type="button" class="op-action secondary" data-inv-lock="'+id+'" aria-pressed="'+Boolean(item.locked)+'">'+inventoryIcon(item.locked?'unlock':'lock')+'<span class="op-action-copy">'+(item.locked?'DESBLOQUEAR':'BLOQUEAR')+'</span></button><button type="button" class="op-action secondary" data-sell="'+id+'" '+(saleDisabled?'disabled title="'+(eq?'Retire o item antes de vender':'Desbloqueie o item para vender')+'"':'')+'>'+inventoryIcon('berry')+'<span class="op-action-copy"><strong>VENDER DIRETAMENTE</strong><small>'+fmt(sellPrice(item))+' Berry</small></span></button><button type="button" class="op-action secondary" data-inventory-forge="'+id+'">'+inventoryIcon('forge')+'<span class="op-action-copy">FORJA</span></button></div>';
  }
  function inventoryDetail(sel){
    if(!sel)return `<div class="op-detail-wrap op-detail-empty"><div class="op-detail-icon empty">${inventoryIcon('search')}</div><div><h3>Nenhum item selecionado</h3><small>Escolha um item da mochila ou um slot equipado.</small></div><p>Use os filtros centrais para localizar armas, armaduras, consumíveis e materiais.</p></div>`;
    if(sel.kind==='potion'||sel.kind==='material'){
      const potion=sel.kind==='potion'; const qty=potion?game.potions:game.materials;
      const icon=itemIcon(potion?'potion':'material',potion?'Poção de Vida':'Ferro Salgado');
      return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${potion?'uncommon':'common'}">${icon}</div><div><h3>${potion?'Poção de Vida':'Ferro Salgado'}</h3><small>${potion?'Incomum · Consumível':'Comum · Material'} · Quantidade: ${qty}</small></div></div><div class="op-detail-box"><p>${potion?'Elixir de uso rápido que restaura 44% da vida máxima do aventureiro.':'Material utilizado na forja e no aprimoramento de equipamentos marítimos.'}</p></div><div class="op-effect-list"><div><span>Efeito</span><b>${potion?'Recupera Vida':'Material de Forja'}</b></div><div><span>Origem</span><b>Recompensa de caçada</b></div></div><div class="op-origin-row"><div><span>Valor de venda</span><b>${potion?'35':'—'}</b></div><div><span>Origem</span><b>${potion?'Mercador donquixote':'Ruínas e contratos'}</b></div></div>${potion?`<button type="button" class="op-action primary" data-inv-use-potion ${game.hp>=getDerived().maxHP?'disabled':''}>USAR</button><button type="button" class="op-action secondary" data-panel="shop">COMPRAR MAIS</button>`:`<button type="button" class="op-action primary" data-panel="forge">ABRIR FORJA</button><button type="button" class="op-action secondary" disabled>ITEM DE MATERIAL</button>`}</div>`;
    }
    if(itemBase(sel.item).kind==='haki-book')return hakiBookDetail(sel.item);
    if(MareAkuma.isFruit(sel.item,itemDefs)){
      const fruit=MareAkuma.itemData(sel.item,itemDefs),eq=hasEquipped(sel.item),stats=MareAkuma.bonusStats(sel.item,itemDefs);
      return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${itemRarity(sel.item)}">${itemIcon(sel.item.def,fruit?.name||'Akuma no Mi')}</div><div><h3>${escapeHTML(fruit?.name||'Akuma no Mi')}</h3><small>Rank ${escapeHTML(fruit?.rank||'?')} · ${rarityNames[itemRarity(sel.item)]} · ${fruit?.subtype|| (fruit?.family==='paramecia'?'Paramecia':'Akuma no Mi')}</small></div></div><div class="op-detail-box"><p>Fruta equipável por qualquer classe e rank.</p>${fruit?.description&&fruit.description!==fruit.name+' Rank '+fruit.rank?`<p>${escapeHTML(fruit.description)}</p>`:''}${fruit?.physicalDamageReduction?'<p>Intangibilidade Logia: −30% de dano físico. Haki anula essa redução.</p>':''}${MareAkuma.activeSkills(fruit?.id).length?`<section class="op-active-skills"><h4>HABILIDADES ATIVAS</h4>${MareAkuma.activeSkills(fruit.id).map(skill=>`<article class="op-skill-row">${skill.icon_path?`<img src="${escapeHTML(skill.icon_path)}" alt="" loading="lazy">`:''}<div><strong>${escapeHTML(skill.name)}</strong><small>${skill.cost} Energia · ${skill.cooldown}s</small>${skill.description&&skill.description!==skill.name?`<p>${escapeHTML(skill.description)}</p>`:''}</div></article>`).join('')}</section>`:''}${Object.values(stats).some(value=>value!==0)?'<h4>PASSIVAS</h4>':''}<div class="op-effect-list">${Object.entries(stats).filter(([,value])=>value!==0).map(([key,value])=>{const labels={...MareAkumaPassives.labels,healing_received_percent:'Cura recebida',max_hp_percent:'Vida máxima',impact_resistance_percent:'Resistência a impacto',move_speed_percent:'Velocidade de movimento',evasion_percent:'Esquiva',physical_defense_percent:'Defesa física'};return `<div><span>${escapeHTML(labels[key]||key.replace('bonus_','').replaceAll('_',' '))}</span><b>${Number.isFinite(value)?(value>0?'+':'')+((key.endsWith('_percent')||(key in MareAkumaPassives.labels&&MareAkumaPassives.percent(key)))?Math.round(value*100)+'%':value):'—'}</b></div>`;}).join('')}</div></div>${eq?`<button type="button" class="op-action primary" data-unequip="akuma_no_mi">RETIRAR</button>`:`<button type="button" class="op-action primary" data-equip="${escapeHTML(sel.item.id)}">EQUIPAR</button>`}</div>`;
    }
    if(itemBase(sel.item).kind==='pearl-box')return pearlBoxDetail(sel.item);
    if(MareForge.isPearl(sel.item,itemDefs))return pearlInventoryDetail(sel.item);
    const item=sel.item,def=itemBase(item),a=itemStats(item),eq=hasEquipped(item),price=sellPrice(item),compatible=isWeaponCompatible(item);
    const category = ({weapon:'Arma',head:'Armadura',necklace:'Acessório',coat:'Armadura',legs:'Armadura',boots:'Armadura',cloak:'Visual',gloves:'Armadura',ring:'Acessório',belt:'Acessório',charm:'Acessório'})[def.slot]||'Item';
    const quote = def.slot==='weapon'?'“Uma arma confiável muda o destino da expedição.”':def.slot==='charm'||def.slot==='ring'||def.slot==='necklace'?'“Relíquias carregam histórias de marés antigas.”':'“Equipamentos sólidos mantêm a tripulação de pé.”';
    const comparison='<section id="invPowerComparison" class="op-comparison" role="status" aria-live="polite" aria-atomic="true"></section>';
    const desc=def.description||`${def.slot==='weapon'?'Arma adaptada ao estilo de combate da sua classe.':'Peça de expedição reforçada para aventuras em alto-mar.'}`;
    return `<div class="op-detail-wrap"><div class="op-detail-head"><div class="op-detail-icon rarity-${itemRarity(item)}">${itemIcon(item.def,def.name)}</div><div><h3>${escapeHTML(def.name)} ${item.plus?`+${item.plus}`:''}</h3><small>${rarityNames[itemRarity(item)]} · ${category} · <span class="op-quantity">Quantidade: 1</span></small></div></div><div class="op-detail-box"><p>${escapeHTML(desc)}</p>${inventoryItemStatRows(item)}<blockquote>${quote}</blockquote></div>${forgeItemDetails(item)}${comparison}<div class="op-origin-row"><div><span>Valor de venda</span><b>${fmt(price)}</b></div><div><span>Origem</span><b>${escapeHTML(item.origin||'Espólio de aventura')}</b></div></div>${inventoryGearActions(item)}</div>`;
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
    const value=(key,n)=>['crit','evasion','accuracy','protection'].includes(key)?(n*100).toFixed(1)+'%':['speed','energyRegen','healthRegen','regenBuff'].includes(key)?n.toFixed(2):fmt(n);
    body.innerHTML=MareCharacterStudio.status({game:{...game,factionName:factions[game.factionId].name},c,r,d,next,remaining,pending,draft:attributeDraft,quantity:attributeQuantity,message:allocationMessage,confirmed:performance.now()<attributeSuccessUntil,attributes:MareCharacters.attributes,birth:MareCharacters.birth[game.classId],keys:MareCharacters.keys,value,fmt,skillCost:skill=>MareUltimates.selected(game)==='archmage'?0:Math.round(skill.cost*(1-d.energyEfficiency)*100)/100});
    drawCurrentPreview($('characterSprite'),175,{aura:false});
  }
  function hierarchySelf(){return {player_id:game.hierarchyPlayerId,name:game.name,faction:game.factionId,class_id:game.classId,portrait:portrait.canvas.toDataURL('image/png'),level:game.level,power:getDerived().power,tier:game.hierarchyTier};}
  async function hierarchyPost(route,payload){
    const response=await fetch('/api/hierarchy/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('API indisponível');
    const result=await response.json();if(!response.ok)throw Error(result.error||'Falha na hierarquia');return result;
  }
  function resetHierarchyView(){
    hierarchyRankingAbort?.abort();hierarchyRequest++;
    hierarchyView={faction:game.factionId,tier:game.hierarchyTier,scope:'faction',status:'loading',board:[],busy:hierarchyPromoting};hierarchyMessage='';
  }
  async function loadHierarchyRanking(){
    if(!game||!hierarchyView)return;
    hierarchyRankingAbort?.abort();hierarchyRankingAbort=new AbortController();
    const request=++hierarchyRequest,selected=hierarchyView.faction,scope=hierarchyView.scope,signal=AbortSignal.any([hierarchyRankingAbort.signal,AbortSignal.timeout(8000)]);
    hierarchyView.status='loading';hierarchyView.board=[];if(currentPanel==='character'&&characterTab==='hierarchy')renderPanel();
    try{
      const query=scope==='all'?'':'?faction='+encodeURIComponent(selected),response=await fetch('/api/hierarchy/ranking'+query,{signal});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Ranking indisponível');
      const data=await response.json();
      if(!Array.isArray(data.leaderboard)||data.faction!==(scope==='all'?null:selected)||scope!=='all'&&data.leaderboard.some(p=>p.faction!==selected))throw Error('Consulta incompatível');
      if(request!==hierarchyRequest)return;
      hierarchyView.status='ready';hierarchyView.board=data.leaderboard;
    }catch(error){if(request!==hierarchyRequest)return;hierarchyView.status='error';hierarchyView.board=[];}
    if(currentPanel==='character'&&characterTab==='hierarchy')renderPanel();
  }
  function consultHierarchy(faction){
    if(!Object.hasOwn(MareHierarchy.titles,faction))return;
    hierarchyView={faction,tier:faction===game.factionId?game.hierarchyTier:1,scope:'faction',status:'loading',board:[],busy:hierarchyPromoting};hierarchyMessage='';void loadHierarchyRanking();
  }
  async function syncHierarchy(){
    if(!game)return;const sync=++hierarchySyncSeq;hierarchySyncing=true;MareHierarchy.migrate(game);renderPortrait();if(currentPanel==='character'&&characterTab==='hierarchy')renderPanel();
    const id=game.hierarchyPlayerId,faction=game.factionId,mutation=hierarchyMutation,priorTier=game.hierarchyTier;
    try{
      const result=await hierarchyPost('sync',hierarchySelf());
      if(sync!==hierarchySyncSeq||game?.hierarchyPlayerId!==id||game.factionId!==faction||mutation!==hierarchyMutation)return;
      hierarchyBackend=true;game.hierarchyTier=result.player.tier;saveGame();updateUI();
    }catch(error){if(sync===hierarchySyncSeq)hierarchyBackend=false;}finally{if(sync===hierarchySyncSeq)hierarchySyncing=false;}
    if(sync!==hierarchySyncSeq)return;
    if(currentPanel==='character'&&characterTab==='hierarchy'){if(hierarchyView.faction===game.factionId&&hierarchyView.tier===priorTier)hierarchyView.tier=game.hierarchyTier;void loadHierarchyRanking();}
  }
  function renderHierarchy(body){
    if(!hierarchyView)resetHierarchyView();
    const focused=document.activeElement;let restore=null;if(body.contains(focused)){if(focused.hasAttribute('data-hierarchy-faction'))restore='[data-hierarchy-faction="'+focused.dataset.hierarchyFaction+'"]';else if(focused.hasAttribute('data-hierarchy-tier'))restore='[aria-label="'+focused.getAttribute('aria-label')+'"]';else for(const attr of ['data-hierarchy-scope','data-hierarchy-tier-select','data-hierarchy-promote','data-hierarchy-retry','data-hierarchy-current'])if(focused.hasAttribute(attr))restore='['+attr+']';}
    body.innerHTML=MareHierarchyUI.render({game,view:{...hierarchyView,busy:hierarchyPromoting,syncing:hierarchySyncing},message:hierarchyMessage});if(restore)body.querySelector(restore)?.focus({preventScroll:true});
  }
  async function promoteHierarchy(expectedTier=game.hierarchyTier){
    if(hierarchySyncing||hierarchyPromoting||expectedTier!==game.hierarchyTier||hierarchyView&&hierarchyView.faction!==game.factionId)return;
    const state=MareHierarchy.next(game.hierarchyTier,game.level);
    if(state.state!=='ready'){hierarchyMessage=state.message||'Nível necessário para esta promoção.';renderPanel();return;}
    const ownerId=game.hierarchyPlayerId,ownerFaction=game.factionId;hierarchyPromoting=true;hierarchyMutation++;renderPanel();
    try{
      let tier=state.target;
      if(hierarchyBackend){const result=await hierarchyPost('promote',{player_id:game.hierarchyPlayerId,expected_tier:expectedTier});tier=result.player.tier;}
      if(game.hierarchyPlayerId!==ownerId||game.factionId!==ownerFaction)throw Error('O personagem mudou durante a confirmação. Consulte sua hierarquia novamente.');
      const next={...game,hierarchyTier:tier};
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw Error('Não foi possível salvar a promoção. Confira o armazenamento e tente novamente.');}
      game=next;if(hierarchyView?.faction===game.factionId)hierarchyView.tier=tier;
      hierarchyMessage='Promoção concluída: '+MareHierarchy.title(game.factionId,tier)+'!';updateUI();toast(hierarchyMessage,'good');void loadHierarchyRanking();
    }catch(error){hierarchyMessage=error.message;toast(hierarchyMessage,'danger');}
    finally{hierarchyPromoting=false;if(currentPanel==='character'&&characterTab==='hierarchy')renderPanel();}
  }
  function confirmHierarchy(){
    if(hierarchySyncing||hierarchyPromoting||hierarchyView?.faction!==game.factionId||hierarchyView.tier!==game.hierarchyTier)return;
    const state=MareHierarchy.next(game.hierarchyTier,game.level);if(state.state!=='ready')return;
    const faction=game.factionId,old=game.hierarchyTier;
    showConfirmation('Confirmar promoção','Patamar '+old+' → Patamar '+state.target,()=>promoteHierarchy(old),'CONFIRMAR PROMOÇÃO',false);
    document.querySelector('.confirmation-overlay #confirmationMessage')?.insertAdjacentHTML('afterend',MareHierarchyUI.transition(faction,old,state.target));
  }
  document.addEventListener('change',event=>{const el=event.target.closest?.('[data-hierarchy-tier-select]');if(el&&hierarchyView){const tier=Number(el.value);if(tier>=1&&tier<=8){hierarchyView.tier=tier;renderPanel();$('dialogBody').querySelector('[data-hierarchy-tier-select]')?.focus({preventScroll:true});}}});
  function honorsHeader(kind){
    const header=$('dialogTitle').parentElement.parentElement;header.querySelector('small').textContent='KAIZOKU IDLE — MENU';
    $('honorsHeaderNote')?.remove();header.insertAdjacentHTML('beforeend','<p id="honorsHeaderNote">'+(kind==='achievements'?'Conquistas permanentes, recompensas únicas e pontos de talento. Cada recompensa só pode ser resgatada uma vez.':'Consulte as quatro facções, conheça seus patamares e acompanhe o ranking dos mares.')+'</p>');
  }
  function renderCharacterHub(body){
    if(characterTab!=='talents')MareTalentUI.unmount();
    $('characterTabs')?.remove();
    $('panelOverlay').classList.toggle('character-studio-mode',['status','appearance'].includes(characterTab));
    if(!['status','talents','achievements','haki','akuma','hierarchy','appearance'].includes(characterTab))characterTab='status';
    $('dialogTitle').textContent=({status:'Personagem',talents:'Talentos',achievements:'Conquistas',haki:'Haki',akuma:'Akuma no Mi',hierarchy:'Hierarquia dos Mares',appearance:'Aparência'})[characterTab];
    if(characterTab==='appearance'){
      if(lobby96.snapshot().enabled){
        appearanceDraft=appearanceDraft||MareCharacterAppearance.read(game);
        body.innerHTML='<section id="profileAppearance">'+MareCharacterStudio.appearance({value:appearanceDraft,prefix:'profile',direction:profileDirection,factionId:game.factionId,factionName:factions[game.factionId].name})+'<p class="studio-save-status" role="status">'+escapeHTML(dollLookMessage)+'</p><div class="creation-actions">'+MareUI.button({label:'← Descartar alterações',attributes:{'data-appearance-cancel':''}})+MareUI.button({label:'Salvar aparência ✓',variant:'primary',attributes:{'data-appearance-apply':''}})+'</div></section>';return;
      }

    }
    if(characterTab==='hierarchy'){honorsHeader('hierarchy');renderHierarchy(body);return;}
    if(characterTab==='status'){renderCharacter(body);return;}
    if(characterTab==='talents'){
      talentDraft=talentDraft||JSON.parse(JSON.stringify(MareTalents.buildFor(game)));
      body.innerHTML=MareTalentUI.render({game,draft:talentDraft,selected:selectedTalent,message:talentMessage,escapeHTML,canReset:scene==='lobby'});MareTalentUI.mount(body);return;
    }
    if(characterTab==='haki'){if(!game.has_haki_unlocked){body.innerHTML='<p>Alcance o nível 50 e consuma um Livro da Vontade para despertar.</p>';return;}body.innerHTML=MareHakiUI.render(game,session.haki,{inHunt:scene==='hunt',alive:game.hp>0&&session.respawn<=0});return;}
    if(characterTab==='akuma'){MareCompendium.mount(body,{getGame:()=>game,state:compendiumUI,register:registerFruit,hideTooltip:()=>gameTooltip.hide(),capacity:BAG_CAPACITY});return;}
    if(characterTab==='achievements'){honorsHeader('achievements');body.innerHTML=MareTalentUI.renderAchievements({game,escapeHTML,message:talentMessage,category:achievementCategory});return;}
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
  const expeditionPreviewBitmaps=new Map();
  function fitExpeditionBitmap(c,key,im,w,h){
    let cached=expeditionPreviewBitmaps.get(key);
    if(!cached){
      const source=document.createElement('canvas');source.width=im.width||im.naturalWidth;source.height=im.height||im.naturalHeight;
      const d=source.getContext('2d',{willReadFrequently:true});d.drawImage(im,0,0);
      const pixels=d.getImageData(0,0,source.width,source.height).data;
      let x0=source.width,y0=source.height,x1=-1,y1=-1;
      for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(pixels[(y*source.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
      if(x1<0)return 'unavailable';
      cached={source,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};expeditionPreviewBitmaps.set(key,cached);
    }
    const f=Math.min(w*.8/cached.w,h*.79/cached.h),dw=Math.round(cached.w*f),dh=Math.round(cached.h*f);
    c.drawImage(cached.source,cached.x,cached.y,cached.w,cached.h,Math.round((w-dw)/2),Math.round(h*.94-dh),dw,dh);return 'ready';
  }
  function drawExpeditionMonster(c,type,w,h){
    c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;
    if(MareSpriteCombatV2Data[type]?.monster){
      const state=MareSpriteCombatV2.status(type,'idle','south');
      if(state!=='ready')return state==='loading'?'loading':'unavailable';
      return MareSpriteCombatV2.draw(c,type,w/2,h*.94,{action:'idle',direction:'south',time:0,height:h*.79,fit:w*.85})?'ready':'unavailable';
    }
    if(type==='cesar'){
      const cached=expeditionPreviewBitmaps.get(type);
      if(cached)return fitExpeditionBitmap(c,type,cached.source,w,h);
      void MareEmberRenderer.prepareMonsters(['cesar']);
      const source=document.createElement('canvas');source.width=source.height=256;
      const drawn=MareEmberRenderer.monster(source.getContext('2d'),{type:'cesar',skin:'cesar',x:128,y:240,emberFacing:'south',attackAnim:0,moving:0},0);
      return drawn?fitExpeditionBitmap(c,type,source,w,h):'loading';
    }
    const im=mobSprites[type];if(!im)return 'unavailable';
    if(!im.complete)return 'loading';if(!im.naturalWidth)return 'unavailable';
    return fitExpeditionBitmap(c,type,im,w,h);
  }

  function expeditionHeader(tabs=''){
    $('voyageRegionTabs')?.remove();$('expeditionBack')?.remove();$('expeditionSubtitle')?.remove();
    const header=$('dialogTitle').parentElement;
    header.querySelector('small').textContent='KAIZOKU IDLE — MENU';
    if(tabs)header.insertAdjacentHTML('beforeend',tabs);
    else header.insertAdjacentHTML('beforeend','<p id="expeditionSubtitle">Um adversário por andar. Vença para abrir o próximo portão.</p>');
    $('closePanel').insertAdjacentHTML('beforebegin','<button type="button" id="expeditionBack" data-mode="modes">← Modos de jogo</button>');
  }
  function renderVoyages(body){
    let region=MareArchipelago.regions.find(r=>r.id===voyageUI.region);
    if(!region||region.locked){voyageUI={region:'east-blue',selected:null};region=MareArchipelago.regions[0];}
    const islands=MareArchipelago.list(voyageUI.region),selected=islands.find(i=>i.id===voyageUI.selected)||null;
    const ui=MareVoyageUI.voyage({region,regions:MareArchipelago.regions,islands,selected,game,scene,canTravel:selected&&MareArchipelago.canTravel(selected.id,game.level)});
    expeditionHeader(ui.tabs);body.innerHTML=ui.body;MareVoyageUI.hydrate(body,drawExpeditionMonster);
  }
  function renderModes(body){
    body.innerHTML=`<nav class="game-modes-list" aria-label="Escolha um modo de jogo"><button type="button" data-mode="map"><img src="icones_menu_pirata/png/48/mapa.png" alt=""><span>Mapa do Arquipélago<small>Ilhas e expedições</small></span></button><button type="button" data-mode="prison"><img src="assets/ui/modes/impel-down.svg" alt=""><span>Impel Down<small>Prisão de 100 andares</small></span></button></nav>`;
  }
  let prisonPreparedDraft=null;
  function ensurePrisonEncounter(floor){
    const existing=MarePrison.resolveEncounter(game.impelDown.encounter,monsterTypes);
    if(existing?.floor===floor)return existing;
    const result=prisonPreparedDraft?.enemy?.floor===floor&&floor===game.impelDown.cleared+1?prisonPreparedDraft:MarePrison.prepareEncounter(game,floor,monsterTypes);
    if(!result.ok)return null;
    // Retry the same unsaved identity; never replace current inventory/progression with an old snapshot.
    prisonPreparedDraft=result;
    const next={...game,impelDown:{...game.impelDown,encounter:{...result.state.impelDown.encounter}}};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{return null;}
    game=next;prisonPreparedDraft=null;return result.enemy;
  }
  function renderPrison(body){
    prisonFloor=Math.min(prisonFloor,MarePrison.unlockedThrough(game));
    const floor=prisonFloor;
    let enemy=impelRun?.currentFloor===floor?impelRun.enemy:null,preparationFailed=false;
    if(!enemy&&MarePrison.canEnter(game,floor)&&!impelRun){enemy=ensurePrisonEncounter(floor);preparationFailed=!enemy;}
    if(!enemy&&game.impelDown.lastEncounter?.floor===floor)enemy=MarePrison.resolveEncounter(game.impelDown.lastEncounter,monsterTypes);
    expeditionHeader();
    body.innerHTML=MareVoyageUI.prison({system:MarePrison,game,floor,enemy,activeFloor:impelRun?.currentFloor,active:!!impelRun,pending:!!impelRun?.pending,preparationFailed:preparationFailed||!!impelRun?.preparationPending});
    MareVoyageUI.hydrate(body,drawExpeditionMonster);
    const list=body.querySelector('.prison-floor-scroll'),button=list?.querySelector('[aria-pressed=true]');
    if(button)list.scrollTop=Math.max(0,button.offsetTop-list.offsetTop-list.clientHeight*.35);
  }
  function renderPanel(){if(!currentPanel||!game)return;$('panelOverlay').dataset.uiPanel=currentPanel;$('panelOverlay').classList.toggle('honors-hd-mode',currentPanel==='character'&&['achievements','hierarchy'].includes(characterTab));$('panelOverlay').classList.toggle('achievements-hd-mode',currentPanel==='character'&&characterTab==='achievements');$('panelOverlay').classList.toggle('hierarchy-hd-mode',currentPanel==='character'&&characterTab==='hierarchy');if(!['achievements','hierarchy'].includes(characterTab)||currentPanel!=='character')$('honorsHeaderNote')?.remove();const body=$('dialogBody');MareVoyageUI.unmount();$('panelOverlay').classList.toggle('voyage-hd-mode',['map','prison'].includes(currentPanel));if(!['map','prison'].includes(currentPanel)){$('expeditionBack')?.remove();$('expeditionSubtitle')?.remove();}const isCompendium=currentPanel==='character'&&characterTab==='akuma';$('panelOverlay').classList.toggle('compendium-hd-mode',isCompendium);MareCompendium.unmount();const isTalents=currentPanel==='character'&&characterTab==='talents';$('panelOverlay').classList.toggle('talents-hd-mode',isTalents);if(!isTalents)MareTalentUI.unmount();$('panelOverlay').classList.toggle('forge-hd-mode',currentPanel==='forge');if(currentPanel!=='character')$('panelOverlay').classList.remove('character-studio-mode');$('panelOverlay').classList.toggle('contracts-mode',currentPanel==='contracts');$('panelOverlay').classList.toggle('character-mode',currentPanel==='character');$('panelOverlay').classList.toggle('voyage-mode',['map','prison'].includes(currentPanel));$('panelOverlay').classList.toggle('modes-mode',currentPanel==='modes');if(currentPanel!=='inventory'){$('panelOverlay').classList.remove('inventory-mode','pirate-hd');$('inventoryHeadMeta')?.classList.add('hidden');}const titles={journal:'Jornal do Porto',myprofile:'Meu Perfil',settings:'Configurações',hunt:'Rota da caçada',dev:'Laboratório DEV',inventory:'Inventário',forge:'Forja das Correntes',character:'Personagem',modes:'Modos de jogo',prison:'Impel Down',map:'Mapa do Arquipélago',contracts:'Quadro de Contratos',shop:'Mercador do Porto',help:'Guia do Navegante'};$('dialogTitle').textContent=titles[currentPanel]||currentPanel;const forgeBrand=$('dialogTitle').parentElement.querySelector('small');if(forgeBrand){if(currentPanel==='forge'){forgeBrand.dataset.originalBrand ||= forgeBrand.textContent;forgeBrand.textContent='KAIZOKU IDLE';}else if(forgeBrand.dataset.originalBrand)forgeBrand.textContent=forgeBrand.dataset.originalBrand;}if(currentPanel!=='map')$('voyageRegionTabs')?.remove();body.dataset.view=currentPanel;document.querySelectorAll('.bottom-nav [data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===currentPanel||(b.dataset.panel==='modes'&&['map','prison'].includes(currentPanel)))));
    if(['journal','myprofile','settings'].includes(currentPanel)){
      const g=game,s=getDerived(),className=classes[game.classId]?.name||game.classId;
      const equipment=Object.entries(game.equipment||{}).filter(([,item])=>item).map(([slot,item])=>({slot:slotNames[slot]||slot,name:itemBase(item).name}));
      body.innerHTML=MarePlayerHub.render(currentPanel,{game:g,stats:s,className,factionName:factions[g.factionId]?.name,equipment});
      MarePlayerHub.hydrate(currentPanel);
    }
    if(currentPanel==='shop'){body.innerHTML=`<div class="mini-heading">MERCADOR donquixote · SUPRIMENTOS</div><div class="item-detail">${itemIcon('potion','Poção de vida')}<h3>Poção de vida</h3><p>Restaura 44% da vida máxima.<br>Preço: <strong>35 Berry</strong><br>Seu saldo: <strong>${fmt(game.gold)}</strong></p><button class="dialog-button" data-buy-potion="1" ${game.gold<35?'disabled':''}>COMPRAR 1 POÇÃO</button></div>`;}
    if(currentPanel==='contracts')body.innerHTML=MareContractsBoard.render(contractsBoardData());
    if(currentPanel==='inventory'){renderInventory(body);}
    if(currentPanel==='forge')renderForge(body);
    if(currentPanel!=='character'){MareTalentUI.unmount();$('characterTabs')?.remove();}
    if(currentPanel==='character')renderCharacterHub(body);
    if(currentPanel==='map')renderVoyages(body);
    if(currentPanel==='modes')renderModes(body);
    if(currentPanel==='prison')renderPrison(body);
    if(currentPanel==='hunt')renderHuntRoute(body);
    if(currentPanel==='dev')body.innerHTML=MareDev.render({g:game,on:DEV_ACTIVE,classes,defs:itemDefs,E:escapeHTML,status:devMessage,review:{...lobby96.snapshot(),debugEnabled:paperDollDebug}});
    if(currentPanel==='help'){body.innerHTML=`<div class="help-copy"><p><strong>Bem-vindo a Kaizoku Idle.</strong> Esta é uma demonstração jogável offline de um futuro RPG Idle online, em um universo marítimo original.</p><ul><li><strong>Lobby:</strong> clique no chão para caminhar e nos NPCs para abrir seus serviços. Abra Modos de jogo (M) e escolha Arquipélago para viajar ou Impel Down para enfrentar os andares da prisão.</li><li><strong>Auto-caçada:</strong> seu personagem procura monstros, anda até eles e ataca sozinho. O botão AUTO-CAÇADA pausa ou retoma.</li><li><strong>Teclas 1 e 2:</strong> ativam habilidades; se a caçada estiver ligada, o personagem também usa habilidades automaticamente quando apropriado.</li><li><strong>Tecla Q:</strong> usa uma poção de vida. É possível comprar mais por 35 Berry.</li><li><strong>Contratos:</strong> conclua as caçadas listadas à direita e resgate as recompensas.</li><li><strong>Inventário:</strong> equipe os itens encontrados. Equipamentos alteram atributos reais.</li><li><strong>Forja:</strong> consome materiais e Berry para melhorar equipamentos até +5.</li><li><strong>Mapa:</strong> a Cidade das Conchas é desbloqueada no nível 6.</li><li><strong>Salvamento:</strong> seu progresso é salvo automaticamente neste navegador, com LocalStorage. Não existe conta online, chat real ou progresso com a página fechada nesta versão.</li></ul><p>Este é um protótipo gratuito de desenvolvimento. O MMORPG, o servidor multiplayer, o banco de dados e as relíquias estão planejados para fases posteriores.</p><button class="dialog-button secondary" data-export="1">EXPORTAR SAVE (JSON)</button><button class="dialog-button secondary" data-import="1">IMPORTAR SAVE</button><button class="dialog-button secondary" data-reset="1">RECOMEÇAR JOGO</button></div><input type="file" id="saveImport" accept=".json,application/json" style="display:none"/>`;}
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
    if(command.type==='cooldowns')session.cooldowns=[0,0,0];
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
    if(e.target.closest('[data-headgear-visibility]')){
      if(currentPanel!=='inventory'||!game.equipment?.head)return;
      const next=MareHeadgear.withPreference(game,!MareHeadgear.hidden(game));
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));game=next;$('saveDot').style.background='#65c9bc';}
      catch{toast('Não foi possível salvar a preferência. O visual anterior foi preservado.','danger');return;}
      renderPortrait();renderPanel();document.querySelector('[data-headgear-visibility]')?.focus({preventScroll:true});return;
    }
    if(e.target.closest('[data-appearance-cancel]')){appearanceDraft=MareCharacterAppearance.read(game);dollLookMessage='Alterações descartadas.';renderPanel();return;}
    if(e.target.closest('[data-appearance-apply]')){
      if(currentPanel!=='character'||characterTab!=='appearance')return;
      try{const next=MareCharacterAppearance.commit(game,appearanceDraft,n=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));return true;});if(next){game=next;renderPortrait();dollLookMessage='Aparência salva.';}}
      catch{dollLookMessage='Não foi possível salvar. A aparência anterior foi preservada.';}
      renderPanel();return;
    }
    const sector=e.target.closest('[data-hunt-sector]');if(sector){followHuntSector(sector.dataset.huntSector);return;}const first=e.target.closest('[data-hunt-first]');if(first&&!first.disabled){claimHuntFirst(first.dataset.huntFirst);return;}
    if(e.target.closest('[data-dev-open]')&&MareDev.ENABLED){openPanel('dev');return;}
    if(currentPanel!=='dev')return;
    if(e.target.closest('[data-dev-doll-debug]')&&DEV_ACTIVE){paperDollDebug=!paperDollDebug;renderPanel();return;}
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
    updateNotifications();
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
    const returning=panel==='inventory'?inventoryForgeReturn:null;
    if(panel!=='inventory'&&panel!=='forge')inventoryForgeReturn=null;
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
    if(panel==='inventory'){if(returning){Object.assign(inventoryUI,returning.ui);selectedItem=returning.selected;inventoryForgeReturn=null;}else inventoryUI.page=0;}
    if(panel==='character'&&currentPanel!=='character'){attributeDraft=MareCharacters.empty();characterTab='status';talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;}
    if(panel==='character'&&['status','talents','achievements','haki','akuma','hierarchy','appearance'].includes(characterSection)){if(characterTab!==characterSection){attributeDraft=MareCharacters.empty();talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;}characterTab=characterSection;}
    if(panel==='character'&&characterSection==='achievements'&&notificationManager.state.achievements>0)achievementCategory='all';
    if(panel==='character'&&characterTab==='hierarchy')resetHierarchyView();currentPanel=panel;$('panelOverlay').classList.remove('hidden');renderPanel();if(panel==='character'&&characterTab==='hierarchy')void syncHierarchy();$('dialogBody').scrollTop=0;
    if(returning)for(const [selector,top] of returning.scroll){const node=$('dialogBody').querySelector(selector);if(node)node.scrollTop=top;}
    if(panel==='map')$('voyageRegionTabs').querySelector('[aria-selected=true]')?.focus({preventScroll:true});
    else if(panel==='character'){const attention=characterTab==='status'&&notificationManager.state.status>0?$('dialogBody').querySelector('[data-attribute-add]:not(:disabled)'):null;(attention||$('dialogBody').querySelector('button:not(:disabled),input:not(:disabled)'))?.focus({preventScroll:true});if(attention)attention.scrollIntoView({block:'nearest'});}
    else if(navigation.includes(panel)||['dev','hunt'].includes(panel))$('dialogBody').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function closePanel(){hierarchyRankingAbort?.abort();hierarchyRequest++;$('honorsHeaderNote')?.remove();$('panelOverlay').classList.remove('honors-hd-mode','achievements-hd-mode','hierarchy-hd-mode');MareVoyageUI.unmount();$('expeditionBack')?.remove();$('expeditionSubtitle')?.remove();$('panelOverlay').classList.remove('voyage-hd-mode');MareCompendium.unmount();$('panelOverlay').classList.remove('compendium-hd-mode');appearanceDraft=null;dollLookMessage='';closeCharacterMenu();closeModesMenu();closeCaptainMenu();MareTalentUI.unmount();$('characterTabs')?.remove();talentDraft=null;const wasNavigation=['modes','map','prison'].includes(currentPanel);$('voyageRegionTabs')?.remove();attributeDraft=MareCharacters.empty();allocationMessage="";currentPanel=null;document.querySelectorAll('.bottom-nav [aria-pressed]').forEach(b=>b.setAttribute('aria-pressed','false'));$('panelOverlay').classList.add('hidden');$('panelOverlay').classList.remove('inventory-mode','character-mode','voyage-mode','modes-mode','contracts-mode','forge-hd-mode','character-studio-mode','talents-hd-mode');$('inventoryHeadMeta')?.classList.add('hidden');if(wasNavigation)(mapReturnFocus?.isConnected?mapReturnFocus:$('mainMenu').querySelector('[data-panel=modes]'))?.focus({preventScroll:true});MareUI.restoreFocus($('panelOverlay'));}
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
    if(MareAlubarna.worlds[activeMap().id]){MareAlubarna.ground(ctx,camera,W,H);return;}
    if(activeMap().id==='alabasta'){MareAlabasta.ground(ctx,camera,W,H);return;}
    if(activeMap().id==='impel-down'){MareImpel.ground(ctx,camera,W,H);return;}
    if(activeMap().id==='lobby'&&globalThis.MareLobby){MareLobby.ground(ctx,camera,W,H);return;}
    if(MareNewIslands[activeMap().id]){MareNewIslands.ground(ctx,activeMap().id,camera,W,H);return;}
    if(activeMap().id==='dawn'){MareDawnRenderer.ground(ctx,camera,W,H);return;}
    if(activeMap().id==='conchas'){MarePixelMapRenderer.ground(ctx,'conchas',camera,W,H);return;}
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
  function drawPaperDoll(c,x,y,action,direction,time,scale=null,progress=null,timing=null,worldView=false){
    return lobby96.draw(c,game,{scene,action,direction,time,progress,timing,x,y,scale,worldView,consumer:worldView?'world':c.canvas.id||'preview'});
  }
  function drawPlayerSprite(c,x,y){if(c===ctx&&horuBuffActive()){c.save();c.translate(x,y);c.scale(MareRankC.rules.horu.scale,MareRankC.rules.horu.scale);const ok=drawPlayerSpriteBase(c,0,0);c.restore();return ok;}return drawPlayerSpriteBase(c,x,y);}
  function drawUpdatedZoan(c,zoan,x,y,moving){
    const S=MareSpriteCombatV2,key=S.fruits[zoan.id],entry=MareSpriteCombatV2Data[key];if(!entry){S.reportMissing('player-transformation',zoan.id);return false;}
    const hero=world.hero,basic=basicAttackPose(),now=world.time;
    const scale=key==='tori'?104/64:['uma','inu'].includes(key)?74/48:key==='neko'?MareNeko.visuals.worldScale:key==='ushi'?MareUshi.visuals.worldScale:key==='wolf'?MareWolf.visuals.worldScale:key==='bison'?MareRankCExpansion.rules.bison.visuals.worldSize/64:1;
    const options={action:basic?'attack':moving?'walk':'idle',direction:basic?.direction||hero.direction,time:now,scale:scale*(entry.world_scale??1),height:key==='ryu'?entry.worldHeight:null,progress:basic?.progress??null,hitRatio:basic?.hitFrameRatio??null};
    const collisionProgress=(start,end,hit)=>Number.isFinite(hit)?.5+.5*(now-hit)/Math.max(.01,end-hit):Math.min(.49,(now-start)/Math.max(.01,end-start)*.5);
    const ryu=session.ryuAction,ushi=session.ushiAction,wolf=session.wolfAction,neko=session.nekoAction,bison=session.bisonAction;
    if(key==='ryu'&&ryu){const t=MareRyu.timing(ryu.key,ryu.direction);Object.assign(options,{action:MareRyu.action(ryu.key),direction:ryu.direction,progress:(now-ryu.started)/t.duration,hitRatio:t.impact/t.duration});}
    else if(key==='ushi'&&ushi)Object.assign(options,{action:'headbutt',progress:(now-ushi.started)/MareUshi.rules.headbuttDuration,hitRatio:MareUshi.rules.impactAt/MareUshi.rules.headbuttDuration});
    else if(key==='wolf'&&wolf)Object.assign(options,{action:'charge',progress:wolf.phase==='finish'?.5+.5*(now-wolf.finished)/(4/12):Math.min(.49,wolf.travel/MareWolf.rules.range*.5),hitRatio:.5});
    else if(key==='neko'&&neko)Object.assign(options,{action:neko.kind==='dash'?'dash':'attack',progress:neko.kind==='dash'?collisionProgress(neko.started,neko.started+.75,neko.visualHitAt):((now-neko.started)%.5)/.5,hitRatio:.5});
    else if(key==='phoenix'){const dash=session.rankA?.rankS?.jobs.find(j=>j.kind==='phoenixDash'&&now<j.until);if(dash)Object.assign(options,{action:'dash',progress:Math.min(1,(now-dash.started)/dash.duration),hitRatio:.7});}
    else if(key==='bison'&&bison)Object.assign(options,{action:'dash',progress:collisionProgress(bison.started,bison.started+.67,bison.visualHitAt),hitRatio:.5});
    else if(now<(session.zoanActionUntil||0))Object.assign(options,{action:key==='uma'?'special':'attack',progress:key==='uma'?collisionProgress(session.zoanActionUntil-.75,session.zoanActionUntil,session.zoanVisualHitAt):1-(session.zoanActionUntil-now)/.75,hitRatio:.5});
    const protectedAction=ryuSkillActive()||wolfSkillActive()||ushiSkillActive()||nekoSkillActive()||bisonSkillActive()||now<(session.zoanActionUntil||0)||!!session.zoanTransition?.effect||game.hp<=0;
    const reaction=protectedAction?null:S.hurtProgress(hero,now);
    if(reaction!==null)Object.assign(options,{action:'hurt',progress:reaction,hitRatio:null,flash:!S.resolve(key,'hurt',hero.direction).requested});
    if(key==='ryu')return MareRyu.drawActor(c,x,y,options);
    if(key==='bison')return MareRankCExpansion.drawActor(c,x,y,{...options,height:MareRankCExpansion.rules.bison.visuals.worldSize});
    if(key==='neko')return MareNeko.drawActor(c,x,y,options);
    if(key==='ushi')return MareUshi.drawActor(c,x,y,options);
    if(key==='wolf')return MareWolf.drawActor(c,x,y,options);
    return MareZoanArt.draw(c,zoan.id,x,y,options);
  }
  function drawPlayerSpriteBase(c,x,y){
    const hero=world.hero,attack=hero.attackAnim>0&&scene==='hunt',moving=hero.walking>0&&!betaEquipped();
    const zoan=equippedZoan();
    if(game.zoanTransformed&&zoan)return drawUpdatedZoan(c,zoan,x,y,moving);
    const combat=classCombatController(),pose=combat?.snapshot()||basicAttackPose(),requested=pose?.locked?pose.action:attack?'attack':moving?'walk':'idle';
    const gait=lobby96.walkPose(hero);
    const dollAction=requested==='walk'&&gait&&!gait.moving?'idle':requested,dollTime=dollAction==='walk'&&gait?gait.time:pose?.locked?pose.elapsed:world.time;
    // Some melee identities have no skill controller; reuse their real attack clip
    // over their existing visual window without changing damage or cooldowns.
    const instantMelee=(!DEV_ACTIVE||['sword','brawler'].includes(game.classId))&&attack&&!pose?.locked;
    const dollProgress=pose?.locked?pose.progress:instantMelee?Math.min(1,Math.max(0,1-hero.attackAnim/.22)):null;
    return drawPaperDoll(c,x,y,dollAction,pose?.locked?pose.direction:hero.direction,dollTime,null,dollProgress,pose,c===ctx);
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
        if((m.type==='cesar'||['embers','dawn'].includes(activeMap().id))&&MareEmberRenderer.monster(ctx,m,world.time))return true;
    const img=mobSprites[m.type];if(!img?.complete||!img.naturalWidth)return false;
    const t=world.time, size=m.type==='boss'?98:m.type==='crab'?56:m.type==='spirit'?64:66;
    const width=size*(img.naturalWidth/img.naturalHeight),bob=Math.sin(t*2.7+m.bob)*1.5;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(m.hit>0)ctx.filter='brightness(1.55)';
    ctx.drawImage(img,Math.round(m.x-width/2),Math.round(m.y-size+bob),Math.round(width),Math.round(size));
    ctx.restore();return true;
  }
  function drawMonster(m){
    if(drawMobArt(m)){if(m.alive)drawCombatHeader(m,monsterName(m)+' · Nv.'+m.level,m.hp,m.maxHP,m.type==='boss'?88:65,m.type==='boss'?'#e5a35d':'#e27283');return;}
    let t=world.time,scale=m.type==='boss'?2.15:m.type==='crab'?1.65:1.8,bob=Math.round(Math.sin(t*3+m.bob)*2);ctx.save();ctx.translate(Math.round(m.x),Math.round(m.y+bob));ctx.scale(scale,scale);ctx.fillStyle='#071b20a0';ctx.beginPath();ctx.ellipse(0,2,13,4,0,0,Math.PI*2);ctx.fill();if(m.type==='crab'){px(ctx,-10,-12,20,12,'#7d3b36');px(ctx,-8,-17,16,10,'#d27b58');px(ctx,-11,-16,5,6,'#e6b477');px(ctx,6,-16,5,6,'#e6b477');px(ctx,-7,-14,3,3,'#182e32');px(ctx,5,-14,3,3,'#182e32');px(ctx,-17,-6,8,3,'#aa5444');px(ctx,9,-6,8,3,'#aa5444');px(ctx,-19,-16,8,7,'#d78563');px(ctx,11,-16,8,7,'#d78563');}else if(m.type==='bandit'){px(ctx,-5,-11,5,9,'#353a35');px(ctx,1,-11,5,9,'#353a35');px(ctx,-8,-26,17,15,'#8d5741');px(ctx,-6,-39,12,13,'#c08e6a');px(ctx,-12,-40,24,5,'#3e3a3a');px(ctx,-7,-46,16,8,'#55504b');px(ctx,10,-25,4,22,'#bdc7ba');px(ctx,9,-16,8,3,'#eac078');px(ctx,-5,-34,3,2,'#292e2c');px(ctx,2,-34,3,2,'#292e2c');}else if(m.type==='spirit'){ctx.globalAlpha=.85;px(ctx,-10,-28,21,22,'#2e7e75');px(ctx,-7,-39,15,13,'#a8e7c5');px(ctx,-13,-27,5,13,'#78c9b1');px(ctx,10,-27,5,13,'#78c9b1');px(ctx,-8,-5,7,5,'#77cabb');px(ctx,2,-5,7,5,'#80d5c4');px(ctx,-6,-33,4,3,'#295751');px(ctx,4,-33,4,3,'#295751');px(ctx,-13,-40,8,5,'#9ecbb1');ctx.globalAlpha=1;}else {px(ctx,-7,-13,7,11,'#24262d');px(ctx,2,-13,7,11,'#24262d');px(ctx,-11,-32,22,20,'#732f36');px(ctx,-7,-43,15,13,'#c09878');px(ctx,-16,-47,31,7,'#2c3434');px(ctx,-8,-54,17,9,'#423a36');px(ctx,-6,-36,12,4,'#e9c178');px(ctx,-14,-29,5,19,'#b1a18c');px(ctx,13,-39,5,30,'#cbd5cf');px(ctx,9,-19,14,4,'#e7b974');px(ctx,-3,-38,3,2,'#262a2a');px(ctx,4,-38,3,2,'#262a2a');}if(m.hit>0){ctx.globalCompositeOperation='screen';px(ctx,-11,-39,22,29,'#fff9d0aa');ctx.globalCompositeOperation='source-over';}ctx.restore();
    if(m.alive)drawCombatHeader(m,monsterName(m)+' · Nv.'+m.level,m.hp,m.maxHP,m.type==='boss'?88:56,m.type==='boss'?'#d9aa6c':'#c87369');}
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
  function drawBisonShell(foreground,x,y){
    if(!bisonShellActive())return;const v=MareRankCExpansion.rules.bison.visuals;
    ctx.save();if(foreground){ctx.beginPath();ctx.rect(x-v.buffSize/2,y+v.foregroundTop,v.buffSize,v.foregroundHeight);ctx.clip();}
    MareRankCExpansion.drawEffect(ctx,'shell',x,y+v.buffCenterY,Date.now()-session.bisonShellStarted,{width:v.buffSize,height:v.buffSize});ctx.restore();
  }
  function drawHoruHealFx(foreground){
    for(const f of session.horuHealFx||[]){
      const member=f.member||world.hero,scale=member===world.hero&&horuBuffActive()?MareRankC.rules.horu.scale:1;
      ctx.save();
      // Keep the head above the ring; the lower arc still wraps around the body.
      if(foreground){ctx.beginPath();ctx.rect(member.x-120*scale,member.y-52*scale,240*scale,160*scale);ctx.clip();}
      MareRankC.draw(ctx,'heal',member.x,member.y-36*scale,(Date.now()-f.started)*MareRankC.rules.horu.healPlaybackRate,{width:120*scale,height:120*scale,loop:false});
      ctx.restore();
    }
  }
  function drawTalentedHero(x,y){
    if(wolfAuraActive())MareWolf.drawEffect(ctx,'aura',x,y,Date.now()-session.wolfAuraStartedAt);
    if(supaShieldActive())MareSupaArt.draw(ctx,supaImages.shield,'shield',x,y-32,Date.now()-session.supaShieldStartedAt,{loop:true,scale:120/MareSupaArt.animations.shield.frames[0].w});
    const u=MareUltimates.selected(game),rt=session.talents.ultimate;
    if(u==='shadowClone'){ctx.save();ctx.globalAlpha=.3;drawPlayerSprite(ctx,x-38,y+16);ctx.restore();}
    if(world.hero.visible!==false)vfx_aura.draw(ctx,x,y,world.time,u==='titan'?1.35:1);
    drawHoruHealFx(false);
    drawBisonShell(false,x,y);
    ctx.save();if(rt.hidden)ctx.globalAlpha=.2;if(world.hero.visible===false){drawBeriSeparation(ctx,x,y,1-session.fruitBurst/1.5);}else if(u==='titan'){ctx.translate(x,y);ctx.scale(1.35,1.35);drawPlayerSprite(ctx,0,0);}else drawPlayerSprite(ctx,x,y);ctx.restore();
    if(horuBuffActive()){const aura=MareRankC.rules.horu.mutationVfx;MareRankC.draw(ctx,'mutation',x,y+aura.offsetY,Date.now()-session.horuBuffStarted,{width:aura.width,height:aura.height});}
    vfx_aura.draw(ctx,x,y,world.time,u==='titan'?1.35:1,null,'front');
    drawBisonShell(true,x,y);
    drawHoruHealFx(true);
    if(ushiBuffActive())MareUshi.drawBuff(ctx,x,y,Date.now()-session.ushiBuffStartedAt);
    globalThis.MareHakiArt?.draw(ctx,session.haki,world.hero,world.time,reducedFX,(c,x,y)=>{c.save();c.translate(x,y);if(u==='titan')c.scale(1.35,1.35);drawPlayerSprite(c,0,0);c.restore();},u==='titan'?1.35:1);
    if(betaEquipped())MareRankB.drawLegs(ctx,{x,y},world.time*1000);
    if(u==='armamentSkin'&&rt.vigor>0){px(ctx,x-30,y-94,60,6,'#10222a');px(ctx,x-29,y-93,58*rt.vigor/rt.vigorMax,4,'#e4c77b');}
  }
  function drawForegroundLayer(actors){
    const height=combatVisualHeight(world.hero),regions=MareWorldDepth.regions(activeMap().id);
    if(world.hero.visible!==false&&session.respawn<=0&&MareWorld.occluded(world.hero,regions,height,Math.max(48,height))){
      MareWorldDepth.silhouette(ctx,world.hero,(c,x,y)=>drawPlayerSprite(c,x,y),{height:height+32,width:Math.max(160,height*1.8),occluders:regions});
    }
    drawCombatHeader(world.hero,game.name,game.hp,getDerived().maxHP);
  }
  function drawEntityLayer(){
    const actors=[world.hero,...world.mobs.filter(m=>scene==='hunt'&&m.alive),...(scene==='lobby'?npcs:[])].map(a=>({...a,visualHeight:a===world.hero?combatVisualHeight(a):combatActorHeight(a),visualWidth:Math.max(48,a===world.hero?combatVisualHeight(a):combatActorHeight(a))}));
    const toDraw=MareWorld.sortDepth([
      {kind:'hero',y:world.hero.y,obj:world.hero},
      ...(hoyaActive()?[{kind:'hoya',y:session.genie.y,obj:session.genie}]:[]),
      ...MareWorldDepth.regions(activeMap().id).map(p=>({kind:'scenery',y:p.base,obj:p})),
      ...world.mobs.filter(m=>scene==='hunt'&&m.alive).map(m=>({kind:'mob',y:m.y,obj:m})),
      ...(scene==='lobby'?npcs.map(n=>({kind:'npc',y:n.y,obj:n})):[]),
      ...((scene==='lobby'&&factionShowcase&&globalThis.MareFactionSprites)?Object.keys(MareFactionSprites.assets).filter(id=>!MareFactionSprites.assets[id].meta.class_id).map((id,index)=>({kind:'faction',y:800,obj:{id,x:1240+index*80,y:800}})):[])
    ]);
    for(const item of toDraw){
      if(item.kind==='hero')drawHeroLayer();
      else if(item.kind==='scenery')MareWorldDepth.draw(ctx,item.obj,actors);
      else if(item.kind==='hoya')drawHoyaGenie(item.obj);
      else if(item.kind==='npc')drawNPC(item.obj);
      else if(item.kind==='faction')drawFactionShowcase(item.obj);
      else{drawMonster(item.obj);if(item.obj.alive&&item.obj.wolfBleed)MareWolf.drawEffect(ctx,'bleed',item.obj.x,item.obj.y,(world.time-item.obj.wolfBleed.started)*1000);}
    }
  }
  function drawHeroLayer(){if(session?.respawn>0&&!classCombatController()){ctx.globalAlpha=.5+Math.sin(world.time*8)*.25;}syncZoanTransition();ctx.save();ctx.globalAlpha*=MareZoanTransition.bodyAlpha(session.zoanTransition,world.time);drawTalentedHero(world.hero.x,world.hero.y);ctx.restore();MareZoanTransition.draw(ctx,session.zoanTransition,world.hero.x,world.hero.y,world.time);if(hoyaActive())MareHoya.drawEffect(ctx,'summoner',world.hero.x,world.hero.y-38,(world.time-session.genie.started)*1000,{width:128,height:128});ctx.globalAlpha=1;}
  function drawPaperDollDiagnostics(){
    let panel=$('paperDollDebugReadout');if(!DEV_ACTIVE||!paperDollDebug||!game){if(panel)panel.hidden=true;return;}
    if(!panel){panel=document.createElement('pre');panel.id='paperDollDebugReadout';panel.className='doll-debug-readout';panel.setAttribute('aria-label','Diagnóstico do personagem atual');document.body.append(panel);}
    panel.hidden=false;panel.textContent=JSON.stringify(lobby96.snapshot(),null,2);
  }
  function presentWorld(){drawWorld();drawPaperDollDiagnostics();}
  function drawWorld(){if(!game){ctx.fillStyle='#123740';ctx.fillRect(0,0,W,H);return;}ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));drawBackground();drawHuntWarnings();drawTalentFields();if(scene==='lobby')drawTownActors();if(session.rankA)MareRankA.draw(ctx,session.rankA,world.time,world.mobs,'back',world.hero);drawEntityLayer();
    if(session.rankA)MareRankA.draw(ctx,session.rankA,world.time,world.mobs,'front',world.hero);
    drawRankB();
    drawExpansion();
    drawJiki();
    for(const shot of session.doruProjectiles||[])MareDoru.draw(ctx,shot);
    for(const shot of session.rankCProjectiles||[])MareRankC.draw(ctx,'axe',shot.x,shot.y-32,shot.elapsed*1000,{width:56});
    for(const mob of world.mobs)if(MareRankC.marked(mob))MareRankC.draw(ctx,'mark',mob.x,mob.y-32,Date.now()-mob.matoMarkedAt,{width:72});
    drawForegroundLayer([world.hero,...world.mobs.filter(m=>scene==='hunt'&&m.alive),...(scene==='lobby'?npcs:[])]);
    for(const food of world.food){if(world.time<(food.readyAt||0))continue;if(drawFruitFrame(ctx,food.x,food.y,'akuma_kuku_kuku',MareAkuma.byId('akuma_kuku_kuku').skill_frames-1))continue;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#9c552c';ctx.fillRect(Math.round(food.x-8),Math.round(food.y-9),16,11);ctx.fillStyle='#ffd579';ctx.fillRect(Math.round(food.x-6),Math.round(food.y-11),12,5);ctx.restore();}
    if(MareAlubarna.worlds[activeMap().id])MareAlubarna.environment(ctx,world.time);
    if(activeMap().id==='alabasta')MareAlabasta.environment(ctx,world.time);
    if(MareNewIslands[activeMap().id])MareNewIslands.environment(ctx,activeMap().id,world.time);
    if(activeMap().id==='dawn')MareDawnRenderer.environment(ctx,world.time,reducedFX);
    if(activeMap().id==='conchas')MarePixelMapRenderer.environment(ctx,'conchas',world.time,reducedFX);
    if(['orange','loguetown'].includes(activeMap().id))MarePixelMapRenderer.environment(ctx,activeMap().id,world.time,reducedFX);
    if(activeMap().id==='embers')MareEmberRenderer.environment(ctx,camera,W,H,world.time,reducedFX);
    for(let p of world.projectiles){let x=p.x+(p.tx-p.x)*p.progress,y=p.y+(p.ty-p.y)*p.progress;ctx.fillStyle=p.color;ctx.fillRect(x-3,y-3,11,6);ctx.fillStyle='#fff7db';ctx.fillRect(x+1,y-2,4,3);}
    // Neko impacts use the shared punch effect at each actual damage event.
    for(let f of world.fx){ctx.globalAlpha=f.fruit||f.zoanVfx||f.supaVfx?1:clamp(f.life/f.max,0,1);if(f.wolfImpact){MareWolf.drawEffect(ctx,'bleed',f.x,f.y,(world.time-f.started)*1000);}else if(f.supaVfx){MareSupaArt.draw(ctx,supaImages[f.supaVfx],f.supaVfx,f.x,f.y,Date.now()-f.startedAt,{scale:MareAkuma.supaRules.radius*2/MareSupaArt.animations.slash.frames[0].w});}else if(f.zoanVfx){MareZoanArt.drawVfx(ctx,f.zoanVfx,f.followHero?world.hero.x:f.x,f.followHero?world.hero.y:f.y,{time:f.max-f.life,scale:74/48,loop:!!f.loop});}else if(f.fruit){drawFruitBurst(ctx,f.x,f.y,f.fruit,f.max-f.life);}else if(f.slash){ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y-17,29,-2.35,.2);ctx.stroke();}else if(f.ring){ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f.x,f.y-4,(1-f.life/f.max)*61+6,(1-f.life/f.max)*26+5,0,0,Math.PI*2);ctx.stroke();}else {ctx.textAlign='center';ctx.font='bold '+f.size+'px Trebuchet MS';ctx.lineWidth=3;ctx.strokeStyle='#0b2323';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}}ctx.globalAlpha=1;
    drawCombatVfx();
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
    if(currentPanel==='character'&&characterTab==='status'){const canvas=$('characterSprite');if(canvas)drawCurrentPreview(canvas,175,{aura:false});}
    if(currentPanel==='character'&&characterTab==='appearance'){
      const appearance=$('profileAppearanceCanvas');if(appearance){const c=appearance.getContext('2d');c.clearRect(0,0,appearance.width,appearance.height);const ok=lobby96.preview(c,game,{action:'idle',direction:profileDirection,time:0,appearance:appearanceDraft||MareCharacterAppearance.read(game),consumer:'appearance-editor'});$('profileAppearanceState').textContent=ok?'Prévia atualizada':lobby96.snapshot().previewMessage||lobby96.snapshot().message||'Carregando personagem…';}

    }

    if(currentPanel==='character'&&characterTab==='akuma')for(const canvas of document.querySelectorAll('canvas[data-akuma-aura]')){const fruit=MareAkuma.byId(canvas.dataset.akumaAura),c=canvas.getContext('2d');c.clearRect(0,0,48,48);c.imageSmoothingEnabled=false;vfx_aura.draw(c,24,48,world.time,1,fruit);}
  }
  function updatePlayerVisualStatus(){
    const node=$('playerVisualStatus');if(!node)return;
    let state=lobby96.snapshot().visualState;
    const fruit=game?.zoanTransformed?equippedZoan():null;
    if(fruit){const key=MareSpriteCombatV2.fruits[fruit.id],pose=basicAttackPose();state=MareSpriteCombatV2.visualStatus(key,pose?'attack':world.hero.walking>0?'walk':'idle',pose?.direction||world.hero.direction);if(state==='missing')state='failed';}
    const visible=!!game&&['loading','failed','degraded'].includes(state);node.classList.toggle('hidden',!visible);node.dataset.state=state;
    node.textContent=state==='failed'?'Visual indisponível. Recarregue a página.':state==='degraded'?'Há equipamento sem arte disponível.':'Carregando personagem…';
    $('wantedPortrait').setAttribute('aria-busy',String(visible&&state==='loading'));
  }
  function frame(t){if(!lastTime)lastTime=t;const dt=Math.min(.25,Math.max(0,(t-lastTime)/1000));lastTime=t;if(game&&!document.hidden){for(let remaining=dt;remaining>0;remaining-=.05)tick(Math.min(.05,remaining));renderUIClock+=dt;saveClock+=dt;if(renderUIClock>.27){renderUIClock=0;updateUI();}if(saveClock>(game.has_haki_unlocked?1:7)){saveClock=0;saveGame();}camera.update(combatFocus(),activeMap(),dt);}presentWorld();drawVfxPanels();drawCreationAppearance(t/1000);updatePlayerVisualStatus();requestAnimationFrame(frame);}


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
  window.MareCharacterHUD?.close();
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
    $('miniLevel').textContent=String(game.level);
    if($('miniHP'))$('miniHP').style.width=(100*clamp(game.hp/s.maxHP,0,1)).toFixed(1)+'%';
    if($('miniEnergy'))$('miniEnergy').style.width=(100*clamp(game.energy/s.maxEnergy,0,1)).toFixed(1)+'%';
    if($('miniGold'))$('miniGold').textContent=fmt(game.gold);

    $('miniPower').textContent=fmt(s.power);
    $('miniHPText').textContent=fmt(game.hp)+' / '+fmt(s.maxHP);
    $('miniEnergyText').textContent=fmt(game.energy)+' / '+fmt(s.maxEnergy);
    $('miniXPText').textContent=fmt(game.xp)+' / '+fmt(xpNeeded(game.level));
    $('miniXP').style.width=(100*clamp(game.xp/xpNeeded(game.level),0,1)).toFixed(1)+'%';
    window.MareCharacterHUD?.update({name:game.name,factionId:game.factionId,hierarchyTier:game.hierarchyTier,hp:game.hp,maxHP:s.maxHP,energy:game.energy,maxEnergy:s.maxEnergy,xp:game.xp,neededXP:xpNeeded(game.level)});
    if(impelRun){$('journeyTitle').textContent='Andar '+impelRun.currentFloor+(MarePrison.isBossFloor(impelRun.currentFloor)?' · Chefe':'');$('journeyChapter').textContent='Impel Down';$('journeyProgress').textContent=game.impelDown.cleared+' / 100 concluídos';$('journeyFill').style.width=game.impelDown.cleared+'%';const a=$('journeyAction');a.textContent=impelRun.pending?'Salvar conclusão':'Ver andares';a.dataset.panel='prison';delete a.dataset.claim;return;}
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
    creationStep=step;
    for(const [i,id]of ['factionStep','classStep','appearanceStep'].entries())$(id).classList.toggle('hidden',step!==i+1);
    for(const [i,id]of ['stepFaction','stepClass','stepAppearance'].entries()){const active=step===i+1;$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','step');else $(id).removeAttribute('aria-current');}
    $('creationError').textContent='';
    if(step===3)$('creationAppearanceStudio').innerHTML=MareCharacterStudio.appearance({value:creationAppearanceDraft,prefix:'creation',direction:creationDirection,factionId:selectedFaction,factionName:factions[selectedFaction].name});
    const heading=$(['factionStep','classStep','appearanceStep'][step-1]).querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
    $('startOverlay').querySelector('.creation-dialog').scrollTop=0;
  }
  function drawCreationAppearance(time){
    const canvas=$('creationLookCanvas');if(!canvas||creationStep!==3||$('startOverlay').classList.contains('hidden'))return;
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    const player={classId:selectedClass,factionId:selectedFaction,paperDollLook:creationLookDraft,equipment:{coat:{def:6}}};
    const drawn=lobby96.preview(c,player,{action:'idle',direction:creationDirection,time:0,appearance:creationAppearanceDraft,consumer:'character-creation'});
    $('creationLookState').textContent=drawn?'Prévia atualizada · '+({north:'Norte',south:'Sul',east:'Leste',west:'Oeste'})[creationDirection]:lobby96.snapshot().previewMessage||lobby96.snapshot().message||'Carregando personagem…';
  }
  function appearanceControl(event){
    const creation=!!event.target.closest('#appearanceStep'),profile=!!event.target.closest('#profileAppearance');
    if(!creation&&!profile)return;
    let key=event.target.dataset.appearance,value=event.target.value;
    const cycle=event.target.closest('[data-appearance-cycle]'),swatch=event.target.closest('[data-appearance-color]'),direction=event.target.closest('[data-appearance-direction]');
    if(direction){(creation?$('creationLookState'):$('profileAppearanceState')).textContent='Carregando personagem…';if(creation)creationDirection=direction.dataset.appearanceDirection;else profileDirection=direction.dataset.appearanceDirection;direction.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===direction)));return;}
    const draft=creation?creationAppearanceDraft:(appearanceDraft||MareCharacterAppearance.read(game));
    if(cycle){key=cycle.dataset.appearanceCycle;const ids=Object.keys(MareCharacterAppearance.choices[key]),i=ids.indexOf(draft[key]);value=ids[(i+Number(cycle.dataset.step)+ids.length)%ids.length];}
    if(swatch){key=swatch.dataset.appearanceColor;value=swatch.dataset.value;}
    if(!Object.hasOwn(MareCharacterAppearance.choices[key]||{},value))return;
    const next=MareCharacterAppearance.normalize({...draft,[key]:value});if(creation)creationAppearanceDraft=next;else appearanceDraft=next;
    const fields=creation?$('creationAppearanceFields'):$('profileAppearanceFields');fields.querySelector('[data-appearance="'+key+'"]').value=value;
    for(const b of fields.querySelectorAll('[data-appearance-color="'+key+'"]'))b.setAttribute('aria-pressed',String(b.dataset.value===value));
    if(creation)$('creationLookState').textContent='Carregando personagem…';else $('profileAppearanceState').textContent='Carregando personagem…';
  }
  document.addEventListener('change',appearanceControl);
  document.addEventListener('click',e=>{if(e.target.closest('[data-appearance-cycle],[data-appearance-color],[data-appearance-direction]'))appearanceControl(e);});
  function openCreation(edit=false){
    editingCharacter=edit;creationLookDraft=MareCharacterAppearance.legacyLook(edit?game:null);creationAppearanceDraft=MareCharacterAppearance.read(edit?game:null);creationDirection='south';
    $('appearanceStep').querySelectorAll('[data-appearance-direction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearanceDirection==='south')));
    if(edit&&game){selectedFaction=game.factionId;selectedClass=game.classId;$('characterName').value=game.name;}
    document.querySelectorAll('[data-faction]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.faction===selectedFaction));
    document.querySelectorAll('[data-class]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.class===selectedClass));
    $('createCharacter').innerHTML='CONFIRMAR E CONTINUAR <span>→</span>';
    showCreationStep(1);$('startOverlay').classList.remove('hidden');
  }
  document.querySelectorAll('[data-faction]').forEach(btn=>btn.addEventListener('click',()=>{selectedFaction=btn.dataset.faction;document.querySelectorAll('[data-faction]').forEach(b=>b.classList.toggle('chosen',b===btn));}));
  document.querySelectorAll('[data-class]').forEach(btn=>btn.addEventListener('click',()=>{selectedClass=btn.dataset.class;document.querySelectorAll('[data-class]').forEach(b=>b.classList.toggle('chosen',b===btn));}));
  $('nextToClass').addEventListener('click',()=>{let name=$('characterName').value.trim().replace(/\s+/g,' ');if(name.length<3||name.length>18){$('creationError').textContent='Use um nome de 3 a 18 caracteres.';return;}showCreationStep(2);});
  $('backToFaction').addEventListener('click',()=>showCreationStep(1));
  $('nextToAppearance').addEventListener('click',()=>showCreationStep(3));
  $('backToClass').addEventListener('click',()=>showCreationStep(2));
  function finishCreation(){
    const name=$('characterName').value.trim().replace(/\s+/g,' ');
    if(name.length<3||name.length>18){$('creationError').textContent='Use um nome de 3 a 18 caracteres.';return;}
    const editing=editingCharacter&&game,changed=editing&&game.classId!==selectedClass;
    if(changed&&game.equipment.weapon&&game.inventory.length>=BAG_CAPACITY){$('creationError').textContent='Libere um espaço na mochila para guardar sua arma atual antes de trocar a classe.';return;}
    let candidate=editing?JSON.parse(JSON.stringify(game)):createGame(name,selectedClass);
    candidate.name=name;candidate.factionId=selectedFaction;candidate.classId=selectedClass;
    if(changed){const old=candidate.equipment.weapon;if(old)candidate.inventory.push(old);candidate.equipment.weapon=newItem(itemDefs[starterWeapon(selectedClass)]);}
    candidate=MareHierarchy.migrate(candidate);candidate.paperDollLook={...creationLookDraft,hair:creationAppearanceDraft.hairStyle==='none'?'bald':'short-black'};
    const d=getDerived(candidate,null);candidate.hp=Math.min(d.maxHP,Math.max(1,candidate.hp));candidate.energy=Math.min(d.maxEnergy,Math.max(0,candidate.energy));
    try{const saved=MareCharacterAppearance.commit(candidate,creationAppearanceDraft,next=>{if(DEV_ACTIVE)next.devSandbox=true;localStorage.setItem(STORAGE_KEY,JSON.stringify(next));return true;});if(!saved)return;game=saved;}
    catch{$('creationError').textContent='Não foi possível salvar. Suas escolhas continuam aqui; tente novamente.';return;}
    if(editing){if(changed){talentDraft=null;characterTab=null;}session.talents=MareTalentCombat.create();session.cooldowns=[0,0,0];session.guard=0;session.blessing=0;void syncHierarchy();$('startOverlay').classList.add('hidden');configureFactionVisual();renderPortrait();updateUI();saveGame();toast('Personagem atualizado.','good');editingCharacter=false;}
    else startGame();
  }
  $('createCharacter').addEventListener('click',()=>{if(creationStep!==3)return;showConfirmation(editingCharacter?'Confirmar alterações?':'Pronto para partir?',$('characterName').value.trim()+' · '+classes[selectedClass].name+' · '+MareCharacterAppearance.choices.gender[creationAppearanceDraft.gender]+'. Sua aparência será salva com o personagem.',finishCreation,editingCharacter?'SALVAR PERSONAGEM':'COMEÇAR AVENTURA',false);});
  $('characterName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(creationStep===1)$('nextToClass').click();else if(creationStep===2)$('nextToAppearance').click();else $('createCharacter').click();}});
  $('autoToggle').addEventListener('click',()=>{if(scene!=='hunt'||!game)return;autoPlay=!autoPlay;if(autoPlay){travelPath=[];lobbyDestination=null;lobbyAction=null;pursuit.delete(world.hero);}toast(autoPlay?'Auto-caçada retomada.':'Auto-caçada pausada.');updateUI();});
  $('hakiKing').addEventListener('click',castHakiKing);
  $('skill1').addEventListener('click',()=>{const skill=MareAkuma.activeSkill(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,'1');if(skill)void useFruitSkill(true,'1');else useSkill(0,true);});$('skill2').addEventListener('click',()=>{const skill=MareAkuma.activeSkill(MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id,'2');if(skill)void useFruitSkill(true,'2');else useSkill(1,true);});$('skill3').addEventListener('click',()=>void useFruitSkill(true,'3'));$('zoanTransform').addEventListener('click',()=>void toggleZoanTransform());$('usePotion').addEventListener('click',()=>usePotion(true));$('buyPotion').addEventListener('click',buyPotion);
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
    b=e.target.closest('[data-inv-slot]');if(b){const it=game.equipment[b.dataset.invSlot];selectInventoryItem(it?.id||null);return;}
    b=e.target.closest('[data-auto-equip]');if(b){equipBest();return;}
    b=e.target.closest('[data-inv-lock]');if(b){const it=getInventoryItem(b.dataset.invLock);if(it){it.locked=!it.locked;saveGame();renderPanel();}return;}
    b=e.target.closest('[data-inv-use-potion]');if(b){if(usePotion(true)){saveGame();updateUI();renderPanel();}return;}
    b=e.target.closest('[data-hierarchy-faction]');if(b){consultHierarchy(b.dataset.hierarchyFaction);return;}
    b=e.target.closest('[data-hierarchy-tier]');if(b&&!b.disabled){const tier=Number(b.dataset.hierarchyTier);if(tier>=1&&tier<=8){hierarchyView.tier=tier;renderPanel();}return;}
    if(e.target.closest('[data-hierarchy-current]')){hierarchyView.tier=game.hierarchyTier;renderPanel();return;}
    b=e.target.closest('[data-hierarchy-scope]');if(b){hierarchyView.scope=b.dataset.hierarchyScope;void loadHierarchyRanking();return;}
    if(e.target.closest('[data-hierarchy-retry]')){void loadHierarchyRanking();return;}
    if(e.target.closest('[data-hierarchy-promote]')){confirmHierarchy();return;}
    b=e.target.closest('[data-character-tab]');if(b){if(b.dataset.characterTab==='haki'&&!game.has_haki_unlocked){showHakiRequirements();return;}characterTab=b.dataset.characterTab;attributeDraft=MareCharacters.empty();talentDraft=null;selectedTalent=null;talentMessage='';talentDraftSeq=game.talentSeq;renderPanel();$('characterTabs')?.querySelector('[data-character-tab="'+characterTab+'"]')?.focus({preventScroll:true});return;}
    b=e.target.closest('[data-achievement-category]');if(b){achievementCategory=b.dataset.achievementCategory;renderPanel();$('dialogBody').querySelector('[data-achievement-category="'+achievementCategory+'"]')?.focus({preventScroll:true});return;}
    b=e.target.closest('[data-achievement-claim]');if(b&&!b.disabled){const result=MareAchievements.claim(game,b.dataset.achievementClaim,{power:getDerived(game,null).power});if(!result.ok){talentMessage=result.message;renderPanel();return;}if(storeTalentChange(result.state)){talentMessage='+'+result.points+' PT resgatados. A recompensa foi registrada no diário.';talentDraft=null;talentDraftSeq=game.talentSeq;MareTalentUI.refreshAchievements($('dialogBody'),game,talentMessage);const card=$('dialogBody').querySelector('[data-achievement-id="'+b.dataset.achievementClaim+'"]');if(card){card.tabIndex=-1;card.focus({preventScroll:true});}}return;}
    b=e.target.closest('[data-talent-select]');if(b){selectedTalent=b.dataset.talentSelect;talentMessage='';if(!e.shiftKey){const plan=MareTalents.invest(game,talentDraft,selectedTalent);if(plan.ok){talentDraft=plan.build;talentMessage='Prévia atualizada. Confirme para aplicar.';}else talentMessage=plan.message;}renderPanel();if(matchMedia('(max-width:760px)').matches)$('dialogBody').querySelector('.talent-inspector')?.scrollIntoView({block:'nearest'});else $('dialogBody').querySelector('[data-talent-select="'+selectedTalent+'"]')?.focus({preventScroll:true});return;}
    b=e.target.closest('[data-talent-add]');if(b&&!b.disabled){const plan=MareTalents.invest(game,talentDraft,b.dataset.talentAdd);if(plan.ok){talentDraft=plan.build;talentMessage='Prévia atualizada. Confirme para aplicar.';}else talentMessage=plan.message;renderPanel();const add=$('dialogBody').querySelector('[data-talent-add="'+b.dataset.talentAdd+'"]:not(:disabled)');add?.focus({preventScroll:true});return;}
    if(e.target.closest('[data-talent-cancel]')){talentDraft=null;talentMessage='Prévia descartada. Seus pontos foram preservados.';renderPanel();return;}
    if(e.target.closest('[data-talent-confirm]')){if(MareTalents.spent(talentDraft)<=MareTalents.spent(MareTalents.buildFor(game)))return;showConfirmation('Confirmar talentos?','Aplique '+(MareTalents.spent(talentDraft)-MareTalents.spent(MareTalents.buildFor(game)))+' PT na árvore de '+MareTalents.getTree(game.classId).name+'.',confirmTalents,'APLICAR TALENTOS',false);return;}
    if(e.target.closest('[data-talent-reset]')){if(scene!=='lobby')return;showConfirmation('Redefinir talentos desta classe?','Todos os PT desta árvore voltarão a ficar disponíveis. Seus equipamentos, atributos e outras classes serão preservados.',()=>{if(scene==='lobby'&&storeTalentChange(MareTalents.reset(game))){session.talents=MareTalentCombat.create();talentDraft=null;talentDraftSeq=game.talentSeq;talentMessage='Pontos devolvidos para esta classe.';renderPanel();}},'REDEFINIR',false);return;}
    b=e.target.closest('[data-inventory-forge]');if(b&&!b.disabled){const item=getInventoryItem(b.dataset.inventoryForge);if(!MareForge.isGear(item,itemDefs))return;inventoryForgeReturn={ui:{...inventoryUI},selected:currentPanel==='inventory'?selectedItem:item.id,scroll:['.op-grid-wrap','.op-detail-content','.op-character-panel','.op-body-grid'].map(selector=>[selector,$('dialogBody').querySelector(selector)?.scrollTop||0])};forgeUI.itemId=item.id;forgeSlot=itemBase(item).slot;forgeUI.tab='upgrade';forgeUI.socket=0;forgeUI.filters={};forgeUI.page=0;forgeOutcome=null;openPanel('forge');return;}
    b=e.target.closest('[data-panel]');if(b){if(b.hasAttribute('data-modes-menu-trigger')||b.hasAttribute('data-character-menu-trigger'))return;openPanel(b.dataset.panel);if(b.id==='attributePointsHud'){characterTab='status';renderPanel();}return;}
    b=e.target.closest('[data-close-panel]');if(b){closePanel();return;}
    b=e.target.closest('[data-buy-potion]');if(b){buyPotion();renderPanel();return;}
    b=e.target.closest('[data-contract-period]');if(b){if(MareContractsBoard.periodConfig[b.dataset.contractPeriod]){contractPeriod=b.dataset.contractPeriod;refreshContractsBoard();}return;}
    b=e.target.closest('[data-claim]');if(b){claimQuest(b.dataset.claim);return;}
    b=e.target.closest('[data-item]');if(b){selectInventoryItem(b.dataset.item);return;}
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
      const money=c=>`${fmt(c.gold)} Berry e ${c.materials||0} Ferro Salgado`;
      if(['reforge','reforgeLine'].includes(command.type)){
        const line=command.type==='reforgeLine',extras=line?[item.extras[command.line]]:item.extras,cost=MareForge.reforgeCost(item,line);
        title='Confirmar reforja?';label='CONFIRMAR REFORJA';message=`${itemBase(item).name} +${item.plus} · Nv.${item.level}. Alterar: ${extras.map(x=>MareForge.names[x.stat]+' +'+(x.stat==='crit'?(x.value*100).toFixed(2)+'%':fmt(x.value))).join(', ')}. Custo: ${money(cost)}. O resultado pode ser inferior. Os demais dados da peça serão preservados.`;
      }else if(command.type==='fuseEquipment'){
        const plan=MareForge.equipmentFusion(game,command.itemIds,command.slot,itemDefs);if(plan.error)return;
        title='Confirmar fusão de equipamentos?';label='CONFIRMAR FUSÃO';message=`Consumir permanentemente: ${plan.items.map(i=>itemBase(i).name+' +'+i.plus+' Nv.'+i.level).join(', ')}. Custo: ${money(plan.cost)}. Receber: ${itemDefs[plan.def].name}, ${MareForge.rarity[plan.source].name} → ${MareForge.rarity[plan.target].name}, Nv.${plan.level}, +0. Extras e refinamentos dos materiais serão perdidos.`;
      }else if(command.type==='fuse'){
        const plan=MareForge.pearlFusion(game,command.itemIds,itemDefs);if(plan.error)return;
        title='Confirmar fusão de pérolas?';label='CONFIRMAR FUSÃO';message=`Consumir definitivamente: ${plan.items.map((i,n)=>'Slot '+(n+1)+': '+MareForge.pearlOf(i,itemDefs).name).join('; ')}. Custo: ${plan.gold} Berry. Resultado possível: ${plan.next.name}. Chance: ${plan.chance*100}%. Em caso de falha, as cinco pérolas e os Berry serão perdidos.`;
      }else if(command.type==='upgrade'){title='Confirmar aprimoramento?';label='CONFIRMAR APRIMORAMENTO';message=`${itemBase(item).name}: +${item.plus} → +${item.plus+1}. Custo: ${money(MareForge.upgradeCost(item))}. Chance: ${Math.round(MareForge.upgradeChance(item)*100)}%. ${item.plus<5?'Aprimoramento garantido.':'Na falha os custos são perdidos, sem rebaixar a peça.'}`;}
      else if(command.type==='remove'){const pearl=MareForge.pearlById[item.sockets[command.socket]];title='Confirmar remoção?';label='REMOVER PÉROLA';message=`Devolver ${pearl.name} à mochila por ${MareForge.removalCost(item,pearl)} Berry.`;}
      else if(command.type==='imbue'){const pearl=game.inventory.find(i=>i.id===command.pearlItemId);title='Confirmar imbuimento?';label='INSTALAR PÉROLA';message=`Instalar ${MareForge.pearlOf(pearl,itemDefs).name} em ${itemBase(item).name}, socket ${command.socket+1}. A pérola sai da mochila. Instalação gratuita; remoção custa Berry.`;}
      if(message)showConfirmation(title,message,()=>runForgeOperation(command),label,false);else runForgeOperation(command);return;
    }
    b=e.target.closest('[data-open-imbue]');if(b){forgeUI.tab='imbue';forgeUI.pearlItemId=b.dataset.openImbue;openPanel('forge');return;}
    b=e.target.closest('[data-forge-slot]');if(b){forgeSlot=b.dataset.forgeSlot;renderPanel();return;}
    b=e.target.closest('[data-forge]');if(b){forgeItem(b.dataset.forge);return;}
    b=e.target.closest('[data-mode]');if(b){if(['modes','map','prison'].includes(b.dataset.mode))openPanel(b.dataset.mode);return;}
    if(e.target.closest('[data-prison-prepare]')){if(impelRun?.preparationPending)startImpelFloor();else ensurePrisonEncounter(prisonFloor);renderPanel();return;}
    b=e.target.closest('[data-prison-floor]');if(b&&currentPanel==='prison'&&!b.disabled){const f=Number(b.dataset.prisonFloor);if(MarePrison.canInspect(game,f)){prisonFloor=f;renderPanel();$('dialogBody').querySelector('[data-prison-floor="'+f+'"]')?.focus({preventScroll:true});}return;}
    if(e.target.closest('[data-prison-continue]')){if(currentPanel==='prison'&&impelRun)closePanel();return;}
    if(e.target.closest('[data-prison-enter]')){enterImpelDown(prisonFloor);return;}
    if(e.target.closest('[data-prison-retry]')){persistImpelVictory();return;}
    if(e.target.closest('[data-prison-exit]')){returnLobby();return;}
    b=e.target.closest('[data-prison-claim]');if(b){claimImpelMilestone(Number(b.dataset.prisonClaim));return;}
    b=e.target.closest('[data-prison-step]');if(b&&currentPanel==='prison'&&!b.disabled){const floor=prisonFloor+Number(b.dataset.prisonStep);if(MarePrison.canInspect(game,floor)){prisonFloor=floor;renderPanel();$('dialogBody').querySelector('[data-prison-step="'+b.dataset.prisonStep+'"]:not(:disabled)')?.focus({preventScroll:true});}return;}
    b=e.target.closest('[data-voyage-region]');if(b){selectVoyageRegion(b.dataset.voyageRegion);return;}
    b=e.target.closest('[data-island]');if(b){const island=MareArchipelago.get(b.dataset.island);if(island&&island.region===voyageUI.region){voyageUI.selected=island.id;renderPanel();const card=$('dialogBody').querySelector('[data-island="'+island.id+'"]');if(matchMedia('(max-width:760px)').matches)$('dungeonName')?.focus();else card?.focus({preventScroll:true});}return;}
    b=e.target.closest('[data-voyage-back]');if(b){const previous=voyageUI.selected;voyageUI.selected=null;renderPanel();$('dialogBody').querySelector('[data-island="'+previous+'"]')?.focus();return;}
    b=e.target.closest('[data-travel-island]');if(b){const island=MareArchipelago.get(b.dataset.travelIsland);if(currentPanel==='map'&&!b.disabled&&island&&island.id===voyageUI.selected&&MareArchipelago.canTravel(island.id,game.level)){b.disabled=true;worldChange(island.area);}return;}

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
    if(hoyaActive()){commandHoya(point);return;}
    if(scene==='hunt'&&MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs)?.id===MareRankCExpansion.rules.kobu.id)session.kobuGround={x,y};
    if(scene==='lobby'){
      const portal=globalThis.MareLobby?.portals.find(p=>Math.hypot(p.x-x,p.y-y)<p.radius);
      if(portal){walkTo(portal,portal);return;}
      const npc=npcs.find(n=>Math.hypot(n.x-x,n.y-30-y)<48);
      walkTo(npc?{x:npc.x-34,y:npc.y+13}:point,npc||null);return;
    }
    if(activeMap().id==='rare'&&Math.hypot(x-MareRare.returnPoint.x,y-MareRare.returnPoint.y)<42){walkTo({...MareRare.returnPoint},{...MareRare.returnPoint,kind:'return'});return;}
    if(activeMap().id==='dawn'&&Math.hypot(x-MareDawn.returnPoint.x,y-MareDawn.returnPoint.y)<42){walkTo({...MareDawn.returnPoint},{...MareDawn.returnPoint,kind:'return'});return;}
    if(activeMap().id==='conchas'&&Math.hypot(x-activeMap().returnPoint.x,y-activeMap().returnPoint.y)<42){walkTo({...activeMap().returnPoint},{...activeMap().returnPoint,kind:'return'});return;}
    if(['orange','loguetown','alabasta'].includes(activeMap().id)&&Math.hypot(x-activeMap().returnPoint.x,y-activeMap().returnPoint.y)<42){walkTo({...activeMap().returnPoint},{...activeMap().returnPoint,kind:'return'});return;}
    if(activeMap().id==='embers'&&Math.hypot(x-MareEmber.returnPoint.x,y-MareEmber.returnPoint.y)<42){walkTo({...MareEmber.returnPoint},{...MareEmber.returnPoint,kind:'return'});return;}
    const target=livingMobs().find(m=>activeMap().id==='rare'&&m.type==='cocox'?MareRareRenderer.cocoxHitTest(m,x,y):Math.hypot(m.x-x,m.y-30-y)<48);
    if(target){world.target=target;autoPlay=true;travelPath=[];lobbyDestination=null;rejectedTargets.delete(target.id);updateUI();return;}
    walkTo(point);
  });

  window.addEventListener('keydown',(e)=>{
    if(e.key==='F9'&&DEV_ACTIVE){e.preventDefault();paperDollDebug=!paperDollDebug;return;}
    if([' ','Enter'].includes(e.key)&&document.activeElement?.matches('[data-headgear-visibility]'))return;
    const isTyping=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if(e.key==='Escape'){
      if(!$('startOverlay').classList.contains('hidden'))return;
      if(!$('characterQuickMenu').classList.contains('hidden')){e.preventDefault();closeCharacterMenu(true);return;}
      if(!$('modesQuickMenu').classList.contains('hidden')){e.preventDefault();closeModesMenu(true);return;}
      if(!$('captainQuickMenu').classList.contains('hidden')){e.preventDefault();closeCaptainMenu(true);return;}
      if(currentPanel){closePanel();return;}
      ['status','expedition','chat'].forEach(k=>toggleFloating(k,false));return;
    }
    if(currentPanel==='map'&&document.activeElement?.matches('[data-voyage-region]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();const tabs=[...$('voyageRegionTabs').querySelectorAll('button:not(:disabled)')],index=tabs.indexOf(document.activeElement);
      const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      selectVoyageRegion(tabs[next].dataset.voyageRegion);return;
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
    if(k==='3'){if(currentFruitSkill('3'))void useFruitSkill(true,'3');return;}
    if(k==='1'||k==='2'){const fruit=MareAkuma.itemData(game.equipment?.akuma_no_mi,itemDefs),skill=MareAkuma.activeSkill(fruit?.id,k);if(e.repeat&&fruit?.id===MareJiki.rules.id)return;if(skill){useFruitSkill(true,k);return;}useSkill(k==='1'?0:1,true);}
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
  const previous=loadGame();if(previous){game=previous;clearExpansion();let d=getDerived();game.hp=clamp(Number(game.hp)||1,0,d.maxHP);game.energy=clamp(Number(game.energy)||0,0,d.maxEnergy);startGame();toast('Bem-vindo de volta, '+game.name+'!','good');}else{$('startOverlay').classList.remove('hidden');openCreation(false);$('characterName').focus();}
  // Diagnóstico somente leitura para testes de regressão da demo local.
  if(DEV_ACTIVE)window.__marePaperDollDebug=()=>lobby96.snapshot();
  window.__mareDiagnostics=()=>({dev:{active:DEV_ACTIVE,key:STORAGE_KEY,options:game?.devOptions},akuma:{rankA:{room:session?.rankA?.room,jobs:(session?.rankA?.jobs||[]).map(j=>({kind:j.kind,started:j.started,hit:j.hit})),active:MareRankA.roomActive(session?.rankA,world.time),dome:MareRankA.domeActive(session?.rankA,world.time),expansion:session?.rankA?.expansion?{jobs:session.rankA.expansion.jobs.length,fields:session.rankA.expansion.fields.length,dots:session.rankA.expansion.dots.length}:null},rankC:{horuActive:horuBuffActive(),horuUntil:session?.horuBuffUntil||0,speedUntil:world.hero.horuSpeedUntil||0,shots:(session?.rankCProjectiles||[]).map(p=>({...p})),marks:world.mobs.filter(m=>MareRankC.marked(m)).map(m=>({id:m.id,until:m.matoMarkUntil,charges:m.matoCharges}))},registered:MareAkuma.registered(game),equipped:game?.equipment?.akuma_no_mi?.id||null,current_fruit_vfx,cooldowns:{...game?.fruitCooldowns},combatVfx:{backend:combatVfxBackend,projectiles:(session?.combatProjectiles||[]).map(p=>({kind:p.kind,phase:p.phase,x:p.x,y:p.y,elapsed:p.elapsed})),hits:(session?.combatHits||[]).map(f=>({kind:f.kind,started:f.started})),heroStatus:session?combatStatus(world.hero):null},shieldActive:supaShieldActive(),shieldUntil:session?.supaShieldUntil||0,nekoAction:session?.nekoAction?{...session.nekoAction}:null,nekoTransformed:isNekoForm(),wolfTransformed:isWolfForm(),wolfAuraActive:wolfAuraActive(),wolfAction:session?.wolfAction?{...session.wolfAction}:null,ryuTransformed:isRyuForm(),ryuAction:session?.ryuAction?{...session.ryuAction}:null,ryuImpactPending:session?.ryuImpactPending||0,ryuSyncError:session?.ryuSyncError||null,doruProjectiles:(session?.doruProjectiles||[]).map(p=>({...p})),doruImpactPending:session?.doruImpactPending||0,doruSyncError:session?.doruSyncError||null,ushiTransformed:isUshiForm(),ushiBuffActive:ushiBuffActive(),ushiAction:session?.ushiAction?{...session.ushiAction}:null,fx:world.fx.filter(f=>f.supaVfx).map(f=>({...f}))},hakiBookDef:itemDefs.indexOf(MareHaki.book),haki:game?{...game.haki,...session?.haki,unlocked:game.has_haki_unlocked}:null,hunt:game?{progress:game.hunts,sector:MareHunt.sectorAt(game.area,world.hero,huntAnchors()),bossReady:MareHunt.bossReady(game,game.area,world.hero,Date.now(),huntAnchors())}:null,scene,autoPlay,hero:{...world.hero},camera:{x:camera.x,y:camera.y,width:W,height:H,zoom:worldZoom.value},telemetry:session?MareHudTelemetry.stats({scene,elapsed:session.elapsed,xp:session.xp,levelXP:game?.xp,neededXP:game?xpNeeded(game.level):1}):null,map:{id:activeMap().id,width:activeMap().width,height:activeMap().height},colliders:activeMap().colliders.map(o=>({...o})),npcs:npcs.map(n=>({...n})),path:travelPath.map(p=>({...p})),destination:lobbyDestination?{...lobbyDestination}:null,walkable:navigator().walkable(world.hero.x,world.hero.y),landmarks:scene==='lobby'?MareIsland.paths.map(p=>({...p})):activeMap().id==='rare'?MareRare.paths.map(p=>({...p})):activeMap().id==='dawn'?MareDawn.paths.map(p=>({...p})):activeMap().id==='conchas'?MarePixelWorldMaps.conchas.districts.map(p=>({...p})):['orange','loguetown'].includes(activeMap().id)?huntAnchors():activeMap().id==='embers'?MareEmber.paths.map(p=>({...p})):[],alive:livingMobs().length,attackClock:session?.attackClock??null,stats:game?getDerived():null,attributes:game?{...game.attributes}:null,attributePoints:game?.attributePoints??0,talents:session?.talents?MareTalentCombat.snapshot(session.talents):null,talentPoints:game?MareTalents.available(game):0,classId:game?.classId,combat:world.hero.combat?.snapshot()??basicAttackPose(),combatAssetId:world.hero.combatAssetId??null,paperDollReview:{enabled:false,state:'retired',draws:0,packId:null},lobby96:lobby96.snapshot(),paperDoll:{enabled:false,state:'retired',draws:0},energy:game?.energy,hp:game?.hp,skillUses:session?.skillUses,skillEnergySpent:session?.skillEnergySpent,healingDone:session?.healingDone,guard:session?.guard,cooldowns:session?.cooldowns?.slice(),mobs:livingMobs().map(m=>({id:m.id,type:m.type,name:monsterName(m),skin:m.skin,district:m.district,area:m.area,maxHP:m.maxHP,attack:m.attack,defense:m.defense,telegraph:m.telegraph?{...m.telegraph}:null,x:m.x,y:m.y,hp:m.hp,wolfBleed:m.wolfBleed?{...m.wolfBleed}:null,ryuStunUntil:m.ryuStunUntil||0,isStunned:MareRyu.stunned(m,world.time)||MareRankB.stunned(m,world.time)||m.talentControl?.remaining>0,isRooted:MareDoru.isRooted(m,world.time),doruRootUntil:m.doruRootUntil||0,poison:m.talentPoison?{...m.talentPoison}:null,level:m.level,hakiDebuff:m.hakiDebuff||0,control:m.talentControl?{...m.talentControl}:null,emp:m.empRemaining||0,marks:m.assassinMarks||0,burn:m.ultimateBurn?{...m.ultimateBurn}:null,clonePoison:m.clonePoison?{...m.clonePoison}:null,wear:m.talentWear?{...m.talentWear}:null,taunt:m.taunt?{...m.taunt}:null})),kills:game?.stats.kills??0,damage:game?.stats.damage??0,level:game?.level??0});
  requestAnimationFrame(frame);
})();

