'use strict';
((root)=>{
// Visual-only, deterministic scrap assembly. Never writes to the game runtime.
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>x*x*(3-2*x);
const materials=[['#c3cbd0','#6f7f8a','#344553'],['#b99372','#795044','#3b2c31'],['#9daab6','#536375','#293342'],['#d2bda0','#8c7665','#453d3b']];
// x/y are local coordinates inside a 96 px mass. Front pieces have higher z.
const layout=[
 ['gear',0,0,13,0,5],['plate',-10,-9,13,1,2],['beam',10,9,16,2,2],['gear',-14,12,10,3,6],
 ['plate',16,-13,15,0,3],['beam',-23,-10,15,1,1],['plate',-17,25,12,2,3],['gear',22,15,12,0,8],
 ['pipe',6,-27,13,1,3],['gear',-23,-24,10,2,8],['beam',27,-5,15,3,2],['plate',5,26,14,1,5],
 ['beam',-34,6,15,0,1],['pipe',-4,34,11,2,4],['plate',-7,-35,13,0,3],['gear',30,-25,11,1,8],
 ['plate',34,27,11,2,4],['beam',-31,28,15,1,2],['pipe',35,3,11,3,5],['gear',17,35,11,0,8],
 ['plate',-38,-16,10,1,3],['beam',18,-37,12,2,2],['pipe',-34,-33,11,0,5],['plate',-22,40,10,0,6],
 ['gear',-40,17,10,3,8],['beam',38,-15,11,1,6],['beam',40,20,12,0,6],['plate',-14,-16,10,3,9],
 ['beam',7,18,14,0,9],['pipe',-18,5,10,1,9],['plate',18,-2,10,1,9],['gear',5,-15,12,0,10],
 ['plate',8,40,10,2,6],['beam',-6,-43,10,1,6],['gear',-13,30,11,2,10],['plate',-29,-6,9,2,9],
 ['beam',24,24,12,3,9],['pipe',-25,18,9,0,10],['gear',28,-8,10,3,11],['plate',-2,-25,9,1,11],
 ['gear',-8,5,15,0,13],['plate',8,29,10,0,12],['beam',-20,-29,10,2,12],['gear',16,13,12,1,14]
];
const parts=layout.map(([kind,x,y,r,m,z],id)=>{
 const a=id*2.399963,delay=id<12?id*.085:.99+(id-12)*.141;
 const duration=id===0?0:.47+(id%4)*.055,rotation=(id*.719)%TAU;
 return {id,kind,x,y,r,m,z,delay,duration,arrival:delay+duration,rotation,
  startX:Math.cos(a)*(115+id%5*18),startY:85+Math.abs(Math.sin(a))*75,
  bend:(id%2?1:-1)*(34+id%4*10)};
});
function poly(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function circle(c,x,y,r,fill,stroke,lw=1){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function rivet(c,x,y){circle(c,x+.4,y+.5,1.5,'#182733');circle(c,x,y,1.1,'#d3ced0');c.fillStyle='#83949d';c.fillRect(x-.4,y-.4,.8,.8);}
function drawPiece(c,p,rot=p.rotation){
 c.save();c.rotate(rot);const r=p.r,[hi,mid,dark]=materials[p.m],g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,hi);g.addColorStop(.3,mid);g.addColorStop(.55,dark);g.addColorStop(.75,mid);g.addColorStop(1,dark);c.fillStyle=g;c.lineJoin='miter';c.lineWidth=1.6;c.strokeStyle='#101a28';
 if(p.kind==='gear'){
  const teeth=p.r>12?10:8,points=[];for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*TAU,rr=r*([.77,1,1,.77][i%4]);points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}poly(c,points);c.fill();c.stroke();c.strokeStyle=hi;c.lineWidth=.75;c.beginPath();c.arc(-.25,-.5,r*.67,3.4,5.9);c.stroke();circle(c,0,0,r*.49,dark,mid,1.3);circle(c,0,0,r*.29,'#132230',hi,1.2);for(let i=0;i<4;i++){const a=i*TAU/4;circle(c,Math.cos(a)*r*.62,Math.sin(a)*r*.62,1,'#26333f');}
 }else if(p.kind==='plate'){
  poly(c,[[-r*.85,-r*.7],[r*.55,-r*.82],[r*.92,-r*.2],[r*.8,r*.6],[-r*.5,r*.83],[-r*.9,r*.3]]);c.fill();c.stroke();c.beginPath();c.moveTo(-r*.7,-r*.55);c.lineTo(r*.44,-r*.67);c.strokeStyle=hi;c.lineWidth=1;c.stroke();rivet(c,-r*.5,-r*.35);rivet(c,r*.47,r*.28);c.strokeStyle=dark;c.beginPath();c.moveTo(-r*.3,r*.2);c.lineTo(r*.16,-r*.15);c.stroke();
 }else if(p.kind==='beam'){
  poly(c,[[-r,-r*.25],[-r*.66,-r*.25],[-r*.66,-r*.13],[r*.6,-r*.13],[r*.6,-r*.27],[r,-r*.27],[r,r*.25],[r*.6,r*.25],[r*.6,r*.12],[-r*.66,r*.12],[-r*.66,r*.25],[-r,r*.25]]);c.fill();c.stroke();c.strokeStyle=hi;c.lineWidth=.9;c.beginPath();c.moveTo(-r*.7,-r*.14);c.lineTo(r*.6,-r*.14);c.stroke();rivet(c,-r*.83,0);rivet(c,r*.8,0);
 }else{
  c.lineWidth=r*.48;c.strokeStyle='#15212c';c.beginPath();c.moveTo(-r*.65,r*.5);c.lineTo(-r*.65,-r*.1);c.quadraticCurveTo(-r*.65,-r*.65,0,-r*.65);c.lineTo(r*.7,-r*.65);c.stroke();c.lineWidth=r*.3;c.strokeStyle=mid;c.stroke();c.lineWidth=r*.075;c.strokeStyle=hi;c.stroke();circle(c,-r*.65,r*.5,r*.26,dark,hi,.8);circle(c,-r*.65,r*.5,r*.12,'#0e1a23');
 }
 c.restore();
}
function position(p,age,{lockedOnly=false}={}){
 if(age<p.delay)return null;
 const u=p.duration===0?1:clamp((age-p.delay)/p.duration),f=ease(u),rem=1-f;
 if(lockedOnly&&u<1)return null;
 if(u>=1)return {x:p.x,y:p.y,rotation:p.rotation,progress:1,locked:true};
 return {x:p.x* f+p.startX*rem+Math.sin(u*Math.PI)*p.bend,y:p.y*f+p.startY*rem-Math.sin(u*Math.PI)*32,
  rotation:p.rotation+rem*(p.id%2?-1:1)*(Math.PI*1.5),progress:u,locked:u>=1};
}
function spark(c,x,y,age,id,scale=1){const life=clamp(age/.17);if(age<0||age>.17)return;c.save();c.globalAlpha=1-life;for(let j=0;j<5;j++){const a=j*TAU/5+id,r=3+life*12;c.beginPath();c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.lineTo(x+Math.cos(a)*(r+3),y+Math.sin(a)*(r+3));c.strokeStyle=j%2?'#eadcff':'#b591ed';c.lineWidth=scale;c.stroke();}c.restore();}
function drawAssembly(c,age,x,y,size,{flying=false,freezeAge=age,spin=0,reducedMotion=false}={}){
 c.save();c.translate(x,y);c.scale(size/96,size/96);c.rotate(spin);
 const localAge=flying?freezeAge:age,visible=parts.map(p=>({p,q:position(p,localAge,{lockedOnly:flying})})).filter(o=>o.q);
 // Small field arcs and inward trails communicate attraction without hiding pieces.
 if(!flying&&!reducedMotion&&age>0&&age<5.9){c.save();c.globalAlpha=.22;c.lineWidth=.8;c.strokeStyle='#bca3e9';for(let k=0;k<3;k++){c.beginPath();c.ellipse(0,8,47+k*12,22+k*5,age*.45+k*.3,age*1.2+k*2,age*1.2+k*2+1.7);c.stroke();}c.restore();}
 for(const {p,q} of visible.filter(o=>!o.q.locked)){if(reducedMotion)continue;c.save();c.globalAlpha=Math.min(1,q.progress*5);for(let j=3;j>0;j--){const prev=position(p,localAge-j*.018);if(!prev)continue;c.beginPath();c.moveTo(prev.x,prev.y);c.lineTo(q.x,q.y);c.strokeStyle=j%2?'#b594d7':'#7488ab';c.lineWidth=.45;c.globalAlpha=(.14-j*.025)*q.progress;c.stroke();}c.globalAlpha=Math.min(1,q.progress*5);c.translate(q.x,q.y);drawPiece(c,p,q.rotation);c.restore();}
 for(const {p,q} of visible.filter(o=>o.q.locked).sort((a,b)=>a.p.z-b.p.z)){
  c.save();const settle=!flying&&!reducedMotion?Math.exp(-(age-p.arrival)*22)*Math.sin((age-p.arrival)*50)*1.7:0;c.translate(q.x+settle,q.y-settle*.5);drawPiece(c,p,q.rotation);c.restore();if(!flying&&!reducedMotion)spark(c,q.x,q.y,age-p.arrival,p.id,.9);
 }
 if(localAge>.5&&!reducedMotion){c.save();c.globalAlpha=.48;for(let j=0;j<4;j++){const p=parts[Math.floor(localAge*9+j*7)%parts.length],q=position(p,localAge,{lockedOnly:true});if(!q)continue;c.beginPath();c.moveTo(q.x-6,q.y);c.lineTo(q.x-2,q.y-4);c.lineTo(q.x+2,q.y+1);c.lineTo(q.x+7,q.y-3);c.lineWidth=.85;c.strokeStyle='#d2b9ff';c.stroke();}c.restore();}
 c.restore();return visible.filter(o=>o.q.locked).length;
}
const api={parts,position,drawPiece,drawAssembly,clamp,ease};root.MareJikiAssembly=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
