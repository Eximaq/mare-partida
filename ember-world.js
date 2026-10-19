'use strict';
/* Authored 64 × 64 tile layout. Geometry, district spawns and decoration share one source. */
((root)=>{
  const TILE=64,COLS=64,ROWS=64,WATER=0,BASALT=1,STREET=2,LAVA=3,WOOD=4;
  const terrain=new Uint8Array(COLS*ROWS),original=new Uint8Array(COLS*ROWS),at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?WATER:terrain[y*COLS+x];
  const center=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const dx=Math.abs((x-32)/29),dy=Math.abs((y-33)/29),shore=Math.pow(dx,4)+Math.pow(dy,4);
    let type=shore<.91+Math.sin(y*.29)*.045+Math.cos(x*.37)*.035?BASALT:WATER;
    const channel=47+Math.sin((y-9)*.14)*4;
    if(type===BASALT&&((y<43&&Math.abs(x-channel)<1.65)||(Math.hypot((x-49)/1.25,y-12)<6.1)))type=LAVA;
    terrain[y*COLS+x]=type;
  }
  original.set(terrain);
  const routes=[
    {id:'rua-das-cinzas',points:[[12,54],[15,48],[18,41],[23,38],[31,35],[31,25],[30,18]],width:2},
    {id:'estrada-da-caldeira',points:[[30,18],[38,18],[43,23],[50,20],[53,17],[50,13]],width:1},
    {id:'circuito-do-estaleiro',points:[[12,54],[26,54],[36,51],[43,48],[43,39],[39,35],[31,35]],width:1},
    {id:'trilha-do-farol',points:[[18,41],[13,34],[12,26],[13,17],[21,17],[30,18]],width:1},
    {id:'rota-dos-naufragios',points:[[43,48],[52,44],[53,34],[53,27],[51,21]],width:1},
    {id:'passagem-das-correntes',points:[[31,35],[40,33],[45,32],[53,27]],width:1},
    {id:'cais-de-chegada',points:[[12,54],[8,56],[5,57]],width:1,wood:true}
  ];
  function paintRoad(route){
    for(let i=1;i<route.points.length;i++){
      const [ax,ay]=route.points[i-1],[bx,by]=route.points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay))*3;
      for(let n=0;n<=steps;n++){const x=Math.round(ax+(bx-ax)*n/steps),y=Math.round(ay+(by-ay)*n/steps);
        for(let oy=-route.width;oy<=route.width;oy++)for(let ox=-route.width;ox<=route.width;ox++){
          if(Math.hypot(ox,oy)>route.width+.3)continue;const tx=x+ox,ty=y+oy;if(tx<1||ty<1||tx>=63||ty>=63)continue;
          terrain[ty*COLS+tx]=route.wood||original[ty*COLS+tx]===LAVA?WOOD:STREET;
        }
      }
    }
  }
  routes.forEach(paintRoad);
  const districts=[
    {id:'cais',name:'Cais das Cinzas',tx:12,ty:53,rx:6,ry:4,roles:['bandit','crab']},
    {id:'corsarios',name:'Rua dos Corsários',tx:18,ty:40,rx:6,ry:6,roles:['bandit','bandit','crab']},
    {id:'mercado',name:'Mercado Calcinado',tx:31,ty:35,rx:7,ry:5,roles:['bandit','spirit','crab']},
    {id:'estaleiro',name:'Estaleiro Partido',tx:43,ty:48,rx:7,ry:5,roles:['bandit','spirit']},
    {id:'ancoras',name:'Pátio das Âncoras',tx:30,ty:18,rx:7,ry:5,roles:['crab','crab','spirit']},
    {id:'farol',name:'Mirante do Farol Quebrado',tx:13,ty:17,rx:4,ry:4,roles:['spirit','crab']},
    {id:'caldeira',name:'Fortaleza da Caldeira',tx:50,ty:13,rx:4,ry:4,roles:['crab','spirit']}
  ].map(d=>({...d,...center(d.tx,d.ty)}));
  // Open combat squares and boss arena; corridors remain the primary navigational structure.
  for(const d of districts){for(let y=d.ty-2;y<=d.ty+2;y++)for(let x=d.tx-3;x<=d.tx+3;x++)terrain[y*COLS+x]=d.id==='cais'?STREET:BASALT;terrain[d.ty*COLS+d.tx]=STREET;}
  const props=[],colliders=[];
  const definitions={tavern:{cell:0,scale:2,w:2.8,h:1.4},house:{cell:1,scale:2,w:2.6,h:1.3},arch:{cell:2,scale:2,w:0,h:0},gate:{cell:3,scale:2,w:0,h:0},wreck:{cell:4,scale:2,w:2.8,h:1.3},mast:{cell:5,scale:2,w:.5,h:.5},bridge:{cell:6,scale:1,w:0,h:0},cargo:{cell:7,scale:1,w:1.1,h:.65},column:{cell:8,scale:1,w:.65,h:.65},barricade:{cell:9,scale:1,w:1.1,h:.5},vent:{cell:10,scale:1,w:.65,h:.65},grave:{cell:11,scale:1,w:.75,h:.65}};
  function place(kind,tx,ty,options={}){
    const d=definitions[kind],p={id:kind+'-'+props.length,kind,tx,ty,...center(tx,ty),...d,...options};
    if(d.w&&options.solid!==false){
      const w=d.w*TILE,h=d.h*TILE,rect={id:p.id,x:p.x-w/2,y:p.y-h*.7,w,h};
      // A prop may never silently seal a road or stand on molten ground.
      for(let y=Math.floor(rect.y/TILE);y<=Math.floor((rect.y+h)/TILE);y++)for(let x=Math.floor(rect.x/TILE);x<=Math.floor((rect.x+w)/TILE);x++)if(at(x,y)!==BASALT)return false;
      if(colliders.some(o=>rect.x<o.x+o.w&&rect.x+rect.w>o.x&&rect.y<o.y+o.h&&rect.y+rect.h>o.y))return false;
      colliders.push(rect);
    }
    props.push(p);return true;
  }
  // Blocks, courtyards and waterfront composition, rather than unstructured random scatter.
  for(const [x,y] of [[14,42],[22,42],[25,40],[17,34],[22,33],[26,31],[36,31],[37,38],[27,40],[22,47],[28,48],[34,46],[38,45],[39,52],[34,57]])place((x+y)%3?'house':'tavern',x,y);
  for(const [x,y] of [[9,50],[9,46],[24,44],[25,36],[35,35],[33,28],[27,24],[25,20],[34,21],[35,15],[18,18],[14,13],[11,21],[40,47],[46,50],[42,53],[52,9],[54,14]])place((x+y)%2?'column':'cargo',x,y);
  for(const [x,y] of [[17,46],[24,50],[33,40],[26,15],[34,18],[40,25],[49,23],[55,30],[51,41]])place('barricade',x,y);
  for(const [x,y] of [[5,54],[30,62],[60,47],[60,18]])place('wreck',x,y,{solid:false});
  for(const [x,y] of [[8,53],[27,56],[44,52],[55,40],[40,28]])place('mast',x,y);
  for(const [x,y] of [[10,16],[16,13],[25,14],[33,13],[53,11],[54,20]])place('grave',x,y);
  for(const [x,y] of [[40,9],[43,15],[51,18],[54,25],[48,36],[45,40]])place('vent',x,y);
  for(const [x,y] of [[47,11],[53,11],[47,15],[53,15]])place('column',x,y);

  place('arch',30,15);place('arch',30,29);place('gate',50,10);
  for(const [index,district] of districts.entries()){
    for(const [n,[dx,dy]] of [[-6,-4],[6,-4],[-6,4],[6,4]].entries())place((index+n)%3?'house':'tavern',district.tx+dx,district.ty+dy);
    for(const [n,[dx,dy]] of [[-4,-3],[4,-3],[-4,3],[4,3]].entries())place(['column','cargo','barricade','grave'][(n+index)%4],district.tx+dx,district.ty+dy);
  }
  place('bridge',8,56,{scale:2,ground:true});place('bridge',47,21,{scale:2,ground:true});place('bridge',47,31,{scale:2,ground:true});
  for(const p of props.filter(p=>p.kind==='arch'))for(const side of [-1,1])colliders.push({id:p.id+'-pillar-'+side,x:p.x+side*72-12,y:p.y-38,w:24,h:48});
  const gate=props.find(p=>p.kind==='gate');if(gate)colliders.push({id:gate.id+'-closed',x:gate.x-72,y:gate.y-20,w:144,h:26});
  const fires=[[12,51],[16,48],[19,37],[23,34],[28,33],[34,37],[29,22],[33,17],[13,15],[42,46],[46,48],[49,20],[52,15],[54,29],[51,42]].map(([x,y],i)=>({id:'fire-'+i,...center(x,y),phase:i*.73}));
  const spawn=center(12,54),returnPoint={...center(10,54),id:'return',radius:42};
  function ground(x,y,r=0){
    for(const [dx,dy] of [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]]){const t=at(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE));if(t===WATER||t===LAVA)return false;}
    return true;
  }
  const paths=districts.map(d=>({id:d.id,name:d.name,x:d.x,y:d.y}));
  const map={id:'embers',width:COLS*TILE,height:ROWS*TILE,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:(d.tx-d.rx)*TILE,y:(d.ty-d.ry)*TILE,w:d.rx*2*TILE,h:d.ry*2*TILE})),interactions:[returnPoint]};
  const nearestDistrict=p=>districts.reduce((best,d)=>Math.hypot(p.x-d.x,p.y-d.y)<Math.hypot(p.x-best.x,p.y-best.y)?d:best,districts[0]);
  const skins={crab:{id:'slag-warden',name:'Vigia de Escória',height:72},bandit:{id:'scorched-corsair',name:'Corsário Calcinado',height:72},spirit:{id:'ash-lantern',name:'Faroleiro das Cinzas',height:72},boss:{id:'caldera-captain',name:'Capitão da Caldeira',height:72}};
  const api={TILE,COLS,ROWS,WATER,BASALT,STREET,LAVA,WOOD,terrain,original,at,center,map,routes,districts,props,fires,paths,returnPoint,ground,nearestDistrict,skins};
  root.MareEmber=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
