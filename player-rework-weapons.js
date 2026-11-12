/* Exact approved composite sources. This opt-in does not mutate gameplay or imply arbitrary outfit compatibility. */
(function(root){
'use strict';
const safe=p=>typeof p==='string'&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(s=>s==='..'||s==='')&&!/[?#\x00-\x1f]/.test(p);
const APPROVED_ORIGIN='https://raw.githubusercontent.com/Eximaq/mare-partida/2801902fa2dad8e83069815faeaa3f53f90bc1b6/';
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function validate(m){
 if(!['approved-weapon-cycles-v1','approved-composite-cycles-v1'].includes(m?.schema)||!Array.isArray(m.cycles)||m.cycles.length>12000)throw Error('Invalid cycle catalog');
 const ids=new Set();for(const c of m.cycles){
  if(typeof c.id!=='string'||ids.has(c.id)||!Number.isInteger(c.item)||!['male','female'].includes(c.body)||!['north','south','east','west'].includes(c.direction)||!safe(c.archive)||!(c.archive.startsWith('art-approved/')||(c.archiveSource==='local'&&(c.archive.startsWith('tools/rework-outfits/generated/')||c.archive.startsWith('tools/rework-weapons/generated/'))))||!digest(c.archiveSha256)||!Array.isArray(c.frames)||!c.frames.length||c.frames.length>128||!Array.isArray(c.timeline)||!c.timeline.length||c.timeline.length>2000||c.timeline.some(i=>!Number.isInteger(i)||i<0||i>=c.frames.length)||!Number.isFinite(c.fps)||c.fps<=0||c.fps>120||!Array.isArray(c.logicalFrame)||c.logicalFrame.length!==2||c.logicalFrame.some(x=>!Number.isFinite(x)||x<1||x>1024)||!Array.isArray(c.pivot)||c.pivot.length!==2||c.pivot.some(x=>!Number.isFinite(x)||Math.abs(x)>1024))throw Error('Invalid cycle '+c.id);
  if(c.archiveParts&&(!Array.isArray(c.archiveParts)||c.archiveParts.length>256||c.archiveParts.some(p=>!safe(p)||!p.startsWith('art-approved/'))))throw Error('Invalid archive parts');
  if(c.archiveSource&&!['approved-repo','local'].includes(c.archiveSource))throw Error('Invalid archive source');
  for(const f of c.frames)if(!safe(f.path)||!digest(f.sha256)||!Number.isInteger(f.width)||!Number.isInteger(f.height)||f.width<1||f.height<1||f.width>2048||f.height>2048)throw Error('Invalid frame');
  ids.add(c.id);
 }return m;
}
function notice(text){if(!root.document?.body)return;let n=root.document.getElementById('rework-test-notice');if(!n){n=root.document.createElement('div');n.id='rework-test-notice';n.setAttribute('role','status');n.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9999;max-width:450px;background:#182126ed;color:white;padding:8px;font:12px sans-serif;pointer-events:none';root.document.body.appendChild(n);}n.textContent=text;}
function create({search='',baseURL=root.location?.href,mode='weapons',manifestPath='tools/rework-weapons/catalog.json',onChange=()=>{},notify=notice,fetchJSON=async u=>{const r=await fetch(u);if(!r.ok)throw Error('Catalog HTTP '+r.status);return r.json();},loadCycle}={}){
 const query=new URLSearchParams(search),active=query.get('reworkTest')===mode,cache=new Map(),archives=new Map(),archivePending=new Map(),failed=new Map(),pending=new Map();let state=active?'loading':'disabled',error=null,catalog=null,loading=null,last=null,lastNotice='';
 const report=s=>{if(active&&s!==lastNotice){lastNotice=s;notify(s);}};
 if(!loadCycle)loadCycle=async c=>{
  if(!root.MareReworkZip)throw Error('ZIP decoder unavailable');
  let zip=archives.get(c.archiveSha256);
  if(!zip){
   let job=archivePending.get(c.archiveSha256);
   if(!job){job=(async()=>{const paths=c.archiveParts?.length?c.archiveParts:[c.archive],parts=new Array(paths.length);let total=0,next=0;async function worker(){while(next<paths.length){const i=next++,path=paths[i],response=await fetch(new URL(path,c.archiveSource==='local'?baseURL:APPROVED_ORIGIN));if(!response.ok)throw Error('Archive HTTP '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());total+=bytes.length;if(total>64*1024*1024)throw Error('Archive too large');parts[i]=bytes;}}await Promise.all(Array.from({length:Math.min(4,paths.length)},worker));const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}const result=await root.MareReworkZip.loadArchive(bytes,c.archiveSha256);archives.set(c.archiveSha256,result);while(archives.size>2)archives.delete(archives.keys().next().value);return result;})();archivePending.set(c.archiveSha256,job);}
   try{zip=await job;}finally{archivePending.delete(c.archiveSha256);}
  }
  const images=[];
  if(c.archiveParts&&(!Array.isArray(c.archiveParts)||c.archiveParts.length>256||c.archiveParts.some(p=>!safe(p)||!p.startsWith('art-approved/'))))throw Error('Invalid archive parts');
  if(c.archiveSource&&!['approved-repo','local'].includes(c.archiveSource))throw Error('Invalid archive source');
  for(const f of c.frames){const raw=await zip.read(f.path);const hash=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==f.sha256)throw Error('Frame integrity mismatch');const blob=new Blob([raw],{type:'image/png'}),url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth!==f.width||image.naturalHeight!==f.height)throw Error('Frame dimensions mismatch');images.push(image);}finally{URL.revokeObjectURL(url);}}
  return images;
 };
 async function prepare(){if(!active||state==='failed')return false;if(state==='ready')return true;if(loading)return loading;loading=(async()=>{try{catalog=validate(await fetchJSON(new URL(manifestPath,baseURL).href));state='ready';onChange();return true;}catch(e){state='failed';error=e.message;report('Catálogo rework indisponível: '+error);return false;}})();return loading;}
 function select(player={},o={}){
  if(!catalog)return null;const explicit=query.get('cycle');if(explicit)return catalog.cycles.find(c=>c.id===explicit&&c.direction===(o.direction||'south'))||null;
  const id=Number(query.get(mode==='weapons'?'weapon':'item')??player.equipment?.weapon?.def);const raw=query.get('body')||player.appearance96?.body||'male',body=['female','feminino'].includes(raw)?'female':'male',direction=o.direction||'south',outfit=query.get('outfit');
  const choices=catalog.cycles.filter(c=>c.item===id&&c.body===body&&c.direction===direction&&(!outfit||c.outfit===outfit));
  choices.sort((a,b)=>(Number(b.preferredSource)-Number(a.preferredSource))||((b.priority||0)-(a.priority||0)));return choices.find(c=>c.outfit==='base')||choices[0]||null;
 }
 async function prepareCycle(player,o={}){if(!await prepare())return false;const c=select(player,o);if(!c)return false;if(cache.has(c.id))return true;if(failed.has(c.id))return false;if(pending.has(c.id))return pending.get(c.id);const promise=(async()=>{try{const images=await loadCycle(c);if(images.length!==c.frames.length)throw Error('Frame count mismatch');cache.set(c.id,images);while(cache.size>3)cache.delete(cache.keys().next().value);onChange();return true;}catch(e){failed.set(c.id,e.message);report('Falha no ciclo '+c.id+': '+e.message);onChange();return false;}finally{pending.delete(c.id);}})();pending.set(c.id,promise);return promise;}
 function draw(ctx,player,o={}){
  if(!active||player?.zoanTransformed)return false;if(state!=='ready'){void prepare();return false;}const c=select(player,o),requested=o.action||'idle',action=requested.startsWith('attack')||['skill','skill-1','skill-2','combo'].includes(requested)?'attack':requested;
  if(!c){report('Rework: sem ciclo aprovado para arma/corpo/direção selecionados. Sem substituição por base antiga.');return false;}
  if(c.worldEligible===false&&!o.review){report('Fonte disponível na janela de revisão; encaixe no mundo ainda não calibrado.');return false;}
  const cycleAction=c.action||'attack';if(o.weaponless||!(action===cycleAction||action==='idle'&&cycleAction==='attack')){report(`Rework ${c.id}: sem ${requested}; não usa pose inventada ou base antiga.`);return false;}
  const images=cache.get(c.id);if(!images){void prepareCycle(player,o);return false;}cache.delete(c.id);cache.set(c.id,images);
  const progress=Number.isFinite(o.progress)?Math.max(0,Math.min(1,o.progress)):null,n=c.timeline.length,tick=action==='idle'?0:progress!==null?Math.min(n-1,Math.floor(progress*n)):cycleAction==='walk'?Math.floor(Math.max(0,o.time||0)*c.fps)%n:Math.min(n-1,Math.floor((Math.max(0,o.time||0)%(n/c.fps+.25))*c.fps));
  const index=c.timeline[tick],f=c.frames[index],scale=o.scale??1;if(!Number.isFinite(scale)||scale<=0)return false;ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(images[index],0,0,f.width,f.height,(o.x||0)-c.pivot[0]*scale,(o.y||0)-c.pivot[1]*scale,c.logicalFrame[0]*scale,c.logicalFrame[1]*scale);}finally{ctx.restore();}
  last={id:c.id,item:c.item,body:c.body,direction:c.direction,outfit:c.outfit,frame:index,action};report(`REWORK ${c.item} ${c.body}/${c.direction} (${c.outfit}): composição aprovada fechada; não adapta cosméticos salvos. ${c.timing==='authored'?'Sequência autoral.':'Sequência de revisão, tempo não certificado.'}`);return true;
 }
 return Object.freeze({active,prepare,prepareCycle,draw,projectileOrigin:()=>null,available:()=>catalog?.cycles||[],snapshot:()=>({state,error,last,notice:lastNotice,experimental:active,coverage:catalog?.cycles.length||0})});
}
const api={create,validate,APPROVED_ORIGIN};root.MareReworkWeapons=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
