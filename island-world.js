'use strict';
// Compact port layout: one service square and a connected shipping quay.
(() => {
  const size={width:2400,height:1700},spawn={x:1360,y:900};
  const buildings=[
    {id:'tavern',cell:0,x:1190,y:720,name:'Taverna da Maré'},
    {id:'navigation',cell:3,x:1570,y:720,name:'Casa das Cartas Náuticas'},
    {id:'market',cell:1,x:1180,y:1050,name:'Mercado das Correntes'},
    {id:'forge',cell:2,x:1570,y:1050,name:'Forja de Salmora'},
    {id:'harbor',cell:3,x:800,y:1020,name:'Capitania do Porto'},
    {id:'inn',cell:0,x:1900,y:870,name:'Pousada do Horizonte'}
  ];
  const npcs={luffy:{x:820,y:1090},nami:{x:1570,y:780},ryuma:{x:1570,y:1110},donquixote:{x:1180,y:1110}};
  const dock={x:160,y:1060,w:670,h:96};
  const docks=[dock,{x:192,y:700,w:96,h:760},
    {x:288,y:720,w:128,h:48},{x:288,y:1000,w:128,h:48},
    {x:288,y:1420,w:128,h:40}];
  const roads=[
    [[760,1100],[1050,1100],52],[[1050,1100],[1180,1120],52],
    [[1180,1120],[1590,1120],52],[[1360,1120],[1360,900],52],
    [[950,1100],[980,900],48],[[980,900],[1360,900],52],
    [[1190,780],[1570,780],45],[[1360,780],[1360,900],48],
    [[1360,900],[1900,930],44]
  ];
  function land(x,y,inset=0){
    const dx=(x-1400)/(870-inset),dy=(y-900)/(640-inset),a=Math.atan2(dy,dx);
    return dx*dx+dy*dy<1+.03*Math.sin(a*5)+.018*Math.sin(a*9);
  }
  function ground(x,y,r=10){
    // The main pier and each quay/finger form a single navigable union.
    const onDeck=(px,py)=>docks.some(d=>px>=d.x&&px<=d.x+d.w&&py>=d.y&&py<=d.y+d.h);
    for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){
      const px=x+dx,py=y+dy;if(onDeck(px,py))continue;
      const gx=Math.floor(px/32)*32,gy=Math.floor(py/32)*32;
      if(!land(gx,gy)||!land(gx+32,gy)||!land(gx,gy+32)||!land(gx+32,gy+32))return false;
    }
    return true;
  }
  function segmentDistance(x,y,a,b){
    const vx=b[0]-a[0],vy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy)));
    return Math.hypot(x-a[0]-t*vx,y-a[1]-t*vy);
  }
  function grass(x,y){
    if(!land(x,y,80))return false;
    if(((x-1360)/220)**2+((y-900)/130)**2<1)return false;
    if(roads.some(([a,b,width])=>segmentDistance(x,y,a,b)<width))return false;
    return true;
  }
  const harborProps=[
    {id:'pirate-ship',cell:0,x:448,y:985,kind:'harbor'},
    {id:'fishing-boat',cell:1,x:448,y:1415,kind:'harbor'},
    {id:'dock-cargo',cell:2,x:870,y:1320,kind:'harbor'},
    {id:'warehouse-cargo',cell:2,x:720,y:920,kind:'harbor'},
    {id:'palms-west',cell:3,x:980,y:730,kind:'harbor'},
    {id:'palms-south',cell:3,x:1770,y:1290,kind:'harbor'},
    {id:'palms-east',cell:3,x:1960,y:640,kind:'harbor'},
    {id:'palms-coast',cell:3,x:1050,y:1400,kind:'harbor'}
  ];
  const colliders=buildings.map(b=>({id:b.id,x:b.x-100,y:b.y-84,w:200,h:67}));
  for(const p of harborProps){
    if(p.cell===2)colliders.push({id:p.id,x:p.x-64,y:p.y-47,w:128,h:35});
    if(p.cell===3)colliders.push({id:p.id,x:p.x-58,y:p.y-31,w:116,h:21});
  }
  globalThis.MareIsland={size,spawn,buildings,npcs,dock,docks,roads,land,grass,ground,colliders,harborProps,
    paths:[{x:1900,y:940},{x:1360,y:600},{x:1640,y:1350}],decorations:[]};
})();
