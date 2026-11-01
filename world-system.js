'use strict';
// World coordinates are independent of the viewport. No dependencies; works with file://.
(() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rect = (id, x, y, w, h) => ({id, x, y, w, h});
  const maps = {
    lobby: {
      id:'lobby', width:3000, height:2000, origin:{x:900,y:620},
      spawn:{x:1440,y:958},
      colliders:[
        rect('deep-water-north',0,0,1105,1014),
        rect('deep-water-south',0,1072,1105,928),
        rect('deep-water-dock-edge',0,1014,976,58),
        rect('north-hall',1202,620,205,92),rect('north-east-hall',1577,620,210,97),
        rect('south-hall',1210,1115,220,75),rect('south-east-hall',1597,1121,230,69),
        rect('market-west',1161,890,65,46),rect('market-east',1559,875,65,46),
        rect('monument',1401,894,20,20),
        ...[[330,174],[747,170],[340,460],[745,459]].map(([x,y],i)=>rect('statue-'+i,900+x-14,620+y-8,28,19))
      ],
      spawnZones:[], interactions:[{id:'expeditions',x:1240,y:826,radius:58}]
    },
    hunt: {
      id:'hunt', width:3200,height:2200,origin:{x:1100,y:800},
      spawn:{x:1660,y:1185},
      colliders:[
        rect('lava-north-west',1100,800,190,150),
        rect('lava-north-east',1918,800,142,215),
        rect('lava-south-west',1100,1247,105,123),
        rect('lava-south-east',1930,1280,130,90),
        rect('return-pillar-west',1608,1250,14,92),rect('return-pillar-east',1681,1250,14,92),
        ...[[247,291],[791,373],[758,125]].map(([x,y],i)=>rect('obelisk-'+i,1100+x-18,800+y-4,38,19))
      ],
      spawnZones:[{x:1400,y:900,w:460,h:320},{x:2100,y:650,w:650,h:900},{x:1280,y:1470,w:1450,h:450}],
      interactions:[{id:'return',x:1649,y:1320,radius:36}]
    }
  };
  if(globalThis.MareIsland){
    Object.assign(maps.lobby,MareIsland.size,{spawn:MareIsland.spawn,origin:{x:0,y:0}});
    maps.lobby.colliders=MareIsland.colliders;
    maps.lobby.terrainWalkable=MareIsland.ground;
    maps.lobby.navigationGoals=MareIsland.paths;
    maps.lobby.interactions=[{id:'expeditions',...MareIsland.npcs.luffy,radius:58}];
  }
  if(globalThis.MareLobby)maps.lobby=MareLobby.map;
  if(globalThis.MareAlabasta)maps.alabasta=MareAlabasta.map;
  if(globalThis.MareAlubarna)for(const [id,w]of Object.entries(MareAlubarna.worlds))maps[id]=w.map;
  if(globalThis.MareImpel)maps['impel-down']=MareImpel.map;
  if(globalThis.MareEmber)maps.embers=MareEmber.map;
  if(globalThis.MareOrange)maps.orange=MareOrange.map;
  if(globalThis.MarePixelWorldMaps?.conchas)maps.conchas=MarePixelWorldMaps.conchas.map;
  else if(globalThis.MareConchas)maps.conchas=MareConchas.map;
  if(globalThis.MareDawn)maps.dawn=MareDawn.map;
  if(globalThis.MareNewIslands){
    for(const id of ['rare','syrup','baratie','arlong'])maps[id]=MareNewIslands[id].map;
  }else if(globalThis.MareRare)maps.rare=MareRare.map;
  if(globalThis.MarePixelWorldMaps){
    maps.orange=MarePixelWorldMaps.orange.map;
    maps.loguetown=MarePixelWorldMaps.loguetown.map;
  }

  // Visual existence is independent of walking/physics. A '.' is absent only in
  // native terrain metadata; dark tiles, walls and water remain real content.
  class Coverage {
    constructor({rows=null,tile=64,x=0,y=0,width,height,version=1}={}){
      this.tile=tile;this.x=x;this.y=y;this.version=version;this.rows=rows;
      this.cols=rows?Math.max(...rows.map(r=>r.length)):Math.ceil(width/tile);
      this.heightCells=rows?rows.length:Math.ceil(height/tile);this.runs=[];
      this.bounds={x,y,w:width??this.cols*tile,h:height??this.heightCells*tile};
      this.present=0;this.queries=0;this.builds=1;
      if(!rows)return;
      const stride=this.cols+1;this.prefix=new Uint32Array(stride*(rows.length+1));
      let minX=this.cols,minY=rows.length,maxX=0,maxY=0;
      for(let cy=0;cy<rows.length;cy++){
        let run=-1;
        for(let cx=0;cx<this.cols;cx++){
          const cell=rows[cy][cx],exists=cell!==undefined&&cell!=='.'&&cell!==' ';
          const k=(cy+1)*stride+cx+1;
          this.prefix[k]=this.prefix[k-1]+this.prefix[k-stride]-this.prefix[k-stride-1]+Number(!exists);
          if(exists){this.present++;minX=Math.min(minX,cx);minY=Math.min(minY,cy);maxX=Math.max(maxX,cx+1);maxY=Math.max(maxY,cy+1);if(run<0)run=cx;}
          if(run>=0&&(!exists||cx===this.cols-1)){const end=exists?cx+1:cx;this.runs.push({x:x+run*tile,y:y+cy*tile,w:(end-run)*tile,h:tile});run=-1;}
        }
      }
      if(this.present)this.bounds={x:x+minX*tile,y:y+minY*tile,w:(maxX-minX)*tile,h:(maxY-minY)*tile};
    }
    exists(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return false;const b=this.bounds;if(x<b.x||y<b.y||x>=b.x+b.w||y>=b.y+b.h)return false;if(!this.rows)return true;const c=this.rows[Math.floor((y-this.y)/this.tile)]?.[Math.floor((x-this.x)/this.tile)];return c!==undefined&&c!=='.'&&c!==' ';}
    contains(x,y,w,h){
      this.queries++;const b=this.bounds;if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||x<b.x||y<b.y||x+w>b.x+b.w+.001||y+h>b.y+b.h+.001)return false;
      if(!this.prefix)return true;
      const x0=Math.floor((x-this.x)/this.tile),y0=Math.floor((y-this.y)/this.tile),x1=Math.ceil((x+w-this.x-.00001)/this.tile),y1=Math.ceil((y+h-this.y-.00001)/this.tile),s=this.cols+1,p=this.prefix;
      return p[y1*s+x1]-p[y0*s+x1]-p[y1*s+x0]+p[y0*s+x0]===0;
    }
    clip(c,camera){
      c.beginPath();if(!this.rows){const b=this.bounds;c.rect(b.x,b.y,b.w,b.h);}
      else for(const r of this.runs)if(r.y+r.h>camera.y&&r.y<camera.y+camera.height&&r.x+r.w>camera.x&&r.x<camera.x+camera.width)c.rect(r.x,r.y,r.w,r.h);
      c.clip();
    }
    snapshot(){return {version:this.version,bounds:{...this.bounds},cells:this.rows?this.present:this.cols*this.heightCells,runs:this.runs.length,queries:this.queries,builds:this.builds};}
  }
  const coverageCache=new WeakMap();
  function coverageFor(map){
    const spec=map.visualCoverage;let cached=coverageCache.get(map);if(cached&&cached.spec===spec&&cached.version===(spec?.version??1))return cached.index;
    let rows=spec?.rows,tile=spec?.tile??64;
    if(!spec){const id=map.id;
      rows=id==='lobby'?globalThis.MareLobbyMapData?.rows:id==='impel-down'?globalThis.MareImpel?.rows:id==='alabasta'?globalThis.MareAlabastaData?.rows:id.startsWith('alubarna-')?globalThis.MareAlubarnaData?.rows:globalThis.MareNewIslandData?.[id]?.rows;
      if(globalThis.MarePixelWorldMaps?.[id])rows=MarePixelWorldMaps[id].data?.terrain??MarePixelWorldMaps[id].source?.terrain??globalThis.MarePixelWorldMapsData?.[id]?.terrain??(id==='conchas'?globalThis.MarePixelConchasData?.terrain:null);
      // Dawn's native transparent offshore areas are intentionally completed with
      // its original water tile INSIDE the finite export. This is not its walk mask.
    }
    const index=new Coverage({width:map.width,height:map.height,...spec,rows,tile});coverageCache.set(map,{spec,version:spec?.version??1,index});return index;
  }
  class Camera {
    constructor(){this.x=0;this.y=0;this.width=960;this.height=570;this.solves=0;this.masked=false;}
    fitZoom(map,w,h,requested=1){const b=coverageFor(map).bounds;return Math.min(1.8,Math.max(requested,Math.ceil(Math.max(w/b.w,h/b.h)*100)/100));}
    update(focus,map,dt=0,snap=false,anchor=focus){
      const coverage=coverageFor(map),b=coverage.bounds,w=this.width,h=this.height;
      const axis=(value,start,size,view)=>size>=view?clamp(value,start,start+size-view):start+(size-view)/2;
      const marginX=Math.min(32,w/4),marginY=Math.min(80,h/4);
      const visible=(x,y)=>anchor.x>=x+marginX&&anchor.x<=x+w-marginX&&anchor.y>=y+marginY&&anchor.y<=y+h-12;
      const keep=(v,a,size,near,far)=>clamp(v,a-size+far,a-near);
      let tx=axis(focus.x-w/2,b.x,b.w,w),ty=axis(focus.y-h/2,b.y,b.h,h);
      tx=axis(keep(tx,anchor.x,w,marginX,marginX),b.x,b.w,w);ty=axis(keep(ty,anchor.y,h,marginY,12),b.y,b.h,h);
      // Only recompute the bounded candidate list when the actor changes cells,
      // viewport/map/version changes, or the cached choice no longer contains it.
      if(!coverage.contains(tx,ty,w,h)){
        const key=[map.id,coverage.version,Math.floor(anchor.x/32),Math.floor(anchor.y/32),w,h].join(':');
        if(this.solveKey!==key){
          this.solveKey=key;this.solves++;this.choice=null;let score=Infinity;
          const values=(desired,start,size,view,a,near,far)=>{
            const lo=Math.max(start,a-view+far),hi=Math.min(start+size-view,a-near);if(lo>hi)return [];
            const set=new Set([clamp(desired,lo,hi),lo,hi]);for(let n=Math.ceil(lo/coverage.tile)*coverage.tile;n<=hi;n+=coverage.tile)set.add(n);return [...set];
          };
          const xs=values(tx,b.x,b.w,w,anchor.x,marginX,marginX),ys=values(ty,b.y,b.h,h,anchor.y,marginY,12);
          for(const y of ys)for(const x of xs){const d=(x-tx)**2+(y-ty)**2;if(d<score&&coverage.contains(x,y,w,h)){score=d;this.choice={x,y};}}
        }
        if(this.choice&&visible(this.choice.x,this.choice.y)){tx=this.choice.x;ty=this.choice.y;}
      }
      const a=snap?1:1-Math.exp(-9*Math.max(0,dt));let nx=axis(this.x+(tx-this.x)*a,b.x,b.w,w),ny=axis(this.y+(ty-this.y)*a,b.y,b.h,h);
      // Interpolation must not cross a hole, nor leave the player off screen.
      if(!visible(nx,ny)||coverage.contains(tx,ty,w,h)&&!coverage.contains(nx,ny,w,h)){nx=tx;ny=ty;}
      this.x=nx;this.y=ny;this.masked=!coverage.contains(nx,ny,w,h);this.map=map;
    }
    begin(c,map){
      // Finite viewport finish, never a navigable extension of the map.
      c.fillStyle='#151217';c.fillRect(0,0,this.width,this.height);
      c.save();c.translate(-Math.round(this.x),-Math.round(this.y));coverageFor(map).clip(c,this);
    }
    screenToWorld(x,y){return {x:x+Math.round(this.x),y:y+Math.round(this.y)};}
    worldToScreen(x,y){return {x:x-Math.round(this.x),y:y-Math.round(this.y)};}
  }
  // Binary heap keeps A* work bounded even for paths across the entire map.
  class Heap {
    constructor(){this.items=[];}
    push(node){const a=this.items;a.push(node);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].f<=node.f)break;a[i]=a[p];i=p;}a[i]=node;}
    pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
  }
  // Sweep the feet footprint rather than only testing separated sample points.
  function segmentRect(a,b,o){let lo=0,hi=1;for(const [v,d,min,max]of [[a.x,b.x-a.x,o.x,o.x+o.w],[a.y,b.y-a.y,o.y,o.y+o.h]]){if(Math.abs(d)<1e-12){if(v<min||v>max)return false;}else{let u=(min-v)/d,w=(max-v)/d;if(u>w)[u,w]=[w,u];lo=Math.max(lo,u);hi=Math.min(hi,w);if(lo>hi)return false;}}return true;}
  function sweptFoot(a,b,o,r,foot){
    if(foot)return segmentRect(a,b,{x:o.x-foot.w/2+.001,y:o.y+.001,w:o.w+foot.w-.002,h:o.h+foot.h-.002});
    if(segmentRect(a,b,o))return true;
    const pointDistance=p=>(p.x-clamp(p.x,o.x,o.x+o.w))**2+(p.y-clamp(p.y,o.y,o.y+o.h))**2;
    if(pointDistance(a)<r*r||pointDistance(b)<r*r)return true;
    const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
    return [[o.x,o.y],[o.x+o.w,o.y],[o.x,o.y+o.h],[o.x+o.w,o.y+o.h]].some(([x,y])=>{const t=len?clamp(((x-a.x)*dx+(y-a.y)*dy)/len,0,1):0;return (a.x+t*dx-x)**2+(a.y+t*dy-y)**2<r*r;});
  }
  function blocksProjectile(o){return o.blocksProjectiles??(o.isSolid!==false&&o.blocksMovement!==false&&(/house|wall|hall|fort|tree|palms|pillar|obelisk|building/i.test(o.id||'')||o.h>=64));}
  function occluded(actor,props,height=74,width=48){return props.some(p=>p.tall!==false&&actor.y<(p.base??p.y+p.h)&&actor.y>p.y&&actor.y-height<p.y+p.h&&actor.x+width/2>p.x&&actor.x-width/2<p.x+p.w);}
  const sortDepth=items=>items.map((item,index)=>({item,index})).sort((a,b)=>(a.item.pivotY??a.item.y)-(b.item.pivotY??b.item.y)||a.index-b.index).map(({item})=>item);
  function cleanColliders(items=[]){const seen=new Set();return items.filter(o=>{if(!o||![o.x,o.y,o.w,o.h].every(Number.isFinite)||o.w<=0||o.h<=0)return false;const key=[o.x,o.y,o.w,o.h,o.isSolid!==false,o.blocksMovement!==false,blocksProjectile(o)].join(':');if(seen.has(key))return false;seen.add(key);return true;});}
  class Navigation {
    constructor(map,cell=24,radius=10,{defer=false}={}){
      this.map=map;map.colliders=cleanColliders(map.colliders);this.cell=cell;this.radius=radius;
      this.cols=Math.ceil(map.width/cell);this.rows=Math.ceil(map.height/cell);
      this.grid=new Uint8Array(this.cols*this.rows);
      this.builtRows=0;this.ready=false;if(!defer)this.buildRows(this.rows);
    }
    buildRows(count=1){
      const end=Math.min(this.rows,this.builtRows+Math.max(1,count));
      for(let y=this.builtRows;y<end;y++)for(let x=0;x<this.cols;x++)this.grid[y*this.cols+x]=this.walkable((x+.5)*this.cell,(y+.5)*this.cell)?1:0;
      this.builtRows=end;this.ready=end===this.rows;return this.ready;
    }
    walkable(x,y,r=this.radius){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<r||y<r||x>this.map.width-r||y>this.map.height-r)return false;
      if(this.map.terrainWalkable&&!this.map.terrainWalkable(x,y,r))return false;
      const foot=this.map.playerFootprint;
      if(foot&&(x<foot.w/2||x>this.map.width-foot.w/2||y<foot.h||y>this.map.height))return false;
      if(foot)return !this.map.colliders.some(o=>o.isSolid!==false&&o.blocksMovement!==false&&
        x-foot.w/2<o.x+o.w&&x+foot.w/2>o.x&&y-foot.h<o.y+o.h&&y>o.y);
      // A small circular footprint at the feet, independent of visual height.
      return !this.map.colliders.some(o=>{
        if(o.isSolid===false||o.blocksMovement===false)return false;
        const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
        return (x-px)**2+(y-py)**2<r*r;
      });
    }
    projectileClear(a,b){if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||[a,b].some(p=>p.x<0||p.y<0||p.x>this.map.width||p.y>this.map.height))return false;return !this.map.colliders.some(o=>blocksProjectile(o)&&segmentRect(a,b,o));}
    clear(a,b){if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||[a,b].some(p=>p.x<0||p.y<0||p.x>this.map.width||p.y>this.map.height))return false;if(this.map.segmentBlocked?.(a,b,this.radius)||this.map.colliders.some(o=>o.isSolid!==false&&o.blocksMovement!==false&&sweptFoot(a,b,o,this.radius,this.map.playerFootprint)))return false;const d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/5));for(let i=0;i<=steps;i++){let t=i/steps;if(!this.walkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
    nearest(p){
      const x=clamp(p.x,this.radius,this.map.width-this.radius),y=clamp(p.y,this.radius,this.map.height-this.radius);
      if(this.walkable(x,y))return {x,y};
      const cx=clamp(Math.floor(x/this.cell),0,this.cols-1),cy=clamp(Math.floor(y/this.cell),0,this.rows-1);
      // A bounded local search avoids silently navigating to another distant district.
      for(let ring=1;ring<=12;ring++){
        let best=null,dist=Infinity;
        for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
          const gx=cx+dx,gy=cy+dy;if(gx<0||gy<0||gx>=this.cols||gy>=this.rows||!this.grid[gy*this.cols+gx])continue;
          const pt={x:(gx+.5)*this.cell,y:(gy+.5)*this.cell},d=Math.hypot(pt.x-x,pt.y-y);
          if(d<dist){best=pt;dist=d;}
        }
        if(best)return best;
      }
      return null;
    }
    path(start,requested){
      const end=this.nearest(requested);if(!end||!this.walkable(start.x,start.y))return [];
      if(this.clear(start,end))return [end];
      const toId=p=>Math.floor(p.y/this.cell)*this.cols+Math.floor(p.x/this.cell);
      const sid=toId(start),eid=toId(end),n=this.grid.length;
      const score=new Float64Array(n);score.fill(Infinity);score[sid]=0;
      const parent=new Int32Array(n);parent.fill(-1);const closed=new Uint8Array(n),open=new Heap();
      const ex=eid%this.cols,ey=Math.floor(eid/this.cols);
      const estimate=(x,y)=>{const dx=Math.abs(ex-x),dy=Math.abs(ey-y);return Math.max(dx,dy)+.41421356*Math.min(dx,dy);};
      open.push({id:sid,f:0});let found=false;
      while(open.items.length){
        const {id}=open.pop();if(closed[id])continue;closed[id]=1;if(id===eid){found=true;break;}
        const x=id%this.cols,y=Math.floor(id/this.cols);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy,ni=ny*this.cols+nx;
          if(nx<0||ny<0||nx>=this.cols||ny>=this.rows||closed[ni]||!this.grid[ni])continue;
          if(dx&&dy&&(!this.grid[y*this.cols+nx]||!this.grid[ny*this.cols+x]))continue;
          const from=id===sid?start:{x:(x+.5)*this.cell,y:(y+.5)*this.cell};
          const to=ni===eid?end:{x:(nx+.5)*this.cell,y:(ny+.5)*this.cell};
          if(!this.clear(from,to))continue;
          const g=score[id]+(dx&&dy?Math.SQRT2:1);if(g>=score[ni])continue;
          parent[ni]=id;score[ni]=g;open.push({id:ni,f:g+estimate(nx,ny)});
        }
      }
      if(!found)return [];
      const raw=[end];for(let id=parent[eid];id!==-1&&id!==sid;id=parent[id])raw.push({x:(id%this.cols+.5)*this.cell,y:(Math.floor(id/this.cols)+.5)*this.cell});raw.reverse();
      const result=[];let from=start;
      for(let i=0;i<raw.length;){let j=i;while(j+1<raw.length&&this.clear(from,raw[j+1]))j++;result.push(raw[j]);from=raw[j];i=j+1;}
      return result;
    }
    move(entity,dx,dy){
      if(![entity.x,entity.y,dx,dy].every(Number.isFinite)||Math.hypot(dx,dy)>Math.hypot(this.map.width,this.map.height)*2)return;
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));
      for(let i=0;i<steps;i++){
        if(this.clear(entity,{x:entity.x+dx/steps,y:entity.y+dy/steps})){
          entity.x+=dx/steps;entity.y+=dy/steps;continue;
        }
        if(this.clear(entity,{x:entity.x+dx/steps,y:entity.y}))entity.x+=dx/steps;
        if(this.clear(entity,{x:entity.x,y:entity.y+dy/steps}))entity.y+=dy/steps;
      }
    }
    follow(entity,path,speed,dt){
      let budget=speed*dt,moved=0;
      while(path.length&&budget>0){
        const p=path[0],dx=p.x-entity.x,dy=p.y-entity.y,d=Math.hypot(dx,dy);
        if(d<.1){path.shift();continue;}
        const step=Math.min(d,budget),x=entity.x,y=entity.y;
        this.move(entity,dx/d*step,dy/d*step);const actual=Math.hypot(entity.x-x,entity.y-y);
        moved+=actual;budget-=step;
        if(actual<step*.8){path.length=0;break;}
        entity.facing=dx<0?-1:dx>0?1:entity.facing;
        entity.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
        if(step>=d-.1)path.shift();
      }
      if(moved>0)entity.walking=.2;return moved;
    }
  }
  globalThis.MareWorld={maps,Camera,Coverage,coverageFor,Navigation,sortDepth,segmentRect,blocksProjectile,cleanColliders,occluded};
})();
