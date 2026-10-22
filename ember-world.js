'use strict';
/* Compact authored island: street frontages, real crossings and gated terraces. */
((root)=>{
  const TILE=64,COLS=32,ROWS=32,WATER=0,BASALT=1,STREET=2,LAVA=3,WOOD=4;
  const terrain=new Uint8Array(COLS*ROWS),original=new Uint8Array(COLS*ROWS);
  const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const center=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
  function inside(x,y,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
  const mainland=[[6,3],[16,3],[19,5],[20.8,9],[20.8,25],[18,28.5],[7,29],[4,27],[3,23],[3,11],[4,6]];
  const fortress=[[25,6],[28,8],[29,12],[28.5,20],[26,23],[23,21],[23,10]];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(inside(x+.5,y+.5,mainland)||inside(x+.5,y+.5,fortress))terrain[y*COLS+x]=BASALT;
    if(x>=21&&x<=22&&y>=7&&y<=24)terrain[y*COLS+x]=LAVA;
  }
  original.set(terrain);
  const routes=[
    {id:'rua-das-cinzas',points:[[7,26],[8,24],[8,19],[8,16],[15,16],[15,8]],width:0},
    {id:'circuito-do-estaleiro',points:[[7,26],[16,26],[16,24],[16,20],[15,16]],width:0},
    {id:'trilha-do-farol',points:[[8,16],[6,16],[6,8],[15,8]],width:0},
    {id:'acesso-da-ponte',points:[[15,16],[20,16]],width:0},
    {id:'estrada-da-caldeira',points:[[23,15],[25,15],[25,10],[26,10]],width:0}
  ];
  function road(route){for(let i=1;i<route.points.length;i++){
    const [ax,ay]=route.points[i-1],[bx,by]=route.points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay))*4;
    for(let n=0;n<=steps;n++){const x=Math.round(ax+(bx-ax)*n/steps),y=Math.round(ay+(by-ay)*n/steps);if(at(x,y)===BASALT)terrain[y*COLS+x]=STREET;}
  }}
  routes.forEach(road);
  const districts=[
    {id:'cais',name:'Cais das Cinzas',tx:7,ty:26,roles:['bandit','crab']},
    {id:'corsarios',name:'Rua dos Corsários',tx:8,ty:19,roles:['bandit','bandit','crab']},
    {id:'mercado',name:'Mercado Calcinado',tx:15,ty:16,roles:['bandit','spirit','crab']},
    {id:'estaleiro',name:'Estaleiro Partido',tx:16,ty:25,roles:['bandit','spirit']},
    {id:'ancoras',name:'Pátio das Âncoras',tx:15,ty:8,roles:['crab','spirit']},
    {id:'farol',name:'Mirante do Farol Quebrado',tx:6,ty:8,roles:['spirit','crab']},
    {id:'caldeira',name:'Fortaleza da Caldeira',tx:26,ty:10,roles:['crab','spirit']}
  ].map(d=>({...d,rx:3,ry:3,...center(d.tx,d.ty)}));
  for(const d of districts)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(at(d.tx+dx,d.ty+dy)===BASALT)terrain[(d.ty+dy)*COLS+d.tx+dx]=STREET;
  // The only wooden terrain is the landing quay, connected to dry ground.
  const quay={x:1,y:26,w:6,h:1};for(let x=quay.x;x<quay.x+quay.w;x++)terrain[quay.y*COLS+x]=WOOD;
  const bridges=[{id:'ponte-da-fenda',a:center(20,16),b:{x:1488,y:960},width:58}];
  function onBridge(x,y,r=0){return bridges.some(b=>{const dx=b.b.x-b.a.x,dy=b.b.y-b.a.y,t=Math.max(0,Math.min(1,((x-b.a.x)*dx+(y-b.a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-b.a.x-t*dx,y-b.a.y-t*dy)<=b.width/2-r;});}
  const stairs=[
    {id:'escada-do-cais',x:7*TILE,y:22*TILE,w:2*TILE},
    {id:'rampa-do-estaleiro',x:15*TILE,y:22*TILE,w:2*TILE},
    {id:'escada-do-farol',x:5*TILE,y:12*TILE,w:2*TILE},
    {id:'escada-das-ancoras',x:14*TILE,y:12*TILE,w:2*TILE},
    {id:'escada-da-fortaleza',x:25*TILE,y:12*TILE,w:2*TILE}
  ];
  const terraceRows=[12,22],cliffs=[],colliders=[],props=[],frontages=[];
  for(const row of terraceRows)for(let x=0;x<COLS;x++){
    if([WATER,LAVA].includes(at(x,row-1))||[WATER,LAVA].includes(at(x,row)))continue;
    const stair=stairs.find(s=>s.y===row*TILE&&x*TILE>=s.x&&x*TILE<s.x+s.w);
    cliffs.push({tx:x,ty:row-1,stair:!!stair,level:row===12?2:1});
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
    ['house',5,24,[8,25]],['house',11,24,[8,25]],['tavern',18,23,[16,24]],
    ['tavern',5,18,[8,19]],['house',11,18,[8,19]],
    ['house',11,14,[15,15]],['tavern',18,14,[15,15]],['house',11,6,[15,7]]
  ]){
    const p=place(kind,x,y);const entrance={x:p.x,y:p.y+42};
    const frontage={id:p.id,entrance,street:center(...street)};frontages.push(frontage);
    road({points:[[x,y+1],[street[0],y+1],street],width:0});
  }
  for(const [kind,positions] of [
    ['cargo',[[5,27],[13,27],[18,26],[12,17],[18,17]]],
    ['column',[[5,7],[8,6],[13,6],[18,7],[24,9],[28,10],[24,18]]],
    ['barricade',[[4,20],[12,20],[19,19]]],
    ['mast',[[4,25],[18,27]]],
    ['grave',[[5,5],[8,4],[27,8]]],
    ['vent',[[19,9],[24,20],[27,18]]]
  ])for(const [x,y] of positions)place(kind,x,y);
  place('arch',15,10);for(const side of [-1,1]){const p=props.find(p=>p.kind==='arch');colliders.push({id:p.id+'-pillar-'+side,x:p.x+side*54-10,y:p.y-28,w:20,h:36});}
  place('gate',26,8);
  for(const [x,y] of [[2,27],[14,30],[30,19]])place('wreck',x,y,{solid:false});
  // The generated bridge is aligned to its actual diagonal deck, with both ends on land.
  const bridge=bridges[0];place('bridge',21,16,{ground:true,bridgeId:bridge.id,drawX:bridge.a.x-25*2,drawY:bridge.a.y-98*2});
  const fires=[[6,25],[12,25],[17,24],[6,19],[12,16],[18,15],[14,9],[6,9],[24,16],[27,11]].map(([x,y],i)=>({id:'fire-'+i,...center(x,y),phase:i*.73}));
  const spawn=center(7,26),returnPoint={...center(4,26),id:'return',radius:34};
  function ground(x,y,r=0){for(const [dx,dy] of [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]]){const t=at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE));if((t===WATER||t===LAVA)&&!onBridge(x+dx,y+dy))return false;}return true;}
  const elevation=(x,y)=>{const t=at(Math.floor(x/TILE),Math.floor(y/TILE));return t===WATER||t===LAVA?-1:y<12*TILE?2:y<22*TILE?1:0;};
  const paths=districts.map(d=>({id:d.id,name:d.name,x:d.x,y:d.y}));
  const map={id:'embers',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:(d.tx-d.rx)*TILE,y:(d.ty-d.ry)*TILE,w:d.rx*2*TILE,h:d.ry*2*TILE})),interactions:[returnPoint]};
  const nearestDistrict=p=>districts.reduce((best,d)=>Math.hypot(p.x-d.x,p.y-d.y)<Math.hypot(p.x-best.x,p.y-best.y)?d:best,districts[0]);
  const skins={cesar:{id:'cesar',name:'César',height:96},crab:{id:'slag-warden',name:'Vigia de Escória',height:72},bandit:{id:'scorched-corsair',name:'Corsário Calcinado',height:72},spirit:{id:'ash-lantern',name:'Faroleiro das Cinzas',height:72},boss:{id:'caldera-captain',name:'Capitão da Caldeira',height:72}};
  const api={TILE,COLS,ROWS,WATER,BASALT,STREET,LAVA,WOOD,terrain,original,at,center,map,routes,districts,props,fires,paths,returnPoint,ground,nearestDistrict,skins,bridges,stairs,cliffs,frontages,elevation,quay};
  root.MareEmber=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
