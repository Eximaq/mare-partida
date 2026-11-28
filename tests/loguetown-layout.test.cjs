'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const {load}=require('../world-catalog.cjs');
const A=require('../archipelago.js'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const districtIds=['cais','avenida','praca','jardins'];
const slotIds=[
 'loguetown-cais-0','loguetown-cais-1',
 'loguetown-avenida-0','loguetown-avenida-1',
 'loguetown-praca-0','loguetown-praca-1',
 'loguetown-jardins-0','loguetown-jardins-1'
];

test('rebuilding Loguetown preserves the three existing map and cover images byte for byte',()=>{
 // Owner-approved originals from 79026bc: layout work must not replace or resize them.
 const originals=[
  ['assets/world-maps/loguetown.png','0ef3f80e73e3e47abba15b9b5dce2ee051af02743d379b6b375636f394562f6a'],
  ['assets/ui/voyage-hd/loguetown.png','3108c8c278d75ed62b3cb0843429bd4f80e40bc4659a950c7a82c29fec4bc9a8'],
  ['assets/exported-maps/loguetown/map.png','074457336e60175987627162b29e8659ad8f10a790c491badbceaf8ff8446f97']
 ];
 for(const [file,sha]of originals){
  const bytes=fs.readFileSync(path.join(__dirname,'..',file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,file+' must retain its original pixels and dimensions');
 }
});

test('travel enters the rebuilt city at the pier while preserving level gates and guard identities',()=>{
 const w=load(),map=w.maps.loguetown,island=A.get('loguetown'),slots=B.slots('loguetown');
 assert.equal(A.canTravel('loguetown',35),false);
 assert.equal(A.canTravel('loguetown',36),true);
 assert.deepEqual(island.recommended,[36,40]);
 assert.deepEqual([map.width,map.height],[4096,3072]);
 assert.deepEqual([map.spawn.x,map.spawn.y],[2048,2736]);
 assert.deepEqual([map.returnPoint.x,map.returnPoint.y,map.returnPoint.radius],[2048,2856,48]);
 assert(Math.hypot(map.spawn.x-map.returnPoint.x,map.spawn.y-map.returnPoint.y)>map.returnPoint.radius+64,'arrival does not immediately trigger the return portal');
 assert.deepEqual(H.get('loguetown').sectors.map(s=>s.id),districtIds);
 assert.deepEqual(slots.map(s=>s.id),slotIds,'saved guard and respawn IDs must survive the layout change');
 for(const slot of slots){
  assert.equal(slot.type,'marinheiro');
  assert.equal(H.profile('loguetown',slot.sector,slot.type,.5).level,40);
  assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>120,'a guard cannot spawn inside the arrival safe area');
 }
});

function walkRoute(nav,start,target,label){
 assert(nav.walkable(start.x,start.y),label+' starts on reachable ground');
 assert(nav.walkable(target.x,target.y),label+' ends on reachable ground');
 const actor={x:start.x,y:start.y},route=nav.path(actor,target);
 assert(route.length,label+' has a route');
 for(const step of route){
  assert(nav.clear(actor,step),label+' does not cut through a wall or water');
  nav.move(actor,step.x-actor.x,step.y-actor.y);
  assert(Math.hypot(actor.x-step.x,actor.y-step.y)<.1,label+' can be followed by real movement');
 }
 assert(Math.hypot(actor.x-target.x,actor.y-target.y)<.1,label+' reaches the requested point, not a substitute endpoint');
}

test('the pier, all eight guards, districts and landmarks form one reachable city in client and server navigation',()=>{
 const w=load(),map=w.maps.loguetown,source=require('../world-map-exports.js').get('loguetown');
 assert.deepEqual(Array.from(map.navigationGoals,g=>g.id),['porto','mercado','plataforma','torre','quartel','jardim','pier-oeste','pier-leste'],'landmark and side pier approaches are available to click navigation');
 const targets=[
  {id:'return',...map.returnPoint},
  ...B.slots('loguetown'),
  ...source.districts.map(d=>({id:'district-'+d.id,x:d.x,y:d.y})),
  ...map.navigationGoals
 ];
 for(const [name,nav]of [['client',w.originalNavigation('loguetown')],['server',w.navigation('loguetown')]]){
  for(const target of targets)walkRoute(nav,map.spawn,target,name+' '+target.id);
  // Return is tested from the far end too, not just from its adjacent entry point.
  const north=targets.reduce((a,b)=>b.y<a.y?b:a);
  walkRoute(nav,north,map.returnPoint,name+' north landmark to port');
  for(const [x,y]of [[0,0],[-16,1500],[4112,1500],[2048,3088]])assert.equal(nav.walkable(x,y),false,name+' rejects outside '+x+','+y);
 }
});

test('the painted city retains the complete new HD source and uses its own polygon silhouettes',()=>{
 const source=require('../world-map-exports.js').get('loguetown'),layout=require('../loguetown-map-data.js');
 assert.equal(source.spriteMode,'painted');
 assert.equal(layout.groundUrl,'assets/loguetown/harbor-city/scene-hd.png');
 const png=fs.readFileSync(path.join(__dirname,'..',layout.groundUrl));
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a','the runtime keeps the lossless original PNG');
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1448,1086],'native image resolution must not be confused with world dimensions');
 assert.deepEqual([layout.imageWidth,layout.imageHeight],[1448,1086],'published source metadata reports the actual HD resolution');
 assert.equal(createHash('sha256').update(png).digest('hex'),'3ba69ac0f94683e805d3872518d152f94222b70ceb81b54cc299ab155d72b9b6','the complete generated source must ship without resizing or changing its pixels');
 const landmarks=['loguetown-clock-tower','loguetown-execution-platform','loguetown-marine-headquarters'];
 for(const id of landmarks)assert(source.props.some(p=>p.id===id),'visible landmark '+id);
 for(const prop of source.props){
  assert(!prop.assetId,prop.id+' must not draw an old object PNG over the new painting');
  assert(prop.polygon?.length>=3,prop.id+' has an authored painting silhouette');
  assert(prop.x>=0&&prop.y>=0&&prop.x+prop.w<=4096&&prop.y+prop.h<=3072,prop.id+' stays inside the visible world');
  const points=prop.polygon.map(p=>Array.isArray(p)?p:[p.x,p.y]);
  // Geometry rounds origins, lengths and vertices separately to two decimals.
  // Their combined edge error is below .02 world units (< .008 source pixels).
  const rounding=.02;
  assert(points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=prop.x-rounding&&y>=prop.y-rounding&&x<=prop.x+prop.w+rounding&&y<=prop.y+prop.h+rounding),prop.id+' polygon stays inside its source crop');
  const twiceArea=points.reduce((sum,[x,y],i)=>{const next=points[(i+1)%points.length];return sum+x*next[1]-next[0]*y;},0);
  assert(Math.abs(twiceArea)>1,prop.id+' silhouette has a visible area');
 }
});

