/* Exact source-pixel compatibility, not a visual-similarity heuristic. */
(function(root){'use strict';
const canonical=b=>({masculino:'male',feminino:'female'})[b]||b;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const near=(a,b)=>Math.abs(a-b)<1e-7;
function create({makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),basePrefix='tools/rework-base-hd/assets/',headPrefix='tools/rework-accessories/assets/'}={}){
 const pixels=new WeakMap();
 function lookup(images,source,prefix){const get=k=>images instanceof Map?images.get(k):images?.[k];return get(source)||get(prefix+source+'.png');}
 function raster(image){
  if(pixels.has(image))return pixels.get(image);
  const c=makeCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=-1,y1=-1,count=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
  const r={data,width:c.width,height:c.height,bounds:count?[x0,y0,x1+1,y1+1]:null,opaquePixels:count};pixels.set(image,r);return r;
 }
 function compare(a,b){
  const x=raster(a),y=raster(b);if(!x.bounds||!y.bounds)return {equal:false,reason:'empty-head-raster'};
  const [ax,ay,ar,ab]=x.bounds,[bx,by,br,bb]=y.bounds,w=ar-ax,h=ab-ay;
  if(w!==br-bx||h!==bb-by)return {equal:false,reason:'head-shape-dimensions-differ'};
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)for(let k=0;k<4;k++)if(x.data[((ay+j)*x.width+ax+i)*4+k]!==y.data[((by+j)*y.width+bx+i)*4+k])return {equal:false,reason:'head-source-pixels-differ'};
  return {equal:true,baseBounds:x.bounds,headBounds:y.bounds,width:w,height:h,opaquePixels:x.opaquePixels,offsetPixels:{x:ax-bx,y:ay-by}};
 }
 function validate({basePack,baseBody,baseDirection,baseFrame=0,baseImages,headRecord,headImages,replaceFace=true}={}){
  const fail=reason=>({compatible:false,reason});const h=headRecord,bd=basePack?.directions?.[baseDirection],hd=h?.entry?.pack?.directions?.[h.direction];
  if(!h||!bd||!hd)return fail('missing-authored-head-contract');
  if(canonical(baseBody||basePack.body)!==h.body||baseDirection!==h.direction)return fail('body-or-direction-differs');
  if(basePack.density!==4||h.density!==4||h.entry.pack.density!==4)return fail('native-density4-required');
  if(bd.renderMirrorFrom||hd.renderMirrorFrom)return fail('whole-character-mirror-not-proven');
  if(!Number.isInteger(baseFrame)||baseFrame<0||baseFrame>=bd.clip.frames||!bd.poses?.[baseFrame])return fail('authored-frame-unavailable');
  const sourceNeck=bd.rest?.NECK,sourceNose=bd.rest?.NOSE,headNeck=hd.rest?.NECK,headNose=hd.rest?.NOSE,targetNeck=bd.poses[baseFrame].NECK,targetNose=bd.poses[baseFrame].NOSE;
  if(![sourceNeck,sourceNose,headNeck,headNose,targetNeck,targetNose].every(point))return fail('missing-neck-nose-anchors');
  const vectors=[[sourceNeck,sourceNose],[targetNeck,targetNose]].map(([n,o])=>({x:o.x-n.x,y:o.y-n.y})),hx=headNose.x-headNeck.x,hy=headNose.y-headNeck.y;
  if(vectors.some(v=>!near(v.x,hx)||!near(v.y,hy)))return fail('head-rotation-or-scale-needs-authored-support');
  const slots=replaceFace?['headBase','face']:['headBase'],proof={mode:'exact-cropped-rgba-and-anchors',density:4,slots:{}};
  for(const slot of slots){
   const bl=bd.layers.filter(l=>l.slot===slot),hl=hd.layers.filter(l=>l.slot===slot);
   if(slot==='face'&&bl.length===0&&hl.length===0){proof.slots.face={absentInBoth:true};continue;}
   if(bl.length!==1||hl.length!==1)return fail('head-layer-ownership-not-explicit:'+slot);
   const binding=bl[0].binding;
   if(!(binding?.kind==='rigid'&&binding.a==='NECK'&&binding.b==='NOSE')&&binding?.kind!=='fixed')return fail('unsupported-head-binding:'+slot);
   if(binding.kind==='fixed'&&(!near(targetNeck.x,sourceNeck.x)||!near(targetNeck.y,sourceNeck.y)))return fail('fixed-head-does-not-follow-target-neck');
   const bs=bl[0].frames?.[baseFrame]||bl[0].source,hs=hl[0].source,bi=lookup(baseImages,bs,basePrefix),hi=lookup(headImages,hs,headPrefix);
   if(!bi||!hi)return fail('missing-head-source-image:'+slot);
   if(bi.width!==basePack.frame.width*4||bi.height!==basePack.frame.height*4||hi.width!==h.frame.width*4||hi.height!==h.frame.height*4)return fail('head-raster-size-mismatch');
   const match=compare(bi,hi);if(!match.equal)return fail(slot+':'+match.reason);
   if(!near(match.offsetPixels.x,(sourceNeck.x-headNeck.x)*4)||!near(match.offsetPixels.y,(sourceNeck.y-headNeck.y)*4))return fail('head-pixels-do-not-register-to-neck:'+slot);
   proof.slots[slot]={...match,baseSource:bs,headSource:hs};
  }
  const dx=(targetNeck.x-headNeck.x)*4,dy=(targetNeck.y-headNeck.y)*4;
  proof.registrationErrorPixels={x:Math.round(dx)-dx,y:Math.round(dy)-dy};
  return {compatible:true,reason:'exact-native-head-source',targetNeck:{...targetNeck},replaceSlots:replaceFace?['headBase','face','hair']:['hair'],offsetPixels:{x:Math.round(dx),y:Math.round(dy)},proof};
 }
 function identifyOriginalHair({basePack,baseBody,baseDirection,baseFrame=0,baseImages,headRecords=[],headImages}={}){
  const d=basePack?.directions?.[baseDirection],layers=d?.layers?.filter(l=>l.slot==='hair');
  if(basePack?.density!==4||!layers||layers.length!==1)return {matched:false,reason:'single-authored-hair-layer-required'};
  const bs=layers[0].frames?.[baseFrame]||layers[0].source,bi=lookup(baseImages,bs,basePrefix);if(!bi)return {matched:false,reason:'missing-original-hair-source'};
  const matches=[];
  for(const h of headRecords.filter(h=>h.body===canonical(baseBody||basePack.body)&&h.direction===baseDirection&&h.item==null)){
   const ls=h.entry.pack.directions[h.direction].layers.filter(l=>l.slot==='hair');if(ls.length!==1)continue;
   const hi=lookup(headImages,ls[0].source,headPrefix);if(!hi)continue;const proof=compare(bi,hi);if(proof.equal)matches.push({style:h.style,sourceSnapshot:h.snapshot,baseSource:bs,headSource:ls[0].source,proof});
  }
  const styles=[...new Set(matches.map(m=>m.style))];return styles.length===1?{matched:true,style:styles[0],proof:matches}:{matched:false,reason:styles.length?'ambiguous-source-style':'no-pixel-identical-style',matches};
 }
 return {validate,compare,identifyOriginalHair};
}
const api={create};root.MareNativeHeadCompat=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
