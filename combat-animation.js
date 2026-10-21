'use strict';
/* A one-shot action owns its clock and commits its impact at most once. */
((root)=>{
  const shots=new Set(['attack','skill','skill-1','skill-2','combo','dodge','reload','cast','heal','hurt','death']);
  function create(animations={}){
    let state={action:'idle',elapsed:0,direction:'front',impactDone:false};
    let impact=null,queuedHurt=false;
    const timing=(action)=>{
      const a=animations[action]||{};
      const direction=({front:'south',back:'north',left:'west',right:'east'})[state.direction]||state.direction;
      const impactFrame=a.direction_impact_frames?.[direction]??a.impact_frame??Math.floor((a.frames||1)*.45);
      const frames=a.direction_frames?.[direction]??a.frames??1,fps=a.direction_fps?.[direction]??a.fps??8;
      return {duration:frames/fps,impact:impactFrame/fps};
    };
    function oneShot(action){return shots.has(action)||animations[action]?.loop===false;}
    function locked(){return oneShot(state.action);}
    function reset(direction='front'){state={action:'idle',elapsed:0,direction,impactDone:false};impact=null;queuedHurt=false;}
    function play(action,{direction=state.direction,onImpact=null}={}){
      if(!oneShot(action)||!animations[action])return false;
      if(locked()&&(action!=='death'||state.action==='death')){
        if(action==='hurt'&&state.action!=='hurt'&&state.action!=='death')queuedHurt=true;
        return false;
      }
      if(action==='death')queuedHurt=false;
      state={action,elapsed:0,direction,impactDone:false};impact=onImpact;
      return true;
    }
    function step(dt,{moving=false,inCombat=false,direction=state.direction}={}){
      const amount=Number.isFinite(dt)?Math.max(0,dt):0;
      state.elapsed+=amount;
      if(locked()){
        const t=timing(state.action);
        if(!state.impactDone&&state.elapsed>=t.impact){
          state.impactDone=true;const commit=impact;impact=null;if(commit)commit();
        }
        if(state.action==='death')state.elapsed=Math.min(state.elapsed,t.duration);
        else if(state.elapsed>=t.duration){
          const next=queuedHurt?'hurt':moving?'walk':inCombat?'combat-idle':'idle';queuedHurt=false;
          state={action:next,elapsed:0,direction,impactDone:false};impact=null;
        }
      }else{
        const next=moving?'walk':inCombat?'combat-idle':'idle';
        if(next!==state.action||direction!==state.direction)state={action:next,elapsed:0,direction,impactDone:false};
      }
      if(!locked())state.direction=direction;
      return snapshot();
    }
    function snapshot(){return {...state,locked:locked(),duration:timing(state.action).duration};}
    return {play,step,reset,snapshot,locked};
  }
  const api={create};root.MareCombatAnimation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
