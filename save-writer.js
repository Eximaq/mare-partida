'use strict';
/* One local browser tab writes a save at a time. Not server/multidevice authority. */
((root)=>{
 function create(key){
  const status={ready:false,owner:false,exclusive:!!root.navigator?.locks,release:null};
  if(!status.exclusive){status.ready=true;status.owner=true;return status;}
  root.navigator.locks.request('mare-save-writer:'+key,{ifAvailable:true},async lock=>{status.ready=true;status.owner=!!lock;if(!lock){root.dispatchEvent(new Event('mare-save-readonly'));return;}
   await new Promise(resolve=>{status.release=()=>{status.owner=false;resolve();};root.addEventListener('pagehide',status.release,{once:true});});
  }).catch(()=>{status.ready=true;status.owner=false;root.dispatchEvent(new Event('mare-save-readonly'));});
  return status;
 }
 root.MareSaveWriter={create};
})(globalThis);
