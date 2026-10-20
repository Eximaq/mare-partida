'use strict';
// Catalog IDs are UI identifiers. Existing save area IDs remain beach / swamp.
((root)=>{
  const regions=Object.freeze([
    Object.freeze({id:'east-blue',name:'East Blue',locked:false}),
    Object.freeze({id:'alabasta',name:'Alabasta',locked:true})
  ]);
  const loot=Object.freeze(['Dobrões e experiência','Equipamentos da classe','Ferro Salgado e poções']);
  const islands=Object.freeze([
    {id:'dawn',name:'Ilha Dawn',recommended:[1,10],area:'beach',minLevel:1,description:'A Ilha Dawn criada manualmente no PixelLab: cais de madeira, bosque, praias e uma vila costeira. Explore os caminhos da ilha e enfrente o capitão.',drops:loot,monster:{name:'Capitão da Caldeira',role:'Chefe',src:'assets/ruinas-brasas/caldera-captain.png',sheet:true}},
    {id:'conchas',name:'Cidade das Conchas',recommended:[11,20],area:'swamp',minLevel:11,description:'Um porto de vigília com mercados azuis, docas e um bairro antigo. Siga pelas ruas até o arco do bastião e enfrente o Guardião das Conchas.',drops:loot,monster:{name:'Guardião das Conchas',role:'Chefe',src:'assets/monsters/boss.png',sheet:false}},
    {id:'orange-town',name:'Orange Town',recommended:[21,30],area:'orange',minLevel:21,description:'Um porto de telhados alaranjados ocupado por saqueadores. Atravesse o cais, a rua comercial e a praça dos toldos até o pátio do Capitão Fagulha.',drops:loot,monster:{name:'Capitão Fagulha',role:'Chefe',src:'assets/orange-town/captain-spark-portrait.png',sheet:false}},
    {id:'animais-raros',name:'Ilha dos Animais Raros',recommended:[31,40],area:null,description:'Uma ilha de exploração e fauna incomum. A região ainda está em preparação.'},
    {id:'syrup',name:'Vilarejo Syrup',recommended:[41,50],area:null,description:'Uma nova rota do arquipélago, reservada para uma atualização futura.'},
    {id:'baratie',name:'Baratie',recommended:[51,60],area:null,description:'Um ponto de encontro em alto-mar. Os encontros e recompensas ainda serão definidos.'},
    {id:'arlong',name:'Parque Arlong',recommended:[61,70],area:null,description:'Uma região de desafios avançados, ainda em preparação.'},
    {id:'loguetown',name:'Loguetown',recommended:[71,80],area:null,description:'A última parada prevista desta rota do East Blue. Disponível em uma atualização futura.'}
  ].map((island,index)=>Object.freeze({...island,region:'east-blue',order:index+1,recommended:Object.freeze(island.recommended),monster:island.monster?Object.freeze(island.monster):null,drops:island.drops||null})));
  const get=id=>islands.find(i=>i.id===id)||null;
  const byArea=area=>area?islands.find(i=>i.area===area)||null:null;
  const list=region=>islands.filter(i=>i.region===region);
  const canTravel=(id,level)=>{const i=get(id),r=regions.find(r=>r.id===i?.region);return !!(i?.area&&r&&!r.locked&&Number.isFinite(level)&&level>=i.minLevel);};
  const api={regions,islands,get,byArea,list,canTravel};root.MareArchipelago=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
