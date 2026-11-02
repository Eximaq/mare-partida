/* Online presentation only. Identity/progress are supplied by account.js after BFF reads.
   Never boot game.js: it owns the offline economy and browser saves. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('lobby-canvas'),ctx=canvas.getContext('2d');
  let actorId=null,view=null,visible=false,loading=null,doll=null,nav=null,hero=null,last=0,direction='south',generation=0;
  const keys=new Set();
  function script(file){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src='/'+file;node.onload=resolve;node.onerror=reject;document.head.append(node);});}
  async function prepare(){
    for(const [global,file] of [['MareWorld','world-system.js'],['MareLobbyMapData','lobby-map-data.js'],['MareLobby','lobby-world.js'],['MareWorldDepth','world-depth.js'],['MareHeadgear','headgear-visibility.js'],['MareCharacterAppearance','character-appearance.js'],['MarePaperDoll96Lobby','paper-doll-96-lobby.js']])if(!globalThis[global])await script(file);
    if(!doll){doll=MarePaperDoll96Lobby.create({baseURL:location.origin+'/'});nav=new MareWorld.Navigation(MareLobby.map,32);}
    if(MareLobby.image?.decode)await MareLobby.image.decode();
    await doll.ready;
  }
  function update(next){
    if(next&&actorId!==next.character.id){actorId=next.character.id;hero=nav?{...MareLobby.spawn}:null;keys.clear();}
    view=next;
    if(!view){keys.clear();return;}
    $('lobby-name').textContent=view.character.name;
    $('lobby-progress').textContent=`Nível ${view.state.level} · XP ${view.state.experience} · Ouro ${view.state.gold}`;
    if(!view.controlled)keys.clear();
  }
  async function enter(){
    visible=true;const current=++generation;
    $('lobby-status').textContent='Carregando o mapa e o personagem…';
    try{
      loading??=prepare().catch(error=>{loading=null;throw error;});await loading;
      if(current!==generation||!view||!visible)return;
      if(await doll.ensure({...view.character,equipment:{}})===false)throw new Error("Player art unavailable");
      if(current!==generation||!view||!visible)return;
      if(!hero)hero={...MareLobby.spawn};last=0;
      canvas.focus();requestAnimationFrame(now=>frame(now,current));
    }catch{if(current===generation)$('lobby-status').textContent='Não foi possível carregar o porto. Volte à conta e tente entrar novamente.';}
  }
  function clear(){generation++;visible=false;view=null;actorId=null;hero=null;keys.clear();last=0;ctx.clearRect(0,0,canvas.width,canvas.height);$('lobby-name').textContent='';$('lobby-progress').textContent='';}
  function frame(now,token){
    if(!visible||token!==generation)return;
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(view&&hero&&!document.hidden){
      const before={x:hero.x,y:hero.y};let dx=0,dy=0;
      if(view.controlled){dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));}
      const length=Math.hypot(dx,dy);if(length){nav.move(hero,dx/length*150*dt,dy/length*150*dt);direction=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north';}
      const moving=hero.x!==before.x||hero.y!==before.y;
      doll.stepWalk(hero,now/1000,moving,{from:before,dt,context:'online-lobby'});
      const camera={x:Math.max(0,Math.min(MareLobby.map.width-canvas.width,hero.x-canvas.width/2)),y:Math.max(0,Math.min(MareLobby.map.height-canvas.height,hero.y-canvas.height/2))};
      ctx.save();ctx.translate(-camera.x,-camera.y);MareLobby.ground(ctx,camera,canvas.width,canvas.height);
      const drawn=doll.draw(ctx,{...view.character,equipment:{}},{scene:'lobby',action:moving?'walk':'idle',direction,time:now/1000,x:hero.x,y:hero.y,worldView:true});
      MareLobby.foreground(ctx,[{...hero,height:96,visualHeight:96,visualWidth:64}]);
      ctx.textAlign='center';ctx.font='bold 14px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#091b23';ctx.fillStyle='#fff1ca';ctx.strokeText(view.character.name,hero.x,hero.y-105);ctx.fillText(view.character.name,hero.x,hero.y-105);ctx.restore();
      const assetsReady=drawn&&MareLobby.image?.complete&&MareLobby.image.naturalWidth;
      $('lobby-status').textContent=!assetsReady?'Carregando a arte do porto…':view.controlled?'Use WASD ou as setas para caminhar. Abra os serviços abaixo para progredir.':'Assuma o controle para caminhar e usar os serviços do personagem.';
    }else $('lobby-status').textContent='Conferindo sua sessão e seu personagem…';
    requestAnimationFrame(now=>frame(now,token));
  }
  canvas.addEventListener('keydown',event=>{const k=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){event.preventDefault();if(visible&&view?.controlled)keys.add(k);}});
  canvas.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  canvas.addEventListener('blur',()=>keys.clear());
  globalThis.addEventListener('blur',()=>keys.clear());
  globalThis.MareOnlineLobby={update,enter,clear};
})();
