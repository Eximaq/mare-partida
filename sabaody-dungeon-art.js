'use strict';
// Dungeon identities share the approved Sabaody strips and their authored attack clocks.
((root)=>{
 const sprites=root.MareSpriteCombatV2Data||(root.MareSpriteCombatV2Data={});
 const sabaody=root.MareSabaodySpriteData;
 for(const id of ['kuma','kizaru']){
  const source=sabaody[id],monster='dungeon-'+id;
  sprites[monster]={...source,id:monster,dungeonBoss:true,clips:{...source.clips}};
 }
})(globalThis);
