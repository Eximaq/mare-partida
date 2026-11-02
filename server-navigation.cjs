// Server-only broad phase. Exact predicates and route solver remain the original ones.
'use strict';
function indexedNavigation(Base,map,cell=24,radius=10){
 class Indexed extends Base{
  constructor(){super({...map},cell,radius,{defer:true});this.buckets=new Map();this.full=this.map.colliders;this.tile=128;
   for(const o of this.full)for(let y=Math.floor(o.y/this.tile);y<=Math.floor((o.y+o.h)/this.tile);y++)for(let x=Math.floor(o.x/this.tile);x<=Math.floor((o.x+o.w)/this.tile);x++){const key=x+':'+y,items=this.buckets.get(key)||[];items.push(o);this.buckets.set(key,items);}
   if(map.segmentBlocked)this.map.segmentBlocked=(a,b,r)=>map.segmentBlocked(a,b,r,this.candidates(a,b,r+.1));
   this.buildRows(this.rows);
  }
  candidates(a,b=a,r=this.radius){
   if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||[a,b].some(p=>p.x<0||p.y<0||p.x>this.map.width||p.y>this.map.height))return this.full;
   const foot=this.map.playerFootprint,margin=Math.max(r,foot?.w||0,foot?.h||0)+.1,set=new Set();
   const x0=Math.floor((Math.min(a.x,b.x)-margin)/this.tile),x1=Math.floor((Math.max(a.x,b.x)+margin)/this.tile),y0=Math.floor((Math.min(a.y,b.y)-margin)/this.tile),y1=Math.floor((Math.max(a.y,b.y)+margin)/this.tile);
   // Nonfinite/outside inputs are rejected by the exact original predicates.
   if(![x0,x1,y0,y1].every(Number.isFinite)||x1-x0>2048||y1-y0>2048)return this.full;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)for(const o of this.buckets.get(x+':'+y)||[])set.add(o);return [...set];
  }
  scoped(a,b,r,fn){const old=this.map.colliders;this.map.colliders=this.candidates(a,b,r);try{return fn();}finally{this.map.colliders=old;}}
  path(start,requested){
   const end=this.nearest(requested);if(!end||!this.walkable(start.x,start.y))return [];
   if(this.clear(start,end))return [end];
   const sx=Math.floor(start.x/this.cell),sy=Math.floor(start.y/this.cell),ex=Math.floor(end.x/this.cell),ey=Math.floor(end.y/this.cell),sid=sy*this.cols+sx,eid=ey*this.cols+ex;
   if(sid!==eid){
    // Every A* route must enter the final node from one of these eight edges.
    // A walkable point beside an obstacle can have no valid incoming edge.
    // Detect that exact impossibility before repeatedly flooding the whole map.
    if(!this.grid[eid])return [];
    let incoming=false;
    for(let dy=-1;dy<=1&&!incoming;dy++)for(let dx=-1;dx<=1&&!incoming;dx++){
     if(!dx&&!dy)continue;const x=ex+dx,y=ey+dy,id=y*this.cols+x;
     if(x<0||y<0||x>=this.cols||y>=this.rows||(id!==sid&&!this.grid[id]))continue;
     if(dx&&dy&&(!this.grid[y*this.cols+ex]||!this.grid[ey*this.cols+x]))continue;
     const from=id===sid?start:{x:(x+.5)*this.cell,y:(y+.5)*this.cell};incoming=this.clear(from,end);
    }
    if(!incoming)return [];
   }
   return super.path(start,requested);
  }
  walkable(x,y,r=this.radius){return this.scoped({x,y},{x,y},r,()=>super.walkable(x,y,r));}
  clear(a,b){return this.scoped(a,b,this.radius,()=>super.clear(a,b));}
  projectileClear(a,b){return this.scoped(a,b,0,()=>super.projectileClear(a,b));}
 }
 return new Indexed();
}
module.exports={indexedNavigation};
