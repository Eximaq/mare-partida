'use strict';
// Visual-only adapter. Original timeline frames remain authoritative for combat.
((root)=>{
 const art=root.MareParameciaReworkManifest||(typeof require==='function'?require('./paramecia-rework-manifest.js'):{});
 const groups={rankA:['ope','mero','doku','ito'],rankB:['hana','beta'],rankC:['horu','mato'],rankCExpansion:['bomu','kobu'],hoya:['hoya'],jiki:['jiki'],doru:['doru']};
 function apply(group,data){if(!data)return;const effects=data.effects||data.animations;
  for(const fruit of groups[group]||[]){const source=art[fruit];if(!source)continue;
   for(const [key,visual]of Object.entries(source.effects)){const target=effects[key==='mark-lock'?'mark':key];if(target&&!target.rework){target.image=visual.image;target.rework=visual;}}
   const rule=data.rules[fruit]||data.rules;
   for(const skill of rule.skills||[]){const icon=source.icons['skill-'+skill.key];if(icon)skill.icon_path=icon;}
   if(rule.shambles&&source.icons.shambles)rule.shambles.icon_path=source.icons.shambles;
  }
 }
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function sequence(list,t,duration,loop=true){if(!list.length)return null;t=Math.max(0,t);if(loop)t%=duration;return list[clamp(Math.floor(t/Math.max(1,duration)*list.length),0,list.length-1)];}
 function frame(effect,legacy,elapsed=0,phase='loop',kind=''){
  const v=effect.rework;if(!v)return legacy;const list=v.frames;
  // Preserve phase transitions while allowing every new visual pose to play.
  if(v.phases&&v.phases[phase]){const p=v.phases[phase];return sequence(list.slice(p.first,p.last+1),elapsed,p.duration,p.loop);}
  if(kind==='punch'){const interval=effect.duration/4;return sequence(list,elapsed%interval,interval,false);}
  if(kind==='choke'){if(elapsed<996)return sequence(list.slice(0,8),elapsed,996,false);if(elapsed<5996)return sequence(list.slice(8,12),elapsed-996,332,true);return sequence(list.slice(12),elapsed-5996,332,false);}
  if(kind==='breath'||kind==='bomb'){const flight=kind==='breath'?497:1065;return phase==='impact'?sequence(list.slice(8),elapsed,kind==='breath'?710:142,false):sequence(list.slice(0,8),elapsed,flight,true);}
  if(kind==='revolution'){return elapsed<630?sequence(list.slice(0,8),elapsed,630,false):sequence(list.slice(8),elapsed-630,441,true);}
  if(kind==='deposition')return sequence(list,elapsed,1071,false);
  if(kind==='rocket')return sequence(phase==='impact'?list.slice(12):list.slice(0,12),elapsed,phase==='impact'?355:852,phase!=='impact');
  if(kind==='heal'||kind==='mutation'||kind==='axe'||kind==='buff'||kind==='summoner'||kind==='burst'||kind==='slime'||kind==='tether')return sequence(list,elapsed,effect.duration,phase!=='once');
  const index=Math.max(0,effect.frames.indexOf(legacy));
  if(kind==='room')return list[index<25?Math.min(7,Math.floor(index/25*8)):8+(index-25)%4];
  if(kind==='kiss')return list[index<14?Math.floor(index/14*8):8+Math.min(3,Math.floor((index-14)/11*4))];
  if(kind==='gasBomb')return list[index<8?Math.floor(index/8*4):4+Math.min(7,Math.floor((index-8)/25*8))];
  if(kind==='tact')return list[Math.min(8,Math.floor(index/29*9))];
  if(kind==='gamma'||kind==='rain')return list[Math.min(7,Math.floor(index/25*8))];
  return list[Math.min(list.length-1,Math.floor(index/effect.frames.length*list.length))];
 }
 function applyCatalog(catalog,supaRules){const kuku=catalog.find(f=>f.id==='akuma_kuku_kuku');if(kuku)kuku.skill_icon_path='assets/akuma/reworks/rank-s/icons/kuku-1.png';for(const skill of supaRules?.skills||[]){const icon=art.supa.icons['skill-'+skill.key];if(icon)skill.icon_path=icon;}}
 function markVisual(elapsed){if(elapsed<0||elapsed>=10000)return null;const key=elapsed<315?'mark-lock':elapsed<9820?'mark-hold':'mark-expire',effect=art.mato.effects[key];return {key,effect,frame:sequence(effect.frames,elapsed-(key==='mark-lock'?0:key==='mark-hold'?315:9820),effect.duration,key==='mark-hold')};}
 function flagFeedback(c,kind,elapsed,x,y,scale=1){const age=elapsed/1000,gold=kind==='revolution';if(age<.1||age>1.9)return;c.save();if(age<=1.4){const q=clamp((age-.1)/1.3,0,1),r=(8+123*q)*scale,a=Math.sin(Math.PI*q);c.globalAlpha=a*.86;c.strokeStyle=gold?'#f4bd59':'#736082';c.lineWidth=(4-2*q)*scale;c.beginPath();c.ellipse(x,y,r,r*.31,0,0,Math.PI*2);c.stroke();c.globalAlpha=a*.13;c.fillStyle=gold?'#ffd37c':'#785b94';c.fill();}for(let j=0;j<15;j++){const u=(age-.22-(j%5)*.06)/1.3;if(u<0||u>1)continue;const off=Math.sin(j*2.399)*(12+8*u)*scale,yy=gold?-5-74*u:-74+58*u;c.globalAlpha=Math.sin(Math.PI*u)*.85;c.fillStyle=gold?(j%3?'#ffdd87':'#fff5d6'):(j%3?'#b29fc4':'#665474');const size=(j%4===0?3:2)*scale;c.fillRect(Math.round(x+off),Math.round(y+yy*scale),size,size);}c.restore();}
 const auraSource=fruit=>fruit.id==='akuma_beri_beri'?'assets/akuma/reworks/beri/aura.png':fruit.vfx_sprite_sheet;
 const api={art,apply,frame,sequence,applyCatalog,markVisual,flagFeedback,auraSource};root.MareParameciaReworks=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
