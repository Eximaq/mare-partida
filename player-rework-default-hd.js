/* User-authorized migration: an uncovered saved combination displays the new bare
 * rework base, not legacy art or somebody else's equipment. Saved identity is immutable. */
(function(root){'use strict';
function create({native}={}){
 let last=null;
 function draw(ctx,p,o={}){
  if(!p||p.zoanTransformed)return false;
  const body=['female','feminino'].includes(p.appearance96?.gender??p.appearance96?.body)?'female':'male';
  const appearance96={...(p.appearance96||{}),gender:body,body,hairStyle:'original',hair:'original',hairColor:'original',skinColor:'original',skin:'original',eyeStyle:'original',face:'original',eyeColor:'original'};
  const base={...p,appearance96,equipment:{}};
  // Keep supported appearance recoloring first; then the authored original base.
  const candidates=[{...p,equipment:{}},base];
  const action=['walk','idle'].includes(o.action)?o.action:'attack-unarmed';
  for(const candidate of candidates){const options={...o,action,weaponless:true};if(!native?.select(candidate,options))continue;
   native.draw(ctx,candidate,options);
   last={...native.snapshot().last,mode:'bare-rework-base',savedIdentityUnchanged:true,appearanceAdapted:candidate===base,unrepresentedSlots:Object.entries(p.equipment||{}).filter(([,v])=>v!=null).map(([k])=>k),requestedAction:o.action,displayedAction:action};
   // Own the draw while loading too: do not flash back to legacy sprites.
   return true;
  }
  last={state:native?.snapshot().state==='failed'?'failed':'loading',mode:'bare-rework-base',reason:'Waiting for rework base; legacy disabled',error:native?.snapshot().error};return true;
 }
 return {draw,clear:()=>{last=null;},snapshot:()=>({last})};
}
root.MareReworkDefaultHD={create};if(typeof module!=='undefined')module.exports=root.MareReworkDefaultHD;
})(globalThis);
