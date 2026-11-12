const test=require('node:test');
const assert=require('node:assert/strict');
const zlib=require('node:zlib');
const {createHash}=require('node:crypto');
const {loadArchive}=require('../player-rework-zip.js');
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zip(name='frames/0.png',data=Buffer.from('png bytes'),method=8){
 const n=Buffer.from(name),packed=method===8?zlib.deflateRawSync(data):data,l=Buffer.alloc(30),c=Buffer.alloc(46),e=Buffer.alloc(22);
 l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt16LE(method,8);l.writeUInt32LE(crc(data),14);l.writeUInt32LE(packed.length,18);l.writeUInt32LE(data.length,22);l.writeUInt16LE(n.length,26);
 c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,6);c.writeUInt16LE(method,10);c.writeUInt32LE(crc(data),16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);
 const offset=l.length+n.length+packed.length;e.writeUInt32LE(0x06054b50);e.writeUInt16LE(1,8);e.writeUInt16LE(1,10);e.writeUInt32LE(c.length+n.length,12);e.writeUInt32LE(offset,16);
 return {bytes:Buffer.concat([l,n,packed,c,n,e]),central:offset};
}
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const method of [0,8])test('reads exact stored/deflate bytes '+method,async()=>{const {bytes}=zip(undefined,Buffer.from([0,255,1,2]),method),a=await loadArchive(bytes,sha(bytes));assert.deepEqual(a.entries,['frames/0.png']);assert.deepEqual(await a.read('frames/0.png'),new Uint8Array([0,255,1,2]));assert.ok(Object.isFrozen(a.entries));await assert.rejects(a.read('missing'),/not found/);});
test('rejects wrong digest and invalid digest',async()=>{const {bytes}=zip();await assert.rejects(loadArchive(bytes,'0'.repeat(64)),/SHA/);await assert.rejects(loadArchive(bytes,'bad'),/SHA/);});
test('owns input bytes and returns independent output',async()=>{const {bytes}=zip();const a=await loadArchive(bytes);bytes.fill(0);const first=await a.read('frames/0.png');first[0]=0;assert.equal(Buffer.from(await a.read('frames/0.png')).toString(),'png bytes');});
for(const name of ['../x.png','a/../x.png','/x.png','C:/x.png','a\\x.png','a\0x.png','a//x.png'])test('rejects unsafe name '+JSON.stringify(name),async()=>{await assert.rejects(loadArchive(zip(name).bytes),/path/);});
test('rejects encrypted, zip64, unknown compression, multidisk',async()=>{for(const type of ['encrypted','zip64','method','disk']){const {bytes,central:c}=zip();if(type==='encrypted')bytes.writeUInt16LE(1,c+8);if(type==='zip64')bytes.writeUInt32LE(0xffffffff,c+24);if(type==='method')bytes.writeUInt16LE(99,c+10);if(type==='disk')bytes.writeUInt16LE(1,bytes.length-18);await assert.rejects(loadArchive(bytes),/Unsupported|ZIP64/);}});
test('rejects oversized entry before decompression',async()=>{const {bytes,central:c}=zip();bytes.writeUInt32LE(100*1024*1024,c+24);await assert.rejects(loadArchive(bytes),/limit/);});
test('rejects CRC damage',async()=>{const {bytes,central:c}=zip(undefined,Buffer.from('abc'),0);bytes[30+12]^=1;const a=await loadArchive(bytes);await assert.rejects(a.read('frames/0.png'),/CRC/);});
test('rejects invalid local metadata and truncated archives',async()=>{const {bytes}=zip();bytes.writeUInt16LE(0,8);await assert.rejects(loadArchive(bytes),/local/);await assert.rejects(loadArchive(zip().bytes.subarray(0,20)),/ZIP/);});
test('bounds decompressed length even with forged metadata',async()=>{const {bytes,central:c}=zip(undefined,Buffer.alloc(1024,65));bytes.writeUInt32LE(2,c+24);bytes.writeUInt32LE(2,22);const a=await loadArchive(bytes);await assert.rejects(a.read('frames/0.png'),/size|limit/);});
