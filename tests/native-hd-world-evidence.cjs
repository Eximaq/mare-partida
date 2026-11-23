'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const directions = ['south', 'north', 'east', 'west'];
const actions = ['idle', 'walk', 'attack-unarmed'];

function registeredWardrobes(records) {
 const families = new Map();
 for (const record of records) {
  const key = JSON.stringify([record.body, Object.entries(record.equipment).sort()]);
  if (!families.has(key)) families.set(key, []);
  families.get(key).push(record);
 }
 return [...families.values()].filter(rows => directions.every(direction =>
  actions.every(action => rows.some(row => row.direction === direction && row.action === action))));
}

function capturePlan(catalog, families, selected = 'all') {
 assert.equal(catalog.length, 42);
 assert.equal(new Set(catalog).size, 42);
 assert(catalog.includes(0));
 assert(families.length >= 86, 'Expected at least the 86 complete registered wardrobes');
 assert(['all','weapons','wardrobe'].includes(selected), 'Unknown capture group: ' + selected);
 const weapons = selected !== 'wardrobe';
 const wardrobe = selected !== 'weapons';
 // Male base and weapons use five poses. Each female weapon uses twelve.
 const weaponCount = (1 + catalog.length) * 5 + catalog.length * 12;
 const materialAndPants = 5 + 9 + 12 + 2 * 5 * 6 + 4 * 4;
 const maleHeads = 9 * 12 + 8 * 12 + 11;
 const femaleHeads = 11 * 13 - 1 + 10 + 12;
 const outfitCount = 5 * 12 + families.length * 3;
 const wardrobeCount = materialAndPants + maleHeads + femaleHeads + outfitCount;
 return {weapons, wardrobe, expected: (weapons ? weaponCount : 0) + (wardrobe ? wardrobeCount : 0)};
}

// Keep runtime.json valid between poses without rewriting all previous snapshots.
// Positional writes replace only the closing metadata and append the next row.
async function openReport(filename, url, errors) {
 const file = await fs.open(filename, 'w');
 const prefix = '{"url":' + JSON.stringify(url) + ',"evidence":[';
 let end = Buffer.byteLength(prefix), count = 0;
 const tail = () => '],"errors":' + JSON.stringify(errors) + '}';
 await file.writeFile(prefix + tail());
 async function writeAt(text, position) {
  const bytes = Buffer.from(text);
  for (let done = 0; done < bytes.length;) {
   const result = await file.write(bytes, done, bytes.length - done, position + done);
   if (!result.bytesWritten) throw Error('Short write in runtime report');
   done += result.bytesWritten;
  }
 }
 return {
  get count() { return count; },
  async record(row) {
   const entry = (count ? ',' : '') + JSON.stringify(row);
   await writeAt(entry + tail(), end);
   end += Buffer.byteLength(entry);
   count++;
   if (count % 50 === 0) console.log('Verified ' + count + ' native world poses');
  },
  async close() {
   try {
    const footer = tail();
    await writeAt(footer, end);
    await file.truncate(end + Buffer.byteLength(footer));
   } finally { await file.close(); }
  }
 };
}

module.exports = {capturePlan, registeredWardrobes, openReport};
