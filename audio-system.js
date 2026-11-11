/* Maré Partida: música de ambiente e piloto de efeitos em Orange Town.
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
  // The published Orange projection uses these material codes at the player's feet.
  const orangeSurfaces={c:'areia',g:'grama',e:'cimento',m:'madeira',u:'madeira'};
  function orangeSurface(x,y){
    const map=globalThis.MarePixelWorldMaps?.orange.source;
    if(!map)return null;
    return orangeSurfaces[map.terrain[Math.floor((y-1)/map.cellSize)]?.[Math.floor(x/map.cellSize)]]||null;
  }
  const orangeCues=new Map([
    ['espada-corte',.72],['espada-acerto',.85],['magia-fogo',.76],
    ['supa-espiral-cortante',.84],['supa-retaliacao-metalica',.82],
  ]);
  for(const surface of ['cimento','areia','grama','madeira']){
    for(let i=1;i<=3;i++)orangeCues.set('passo-'+surface+'-0'+i,.95);
  }
  const orangeClips=new Map(),orangeVariants=new Map();
  let orangeActive=false;
  const mayPlayOrange=()=>unlocked&&!settings.muted&&settings.volume>0&&!document.hidden;
  function stopOrange(){
    for(const audio of orangeClips.values())if(!audio.paused)audio.pause();
  }
  function orangeClip(cue){
    if(!orangeClips.has(cue)){
      const audio=new Audio(new URL('assets/audio/orange-town/'+cue+'.ogg',document.baseURI).href);
      audio.preload='auto';
      orangeClips.set(cue,audio);
    }
    return orangeClips.get(cue);
  }
  function playOrange(mapId,cue){
    if(mapId!=='orange'||!mayPlayOrange()||!orangeCues.has(cue))return;
    const audio=orangeClip(cue);
    audio.volume=settings.volume*orangeCues.get(cue);
    audio.currentTime=0;
    void audio.play().catch(()=>{});
  }
  function walkOrange(mapId,from,to,gait){
    const active=mapId==='orange';
    if(active!==orangeActive){orangeActive=active;applyVolume();if(!active)stopOrange();}
    if(!active)return;
    if(!mayPlayOrange())return;
    // Prime the small bank on arrival so the first attack needn't wait for a download.
    if(orangeClips.size<orangeCues.size)for(const cue of orangeCues.keys())orangeClip(cue);
    if(!gait?.moving||gait.stepDistance<=0)return;
    // Two foot contacts per 80 px cycle of the player walk animation.
    const previous=gait.distance-gait.stepDistance;
    const contact=20+40*Math.floor((gait.distance-20)/40);
    if(contact<=previous)return;
    const fraction=(contact-previous)/gait.stepDistance;
    const x=from.x+(to.x-from.x)*fraction,y=from.y+(to.y-from.y)*fraction;
    const surface=orangeSurface(x,y);
    if(!surface)return;
    const variant=(orangeVariants.get(surface)||0)%3+1;
    orangeVariants.set(surface,variant);
    playOrange(mapId,'passo-'+surface+'-0'+variant);
  }
  let unlocked=false,current=null,fadeId=0,fadeFrame=0;
  function scene(){
    if(document.body.classList.contains('scene-hunt'))return'hunt';
    if(document.body.classList.contains('scene-lobby'))return'lobby';
    return null;
  }
  function emit(){document.dispatchEvent(new CustomEvent('mare-audio-change',{detail:getState()}));}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}emit();}
  function applyVolume(){
    for(const id of Object.keys(tracks))tracks[id].volume=Math.max(0,Math.min(1,gains[id]*settings.volume*(id==='hunt'&&orangeActive ? .35 : 1)));
    for(const [cue,audio] of orangeClips)if(!audio.paused)audio.volume=settings.volume*orangeCues.get(cue);
  }
  function transition(){
    if(scene()!=='hunt')orangeActive=false;
    if(!mayPlayOrange()||scene()!=='hunt')stopOrange();
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
  globalThis.MareAudio=Object.freeze({getState,setMuted,setVolume,playOrange,walkOrange});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
