import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
for(const prefix of ['/','/mare-partida/'])test(`shared lobby assets resolve against script URL from a nested online page (${prefix})`,()=>{
 const loaded:string[]=[];const box:any={URL,document:{currentScript:{src:'https://localhost:9443'+prefix+'lobby-world.js'}},location:{href:'https://localhost:9443'+prefix+'online/'},Image:class{set src(value:string){loaded.push(new URL(value,box.location.href).href);}}};
 for(const file of ['lobby-map-data.js','lobby-world.js','world-depth.js']){box.document.currentScript.src='https://localhost:9443'+prefix+file;runInNewContext(readFileSync(new URL('../../'+file,import.meta.url),'utf8'),box);}
 box.MareWorldDepth.regions('lobby');
 assert.ok(loaded.length>1);assert.equal(loaded[0],'https://localhost:9443'+prefix+'assets/lobby-map.png?v=20261022');
 assert.ok(loaded.every(url=>url.startsWith('https://localhost:9443'+prefix+'assets/')),'every depth mask must resolve outside /online/');
});
