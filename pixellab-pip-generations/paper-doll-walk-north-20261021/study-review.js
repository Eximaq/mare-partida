'use strict';
(async()=>{
 const $=id=>document.getElementById(id),data=await(await fetch('review-pack.json',{cache:'no-store'})).json(),weapon=data.pieces.find(p=>p.slot==='weapon').animations.walk,images=new Map(),urls=[];
 for(const name of ['body-walk.png','hair-north-draft.png','weapon-north.png']){const response=await fetch(name,{cache:'no-store'});if(!response.ok)throw Error('Estudo indisponível: '+name);const im=new Image(),url=URL.createObjectURL(await response.blob());urls.push(url);im.src=url;await im.decode();images.set(name,im);}
 addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});let playing=false,elapsed=0,last=0;
 function render(){const frameIndex=Number($('studyFrame').value),socket=weapon.sockets.north[frameIndex];$('studyValue').value=frameIndex+1;
  for(const [id,hair]of [['studyBody',false],['studyHair',true]]){const c=$(id).getContext('2d');c.clearRect(0,0,84,84);c.imageSmoothingEnabled=false;c.drawImage(images.get('weapon-north.png'),socket.x-42,socket.y-35);c.drawImage(images.get('body-walk.png'),frameIndex*84,84,84,84,0,0,84,84);if(hair)c.drawImage(images.get('hair-north-draft.png'),frameIndex*84,0,84,84,0,0,84,84);}
  $('studyStatus').textContent='Frame '+(frameIndex+1)+' / 8 · cabelo '+(frameIndex<4?'presente, sequência inteira reprovada':'ausente na arte gerada')+' · norte usa fallback no compositor';
  window.__paperDollNorthStudy=()=>({ready:true,frameIndex,playing,frames:8,bodyCandidate:true,hairApproved:false,outfitGenerated:false,productionEnabled:false});
 }
 $('studyFrame').addEventListener('input',()=>{playing=false;$('studyPlay').textContent='Reproduzir estudo';$('studyPlay').setAttribute('aria-pressed','false');render();});
 $('studyPlay').addEventListener('click',()=>{playing=!playing;elapsed=Number($('studyFrame').value)/8;$('studyPlay').textContent=playing?'Pausar estudo':'Reproduzir estudo';$('studyPlay').setAttribute('aria-pressed',String(playing));render();});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){elapsed=(elapsed+dt)%1;const frame=Math.floor(elapsed*8);if(frame!==Number($('studyFrame').value)){$('studyFrame').value=frame;render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('studyStatus').textContent='Falha na inspeção: '+e.message;throw e;});
