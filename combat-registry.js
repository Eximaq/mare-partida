'use strict';
/* Class/faction identity is explicit. Missing art never borrows another faction. */
((root)=>{
  function create({sprites,animation,loadVisuals=true}={}){
    const entries=new Map();
    function register({classId,factionId,assetId,actions={}}){
      if(!classId||!factionId||!assetId)throw new TypeError('A combat set needs class, faction and asset IDs.');
      entries.set(factionId+':'+classId,{classId,factionId,assetId,actions:{...actions}});
    }
    function entry(player){return entries.get(player?.factionId+':'+player?.classId)||null;}
    function asset(player){
      const e=entry(player);if(!e)return null;
      if(loadVisuals)sprites.ensure?.(e.assetId);
      const a=sprites.assets[e.assetId];
      // The configured identity must not switch to a generic sprite while its sheets load.
      if(!a?.meta.production_approved)return null;
      return {...a,id:e.assetId};
    }
    function action(player,name){return entry(player)?.actions[name]||name;}
    function basicAction(player,actor){
      const sequence=asset(player)?.meta.basic_sequence||['attack'];
      return sequence[(actor.combatSequence||0)%sequence.length]||'attack';
    }
    function controller(player,actor,{inHunt=false,transformed=false}={}){
      if(!inHunt||transformed){actor.combat=null;actor.combatAssetId=null;actor.combatSequence=0;return null;}
      const a=asset(player);
      if(!a){actor.combat=null;actor.combatAssetId=null;actor.combatSequence=0;return null;}
      if(!actor.combat||actor.combatAssetId!==a.id){
        const clips={...a.meta.animations};
        for(const [alias,target]of Object.entries(entry(player).actions))if(clips[target])clips[alias]=clips[target];
        actor.combat=animation.create(clips);actor.combatAssetId=a.id;actor.combatSequence=0;
      }
      return actor.combat;
    }
    function draw(context,player,x,y,options={}){
      if(!loadVisuals)return false;
      const a=asset(player);if(!a)return false;
      return sprites.draw(context,a.id,x,y,{...options,action:action(player,options.action||'idle')});
    }
    for(const [assetId,a]of Object.entries(sprites.assets)){
      if(!a.meta.class_id||!a.meta.faction)continue;
      const actions={...(a.meta.animations.skill?{'skill-1':'skill','skill-2':'skill'}:{}),...a.meta.action_aliases};
      register({classId:a.meta.class_id,factionId:a.meta.faction,assetId,actions});
    }
    return {register,entry,asset,action,basicAction,controller,draw};
  }
  root.MareCombatRegistry={create};
  if(typeof module!=='undefined'&&module.exports)module.exports={create};
})(typeof globalThis!=='undefined'?globalThis:window);
