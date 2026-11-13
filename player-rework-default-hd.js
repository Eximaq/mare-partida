/* Resolve a compatible authored subset per pose; never mutate saved equipment or
 * combine unrelated baked cycles. Unsupported slots remain explicit diagnostics. */
(function(root){'use strict';
const invisible=new Set(['necklace','ring','belt','charm','akuma_no_mi']);
function create({native}={}){
 let last=null;const plans=new Map();
 function plan(p,o){
  if(!p||p.zoanTransformed)return null;
  const key=JSON.stringify([p.appearance96,p.equipment,!!root.MareHeadgear?.hidden(p),o.action,o.direction,!!o.weaponless]);
  if(plans.has(key)){const previous=plans.get(key);if(!native.failureFor?.(previous.candidate,{...o,action:previous.options.action}))return previous;plans.delete(key);}
  // Do not cache a miss before the shared indexes/palette API have loaded.
  if(native.snapshot().state==='loading')return null;
  const slots=Object.entries(p.equipment||{}).filter(([s,v])=>v!=null&&!invisible.has(s)&&!(s==='head'&&root.MareHeadgear?.hidden(p))&&!(s==='weapon'&&o.weaponless));
  const subsets=Array.from({length:2**slots.length},(_,mask)=>({mask,count:slots.reduce((n,_,i)=>n+((mask>>i)&1),0)})).sort((a,b)=>b.count-a.count||b.mask-a.mask);
  let result=null;
  for(const {mask}of subsets){const equipment=Object.fromEntries(slots.filter((_,i)=>(mask>>i)&1)),candidate={...p,equipment,__reworkSubset:Object.keys(equipment).length!==slots.length};if(native.select(candidate,o)&&!native.failureFor?.(candidate,o)){result={candidate,options:o,omitted:slots.filter(([s])=>!(s in equipment)).map(([s])=>s),adapted:false};break;}}
  if(!result){const body=['female','feminino'].includes(p.appearance96?.gender??p.appearance96?.body)?'female':'male';const appearance96={...(p.appearance96||{}),gender:body,body,hairStyle:'original',hair:'original',hairColor:'original',skinColor:'original',skin:'original',eyeStyle:'original',face:'original',eyeColor:'original'};
   const candidate={...p,appearance96,equipment:{}},options={...o,action:['idle','walk'].includes(o.action)?o.action:'attack-unarmed',weaponless:true};if(native.select(candidate,options))result={candidate,options,omitted:slots.map(([s])=>s),adapted:true};
  }
  if(result){plans.set(key,result);while(plans.size>32)plans.delete(plans.keys().next().value);}return result;
 }
 async function prepare(p,o={}){await native.ready;const r=plan(p,o);return r?native.prepareClip(r.candidate,r.options):false;}
 function draw(ctx,p,o={}){if(!p||p.zoanTransformed)return false;const r=plan(p,o);if(!r){last={state:native.snapshot().state==='ready'?'uncovered':native.snapshot().state,mode:'partial-native',reason:'No available compatible native source',error:native.snapshot().error};return true;}
  // Reuse the stable candidate object while loading successive walk frames.
  const options={...o,action:r.options.action,weaponless:r.options.weaponless};
  (o.preview?native.draw:(native.drawStable||native.draw)).call(native,ctx,r.candidate,options);
  last={...native.snapshot().last,mode:r.omitted.length?'partial-native':'native',direction:o.direction,consumer:o.consumer,savedIdentityUnchanged:true,appearanceAdapted:r.adapted,unrepresentedSlots:r.omitted,requestedAction:o.action,displayedAction:native.snapshot().last?.action||options.action};return true;
 }
 return {draw,prepare,clear:()=>{last=null;},snapshot:()=>({last})};
}
root.MareReworkDefaultHD={create};if(typeof module!=='undefined')module.exports=root.MareReworkDefaultHD;
})(globalThis);
