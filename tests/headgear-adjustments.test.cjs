'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const A=require('../tools/paper-doll-96-v3/appearance.js'),{apply}=require('../tools/apply_headgear_adjustments.cjs'),catalog=require('../tools/paper-doll-96-v3/appearance-catalog.json');
test('head adjustments are bounded, item/body/direction specific and cannot introduce slots or prototype keys',()=>{
 const data={'item-150':{masculino:{east:{x:-3,y:2,scale:100}}}},before=JSON.stringify(data),valid=A.headAdjustmentSet(data,catalog.styles);
 assert.deepEqual(valid,data);assert.equal(JSON.stringify(data),before);
 for(const invalid of [{x:33},{y:NaN},{scale:126},{x:1.5},{extra:1}])assert.throws(()=>A.headAdjustment(invalid));
 for(const invalid of [{'item-130':{masculino:{south:{}}}},{'item-150':{other:{}}},{'item-150':{masculino:{west:{}}}},JSON.parse('{"__proto__":{}}')])assert.throws(()=>A.headAdjustmentSet(invalid,catalog.styles));
});
test('native translation preserves exact RGBA and does not move the neutral anatomy',()=>{
 const src=new Uint8ClampedArray(128*128*4),rest=[{label:'NECK',x:.5,y:.4}];src.set([12,45,210,255],(30*128+64)*4);const old=src.slice();
 const result=A.adjustHead(src,{x:-3,y:4,scale:100},rest);assert.deepEqual(Array.from(result.slice((34*128+61)*4,(34*128+61)*4+4)),[12,45,210,255]);assert.deepEqual(src,old);assert.equal(result.reduce((n,v,i)=>n+(i%4===3&&v?1:0),0),1);
 assert.equal(A.adjustHead(src,{},rest),src);
});
test('exported fit integration rejects stale revisions and preserves the complete item catalog',()=>{
 const input={format:'mare-headgear-fit-v1',baseRevision:catalog.headAdjustmentRevision,adjustments:catalog.headAdjustments},before=JSON.stringify(catalog),next=apply(catalog,input);
 assert.equal(next.styles,catalog.styles);assert.deepEqual(next.headAdjustments,catalog.headAdjustments);assert.equal(JSON.stringify(catalog),before);assert.throws(()=>apply(catalog,{...input,baseRevision:'old'}));
});
test('the requested original hood panels are restored byte for byte',()=>{
 const hashes={
  // Pinned from the merged pre-correction equipment release.
  "tools/paper-doll-96-v3/assets/custom-item-136-masculino-south.png":"74caaf98a225c6b968928596d31026c487c0535dc158848ddcdad7ab1ab36a7e",
  "tools/paper-doll-96-v3/assets/custom-item-136-masculino-east.png":"0c28c98660c211de854639f8e7bcdb84372e20deb331400c7c83915742b0dfe4",
  "tools/paper-doll-96-v3/assets/custom-item-136-masculino-west.png":"646d3877143e6f54ffedffd5dd0dab55ced510d5fc120b6619af12d7ab1fd044",
  "tools/paper-doll-96-v3/assets/custom-item-136-feminino-south.png":"5d62b1f1774028761a0fc369418dfbcea357f1c02ac4af86402cf64309fbe83c",
  "tools/paper-doll-96-v3/assets/custom-item-136-feminino-east.png":"e50a593b480828293a53963e2fefdf202ede2745d4bb5f43b317585bb4830f1b",
  "tools/paper-doll-96-v3/assets/custom-item-136-feminino-west.png":"94b1098ff38b1f5383eb7505c336b49679351728b07897cc50867bbd24fcf0c5"
 };
 for(const [file,expected]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..',file))).digest('hex'),expected);
 assert.equal(catalog.styles.find(s=>s.id==='item-136').headRegistration.masculino.south.aperture,'source-hood-restored');
});
