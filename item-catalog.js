'use strict';
/* Canonical catalog assembly shared by the original game and the authoritative server.
   Numeric definition indexes are persisted identities: append only, never reorder. */
((root)=>{
 const potions=Object.freeze({
   health:Object.freeze({id:"potion",name:"Poção de Vida",resource:"Vida",stock:"potions",price:35,icon:"assets/ui/items-hd/potion.png",key:"Q"}),
   mana:Object.freeze({id:"mana-potion",name:"Poção de Mana",resource:"Energia",stock:"manaPotions",price:35,icon:"assets/ui/items-hd/mana-potion.svg",key:"E"}),
 });
 const potionRules=Object.freeze({restorePercent:25,cooldownMs:5000,maxPurchase:99,maxStock:1000000000,merchantReach:80});
 const potionRecovery=max=>Math.round(max*potionRules.restorePercent/100);
 function create({forge:MareForge,prison:MarePrison,haki:MareHaki,akuma:MareAkuma,hakiProgression:MareHakiProgression,bossDungeons:BossDungeons=root.MareBossDungeons||(typeof require==='function'?require('./boss-dungeon-system.js'):null)}){
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
  const slotNames = {head:'CABEÇA',necklace:'COLAR',coat:'PEITORAL',legs:'CALÇA',boots:'PÉS',weapon:'ARMA PRINCIPAL',cloak:'CAPA',gloves:'MÃOS',ring:'ANEL',belt:'CINTO',charm:'ACESSÓRIO',akuma_no_mi:'AKUMA NO MI'};
  const inventorySlotsLeft=['head','necklace','coat','legs','boots'];
  const inventorySlotsRight=['weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'];
  const BAG_CAPACITY=120;
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
  itemDefs.push(...MareHakiProgression.fragments); // Append only: preserve all existing save indices.
  itemDefs.push(...BossDungeons.fragments); // Added by main#202; previous103 identities remain unchanged.
  // Class armaments, batch 1. Append only: definitions 0..108 retain their identities.
  // Rarity and level multipliers stay in MareForge; these are unmultiplied bases.
  itemDefs.push(
    {name:'Manoplas do Coral Negro',slot:'weapon',type:'brawler',attack:11,defense:2,hp:4,symbol:'✦',rarity:'epic',fixedRarity:true,attributes:{strength:3,vitality:2,dexterity:1},extraPool:['strength','vitality','dexterity','hp','crit','energy'],weaponVisual:'coral-impact',description:'Coral negro talhado em manoplas de combate. Reforça força e vitalidade, com impactos secos e fragmentos de coral.',icon_path:'assets/ui/items-hd/manoplas-do-coral-negro.png?v=class-batch1'},
    {name:'Punhos do Dragão Carmesim',slot:'weapon',type:'brawler',attack:11,defense:2,hp:4,symbol:'✦',rarity:'legendary',fixedRarity:true,attributes:{strength:4,vitality:2,dexterity:1},extraPool:['strength','vitality','dexterity','hp','crit','energy'],weaponVisual:'dragon-impact',description:'Punhos carmesins gravados com escamas douradas. Favorecem força e golpes de impacto com assinatura rubra.',icon_path:'assets/ui/items-hd/punhos-do-dragao-carmesim.png?v=class-batch1'},
    {name:'Luva do Abalo Sísmico',slot:'weapon',type:'brawler',attack:10,defense:4,hp:6,symbol:'✦',rarity:'legendary',fixedRarity:true,attributes:{strength:3,vitality:4,dexterity:1},extraPool:['strength','vitality','dexterity','hp','crit','energy'],weaponVisual:'seismic-impact',description:'Luva de combate em aço naval articulado, com núcleo de pressão e punho fechado. Especializadas em vitalidade e defesa, descarregam ondas concêntricas no impacto.',icon_path:'assets/ui/items-hd/luva-do-abalo-sismico.png?v=class-batch1'},
    {name:'Manoplas da Ruptura dos Mares',slot:'weapon',type:'brawler',attack:11,defense:3,hp:6,symbol:'✦',rarity:'supreme',fixedRarity:true,attributes:{strength:4,vitality:3,dexterity:1},extraPool:['strength','vitality','dexterity','hp','crit','energy'],weaponVisual:'rupture-impact',description:'Manoplas supremas de metal negro e ouro. Fissuras rubras acompanham golpes pesados, unindo força e resistência.',icon_path:'assets/ui/items-hd/manoplas-da-ruptura-dos-mares.png?v=class-batch1'},
    {name:'Mosquete do Vento Cortante',slot:'weapon',type:'gunner',attack:12,defense:0,hp:0,symbol:'◎',rarity:'epic',fixedRarity:true,attributes:{dexterity:3,strength:1},crit:.003,extraPool:['dexterity','strength','crit','energy','hp','vitality'],weaponVisual:'wind-shot',description:'Mosquete de madeira escura, aço e mecanismos dourados. Destreza favorece precisão e crítico; o disparo deixa um rastro de vento cortante.',icon_path:'assets/ui/items-hd/mosquete-do-vento-cortante.png?v=class-batch1'}
  );
  // Class armaments, batch 2. Append after the five previously reviewed items.
  itemDefs.push(...[
  {
    "name": "Pistolas Gêmeas do Corsário",
    "slot": "weapon",
    "type": "gunner",
    "attack": 12,
    "defense": 0,
    "hp": 0,
    "symbol": "◎",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "dexterity": 4,
      "strength": 1
    },
    "extraPool": [
      "dexterity",
      "strength",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "corsair-shot",
    "description": "Pistolas de madeira escura e latão gravado. O par preserva a cadência existente, com destreza, força e crítico.",
    "icon_path": "assets/ui/items-hd/pistolas-gemeas-do-corsario.png?v=class-batch2",
    "crit": 0.004
  },
  {
    "name": "Rifle do Horizonte da Grand Line",
    "slot": "weapon",
    "type": "gunner",
    "attack": 13,
    "defense": 0,
    "hp": 0,
    "symbol": "◎",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "dexterity": 4,
      "strength": 2
    },
    "extraPool": [
      "dexterity",
      "strength",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "horizon-shot",
    "description": "Rifle de precisão em aço azulado e madeira nobre, com bússola dourada e mira alinhada. Favorece destreza e crítico.",
    "icon_path": "assets/ui/items-hd/rifle-do-horizonte-da-grand-line.png?v=class-batch2",
    "crit": 0.004
  },
  {
    "name": "Arcabuz do Juízo Celestial",
    "slot": "weapon",
    "type": "gunner",
    "attack": 14,
    "defense": 0,
    "hp": 0,
    "symbol": "◎",
    "rarity": "supreme",
    "fixedRarity": true,
    "attributes": {
      "dexterity": 4,
      "strength": 2
    },
    "extraPool": [
      "dexterity",
      "strength",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "celestial-shot",
    "description": "Arcabuz supremo branco e dourado. Seu mecanismo luminoso marca os disparos sem alterar os tempos de combate.",
    "icon_path": "assets/ui/items-hd/arcabuz-do-juizo-celestial.png?v=class-batch2",
    "crit": 0.004
  },
  {
    "name": "Braço Mecânico de Ferro Salgado",
    "slot": "weapon",
    "type": "cyborg",
    "attack": 9,
    "defense": 5,
    "hp": 10,
    "symbol": "✦",
    "rarity": "epic",
    "fixedRarity": true,
    "attributes": {
      "vitality": 3,
      "strength": 2,
      "dexterity": 1
    },
    "extraPool": [
      "vitality",
      "strength",
      "dexterity",
      "hp",
      "energy",
      "crit"
    ],
    "weaponVisual": "iron-impact",
    "description": "Braço articulado de aço naval com juntas de bronze. Reforça vitalidade e força, acompanhando os golpes da animação existente.",
    "icon_path": "assets/ui/items-hd/braco-mecanico-de-ferro-salgado.png?v=class-batch2"
  },
  {
    "name": "Canhão de Luz Pacifista",
    "slot": "weapon",
    "type": "cyborg",
    "attack": 10,
    "defense": 4,
    "hp": 9,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "vitality": 4,
      "strength": 3,
      "dexterity": 1
    },
    "extraPool": [
      "vitality",
      "strength",
      "dexterity",
      "hp",
      "energy",
      "crit"
    ],
    "weaponVisual": "pacifista-shot",
    "description": "Canhão compacto de antebraço em metal branco, ouro e núcleo ciano. Une resistência e força à assinatura luminosa dos disparos.",
    "icon_path": "assets/ui/items-hd/canhao-de-luz-pacifista.png?v=class-batch2"
  }
]);
  // Premium class armaments, batch 3; append-only identity.
  itemDefs.push(...[
  {
    "name": "Punho Hidráulico do Colosso",
    "slot": "weapon",
    "type": "cyborg",
    "attack": 11,
    "defense": 5,
    "hp": 12,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "vitality": 4,
      "strength": 3,
      "dexterity": 1
    },
    "extraPool": [
      "vitality",
      "strength",
      "dexterity",
      "hp",
      "energy",
      "crit"
    ],
    "weaponVisual": "hydraulic-impact",
    "description": "Punho Hidráulico do Colosso. Equipamento de engenharia naval, com mecanismos articulados.",
    "icon_path": "assets/ui/items-hd/punho-hidraulico-do-colosso.png?v=class-batch3"
  },
  {
    "name": "Arsenal Final: Protocolo Serafim",
    "slot": "weapon",
    "type": "cyborg",
    "attack": 12,
    "defense": 6,
    "hp": 14,
    "symbol": "✦",
    "rarity": "supreme",
    "fixedRarity": true,
    "attributes": {
      "vitality": 4,
      "strength": 3,
      "dexterity": 1
    },
    "extraPool": [
      "vitality",
      "strength",
      "dexterity",
      "hp",
      "energy",
      "crit"
    ],
    "weaponVisual": "seraphim-shot",
    "description": "Arsenal Final: Protocolo Serafim. Equipamento de engenharia naval, com mecanismos articulados.",
    "icon_path": "assets/ui/items-hd/arsenal-final-protocolo-serafim.png?v=class-batch3"
  },
  {
    "name": "Cetro das Monções",
    "slot": "weapon",
    "type": "strategist",
    "attack": 9,
    "defense": 1,
    "hp": 4,
    "symbol": "✦",
    "rarity": "epic",
    "fixedRarity": true,
    "attributes": {
      "intelligence": 3,
      "spirit": 2
    },
    "extraPool": [
      "intelligence",
      "spirit",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "monsoon-shot",
    "description": "Cetro das Monções. Equipamento de controle elemental, com cristal e metais refinados.",
    "icon_path": "assets/ui/items-hd/cetro-das-moncoes.png?v=class-batch3"
  },
  {
    "name": "Orbe do Trovão de Skypiea",
    "slot": "weapon",
    "type": "strategist",
    "attack": 10,
    "defense": 2,
    "hp": 6,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "intelligence": 4,
      "spirit": 2
    },
    "extraPool": [
      "intelligence",
      "spirit",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "thunder-shot",
    "description": "Orbe do Trovão de Skypiea. Equipamento de controle elemental, com cristal e metais refinados.",
    "icon_path": "assets/ui/items-hd/orbe-do-trovao-de-skypiea.png?v=class-batch3"
  },
  {
    "name": "Cajado da Tempestade Carmesim",
    "slot": "weapon",
    "type": "strategist",
    "attack": 11,
    "defense": 1,
    "hp": 4,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "intelligence": 4,
      "spirit": 3
    },
    "extraPool": [
      "intelligence",
      "spirit",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "crimson-shot",
    "description": "Cajado da Tempestade Carmesim. Equipamento de controle elemental, com cristal e metais refinados.",
    "icon_path": "assets/ui/items-hd/cajado-da-tempestade-carmesim.png?v=class-batch3"
  }
]);
  // Premium class armaments, batch 4; append-only identity.
  itemDefs.push(...[
  {
    "name": "Cetro da Calamidade dos Quatro Mares",
    "slot": "weapon",
    "type": "strategist",
    "attack": 12,
    "defense": 3,
    "hp": 8,
    "symbol": "✦",
    "rarity": "supreme",
    "fixedRarity": true,
    "attributes": {
      "intelligence": 4,
      "spirit": 3
    },
    "extraPool": [
      "intelligence",
      "spirit",
      "crit",
      "energy",
      "hp",
      "vitality"
    ],
    "weaponVisual": "calamity-shot",
    "description": "Cetro da Calamidade dos Quatro Mares. Equipamento de controle elemental, com cristal e metais refinados.",
    "icon_path": "assets/ui/items-hd/cetro-da-calamidade-dos-quatro-mares.png?v=class-batch4"
  },
  {
    "name": "Bastão Medicinal de Drum",
    "slot": "weapon",
    "type": "healer",
    "attack": 8,
    "defense": 2,
    "hp": 8,
    "symbol": "✦",
    "rarity": "epic",
    "fixedRarity": true,
    "attributes": {
      "spirit": 3,
      "intelligence": 2,
      "vitality": 1
    },
    "extraPool": [
      "spirit",
      "intelligence",
      "energy",
      "hp",
      "vitality",
      "crit"
    ],
    "weaponVisual": "drum-shot",
    "description": "Bastão Medicinal de Drum. Equipamento de restauração, com foco de energia e ornamentos navais.",
    "icon_path": "assets/ui/items-hd/bastao-medicinal-de-drum.png?v=class-batch4"
  },
  {
    "name": "Báculo das Flores de Sakura",
    "slot": "weapon",
    "type": "healer",
    "attack": 9,
    "defense": 3,
    "hp": 10,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "spirit": 4,
      "intelligence": 2,
      "vitality": 1
    },
    "extraPool": [
      "spirit",
      "intelligence",
      "energy",
      "hp",
      "vitality",
      "crit"
    ],
    "weaponVisual": "sakura-shot",
    "description": "Báculo das Flores de Sakura. Equipamento de restauração, com foco de energia e ornamentos navais.",
    "icon_path": "assets/ui/items-hd/baculo-das-flores-de-sakura.png?v=class-batch4"
  },
  {
    "name": "Cajado das Marés Restauradoras",
    "slot": "weapon",
    "type": "healer",
    "attack": 10,
    "defense": 3,
    "hp": 12,
    "symbol": "✦",
    "rarity": "legendary",
    "fixedRarity": true,
    "attributes": {
      "spirit": 4,
      "intelligence": 3,
      "vitality": 1
    },
    "extraPool": [
      "spirit",
      "intelligence",
      "energy",
      "hp",
      "vitality",
      "crit"
    ],
    "weaponVisual": "tides-shot",
    "description": "Cajado das Marés Restauradoras. Equipamento de restauração, com foco de energia e ornamentos navais.",
    "icon_path": "assets/ui/items-hd/cajado-das-mares-restauradoras.png?v=class-batch4"
  },
  {
    "name": "Báculo do Milagre dos Mil Mares",
    "slot": "weapon",
    "type": "healer",
    "attack": 11,
    "defense": 4,
    "hp": 14,
    "symbol": "✦",
    "rarity": "supreme",
    "fixedRarity": true,
    "attributes": {
      "spirit": 4,
      "intelligence": 3,
      "vitality": 2
    },
    "extraPool": [
      "spirit",
      "intelligence",
      "energy",
      "hp",
      "vitality",
      "crit"
    ],
    "weaponVisual": "miracle-shot",
    "description": "Báculo do Milagre dos Mil Mares. Equipamento de restauração, com foco de energia e ornamentos navais.",
    "icon_path": "assets/ui/items-hd/baculo-do-milagre-dos-mil-mares.png?v=class-batch4"
  }
]);
  // Equipment 56: append-only IDs 129–184; native slot stats and rarity rules.
  itemDefs.push(...[
  {
    "name": "Chapéu do Corsário",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Tricórnio azul de debrum dourado, âncora frontal, pluma branca e faixa vermelha.",
    "icon_path": "assets/ui/items-hd/equipment-129.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Casaco das Marés",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Casaco curto azul-marinho, gola e punhos creme, camisa clara e fivela central.",
    "icon_path": "assets/ui/items-hd/equipment-130.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Luvas do Navegante",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Couro castanho, punhos largos e fivelas de latão.",
    "icon_path": "assets/ui/items-hd/equipment-131.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Cinto do Corsário das Marés",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Correia marrom com âncora em fivela redonda, bolsa e argola lateral.",
    "icon_path": "assets/ui/items-hd/equipment-132.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Calças do Convés",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Calças escuras com bordado dourado e faixa vermelha caída de lado.",
    "icon_path": "assets/ui/items-hd/equipment-133.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Botas do Corsário",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Botas de couro marrom com tiras douradas e losangos azuis no cano.",
    "icon_path": "assets/ui/items-hd/equipment-134.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Capa do Corsário das Marés",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Capa azul, gola de pele clara, âncora e bordas douradas.",
    "icon_path": "assets/ui/items-hd/equipment-135.png",
    "equipmentSet": "Traje do Corsário das Marés"
  },
  {
    "name": "Capuz das Dunas",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Turbante claro em camadas, com faixa vermelha e joia azul frontal.",
    "icon_path": "assets/ui/items-hd/equipment-136.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Túnica do Peregrino",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Túnica creme bordada, lenço vermelho volumoso e pequenos ornamentos coloridos.",
    "icon_path": "assets/ui/items-hd/equipment-137.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Luvas de Areia",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Luvas marrons com placas de ouro e gemas azuis nas costas das mãos.",
    "icon_path": "assets/ui/items-hd/equipment-138.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Cinto do Peregrino de Alabasta",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Fivela dourada com pedra azul, tecido claro e pendentes coloridos.",
    "icon_path": "assets/ui/items-hd/equipment-139.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Calças do Deserto",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Calças claras e amplas, faixa vermelha lateral e ornamentos dourados.",
    "icon_path": "assets/ui/items-hd/equipment-140.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Botas do Oásis",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Calçado aberto nos dedos, tiras castanhas e cano com joia azul.",
    "icon_path": "assets/ui/items-hd/equipment-141.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Capa do Peregrino de Alabasta",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Tecido claro com bordado dourado e pano vermelho cruzado sobre os ombros.",
    "icon_path": "assets/ui/items-hd/equipment-142.png",
    "equipmentSet": "Vestes do Peregrino de Alabasta"
  },
  {
    "name": "Chapéu do Navegador Arcano",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Chapéu azul de aba larga, lentes douradas e pluma branca. Excluir os pequenos traços soltos acima da copa.",
    "icon_path": "assets/ui/items-hd/equipment-143.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Manto das Correntes Celestes",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Manto azul de gola alta e mangas abertas, detalhes dourados e instrumento de navegação no peito. Peça de torso.",
    "icon_path": "assets/ui/items-hd/equipment-144.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Luvas do Cartógrafo Elemental",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Luvas azuis longas, punhos dourados e marcas pequenas em ouro.",
    "icon_path": "assets/ui/items-hd/equipment-145.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Cinto do Navegador Arcano",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Correia marrom com instrumento circular dourado, frascos e pingente vermelho.",
    "icon_path": "assets/ui/items-hd/equipment-146.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Calças do Observador dos Ventos",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Calças escuras com bordados e instrumento circular dourado preso à lateral.",
    "icon_path": "assets/ui/items-hd/equipment-147.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Botas de Maré Serena",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Botas escuras com faixas azuis, ouro e pedra azul no cano.",
    "icon_path": "assets/ui/items-hd/equipment-148.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Capa do Navegador Arcano",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "rare",
    "fixedRarity": true,
    "description": "Capa azul com estrela náutica dourada, pequenas estrelas e debrum em ouro.",
    "icon_path": "assets/ui/items-hd/equipment-149.png",
    "equipmentSet": "Conjunto do Navegador Arcano"
  },
  {
    "name": "Chapéu Carmesim",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Tricórnio escarlate com âncora dourada, pluma branca e amarra vermelha.",
    "icon_path": "assets/ui/items-hd/equipment-150.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Sobretudo do Almirante",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Sobretudo vermelho de gola alta, dragonas com franjas e fecho dourado sobre centro escuro.",
    "icon_path": "assets/ui/items-hd/equipment-151.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Manoplas da Autoridade",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Luvas escuras com placas douradas e gema rubra em losango.",
    "icon_path": "assets/ui/items-hd/equipment-152.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Cinto do Almirante Carmesim",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Correia vermelha com fivela de caveira dourada, bolsa e tasséis.",
    "icon_path": "assets/ui/items-hd/equipment-153.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Calças de Comando",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Calças escuras com painéis escarlates, cordão e barras douradas.",
    "icon_path": "assets/ui/items-hd/equipment-154.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Botas Imperiais",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Botas escuras com bordas e tiras vermelhas e douradas, pedra rubra no cano.",
    "icon_path": "assets/ui/items-hd/equipment-155.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Capa do Almirante Carmesim",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Capa escarlate de gola clara, debrum dourado e broche vermelho.",
    "icon_path": "assets/ui/items-hd/equipment-156.png",
    "equipmentSet": "Regalia do Almirante Carmesim"
  },
  {
    "name": "Diadema da Tormenta",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Diadema dourado de pedra azul com plumas prateadas abertas para os lados.",
    "icon_path": "assets/ui/items-hd/equipment-157.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Manto das Tempestades",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Peça de torso azul, gola alta, ombros claros e desenhos de relâmpago.",
    "icon_path": "assets/ui/items-hd/equipment-158.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Braçadeiras do Trovão",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Luvas azuis com linhas de raio claras e placas em losango.",
    "icon_path": "assets/ui/items-hd/equipment-159.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Cinto do Arauto das Tempestades",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Fivela azul com raio dourado, pedras e gotas pendentes.",
    "icon_path": "assets/ui/items-hd/equipment-160.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Calças da Monção",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Calças escuras com raios azul-claros ao longo das pernas e cordões dourados.",
    "icon_path": "assets/ui/items-hd/equipment-161.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Botas do Vendaval",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Botas azul-escuras com gemas e marcas de relâmpago em azul-gelo.",
    "icon_path": "assets/ui/items-hd/equipment-162.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Capa do Arauto das Tempestades",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Capa azul e branca com gola clara, motivo de raio e fecho dourado.",
    "icon_path": "assets/ui/items-hd/equipment-163.png",
    "equipmentSet": "Vestimenta do Arauto das Tempestades"
  },
  {
    "name": "Tiara da Maré Sagrada",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Tiara de concha dourada aberta com gotas azuis nas laterais.",
    "icon_path": "assets/ui/items-hd/equipment-164.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Vestes do Santuário Oceânico",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Torso claro de gola e ombros trabalhados, broche de concha e painéis azuis e dourados.",
    "icon_path": "assets/ui/items-hd/equipment-165.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Manoplas da Cura Profunda",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Luvas brancas com punhos dourados e conchas no dorso.",
    "icon_path": "assets/ui/items-hd/equipment-166.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Cinto da Maré Sagrada",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Concha dourada central, faixa azul e gotas azuis pendentes.",
    "icon_path": "assets/ui/items-hd/equipment-167.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Saia/Pernas do Rito Marinho",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Peça branca drapeada com painéis azuis, bordados dourados e amarração ornamental.",
    "icon_path": "assets/ui/items-hd/equipment-168.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Sandálias da Ressurgência",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Sandálias claras de cano curto, tiras azuis e douradas, dedos à vista.",
    "icon_path": "assets/ui/items-hd/equipment-169.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Capa da Maré Sagrada",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "epic",
    "fixedRarity": true,
    "description": "Capa branca e azul, gola clara, concha central e bordados dourados.",
    "icon_path": "assets/ui/items-hd/equipment-170.png",
    "equipmentSet": "Paramentos da Maré Sagrada"
  },
  {
    "name": "Tricórnio do Soberano",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Tricórnio escuro com pequena coroa dourada e pluma púrpura.",
    "icon_path": "assets/ui/items-hd/equipment-171.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Casaco da Grand Line",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Casaco negro e púrpura com ombros claros, detalhes dourados e joia no peito.",
    "icon_path": "assets/ui/items-hd/equipment-172.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Manoplas Reais",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Luvas escuras com placas douradas ornamentadas e gemas rubras.",
    "icon_path": "assets/ui/items-hd/equipment-173.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Cinto do Soberano da Grand Line",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Cinto púrpura de grande fivela de caveira dourada, bolsa e pendentes vermelhos.",
    "icon_path": "assets/ui/items-hd/equipment-174.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Calças do Conquistador",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Calças escuras com sobressaia púrpura, cordões e bordados dourados.",
    "icon_path": "assets/ui/items-hd/equipment-175.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Botas da Supremacia",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Botas negras com gemas magenta e tiras douradas.",
    "icon_path": "assets/ui/items-hd/equipment-176.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Capa do Soberano da Grand Line",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "legendary",
    "fixedRarity": true,
    "description": "Capa púrpura com gola clara, caveira central e arabescos dourados.",
    "icon_path": "assets/ui/items-hd/equipment-177.png",
    "equipmentSet": "Regalia do Soberano da Grand Line"
  },
  {
    "name": "Coroa do Horizonte Final",
    "slot": "head",
    "attack": 1,
    "defense": 2,
    "hp": 8,
    "symbol": "♜",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Coroa dourada de joia vermelha, sobre plumas pretas e rubras.",
    "icon_path": "assets/ui/items-hd/equipment-178.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Armadura do Imperador",
    "slot": "coat",
    "attack": 0,
    "defense": 4,
    "hp": 17,
    "symbol": "◈",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Armadura escura, dragonas douradas, painéis vermelhos e chamas nas bordas.",
    "icon_path": "assets/ui/items-hd/equipment-179.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Manoplas da Vontade Absoluta",
    "slot": "gloves",
    "attack": 2,
    "defense": 2,
    "hp": 5,
    "symbol": "✥",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Manoplas negras de placas douradas com formas de chama ao redor dos punhos.",
    "icon_path": "assets/ui/items-hd/equipment-180.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Cinto do Horizonte Final",
    "slot": "belt",
    "attack": 0,
    "defense": 3,
    "hp": 8,
    "symbol": "▣",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Cinto dourado e vermelho com caveira ornamentada de espinhos e pano rubro.",
    "icon_path": "assets/ui/items-hd/equipment-181.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Calças do Trono dos Mares",
    "slot": "legs",
    "attack": 0,
    "defense": 4,
    "hp": 13,
    "symbol": "▥",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Calças escuras com painéis rubros de chamas, franjas e cordões dourados.",
    "icon_path": "assets/ui/items-hd/equipment-182.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Botas do Horizonte Eterno",
    "slot": "boots",
    "attack": 0,
    "defense": 3,
    "hp": 7,
    "symbol": "⌁",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Botas escuras de bordas vermelho-douradas e gemas em losango.",
    "icon_path": "assets/ui/items-hd/equipment-183.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  },
  {
    "name": "Capa do Horizonte Final",
    "slot": "cloak",
    "attack": 1,
    "defense": 3,
    "hp": 14,
    "symbol": "◭",
    "rarity": "supreme",
    "fixedRarity": true,
    "description": "Capa negra e vermelha com extremidades em chama e caveira dourada na gola.",
    "icon_path": "assets/ui/items-hd/equipment-184.png",
    "equipmentSet": "Vestes do Imperador do Horizonte Final"
  }
]);
  itemDefs.push(MareForge.weaponFragment); // Append only: index 185.
  const contracts=root.MareContracts||(typeof require==='function'?require('./contract-system.js'):null);
  if(contracts)itemDefs.push(contracts.boost);
  const visuals=root.MareVisualCompleto||(typeof require==='function'?require('./visual-completo.js'):null);
  if(visuals){itemDefs.push(visuals.definition);slotNames[visuals.slot]='VISUAL COMPLETO';}
  itemDefs.push(BossDungeons.epicBox);
  return {items:itemDefs,slotNames,inventorySlotsLeft,inventorySlotsRight,capacity:BAG_CAPACITY,healerWeaponIndex};
 }
 const api={create,potions,potionRules,potionRecovery};root.MareItemCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