test('HD painting crops use the real source scale, retain smooth detail and restore the shared context',()=>{
 const layout=require('../loguetown-map-data.js');
 const context=vm.createContext({MareLoguetownLayout:layout,Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','loguetown-world.js'),'utf8'),context);
 const renderer=context.MareLoguetown,image=renderer.prepare(),calls=[],stack=[];
 const ctx={imageSmoothingEnabled:false,imageSmoothingQuality:'low',
  save(){stack.push([this.imageSmoothingEnabled,this.imageSmoothingQuality]);},
  restore(){[this.imageSmoothingEnabled,this.imageSmoothingQuality]=stack.pop();},
  drawImage(source,...coordinates){calls.push({source,coordinates,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});}
 };
 assert.equal(image.src,layout.groundUrl);
 assert.equal(renderer.state(),'loading');
 renderer.ground(ctx,{x:3072,y:2304},1024,768);
 assert.equal(calls.length,0,'incomplete painting must never expose the old map');
 image.complete=true;
 assert.equal(renderer.state(),'failed','a missing new image must expose a recoverable loading error');
 image.naturalWidth=1448;image.naturalHeight=1086;
 assert.equal(renderer.state(),'ready');
 renderer.ground(ctx,{x:3072,y:2304},1024,768);
 assert.equal(calls.length,1,'the lower right viewport is inside the world even beyond the native image width');
 assert.equal(calls[0].source,image,'the crop reads the full original image');
 assert.deepEqual(calls[0].coordinates,[1086,814.5,362,271.5,3072,2304,1024,768],'source coordinates scale independently from world coordinates');
 assert.equal(calls[0].smooth,true);assert.equal(calls[0].quality,'high');
 assert.equal(ctx.imageSmoothingEnabled,false,'local painting must not change the character and other map rendering');
 assert.equal(ctx.imageSmoothingQuality,'low');assert.equal(stack.length,0);
});

test('painted landmark feet and walls block movement and shots while their visible street approaches stay open',()=>{
 const w=load(),map=w.maps.loguetown;
 // These probes were selected on the original painting, independently of the
 // collider metadata: the image-to-world ratio must preserve their positions.
 const point=(x,y)=>({x:x*4096/1448,y:y*3072/1086});
 for(const [name,nav]of [['client',w.originalNavigation('loguetown')],['server',w.navigation('loguetown')]]){
  for(const [label,x,y]of [
   ['tower base',460,348],['execution platform base',720,246],
   ['headquarters base',1170,244],['enclosed garden',1100,470]
  ]){const p=point(x,y);assert.equal(nav.walkable(p.x,p.y),false,name+' blocks the painted '+label);}
  for(const [label,x,y]of [['tower passage',530,370],['platform front',720,269],['headquarters courtyard',1165,280]])
   walkRoute(nav,map.spawn,point(x,y),name+' '+label);
  const north=point(715,600),south=point(715,700);
  assert(nav.clear(north,south),name+' central avenue remains open for walking');
  assert(nav.projectileClear(north,south),name+' open avenue has no invisible projectile wall');
  walkRoute(nav,north,south,name+' central avenue');
  assert.equal(nav.projectileClear(point(420,348),point(510,348)),false,name+' solid clock tower blocks shots');
 }
});
