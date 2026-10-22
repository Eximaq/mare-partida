'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const E=require('../ember-world.js');require('../island-world.js');require('../world-system.js');
const {Navigation,Camera}=MareWorld,nav=new Navigation(E.map);let checks=0;
function test(name,fn){fn();checks++;console.log(name+': passed');}
function walk(start,end){const route=nav.path(start,end),actor={...start,facing:1};assert(route.length,JSON.stringify(end));let frames=0;while(route.length&&frames++<3000){nav.follow(actor,route,180,.05);assert(nav.walkable(actor.x,actor.y));}assert(frames<3000);assert(Math.hypot(actor.x-end.x,actor.y-end.y)<1);}
test('Compact 32x32 grid, 64px cells and unchanged legacy maps',()=>{
 assert.equal(E.COLS,32);assert.equal(E.ROWS,32);assert.equal(E.TILE,64);assert.equal(E.terrain.length,1024);assert.equal(E.map.width,2048);assert.equal(E.map.height,2048);
 for(const t of [0,1,2,3,4])assert(E.terrain.includes(t));assert.equal(MareWorld.maps.hunt.width,3200);assert.equal(MareWorld.maps.lobby.width,2400);
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/ruinas-brasas/manifest.json')));assert.deepEqual(manifest.grid,[32,32]);
});
test('Arrival and quay connected; water/lava blocked outside real bridge',()=>{
 walk(E.map.spawn,E.returnPoint);let blocked=0;
 for(let y=0;y<E.ROWS;y++)for(let x=0;x<E.COLS;x++)if([E.WATER,E.LAVA].includes(E.at(x,y))){const p=E.center(x,y);if(!E.bridges.some(b=>Math.hypot(p.x-(b.a.x+b.b.x)/2,p.y-(b.a.y+b.b.y)/2)<180)){assert(!nav.walkable(p.x,p.y));blocked++;}}
 assert(blocked>300);
});
test('All seven districts reachable on foot in both directions',()=>{assert.equal(E.paths.length,7);for(const point of E.paths){walk(E.map.spawn,point);walk(point,E.map.spawn);}});
test('Single diagonal bridge crosses a real gap and is required to reach fortress',()=>{
 assert.equal(E.bridges.length,1);assert.equal(E.props.filter(p=>p.kind==='bridge').length,1);
 const b=E.bridges[0];assert(![E.WATER,E.LAVA].includes(E.at(Math.floor(b.a.x/64),Math.floor(b.a.y/64))));assert(![E.WATER,E.LAVA].includes(E.at(Math.floor(b.b.x/64),Math.floor(b.b.y/64))));
 let gap=0;for(let i=0;i<=30;i++){const p={x:b.a.x+(b.b.x-b.a.x)*i/30,y:b.a.y+(b.b.y-b.a.y)*i/30};assert(nav.walkable(p.x,p.y),'deck mismatch');if(E.at(Math.floor(p.x/64),Math.floor(p.y/64))===E.LAVA)gap++;}assert(gap>10);walk(b.a,b.b);
 const withoutBridge=new Navigation({...E.map,terrainWalkable:(x,y,r=0)=>{for(const [dx,dy] of [[-r,-r],[r,r],[-r,r],[r,-r]])if([E.WATER,E.LAVA].includes(E.at(Math.floor((x+dx)/64),Math.floor((y+dy)/64))))return false;return true;}});
 assert.equal(withoutBridge.path(E.map.spawn,E.paths.find(p=>p.id==='caldeira')).length,0);
});
test('Terraces block direct crossings; all five stairs are genuinely traversable',()=>{
 assert(E.cliffs.filter(f=>!f.stair).length>20);assert.equal(E.stairs.length,5);
 for(const f of E.cliffs.filter(f=>!f.stair)){const x=(f.tx+.5)*64,y=(f.ty+1)*64;assert(!nav.clear({x,y:y-40},{x,y:y+40}));}
 for(const s of E.stairs){const x=s.x+s.w/2;assert(nav.clear({x,y:s.y-45},{x,y:s.y+45}),s.id);}
 assert.equal(E.elevation(...Object.values(E.center(8,26))),0);assert.equal(E.elevation(...Object.values(E.center(8,19))),1);assert.equal(E.elevation(...Object.values(E.center(15,8))),2);
});
test('Eight building entrances have streets; scenery stands on coherent terrain',()=>{
 assert.equal(E.frontages.length,8);for(const f of E.frontages){walk(f.entrance,f.street);assert.equal(E.at(Math.floor(f.street.x/64),Math.floor(f.street.y/64)),E.STREET);}
 assert.equal(new Set(E.props.map(p=>p.id)).size,E.props.length);
 for(const p of E.props)if(p.kind==='wreck')assert.equal(E.at(p.tx,p.ty),E.WATER);else if(p.kind!=='bridge')assert(![E.WATER,E.LAVA].includes(E.at(p.tx,p.ty)),p.id);
 for(const rect of E.map.colliders)assert(!nav.walkable(rect.x+rect.w/2,rect.y+rect.h/2),rect.id);
 for(const wreck of E.props.filter(p=>p.kind==='wreck'))assert(E.map.colliders.some(c=>c.id===wreck.id&&c.isSolid),wreck.id+' solid wreck');
});
test('Camera clamps desktop/mobile, including a viewport wider than map',()=>{
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[393,852],[2560,1440]]){const camera=new Camera();Object.assign(camera,{width,height});for(const goal of E.paths){camera.update(goal,E.map,1,true);assert(camera.x>=0&&camera.y>=0);assert(camera.x<=Math.max(0,2048-width));assert(camera.y<=Math.max(0,2048-height));assert.deepEqual(camera.screenToWorld(...Object.values(camera.worldToScreen(goal.x,goal.y))),{x:goal.x,y:goal.y});}}
});
test('Original art retained: 48px monsters, native64 terrain, unchanged prop atlas',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/ruinas-brasas/manifest.json')));assert(manifest.ready);assert.equal(Object.keys(manifest.monsters).length,5);assert(manifest.monsters.cesar,'César asset included');
 for(const [id,monster] of Object.entries(manifest.monsters)){if(id==='cesar')continue;assert.equal(monster.frame_width,48);assert.equal(monster.frame_height,48);assert.equal(monster.directions.length,8);const bytes=fs.readFileSync(path.join(__dirname,'..',monster.animations.idle.url));assert.equal(bytes.readUInt32BE(16),48);assert.equal(bytes.readUInt32BE(20),384);}
 for(const t of Object.values(manifest.terrain)){const bytes=fs.readFileSync(path.join(__dirname,'..',t.url));assert.equal(bytes.readUInt32BE(16),64);assert.equal(bytes.readUInt32BE(20),64);}
 const img=fs.readFileSync(path.join(__dirname,'../assets/ruinas-brasas/ruin-props.png')),original=fs.readFileSync(path.join(__dirname,'../pixellab-pip-generations/ruinas-brasas-20261018/ruin-props.png'));assert.equal(crypto.createHash('sha256').update(img).digest('hex'),crypto.createHash('sha256').update(original).digest('hex'));
});
console.log(`${checks} ember-world groups passed.`);
