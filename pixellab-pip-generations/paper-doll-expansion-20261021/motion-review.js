'use strict';
(async()=>{
 const $=id=>document.getElementById(id),studies=await(await fetch('studies.json',{cache:'no-store'})).json(),images=new Map(),urls=[];
 const names=['body-south-input.png',...studies.map(s=>s.file)];
 await Promise.all(names.map(async name=>{if(!/^[a-z0-9-]+\.png$/.test(name))throw Error('Nome de folha inválido');const response=await fetch(name,{cache:'no-store'});if(!response.ok)throw Error('Folha indisponível');const image=new Image(),url=URL.createObjectURL(await response.blob());urls.push(url);image.src=url;await image.decode();images.set(name,image);}));
 addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
 studies.forEach(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.label;$('studyType').append(option);});
 let playing=false,elapsed=0,last=0;
 const selected=()=>studies.find(s=>s.id===$('studyType').value);
 function pause(){playing=false;$('playStudy').textContent='Reproduzir estudo';$('playStudy').setAttribute('aria-pressed','false');}
 function render(){const study=selected(),frame=Number($('studyFrame').value),image=images.get(study.file);if(image.naturalWidth!==256||image.naturalHeight!==128)throw Error('Estudo fora da grade nativa64');
  for(const id of ['studyReference','studyCanvas']){const ctx=$(id).getContext('2d');ctx.clearRect(0,0,64,64);ctx.imageSmoothingEnabled=false;}
  $('studyReference').getContext('2d').drawImage(images.get('body-south-input.png'),0,0);
  $('studyCanvas').getContext('2d').drawImage(image,(frame%4)*64,Math.floor(frame/4)*64,64,64,0,0,64,64);
  $('studyFrameValue').value=String(frame+1);$('studyStatus').textContent=study.status+' · '+study.note;
  window.__paperDollMotionReview=()=>({ready:true,id:study.id,frameIndex:frame,frameCount:8,fps:study.fps,loop:study.loop,productionEnabled:false,playing});
 }
 $('studyType').addEventListener('change',()=>{pause();$('studyFrame').value=0;elapsed=0;render();});$('studyFrame').addEventListener('input',()=>{pause();render();});
 $('playStudy').addEventListener('click',()=>{playing=!playing;if(playing&&Number($('studyFrame').value)===7)$('studyFrame').value=0;elapsed=Number($('studyFrame').value)/selected().fps;$('playStudy').textContent=playing?'Pausar estudo':'Reproduzir estudo';$('playStudy').setAttribute('aria-pressed',String(playing));render();});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){const s=selected();elapsed+=dt;const duration=8/s.fps;if(elapsed>=duration){if(s.loop)elapsed%=duration;else{elapsed=7/s.fps;pause();}}const n=Math.min(7,Math.floor(elapsed*s.fps));if(n!==Number($('studyFrame').value)||!playing){$('studyFrame').value=n;render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('studyStatus').textContent='Estudo indisponível: '+e.message;throw e;});
