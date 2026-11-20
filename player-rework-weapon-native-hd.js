/* Original density4 weapon sources. No legacy donor, resizing or guessed outfit binding. */
(function(root){'use strict';
// Exact M151/head157 SOUTH firearm sources. The helmets, anatomy and near hands share verified bytes.
const rifle115V5={
  "id": "rifle115-v5-south-native-layers",
  "sourceArchiveSHA256": "d87a8ccc05a8aff100db2c7454dd40355c7dfef65e7fbc45d164005f3535d585",
  "equipment": {
    "weapon": 115,
    "coat": 151,
    "head": 157
  },
  "body": "male",
  "direction": "south",
  "states": [
    {
      "state": "0",
      "base": "912ba2e7d1c232e1aa0c472afa006880bae11276d200bc407594de13394ebcb7",
      "layers": [
        "912ba2e7d1c232e1aa0c472afa006880bae11276d200bc407594de13394ebcb7",
        "5f100d6014552b0fa4f27241bfa00ebf2501d634920df7dbcfa3b1355fa6bd34",
        "2b0a0afd2eff70d6d29b84604ae5527f88d823efc571df3e9bfc209bb961495c"
      ],
      "approved": "48c7151a6fda41172727b4f539c13f80c497a0304877dbca08c3f098ed825711"
    },
    {
      "state": "1",
      "base": "8cf33bba9d700b01d879200a44839b1469d1d25faf73d6ae374bbc12fdaa534a",
      "layers": [
        "8cf33bba9d700b01d879200a44839b1469d1d25faf73d6ae374bbc12fdaa534a",
        "027998619d3bbe8a8a6f0fc681871f513368bb412db1f8f3da0109df5cd70255",
        "5e3eb24a1259061d7f33e4482e75ef07ea3571399ac18b89e84c1b1f2c8d722b"
      ],
      "approved": "d8ea2c8e1e547d69b5ff4e3fa3e9110b62a1d021390a351331eace11d7f72ad6"
    },
    {
      "state": "2",
      "base": "2617aaaa30c1bdf49e856bca4204ea74ad14372d1c82171b33b3717858e2ba5b",
      "layers": [
        "2617aaaa30c1bdf49e856bca4204ea74ad14372d1c82171b33b3717858e2ba5b",
        "c2f1ee6a19191710f695d5f5a0060eafc88c136f85d8da89c2fed074171be9f2",
        "b98738f93241a0b024b6ae3224a5e8ff41518ba0f223e54475ac3a86b946fe0f"
      ],
      "approved": "896d004933054b6b155f9486377c593d6dbe5037a9a64323ebc8342b02603c92"
    },
    {
      "state": "4",
      "base": "1797589d357b337d9f839354cac56c851ea28a0fff0aac80b3de294462ef9f36",
      "layers": [
        "1797589d357b337d9f839354cac56c851ea28a0fff0aac80b3de294462ef9f36",
        "7e95db4ca4be629d75754cb2087ae7c4992fbc33bc2f451f92b8bf7b7199c503",
        "4927da87477534aa97a9a51bb745c5dc8454d104be86edbba4f50632983e5b81"
      ],
      "approved": "2d5686f855c57c2110e0de8bfc13b17680465717c49455402a8c8635e13f177a"
    },
    {
      "state": "R",
      "base": "0086f923b45b4039e930b153a9ef84972090c9588b246a328c3f9bd3f8111b6b",
      "layers": [
        "0086f923b45b4039e930b153a9ef84972090c9588b246a328c3f9bd3f8111b6b",
        "a758cb006c50f4703a7243c73e7f72ba007a40f11c15b6105fe37e5a9f720899",
        "f75dd7e4c1b03034d54099682cf2160e237fcaaf0b8b0699a8932afac44c893c"
      ],
      "approved": "4708e536a799ebe62b63a0f5fc0fc4af1cd9fce3586cff829f71c265d5542fe5"
    }
  ]
};
const mosquete4Signatures={
  "0": [
    "fc9670d13855da1643956ce501aa6b44262914e02fe9aa1f286bc90d5ddc3457",
    "a4d47fd0547b3df537b2c480073c547ba29ad3d38554770c7195816e5315d21a"
  ],
  "1": [
    "344313772b55c00d54cf77c9207c104020338d50ed6f1de86aabbef5630d50a0",
    "4a112cd688442e970eaeb4978f68d6a772de7719f6b34fefcd1b81ea53315803"
  ],
  "2": [
    "917e82278c1007005cfae37c0b4db516ed52634370ab95f198a07de60f08d41a",
    "9e9bd98af607fdc2d6f49d07955c530a6e318f083f13f22906476dee7db5d77f"
  ],
  "4": [
    "bcdf2ec1da4a6d92d618f6fb985d92e1efd1c3069c56d03deaaf040fd7f8d6c6",
    "a26c42a68fc6ff5d297c0d3d76dcc4f0f446e3c8e738c106aa99445c2402e6ad"
  ],
  "R": [
    "8f562aec770ddb61afb01c6e59c030edad11e0435a6542f3834fc5b9937a8890",
    "a8dd69aa2faafd61f89cd9985a47caa447f8537881e9f0e6a0f79eb0465248ff"
  ]
};
const mosquete4V3={
 ...rifle115V5,
 id:'mosquete4-v3-south-native-layers',
 sourceArchiveSHA256:'dd5451526cce4f6e666ad568bf11dcfa39288eb99af4ba110f1256541364df99',
 equipment:{...rifle115V5.equipment,weapon:4},
 states:rifle115V5.states.map(s=>{
  const [weapon,approved]=mosquete4Signatures[s.state];
  return {...s,layers:[s.layers[0],weapon,s.layers[2]],approved};
 })
};
const exactSouthIdle=new Map([[4,mosquete4V3],[115,rifle115V5]]);
const daggerHairAuthority={
 south:{x:0,y:0,count:4090,source:'4d7b8fa3090367f80f4ded64a1bbc2c0759f3a1d2402ec9e8be112333c0297a7',mask:'dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5'},
 east:{x:-8,y:4,source:'45de7576039c538aee29ff5a5d0def51143e8cbf90a33cdead504d88fd2ea713',mask:'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a'},
 west:{x:8,y:4,source:'a1359e16013832c487942d028404f7a5c59f4afd4a7e96eb480aa1a1d34db07e',mask:'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1'}
};
const daggerHairPath=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';

function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(index?.schema!=='native-hd-weapon-layers-v1'||!vendor?.compositor)throw Error('Missing native weapon dependencies');
 const approvedSouth=item=>index.records.find(r=>r.approvedSouthHead&&r.item===Number(item)&&r.body==='male'&&r.direction==='south');
 const resource=url=>{const p=new URL(url,'https://native.invalid/'+prefix).pathname.slice(1);if(!/^tools\/(rework-weapon-layers-hd|rework-modular-outfits-hd|rework-base-hd)\/assets\/[a-f0-9]{64}\.png$/.test(p))throw Error('Invalid native weapon source path');return p;};
 const body=b=>({masculino:'male',feminino:'female'})[b]||b;
 function resolveSeparable({item,body:b,sourceBody,classId,weaponVariant,action,direction,appearance={},equipment={},allowExactComposite=true}={}){
  // Ordered source profiles retain their authored anatomy/depth; no generic eight-pose rig coercion.
  const ordered=allowExactComposite&&(index.orderedAttackProfiles||[]).find(r=>r.schema==='approved-native-ordered-attack-v1'&&r.item===Number(item&&typeof item==='object'?item.def:item)&&r.body===body(b)&&r.action===action&&r.direction===direction);
  const visibleOrdered=Object.entries(equipment).filter(([,v])=>v!=null&&!['none','original'].includes(v));
  const coatValue=equipment.coat,coatId=Number(coatValue&&typeof coatValue==='object'?coatValue.def:coatValue);
  const coatVariant=coatValue&&typeof coatValue==='object'?(coatValue.variant??coatValue.variantId??coatValue.appearanceVariant):null;
  const authoredCoats=ordered?.requiredAuthoredCoats;
  const optionalCoats=ordered?.optionalAuthoredCoats;
  const coatFrames=(authoredCoats||optionalCoats)?.[coatId];
  // Only these reviewed orb profiles own a required four-coat overlay contract.
  // Do not reinterpret existing bare profiles or accept an unseen wardrobe.
  const wardrobeOK=authoredCoats
   ? !optionalCoats&&[17,122].includes(ordered.item)&&ordered.action==='attack-focus'&&['east','west'].includes(direction)&&visibleOrdered.length===1&&visibleOrdered[0][0]==='coat'&&[151,158,165,179].includes(coatId)&&(coatVariant==null||coatVariant==='original')&&Array.isArray(coatFrames)&&coatFrames.length===ordered.phaseCount&&coatFrames.every(f=>f.layer?.operation==='source-over'&&f.layer?.url&&f.approvedReferenceSHA256)
   : optionalCoats
    ? [1,68].includes(ordered.item)&&ordered.action==='attack-sword'&&ordered.requiredClass==='sword'&&['east','west'].includes(direction)&&ordered.phaseCount===8&&ordered.density===4&&JSON.stringify(ordered.nativeCanvas)==='[768,768]'&&JSON.stringify(ordered.pivot)==='[96,144]'&&(visibleOrdered.length===0||visibleOrdered.length===1&&visibleOrdered[0][0]==='coat'&&[151,158,165,179].includes(coatId)&&(coatVariant==null||coatVariant==='original')&&Array.isArray(coatFrames)&&coatFrames.length===8&&coatFrames.every(f=>f.layer?.operation==='source-over'&&f.layer?.url&&f.approvedReferenceSHA256))
    : visibleOrdered.length===0;
  const sidePalette=ordered?.strictSourceIdentity&&[13,71,72,73,74].includes(ordered.item)&&ordered.body==='male'&&ordered.action==='attack-daggers'&&
    ordered.requiredClass==='rogue'&&['east','west'].includes(direction)&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&
    ordered.approvedAppearance?.eyeColor==='brown'&&ordered.approvedAppearance.hair==='original'&&ordered.approvedAppearance.face==='original'&&
    ordered.approvedAppearance.hairColor==='brown'&&ordered.approvedAppearance.skin==='light'&&ordered.phaseCount===8&&ordered.fps===12&&
    ordered.contactTick===4&&ordered.density===4&&JSON.stringify(ordered.nativeCanvas)==='[640,640]'&&JSON.stringify(ordered.pivot)==='[80,128]'&&
    ordered.states?.every(f=>f.layers?.length===4&&f.layers[1].id==='authored-body'&&f.layers[3].sha256===f.layers[1].sha256&&f.layers[3].operation==='replace-rgba-under-mask')
    ;
  const sideIris=sidePalette&&appearance.eyeColor!=='brown'&&Object.hasOwn(root.MareCharacterAppearance?.eyes||{},appearance.eyeColor)?appearance.eyeColor:null;
  const sideHair=sidePalette&&appearance.hairColor!=='brown'&&Object.hasOwn(root.MareCharacterAppearance?.hairs||{},appearance.hairColor)?appearance.hairColor:null;
  if(allowExactComposite&&Number(item&&typeof item==='object'?item.def:item)===13&&body(b)==='male'&&['male','masculino'].includes(sourceBody??b)&&classId==='rogue'&&(weaponVariant==null||weaponVariant==='original')&&action==='attack-daggers'&&direction==='south'&&Object.values(equipment).every(v=>v==null||['none','original'].includes(v))&&appearance.version===1&&appearance.gender==='masculino'&&appearance.skinStyle==='natural'&&appearance.skin==='light'&&appearance.hair==='original'&&appearance.face==='original'&&Object.hasOwn(root.MareCharacterAppearance?.hairs||{},appearance.hairColor)&&Object.hasOwn(root.MareCharacterAppearance?.eyes||{},appearance.eyeColor)){
   const signs=['e3845fb31abf88a6130b8db89778aa63b7008e9c383b5528fd616b62be8e2273','3f5fe0b31d13d8755273875a694d01cc48d17b7b7e68c691b3f6c7f54ffb02fc','23757f2aeb7dbb59bc7df2163f4131c050a9556d04982479b00af0bf241c04a4','44b4359fcad2e6441cd19e17b3a38d83e7abc581fca3f1b049740d466137bae5','d1110ffdc199e0d1ffa77c15739ee44c7226de9de28a61ea1a8e86e306499adb','42e48e8a4fc09f9368c55a971087ca42c867a466562f4d6020f3f0e747c5f7f9','b5259767fdbfc2df5daa459f828fc42bcbcac4bf9a8ce8f7426466165fe8f320','6543d7b3bd9e3cd24383ec9a2e9ffac514940298d7f48f13dc273ad0315676c2','29b6f7b9b5973304ffeae30f53532d31748414e809d7e5a3d5c3404fe890624f'];
   const r=index.records.find(x=>x.id==='daggers13-south-native-original-source');
   if(r?.item===13&&r.body==='male'&&r.direction==='south'&&r.density===4&&r.fps===12&&JSON.stringify(r.nativeCanvas)==='[640,640]'&&JSON.stringify(r.pivot)==='[80,128]'&&r.sourceArchiveSHA256==='301acc694d772a67e3f6311f2db914b87bedc784dddc73ff30fb22c7ea174dce'&&r.replacementMode==='atomic-approved-original-composite'&&r.hairSeparated===false&&r.timeline?.length===9&&r.timeline.every((t,i)=>t===String(i))&&r.states?.length===9&&r.states.every((s,i)=>{const l=s.layers?.[0];return s.state===String(i)&&s.atomic===true&&s.rgbaExact===true&&s.baseSourceModified===false&&s.approved?.sha256===signs[i]&&s.layers?.length===1&&l.sha256===signs[i]&&l.url==='assets/'+signs[i]+'.png'&&l.operation==='source-over'&&l.depth===0&&l.role==='original-approved-body-weapon-composite'&&!l.offset&&!l.mirrorX&&!s.attachment&&!s.bodyPatch&&!s.canvasRoundingPatch;}))return {...r,id:r.id+':owned-south-dagger-iris:'+appearance.eyeColor+(appearance.hairColor==='brown'?'':':owned-dagger-hair:'+appearance.hairColor),approvedDagger13South:true,separableAttack:true,equipmentContract:{weapon:13},colorAppearance:{},...(appearance.eyeColor!=='brown'?{dagger13SouthIris:appearance.eyeColor}:{}),...(appearance.hairColor!=='brown'?{orderedDaggerHair:appearance.hairColor}:{})};
  }
  if(ordered&&wardrobeOK&&(!ordered.strictSourceIdentity||(classId===ordered.requiredClass&&['male','masculino'].includes(sourceBody??b)&&(weaponVariant==null||weaponVariant==='original')))&&['hair','hairColor','face','eyeColor','skin'].every(k=>typeof ordered.approvedAppearance?.[k]==='string'&&(appearance[k]===ordered.approvedAppearance[k]||(k==='eyeColor'&&sideIris)||(k==='hairColor'&&sideHair)))){
   const states=ordered.states,timeline=ordered.timeline;
   if(ordered.approvedAppearance&&states?.length===ordered.phaseCount&&timeline?.length&&timeline.every(t=>states.some(s=>s.state===String(t)))&&Number.isInteger(ordered.contactTick)&&ordered.contactTick>0&&ordered.contactTick<timeline.length){
    const withCoat=!!((authoredCoats||optionalCoats)&&visibleOrdered.length===1&&coatFrames);
    const resolved=withCoat?{...ordered,id:ordered.id+'-coat-'+coatId,states:states.map((s,i)=>({...s,layers:[...s.layers,coatFrames[i].layer],approvedReferenceSHA256:coatFrames[i].approvedReferenceSHA256}))}:ordered;
    return {...resolved,orderedAttack:true,separableAttack:true,equipmentContract:{weapon:ordered.item,...(withCoat?{coat:coatId}:{})},colorAppearance:{},...((sideIris||sideHair)?{id:resolved.id+(sideIris?':owned-dagger-iris:'+sideIris:'')+(sideHair?':owned-dagger-hair:'+sideHair:''),...(sideIris?{orderedDaggerIris:sideIris}:{}),...(sideHair?{orderedDaggerHair:sideHair}:{})}:{})};
   }
  }
  const matchesAction=s=>s.action?action===s.action:['attack','punch','attack-unarmed'].includes(action);
  const spec=[index.separableAttacks,...(index.separableAttackRigs||[])].find(s=>s?.schema==='approved-separable-attacks-v1'&&matchesAction(s)&&body(b)===s.body&&s.directions?.[direction]&&(item==null||s.directions[direction].weapons?.[Number(item&&typeof item==='object'?item.def:item)])),d=spec?.directions?.[direction];
  if(!allowExactComposite||!spec||!d||!spec.approvedAppearance)return null;
  if(!Object.entries(spec.approvedAppearance).every(([k,v])=>appearance[k]===v))return null;
  const id=v=>Number(v&&typeof v==='object'?v.def:v);
  const visible=Object.fromEntries(Object.entries(equipment).filter(([,v])=>v!=null&&!['none','original'].includes(v)));
  if(Object.keys(visible).some(k=>k!=='coat'))return null;
  const weapon=item==null?null:id(item),coat=visible.coat==null?null:id(visible.coat);
  if(weapon==null&&coat==null||weapon!=null&&!d.weapons?.[weapon]||coat!=null&&!d.coats?.[coat])return null;
  const sources=[d.base,...(coat==null?[]:[d.coats[coat]]),...(weapon==null?[]:[d.weapons[weapon]])];
  if(sources.some(frames=>!Array.isArray(frames)||frames.length!==8||frames.some(a=>!a?.url||JSON.stringify(a.size)!=='[640,640]')))return null;
  const states=[];
  for(let n=0;n<8;n++){
   const gear=weapon==null?null:d.weapons[weapon][n],socket=coat==null?null:d.coats[coat][n].socket,attachment=gear?.attachment;
   let offset;
   if(attachment){
    const pair=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isInteger);
    if(!pair(attachment.anchor)||!pair(attachment.fallbackOffset)||socket&&(!pair(socket.position)||socket.name!==attachment.name))return null;
    offset=socket?socket.position.map((v,i)=>v-attachment.anchor[i]):attachment.fallbackOffset;
   }
   states.push({state:String(n),layers:sources.map((frames,depth)=>({...frames[n],operation:'source-over',depth,
    ...(coat!=null&&depth===1&&gear?.occludesCoat?{occludedBy:gear}:{}),
    ...(offset&&depth===sources.length-1?{offset}:{})}))});
  }
  return {id:'separable-'+(spec.rig?spec.rig+'-':'')+spec.body+'-'+direction+'-weapon'+(weapon??'none')+'-coat'+(coat??'none'),item:weapon,body:spec.body,direction,
   nativeCanvas:spec.nativeCanvas,logicalFrame:spec.logicalFrame,pivot:spec.pivot,density:spec.density,fps:spec.fps,timeline:spec.timeline,
   approvedAppearance:spec.approvedAppearance,separableAttack:true,colorAppearance:{},
   equipmentContract:{...(weapon==null?{}:{weapon}),...(coat==null?{}:{coat})},
   states};
 }
 // Original rear view: the signed body/hair have no iris. Blue in a
 // normalized save is retained as metadata; there is no eye raster to tint.
 const northFirearmBlueAuthority={"4":["mosquete4-north-native-layers","c5313a276de53421bf3cb28ad66990574283ad1fed8e3f6aacaed74cf7eb105b",[["24b4c1009f0c2136c603b34729679e350287dc2ac8112c82c01de13e0c7d1942","fb969731ac4d79d6fa0d756058cde4c7ea2c90a393d9fd60d13471e410957494"],["3c3a5a62128cada66168334892a2f297cced361dcf307bffa979fd4716a04e51","ce6193a12c6078392a95ffd9d346c3c8b4964e6476df696215e2c46c85586fa8"],["1aac0473925f0af63d812200115d943ba140f745d4b57542de8e793875998cf3","3df58f7ef60796380661de0cbc43abae1ecca537fb0eefacef148ff3bc7ad066"]]],"5":["mosquete5-north-native-layers","a4e5857b9ded879ad01a08d3c6546f0959921cd1d27fc8d813ca9ad04c5a03bc",[["dac161d27061140a08a2ad5f2b18ef1b4fc2c5ba15efcbade8f0eed3c5e6f45e","0b1acecf2f0d507aad5f35e1da79eb7ad61fe5fbe3ba77d7b46de9ecb935e2d5"],["4d8e584967de12d54f21e2f92df8c2bfb37570867050c0ea205c84ba2212fe70","500ab6c1bc0b710c81d10587413afe6903fbb416e4904cac3411503ee436190e"],["f3ddf84277b12f8780f95cbf9a3b5d6e9b43346fb74ddd028aee6299a07c4e91","04fccc8f3edb5d030b19c3545697be8e00aceeae5ef491398b7f0cc84acad754"]]],"113":["rifle113-north-native-layers","1b23b0d15aa2561858018ae53980ad90224ed7c94d6ddf262be826b72b4a6113",[["d8a82c818afa8913cfc89a6a3e27f8cae0b646cb7248e62b9c42012b952dfb62","a8ca73f492c5901b4e69eb25b9da1b275f20e54f24874581f74f42833d7dbd0f"],["c92b025111ae3f4a8f6586e976d066b2fdecef3edf1181395bb7e42a5f93bfdc","9677eb35f379b263078eef66f28b9060e2ba2d376ddbf5197132b588bdf05ecf"],["076485136376dcdfb4176d3af079a2b429e484808c6093b1d1e3c529655785cf","6860bf489efb5a52ce3636de034df54fad565554b919478b1267c6ef214401dc"]]],"115":["rifle115-north-native-layers","201c8a8ccbb5d105132a331a1f96ae7a93fc5194822319583ac16524f0f59f66",[["01c90e659faa2b9bd204921585201ab333356e6a698b352439b91e454e03e3db","9c1b20f36e0c99ddd5395d547fd7dead3029fc1f790c16457b1cb47996a49008"],["8dd173f17596110a1461d37941a610fd39c4507c3f4b1b5f0246acc5e4175072","4e5851bde753d22462cbcf079dddf1d8c78d82fef241c7eaf198ac337ff5faf0"],["92c0a71e394f570eb145b7214135d670ff48814dddf56249c4f5e497c37e8771","90fcb091422567e9059507577378761372c2ba6a3d6f4044de0c7863d3271e7a"]]],"116":["rifle116-north-native-layers","8865192c6a7a7633c3f22bdfa7a154feead941808986e3664727eed1ec277df1",[["c007307119be6c8d18ce7b57beaca30a78b8956b9c380ca3baed129ea59ba01c","88cceaa69778bef518925420ec603c0b4e0aa3b2d60d612dafc7460c1e04314a"],["037e8cb86e5653d40463c6cdbf138aad1da606cc3fded5424b0be84397a523f8","3ec7d4fb254eab7951a185efeca6fda71e42d8de790af3fb3662298d71ffec4d"],["5cb64804297bdd368487f8d2b5321418ec7e64cde5ddf49920ef07deb84f5a22","1b919df5f45a349cef5e42efe401733c30b7fce60413ca7391a92a15812c1a4e"]]]};
 const northFirearmBlueMaterials=[[["14715686ac258c17ddbd82b7a2ee3a6f13fbb9b656352eb5a39231030e5a0d18","729fad2d0f93bbb4b672ca42c486fd08fe2f34069537e038ff872c6ee523d829"],["1ce8a84fb29a0c32a552c8cc7198916802884e0d24e2e2cc9e25231b7f3f7b4d","393220e912a587becf871b379bf1b1ddad29b0b7a097e2243c6381fb2ed2c91c"],["23937c63990a9f1d47ecad3d695bb18525e9fda4a275d13899cf428f53055233","dbd4bd96d42aec8e29e1ff8c71e0e54f3c3805652b3aac0cb3264e46a86dd29b"]],[["07d59d3e55fea566f79c1ea13cd37fc9fa1a5cf75bb181af10d379027770c2fd","b58306b4f5b52caafd76ddcfffb65474ff6381099bde74b446ec4bf75f256281"],["689e56c4a54d70ead0e20096d6605a656593deab2897e31c708b45b2cad6ee4c","faa1fe8de7519ce5ddde7ccba42f71cd6f4e74af24efab052fd25254f8ef93d6"],["23937c63990a9f1d47ecad3d695bb18525e9fda4a275d13899cf428f53055233","dbd4bd96d42aec8e29e1ff8c71e0e54f3c3805652b3aac0cb3264e46a86dd29b"]],[["56a50e733528571a33ee53e44b3269c52d3878ff0dc44b64f7e3b16e2a914542","73113042f29a3d4abb07a6ff26a9367ca44935a830a6509a4feb6261a4c6170c"],["7f619342826788c5dc1478cff7037dfcd211dc5096210e2201fd057bfe3174ce","b175e1270c0114067099fac7447247d658f39bc26b4da9663337f1a37a3140b5"],["23937c63990a9f1d47ecad3d695bb18525e9fda4a275d13899cf428f53055233","dbd4bd96d42aec8e29e1ff8c71e0e54f3c3805652b3aac0cb3264e46a86dd29b"]]];
 const northFirearmBlueClock=["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","1","1","1","1","1","1","1","1","2","2","2","1","1","1","1","1","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"];
 function verifiedNorthFirearmBlue(r,appearance,equipment){
  const a=northFirearmBlueAuthority[r.item],same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!a||appearance.version!==1||appearance.gender!=='masculino'||appearance.skinStyle!=='natural'||
     appearance.skinColor!=='light'||appearance.skin!=='light'||appearance.hairStyle!=='original'||appearance.hair!=='original'||
     appearance.eyeStyle!=='original'||appearance.face!=='original'||appearance.hairColor!=='black'||appearance.eyeColor!=='blue'||
     Object.keys(equipment).length!==0||r.id!==a[0]||r.sourceArchiveSHA256!==a[1]||r.body!=='male'||r.direction!=='north'||
     r.density!==4||r.fps!==24||!same(r.nativeCanvas,[640,640])||!same(r.pivot,[80,128])||
     !same(r.timeline,northFirearmBlueClock)||!same(r.paletteSupport,['skin','hairColor'])||r.hairSeparated!==false||
     r.replacementMode!=='atomic-arms-weapon-hands-body'||r.basePack||r.mirrorBody||r.renderOffsetPhysical||
     r.states?.length!==3)return false;
  return r.states.every((st,f)=>st.state===String(f)&&st.approved?.sha256===a[2][f][1]&&
   !st.bodyPatch&&!st.attachment&&st.layers?.length===4&&st.layers.every((l,k)=>{
    const p=k===1?null:northFirearmBlueMaterials[f][k<1?k:k-1],sha=p?p[0]:a[2][f][0];
    return l.sha256===sha&&l.url==='assets/'+sha+'.png'&&l.depth===k&&l.role===['arms','weapon','hands','body-occluder'][k]&&
     l.operation==='source-over'&&!l.offset&&!l.mirrorX&&!l.occludedBy&&!l.mask&&!l.skinOnly&&
     (p?l.paletteMask?.sha256===p[1]&&l.paletteMask.url==='assets/'+p[1]+'.png':!l.paletteMask);
   }));
 }
 const firearmSideSource={"east:4":["mosquete4-east-native-attachment","26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[6.123233995736766e-17,-1,1,6.123233995736766e-17,274.72467532467533,451.24675324675326],5.5,false,[207,66],[91,39],[313.72467532467533,360.24675324675326]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.7071067811865476,-0.7071067811865475,0.7071067811865475,0.7071067811865476,260.39559896522934,373.2656565178044],5.5,false,[207,66],[91,39],[352.3194805194805,336.49610389610393]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[207,66],[91,39],[371.12207792207795,303.83896103896103]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,304.86233766233767,233.17142857142858],5.5,false,[207,66],[91,39],[395.86233766233767,272.1714285714286]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,303.8727272727273,234.16103896103897],5.5,false,[207,66],[91,39],[394.8727272727273,273.16103896103897]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,304.86233766233767,235.15064935064936],5.5,false,[207,66],[91,39],[395.86233766233767,274.15064935064936]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[207,66],[91,39],[371.12207792207795,303.83896103896103]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[6.123233995736766e-17,-1,1,6.123233995736766e-17,300.4545454545455,441.35064935064935],5.5,false,[207,66],[91,39],[339.4545454545455,350.35064935064935]]]],"east:5":["mosquete5-east-native-attachment","26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[["d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["2fb64a01536807f7ae0f9164613f839c98a5969944871d30cc8caca0afd93250",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["8a07b768a79e42c6ae78ecb0c70fef55542f2aae9af80551a2bef96f73773203",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["53a72b7c30bbace88f41dd93451c577591efb37cbad730d1cbe3033317816b77",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["eaa8a4f439a3cbd96d6e614a268ca307fef7a0e026212496aec8e0b6210cefc0",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["53a72b7c30bbace88f41dd93451c577591efb37cbad730d1cbe3033317816b77",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["4cbd2fd92bc6b905c029b9517d6b8ad3d95341480bda284789ca56e34d31ce4c",[1,0,0,1,0,0],5.5,false,[640,640],null,null],["d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d",[1,0,0,1,0,0],5.5,false,[640,640],null,null]]],"east:113":["rifle113-east-native-attachment","0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[6.123233995736766e-17,-1,1,6.123233995736766e-17,274.72467532467533,451.24675324675326],5.5,false,[204,58],[91,39],[313.72467532467533,360.24675324675326]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.7071067811865476,-0.7071067811865475,0.7071067811865475,0.7071067811865476,260.39559896522934,373.2656565178044],5.5,false,[204,58],[91,39],[352.3194805194805,336.49610389610393]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[204,58],[91,39],[371.12207792207795,303.83896103896103]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,304.86233766233767,233.17142857142858],5.5,false,[204,58],[91,39],[395.86233766233767,272.1714285714286]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,303.8727272727273,234.16103896103897],5.5,false,[204,58],[91,39],[394.8727272727273,273.16103896103897]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,304.86233766233767,235.15064935064936],5.5,false,[204,58],[91,39],[395.86233766233767,274.15064935064936]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[204,58],[91,39],[371.12207792207795,303.83896103896103]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[6.123233995736766e-17,-1,1,6.123233995736766e-17,300.4545454545455,441.35064935064935],5.5,false,[204,58],[91,39],[339.4545454545455,350.35064935064935]]]],"east:115":["rifle115-east-native-attachment","313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[1,0,0,1,53.72467532467533,68.24675324675326],5.5,false,[512,512],[260,292],[313.72467532467533,360.24675324675326]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.77602931761141,0.6306968354190222,-0.6306968354190222,0.77602931761141,334.71533388286844,-54.08563405537359],5.5,false,[512,512],[260,292],[352.3194805194805,336.49610389610393]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.7876958469423941,0.6160643251395949,-0.6160643251395949,0.7876958469423941,346.2119406578172,-86.34495080451273],5.5,false,[512,512],[260,292],[371.12207792207795,303.83896103896103]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.9663955201182123,0.25705971815017986,-0.25705971815017986,0.9663955201182123,219.660940131455,-76.85159002213618],5.5,false,[512,512],[260,292],[395.86233766233767,272.1714285714286]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.9601577797843646,0.2794584726208165,-0.2794584726208165,0.9601577797843646,226.8335785340709,-79.86423561740776],5.5,false,[512,512],[260,292],[394.8727272727273,273.16103896103897]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.989240199579788,0.14630047004483968,-0.14630047004483968,0.989240199579788,181.37962302468594,-52.74561113830708],5.5,false,[512,512],[260,292],[395.86233766233767,274.15064935064936]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.7876958469423941,0.6160643251395949,-0.6160643251395949,0.7876958469423941,346.2119406578172,-86.34495080451273],5.5,false,[512,512],[260,292],[371.12207792207795,303.83896103896103]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[1,0,0,1,79.4545454545455,58.35064935064935],5.5,false,[512,512],[260,292],[339.4545454545455,350.35064935064935]]]],"east:116":["rifle116-east-native-attachment","136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[6.123233995736766e-17,-1,1,6.123233995736766e-17,274.72467532467533,451.24675324675326],5.5,false,[207,66],[91,39],[313.72467532467533,360.24675324675326]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.7071067811865476,-0.7071067811865475,0.7071067811865475,0.7071067811865476,260.39559896522934,373.2656565178044],5.5,false,[207,66],[91,39],[352.3194805194805,336.49610389610393]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[207,66],[91,39],[371.12207792207795,303.83896103896103]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,304.86233766233767,233.17142857142858],5.5,false,[207,66],[91,39],[395.86233766233767,272.1714285714286]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,303.8727272727273,234.16103896103897],5.5,false,[207,66],[91,39],[394.8727272727273,273.16103896103897]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,304.86233766233767,235.15064935064936],5.5,false,[207,66],[91,39],[395.86233766233767,274.15064935064936]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.9659258262890683,-0.25881904510252074,0.25881904510252074,0.9659258262890683,273.12888497077444,289.72038691801674],5.5,false,[207,66],[91,39],[371.12207792207795,303.83896103896103]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[6.123233995736766e-17,-1,1,6.123233995736766e-17,300.4545454545455,441.35064935064935],5.5,false,[207,66],[91,39],[339.4545454545455,350.35064935064935]]]],"west:4":["mosquete4-west-native-attachment","26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[6.123233995736766e-17,1,-1,6.123233995736766e-17,365.27532467532467,244.24675324675326],5.5,true,[207,66],[116,39],[326.27532467532467,360.24675324675326]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.7071067811865476,0.7071067811865475,-0.7071067811865475,0.7071067811865476,233.2332973291553,226.8945528121891],5.5,true,[207,66],[116,39],[287.6805194805195,336.49610389610393]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,166.92446898738842,236.14484458179498],5.5,true,[207,66],[116,39],[268.87792207792205,303.83896103896103]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,128.13766233766233,233.17142857142858],5.5,true,[207,66],[116,39],[244.13766233766233,272.1714285714286]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,129.12727272727273,234.16103896103897],5.5,true,[207,66],[116,39],[245.12727272727273,273.16103896103897]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[1,0,0,1,128.13766233766233,235.15064935064936],5.5,true,[207,66],[116,39],[244.13766233766233,274.15064935064936]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,166.92446898738842,236.14484458179498],5.5,true,[207,66],[116,39],[268.87792207792205,303.83896103896103]],["26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[6.123233995736766e-17,1,-1,6.123233995736766e-17,339.5454545454545,234.35064935064935],5.5,true,[207,66],[116,39],[300.5454545454545,350.35064935064935]]]],"west:5":["mosquete5-west-native-attachment","26adeb343fe2686f0177a07497d851d603e8d6b7887cd09419bf08b3c438d0a6",[["d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["2fb64a01536807f7ae0f9164613f839c98a5969944871d30cc8caca0afd93250",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["8a07b768a79e42c6ae78ecb0c70fef55542f2aae9af80551a2bef96f73773203",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["53a72b7c30bbace88f41dd93451c577591efb37cbad730d1cbe3033317816b77",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["eaa8a4f439a3cbd96d6e614a268ca307fef7a0e026212496aec8e0b6210cefc0",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["53a72b7c30bbace88f41dd93451c577591efb37cbad730d1cbe3033317816b77",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["4cbd2fd92bc6b905c029b9517d6b8ad3d95341480bda284789ca56e34d31ce4c",[1,0,0,1,0,0],5.5,true,[640,640],null,null],["d2921b011e13c613bdc2a114b8a06fee10abd21ba2605097ec96b89dcb9ae35d",[1,0,0,1,0,0],5.5,true,[640,640],null,null]]],"west:113":["rifle113-west-native-attachment","0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[6.123233995736766e-17,1,-1,6.123233995736766e-17,365.27532467532467,247.24675324675326],5.5,true,[204,58],[113,39],[326.27532467532467,360.24675324675326]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.7071067811865476,0.7071067811865475,-0.7071067811865475,0.7071067811865476,235.35461767271494,229.01587315574875],5.5,true,[204,58],[113,39],[287.6805194805195,336.49610389610393]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,169.82224646625565,236.92130171710255],5.5,true,[204,58],[113,39],[268.87792207792205,303.83896103896103]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,131.13766233766233,233.17142857142858],5.5,true,[204,58],[113,39],[244.13766233766233,272.1714285714286]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,132.12727272727273,234.16103896103897],5.5,true,[204,58],[113,39],[245.12727272727273,273.16103896103897]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[1,0,0,1,131.13766233766233,235.15064935064936],5.5,true,[204,58],[113,39],[244.13766233766233,274.15064935064936]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,169.82224646625565,236.92130171710255],5.5,true,[204,58],[113,39],[268.87792207792205,303.83896103896103]],["0ada4db5e15082161d590ffb07f1c6ae2e49e74b94a61c49a1fdba1a851f48e4",[6.123233995736766e-17,1,-1,6.123233995736766e-17,339.5454545454545,237.35064935064935],5.5,true,[204,58],[113,39],[300.5454545454545,350.35064935064935]]]],"west:115":["rifle115-west-native-attachment","313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[1,0,0,1,74.27532467532467,68.24675324675326],5.5,true,[512,512],[252,292],[326.27532467532467,360.24675324675326]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.7760293176114101,-0.6306968354190221,0.6306968354190221,0.7760293176114101,-92.04234449991034,268.83114567916573],5.5,true,[512,512],[252,292],[287.6805194805195,336.49610389610393]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.7876958469423941,-0.6160643251395947,0.6160643251395947,0.7876958469423941,-109.51221429232294,229.07998366695978],5.5,true,[512,512],[252,292],[268.87792207792205,303.83896103896103]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.9663955201182124,-0.25705971815017964,0.25705971815017964,0.9663955201182124,-74.45544643197964,54.762985670755825],5.5,true,[512,512],[252,292],[244.13766233766233,272.1714285714286]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.9601577797843647,-0.2794584726208162,0.2794584726208162,0.9601577797843647,-78.4343617836655,63.21850236445016],5.5,true,[512,512],[252,292],[245.12727272727273,273.16103896103897]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.9892401995797881,-0.14630047004483945,0.14630047004483945,0.9892401995797881,-47.870605209537395,22.16022952465073],5.5,true,[512,512],[252,292],[244.13766233766233,274.15064935064936]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[0.7876958469423941,-0.6160643251395947,0.6160643251395947,0.7876958469423941,-109.51221429232294,229.07998366695978],5.5,true,[512,512],[252,292],[268.87792207792205,303.83896103896103]],["313d55eb5787d63cc3f06172d5215ffda64010ce1463a31abdcc852e7508a16b",[1,0,0,1,48.545454545454504,58.35064935064935],5.5,true,[512,512],[252,292],[300.5454545454545,350.35064935064935]]]],"west:116":["rifle116-west-native-attachment","136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[6.123233995736766e-17,1,-1,6.123233995736766e-17,365.27532467532467,244.24675324675326],5.5,true,[207,66],[116,39],[326.27532467532467,360.24675324675326]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.7071067811865476,0.7071067811865475,-0.7071067811865475,0.7071067811865476,233.2332973291553,226.8945528121891],5.5,true,[207,66],[116,39],[287.6805194805195,336.49610389610393]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,166.92446898738842,236.14484458179498],5.5,true,[207,66],[116,39],[268.87792207792205,303.83896103896103]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,128.13766233766233,233.17142857142858],5.5,true,[207,66],[116,39],[244.13766233766233,272.1714285714286]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,129.12727272727273,234.16103896103897],5.5,true,[207,66],[116,39],[245.12727272727273,273.16103896103897]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[1,0,0,1,128.13766233766233,235.15064935064936],5.5,true,[207,66],[116,39],[244.13766233766233,274.15064935064936]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[0.9659258262890683,0.25881904510252074,-0.25881904510252074,0.9659258262890683,166.92446898738842,236.14484458179498],5.5,true,[207,66],[116,39],[268.87792207792205,303.83896103896103]],["136a96941e5094d2603b654c99280a753f04019a6f4e62e32dbae86451ff1654",[6.123233995736766e-17,1,-1,6.123233995736766e-17,339.5454545454545,234.35064935064935],5.5,true,[207,66],[116,39],[300.5454545454545,350.35064935064935]]]]};
 const firearmSideFace={"east":"9add51bf7602618f2e937cf31d851346a02afc248da8490ae5ea7ea322fabde2","west":"0dc6cfcac5a2cf85ea30b0d88bdfd08e3fb7574110b115fb230ff8adce03b464"};
 const firearmSideFacePoses={"east":[[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}],[{"x":80.75,"y":58},{"x":88.5,"y":51.5}]],"west":[[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}],[{"x":79.25,"y":58},{"x":71.5,"y":51.5}]]};
 const firearmSideIris={"east":[[279,130,81,50,37,255,2],[279,131,70,34,23,255,2],[280,131,54,27,21,255,1],[279,132,69,31,21,255,2],[280,132,66,34,23,255,2],[281,132,43,27,21,255,1],[279,133,70,31,21,255,2],[280,133,70,34,23,255,2],[281,133,51,31,24,255,1],[279,134,81,42,29,255,2],[280,134,83,39,24,255,2],[281,134,73,42,29,255,2],[279,135,77,29,17,255,2],[280,135,90,37,19,255,3],[281,135,95,50,37,255,3],[282,135,49,30,27,255,1],[280,136,105,49,31,255,3],[281,136,75,39,30,255,2]],"west":[[232,130,81,50,37,255,2],[232,131,70,34,23,255,2],[231,131,54,27,21,255,1],[232,132,69,31,21,255,2],[231,132,66,34,23,255,2],[230,132,43,27,21,255,1],[232,133,70,31,21,255,2],[231,133,70,34,23,255,2],[230,133,51,31,24,255,1],[232,134,81,42,29,255,2],[231,134,83,39,24,255,2],[230,134,73,42,29,255,2],[232,135,77,29,17,255,2],[231,135,90,37,19,255,3],[230,135,95,50,37,255,3],[229,135,49,30,27,255,1],[231,136,105,49,31,255,3],[230,136,75,39,30,255,2]]};
 function savedFirearmSideBlue(r,look,equipment){
  const own=firearmSideSource[r.direction+':'+r.item],face=firearmSideFace[r.direction],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),b=r.basePack,d=b?.pack?.directions?.[r.direction];
  if(!own||!face||!d||look.version!==1||look.gender!=='masculino'||look.skinStyle!=='natural'||look.skin!=='light'||look.skinColor!=='light'||
    look.hair!=='original'||look.hairStyle!=='original'||look.hairColor!=='black'||look.face!=='original'||look.eyeStyle!=='original'||look.eyeColor!=='blue'||
    Object.keys(equipment).length||r.id!==own[0]||r.sourceWeaponSHA256!==own[1]||r.body!=='male'||r.hairSeparated!==true||r.density!==4||r.fps!==12||
    !same(r.nativeCanvas,[640,640])||!same(r.pivot,[80,128])||!same(r.paletteSupport,['skin','hairColor'])||
    r.states?.length!==8||!same(r.timeline,['0','1','2','3','4','5','6','7'])||!same(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||d.renderMirrorFrom||
    !same([d.rest,...d.poses].map(p=>[p.NECK,p.NOSE]),firearmSideFacePoses[r.direction])||
    r.mirrorBody||r.mirrorLayerIDs||r.renderOffsetPhysical||r.sourceRasterPadding||
    d.layers.filter(l=>l.id==='face'&&l.slot==='face'&&l.source===face&&l.depth===21&&!l.frames&&same(l.binding,{kind:'rigid',a:'NECK',b:'NOSE'})).length!==1||
    !b.images[face]?.endsWith('/'+face+'.png'))return false;
  return r.states.every((s,i)=>{const w=s.attachment,v=own[2][i];return s.state===String(i)&&!s.bodyPatch&&!s.canvasRoundingPatch&&s.layers.length===0&&w&&
   w.url==='assets/'+v[0]+'.png'&&same([w.sha256,w.matrix,w.depth,w.mirrorX,w.size,w.sourceGrip,w.targetGrip],v);});
 }
 const firearmSouthAuthority={"4":["mosquete4-south-original-body-native-layers","dd5451526cce4f6e666ad568bf11dcfa39288eb99af4ba110f1256541364df99",[["fc9670d13855da1643956ce501aa6b44262914e02fe9aa1f286bc90d5ddc3457",[1,0,0,1,-20.12839059674502,29.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[260,354]],["344313772b55c00d54cf77c9207c104020338d50ed6f1de86aabbef5630d50a0",[1,0,0,1,29.43336944745397,33.51354279523292],3,null,[640,640],[272.56663055254603,289.4864572047671],[302,323]],["917e82278c1007005cfae37c0b4db516ed52634370ab95f198a07de60f08d41a",[1,0,0,1,13.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[310,287]],["bcdf2ec1da4a6d92d618f6fb985d92e1efd1c3069c56d03deaaf040fd7f8d6c6",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["8f562aec770ddb61afb01c6e59c030edad11e0435a6542f3834fc5b9937a8890",[1,0,0,1,30.69785575048735,-12.784600389863556],3,null,[640,640],[284.30214424951265,275.78460038986356],[315,263]],["bcdf2ec1da4a6d92d618f6fb985d92e1efd1c3069c56d03deaaf040fd7f8d6c6",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["917e82278c1007005cfae37c0b4db516ed52634370ab95f198a07de60f08d41a",[1,0,0,1,11.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[308,287]],["fc9670d13855da1643956ce501aa6b44262914e02fe9aa1f286bc90d5ddc3457",[1,0,0,1,10.871609403254979,27.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[291,352]]]],"113":["rifle113-south-original-body-native-layers","d8fee2987f91745317d37683abdb157abfbf28e147daf75ba97706c414568346",[["6583c6b934bac55341a6058ec2892fb409bae3a4fd9663842d369dd19e7cc97a",[1,0,0,1,-20.12839059674502,29.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[260,354]],["9110473ee7a10bc559c12b894e2ee686366cc5fb4e2804f109a86cb57a48de56",[1,0,0,1,29.43336944745397,33.51354279523292],3,null,[640,640],[272.56663055254603,289.4864572047671],[302,323]],["12ee873fd835a32a960202eaebe93e64e8ca45b8c4ca4d23ed2e823ca6c3a43b",[1,0,0,1,13.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[310,287]],["12592cdee60203ebac99e9e6748cdd6d0edc58924e40c8769df5539709e13ff7",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["24deaa2333ffab53aab634e9a2ba3bab78119b66fdf552079886d20bb66ff3ec",[1,0,0,1,30.69785575048735,-12.784600389863556],3,null,[640,640],[284.30214424951265,275.78460038986356],[315,263]],["12592cdee60203ebac99e9e6748cdd6d0edc58924e40c8769df5539709e13ff7",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["12ee873fd835a32a960202eaebe93e64e8ca45b8c4ca4d23ed2e823ca6c3a43b",[1,0,0,1,11.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[308,287]],["6583c6b934bac55341a6058ec2892fb409bae3a4fd9663842d369dd19e7cc97a",[1,0,0,1,10.871609403254979,27.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[291,352]]]],"115":["rifle115-south-original-body-native-attachment","d87a8ccc05a8aff100db2c7454dd40355c7dfef65e7fbc45d164005f3535d585",[["5f100d6014552b0fa4f27241bfa00ebf2501d634920df7dbcfa3b1355fa6bd34",[1,0,0,1,-20.12839059674502,29.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[260,354]],["027998619d3bbe8a8a6f0fc681871f513368bb412db1f8f3da0109df5cd70255",[1,0,0,1,29.43336944745397,33.51354279523292],3,null,[640,640],[272.56663055254603,289.4864572047671],[302,323]],["c2f1ee6a19191710f695d5f5a0060eafc88c136f85d8da89c2fed074171be9f2",[1,0,0,1,13.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[310,287]],["7e95db4ca4be629d75754cb2087ae7c4992fbc33bc2f451f92b8bf7b7199c503",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["a758cb006c50f4703a7243c73e7f72ba007a40f11c15b6105fe37e5a9f720899",[1,0,0,1,30.69785575048735,-12.784600389863556],3,null,[640,640],[284.30214424951265,275.78460038986356],[315,263]],["7e95db4ca4be629d75754cb2087ae7c4992fbc33bc2f451f92b8bf7b7199c503",[1,0,0,1,33.1496598639456,-11.65111758989309],3,null,[640,640],[281.8503401360544,274.6511175898931],[315,263]],["c2f1ee6a19191710f695d5f5a0060eafc88c136f85d8da89c2fed074171be9f2",[1,0,0,1,11.392649903288202,23.061895551257237],3,null,[640,640],[296.6073500967118,263.93810444874276],[308,287]],["5f100d6014552b0fa4f27241bfa00ebf2501d634920df7dbcfa3b1355fa6bd34",[1,0,0,1,10.871609403254979,27.580470162748668],3,null,[640,640],[280.128390596745,324.41952983725133],[291,352]]]]};
 const firearmSouthFace="6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a";
 const firearmSouthFacePoses=[[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}],[{"x":80,"y":60.01913875598086},{"x":80,"y":53.741626794258366}]];
 const firearmSouthIris=[[303,205,40,5,0,255,1],[304,205,50,20,14,255,1],[303,206,41,4,0,255,1],[304,206,53,21,13,255,1],[303,207,71,25,13,255,2],[304,207,82,40,29,255,2],[307,207,40,21,16,255,1],[308,207,62,24,15,255,2],[303,208,88,37,22,255,2],[304,208,103,53,38,255,3],[305,208,38,17,11,255,1],[307,208,85,43,33,255,2],[308,208,78,31,18,255,2],[303,209,57,22,13,255,1],[304,209,95,46,31,255,3],[305,209,92,44,31,255,3],[306,209,92,43,30,255,3],[307,209,108,52,38,255,3],[308,209,66,20,7,255,2],[303,210,66,50,44,255,2],[304,210,55,17,9,255,1],[305,210,80,34,22,255,2],[306,210,84,34,22,255,2],[307,210,82,32,19,255,2],[332,206,50,7,0,255,1],[332,207,84,31,18,255,2],[333,207,43,20,14,255,1],[336,207,63,29,19,255,2],[337,207,47,18,11,255,1],[332,208,81,29,15,255,2],[333,208,77,38,26,255,2],[335,208,49,22,15,255,1],[336,208,91,45,32,255,3],[337,208,62,28,17,255,2],[332,209,70,22,10,255,2],[333,209,93,46,33,255,3],[334,209,87,41,27,255,2],[335,209,95,45,30,255,3],[336,209,98,49,33,255,3],[337,209,58,27,17,255,1],[332,210,38,5,0,255,1],[333,210,67,29,19,255,2],[334,210,69,29,18,255,2],[335,210,75,33,21,255,2],[336,210,47,11,3,255,1]];
 function savedFirearmSouthBlue(r,look,equipment){
  const own=firearmSouthAuthority[r.item],face=firearmSouthFace,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),b=r.basePack,d=b?.pack?.directions?.[r.direction];
  if(!own||r.direction!=='south'||!d||look.version!==1||look.gender!=='masculino'||look.skinStyle!=='natural'||look.skin!=='light'||look.skinColor!=='light'||
    look.hair!=='original'||look.hairStyle!=='original'||look.hairColor!=='black'||look.face!=='original'||look.eyeStyle!=='original'||look.eyeColor!=='blue'||
    Object.keys(equipment).length||r.id!==own[0]||r.sourceArchiveSHA256!==own[1]||r.body!=='male'||r.hairSeparated!==true||r.density!==4||r.fps!==12||
    !same(r.nativeCanvas,[640,640])||!same(r.pivot,[80,128])||!same(r.paletteSupport,['skin','hairColor'])||
    r.states?.length!==8||!same(r.timeline,['0','1','2','3','4','5','6','7'])||!same(d.clip,{frames:8,fps:12,loop:false,contactFrame:4})||d.renderMirrorFrom||
    !same([d.rest,...d.poses].map(p=>[p.NECK,p.NOSE]),firearmSouthFacePoses)||
    r.mirrorBody||r.mirrorLayerIDs||r.renderOffsetPhysical||r.sourceRasterPadding||
    d.layers.filter(l=>l.id==='face'&&l.slot==='face'&&l.source===face&&l.depth===5&&!l.frames&&same(l.binding,{kind:'rigid',a:'NECK',b:'NOSE'})).length!==1||
    !b.images[face]?.endsWith('/'+face+'.png'))return false;
  return r.states.every((s,i)=>{const w=s.attachment,v=own[2][i];return s.state===String(i)&&!s.bodyPatch&&!s.canvasRoundingPatch&&s.layers.length===0&&w&&
   w.url==='assets/'+v[0]+'.png'&&same([w.sha256,w.matrix,w.depth,w.mirrorX,w.size,w.sourceGrip,w.targetGrip],v);});
 }
 function paintFirearmSideIris(source,old,item,makeCanvas){
  const south=item.direction==='south',offset=south?0:64,points=south?firearmSouthIris:firearmSideIris[item.direction],ramp=root.MareCharacterAppearance?.eyes?.blue?.ramp;
  if(!points||!ramp||source.width!==640||source.height!==640||old.width!==640||old.height!==640)throw Error('Missing exact lateral firearm iris');
  const c=makeCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(old,0,0);const raw=ctx.getImageData(0,0,640,640).data;
  ctx.clearRect(0,0,640,640);ctx.drawImage(source,0,0);const data=ctx.getImageData(0,0,640,640);
  for(const [x,y,R,G,B,A,rank] of points){
   const k=((y+offset)*640+x+offset)*4;
   if(raw[k]!==R||raw[k+1]!==G||raw[k+2]!==B||raw[k+3]!==A||data.data[k+3]!==A)throw Error('Unregistered lateral firearm iris pixel');
   const shade=parseInt(ramp[rank-1].slice(1),16);data.data[k]=shade>>>16;data.data[k+1]=(shade>>>8)&255;data.data[k+2]=shade&255;
  }
  ctx.putImageData(data,0,0);return c;
 }
 function resolve({item,body:b,action='attack',direction,appearance={},equipment={},allowExactComposite=true,allowNorthSavedBlue=false}={}){
  if(item==null)return null;
  const allowed=[12,13,71,72,73,74].includes(Number(item))?["attack","attack-daggers"]:[0,1,67,68,69,70].includes(Number(item))?["attack","attack-sword"]:[14,110,112,2,3,15,109,111,117,118,119,120].includes(Number(item))?['attack','punch','attack-unarmed']:[4,5,113,114,115,116].includes(Number(item))?['attack','shoot','attack-firearm']:[123,124,125,126,127,128,16,121,17,122,31,32].includes(Number(item))?['attack','focus','attack-focus','cast']:[];
  const id=v=>Number(v&&typeof v==='object'?v.def:v);
  const idleSource=exactSouthIdle.get(Number(item));
  const exactSource=idleSource??index.exactSouthFirearms?.find(r=>r.equipment.weapon===Number(item)&&r.equipment.coat===id(equipment.coat));
  if(!allowed.includes(action)&&!(idleSource&&action==='idle'))return null;if([0,1,67,68,69,70].includes(Number(item))&&[appearance.skin,appearance.skinColor,appearance.hair,appearance.hairStyle,appearance.hairColor,appearance.eyeColor].some(v=>v&&v!=="original"))return null;
  const equippedWeapon=equipment.weapon&&typeof equipment.weapon==='object'?equipment.weapon.def:equipment.weapon;
  if(equippedWeapon!=null&&Number(equippedWeapon)!==Number(item))return null;
  if(allowExactComposite&&action!=='idle'){
   const match=index.records.find(r=>r.approvedEquipment&&r.item===Number(item)&&r.body===body(b)&&r.direction===direction&&Object.keys(equipment).length===Object.keys(r.approvedEquipment).length&&Object.entries(r.approvedEquipment).every(([slot,value])=>id(equipment[slot])===value)&&Object.entries(r.approvedAppearance).every(([key,value])=>appearance[key]===value));
   if(match)return {...match,exactComposite:true,colorAppearance:{},equipmentContract:{weapon:Number(item),...match.approvedEquipment}};
  }
  if(allowExactComposite&&exactSource&&body(b)===exactSource.body&&direction===exactSource.direction){
   const id=v=>Number(v&&typeof v==='object'?v.def:v);
   const visible=Object.entries(equipment).filter(([k,v])=>v!=null&&!['none','original'].includes(v)&&!['necklace','ring','belt','charm','akuma_no_mi'].includes(k));
   const exact=visible.every(([k,v])=>Object.hasOwn(exactSource.equipment,k)&&id(v)===exactSource.equipment[k])&&id(equipment.coat)===exactSource.equipment.coat&&id(equipment.head)===exactSource.equipment.head;
   const palette=[appearance.skin,appearance.skinColor].every(v=>!v||['original','light'].includes(v))&&[appearance.face,appearance.eyeStyle].every(v=>!v||v==='original')&&(!appearance.eyeColor||['original','blue'].includes(appearance.eyeColor));
   // The baked head is registered to the reference hair selection and palette.
   const hair=(appearance.hair??appearance.hairStyle)==='hair-spiky'&&(!appearance.hairColor||['black','original'].includes(appearance.hairColor));
   const pilot=index.records.find(r=>r.id===exactSource.id);
   if(exact&&palette&&hair&&pilot&&pilot.item===Number(item)&&pilot.body===exactSource.body&&pilot.direction===exactSource.direction&&pilot.density===4&&JSON.stringify(pilot.nativeCanvas)==='[640,640]'&&JSON.stringify(pilot.pivot)==='[80,128]'&&pilot.fps===24&&JSON.stringify(pilot.timeline)===JSON.stringify(['0','1','2','4','R','4','2','1','0'].flatMap((s,i)=>Array([8,3,3,4,2,3,4,4,12][i]).fill(s)))&&pilot.sourceArchiveSHA256===exactSource.sourceArchiveSHA256&&pilot.states.length===exactSource.states.length&&exactSource.states.every(expected=>{
    const s=pilot.states.find(s=>s.state===expected.state);
    return s?.atomic===true&&s.requiredBaseSHA256===expected.base&&s.approved?.sha256===expected.approved&&s.layers.length===expected.layers.length&&s.layers.every((l,i)=>l.sha256===expected.layers[i]&&l.url==='assets/'+expected.layers[i]+'.png'&&l.operation==='source-over')&&s.layers[0].sha256===s.requiredBaseSHA256;
   }))return {...pilot,timeline:action==='idle'?['0']:pilot.timeline,exactComposite:true,colorAppearance:{},equipmentContract:exactSource.equipment};
  }
  if(action==='idle')return null;
  const r=index.records.find(r=>r.item===Number(item)&&r.body===body(b)&&r.direction===direction&&r.originalAppearanceCompatible!==false);if(!r)return null;
  if(r.interfaceSkinLocked&&[appearance.skin,appearance.skinColor].some(v=>v&&v!=='original'))return null;
  for(const slot of ['torso','coat','pants','legs','gloves','boots','cloak','head'])if(equipment[slot]!=null&&!['original','none'].includes(equipment[slot]))return null;
  const ownRearBlue=allowNorthSavedBlue&&verifiedNorthFirearmBlue(r,appearance,equipment);
  const ownSideBlue=allowNorthSavedBlue&&savedFirearmSideBlue(r,appearance,equipment);
  const ownSouthBlue=allowNorthSavedBlue&&savedFirearmSouthBlue(r,appearance,equipment);
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item))for(const k of ['skin','skinColor','hairColor','eyeColor'])if(appearance[k]&&!['original'].includes(appearance[k])&&!(k==='eyeColor'&&(ownRearBlue||ownSideBlue||ownSouthBlue))&&!(r.paletteSupport?.includes(k==='skinColor'?'skin':k)))return null;
  if(appearance.face&&!['original','face-gentle'].includes(appearance.face))return null;
  // Cosmetics are composed separately only after caller hides the authored head slots.
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item)&&[appearance.hair,appearance.hairStyle,appearance.head].some(v=>v&&!['original','none'].includes(v)))return null;
  if([112,15,109,111,117,17,122].includes(r.item)&&[appearance.hair,appearance.hairStyle].some(v=>v&&v!=='original'))return null;
  return {...r,colorAppearance:appearance,...(ownSideBlue?{id:r.id+':owned-side-firearm-iris:blue',ownedSideFirearmIris:true}:ownSouthBlue?{id:r.id+':owned-south-firearm-iris:blue',ownedSouthFirearmIris:true}:{})};
 }
 function requiredFiles(r,{frame}={}){if(!r)return [];const states=frame===undefined?r.states:[r.states[frame]];if(states.some(s=>!s))throw Error('Invalid native weapon frame');const files=new Set();for(const s of states){for(const l of [...s.layers,...(s.attachment?[s.attachment]:[])]){files.add(resource(l.url));if(l.mask)files.add(resource(l.mask.url));if(l.occludedBy)files.add(resource(l.occludedBy.url));if(l.paletteMask)files.add(resource(l.paletteMask.url));}if(s.bodyPatch)files.add(resource(s.bodyPatch.url));if(r.basePack){const d=r.basePack.pack.directions[r.direction];for(const l of d.layers){const key=l.frames?.[Number(s.state)]||l.source,url=r.basePack.images[key];if(!url)throw Error('Missing authored base frame reference');files.add(resource(url));}}}if(r.orderedDaggerHair){const a=daggerHairAuthority[r.direction];if(!a)throw Error('Invalid dagger hair direction');files.add(daggerHairPath(a.source));files.add(daggerHairPath(a.mask));}return [...files];}
 function render(ctx,r,images,{frame=0,state,hiddenSlots=[],appearance=r?.colorAppearance||{}}={}){
  if(!r)throw Error('Missing native weapon source');let s=state===undefined?r.states[frame]:r.states.find(s=>s.state===String(state));if(!s)throw Error('Unapproved native weapon state');
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item)&&!r.hairSeparated&&hiddenSlots.length)throw Error('115 backing has baked head/hair; hiding slots is unsupported');
  if(hiddenSlots.some(x=>!['hair','face','headBase'].includes(x)))throw Error('Only independent head slots may be hidden');
  const recolored=!!(r.basePack||r.paletteSupport)&&['skin','skinColor','hairColor','eyeColor','face'].some(k=>appearance[k]&&appearance[k]!=='original');
  const renderOffset=r.renderOffsetPhysical??[0,0];if(!Array.isArray(renderOffset)||renderOffset.length!==2||renderOffset.some(v=>!Number.isInteger(v)||v<0))throw Error('Native render offset must be two nonnegative integers');if(renderOffset.some(Boolean)&&(!r.basePack||!s.attachment||s.layers.some(l=>l.operation!=='source-over')||s.canvasRoundingPatch?.length))throw Error('Padded native attachments cannot contain coordinate-addressed RGBA patches');
  const [w,h]=r.nativeCanvas;ctx.canvas.width=w;ctx.canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(...renderOffset);try{
  const image=a=>{const im=images.get(resource(a.url))||images.get(a.url);if(!im)throw Error('Missing original asset '+a.url);return im;};
  let headOverlay;
  if(r.basePack){const p=r.basePack.pack,d=p.directions[r.direction],map=new Map();
   const underBody=r.equipmentBehindBody||r.approvedSouthHead;
   const target=underBody?makeCanvas(w,h).getContext('2d'):ctx;
   const headOffset=r.headOverlayOffset??[0,0];
   if(!Array.isArray(headOffset)||headOffset.length!==2||headOffset.some(v=>!Number.isInteger(v)||v<0)||headOffset.some(Boolean)&&(!r.approvedSouthHead||p.frame.width*4+2*headOffset[0]!==w||p.frame.height*4+2*headOffset[1]!==h))throw Error('Invalid approved head overlay padding');
   if(r.equipmentBehindBody)for(const l of s.layers)ctx.drawImage(image(l),0,0);
   for(const key of new Set(d.layers.filter(l=>!hiddenSlots.includes(l.slot)).map(l=>l.frames?.[Number(s.state)]||l.source))){const url=r.basePack.images[key],im=images.get(resource(url))||images.get(url);if(!im)throw Error('Missing base asset '+url);
   const pad=r.sourceRasterPadding?.[key];
   if(pad!==undefined){
    if(im.width+2*pad!==p.frame.width*4||im.height+2*pad!==p.frame.height*4)throw Error('Invalid padded equipment source '+url);
    const tile=makeCanvas(p.frame.width*4,p.frame.height*4);
    tile.getContext('2d').drawImage(im,pad,pad);
    map.set(key,tile);
   }else map.set(key,im);}
   const pack={...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}};
   if((recolored||r.mirrorBody)&&!s.attachment){if(!root.MareReworkBaseHD)throw Error('Native palette renderer unavailable');const base=root.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});base.render(target,{id:r.id,pack,direction:r.direction,sourceRefs:[...map.keys()],mirrorX:r.mirrorBody},map,{frame:Number(s.state),appearance,makeCanvas});}
   else if(s.attachment){const dir=pack.directions[r.direction],at=s.attachment,ops=dir.layers.map(layer=>({depth:layer.depth,layer}));ops.push({depth:at.depth,attachment:at});for(const op of ops.sort((a,b)=>a.depth-b.depth)){if(op.layer){const one={...pack,directions:{[r.direction]:{...dir,layers:[op.layer]}}};ctx.save();if(r.mirrorLayerIDs?.includes(op.layer.id)){ctx.translate(p.frame.width*4,0);ctx.scale(-1,1);}if(recolored){const tile=makeCanvas(w,h),base=root.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});base.render(tile.getContext('2d'),{id:r.id,pack:one,direction:r.direction,sourceRefs:[...map.keys()]},map,{frame:Number(s.state),appearance,makeCanvas,
       ...((r.ownedSideFirearmIris||r.ownedSouthFirearmIris)&&op.layer.slot==='face'?{afterMaterialSource:(source,image,old)=>source===(r.ownedSouthFirearmIris?firearmSouthFace:firearmSideFace[r.direction])?paintFirearmSideIris(image,old,r,makeCanvas):image}:{})});ctx.drawImage(tile,0,0);}else vendor.compositor.render(ctx,one,map,{direction:r.direction,frame:Number(s.state),density:4,clear:false});ctx.restore();}else{ctx.save();ctx.transform(...at.matrix);if(at.mirrorX){ctx.translate(at.size[0],0);ctx.scale(-1,1);}ctx.drawImage(image(at),0,0);ctx.restore();}}}
   else vendor.compositor.render(target,pack,map,{direction:r.direction,frame:Number(s.state),density:4});
   if(s.bodyPatch){
    const [x,y,width,height]=s.bodyPatch.rect;
    const patch=makeCanvas(width,height).getContext('2d');
    patch.drawImage(image(s.bodyPatch),x,y,width,height,0,0,width,height);
    const ramp=root.MareAppearance96?.skins[appearance.skin||appearance.skinColor]?.ramp;
    if(ramp){
     const pixels=patch.getImageData(0,0,width,height);
     pixels.data.set(root.MareAppearance96.recolor(pixels.data,root.MareNativeSkinHD.mask(pixels.data,width,'anatomy'),ramp));
     patch.putImageData(pixels,0,0);
    }
    target.clearRect(x,y,width,height);
    target.drawImage(patch.canvas,x,y);
   }
   if(r.approvedSouthHead)headOverlay=target.canvas;
   else if(underBody)ctx.drawImage(target.canvas,0,0);
  }
  const paletteImage=l=>{const original=image(l);if(!recolored||!l.paletteMask)return original;const api=root.MareAppearance96;if(!api)throw Error('Native material palette API unavailable');const tile=makeCanvas(original.width,original.height),tc=tile.getContext('2d');tc.drawImage(original,0,0);const pixels=tc.getImageData(0,0,tile.width,tile.height);tc.clearRect(0,0,tile.width,tile.height);tc.drawImage(image(l.paletteMask),0,0);const material=tc.getImageData(0,0,tile.width,tile.height).data;let rgba=pixels.data;for(const [channel,ramp]of [[0,api.skins[appearance.skin||appearance.skinColor]?.ramp],[1,api.hairs[appearance.hairColor]?.ramp]]){if(!ramp)continue;const mask=new Uint8Array(rgba.length/4);for(let p=0;p<mask.length;p++){const value=material[p*4+channel];mask[p]=l.skinMaskMode==='binary'&&channel===0&&value?root.MareNativeSkinHD.tone(rgba[p*4],rgba[p*4+1],rgba[p*4+2]):value;}rgba=api.recolor(rgba,mask,ramp);}pixels.data.set(rgba);tc.putImageData(pixels,0,0);return tile;};
  for(const l of r.equipmentBehindBody?[]:[...s.layers].sort((a,b)=>a.depth-b.depth)){
   if(l.inFrontOfHead&&headOverlay){ctx.drawImage(headOverlay,...(r.headOverlayOffset??[0,0]));headOverlay=null;}
   if(l.operation==='source-over'){ctx.save();if(l.mirrorX){ctx.translate(w,0);ctx.scale(-1,1);}let tile=paletteImage(l);
    if(l.occludedBy){
     // Ownership comes from this weapon's authored alpha, never from a coat pair.
     const c=makeCanvas(w,h),cx=c.getContext('2d');cx.drawImage(tile,0,0);const pixels=cx.getImageData(0,0,w,h);
     cx.clearRect(0,0,w,h);cx.drawImage(image(l.occludedBy),0,0);const ownership=cx.getImageData(0,0,w,h).data;
     for(let p=0;p<pixels.data.length;p+=4)if(ownership[p+3])pixels.data.fill(0,p,p+4);
     cx.putImageData(pixels,0,0);tile=c;
    }
    const ramp=l.skinOnly&&root.MareAppearance96?.skins[appearance.skin||appearance.skinColor]?.ramp;
    if(ramp){const c=makeCanvas(w,h),cx=c.getContext('2d');cx.drawImage(tile,0,0);const d=cx.getImageData(0,0,w,h),api=root.MareAppearance96;d.data.set(api.recolor(d.data,root.MareNativeSkinHD.mask(d.data,w,'anatomy'),ramp));cx.putImageData(d,0,0);tile=c;}
    ctx.drawImage(tile,...(l.offset??[0,0]));ctx.restore();}
   else if(l.operation==='replace-rgba-under-mask'){
    if((hiddenSlots.length||recolored)&&l.role!=='authored-hand-and-orb')continue; // never reintroduce authored head pixels into a dynamic head composition
    const scratch=makeCanvas(w,h),sc=scratch.getContext('2d');sc.drawImage(image(l),0,0);let patch=sc.getImageData(0,0,w,h).data;
    if(l.skinFromAnatomy){
     const ramp=root.MareAppearance96?.skins[appearance.skin||appearance.skinColor]?.ramp;
     if(ramp){
      const anatomy=r.basePack.pack.directions[r.direction].layers.find(layer=>layer.id==='skin-arms-phase'&&layer.binding.kind==='fixed');
      const anatomyURL=r.basePack.images[anatomy.frames[Number(s.state)]];
      sc.clearRect(0,0,w,h);sc.drawImage(image({url:anatomyURL}),0,0);
      const source=sc.getImageData(0,0,w,h).data;
      const ownership=new Uint8Array(w*h);
      // Only pixels matching the original arm are proven skin here.
      for(let i=0;i<patch.length;i+=4)if(patch[i+3]&&source[i+3]===patch[i+3]&&
       Math.abs(source[i]-patch[i])<=1&&Math.abs(source[i+1]-patch[i+1])<=1&&Math.abs(source[i+2]-patch[i+2])<=1)
        ownership[i/4]=root.MareNativeSkinHD.tone(patch[i],patch[i+1],patch[i+2]);
      patch=root.MareAppearance96.recolor(patch,ownership,ramp);
     }
    }
    sc.clearRect(0,0,w,h);sc.drawImage(image(l.mask),0,0);const mask=sc.getImageData(0,0,w,h).data,out=ctx.getImageData(0,0,w,h);for(let i=0;i<out.data.length;i+=4)if(mask[i]>0)out.data.set(patch.subarray(i,i+4),i);ctx.putImageData(out,0,0);
   }else throw Error('Unsupported atomic operation');
  }
  if(headOverlay)ctx.drawImage(headOverlay,...(r.headOverlayOffset??[0,0]));
  if(!hiddenSlots.length&&!recolored&&s.canvasRoundingPatch?.length){const out=ctx.getImageData(0,0,w,h);for(const [pixel,red,green,blue,alpha] of s.canvasRoundingPatch){const i=pixel*4;out.data[i]=red;out.data[i+1]=green;out.data[i+2]=blue;out.data[i+3]=alpha;}ctx.putImageData(out,0,0);}
  if(r.orderedDaggerHair||r.orderedDaggerIris||r.dagger13SouthIris){
   if(w!==640||h!==640||recolored||hiddenSlots.length||renderOffset.some(Boolean))throw Error('Invalid ordered dagger appearance authority');
   const changes=[];
   if(r.orderedDaggerHair){
    const reg=daggerHairAuthority[r.direction],ramp=root.MareCharacterAppearance?.hairs?.[r.orderedDaggerHair]?.ramp;
    if(!reg||!ramp)throw Error('Invalid saved dagger hair color');
    const source=images.get(daggerHairPath(reg.source)),mask=images.get(daggerHairPath(reg.mask));
    if([source,mask].some(i=>!i||i.width!==640||i.height!==640))throw Error('Missing dagger hair source');
    const get=im=>{const t=makeCanvas(640,640),c=t.getContext('2d');c.drawImage(im,0,0);const px=c.getImageData(0,0,640,640).data;t.width=t.height=1;return px;};
    const orig=get(source),own=get(mask),out=ctx.getImageData(0,0,640,640).data;let count=0;
    for(let y=0;y<640;y++)for(let x=0;x<640;x++)if(own[(y*640+x)*4]){
     const x0=x;
     while(x<640&&own[(y*640+x)*4])x++;
     const start=x0+reg.x,row=y+reg.y;
     if(start<0||x+reg.x>640||row<0||row>=640)throw Error('Dagger hair outside verified raster');
     const patch=ctx.createImageData(x-x0,1);
     for(let pos=x0;pos<x;pos++){
      const s=(y*640+pos)*4,t=(row*640+pos+reg.x)*4,b=(pos-x0)*4,c=ramp[own[s]-1];
      if(!c||own[s+3]!==255||orig[s+3]!==255||[0,1,2,3].some(j=>orig[s+j]!==out[t+j]))throw Error('Dagger hair no longer matches author pixels');
      const rgb=parseInt(c.slice(1),16);patch.data.set([rgb>>>16,(rgb>>>8)&255,rgb&255,255],b);count++;
     }
     changes.push({p:patch,a:start,b:row});
    }
    if(count!==(reg.count??4040))throw Error('Unexpected number of dagger hair samples');
   }
   if(r.orderedDaggerIris||r.dagger13SouthIris){
    const south=!!r.dagger13SouthIris,api=root.MareReworkModularOutfitsHD;
    const points=south?api?.southIrisSamples?.():api?.sideIrisSamples?.(r.direction),ramp=root.MareCharacterAppearance?.eyes?.[r.dagger13SouthIris??r.orderedDaggerIris]?.ramp;
    if(!points||points.length!==(south?45:18)||!ramp)throw Error('Invalid ordered dagger iris authority');
    const dx=south?0:r.direction==='east'?56:72,dy=south?0:68;
    for(const [x,y,R,G,B,A,tone] of points){
     const a=x+dx,b=y+dy,p=ctx.getImageData(a,b,1,1),color=ramp[tone-1];
     if(p.data[0]!==R||p.data[1]!==G||p.data[2]!==B||p.data[3]!==A||!color)throw Error(south?'South dagger iris no longer matches author pixels':'Dagger iris no longer matches author pixels');
     const rgb=parseInt(color.slice(1),16);p.data[0]=rgb>>>16;p.data[1]=(rgb>>>8)&255;p.data[2]=rgb&255;changes.push({p,a,b});
    }
   }
   for(const {p,a,b} of changes)ctx.putImageData(p,a,b);
  }
  return {width:w,height:h,density:4,pivot:{x:r.pivot[0]*4+renderOffset[0],y:r.pivot[1]*4+renderOffset[1]},source:r.id,state:s.state,frames:r.states.length,timeline:r.timeline,fps:r.fps,physicalScale:1,hairSeparated:r.hairSeparated,roundingCorrection:!r.separableAttack&&!hiddenSlots.length&&!recolored,roundingTolerance:r.separableAttack||hiddenSlots.length?1:0};}finally{ctx.restore();}
 }
 return {resolve,resolveSeparable,approvedSouth,requiredFiles,render};
}
const api={create};root.MareReworkWeaponNativeHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
