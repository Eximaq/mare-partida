/* Pants-only carry composition; never imports a clothed/baked body background. */
(function(root){'use strict';
function adaptCarry(carry,outfits){
 if(carry?.item!==109||!['idle','walk'].includes(carry.action))return null;
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
 const refs=[...new Set([...(layer.frames||[]),layer.source].filter(Boolean))];r.base.sourceRefs=[...new Set([...r.base.sourceRefs,...refs])];
 r.outfitOverlay={item:133,sourceRecord:outfit.id,sourceRefs:refs,lowerBodyPoseVerified:true,forearmPoseDifferencesAllowed:true,candidate:true};r.id+='-pants133-candidate';return r;
}
function create(carryAPI,outfits,{basePrefix='tools/rework-base-hd/assets/',outfitPrefix='tools/rework-modular-outfits-hd/assets/'}={}){
 const alias=(r,url)=>r.outfitOverlay.sourceRefs.some(s=>url===basePrefix+s+'.png')?outfitPrefix+url.slice(basePrefix.length):url;
 return {adapt:r=>adaptCarry(r,outfits),requiredFiles:(r,opts)=>carryAPI.requiredFiles(r,opts).map(url=>alias(r,url)),render:(ctx,r,images,opts)=>{const map=new Map(images);for(const sha of r.outfitOverlay.sourceRefs){const im=images.get(outfitPrefix+sha+'.png');if(im)map.set(basePrefix+sha+'.png',im);}return carryAPI.render(ctx,r,map,opts);}};
}
const api={adaptCarry,create};root.MareReworkOutfitCarryOverlayHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
