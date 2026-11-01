'use strict';
/* Canonical catalog assembly shared by the original game and the authoritative server.
   Numeric definition indexes are persisted identities: append only, never reorder. */
((root)=>{
 function create({forge:MareForge,prison:MarePrison,haki:MareHaki,akuma:MareAkuma,hakiProgression:MareHakiProgression}){
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
  const slotNames = {head:'CABEÇA',necklace:'COLAR',coat:'TORSO',legs:'PERNEIRAS',boots:'PÉS',weapon:'ARMA PRINCIPAL',cloak:'CAPA',gloves:'MÃOS',ring:'ANEL',belt:'CINTO',charm:'ACESSÓRIO',akuma_no_mi:'AKUMA NO MI'};
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
  return {items:itemDefs,slotNames,inventorySlotsLeft,inventorySlotsRight,capacity:BAG_CAPACITY,healerWeaponIndex};
 }
 const api={create};root.MareItemCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
