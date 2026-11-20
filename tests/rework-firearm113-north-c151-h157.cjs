const P=require('node:path'),a=require('node:assert/strict'),R=P.dirname(__dirname);
const {make,cv}=require(P.join(R,'tests/rework-integration-support.cjs'));
const A=require(P.join(R,'character-appearance.js')),load=require(P.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make(),json=f=>require(P.join(R,f));
const registry=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{
 appearanceRegistry:global.MareFemaleNamedHairHD.create(json('tools/rework-accessories/head-layer-index.json'),json('tools/rework-accessories/female-original-face-ownership.json'),
 {baseRegistry:global.MareReworkBaseHD.create(json('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas}),makeCanvas:cv.createCanvas});
const o={direction:'north',action:'attack-firearm',consumer:'world'},I=def=>({def});
const actor=(e,look)=>JSON.parse(JSON.stringify(A.commit({id:'same',classId:'gunner',equipment:{weapon:I(113),...e}},{gender:'feminino',...look},()=>true)));
const look=[{skinColor:'light',hairColor:'brown',eyeColor:'brown'},{skinColor:'ebony',hairColor:'black',eyeColor:'green'}];
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const from=f=>cv.createCanvas(f,f);
const cache=new Map();
async function images(r,frame){
 const refs=registry.requiredFiles(r,{frame}),map=new Map();
 for(const n of refs){if(!cache.has(n))cache.set(n,await load(n));map.set(n,cache.get(n));}return map;
}
async function art(r,f){
 const sz=640,cn=from(sz),wr=from(sz),cr=from(sz),wx=wr.getContext('2d'),cx=cr.getContext('2d');
 let head,ordinary=[],weaponFound=0,coatFound=0;
 registry.render(cn.getContext('2d'),r,await images(r,f),{frame:f,captureOps({op,canvas}){
  const gear=!!op.part,coat=op.layer?.id.startsWith('coat151-');
  if(gear||weaponFound){if(gear)weaponFound++;wx.globalCompositeOperation=gear?'source-over':'destination-out';wx.drawImage(canvas,0,0);}
  if(coat||coatFound){if(coat)coatFound++;cx.globalCompositeOperation=coat?'source-over':'destination-out';cx.drawImage(canvas,0,0);}
  const rgb=pix(canvas);if(op.layer?.slot==='headBase')head=rgb;else ordinary.push(rgb);
  canvas.width=1;
 }});
 a.equal(weaponFound,r.states[f].parts.length);a.equal(coatFound,r.northFirearmCoatSources?4:0);
 const x={head,ordinary,weapon:pix(wr),coat:pix(cr),full:pix(cn)};cn.width=wr.width=cr.width=1;return x;
}
const draw=(prepared,p,f)=>{let c;a(prepared.draw({save(){},restore(){},drawImage(t){c=t;}},p,{...o,progress:(f+.25)/8}));return pix(c);};
(async()=>{await api.ready;let n=0;for(const l of look){
 const withHead=actor({coat:I(151),head:I(157)},l),coatOnly=actor({coat:I(151)},l),headOnly=actor({head:I(157)},l);
 const save=JSON.stringify(withHead),hidden={...withHead,preferences:{...withHead.preferences,hideHeadgear:true}};
 const r=api.selectVisual(withHead,o),c=api.selectVisual(coatOnly,o),g=api.selectVisual(headOnly,o);
 a(r?.northFirearmCoatSources&&r.material.gearRecord.item===157,'Missing C151+H157 Save route');a(c&&g);
 for(const k of ['pack','states','colorAppearance','northFirearmCoatSources','northFirearmHeadRecoil','northFirearmVisibleSkin','baseRecord'])a.deepEqual(r[k],c[k],k);
 a.deepEqual(r.material,g.material);a.deepEqual(api.selectVisual(hidden,o),c);a.deepEqual(api.selectVisual({...hidden,preferences:{hideHeadgear:false}},o),r);
 a.equal(r.material.skinColor,l.skinColor);a.equal(r.material.eyeColor,l.eyeColor);a.equal(r.material.hairColor,l.hairColor);a.equal(r.material.style,'original');a.equal(JSON.stringify(withHead),save);
 a.deepEqual(r.northFirearmHeadRecoil,[0,0,0,0,9,0,0,0]);
 const isClaim=x=>x?.northFirearmCoatSources&&x?.material?.gearRecord;
 for(const [e,options,patchLook] of [
  [{weapon:I(114)},o,{}],[{weapon:{def:113,variant:'other'}},o,{}],[{legs:I(154)},o,{}],[{head:I(129)},o,{}],[{coat:I(158)},o,{}],
  [{head:{def:157,variant:'other'}},o,{}],[{coat:{def:151,variant:'other'}},o,{}],[{}, {...o,direction:'south'},{}],[{}, {...o,action:'walk'},{}],
  [{},o,{hairStyle:'hair-bob'}]
 ])a(!isClaim(api.selectVisual(actor({coat:I(151),head:I(157),...e},{...l,...patchLook}),options)));
 if(process.env.SELECT_ONLY==='1')continue;
 const material=r.material, own=material.gearRecord, dir=r.pack.directions.north;
 const gearLayer=own.layers.find(x=>x.id===own.headgearPolicy.gearId);
 const helmet=await load('tools/rework-accessories/assets/'+gearLayer.source+'.png');
 const hairImages=await Promise.all(material.ownership.attackLayers.filter(x=>x.slot==='hair').map(x=>load('tools/rework-base-hd/assets/'+x.source+'.png')));
 a(hairImages.length>0&&!material.fused);
 const offset=axis=>Math.round((dir.rest.NECK[axis]-own.rest.NECK[axis]+(own.adjustmentRecord.adjustment['gear'+axis.toUpperCase()]||0)+(own.headgearPolicy.headAdjustment?.[axis]||0))*4);
 a.deepEqual([offset('x'),offset('y')],[64,57]);
 const configs=await Promise.all([[withHead,r],[hidden,c],[coatOnly,c]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 for(let f=0;f<8;f++){
  const [x,y,z]=await Promise.all([art(r,f),art(c,f),art(g,f)]);
  a.deepEqual(x.ordinary,y.ordinary);a(x.head.equals(z.head));a(x.weapon.equals(y.weapon));a(x.coat.equals(y.coat));
  if([0,7].includes(f))a(x.weapon.some((v,i)=>i%4===3&&v===255));a(x.coat.some((v,i)=>i%4===3&&v===255));
  const full=draw(configs[0],withHead,f),off=draw(configs[1],hidden,f),base=draw(configs[2],coatOnly,f);
  a(full.equals(x.full));a(off.equals(base));a(base.equals(y.full));
  const hr=from(640),gr=from(640),rec=r.northFirearmHeadRecoil[f];
  for(const im of hairImages)hr.getContext('2d').drawImage(im,0,rec);gr.getContext('2d').drawImage(helmet,offset('x'),offset('y')+rec);
  const hair=pix(hr),hat=pix(gr);hr.width=gr.width=1;
  let changes=0,restored=0;
  for(let j=0;j<full.length;j+=4)if(full.readUInt32LE(j)!==off.readUInt32LE(j)){
   a(x.head[j+3]||y.head[j+3]);a(!x.coat[j+3]);a(hat[j+3]>0);changes++;if(hair[j+3]===255&&y.head[j+3]===255)restored++;
  }
  a(changes>0&&restored>0,'Must show helmet and restore pixels in the authored hair support');n++;
 }
 configs.forEach(x=>x.release());global.gc?.();
}
if(process.env.SELECT_ONLY!=='1')a.equal(n,16);
console.log('PASS two normalized Saves /',n,'Canvas C151+H157 frames');
})().catch(e=>{console.error(e);process.exitCode=1});
