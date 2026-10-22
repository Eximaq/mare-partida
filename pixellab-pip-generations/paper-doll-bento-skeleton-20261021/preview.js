'use strict';
(async()=>{
 const $=id=>document.getElementById(id),[review,comparison,pack]=await Promise.all(['review.json','comparison.json','review-pack.json'].map(async url=>await(await fetch(url,{cache:'no-store'})).json()));
 const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
 const [original,rejected,candidate]=await Promise.all([load(comparison.original),load(comparison.rejected),load(comparison.candidate)]);
 const images=new Map(),hidden=new Set();await Promise.all(pack.pieces.map(async p=>{const url=p.animations['attack-sword'].url;images.set(url,await load(url));}));
 const runtime=MarePaperDoll.create({getImage:url=>images.get(url)});runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
 if(original.width!==672||original.height!==336||rejected.width!==672||candidate.width!==672||candidate.height!==84)throw Error('Dimensões inesperadas na comparação');
 let playing=false,elapsed=0,last=0;
 $('review').textContent=review.summary_pt;
 $('rejected').parentElement.querySelector('figcaption').textContent=comparison.rejected_caption;
 function render(){const frameIndex=Number($('frame').value);$('frameValue').value=String(frameIndex+1);
  for(const [id,image]of [['original',original],['rejected',rejected],['candidate',candidate]]){const ctx=$(id).getContext('2d');ctx.clearRect(0,0,84,84);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,frameIndex*84,0,84,84,0,0,84,84);if($('guides').checked){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}}
  const ctx=$('modular').getContext('2d');ctx.clearRect(0,0,84,84);const modularReady=runtime.draw(ctx,pack.appearance,{animationId:'attack-sword',direction:'south',frameIndex},42,65,{scale:1,allowDraft:true,hidden:[...hidden]});
  if($('guides').checked){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}
  $('status').textContent='Frente · 12 FPS · frame '+(frameIndex+1)+' / 8'+(frameIndex===3?' · quadro de impacto do Bento':'');
  window.__bentoMotion=()=>({ready:true,frameIndex,playing,productionEnabled:false,artworkApproved:false,reviewStatus:review.status,direction:'south',fps:12,modularReady,hidden:[...hidden],stats:runtime.stats(),unsupportedDirectionFallsBack:!runtime.resolve(pack.appearance,{animationId:'attack-sword',direction:'north',frameIndex},{allowDraft:true}).valid});
 }
 function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
 $('frame').addEventListener('input',()=>{pause();render();});$('guides').addEventListener('change',render);
 for(const [slot,label]of [['hair','Cabelo'],['outfit','Roupa'],['pants','Calças'],['boots','Botas'],['weapon','Espada']]){const l=document.createElement('label'),input=document.createElement('input');l.className='check';input.type='checkbox';input.checked=true;input.dataset.layer=slot;l.append(input,document.createTextNode(label));$('layers').append(l);input.addEventListener('change',()=>{input.checked?hidden.delete(slot):hidden.add(slot);render();});}
 $('play').addEventListener('click',()=>{if(playing)pause();else{if(Number($('frame').value)===7)$('frame').value=0;playing=true;elapsed=Number($('frame').value)/12;$('play').textContent='Pausar';$('play').setAttribute('aria-pressed','true');}render();});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){elapsed+=dt;const index=Math.min(7,Math.floor(elapsed*12));if(index!==Number($('frame').value)){$('frame').value=index;render();}if(elapsed>=8/12){pause();render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('status').textContent='Falha na comparação: '+e.message;throw e;});
