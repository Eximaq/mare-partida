/* Resolve a compatible authored subset per pose; never mutate saved equipment or
 * combine unrelated baked cycles. Unsupported slots remain explicit diagnostics. */
(function(root){'use strict';
const invisible=new Set(['necklace','ring','belt','charm','cloak','akuma_no_mi','visual_completo']);
function create({native}={}){
 let last=null;const plans=new Map();
 function plan(p,o,rejected,availableOnly=false){
  if(!p||p.zoanTransformed)return null;
  const key=JSON.stringify([p.appearance96,p.equipment,!!root.MareHeadgear?.hidden(p),!!root.MareAppearance96,!!root.MareCharacterAppearance,o.action,o.direction,!!o.weaponless]);
  if(!rejected&&!availableOnly&&plans.has(key)){const previous=plans.get(key);if(!native.failureFor?.(previous.candidate,{...o,action:previous.options.action}))return previous;plans.delete(key);}
  // Do not cache a miss before the shared indexes/palette API have loaded.
  if(native.snapshot().state==='loading')return null;
  const slots=Object.entries(p.equipment||{}).filter(([s,v])=>v!=null&&!invisible.has(s)&&!(s==='head'&&root.MareHeadgear?.hidden(p))&&!(s==='weapon'&&o.weaponless));
  const subsets=Array.from({length:2**slots.length},(_,mask)=>({mask,count:slots.reduce((n,_,i)=>n+((mask>>i)&1),0)})).sort((a,b)=>b.count-a.count||b.mask-a.mask);
  // Maximize compatible equipment first; then preserve as many appearance fields
  // as the exact source supports. A recolorable bare body must not beat an
  // existing armed/clothed source merely because that source has a fixed palette.
  const raw=p.appearance96||{},fields=[['hairStyle','hair'],['hairColor'],['skinColor','skin'],['eyeStyle','face'],['eyeColor']];
  const variants=Array.from({length:32},(_,i)=>i).sort((a,b)=>fields.reduce((n,_,i)=>n+((a>>i)&1)-((b>>i)&1),0)||a-b).map(mask=>{
   const appearance96={...raw},unsupported=[];fields.forEach((aliases,i)=>{if((mask>>i)&1){const field=aliases.find(k=>Object.hasOwn(raw,k))||aliases[0];if(raw[field]&&raw[field]!=='original')unsupported.push(field);for(const alias of aliases)appearance96[alias]='original';}});return {appearance96,unsupported,adapted:mask!==0};
  });
  let result=null;
  for(const {mask}of subsets){const equipment=Object.fromEntries(slots.filter((_,i)=>(mask>>i)&1)),omitted=slots.filter(([slot])=>!(slot in equipment)).map(([slot])=>slot);
   for(const variant of variants){const candidate={...p,appearance96:variant.appearance96,equipment,__reworkSubset:omitted.length>0||variant.adapted};
    if(!rejected?.has(JSON.stringify([candidate.appearance96,candidate.equipment]))&&native.select(candidate,o)&&!native.failureFor?.(candidate,o)&&(!availableOnly||native.canDrawStable?.(candidate,o))){result={candidate,options:o,omitted,adapted:variant.adapted,unsupported:variant.unsupported};break;}
   }
   if(result)break;
  }
  if(result&&!availableOnly){plans.set(key,result);while(plans.size>32)plans.delete(plans.keys().next().value);}return result;
 }
 async function prepareWith(p,o,load){await native.ready;const attempted=new Set();for(;;){const r=plan(p,o,attempted);if(!r)return false;const signature=JSON.stringify([r.candidate.appearance96,r.candidate.equipment]);if(attempted.has(signature))return false;attempted.add(signature);if(await load(r.candidate,r.options))return true;}}
 const preparedDirections=new Map();
 async function prepare(p,o={}){if(!o.consumer||o.consumer==='world'){const key=JSON.stringify([p.appearance96,p.equipment,!!root.MareHeadgear?.hidden(p),!!root.MareAppearance96,!!root.MareCharacterAppearance]);if(!preparedDirections.has(key)){const task=(async()=>{for(const direction of ['south','east','west','north'])await prepareStablePose(p,{action:'idle',direction,consumer:'world'});})();preparedDirections.set(key,task);while(preparedDirections.size>8)preparedDirections.delete(preparedDirections.keys().next().value);}await preparedDirections.get(key);}return prepareWith(p,o,(candidate,options)=>native.prepareClip(candidate,options));}
 const prepareStablePose=(p,o={})=>prepareWith(p,o,(candidate,options)=>native.prepareStablePose?.(candidate,options)||false);
 function draw(ctx,p,o={}){if(!p||p.zoanTransformed)return false;let r=plan(p,o);if(!r){last={state:native.snapshot().state==='ready'?'uncovered':native.snapshot().state,mode:'partial-native',reason:'No available compatible native source',error:native.snapshot().error};return true;}
  // Reuse the stable candidate object while loading successive walk frames.
  const options={...o,action:r.options.action,weaponless:r.options.weaponless};
  const rendered=(o.preview?native.draw:(native.drawStable||native.draw)).call(native,ctx,r.candidate,options);
  let loadingPreferredSource=false;if(!rendered&&!o.preview){const available=plan(p,o,null,true);if(available&&(native.drawStable||native.draw).call(native,ctx,available.candidate,{...o,action:available.options.action,weaponless:available.options.weaponless})){r=available;loadingPreferredSource=true;}}
  last={...native.snapshot().last,loadingPreferredSource,mode:r.omitted.length?'partial-native':'native',requestedDirection:o.direction,consumer:o.consumer,savedIdentityUnchanged:true,appearanceAdapted:r.adapted,unrepresentedAppearance:r.unsupported||[],unrepresentedSlots:r.omitted,requestedAction:o.action,displayedAction:native.snapshot().last?.action||options.action};return true;
 }
 return {draw,prepare,prepareStablePose,clear:()=>{last=null;},snapshot:()=>({last})};
}
root.MareReworkDefaultHD={create};if(typeof module!=='undefined')module.exports=root.MareReworkDefaultHD;
})(globalThis);
