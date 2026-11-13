/* Same-origin native PNG archives: SHA256+CRC checked; no third-party runtime dependency. */
(function(root){'use strict';
const hash=async bytes=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
function create(index,{baseURL=root.location?.href,prefix='tools/rework-base-hd/archives/',fetchBytes=async url=>{const r=await fetch(url);if(!r.ok)throw Error('HD archive HTTP '+r.status);return new Uint8Array(await r.arrayBuffer());},decode=async bytes=>{const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));try{const image=new Image();image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}}}={}){
 if(index?.schema!=='hd-source-archives-v1')throw Error('Invalid HD archive index');
 const cache=new Map(),pending=new Map(),archives=new Map(index.archives.map(a=>[a.file,a]));
 async function load(path){const sha=/\/([a-f0-9]{64})\.png$/.exec(path)?.[1],source=index.sources[sha];if(!source)throw Error('Unknown HD source');const spec=archives.get(source.archive);if(!spec||!/^[a-zA-Z0-9_-]+\.zip$/.test(spec.file)||source.path!==sha+'.png')throw Error('Invalid HD archive path');
  let zip=cache.get(spec.file);if(!zip){let task=pending.get(spec.file);if(!task){task=(async()=>{const bytes=await fetchBytes(new URL(prefix+spec.file,baseURL).href);if(bytes.length!==spec.bytes)throw Error('HD archive size mismatch');const archive=await root.MareReworkZip.loadArchive(bytes,spec.sha256);cache.set(spec.file,archive);while(cache.size>8)cache.delete(cache.keys().next().value);return archive;})();pending.set(spec.file,task);}try{zip=await task;}finally{pending.delete(spec.file);}}
  cache.delete(spec.file);cache.set(spec.file,zip);const bytes=await zip.read(source.path);if(bytes.length!==source.bytes||await hash(bytes)!==sha)throw Error('HD PNG integrity mismatch');return decode(bytes);
 }
 return {load,snapshot:()=>({archives:cache.size,pending:pending.size,origin:'same-origin',integrity:'SHA256+CRC+PNG-SHA256'})};
}
const api={create};root.MareReworkHDAssets=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
