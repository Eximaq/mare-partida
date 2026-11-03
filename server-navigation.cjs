// Server-only broad phase. Exact predicates and route solver remain the original ones.
'use strict';
const {terrainMaskIndex}=require('./server-terrain-mask.cjs');
function gridComponents(grid,cols,rows){
 if(!grid)return null;
 const groups=new Int32Array(grid.length),queue=new Int32Array(grid.length);let group=0;
 for(let id=0;id<grid.length;id++)if(grid[id]&&!groups[id]){
  let head=0,tail=1;queue[0]=id;groups[id]=++group;
  while(head<tail){const at=queue[head++],x=at%cols,y=Math.floor(at/cols);
   for(const next of [x>0?at-1:-1,x+1<cols?at+1:-1,y>0?at-cols:-1,y+1<rows?at+cols:-1])if(next>=0&&grid[next]&&!groups[next]){groups[next]=group;queue[tail++]=next;}
  }
 }return groups;
}
function indexedNavigation(Base,map,cell=24,radius=10,{terrainMask}={}){
 class Indexed extends Base{
  constructor(){super({...map},cell,radius,{defer:true});this.buckets=new Map();this.full=this.map.colliders;this.tile=128;this.walkMemo=new Map();this.clearMemo=new Map();
   this.terrainIndex=terrainMask&&!map.playerFootprint?terrainMaskIndex(terrainMask,map.width,map.height):null;this.maskStep=terrainMask?.step;
   for(const o of this.full)for(let y=Math.floor(o.y/this.tile);y<=Math.floor((o.y+o.h)/this.tile);y++)for(let x=Math.floor(o.x/this.tile);x<=Math.floor((o.x+o.w)/this.tile);x++){const key=x+':'+y,items=this.buckets.get(key)||[];items.push(o);this.buckets.set(key,items);}
   if(map.segmentBlocked)this.map.segmentBlocked=(a,b,r)=>map.segmentBlocked(a,b,r,this.candidates(a,b,r+.1));
   this.buildRows(this.rows);
   // This graph omits exact edge checks: it is a superset of A* connectivity,
   // so disconnected components prove no route without changing valid routes.
   this.components=gridComponents(this.grid,this.cols,this.rows);
   this.edgeKnown=this.grid?new Uint8Array(this.grid.length):null;this.edgeOpen=this.grid?new Uint8Array(this.grid.length):null;
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
  provenOpen(a,b,r){
   if(!this.terrainIndex||!Number.isFinite(r)||r<0)return false;
   // The original DDA has direction-sensitive endpoint ties at mask boundaries.
   // Keep those exact legacy decisions; rectangle openness alone is insufficient.
   const boundary=v=>Math.abs(v-Math.round(v))<1e-8;
   if((a.x>b.x||a.y>b.y)&&[0,-r,r].some(o=>boundary((b.x+o)/this.maskStep)||boundary((b.y+o)/this.maskStep)))return false;
   // Include the exact predicate's obstacle epsilon and every mask-line offset.
   const pad=r+.1,x0=Math.min(a.x,b.x)-pad,y0=Math.min(a.y,b.y)-pad,x1=Math.max(a.x,b.x)+pad,y1=Math.max(a.y,b.y)+pad;
   if(!this.terrainIndex.open(x0,y0,x1,y1))return false;
   return !this.candidates(a,b,pad).some(o=>o.isSolid!==false&&o.blocksMovement!==false&&o.x<=x1&&o.x+o.w>=x0&&o.y<=y1&&o.y+o.h>=y0);
  }
  gridEdge(a,b){
   if(!this.edgeKnown||a.x<0||a.y<0||b.x<0||b.y<0||a.x>=this.map.width||a.y>=this.map.height||b.x>=this.map.width||b.y>=this.map.height)return null;
   const half=this.cell/2;if(a.x%this.cell!==half||a.y%this.cell!==half||b.x%this.cell!==half||b.y%this.cell!==half)return null;
   const dx=(b.x-a.x)/this.cell,dy=(b.y-a.y)/this.cell;if(Math.abs(dx)>1||Math.abs(dy)>1||(!dx&&!dy))return null;
   const slot=(dy+1)*3+dx+1;return {id:Math.floor(a.y/this.cell)*this.cols+Math.floor(a.x/this.cell),bit:1<<(slot>4?slot-1:slot)};
  }
  path(start,requested){
   const end=this.nearest(requested);if(!end||!this.walkable(start.x,start.y))return [];
   if(this.clear(start,end))return [end];
   const sx=Math.floor(start.x/this.cell),sy=Math.floor(start.y/this.cell),ex=Math.floor(end.x/this.cell),ey=Math.floor(end.y/this.cell),sid=sy*this.cols+sx,eid=ey*this.cols+ex;
   if(sid!==eid){
    if(this.components){const destination=this.components[eid],source=this.components[sid];
     if(!destination)return [];
     if(source){if(source!==destination)return [];}
     else if(![[sx-1,sy],[sx+1,sy],[sx,sy-1],[sx,sy+1]].some(([x,y])=>x>=0&&y>=0&&x<this.cols&&y<this.rows&&this.components[y*this.cols+x]===destination))return [];
    }
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
  memo(cache,key,limit,run){if(cache.has(key))return cache.get(key);const value=run();if(cache.size>=limit)cache.delete(cache.keys().next().value);cache.set(key,value);return value;}
  // Static geometry only; exact numeric keys, no rounding and bounded per-map memory.
  walkable(x,y,r=this.radius){const run=()=>{const p={x,y};return this.provenOpen(p,p,r)||this.scoped(p,p,r,()=>super.walkable(x,y,r));};return [x,y,r].every(Number.isFinite)?this.memo(this.walkMemo,[x,y,r].join(','),4096,run):run();}
  clear(a,b){const run=()=>this.provenOpen(a,b,this.radius)||this.scoped(a,b,this.radius,()=>super.clear(a,b)),edge=this.gridEdge(a,b);
   if(edge){const {id,bit}=edge;if(this.edgeKnown[id]&bit)return !!(this.edgeOpen[id]&bit);const value=run();this.edgeKnown[id]|=bit;if(value)this.edgeOpen[id]|=bit;return value;}
   return [a.x,a.y,b.x,b.y].every(Number.isFinite)?this.memo(this.clearMemo,[a.x,a.y,b.x,b.y].join(','),8192,run):run();}
  projectileClear(a,b){return this.scoped(a,b,0,()=>super.projectileClear(a,b));}
 }
 return new Indexed();
}
module.exports={indexedNavigation};
