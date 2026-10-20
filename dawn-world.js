'use strict';
/* Owner's composition is immutable. Gameplay anchors/collisions are separate. */
((root)=>{
  const D=root.MareDawnData||(typeof require==='function'?require('./dawn-map-data.js'):null),TILE=D.tile,COLS=D.cols,ROWS=D.rows;
  const mask=Uint8Array.from(atob(D.mask.bits),c=>c.charCodeAt(0)),fromSource=(x,y)=>({x:x+D.offset.x,y:y+D.offset.y});
  function sample(x,y){const col=Math.floor(x/D.mask.step),row=Math.floor(y/D.mask.step);if(col<0||row<0||col>=D.mask.cols||row>=D.mask.rows)return false;const i=row*D.mask.cols+col;return !!(mask[i>>3]&(1<<(i&7)));}
  function ground(x,y,r=0){return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>sample(x+dx,y+dy));}
  const props=D.props,colliders=props.map(p=>{const b=p.kind==='boat'?p.bounds:p.foot;return{id:p.id,x:b.x,y:b.y,w:b.width,h:b.height};});
  // Exact checks are opt-in for this densely authored map, avoiding sampled corner cuts.
  function maskLine(a,b,ox,oy){
    const size=D.mask.step,sx=a.x+ox,sy=a.y+oy,ex=b.x+ox,ey=b.y+oy,dx=ex-sx,dy=ey-sy,ix=Math.sign(dx),iy=Math.sign(dy);
    let x=Math.floor(sx/size),y=Math.floor(sy/size);const lastX=Math.floor(ex/size),lastY=Math.floor(ey/size),dtX=dx?size/Math.abs(dx):Infinity,dtY=dy?size/Math.abs(dy):Infinity;
    let tx=dx?((ix>0?(x+1)*size:x*size)-sx)/dx:Infinity,ty=dy?((iy>0?(y+1)*size:y*size)-sy)/dy:Infinity;
    for(let n=0;n<D.mask.cols+D.mask.rows+4;n++){
      if(!sample((x+.5)*size,(y+.5)*size))return false;if(x===lastX&&y===lastY)return true;
      if(tx<ty){x+=ix;tx+=dtX;}else if(ty<tx){y+=iy;ty+=dtY;}else{if(!sample((x+ix+.5)*size,(y+.5)*size)||!sample((x+.5)*size,(y+iy+.5)*size))return false;x+=ix;y+=iy;tx+=dtX;ty+=dtY;}
    }return false;
  }
  function segmentBlocked(a,b,r){
    if(colliders.some(c=>{let lo=0,hi=1;for(const [v,d,min,max]of [[a.x,b.x-a.x,c.x-r-.05,c.x+c.w+r+.05],[a.y,b.y-a.y,c.y-r-.05,c.y+c.h+r+.05]]){if(Math.abs(d)<1e-12){if(v<min||v>max)return false;}else{let u=(min-v)/d,w=(max-v)/d;if(u>w)[u,w]=[w,u];lo=Math.max(lo,u);hi=Math.min(hi,w);if(lo>hi)return false;}}return true;}))return true;
    return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].some(([x,y])=>!maskLine(a,b,x,y));
  }
  function free(x,y,r=10){return ground(x,y,r)&&!colliders.some(c=>x+r>c.x&&x-r<c.x+c.w&&y+r>c.y&&y-r<c.y+c.h);}
  function anchor(x,y){const p=fromSource(x,y),snap=v=>Math.floor(v/16)*16+8;p.x=snap(p.x);p.y=snap(p.y);if(free(p.x,p.y))return p;for(let ring=16;ring<=128;ring+=16)for(let dy=-ring;dy<=ring;dy+=16)for(let dx=-ring;dx<=ring;dx+=16)if(Math.max(Math.abs(dx),Math.abs(dy))===ring&&free(p.x+dx,p.y+dy))return{x:p.x+dx,y:p.y+dy};throw Error('Dawn anchor outside exported ground');}
  const spawn=anchor(-480,960),returnPoint={id:'return',...anchor(-592,960),radius:38};
  const districts=[['cais','Cais de Dawn',1,2,-224,992],['corsarios','Bosque dos Corsários',3,4,0,896],['estaleiro','Praia dos Barqueiros',4,5,320,1088],['mercado','Enseada das Conchas',5,6,800,1088],['ancoras','Passarela das Âncoras',7,8,320,704],['farol','Clareira dos Vigias',8,9,480,512],['caldeira','Vila do Capitão',9,10,800,416]].map(([id,name,min,max,x,y])=>({id,name,min,max,...anchor(x,y)}));
  const paths=districts.map(({id,name,x,y})=>({id,name,x,y}));
  const map={id:'dawn',width:D.width,height:D.height,origin:{x:0,y:0},spawn,colliders,terrainWalkable:ground,segmentBlocked,navigationCell:16,navigationGoals:paths,spawnZones:districts.map(d=>({id:d.id,x:d.x-160,y:d.y-160,w:320,h:320})),safeZones:[{...spawn,radius:160},{x:returnPoint.x,y:returnPoint.y,radius:135}],interactions:[returnPoint]};
  function nearestDistrict(p){return districts.reduce((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)<Math.hypot(p.x-b.x,p.y-b.y)?a:b);}
  root.MareDawn={TILE,COLS,ROWS,map,props,paths,districts,spawn,returnPoint,ground,fromSource,nearestDistrict};if(typeof module!=='undefined')module.exports=root.MareDawn;
})(globalThis);
