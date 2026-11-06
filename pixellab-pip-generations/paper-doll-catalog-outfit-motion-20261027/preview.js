'use strict';
// Inspection tool only: draws existing images, never game state or requested art.
const ui=Object.fromEntries(['clip','play','previous','next','frame','position','pivot','status','before','after','layer','raw'].map(id=>[id,document.getElementById(id)]));
const urls={idle:'../paper-doll-catalog-pilot-20261027/motion-preflight/sabre-idle-south-sheet.png',walk:'../paper-doll-catalog-pilot-20261027/motion-preflight/sabre-walk-south-sheet.png',after:'combined-frames.png',layer:'outfit-layers.png',raw:'raw-sheet.png'};
const images={};let frame=0,playing=false,ready=false,last=0,elapsed=0;
const count=()=>ui.clip.value==='idle'?4:8;
const duration=()=>ui.clip.value==='idle'?250:125;
function draw(id,img,x,y,w,h){const c=ui[id],ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,w,h,0,0,c.width,c.height);if(ui.pivot.checked&&['before','after'].includes(id)){ctx.strokeStyle='#f0d391';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(42*3-5,65*3+.5);ctx.lineTo(42*3+6,65*3+.5);ctx.moveTo(42*3+.5,65*3-5);ctx.lineTo(42*3+.5,65*3+6);ctx.stroke();}}
function render(){if(!ready)return;const global=(ui.clip.value==='idle'?0:4)+frame;draw('before',images[ui.clip.value],frame*84,0,84,84);draw('after',images.after,(global%4)*84,Math.floor(global/4)*84,84,84);for(const id of ['layer','raw'])draw(id,images[id],(global%4)*64,Math.floor(global/4)*64,64,64);ui.frame.value=String(frame);ui.position.value=`${frame+1} / ${count()}`;ui.position.textContent=ui.position.value;}
function pause(){playing=false;ui.play.textContent='Reproduzir';ui.play.setAttribute('aria-pressed','false');elapsed=0;last=0;}
function tick(time){if(!playing)return;if(!last)last=time;elapsed+=Math.min(time-last,500);last=time;const previous=frame;while(elapsed>=duration()){elapsed-=duration();frame=(frame+1)%count();}if(frame!==previous)render();requestAnimationFrame(tick);}
ui.play.addEventListener('click',()=>{if(playing){pause();return;}playing=true;last=0;elapsed=0;ui.play.textContent='Pausar';ui.play.setAttribute('aria-pressed','true');requestAnimationFrame(tick);});
ui.previous.addEventListener('click',()=>{pause();frame=(frame+count()-1)%count();render();});
ui.next.addEventListener('click',()=>{pause();frame=(frame+1)%count();render();});
ui.frame.addEventListener('input',()=>{pause();frame=Number(ui.frame.value);render();});
ui.clip.addEventListener('change',()=>{pause();frame=0;ui.frame.max=String(count()-1);render();});
ui.pivot.addEventListener('change',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
Promise.all(Object.entries(urls).map(async([id,url])=>{const img=new Image();img.src=url;await img.decode();images[id]=img;})).then(()=>{ready=true;for(const id of ['play','previous','next','frame'])ui[id].disabled=false;ui.status.textContent='12 poses disponíveis. Comparação sincronizada por frame; peças ainda não aprovadas.';render();}).catch(()=>{ui.status.textContent='Falha no carregamento. Nenhuma aparência foi aplicada ao jogo.';});
