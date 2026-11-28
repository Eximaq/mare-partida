const test=require('node:test'),assert=require('node:assert/strict');
const {createWorldRasterPool}=require('../player-rework-native-hd.js');
test('alternating player frames retain their original alignment without reallocating or repainting on hits',()=>{
 const created=[];
 const get=createWorldRasterPool((width,height)=>{
   const log=[],surface={drawImage:(...args)=>log.push(['draw',...args]),clearRect:(...args)=>log.push(['clear',...args])};
   const canvas={width,height,log,getContext:()=>surface};created.push(canvas);return canvas;
 });
 const pose=(n)=>({canvas:{width:16,height:22},offset:[7,12],rasterSize:[n,n]});
 const a=pose(480),b=pose(600);
 for(let i=0;i<60;i++){get(a);get(b);}
 assert.equal(created.length,2);
 assert.deepEqual(created[0].log,[['draw',a.canvas,7,12]]);
 assert.deepEqual(created[1].log,[['draw',b.canvas,7,12]]);
 for(let i=0;i<28;i++)get(pose(600));
 assert(created.length<=8,'only a bounded number of simultaneous backing stores is needed');
 assert(created.some(c=>c.log.some(entry=>entry[0]==='clear')),'an evicted pose is cleared before reuse');
 assert.equal(get({canvas:b.canvas}),b.canvas);
});
