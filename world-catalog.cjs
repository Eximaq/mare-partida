// Trusted, versioned map sources only. No browser, network, saves or user code.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const scripts=["island-world.js", "lobby-map-data.js", "lobby-world.js", "impel-down-world.js", "alabasta-map-data.js", "alabasta-world.js", "alubarna-map-data.js", "alubarna-world.js", "ember-world.js", "orange-world.js", "conchas-world.js", "dawn-map-data.js", "dawn-world.js", "rare-world.js", "new-islands-data.js", "new-islands-objects.js", "new-islands.js", "pixellab-world-maps-data.js", "conchas-pixellab-data.js", "conchas-structures.js", "pixellab-world-maps.js", "quest-dungeons-data.js", "quest-dungeons-world.js", "skypiea-map-data.js", "skypiea-world.js", "world-map-exports-data.js", "world-map-exports.js", "world-system.js", "archipelago.js"];
const {indexedNavigation}=require('./server-navigation.cjs');
// Exported geometry uses one 'g' cell for each walkable 16px terrain tile.
function exportedTerrainMask(source, step) {
  const cols = source.width / step;
  const rows = source.height / step;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) ||
      source.rows.length !== rows || source.rows.some(row => row.length !== cols)) return undefined;
  const bits = Buffer.alloc(Math.ceil(cols * rows / 8));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (source.rows[y][x] === 'g') {
        const i = y * cols + x;
        bits[i >> 3] |= 1 << (i & 7);
      }
    }
  }
  return {cols, rows, step, bits: bits.toString('base64')};
}
let loaded;
function load(){if(loaded)return loaded;const c=vm.createContext({atob,Math}),hash=createHash('sha256');
 // Keep the same host Math object, but resolve it lexically inside the VM.
 // Terrain sampling otherwise crosses the context global proxy ~1M times
 // for a single cold Dawn route. No geometry, arithmetic or path cache changes.
 vm.runInContext('const Math = globalThis.Math;',c,{timeout:3000});
 for(const file of scripts){const source=fs.readFileSync(path.join(__dirname,file),'utf8').replaceAll('\r\n','\n');hash.update(file).update(source);vm.runInContext(source,c,{filename:file,timeout:3000});}
 for(const file of ['server-navigation.cjs','server-terrain-mask.cjs'])hash.update(file).update(fs.readFileSync(path.join(__dirname,file),'utf8').replaceAll('\r\n','\n'));
 const ids={beach:'dawn',swamp:'conchas'},navigation=new Map();
 loaded={originalNavigation:id=>new c.MareWorld.Navigation(c.MareWorld.maps[id],c.MareWorld.maps[id].navigationCell||24),rulesHash:hash.digest('hex'),islands:c.MareArchipelago.islands,mapId:area=>ids[area]||area,maps:c.MareWorld.maps,
 navigation(id) {
   const map = c.MareWorld.maps[id];
   if (!map) throw Error('Unknown map');
   if (!navigation.has(id)) {
     const exported = c.MareMapExports?.get(id);
     const terrainMask = exported ? exportedTerrainMask(exported, map.navigationCell) :
       id === 'dawn' ? c.MareDawnData.mask : undefined;
     navigation.set(id, indexedNavigation(c.MareWorld.Navigation, map, map.navigationCell || 24, 10, {terrainMask}));
   }
   return navigation.get(id);
 }};return loaded;}

module.exports={load,scripts};
