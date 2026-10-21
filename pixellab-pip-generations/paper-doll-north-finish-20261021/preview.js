'use strict';
(async()=>{
 const $=id=>document.getElementById(id),data=await(await fetch('review-pack.json',{cache:'no-store'})).json(),images=new Map(),hidden=new Set(),urls=[];
 const names=new Set();for(const p of data.pieces)for(const clip of Object.values(p.animations)){names.add(clip.url);for(const s of Object.values(clip.sources||{}))names.add(s.url);}
 await Promise.all([...names].map(async name=>{const response=await fetch(name,{cache:'no-store'});if(!response.ok)throw Error('PNG indisponível: '+name);const im=new Image(),url=URL.createObjectURL(await response.blob());urls.push(url);im.src=url;await im.decode();images.set(name,im);}));
 addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
 const runtime=MarePaperDoll.create({getImage:name=>images.get(name)});runtime.registerRig(data.rig);data.pieces.forEach(p=>runtime.registerPiece(p));
 const directions=['south','north','west','east'],labels=['Frente','Costas','Esquerda','Direita'],boards=[];
 for(const [i,d]of directions.entries()){const section=document.createElement('article');section.className='board';const h=document.createElement('h2');h.textContent=labels[i];const pair=document.createElement('div');pair.className='pair';const canvases=[];for(const label of ['Corpo-base','Paper Doll']){const figure=document.createElement('figure'),c=document.createElement('canvas'),caption=document.createElement('figcaption');c.width=c.height=84;c.id=d+'-'+(canvases.length?'full':'body');caption.textContent=label;figure.append(c,caption);pair.append(figure);canvases.push(c);}section.append(h,pair);$('boards').append(section);boards.push({d,i,section,canvases});}
 for(const [slot,label]of [['body','Corpo'],['hair','Cabelo'],['outfit','Roupa'],['weapon','Espada']]){const l=document.createElement('label');l.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.layer=slot;l.append(input,document.createTextNode(label));$('layers').append(l);input.addEventListener('change',()=>{input.checked?hidden.delete(slot):hidden.add(slot);render();});}
 let playing=false,elapsed=0,last=0;
 function render(){const action=$('animation').value,clip=data.rig.animations[action],frameIndex=Number($('frame').value);$('frameValue').value=String(frameIndex+1);const ready=[];
  for(const {d,i,section,canvases}of boards){section.hidden=!data.coverage[action].includes(d);if(section.hidden)continue;const [body,current]=canvases.map(c=>c.getContext('2d'));for(const ctx of [body,current]){ctx.clearRect(0,0,84,84);ctx.imageSmoothingEnabled=false;}body.drawImage(images.get('body-'+action+'.png'),frameIndex*84,data.coverage[action].indexOf(d)*84,84,84,0,0,84,84);
   if(runtime.draw(current,data.appearance,{animationId:action,direction:d,frameIndex},42,65,{scale:1,allowDraft:true,hidden:[...hidden]}))ready.push(d);
   if($('guides').checked)for(const ctx of [body,current]){ctx.fillStyle='#efc66f';ctx.fillRect(0,65,84,1);ctx.fillRect(42,62,1,7);}}
  $('status').textContent=(action==='walk'?'Caminhada frente/costas · 8 FPS':'Repouso · 4 FPS')+' · frame '+(frameIndex+1)+' / '+clip.frames+' · pacote em revisão';
  window.__paperDollWalk=()=>({ready:true,action,readyDirections:ready,frameIndex,playing,hidden:[...hidden],artworkApproved:false,productionEnabled:false,stats:runtime.stats()});
 }
 function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
 $('animation').addEventListener('change',()=>{pause();elapsed=0;$('frame').max=data.rig.animations[$('animation').value].frames-1;$('frame').value=0;render();});
 $('frame').addEventListener('input',()=>{pause();render();});$('guides').addEventListener('change',render);
 $('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pausar':'Reproduzir';$('play').setAttribute('aria-pressed',String(playing));elapsed=Number($('frame').value)/data.rig.animations[$('animation').value].fps;});
 render();function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!document.hidden){const clip=data.rig.animations[$('animation').value];elapsed=(elapsed+dt)%(clip.frames/clip.fps);const n=Math.floor(elapsed*clip.fps);if(n!==Number($('frame').value)){$('frame').value=n;render();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(e=>{document.getElementById('status').textContent='Falha na prévia: '+e.message;throw e;});
