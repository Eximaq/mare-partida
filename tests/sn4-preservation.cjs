const assert=require('node:assert/strict'),crypto=require('node:crypto'),proof=require('./fixtures/sn4-south-extension.json'),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// c579040 predates the reviewed shoulder fits, four punch-pants families
// and the tenth South phase track for pants 22. Pin their exact content
// before projecting the current index onto the older sealed fixture.
function reviewedExtensions(index){
 const additions=require('./fixtures/modular-after-c579040.json');
 assert.equal(hash(index.authoredPantsSouth.items[22]),additions.south22);
 delete index.authoredPantsSouth.items[22];
 for(const [key,digest] of Object.entries(additions.families)){
  assert.equal(hash(index[key]),digest,key);
  delete index[key];
 }
 for(const [id,proof] of Object.entries(additions.torsos)){
  const row=index.records.find(r=>r.id===id);
  assert.equal(hash(row),proof.reviewed,id);
  const dir=row.pack.directions.north;
  Object.assign(dir.poses[4],proof.phaseFour);
  dir.layers.length=proof.layerCount;
  row.sourceRefs.length=proof.sourceCount;
  assert.equal(hash(row),proof.prior,id+' original');
 }
 return index;
}
exports.priorIndex=source=>{const i=reviewedExtensions(structuredClone(source)),extension=require('./fixtures/sn7-source-provenance.json'),coat130=require('./fixtures/sn7-coat130-source.json');for(const id of['147','168','182']){assert.deepEqual(i.authoredPantsSouth.items[id],extension.entries[id]);delete i.authoredPantsSouth.items[id];}assert.deepEqual(i.authoredPantsSouth.layers.filter(l=>l.item===130),coat130.layers);i.authoredPantsSouth.layers=i.authoredPantsSouth.layers.filter(l=>l.item!==130);assert.equal(hash(i.authoredPantsSouth),proof.descriptorSHA256,'exact SOUTH extension only');delete i.authoredPantsSouth;return i;};
exports.priorArchive=source=>{const a=structuredClone(source),found=a.archives.filter(x=>x.file===proof.archive.file);assert.deepEqual(found,[proof.archive]);const actual=Object.fromEntries(Object.entries(a.sources).filter(([,v])=>v.archive===proof.archive.file));assert.deepEqual(actual,proof.sources);a.archives=a.archives.filter(x=>x.file!==proof.archive.file);for(const k of Object.keys(proof.sources))delete a.sources[k];return a;};
