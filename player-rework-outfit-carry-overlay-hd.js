/* Attach isolated authored garment layers without importing a baked body. */
(function(root){'use strict';
function adaptCarry(carry,outfits,{boots=null}={}){
 if(!Number.isInteger(carry?.item)||carry.base?.body!=='male'||!['idle','walk'].includes(carry.action))return null;
 const dir=carry.direction,mirror=!!carry.base.mirrorX,sourceDir=mirror?'east':dir;
 const outfit=outfits.records.find(o=>o.item===133&&o.body==='male'&&o.action===carry.action&&o.direction===sourceDir);if(!outfit)return null;
 const d=carry.base.pack.directions[dir],od=outfit.pack.directions[sourceDir],cloth=od.layers.find(l=>['own133-isolated','pants133-visible-cloth-only'].includes(l.id));if(!cloth)return null;
 const lower=['HIP','LEFT HIP','RIGHT HIP','LEFT KNEE','RIGHT KNEE','LEFT LEG','RIGHT LEG'];
 // WEST idle uses a genuinely west authored base, unlike mirrored EAST walk.
 const reflect=dir==='west'&&!mirror;
 const same=(a,b)=>!!a&&!!b&&Math.abs(a.x-(reflect?128-b.x:b.x))<.001&&Math.abs(a.y-b.y)<.001;
 if(d.poses.length!==od.poses.length||lower.some(k=>!same(d.rest[k],od.rest[k]))||d.poses.some((p,i)=>lower.some(k=>!same(p[k],od.poses[i][k]))))return null;
 const r=JSON.parse(JSON.stringify(carry)),rd=r.base.pack.directions[dir],layer=JSON.parse(JSON.stringify(cloth));
 layer.id='pants133-carry-native-overlay';
 // Lateral frame0 is a spread walking silhouette despite placeholder leg anchors.
 // The attack contract records authored frame12 as the standing cloth source.
 if(carry.action==='idle'&&!carry.base.derivedFrom&&['east','west'].includes(dir)){
  const contract=outfits.records.find(o=>o.overlayContract?.action==='attack-unarmed'&&o.direction===dir)?.overlayContract;
  if(!contract||contract.sourceFrame!==12)return null;
  delete layer.frames;layer.source=contract.sourceSHA256;
 }

 // Lower-body source precedes cloth; foreground arms and gauntlets remain above both.
 const arms=rd.layers.filter(l=>/arm|hand/i.test(l.id)),firstArm=Math.min(...arms.map(l=>l.depth));
 const lowerLayer=rd.layers.find(l=>l.id==='lower-redrawn');if(lowerLayer&&lowerLayer.depth>=firstArm)lowerLayer.depth=firstArm-.2;
 layer.depth=Math.min(cloth.depth,firstArm-.1);rd.layers.push(layer);
 const added=[];
 if(boots!=null){
  if(boots!==9)return null;
  const bo=outfits.records.find(o=>o.equipment?.pants===133&&o.equipment?.boots===9&&Object.keys(o.equipment).length===2&&o.body==='male'&&o.action===carry.action&&o.direction===sourceDir&&o.bootsOverlay?.baseRecord===outfit.id);if(!bo)return null;
  const bd=bo.pack.directions[sourceDir],ids=bo.bootsOverlay.sourceLayerIds;let layers=bd.layers.filter(l=>ids.includes(l.id));if(layers.length!==ids.length||layers.some(l=>l.binding?.kind!=='fixed'))return null;
  if(carry.action==='idle'&&!carry.base.derivedFrom&&['east','west'].includes(dir)){
   const walk=outfits.records.find(o=>o.equipment?.pants===133&&o.equipment?.boots===9&&Object.keys(o.equipment).length===2&&o.body==='male'&&o.action==='walk'&&o.direction===sourceDir);if(!walk)return null;
   layers=walk.pack.directions[sourceDir].layers.filter(l=>ids.includes(l.id)).map(l=>({...l,source:l.frames?.[12]||l.source,frames:undefined}));
  }
  for(const boot of layers){const copy=JSON.parse(JSON.stringify(boot));copy.slot='pants';copy.depth=layer.depth+.01;rd.layers.push(copy);added.push(...(copy.frames||[]),copy.source);}
  r.bootsOverlay={item:9,sourceRecord:bo.id,candidate:true};
 }
 const refs=[...new Set([...(layer.frames||[]),layer.source,...added].filter(Boolean))];r.base.sourceRefs=[...new Set([...r.base.sourceRefs,...refs])];
 r.outfitOverlay={item:133,sourceRecord:outfit.id,sourceRefs:refs,lowerBodyPoseVerified:true,forearmPoseDifferencesAllowed:true,candidate:true};r.id+='-pants133-candidate';return r;
}
function adaptIsolatedCoat(carry,outfits,{coat}={}){
 if(!Number.isInteger(coat)||!Number.isInteger(carry?.item)||carry.base?.body!=='male')return null;
 const {direction,action,base}=carry;
 const outfit=outfits.records.find(r=>r.id==='male-torso'+coat+'-'+direction+'-frozen-'+action+'-native');
 if(!outfit||outfit.equipment.torso!==coat||Object.keys(outfit.equipment).length!==1)return null;
 const d=base.pack.directions[direction],o=outfit.pack.directions[direction];
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 // A single static frame has no cadence to reconcile. Keep the base clip.
 const compatibleClip=equal(d.clip,o.clip)||action==='idle'&&d.clip.frames===1&&o.clip.frames===1&&!d.clip.loop&&!o.clip.loop;
 const anatomy=o.layers.filter(l=>l.id.startsWith('base:')).map(l=>({...l,id:l.id.slice(5)}));
 if(!equal(base.pack.frame,outfit.pack.frame)||!equal(base.pack.pivot,outfit.pack.pivot)||base.pack.density!==outfit.pack.density||
    !equal(d.rest,o.rest)||!equal(d.poses,o.poses)||!compatibleClip||!equal(d.layers,anatomy))return null;
 const layers=o.layers.filter(l=>!l.id.startsWith('base:'));
 if(!layers.length||layers.some(l=>!l.id.startsWith('coat'+coat+'-')||!['top','underArms'].includes(l.slot)||base.mirrorX&&l.binding.kind!=='fixed'))return null;
 const sourceRefs=[...new Set(layers.flatMap(l=>l.frames||[l.source]))];
 if(sourceRefs.some(s=>!outfit.sourceRefs.includes(s)||base.sourceRefs.includes(s)))return null;
 return {...carry,id:carry.id+'-coat'+coat+'-native',base:{...base,sourceRefs:[...base.sourceRefs,...sourceRefs],pack:{...base.pack,directions:{...base.pack.directions,[direction]:{...d,layers:[...d.layers,...layers]}}}},
  outfitOverlay:{item:coat,sourceRecord:outfit.id,sourceRefs},preMirroredLayers:base.mirrorX?layers.map(l=>l.id):[]};
}
function adaptPants22(carry,outfits){
 if(carry?.base?.body!=='male'||!['idle','walk'].includes(carry.action)||carry.bootsOverlay)return null;
 const {direction,action,base}=carry;
 const outfit=outfits.records.find(r=>r.id==='male-pants22-'+action+'-'+direction);
 if(outfit?.equipment.pants!==22||Object.keys(outfit.equipment).length!==1)return null;
 const d=base.pack.directions[direction],o=outfit.pack.directions[direction];
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!eq(base.pack.frame,outfit.pack.frame)||!eq(base.pack.pivot,outfit.pack.pivot)||
    base.pack.density!==outfit.pack.density||!eq(d.poses,o.poses)||!eq(d.rest,o.rest)||!eq(d.clip,o.clip))return null;
 const baseIds=new Set(d.layers.map(l=>l.id));
 const lower=o.layers.find(l=>l.id==='lower-redrawn'),oldLower=d.layers.find(l=>l.id==='lower-redrawn');
 const material=o.layers.filter(l=>!baseIds.has(l.id));
 if(!lower||!oldLower||lower.binding.kind!=='fixed'||oldLower.binding.kind!=='fixed'||lower.depth!==oldLower.depth||
    d.layers.some(l=>!l.id.startsWith('coat')&&l.id!==lower.id&&!eq(l,o.layers.find(a=>a.id===l.id)))||
    material.length!==1||!['pants22-independent-candidate','pants22-profile-candidate'].includes(material[0].id)||
    material[0].slot!=='pants'||material[0].binding.kind!=='fixed')return null;
 const sources=l=>(l.frames||[l.source]);
 const refs=[...new Set([...(carry.outfitOverlay?.sourceRefs||[]),...sources(lower).filter(sha=>!base.sourceRefs.includes(sha)),...sources(material[0])])];
 if(sources(lower).some(sha=>!outfit.sourceRefs.includes(sha))||sources(material[0]).some(sha=>!outfit.sourceRefs.includes(sha)||base.sourceRefs.includes(sha)))return null;
 const layers=d.layers.map(l=>l.id===lower.id?lower:l).concat(material);
 return {...carry,id:carry.id+'-pants22-native',base:{...base,sourceRefs:[...new Set([...base.sourceRefs,...refs])],pack:{...base.pack,directions:{...base.pack.directions,[direction]:{...d,layers}}}},
  outfitOverlay:{item:22,sourceRecord:outfit.id,sourceRefs:refs},preMirroredLayers:[...(carry.preMirroredLayers||[]),...(base.mirrorX?material.map(l=>l.id):[])]};
}
function create(carryAPI,outfits,{basePrefix='tools/rework-base-hd/assets/',outfitPrefix='tools/rework-modular-outfits-hd/assets/'}={}){
 const alias=(r,url)=>r.outfitOverlay.sourceRefs.some(s=>url===basePrefix+s+'.png')?outfitPrefix+url.slice(basePrefix.length):url;
 return {adapt:(r,opts)=>adaptCarry(r,outfits,opts),adaptIsolatedCoat:(r,opts)=>adaptIsolatedCoat(r,outfits,opts),adaptPants22:r=>adaptPants22(r,outfits),requiredFiles:(r,opts)=>carryAPI.requiredFiles(r,opts).map(url=>alias(r,url)),render:(ctx,r,images,opts)=>{const map=new Map(images);for(const sha of r.outfitOverlay.sourceRefs){const im=images.get(outfitPrefix+sha+'.png');if(im)map.set(basePrefix+sha+'.png',im);}return carryAPI.render(ctx,r,map,opts);}};
}
const api={adaptCarry,adaptIsolatedCoat,adaptPants22,create};root.MareReworkOutfitCarryOverlayHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
