/* Gear-only candidate registration. Original hairstyle is never mapped to a named style. */
(function(root){'use strict';
const ITEMS=[129,136,143,150,157,164,171,178],prefix='tools/rework-accessories/assets/';
function create(index,{compat=root.MareNativeHeadCompat?.create(),makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(index?.schema!=='rework-head-layer-index-v1'||!compat)throw Error('Missing exact-head compatibility dependency');
 function resolve({body,direction,item,look={},allowNamedHair=false}={}){if(!['male','masculino'].includes(body)||![...ITEMS,18,19].includes(Number(item))||!allowNamedHair&&[look.hair,look.hairStyle].some(x=>x&&x!=='original'))return null;
  const received=index.maleOriginalGear?.find(r=>r.item===Number(item)&&r.direction===direction);
  const rows=index.records.filter(r=>r.body==='male'&&r.item===Number(item)&&r.direction===direction&&!r.entry.pack.directions[direction].renderMirrorFrom);rows.sort((a,b)=>{const score=r=>Math.abs((r.adjustmentRecord.adjustment.gearScale??100)-100)*100+Math.abs(r.adjustmentRecord.adjustment.gearX||0)+Math.abs(r.adjustmentRecord.adjustment.gearY||0);return score(a)-score(b)||a.snapshot.localeCompare(b.snapshot)});
  const h=received||rows[0];if(!h)return null;const d=h.entry.pack.directions[direction],gear=d.layers.find(l=>l.id===d.headgearPolicy?.gearId);if(!gear||gear.binding?.kind!=='fixed')return null;return {id:`original-hair-gear-only-${item}-${direction}`,item:Number(item),direction,body:'male',sourceRecord:h,gear,candidate:true,occlusion:Number(item)===19?'full-hair-hidden':'source-alpha-only',hideHair:Number(item)===19,hairReplacement:false,sourceScale:1,approvalScope:'Existing gear pixels and source head approved; registration on original hair is candidate; no source hairstyle approval inferred'};
 }
 function requiredFiles(r){const h=r.sourceRecord,d=h.entry.pack.directions[h.direction];return [...new Set([r.gear.source,...d.layers.filter(l=>l.slot==='headBase').map(l=>l.source)].map(s=>prefix+s+'.png'))];}
 function validate(r,{basePack,baseBody,baseDirection,baseFrame=0,baseMirrorX=false,baseImages,headImages}={}){return compat.validate({basePack,baseBody,baseDirection,baseFrame,baseMirrorX,baseImages,headRecord:r.sourceRecord,headImages,replaceFace:false});}
 function draw(ctx,r,images,proof,{paddingPhysical=0}={}){if(!proof?.compatible)throw Error('Exact native head proof required');const h=r.sourceRecord,a=h.adjustmentRecord.adjustment,prior=h.entry.pack.directions[h.direction].headgearPolicy?.headAdjustment||{},img=images.get(prefix+r.gear.source+'.png')||images.get(r.gear.source);if(!img)throw Error('Missing original helmet PNG');const dx=Math.round((proof.targetNeck.x-h.rest.NECK.x+(prior.x||0)+(a.gearX||0))*4)+paddingPhysical,dy=Math.round((proof.targetNeck.y-h.rest.NECK.y+(prior.y||0)+(a.gearY||0))*4)+paddingPhysical;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,dx,dy);ctx.restore();return {source:r.id,sourceScale:1,offsetPhysical:[dx,dy],occlusion:r.occlusion,hairReplacement:false,candidate:true,sourceGearScale:a.gearScale??100,appliedGearScale:100};}
 return {resolve,requiredFiles,validate,draw};
}
const api={create,items:ITEMS};root.MareOriginalHairHelmetsHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
