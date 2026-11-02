import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('logout and session notification navigate once without aborting the login page',async()=>{
 const handlers:Record<string,Function>={},destinations:string[]=[],timers:Function[]=[];let notify=()=>{};
 const client:any={data:{online:{}},subscribe:(fn:Function)=>notify=fn as ()=>void,logout:async()=>{client.data=null;notify();}};
 const context:any={document:{createElement:()=>({setAttribute(){},dataset:{}}),body:{append(){}},getElementById:()=>({}),addEventListener:(name:string,fn:Function)=>handlers[name]=fn},location:{replace:(url:string)=>destinations.push(url)},setInterval:(fn:Function)=>timers.push(fn),clearInterval:()=>{},addEventListener:()=>{}};
 vm.runInNewContext(readFileSync('apps/account-client/game-ui.js','utf8'),context);
 context.MareOnlineGameUI.mount(client,{sync:()=>{},message:()=>{}});
 handlers.click!({target:{closest:()=>({dataset:{onlineAction:'logout'}})},preventDefault:()=>{},stopImmediatePropagation:()=>{}});
 await new Promise(r=>setImmediate(r));notify();
 assert.deepEqual(destinations,['/online/']);
});
