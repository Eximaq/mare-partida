/* Bounded, integrity-checked reader for immutable approved-art ZIP packages. */
(function(root){
'use strict';
const LIMITS=Object.freeze({archive:64*1024*1024,entry:32*1024*1024,total:128*1024*1024,entries:4096});
const decoder=new TextDecoder('utf-8',{fatal:true});
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let bit=0;bit<8;bit++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=(crc>>>8)^crcTable[(crc^b)&255];return (crc^0xffffffff)>>>0;}
function pathOf(bytes){let name;try{name=decoder.decode(bytes);}catch(_){throw Error('Invalid ZIP path encoding');}if(!name||name.startsWith('/')||/[:\\\x00-\x1f\x7f]/.test(name)||name.split('/').some((s,i,a)=>s==='.'||s==='..'||(!s&&i<a.length-1)))throw Error('Unsafe ZIP path');return name;}
function extraValid(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let p=0;p<bytes.length;){if(p+4>bytes.length)throw Error('Invalid ZIP extra');const id=v.getUint16(p,true),n=v.getUint16(p+2,true);if(id===1)throw Error('Unsupported ZIP64');p+=4+n;if(p>bytes.length)throw Error('Invalid ZIP extra');}}
async function loadArchive(input,expectedSHA){
 if(!(input instanceof ArrayBuffer)&&!ArrayBuffer.isView(input))throw Error('ZIP input must be bytes');
 const original=input instanceof ArrayBuffer?new Uint8Array(input):new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 if(original.length>LIMITS.archive)throw Error('ZIP archive limit exceeded');
 const bytes=original.slice(),v=new DataView(bytes.buffer),n=bytes.length;
 if(expectedSHA!==undefined){if(typeof expectedSHA!=='string'||!/^[a-f0-9]{64}$/i.test(expectedSHA))throw Error('Invalid SHA256');if(!root.crypto?.subtle)throw Error('SHA256 unavailable');const hash=new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes));if(Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('')!==expectedSHA.toLowerCase())throw Error('ZIP SHA256 mismatch');}
 let end=-1;for(let p=n-22;p>=Math.max(0,n-22-65535);p--){if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===n){end=p;break;}}
 if(end<0)throw Error('Invalid ZIP end directory');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
 if(count===65535||size===0xffffffff||start===0xffffffff)throw Error('Unsupported ZIP64');
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count)throw Error('Unsupported ZIP multi-disk');
 if(count>LIMITS.entries)throw Error('ZIP entries limit exceeded');
 if(start+size!==end)throw Error('Invalid ZIP directory bounds');
 const records=new Map(),ranges=[];let p=start,total=0;
 for(let i=0;i<count;i++){
  if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP central directory');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),packed=v.getUint32(p+20,true),length=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
  if([packed,length,offset].includes(0xffffffff)||v.getUint16(p+6,true)>=45)throw Error('Unsupported ZIP64/version');
  if(flags&~(0x0800|0x0008|0x0006)||![0,8].includes(method)||v.getUint16(p+34,true)!==0)throw Error('Unsupported ZIP encryption/flags/method/disk');
  if(p+46+nl+xl+cl>end)throw Error('Invalid ZIP entry bounds');
  const nameBytes=bytes.subarray(p+46,p+46+nl),name=pathOf(nameBytes);extraValid(bytes.subarray(p+46+nl,p+46+nl+xl));
  if(records.has(name))throw Error('Duplicate ZIP path');
  total+=length;if(length>LIMITS.entry||total>LIMITS.total)throw Error('ZIP size limit exceeded');
  if(offset+30>start||v.getUint32(offset,true)!==0x04034b50)throw Error('Invalid ZIP local header');
  const localNameLength=v.getUint16(offset+26,true),localExtraLength=v.getUint16(offset+28,true),dataStart=offset+30+localNameLength+localExtraLength;
  if(v.getUint16(offset+6,true)!==flags||v.getUint16(offset+8,true)!==method||dataStart+packed>start||localNameLength!==nl||pathOf(bytes.subarray(offset+30,offset+30+localNameLength))!==name)throw Error('Invalid ZIP local metadata');
  extraValid(bytes.subarray(offset+30+localNameLength,dataStart));
  if(!(flags&8)&&(v.getUint32(offset+14,true)!==crc||v.getUint32(offset+18,true)!==packed||v.getUint32(offset+22,true)!==length))throw Error('Invalid ZIP local sizes');
  if(name.endsWith('/')&&(length!==0||packed!==0&&method===0))throw Error('Invalid ZIP directory entry');
  ranges.push([offset,dataStart+packed]);records.set(name,{name,method,crc,packed,length,dataStart});p+=46+nl+xl+cl;
 }
 if(p!==end)throw Error('Invalid ZIP directory size');
 ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw Error('Overlapping ZIP entries');
 const entries=Object.freeze(Array.from(records.keys()).filter(name=>!name.endsWith('/'))),cache=new Map();
 async function decode(r){
  const compressed=bytes.subarray(r.dataStart,r.dataStart+r.packed);let result;
  if(r.method===0){result=compressed.slice();}else{
   if(typeof root.DecompressionStream!=='function')throw Error('ZIP deflate decompression unavailable');
   const reader=new Blob([compressed]).stream().pipeThrough(new root.DecompressionStream('deflate-raw')).getReader(),chunks=[];let used=0;
   try{while(true){const next=await reader.read();if(next.done)break;used+=next.value.length;if(used>r.length||used>LIMITS.entry){await reader.cancel();throw Error('ZIP decompressed size limit exceeded');}chunks.push(next.value);}}finally{reader.releaseLock();}
   result=new Uint8Array(used);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}
  }
  if(result.length!==r.length)throw Error('ZIP decompressed size mismatch');if(crc32(result)!==r.crc)throw Error('ZIP CRC mismatch');return result;
 }
 async function read(name){const r=records.get(name);if(!r||name.endsWith('/'))throw Error('ZIP entry not found');if(!cache.has(name))cache.set(name,decode(r));return (await cache.get(name)).slice();}
 return Object.freeze({entries,read});
}
const api=Object.freeze({loadArchive,LIMITS});root.MareReworkZip=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
