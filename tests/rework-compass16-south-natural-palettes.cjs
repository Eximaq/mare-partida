'use strict';
const a=require('node:assert/strict'),C=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance');
const o={direction:'south',action:'attack-focus',consumer:'world'};
const save=(tone,eq={weapon:{def:16}},cl='strategist',look={})=>A.commit({id:'w16-south',classId:cl,equipment:eq},{skinColor:tone,...look},()=>true);
const hash=b=>C.createHash('sha256').update(b).digest('hex');
const light=["b2c41c2858be218a2ac3e7c480911195bba8452dc8d7afb6b916de8e60687105", "260055c18f0d19678ad85c6d4fbc2b188c731dfdf562032dedf016383afe0114", "a4f82852a6dbda5fc98897891aaf514d48956f0208d8649f2559de9d641278ff", "6a5b636d89c04be999e08e41734234823ed1682495ca45dc35c20b82172fdca0", "2b303fa3c1f457f2dc412bc7670cae6b23e0eee67756dd67029c29408b20b3d7", "bae7b1e0f812bc31be9b9acf7011aa3e9f212beeb664036ce391dbb9dc067c10", "e0aef36e5eabe0a13d9eabb8c82b0b6d74c42a48d5998788e215731cb32c57fe", "291ac7cc6624e9e1bf85cfdb62377dbf24adb77dd75165caf7490728c9fe94e1"];
const metalCore=[[[235255,235266],[235894,235907],[236534,236548],[237173,237188],[237813,237829],[238452,238470],[239092,239110],[239731,239750],[240371,240389],[241011,241029],[241652,241669],[242292,242309],[242932,242948],[243572,243587],[244214,244226],[244855,244865],[245497,245498]],[[206445,206446],[207081,207088],[207717,207729],[208356,208371],[208995,209011],[209635,209651],[210274,210290],[210913,210930],[211553,211570],[212193,212210],[212834,212849],[213474,213489],[214114,214128],[214755,214768],[215396,215407],[216037,216047],[216678,216679]],[[157754,157763],[158394,158403],[159034,159035],[159041,159044],[160957,160962],[161597,161602],[162237,162243],[162879,162883],[163520,163524],[164160,164164],[164800,164805],[165441,165446],[166082,166087],[166723,166728],[167365,167369],[168006,168010],[168649,168650]],[[171845,171846],[172482,172490],[173118,173135],[173758,173776],[174397,174416],[175037,175057],[175676,175698],[176316,176338],[176955,176979],[177595,177619],[178234,178259],[178874,178899],[179513,179539],[180153,180179],[180792,180819],[181432,181459],[182072,182099],[182712,182739],[183353,183378],[183993,184018],[184633,184657],[185273,185297],[185913,185936],[186554,186576],[187195,187215],[187837,187855],[188478,188493],[189119,189131],[189763,189769],[190406,190407]],[[162249,162250],[162881,162893],[163520,163535],[164159,164178],[164799,164819],[165438,165460],[166077,166100],[166716,166741],[167355,167382],[167994,168023],[168634,168663],[169273,169303],[169912,169943],[170552,170583],[171192,171224],[171832,171864],[172472,172504],[173112,173144],[173752,173784],[174392,174424],[175032,175063],[175672,175703],[176312,176343],[176952,176983],[177593,177622],[178234,178262],[178874,178902],[179515,179541],[180156,180180],[180797,180818],[181437,181457],[182078,182096],[182720,182735],[183362,183372],[184004,184010],[184646,184647]],[[168004,168005],[168641,168648],[169277,169292],[169916,169933],[170555,170574],[171195,171215],[171834,171856],[172473,172497],[173112,173137],[173751,173777],[174390,174417],[175030,175057],[175669,175698],[176308,176338],[176947,176978],[177587,177618],[178227,178258],[178868,178897],[179508,179537],[180148,180176],[180788,180816],[181428,181456],[182069,182095],[182709,182735],[183349,183374],[183990,184013],[184631,184652],[185272,185291],[185913,185930],[186554,186569],[187196,187207],[187838,187845],[188479,188484],[189121,189122]],[[209631,209632],[210269,210279],[210906,210920],[211544,211561],[212183,212202],[212823,212843],[213462,213483],[214101,214123],[214740,214763],[215380,215403],[216019,216043],[216659,216683],[217299,217323],[217940,217962],[218580,218601],[219220,219241],[219861,219880],[220502,220519],[221143,221157],[221784,221796],[222426,222434],[223068,223073],[223710,223711]],[[234615,234626],[235254,235267],[235894,235908],[236533,236548],[237173,237189],[237812,237830],[238452,238470],[239091,239110],[239731,239749],[240371,240389],[241012,241029],[241652,241669],[242292,242308],[242932,242947],[243574,243586],[244215,244225],[244857,244858]]];
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const capture=(actor,i)=>{let c;a(api.draw({save(){},restore(){},drawImage(s){c=s;}},actor,{...o,progress:(i+.25)/8}));a.equal(c.width,640);return c;};
(async()=>{
 await api.ready;
 const neutral=save('light'),r=api.selectVisual(neutral,o);
 a(r?.approvedFocusSouth&&!r.compass16SouthSkin);
 a(await api.prepareClip(neutral,o));
 const original=r.timeline.map((_,i)=>px(capture(neutral,i)));a.deepEqual(original.map(hash),light);
 let count=8;const board=cv.createCanvas(2400,700),g=board.getContext('2d');
 g.fillStyle='#304355';g.fillRect(0,0,2400,700);
 if(process.env.PREVIEW_OUT)for(let f=0;f<8;f++)g.drawImage(capture(neutral,f),157,150,300,350,300*f,0,300,350);
 for(const tone of Object.keys(A.skins).filter(s=>s!=='light')){
  const actor=save(tone),q=api.selectVisual(actor,o);a(q?.approvedFocusSouth&&q.compass16SouthSkin,tone);
  a.equal(q.fps,12);a.deepEqual(q.pivot,[80,128]);a.deepEqual(q.timeline,r.timeline);
  a(await api.prepareClip(actor,o));const fingerprints=new Set();
  for(let f=0;f<8;f++){
   const c=capture(actor,f),b=px(c),old=original[f];fingerprints.add(hash(b));let changed=0;
   a.equal(q.states[f].approved.sha256,r.states[f].approved.sha256);
   a.deepEqual(q.states[f].layers.map(x=>[x.role,x.depth,x.operation]),[['body',0,'source-over'],['authored-compass-contact',1,'source-over']]);
   for(let i=0;i<b.length;i+=4){
    a.equal(b[i+3],old[i+3],tone+' F'+f+' RGBA byte '+i);
    if(b.readUInt32LE(i)!==old.readUInt32LE(i))changed++;
   }
   for(const [first,last] of metalCore[f])a(b.subarray(4*first,4*last).equals(old.subarray(4*first,4*last)),tone+' F'+f+' protected metal '+first);
   a(changed>2000);count++;
   if(tone==='ebony'){g.drawImage(c,157,150,300,350,300*f,350,300,350);}
  }
  a.equal(fingerprints.size,8);
 }
 for(const t of [{consumer:'portrait'},{action:'idle'},{direction:'north'},{weaponless:true},{variant:'different'}])a(!api.selectVisual(save('ebony'),{...o,...t})?.compass16SouthSkin,JSON.stringify(t));
 for(const q of [save('ebony',{weapon:{def:32}}),save('ebony',{weapon:{def:16,variant:'other'}}),save('ebony',{weapon:{def:16},boots:{def:9}}),save('ebony',undefined,'healer'),save('ebony',undefined,'strategist',{eyeColor:'green'})])a(!api.selectVisual(q,o)?.compass16SouthSkin);
 a.equal(count,64);
 if(process.env.PREVIEW_OUT){
  require('node:fs').writeFileSync(process.env.PREVIEW_OUT,board.toBuffer('image/png'));
 }
 console.log('PASS 64 ordinary saved Compasso 16 South draws, original light exact, restricted selector, cadence and alpha guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
