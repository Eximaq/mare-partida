'use strict';
/* Zoom is visual only: all physics, navigation, saves and map units stay unchanged.
   XP/h is a running average over the current hunt session, not a guarantee. */
((root)=>{
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const minZoom=0.8,maxZoom=1.8,step=0.1;
  function normalizeZoom(value){
    const number=Number(value);
    return Number.isFinite(number)?Math.round(clamp(number,minZoom,maxZoom)*10)/10:1;
  }
  function createZoom(onChange){
    let value=1;
    return {
      get value(){return value;},
      set(next){
        const target=normalizeZoom(next);
        if(target!==value){value=target;onChange?.(value);}
        return value;
      },
      step(direction){return this.set(value+(direction>0?step:-step));},
      reset(){return this.set(1);}
    };
  }
  const duration=seconds=>{
    const t=Math.max(0,Math.floor(Number(seconds)||0));
    const hrs=Math.floor(t/3600),mins=Math.floor(t/60)%60,secs=t%60;
    return hrs?String(hrs).padStart(2,'0')+':'+String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0'):
      String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
  };
  function stats({scene='lobby',elapsed=0,xp=0,levelXP=0,neededXP=1}={}){
    const active=scene==='hunt';
    const seconds=Math.max(0,Number(elapsed)||0),earned=Math.max(0,Number(xp)||0);
    const rate=active&&seconds>=20?earned/seconds*3600:null;
    return {active,seconds,earned,rate,duration:duration(seconds),
      progress:clamp((Number(levelXP)||0)/Math.max(1,Number(neededXP)||1),0,1)};
  }
  const api={createZoom,normalizeZoom,stats,duration,minZoom,maxZoom};
  root.MareHudTelemetry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
