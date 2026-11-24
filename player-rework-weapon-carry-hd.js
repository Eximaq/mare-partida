/* Calibratable carry candidate. Exact source PNGs, full native canvas and authored walk bones. */
(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function ownedImage(ctx,slot,part,source,image,args,sign=1){
 if(root.MareHDPosition?.active)return root.MareHDPosition.blit(ctx,slot,part,source,image,args,sign);
 ctx.drawImage(image,...args);
}
function create(baseIndex,carryIndex,{vendor=root.ReworkAccessoryVendor,basePrefix='tools/rework-base-hd/assets/',weaponPrefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(!vendor?.compositor)throw Error('Carry needs original compositor');const V=vendor.compositor;
 function resolveHair(base,style){
  if(style==='original')return {};
  const d=base.pack.directions[base.direction],target=d.layers.filter(l=>l.slot==='hair');
  if(style==='none')return {hairLayers:[]};
  const sourceDir=base.mirrorX?'east':base.direction;
  const hair=baseIndex.records.find(r=>r.body===base.body&&r.action==='idle'&&r.direction===sourceDir&&r.hairStyle===style);
  const source=hair?.pack.directions[sourceDir],layer=source?.layers.find(l=>l.slot==='hair');
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(target.length!==1||!layer||layer.binding.kind!=='fixed'||layer.frames||
     !same(base.pack.frame,hair.pack.frame)||base.pack.density!==hair.pack.density||
     !same(base.pack.pivot,hair.pack.pivot)||!['NECK','NOSE'].every(k=>same(d.rest[k],source.rest[k])))return null;
  return {hairLayers:[{...target[0],id:layer.id,source:layer.source}],hairSource:hair.id};
 }
 function verifiedMechanical119SouthPlan(p){
  const xy=(q,x,y)=>q?.x===x&&q.y===y,wh=(q,w,h)=>q?.length===2&&q[0]===w&&q[1]===h,
    bones=[['RIGHT SHOULDER',68.97607655502392,64.45933014354067],
      ['RIGHT ELBOW',65.30143540669857,75.86602870813397],['RIGHT ARM',63.464114832535884,89.41626794258373]],
    shas=['69546df73ee8ceba1a6432a57b715868ae669c49f03122969ce13cd694606dc7',
      '43562d1350ba4b1602f6c7e68387761930b9bac71c8e5d7874696648d431d629'];
  return p.item===119&&p.body==='male'&&p.direction==='south'&&p.sourceDirection==='south'&&
    p.targetWalkRecord==='male-walk-south-r7'&&wh(p.targetNativeCanvas,512,512)&&p.paddingPhysical==null&&
    p.mirrorEntireComposition===false&&p.segmentedArm===true&&p.canUseSameRegistrationForIdle===false&&p.parts.length===2&&
    p.parts.every((q,i)=>{const a=bones[i][0],b=bones[i+1][0],h=shas[i],s=q.source;
      return q.side==='RIGHT'&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&
        q.replaceBoundLayer===true&&!q.hideHandBeyondWrist&&!q.skinMaterial&&!q.mirrorSource&&q.depthOffset===0&&
        wh(q.calibrationOffsetPhysical,0,0)&&s?.sha256===h&&s.url==='assets/'+h+'.png'&&
        wh(s.size,640,640)&&wh(s.nativeSize,640,640)&&!s.sourceClip&&bones.slice(i,i+2).every(([k,x,y])=>
          xy(q.sourceBone?.[k],x,y)&&xy(q.targetRestBone?.[k],x-16,y-16));
    });
 }
 const staff124CarryAuthority={"124":{"tones":{"brown":"assets/82e687f64e47963aa2c89191117e965e7c3ea6347aaf1e0166822e467bfb76ff.png","copper":"assets/b675bfa8832cb7279cbae0fd5ffda764c38cdc789b07406bb1a914edd80bdaf4.png","dark":"assets/7b867efd61b3cd08e8dd060492703bb66a8ce4706d7ef9557bac9361be2bd03a.png","ebony":"assets/81605e0d80fe5b54e7b141e1f1db93390fcc2f4714b0636e1ee5683fc97914e8.png","light":"assets/ad59ac40ea07c913fb4fa79c412b814013a9ac9be9542cb5490eee549fd22ba1.png","olive":"assets/89abe769aa577f20a726b49f169122e758923e0dfc68c8a63768a5938f0a751e.png","porcelain":"assets/5b071a97136e47585fb73bbffff4908ca1747ab4203e3d8eb874e8fcab889ec9.png","warm":"assets/07fa4af8e9f54540148c4213b27bbdfd5d76616c929134ea02b643950c2d174c.png"},"plans":{"east":{"item":124,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761.png","sha256":"3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761","size":[640,640],"sourceMember":"recovery126-ew-clothes/Cajado124_Masculino_EW_QuatroTrajes_Editavel.zip::M158/0-protected.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":124,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761.png","sha256":"3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761","size":[640,640],"sourceMember":"recovery126-ew-clothes/Cajado124_Masculino_EW_QuatroTrajes_Editavel.zip::M158/0-protected.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}}}};
 const healerCarryAuthority={"126":{"tones":{"brown":"assets/b9a61c7635c120edb83c09bd1c424d02c98366ee74470100776d32eaad95bf4f.png","copper":"assets/07af55aa06d28ca1765cdf45500494f086a34e36e85ebf962ef79b6b5879ffe8.png","dark":"assets/e01bf3648bb2deb2100ebf7f1ce4ec5635cdaaa53d986aee273a655a55e55b1f.png","ebony":"assets/236b14c779fcb9dcb8cc88d741c0f92391dfb39c8f96e6c21d6f45a10920371c.png","light":"assets/7f24aa3374d857f1ec68de23e6267d817d1a3330c454333b02effcf2567248e2.png","olive":"assets/93931d72f617fa7e01b62c9fcf07d529cd6a626bb8f860c0c03031cbe8ba0eec.png","porcelain":"assets/eac3b2efc05c295e43a5986ae19c7974ae3f62b8a54b94194ba534ecd7bed943.png","warm":"assets/2c80135aa1c9b29e95bfaac91659e27a1d560ce9e2883c4028bd2fb78f02e87f.png"},"plans":{"south":{"item":126,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":126,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"east":{"item":126,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":126,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}}},"127":{"tones":{"brown":"assets/27dcfb5bb0d19fc6e0666ae23c51df63f0980219867fd01a51dd2d2faf9a3e26.png","copper":"assets/6257dc5f5d022448dde9242747ce5b8f2bf3c6a47bbdac0e26a9116f820cc851.png","dark":"assets/debfc347604f8effb768ac9bc438f12a44063347c44b4ad94955745baa89d96c.png","ebony":"assets/f65aeff4648a689e113e39ee93ec8f3e39188b06ed09e359f8bcbcee8a6cc40f.png","light":"assets/2eee6d02e9130642ba654583399485573ea51352c0f3731c321e307e0a12dfd4.png","olive":"assets/69a515e3f4b15eed8e8509bf36fd8ee2a3bdcb01cb3416e4ba4b58111ca1b700.png","porcelain":"assets/bc5e3113534e438ddb529b9c7ffeaac755ea0117eb43afd1c7989db66d318ae2.png","warm":"assets/fc8f9f747db983891492d981ed5ac079538716dce1c94481dda6d54123ae0f57.png"},"plans":{"south":{"item":127,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":127,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"east":{"item":127,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":127,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}}}};
 const staff123CarryAuthority={"123":{"tones":{"brown":"assets/f3643fd36b61d63a1a0df4f5c1f84f44ed6b8ae23eb62977ec702a80b18ead4e.png","copper":"assets/ff84030bda9345e1661a71e381c0036877203b9469ead5493606f448326d3a9d.png","dark":"assets/fb15bcb226160ec54a67afe850e4e3efaa8f0b3573eee4b762f3e996ec13bb7d.png","ebony":"assets/54a2b297765d59d405abfe35ef50d13a2872d2be6de35b795cb0064c8ad5dc08.png","light":"assets/6b39b48e651e2d2ed9c5cc43e27ba30dc290573a62dfe8bb389950761890313b.png","olive":"assets/8c97f1ad6bd428a08088ad42feee3e482f24cd0b12c138ba29c13cc227afbc7c.png","porcelain":"assets/3f00f3f6fe86ef5b3cbe973514abcd2c721a3234a457d66cc85c523b664e9413.png","warm":"assets/64033b07a1d7d2f8224a67191a6db8249257eac5b92fa5e87bb21e6a2265d857.png"},"plans":{"south":{"item":123,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":123,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"east":{"item":123,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":123,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}}},"121":{"plans":{"south":{"item":121,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0.png","sha256":"6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0","size":[640,640],"sourceMember":"Original equipment pixels under approved authored protection mask","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Native source pixels and original authored mask only; no scaling. Staff includes authored grip and relicary pure equipment. Wrist rigid candidate."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":121,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0.png","sha256":"6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0","size":[640,640],"sourceMember":"Original equipment pixels under approved authored protection mask","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Native source pixels and original authored mask only; no scaling. Staff includes authored grip and relicary pure equipment. Wrist rigid candidate."}],"interfaceSkinLocked":false,"candidate":true},"east":{"item":121,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0.png","sha256":"6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0","size":[640,640],"sourceMember":"Original equipment pixels under approved authored protection mask","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Native source pixels and original authored mask only; no scaling. Staff includes authored grip and relicary pure equipment. Wrist rigid candidate."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":121,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0.png","sha256":"6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0","size":[640,640],"sourceMember":"Original equipment pixels under approved authored protection mask","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Native source pixels and original authored mask only; no scaling. Staff includes authored grip and relicary pure equipment. Wrist rigid candidate."}],"interfaceSkinLocked":false,"candidate":true}},"tones":{"brown":"assets/631b3ffa5cc7573f4a444a0fe8c35822275bf3044bcb44a16c7fda127230c84f.png","copper":"assets/47b18ed00577155e93c6bfb1970855267e2fd4ac391ca924ee858b030dee13bb.png","dark":"assets/957afdb8d93b60cc4bb861744dfcb5fa683b7caefd216d429f63b21baf578d8a.png","ebony":"assets/8d5bfd71741868b8828246f8f27ca4b5dc111687d0e096087def404513b24764.png","light":"assets/536ab24bdcb790ad388a504a05244fae474d8258323e24a376edb802240544a4.png","olive":"assets/fd4dda8b1c91040e849943b83ab3111738d7909e86d2ccba3d45d162f346a958.png","porcelain":"assets/f91a8feb5fddb4527c8ca2a8a9920fa0f83b6650b651fbc8bebab49a6ba2cda4.png","warm":"assets/0527953594b5d0e2403a5f48dae8a6898acf689ce7d06d8eff95e04ed420db6e.png"}}};
 const staff125CandidateAuthority={"tones":{"porcelain":"assets/d63c5b1b71c96f1fb5d803dea80101f77a4ff50001d0032eb31ecb414df06045.png","light":"assets/3891dcd9f2c51b5af85afb5afe95fb58b7d0710d9833f294f70b51e0fb74bc25.png","warm":"assets/4fba3af810682ff3cc1a6f0d51003ee27741780aa58507a6f3fd064149b6d2bf.png","olive":"assets/2db113d2e8dc8a971387e36ad21ecbc290a09ce3048b4f9f930e56c87999b915.png","copper":"assets/bff847a52806464cc114c30041bfc36da91da35339bfb10b1c22fc87d8fc8e4d.png","brown":"assets/bcd1310d5e14de549a00d4cbb04ec62cdd2ab4a61c7205a2dcf0fe1c063d86ce.png","dark":"assets/bbe890df29020ed31e97d89a7199a13488a1ca09ae70ead255a5c54b2b878d82.png","ebony":"assets/fcd6b9d53d1765ed4eed5527b7dcd6a3504857c926e92c9bad71d07bed6278f0.png"},"plans":{"south":{"item":125,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":125,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"east":{"item":125,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"west":{"item":125,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}}};
 const staff124CardinalAuthority={"plans":{"south":{"item":124,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761.png","sha256":"3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761","size":[640,640],"sourceMember":"recovery126-ew-clothes/Cajado124_Masculino_EW_QuatroTrajes_Editavel.zip::M158/0-protected.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"north":{"item":124,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761.png","sha256":"3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761","size":[640,640],"sourceMember":"recovery126-ew-clothes/Cajado124_Masculino_EW_QuatroTrajes_Editavel.zip::M158/0-protected.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}},"assets":{"gear":"assets/1231d2b82a1ccc5e5d6ddcbd0ad9551468010e66a51d117a1a9bb4e4b15f94d6.png","grip":"assets/1e5f2a368e7eab6141e539dfa1bd5a343b58ecd5f81474dda2e954b06816471a.png"}};
 const staffNativeCardinalAuthority={"123":{"plans":{"north":{"item":123,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"south":{"item":123,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90.png","sha256":"df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90","size":[640,640],"sourceMember":"cetro123-ew-clothing-v1/Cetro123_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR123.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}},"assets":{"gear":"assets/bd4f563d9f11715334f1ca76b251b528a5e5676428080d9a932025b16f3b336d.png","grip":"assets/1e5f2a368e7eab6141e539dfa1bd5a343b58ecd5f81474dda2e954b06816471a.png"}},"125":{"plans":{"north":{"item":125,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"south":{"item":125,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23.png","sha256":"bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23","size":[640,640],"sourceMember":"cajado125-ew-clothing-v1/Cajado125_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR125.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}},"assets":{"gear":"assets/13dc36ea19461d854f6811e0179cb100e0cd3f046f682bfaf0859f7c73b2525c.png","grip":"assets/1e5f2a368e7eab6141e539dfa1bd5a343b58ecd5f81474dda2e954b06816471a.png"}},"126":{"plans":{"north":{"item":126,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"south":{"item":126,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73.png","sha256":"3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73","size":[640,640],"sourceMember":"cajado126-ew-clothing-v1/Cajado126_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR126.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}},"assets":{"gear":"assets/4e9a2d9f18f2b1c0e7a85e10fe13fefb8ebef5320e5aee5c16fd39ee3c1565cd.png","grip":"assets/1e5f2a368e7eab6141e539dfa1bd5a343b58ecd5f81474dda2e954b06816471a.png"}},"127":{"plans":{"north":{"item":127,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":false,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":92.5,"y":64.75},"RIGHT ARM":{"x":92.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true},"south":{"item":127,"body":"male","direction":"south","targetWalkRecord":"male-walk-south-r7","sourceDirection":"east","parts":[{"side":"RIGHT","mirrorSource":true,"source":{"url":"assets/7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc.png","sha256":"7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc","size":[640,640],"sourceMember":"cajado127-ew-clothing-v1/Cajado127_Masculino_EAST_WEST_4Trajes_Editavel.zip::GEAR127.png masked original source; no resampling","nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":67.5,"y":64.75},"RIGHT ARM":{"x":67.5,"y":77.75}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"hideHandBeyondWrist":false,"depthOffset":0.1,"calibrationOffsetPhysical":[0,0],"evidence":"Authored protection-mask original item pixels. Translation/rotation candidate without resizing; includes original grip pixels, original skin only."}],"interfaceSkinLocked":false,"candidate":true}},"assets":{"gear":"assets/29d6148484be5882fabaecb9a6be786cd5e64c0624f825792ea75da91244b7d2.png","grip":"assets/1e5f2a368e7eab6141e539dfa1bd5a343b58ecd5f81474dda2e954b06816471a.png"}}};
 function resolve({registeredHeadMaterials=false,approvedStaffNativeCardinal=false,candidateStaff125Carry=false,approvedHealerCarry=false,approvedStaff123Carry=false,approvedStaff121Carry=false,approvedStaff124Cardinal=false,approvedStaff124Carry=false,approvedFinalTechWalk=false,approvedW118NorthWalkSaved=false,approvedTechWalk=false,approvedNorth110Walk=false,approvedW128WalkSaved=false,approvedW128IdleSaved=false,approvedWalkingCuff=false,joinedRuptura112Saved=false,joinedLuvas3Saved=false,joinedManopla14Saved=false,item,body,action,direction,appearance={},equipment={},pureRelic32Saved=false,pureCompass16Saved=false,joinedArm117Saved=false,joinedCannon15Saved=false,joinedCannon118Saved=false,pureCannon118SideSaved=false,previewGauntlet23Saved=false,joinedGauntlet111Saved=false,joinedGauntletPairSideSaved=false,joinedGauntletSouthSaved=false,joinedGauntlet2NorthSaved=false,joinedCyborgFringeSaved=false,mechanical119SouthSaved=false,pureRelic31Saved=false,pureOrb122SideSaved=false,pureOrb122NorthSouthSaved=false}={}){
  if(item==null)return null;
  if(![0,123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,71,72,73,74,12,13,2,3,15,1,68,67,70,69,117,109,111,17,122,4,5,113,114,115,116].includes(Number(item))||!['male','masculino'].includes(body)||!['walk','idle'].includes(action))return null;
  if(Object.entries(equipment).some(([k,v])=>k!=='weapon'&&v!=null&&!['original','none'].includes(v)))return null;
  let plan=carryIndex.records.find(r=>r.item===Number(item)&&r.direction===direction);if(!plan)return null;
  const skin=appearance.skin||appearance.skinColor;
  const ownHair=appearance.hairColor==='black'||registeredHeadMaterials&&Object.hasOwn(root.MareCharacterAppearance?.hairs||{},appearance.hairColor);
  const ownEyes=appearance.eyeColor==='blue'||registeredHeadMaterials&&Object.hasOwn(root.MareCharacterAppearance?.eyes||{},appearance.eyeColor);
  const ownStaff124=staff124CarryAuthority[item],staff124Tone=approvedStaff124Carry&&ownStaff124?.tones[skin];
  const staff124Plan=staff124Tone&&plan.body==='male'&&equipment.weapon===item&&Object.keys(equipment).length===1&&
    JSON.stringify(plan)===JSON.stringify(ownStaff124.plans[direction])&&appearance.skin===appearance.skinColor&&ownHair&&ownEyes;
  const ownHealer=healerCarryAuthority[item],healerTone=approvedHealerCarry&&ownHealer?.tones[skin];
  const healerPlan=healerTone&&plan.body==='male'&&equipment.weapon===item&&Object.keys(equipment).length===1&&
    JSON.stringify(plan)===JSON.stringify(ownHealer.plans[direction])&&appearance.skin===appearance.skinColor&&ownHair&&ownEyes;
  const ownStaff123=staff123CarryAuthority[item],staff123Tone=((item===123&&approvedStaff123Carry)||(item===121&&approvedStaff121Carry))&&ownStaff123?.tones[skin];
  const staff123Plan=staff123Tone&&plan.body==='male'&&equipment.weapon===item&&Object.keys(equipment).length===1&&
    JSON.stringify(plan)===JSON.stringify(ownStaff123.plans[direction])&&appearance.skin===appearance.skinColor&&ownHair&&ownEyes;
  const staff125Tone=candidateStaff125Carry&&Number(item)===125&&Object.hasOwn(staff125CandidateAuthority.tones,skin)&&staff125CandidateAuthority.tones[skin];
  const staff125Plan=staff125Tone&&plan.body==='male'&&equipment.weapon===item&&Object.keys(equipment).length===1&&
    JSON.stringify(plan)===JSON.stringify(staff125CandidateAuthority.plans[direction])&&appearance.version===1&&appearance.gender==='masculino'&&
    appearance.skinStyle==='natural'&&appearance.skin===appearance.skinColor&&appearance.hair==='original'&&appearance.hairStyle==='original'&&
    ownHair&&appearance.face==='original'&&appearance.eyeStyle==='original'&&ownEyes;
  const cardinal124=approvedStaff124Cardinal&&Number(item)===124&&appearance.skin===appearance.skinColor&&
   ownHair&&ownEyes&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
   equipment.weapon===124&&Object.keys(equipment).length===1&&JSON.stringify(plan)===JSON.stringify(staff124CardinalAuthority.plans[direction]);
  const sharedCardinal=approvedStaffNativeCardinal&&staffNativeCardinalAuthority[item];
  const cardinalOwned=sharedCardinal&&['north','south'].includes(direction)&&plan.body==='male'&&
   ['idle','walk'].includes(action)&&Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
   appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&appearance.hair==='original'&&
   appearance.hairStyle==='original'&&ownHair&&appearance.face==='original'&&appearance.eyeStyle==='original'&&
   ownEyes&&appearance.skin===appearance.skinColor&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
   JSON.stringify(plan)===JSON.stringify(sharedCardinal.plans[direction]);
  const skinLocked=[123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,2,3,15,17,122,111,117].includes(Number(item));
  const item32SHA='b5ef89a85da05dae52d7151d74991cc81290932a9bc102856d71c985305991b8',part=plan.parts[0];
  const walks={north:'v7-male-walk-drawn-north-north',south:'male-walk-south-r7',east:'v7-male-walk-drawn-east-east',west:'v7-male-walk-drawn-east-east-mirror-west-candidate'},
   lateral=['east','west'].includes(direction),side=lateral?'RIGHT':'LEFT';
  // Isolated candidate for exact 2040 carry preview; no change to body, legacy or far-hand visibility.
  const preview23Table={"3:east":[{"old":"f645060ff9302c881798428c83bf705b77660be934e55c83434507af89fab4bd","new":"c777f9c6676045c3fa9c12748f4a216669ce603378fad9e7f67ed149231c049f","side":"RIGHT","binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"sourceBone":{"RIGHT ELBOW":{"x":80.64024390243902,"y":69.25},"RIGHT ARM":{"x":80.64024390243902,"y":82.25}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"newBone":{"RIGHT ELBOW":{"x":75.64583333333334,"y":76.125},"RIGHT ARM":{"x":78.80555555555556,"y":86.81944444444444}},"size":[640,640]}],"3:west":[{"old":"f645060ff9302c881798428c83bf705b77660be934e55c83434507af89fab4bd","new":"c777f9c6676045c3fa9c12748f4a216669ce603378fad9e7f67ed149231c049f","side":"RIGHT","binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"sourceBone":{"RIGHT ELBOW":{"x":80.64024390243902,"y":69.25},"RIGHT ARM":{"x":80.64024390243902,"y":82.25}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"newBone":{"RIGHT ELBOW":{"x":75.64583333333334,"y":76.125},"RIGHT ARM":{"x":78.80555555555556,"y":86.81944444444444}},"size":[640,640]}],"3:north":[{"old":"f69ce0d5b0290f1ed550777dfec664c3b1d6c11b2ba194fd36d9dc33bd59b423","new":"36fdca59293192ddc83312bd050c8e36f0dfe1d61e593ef7ecfa2dfd6b5b19a8","side":"LEFT","binding":{"kind":"rigid","a":"LEFT ELBOW","b":"LEFT ARM"},"sourceBone":{"LEFT ELBOW":{"x":79.28529411764706,"y":86.75},"LEFT ARM":{"x":79.28529411764706,"y":99.75}},"targetRestBone":{"LEFT ELBOW":{"x":50.5,"y":58},"LEFT ARM":{"x":48.5,"y":72.25}},"newBone":{"LEFT ELBOW":{"x":66.5,"y":74.0},"LEFT ARM":{"x":64.5,"y":88.25}},"size":[768,768]},{"old":"0dbd179dfb31b0e2081640e8c6b33a31918600dde0d7e83345dfd708e409a094","new":"e1f24684c33b3184601a74636945ee0981d09fb69d809222a36f171679032632","side":"RIGHT","binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"sourceBone":{"RIGHT ELBOW":{"x":111.65548780487805,"y":87},"RIGHT ARM":{"x":111.65548780487805,"y":100}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"newBone":{"RIGHT ELBOW":{"x":93.5,"y":74.0},"RIGHT ARM":{"x":95.25,"y":88.25}},"size":[768,768]}]};
  const ref23=preview23Table[[Number(item),direction].join(':')];
  const exact23=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const preview23=previewGauntlet23Saved&&ref23&&Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
   plan.item===Number(item)&&plan.body==='male'&&plan.direction===direction&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&
   plan.mirrorEntireComposition==null&&plan.paddingPhysical==null&&plan.parts.length===ref23.length&&
   plan.parts.every((q,i)=>{const r=ref23[i];return q.side===r.side&&q.source?.sha256===r.old&&q.source.url==='assets/'+r.old+'.png'&&
    exact23(q.source.size,r.size)&&exact23(q.source.nativeSize,r.size)&&!!q.hideHandBeyondWrist&&!q.replaceBoundLayer&&!q.source.sourceClip&&
    !q.mirrorSource&&!q.skinMaterial&&q.depthOffset===.1&&q.calibrationOffsetPhysical==null&&exact23(q.binding,r.binding)&&
    exact23(q.sourceBone,r.sourceBone)&&exact23(q.targetRestBone,r.targetRestBone);});
  if(preview23)plan={...plan,parts:plan.parts.map((q,i)=>{const r=ref23[i];return {...q,positionOwnSource:r.new,hideHandBeyondWrist:false,sourceBone:r.newBone,...(direction==='north'?{calibrationOffsetPhysical:[q.side==='LEFT'?3:-3,0]}:{}),
    source:{...q.source,sha256:r.new,url:'assets/'+r.new+'.png',size:[640,640],nativeSize:[640,640]}};})};
  const pure=Number(item)===32&&Object.hasOwn(walks,direction)&&pureRelic32Saved&&
    Object.keys(equipment).length===1&&equipment.weapon===32&&plan.targetWalkRecord===walks[direction]&&
    plan.item===32&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='original/equipment/00-unoccluded.png'&&part.source.sha256===item32SHA&&part.source.url==='assets/'+item32SHA+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,18]';
  const compass=Number(item)===16&&Object.hasOwn(walks,direction)&&pureCompass16Saved&&Object.keys(equipment).length===1&&equipment.weapon===16&&
    plan.item===16&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='Original equipment pixels under approved authored protection mask'&&
    part.source.sha256==='a5d7c7ee814eaf3c1e4ec9ae32c074eb6f53e879288b7b6eab65e468b73e91bd'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    [[part.binding.a,76],[part.binding.b,89]].every(([k,y])=>part.sourceBone?.[k]?.x===(direction==='west'?71.25:88.75)&&part.sourceBone[k]?.y===y)&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,14]';
  if(compass){
   // Original full equipment layer from the same W16 EAST F0 composite as the
   // former masked carry source, including pixels concealed by its original palm.
   const sha256='b9ff9fb23315eeae625bac311953a4fb1b1c63500045fba42be3f9954f70d0fd';
   plan={...plan,parts:[{...part,source:{...part.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'authored-ordered-16-east/0/equipment'}}]};
  }
  const mech=Number(item)===119&&direction==='south'&&mechanical119SouthSaved&&Object.keys(equipment).length===1&&equipment.weapon===119&&
    // Own F0 upper and lower arm are byte-exact to the signed anatomy+equipment
    // source and have zero contact with its independently ranked skin matte.
    verifiedMechanical119SouthPlan(plan);
  const rl31=Number(item)===31&&pureRelic31Saved===true&&Object.hasOwn(walks,direction)&&Object.keys(equipment).length===1&&equipment.weapon===31&&
    plan.item===31&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
    plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&
    plan.mirrorEntireComposition==null&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&
    part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
    part.source.sha256==='01dc643b144c0f9add31481140c694dd76dfbacfe50f9ee4b361bd87f369b827'&&
    part.source.url==='assets/'+part.source.sha256+'.png'&&JSON.stringify(part.source.nativeSize)==='[640,640]'&&
    part.source.sourceMember==='M158/0-source.png masked by original protected region excluding head'&&
    part.mirrorSource===(direction==='south')&&part.hideHandBeyondWrist===true&&part.depthOffset===.1&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&JSON.stringify(part.calibrationOffsetPhysical)==='[0,8]'&&
    [['RIGHT ELBOW',73.75],['RIGHT ARM',86.75]].every(([k,y])=>part.sourceBone?.[k]?.x===(direction==='south'?58.25:101.75)&&part.sourceBone[k]?.y===y);
  if(rl31){
   // Pure W31 from its own ordered East attack F0. (370,312) is
   // the authored equipment/grip overlap center, not a new hand sprite.
   const sha256='9acb8f39056d3f761b73d6d32cb2f28b446b535473c09e08be5cc609b053eb77',
    x=part.mirrorSource?270:370,y=312,[a,b]=[part.binding.a,part.binding.b];
   plan={...plan,parts:[{...part,source:{...part.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'authored-ordered-31-east/0/gear'},
    sourceBone:{[a]:{x:x/4,y:y/4-13},[b]:{x:x/4,y:y/4}},hideHandBeyondWrist:false,depthOffset:-.1,
    ...(lateral?{relic31PivotTilt:{x,y,radians:Math.PI/9}}:{})}]};
  }
  const arm117=Number(item)===117&&lateral&&joinedArm117Saved&&Object.keys(equipment).length===1&&equipment.weapon===117&&
   plan.item===117&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
   plan.mirrorEntireComposition===(direction==='west')&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='c86602712a9c0a7295e2e509ee2726553a24ce83172b573876bdde263fc17f96'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(arm117)plan={...plan,parts:[{...part,joined117Sources:[
   'b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a',
   '34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b',
   '4577ab047ecdde54c165b5322df7525a1296f8e6a236c94e1cfe22628e4c8472'
  ].map(h=>'assets/'+h+'.png')}]};
  // SOUTH F0 layers/0-equipment.png from W117 full-return source archive
  // SHA95477e58…; only the own pass which recreates the existing carry crop.
  const arm117South=Number(item)===117&&direction==='south'&&joinedArm117Saved&&Object.keys(equipment).length===1&&equipment.weapon===117&&
   plan.item===117&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='ee7b9253c9d68852cbcf6d48ed2c306005093ce94c9ffd7193f4317d5076b467'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(arm117South)plan={...plan,parts:[{...part,joined117Sources:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f',
   'ece41fc00ac65c312a4f33408c4f69c2d02d3a7eac42db26fc70b95c3da3de93'
  ].map(h=>'assets/'+h+'.png'),joined117South:true}]};
  const cannon15=Number(item)===15&&lateral&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
   plan.mirrorEntireComposition===(direction==='west')&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='59a23e1acdd6999e206079a0e01ca812c743a31c18e0234bb445ac1f375e1651'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15)plan={...plan,parts:[{...part,joined15Sources:[
   'b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a',
   '34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b',
   '590bd6324117727edfef6806975ae1e82e3171015b544442472bea2dce699009'
  ].map(h=>'assets/'+h+'.png')}]};
  // Approved Canhao15_Aros_Editavel_Backup.zip SHA46c48bda… / camada0.png.
  // Preserve the live original joined NORTH crop; draw only its own skin contribution.
  const cannon15North=Number(item)===15&&direction==='north'&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='f5482aa957130425b88d61515857d12c139058eefdb7389acb845acb889f1efa'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":93.5,"y":74},"RIGHT ARM":{"x":95.25,"y":88.25}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15North)plan={...plan,parts:[{...part,joined15Sources:[
   '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97',
   '2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0',
   '42bc1a7c0d327a4506a3867c5188b4ab656d4788c9ffb5dd998391df6d9ea6ef'
  ].map(h=>'assets/'+h+'.png'),joined15North:true}]};
  // SOUTH own rest pose from archive SHA9255b3f0… / retracted-rest-study-v3,
  // including the archive's approved composition match using the F0 hand path.
  const cannon15South=Number(item)===15&&direction==='south'&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='79ca605a6ecb835d3c2eb785f301d48c7e4943665723b9c6bbf588112da324ec'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15South)plan={...plan,parts:[{...part,joined15Sources:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f',
   '3fc83f9af20f59a919cfe299e8f213aedc9b808af243d69ddd5388207c839377'
  ].map(h=>'assets/'+h+'.png'),joined15South:true}]};
  // W118 lateral bare F0: exact independent native-right-cuff pass from the approved V2.
  // Keep the existing arm under the pass; do not import the archived attack body.
  const x118='6190c8025947706895cbe20066eb1e649b992c47a784615b2964c5ce6aa3d9ba';
  const cannon118Side=Number(item)===118&&lateral&&pureCannon118SideSaved&&Object.keys(equipment).length===1&&equipment.weapon===118&&
    plan.item===118&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
    plan.mirrorEntireComposition===(direction==='west')&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
    part?.source?.sha256===(direction==='west'?'1439be2d428aead4a6eb683b349154d9b8c3ba8db620b7e5a33ce4e64b7d4ce1':'d781f8b11e61e5ab0b2e3808412225e46fecab25be3c8c86739fd95ca9f00fae')&&part.source.url==='assets/'+part.source.sha256+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
    JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}}'&&
    JSON.stringify(part.targetRestBone)==='{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}}'&&
    part.hideHandBeyondWrist===true&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.mirrorSource&&part.depthOffset==null&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon118Side)plan={...plan,parts:[{...part,hideHandBeyondWrist:false,source:{...part.source,sha256:x118,url:'assets/'+x118+'.png',sourceMember:'male-punch-native-right-cuff east W118 F0'}}]};
  const cannon118South=Number(item)===118&&direction==='south'&&joinedCannon118Saved&&Object.keys(equipment).length===1&&equipment.weapon===118&&
   plan.item===118&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='9fadba42a015194fcbde9afaec3c6a266ad4ab566580b79e5353d4e6a2f9c31e'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  // W118 own archive static01: separate mechanism and explicit distal cut, exact original F0.
  if(cannon118South)plan={...plan,parts:[{...part,joined118Sources:["0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e", "3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f", "00f7479870eb2432690c4becba4699479c995d9279684f98eb7e51e1f800f5ca", "a3677f4c6dde088c5370561b77104286424e2a4371725d8565eb43fd988f1337"].map(h=>'assets/'+h+'.png')}]};
  // W120 own F0: under-gear skin contribution only. Preserve full existing crop.
  // Own W111 South F0: the archive recipe registers both hands at .048, not
  // the stale .04 in its manifest. Preserve authored carry crops and binding.
  const gauntlet111=Number(item)===111&&direction==='south'&&joinedGauntlet111Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===111&&
   plan.item===111&&plan.body==='male'&&plan.direction==='south'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&
   plan.targetNativeCanvas?.length===2&&plan.targetNativeCanvas.every(v=>v===512)&&plan.mirrorEntireComposition===false&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const side=i?'LEFT':'RIGHT',a=side+' ELBOW',b=side+' ARM',x=i?94.69856459330144:65.30143540669857,u=i?96.53588516746412:63.464114832535884,
     y=75.86602870813397,v=89.41626794258373,h=i?'c7c182d0bc4a57b485251dec7f0dc08904f2f47e2ce2fbde69267a391375b430':'85b0df18f50f6f9dc2e13764e9f2a7a9e9905ae8166e81eab61f3dc429adeacc',
     at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     q.source.nativeSize?.length===2&&q.source.nativeSize.every(v=>v===640)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],u,v)&&
     at(q.targetRestBone?.[a],x-16,y-16)&&at(q.targetRestBone?.[b],u-16,v-16)&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.hideHandBeyondWrist&&!q.mirrorSource&&q.depthOffset==null&&
     q.calibrationOffsetPhysical?.length===2&&q.calibrationOffsetPhysical.every(v=>v===0);
   });
  if(gauntlet111)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?754:767,support:908,urls:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e', i?'eedaa9291c0580ec921a1bf836d383e428f0860f150036ee1d743b213692e92b':'2e862c3194b67931585b76e0f9f42c80a463fe6362c3d98a476b01236f026891'
  ].map(h=>'assets/'+h+'.png')}}))};
  // W111 NORTH exact own layered F0 from left-contact v2. Retain the
  // original Canvas encoding, applying only skin's RGB contribution delta.
  const gauntlet111North=Number(item)===111&&direction==='north'&&joinedGauntlet111Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===111&&
   plan.item===111&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&
   plan.targetNativeCanvas?.length===2&&plan.targetNativeCanvas.every(v=>v===512)&&plan.mirrorEntireComposition===false&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const side=i?'LEFT':'RIGHT',a=side+' ELBOW',b=side+' ARM',x=i?66.5:93.5,u=i?64.5:95.25,
     y=74,v=88.25,h=i?'fa1b1529739aced049d7c0e68421af4c78d0c7906dc55cccfe15714c017f118c':'692d9a0a1e43e7904dc3980d139e67b55c93f55c1e638c33e6a2393f69748e6a',
     at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     q.source.nativeSize?.length===2&&q.source.nativeSize.every(v=>v===640)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],u,v)&&
     at(q.targetRestBone?.[a],x-16,y-16)&&at(q.targetRestBone?.[b],u-16,v-16)&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.hideHandBeyondWrist&&!q.mirrorSource&&q.depthOffset==null&&
     q.calibrationOffsetPhysical?.length===2&&q.calibrationOffsetPhysical.every(v=>v===0);
   });
  if(gauntlet111North)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?1033:1039,support:i?1870:1887,clothing:i?0:1,rgbTolerance:1,urls:[
   '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97','9cdf75f440de5dad8df7bf95bd0461e1d21c7bb919bc363dab164e4028ad042c','2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0'
  ].map(h=>'assets/'+h+'.png')}}))};
  // Own W2 and W110 South F0. Their existing carry rigs name east as a
  // sourceDirection; preserve those exact rigid matrices, depth and wrist cuts.
  const southGauntletProof={"2":{"gear":"6cd0e307510af68f77903c01e110f8f8c50d0372996d2ecb3e72964b7a999ed5","support":[1184,1205],"skin":[886,874],"parts":[["88eda32297377802e38d8f818b115a7e95827d25d1f77496296147b27df6caba",66.20198675496688],["b672de04bb8c43f9570eb288c80f01753d405e995605ec3a74926c0cf612c221",96.125]]},"110":{"gear":"fb29ed32436ac87af4318d12803630f6db7dbc379dda4b61bd4f5c076d0f53cb","support":[1225,1202],"skin":[878,859],"parts":[["a40fd49400ac3ef3c2d6b375f7cd331ba0b31019d2fa608e37d54c1af6754dcf",66.12068965517241],["49ffe35da0c5fe9bc8bbc9513a07db793fb33152911b1c1f436603ed4cc0aa0f",96.35036496350365]]}}[Number(item)];
  const southGauntlet=!!southGauntletProof&&joinedGauntletSouthSaved===true&&direction==='south'&&Object.keys(equipment).length===1&&Number(item)===equipment.weapon&&
   plan.item===Number(item)&&plan.body==='male'&&plan.direction==='south'&&plan.targetWalkRecord===walks.south&&plan.sourceDirection==='east'&&
   plan.interfaceSkinLocked===true&&!plan.targetNativeCanvas&&plan.mirrorEntireComposition==null&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const s=i?'LEFT':'RIGHT',a=s+' ELBOW',b=s+' ARM',[h,x]=southGauntletProof.parts[i],at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===s&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     JSON.stringify(q.source.size)==='[640,640]'&&JSON.stringify(q.source.nativeSize)==='[640,640]'&&
     at(q.sourceBone[a],x,70.5)&&at(q.sourceBone[b],x,83.5)&&at(q.targetRestBone[a],i?78.69856459330144:49.30143540669857,59.86602870813397)&&
     at(q.targetRestBone[b],i?80.53588516746412:47.464114832535884,73.41626794258373)&&q.depthOffset===0.1&&q.hideHandBeyondWrist===true&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&!q.calibrationOffsetPhysical;
   });
  if(southGauntlet)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:southGauntletProof.skin[i],support:southGauntletProof.support[i],
   clothing:i?0:1,rgbTolerance:1,urls:['0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',southGauntletProof.gear,
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f'].map(h=>'assets/'+h+'.png')}}))};
  // Published own W2 North-v7 F0 layers are 640px; the existing carry crops
  // occupy the same center of a 768px canvas. No resampling or retargeting.
  const gauntlet2North=Number(item)===2&&direction==='north'&&joinedGauntlet2NorthSaved===true&&Object.keys(equipment).length===1&&equipment.weapon===2&&
    plan.item===2&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks.north&&
    plan.interfaceSkinLocked===true&&!plan.targetNativeCanvas&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&plan.parts.length===2&&
    plan.parts.every((q,i)=>{
     const side=i?'RIGHT':'LEFT',a=side+' ELBOW',b=side+' ARM',x=i?111.4369658119658:80.5827067669173,y=i?88.75:88,
      h=i?'c50f7fe4385bb9007bd314143a5059c8e0478a5aad967613bc0a49571e07c07b':'33136493d49bc376f0dc943348d314dbcca9f3a288cccea8c8d055f395670b6e',
      at=(p,x,y)=>p?.x===x&&p.y===y,wh=v=>v?.length===2&&v.every(n=>n===768);
     return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
      wh(q.source.size)&&wh(q.source.nativeSize)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],x,y+13)&&
      at(q.targetRestBone?.[a],i?77.5:50.5,58)&&at(q.targetRestBone?.[b],i?79.25:48.5,72.25)&&
      q.depthOffset===.1&&q.hideHandBeyondWrist===true&&!q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&!q.calibrationOffsetPhysical;
    });
  if(gauntlet2North)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?198:151,support:i?962:1011,clothing:i?1:0,rgbTolerance:1,centerPadding:64,urls:[
    '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97',i?'8a704b6088addc1e828b6149b691f7bd650f4e5f3d30db900f33a19f66ef5acf':'e29fdaaeb5357aff1ea51dfc0450ce22759dae8b1300eb26a7b461efff6144bf','2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0'
   ].map(h=>'assets/'+h+'.png')}}))};
  const cyborgFringe=Number(item)===120&&direction==='south'&&joinedCyborgFringeSaved&&Object.keys(equipment).length===1&&equipment.weapon===120&&
   plan.item===120&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='71f3e23a634f5b09648b9eb6ca5494a4ccbf723418974947332492b346a6d8ad'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cyborgFringe)plan={...plan,parts:[{...part,joinedFringe:{count:143,support:1542,urls:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e','06966ed64eb2c4c7b27187e46baa51a3c46ae7059d8ea416e174dfe4cdaf86d0'
  ].map(h=>'assets/'+h+'.png')}}]};
  // Owner-approved L/O carry alternate: exact own Orbe122 layer from East F2.
  // The source registration is the approved preview offset; the existing native
  // carry hand goes in front. No cropped, copied, or recolored hand in the gear.
  const orb122=Number(item)===122&&pureOrb122SideSaved===true&&lateral&&Object.keys(equipment).length===1&&equipment.weapon===122&&
    plan.item===122&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&
    plan.interfaceSkinLocked===true&&plan.parts.length===1&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
    part?.source?.sha256==='46a99d0dc1e29cb0f02a5a774fc64483f7923bd4780abfe1277c15ba8e114b0a'&&
    part.source.url==='assets/'+part.source.sha256+'.png'&&JSON.stringify(part.source.nativeSize)==='[640,640]'&&
    part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
    !part.mirrorSource&&part.hideHandBeyondWrist===true&&part.depthOffset==null&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[-13,6]'&&
    JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":88.21232876712328,"y":76.18493150684931},"RIGHT ARM":{"x":88.93150684931507,"y":87.45205479452054}}';
  if(orb122){
   const sha256='d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6',sourceBone=Object.fromEntries(Object.entries(part.sourceBone).map(([k,v])=>[k,{x:v.x+.5,y:v.y-25.75}]));
   plan={...plan,parts:[{...part,sourceBone,source:{sha256,url:'assets/'+sha256+'.png',nativeSize:[640,640],sourceMember:'authored-orb-122-east/2/gear'},
    hideHandBeyondWrist:false,depthOffset:-.1}]};
  }
  // Owner-approved W122 North/South carry preview. Same pure own F2 orb;
  // every target wrist and its authored depth/motion remains unchanged.
  const orbNS={north:{side:'RIGHT',sha:'a957407f45eedfab734f008aa99bd1bf9c44249759ff36ffeae7e91497ab4313',
     bones:[93.85967741935484,74.61935483870968,95.22419354838709,85.08064516129032],rest:[77.5,58,79.25,72.25],dx:1,dy:-23.75},
    south:{side:'LEFT',sha:'7f3a26856839d9be8eaec8e6343ac21c863593243da65925ddd39fa75eee6700',
     bones:[94.69856459330144,75.86602870813397,96.53588516746412,89.41626794258373],rest:[78.69856459330144,59.86602870813397,80.53588516746412,73.41626794258373],dx:4.25,dy:-32.5}}[direction];
  const orbPair=(p,k,l,v)=>p?.[k]?.x===v[0]&&p[k].y===v[1]&&p?.[l]?.x===v[2]&&p[l].y===v[3];
  const orb122NS=Number(item)===122&&pureOrb122NorthSouthSaved===true&&orbNS&&Object.keys(equipment).length===1&&equipment.weapon===122&&
    plan.item===122&&plan.body==='male'&&plan.direction===direction&&plan.sourceDirection===direction&&plan.targetWalkRecord===walks[direction]&&
    plan.interfaceSkinLocked===true&&plan.parts.length===1&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
    part?.source?.sha256===orbNS.sha&&part.source.url==='assets/'+orbNS.sha+'.png'&&part.source.nativeSize?.length===2&&part.source.nativeSize.every(n=>n===640)&&
    part.side===orbNS.side&&part.binding?.kind==='rigid'&&part.binding.a===orbNS.side+' ELBOW'&&part.binding.b===orbNS.side+' ARM'&&
    orbPair(part.sourceBone,part.binding.a,part.binding.b,orbNS.bones)&&orbPair(part.targetRestBone,part.binding.a,part.binding.b,orbNS.rest)&&
    !part.mirrorSource&&!part.hideHandBeyondWrist&&part.depthOffset==null&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&
    part.calibrationOffsetPhysical?.length===2&&part.calibrationOffsetPhysical.every(n=>n===0);
  if(orb122NS){
   const sha256='d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6',sourceBone=Object.fromEntries(Object.entries(part.sourceBone).map(([k,v])=>[k,{x:v.x+orbNS.dx,y:v.y+orbNS.dy}]));
   plan={...plan,parts:[{...part,sourceBone,source:{sha256,url:'assets/'+sha256+'.png',nativeSize:[640,640],sourceMember:'authored-orb-122-east/2/gear'},
    hideHandBeyondWrist:false,depthOffset:-.1}]};
  }
  // Manopla14: the North crop is the exact pure own F0; E/W and South
  // preserve their historic mounting and split only material at the fringe.
  const manopla14Authority={"south":{"sha":"8c5dfc4d424bf22567d89f6bce1b1b17b095d27e448cf308f39b37e9f7d94a84","targetWalkRecord":"male-walk-south-r7","sourceBone":{"RIGHT ELBOW":{"x":66.12068965517241,"y":70.5},"RIGHT ARM":{"x":66.12068965517241,"y":83.5}},"fringe":{"count":944,"support":1034,"clothing":1,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/393a9057810171c354946e1e2482d91eaaf0642f076abadc55361d4667e09291.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]}},"north":{"sha":"35710a540ca7697fb527c00ef103c620de5f0a597deeba628c303d792b95b461","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceBone":{"RIGHT ELBOW":{"x":111.80813953488372,"y":86.75},"RIGHT ARM":{"x":111.80813953488372,"y":99.75}}},"east":{"sha":"8ff81ee85ed4eb038dfa08d0413266fa50a17a44e3c4f5c2b2b95361ef26bc9b","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceBone":{"RIGHT ELBOW":{"x":79.48958333333333,"y":70.5},"RIGHT ARM":{"x":79.48958333333333,"y":83.5}},"fringe":{"count":46,"support":1273,"clothing":36,"rgbTolerance":0,"urls":["assets/b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a.png","assets/0d35afdf6b7e36243c02b53f9c21c64a581d95a7adaf7ed6a32079b31cdecf34.png","assets/34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b.png"]}},"west":{"sha":"8ff81ee85ed4eb038dfa08d0413266fa50a17a44e3c4f5c2b2b95361ef26bc9b","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceBone":{"RIGHT ELBOW":{"x":79.48958333333333,"y":70.5},"RIGHT ARM":{"x":79.48958333333333,"y":83.5}},"fringe":{"count":46,"support":1273,"clothing":36,"rgbTolerance":0,"urls":["assets/b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a.png","assets/0d35afdf6b7e36243c02b53f9c21c64a581d95a7adaf7ed6a32079b31cdecf34.png","assets/34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b.png"]}}}, own14=manopla14Authority[direction],eq14=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const manopla14=Number(item)===14&&joinedManopla14Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===14&&
   own14&&plan.item===14&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.parts.length===1&&plan.interfaceSkinLocked===true&&
   plan.targetWalkRecord===own14.targetWalkRecord&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
   part?.source?.sha256===own14.sha&&part.source.url==='assets/'+own14.sha+'.png'&&eq14(part.source.nativeSize,direction==='north'?[768,768]:[640,640])&&
   part.side==='RIGHT'&&eq14(part.binding,{kind:'rigid',a:'RIGHT ELBOW',b:'RIGHT ARM'})&&eq14(part.sourceBone,own14.sourceBone)&&
   part.hideHandBeyondWrist===true&&part.depthOffset===.1&&!part.source.sourceClip&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.mirrorSource&&part.calibrationOffsetPhysical==null;
  if(manopla14&&own14.fringe)plan={...plan,parts:[{...part,joinedFringe:own14.fringe}]};
  // W3 own South F0: both metal/skin crops reconstitute exactly from
  // independent gear, anatomy and shorts. Preserve archived +/-1 rounding.
  const w3source=[{"sha":"ef58814bafb7ebba5238ecde3b36840fbd1320b5be88126e8782582c5cfb297e","sourceBone":{"RIGHT ELBOW":{"x":66.065625,"y":70.5},"RIGHT ARM":{"x":66.065625,"y":83.5}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}}},{"sha":"1cbd3e71348f06d0908e219da9e6dce067d866a4154c4112f303360d90dd84ca","sourceBone":{"LEFT ELBOW":{"x":96.23407643312102,"y":70.5},"LEFT ARM":{"x":96.23407643312102,"y":83.5}},"targetRestBone":{"LEFT ELBOW":{"x":78.69856459330144,"y":59.86602870813397},"LEFT ARM":{"x":80.53588516746412,"y":73.41626794258373}}}], w3fringes=[{"count":944,"support":1029,"clothing":1,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/2b10e18cda0f0cf5d4875ea1e03be2ebff3ad47955ae0cb1d451c08febba829c.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]},{"count":922,"support":1021,"clothing":0,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/44c65ab76b8a35134158b546b31c055fd2244c68511b28cbb7043249491e4e61.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]}],eq3=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const luvas3=Number(item)===3&&direction==='south'&&joinedLuvas3Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===3&&
   plan.item===3&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.parts.length===2&&plan.interfaceSkinLocked===true&&
   plan.targetWalkRecord===walks.south&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
   plan.parts.every((q,i)=>{
    const own=w3source[i],side=i?'LEFT':'RIGHT';
    return q.side===side&&eq3(q.binding,{kind:'rigid',a:side+' ELBOW',b:side+' ARM'})&&q.source?.url==='assets/'+own.sha+'.png'&&q.source.sha256===own.sha&&
     eq3(q.source.nativeSize,[640,640])&&eq3(q.sourceBone,own.sourceBone)&&eq3(q.targetRestBone,own.targetRestBone)&&
     q.hideHandBeyondWrist===true&&q.depthOffset===.1&&!q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&q.calibrationOffsetPhysical==null;
   });
  if(luvas3)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:w3fringes[i]}))};
  // W112 own South F0: both metal/skin crops reconstitute exactly from
  // independent gear, anatomy and shorts. Preserve archived +/-1 rounding.
  const w112source=[{"sha":"a4efb496a6b4ac775e81081881fa391cf123833602ac3b666216bb7ed868b1ef","sourceBone":{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}}},{"sha":"9456736ba1f610be6c124bf1db43df63625b3f3e27378df4a4da75a3ae7d0649","sourceBone":{"LEFT ELBOW":{"x":94.69856459330144,"y":75.86602870813397},"LEFT ARM":{"x":96.53588516746412,"y":89.41626794258373}},"targetRestBone":{"LEFT ELBOW":{"x":78.69856459330144,"y":59.86602870813397},"LEFT ARM":{"x":80.53588516746412,"y":73.41626794258373}}}], w112fringes=[{"count":670,"support":918,"clothing":1,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/9dcbcf727cf152546699c7066a99b2b3acaa9461864b68723831853a4c827e3a.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]},{"count":673,"support":917,"clothing":0,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/838cc75f3f3e5cf888718c1ffb6111c3447e3d47baabdac628ccf359e5bdb874.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]}],eq112=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const ruptura112=Number(item)===112&&direction==='south'&&joinedRuptura112Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===112&&
   plan.item===112&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.parts.length===2&&plan.interfaceSkinLocked==null&&
   plan.targetWalkRecord===walks.south&&eq112(plan.targetNativeCanvas,[512,512])&&plan.paddingPhysical==null&&plan.mirrorEntireComposition===false&&
   plan.parts.every((q,i)=>{
    const own=w112source[i],side=i?'LEFT':'RIGHT';
    return q.side===side&&eq112(q.binding,{kind:'rigid',a:side+' ELBOW',b:side+' ARM'})&&q.source?.url==='assets/'+own.sha+'.png'&&q.source.sha256===own.sha&&
     eq112(q.source.nativeSize,[640,640])&&eq112(q.sourceBone,own.sourceBone)&&eq112(q.targetRestBone,own.targetRestBone)&&
     q.hideHandBeyondWrist===true&&q.depthOffset==null&&!q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&eq112(q.calibrationOffsetPhysical,[0,0]);
   });
  if(ruptura112)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:w112fringes[i]}))};
  // W112 North own F0: exact author recipe and unchanged distal occlusion.
  const ruptura112North=Number(item)===112&&direction==='north'&&joinedRuptura112Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===112&&
   plan.item===112&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&
   plan.targetNativeCanvas?.length===2&&plan.targetNativeCanvas.every(v=>v===512)&&plan.mirrorEntireComposition===false&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const side=i?'LEFT':'RIGHT',a=side+' ELBOW',b=side+' ARM',x=i?66.5:93.5,u=i?64.5:95.25,
     y=74,v=88.25,h=i?'66b32c40ecb1efc295d4ab1c2a2e169e1bceb48bbbb7b7539b2c3ef0aa834827':'03c23d3e9daa84a2e28007e614901e3d0c7e0a7b0f13ca2a29d243a65e23cca3',
     at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     q.source.nativeSize?.length===2&&q.source.nativeSize.every(v=>v===640)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],u,v)&&
     at(q.targetRestBone?.[a],x-16,y-16)&&at(q.targetRestBone?.[b],u-16,v-16)&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&q.hideHandBeyondWrist===true&&!q.mirrorSource&&q.depthOffset==null&&
     q.calibrationOffsetPhysical?.length===2&&q.calibrationOffsetPhysical.every(v=>v===0);
   });
  if(ruptura112North)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?656:639,support:i?1328:1336,clothing:i?0:1,rgbTolerance:1,urls:[
   '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97','764438c4dcf05bf9a8492b231796c6c8bee28dfbb4431e909dcba04199b63a6a','2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0'
  ].map(h=>'assets/'+h+'.png')}}))};
  // W111/W112 carry use the same source EAST F0 and literal WEST mirror
  // already used by the game. The far part stays untouched and is not drawn:
  // the native lateral body has no authored far hand layer.
  const sideGauntlet={"111":{"fringe":{"count":1228,"support":1880,"clothing":519,"rgbTolerance":1,"urls":["assets/95a2720df7c44c41e9a01635ebecea0e404dd2e6a5165e56d960925f091da05a.png","assets/3129a4d595d0d93b4748271446eabb63480c0ea2cff1353ce74be3c9b7a76c7b.png","assets/47f6f9db4c7e5f2ea9ed5f80e18a68bae6335102bad13acc0d052e1d629976e2.png"]},"registration":[["RIGHT",{"url":"assets/5891d8993968268eb176d515b61b47f4804db026f4532e14b4dab87cd057eda0.png","sha256":"5891d8993968268eb176d515b61b47f4804db026f4532e14b4dab87cd057eda0","nativeSize":[640,640]},{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},[16,16],[64,64],[0,0],"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it"],["LEFT",{"url":"assets/ca25da42113928cdbe066b8bd4d7edc1ebb99cb2a9c51a4c6bf8fd3cbcf2df1e.png","sha256":"ca25da42113928cdbe066b8bd4d7edc1ebb99cb2a9c51a4c6bf8fd3cbcf2df1e","nativeSize":[640,640]},{"LEFT ELBOW":{"x":87.25,"y":73.25},"LEFT ARM":{"x":88.5,"y":88.75}},{"LEFT ELBOW":{"x":71.25,"y":57.25},"LEFT ARM":{"x":72.5,"y":72.75}},{"kind":"rigid","a":"LEFT ELBOW","b":"LEFT ARM"},[16,16],[64,64],[0,0],"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it"]]},"112":{"fringe":{"count":679,"support":1198,"clothing":421,"rgbTolerance":1,"urls":["assets/946587ecb05500b60c34d864c7662aaf6782d434acf752fd7bfefd30826e7f73.png","assets/4cca0b5fcec84540637ec699bc749334a3edf82003c829037467798526814ab4.png","assets/b5e372ae7b8f629174e1333e9aea076280e7eb74e3132d5d825484f2b9f51380.png"]},"registration":[["RIGHT",{"url":"assets/bf0810f0c33f571580836998f170bc085fa5e0f783fbd7c343ae0c8662a40fd6.png","sha256":"bf0810f0c33f571580836998f170bc085fa5e0f783fbd7c343ae0c8662a40fd6","nativeSize":[640,640]},{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},[16,16],[64,64],[0,0],"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it"],["LEFT",{"url":"assets/87195a8777879c193ce0bfae821be3f17832d81294772b9945f4b5d2a78166a0.png","sha256":"87195a8777879c193ce0bfae821be3f17832d81294772b9945f4b5d2a78166a0","nativeSize":[640,640]},{"LEFT ELBOW":{"x":87.25,"y":73.25},"LEFT ARM":{"x":88.5,"y":88.75}},{"LEFT ELBOW":{"x":71.25,"y":57.25},"LEFT ARM":{"x":72.5,"y":72.75}},{"kind":"rigid","a":"LEFT ELBOW","b":"LEFT ARM"},[16,16],[64,64],[0,0],"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it"]]}}[Number(item)],pairEq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const pairSide=!!sideGauntlet&&joinedGauntletPairSideSaved===true&&lateral&&Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
    plan.body==='male'&&plan.item===Number(item)&&plan.direction===direction&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&
    pairEq(plan.targetNativeCanvas,[512,512])&&plan.mirrorEntireComposition===(direction==='west')&&plan.paddingPhysical==null&&
    plan.parts.length===2&&plan.parts.every((q,i)=>pairEq(['side','source','sourceBone','targetRestBone','binding','restOffsetLogical','restOffsetPhysical',
     'calibrationOffsetPhysical','depthPolicy'].map(k=>q[k]),sideGauntlet.registration[i])&&!q.skinMaterial&&!q.mirrorSource&&
     !q.replaceBoundLayer&&!!q.hideHandBeyondWrist===(Number(item)===112)&&q.depthOffset==null);
  if(pairSide)plan={...plan,parts:[{...plan.parts[0],joinedFringe:sideGauntlet.fringe},plan.parts[1]]};
  // Approved stock W2/W110 walking cuffs: carry the validated base and original
  // weapon transform; recolor only the manually traced native wrist pixels.
  const walkingCuff={"2":{"skinMask":"0430fb149730f9878fe7cb5970c531092fa855bae7fd5654d0c370918d2549eb","parts":{"east":{"side":"RIGHT","source":{"url":"assets/a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a.png","sha256":"a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":80.318359375,"y":70.25},"RIGHT ARM":{"x":80.318359375,"y":83.25}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true},"west":{"side":"RIGHT","source":{"url":"assets/a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a.png","sha256":"a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":80.318359375,"y":70.25},"RIGHT ARM":{"x":80.318359375,"y":83.25}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true}}},"110":{"skinMask":"95a3b7c76726a9a332e72bc73dcae1555b7463e1ec72324c14978cd6f806f3c9","parts":{"east":{"side":"RIGHT","source":{"url":"assets/7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227.png","sha256":"7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":79.14077669902913,"y":70.75},"RIGHT ARM":{"x":79.14077669902913,"y":83.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true},"west":{"side":"RIGHT","source":{"url":"assets/7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227.png","sha256":"7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":79.14077669902913,"y":70.75},"RIGHT ARM":{"x":79.14077669902913,"y":83.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true}}}}[Number(item)], expectedCuff=walkingCuff?.parts[direction];
  const sameCuff=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const approvedCuff=approvedWalkingCuff===true&&['walk','idle'].includes(action)&&lateral&&expectedCuff&&
    Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
    ['male','masculino'].includes(body)&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
    (appearance.hairStyle||appearance.hair||'original')==='original'&&ownHair&&appearance.face==='original'&&ownEyes&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.body==='male'&&plan.item===Number(item)&&plan.direction===direction&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&
    plan.interfaceSkinLocked===true&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&plan.parts.length===1&&
    Object.entries(expectedCuff).every(([k,v])=>sameCuff(part[k],v))&&!part.skinMaterial&&!part.mirrorSource&&!part.replaceBoundLayer&&part.calibrationOffsetPhysical==null;
  if(approvedCuff)plan={...plan,parts:[{...part,skinMaterial:{url:'assets/'+walkingCuff.skinMask+'.png',sourceSHA256:part.source.sha256}}]};
  // Independently approved W110 North walk: own stock cuffs and the two
  // physical wrist masks. Idle also requires a literal walking F0 registration.
  const north110Cuffs=[{"side":"LEFT","source":{"url":"assets/0d957c301ea9376fa42c2f4c8bca8ace0e3d11d5c7318f17c8a9f4ae7bfad390.png","sha256":"0d957c301ea9376fa42c2f4c8bca8ace0e3d11d5c7318f17c8a9f4ae7bfad390","size":[768,768],"nativeSize":[768,768]},"sourceBone":{"LEFT ELBOW":{"x":80.34,"y":88.25},"LEFT ARM":{"x":80.34,"y":101.25}},"targetRestBone":{"LEFT ELBOW":{"x":50.5,"y":58},"LEFT ARM":{"x":48.5,"y":72.25}},"binding":{"kind":"rigid","a":"LEFT ELBOW","b":"LEFT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true,"skinMask":"302d7c5ba21a57c512aa6f280733142304b4868c3be41c47c9f8a7ead7dfe9c3"},{"side":"RIGHT","source":{"url":"assets/9cabcc5bec690ae2ef438df3b58a5e2d3d96af78c4e79aff30a14a8e8a7cf20d.png","sha256":"9cabcc5bec690ae2ef438df3b58a5e2d3d96af78c4e79aff30a14a8e8a7cf20d","size":[768,768],"nativeSize":[768,768]},"sourceBone":{"RIGHT ELBOW":{"x":111.49295774647888,"y":88.75},"RIGHT ARM":{"x":111.49295774647888,"y":101.75}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"depthOffset":0.1,"hideHandBeyondWrist":true,"skinMask":"3e02fc42236a36c97f7a1be3cf78a02f1816a775b17b0123a184a50760559a45"}];
  const north110Cuff=approvedNorth110Walk===true&&Number(item)===110&&['walk','idle'].includes(action)&&direction==='north'&&
    Object.keys(equipment).length===1&&equipment.weapon===110&&
    ['male','masculino'].includes(body)&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
    (appearance.hairStyle||appearance.hair||'original')==='original'&&ownHair&&appearance.face==='original'&&ownEyes&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.body==='male'&&plan.item===110&&plan.direction==='north'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks.north&&
    plan.interfaceSkinLocked===true&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&plan.parts.length===2&&
    plan.parts.every((part,i)=>Object.entries(north110Cuffs[i]).every(([k,v])=>k==='skinMask'||sameCuff(part[k],v))&&
      !part.skinMaterial&&!part.mirrorSource&&!part.replaceBoundLayer&&part.calibrationOffsetPhysical==null);
  if(north110Cuff)plan={...plan,parts:plan.parts.map((part,i)=>({...part,skinMaterial:{url:'assets/'+north110Cuffs[i].skinMask+'.png',sourceSHA256:part.source.sha256}}))};
  // The shared Báculo 128 stock source is intentionally not edited globally:
  // walking uses the narrow trim in all four directions; saved idle only NORTH.
  const w128OwnPlan=Number(item)===128&&Object.hasOwn(walks,direction)&&
     plan.item===128&&plan.body==='male'&&plan.direction===direction&&plan.targetWalkRecord===walks[direction]&&
     plan.parts.length===1&&plan.parts[0].source?.sha256==='535b5dc885463b8106314a3bfcc7e0ad3d0a7da8321113a54994d86ee18e4893'&&plan.parts[0].source.url==='assets/535b5dc885463b8106314a3bfcc7e0ad3d0a7da8321113a54994d86ee18e4893.png'&&
     !plan.parts[0].source.sourceClip&&!plan.parts[0].skinMaterial;
  const w128WalkTrim=action==='walk'&&w128OwnPlan;
  const w128Bones={north:[92.5,77.5,58,79.25,72.25],south:[67.5,49.30143540669857,59.86602870813397,47.464114832535884,73.41626794258373],east:[92.5,59.5,57.5,64,72.75],west:[67.5,59.5,57.5,64,72.75]};
  const w128BonePoint=(p,x,y)=>p?.x===x&&p?.y===y;
  const w128B=w128Bones[direction],wa='RIGHT ELBOW',wb='RIGHT ARM';
  const w128Saved=((approvedW128WalkSaved===true&&w128WalkTrim)||(approvedW128IdleSaved===true&&action==='idle'&&w128OwnPlan))&&w128B&&body==='male'&&equipment.weapon===128&&Object.keys(equipment).length===1&&
    appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&appearance.hair==='original'&&appearance.hairStyle==='original'&&
    ownHair&&appearance.face==='original'&&appearance.eyeStyle==='original'&&ownEyes&&appearance.skin===appearance.skinColor&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.sourceDirection==='east'&&plan.interfaceSkinLocked===false&&plan.mirrorEntireComposition==null&&plan.segmentedArm==null&&plan.paddingPhysical==null&&
    part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a===wa&&part.binding.b===wb&&
    part.mirrorSource===(direction==='south'||direction==='west')&&part.hideHandBeyondWrist===false&&part.depthOffset===.1&&
    part.calibrationOffsetPhysical?.length===2&&part.calibrationOffsetPhysical.every(x=>x===0)&&
    !part.replaceBoundLayer&&!part.joinedFringe&&!part.joined15Sources&&!part.joined117Sources&&!part.joined118Sources&&part.depthPolicy==null&&
    part.source.size?.length===2&&part.source.size.every(x=>x===640)&&part.source.nativeSize?.length===2&&part.source.nativeSize.every(x=>x===640)&&
    w128BonePoint(part.sourceBone?.[wa],w128B[0],64.75)&&w128BonePoint(part.sourceBone?.[wb],w128B[0],77.75)&&
    w128BonePoint(part.targetRestBone?.[wa],w128B[1],w128B[2])&&w128BonePoint(part.targetRestBone?.[wb],w128B[3],w128B[4]);
  // User-approved native walking interfaces: exact existing stock parts and
  // binding. Only the selected anatomical sample mask is added to its part.
  const techWalkAuthority={"119:north":{"mask":"620da2c609dcbcd467feff93deb8b61c38debc608795c1af19a14d3f2649a6fe","index":0,"count":92,"plan":{"item":119,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"north","targetNativeCanvas":[512,512],"mirrorEntireComposition":false,"canUseSameRegistrationForIdle":false,"segmentedArm":true},"parts":[{"side":"RIGHT","source":{"url":"assets/e9c4d1f575c117655c61c191e68eac5c2ef2b337a5a75d018432ffaa31f53bc6.png","sha256":"e9c4d1f575c117655c61c191e68eac5c2ef2b337a5a75d018432ffaa31f53bc6","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT SHOULDER":{"x":89,"y":62},"RIGHT ELBOW":{"x":93.5,"y":74}},"targetRestBone":{"RIGHT SHOULDER":{"x":73,"y":46},"RIGHT ELBOW":{"x":77.5,"y":58}},"binding":{"kind":"rigid","a":"RIGHT SHOULDER","b":"RIGHT ELBOW"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]},{"side":"RIGHT","source":{"url":"assets/05d5d642bb3c5e3ace9cec2a2352afc776473c330f64d685abec411215830e0f.png","sha256":"05d5d642bb3c5e3ace9cec2a2352afc776473c330f64d685abec411215830e0f","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":93.5,"y":74},"RIGHT ARM":{"x":95.25,"y":88.25}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]}]},"120:north":{"mask":"86bc8ca986f70ab7a295bc93213e5f553e0e9f971e64201ef01d23dddd10a880","index":0,"count":45,"plan":{"item":120,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"north","targetNativeCanvas":[512,512],"mirrorEntireComposition":false,"canUseSameRegistrationForIdle":false},"parts":[{"side":"RIGHT","source":{"url":"assets/2cd02c09e63a86db1503b4f153c22e6f88fbc20d194a16c5cf6bcab00de41b91.png","sha256":"2cd02c09e63a86db1503b4f153c22e6f88fbc20d194a16c5cf6bcab00de41b91","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":93.5,"y":74},"RIGHT ARM":{"x":95.25,"y":88.25}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"restOffsetLogical":[16,16],"restOffsetPhysical":[64,64],"depthPolicy":"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it","calibrationOffsetPhysical":[0,0],"hideHandBeyondWrist":true}]},"120:east":{"mask":"41f18b44180d8d81140ef247b1bc09e8ef87acfc8dd838973774ccdf0cd612a0","index":0,"count":52,"plan":{"item":120,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","targetNativeCanvas":[512,512],"mirrorEntireComposition":false,"canUseSameRegistrationForIdle":false},"parts":[{"side":"RIGHT","source":{"url":"assets/7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a.png","sha256":"7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"restOffsetLogical":[16,16],"restOffsetPhysical":[64,64],"depthPolicy":"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it","calibrationOffsetPhysical":[0,0],"hideHandBeyondWrist":true}]},"120:west":{"mask":"41f18b44180d8d81140ef247b1bc09e8ef87acfc8dd838973774ccdf0cd612a0","index":0,"count":52,"plan":{"item":120,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","targetNativeCanvas":[512,512],"mirrorEntireComposition":true,"canUseSameRegistrationForIdle":false},"parts":[{"side":"RIGHT","source":{"url":"assets/7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a.png","sha256":"7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"restOffsetLogical":[16,16],"restOffsetPhysical":[64,64],"depthPolicy":"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it","calibrationOffsetPhysical":[0,0],"hideHandBeyondWrist":true}]}}, techWalkRow=techWalkAuthority[item+':'+direction];
  const techWalk=approvedTechWalk===true&&['walk','idle'].includes(action)&&techWalkRow&&
    Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
    ['male','masculino'].includes(body)&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
    (appearance.hairStyle||appearance.hair||'original')==='original'&&ownHair&&appearance.face==='original'&&ownEyes&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.paddingPhysical==null&&plan.parts.length===techWalkRow.parts.length&&
    Object.entries(techWalkRow.plan).every(([k,v])=>sameCuff(plan[k],v))&&
    plan.parts.every((part,i)=>!part.skinMaterial&&!part.mirrorSource&&!part.joinedFringe&&
      Object.entries(techWalkRow.parts[i]).every(([k,v])=>sameCuff(part[k],v)));
  if(techWalk){const i=techWalkRow.index;plan={...plan,parts:plan.parts.map((p,j)=>j!==i?p:{...p,skinMaterial:{url:'assets/'+techWalkRow.mask+'.png',sourceSHA256:p.source.sha256}})};}
  // W118 North: the authored transparent gap reveals the skin beneath.
  // The metal and translucent contact stay entirely original; no repaint mask.
  const h118='4a102854a34cc0f92ecf7849dd409a8e2ed7fab2c5e2c9791be37df94297623c',w118a='RIGHT ELBOW',w118b='RIGHT ARM';
  const w118Point=(o,x,y)=>o?.x===x&&o?.y===y;
  const north118=approvedW118NorthWalkSaved===true&&Number(item)===118&&body==='male'&&['walk','idle'].includes(action)&&direction==='north'&&
    Object.keys(equipment).length===1&&equipment.weapon===118&&appearance.version===1&&appearance.gender==='masculino'&&
    appearance.skinStyle==='natural'&&appearance.hair==='original'&&appearance.hairStyle==='original'&&ownHair&&
    appearance.face==='original'&&appearance.eyeStyle==='original'&&ownEyes&&appearance.skin===appearance.skinColor&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.item===118&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&
    sameCuff(plan.targetNativeCanvas,[512,512])&&plan.mirrorEntireComposition===false&&plan.canUseSameRegistrationForIdle===false&&plan.paddingPhysical==null&&
    plan.segmentedArm==null&&plan.parts.length===1&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a===w118a&&part.binding.b===w118b&&
    part.hideHandBeyondWrist===true&&!part.mirrorSource&&!part.replaceBoundLayer&&!part.skinMaterial&&!part.joinedFringe&&!part.joined15Sources&&!part.joined117Sources&&!part.joined118Sources&&
    part.depthOffset==null&&part.depthPolicy==='Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it'&&
    sameCuff(part.calibrationOffsetPhysical,[0,0])&&sameCuff(part.restOffsetLogical,[16,16])&&sameCuff(part.restOffsetPhysical,[64,64])&&
    part.source?.sha256===h118&&part.source.url==='assets/'+h118+'.png'&&sameCuff(part.source.size,[640,640])&&sameCuff(part.source.nativeSize,[640,640])&&!part.source.sourceClip&&
    w118Point(part.sourceBone?.[w118a],93.5,74)&&w118Point(part.sourceBone?.[w118b],95.25,88.25)&&
    w118Point(part.targetRestBone?.[w118a],77.5,58)&&w118Point(part.targetRestBone?.[w118b],79.25,72.25);
  // Final user-approved walking interfaces. Preserve the complete original
  // two-part registration and mirror for W119, and the opaque wrist of W117.
  const finalTechWalkAuthority={"117:north":{"masks":["aad008ab9f7facf1900a2b79f632d9fc948fcbc1501aec5f33d0b8dabfe14b7a"],"plan":{"item":117,"body":"male","direction":"north","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceDirection":"north","targetNativeCanvas":[512,512],"mirrorEntireComposition":false,"canUseSameRegistrationForIdle":false},"parts":[{"side":"RIGHT","source":{"url":"assets/08631a2f7d3ad9bbc223dc282925ea60c118e9b1dc2da32f298d3049f4f8b72b.png","sha256":"08631a2f7d3ad9bbc223dc282925ea60c118e9b1dc2da32f298d3049f4f8b72b","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":93.5,"y":74},"RIGHT ARM":{"x":95.25,"y":88.25}},"targetRestBone":{"RIGHT ELBOW":{"x":77.5,"y":58},"RIGHT ARM":{"x":79.25,"y":72.25}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"restOffsetLogical":[16,16],"restOffsetPhysical":[64,64],"depthPolicy":"Apply immediately above corresponding authored hand layer, keep far hand behind torso where source ordering requires it","calibrationOffsetPhysical":[0,0],"hideHandBeyondWrist":true}]},"119:east":{"masks":["23cd5319d3f79a3c7ca723c60606dfb82dd2a98b971ee36e91cf0229019b18c7","be241c7be220f7bbff35596b1420c5a006f19b8e1e866db24790e5429d3fcc0c"],"plan":{"item":119,"body":"male","direction":"east","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceDirection":"east","targetNativeCanvas":[512,512],"mirrorEntireComposition":false,"canUseSameRegistrationForIdle":false,"segmentedArm":true},"parts":[{"side":"RIGHT","source":{"url":"assets/2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47.png","sha256":"2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT SHOULDER":{"x":77.25,"y":62},"RIGHT ELBOW":{"x":75.5,"y":73.5}},"targetRestBone":{"RIGHT SHOULDER":{"x":61.25,"y":46},"RIGHT ELBOW":{"x":59.5,"y":57.5}},"binding":{"kind":"rigid","a":"RIGHT SHOULDER","b":"RIGHT ELBOW"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]},{"side":"RIGHT","source":{"url":"assets/630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111.png","sha256":"630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]}]},"119:west":{"masks":["23cd5319d3f79a3c7ca723c60606dfb82dd2a98b971ee36e91cf0229019b18c7","be241c7be220f7bbff35596b1420c5a006f19b8e1e866db24790e5429d3fcc0c"],"plan":{"item":119,"body":"male","direction":"west","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceDirection":"east","targetNativeCanvas":[512,512],"mirrorEntireComposition":true,"canUseSameRegistrationForIdle":false,"segmentedArm":true},"parts":[{"side":"RIGHT","source":{"url":"assets/2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47.png","sha256":"2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT SHOULDER":{"x":77.25,"y":62},"RIGHT ELBOW":{"x":75.5,"y":73.5}},"targetRestBone":{"RIGHT SHOULDER":{"x":61.25,"y":46},"RIGHT ELBOW":{"x":59.5,"y":57.5}},"binding":{"kind":"rigid","a":"RIGHT SHOULDER","b":"RIGHT ELBOW"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]},{"side":"RIGHT","source":{"url":"assets/630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111.png","sha256":"630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111","size":[640,640],"nativeSize":[640,640]},"sourceBone":{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}},"targetRestBone":{"RIGHT ELBOW":{"x":59.5,"y":57.5},"RIGHT ARM":{"x":64,"y":72.75}},"binding":{"kind":"rigid","a":"RIGHT ELBOW","b":"RIGHT ARM"},"replaceBoundLayer":true,"depthOffset":0,"calibrationOffsetPhysical":[0,0]}]}}, finalTechWalkRow=finalTechWalkAuthority[item+':'+direction];
  const finalTechWalk=approvedFinalTechWalk===true&&['walk','idle'].includes(action)&&finalTechWalkRow&&
    Object.keys(equipment).length===1&&equipment.weapon===Number(item)&&
    ['male','masculino'].includes(body)&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
    (appearance.hairStyle||appearance.hair||'original')==='original'&&ownHair&&appearance.face==='original'&&ownEyes&&
    Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)&&Object.hasOwn(root.MareAppearance96?.skins||{},skin)&&
    plan.paddingPhysical==null&&plan.parts.length===finalTechWalkRow.parts.length&&
    Object.entries(finalTechWalkRow.plan).every(([k,v])=>sameCuff(plan[k],v))&&
    plan.parts.every((part,i)=>!part.skinMaterial&&!part.mirrorSource&&!part.joinedFringe&&
      Object.entries(finalTechWalkRow.parts[i]).every(([k,v])=>sameCuff(part[k],v)));
  if(finalTechWalk)plan={...plan,parts:plan.parts.map((p,i)=>({...p,skinMaterial:{url:'assets/'+finalTechWalkRow.masks[i]+'.png',sourceSHA256:p.source.sha256}}))};
  if(skin&&skin!=='original'&&skinLocked&&!cardinalOwned&&!cardinal124&&!staff124Plan&&!staff125Plan&&!healerPlan&&!staff123Plan&&!finalTechWalk&&!north118&&!techWalk&&!north110Cuff&&!w128Saved&&!ruptura112&&!ruptura112North&&!manopla14&&!luvas3&&!pure&&!compass&&!arm117&&!arm117South&&!cannon15&&!cannon15North&&!cannon15South&&!preview23&&!cannon118Side&&!cannon118South&&!cyborgFringe&&!gauntlet111&&!gauntlet111North&&!pairSide&&!southGauntlet&&!gauntlet2North&&!mech&&!rl31&&!orb122&&!orb122NS&&!plan.parts.every(p=>p.skinMaterial?.sourceSHA256===p.source.sha256&&p.skinMaterial?.url))return null;
  if(w128WalkTrim||(w128Saved&&action==='idle'&&direction==='north')){const prev=plan.parts[0];plan={...plan,parts:[{...prev,source:{...prev.source,sha256:'9d725aecbfbe25f33180ad56b27ddca50d7ac1ae83b540510d3aaa6cd6fa0b83',url:'assets/9d725aecbfbe25f33180ad56b27ddca50d7ac1ae83b540510d3aaa6cd6fa0b83.png'}}]};}
  if(w128Saved){const trimmed=plan.parts[0];plan={...plan,parts:[{...trimmed,skinMaterial:{url:'assets/38ec923a4995564450832aa2fcbde8d29c4f945764165994fa44caf27dd3b7d8.png',sourceSHA256:trimmed.source.sha256}}]};}
  if(cardinalOwned)plan={...plan,parts:[{...plan.parts[0],staff124NativeContact:sharedCardinal.assets}]};
  if(cardinal124)plan={...plan,parts:[{...plan.parts[0],staff124NativeContact:staff124CardinalAuthority.assets}]};
  if(staff124Plan||staff125Plan)plan={...plan,parts:[{...plan.parts[0],staff124ToneTexture:staff124Plan?staff124Tone:staff125Tone}]};
  if(healerPlan)plan={...plan,parts:[{...plan.parts[0],healerToneTexture:healerTone}]};
  const ownW121Native=staff123Plan&&item===121&&plan.parts.length===1&&
    plan.parts[0].source.sha256==='6ab4b814adda46451e59ca4c0670e16ba1d01d970aa700ac3cff1f1176f8b9d0'&&
    !plan.parts[0].hideHandBeyondWrist&&!plan.parts[0].replaceBoundLayer;
  if(ownW121Native){
   // Only the item raster changes: the real animated hand supplies every skin pixel.
   const q=plan.parts[0],sha256='a5d9ace7907501b55cae486be1f0f83c9227c7cf31ddc440ff21262c70bf8ec6';
   plan={...plan,parts:[{...q,source:{...q.source,sha256,url:'assets/'+sha256+'.png',
    sourceMember:'staff121-occluded-shaft-native-v1.zip; own signed shaft with grip rows restored'},
    mirrorSource:direction==='west'?false:q.mirrorSource,sourceBone:direction==='west'?ownStaff123.plans.east.parts[0].sourceBone:q.sourceBone,depthOffset:-.02}]};
  }else if(staff123Plan)plan={...plan,parts:[{...plan.parts[0],staff123ToneTexture:staff123Tone}]};
  const hair=(appearance.hairStyle||appearance.hair||'original').replace(/^hair-/,'');
  const base=baseIndex.records.find(r=>r.body==='male'&&r.direction===direction&&r.action===action&&r.hairStyle==='original');if(!base)return null;
  let relicEyes;
  if(cardinalOwned||cardinal124||staff124Plan||staff125Plan||healerPlan||staff123Plan||finalTechWalk||north118||techWalk||north110Cuff||w128Saved||approvedCuff||ruptura112||ruptura112North||luvas3||manopla14||pure||compass||mech||rl31||orb122||orb122NS||arm117||arm117South||cannon15||cannon15North||cannon15South||preview23||cannon118Side||cannon118South||cyborgFringe||gauntlet111||gauntlet111North||pairSide||southGauntlet||gauntlet2North){
   const d=base.pack.directions[direction],faces=d.layers.filter(x=>x.slot==='face'),north=direction==='north';
   if(cardinalOwned||cardinal124){
    const b=baseIndex.records.find(r=>r.id===walks[direction]),w=b?.pack?.directions[direction],eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y),right=d.layers.filter(l=>l.id==='handRight');
    const expected=north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':'44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c';
    const handSHA=north?'bac6e7dd0929962417f44fe6f7f97d04225e8d35103ebaa542ee185644c3f6ff':'14f439e96610b4ea34fdaf1b369b27da9ab1ee47680711a6eca95f2ace971e1b';
    if(!w||base.sourcePackSHA256!==expected||b.sourcePackSHA256!==expected||base.pack.density!==4||!eq(base.pack.frame,{width:128,height:128})||
       !eq(base.pack.pivot,b.pack.pivot)||w.clip.frames!==16||w.clip.fps!==16||w.poses.length!==16||!w.clip.loop||base.mirrorX||plan.paddingPhysical||
       right.length!==1||right[0].source!==handSHA||right[0].frames||right[0].depth!==(north?7:6)||!eq(right[0].binding,{kind:'bone',a:'RIGHT ELBOW',b:'RIGHT ARM'}))return null;
    if(action==='idle'&&(d.clip.frames!==1||d.clip.fps!==1||d.clip.loop||d.poses.length!==1||!eq(d.poses[0],w.poses[0])||
       !eq(d.rest,w.rest)||!eq(d.layers,w.layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l))))return null;
   }
   if(staff124Plan||staff125Plan){
    const b=baseIndex.records.find(r=>r.id===walks[direction]),w=b?.pack?.directions[direction],eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const expected=north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':lateral?'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a':'44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c';
    if(!w||base.sourcePackSHA256!==expected||b.sourcePackSHA256!==expected||base.pack.density!==4||!eq(base.pack.frame,{width:128,height:128})||
       !eq(base.pack.pivot,b.pack.pivot)||w.clip.frames!==16||w.clip.fps!==16||w.poses.length!==16||!w.clip.loop)return null;
    if(action==='idle'&&(d.clip.frames!==1||d.clip.fps!==1||d.clip.loop||d.poses.length!==1||!eq(d.poses[0],w.poses[0])||
       !eq(d.rest,w.rest)||!eq(d.layers,w.layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l))))return null;
   }
   if(healerPlan){
    const b=baseIndex.records.find(r=>r.id===walks[direction]),w=b?.pack?.directions[direction],eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const expected=north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':lateral?'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a':'44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c';
    if(!w||base.sourcePackSHA256!==expected||b.sourcePackSHA256!==expected||base.pack.density!==4||!eq(base.pack.frame,{width:128,height:128})||
       !eq(base.pack.pivot,b.pack.pivot)||w.clip.frames!==16||w.clip.fps!==16||w.poses.length!==16||!w.clip.loop)return null;
    if(action==='idle'&&(d.clip.frames!==1||d.clip.fps!==1||d.clip.loop||d.poses.length!==1||!eq(d.poses[0],w.poses[0])||
       !eq(d.rest,w.rest)||!eq(d.layers,w.layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l))))return null;
   }
   if(staff123Plan){
    const b=baseIndex.records.find(r=>r.id===walks[direction]),w=b?.pack?.directions[direction],eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const expected=north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':lateral?'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a':'44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c';
    if(!w||base.sourcePackSHA256!==expected||b.sourcePackSHA256!==expected||base.pack.density!==4||!eq(base.pack.frame,{width:128,height:128})||
       !eq(base.pack.pivot,b.pack.pivot)||w.clip.frames!==16||w.clip.fps!==16||w.poses.length!==16||!w.clip.loop)return null;
    if(action==='idle'&&(d.clip.frames!==1||d.clip.fps!==1||d.clip.loop||d.poses.length!==1||!eq(d.poses[0],w.poses[0])||
       !eq(d.rest,w.rest)||!eq(d.layers,w.layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l))))return null;
   }
   if(w128Saved&&(base.pack.density!==4||base.pack.frame?.width!==128||base.pack.frame?.height!==128||
      (action==='walk'&&(d.clip?.frames!==16||d.poses?.length!==16))))return null;
   if(w128Saved&&action==='idle'){
    const paired=baseIndex.records.find(r=>r.id===walks[direction]),w=paired?.pack?.directions?.[direction];
    const asFrameZero=layers=>layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l);
    if(!w||d.clip?.frames!==1||d.clip?.fps!==1||d.clip?.loop!==false||d.poses?.length!==1||
      w.clip?.frames!==16||w.clip?.fps!==16||w.clip?.loop!==true||w.poses?.length!==16||
      base.sourcePackSHA256!==paired.sourcePackSHA256||!!base.mirrorX!==!!paired.mirrorX||
      !sameCuff(base.pack.frame,paired.pack.frame)||!sameCuff(base.pack.pivot,paired.pack.pivot)||
      !sameCuff(d.poses[0],w.poses[0])||!sameCuff(d.rest,w.rest)||!sameCuff(d.layers,asFrameZero(w.layers)))return null;
   }
   if(base.id!==(action==='walk'?walks[direction]:'male-idle-original-'+direction+'-from-walk0')||!!base.mirrorX!==(direction==='west')||hair!=='original'||
      !base.headHairSeparated||!['headBase','hair','lower-redrawn',...(lateral?['handNear']:['handRight','handLeft'])].every(k=>d.layers.some(x=>x.id===k)))return null;
   const hairSources={north:'429fbd2edaed6ec4d1ad5aac24898967f731e2f30f522f73d2fb16931dcf3a06',
    south:'9f6887a18e8b7a60e6dd512e9174f8f5a627b66036dc785e13567340b1a70d93',
    east:'bc1e1701bfa4ebeef48a107262cf17e707a0393a0708e8072bd46b1d3b552d2f'};
   const source=hairSources[lateral?'east':direction],h=d.layers.filter(l=>l.slot==='hair'),mat=hairAnatomy?.records[source];
   if(h.length!==1||h[0].id!=='hair'||h[0].source!==source||h[0].frames||mat?.width!==512||mat?.height!==512||
      mat.direction!==(lateral?'east':direction)||!mat.skinRuns?.length||!root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp)return null;
   if(((finalTechWalk||techWalk)&&lateral||approvedCuff||pairSide||cannon118Side||preview23&&lateral)&&(d.layers.filter(l=>l.binding?.a==='RIGHT ELBOW'&&l.binding?.b==='RIGHT ARM').length!==1||
     !d.layers.some(l=>l.id==='handNear'&&l.binding.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM'&&l.depth===8)||
     d.layers.some(l=>l.binding?.a==='LEFT ELBOW'&&l.binding?.b==='LEFT ARM')))return null;
   if(mech&&(!d.layers.some(l=>l.id==='armRight'&&l.depth===4&&l.binding?.a==='RIGHT SHOULDER'&&l.binding.b==='RIGHT ELBOW')||
      !d.layers.some(l=>l.id==='handRight'&&l.depth===6&&l.binding?.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM')))return null;
   if(action==='idle'&&(finalTechWalk||techWalk||north118||north110Cuff||approvedCuff)){
    const paired=baseIndex.records.find(r=>r.id===walks[direction]);
    const w=paired?.pack?.directions?.[direction];
    const toFirst=layers=>layers.map(l=>l.frames?{...l,frames:[l.frames[0]]}:l);
    if(!w||paired.sourcePackSHA256!==base.sourcePackSHA256||!!paired.mirrorX!==!!base.mirrorX||
       base.pack.density!==4||base.pack.frame.width!==128||base.pack.frame.height!==128||
       !sameCuff(base.pack.frame,paired.pack.frame)||!sameCuff(base.pack.pivot,paired.pack.pivot)||
       d.clip.frames!==1||d.clip.fps!==1||d.clip.loop!==false||d.poses?.length!==1||
       w.clip.frames!==16||w.clip.fps!==16||w.clip.loop!==true||w.poses?.length!==16||
       !sameCuff(d.rest,w.rest)||!sameCuff(d.poses[0],w.poses[0])||!sameCuff(d.layers,toFirst(w.layers))||
       base.sourcePackSHA256!==(north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a'))return null;
   }
   if(finalTechWalk&&(action==='walk'&&(d.clip.frames!==16||d.clip.fps!==16||d.clip.loop!==true)||
     base.sourcePackSHA256!==(north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a')||
     north&&!d.layers.some(l=>l.id==='handRight'&&l.depth===7&&l.binding?.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM')||
     lateral&&!d.layers.some(l=>l.id==='armNear'&&l.depth===7&&l.binding?.a==='RIGHT SHOULDER'&&l.binding.b==='RIGHT ELBOW')))return null;
   if(techWalk&&(action==='walk'&&(d.clip.frames!==16||d.clip.fps!==16||d.clip.loop!==true)||
     base.sourcePackSHA256!==(north?'98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0':'5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a')||
     north&&!d.layers.some(l=>l.id==='handRight'&&l.depth===7&&l.binding?.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM')||
     north&&Number(item)===119&&!d.layers.some(l=>l.id==='armRight'&&l.depth===6&&l.binding?.a==='RIGHT SHOULDER'&&l.binding.b==='RIGHT ELBOW')))return null;
   if(north118&&(base.sourcePackSHA256!=='98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0'||
      action==='walk'&&(d.clip.frames!==16||d.clip.fps!==16||d.clip.loop!==true||d.poses?.length!==16)||
      !d.layers.some(l=>l.id==='handRight'&&l.depth===7&&l.binding?.a===w118a&&l.binding.b===w118b)))return null;
   if(north){if(faces.length)return null;}
   else{
    const sha=lateral?'8909af0e687972ad9153da86adb4e8374b47aaab46a1f751c344023446ba39dc':'81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449';
    const registry=root.MareReworkModularOutfitsHD,samples=lateral?registry?.sideIrisSamples('east'):registry?.southIrisSamples(),face=faces[0];
    if(faces.length!==1||face.source!==sha||face.frames?.some(h=>h!==sha)||samples?.length!==(lateral?18:45))return null;
    relicEyes={sha,samples,offset:lateral?0:64};
   }
  }
  let savedHeadMaterial=null;
  if(registeredHeadMaterials&&(appearance.hairColor!=='black'||appearance.eyeColor!=='blue')){
   const layers=base.pack.directions[direction].layers.filter(l=>l.slot==='hair');
   if(hair!=='original'||layers.length!==1||!hairAnatomy?.records[layers[0].source]||layers[0].frames||
      !root.MareCharacterAppearance?.hairs?.[appearance.hairColor]?.ramp||!root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp)return null;
   const eyes=root.MareReworkEyeStylesHD?.maleSource(base);
   if(!relicEyes&&!(direction==='north'&&eyes?.north)&&!eyes?.source)return null;
   savedHeadMaterial={face:relicEyes?null:eyes,colors:[appearance.hairColor,appearance.eyeColor]};
  }
  const hairLayers=resolveHair(base,hair);
  if(!hairLayers)return null;
  if(direction==='west'&&!base.mirrorX){plan={...plan,parts:plan.parts.map(p=>({...p,mirrorSource:true,sourceBone:Object.fromEntries(Object.entries(p.sourceBone).map(([k,v])=>[k,{x:(p.source.nativeSize?.[0]||640)/4-v.x,y:v.y}])),targetRestBone:Object.fromEntries(Object.entries(p.targetRestBone).map(([k,v])=>[k,{x:128-v.x,y:v.y}]))}))};}
  // W128 North: use the isolated own shaft behind the existing hand. The
  // alignment is baked at 1× from same-item c484…, by shaft/wrist landmarks;
  // the approved walk rig still determines each frame's rotation and anchor.
  // Rest reuses only the same direction's verified walking F0 assembly.
  // Above, w128Saved idle already verifies every rest/layer slot and pose F0.
  const w128Timing=ds=>action==='walk'?ds.clip.fps===16&&ds.clip.loop===true:
   action==='idle'&&ds.clip.fps===1&&ds.clip.loop===false;
  const w128PureNorth=!!(w128Saved&&direction==='north'&&
    base.sourcePackSHA256==='98ec8b77734d028f37f804a03718261c77d615b42d9f5577e58cdf2b5c0fadb0'&&
    base.pack.pivot.x===64&&base.pack.pivot.y===112&&w128Timing(base.pack.directions.north)&&
    base.pack.directions.north.layers.some(l=>l.id==='handRight'&&l.depth===7&&l.source==='bac6e7dd0929962417f44fe6f7f97d04225e8d35103ebaa542ee185644c3f6ff'&&
     !l.frames&&l.binding?.a===wa&&l.binding?.b===wb));
  // W128 lateral: retained native walk pose and independent directional
  // binding. Use the same own shaft, under the original animated hand.
  const w128SideWalk=base.pack.directions[direction];
  const w128PureSide=!!(w128Saved&&['east','west'].includes(direction)&&
    base.sourcePackSHA256==='5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a'&&
    base.id===(action==='idle'?('male-idle-original-'+direction+'-from-walk0'):walks[direction])&&
    !!base.mirrorX===(direction==='west')&&base.pack.pivot.x===64&&base.pack.pivot.y===112&&
    w128Timing(w128SideWalk)&&
    w128SideWalk.layers.some(l=>l.id==='handNear'&&l.depth===8&&
     l.source==='a0bd905657faefd7e04f1186c1e719679b9edba84fa41b8525bf147254b60275'&&
     !l.frames&&l.binding?.a===wa&&l.binding?.b===wb));
  // South retains its own wrist/elbow rest, moving pose and hand ordering.
  const w128SouthWalk=base.pack.directions.south;
  const w128PureSouth=!!(w128Saved&&direction==='south'&&
    base.id===(action==='idle'?'male-idle-original-south-from-walk0':walks.south)&&
    base.sourcePackSHA256==='44b95f969c60ed8cebd6543084fc01dbbea704bb239defaee8cc71790709f65c'&&
    !base.mirrorX&&base.pack.pivot.x===64&&base.pack.pivot.y===112&&w128Timing(w128SouthWalk)&&
    w128SouthWalk.layers.some(l=>l.id==='handRight'&&l.depth===6&&
     l.source==='14f439e96610b4ea34fdaf1b369b27da9ab1ee47680711a6eca95f2ace971e1b'&&
     !l.frames&&l.binding?.a===wa&&l.binding?.b===wb));
  if(w128PureNorth||w128PureSide||w128PureSouth){
   const {skinMaterial,...shaft}=plan.parts[0],sha='40730cd745d620a3602ae7e1206fb48d3bd3e6dedd961de6c123259db8fbedfe';
   plan={...plan,parts:[{...shaft,positionOwnSource:sha,depthOffset:-.1,source:{...shaft.source,sha256:sha,url:'assets/'+sha+'.png',
    sourceMember:'staff128-male-owned-north-walk-v1.zip::'+sha+'.png'}}]};
  }
  // Reuse the exact Board 07 orb material ownership, without its donor palm.
  // The receiving male hand, motion, pivot and part order are unchanged.
  const orb17Layers={"dd514d855c0b168978c92074132bb47f8c3aa27d24f3696537884365b03e4003":["5e5bfc844fb6ece46af13cce978abe38bb27e1d63cb6246446162b44b0cc8bef","52e5db64f2e85813888a87b2ac6e57ea3fd4592aa8b7a07594ea86c35295766c"],"13333fc03735115b5169a4571b5fc48d4063b859c9fb944bee05b78eb3457fb4":["f25edbbe419b691b0e279faeeb70f04b14bc961bbd0cca243a3bcc5aaa2273b8","3800eb745525ae71061497ae9e3bf1a931f1ab5378365c131259ea40a4218103"],"ae249c8a9e349b827a6d91a5951c10ef63edf91be9649cd8c0b48645d194d65b":["85afee2afc3551dba4ddebfa1ec6f724b72723f9073d02ae1aa1eabb16f99682","e4a2f3c434849aabc41cb6037bc16c54ef3130ff21838c355bde9356c6ad287f"]};
  const orb17=Number(item)===17&&plan.parts.length===1&&equipment.weapon===17&&
   ['idle','walk'].includes(action)&&base.pack.density===4&&
   base.pack.directions[direction].layers.some(l=>l.id.startsWith('hand')&&l.binding?.a===plan.parts[0].binding.a&&l.binding?.b===plan.parts[0].binding.b)&&
   orb17Layers[plan.parts[0].source.sha256];
  const ownsOrb17=!!(orb17&&plan.parts[0].skinMaterial?.sourceSHA256===plan.parts[0].source.sha256&&
   plan.parts[0].skinMaterial.url==='assets/'+orb17[1]+'.png'&&!plan.parts[0].replaceBoundLayer);
  if(ownsOrb17){
   const {skinMaterial,hideHandBeyondWrist,...gear}=plan.parts[0],sha=orb17[0];
   // Measured distal palm registration in physical source pixels (not the forearm center).
   const [dx,dy]=direction==='south'?[4,2]:direction==='north'?[-20,17]:[-13,34];
   const sourceBone=Object.fromEntries(Object.entries(gear.sourceBone).map(([k,v])=>[k,{x:v.x-dx/4,y:v.y-dy/4}]));
   plan={...plan,parts:[{...gear,positionOwnSource:sha,sourceBone,source:{...gear.source,sha256:sha,url:'assets/'+sha+'.png',
    sourceMember:'orb17-male-carry-own-v1.zip::'+sha+'.png'}}]};
  }
  const ownsW119Mounted=techWalk&&direction==='north'&&Number(item)===119&&plan.parts.length===2&&
   plan.parts.every(p=>p.replaceBoundLayer===true&&p.binding?.kind==='rigid'&&p.depthOffset===0);
  const ownsW119SideContour=finalTechWalk&&Number(item)===119&&lateral&&['idle','walk'].includes(action)&&plan.parts.length===2&&
   plan.parts.every(q=>q.replaceBoundLayer===true&&q.side==='RIGHT'&&q.binding?.kind==='rigid'&&q.depthOffset===0)&&
   JSON.stringify(plan.parts.map(q=>q.source.sha256))==='["2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47","630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111"]';
  if(ownsW119Mounted||ownsW119SideContour)plan={...plan,parts:plan.parts.map(p=>({...p,replaceBoundLayer:false,...(ownsW119SideContour?{nativeW119Contact:true}:{})}))};
  const rest=base.pack.directions[direction].rest;
  for(const part of plan.parts)for(const name of [part.binding.a,part.binding.b])if(!rest[name]||Math.hypot(rest[name].x-part.targetRestBone[name].x,rest[name].y-part.targetRestBone[name].y)>.001)return null;
  return {...(savedHeadMaterial?{savedHeadMaterial}:{}),id:`carry${item}-${base.id}${savedHeadMaterial?':palette-'+savedHeadMaterial.colors.join('-'):''}${hair==='original'?'':':hair-'+hair}${w128PureNorth?':owned-w128-north':w128PureSide?':owned-w128-lateral':w128PureSouth?':owned-w128-south':''}${ownsOrb17?':own-orb17-no-donor-palm':''}${ownsW119Mounted?':own-w119-base-keep':''}${ownW121Native?':own-w121-native-grip':''}${cardinalOwned?':own-cardinal-gear':''}`,...hairLayers,...(cardinalOwned?{verifiedStaffNativeCardinal:true}:{}),...(cardinal124?{verifiedStaff124Cardinal:true}:{}),...(staff124Plan?{verifiedStaff124Carry:true}:{}),...(staff125Plan?{candidateStaff125Carry:true}:{}),...(healerPlan?{verifiedHealerCarry:true}:{}),...(staff123Plan?(item===121?{verifiedStaff121Carry:true}:{verifiedStaff123Carry:true}):{}),...(finalTechWalk?{stockFinalTechWalkSavedPalette:true}:{}),...(north118?{stockW118NorthWalkSavedPalette:true}:{}),...(techWalk?{stockTechWalkSavedPalette:true}:{}),...(north110Cuff?{stockNorth110WalkSavedPalette:true}:{}),...(w128Saved?(action==='walk'?{baculo128WalkSavedPalette:true}:{baculo128IdleSavedPalette:true}):{}),...(w128PureNorth?{w128PureNorth:true}:{}),...(w128PureSide?{w128PureSide:true}:{}),...(w128PureSouth?{w128PureSouth:true}:{}),...(approvedCuff?{stockWalkingCuffSavedPalette:true}:{}),...(pairSide?{gauntletPairSideSavedPalette:true}:{}),...(ruptura112?{ruptura112SavedPalette:true}:{}),...(ruptura112North?{ruptura112NorthSavedPalette:true}:{}),...(luvas3?{luvas3SavedPalette:true}:{}),...(gauntlet2North?{gauntlet2NorthSavedPalette:true}:{}),...(southGauntlet?{gauntletsSouthSavedPalette:true}:{}),...(manopla14?{manopla14SavedPalette:true}:{}),...(gauntlet111North?{gauntlet111NorthSavedPalette:true}:{}),...(gauntlet111?{gauntlet111SouthSavedPalette:true}:{}),...(preview23?{gauntlet23PreviewCarry:true}:{}),...(cannon118Side?{cannon118SideSavedPalette:true}:{}),...(cannon118South?{cannon118SouthSavedPalette:true}:{}),...(cyborgFringe?{cyborgFringeSavedPalette:true}:{}),...(pure?{relic32SavedPalette:true}:{}),...(compass?{compass16SavedPalette:true}:{}),...((arm117||arm117South)?{arm117SavedPalette:true}:{}),...((cannon15||cannon15North||cannon15South)?{cannon15SavedPalette:true}:{}),...(mech?{mechanical119SouthSavedPalette:true}:{}),...(rl31?{relic31SavedCarry:true}:{}),...(orb122?{orb122SideSavedCarry:true}:{}),...(orb122NS?{orb122NorthSouthSavedCarry:true}:{}),...(relicEyes?{relicEyes}:{}),item:Number(item),action,direction,base,plan,colorAppearance:appearance,status:'candidate-needs-visual-calibration'};
 }
 // Only the final standalone World selection opts in. Certified combined
 // clothing/head routes continue to receive their exact original fit vector.
 const independentStaffSideGear={
   123:['df2a8a414bf7c5cc68fc855b99ef8d2d2cc38d205e1921d5010670be50a66d90','bd4f563d9f11715334f1ca76b251b528a5e5676428080d9a932025b16f3b336d'],
   124:['3c2ebcd0b120096de4ecd53664883cef64cccc8fd2d4bd9975a1b47e39ef6761','d504d880418eccb943424eb0adaabb417434c61ab3d2bccadb50e4906fb218ed'],
   125:['bfcc8ff558bdbff6b16847c1ced2d539e51a4aab8558717763c21c7e302ece23','13dc36ea19461d854f6811e0179cb100e0cd3f046f682bfaf0859f7c73b2525c'],
   126:['3b3ad5ccfb8f8baaa542aea03e24b238f59fdc90f6e428a7b3b3285e78505b73','4e9a2d9f18f2b1c0e7a85e10fe13fefb8ebef5320e5aee5c16fd39ee3c1565cd',true],
   127:['7602d10cf4a606073d99c0ab5101b4498b0100ac903baf341d648c77a5793bcc','29d6148484be5882fabaecb9a6be786cd5e64c0624f825792ea75da91244b7d2',true],
 };
 function withIndependentStaffSideGear(r){
  const signed=independentStaffSideGear[r?.item],d=r?.direction,base=r?.base,p=base?.pack,q=r?.plan?.parts?.[0],ref=p?.directions?.[d];
  const walk=r?.action==='walk',count=walk?16:1,west=d==='west',name=west?'v7-male-walk-drawn-east-east-mirror-west-candidate':'v7-male-walk-drawn-east-east';
  const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!signed||(!r.verifiedStaff123Carry&&!r.verifiedStaff124Carry&&!r.candidateStaff125Carry&&!r.verifiedHealerCarry)||
    r.hdKind!=='carry'||!['east','west'].includes(d)||!['idle','walk'].includes(r.action)||
    r.headRecord||r.gearOnlyRecord||r.hairLayers||r.outfitOverlay||r.omitted?.length||
    base.sourcePackSHA256!=='5747fc1ca4bed4d6634942813eec3cfbf314e124eedabe0d69aacf5530f4d69a'||
    base.id!==(walk?name:'male-idle-original-'+d+'-from-walk0')||!!base.mirrorX!==west||
    p.density!==4||p.frame.width!==128||p.frame.height!==128||p.pivot.x!==64||p.pivot.y!==112||
    ref.clip.frames!==count||ref.clip.fps!==count||ref.clip.loop!==walk||ref.poses.length!==count||
    !ref.layers.some(l=>l.id==='handNear'&&l.depth===8&&
      l.source==='a0bd905657faefd7e04f1186c1e719679b9edba84fa41b8525bf147254b60275'&&!l.frames&&
      eq(l.binding,{kind:'bone',a:'RIGHT ELBOW',b:'RIGHT ARM'}))||
    r.plan.parts.length!==1||r.plan.sourceDirection!=='east'||r.plan.targetWalkRecord!==name||r.plan.paddingPhysical||
    q.source.sha256!==signed[0]||q.source.sourceClip||q.side!=='RIGHT'||q.mirrorSource!==west||
    q.replaceBoundLayer||q.hideHandBeyondWrist||q.skinMaterial||!eq(q.calibrationOffsetPhysical,[0,0])||
    !eq(q.binding,{kind:'rigid',a:'RIGHT ELBOW',b:'RIGHT ARM'}))return r;
  const {staff123ToneTexture,staff124ToneTexture,healerToneTexture,...part}=q,sha256=signed[1];
  // The actual hand retains its signed palette and depth. Reuse the same
  // EAST transform in both directions; the compositor mirrors WEST once.
  return {...r,id:r.id+(signed[2]?':side-own-grip-split-v2':':side-own-only-v1'),sideOwnProof:true,plan:{...r.plan,parts:[{...part,positionOwnSource:sha256,mirrorSource:false,depthOffset:-.1,
   ...(signed[2]?{staffSideGripWindow:true}:{}),
   sourceBone:{'RIGHT ELBOW':{x:92.5,y:64.75},'RIGHT ARM':{x:92.5,y:77.75}},
   source:{...q.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'staff123-127-independent-assets.zip::'+sha256+'.png'}}]}};
 }
 // Split original material at the pixel boundary before the rigid transform.
 // A transformed Canvas clip would leak partially covered texels across row 323.
 const independentStaffSideSplit=new WeakMap();
 function splitOwnSideShaft(image){
  let parts=independentStaffSideSplit.get(image);if(parts)return parts;
  const front=makeCanvas(640,640),rear=makeCanvas(640,640);
  const fc=front.getContext('2d'),rc=rear.getContext('2d');
  fc.imageSmoothingEnabled=false;rc.imageSmoothingEnabled=false;
  fc.drawImage(image,0,0); rc.drawImage(image,0,0);
  fc.clearRect(0,300,640,24);
  rc.clearRect(0,0,640,300);rc.clearRect(0,324,640,316);
  parts={front,rear};independentStaffSideSplit.set(image,parts);return parts;
 }
 function requiredFiles(r,{frame}={}){const refs=r?(frame===undefined?[...r.base.sourceRefs]:r.base.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean)):[];if(r?.hairLayers)refs.push(...r.hairLayers.map(l=>l.source));return r?[...new Set([...refs.map(s=>basePrefix+s+'.png'),...r.plan.parts.flatMap(p=>[p.source.url,...(p.healerToneTexture?[p.healerToneTexture]:[]),...(p.staff123ToneTexture?[p.staff123ToneTexture]:[]),...(p.staff124NativeContact?Object.values(p.staff124NativeContact):[]),...(p.staff124ToneTexture?[p.staff124ToneTexture]:[]),...(p.skinMaterial?[p.skinMaterial.url]:[]),...(p.joined117Sources||p.joined118Sources||p.joined15Sources||[]),...(p.joinedFringe?.urls||[])].map(url=>weaponPrefix+url))])]:[];}
 function applySkinMaterial(source,part,images,ramp,appearanceAPI){
  const mask=images.get(weaponPrefix+part.skinMaterial.url);
  if(part.skinMaterial.sourceSHA256!==part.source.sha256||!mask||mask.width!==source.width||mask.height!==source.height)throw Error('Invalid carry skin material');
  const tile=makeCanvas(source.width,source.height),ctx=tile.getContext('2d');
  ctx.drawImage(mask,0,0);
  const material=ctx.getImageData(0,0,source.width,source.height).data;
  ctx.clearRect(0,0,source.width,source.height);ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,source.width,source.height);
  const tones=new Uint8Array(material.length/4);
  for(let p=0;p<tones.length;p++){const i=p*4;if(material[i]&&pixels.data[i+3])tones[p]=skinMaterials.tone(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);}
  if(part.nativeW119Contact){
   const top=part.source.sha256==='2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47';
   if(top)for(const [x,y,premul,signed] of [[320,242,[174,118,77,255],true],[321,243,[222,149,96,255],true],[322,245,[212,142,89,255],true],[323,247,[236,160,101,255],false],[323,248,[208,141,90,255],false],[324,253,[211,151,102,255],false],[324,254,[157,108,73,255],false],[324,255,[184,120,82,255],false],[324,256,[200,128,85,255],false],[324,257,[212,132,85,255],false],[323,259,[186,111,70,255],false],[325,259,[189,105,67,255],false],[323,260,[177,98,63,255],false],[321,265,[228,150,99,255],true],[320,266,[212,149,104,255],true],[319,267,[161,115,80,255],false],[319,274,[181,127,84,255],true],[318,278,[214,146,94,255],false],[317,282,[183,122,76,255],false],[317,283,[195,128,79,255],true],[317,284,[191,117,71,255],true],[318,285,[169,86,49,255],true],[318,286,[158,80,47,255],true]]){
    const i=(y*source.width+x)*4;
    if(premul.some((v,k)=>pixels.data[i+k]!==v)||material[i]!==0)
     throw Error('Changed W119 authored shoulder boundary');
    pixels.data.fill(0,i,i+4);
   }
   let count=0;
   for(let i=0;i<material.length;i+=4)if(material[i]){
    if(!pixels.data[i+3]&&!(top&&[[320,242,[174,118,77,255],true],[321,243,[222,149,96,255],true],[322,245,[212,142,89,255],true],[323,247,[236,160,101,255],false],[323,248,[208,141,90,255],false],[324,253,[211,151,102,255],false],[324,254,[157,108,73,255],false],[324,255,[184,120,82,255],false],[324,256,[200,128,85,255],false],[324,257,[212,132,85,255],false],[323,259,[186,111,70,255],false],[325,259,[189,105,67,255],false],[323,260,[177,98,63,255],false],[321,265,[228,150,99,255],true],[320,266,[212,149,104,255],true],[319,267,[161,115,80,255],false],[319,274,[181,127,84,255],true],[318,278,[214,146,94,255],false],[317,282,[183,122,76,255],false],[317,283,[195,128,79,255],true],[317,284,[191,117,71,255],true],[318,285,[169,86,49,255],true],[318,286,[158,80,47,255],true]].some(([x,y])=>(y*source.width+x)*4===i)))
      throw Error('Missing W119 native contact');
    pixels.data.fill(0,i,i+4);count++;
   }
   if(count!==(top?89:8))throw Error('Changed W119 skin-material contact');
  }else pixels.data.set(appearanceAPI.recolor(pixels.data,tones,ramp));
  ctx.putImageData(pixels,0,0);
  return tile;
 }
 // A checked F0 reconstruction supplies a separate hardware plate. Factor its
 // alpha out of the approved sample. Only the residual stays on the wrist.
 const joinedOwnership=new WeakMap();
 function retainOwnership(canvas,original,gear,restored){
  if(!root.MareHDPosition?.active)return;
  const hardware=makeCanvas(canvas.width,canvas.height),body=makeCanvas(canvas.width,canvas.height);
  const g=hardware.getContext('2d'),b=body.getContext('2d');
  const top=g.createImageData(canvas.width,canvas.height),base=b.createImageData(canvas.width,canvas.height);
  for(let i=0;i<original.length;i+=4){
   const alpha=original[i+3]/255;if(!alpha)continue;
   const fg=Math.min(alpha,gear[i+3]/255)*(1-(restored?.[i+3]||0)/255);
   const bg=fg<1?(alpha-fg)/(1-fg):0;
   for(let k=0;k<3;k++){top.data[i+k]=gear[i+k];base.data[i+k]=bg?(original[i+k]*alpha-gear[i+k]*fg)/(bg*(1-fg)):0;}
   top.data[i+3]=255*fg;base.data[i+3]=255*bg;
  }
  g.putImageData(top,0,0);b.putImageData(base,0,0);joinedOwnership.set(canvas,{hardware,body});
 }
 // Own F0 only: immutable anatomy under immutable shorts & hardware, tested
 // against the approved original crop. Repaint the anatomy contribution, not
 // the flattened pixel's apparent color. Keep the old crop's exact alpha.
 function joinedCarryImage(source,part,images,ramp,api){
  const item=part.joined15Sources?15:117,expected=item===15?(part.joined15North?[2997,730]:part.joined15South?[307,51]:[2218,1444]):part.joined117South?[907,854]:[2148,1354];
  const [skin,shorts,gear]=(part.joined15Sources||part.joined117Sources).map(f=>images.get(weaponPrefix+f));
  const dims=640;
  if([source,skin,shorts,gear].some(l=>l?.width!==dims||l?.height!==dims)||!ramp)throw Error('Missing 117 carry material');
  const c=makeCanvas(dims,dims),ctx=c.getContext('2d'),pix=im=>{ctx.clearRect(0,0,dims,dims);ctx.drawImage(im,0,0);return ctx.getImageData(0,0,dims,dims);};
  const orig=pix(source),skinData=pix(skin),shortData=pix(shorts),gearData=pix(gear);
  const make=()=>makeCanvas(dims,dims),t=make(),tc=t.getContext('2d');
  // Literal authored F0 restore path of tech15-retracted-rest-study-v3.
  const path=part.joined15South?[[255,343],[270,344],[278,356],[279,369],[272,379],[256,379],[250,365]]:null;
  const trace=(cx)=>{cx.beginPath();path.forEach(([x,y],i)=>i?cx.lineTo(x,y):cx.moveTo(x,y));cx.closePath();};
  const restored=path?make():null,body=path?make():null;
  if(restored){const cx=restored.getContext('2d');trace(cx);cx.fill();}
  const mask=restored?.getContext('2d').getImageData(0,0,dims,dims).data;
  const finish=()=>{
   tc.drawImage(shorts,0,0);
   if(body){const bc=body.getContext('2d');bc.clearRect(0,0,dims,dims);bc.drawImage(t,0,0);}
   tc.drawImage(gear,0,0);
   if(body){tc.save();trace(tc);tc.clip();tc.drawImage(body,0,0);tc.restore();}
  };
  tc.drawImage(skin,0,0);finish();
  const old=tc.getImageData(0,0,dims,dims);
  const tone=skinMaterials.mask(skinData.data,dims,'anatomy');
  skinData.data.set(api.recolor(skinData.data,tone,ramp));tc.putImageData(skinData,0,0);finish();
  const recolored=tc.getImageData(0,0,dims,dims).data;
  let owned=0,support=0;
  for(let i=0;i<orig.data.length;i+=4){
   if(!orig.data[i+3])continue;
   support++;
   if(orig.data[i+3]!==old.data[i+3])throw Error('117 carry silhouette changed');
   if([0,1,2].some(j=>Math.abs(orig.data[i+j]-old.data[i+j])>(path?0:2)))throw Error('117 carry archive no longer matches');
   if(!skinData.data[i+3]||shortData.data[i+3]===255||(gearData.data[i+3]===255&&!mask?.[i+3]))continue;
   for(let k=0;k<3;k++)orig.data[i+k]+=recolored[i+k]-old.data[i+k];
   owned++;
  }
  if(support!==expected[0]||owned!==expected[1])throw Error('Unexpected '+item+' carry material support');
  retainOwnership(c,orig.data,gearData.data,mask);ctx.putImageData(orig,0,0);t.width=t.height=1;if(body)body.width=body.height=1;if(restored)restored.width=restored.height=1;return c;
 }
 function joinedFringeImage(source,part,images,ramp,api){
  const p118=!!part.joined118Sources;
  const fetch=f=>images.get(weaponPrefix+f);
  const [skin,shorts,gear,cut]=p118?part.joined118Sources.map(fetch):[fetch(part.joinedFringe.urls[0]),part.joinedFringe.urls[2]?fetch(part.joinedFringe.urls[2]):null,fetch(part.joinedFringe.urls[1]),null];
  const [expectedSupport,expectedAffected]=p118?[1345,202]:[part.joinedFringe.support,part.joinedFringe.count];
  const rgbTolerance=part.joinedFringe?.rgbTolerance??0,expectedClothing=part.joinedFringe?.clothing??0;
  const pad=part.joinedFringe?.centerPadding??0,assetSize=640,size=assetSize+2*pad;
  if(source?.width!==size||source?.height!==size||[skin,gear,...(p118?[shorts,cut]:part.joinedFringe.urls[2]?[shorts]:[])].some(l=>l?.width!==assetSize||l?.height!==assetSize)||!ramp)throw Error('Missing own cyborg F0 material');
  const c=makeCanvas(size,size),ctx=c.getContext('2d'),pix=im=>{ctx.clearRect(0,0,size,size);const offset=im===source?0:pad;ctx.drawImage(im,offset,offset);return ctx.getImageData(0,0,size,size);};
  const raw=pix(source),s=pix(skin),p=shorts?pix(shorts).data:null,g=pix(gear).data,m=cut?pix(cut).data:null;
  const tone=skinMaterials.mask(s.data,size,'anatomy'),tmp=makeCanvas(size,size),t=tmp.getContext('2d');
  const compose=()=>{t.putImageData(s,0,0);if(shorts)t.drawImage(shorts,pad,pad);if(cut){t.globalCompositeOperation='destination-out';t.drawImage(cut,pad,pad);t.globalCompositeOperation='source-over';}t.drawImage(gear,pad,pad);return t.getImageData(0,0,size,size).data;};
  const old=compose(),recolored=api.recolor(s.data,tone,ramp);
  let support=0,affected=0,verifiedClothing=0;const ids=[];
  for(let i=0;i<raw.data.length;i+=4){
   if(!raw.data[i+3])continue;
   support++;
   if(!p118){
    if([0,1,2,3].every(k=>raw.data[i+k]===g[i+k]))continue;
    // Canvas may round an unpremultiplied edge by one RGB code. Only the
    // metal is present here. Compare the actual premultiplied channels and
    // leave the original pixel untouched, including its exact alpha.
    const alpha=raw.data[i+3];
    // If adding the tissue would change alpha, this sample cannot be
    // the joined skin composite. Only the original gear supplied its alpha.
    if(alpha===g[i+3]&&old[i+3]>alpha&&[0,1,2].every(k=>
       Math.abs(raw.data[i+k]-g[i+k])<=rgbTolerance))continue;
    if(!s.data[i+3]&&!p?.[i+3]&&alpha===g[i+3]&&[0,1,2].every(k=>
       Math.round(raw.data[i+k]*alpha/255)===Math.round(g[i+k]*alpha/255)))continue;
   }
   if(raw.data[i+3]!==old[i+3]||[0,1,2].some(k=>Math.abs(raw.data[i+k]-old[i+k])>rgbTolerance))throw Error('Own cyborg carry no longer reconstructs its F0 crop');
   if(!p118&&expectedClothing&&p?.[i+3]&&!s.data[i+3]){verifiedClothing++;continue;}
   if(m?.[i+3]||!s.data[i+3]||p?.[i+3]||g[i+3]===255||!tone[i/4]){
    if(!p118)throw Error('Unsigned cyborg fringe');
    continue;
   }
   ids.push(i);affected++;
  }
  if(support!==expectedSupport||affected!==expectedAffected||verifiedClothing!==expectedClothing)throw Error('Unexpected cyborg F0 material support');
  for(const i of ids)for(let k=0;k<3;k++)s.data[i+k]=recolored[i+k];
  const next=compose();
  for(const i of ids){if(next[i+3]!==raw.data[i+3])throw Error('Changed cyborg F0 alpha');for(let k=0;k<3;k++)raw.data[i+k]=rgbTolerance?raw.data[i+k]+next[i+k]-old[i+k]:next[i+k];}
  retainOwnership(c,raw.data,g,null);ctx.putImageData(raw,0,0);tmp.width=1;return c;
 }
 // W112 carry: exact residuals found in full World playback. Scope to
 // the authenticated saved clip; leave all other phases and gear untouched.
 const w112WristCutSource='66b32c40ecb1efc295d4ab1c2a2e169e1bceb48bbbb7b7539b2c3ef0aa834827';
 const w112WristAnatomy='e61dfb06ec13c8085a02dc5ffbd2cca8648d0a96f242a3bbd15884ab9baea3a1';
 function w112WalkSpecks(r,d,padding){
  if(r.item!==112||r.body!=='male'||r.action!=='walk'||padding!==0||
     d.clip.frames!==16||d.clip.fps!==16||!d.clip.loop||
     r.base.pack.frame.width!==128||r.base.pack.frame.height!==128||
     r.base.pack.pivot.x!==64||r.base.pack.pivot.y!==112||r.plan.parts.length!==2)return null;
  if(r.ruptura112NorthSavedPalette&&r.direction==='north'&&r.base.id==='v7-male-walk-drawn-north-north'&&!r.base.mirrorX)return 'north';
  if(r.ruptura112SavedPalette&&r.direction==='south'&&r.base.id==='male-walk-south-r7'&&!r.base.mirrorX)return 'south';
  if(r.gauntletPairSideSavedPalette&&(
      r.direction==='east'&&r.base.id==='v7-male-walk-drawn-east-east'&&!r.base.mirrorX||
      r.direction==='west'&&r.base.id==='v7-male-walk-drawn-east-east-mirror-west-candidate'&&r.base.mirrorX))return 'side';
  return null;
 }
 // Exact signed W2/W110 carry residues, separate from material/palette
 // ownership. The authored wrist pose, mount transforms, and source PNGs are unchanged.
 function w2w110CarrySpecks(r,d,padding){
  if(![2,110].includes(r.item)||r.body!=='male'||padding||
     r.base.pack.frame.width!==128||r.base.pack.frame.height!==128||
     r.base.pack.pivot.x!==64||r.base.pack.pivot.y!==112)return null;
  const gait=r.action==='walk'&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop;
  const idle=r.action==='idle'&&d.clip.frames===1&&d.clip.fps===1;
  if(r.direction==='north'&&!r.base.mirrorX&&r.plan.parts.length===2){
   if(gait&&r.base.id==='v7-male-walk-drawn-north-north'){
    if(r.item===2&&r.gauntlet2NorthSavedPalette)return 'w2-north';
    if(r.item===110&&r.stockNorth110WalkSavedPalette)return 'w110-north';
   }
   if(idle&&r.item===110&&r.stockNorth110WalkSavedPalette&&r.base.id==='male-idle-original-north-from-walk0')return 'w110-idle-north';
  }
  if(gait&&r.stockWalkingCuffSavedPalette&&r.plan.parts.length===1&&(
     r.direction==='east'&&r.base.id==='v7-male-walk-drawn-east-east'&&!r.base.mirrorX||
     r.direction==='west'&&r.base.id==='v7-male-walk-drawn-east-east-mirror-west-candidate'&&r.base.mirrorX))return 'w'+r.item+'-side';
  return null;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],drawGaitHat,appearance=r?.colorAppearance||{},appearanceAPI=root.MareAppearance96}={}){
  if(!r)throw Error('Unsupported carry identity');const source=r.base.pack,original=source.directions[r.direction],d=r.hairLayers?{...original,layers:original.layers.filter(l=>l.slot!=='hair').concat(r.hairLayers)}:original,p=r.hairLayers?{...source,directions:{...source.directions,[r.direction]:d}}:source,pose=d.poses[frame];if(!pose)throw Error('No authored frame');const padding=r.plan.paddingPhysical??0;if(!Number.isInteger(padding)||padding<0)throw Error('Carry padding must be a nonnegative integer');const w=p.frame.width*4+2*padding,h=p.frame.height*4+2*padding;ctx.canvas.width=w;ctx.canvas.height=h;
  const canvas=r.base.mirrorX?makeCanvas(w,h):ctx.canvas,target=r.base.mirrorX?canvas.getContext('2d'):ctx;target.clearRect(0,0,w,h);target.imageSmoothingEnabled=false;target.save();target.translate(padding,padding);try{
  const map=new Map([...r.base.sourceRefs,...(r.hairLayers||[]).map(l=>l.source)].map(s=>[s,images.get(basePrefix+s+'.png')||images.get(s)]));const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')){if(!appearanceAPI)throw Error('Carry palette API unavailable');for(const [source,image] of map){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),isHair=uses.some(l=>l.slot==='hair'),skinKind=uses.length&&uses.every(l=>r.skinRepairLayers?.includes(l.id))?'mixed':skinMaterials?.ownership(uses),ramp=isHair?appearanceAPI.hairs[hair]?.ramp:skinKind?appearanceAPI.skins[skin]?.ramp:null;if(!image||!ramp&&!(isHair&&hairAnatomy?.records[source]))continue;const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const data=tc.getImageData(0,0,image.width,image.height);const anatomical=isHair?hairAnatomy?.recolor(source,data.data,appearance,appearanceAPI):null;data.data.set(anatomical||appearanceAPI.recolor(data.data,isHair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,image.width,skinKind),ramp));tc.putImageData(data,0,0);map.set(source,tile);}}
  if(r.relicEyes){
   const {sha,samples,offset}=r.relicEyes,ramp=root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp;
   const src=images.get(basePrefix+sha+'.png')||images.get(sha),im=map.get(sha);
   if(ramp?.length!==5||src?.width!==512||src.height!==512||im?.width!==512||im.height!==512)throw Error('Missing exact Relic32 iris authority');
   const raw=makeCanvas(512,512),c=makeCanvas(512,512),rc=raw.getContext('2d'),cx=c.getContext('2d');rc.drawImage(src,0,0);cx.drawImage(im,0,0);
   const original=rc.getImageData(0,0,512,512).data,changed=cx.getImageData(0,0,512,512);
   for(const [x,y,R,G,B,A,tone] of samples){
    const i=((y-offset)*512+x-offset)*4;
    if(original[i]!==R||original[i+1]!==G||original[i+2]!==B||original[i+3]!==A||changed.data[i+3]!==A)throw Error('Relic32 unregistered iris pixel');
    const hex=parseInt(ramp[tone-1].slice(1),16);changed.data[i]=hex>>>16;changed.data[i+1]=(hex>>>8)&255;changed.data[i+2]=hex&255;
   }
   cx.putImageData(changed,0,0);map.set(sha,c);raw.width=1;
  }
  const eyes=root.MareReworkEyeStylesHD;
  const expression=r.savedHeadMaterial?r.savedHeadMaterial.face:!r.verifiedStaffNativeCardinal&&!r.verifiedStaff124Cardinal&&!r.verifiedHealerCarry&&!r.verifiedStaff121Carry&&!r.verifiedStaff123Carry&&!r.verifiedStaff124Carry&&!r.candidateStaff125Carry&&!r.stockFinalTechWalkSavedPalette&&!r.stockW118NorthWalkSavedPalette&&!r.stockTechWalkSavedPalette&&!r.stockNorth110WalkSavedPalette&&!r.baculo128WalkSavedPalette&&!r.stockWalkingCuffSavedPalette&&!r.relic32SavedPalette&&!r.compass16SavedPalette&&!r.arm117SavedPalette&&!r.cannon15SavedPalette&&!r.gauntlet23PreviewCarry&&!r.cannon118SideSavedPalette&&!r.cannon118SouthSavedPalette&&!r.cyborgFringeSavedPalette&&!r.gauntlet111SouthSavedPalette&&!r.gauntlet111NorthSavedPalette&&!r.gauntletPairSideSavedPalette&&!r.orb122SideSavedCarry&&!r.orb122NorthSouthSavedCarry&&!r.manopla14SavedPalette&&!r.gauntletsSouthSavedPalette&&!r.gauntlet2NorthSavedPalette&&!r.luvas3SavedPalette&&!r.ruptura112SavedPalette&&!r.ruptura112NorthSavedPalette&&eyes&&(eyes.supports(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes.maleSource(r.base);
  if(expression?.source){
   const image=map.get(expression.source),tile=makeCanvas(image.width,image.height),face=tile.getContext('2d');
   face.drawImage(image,0,0);
   eyes.recolorIris(face,expression,appearance.eyeColor);
   eyes.reshape(face,appearance.face,expression.direction,expression.boxes);
   map.set(expression.source,tile);
  }
  const w112Specks=w112WalkSpecks(r,d,padding);
  const carrySpecks=w2w110CarrySpecks(r,d,padding);
  const layers=V.plan(p,r.direction,frame).filter(l=>!hiddenSlots.includes(l.slot));const operations=layers.map(l=>({depth:l.depth,layer:l}));
  if(drawGaitHat){
   // Keep the head in the outfit depth stack, below foreground arms and weapons.
   const hair=V.plan(source,r.direction,frame).find(l=>l.slot==='hair');
   if(!hair)throw Error('Missing registered hair depth');
   for(let i=operations.length-1;i>=0;i--)if(operations[i].layer.slot==='hair')operations.splice(i,1);
   operations.push({depth:hair.depth,drawGaitHat});
  }
  for(const part of r.plan.parts){const hand=layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);if(!hand)continue; // Lateral source has no authored far hand: do not float a disconnected far gauntlet.
   if(part.source.sha256==='a5d9ace7907501b55cae486be1f0f83c9227c7cf31ddc440ff21262c70bf8ec6'&&r.item===121&&r.verifiedStaff121Carry||
      part.staffSideGripWindow&&r.sideOwnProof&&[126,127].includes(r.item)&&
      part.source.sha256===independentStaffSideGear[r.item][1]){
    // The signed grip intersects own shaft only in rows 300–323. Keep only
    // that short span behind the actual wrist; expose the rest of the shaft.
    operations.push({depth:hand.depth-.02,part,w121Grip:true},{depth:hand.depth+.02,part,w121Grip:false});
   }else operations.push({depth:hand.depth+(part.depthOffset??.1),part});}
  // Fixed WEST garment rasters are already facing WEST. Compensate for the
  // base canvas reflection only when drawing those registered layers.
  for(const op of operations.sort((a,b)=>a.depth-b.depth)){
   if(op.drawGaitHat){
    target.save();try{
     if(r.base.mirrorX){target.translate(p.frame.width*4,0);target.scale(-1,1);}
     op.drawGaitHat(target);
    }finally{target.restore();}
    continue;
   }
   if(op.layer){const original=d.layers.find(l=>l.id===op.layer.id);if(original.slot==='body'&&r.plan.parts.some(q=>q.replaceBoundLayer&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b))continue;const pack={...p,directions:{[r.direction]:{...d,layers:[original]}}};const cover=original.slot==='body'&&r.plan.parts.find(q=>q.hideHandBeyondWrist&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b);target.save();if(cover){const a=pose[cover.binding.a],b=pose[cover.binding.b],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,L=2000,x=b.x*4,y=b.y*4;target.beginPath();target.moveTo(x+nx*L,y+ny*L);target.lineTo(x-nx*L,y-ny*L);target.lineTo(x-nx*L-ux*L,y-ny*L-uy*L);target.lineTo(x+nx*L-ux*L,y+ny*L-uy*L);target.closePath();target.clip();
    // The North remainder is from the clipped native hand (not the metal).
    // Exclude exactly those disconnected wrist-edge samples from this draw.
    const signedNorthCut=w112Specks==='north'&&cover.source.sha256===w112WristCutSource||
     carrySpecks==='w2-north'&&cover.source.sha256==='33136493d49bc376f0dc943348d314dbcca9f3a288cccea8c8d055f395670b6e'||
     carrySpecks==='w110-north'&&cover.source.sha256==='0d957c301ea9376fa42c2f4c8bca8ace0e3d11d5c7318f17c8a9f4ae7bfad390';
    const specks=signedNorthCut&&original.id==='handLeft'&&
     (original.frames?.[frame]||original.source)===w112WristAnatomy&&
     cover.binding.a==='LEFT ELBOW'&&cover.binding.b==='LEFT ARM'?
     (frame===1?[[216,289,2,1]]:frame===3||frame===5?[[216,284,1,1],[217,285,1,1]]:null):null;
    if(specks){target.beginPath();target.rect(0,0,w,h);for(const rect of specks)target.rect(...rect);target.clip('evenodd');}
    }
    const reflectedLayer=r.preMirroredLayers?.includes(original.id);
    if(reflectedLayer){target.translate(p.frame.width*4,0);target.scale(-1,1);}
    const settings={direction:r.direction,frame,density:4,clear:false};
    if(r.plan.paddingPhysical!==undefined){
     const tile=makeCanvas(p.frame.width*4,p.frame.height*4),paint=()=>V.render(tile.getContext('2d'),pack,map,settings);
     // The outer canvas reflects this tile after its equipment has been painted.
     if(root.MareHDPosition?.active)root.MareHDPosition.bodyPlane(p,4,0,!!reflectedLayer,paint);else paint();
     target.drawImage(tile,0,0);
    }else V.render(target,pack,map,settings);
    target.restore();continue;
   }
   const q=op.part,im=images.get(weaponPrefix+q.source.url);if(!im)throw Error('Missing isolated equipment');
   if(op.w121Grip!==undefined){
    const {a,b}=q.binding,m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]),[ox,oy]=q.calibrationOffsetPhysical||[0,0];
    target.save();target.transform(m[0],m[1],m[2],m[3],m[4]*4+ox,m[5]*4+oy);
    if(q.mirrorSource){target.translate(im.width,0);target.scale(-1,1);}
    if(q.staffSideGripWindow){
     if(im.width!==640||im.height!==640)throw Error('Invalid signed C126/C127 shaft dimensions');
     const pair=splitOwnSideShaft(im);
     ownedImage(target,'weapon',op.w121Grip?'shaft-rear':'shaft-front',q.source.sha256,op.w121Grip?pair.rear:pair.front,[0,0],r.base.mirrorX?-1:1);target.restore();continue;
    }
    target.beginPath();
    if(!op.w121Grip){target.rect(0,0,640,300);target.rect(0,324,640,316);}
    else target.rect(0,300,640,24);
    target.clip();ownedImage(target,'weapon',op.w121Grip?'shaft-rear':'shaft-front',q.source.sha256,im,[0,0],r.base.mirrorX?-1:1);target.restore();continue;
   }
   if(q.staff124NativeContact){
    const gear=images.get(weaponPrefix+q.staff124NativeContact.gear),grip=images.get(weaponPrefix+q.staff124NativeContact.grip),hand=d.layers.find(l=>l.id==='handRight');
    if(!gear||!grip||gear.width!==640||gear.height!==640||grip.width!==640||grip.height!==640||!hand||padding||r.base.mirrorX)throw Error('Missing exact C124 native contact');
    const {a,b}=q.binding,m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]),[ox,oy]=q.calibrationOffsetPhysical||[0,0],tx=m[4]*4+ox,ty=m[5]*4+oy;
    const transform=(x,y)=>[m[0]*x+m[2]*y+tx,m[1]*x+m[3]*y+ty];
    const corners=[355,383].flatMap(x=>[299,324].map(y=>transform(q.mirrorSource?640-x:x,y)));
    const x0=Math.max(0,Math.floor(Math.min(...corners.map(v=>v[0])))-1),y0=Math.max(0,Math.floor(Math.min(...corners.map(v=>v[1])))-1),
     sw=Math.min(w,Math.ceil(Math.max(...corners.map(v=>v[0])))+1)-x0,sh=Math.min(h,Math.ceil(Math.max(...corners.map(v=>v[1])))+1)-y0;
    const c=makeCanvas(sw,sh),u=c.getContext('2d'),apply=(t,dx,dy)=>{t.transform(m[0],m[1],m[2],m[3],tx-dx,ty-dy);if(q.mirrorSource){t.translate(640,0);t.scale(-1,1);}};
    const project=(image,delta=[0,0])=>{u.clearRect(0,0,sw,sh);u.save();u.imageSmoothingEnabled=false;apply(u,x0-delta[0],y0-delta[1]);u.drawImage(image,0,0);u.restore();return u.getImageData(0,0,sw,sh).data;};
    const contact=project(grip),shaft=project(gear,root.MareHDPosition?.offset('weapon','shaft')),handOnly=makeCanvas(w,h),hc=handOnly.getContext('2d');
    V.render(hc,{...p,directions:{[r.direction]:{...d,layers:[hand]}}},map,{direction:r.direction,frame,density:4});
    const handPixels=hc.getImageData(x0,y0,sw,sh).data,before=target.getImageData(x0,y0,sw,sh).data;
    target.save();apply(target,0,0);ownedImage(target,'weapon','shaft',q.staff124NativeContact.gear,gear,[0,0]);target.restore();
    const after=target.getImageData(x0,y0,sw,sh),pixels=after.data;
    for(let i=3;i<pixels.length;i+=4)if(contact[i]&&shaft[i]&&handPixels[i]&&before[i]){
     const top=contact[i]/255,low=1-top,a=pixels[i]*low+before[i]*top;
     for(let c=1;c<=3;c++)pixels[i-c]=Math.round((pixels[i-c]*pixels[i]*low+before[i-c]*before[i]*top)/a);
     pixels[i]=Math.round(a);
    }
    target.putImageData(after,x0,y0);c.width=handOnly.width=1;
    continue;
   }
   const palette=appearanceAPI?.skins[skin]?.ramp;
   const staff124=q.staff124ToneTexture?images.get(weaponPrefix+q.staff124ToneTexture):null;
   if(q.staff124ToneTexture&&(!staff124||staff124.width!==im.width||staff124.height!==im.height))throw Error('Missing exact staff124 carry material');
   const healer=q.healerToneTexture?images.get(weaponPrefix+q.healerToneTexture):null;
   if(q.healerToneTexture&&(!healer||healer.width!==im.width||healer.height!==im.height))throw Error('Missing exact healer carry material');
   const staff123=q.staff123ToneTexture?images.get(weaponPrefix+q.staff123ToneTexture):null;
   if(q.staff123ToneTexture&&(!staff123||staff123.width!==im.width||staff123.height!==im.height))throw Error('Missing exact staff123 carry material');
   const partImage=staff123||healer||staff124?staff123||healer||staff124:(q.joined118Sources||q.joinedFringe)?joinedFringeImage(im,q,images,palette,appearanceAPI):(q.joined117Sources||q.joined15Sources)?joinedCarryImage(im,q,images,palette,appearanceAPI):palette&&q.skinMaterial?applySkinMaterial(im,q,images,palette,appearanceAPI):im;const a=q.binding.a,b=q.binding.b;
   // South and side specks instead originate in the independent equipment
   // texture, at the same sampled source points before the authored transform.
   const hole=q.side==='RIGHT'&&(w112Specks==='side'&&(frame===9||frame===12)&&
     q.source.sha256==='bf0810f0c33f571580836998f170bc085fa5e0f783fbd7c343ae0c8662a40fd6'?[310,377,2,1]:
     w112Specks==='south'&&frame===15&&q.source.sha256==='a4efb496a6b4ac775e81081881fa391cf123833602ac3b666216bb7ed868b1ef'?[274,349,1,1]:null);
   const carryHole=q.side==='RIGHT'&&(
    carrySpecks==='w2-side'&&(frame===10||frame===11)&&q.source.sha256==='a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a'?[308,373,1,1]:
    carrySpecks==='w110-side'&&q.source.sha256==='7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227'?
     (frame===2?[340,361,1,1]:frame>=9&&frame<=14?[300,354,1,1]:null):
    ((carrySpecks==='w110-north'&&frame!==4&&frame!==11&&frame!==13)||(carrySpecks==='w110-idle-north'&&frame===0))&&
     q.source.sha256==='9cabcc5bec690ae2ef438df3b58a5e2d3d96af78c4e79aff30a14a8e8a7cf20d'?[433,408,1,1]:null);
   // These two W117 metal texels are detached only in the signed
   // lateral gait phases below, not in idle or other reaching poses.
   const w117SideHoles=r.item===117&&r.body==='male'&&r.action==='walk'&&r.arm117SavedPalette&&
    padding===0&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop&&p.frame.width===128&&p.frame.height===128&&p.pivot.x===64&&p.pivot.y===112&&
    (r.direction==='east'&&r.base.id==='v7-male-walk-drawn-east-east'&&!r.base.mirrorX||
     r.direction==='west'&&r.base.id==='v7-male-walk-drawn-east-east-mirror-west-candidate'&&r.base.mirrorX)&&
    frame>=9&&frame<=14&&q.side==='RIGHT'&&q.source.sha256==='c86602712a9c0a7295e2e509ee2726553a24ce83172b573876bdde263fc17f96'?
    (frame===11||frame===13?[[310,376,1,1],[302,371,1,1]]:[[310,376,1,1]]):null;
   // W14: one source texel detaches under the exact lateral walk pose 12.
   const w14SideHole=r.item===14&&r.body==='male'&&r.action==='walk'&&r.manopla14SavedPalette&&frame===12&&
    padding===0&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop&&p.frame.width===128&&p.frame.height===128&&p.pivot.x===64&&p.pivot.y===112&&
    (r.direction==='east'&&r.base.id==='v7-male-walk-drawn-east-east'&&!r.base.mirrorX||
     r.direction==='west'&&r.base.id==='v7-male-walk-drawn-east-east-mirror-west-candidate'&&r.base.mirrorX)&&
    q.side==='RIGHT'&&q.source.sha256==='8ff81ee85ed4eb038dfa08d0413266fa50a17a44e3c4f5c2b2b95361ef26bc9b'?[[302,347,1,1]]:null;
   // Remove literal disconnected source remnants only in the verified Cyborg carry poses.
   let cyborgCarrySpecks=null;
   if(r.body==='male'&&q.side==='RIGHT'&&padding===0&&p.frame.width===128&&p.frame.height===128&&p.pivot.x===64&&p.pivot.y===112){
    const stockWalk=r.action==='walk'&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop;
    if(r.item===15&&r.cannon15SavedPalette&&r.direction==='north'&&!r.base.mirrorX&&
      q.source.sha256==='f5482aa957130425b88d61515857d12c139058eefdb7389acb845acb889f1efa'&&
      (r.action==='idle'&&frame===0&&r.base.id==='male-idle-original-north-from-walk0'&&d.clip.frames===1&&d.clip.fps===1&&!d.clip.loop||
       stockWalk&&r.base.id==='v7-male-walk-drawn-north-north'&&[0,2,6,7].includes(frame)))cyborgCarrySpecks=[[360,407,1,2]];
    if(r.item===120&&r.stockTechWalkSavedPalette&&stockWalk&&
      (r.direction==='east'&&r.base.id==='v7-male-walk-drawn-east-east'&&!r.base.mirrorX||
       r.direction==='west'&&r.base.id==='v7-male-walk-drawn-east-east-mirror-west-candidate'&&r.base.mirrorX)&&
       q.source.sha256==='7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a'){
     if(frame===9||frame===15)cyborgCarrySpecks=[[303,383,1,1]];
     else if(frame===10)cyborgCarrySpecks=[[311,383,1,1]];
     else if(frame>=11&&frame<=13)cyborgCarrySpecks=[[303,383,1,1],[311,383,1,1]];
    }
   }
   // W118 South: isolated alpha-1 specks in equipment pick up opaque F0
   // skin from the signed material reconstruction. Clear only their unstable
   // projected samples; never cut skin on the native body layer.
   let cannon118FringeSpecks=null;
   if(r.item===118&&r.body==='male'&&r.cannon118SouthSavedPalette&&r.direction==='south'&&!r.base.mirrorX&&padding===0&&
    p.frame.width===128&&p.frame.height===128&&p.pivot.x===64&&p.pivot.y===112&&q.side==='RIGHT'&&
    q.source.sha256==='9fadba42a015194fcbde9afaec3c6a266ad4ab566580b79e5353d4e6a2f9c31e'){
     if(r.action==='idle'&&r.base.id==='male-idle-original-south-from-walk0'&&frame===0&&d.clip.frames===1&&d.clip.fps===1&&!d.clip.loop)
      cannon118FringeSpecks={"0":[[277,312,1,1],[282,310,1,1]]}[0];
     if(r.action==='walk'&&r.base.id==='male-walk-south-r7'&&d.clip.frames===16&&d.clip.fps===16&&d.clip.loop)
      cannon118FringeSpecks={"0":[[277,312,1,1],[282,310,1,1]],"1":[[277,312,1,1],[282,310,1,1]],"2":[[282,310,1,1]],"3":[[277,312,1,1],[282,310,1,1]],"4":[[277,312,1,1],[282,310,1,1]],"5":[[277,312,1,1],[282,310,1,1]],"6":[[277,312,1,1],[282,310,1,1]],"7":[[277,312,1,1],[282,310,1,1]],"8":[[277,312,1,1],[282,310,1,1]],"9":[[274,311,1,1],[275,309,1,1],[277,312,1,1],[282,310,1,1]],"10":[[274,311,1,1],[275,309,1,1],[277,312,1,1],[282,310,1,1]],"11":[[274,311,1,1],[275,309,1,1],[277,312,1,1],[282,310,1,1]],"12":[[274,311,1,1],[275,309,1,1],[277,312,1,1],[282,310,1,1]],"13":[[277,312,1,1],[282,310,1,1]],"14":[[274,311,1,1],[277,312,1,1],[282,310,1,1]],"15":[[274,311,1,1],[277,312,1,1],[282,310,1,1]]}[frame];
   }
   const w119LooseBottom=q.nativeW119Contact&&r.action==='walk'&&[11,13].includes(frame)&&
    q.source.sha256==='630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111'?[[311,379,1,1]]:null;
   const remove=w119LooseBottom||cannon118FringeSpecks||cyborgCarrySpecks||w14SideHole||w117SideHoles||(hole||carryHole?[hole||carryHole]:null);let clean=partImage;
   if(remove){clean=makeCanvas(partImage.width,partImage.height);const c=clean.getContext('2d');c.drawImage(partImage,0,0);for(const rect of remove)c.clearRect(...rect);}
   // Wrist anchored rigid transform: no weapon raster scaling/stretch; follow authored wrist and forearm rotation.
   const m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]);target.save();const offset=q.calibrationOffsetPhysical||[0,0];target.transform(m[0],m[1],m[2],m[3],m[4]*4+offset[0],m[5]*4+offset[1]);if(q.source.sourceClip){if(root.MareHDPosition?.active)root.MareHDPosition.localClip(target,q.source.sourceClip,'weapon',q.side+'-'+a+'-'+b,r.base.mirrorX?-1:1);
    else{target.beginPath();target.rect(...q.source.sourceClip);target.clip();}}if(q.mirrorSource){target.translate(q.source.nativeSize?.[0]||640,0);target.scale(-1,1);}if(r.relic31SavedCarry&&q.relic31PivotTilt){const {x,y,radians}=q.relic31PivotTilt;target.translate(x,y);target.rotate(radians);target.translate(-x,-y);}const plates=joinedOwnership.get(partImage);
   if(plates){
    const {hardware,body}=plates;
    for(const rect of remove||[]){hardware.getContext('2d').clearRect(...rect);body.getContext('2d').clearRect(...rect);}
    const refs=q.joinedFringe?.urls||q.joined118Sources||q.joined117Sources||q.joined15Sources;
    root.MareHDPosition.blit(target,'weapon',q.side+'-'+a+'-'+b,[q.source.sha256,...refs],hardware,[0,0],r.base.mirrorX?-1:1,clean,body);
    hardware.width=body.width=1;joinedOwnership.delete(partImage);
   }else if(q.skinMaterial&&root.MareHDPosition?.active){
    const mask=images.get(weaponPrefix+q.skinMaterial.url);
    root.MareHDPosition.material(target,'weapon',q.side+'-'+a+'-'+b,q.source.sha256+'@'+q.skinMaterial.url,clean,mask,[0,0],r.base.mirrorX?-1:1);
   }else if(q.positionOwnSource===q.source.sha256){
    ownedImage(target,'weapon',q.side+'-'+a+'-'+b,q.source.sha256,clean,[0,0],r.base.mirrorX?-1:1);
   }else if(q.joined118Sources||q.joined117Sources||q.joined15Sources||q.joinedFringe||staff123||healer||staff124||q.skinMaterial||r.plan.interfaceSkinLocked&&!r.sideOwnProof&&!r.orb122NorthSouthSavedCarry&&!r.orb122SideSavedCarry||q.source.sourceMember?.includes('grip pixels')||q.evidence?.includes('original grip pixels'))target.drawImage(clean,0,0);
   else ownedImage(target,'weapon',q.side+'-'+q.binding.a+'-'+q.binding.b,q.source.sha256,clean,[0,0],r.base.mirrorX?-1:1);
   target.restore();if(clean!==partImage)clean.width=1;
  }
  }finally{target.restore();}if(r.base.mirrorX){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0);ctx.restore();}
  return {width:w,height:h,density:4,pivot:{x:p.pivot.x*4+padding,y:p.pivot.y*4+padding},frames:d.clip.frames,fps:d.clip.fps,frame,status:r.status,physicalScale:1,source:r.id,calibrationRequired:true};
 }
 // Adapt only a preselected exact carry; do not resolve/rebind weapon, pose, or hand.
 function withNamedHair(record,style,color){
  if(!['hair-cropped','hair-spiky'].includes(style))return null;
  const fitted=withGaitHair(record,style,color);
  return fitted&&{...fitted,id:record.id+':named-focus-'+style+':'+color,namedFocusCarry:true};
 }
 function withGaitHair(record,style,color){
  if(record?.hdKind!=='carry'||record.hairLayers||record.colorAppearance?.hair!=='original'||
     !root.MareCharacterAppearance?.choices.hairStyle[style]||style==='original')return null;
  const resolved=resolveHair(record.base,style.replace(/^hair-/,''));
  if(!resolved||style!=='none'&&(resolved.hairLayers?.length!==1||!resolved.hairSource))return null;
  const layer=resolved.hairLayers[0],d=record.base.pack.directions[record.direction];
  if(layer&&d.layers.some(l=>l.slot!=='hair'&&(l.id===layer.id||l.source===layer.source||l.frames?.includes(layer.source))))return null;
  return {...record,...resolved,id:record.id+':saved-carry-hair:'+style+':'+color,
   colorAppearance:{...record.colorAppearance,hair:style,hairStyle:style,hairColor:color}};
 }
 // Independent gear uses the unchanged native carry. The source census
 // replayed every phase with and without its weapon and found no contact
 // between weapon pixels and these no-hair-occlusion hat passes.
 function certifiedCarryVector(r){
  const cert=carryIndex.verifiedHeadgear, row=cert?.plans?.[r?.id];
  if(cert?.schema!=='exact-independent-carry-headgear-v1'||r?.hdKind!=='carry'||!row||
     r.base?.id!==row.baseId||r.colorAppearance?.skin!==cert.sourceTone||
     !Number.isSafeInteger(row.plan)||JSON.stringify(r.plan)!==JSON.stringify(cert.vectors?.[row.plan]))return null;
  const base=baseIndex.records.find(b=>b.id===row.baseId);
  if(!base||!!base.mirrorX!==!!r.base.mirrorX||JSON.stringify(base.pack)!==JSON.stringify(r.pack)||
     JSON.stringify(r.base.pack)!==JSON.stringify(r.pack))return null;
  return {base:row.baseId,index:row.plan};
 }
 function verifiedHeadgear(r,gear,item){
  const a=carryIndex.verifiedHeadgear,c=a?.plans?.[r?.id],raw=gear?.sourceRecord?.entry?.pack?.directions?.[r?.direction];
  const mode=raw?.headgearPolicy?.mode,tone=r?.colorAppearance?.skin;
  // Re-use non-occluding signed hats across recolored anatomy only when
  // the exact held-part vector and receiving pack still match below.
  const sameMaterialMask=mode==='none'&&[164,178].includes(item)&&
   Object.hasOwn(root.MareAppearance96?.skins||{},tone)&&Object.hasOwn(root.MareCharacterAppearance?.skins||{},tone);
  if(a?.schema!=='exact-independent-carry-headgear-v1'||r?.hdKind!=='carry'||!c||r.base?.id!==c.baseId||
     tone!==a.sourceTone&&!sameMaterialMask||!['none','full'].includes(mode)||
     mode!==root.MareHeadgear?.resolve({def:item}).hairHideMode||
     mode==='full'&&(!c.fullHeadClear?.includes(item)||r.pack.directions[r.direction]?.layers.filter(l=>l.slot==='hair').length!==1)||
     a.gear?.[r.direction]?.[item]!==gear.gear.source||!Number.isSafeInteger(c.plan)||
     JSON.stringify(r.plan)!==JSON.stringify(a.vectors?.[c.plan]))return false;
  const known=baseIndex.records.find(p=>p.id===c.baseId);
  return !!known&&!!known.mirrorX===!!r.base.mirrorX&&JSON.stringify(known.pack)===JSON.stringify(r.pack);
 }
 return {resolve,requiredFiles,render,withNamedHair,withGaitHair,verifiedHeadgear,certifiedCarryVector,withIndependentStaffSideGear};
}
const api={create};root.MareReworkWeaponCarryHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
