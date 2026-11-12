/* Live piece replacement. Unsupported looks retain the current family with an explicit diagnostic. */
(function(root){'use strict';
function notice(text){if(!root.document?.body)return;let n=root.document.getElementById('rework-pieces-notice');if(!n){n=root.document.createElement('div');n.id='rework-pieces-notice';n.setAttribute('role','status');n.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9000;max-width:430px;background:#172228e8;color:white;padding:6px;font:11px sans-serif;pointer-events:none';root.document.body.appendChild(n);}n.textContent=text;}
function create({loadRegistry,loadImage,notify=notice}={}){
 let state='loading',registry=null,init=null,reason='',applied=0,lastNotice='';const images=new Map(),pending=new Map(),failed=new Set();
 const report=s=>{reason=s;if(lastNotice!==s){lastNotice=s;notify(s);}};
 const ready=()=>init||(init=(async()=>{try{registry=await loadRegistry();state='ready';return true;}catch(e){state='failed';report('Peças rework indisponíveis: '+e.message+'. Peças atuais mantidas.');return false;}})());
 const mappedLook=look=>({...look,...(look.hair==='original'?{originalHairStyle:'cropped'}:{}),...(look.hideHeadgear?{head:'original'}:{})});
 const resolve=(selected,look)=>registry?.resolve({body:({masculino:'male',feminino:'female'})[selected.body]||selected.body,direction:selected.direction,look:mappedLook(look)})||null;
 async function prepare(selected,look){if(!await ready())return false;const entry=resolve(selected,look);if(!entry){report('Peças atuais mantidas: combinação fora do rework disponível.');return false;}const key=entry.id||JSON.stringify([selected.body,selected.direction,look]);if(failed.has(key))return false;if(pending.has(key))return pending.get(key);
 const task=(async()=>{try{for(const path of registry.requiredFiles(entry)){if(!images.has(path)){images.set(path,await loadImage(path));while(images.size>32)images.delete(images.keys().next().value);}}report('Peças rework em teste: cabeça/cabelo/capacete substituídos; corpo e demais peças atuais preservados.');return true;}catch(e){failed.add(key);report('Falha na peça rework: '+e.message+'. Peças atuais mantidas.');return false;}finally{pending.delete(key);}})();pending.set(key,task);return task;}
 function compose(selected,look,options){if(state!=='ready')return null;const entry=resolve(selected,look);if(!entry||registry.requiredFiles(entry).some(p=>!images.has(p)))return null;try{const result=registry.compose(entry,images,{...options,look:mappedLook(look)});if(!result)return null;applied++;return result;}catch(e){report('Encaixe rework recusado: '+e.message+'. Peças atuais mantidas.');return null;}}
 return Object.freeze({prepare,compose,snapshot:()=>({state,reason,applied,images:images.size})});
}
const api={create};root.MareReworkHeadLive=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
