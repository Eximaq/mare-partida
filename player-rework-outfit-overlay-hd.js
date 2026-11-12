/* Strict native overlay adapter. Original body/weapon PNGs are never modified. */
(function(root){'use strict';
const hash=s=>String(s||'').match(/[a-f0-9]{64}/)?.[0];
function adapt(weapon,outfit,{assetPrefix='../rework-modular-outfits-hd/assets/'}={}){
 const c=outfit?.overlayContract,b=weapon?.basePack,p=b?.pack,d=p?.directions?.[weapon?.direction];
 if(!Number.isInteger(weapon?.item)||weapon.body!=='male'||!p||!d||!c||c.schema!=='native-equipment-overlay-v1'||c.item!==133||c.slot!=='pants'||c.action!=='attack-unarmed'||outfit.body!==weapon.body||c.direction!==weapon.direction||c.density!==p.density||c.binding?.kind!=='fixed')return null;
 const bodyLayer=d.layers.find(l=>l.id==='skin-arms-phase'),frames=bodyLayer?.frames;
 if(bodyLayer?.binding?.kind!=='fixed'||p.frame.width*4!==640||p.frame.height*4!==640||weapon.nativeCanvas?.[0]!==640||weapon.nativeCanvas?.[1]!==640)return null;
 if(!frames||frames.length!==c.bodyFrames.length||frames.some((f,i)=>hash(f)!==c.bodyFrames[i])||b.originalSHA256!==c.baseSourcePackSHA256)return null;
 if(!hash(c.paddedSourceSHA256)||c.depth!==2)return null;
 const r=JSON.parse(JSON.stringify(weapon)),rd=r.basePack.pack.directions[r.direction],key=c.paddedSourceSHA256;
 rd.layers.push({id:'pants133-native-overlay',slot:'pants',source:key,depth:c.depth,binding:{kind:'fixed'}});
 r.basePack.images[key]=assetPrefix+key+'.png';
 // Drop only naked-source rounding corrections. Authored replacement masks may be
 // the entire weapon/hand and MUST remain above the garment.
 r.states=r.states.map(s=>({...s,layers:s.layers.filter(l=>l.role!=='rounding-correction'),canvasRoundingPatch:[],rgbaExact:false}));
 r.id+='-pants133-candidate';r.equipment={weapon:weapon.item,pants:133};r.outfitOverlay={id:outfit.id,sourceSHA256:key,bodyFramesVerified:true,candidate:true,requiresVisualCalibration:true};
 return r;
}
const api={adapt};root.MareReworkOutfitOverlayHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
