/* Explicit visual test only: approved source composites, never a gameplay release. */
(function(root){
'use strict';
function showNotice(text){
 if(!root.document?.body)return;
 let node=root.document.getElementById('rework-test-notice');
 if(!node){node=root.document.createElement('div');node.id='rework-test-notice';node.setAttribute('role','status');node.style.cssText='position:fixed;bottom:8px;left:8px;max-width:min(440px,90vw);padding:8px;background:#182126ed;color:#fff;font:12px sans-serif;z-index:9999;pointer-events:none;border:1px solid #d5af65';root.document.body.appendChild(node);}
 node.textContent=text;
}
function create({search='',baseURL=root.location?.href,onChange=()=>{},fetchJSON=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();},loadImage=async url=>{const im=new Image();im.src=url;await im.decode();return im;},notify=showNotice}={}){
 const id=new URLSearchParams(search).get('reworkTest'),donor=id==='donor-f6-north',active=['109','17','donor-f6-north'].includes(id),images=[];
 const notice=donor?'TESTE VISUAL F6: conjunto feminino F6+147+152+155 fechado, somente walk NORTH; não adapta aparência salva.':`TESTE VISUAL ${id}: fonte masculina SOUTH, aparência/equipamentos visuais da fonte; timing experimental${id==='109'?', 7 estados sem retorno completo':''}. Save e combate inalterados.`;
 let state=active?'loading':'disabled',error=null,item=null,pending=null,last=null;
 const report=detail=>{if(active)notify(notice+' '+detail);};
 async function prepare(){
  if(!active||state==='failed')return false;if(state==='ready')return true;if(pending)return pending;
  report('Carregando.');
  pending=(async()=>{try{
   const base=new URL(donor?'tools/rework-donor-f6-north/':'tools/rework10917/assets/',baseURL),manifest=await fetchJSON(new URL('manifest.json',base).href);
   let paths;
   if(donor){
    if(manifest.id!==id||manifest.direction!=='north'||manifest.action!=='walk'||manifest.density!==4||manifest.logicalFrame?.width!==128||manifest.logicalFrame?.height!==128||manifest.pivot?.x!==64||manifest.pivot?.y!==112||manifest.clip?.fps!==40||manifest.timeline?.length!==40||manifest.timeline.some(p=>!/^frames\/(0[0-9]|1[01])\.png$/.test(p)))throw Error('Invalid donor source');
    item={frame:[128,128],pivot:[64,112]};paths=manifest.timeline;
   }else{
    item=manifest.items?.[id];
    if(manifest.schema!=='drawn8-authored-review-v1'||item?.direction!=='south'||item.body!=='masculino'||item.density!==4||JSON.stringify(item.frame)!=='[160,160]'||JSON.stringify(item.pivot)!=='[80,128]'||item.frames?.length!==(id==='109'?7:8))throw Error('Invalid test source');
    paths=item.frames.map((f,i)=>{if(f.approved!==`${id}/${i}-final.png`)throw Error('Invalid source path');return f.approved;});
   }
   const loaded=new Map();for(const path of paths){let im=loaded.get(path);if(!im){im=await loadImage(new URL(path,base).href);if((im.naturalWidth||im.width)!==item.frame[0]*4||(im.naturalHeight||im.height)!==item.frame[1]*4)throw Error('Invalid source dimensions');loaded.set(path,im);}images.push(im);}
   state='ready';report(donor?'Somente caminhada NORTH disponível.':'Somente idle/ataque SOUTH disponíveis.');onChange();return true;
  }catch(e){state='failed';error=e.message;report('Fonte indisponível: '+error);onChange();return false;}})();return pending;
 }
 function draw(ctx,player,o={}){
  if(!active||player?.zoanTransformed)return false;
  const direction=o.direction||'south',requested=o.action||'idle',action=requested.startsWith('attack')||['skill','skill-1','skill-2','combo'].includes(requested)?'attack':requested;
  if((donor?(direction!=='north'||action!=='walk'):(direction!=='south'||!['idle','attack'].includes(action)))||o.weaponless){report(`Sem cobertura: ${requested}/${direction}. Personagem oculto, sem pose substituta.`);return false;}
  if(state!=='ready'){void prepare();return false;}
  const n=images.length,progress=Number.isFinite(o.progress)?Math.max(0,Math.min(1,o.progress)):null;
  const frame=donor?Math.floor(Math.max(0,o.time||0)*40)%n:action==='idle'?0:progress!==null?Math.min(n-1,Math.floor(progress*n)):Math.min(n-1,Math.floor((Math.max(0,o.time||0)%(n/8+.25))*8));
  const scale=o.scale??1;if(!Number.isFinite(scale)||scale<=0)return false;
  const [w,h]=item.frame,[px,py]=item.pivot;ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(images[frame],0,0,w*4,h*4,(o.x||0)-px*scale,(o.y||0)-py*scale,w*scale,h*scale);}finally{ctx.restore();}
  last={item:donor?id:Number(id),action,direction,frame};report(`Exibindo ${action}/${direction}, quadro ${frame}.`);return true;
 }
 function projectileOrigin(){report('Emissão sem socket rework: não utiliza o rig antigo.');return null;}
 return Object.freeze({active,prepare,draw,projectileOrigin,snapshot:()=>({state,error,last,notice:active?notice:null,experimental:active})});
}
const api={create};root.MarePlayerReworkTest=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
