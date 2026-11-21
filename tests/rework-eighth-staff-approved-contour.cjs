'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
// Standalone test. In the repository: node --expose-gc tests/rework-eighth-staff-approved-contour.cjs
// Optional argv[2] names an alternate checkout root, useful when comparing staged builds.
const root=path.resolve(process.argv[2]||path.resolve(__dirname,'..'));
const IDX=require(root+'/tools/rework-weapon-layers-hd/index.json');
const approvedContourEast = [
 [[207711,38,50,73],[208351,40,53,74],[213419,116,68,48],[214058,15,8,8],[214113,10,7,8],[214698,25,22,22],[214753,7,6,6],[215337,29,29,34],[215338,40,37,39],[215393,8,2,1],[215976,16,15,23],[215977,33,35,43],[215978,35,37,42],[216033,26,10,5],[216034,122,68,49],[216617,36,40,48],[216618,34,37,45],[216673,42,17,9],[217257,37,43,53],[217313,42,18,12],[217897,35,41,54],[217953,38,18,14],[218537,36,42,55],[218593,33,15,12],[219816,34,40,58],[220456,33,39,59],[221096,30,35,53],[221736,30,34,48],[222376,29,34,48],[223016,30,34,47],[223656,31,34,47],[224296,32,35,48],[224936,32,36,51],[227497,26,30,40],[228137,27,29,38],[230058,10,13,17],[230698,17,21,28],[231338,28,31,43],[231978,31,35,53],[232618,30,35,57],[233258,31,37,59],[233898,30,38,59],[234537,29,35,57],[234538,29,35,58],[235177,28,34,58],[235178,26,32,57],[235817,28,34,58],[235818,25,32,56],[236458,24,32,55]],
 [[212778,87,47,36],[213417,15,8,9],[213418,31,17,14],[214057,24,20,22],[214058,11,7,8],[214696,22,19,25],[214697,41,39,41],[214698,17,14,15],[215336,21,23,33],[215337,42,43,49],[215338,14,13,15],[215976,23,27,40],[215977,40,44,53],[215978,13,15,19],[216616,31,37,50],[216617,40,44,56],[217256,34,38,53],[217257,40,44,54],[217896,35,38,54],[217897,39,43,54],[218536,35,39,53],[219176,34,38,50],[219816,33,37,48],[220456,30,32,42],[221096,25,29,37],[221736,24,28,37],[222376,25,29,39],[223016,25,29,40],[223656,25,29,41],[224296,24,28,41],[224936,24,29,43],[225576,24,29,43],[226216,23,28,42],[226856,23,27,42],[226857,14,16,25],[227496,25,29,43],[227497,17,18,26],[228137,17,17,25],[228777,17,17,25],[229417,16,16,24],[229418,5,4,7],[230057,18,18,28],[230058,7,6,11],[230697,25,25,37],[230698,13,13,19],[231337,29,29,43],[231338,20,20,29],[231977,29,30,45],[231978,24,23,37],[232617,28,30,44],[232618,27,28,41],[233257,27,28,42],[233258,27,29,42],[233897,28,29,43],[233898,24,28,43],[234537,28,29,46],[234538,25,26,43],[235177,27,29,48],[235178,24,27,45],[235817,27,30,49],[235818,24,28,48]],
 [[213418,39,17,14],[214058,21,11,11],[214059,35,17,13],[214697,31,21,22],[214698,32,25,27],[214699,2,1,2],[215337,34,31,35],[215338,43,40,43],[215976,12,10,19],[215977,32,34,43],[215978,39,41,46],[216617,35,39,47],[216618,35,39,46],[217257,36,42,53],[217258,33,37,46],[217897,36,43,57],[217898,32,39,48],[218537,37,44,59],[218538,33,40,50],[219177,38,45,62],[219816,35,43,64],[219817,38,47,62],[220456,35,42,61],[220457,33,41,54],[221096,33,38,56],[221097,29,33,46],[221736,34,37,52],[221737,31,31,42],[222376,33,37,51],[222377,30,31,39],[223016,32,37,49],[223017,29,30,37],[223656,30,34,47],[223657,27,29,36],[224296,29,35,47],[224297,25,28,36],[224936,30,36,49],[224937,24,26,35],[225576,30,36,51],[225577,24,27,37],[226216,32,37,52],[226217,26,29,38],[226856,31,38,54],[226857,25,29,39],[226858,7,10,16],[227496,31,36,52],[227497,26,28,39],[227498,7,11,16],[228137,24,27,37],[228138,8,10,16],[228778,7,10,14],[229418,5,9,13],[229419,11,4,5],[230058,7,10,15],[230059,6,5,5],[230698,14,17,22],[230699,2,5,7],[231338,24,27,35],[231339,6,9,12],[231978,28,34,48],[231979,9,14,22],[232618,27,34,53],[232619,13,15,28],[233258,30,36,55],[233259,16,19,31],[233898,31,37,58],[233899,21,26,41],[234537,31,37,58],[234538,29,35,59],[234539,27,32,50],[235177,31,37,59],[235178,29,34,61],[235179,29,34,54],[235817,30,36,61],[235818,27,33,59],[235819,27,34,56],[236458,26,33,56],[236459,26,32,55],[237099,26,31,51],[237739,27,32,52]],
 [[212779,120,64,45],[213419,97,55,42],[214058,17,10,9],[214059,35,20,16],[214698,22,19,19],[214699,12,9,9],[215337,16,14,19],[215338,40,38,40],[215339,21,19,19],[215977,21,21,30],[215978,41,40,46],[215979,18,18,22],[216617,23,25,36],[216618,39,41,51],[216619,18,19,26],[217257,28,33,46],[217258,38,41,53],[217897,32,36,51],[217898,36,40,53],[218537,33,35,51],[218538,37,41,53],[219177,31,35,49],[219817,30,35,48],[220457,29,34,46],[221097,27,30,42],[221737,25,29,40],[222377,26,29,42],[223017,27,31,43],[223657,27,31,43],[224297,27,31,44],[224937,27,31,43],[225577,26,32,45],[226217,27,32,47],[226857,28,32,47],[227497,26,29,44],[227498,21,20,28],[228137,24,26,39],[228138,23,21,29],[228778,23,21,29],[229418,23,21,28],[230058,21,20,28],[230059,9,7,11],[230698,21,21,30],[230699,10,10,15],[231338,26,27,38],[231339,15,16,22],[231978,29,32,45],[231979,21,23,32],[232618,30,33,48],[232619,24,26,39],[233258,30,32,48],[233259,28,30,43],[233898,28,31,48],[233899,27,32,46],[234538,29,32,51],[234539,25,29,46],[235178,29,32,52],[235179,26,29,48],[235818,28,32,54],[235819,24,29,49],[236458,28,32,55],[236459,24,29,50]],
 [[214058,33,15,11],[214059,56,30,20],[214698,24,15,15],[214699,2,0,2],[215337,24,21,24],[215338,28,25,28],[215977,22,25,32],[215978,35,34,42],[216617,26,31,40],[216618,34,37,48],[217257,30,37,48],[217258,33,38,50],[217897,30,37,52],[217898,34,38,50],[218537,31,36,53],[218538,34,38,52],[219177,32,38,56],[219817,32,39,57],[220457,31,38,55],[221097,27,33,47],[221737,27,29,41],[222377,28,30,39],[223017,28,31,39],[223657,27,29,38],[224297,27,28,38],[224937,28,30,39],[225577,29,30,42],[226217,29,31,43],[226857,31,32,42],[226858,20,21,27],[227497,31,30,41],[227498,21,21,28],[228137,33,31,43],[228138,20,20,27],[228778,19,21,26],[229418,19,21,27],[229419,0,0,4],[230058,20,20,28],[230059,0,3,7],[230698,20,21,31],[230699,2,7,11],[231338,24,27,39],[231339,6,12,16],[231978,30,34,50],[231979,13,20,26],[232618,31,36,56],[232619,19,24,36],[233258,30,37,56],[233259,23,28,43],[233898,29,38,57],[233899,26,33,48],[234538,29,37,59],[234539,27,35,55],[235178,28,36,58],[235179,29,36,60],[235818,28,34,57],[235819,28,35,59],[236458,26,32,56],[236459,24,31,55]],
 [[214058,67,39,29],[214697,17,9,10],[214698,10,5,5],[215337,24,19,20],[215338,10,7,8],[215976,16,15,22],[215977,31,29,32],[216616,23,25,34],[216617,33,34,40],[217256,29,36,46],[217257,32,36,45],[217896,31,37,50],[217897,32,37,46],[218536,33,38,50],[219176,34,38,50],[219816,33,38,49],[220456,30,35,44],[221096,27,29,39],[221736,27,29,37],[222376,27,29,37],[223016,28,30,39],[223656,28,31,41],[224296,26,30,42],[224936,24,29,43],[225576,25,29,44],[226216,27,31,47],[226856,27,31,48],[227496,26,30,47],[228136,26,29,48],[228137,16,19,31],[228776,25,29,46],[228777,18,20,32],[229417,19,21,32],[230057,19,21,33],[230058,4,4,8],[230697,20,23,32],[230698,6,8,12],[231337,22,25,37],[231338,10,13,19],[231977,26,30,43],[231978,20,21,31],[232617,27,31,47],[232618,23,26,42],[233257,26,30,47],[233258,25,29,47],[233897,26,30,46],[233898,27,34,49],[234537,27,31,49],[234538,26,33,51],[235177,28,32,51],[235178,25,30,51],[235817,27,33,52],[235818,24,30,50],[236457,27,33,56],[236458,24,30,52]],
 [[214059,85,46,33],[214698,18,13,12],[214699,6,1,1],[215337,28,24,26],[215338,23,23,24],[215977,27,30,39],[215978,31,32,36],[216616,16,17,30],[216617,32,37,47],[216618,29,34,41],[217257,33,40,51],[217258,29,35,45],[217897,34,41,55],[217898,31,36,48],[218537,36,43,60],[218538,33,40,52],[219177,37,46,63],[219817,35,44,60],[220457,31,40,55],[221097,28,35,48],[221737,29,30,41],[222377,29,30,39],[223017,29,29,37],[223657,26,28,36],[224297,25,27,37],[224937,24,27,36],[225577,25,29,37],[226217,26,30,39],[226857,27,31,41],[226858,11,14,20],[227497,29,32,42],[227498,11,14,21],[228137,29,32,43],[228138,12,15,21],[228777,28,31,42],[228778,12,16,21],[229418,12,15,21],[229419,4,1,5],[230058,16,19,25],[230059,3,4,7],[230698,17,20,28],[230699,2,5,8],[231338,19,24,33],[231339,3,9,14],[231978,24,30,41],[231979,6,13,19],[232618,25,32,48],[232619,10,16,27],[233258,26,34,52],[233259,14,22,36],[233897,27,32,52],[233898,28,35,54],[233899,19,28,45],[234537,29,35,55],[234538,28,34,57],[234539,23,32,52],[235177,29,36,59],[235178,28,33,58],[235179,27,34,57],[235817,29,35,59],[235818,27,32,57],[235819,28,33,56],[236458,26,31,54],[236459,25,31,54]],
 [[205151,41,20,15],[210912,24,29,43],[210913,8,1,1],[211553,13,5,4],[212193,20,10,12],[212833,18,8,11],[213473,11,5,6],[214059,44,23,16],[214698,24,15,13],[214699,13,6,6],[215338,34,27,26],[215339,19,14,15],[215977,15,15,21],[215978,40,36,40],[216617,21,24,34],[216618,40,40,48],[217257,33,38,50],[217258,38,42,51],[217314,123,72,46],[217897,34,39,55],[217898,38,42,52],[217954,121,70,44],[218537,33,39,52],[218594,112,65,44],[219177,34,39,52],[219234,93,57,42],[219817,33,37,51],[220457,31,36,47],[221097,29,34,46],[221737,30,34,44],[222377,31,34,45],[223017,32,36,47],[223657,31,37,48],[224297,31,37,49],[224937,31,37,50],[225577,32,38,51],[226217,34,39,53],[226857,34,39,55],[227497,30,34,50],[228137,23,27,44],[228138,24,25,34],[228778,25,26,37],[229418,26,27,37],[230059,11,11,15],[230699,12,15,20],[231339,17,20,27],[231979,27,29,41],[232619,28,34,48],[233259,27,35,49],[233898,27,34,52],[233899,28,36,52],[234538,29,35,55],[234539,27,35,55],[235178,29,35,56],[235179,26,32,54],[235818,29,36,58],[235819,26,32,54],[236458,30,36,61],[236459,26,32,56]]
];
const signedReferenceSetSHA = '9077e4f5cb86d685fdd90575739a366215c81f1dbd8041d3cd60de8179cd4ba2';
const {make,cv}=require(root+'/tests/rework-integration-support.cjs'),A=require(root+'/character-appearance'),load=require(root+'/tools/rework-hd-test-loader.cjs').create(root),api=make();
const src='tools/rework-weapon-layers-hd/';
const opts=(direction)=>({direction,action:'attack',consumer:'world'});
const save=(def,tone,look={},gear={weapon:{def}},cls=def<=124?'strategist':'healer')=>JSON.parse(JSON.stringify(A.commit({id:'discardable-side-qa',classId:cls,equipment:gear},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:tone,...look},()=>true)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pixel=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const opacity=async l=>{const c=cv.createCanvas(640,640),x=c.getContext('2d');const im=await load(src+l.url);if(l.mirrorX){x.translate(640,0);x.scale(-1,1);} x.drawImage(im,...(l.offset||[0,0]));const b=pixel(c);c.width=1;return b};
const lay=(f,id)=>f.layers.find(l=>l.id===id);
const owned=(r,item)=>r?.verifiedEighthStaffSideAttack===true&&r.item===item&&r.separableAttack===true&&r.orderedAttack===true;
async function geometry(old,current,item,d,n){
 assert.equal(old.state,String(n));assert.equal(current.state,old.state);assert.match(old.approvedReferenceSHA256,/^[a-f0-9]{64}$/);
 assert.equal(current.approvedReferenceSHA256,old.approvedReferenceSHA256);
 const ids=old.layers.map(l=>l.id);
 const sharedIds=current.layers.filter(l=>ids.includes(l.id)).map(l=>l.id);assert.deepEqual(sharedIds,ids);
 for(const id of ['gear','shorts']) {
  const oldL=lay(old,id),curL=lay(current,id);assert.deepEqual(curL,oldL);
  assert(curL&&curL.operation==='source-over');
 }
 const gear=lay(current,'gear');assert.match(gear.sha256,/^[a-f0-9]{64}$/);
 assert.equal(gear.url,'assets/'+gear.sha256+'.png');
 return [gear,lay(old,'shorts'),lay(old,'grip')];
}
(async()=>{await api.ready;let frames=0,grasp=0,metal=0,shorts=0,semialpha=0;
 const tones=Object.keys(A.skins);assert.equal(tones.length,8);
 const ids=[123,124,125,126,127], dirs=['east','west'];
 const reference=(item,d)=>IDX.orderedAttackProfiles.find(x=>x.id==='authored-ordered-'+item+'-'+d);
 assert.equal(sha(JSON.stringify(ids.flatMap(item=>dirs.flatMap(d=>reference(item,d).states.map(f=>[f.approvedReferenceSHA256,lay(f,'gear').sha256]))))),signedReferenceSetSHA);
 const swatch=cv.createCanvas(1,1),paint=swatch.getContext('2d');
 const N=global.MareReworkWeaponNativeHD.create(IDX,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas});
 for(const item of [123,124,125,126,127])for(const d of ['east','west']){
  const opt=opts(d),historical=reference(item,d);
  assert(historical&&historical.states.length===8);
  const imgs=new Map(await Promise.all(N.requiredFiles(historical).map(async k=>[k,await load(k)])));
  const p0=save(item,'light'),r0=api.selectVisual(p0,opt);assert(owned(r0,item));const neutralLook={...historical,colorAppearance:{}};
  assert(await api.prepareClip(p0,opt));
  const draw=(p,f)=>{let c;assert(api.draw({save(){},restore(){},drawImage(v){c=v}},p,{...opt,progress:(f+.1)/8}));assert(c);assert.equal(c.width,640);assert.equal(c.height,640);return pixel(c)};
  const base=[];
  for(let f=0;f<8;f++){
   const old=historical.states[f],[g,s,h]=await geometry(old,r0.states[f],item,d,f);
   const [gb,sb,hb]=await Promise.all([g,s,h].map(opacity));const neutral=cv.createCanvas(1,1),meta=N.render(neutral.getContext('2d'),neutralLook,imgs,{frame:f});
   assert.equal(meta.state,String(f));assert.deepEqual(meta.pivot,{x:320,y:512});
   const oldRGBA=pixel(neutral);neutral.width=1;
   const noGrip={...neutralLook,states:neutralLook.states.map((v,i)=>i===f?{...v,layers:v.layers.filter(l=>l.id!=='grip')}:v)};
   const inactive=cv.createCanvas(1,1);N.render(inactive.getContext('2d'),noGrip,imgs,{frame:f});const noGripRGBA=pixel(inactive);inactive.width=1;
   // Exact protected opaque sample only if original composite equals its source.
   // For semialpha, compare the source layer (its entire identity/properties,
   // including those pixels). The final color can change due to changed backing.
   const ownedM=[],ownedS=[],grip=[];
   for(let p=0;p<gb.length;p+=4){
    const raw=oldRGBA.readUInt32LE(p);
    if(gb[p+3]===255&&gb.readUInt32LE(p)===raw&&hb[p+3]===0)ownedM.push(p);
    if(sb[p+3]===255&&sb.readUInt32LE(p)===raw&&gb[p+3]===0&&hb[p+3]===0)ownedS.push(p);
    if(hb[p+3]>0&&gb[p+3]>0&&noGripRGBA.readUInt32LE(p)!==raw)grip.push(p);
    if(gb[p+3]>0&&gb[p+3]<255)semialpha++;
   }
   assert(ownedM.length>0&&ownedS.length>100&&grip.length>0,`no witness ${item}/${d}/${f}: ${ownedM.length}/${ownedS.length}/${grip.length}`);
   base.push({ref:draw(p0,f),oldRGBA,ownedM,ownedS,grip});
  }
  const ir=global.MareReworkModularOutfitsHD.sideIrisSamples(d);assert.equal(ir.length,18);
  const checks=ir.map(([x,y,,,,alpha,rank])=>{const n=parseInt(A.eyes.blue.ramp[rank-1].slice(1),16);return [((y+64)*640+x+64)*4,((alpha<<24)|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0];});
  const serial=[];
  for(const sk of tones){
   const p=save(item,sk), frozen=JSON.stringify(p),r=api.selectVisual(p,opt);
   assert.equal(p.appearance96.skinColor,sk);assert.equal(p.appearance96.hairColor,'black');assert.equal(p.appearance96.eyeColor,'blue');
   assert(owned(r,item),`missing own real World route ${item}/${d}/${sk}`);
   assert.equal(Boolean(r.staffLateralPalette),sk!=='light');
   assert.equal(r.fps,12);assert.equal(r.contactTick,4);assert.deepEqual(r.timeline,historical.timeline);assert.deepEqual(r.pivot,[80,128]);
   assert(await api.prepareClip(p,opt));let changes=0;
   for(let f=0;f<8;f++){
    await geometry(historical.states[f],r.states[f],item,d,f);
    const actual=draw(p,f),b=base[f];
    for(let k=3;k<actual.length;k+=4)assert.equal(actual[k],b.ref[k],`alpha drift ${item}/${d}/${sk}/${f}/${k}`);
    for(const [k,value] of checks)assert.equal(actual.readUInt32LE(k),value,`strict default iris ${item}/${d}/${sk}/${f}/${k}`);
    for(const k of b.ownedM)assert.equal(actual.readUInt32LE(k),b.oldRGBA.readUInt32LE(k),`shaft repaint ${item}/${d}/${sk}/${f}/${k}`);
    for(const k of b.ownedS)assert.equal(actual.readUInt32LE(k),b.oldRGBA.readUInt32LE(k),`shorts repaint ${item}/${d}/${sk}/${f}/${k}`);
    const pChange=b.grip.filter(k=>actual.readUInt32LE(k)!==b.ref.readUInt32LE(k)).length;
    if(sk!=='light')assert(pChange>0,`untinted own closed grip ${item}/${d}/${sk}/${f}`);
    if(sk!=='light')for(const [p,R,G,B] of approvedContourEast[f]){
     const x=p%640,y=Math.floor(p/640),k=(640*y+(d==='east'?x:639-x))*4,a=actual[k+3];
     assert(a,'approved contour pixel became transparent');
     const out=paint.createImageData(1,1);out.data.set([R,G,B,a]);paint.putImageData(out,0,0);
     assert.equal(actual.readUInt32LE(k),Buffer.from(paint.getImageData(0,0,1,1).data).readUInt32LE(),`approved contour color ${item}/${d}/${sk}/${f}/${k}`);
    }
    serial.push(sha(actual));changes+=pChange;grasp+=pChange;metal+=b.ownedM.length;shorts+=b.ownedS.length;frames++;
   }
   assert.equal(JSON.stringify(p),frozen);
   for(const q of [save(item,sk,{hairStyle:'hair-bob'}),save(item,sk,{eyeStyle:'face-focused'}),save(item,sk,{}, {weapon:{def:item},coat:{def:179}}),save(item,sk,{}, {weapon:{def:item,variant:'special'}}),save(item,sk,{}, {weapon:{def:item}},item<=124?'healer':'strategist')])assert(!owned(api.selectVisual(q,opt),item));
   for(const patch of [{direction:'north'},{direction:'south'},{weaponless:true},{consumer:'portrait'},{action:'walk'}])assert(!owned(api.selectVisual(p,{...opt,...patch}),item));
   console.log('PASS',item,d,sk,'eight phases; changed owned contact',changes);global.gc?.();
  }
  assert.equal(serial.length,tones.length*8);
 }
 assert.equal(frames,640);assert(grasp&&metal&&shorts&&semialpha);console.log(JSON.stringify({frames,grasp,metal,shorts,semialpha}));
})().catch(e=>{console.error(e);process.exitCode=1});
