(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
function attachIsolatedCoat(record,outfit,coat){
 if(!['idle','walk','attack-unarmed'].includes(record.action)||!outfit||outfit.equipment.torso!==coat||Object.keys(outfit.equipment).length!==1)return null;
 const dir=record.direction,base=record.baseRecord,pack=base.pack,d=pack.directions[dir],o=outfit.pack.directions[dir];
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 // The female carry clip has eight states and the original garment has
 // forty ticks over the same second. Keep all garment frames and hold
 // each authored weapon transform for the corresponding five ticks.
 const stride=o.clip.frames/d.clip.frames;
 if(!eq(pack.frame,outfit.pack.frame)||!eq(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    !Number.isInteger(stride)||stride<1||d.clip.loop!==o.clip.loop||record.states.length!==d.clip.frames||
    record.action!=='idle'&&o.clip.fps!==d.clip.fps*stride||!Object.entries(d.rest).every(([key,point])=>eq(point,o.rest[key])))return null;
 const sourceFrame=i=>Math.floor(i/stride);
 const original=o.layers.filter(l=>l.id.startsWith('base:'));
 const layers=o.layers.filter(l=>!l.id.startsWith('base:'));
 if(original.length!==d.layers.length||o.poses.length!==o.clip.frames||!layers.length||
    layers.some(l=>!['top','underArms'].includes(l.slot)||l.frames&&(l.frames.length!==o.clip.frames||l.frames.some(f=>!f))))return null;
 for(const [index,layer] of d.layers.entries()){
  const {frames, ...source}=layer,{frames:donorFrames,...donor}=original[index];
  if(!eq(source,{...donor,id:donor.id.slice(5)})||!!frames!==!!donorFrames||
     donorFrames&&(donorFrames.length!==o.clip.frames||!donorFrames.every((sha,i)=>sha===frames[sourceFrame(i)])))return null;
 }
 if(!o.poses.every((pose,i)=>Object.entries(d.poses[sourceFrame(i)]).every(([key,point])=>eq(point,pose[key]))))return null;
 const refs=[...new Set(layers.flatMap(l=>l.frames||[l.source]))];
 if(refs.some(sha=>!outfit.sourceRefs.includes(sha)||base.sourceRefs.includes(sha)))return null;
 const combined={...pack,directions:{...pack.directions,[dir]:{...o,clip:record.action==='idle'?d.clip:o.clip,layers:[...original.map(l=>({...l,id:l.id.slice(5)})),...layers]}}};
 const states=o.poses.map((_,i)=>record.states[sourceFrame(i)]);
 return {...record,states,id:record.id+'-coat'+coat+'-native',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},outfitSources:refs,outfitSourceId:outfit.id,skinRepairLayers:layers.filter(l=>l.id.startsWith('original-neck-coverage-only')).map(l=>l.id),sourceRasterPadding:outfit.sourceRasterPadding};
}
function attachSwordCoat(record,outfit,coat){
 if(record.item!==0||record.action!=='attack-sword'||!outfit||
    outfit.equipment.torso!==coat||Object.keys(outfit.equipment).length!==1)return null;
 const {direction,baseRecord:base}=record,pack=base.pack,d=pack.directions[direction],o=outfit.pack.directions[direction];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(pack.frame,outfit.pack.frame)||!same(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    d.clip.frames!==o.clip.frames||d.clip.fps!==o.clip.fps||d.clip.contactFrame!==o.clip.contactFrame||
    !same(d.rest.NECK,o.rest.NECK)||!same(d.rest.NOSE,o.rest.NOSE))return null;
 const layers=o.layers.filter(l=>!l.id.startsWith('base:'));
 const refs=[...new Set(layers.map(l=>l.source))];
 if(!layers.length||layers.some(l=>!['top','underArms'].includes(l.slot)||l.frames||
    !['fixed','rigid'].includes(l.binding.kind))||refs.some(sha=>!outfit.sourceRefs.includes(sha)||
    base.sourceRefs.includes(sha)||outfit.sourceRasterPadding?.[sha]?.offset!==64))return null;
 const rest={...d.rest},poses=d.poses.map(pose=>({...pose}));
 // Retarget the authored sleeve pair around the shoulder without moving
 // the base anatomy, the sword attachment, or the donor garment pixels.
 for(const {binding} of layers){
  if(binding.kind==='fixed')continue;
  const {a,b}=binding;
  const first=o.poses[0],point=first[a];
  if(!point||!first[b]||!o.rest[a]||!o.rest[b])return null;
  const distance=side=>Math.hypot(point.x-first[side+'_SHOULDER'].x,point.y-first[side+'_SHOULDER'].y);
  if(!first.LEFT_SHOULDER||!first.RIGHT_SHOULDER)return null;
  const side=distance('LEFT')<distance('RIGHT')?'LEFT':'RIGHT';
  const shoulder=side+'_SHOULDER',elbow=side+'_ELBOW';
  if(!d.poses.every(pose=>pose[shoulder]&&pose[elbow])||!o.poses.every(pose=>pose[a]&&pose[b]&&pose[shoulder]&&pose[elbow]))return null;
  rest[a]=o.rest[a];rest[b]=o.rest[b];
  for(let i=0;i<poses.length;i++){
   const src=o.poses[i],dest=poses[i],from=src[shoulder],to=dest[shoulder];
   const angle=Math.atan2(dest[elbow].y-to.y,dest[elbow].x-to.x)-Math.atan2(src[elbow].y-from.y,src[elbow].x-from.x);
   const sin=Math.sin(angle),cos=Math.cos(angle);
   for(const key of [a,b]){
    const x=src[key].x-from.x,y=src[key].y-from.y;
    dest[key]={x:to.x+x*cos-y*sin,y:to.y+x*sin+y*cos};
   }
  }
 }
 const combined={...pack,directions:{...pack.directions,[direction]:{...d,rest,poses,layers:[...d.layers,...layers]}}};
 return {...record,id:record.id+'-coat'+coat+'-native-sword',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},
  outfitSources:refs,outfitSourceId:outfit.id,sourceRasterPadding:outfit.sourceRasterPadding};
}
function attachPants168(record,outfit){
 if(!outfit||outfit.equipment.pants!==168||Object.keys(outfit.equipment).length!==1)return null;
 const {direction,baseRecord:base}=record,pack=base.pack,d=pack.directions[direction],o=outfit.pack.directions[direction];
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const stride=d.clip.frames/o.clip.frames,frameAt=i=>Math.floor(i/stride);
 if(!equal(pack.frame,outfit.pack.frame)||!equal(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    !Number.isInteger(stride)||stride<1||d.clip.loop!==o.clip.loop||d.clip.fps!==o.clip.fps*stride||
    !Object.entries(o.rest).every(([key,point])=>equal(point,d.rest[key]))||
    !d.poses.every((pose,i)=>Object.entries(o.poses[frameAt(i)]).every(([key,point])=>equal(point,pose[key]))))return null;
 const index=d.layers.findIndex(layer=>layer.id==='shorts'&&layer.slot==='pants');
 const pants=o.layers.find(layer=>layer.id==='pants168-independent'&&layer.slot==='pants');
 if(index<0||!pants||pants.depth!==d.layers[index].depth||
    record.states.some(state=>state.hideBaseLayers?.includes('shorts')||state.baseMasks?.shorts))return null;
 const frames=layer=>Array.from({length:d.clip.frames},(_,i)=>layer.frames?.[frameAt(i)]||layer.source);
 for(const donor of o.layers.filter(layer=>layer!==pants)){
  const target=d.layers.find(layer=>layer.id===donor.id);
  if(!target)return null;
  const {frames:_,...a}=target,{frames:__,...b}=donor;
  if(!equal(a,b)||!frames(donor).every((sha,i)=>sha===(target.frames?.[i]||target.source)))return null;
 }
 const layers=d.layers.map((layer,i)=>i===index?{...pants,...(pants.frames?{frames:frames(pants)}:{})}:layer);
 const refs=[...new Set([pants.source,...(pants.frames||[])].filter(Boolean))];
 if(!refs.length||refs.some(sha=>!outfit.sourceRefs.includes(sha)||base.sourceRefs.includes(sha)))return null;
 const combined={...pack,directions:{...pack.directions,[direction]:{...d,layers}}};
 return {...record,id:record.id+'-pants168-native',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},
  outfitSources:[...(record.outfitSources||[]),...refs],outfitSourceId:outfit.id,coatSourceId:record.outfitSourceId};
}
const swordPants=new Set([140,147,154,161,175,182]);
function attachSwordPants(record,outfit,def){
 if(record.item!==0||!outfit||outfit.sourceSwordRecord!==record.id.split('-coat')[0]||
    outfit.equipment.pants!==def)return null;
 const {direction,baseRecord:base}=record,pack=base.pack,d=pack.directions[direction],donor=outfit.pack.directions[direction];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const layer=donor.layers[0],stride=d.clip.frames/donor.clip.frames;
 if(!same(pack.frame,outfit.pack.frame)||!same(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    !Number.isInteger(stride)||stride<1||d.clip.loop!==donor.clip.loop||d.clip.fps!==donor.clip.fps*stride||
    donor.layers.length!==1||layer.id!=='pants'+def+'-independent-sword'||layer.binding.kind!=='fixed'||
    layer.frames.length!==donor.clip.frames||layer.frames.some(sha=>!outfit.sourceRefs.includes(sha))||
    !d.layers.some(l=>l.id==='shorts')||record.states.some(s=>s.hideBaseLayers?.includes('shorts')||s.baseMasks?.shorts))return null;
 const pants={...layer,frames:Array.from({length:d.clip.frames},(_,i)=>layer.frames[Math.floor(i/stride)])};
 const layers=d.layers.map(l=>l.id==='shorts'?pants:l);
 const combined={...pack,directions:{...pack.directions,[direction]:{...d,layers}}};
 return {...record,id:record.id+'-pants'+def+'-native-sword',pack:combined,
  baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...outfit.sourceRefs]},
  outfitSources:[...(record.outfitSources||[]),...outfit.sourceRefs],pantsSourceId:outfit.id};
}
const northFirearmHeadSources={
 'head-clean':['166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb','57efd749034b064b73acff0dfa47549045be55473cab3d1ba47798cddb3f56b2'],
 hair:['82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8','7c4dd413a8c81f5ffad3a1dec21fb4ff060ecdc837614d83a7888e898cce9260'],
 face:['ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c'],
 iris:['ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c']
};
function northFirearmRecoil(r){
 if(![113,114].includes(r.item)||r.body!=='female'||r.direction!=='north'||r.action!=='attack-firearm'||
    r.sourceBaseId!=='v7-female-firearm-north-ownership-candidate-north'||r.paddingPhysical!==0)return null;
 const base=r.baseRecord,pack=base.pack,d=pack.directions.north,head=d.layers.filter(l=>['headBase','face','hair'].includes(l.slot));
 if(pack.density!==4||pack.frame.width!==160||pack.frame.height!==160||d.clip.frames!==8||d.clip.contactFrame!==4||d.clip.fps!==12||head.length!==4||
    !Object.keys(northFirearmHeadSources).every(id=>head.filter(l=>l.id===id).length===1))return null;
 for(const l of head){
  const [initial,recoil]=northFirearmHeadSources[l.id];
  if(l.binding?.kind!=='fixed'||l.source!==initial||l.frames?.length!==8||
     l.frames.some((sha,i)=>sha!==(i===4&&recoil?recoil:initial)))return null;
 }
 const heads=new Set(head);
 const reference={...base,pack:{...pack,directions:{...pack.directions,north:{...d,layers:d.layers.map(l=>heads.has(l)?{...l,frames:undefined}:l)}}}};
 return {reference,offsets:[0,0,0,0,9,0,0,0]};
}
// Isolated C151 layers from the 18/11 W113 North archive, without the
// archive's alternative weapon transforms, P154, B148 or G166.
const north113BodyFrames={"body-clothed":["e12c6d2b0c34db5553422cf355222a366ad2546dfcf54eff4c4672b6c1b6dc13","806976de2576dca0e7abff7867848bf13a7c77fe5f88b2ad1f7afa8db02eb400","70b889cebf19d5ab4762025ba0405ec283fc2e389829994e750549b1be612433","85253f43a3246684ce4a3586ca7d7419e566f63b8c9d57a2a2d3638643cb851d","1b1f548a0c37edc2d085e016ba584f5c45ea16bd612191d9262d5c08547a044d","471e9c4bbbf5617091e8d94431162fdf82fb0aa997b34630ca80fcdcd762fd6e","6ef16de3208f7515305a3e42f598ada7b2bb7624de1a6e61086ba3d272d5eadb","2f0d46b31f0d22221f48b4f45e2e9cba2d136adf75d3af21e51a612ee1a02a93"],"left-upper":["87b9b68fd8410a3cc02b8d3acb1e567a51a67faac8002ad23e4bc5ff44c67d99","cc7ed80e060ac504bbd4342808601981e52aec667b8a7ab3dece1b8a8b893dad","18707845ce26efae43b835ab5dbc3d7379a45ee6bc3f2902e50ab6937daa4369","0d1ef07f9c7ee7f8595c76cb67336e5faf77e5f5e0717e42d2c969a4c91a43c2","325c5c9229c5a91e573415006c37dc3e3c48f35c58a823dda3b92e7d3bd35e1a","0c9fcb5d8438ca293aa78a26ec0bc28eee5e459ab573b24ff9c27c3668f3750a","d9aa20d4840a41707e36a49360da20438c64ba6ed4c2b8583f38087ba147a653","0d0f04bb1970bc47e4a07f33f57baa57e7a1463cfded57d827893a18782ffea8"],"left-forearm":["368ad060352b2b3cdddd321e6d5e51e079901116594c36e74bbe55bcda1b093e","f8f35e539199c0acab353b3f73810fdaebb233c208c0a34a626fb4e79cc62e72","70de24b7ad4e304fa2a826165bd7509f34031d58055204b6bc3d15a70d53c353","0fe53a8c328f515245e79112666b9945214380801f3c59783acc86860a47784b","6eb92d0424828a312cbfb48503201cfe386c5eeff407cd5f022ed76c106dff6f","ea52a467d8a7ebb1cc9687fecde5087844997710b0a5e72ca0f34c3493768394","df505304e2a982cc39a7e0b547e42727e5ec165f98305013174604b38106beea","edf02060ab26a00e1878625e1f86045935ba8c2f73f303d6727cd4770ee4bb91"],"left-hand":["78fa23a61e3a222492e6ec4b31b6f5f311d72e7ab625ee7cd9b4a8ab3bca4339","c9a076151e71b729030296eeb62dc6ccfc636fef5a562071e80e1e20fa688496","e872245db8c21d883a51f02b40cb774d3cf58fe7a81975900607546029dc08ec","1b897cda8cb95966f9ed747dc196c090c74c404562dde2f682595dbf411b3ba7","12f1619f25ec593f58c1afe0786293229162c0e4797b1ab1949eba9d80ac1ca0","a8c9203503d6a1e7aeac256936037cffe9842f1d9d81f515d1218697102219dd","01d5b67dfffc8438894596c9316310ea56432d86c8cc17bb1a1e7a5ed7e6ef4e","e7dce6f136ae318c1d85e3313589abf97aa5694b385a7feac893b42374290c6d"],"right-upper":["2434b78a7728c4e103547775f9e4a6cf1d982a131c1b6b08a0b7ff9106ed738e","152eb13c7713834788a715d54f61dba4fd29760ba69901c6b181b6497aa11214","0020b810dbb0507cb6ff58366378900559c74f83903bdb87360ffe51b2db621e","e8ffad7dafaf164543f548e83e1ac2f815922afec85223bd7f4597db6b2f759f","bbef04892806a29a362ebc0191b42c42105b7d69de78c5f78858122c810c7c60","991024bede7d5f27745306a12ee9c03431722971817cf978736c2cbacee3472d","e81ee8c85891cb06f0beef75a0990e875b2b35813d9b3448453fbb276ccce0e0","d8f38b1c83c1a71c154be8d413506693305c4abf2dd4f2a1fe5ea9729cfd0d30"],"right-forearm":["cebca712636b3d14f872c6d8db5dfe0a8ede21a96bc406071ae74495b2c0fb99","658ebe26dbc7a19e5561040918139b104cf88cf7b375c132d5f6ec26dab0d19e","bce58168c74c3ff3ebb83f316fe1b8d6f8388c9899e94936c4b8f2e1b81f00ad","10f74c871f1917a3722eda51d5994ee4897067b4e08df5f055468626dd40069c","dd621111215c4c079800d6ebd93e8f18cc488d6f4fdc58f9bf67dfbbab1f19a1","e02619d670856e726b25142a45642ccecd949275a8978bfb5420c17792b194b1","0e40ec4f399c1c8c2b4c282b07811d72fd5ee62ed2b6d603c2fece2a7997dbcf","3c1b026bc21e6e932b94c2a53c9599330391f0de45bd612794766ed977ddeadc"],"right-hand":["8cc025f28e8a9272ea5ef3f4c2c591546d49d3022cb6bbe3f8d3176a03b7e968","c9a076151e71b729030296eeb62dc6ccfc636fef5a562071e80e1e20fa688496","e872245db8c21d883a51f02b40cb774d3cf58fe7a81975900607546029dc08ec","1b897cda8cb95966f9ed747dc196c090c74c404562dde2f682595dbf411b3ba7","12f1619f25ec593f58c1afe0786293229162c0e4797b1ab1949eba9d80ac1ca0","a8c9203503d6a1e7aeac256936037cffe9842f1d9d81f515d1218697102219dd","01d5b67dfffc8438894596c9316310ea56432d86c8cc17bb1a1e7a5ed7e6ef4e","c188a5bff197e6dc63add237d9f7a8935864d3d401d9a89aa0a960bc54670be4"],"head-clean":["166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","57efd749034b064b73acff0dfa47549045be55473cab3d1ba47798cddb3f56b2","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb","166331e5140203e0a448d8e0f9f189b16948787f25335066e4e17b19977cbdcb"],"face":["ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c"],"iris":["ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c","ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c"],"hair":["82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","7c4dd413a8c81f5ffad3a1dec21fb4ff060ecdc837614d83a7888e898cce9260","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8","82ca2b667b9ac9fb3bc49f6c6c48f19a74105d6868a0954f5fef049e0bc9c0e8"]};
const north113C151Layers=[{"id":"coat151-whole-torso","slot":"top","source":"e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","frames":["e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77","e92295d1a02b95d16c3bd697e2c45ca2e544cf253f4226b6b9f685f40fad2b77"],"binding":{"kind":"fixed"},"depth":5.1},{"id":"coat151-whole-hem","slot":"top","source":"77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","frames":["77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec","77ee1e8b002b67c8645e270acb33d89b8e8ef7a0bd2241fa5ef3ef4f7b4082ec"],"binding":{"kind":"fixed"},"depth":5.1},{"id":"coat151-whole-leftUpper","slot":"top","source":"212ceb215eb02d11d956a90576efac1361d4537cb83219aece66973f37095c8a","frames":["212ceb215eb02d11d956a90576efac1361d4537cb83219aece66973f37095c8a","a62f03858e0fff2db580a6f334c251d1d781c0283c1a641240dab4b17c08d89e","ba8141be9ed5b9cd14734b2a30c7ff47790d84f30e97158b4fdf5371b5478e32","25b2e309b14e3fb5ef808f3b8071423972da8fd50b8abf3699d293072a6b3f76","ee48c922155e48024d6376ca4cc01c187d79638e48c08b5bb9dc3bfeafda2dc9","b770e49e99c0ee1f30d7eba5dbe45e94b9222c0180c3ca1c7e4b154a4b76f3d7","e7805ef9e7f4e176fd6e14b3b2ddec0604b1dd73ec4358ef795747d1fb2e900d","742862fed6da4ac59446542bf57db9b72074d0675655e9263bf7959f59a6425a"],"binding":{"kind":"fixed"},"depth":6.1},{"id":"coat151-whole-rightUpper","slot":"top","source":"9f0b9850b134fda064b6e40789cabc96036768f2b2dcea5ebfa3b18d85ee2081","frames":["9f0b9850b134fda064b6e40789cabc96036768f2b2dcea5ebfa3b18d85ee2081","b7d8f841fbba12ea6d9a4f4a723145b35d2265eb44abe9936a3a02b44a153fb1","2dc100af8368393d62a3a978c551002a19e48faea2f628c42b1da8f1a9f0b8f1","fc5c8c7ed646976e86aace7d3c28d05d995248edeadc4c265334b53eee08e2fa","bea09a4601d0dd96cc4ec61f0f0d5da77430ce954ec56a291ceaa94dfbe6e9c8","e4ae28886d29847461fa348a801bac13d9d0289192efb66c9e187dd29d13acee","ce3d970f54158a37410524394d2b544f310f996e2e6036328200dfe7b712dce5","096b8727d85d88a780b6d98eee3a8ce0d782fd5413b6dcfd07877f0b3b2fd053"],"binding":{"kind":"fixed"},"depth":6.1}];
function attachNorth113Coat(r,coat){
 if(r.item!==113||r.action!=='attack-firearm'||r.body!=='female'||r.direction!=='north'||coat!==151||
    r.sourceBaseId!=='v7-female-firearm-north-ownership-candidate-north'||r.paddingPhysical!==0||r.states?.length!==8)return null;
 const b=r.baseRecord,p=b.pack,d=p.directions.north,c=d?.clip;
 if(p.density!==4||p.frame.width!==160||p.frame.height!==160||p.pivot.x!==80||p.pivot.y!==128||
    c?.frames!==8||c.fps!==12||c.contactFrame!==4||c.loop!==false||
    d.layers.length!==Object.keys(north113BodyFrames).length||
    !d.layers.every((l,i)=>Object.keys(north113BodyFrames)[i]===l.id&&l.binding?.kind==='fixed'&&l.depth===i&&!l.depthTrack&&JSON.stringify(north113BodyFrames[l.id])===JSON.stringify(l.frames||[l.source])))return null;
 const refs=[...new Set(north113C151Layers.flatMap(l=>l.frames))];
 if(refs.some(sha=>b.sourceRefs.includes(sha)))return null;
 const pack={...p,directions:{...p.directions,north:{...d,layers:[...d.layers,...north113C151Layers]}}};
 return {...r,id:r.id+'-coat151-eight-native',pack,
  baseRecord:{...b,pack,sourceRefs:[...b.sourceRefs,...refs]},northFirearmCoatSources:refs};
}
const northFirearmVisibleSkin={"e12c6d2b0c34db5553422cf355222a366ad2546dfcf54eff4c4672b6c1b6dc13":"e3b72a23dd50af57c327a81ad8b7c5294ddb8d945cc9c777ae8d040981c80606","806976de2576dca0e7abff7867848bf13a7c77fe5f88b2ad1f7afa8db02eb400":"975d86c5c91645721ec70e20c9966a78b5fcbb0d8dc6f2ead27d71ae15260b89","70b889cebf19d5ab4762025ba0405ec283fc2e389829994e750549b1be612433":"beac203797c42e3a2c044c786d12b26a7f190a07669ad469814d10a800aa6bea","85253f43a3246684ce4a3586ca7d7419e566f63b8c9d57a2a2d3638643cb851d":"8cdb50c77ae3c12712d1230ab60475b84b9f69f9417f1afc978af2adc4ff8579","1b1f548a0c37edc2d085e016ba584f5c45ea16bd612191d9262d5c08547a044d":"7ffacc1051d5cc615b1ba3fe054ca5ea679639f0406f6ff870f2c21ce9505d22","471e9c4bbbf5617091e8d94431162fdf82fb0aa997b34630ca80fcdcd762fd6e":"3fb768c236cb0ff7b08d631ac17794745418b8d97567396805d9188e4e9737a0","6ef16de3208f7515305a3e42f598ada7b2bb7624de1a6e61086ba3d272d5eadb":"5bc759b2ff476bafe1d38ea2224076c5062a4a2d3a5cbe18ddc17aea1892ab0c","2f0d46b31f0d22221f48b4f45e2e9cba2d136adf75d3af21e51a612ee1a02a93":"8d5fc766e1d5b12ccd1fec918a0014c8a16fb95f584fd051d7b71c5b4f04bbff"};
const orbSkinPath='tools/rework-weapon-layers-hd/assets/e4a2f3c434849aabc41cb6037bc16c54ef3130ff21838c355bde9356c6ad287f.png';
function approvedSouthCarry(r){
 if(r.action!=='walk'||r.direction!=='south'||![0,5,17].includes(r.item)||r.sourceBaseId!=='v7-female-walk-drawn-all-south')return r;
 const hashes={0:'823474b4f6a0782ef39eca0dc176630df7ab6886e7b1cb70f800c0baa04b51bd',5:'d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d',17:'ae249c8a9e349b827a6d91a5951c10ef63edf91be9649cd8c0b48645d194d65b'};
 if(r.states.length!==8||r.states.some(s=>s.parts.length!==1||hashes[r.item]&&s.parts[0].sha256!==hashes[r.item]))return r;
 return {...r,id:r.id+':south-carry-calibrated',approvedSouthCarry:true,states:r.states.map(s=>({...s,parts:s.parts.map(p=>{
  if(r.item!==0)return p;const v=p.targetForearmCenter.map((x,i)=>x-p.targetHandCenter[i]),length=Math.hypot(...v);
  if(!length)throw Error('Missing female sword anchor');const matrix=p.matrix.slice();matrix[4]+=8*v[0]/length;matrix[5]+=8*v[1]/length;return {...p,matrix};
 })}))};
}
const asset=(r,sha)=>'tools/'+(r.northFirearmCoatSources?.includes(sha)?'rework-firearm113-coat':r.checkpointSources?.includes(sha)?'rework-sword0-checkpoint':r.outfitSources?.includes(sha)?'rework-modular-outfits-hd':'rework-base-hd')+'/assets/'+sha+'.png';
function create(index,{outfits,appearanceRegistry,vendor=root.ReworkAccessoryVendor?.compositor,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){if(index?.schema!=='female-native-equipment-registration-v1'||!vendor)throw Error('Missing female equipment sources');return {
 resolve({item,body,action,direction,appearance={},equipment={}}={}){if(item==null||!index.records.some(r=>r.item===Number(item))||!['female','feminino'].includes(body))return null;const extra=Object.entries(equipment).filter(([k,v])=>k!=='weapon'&&v!=null&&!['none','original'].includes(v));const clothing=extra.filter(([slot])=>slot!=='head'),head=extra.find(([slot])=>slot==='head')?.[1];if(clothing.some(([slot])=>!['coat','legs','pants'].includes(slot))||clothing.filter(([slot])=>slot!=='coat').length>1)return null;if(equipment.weapon!=null&&Number(equipment.weapon?.def??equipment.weapon)!==Number(item))return null;const customized=['hair','hairStyle','skin','skinColor','hairColor','face','eyeStyle','eyeColor'].some(k=>appearance[k]&&appearance[k]!=='original'&&!((k==='eyeColor')&&appearance[k]==='blue'));if(['attack','punch','shoot','focus','cast'].includes(action))action=index.records.find(r=>r.item===Number(item)&&r.action.startsWith('attack-'))?.action||action;const r=index.records.find(r=>r.item===Number(item)&&r.body==='female'&&r.action===action&&r.direction===direction);if(!r)return null;const coat=clothing.find(([slot])=>slot==='coat')?.[1],pants=clothing.find(([slot])=>slot!=='coat')?.[1];
 let combined={...r,pack:r.baseRecord.pack};
 if(!clothing.length&&head==null)combined=approvedSouthCarry(combined);
 if(coat!=null){
  const def=Number(coat.def??coat);
  const outfit=outfits?.records.find(row=>row.id==='female-torso'+def+'-'+direction+'-frozen-'+(['attack-unarmed','attack-sword'].includes(action)?'attack':action)+'-native');
  combined=action==='attack-sword'?attachSwordCoat(r,outfit,def):(!pants&&head==null?attachNorth113Coat(r,def):null)||attachIsolatedCoat(r,outfit,def);
 }
 if(combined&&pants!=null){
  const def=Number(pants.def??pants),outfit=def===168&&outfits?.records.find(row=>row.id==='female-pants168-'+action+'-'+direction);
  combined=swordPants.has(def)&&Number(item)===0?attachSwordPants(combined,outfits?.records.find(row=>row.id==='female-pants'+def+'-sword-'+action+'-'+direction),def):attachPants168(combined,outfit);
 }
 if(!combined)return null;if(!customized&&head==null)return combined;
  // Both Norte firearms use the same fixed source and the same exact +9px
  // recoil in state 4. Validate all source hashes before enabling that pose.
  const recoil=(!clothing.length||combined.northFirearmCoatSources)&&head==null?northFirearmRecoil(combined):null;
  const material=appearanceRegistry?.resolve(recoil?.reference||combined.baseRecord,{hair:appearance.hair||appearance.hairStyle,head:head?.def??head,appearance});
  if(!material)return null;
  return {...combined,id:combined.id+':'+material.id,material,colorAppearance:appearance,...(recoil?{northFirearmHeadRecoil:recoil.offsets,...(material.skinColor?{northFirearmVisibleSkin}:{} )}:{})};},
 requiredFiles(r,{frame}={}){const d=r.baseRecord.pack.directions[r.direction],states=frame===undefined?r.states:[r.states[frame]];if(states.some(s=>!s))throw Error('Invalid female equipment frame');const refs=frame===undefined?r.baseRecord.sourceRefs:d.layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean);const skinFiles=r.northFirearmVisibleSkin?refs.filter(h=>r.northFirearmVisibleSkin[h]).map(h=>'tools/rework-firearm113-coat/assets/'+r.northFirearmVisibleSkin[h]+'.png'):[];return [...new Set([...skinFiles,...(r.approvedSouthCarry&&r.item===17?[orbSkinPath]:[]),...refs.map(s=>asset(r,s)),...(r.material?appearanceRegistry.requiredFiles(r.material):[]),...states.flatMap(s=>[...s.parts.map(p=>p.url),...Object.values(s.baseMasks||{})])])]},
 render(ctx,r,images,{frame=0,captureOps,makeCanvas:frameCanvas=makeCanvas}={}){let p=r.baseRecord.pack,d=p.directions[r.direction];
 const map=new Map(r.baseRecord.sourceRefs.map(s=>[s,images.get(asset(r,s))]));
 let gearImages=images;
 if(r.approvedSouthCarry&&r.item===17&&r.material?.skinColor){
  const part=r.states[frame].parts[0],source=images.get(part.url),mask=images.get(orbSkinPath);
  if(!source||!mask||source.width!==mask.width||source.height!==mask.height)throw Error('Missing SHA-bound Orbe17 skin material');
  const tile=frameCanvas(source.width,source.height),tc=tile.getContext('2d'),mc=frameCanvas(mask.width,mask.height).getContext('2d');tc.drawImage(source,0,0);mc.drawImage(mask,0,0);
  const data=tc.getImageData(0,0,source.width,source.height),m=mc.getImageData(0,0,mask.width,mask.height).data,tones=new Uint8Array(m.length/4),api=root.MareAppearance96;
  for(let n=0;n<m.length;n+=4)if(m[n]&&data.data[n+3])tones[n/4]=skinMaterials.tone(...data.data.subarray(n,n+3));
  data.data.set(api.recolor(data.data,tones,api.skins[r.material.skinColor].ramp));tc.putImageData(data,0,0);gearImages=new Map(images);gearImages.set(part.url,tile);
 }
 for(const [sha,padding] of Object.entries(r.sourceRasterPadding||{})){
  const image=map.get(sha);
  if(!image)continue;
  if(image.width!==padding.sourceSize||image.height!==padding.sourceSize||
     image.width+2*padding.offset!==p.frame.width*4||image.height+2*padding.offset!==p.frame.height*4)throw Error('Invalid female garment padding '+sha);
  const tile=frameCanvas(p.frame.width*4,p.frame.height*4);
  tile.getContext('2d').drawImage(image,padding.offset,padding.offset);
  map.set(sha,tile);
 }
 if(r.material){
  const head=d.layers.find(layer=>layer.slot==='headBase'),source='custom-head';
  const composed=appearanceRegistry.compose(r.baseRecord,r.material,images),recoil=r.northFirearmHeadRecoil?.[frame]||0;
  const tile=recoil?frameCanvas(composed.width,composed.height):composed;
  if(recoil)tile.getContext('2d').drawImage(composed,0,recoil);
  const layers=d.layers.filter(layer=>!['headBase','face','hair'].includes(layer.slot)).concat({...head,source,frames:undefined});
  d={...d,layers};p={...p,directions:{...p.directions,[r.direction]:d}};map.set(source,tile);
  if(r.material.skinColor){
   const skin=skinMaterials,api=root.MareAppearance96,ramp=api.skins[r.material.skinColor].ramp;
   for(const [sha,image] of map){
    const uses=d.layers.filter(layer=>(layer.frames?.[frame]||layer.source)===sha&&layer.slot!=='headBase');
    const owned=uses.length===1&&uses[0].id==='body-clothed'&&r.northFirearmVisibleSkin?.[sha];
    const kind=uses.length&&uses.every(layer=>r.skinRepairLayers?.includes(layer.id))?'mixed':skin.ownership(uses);
    if(!image||(!kind&&!owned))continue;
    const tile=frameCanvas(image.width,image.height),c=tile.getContext('2d');c.drawImage(image,0,0);
    const data=c.getImageData(0,0,tile.width,tile.height);
    let tones;
    if(owned){
     const im=images.get('tools/rework-firearm113-coat/assets/'+owned+'.png');
     if(!im||im.width!==image.width||im.height!==image.height)throw Error('Missing phase-owned North firearm skin mask');
     const ms=frameCanvas(im.width,im.height),mc=ms.getContext('2d');mc.drawImage(im,0,0);
     const mask=mc.getImageData(0,0,im.width,im.height).data;
     tones=new Uint8Array(mask.length/4);
     for(let i=0;i<tones.length;i++)if(mask[i*4+3]&&data.data[i*4+3])tones[i]=skin.tone(...data.data.subarray(i*4,i*4+3));
     ms.width=1;
    }else tones=skin.mask(data.data,tile.width,kind);
    data.data.set(api.recolor(data.data,tones,ramp));
    c.putImageData(data,0,0);map.set(sha,tile);
   }
  }
 }const pad=r.paddingPhysical||0;ctx.canvas.width=p.frame.width*4+pad*2;ctx.canvas.height=p.frame.height*4+pad*2;ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(pad,pad);const ops=[...d.layers.filter(l=>!r.states[frame].hideBaseLayers?.includes(l.id)).map(layer=>({depth:layer.depth,layer})),...r.states[frame].parts.map(part=>({depth:part.depth,part}))];for(const op of ops.sort((a,b)=>a.depth-b.depth)){const tileOp=captureOps?frameCanvas(ctx.canvas.width,ctx.canvas.height):null,oc=tileOp?tileOp.getContext('2d'):ctx;if(tileOp){oc.save();oc.imageSmoothingEnabled=false;oc.translate(pad,pad);}if(op.layer){const mask=r.states[frame].baseMasks?.[op.layer.id],tile=mask?frameCanvas(p.frame.width*4,p.frame.height*4):null,c=tile?tile.getContext('2d'):oc;vendor.render(c,{...p,directions:{[r.direction]:{...d,layers:[op.layer]}}},map,{direction:r.direction,frame,density:4,clear:false});if(mask){c.globalCompositeOperation='destination-out';c.drawImage(images.get(mask),0,0);oc.drawImage(tile,0,0)}}else{oc.save();oc.transform(...op.part.matrix);if(op.part.sourceClip){oc.beginPath();oc.rect(...op.part.sourceClip);oc.clip()}oc.drawImage(gearImages.get(op.part.url),0,0);oc.restore()}if(tileOp){oc.restore();ctx.drawImage(tileOp,-pad,-pad);captureOps({op,canvas:tileOp});}}ctx.restore();return {width:ctx.canvas.width,height:ctx.canvas.height,physicalScale:1,density:4,pivot:{x:p.pivot.x*4+pad,y:p.pivot.y*4+pad},frames:d.clip.frames,fps:d.clip.fps,source:r.id,sourceBaseId:r.sourceBaseId}}};}
const api={create};root.MareReworkFemaleEquipmentHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
