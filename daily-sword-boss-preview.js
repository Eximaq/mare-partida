'use strict';
// Standalone visual playback. Never enters a world, deals damage or awards anything.
((root)=>{
 const A=root.MareDailySwordBossArtData;
 const V={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]};
 const C=root.KaizokuDailySwordBossCombat;
 const effectCache=new Map();
 function frameAt(durations,time,loop=false){
  if(!Array.isArray(durations)||!durations.length||durations.some(n=>!Number.isFinite(n)||n<=0))return 0;
  const total=durations.reduce((a,b)=>a+b,0);
  let t=Math.max(0,Number.isFinite(time)?time:0);
  if(loop)t%=total;
  for(const [i,ms] of durations.entries()){if(t<ms)return i;t-=ms;}
  return durations.length-1;
 }
 function sceneAt(id,direction,elapsed,origin={x:280,y:230}){
  const spec=A&&Object.hasOwn(A.specials,id)?A.specials[id]:null,vector=Object.hasOwn(V,direction)?V[direction]:null;
  if(!C||!spec||!vector)return null;
  const [x,y]=vector,angle=Math.atan2(y,x),gain=.60;
  const cast=C.create(spec,{castId:'preview',origin,target:{x:origin.x+140*x,y:origin.y+140*y},angle,now:0});
  if(!cast)return null;
  const sampled=C.sample(cast,elapsed),scale=p=>({x:origin.x+(p.x-origin.x)*gain,y:origin.y+(p.y-origin.y)*gain});
  const props={phase:sampled?.phase,shapes:cast.shapes,gain,scale,origin,travel:[],impact:[]};
  const dash=spec.shape==='dash-lane';
  props.actor=dash&&elapsed>=cast.releaseAt?scale(sampled?.travelPoint??cast.to):origin;
  if(sampled?.phase==='travel'){
   if(spec.shape==='zone-set'){
    for(const shape of sampled.shapes){
     const p=scale(shape.center);
     props.travel.push({kind:'travel',x:p.x,y:p.y-86*(1-sampled.progress),angle:0,frame:sampled.frame});
    }
   }else if(spec.art.travel){
    const p=scale(sampled.travelPoint);
    props.travel.push({kind:'travel',x:p.x-(dash?22*x:0),y:p.y-(dash?22*y:0),angle,frame:sampled.frame});
   }
  }
  if(sampled?.phase==='impact'){
   const ps=spec.shape==='zone-set'?sampled.shapes.map(s=>s.center):[sampled.impactPoint];
   props.impact=ps.map(p=>({kind:'impact',...scale(p),angle,frame:sampled.frame}));
  }
  return props;
 }
 function fxImage(meta){
  if(!effectCache.has(meta.image)){
   const im=new Image();const url=new URL(meta.image,document.baseURI);url.searchParams.set('revision',meta.png_sha256.slice(0,16));im.src=url.href;
   effectCache.set(meta.image,im);
  }
  return effectCache.get(meta.image);
 }
 async function loadFx(id){
  await Promise.all(Object.values(A.effects[id]).map(async m=>{
   const im=fxImage(m);await im.decode();
   if(im.naturalWidth!==m.size*m.frames||im.naturalHeight!==m.size)throw Error('Tamanho de efeito inválido');
  }));
 }
 function drawFx(ctx,id,{kind,x,y,frame,angle}){
  const m=A.effects[id]?.[kind];
  if(!m)return false;
  const im=fxImage(m);
  if(!im.complete||im.naturalWidth!==m.size*m.frames)return false;
  const scale=.86,s=Math.round(m.size*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));
  if(m.nativeFacing==='east')ctx.rotate(angle);
  ctx.drawImage(im,frame*m.size,0,m.size,m.size,-Math.round(m.anchor[0]*scale),-Math.round(m.anchor[1]*scale),s,s);
  ctx.restore();return true;
 }
 root.MareDailySwordBossPreview=Object.freeze({frameAt,sceneAt});
 if(typeof module!=='undefined')module.exports=root.MareDailySwordBossPreview;
 if(typeof document==='undefined'||!A)return;
 const R=root.MareSpriteCombatV2,$=id=>document.getElementById(id);
 const canvas=$('scene'),ctx=canvas.getContext('2d'),actor=$('actor'),direction=$('direction'),action=$('action'),pause=$('pause'),status=$('status');
 let start=0,stopped=null,ready=false,selected=null,version=0;
 for(const [key,m] of Object.entries(A.actors))actor.add(new Option(m.name,key));
 function play(){start=performance.now();stopped=null;pause.textContent='Pausar';pause.setAttribute('aria-pressed','false');}
 async function refresh(){
  const next={id:actor.value,dir:direction.value,action:action.value},n=++version;
  ready=false; status.textContent='Carregando a arte…';canvas.dataset.ready='false';
  try{
   const ok=await R.prepare(next.id);
   if(next.action==='special')await loadFx(next.id);
   if(!ok)throw Error('Tira de animação inválida');
   if(n!==version)return;
   selected=next;ready=true;play();
   status.textContent=next.action==='special'?A.specials[next.id].special:'Arte carregada.';
   canvas.dataset.ready='true';
  }catch(e){if(n===version)status.textContent='Não consegui carregar a animação: '+e.message;}
 }
 function ground(){
  ctx.fillStyle='#202732';ctx.fillRect(0,0,560,440);
  ctx.strokeStyle='#394655';ctx.lineWidth=1;
  for(let x=20;x<560;x+=40){ctx.beginPath();ctx.moveTo(x,55);ctx.lineTo(x,425);ctx.stroke();}
  for(let y=65;y<440;y+=40){ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(548,y);ctx.stroke();}
 }
 function warn(s){
  if(s.phase!=='warning'&&s.phase!=='travel')return;
  ctx.save();
  for(const shape of s.shapes){
   ctx.strokeStyle='#ffd683';ctx.fillStyle='#9a67283b';ctx.lineWidth=2;ctx.setLineDash([6,5]);
   ctx.beginPath();
   if(shape.kind==='circle'){
    const p=s.scale(shape.center);ctx.arc(p.x,p.y,shape.radius*s.gain,0,2*Math.PI);ctx.fill();ctx.stroke();
   }else if(shape.kind==='cone'){
    const p=s.scale(shape.origin),a=shape.angleDeg*Math.PI/360;
    ctx.moveTo(p.x,p.y);ctx.arc(p.x,p.y,shape.range*s.gain,shape.angle-a,shape.angle+a);ctx.closePath();ctx.fill();ctx.stroke();
   }else{
    const a=s.scale(shape.from),b=s.scale(shape.to);
    ctx.lineWidth=shape.width*s.gain;ctx.strokeStyle='#9a67283b';ctx.setLineDash([]);
    ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle='#ffd683';ctx.setLineDash([6,5]);ctx.stroke();
   }
  }
  ctx.restore();
 }
 function render(now){
  ground();
  if(ready){
   const {id,dir,action:act}=selected,e=A.actors[id],clip=e.clips[act][dir],elapsed=Math.min(stopped??now,now)-start;
   const s=act==='special'?sceneAt(id,dir,elapsed):null;
   let m=s?.actor??{x:280,y:230};
   if(s){warn(s);for(const f of s.travel)drawFx(ctx,id,f);}
   const frame=frameAt(clip.frame_durations_ms,elapsed,clip.loop);
   R.draw(ctx,id,m.x,m.y,{action:act,direction:dir,height:R.monsterHeight(id),progress:frame/clip.frames});
   if(s)for(const f of s.impact)drawFx(ctx,id,f);
   canvas.dataset.phase=s?.impact.length?'impact':s?.travel.length?'travel':s?.phase==='warning'?'warning':act;
  }
  requestAnimationFrame(render);
 }
 for(const v of [actor,direction,action])v.addEventListener('change',refresh);
 $('play').addEventListener('click',play);
 pause.addEventListener('click',()=>{
  if(stopped===null){stopped=performance.now();pause.textContent='Continuar';pause.setAttribute('aria-pressed','true');}
  else{start+=performance.now()-stopped;stopped=null;pause.textContent='Pausar';pause.setAttribute('aria-pressed','false');}
 });
 requestAnimationFrame(render);void refresh();
})(globalThis);
