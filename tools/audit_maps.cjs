'use strict';
// Audits the actual runtime maps. JSON/Tiled cleanup always writes to a separate output.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const MAP_SCRIPTS=['island-world.js','lobby-map-data.js','lobby-world.js','impel-down-world.js','alabasta-map-data.js','alabasta-world.js', 'alubarna-map-data.js', 'alubarna-world.js','ember-world.js','orange-world.js','conchas-world.js','dawn-map-data.js','dawn-world.js','rare-world.js','new-islands-data.js','new-islands-objects.js','new-islands.js','pixellab-world-maps-data.js','conchas-pixellab-data.js','conchas-structures.js','pixellab-world-maps.js','world-system.js'];
function loadMaps(){const context=vm.createContext({console,atob});for(const file of MAP_SCRIPTS)vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});return context;}
function sanitizeDocument(input){
 const document=structuredClone(input),issues=[];
 const walk=(value,where='root')=>{if(!value||typeof value!=='object')return;
  if(value.type==='objectgroup'&&/collision|collider|colisão|colisao/i.test(value.name||'')&&Array.isArray(value.objects)){
   const seen=new Set();value.objects=value.objects.filter((o,i)=>{if(!o||![o.x,o.y].every(Number.isFinite)){issues.push(where+'.objects['+i+']: invalid geometry removed');return false;}if(o.point||o.polygon||o.polyline||o.text)return true;if(![o.width,o.height].every(Number.isFinite)||o.width<=0||o.height<=0){issues.push(where+'.objects['+i+']: empty geometry removed');return false;}const key=JSON.stringify([o.x,o.y,o.width,o.height,o.rotation||0,o.ellipse||false,o.properties||[]]);if(seen.has(key)){issues.push(where+'.objects['+i+']: duplicate collision removed');return false;}seen.add(key);return true;});
  }
  if(value.type==='tilelayer'){
   const clean=(data,label)=>{if(!Array.isArray(data))return;for(let i=0;i<data.length;i++)if(!Number.isInteger(data[i])||data[i]<0||data[i]>0xffffffff){issues.push(label+'['+i+']: invalid tile cleared');data[i]=0;}};
   clean(value.data,where+'.data');for(const [i,chunk]of (value.chunks||[]).entries())clean(chunk.data,where+'.chunks['+i+']');
   if(/^(ground|floor|path|terrain|shallow.water|chão|piso)$/i.test(value.name||''))for(const p of value.properties||[])if(['isSolid','blocksMovement','blocksProjectiles'].includes(p.name)&&p.value!==false){p.value=false;issues.push(where+': '+p.name+' cleared on floor layer');}
  }
  for(const [key,child]of Object.entries(value))if(child&&typeof child==='object'){if(Array.isArray(child))child.forEach((v,i)=>walk(v,where+'.'+key+'['+i+']'));else walk(child,where+'.'+key);}
 };walk(document);return {document,issues};
}
function auditMaps({full=false,mapId=null}={}){
 const ctx=loadMaps(),{maps,Navigation,cleanColliders}=ctx.MareWorld,results=[];
 for(const [id,map]of Object.entries(maps)){
  if(mapId&&id!==mapId)continue;
  const before=map.colliders.length,clean=cleanColliders(map.colliders),invalid=map.colliders.filter(o=>!o||![o.x,o.y,o.w,o.h].every(Number.isFinite)||o.w<=0||o.h<=0).length;
  const nav=new Navigation(map,map.navigationCell||24),world=ctx.MarePixelWorldMaps?.[id]||ctx.MareNewIslands?.[id];
  const goals=[...(map.navigationGoals||world?.districts||[]),...(map.interactions||[]),...(world?.returnPoint?[world.returnPoint]:[]),...(id==='lobby'?Object.values(ctx.MareLobby.npcs):[])];
  const routes=[];for(const goal of goals){for(const [a,b]of [[map.spawn,goal],[goal,map.spawn]]){const route=nav.path(a,b),actor={...a};let ticks=0;while(route.length&&ticks++<10000)nav.follow(actor,route,180,.1);routes.push({goal:goal.id||'service',ok:ticks<10000&&Math.hypot(actor.x-b.x,actor.y-b.y)<1,steps:ticks});}}
  let overlaps=0;for(let i=0;i<clean.length;i++)for(let j=i+1;j<clean.length;j++){const a=clean[i],b=clean[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)overlaps++;}
  let components=null;if(full){const seen=new Uint8Array(nav.grid.length),sizes=[];for(let seed=0;seed<seen.length;seed++){if(seen[seed]||!nav.grid[seed])continue;const queue=[seed];seen[seed]=1;for(let n=0;n<queue.length;n++){const k=queue[n],x=k%nav.cols,y=Math.floor(k/nav.cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=x+dx,ny=y+dy,ni=ny*nav.cols+nx;if(nx<0||ny<0||nx>=nav.cols||ny>=nav.rows||seen[ni]||!nav.grid[ni])continue;if(!nav.clear({x:(x+.5)*nav.cell,y:(y+.5)*nav.cell},{x:(nx+.5)*nav.cell,y:(ny+.5)*nav.cell}))continue;seen[ni]=1;queue.push(ni);}}sizes.push(queue.length);}components=sizes.sort((a,b)=>b-a);}
  results.push({id,width:map.width,height:map.height,gridCells:nav.grid.length,walkableCells:nav.grid.reduce((n,v)=>n+v,0),colliders:before,invalid,duplicatesRemoved:before-clean.length-invalid,overlapsPreserved:overlaps,spawnValid:nav.walkable(map.spawn.x,map.spawn.y),routes,components});
 }
 return {maps:results,summary:{maps:results.length,routes:results.reduce((n,m)=>n+m.routes.length,0),failedRoutes:results.flatMap(m=>m.routes.filter(r=>!r.ok).map(r=>({map:m.id,...r}))),invalid:results.reduce((n,m)=>n+m.invalid,0),duplicatesRemoved:results.reduce((n,m)=>n+m.duplicatesRemoved,0)}};
}
if(require.main===module){const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};if(get('--sanitize')){const file=path.resolve(get('--sanitize')),out=get('--output');if(!out||path.resolve(out)===file)throw Error('Use --output with a separate file; source exports are preserved');const result=sanitizeDocument(JSON.parse(fs.readFileSync(file,'utf8')));fs.writeFileSync(out,JSON.stringify(result.document,null,2)+'\n');console.log(JSON.stringify({issues:result.issues}));}else{const report=auditMaps({full:args.includes('--full'),mapId:get('--map')});if(get('--output'))fs.writeFileSync(get('--output'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));for(const m of report.maps)console.log(m.id+': '+m.gridCells+' cells, '+m.walkableCells+' open, '+m.duplicatesRemoved+' duplicate colliders removed, '+m.routes.filter(r=>r.ok).length+'/'+m.routes.length+' walking routes'+(m.components?', '+m.components.length+' terrain components':''));if(report.summary.failedRoutes.length||report.maps.some(m=>!m.spawnValid))process.exitCode=1;}}
module.exports={loadMaps,auditMaps,sanitizeDocument};
