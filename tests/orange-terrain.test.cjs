'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const O=require('../orange-world.js'),A=require('../terrain-autotile.js'),T=require('../orange-terrain.js'),manifest=require('../assets/terrain/harbor-v2/manifest.json');
const before=Buffer.from(O.terrain),plan=T.surface(O,manifest.layout);
assert.equal(A.BLOB47.length,47);assert.equal(A.blobMask(255),255);assert.equal(A.blobMask(16),0);assert.equal(A.blobMask(19),19);
for(let i=0;i<256;i++){const m=A.blobMask(i);assert.equal(A.blobMask(m),m);assert(A.BLOB47.includes(m));for(const [d,a,b] of [[16,1,2],[32,2,4],[64,4,8],[128,8,1]])if(m&d)assert((m&a)&&(m&b));}
assert.throws(()=>A.blob({tiles:[]}),/47/);assert.throws(()=>A.wang({tiles:[]}),/Incomplete/);
const synthetic=A.BLOB47.map(mask=>({mask,bounding_box:{x:mask,y:0,width:32,height:32}}));assert.equal(A.blob({tiles:synthetic}).size,47);
const images={},pairs=Object.values(manifest.sets).map(s=>{images[s.url]={naturalWidth:128,complete:true};return{...s,image:images[s.url],rules:A.wang({tiles:s.tiles})};});
for(const p of pairs)for(let m=0;m<16;m++){
 const values=[8,4,2,1].map(bit=>m&bit?p.upper:p.lower),bases={[p.lower]:{image:p.image,rect:p.rules.get(0)},[p.upper]:{image:p.image,rect:p.rules.get(15)}};
 const tile=A.choose(values,[p],bases);assert.deepEqual(tile.rect,p.rules.get(m));
}
const banks={};for(const name of Object.keys(manifest.bases))banks[name]={};
let transitions=new Set();for(let y=-1;y<32;y++)for(let x=-1;x<32;x++){
 const values=A.corners(plan.at,x,y),key=[...new Set(values)].sort();assert(key.length<=2,'No unpainted three-material junctions');
 if(key.length===2){transitions.add(key.join('/'));assert(pairs.some(p=>key.every(m=>m===p.lower||m===p.upper)));}
}
for(const pair of ['sand/water','dirt/sand','dirt/grass','grass/stone'])assert(transitions.has(pair));
const config=T.configure(O,manifest,images);let draws=0;
const c={imageSmoothingEnabled:true,drawImage(...args){draws++;assert.equal(args.length,9);assert(args.slice(1).every(Number.isInteger));assert.equal(args[7],64);assert.equal(args[8],64);},clip(){throw Error('Procedural clipping forbidden');},scale(){throw Error('Texture flipping forbidden');}};
for(let y=0;y<4;y++)for(let x=0;x<4;x++)T.drawChunk(c,x,y,config);assert(draws>500);assert(!c.imageSmoothingEnabled);
assert.deepEqual(Buffer.from(O.terrain),before);assert.throws(()=>A.choose(['water','sand','stone','grass'],pairs,banks),/Missing authored/);
const src=fs.readFileSync(path.join(__dirname,'../orange-terrain.js'),'utf8');assert(!src.includes("clip('evenodd')"));assert(!src.includes('Math.random'));
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(html.indexOf('src="terrain-autotile.js"')<html.indexOf('src="orange-terrain.js"'));
console.log('Terrain V2: 47 canonical neighbor masks, complete authored Wang rules, coherent material graph, integer native-sprite draws and immutable world passed.');
