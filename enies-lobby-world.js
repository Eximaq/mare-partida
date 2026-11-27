'use strict';
((root)=>{
 const data=root.MareEniesLobbyData||(typeof module!=='undefined'?require('./enies-lobby-map-data.js'):null);
 const maps=root.MareMapExports||(typeof module!=='undefined'?require('./world-map-exports.js'):null);
 if(!data||!maps)return;
 // All five encounters share the approved artwork and geometry, but keep separate saves.
 root.MareMapExportData['enies-lobby']=data;
 const goal=id=>data.goals.find(p=>p.id===id);
 const districts=['portao_interno','praca_central','torre_justica'].map(id=>({...goal(id)}));
 const positions=['portao_interno','praca_central','bairro_oeste','bairro_leste','tribunal','torre_justica'].map(id=>{
  const p=goal(id),nearest=districts.reduce((best,d)=>!best||Math.hypot(d.x-p.x,d.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?d:best,null);
  return {sector:nearest.id,x:p.x,y:p.y};
 });
 const specs=[
  ['enies-lobby-01','Enies Lobby 1',95,100,'fukurou','Fukurou',97],
  ['enies-lobby-02','Enies Lobby 2',101,104,'kalifa','Kalifa',101],
  ['enies-lobby-03','Enies Lobby 3',104,106,'jabra','Jabra',104],
  ['enies-lobby-04','Enies Lobby 4',107,109,'blueno','Blueno',107],
  ['enies-lobby-05','Enies Lobby 5',110,114,'kaku','Kaku',110]
 ].map(([id,name,min,max,type,monster,level])=>({id,name,min,max,type,monster,level,spawn:{...data.spawn},districts:districts.map(d=>({...d})),slots:positions.map((p,n)=>({id:id+'-'+n,type,...p}))}));
 const worlds=Object.fromEntries(specs.map(spec=>{
  const map=maps.build(spec.id),returnPoint={id:'return',...data.returnPoint,radius:40};
  Object.assign(map,{returnPoint,interactions:[returnPoint],spawnZones:spec.districts.map(p=>({id:p.id,x:p.x-120,y:p.y-120,w:240,h:240}))});
  return [spec.id,{spec,map,districts:spec.districts,slots:spec.slots}];
 }));
 const has=id=>typeof id==='string'&&Object.hasOwn(worlds,id);
 const prepare=()=>typeof Image==='function'?maps.prepare('enies-lobby'):null;
 function environment(ctx,id){const p=worlds[id]?.map.returnPoint;if(!p)return;ctx.save();ctx.strokeStyle='#f8e6a8';ctx.beginPath();ctx.ellipse(p.x,p.y,28,12,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#604720';ctx.textAlign='center';ctx.font='bold 11px Georgia';ctx.fillText('Voltar ao porto',p.x,p.y+30);ctx.restore();}
 const api={data,specs,worlds,has,prepare,environment};root.MareEniesLobby=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
