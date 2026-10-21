'use strict';
// Catalog IDs are UI identifiers. Existing save area IDs remain beach / swamp.
((root)=>{
  const regions=Object.freeze([
    Object.freeze({id:'east-blue',name:'East Blue',locked:false}),
    Object.freeze({id:'alabasta',name:'Alabasta',locked:true})
  ]);
  const loot=Object.freeze(['Dobrões e experiência','Equipamentos da classe','Ferro Salgado e poções']);
  const islands=Object.freeze([
    {id:'dawn',name:'Ilha Dawn',recommended:[1,5],area:'beach',minLevel:1,description:'A Ilha Dawn criada manualmente no PixelLab: cais de madeira, bosque, praias e uma vila costeira. Explore os caminhos da ilha e enfrente o capitão.',drops:loot,monster:{name:'Capitão da Caldeira',role:'Chefe',src:'assets/ruinas-brasas/caldera-captain.png',sheet:true}},
    {id:'conchas',name:'Cidade das Conchas',recommended:[6,10],area:'swamp',minLevel:6,description:'Um porto de vigília com mercados azuis, docas e um bairro antigo. Siga pelas ruas até o arco do bastião e enfrente o Guardião das Conchas.',drops:loot,monster:{name:'Guardião das Conchas',role:'Chefe',src:'assets/monsters/boss.png',sheet:false}},
    {id:'orange-town',name:'Orange Town',recommended:[11,15],area:'orange',minLevel:11,description:'Um porto de telhados alaranjados ocupado por saqueadores. Atravesse o cais, a rua comercial e a praça dos toldos até o pátio do Capitão Fagulha.',drops:loot,monster:{name:'Capitão Fagulha',role:'Chefe',src:'assets/orange-town/captain-spark-portrait.png',sheet:false}},
    {id:'animais-raros',name:'Ilha dos Animais Raros',recommended:[16,20],area:'rare',minLevel:16,description:'Uma floresta densa com trilhas entre clareiras. Os Cocox caçam em bandos sob as copas antigas.',drops:loot,monster:{name:'Cocox',role:'Predador · Nv. 18',src:'assets/rare-animals/cocox/idle.png',sheet:true}},
    {id:'syrup',name:'Vila Syrup',recommended:[21,25],area:'syrup',minLevel:21,description:'A estrada do sul leva à vila entre bosques, casas e canais. Sham e Buchi patrulham as ruas.',drops:loot,monster:{name:'Sham e Buchi',role:'Patrulha · Nv. 23',src:'assets/new-islands/sham/idle.png',sheet:true}},
    {id:'baratie',name:'Baratie',recommended:[26,30],area:'baratie',minLevel:26,description:'Entre pelo salão sul e avance pelo restaurante até a cozinha. Pearl e Gin defendem o convés.',drops:loot,monster:{name:'Pearl e Gin',role:'Combatentes · Nv. 28',src:'assets/new-islands/pearl/idle.png',sheet:true}},
    {id:'arlong',name:'Parque Arlong',recommended:[31,35],area:'arlong',minLevel:31,description:'Atravesse o cais de madeira e enfrente Kuroobi e Chew nas alas do Parque Arlong.',drops:loot,monster:{name:'Kuroobi e Chew',role:'Patrulha · Nv. 33',src:'assets/new-islands/kuroobi/idle.png',sheet:true}},
    {id:'loguetown',name:'Loguetown',recommended:[36,40],area:null,description:'A última parada prevista desta rota do East Blue. Disponível em uma atualização futura.'}
  ].map((island,index)=>Object.freeze({...island,region:'east-blue',order:index+1,recommended:Object.freeze(island.recommended),monster:island.monster?Object.freeze(island.monster):null,drops:island.drops||null})));
  const get=id=>islands.find(i=>i.id===id)||null;
  const byArea=area=>area?islands.find(i=>i.area===area)||null:null;
  const list=region=>islands.filter(i=>i.region===region);
  const canTravel=(id,level)=>{const i=get(id),r=regions.find(r=>r.id===i?.region);return !!(i?.area&&r&&!r.locked&&Number.isFinite(level)&&level>=i.minLevel);};
  const api={regions,islands,get,byArea,list,canTravel};root.MareArchipelago=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
