/* Rework bridge: presentation only. No release is selected by default.
 * Once explicitly selected, missing content stays unavailable: never mix an old body.
 */
(function(root){
'use strict';
const directions=['south','north','east','west'],actions=['idle','walk','attack','cast','hurt','death'];
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v;
function appearanceKey(player){return JSON.stringify(canonical({classId:player?.classId,appearance:player?.appearance96||{},equipment:Object.fromEntries(Object.entries(player?.equipment||{}).map(([slot,item])=>[slot,item?.def??null]))}));}
function validate(release){
 if(release?.schema!=='player-rework-release-v1'||release.approved!==true||release.productionEnabled!==true||release.coverageCertified!==true)throw Error('Incomplete or unapproved rework release');
 if(!Array.isArray(release.variants)||!release.variants.length)throw Error('No certified appearances');
 const keys=new Set();for(const v of release.variants){if(typeof v.key!=='string'||keys.has(v.key))throw Error('Invalid appearance key');keys.add(v.key);
  for(const a of actions)for(const d of directions){const c=v.clips?.[a+'/'+d];if(!c||!Array.isArray(c.frames)||!c.frames.length||c.frames.some(p=>typeof p!=='string'||!/^assets\/player-rework\/[\w./-]+\.png$/.test(p)||p.includes('..')))throw Error('Missing clip '+a+'/'+d);
   if(!Array.isArray(c.frame)||c.frame.length!==2||c.frame.some(n=>!Number.isInteger(n)||n<=0||n>256)||!Number.isInteger(c.density)||c.density<1||c.density>8||!Array.isArray(c.pivot)||c.pivot.length!==2||c.pivot.some(n=>!Number.isFinite(n))||!Number.isFinite(c.fps)||c.fps<=0||typeof c.loop!=='boolean')throw Error('Invalid geometry/timing');
   if(a==='attack'&&(!Number.isInteger(c.contact)||c.contact<0||c.contact>=c.frames.length))throw Error('Missing authored contact');
  }
 }
 return release;
}
function create({release=null,loadImage,onChange=()=>{}}={}){
 const active=release?.productionEnabled===true,images=new Map(),pending=new Map(),failed=new Set();let state=active?'loading':'disabled',error=null,last=null,emissionError=null;
 if(active)try{validate(release);}catch(e){state='blocked';error=e.message;}
 function variant(player){return active&&state!=='blocked'?release.variants.find(v=>v.key===appearanceKey(player)):null;}
 async function prepare(player,{action='idle',direction='south'}={}){const v=variant(player);if(!v){if(active&&state!=='blocked')state='unsupported';return false;}const clip=v.clips[action+'/'+direction];if(!clip)return false;const key=v.key+':'+action+'/'+direction;if(failed.has(key))return false;if(pending.has(key))return pending.get(key);
  const task=(async()=>{try{for(const path of clip.frames){if(images.has(path))continue;const image=await loadImage(path);if((image.naturalWidth||image.width)!==clip.frame[0]*clip.density||(image.naturalHeight||image.height)!==clip.frame[1]*clip.density)throw Error('Invalid frame dimensions');images.set(path,image);while(images.size>48)images.delete(images.keys().next().value);}state='ready';error=null;onChange();return true;}catch(e){failed.add(key);state='failed';error=e.message;onChange();return false;}finally{pending.delete(key);}})();pending.set(key,task);return task;
 }
 function draw(ctx,player,o={}){if(!active||player?.zoanTransformed)return false;const v=variant(player);if(!v)return false;let action=o.action||'idle';if(['combat-idle','guard','reload','dodge'].includes(action))action='idle';else if(action.startsWith('attack')||['skill','skill-1','skill-2','combo'].includes(action))action='attack';
  // Casting, weaponless, death and hurt require explicit clips in the selected release.
  if(o.weaponless)action='cast';else if(['heal','castPalm'].includes(action))action='cast';if(!actions.includes(action))return false;const clip=v.clips[action+'/'+(o.direction||'south')];if(!clip)return false;
  let i=0;
  if(clip.loop)i=Math.floor(Math.max(0,o.time||0)*clip.fps)%clip.frames.length;
  else if(o.preview){const time=Math.max(0,o.time||0)%(clip.frames.length/clip.fps+.25);i=Math.min(clip.frames.length-1,Math.floor(time*clip.fps));}
  else if(Number.isFinite(o.progress)){
   const p=Math.max(0,Math.min(1,o.progress));
   if(action==='attack'){const hit=Math.max(.001,Math.min(.999,o.timing?.hitFrameRatio??.5));i=p<hit?Math.min(Math.max(0,clip.contact-1),Math.floor(p/hit*clip.contact)):Math.min(clip.frames.length-1,clip.contact+Math.floor((p-hit)/(1-hit)*(clip.frames.length-clip.contact)));}
   else i=Math.min(clip.frames.length-1,Math.floor(p*clip.frames.length));
  }
  const im=images.get(clip.frames[i]);if(!im){void prepare(player,{action,direction:o.direction||'south'});return false;}const scale=o.scale??1;if(!Number.isFinite(scale)||scale<=0)return false;const [w,h]=clip.frame,[px,py]=clip.pivot,x=o.x||0,y=o.y||0;
  ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(im,0,0,w*clip.density,h*clip.density,x-px*scale,y-py*scale,w*scale,h*scale);}finally{ctx.restore();}last={action,direction:o.direction||'south',frame:i,consumer:o.consumer||'world'};return true;
 }
 // No authored per-state emission contract is available yet. Never consult native96.
 function projectileOrigin(){if(active)emissionError='Rework emission unavailable: authored per-state sockets are not integrated';return null;}
 return Object.freeze({active,prepare,draw,projectileOrigin,snapshot:()=>({state,error,last,emissionError})});
}
const api={create,validate,appearanceKey};root.MarePlayerReworkRuntime=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
