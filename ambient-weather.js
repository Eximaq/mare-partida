'use strict';
/* Screen-local particle pool, drawn inside the world canvas only. */
((root)=>{
 const MAX=64;
 function create(){const pool=Array.from({length:MAX},(_,i)=>({x:(i*.61803398875)%1,y:(i*.38196601125)%1,s:.5+(i%11)/11,a:.12+(i%7)*.025}));let mode=null,count=0,density=1,time=0,slow=0,fast=0;
 function update(id,dt,{reduced=false,hidden=false,width=1,height=1,frameMs=16}={}){const next=id==='skypiea-01'?'sky':id==='alabasta'||id.startsWith('alubarna-')?'dust':null;if(mode!==next){mode=next;time=0;}if(!mode||reduced||hidden){count=0;return;}dt=Math.max(0,Math.min(.1,dt));if(frameMs>24){slow+=dt;fast=0;}else{fast+=dt;slow=Math.max(0,slow-dt);}if(slow>1){density=Math.max(.25,density-.25);slow=0;}if(fast>5){density=Math.min(1,density+.1);fast=0;}time+=dt;count=Math.min(MAX,Math.round((mode==='sky'?48:40)*density));for(let i=0;i<count;i++){const p=pool[i];p.x=(p.x+dt*(mode==='sky'?Math.sin(time*.4+i)*2:18+p.s*12)/Math.max(1,width)+1)%1;p.y=(p.y+dt*(mode==='sky'?-(18+p.s*18):5+Math.sin(time*.3+i)*4)/Math.max(1,height)+1)%1;}}
 function draw(ctx,camera,width,height){if(!count)return;ctx.save();ctx.fillStyle=mode==='sky'?'#7cd7ff':'#edc575';ctx.strokeStyle=mode==='sky'?'#b7e9ff':'#e5c38b';ctx.lineWidth=1;for(let band=0;band<3;band++){ctx.globalAlpha=.12+band*.045;ctx.beginPath();for(let i=band;i<count;i+=3){const p=pool[i],x=camera.x+p.x*width,y=camera.y+p.y*height;if(mode==='sky'&&i%5===0){ctx.moveTo(x,y);ctx.quadraticCurveTo(x+2,y-5,x,y-13);}else ctx.rect(x,y,1+p.s,1+p.s);}ctx.fill();ctx.stroke();}ctx.restore();}
 return {update,draw,stats:()=>({mode,count,capacity:pool.length,density,time})};}
 const api={create,MAX};root.MareAmbientWeather=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
