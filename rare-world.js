'use strict';
/* Ilha dos Animais Raros: every ground cell is a native 64x64 pixel tile. */
((root)=>{
  const TILE=64,COLS=32,ROWS=32,WATER=0,SAND=1,GRASS=2,GRASS_ALT=3,PATH=4;
  const terrain=new Uint8Array(COLS*ROWS),props=[],colliders=[];
  const center=(tx,ty)=>({x:(tx+.5)*TILE,y:(ty+.5)*TILE});
  const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const hash=(x,y,seed=0)=>{let n=Math.imul(x+seed*19,374761393)+Math.imul(y-seed*7,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  const shore=(x,y)=>{const dx=(x-15.5)/13.2,dy=(y-15.5)/13.8,angle=Math.atan2(dy,dx);return Math.hypot(dx,dy)<1+.075*Math.sin(angle*5+.4)+.045*Math.sin(angle*9-1.2)+.03*Math.sin(angle*15+2);};
  const routes=[
    {id:'trilha-do-cais',points:[[7,24],[9,22],[10,19],[12,17]]},
    {id:'trilha-do-bosque',points:[[12,17],[15,16],[18,15],[21,12]]},
    {id:'trilha-da-copa',points:[[21,12],[20,10],[18,8],[17,6]]},
    {id:'atalho-das-raizes',points:[[10,19],[13,20],[17,19],[20,17],[21,12]]}
  ];
  const districts=[
    {id:'entrada',name:'Clareira da Entrada',tx:7,ty:24,min:35,max:35},
    {id:'subbosque',name:'Sub-bosque dos Cocox',tx:12,ty:17,min:35,max:35},
    {id:'mata-fechada',name:'Mata Fechada',tx:21,ty:12,min:35,max:35},
    {id:'copa-antiga',name:'Copa Antiga',tx:17,ty:6,min:35,max:35}
  ].map(d=>({...d,...center(d.tx,d.ty)}));
  function segmentDistance(x,y,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(x-a[0]-t*vx,y-a[1]-t*vy);}
  function trailDistance(x,y){return Math.min(...routes.flatMap(r=>r.points.slice(1).map((p,i)=>segmentDistance(x,y,r.points[i],p))));}
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(!shore(x+.5,y+.5))continue;
    const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!shore(x+dx+.5,y+dy+.5));
    const trail=trailDistance(x+.5,y+.5);
    terrain[y*COLS+x]=edge?SAND:trail<.9?PATH:hash(x,y,4)<.17?GRASS_ALT:GRASS;
  }
  // The dock and clearings stay open; trees form uneven clusters around the trails.
  for(let y=3;y<29;y++)for(let x=3;x<29;x++){
    if(at(x,y)!==GRASS&&at(x,y)!==GRASS_ALT)continue;
    if(trailDistance(x+.5,y+.5)<2.2||districts.some(d=>Math.hypot(x-d.tx,y-d.ty)<2.5))continue;
    const density=.48+.16*Math.sin(x*.73+y*.29)+.12*Math.cos(y*.91-x*.24);
    if(hash(x,y,13)>density)continue;
    const jx=(hash(x,y,21)-.5)*23,jy=(hash(x,y,22)-.5)*17;
    const p={id:'arvore-'+x+'-'+y,kind:'tree',x:(x+.5)*TILE+jx,y:(y+.5)*TILE+jy};
    props.push(p);
    colliders.push({id:p.id,x:p.x-13,y:p.y-17,w:26,h:21});
  }
  for(let y=4;y<28;y++)for(let x=4;x<28;x++){
    if((at(x,y)!==GRASS&&at(x,y)!==GRASS_ALT)||trailDistance(x+.5,y+.5)<1.4)continue;
    if(props.some(p=>Math.hypot(p.x-(x+.5)*TILE,p.y-(y+.5)*TILE)<40))continue;
    const v=hash(x,y,49);
    if(v<.10)props.push({id:'arbusto-'+x+'-'+y,kind:'bush',...center(x,y)});
    else if(v>.955){const p={id:'rocha-'+x+'-'+y,kind:'rock',...center(x,y)};props.push(p);colliders.push({id:p.id,x:p.x-15,y:p.y-11,w:30,h:18});}
  }
  const spawn=center(7,24),returnPoint={id:'return',...center(6,24),radius:38};
  // A short pier gives the return interaction a visible, reachable landing.
  const paths=districts.map(({id,name,x,y})=>({id,name,x,y}));
  function ground(x,y,r=0){return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE))!==WATER);}
  const map={id:'rare',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:d.x-145,y:d.y-145,w:290,h:290})),safeZones:[{...spawn,radius:145},{...returnPoint,radius:110}],interactions:[returnPoint]};
  root.MareRare={TILE,COLS,ROWS,WATER,SAND,GRASS,GRASS_ALT,PATH,terrain,at,center,ground,map,routes,districts,paths,props,spawn,returnPoint};
  if(typeof module!=='undefined')module.exports=root.MareRare;
})(globalThis);
