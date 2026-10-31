'use strict';
/* Presentation only. The existing character renderer and resource rules remain authoritative. */
((root)=>{
  let toggle,panel,source=null;
  const $=id=>document.getElementById(id);
  const expanded=()=>!!panel&&!panel.hidden;
  function portrait(canvas){
    source=canvas;if(!expanded()||!source)return;
    const target=$('wantedPortrait'),ctx=target.getContext('2d');
    ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,target.width,target.height);
    ctx.drawImage(source,0,0,source.width,source.height,0,0,target.width,target.height);
  }
  function fitName(){
    const ctx=document.createElement('canvas').getContext('2d');
    for(const [id,max,min]of [['miniName',24,16],['wantedName',28,13]]){
      if(id==='wantedName'&&!expanded())continue;
      const name=$(id);if(!name||!name.clientWidth)continue;
      ctx.font='700 '+max+'px "Alabasta Pirate", "Alegreya Sans", sans-serif';
      const width=Math.max(1,name.clientWidth-8),measured=ctx.measureText(name.textContent).width;
      name.style.fontSize=Math.max(min,Math.min(max,max*width/Math.max(1,measured)))+'px';
    }
  }
  function close(restore=false){
    if(!panel)return;
    const wasOpen=expanded();panel.hidden=true;toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Expandir cartaz do personagem');toggle.title='Expandir cartaz do personagem';
    toggle.closest('.topbar').classList.remove('poster-expanded');
    if(restore&&wasOpen)toggle.focus({preventScroll:true});
  }
  function open(){
    if(!panel)return;
    panel.hidden=false;panel.scrollTop=0;toggle.setAttribute('aria-expanded','true');
    toggle.setAttribute('aria-label','Recolher cartaz do personagem');toggle.title='Recolher cartaz do personagem';
    toggle.closest('.topbar').classList.add('poster-expanded');fitName();portrait(source);
  }
  function update(data){
    const name=$('wantedName');if(!name)return;
    if(name.textContent!==data.name){name.textContent=data.name;name.title=data.name;fitName();}
    // Bounty is an unimplemented feature, not a balance derived from coins or kills.
    if($('wantedBounty').textContent!=='0')$('wantedBounty').textContent='0';
    for(const [id,value,max]of [['miniHP',data.hp,data.maxHP],['miniEnergy',data.energy,data.maxEnergy],['miniXP',data.xp,data.neededXP]]){
      const meter=$(id).closest('[role=meter]');
      const percent=Math.max(0,Math.min(100,100*(Number(value)||0)/Math.max(1,Number(max)||1)));
      meter.setAttribute('aria-valuenow',String(Math.round(percent)));
      meter.setAttribute('aria-valuetext',Math.round(value||0)+' de '+Math.round(max||0));
    }
  }
  function mount(){
    toggle=$('characterPosterToggle');panel=$('characterPoster');if(!toggle||!panel)return;
    toggle.addEventListener('click',()=>expanded()?close():open());
    $('characterPosterClose').addEventListener('click',()=>close(true));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded()){event.preventDefault();event.stopImmediatePropagation();close(true)}},true);
    document.addEventListener('click',event=>{if(expanded()&&!panel.contains(event.target)&&!toggle.contains(event.target))close()});
    root.addEventListener('resize',fitName,{passive:true});document.fonts?.ready.then(fitName);
  }
  root.MareCharacterHUD={update,portrait,close};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
