'use strict';
/* Compact authored island: street frontages, real crossings and gated terraces. */
((root)=>{
  const TILE=64,COLS=16,ROWS=16,WATER=0,BASALT=1,STREET=2,LAVA=3,WOOD=4;
  const terrain=new Uint8Array(COLS*ROWS),original=new Uint8Array(COLS*ROWS);
  const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const center=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
  function inside(x,y,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
  const mainland=[[3,1],[8,1],[10,3],[10,12],[8,14],[3,14],[1,12],[1,4]];
  const fortress=[[13,2],[14.8,4],[14.8,9],[12,10],[12,6]];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(inside(x+.5,y+.5,mainland)||inside(x+.5,y+.5,fortress))terrain[y*COLS+x]=BASALT;
    if(x>=10&&x<=11&&y>=3&&y<=11)terrain[y*COLS+x]=LAVA;
  }
  original.set(terrain);
  const routes=[
    {id:'rua-central',points:[[4,12],[6,12],[6,8],[5,8],[5,3]]},
    {id:'acesso-da-ponte',points:[[6,8],[9,8]]},
    {id:'estrada-da-caldeira',points:[[12,7],[13,7],[13,5]]}
  ];
  function road(route){for(let i=1;i<route.points.length;i++){
    const [ax,ay]=route.points[i-1],[bx,by]=route.points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay))*4;
    for(let n=0;n<=steps;n++){const x=Math.round(ax+(bx-ax)*n/steps),y=Math.round(ay+(by-ay)*n/steps);if(at(x,y)===BASALT)terrain[y*COLS+x]=STREET;}
  }}
  routes.forEach(road);
  const districts=[
    {id:'cais',name:'Cais das Cinzas',tx:4,ty:12,roles:['bandit','crab']},
    {id:'mercado',name:'Praça Calcinada',tx:6,ty:8,roles:['bandit','spirit','crab']},
    {id:'ancoras',name:'Ruínas das Âncoras',tx:5,ty:3,roles:['crab','spirit']},
    {id:'caldeira',name:'Fortaleza da Caldeira',tx:13,ty:5,roles:['crab','spirit']}
  ].map(d=>({...d,rx:2,ry:2,...center(d.tx,d.ty)}));
  for(const d of districts)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(at(d.tx+dx,d.ty+dy)===BASALT)terrain[(d.ty+dy)*COLS+d.tx+dx]=STREET;
  // The only wooden terrain is the landing quay, connected to dry ground.
  const quay={x:0,y:12,w:4,h:1};for(let x=quay.x;x<quay.x+quay.w;x++)terrain[quay.y*COLS+x]=WOOD;
  const bridges=[{id:'ponte-da-fenda',a:center(9,8),b:{x:784,y:448},width:64}];
  function onBridge(x,y,r=0){return bridges.some(b=>{const dx=b.b.x-b.a.x,dy=b.b.y-b.a.y,t=Math.max(0,Math.min(1,((x-b.a.x)*dx+(y-b.a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-b.a.x-t*dx,y-b.a.y-t*dy)<=b.width/2-r;});}
  const stairs=[
    {id:'escada-do-cais',x:5*TILE,y:10*TILE,w:2*TILE},
    {id:'escada-das-ruinas',x:4*TILE,y:6*TILE,w:2*TILE},
    {id:'escada-da-fortaleza',x:12*TILE,y:6*TILE,w:2*TILE}
  ];
  const terraceRows=[6,10],cliffs=[],colliders=[],props=[],frontages=[];
  for(const row of terraceRows)for(let x=0;x<COLS;x++){
    if([WATER,LAVA].includes(at(x,row-1))||[WATER,LAVA].includes(at(x,row)))continue;
    const stair=stairs.find(s=>s.y===row*TILE&&x*TILE>=s.x&&x*TILE<s.x+s.w);
    cliffs.push({tx:x,ty:row-1,stair:!!stair,level:row===6?2:1});
    if(!stair)colliders.push({id:'cliff-'+x+'-'+row,x:x*TILE,y:row*TILE-38,w:TILE,h:46});
  }
  const definitions={tavern:{cell:0,scale:1.5,w:118,h:48},house:{cell:1,scale:1.5,w:112,h:46},arch:{cell:2,scale:1.5,w:0,h:0},gate:{cell:3,scale:1.5,w:112,h:20},wreck:{cell:4,scale:1.5,w:0,h:0},mast:{cell:5,scale:1.25,w:28,h:24},bridge:{cell:6,scale:2,w:0,h:0},cargo:{cell:7,scale:1,w:64,h:36},column:{cell:8,scale:1,w:42,h:28},barricade:{cell:9,scale:1,w:62,h:26},vent:{cell:10,scale:1,w:44,h:30},grave:{cell:11,scale:1,w:44,h:26}};
  function place(kind,tx,ty,options={}){
    const p={id:kind+'-'+props.length,kind,tx,ty,...center(tx,ty),...definitions[kind],...options};
    if(p.w&&options.solid!==false)colliders.push({id:p.id,x:p.x-p.w/2,y:p.y-p.h*.7,w:p.w,h:p.h});
    props.push(p);return p;
  }
  // Each facade has an explicit, unobstructed forecourt connected to its street.
  for(const [kind,x,y,street] of [
    ['house',3,10,[6,11]],['tavern',8,7,[6,8]],['house',3,3,[5,4]]
  ]){
    const p=place(kind,x,y);const entrance={x:p.x,y:p.y+42};
    const frontage={id:p.id,entrance,street:center(...street)};frontages.push(frontage);
    road({points:[[x,y+1],[street[0],y+1],street],width:0});
  }
  for(const [kind,positions] of [
    ['cargo',[[3,13],[7,12]]],['column',[[6,2],[12,4]]],
    ['barricade',[[8,10]]],['mast',[[1,12]]],['grave',[[8,2]]],['vent',[[9,4]]]
  ])for(const [x,y] of positions)place(kind,x,y);
  place('arch',7,3);for(const side of [-1,1]){const p=props.find(p=>p.kind==='arch');colliders.push({id:p.id+'-pillar-'+side,x:p.x+side*54-10,y:p.y-28,w:20,h:36});}
  place('gate',13,3);
  for(const [x,y] of [[0,14],[15,10]])place('wreck',x,y,{solid:false,scale:1});
  const bridge=bridges[0];place('bridge',10,8,{ground:true,bridgeId:bridge.id,drawX:bridge.a.x-25*2,drawY:bridge.a.y-98*2});
  const fires=[[4,11],[7,9],[5,4],[13,6]].map(([x,y],i)=>({id:'fire-'+i,...center(x,y),phase:i*.73}));
  const spawn=center(4,12),returnPoint={...center(4,12),id:'return',radius:34};
  function ground(x,y,r=0){for(const [dx,dy] of [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]]){const t=at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE));if((t===WATER||t===LAVA)&&!onBridge(x+dx,y+dy))return false;}return true;}
  const elevation=(x,y)=>{const t=at(Math.floor(x/TILE),Math.floor(y/TILE));return t===WATER||t===LAVA?-1:y<6*TILE?2:y<10*TILE?1:0;};
  const paths=districts.map(d=>({id:d.id,name:d.name,x:d.x,y:d.y}));
  const map={id:'embers',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:(d.tx-d.rx)*TILE,y:(d.ty-d.ry)*TILE,w:d.rx*2*TILE,h:d.ry*2*TILE})),interactions:[returnPoint]};
  const nearestDistrict=p=>districts.reduce((best,d)=>Math.hypot(p.x-d.x,p.y-d.y)<Math.hypot(p.x-best.x,p.y-best.y)?d:best,districts[0]);
  const skins={crab:{id:'slag-warden',name:'Vigia de Escória',height:72},bandit:{id:'scorched-corsair',name:'Corsário Calcinado',height:72},spirit:{id:'ash-lantern',name:'Faroleiro das Cinzas',height:72},boss:{id:'caldera-captain',name:'Capitão da Caldeira',height:72}};
  const api={TILE,COLS,ROWS,WATER,BASALT,STREET,LAVA,WOOD,terrain,original,at,center,map,routes,districts,props,fires,paths,returnPoint,ground,nearestDistrict,skins,bridges,stairs,cliffs,frontages,elevation,quay};
  root.MareEmber=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
