'use strict';
/* Authored 32x32 island. Streets and forecourts are defined before scenery. */
((root)=>{
  const TILE=64,COLS=32,ROWS=32,WATER=0,SAND=1,GRASS=2,STREET=3,WOOD=4;
  const terrain=new Uint8Array(COLS*ROWS),colliders=[],props=[],frontages=[];
  const center=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
  const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const polygon=[[6,3],[23,3],[28,6],[29,19],[26,28],[9,29],[4,25],[3,14],[4,7]];
  function inside(x,y){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(inside(x+.5,y+.5))terrain[y*COLS+x]=[-1,0,1].some(d=>!inside(x+.5+d,y+.5)||!inside(x+.5,y+.5+d))?SAND:GRASS;
  const routes=[
    {id:'avenida-do-porto',points:[[5,25],[11,25],[11,22],[16,22],[16,16],[24,16],[24,8]]},
    {id:'circuito-comercial',points:[[11,22],[8,22],[8,14],[12,14],[12,8],[24,8]]},
    {id:'rua-dos-armazens',points:[[16,22],[24,22],[24,16]]},
    {id:'travessa-dos-toldos',points:[[8,16],[16,16]]}
  ];
  function road(points,width=1){for(let n=1;n<points.length;n++){const [ax,ay]=points[n-1],[bx,by]=points[n],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));for(let k=0;k<=steps;k++){const t=steps?k/steps:0,x=Math.round(ax+(bx-ax)*t),y=Math.round(ay+(by-ay)*t);for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++)if(at(x+dx,y+dy)!==WATER)terrain[(y+dy)*COLS+x+dx]=STREET;}}}
  routes.forEach(r=>road(r.points));
  const districts=[
    {id:'cais',name:'Cais das Laranjeiras',tx:7,ty:25,min:21,max:22},
    {id:'rua',name:'Rua dos Navegantes',tx:8,ty:16,min:23,max:24},
    {id:'praca',name:'Praça dos Toldos',tx:16,ty:16,min:25,max:26},
    {id:'armazens',name:'Armazéns da Enseada',tx:24,ty:21,min:27,max:28},
    {id:'picadeiro',name:'Pátio do Capitão',tx:24,ty:8,min:29,max:30}
  ].map(d=>({...d,...center(d.tx,d.ty)}));
  for(const d of districts)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(at(d.tx+dx,d.ty+dy)!==WATER)terrain[(d.ty+dy)*COLS+d.tx+dx]=STREET;
  const docks=[{x:64,y:25*TILE,w:6*TILE,h:TILE},{x:2*TILE,y:23*TILE,w:TILE,h:4*TILE}];
  for(const d of docks)for(let y=d.y/TILE;y<(d.y+d.h)/TILE;y++)for(let x=d.x/TILE;x<(d.x+d.w)/TILE;x++)terrain[y*COLS+x]=WOOD;
  function building(id,cell,tx,ty,street){
    const p={id,kind:'building',cell,...center(tx,ty),width:192,height:192};
    props.push(p);colliders.push({id,x:p.x-68,y:p.y-85,w:136,h:76});
    const entrance={x:p.x,y:p.y+12},target=center(...street);frontages.push({id,entrance,street:target});road([[tx,ty+1],street],0);
  }
  // Every facade opens south onto a forecourt connected to a named street.
  building('casa-do-cais',0,9,22,[11,24]);
  building('taverna-das-laranjas',1,6,12,[8,14]);
  building('casa-dos-marinheiros',0,15,11,[16,16]);
  building('tenda-da-praca',2,18,12,[16,16]);
  building('armazem-oeste',3,20,19,[23,21]);
  building('armazem-leste',3,27,18,[24,20]);
  building('casa-das-cartas',0,16,6,[16,8]);
  building('tenda-do-capitao',2,22,6,[24,8]);
  for(const [cell,x,y] of [[2,4,24],[2,26,24],[3,5,8],[3,20,26],[3,28,12]]){
    const p={id:'harbor-'+props.length,kind:'harbor',cell,...center(x,y),width:160,height:160};props.push(p);
    colliders.push({id:p.id,x:p.x-30,y:p.y-30,w:60,h:28});
  }
  const spawn=center(5,25),returnPoint={id:'return',...center(3,25),radius:38};
  function ground(x,y,r=0){return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE))!==WATER);}
  const paths=districts.map(({id,name,x,y})=>({id,name,x,y}));
  const map={id:'orange',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:d.x-160,y:d.y-160,w:320,h:320})),safeZones:[{...spawn,radius:170},{x:returnPoint.x,y:returnPoint.y,radius:150}],interactions:[returnPoint]};
  const skins={bandit:{id:'awning-raider',name:'Saqueador dos Toldos',height:72},crab:{id:'dock-bruiser',name:'Brutamontes do Cais',height:72},spirit:{id:'square-gunner',name:'Artilheiro da Praça',height:72},boss:{id:'captain-spark',name:'Capitão Fagulha',height:72}};
  root.MareOrange={TILE,COLS,ROWS,WATER,SAND,GRASS,STREET,WOOD,terrain,at,center,ground,map,routes,districts,paths,props,frontages,docks,spawn,returnPoint,skins};
  if(typeof module!=='undefined')module.exports=root.MareOrange;
})(globalThis);
