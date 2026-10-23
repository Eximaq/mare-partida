'use strict';
(async()=>{
 const $=id=>document.getElementById(id),pack=await(await fetch('review-pack.json',{cache:'no-store'})).json(),images=new Map(),hidden=new Set(),directions=['south','north','west','east'];
 const load=async url=>{const im=new Image();im.src=url;await im.decode();images.set(url,im);return im;};
 await Promise.all([...new Set(['reference-bento-attack.png',...directions.map(d=>'body-candidate-'+d+'.png'),...['north','east'].map(d=>'body-before-'+d+'.png'),...pack.pieces.map(p=>p.animations['attack-sword'].url)])].map(load));
 const runtime=MarePaperDoll.create({getImage:url=>images.get(url)});runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
 let playing=false,elapsed=0,last=0;
 function render(){const d=$('direction').value,i=Number($('frame').value),pose={animationId:'attack-sword',direction:d,frameIndex:i},review=pack.reviews[d];$('frameValue').value=String(i+1);
  const source=images.get('reference-bento-attack.png'),original=$('original').getContext('2d'),body=$('body').getContext('2d'),current=$('modular').getContext('2d');
  for(const ctx of [original,body,current]){ctx.clearRect(0,0,84,84);ctx.imageSmoothingEnabled=false;}
  original.drawImage(source,i*84,directions.indexOf(d)*84,84,84,0,0,84,84);body.drawImage(images.get(($('beforeBody').checked&&['north','east'].includes(d)?'body-before-':'body-candidate-')+d+'.png'),i*84,0,84,84,0,0,84,84);
  const modular=runtime.draw(current,pack.appearance,pose,42,65,{scale:1,allowDraft:true,hidden:[...hidden]});
  if(!modular)current.drawImage(source,i*84,directions.indexOf(d)*84,84,84,0,0,84,84);
  for(const input of document.querySelectorAll('[data-layer]'))input.disabled=!modular;
  if($('guides').checked)for(const ctx of [original,body,current]){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}
  $('review').textContent=review.summary_pt;$('modeLabel').textContent=modular?'Paper Doll · candidato em avaliação':'Original completo · fallback';$('beforeBody').disabled=!['north','east'].includes(d);$('bodyLabel').textContent=$('beforeBody').checked&&['north','east'].includes(d)?'Corpo antes do retoque':review.body_motion_gate_passed?'Corpo · inspeção de anatomia':'Corpo pendente/reprovado · diagnóstico';
  $('status').textContent='12 FPS · frame '+(i+1)+' / 8 · '+(modular?'camadas sincronizadas':'fallback completo')+(i===3?' · quadro de impacto legado':'');
  $('gif').href=(modular?'modular-':'body-')+d+'.gif';$('gif').textContent=modular?'GIF modular · '+d:'GIF do corpo · diagnóstico';
  window.__directionalDoll=()=>({ready:true,direction:d,frameIndex:i,playing,mode:modular?'modular':'fallback',productionEnabled:false,artworkApproved:false,beforeBody:$('beforeBody').checked,hidden:[...hidden],coverage:pack.coverage['attack-sword'],bodyApprovedForInspection:review.body_motion_gate_passed,stats:runtime.stats()});
 }
 function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
 for(const [slot,label]of [['hair','Cabelo/bandana'],['outfit','Roupa'],['pants','Calças'],['boots','Botas'],['weapon','Espada']]){const l=document.createElement('label'),input=document.createElement('input');l.className='check';input.type='checkbox';input.checked=true;input.dataset.layer=slot;l.append(input,document.createTextNode(label));$('layers').append(l);input.addEventListener('change',()=>{input.checked?hidden.delete(slot):hidden.add(slot);render();});}
 $('direction').addEventListener('change',()=>{pause();render();});$('frame').addEventListener('input',()=>{pause();render();});$('guides').addEventListener('change',render);$('beforeBody').addEventListener('change',render);
 $('play').addEventListener('click',()=>{if(playing)pause();else{if(Number($('frame').value)===7)$('frame').value=0;elapsed=Number($('frame').value)/12;playing=true;$('play').textContent='Pausar';$('play').setAttribute('aria-pressed','true');}render();});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){elapsed+=dt;const i=Math.min(7,Math.floor(elapsed*12));if(i!==Number($('frame').value)){$('frame').value=i;render();}if(elapsed>=8/12){pause();render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('status').textContent='Falha na comparação: '+e.message;throw e;});
