'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const i=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=i.records.find(x=>x.id==='gauntlet14-south-native-original-source'),own=i.orderedAttackProfiles.find(x=>x.id==='authored-ordered-14-south');
const save=(s,extra={})=>JSON.parse(JSON.stringify(A.commit({id:'held-tool-test',classId:'cyborg',equipment:{weapon:{def:14}},...extra},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:s},()=>true)));
const o={direction:'south',action:'attack',consumer:'world'},pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{await api.ready;const frames=[];const ref=save('light');assert(await api.prepareClip(ref,o));
const get=(p,n)=>{let c;assert(api.draw({save(){},restore(){},drawImage(q){c=q}},p,{...o,progress:(n+.1)/12}));assert.equal(c.width,640);return pix(c)};
for(let n=0;n<12;n++){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-weapon-layers-hd/'+own.states[n].layers[1].url),0,0);frames.push([get(ref,n),pix(c)])}
let checked=0;
for(const s of Object.keys(A.skins)){
const p=save(s),r=api.selectVisual(p,o); assert(r, s);assert.equal(p.appearance96.skinColor,s);
assert.equal(Boolean(r.gauntlet14SouthSavedHead),s==='light');assert.equal(r.w14SouthOwnedSkin,s==='light'?undefined:s);
assert.equal(r.fps,12);assert.deepEqual(r.timeline,stock.timeline);assert.deepEqual(r.pivot,[80,128]);
if(s!=='light')assert.deepEqual(r.states.map(f=>f.layers),own.states.map(f=>f.layers));
assert(await api.prepareClip(p,o));
let changed=0;for(let n=0;n<12;n++){const [b,g]=frames[n],a=get(p,n);
for(let k=0;k<a.length;k+=4){assert.equal(a[k+3],b[k+3]);if(g[k+3]===255)assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));else if(a.readUInt32LE(k)!==b.readUInt32LE(k))changed++}checked++}
assert(s==='light'?changed===0:changed>1000);
for(const q of [save(s,{classId:'brawler'}),save(s,{equipment:{weapon:{def:14},coat:{def:151}}}),save(s,{equipment:{weapon:{def:14,variant:'special'}}})])assert(!api.selectVisual(q,o)?.w14SouthOwnedSkin);
console.log(s,12,changed);global.gc?.();
}assert.equal(checked,96);console.log('PASS',checked);
})().catch(e=>{console.error(e);process.exitCode=1});
