'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../faction-sprites.js'),'utf8');
class Image {addEventListener(){} }
const world={document:{currentScript:{src:'https://game.example/mare/faction-sprites.js?v=build123'}},Image,URL,Event:class {},window:{dispatchEvent(){}},console};vm.runInNewContext(code,world);
const get=world.MareFactionSprites.image;
const relative=new URL(get('assets/actor.png').src);assert.equal(relative.href,'https://game.example/mare/assets/actor.png?v=build123');
const existing=new URL(get('https://cdn.example/actor.png?quality=raw&v=old').src);assert.equal(existing.searchParams.get('quality'),'raw');assert.equal(existing.searchParams.get('v'),'build123');
for(const url of ['blob:https://game.example/476fa130-1302-4e15-9df4-c4101288ebd9','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ']){
 const first=get(url);assert.equal(first.src,url,'Opaque URLs cannot receive cache parameters');assert.equal(get(url),first,'Image cache still reuses its key');
 if(url.startsWith('blob:')){world.MareFactionSprites.forgetImage(url);assert.notEqual(get(url),first,'Releasing imports still evicts blob images');}
}
console.log('Sprite loading: versioned HTTP assets preserved, opaque blob/data image URLs unmodified, cache and import release passed.');
