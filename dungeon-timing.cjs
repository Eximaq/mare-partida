'use strict';
// Trusted authored metadata only. No images, browser APIs or player code execute here.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c=vm.createContext({MareSpriteCombatV2Data:{}});
for(const file of ['dungeon-boss-art-data.js','cp9-sprites.js','thriller-sprites.js','enies-dungeon-art.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),c,{timeout:1000});
module.exports=Object.fromEntries(Object.entries(c.MareSpriteCombatV2Data).filter(([,data])=>data.dungeonBoss).map(([id,data])=>[id,Object.fromEntries(Object.entries(data.clips.attack).map(([direction,clip])=>[direction,Object.freeze({frames:clip.frames,fps:clip.fps,impact_frame:clip.impact_frame})]))]));
