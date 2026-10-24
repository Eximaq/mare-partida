'use strict';
/* Seconds internally. A one-shot owns its clock and commits its impact at most once. */
((root)=>{
 const MIN_ATTACK_DURATION=.15;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const attackDuration=speed=>Math.max(MIN_ATTACK_DURATION,1/(Number.isFinite(speed)&&speed>0?speed:1));
 const frameAt=(progress,frames)=>Math.min(frames-1,Math.floor(clamp(progress,0,1)*frames+1e-9));
 const shots=new Set(['attack','skill','skill-1','skill-2','combo','dodge','reload','cast','heal','hurt','death']);
 function create(animations={}){
  let state={action:'idle',elapsed:0,direction:'front',impactDone:false},impact=null,queuedHurt=false,dynamicDuration=null,ratioOverride=null;
  function timing(action){
   const a=animations[action]||{},direction=({front:'south',back:'north',left:'west',right:'east'})[state.direction]||state.direction;
   const frames=a.direction_frames?.[direction]??a.frames??1,fps=a.direction_fps?.[direction]??a.fps??8;
   const impactFrame=a.direction_impact_frames?.[direction]??a.impact_frame??Math.floor(frames*.45);
   const ratio=clamp(ratioOverride??a.hitFrameRatio??impactFrame/frames,0,1),duration=dynamicDuration??frames/fps;
   return {frames,duration,ratio,impact:ratio*duration};
  }
  function oneShot(action){return shots.has(action)||animations[action]?.loop===false;}
  function locked(){return oneShot(state.action);}
  function reset(direction='front'){state={action:'idle',elapsed:0,direction,impactDone:false};impact=null;queuedHurt=false;dynamicDuration=null;ratioOverride=null;}
  function play(action,{direction=state.direction,onImpact=null,attackSpeed=null,attackDuration:duration=null,hitFrameRatio=null}={}){
   if(!oneShot(action)||!animations[action])return false;
   if(locked()&&(action!=='death'||state.action==='death')){if(action==='hurt'&&state.action!=='hurt'&&state.action!=='death')queuedHurt=true;return false;}
   if(action==='death')queuedHurt=false;
   state={action,elapsed:0,direction,impactDone:false};impact=onImpact;
   dynamicDuration=Number.isFinite(duration)&&duration>0?Math.max(MIN_ATTACK_DURATION,duration):Number.isFinite(attackSpeed)&&attackSpeed>0?attackDuration(attackSpeed):null;
   ratioOverride=Number.isFinite(hitFrameRatio)?hitFrameRatio:null;return true;
  }
  // Preserve normalized pose and the one-shot impact latch when a buff changes mid-swing.
  function setAttackSpeed(speed){
   if(dynamicDuration===null||!locked())return false;
   const progress=clamp(state.elapsed/dynamicDuration,0,1);dynamicDuration=attackDuration(speed);state.elapsed=progress*dynamicDuration;return true;
  }
  function step(dt,{moving=false,inCombat=false,direction=state.direction}={}){
   state.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
   if(locked()){
    const t=timing(state.action);
    if(!state.impactDone&&state.elapsed+1e-9>=t.impact){state.impactDone=true;const commit=impact;impact=null;if(commit)commit();}
    // An impact callback may cancel the action or change scenes.
    if(state.action==='death')state.elapsed=Math.min(state.elapsed,t.duration);
    else if(locked()&&state.elapsed+1e-9>=t.duration){
     const next=queuedHurt?'hurt':moving?'walk':inCombat?'combat-idle':'idle';queuedHurt=false;
     state={action:next,elapsed:0,direction,impactDone:false};impact=null;dynamicDuration=null;ratioOverride=null;
    }
   }else{const next=moving?'walk':inCombat?'combat-idle':'idle';if(next!==state.action||direction!==state.direction)state={action:next,elapsed:0,direction,impactDone:false};}
   if(!locked())state.direction=direction;return snapshot();
  }
  function snapshot(){const t=timing(state.action),progress=clamp(state.elapsed/t.duration,0,1);return {...state,locked:locked(),duration:t.duration,frames:t.frames,progress,currentFrame:frameAt(progress,t.frames),frameDuration:t.duration/t.frames,hitFrameRatio:t.ratio,scaled:dynamicDuration!==null};}
  return {play,step,reset,snapshot,locked,setAttackSpeed};
 }
 const api={create,attackDuration,frameAt,MIN_ATTACK_DURATION};root.MareCombatAnimation=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
