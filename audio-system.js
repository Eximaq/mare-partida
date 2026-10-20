/* Maré Partida: música de ambiente desacoplada, sem player flutuante.
   A Central do Navegante controla volume/mute via MareAudio. Saves não são alterados. */
(()=>{
  'use strict';
  const KEY='mare-partida-audio-v1';
  const SOURCES={lobby:'assets/audio/porto-das-correntes.mp3',hunt:'assets/audio/trilha-cacada.mp3'};
  let settings={muted:false,volume:0.30};
  try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(p&&typeof p==='object'){
    settings.muted=p.muted===true;
    if(Number.isFinite(p.volume))settings.volume=Math.max(0,Math.min(1,p.volume));
  }}catch(_){}
  const tracks=Object.fromEntries(Object.entries(SOURCES).map(([id,path])=>{
    const audio=new Audio(new URL(path,document.baseURI).href);audio.loop=true;audio.preload='none';audio.volume=0;return[id,audio];
  }));
  const gains={lobby:0,hunt:0};
  let unlocked=false,current=null,fadeId=0,fadeFrame=0;
  function scene(){
    if(document.body.classList.contains('scene-hunt'))return'hunt';
    if(document.body.classList.contains('scene-lobby'))return'lobby';
    return null;
  }
  function emit(){document.dispatchEvent(new CustomEvent('mare-audio-change',{detail:getState()}));}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}emit();}
  function applyVolume(){for(const id of Object.keys(tracks))tracks[id].volume=Math.max(0,Math.min(1,gains[id]*settings.volume));}
  function transition(){
    const target=unlocked&&!settings.muted&&settings.volume>0&&!document.hidden?scene():null;
    if(target===current&&(!target||!tracks[target].paused)){applyVolume();return;}
    current=target;fadeId++;cancelAnimationFrame(fadeFrame);
    const token=fadeId,initial={...gains};
    if(target)tracks[target].play().catch(()=>{if(token===fadeId){unlocked=false;current=null;transition();}});
    const start=performance.now();
    function step(now){
      if(token!==fadeId)return;
      const t=Math.min(1,(now-start)/750);
      for(const id of Object.keys(tracks))gains[id]=initial[id]+((target===id?1:0)-initial[id])*t;
      applyVolume();
      if(t<1)fadeFrame=requestAnimationFrame(step);
      else for(const id of Object.keys(tracks))if(id!==target)tracks[id].pause();
    }
    fadeFrame=requestAnimationFrame(step);
  }
  function unlock(){if(!unlocked)unlocked=true;transition();}
  function setMuted(v){settings.muted=Boolean(v);persist();transition();return getState();}
  function setVolume(v){
    const amount=Number(v);if(!Number.isFinite(amount))return getState();
    settings.volume=Math.max(0,Math.min(1,amount));
    settings.muted=settings.volume===0;
    persist();transition();applyVolume();return getState();
  }
  function getState(){return{scene:scene(),muted:settings.muted,volume:settings.volume,unlocked,track:current};}
  function init(){
    document.addEventListener('pointerdown',unlock,{capture:true});
    document.addEventListener('keydown',unlock,{capture:true});
    document.addEventListener('visibilitychange',transition);
    new MutationObserver(transition).observe(document.body,{attributes:true,attributeFilter:['class']});
    transition();
  }
  globalThis.MareAudio=Object.freeze({getState,setMuted,setVolume});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
