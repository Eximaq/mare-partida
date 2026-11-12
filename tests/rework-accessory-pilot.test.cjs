const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../player-rework-accessory-pilot.js'),vendor=require('../tools/rework-accessories/vendor.js');
const base=path.join(__dirname,'../tools/rework-accessories'),manifest=require(base+'/manifest.json');
const catalogs=Object.fromEntries(Object.keys(api.PACKAGE_TYPES).map(p=>[p,require(base+'/'+p+'/catalog.json')]));
const choice=api.selections(manifest,catalogs)[0];
function options(extra={}){return {enabled:true,manifest,catalogs,selection:{package:choice.package,snapshot:choice.snapshot},vendor,makeCanvas:()=>{},loadImage:async()=>({width:512,height:512}),...extra};}
test('default is disabled and source snapshots cover exact supplied records only',()=>{assert.equal(api.create().active,false);assert.equal(api.selections(manifest,catalogs).reduce((n,s)=>n+s.directions.length,0),837);});
test('no unsupported actions/directions or transformations fall back',async()=>{const p=api.create(options());assert.equal(p.active,true);assert.equal(await p.prepare({}, {action:'walk'}),false);assert.match(p.snapshot().error,/not covered/);assert.equal(p.draw({}, {zoanTransformed:true}),false);assert.match(p.snapshot().error,/Transformation/);assert.equal(await p.prepare({}, {direction:'bad'}),false);assert.match(p.snapshot().error,/No exact/);});
test('mismatched hashes and missing snapshots block explicitly',()=>{let p=api.create(options({selection:{package:choice.package,snapshot:'fake'}}));assert.equal(p.snapshot().state,'blocked');const m=JSON.parse(JSON.stringify(manifest));m.records.find(r=>r.target.snapshot===choice.snapshot).target.packSHA256='0'.repeat(64);p=api.create(options({manifest:m}));assert.equal(p.snapshot().state,'blocked');});
test('failed assets are explicit, not rendering old art or retrying forever',async()=>{let count=0;const p=api.create(options({loadImage:async()=>{count++;throw Error('offline')}}));assert.equal(await p.prepare({}, {direction:choice.directions[0]}),false);assert.equal(p.snapshot().state,'failed');assert.equal(await p.prepare({}, {direction:choice.directions[0]}),false);assert.equal(count,1);});
test('headgear exact records do not propagate hideHair to sibling styles',()=>{const head=manifest.records.find(r=>r.package.includes('headgear')&&r.adjustment.hideHair);const before=JSON.stringify(catalogs);const p=api.create(options({selection:{package:head.package,snapshot:head.target.snapshot}}));assert.equal(p.snapshot().state,'loading');assert.equal(JSON.stringify(catalogs),before);assert.deepEqual(p.snapshot().supportedDirections,manifest.records.filter(r=>r.package===head.package&&r.target.snapshot===head.target.snapshot).map(r=>r.target.direction));});
const browser=require('../player-rework-accessory-test.js');
test('browser factory is explicit opt-in; validates selection and fails closed',async()=>{
 assert.equal(browser.create({search:''}).active,false);
 const fetchJSON=async url=>{if(url.endsWith('manifest.json'))return manifest;const p=Object.keys(catalogs).find(p=>url.includes(p));return catalogs[p];};
 const p=browser.create({search:'?reworkTest=accessories&accessory=99999',fetchJSON});
 assert.equal(p.active,true);assert.equal(await p.prepare({},{}),false);assert.match(p.snapshot().error,/index/);
});
