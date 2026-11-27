'use strict';
((root)=>{
 const maps=root.MareMapExports||(typeof module!=='undefined'?require('./world-map-exports.js'):null);
 const imported=root.MareLateArchipelagoData||(typeof module!=='undefined'?require('./late-archipelago-map-data.js'):null);
 if(!maps||!imported)return;
 Object.assign(root.MareMapExportData,imported);
 const data={...imported,marineford:root.MareMapExportData.marineford};
 const goal=(region,id)=>({...data[region].goals.find(p=>p.id===id)});
 // Patrols reuse connected destinations in the approved map exports. Marineford
 // uses its existing courtyard; its weekly arena geometry remains untouched.
 const layouts={
  'thriller-bark':{
   districts:['courtyard','garden','dead_forest'].map(id=>goal('thriller-bark',id)),
   points:['courtyard','hogback','mast','garden','graveyard','dead_forest'].map(id=>goal('thriller-bark',id))
  },
  sabaody:{
   districts:['bar','park','south_plaza'].map(id=>goal('sabaody',id)),
   points:['bar','park','shop','workshop','grove41','south_plaza'].map(id=>goal('sabaody',id))
  },
  marineford:{
   districts:[{id:'west-courtyard',name:'Praça oeste',x:3048,y:3048},{id:'north-courtyard',name:'Praça central',x:3496,y:2408},{id:'east-courtyard',name:'Praça leste',x:3944,y:3048}],
   points:[[3048,2408],[3496,2408],[3944,2408],[3048,3048],[3432,3208],[3944,3048]].map(([x,y])=>({x,y}))
  }
 };
 const specs=[
  ['thriller-bark-01','thriller-bark','Thriller Bark 1',114,117,'absalom','Absalom'],
  ['thriller-bark-02','thriller-bark','Thriller Bark 2',118,121,'perona','Perona'],
  ['thriller-bark-03','thriller-bark','Thriller Bark 3',122,126,'ryuma','Ryuma'],
  ['thriller-bark-04','thriller-bark','Thriller Bark 4',127,130,'oars','Oars'],
  ['sabaody-01','sabaody','Sabaody 1',131,135,'pacifista','Pacifista'],
  ['sabaody-02','sabaody','Sabaody 2',136,140,'urouge','Urouge'],
  ['sabaody-03','sabaody','Sabaody 3',141,145,'hawkins','Basil Hawkins'],
  ['sabaody-04','sabaody','Sabaody 4',146,150,'x-drake','X Drake'],
  ['marineford-01','marineford','Marineford 1',151,155,'squard','Squard'],
  ['marineford-02','marineford','Marineford 2',156,160,'onigumo','Onigumo'],
  ['marineford-03','marineford','Marineford 3',161,165,'little-oars-jr','Little Oars Jr.'],
  ['marineford-04','marineford','Marineford 4',166,170,'izo','Izo'],
  ['marineford-05','marineford','Marineford 5',171,175,'vista','Vista'],
  ['marineford-06','marineford','Marineford 6',176,180,'jozu','Jozu']
 ].map(([id,region,name,min,max,type,monster])=>{
  const layout=layouts[region],districts=layout.districts.map(d=>({...d}));
  const slots=layout.points.map((p,n)=>{
   const nearest=districts.reduce((best,d)=>!best||Math.hypot(d.x-p.x,d.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?d:best,null);
   return {id:id+'-'+n,type,sector:nearest.id,x:p.x,y:p.y};
  });
  return {id,region,name,min,max,type,monster,level:min,spawn:{...data[region].spawn},districts,slots};
 });
 const worlds=Object.fromEntries(specs.map(spec=>{
  const source=data[spec.region],map=maps.build(spec.id),returnPoint={id:'return',...(source.returnPoint||source.spawn),radius:40};
  Object.assign(map,{returnPoint,interactions:[returnPoint],safeZones:source.safeZones.length?source.safeZones.map(p=>({...p})):[{...spec.spawn,radius:160}],spawnZones:spec.districts.map(p=>({id:p.id,x:p.x-120,y:p.y-120,w:240,h:240}))});
  return [spec.id,{spec,map,districts:spec.districts,slots:spec.slots}];
 }));
 const has=id=>typeof id==='string'&&Object.hasOwn(worlds,id);
 const prepare=id=>has(id)&&typeof Image==='function'?maps.prepare(id):null;
 function install(registry){for(const [id,world]of Object.entries(worlds))registry[id]=world.map;}
 function environment(ctx,id){
  const p=worlds[id]?.map.returnPoint;if(!p)return;
  ctx.save();ctx.strokeStyle='#f8e6a8';ctx.beginPath();ctx.ellipse(p.x,p.y,28,12,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#f8e6a8';ctx.shadowColor='#17110b';ctx.shadowBlur=3;ctx.textAlign='center';ctx.font='bold 11px Georgia';ctx.fillText('Voltar ao porto',p.x,p.y+30);ctx.restore();
 }
 const api={data,specs,worlds,has,prepare,environment,install};root.MareLateArchipelago=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
