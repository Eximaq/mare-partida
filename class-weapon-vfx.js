'use strict';
/* Presentation only. Existing projectile travel, collision, cooldowns and damage
   remain authoritative; equipment adds no extra hits or passive particle loops. */
((root)=>{
 const themes=Object.freeze({
  'coral-impact':{color:'#96abcb',shape:'shards'},
  'dragon-impact':{color:'#ec6059',shape:'crescent'},
  'seismic-impact':{color:'#82d8e3',shape:'rings'},
  'rupture-impact':{color:'#ff4d62',shape:'fissures'},
  'wind-shot':{color:'#bbf0ff',shape:'wind'},
  'corsair-shot':{color:'#ffd184',shape:'tracer'},
  'horizon-shot':{color:'#95d8ff',shape:'tracer'},
  'celestial-shot':{color:'#fff1bb',shape:'tracer'},
  'iron-impact':{color:'#b8becb',shape:'shards'},
  'pacifista-shot':{color:'#8cf7ff',shape:'beam'},
  'hydraulic-impact':{color:'#d9b16a',shape:'rings'},
  'seraphim-shot':{color:'#e7fcff',shape:'beam'},
  'monsoon-shot':{color:'#a4eced',shape:'wind',asset:121},
  'thunder-shot':{color:'#80bcff',shape:'rings',asset:122},
  'crimson-shot':{color:'#ed626e',shape:'crescent',asset:123},
  'calamity-shot':{color:'#eac67b',shape:'rings',asset:124},
  'drum-shot':{color:'#97e5b0',shape:'rings',asset:125},
  'sakura-shot':{color:'#f2addb',shape:'crescent',asset:126},
  'tides-shot':{color:'#7cdbeb',shape:'wind',asset:127},
  'miracle-shot':{color:'#f9e5ad',shape:'rings',asset:128}
 });
 const cache=new Map(),missiles=new Map();
 if(typeof Image!=='undefined')for(const theme of Object.values(themes))if(theme.asset){const image=new Image();image.src='assets/effects/class-weapons/projectile-'+theme.asset+'.png';missiles.set(theme.asset,image);}
 const style=definition=>Object.hasOwn(themes,definition?.weaponVisual)?definition.weaponVisual:null;
 function hit(ctx,key,kind,x,y,elapsed,options={}){
  const theme=themes[key],vfx=root.MareCombatVfx,index=vfx.frame(kind,elapsed,options);
  if(!theme||index===null||typeof document==='undefined')return false;
  const cacheKey=[key,kind,index].join(':'),width=options.width||64;let tile=cache.get(cacheKey);
  if(!tile){
   tile=document.createElement('canvas');tile.width=tile.height=192;
   const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
   if(!vfx.draw(c,kind,96,96,elapsed,{...options,width:144,staticFrame:index}))return false;
   c.globalCompositeOperation='source-atop';c.globalAlpha=.55;c.fillStyle=theme.color;c.fillRect(0,0,192,192);
   cache.set(cacheKey,tile);while(cache.size>96)cache.delete(cache.keys().next().value);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,x-width/2,y-width/2,width,width);
  const frames=vfx.data.effects[kind].frames.length,progress=Math.max(0,Math.min(1,(index-(options.start||0)+1)/Math.max(1,frames-(options.start||0))));
  ctx.translate(x,y);ctx.strokeStyle=theme.color;ctx.lineWidth=1.5;ctx.globalAlpha*=1-progress;
  if(theme.shape==='rings'||theme.shape==='wind')for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(0,0,8+progress*26+i*5,4+progress*11+i*3,0,0,Math.PI*2);ctx.stroke();}
  else for(let i=0;i<6;i++){
   const angle=i*Math.PI/3+(theme.shape==='crescent'?progress:0),near=6+progress*8,far=near+6+progress*9;
   ctx.beginPath();ctx.moveTo(Math.cos(angle)*near,Math.sin(angle)*near);
   ctx.lineTo(Math.cos(angle+.13)*(far-3),Math.sin(angle+.13)*(far-3));ctx.lineTo(Math.cos(angle)*far,Math.sin(angle)*far);ctx.stroke();
  }
  ctx.restore();return true;
 }
 function projectile(ctx,p,options={}){
  const theme=themes[p.weaponStyle],beam=p.kind==='cyborg'&&['iron-impact','pacifista-shot','hydraulic-impact','seraphim-shot'].includes(p.weaponStyle),bullet=p.kind==='gunner'&&['wind-shot','corsair-shot','horizon-shot','celestial-shot'].includes(p.weaponStyle),magic=theme?.asset&&['mage','healer'].includes(p.kind);
  if(!theme||!beam&&!bullet&&!magic)return false;
  if(magic&&p.phase!=='impact'&&p.phase!=='done'){
   const image=missiles.get(theme.asset);if(!image?.complete||!image.naturalWidth)return false;
   // Generated material follows the existing projectile, not a second entity.
   ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(p.x,p.y);ctx.rotate(p.angle);const size=p.weaponStyle==='calamity-shot'||p.weaponStyle==='miracle-shot'?40:34;ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore();return true;
  }
  if(p.phase==='impact')return hit(ctx,p.weaponStyle,p.kind,p.x,p.y,p.elapsed,{start:root.MareCombatVfx.impactStart(p.kind),width:64});
  if(p.phase==='done')return true;
  if(beam){
   const origin=options.origin||p.origin;ctx.save();ctx.lineCap='round';
   for(const [width,color,alpha]of [[8,theme.color,.3],[4,theme.color,.8],[1.5,'#f3fdff',1]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
   ctx.restore();return true;
  }
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.lineCap='round';ctx.lineWidth=2;
  if(p.weaponStyle!=='wind-shot'){
   ctx.strokeStyle=theme.color;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(8,0);ctx.stroke();ctx.fillStyle=p.weaponStyle==='celestial-shot'?'#fffbe6':'#f2fcff';ctx.fillRect(4,-1,7,2);ctx.restore();return true;
  }
  // Three moving air filaments reuse the projectile's existing position/clock.
  for(let i=0;i<3;i++){
   const phase=p.age*18+i*2,y=(i-1)*5;ctx.globalAlpha=.65-i*.12;ctx.strokeStyle=i?'#91dbea':'#edfcff';
   ctx.beginPath();ctx.moveTo(-24-i*4,y);ctx.quadraticCurveTo(-8,y+Math.sin(phase)*4,9-i*2,y);ctx.stroke();
  }
  ctx.fillStyle='#f4fdff';ctx.fillRect(6,-1,7,2);ctx.restore();return true;
 }
 const api={style,themes,hit,projectile,get cacheSize(){return cache.size;}};
 root.MareClassWeaponVfx=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
