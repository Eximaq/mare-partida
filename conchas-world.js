'use strict';
/* Cidade das Conchas: streets, forecourts and harbor planned on a compact 32x32 grid. */
((root)=>{
  const TILE=64,COLS=32,ROWS=32,WATER=0,SAND=1,GRASS=2,STREET=3,WOOD=4;
  const terrain=new Uint8Array(COLS*ROWS),props=[],colliders=[],frontages=[];
  const center=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
  const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const outline=[[7,4],[22,4],[27,8],[28,21],[24,27],[10,29],[4,24],[4,10]];
  function inside(x,y){let yes=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const [a,b]=outline[i],[c,d]=outline[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(inside(x+.5,y+.5))terrain[y*COLS+x]=GRASS;
  function paint(x,y,w,h,material){for(let ty=y;ty<y+h;ty++)for(let tx=x;tx<x+w;tx++)if(tx>=0&&ty>=0&&tx<COLS&&ty<ROWS&&(material===WOOD||at(tx,ty)!==WATER))terrain[ty*COLS+tx]=material;}
  function road(points){for(let i=1;i<points.length;i++){let [x,y]=points[i-1];const [bx,by]=points[i];paint(x,y,1,1,STREET);while(x!==bx){x+=Math.sign(bx-x);paint(x,y,1,1,STREET);}while(y!==by){y+=Math.sign(by-y);paint(x,y,1,1,STREET);}}}
  const routes=[
    {id:'avenida-da-vigilia',points:[[5,23],[11,23],[11,20],[11,13],[17,13],[17,8]]},
    {id:'rua-das-docas',points:[[11,23],[22,23],[22,14],[17,14],[17,13]]},
    {id:'travessa-do-mercado',points:[[11,20],[17,20],[17,14]]}
  ];routes.forEach(r=>road(r.points));
  const districts=[
    {id:'vigilia',name:'Pátio da Vigília',tx:11,ty:20,min:6,max:7,plaza:[9,18,5,4]},
    {id:'docas',name:'Docas Veladas',tx:22,ty:23,min:7,max:8,plaza:[20,21,5,4]},
    {id:'catacumbas',name:'Catacumbas da Névoa',tx:23,ty:14,min:8,max:9,plaza:[21,12,5,5]},
    {id:'bastiao',name:'Bastião das Conchas',tx:17,ty:8,min:9,max:10,plaza:[14,7,7,4]}
  ].map(d=>({...d,...center(d.tx,d.ty)}));
  for(const d of districts)paint(...d.plaza,STREET);
  const docks=[{x:128,y:23*TILE,w:6*TILE,h:TILE},{x:3*TILE,y:21*TILE,w:TILE,h:5*TILE},{x:26*TILE,y:23*TILE,w:4*TILE,h:TILE}];
  for(const d of docks)paint(d.x/TILE,d.y/TILE,d.w/TILE,d.h/TILE,WOOD);
  // All facades open south, with an explicit unblocked route back to a named street.
  function building(id,cell,tx,ty,access){
    const p={id,kind:'building',cell,...center(tx,ty),width:256,height:256};props.push(p);
    colliders.push({id,x:p.x-70,y:p.y-73,w:140,h:60});
    const entrance={x:p.x,y:p.y+40},street=center(...access.at(-1));frontages.push({id,entrance,street});road([[tx,ty],...access]);
  }
  building('intendencia-da-vigilia',3,8,17,[[8,18],[11,18]]);
  building('mercado-das-conchas',1,15,18,[[15,19],[17,20]]);
  building('taverna-dos-vigias',0,8,11,[[8,12],[11,13]]);
  building('armazem-das-docas',1,20,19,[[20,20],[22,21]]);
  building('oficina-do-bairro-antigo',2,24,10,[[24,11],[23,12]]);
  building('comando-do-bastiao',3,17,7,[[17,8]]);
  building('alojamento-dos-vigias',1,12,7,[[12,8],[14,8]]);
  function decor(id,kind,cell,tx,ty,width,height,footprint){const p={id,kind,cell,...center(tx,ty),width,height};props.push(p);if(footprint)colliders.push({id,x:p.x+footprint[0],y:p.y+footprint[1],w:footprint[2],h:footprint[3]});return p;}
  // Cargo belongs to docks, palms to verges, and ancient masonry to the old quarter.
  decor('carga-do-cais-oeste','harbor',2,8,25,144,144,[-35,-35,70,28]);
  decor('carga-das-docas','harbor',2,25,22,144,144,[-35,-35,70,28]);
  decor('barco-da-vigilia','harbor',1,2,20,224,224,[-70,-45,140,54]);
  decor('barco-do-mercado','harbor',0,29,21,224,224,[-70,-45,140,54]);
  for(const [id,x,y] of [['jardim-oeste',6,14],['jardim-sul',15,26],['jardim-leste',26,18],['jardim-norte',23,7]])decor(id,'harbor',3,x,y,160,160,[-36,-25,72,20]);
  for(const [id,x,y] of [['colunas-da-cripta',25,17],['colunas-da-vigilia',19,12]])decor(id,'ruin',8,x,y,128,128,[-40,-22,80,18]);
  const arch=decor('arco-do-bastiao','ruin',2,17,11,192,192);
  for(const side of [-1,1])colliders.push({id:arch.id+'-'+side,x:arch.x+(side<0?-83:43),y:arch.y-31,w:40,h:28});
  // Conservative footprints align to navigation cells, leaving clear margins around corners.
  // The shared navigation algorithm is unchanged; routes are verified by actual movement.
  for(const c of colliders){const right=Math.ceil((c.x+c.w)/24)*24,bottom=Math.ceil((c.y+c.h)/24)*24;c.x=Math.floor(c.x/24)*24;c.y=Math.floor(c.y/24)*24;c.w=right-c.x;c.h=bottom-c.y;}
  const spawn=center(6,23),returnPoint={id:'return',...center(3,23),radius:38};
  function ground(x,y,r=0){return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE))!==WATER);}
  const paths=districts.map(({id,name,x,y})=>({id,name,x,y}));
  const map={id:'conchas',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,playerFootprint:{w:20,h:16},terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:d.x-160,y:d.y-160,w:320,h:320})),safeZones:[{...spawn,radius:160},{x:returnPoint.x,y:returnPoint.y,radius:135}],interactions:[returnPoint]};
  root.MareConchas={TILE,COLS,ROWS,WATER,SAND,GRASS,STREET,WOOD,terrain,at,center,ground,map,routes,districts,paths,props,frontages,docks,spawn,returnPoint};
  if(typeof module!=='undefined')module.exports=root.MareConchas;
})(globalThis);
