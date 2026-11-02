'use strict';
// Trusted authored metadata only. No images, browser APIs or player code execute here.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c=vm.createContext({MareSpriteCombatV2Data:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'dungeon-boss-art-data.js'),'utf8'),c,{timeout:1000});
module.exports=Object.fromEntries(Object.entries(c.MareSpriteCombatV2Data).map(([id,data])=>[id,Object.fromEntries(Object.entries(data.clips.attack).map(([direction,clip])=>[direction,Object.freeze({frames:clip.frames,fps:clip.fps,impact_frame:clip.impact_frame})]))]));
