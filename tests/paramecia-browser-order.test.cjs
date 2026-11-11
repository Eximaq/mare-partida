'use strict';
// Browser-like VM dependency/asset smoke test; not a substitute for browser QA.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
for(const page of ['index.html','ui-preview.html'])test(page+' loads visual adapters before runtimes without CommonJS',async()=>{
 const html=fs.readFileSync(path.join(root,page),'utf8'),tags=[...html.matchAll(/<script([^>]+)src="([^"]+)"[^>]*>/g)],scripts=[...tags.filter(m=>!m[1].includes('defer')),...tags.filter(m=>m[1].includes('defer'))].map(m=>m[2].split('?')[0]);
 const names=new Set(['paramecia-rework-manifest.js','paramecia-rework-data.js','jiki-assembly-art.js','rank-a-data.js','rank-a-expansion.js','rank-a-system.js','rank-b-data.js','rank-b-system.js','rank-c-data.js','rank-c-system.js','rank-c-expansion-data.js','rank-c-expansion.js','jiki-data.js','jiki-system.js','hoya-data.js','hoya-system.js','doru-data.js','doru-system.js','supa-art.js']);
 const selected=scripts.filter(s=>names.has(s));assert.equal(selected.length,names.size);
 const loads=[];class Image{constructor(){this.complete=false;}set src(url){const file=path.join(root,url.split('?')[0]);assert.ok(fs.existsSync(file),url);const b=fs.readFileSync(file);assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a',url);this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.complete=true;loads.push(url);queueMicrotask(()=>this.onload?.());}}
 const context={Image,queueMicrotask};vm.createContext(context);for(const filename of selected)vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),context,{filename});
 for(const fruit of ['ope','mero','doku','ito'])assert.equal(await context.MareRankA.preload('akuma_'+fruit+'_'+fruit),true);
 for(const key of ['MareRankB','MareRankC','MareRankCExpansion','MareHoya','MareJiki','MareDoru'])context[key].preload({actors:false});
 for(const fruit of ['ope','mero','doku','ito','hana','beta','horu','mato','bomu','kobu','hoya','jiki','doru'])assert.ok(loads.some(p=>p.includes('/reworks/'+fruit+'/')),fruit+' preloaded');assert.ok(context.MareSupaArt.animations.slash.image.includes('/reworks/'));
 const calls=[],c={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){calls.push(args);},beginPath(){},ellipse(){},stroke(){},fill(){},fillRect(){}};
 context.MareRankB.draw(c,'punch',0,0,100,{width:96});assert.equal(calls.at(-1)[3],128);
 context.MareRankC.draw(c,'mark',0,0,500,{width:72});assert.equal(calls.at(-1)[3],128);
 context.MareDoru.draw(c,{key:'1',phase:'flight',elapsed:150,x:0,y:0,dx:1,dy:0});assert.equal(calls.at(-1)[7],80);
});
