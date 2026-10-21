'use strict';
(async()=>{
 const $=id=>document.getElementById(id),data=await(await fetch('review-pack.json',{cache:'no-store'})).json(),images=new Map(),hidden=new Set();
 const names=new Set();for(const p of data.pieces)for(const clip of Object.values(p.animations)){names.add(clip.url);for(const source of Object.values(clip.sources||{}))names.add(source.url);}
 const urls=[];
 await Promise.all([...names].map(async name=>{const response=await fetch(name,{cache:'no-store'});if(!response.ok)throw Error('PNG indisponível: '+name);const im=new Image(),url=URL.createObjectURL(await response.blob());urls.push(url);im.src=url;await im.decode();images.set(name,im)}));
 addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
 const runtime=MarePaperDoll.create({getImage:name=>images.get(name)});runtime.registerRig(data.rig);data.pieces.forEach(p=>runtime.registerPiece(p));
 const directions=['south','north','west','east'],labels=['Frente','Costas','Esquerda','Direita'],boards=[];
 directions.forEach((d,i)=>{const section=document.createElement('article');section.className='board';const h=document.createElement('h2');h.textContent=labels[i];section.append(h);const pair=document.createElement('div');pair.className='pair';const canvases=[];for(const label of ['Corpo-base','Paper Doll']){const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=canvas.height=84;canvas.id=d+'-'+(canvases.length?'full':'body');caption.textContent=label;figure.append(canvas,caption);pair.append(figure);canvases.push(canvas);}section.append(pair);$('boards').append(section);boards.push({d,i,canvases});});
 for(const [slot,label]of [['body','Corpo'],['hair','Cabelo'],['outfit','Roupa'],['weapon','Espada']]){const l=document.createElement('label');l.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.layer=slot;l.append(input,document.createTextNode(label));$('layers').append(l);input.addEventListener('change',()=>{input.checked?hidden.delete(slot):hidden.add(slot);render();});}
 let playing=false,elapsed=0,last=0;
 function render(){
  const frameIndex=Number($('frame').value);$('frameValue').value=String(frameIndex+1);const ready=[];
  for(const {d,i,canvases}of boards){const [body,current]=canvases.map(c=>c.getContext('2d'));for(const ctx of [body,current]){ctx.clearRect(0,0,84,84);ctx.imageSmoothingEnabled=false;}body.drawImage(images.get('body-idle.png'),frameIndex*84,i*84,84,84,0,0,84,84);
   if(runtime.draw(current,data.appearance,{animationId:'idle',direction:d,frameIndex},42,65,{scale:1,allowDraft:true,hidden:[...hidden]}))ready.push(d);
   if($('guides').checked)for(const ctx of [body,current]){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}
  }
  $('status').textContent=ready.length+' direções disponíveis para inspeção · frame '+(frameIndex+1)+' · Walk/Attack continuam no fallback do jogo.';
  window.__paperDollExpansion=()=>({ready:true,readyDirections:ready,frameIndex,hidden:[...hidden],artworkApproved:false,productionEnabled:false,stats:runtime.stats(),audits:data.audits});
 }
 function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
 $('frame').addEventListener('input',()=>{pause();render();});$('guides').addEventListener('change',render);
 $('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pausar':'Reproduzir';$('play').setAttribute('aria-pressed',String(playing));elapsed=Number($('frame').value)/4;});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){elapsed=(elapsed+dt)%1;const n=Math.floor(elapsed*4);if(n!==Number($('frame').value)){$('frame').value=n;render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 for(const [file,label]of [['walk-south-all-nine.png','Caminhada livre · referência +8 frames'],['walk-template-eight.png','Caminhada guiada ·8 frames'],['attack-south-eight.png','Ataque ·8 frames do corpo, reprovado por proporções e leitura dos braços']]){const figure=document.createElement('figure'),im=new Image(),caption=document.createElement('figcaption');im.src=file;im.style.cssText='max-width:100%;image-rendering:pixelated';caption.textContent=label;figure.append(im,caption);$('studies').append(figure);}
})().catch(e=>{document.getElementById('status').textContent='Falha ao carregar a prévia: '+e.message;throw e;});
