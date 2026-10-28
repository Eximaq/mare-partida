const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'pixellab-pip-generations/paper-doll-wardrobe-auto-20261028');
const { createReview } = require(path.join(folder, 'review-model.js'));
const data = JSON.parse(fs.readFileSync(path.join(folder, 'review-data.json')));
const review = createReview(data);
assert.equal(review.pieces.length, 10);
assert.equal(review.get('pants', 'south').reference.status, 'static-candidate');
assert.equal(review.get('eyewear', 'west').reference.status, 'service-error');
assert.equal(review.get('ring', 'east').reference.status, 'not-generated');
assert.equal(review.get('no-such-piece', 'south').piece.id, 'pants');
assert.throws(() => review.get('pants', 'northwest'));
let references = 0, candidates = 0;
for (const piece of review.pieces) {
  assert.equal(piece.productionEnabled, false);
  assert.equal(piece.approved, false);
  assert.equal(piece.complete, false);
  for (const direction of ['south', 'north', 'west', 'east']) {
    const ref = review.get(piece.id, direction).reference;
    if (ref.image) references++;
    if (ref.layer) candidates++;
    for (const field of ['source', 'image', 'layer', 'mask']) {
      if (!ref[field]) continue;
      const bytes = fs.readFileSync(path.join(folder, ref[field]));
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.equal(bytes.readUInt32BE(16), 64);
      assert.equal(bytes.readUInt32BE(20), 64);
    }
  }
}
assert.equal(references, 36);
assert.equal(candidates, 9);
assert.equal(data.usage.transfersSubmitted, 0);
assert.equal(data.usage.retriesSubmitted, 0);
const unsafe = structuredClone(data);
unsafe.pieces[0].references.south.image = '../secret.png';
assert.throws(() => createReview(unsafe));
const duplicate = structuredClone(data);
duplicate.pieces.push(duplicate.pieces[0]);
assert.throws(() => createReview(duplicate));
console.log('Wardrobe review: 36 native references, 9 drafts, blocked production and safe paths verified');
