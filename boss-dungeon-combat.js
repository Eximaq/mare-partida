'use strict';
/* One authored basic attack = one logical impact, independent of frame count. */
((root)=>{
 function begin(actor,target,clip){
  if(actor.dungeonAttack||!clip||!Number.isInteger(clip.impact_frame)||clip.impact_frame<0||clip.impact_frame>=clip.frames)return false;
  actor.dungeonAttack={elapsed:0,duration:clip.frames/clip.fps,impact:clip.impact_frame/clip.fps,target,hit:false};actor.attackAnim=clip.frames/clip.fps;actor.moving=0;return true;
 }
 function cancel(actor){actor.dungeonAttack=null;actor.attackAnim=0;actor.moving=0;}
 function step(actor,dt,{blocked=false,valid=()=>true,hit=()=>{}}={}){
  const a=actor.dungeonAttack;if(!a)return false;
  if(blocked||actor.alive===false){cancel(actor);return false;}
  a.elapsed=Math.min(a.duration,a.elapsed+Math.max(0,Number.isFinite(dt)?dt:0));actor.attackAnim=Math.max(0,a.duration-a.elapsed);actor.moving=0;
  if(!a.hit&&a.elapsed>=a.impact){a.hit=true;if(valid(a.target))hit(a.target);}
  if(a.elapsed>=a.duration)cancel(actor);return true;
 }
 const api={begin,cancel,step};root.MareBossDungeonCombat=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
