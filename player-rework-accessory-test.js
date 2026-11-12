/* Browser opt-in: ?reworkTest=accessories&accessory=0 (0-based exact snapshot list).
 * Test mannequin only. Unsupported actions disappear with an explicit status,
 * never silently render the old character. No save/equipment mutation.
 */
(function(root){'use strict';
function create({search=root.location?.search||'',baseURL='',fetchJSON=async url=>{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json();},loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Image load failed: '+url));im.src=url;}),makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},onChange=()=>{}}={}){
 const params=new URLSearchParams(search),active=params.get('reworkTest')==='accessories';let driver=null,state=active?'loading':'disabled',error=null,pending=null,selection=null,count=0;
 const url=p=>baseURL?new URL(p,baseURL).href:p;
 function report(){if(!active||!root.document?.body)return;let node=root.document.getElementById('rework-test-notice');if(!node){node=root.document.createElement('div');node.id='rework-test-notice';node.setAttribute('role','status');node.style.cssText='position:fixed;bottom:8px;left:8px;max-width:min(440px,90vw);padding:8px;background:#182126ed;color:white;font:12px sans-serif;z-index:9999;pointer-events:none';root.document.body.appendChild(node);}const status=driver?.snapshot();node.textContent='TESTE ACESSÓRIOS: manequim rework idle, aparência fixa da fonte; save/equipamentos inalterados. '+(status?.error||error||status?.state||state);}
 async function init(){if(!active)return false;if(driver)return true;if(pending)return pending;if(state==='failed')return false;
  pending=(async()=>{try{const api=root.MareReworkAccessoryPilot;if(!api||!root.ReworkAccessoryVendor)throw Error('Accessory pilot scripts not loaded');
   const manifest=await fetchJSON(url('tools/rework-accessories/manifest.json')),catalogs={};for(const p of Object.keys(api.PACKAGE_TYPES))catalogs[p]=await fetchJSON(url('tools/rework-accessories/'+p+'/catalog.json'));
   const list=api.selections(manifest,catalogs),raw=params.get('accessory')??String(Math.max(0,list.findIndex(s=>s.directions.includes('south'))));if(!/^\d+$/.test(raw)||Number(raw)>=list.length)throw Error('Accessory index must be between 0 and '+(list.length-1));selection=list[Number(raw)];count=list.length;
   driver=api.create({enabled:true,manifest,catalogs,selection,loadImage:p=>loadImage(url(p)),makeCanvas,onChange,vendor:root.ReworkAccessoryVendor});state='ready';report();onChange();return true;
  }catch(e){state='failed';error=e.message;report();onChange();return false;}finally{pending=null;}})();return pending;
 }
 async function prepare(player,o={}){if(!await init())return false;return driver.prepare(player,o);}
 function draw(ctx,player,o={}){if(!active)return false;if(!driver){void init();report();return false;}const result=driver.draw(ctx,player,o);report();return result;}
 return Object.freeze({active,prepare,draw,projectileOrigin:()=>null,snapshot:()=>driver?{...driver.snapshot(),mode:'accessories',selection,count}:({state,error,mode:'accessories',selection,count,staticIdleOnly:true,appearanceOverride:true})});
}
const api={create};root.MareReworkAccessoryTest=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
