'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),X=require('../rank-c-expansion.js'),A=require('../akuma-system.js'),P=require('../akuma-passives.js');
const manifest=require('../assets/akuma/rank-c-expansion-manifest.json');assert.equal(manifest.assets.length,19);for(const f of manifest.assets)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f.asset))).digest('hex'),f.sha256);
assert.equal(Object.values(X.clips).flatMap(x=>Object.values(x)).reduce((n,c)=>n+c.frames,0),120);for(const [key,r]of Object.entries(X.rules)){assert.equal(A.byId(r.id).rank,'C');assert.deepEqual(P.stats[r.id],r.passiveStats);assert.equal(A.byId(r.id).family,r.family);}
const red=X.effects.revolution,initial=red.frames.slice(0,10).reduce((n,f)=>n+f.duration,0),loop=red.frames.slice(10,17).reduce((n,f)=>n+f.duration,0);assert.equal(X.effectFrame('revolution',initial),red.frames[10]);assert.equal(X.effectFrame('revolution',initial+loop),red.frames[10]);for(let t=initial;t<20000;t+=37)assert(red.frames.slice(10,17).includes(X.effectFrame('revolution',t)));
assert.equal(X.effectFrame('deposition',15000,'hold'),X.effects.deposition.frames.at(-1));assert(X.inSplash({x:0,y:0},{x:64,y:64}));assert(!X.inSplash({x:0,y:0},{x:65,y:0}));assert(X.explosionImmune(X.rules.bomu.id,'explosion'));assert(!X.explosionImmune(X.rules.bomu.id,'physical'));
const flag={x:50,y:50,until:2000,view:{width:100,height:100}},actor={x:50,y:50};assert(X.affected(flag,actor,{x:0,y:0,width:100,height:100},1000));assert(!X.affected(flag,actor,{x:100,y:100,width:100,height:100},1000));assert(!X.affected(flag,actor,{x:0,y:0,width:100,height:100},2000));
console.log('Rank C expansion: exact original assets, catalog/passives, Bison clips, frame 11–17 loop, held final frame, 3×3 splash, visibility/expiry and typed explosion immunity passed');

// Padded 80/84px animation exports must retain the same pixel scale as the 64px idle.
const OriginalImage=global.Image;global.Image=class{constructor(){this.complete=true;this.naturalWidth=10000;}};
try{for(const height of [64,96])for(const [action,dirs]of Object.entries(X.clips))for(const [direction,cl]of Object.entries(dirs))for(let i=0;i<cl.frames;i++){
 let args;const c={save(){},restore(){},drawImage(...a){args=a;}};assert(X.drawActor(c,200,300,{action,direction,height,progress:(i+.1)/cl.frames}));
 assert.equal(args[7]/args[3],height/64,action+' '+direction+' keeps pixel scale');assert.equal(args[8]/args[4],height/64);assert.equal(args[5]+args[7]/2,200);assert.ok(Math.abs(args[6]+cl.feet[i]*height/64-300)<=.5,'feet stay on the ground');
}}finally{global.Image=OriginalImage;}
console.log('Bison: all 120 frames preserve identical pixel scale and foot anchor in world/preview sizes');
