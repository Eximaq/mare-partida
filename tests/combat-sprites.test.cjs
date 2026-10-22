const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={Image:class{constructor(){this.complete=true;this.naturalWidth=800;}addEventListener(){}},window:{dispatchEvent(){}},Event:class{}};
vm.createContext(scope);vm.runInContext(fs.readFileSync(require.resolve('../faction-sprites.js'),'utf8'),scope);
scope.MareFactionSprites.register({test:{directions:['south'],frame_size:[100,100],anchor:[50,73],reference_height:46,render_height:70,
animations:{death:{url:'death.png',frames:8,fps:8,loop:false,visible_height:{south:46}},idle:{url:'idle.png',frames:4,fps:4,loop:true}}}});
const api=scope.MareFactionSprites;
const idleSheet=api.assets.test.sheets.idle;
api.assets.test.sheets.idle={complete:false,naturalWidth:0};
assert.equal(api.status('test','idle'),'loading');assert.equal(api.frame('test','idle','south',0),null);
api.ensure('test');assert.equal(api.assets.test.sheets.idle.complete,false,'loading does not re-request or replace the cached image');
api.assets.test.sheets.idle={complete:true,naturalWidth:0};
assert.equal(api.status('test','idle'),'failed');assert.equal(api.frame('test','idle','south',0),null);
api.assets.test.sheets.idle=idleSheet;assert.equal(api.status('test','idle'),'ready');assert(api.frame('test','idle','south',0));
assert.equal(api.status('test','missing'),'unsupported');assert.equal(api.status('missing','idle'),'missing');

assert.equal(api.frame('test','death','south',.2).index,1);
assert.equal(api.frame('test','death','south',99).index,7);
assert.equal(api.frame('test','idle','south',1.25).index,1);
assert.equal(api.frame('test','death','north',0),null);
let calls=[];const c={save(){},restore(){},drawImage(...args){calls.push(args)}};
assert(api.draw(c,'test',100,200,{action:'death',time:99}));
assert.equal(calls[0][1],700);assert.equal(calls[0][5],Math.round(100-50*70/46));
assert.equal(calls[0][6],Math.round(200-73*70/46));assert.equal(c.imageSmoothingEnabled,false);
console.log('Combat sprite rendering: one-shot clamp, idle loop, facing, fixed anchor, scale and nearest pixels passed.');

const gameSource=fs.readFileSync(require.resolve('../game.js'),'utf8');
assert(!gameSource.includes('assets/sprites/'),'player never requests legacy base sprites');
assert(!gameSource.includes('function drawHero('),'obsolete procedural player art is removed');
