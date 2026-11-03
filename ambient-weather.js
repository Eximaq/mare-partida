'use strict';
/* Screen-local particle pool, drawn inside the world canvas only. */
((root)=>{
 const MAX=64;
 function create(){const pool=Array.from({length:MAX},(_,i)=>({x:(i*.61803398875)%1,y:(i*.38196601125)%1,s:.5+(i%11)/11,a:.12+(i%7)*.025}));let mode=null,count=0,density=1,time=0,slow=0,fast=0;
 function update(id,dt,{reduced=false,hidden=false,width=1,height=1,frameMs=16}={}){const next=id==='skypiea-01'?'sky':id==='alabasta'||id.startsWith('alubarna-')?'dust':null;if(mode!==next){mode=next;time=0;}if(!mode||reduced||hidden){count=0;return;}dt=Math.max(0,Math.min(.1,dt));if(frameMs>24){slow+=dt;fast=0;}else{fast+=dt;slow=Math.max(0,slow-dt);}if(slow>1){density=Math.max(.25,density-.25);slow=0;}if(fast>5){density=Math.min(1,density+.1);fast=0;}time+=dt;count=Math.min(MAX,Math.round((mode==='sky'?56:48)*density));for(let i=0;i<count;i++){const p=pool[i];p.x=(p.x+dt*(mode==='sky'?Math.sin(time*.55+i)*10:28+p.s*18)/Math.max(1,width)+1)%1;p.y=(p.y+dt*(mode==='sky'?-(28+p.s*24):9+Math.sin(time*.45+i)*7)/Math.max(1,height)+1)%1;}}
 function draw(ctx,camera,width,height){if(!count)return;const sky=mode==='sky';ctx.save();ctx.lineWidth=1;
  // Dark-edged luminous motes remain readable on both white clouds and dark sand.
  for(let band=0;band<3;band++){ctx.globalAlpha=.3+band*.07;ctx.fillStyle=sky?'#67caff':'#ffd487';ctx.strokeStyle=sky?'#2479af':'#9d692c';ctx.beginPath();for(let i=band;i<count;i+=3){const p=pool[i],x=camera.x+p.x*width+Math.sin(time*.8+i)*3,y=camera.y+p.y*height,r=1.5+p.s;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}ctx.fill();ctx.stroke();}
  ctx.lineWidth=1.35;ctx.strokeStyle=sky?'#55b9f2':'#dca34b';ctx.globalAlpha=sky?.42:.32;ctx.beginPath();for(let i=0;i<count;i+=4){const p=pool[i],x=camera.x+p.x*width,y=camera.y+p.y*height;ctx.moveTo(x,y);if(sky)ctx.bezierCurveTo(x+8,y-10,x-6,y-23,x+2,y-34-p.s*8);else ctx.quadraticCurveTo(x-8,y-4,x-18-p.s*9,y-6);}ctx.stroke();ctx.restore();}

 return {update,draw,stats:()=>({mode,count,capacity:pool.length,density,time})};}
 const api={create,MAX};root.MareAmbientWeather=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
