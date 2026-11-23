'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {complete, fingerprint, gear, slots, weapons} = require('./audit-hd-wardrobe-product.cjs');
const {trusted} = require('./audit-hd-slot-independence.cjs');
const {make} = require('../tests/rework-integration-support.cjs');

const root = process.env.HD_PUBLISHED_ROOT;
assert(root, 'Set HD_PUBLISHED_ROOT to the exported game');
const runtime = file => require(path.join(root, file));
const world = runtime('paper-doll-96-lobby.js');
const appearance = runtime('character-appearance.js');
const catalog = runtime('tools/paper-doll-96-v3/weapons.json');
runtime('player-rework-sword0-checkpoint.js');

const evidence = path.join(__dirname, '../docs/native-hd/qa-wardrobe/manopla-e-adagas-laterais');
const recorded = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(evidence, name))));
const contextKey = r => [r.weapon ?? 'bare', r.role, r.body, r.direction, r.action].join('_');
function contexts(all) {
 const cycles = recorded('ciclos-no-mapa-114.json.gz').rows;
 const replay = new Map(cycles.map(row => [contextKey(row), row]));
 assert.equal(replay.size, 114);
 if (!all) return cycles;
 const entries = recorded('produtos-1176-por-contexto.json.gz').rows;
 const roles = new Set(weapons.map(w => w.role));
 assert.equal(entries.length, (weapons.length + roles.size) * 2 * 4 * 3);
 assert.equal(new Set(entries.map(r => r.context)).size, 1176);
 // Replay the exact loadouts from the map where available. Else sample one
 // mixed outfit deterministically so runs on different builds are comparable.
 return entries.map(({context}, i) => {
  if (replay.has(context)) return replay.get(context);
  const [id, role, body, direction, action] = context.split('_');
  const weapon = id === 'bare' ? null : Number(id);
  assert(weapon == null ? roles.has(role) : weapons.some(w => w.id === weapon && w.role === role));
  const ids = Object.fromEntries(slots.map((slot, k) => [slot, gear[k][(i * (k + 1) + Math.floor(i / 11) + k) % gear[k].length]]));
  return {weapon, role, body, direction, action, ids};
 });
}

function inspect(api, cases, hairStyle, eyeStyle) {
 assert(Object.hasOwn(appearance.choices.hairStyle, hairStyle) && Object.hasOwn(appearance.choices.eyeStyle, eyeStyle));
 const rows = [];
 for (const {weapon, role, body, direction, action, ids} of cases) {
  const held = weapon == null ? {} : {weapon:{def:weapon}};
  const options = {action, direction, consumer:'world'};
  const p = appearance.commit({classId:role, equipment:held}, {
   gender:body, hairStyle, eyeStyle, skinColor:'ebony', hairColor:'blue', eyeColor:'green'
  }, () => true);
  assert.equal(p.appearance96.hairStyle, hairStyle);
  assert.equal(p.appearance96.eyeStyle, eyeStyle);
  const saved = JSON.stringify(p.appearance96);
  const pieces = slots.map((s,k) => {assert(gear[k].includes(ids[s])); return [s,ids[s]];});
  const bare = world.selectWorldHDOnly(api,catalog,p,options);
  const equipment = {...held,...Object.fromEntries(pieces.map(([s,def]) => [s,{def}]))};
  const outfit = world.selectWorldHDOnly(api,catalog,{...p,equipment},options);
  const receiver = complete(bare,[],weapon,options);
  const selected = complete(outfit,pieces,weapon,options);
  const missing = Object.entries(equipment).filter(([s,item]) => !trusted(outfit,s,item.def)).map(([s]) => s);
  rows.push({weapon,role,body,direction,action,ids,receiver,selected,
   ...(!receiver||!selected ? {missing,source:outfit?.id??null,details:outfit?.slotResolution??null} : {})});
  assert.equal(JSON.stringify(p.appearance96), saved);
 }
 const gaps = rows.filter(r => !r.receiver || !r.selected);
 return {stage:'selection',rows,hairStyle,eyeStyle,contexts:rows.length,withReceiver:rows.filter(r=>r.receiver).length,selected:rows.filter(r=>r.selected).length,gaps:gaps.length};
}

async function main() {
 const hairStyle = process.env.WARDROBE_HAIR || 'hair-cropped';
 const everyEye = process.argv.includes('--all-eye-styles');
 const eyeStyles = everyEye ? Object.keys(appearance.choices.eyeStyle) : [process.env.WARDROBE_EYES || 'original'];
 const cases = contexts(process.argv.includes('--all-contexts'));
 const api = make();
 await api.ready;
 assert(await api.warmSwordCheckpoint());
 const build = fingerprint();
 const summaries = [];
 let result;
 for (const eyes of eyeStyles) {
  const {rows, ...summary} = inspect(api, cases, hairStyle, eyes);
  const failed = rows.filter(row => !row.receiver || !row.selected);
  if (failed.length) {console.error(JSON.stringify(failed[0])); process.exitCode = 1;}
  summaries.push({...summary, failed});
  if (!everyEye) result = {...summary, build, rows};
 }
 if (everyEye) result = {stage:'selection', build, hairStyle, contextsPerAppearance:cases.length, summaries};
 if (process.env.WARDROBE_EVIDENCE) fs.writeFileSync(process.env.WARDROBE_EVIDENCE, JSON.stringify(result));
 console.log(JSON.stringify({build, summaries:summaries.map(({failed,...summary}) => summary)}));
}
main().catch(error => {console.error(error);process.exitCode=1;});
