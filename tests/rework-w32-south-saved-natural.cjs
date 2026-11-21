const a=require('assert/strict'),A=require('../character-appearance'),{make}=require('./rework-integration-support.cjs'),W=require('../tools/rework-weapon-layers-hd/index.json'),api=make();
const o={direction:'south',action:'attack-focus',consumer:'world'},r=W.records.find(r=>r.id==='daggers32-south-native-original-source');
const actor=(tone,opts={})=>JSON.parse(JSON.stringify(A.commit({id:'w32-south',classId:'healer',equipment:{weapon:{def:32}}},{gender:'masculino',skinColor:tone,...opts},()=>true)));
const draw=(x,f)=>{let q;a(api.draw({save(){},restore(){},drawImage(v){q=v}},x,{...o,progress:(f+.2)/8}));return Buffer.from(q.getContext('2d').getImageData(0,0,640,640).data);};
(async()=>{await api.ready;let n=0,neutral=[];for(const t of ['light',...Object.keys(A.skins).filter(k=>k!=='light')]){
 const x=actor(t),sav=JSON.stringify(x),v=api.selectVisual(x,o);a(v?.staff32SouthSkin,'W32 South missing: '+t);
 for(const k of ['fps','timeline','pivot','nativeCanvas'])a.deepEqual(v[k],r[k]);
 if(t==='light')a.deepEqual(v.states,r.states);else a(v.states.every(z=>z.layers.length===2&&z.layers[1].role==='fore'));
 a(await api.prepareClip(x,o));
 for(let f=0;f<8;f++){const out=draw(x,f);if(t==='light')neutral[f]=out;else{
  let diff=0;for(let i=0;i<out.length;i+=4){a.equal(out[i+3],neutral[f][i+3]);diff+=+(out.readUInt32LE(i)!==neutral[f].readUInt32LE(i));}a(diff>100);
 }n++;}
 const bad=[{...x,classId:'strategist'},{...x,equipment:{weapon:{def:32},coat:{def:151}}},{...x,equipment:{weapon:{def:32,variant:'other'}}},actor(t,{eyeStyle:'face-calm'})];for(const q of bad)a(!api.selectVisual(q,o)?.staff32SouthSkin);
 for(const opts of [{consumer:'portrait'},{direction:'north'},{action:'walk'},{weaponless:true}])a(!api.selectVisual(x,{...o,...opts})?.staff32SouthSkin);
 a.equal(JSON.stringify(x),sav);global.gc?.();
}a.equal(n,64);console.log('PASS64 ordinary W32 SOUTH world, unchanged own phases/ammo/alpha');})().catch(e=>{console.error(e);process.exit(1)});
