'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('offscreen portal drawing is culled while an edge-overlapping label remains visible',()=>{
 let strokes=0;const ctx=new Proxy({}, {get:(_,key)=>key==='stroke'?()=>strokes++:()=>{},set:()=>true});
 const c=vm.createContext({ctx,world:{time:1},lobbyDestination:null,camera:{x:1000,y:1000},W:800,H:600,MareLobby:{portals:[{x:100,y:100}]}});
 vm.runInContext(fn('drawTownActors'),c);vm.runInContext('drawTownActors()',c);assert.equal(strokes,0);
 c.MareLobby.portals=[{x:950,y:1100}];vm.runInContext('drawTownActors()',c);assert.equal(strokes,1);
});
test('unchanged map status does not rewrite DOM each frame; load/failure/recovery still update',()=>{
 let state='loading',writes=0,draws=0;
 const text={set textContent(v){writes++;}},loading={dataset:{},classList:{toggle(){}},querySelector:()=>text};
 const c=vm.createContext({game:{},mapArtState:()=>state,$:()=>loading,ctx:{fillRect(){}},W:100,H:100,drawWorld:()=>draws++,drawPaperDollDiagnostics(){}});
 vm.runInContext(fn('presentWorld'),c);for(let i=0;i<60;i++)vm.runInContext('presentWorld()',c);
 assert.equal(writes,1);state='failed';vm.runInContext('presentWorld()',c);assert.equal(writes,2);
 state='ready';for(let i=0;i<60;i++)vm.runInContext('presentWorld()',c);assert.equal(writes,3);assert.equal(draws,60);
});
test('unchanged player status does not rewrite its text and accessibility state every frame',()=>{
 let state='loading',writes=0,busyWrites=0;const node={dataset:{},classList:{toggle(){}},set textContent(v){writes++;}};
 const c=vm.createContext({game:{},lobby96:{snapshot:()=>({visualState:state})},$:id=>id==='playerVisualStatus'?node:{setAttribute(){busyWrites++;}}});
 vm.runInContext(fn('updatePlayerVisualStatus'),c);for(let i=0;i<60;i++)vm.runInContext('updatePlayerVisualStatus()',c);
 assert.equal(writes,1);assert.equal(busyWrites,1);state='ready';vm.runInContext('updatePlayerVisualStatus()',c);assert.equal(writes,2);
 state='failed';vm.runInContext('updatePlayerVisualStatus()',c);assert.equal(writes,3);
});
test('NPCs outside the viewport skip sprite and label work without clipping edge labels',()=>{
 const calls=[],sprite={complete:true,naturalWidth:92};
 const ctx={save(){},restore(){},drawImage(...args){calls.push(args);}};
 const c=vm.createContext({ctx,npcArt:{ryuma:sprite},MareMapPlayerHud:{drawNPCName(...args){calls.push(args);}},camera:{x:1000,y:1000},W:800,H:600});
 for(const name of ['npcSpriteBounds','drawNPC'])vm.runInContext(fn(name),c);
 c.n={x:100,y:100,art:'ryuma',name:'Shimotsuki Kozaburo',visualWidth:46,visualHeight:90};
 vm.runInContext('drawNPC(n)',c);assert.equal(calls.length,0);
 c.n.x=950;c.n.y=1100;vm.runInContext('drawNPC(n)',c);assert.equal(calls.length,2);
});

test('NPCs draw only the supplied art and name, with mouse and touch bounds derived from the same sprite',()=>{
 const draws=[],labels=[],ctx={save(){},restore(){},drawImage(...args){draws.push(args);}};
 const c=vm.createContext({ctx,npcArt:{},MareMapPlayerHud:{drawNPCName(...args){labels.push(args);}},camera:{x:0,y:0},W:800,H:600});
 for(const name of ['npcSpriteBounds','npcPointerHit','drawNPC'])vm.runInContext(fn(name),c);
 for(const [art,name,slug,w,h] of [
  ['luffy','Luffy','luffy',35,86],['nami','Nami','nami',33,86],
  ['ryuma','Shimotsuki Kozaburo','shimotsuki-kozaburo',46,90],['donquixote','Donquixote','donquixote',66,96],
 ]){
  const path=require('node:path').join(__dirname,'../assets/npcs/'+slug+'-map.png');
  const png=fs.readFileSync(path);
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20),png[25]],[2*w,2*h,6]);
  const x=200,y=300,left=Math.round(x-w/2),top=y-h;
  const sprite={complete:true,naturalWidth:2*w};
  c.n={x,y,art,name,visualWidth:w,visualHeight:h};c.npcArt[art]=sprite;
  vm.runInContext('drawNPC(n)',c);
  assert.deepEqual(draws.pop(),[sprite,left,top,w,h]);
  assert.deepEqual(labels.pop(),[ctx,x,top-7,name]);
  assert(vm.runInContext('npcPointerHit(n,n.x,n.y-n.visualHeight+1,"mouse")',c));
  assert(!vm.runInContext('npcPointerHit(n,n.x,n.y+18,"mouse")',c),'old interaction caption is outside the hit area');
  c.left=left;
  assert(!vm.runInContext('npcPointerHit(n,left-3,n.y-40,"mouse")',c));
  assert(vm.runInContext('npcPointerHit(n,left-3,n.y-40,"touch")',c));
 }
 assert.deepEqual(draws,[]);assert.deepEqual(labels,[]);
});
test('HUD integer formatting reuses one formatter while preserving Portuguese output',()=>{
 let made=0;const c=vm.createContext({Intl:{NumberFormat:class{constructor(locale){made++;this.f=new Intl.NumberFormat(locale);}format(n){return this.f.format(n);}}}});
 vm.runInContext(source.slice(source.indexOf('  const fmt ='),source.indexOf('  const escapeHTML')),c);
 for(const n of [0,1234.8,-12.3,1000000,Infinity,NaN]){c.value=n;assert.equal(vm.runInContext('fmt(value)',c),Math.floor(n).toLocaleString('pt-BR'));}
 assert.equal(made,1);
});
test('busy/control notifications retain status without reprojecting unchanged server data',()=>{
 let projections=0,updates=0;const nodes={};
 const c=vm.createContext({game:{hp:10},session:{},ONLINE_GAME:{data:{online:{state:{version:1,gold:'8'},battle:{},combat:{}}},available:true,controlled:true},onlineProjectionSnapshot:null,
  MareOnlineGameUI:{project(g){projections++;return g;}},applyOnlineEquipment(){},syncOnlineWorld(){},syncOnlineBattle(){},updateUI(){updates++;},scene:'lobby',onlineInventoryStamp:null,
  $:id=>nodes[id]??=( {} )});
 vm.runInContext(fn('syncOnlineGame'),c);for(let i=0;i<4;i++){c.ONLINE_GAME.busy=!!(i%2);vm.runInContext('syncOnlineGame()',c);}
 assert.equal(projections,1);assert.equal(updates,1);
 c.ONLINE_GAME.available=false;vm.runInContext('syncOnlineGame()',c);assert.equal(nodes.combatState.textContent,'CONEXÃO INTERROMPIDA');
 c.ONLINE_GAME.data={...c.ONLINE_GAME.data};vm.runInContext('syncOnlineGame()',c);assert.equal(projections,2);
  c.scene='hunt';c.ONLINE_GAME.available=true;c.ONLINE_GAME.data.online.battle=null;c.ONLINE_GAME.data.online.combat.status='lost';
  vm.runInContext('syncOnlineGame()',c);assert.equal(nodes.combatState.textContent,'DERROTA');
});
