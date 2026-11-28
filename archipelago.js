'use strict';
// Catalog IDs are UI identifiers. Existing save area IDs remain beach / swamp.
((root)=>{
  const alubarna=root.MareAlubarna||(typeof module!=='undefined'?require('./alubarna-world.js'):null);
  const sky=root.MareSkypiea||(typeof module!=='undefined'?require('./skypiea-world.js'):null);
  const enies=root.MareEniesLobby||(typeof module!=='undefined'?require('./enies-lobby-world.js'):null);
  const late=root.MareLateArchipelago||(typeof module!=='undefined'?require('./late-archipelago-world.js'):null);
  const regions=Object.freeze([
    Object.freeze({id:'east-blue',name:'East Blue',locked:false}),
    Object.freeze({id:'alabasta',name:'Alabasta',locked:false}),
    Object.freeze({id:'skypiea',name:'Skypiea',locked:false}),
    Object.freeze({id:'enies-lobby',name:'Enies Lobby',locked:false}),
    Object.freeze({id:'thriller-bark',name:'Thriller Bark',locked:false}),
    Object.freeze({id:'sabaody',name:'Sabaody',locked:false}),
    Object.freeze({id:'marineford',name:'Marineford',locked:false})
  ]);
  const loot=Object.freeze(['Berry e experiência','Equipamentos da classe','Ferro Salgado e poções']);
  const islands=Object.freeze([
    {id:'dawn',name:'Ilha Dawn',recommended:[1,5],area:'beach',minLevel:1,description:'Explore a Vila Dawn inspirada em Foosha: moinhos, o bar da Makino, trilhas do bosque e um cais de madeira. César patrulha os sete setores da vila.',drops:loot,monster:{name:'César',role:'Nv. 5',src:'assets/monsters/cesar-idle.png',sheet:true}},
    {id:'conchas',name:'Cidade das Conchas',recommended:[5,10],area:'swamp',minLevel:5,description:'Desembarque em Shells Town e atravesse o portão da Marinha até o pátio onde Zoro está preso. Helmeppo patrulha a base no nível 8.',drops:loot,monster:{name:'Helmeppo',role:'Patrulha · Nv. 8',src:'assets/sprites-combat-v2/helmeppo/idle-south.png',sheet:false}},
    {id:'orange-town',name:'Orange Town',recommended:[11,15],area:'orange',minLevel:11,description:'Percorra as ruas de Orange Town, a loja de Chouchou e a praça sob as bandeiras de Buggy. Mr. 3 e Cabaji patrulham os cinco setores no nível 13.',drops:loot,monster:{name:'Mr. 3 e Cabaji',role:'Patrulha · Nv. 13',src:'assets/sprites-combat-v2/mr3/idle-south.png',sheet:false}},
    {id:'animais-raros',name:'Ilha dos Animais Raros',recommended:[16,20],area:'rare',minLevel:16,description:'Uma floresta densa com trilhas entre clareiras. Os Cocox caçam em bandos sob as copas antigas.',drops:loot,monster:{name:'Cocox',role:'Predador · Nv. 18',src:'assets/sprites-combat-v2/cocox/idle-south.png',sheet:false}},
    {id:'syrup',name:'Vila Syrup',recommended:[21,25],area:'syrup',minLevel:21,description:'A estrada entre as falésias leva à vila, ao bosque e ao jardim de Kaya. Sham e Buchi patrulham os caminhos.',drops:loot,monster:{name:'Sham e Buchi',role:'Patrulha · Nv. 23',src:'assets/sprites-combat-v2/sham/idle-south.png',sheet:false}},
    {id:'baratie',name:'Baratie',recommended:[26,30],area:'baratie',minLevel:26,description:'Entre pelo salão sul e avance pelo restaurante até a cozinha. Pearl e Gin defendem o convés.',drops:loot,monster:{name:'Pearl e Gin',role:'Combatentes · Nv. 28',src:'assets/sprites-combat-v2/pearl/idle-south.png',sheet:false}},
    {id:'arlong',name:'Parque Arlong',recommended:[31,35],area:'arlong',minLevel:31,description:'Atravesse o cais de madeira e enfrente Kuroobi e Chew nas alas do Parque Arlong.',drops:loot,monster:{name:'Kuroobi e Chew',role:'Patrulha · Nv. 33',src:'assets/sprites-combat-v2/kuroobi/idle-south.png',sheet:false}},
    {id:'loguetown',name:'Loguetown',recommended:[36,40],area:'loguetown',minLevel:36,description:'Chegue ao centro das ruas urbanas de Loguetown e enfrente os Marinheiros de nível 40.',drops:loot,monster:{name:'Marinheiro',role:'Patrulha · Nv. 40',src:'assets/sprites-combat-v2/marinheiro/idle-south.png',sheet:false}}
    ,{id:'alabasta-desert',region:'alabasta',name:'Deserto de Alabasta',recommended:[40,50],area:'alabasta',minLevel:40,description:'Atravesse as dunas de Alabasta, o oásis e as ruínas de arenito. Dez Bananawani de nível 45 patrulham os cinco setores do deserto.',drops:loot,monster:{name:'Bananawani',role:'Predador · Nv. 45',src:'assets/sprites-combat-v2/bananawani/idle-south.png',sheet:false}}
    ,...alubarna.specs.map(s=>({id:s.id,region:'alabasta',name:s.name,recommended:[s.min,s.max],area:s.id,minLevel:s.min,description:'Explore as ruas, praças e avenidas de Alubarna. '+s.monster+' patrulha a cidade no nível '+s.level+'.',drops:loot,monster:{name:s.monster,role:'Patrulha · Nv. '+s.level,src:'assets/sprites-combat-v2/'+s.type+'/idle-south.png',sheet:false}}))
    ,...(sky?.specs??[]).map(s=>({id:s.id,region:'skypiea',name:s.name,recommended:[s.min,s.max],area:s.id,minLevel:s.min,description:s.monster+' patrulha os caminhos e as ruínas de '+s.name+' no nível '+s.level+'.',thumbnail:sky.data.groundUrl,drops:loot,monster:{name:s.monster,role:'Patrulha · Nv. '+s.level,src:'assets/sprites-combat-v2/'+s.type+'/idle-south.png',sheet:false}}))
    ,...(enies?.specs??[]).map(s=>({id:s.id,region:'enies-lobby',name:s.name,recommended:[s.min,s.max],area:s.id,minLevel:s.min,description:s.monster+' patrulha os acessos e as praças de Enies Lobby no nível '+s.level+'.',thumbnail:'assets/exported-maps/enies-lobby/map.webp',drops:loot,monster:{name:s.monster,role:'Patrulha · Nv. '+s.level,src:'assets/sprites-combat-v2/'+s.type+'/idle-south.png',sheet:false}}))
    ,...(late?.specs??[]).map(s=>({id:s.id,region:s.region,name:s.name,recommended:[s.min,s.max],area:s.id,minLevel:s.min,description:'Explore os caminhos de '+s.name+' e enfrente '+s.monster+' no nível '+s.level+'.',thumbnail:'assets/exported-maps/'+s.region+'/'+(late.data[s.region].imageFile||'map.png'),drops:loot,monster:{name:s.monster,role:'Patrulha · Nv. '+s.level,src:'assets/sprites-combat-v2/'+s.type+'/idle-south.png',sheet:false}}))
  ].map((island,index)=>Object.freeze({...island,region:island.region||'east-blue',order:index+1,recommended:Object.freeze(island.recommended),monster:island.monster?Object.freeze(island.monster):null,drops:island.drops||null})));
  const get=id=>islands.find(i=>i.id===id)||null;
  const byArea=area=>area?islands.find(i=>i.area===area)||null:null;
  const list=region=>islands.filter(i=>i.region===region);
  const canTravel=(id,level)=>{const i=get(id),r=regions.find(r=>r.id===i?.region);return !!(i?.area&&r&&!r.locked&&Number.isFinite(level)&&level>=i.minLevel);};
  const api={regions,islands,get,byArea,list,canTravel};root.MareArchipelago=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
