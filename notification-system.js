'use strict';
/* Derived HUD state only: never stored and never consumes points or rewards. */
((root)=>{
 const count=n=>Number.isFinite(n)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(n))):0;
 const label=n=>count(n)>99?'99+':count(n)>0?String(count(n)):'';
 const order=['status','talents','hierarchy','achievements'];
 function derive(input={}){
  const sections={status:count(input.attributes),talents:count(input.talents),hierarchy:input.canBePromoted===true?1:0,achievements:Array.isArray(input.unclaimedAchievements)?input.unclaimedAchievements.length:0};
  return Object.freeze({...sections,character:Math.min(Number.MAX_SAFE_INTEGER,Object.values(sections).reduce((a,b)=>a+b,0))});
 }
 function create(){
  let state=derive();const observers=new Set();
  return {get state(){return state;},focus(){return order.find(key=>state[key]>0)||null;},
   update(input){const next=derive(input);if(Object.keys(next).some(key=>next[key]!==state[key])){state=next;for(const listener of observers)listener(state);}return state;},
   subscribe(listener){observers.add(listener);listener(state);return ()=>observers.delete(listener);}
  };
 }
 const api={create,derive,label};root.MareNotifications=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
