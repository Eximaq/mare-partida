'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const T=require('../talent-system.js'),UI=require('../talent-ui.js');
const game=(classId,level=100)=>T.migrate({classId,level,achievements:{},talentVersion:2,talentBuilds:{}});
for(const classId of Object.keys(T.trees)){
 const g=game(classId),tree=T.getTree(classId),b=T.empty(),config=UI.configFor(g,b);
 assert.equal(config.nodes.length,21);
 assert.deepEqual(config.nodes.filter(n=>n.kind==='common').map(n=>n.id),T.nodes(classId).map(n=>n.id));
 for(const n of config.nodes){assert.equal(n.currentLevel,0);assert.ok(fs.existsSync(n.icon));assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));}
 const a=tree.branches[0].nodes,b0=tree.branches[1].nodes,c=tree.branches[2].nodes;
 b.nodes[a[0].id]=4;assert.equal(UI.configFor(g,b).nodes.find(n=>n.id===a[1].id).state,'locked');
 b.nodes[a[0].id]=5;let cfg=UI.configFor(g,b);assert.equal(cfg.nodes.find(n=>n.id===a[1].id).state,'available');
 assert.ok(cfg.edges.find(e=>e.from===a[0].id&&e.to===a[1].id).active);assert.equal(b.nodes[a[1].id],undefined);
 b.nodes[b0[0].id]=1;assert.equal(UI.configFor(g,b).nodes.find(n=>n.id===c[0].id).state,'locked');
 b.nodes[a[0].id]=10;assert.equal(UI.configFor(g,b).nodes.find(n=>n.id===a[0].id).state,'max');
 assert.ok(UI.configFor(g,b).edges.some(e=>e.from===a[0].id&&e.to==='bridgeStart'&&e.active));
 assert.equal(T.invest(g,b,a[0].id).ok,false);
 const poor=game(classId,1),empty=T.empty();empty.nodes[a[0].id]=1;
 const poorNode=UI.configFor(poor,empty).nodes.find(n=>n.id===a[0].id);
 assert.equal(poorNode.isUnlocked,true);assert.equal(poorNode.canInvest,false);assert.match(poorNode.reason,/insuficientes/);
 // Inspecting dependencies cannot bypass the commit budget.
 const proposal=T.eligibility(poor,empty,a[0].id);assert.equal(proposal.ok,true);
 assert.equal(T.commit(poor,{classId,expectedSeq:poor.talentSeq,build:proposal.build}).ok,false);
 const legacy=game(classId);legacy.talentVersion=1;legacy.talentBuilds[classId]={nodes:{[a[0].id]:5,[a[1].id]:5,[a[2].id]:3},keystone:null,ultimate:null};
 const migrated=T.migrate(legacy);assert.equal(migrated.talentBuilds[classId].nodes[a[2].id],3);
 assert.equal(T.invest(migrated,T.buildFor(migrated),a[2].id).ok,false);
 const pos=config.nodes[0];assert.equal(UI.hitTest(config,pos.x,pos.y).id,pos.id);assert.equal(UI.hitTest(config,-100,-100),null);
}
const calls=[],ctx=new Proxy({filter:'none'},{
 get(o,k){if(k in o)return o[k];return (...args)=>calls.push({name:k,args,filter:o.filter});},
 set(o,k,v){o[k]=v;calls.push({name:'set',key:k,value:v});return true;}
});
global.Image=class{set src(v){this.width=512;this.height=512;this.onload();}};
const g=game('sword'),config=UI.configFor(g,T.empty());UI.renderTalentTree(ctx,config,12,20);
assert.ok(calls.find(c=>c.name==='translate'&&c.args[0]===12&&c.args[1]===20));
const firstDraw=calls.findIndex(c=>c.name==='drawImage'),lastStroke=calls.map(c=>c.name).lastIndexOf('stroke');assert.ok(firstDraw>lastStroke);
assert.ok(calls.filter(c=>c.name==='drawImage').every(c=>c.args[7]<=96&&c.args[8]<=96&&Math.max(c.args[7],c.args[8])===96));
assert.ok(calls.some(c=>c.name==='drawImage'&&c.filter==='grayscale(100%) opacity(50%)'));
assert.ok(calls.some(c=>c.name==='set'&&c.key==='strokeStyle'&&c.value==='#f3ca40'));
assert.ok(calls.some(c=>c.name==='set'&&c.key==='strokeStyle'&&c.value==='#1a365d'));
assert.ok(calls.some(c=>c.name==='fillText'&&c.args[0]==='0/10'));
console.log('Canvas: seven trees, original IDs, prerequisites, budget, max ranks, legacy investments, hit tests, draw order and 96px transparent HD sampling passed.');

const attempts=[];global.Image=class{set src(v){attempts.push(v);this.width=this.height=256;if(v.includes('retry='))this.onload();else this.onerror();}};
UI.renderTalentTree(ctx,{...config,edges:[],nodes:[{...config.nodes[0],icon:'retry-probe.png'}]});
assert.deepEqual(attempts,['retry-probe.png','retry-probe.png?retry=1']);

const crypto=require('node:crypto'),specialManifest=JSON.parse(fs.readFileSync('assets/ui/talents/special/manifest.json','utf8'));
assert.equal(specialManifest.icons.length,42);
const hashes=new Set();for(const icon of specialManifest.icons){const bytes=fs.readFileSync('assets/ui/talents/special/'+icon.file);assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));}assert.equal(hashes.size,42);
const artManifest=JSON.parse(fs.readFileSync('assets/ui/talents/manifest.json','utf8'));assert.equal(artManifest.scene.sha256,crypto.createHash('sha256').update(fs.readFileSync('assets/ui/talents/ocean-background.jpeg')).digest('hex'));

// View bounds apply to every input before transform/painting.
assert.equal(UI.MIN_ZOOM,.58);assert.equal(UI.MAX_ZOOM,1.8);for(const [input,expected] of [[.1,.58],[.58,.58],[1,1],[2,1.8],[NaN,1]])assert.equal(UI.clampZoom(input),expected);

// Maxed and selected art must not acquire another ring in the Canvas layer.
calls.length=0;UI.renderTalentTree(ctx,{...config,nodes:[{...config.nodes[0],state:"max",selected:true,currentLevel:10}]});assert.ok(!calls.some(c=>c.name==="arc"&&c.args[2]===53));
