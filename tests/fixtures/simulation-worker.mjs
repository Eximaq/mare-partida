import {parentPort} from 'node:worker_threads';
parentPort.postMessage({type:'ready'});
const timer=setInterval(()=>{const until=performance.now()+200;while(performance.now()<until){}},250);
parentPort.on('message',m=>{if(m==='stop'){clearInterval(timer);parentPort.close();}});
