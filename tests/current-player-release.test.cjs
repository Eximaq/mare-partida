const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../paper-doll-96-lobby.js'),root='../tools/paper-doll-96-v3/';
const pack=['player-pack.json','manifest.json','appearance-catalog.json','appearance-rig.json','weapons.json'].map(f=>require(root+f));
test('current release owns a versioned native-only resource allowlist',()=>{assert.match(pack[0].assetRevision,/^native96-[a-f0-9]{16}$/);assert(Object.keys(pack[0].resources).length>100);assert.equal(R.validateRelease(...pack),true);});
test('invalid paths, duplicate cosmetic IDs and missing dependencies are rejected',()=>{const clone=()=>pack.map(v=>structuredClone(v));let p=clone();p[0].resources['../old.png']=[84,84];assert.throws(()=>R.validateRelease(...p));p=clone();p[2].styles.push({...p[2].styles[0]});assert.throws(()=>R.validateRelease(...p));p=clone();delete p[0].resources[Object.keys(p[0].resources)[0]];assert.throws(()=>R.validateRelease(...p));});

test('a legacy-sized image cannot masquerade as a current base strip',()=>{const p=pack.map(v=>structuredClone(v)),file=Object.values(p[1].bodies.masculino.clips.idle.south.layers)[0];p[0].resources[file]=[84,84];assert.throws(()=>R.validateRelease(...p));});
