'use strict';
(async()=>{
 const $=id=>document.getElementById(id),[review,comparison]=await Promise.all(['review.json','comparison.json'].map(async url=>await(await fetch(url,{cache:'no-store'})).json()));
 const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
 const [original,rejected,candidate]=await Promise.all([load(comparison.original),load(comparison.rejected),load(comparison.candidate)]);
 if(original.width!==672||original.height!==336||rejected.width!==672||candidate.width!==672||candidate.height!==84)throw Error('Dimensões inesperadas na comparação');
 let playing=false,elapsed=0,last=0;
 $('review').textContent=review.summary_pt;
 $('rejected').parentElement.querySelector('figcaption').textContent=comparison.rejected_caption;
 function render(){const frameIndex=Number($('frame').value);$('frameValue').value=String(frameIndex+1);
  for(const [id,image]of [['original',original],['rejected',rejected],['candidate',candidate]]){const ctx=$(id).getContext('2d');ctx.clearRect(0,0,84,84);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,frameIndex*84,0,84,84,0,0,84,84);if($('guides').checked){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}}
  $('status').textContent='Frente · 12 FPS · frame '+(frameIndex+1)+' / 8'+(frameIndex===3?' · quadro de impacto do Bento':'');
  window.__bentoMotion=()=>({ready:true,frameIndex,playing,productionEnabled:false,artworkApproved:false,reviewStatus:review.status,direction:'south',fps:12});
 }
 function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
 $('frame').addEventListener('input',()=>{pause();render();});$('guides').addEventListener('change',render);
 $('play').addEventListener('click',()=>{if(playing)pause();else{if(Number($('frame').value)===7)$('frame').value=0;playing=true;elapsed=Number($('frame').value)/12;$('play').textContent='Pausar';$('play').setAttribute('aria-pressed','true');}render();});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){elapsed+=dt;const index=Math.min(7,Math.floor(elapsed*12));if(index!==Number($('frame').value)){$('frame').value=index;render();}if(elapsed>=8/12){pause();render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('status').textContent='Falha na comparação: '+e.message;throw e;});
