/* Explicit, presentation-only idle pilot. Does not alter player/save/equipment.
 * It displays a selected authored snapshot, not arbitrary equipment combinations.
 * Once selected, callers MUST NOT fall back to the old renderer on false.
 */
(function(root){
'use strict';
const PACKAGE_TYPES=Object.freeze({
 'hair_user_adjustments_source-only_v1':'hairFemale',
 'male_hair_user_adjustments_source-only_v1':'hairMale',
 'headgear_user_adjustments_source-only_v1':'headFemale',
 'male_headgear_user_adjustments_source-only_v1':'headMale'
});
const targetKey=t=>JSON.stringify([t.snapshot,t.packSHA256,t.item??null,t.body,t.style,t.direction]);
function selections(manifest,catalogs){
 const result=[];
 for(const [packageName,type] of Object.entries(PACKAGE_TYPES)){
  const catalog=catalogs[packageName];if(!catalog)continue;
  for(const entry of catalog.entries){const records=manifest.records.filter(r=>r.package===packageName&&r.target.snapshot===entry.id&&r.target.packSHA256===entry.packSHA256);
   if(records.length)result.push({package:packageName,snapshot:entry.id,body:entry.body,style:entry.style,item:entry.item??null,directions:records.map(r=>r.target.direction),kind:type.startsWith('hair')?'hair':'headgear'});
  }
 }
 return result;
}
function create({enabled=false,manifest,catalogs={},selection,loadImage,makeCanvas,onChange=()=>{},vendor=root.ReworkAccessoryVendor,assetBase='tools/rework-accessories/assets/'}={}){
 const active=enabled===true,cache=new Map(),pending=new Map(),failed=new Set();let state=active?'loading':'disabled',error=null,last=null,entry=null,records=[],type=null;
 if(active)try{
  if(!vendor||manifest?.schema!=='rework-accessory-source-index-v1'||!Array.isArray(manifest.records))throw Error('Accessory pilot data unavailable');
  type=PACKAGE_TYPES[selection?.package];if(!type)throw Error('Unknown accessory package');
  const catalog=catalogs[selection.package];entry=catalog?.entries.find(e=>e.id===selection.snapshot);if(!entry)throw Error('Snapshot unavailable');
  records=manifest.records.filter(r=>r.package===selection.package&&r.target.snapshot===entry.id);
  if(!records.length)throw Error('No exact supplied adjustments for snapshot');
  const seen=new Set();for(const r of records){const expected=vendor[type].target(entry,r.target.direction);if(targetKey(expected)!==targetKey(r.target)||seen.has(r.target.direction))throw Error('Ambiguous or mismatched snapshot/hash/target');seen.add(r.target.direction);}
  const p=entry.pack;if(p.density!==4||p.frame?.width!==128||p.frame?.height!==128||p.pivot?.x!==64||p.pivot?.y!==112)throw Error('Unsupported idle geometry');
  if(typeof loadImage!=='function'||typeof makeCanvas!=='function')throw Error('Pilot loader/canvas required');
 }catch(e){state='blocked';error=e.message;}
 const unsupported=why=>{state='unsupported';error=why;return false;};
 async function prepare(_player,{action='idle',direction='south'}={}){
  if(!active||state==='blocked')return false;
  if(action!=='idle')return unsupported('Only static idle is authored; '+action+' is not covered');
  const record=records.find(r=>r.target.direction===direction);if(!record)return unsupported('No exact supplied adjustment for '+direction);
  if(cache.has(direction)){state='ready';error=null;return true;}if(failed.has(direction))return false;if(pending.has(direction))return pending.get(direction);
  const job=(async()=>{try{
   const dir=entry.pack.directions[direction];
   if(dir?.clip?.frames!==1||dir.poses?.length!==1||dir.renderMirrorFrom||dir.layers.some(l=>l.frames||!['fixed','bone','rigid'].includes(l.binding?.kind)))throw Error('Only independently authored static idle sources are supported');
   const images=new Map();for(const hash of new Set(dir.layers.map(l=>l.source))){if(!/^[a-f0-9]{64}$/.test(hash)||!manifest.assets[hash])throw Error('Source absent from verified manifest');const im=await loadImage(assetBase+hash+'.png');if((im.naturalWidth||im.width)!==512||(im.naturalHeight||im.height)!==512)throw Error('Invalid source dimensions');images.set(hash,im);}
   const api=vendor[type];let pack,adjusted;
   if(type.startsWith('hair')){const a=api.adjustment(record.adjustment,entry,direction);({pack,images:adjusted}=vendor.hairPreview.prepare(entry,direction,images,a,makeCanvas));}
   else {const a=api.adjustment(record.adjustment);pack=api.apply(entry.pack,direction,a,entry);adjusted=vendor.headPreview.imagesForHair(pack,direction,images,a,makeCanvas);}
   const canvas=makeCanvas(512,512);vendor.compositor.render(canvas.getContext('2d'),pack,adjusted,{direction,frame:0,density:4});
   cache.set(direction,canvas);state='ready';error=null;onChange();return true;
  }catch(e){state='failed';error=e.message;failed.add(direction);onChange();return false;}finally{pending.delete(direction);}})();pending.set(direction,job);return job;
 }
 function draw(ctx,player,o={}){
  if(!active||state==='blocked')return false;
  if(player?.zoanTransformed)return unsupported('Transformation is outside the idle snapshot pilot');
  const action=o.action||'idle',direction=o.direction||'south';if(action!=='idle')return unsupported('Only static idle is authored; '+action+' is not covered');
  if(!records.some(r=>r.target.direction===direction))return unsupported('No exact supplied adjustment for '+direction);
  const image=cache.get(direction);if(!image){void prepare(player,{action,direction});return false;}
  const scale=o.scale??1;if(!Number.isFinite(scale)||scale<=0)return false;const x=o.x??0,y=o.y??0;if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,512,512,x-64*scale,y-112*scale,128*scale,128*scale);}finally{ctx.restore();}
  state='ready';error=null;last={action,direction,frame:0,consumer:o.consumer||'world'};return true;
 }
 return Object.freeze({active,prepare,draw,projectileOrigin:()=>null,snapshot:()=>({state,error,last,pilot:true,staticIdleOnly:true,selection:selection?{...selection}:null,appearanceOverride:true,supportedDirections:records.map(r=>r.target.direction),notice:'Authored idle snapshot only; does not represent current player appearance or arbitrary equipment combinations.'})});
}
const api={create,selections,PACKAGE_TYPES};root.MareReworkAccessoryPilot=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
