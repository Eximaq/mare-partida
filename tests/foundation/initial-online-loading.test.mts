import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../game.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('  function waitForInitialOnlineWorld('),source.indexOf('  function presentWorld()'));
function fixture(){
 let time=0,progress=0,frame:any,complete:any;
 const appearance=new Promise<boolean>(r=>{complete=r;});
 const context=vm.createContext({performance:{now:()=>time},requestAnimationFrame:(fn:any)=>{frame=fn;},mapArtState:()=> 'ready',lobby96:{snapshot:()=>({progress})}});
 vm.runInContext(code,context);let status='pending',error='';
 const result=context.waitForInitialOnlineWorld(appearance).then(()=>{status='ready';},(e:any)=>{status='failed';error=e.message;});
 return {get status(){return status;},get error(){return error;},result,complete,async step(ms:number,advance=false){time=ms;if(advance)progress++;frame?.(time);await Promise.resolve();await Promise.resolve();}};
}
test('initial appearance continues beyond twenty seconds when preparation is progressing',async()=>{
 const f=fixture();for(let t=1000;t<=30000;t+=1000)await f.step(t,true);
 assert.equal(f.status,'pending','a valid slow cold load must not become a permanent boot error');
 f.complete(true);await Promise.resolve();await f.step(31000,true);await f.result;assert.equal(f.status,'ready');
});
test('an unsuccessful appearance result cannot release the online game',async()=>{
 const f=fixture();f.complete(false);await Promise.resolve();await f.step(100);
 await f.result;assert.equal(f.status,'failed');assert.equal(f.error,'initial_appearance_failed');
});
test('stalled appearance still fails with a bounded timeout',async()=>{
 const f=fixture();await f.step(1000);await f.step(25000);await f.result;
 assert.equal(f.error,'initial_appearance_timeout');
});
test('continuous progress cannot keep an unfinished boot pending indefinitely',async()=>{
 const f=fixture();for(let t=1000;t<=150000&&f.status==='pending';t+=1000)await f.step(t,true);
 assert.equal(f.status,'failed');assert.equal(f.error,'initial_appearance_timeout');
});
