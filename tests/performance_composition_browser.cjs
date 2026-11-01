'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const base=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8160/';
const reference=cp.execFileSync('git',['show','7b14fa7:tools/paper-doll-96-v3/wardrobe.js'],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',maxBuffer:1024*1024});
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(new URL('tools/paper-doll-96-v3/',base).href);await p.waitForFunction(()=>window.__review96v3);const result=await p.evaluate(async reference=>{
const q=__review96v3,Current=MareWardrobe96;eval(reference);const Old=MareWardrobe96;window.MareWardrobe96=Current;
const before=Old.create(q.catalog,q.appearanceRigs,q.image,{weapons:q.weaponCatalog}),after=Current.create(q.catalog,q.appearanceRigs,q.image,{weapons:q.weaponCatalog});
let comparisons=0,differences=0,recolors=0;const original=MareAppearance96.recolor;MareAppearance96.recolor=(...args)=>{recolors++;return original(...args)};
const draw=(w,sel,images,fi,look)=>{const spec=MareMotion96.clipSpec(q.manifest,sel.clip),pad=w.weaponPadding(sel,spec,look),c=document.createElement('canvas');c.width=spec.width+2*pad.x;c.height=spec.height+pad.top+pad.bottom;const cx=c.getContext('2d');cx.translate(pad.x,pad.top);w.draw(cx,images,sel,fi,spec,[],look);return cx.getImageData(0,0,c.width,c.height).data;};
const look={hair:'hair-bob',face:'face-gentle',hairColor:'violet',skin:'ebony',eyeColor:'green',torso:'item-6',pants:'item-21',boots:'item-8',gloves:'original',cloak:'item-24',head:'original',weapon:'original'};
let reuse;for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'])for(const direction of ['south','north','east']){
const sel=q.selection(body,action,direction),files=[...new Set([...Object.values(sel.layers),...after.requiredFiles(sel,look)])],images=new Map(await Promise.all(files.map(async f=>[f,await q.image(f)])));
for(const fi of [...new Set([0,Math.floor(sel.clip.frames/2),sel.clip.frames-1])]){const a=draw(before,sel,images,fi,look),b=draw(after,sel,images,fi,look);for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;comparisons++;}
if(!reuse){recolors=0;draw(after,sel,images,0,look);const first=recolors;draw(after,sel,images,0,look);reuse={first,second:recolors-first};}
}
MareAppearance96.recolor=original;return {comparisons,differences,reuse,skinCacheBytes:after.skinCacheBytes};
},reference);assert.equal(result.differences,0,'optimized composition must preserve every RGBA byte');assert(result.reuse.second<=2,'unchanged skin layers must be reused, recolors='+JSON.stringify(result.reuse));assert(result.skinCacheBytes<=16*1024*1024,'skin cache must have a byte bound');assert.deepEqual(errors,[]);console.log(JSON.stringify(result));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
