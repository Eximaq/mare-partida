'use strict';
// Encounter aliases reuse the approved strips; neither pixels nor attack clocks are regenerated.
((root)=>{
 const sprites=root.MareSpriteCombatV2Data||(root.MareSpriteCombatV2Data={});
 const cp9=root.MareCp9SpriteData,thriller=root.MareThrillerSpriteData;
 for(const [id,source,attack] of [
  ['dungeon-rob-lucci',cp9['rob-lucci'],cp9['rob-lucci-zoan'].clips.attack],
  ['dungeon-rob-lucci-zoan',cp9['rob-lucci-zoan'],cp9['rob-lucci-zoan'].clips.attack],
  ['dungeon-gecko-moria',thriller['gecko-moria'],thriller['gecko-moria'].clips.attack]
 ])sprites[id]={...source,id,dungeonBoss:true,clips:{...source.clips,attack}};
})(globalThis);
