const path=require('node:path'),fs=require('node:fs'),a=require('node:assert/strict'),R=path.dirname(__dirname),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance')),B=global.MareAppearance96;
const api=make();
// Same provider with only this patch's two palette guards restored to black/green.
function priorPaletteProvider(){
 const original=fs.readFileSync(path.join(R,'player-rework-native-hd.js'),'utf8');
 const style="Object.hasOwn(root.MareAppearance96?.hairs||{},a.hairColor)&&Object.hasOwn(root.MareCharacterAppearance?.hairs||{},a.hairColor)&&\n     Object.hasOwn(root.MareCharacterAppearance?.eyes||{},a.eyeColor)&&";
 const material="material.hairColor!==a.hairColor||material.eyeColor!==(blue?null:a.eyeColor)||material.skinColor!==a.skin";
 a.equal(original.split(style).length,2);
 a.equal(original.split(material).length,2);
 const code=original.replace(style,"a.hairColor==='black'&&a.eyeColor==='green'&&").replace(material,"material.hairColor!=='black'||material.eyeColor!=='green'||material.skinColor!==a.skin");
 const m={exports:{}},currentGlobal=global.MareReworkNativeHD;
 try{new Function('module','require',code)(m,require);}finally{global.MareReworkNativeHD=currentGlobal;}
 return m.exports.create({fetchJSON:async f=>{const p=path.join(R,f);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')));},loadImage:require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),makeCanvas:cv.createCanvas});
}
const current=priorPaletteProvider(),sides=['east','west'],base={gender:'feminino',hairStyle:'original',eyeStyle:'original',skinStyle:'natural'},appearance=(hairColor,eyeColor,skinColor)=>({...base,hairColor,eyeColor,skinColor});
const hair=Object.keys(A.hairs).filter(k=>Object.hasOwn(B.hairs,k)),eye=Object.keys(A.eyes),okEye=eye,skins=Object.keys(A.skins);
const input=(coat,look)=>JSON.parse(JSON.stringify(A.commit({id:'isolated',classId:'brawler',equipment:coat?{coat:{def:coat}}:{}},look,()=>true)));
const strip=x=>{const {id,profileNeckRestore,...rest}=x.femaleNamedHairRecord;return {...x,id:x.id.replace(/:authored-(east|west)-neck$/,''),femaleNamedHairRecord:{...rest,id:id.replace(/:authored-(east|west)-neck$/,'')}};};
(async()=>{await api.ready;await current.ready;console.log({hair,eye,okEye,skins});let checked=0;
for(const direction of sides){
 const o={action:'walk',direction,consumer:'world'},D=r=>r.pack.directions[direction];
 for(const h of hair)for(const e of eye)for(const skin of skins){
  const look=appearance(h,e,skin),worn=[6,7].map(coat=>current.selectVisual(input(coat,look),o));
  for(const x of worn){a(x?.hdKind==='outfit');a.equal(x.femaleNamedHairRecord.hairColor,h);a.equal(x.femaleNamedHairRecord.eyeColor,e==='blue'?null:e);a.equal(x.femaleNamedHairRecord.skinColor,skin);}
  const route=[null,6,7].map(coat=>api.selectVisual(input(coat,look),o));
  const [bare,p,q]=route;a(bare.id.startsWith('female-coat67-'+direction+'-own-bare-v1'));
  for(const x of route){const h=x.femaleNamedHairRecord;a(h.profileNeckRestore&&!h.profileNeckBridge);a.deepEqual([h.hairColor,h.eyeColor,h.skinColor],[look.hairColor,look.eyeColor,look.skinColor]);}
  for(const [i,x] of [p,q].entries()){
   a.deepEqual(D(bare).layers,D(x).layers.filter(l=>l.id.startsWith('base:')));
   a.deepEqual(x.baseMaterialSources,bare.baseMaterialSources);
   const props=x=>{const{id,...r}=x.femaleNamedHairRecord;return r};
   a.deepEqual(props(bare),props(x));
   if(e==='blue'){a(x.femaleNamedHairRecord.registeredBlueIris);continue;}
   const before=worn[i];if(before.femaleNamedHairRecord.profileNeckRestore)a.deepEqual(x,before);else a.deepEqual(strip(x),before);
  }
  checked+=3;
 }
 for(const look of [{...appearance('blonde','amber','ebony'),hairStyle:'hair-bob'},{...appearance('silver','violet','porcelain'),eyeStyle:'face-calm'},appearance('original','original','original')]){
  for(const coat of [null,6,7]){const p={appearance96:look,equipment:coat?{coat:{def:coat}}:{}};const x=api.selectVisual(p,o);a(!x?.id.includes('-own-bare-v1')&&!x?.id.endsWith(':authored-'+direction+'-neck'));a.deepEqual(x,current.selectVisual(p,o));}
 }
 for(const [h,e] of [['blonde','amber'],['silver','violet']]) {const q=api.selectVisual(input(null,appearance(h,e,'ebony')),o);console.log(direction,[h,e],q.id);}
}
a.equal(checked,2880);console.log('saved visible states exact/authorized',checked);
})().catch(e=>{console.error(e);process.exitCode=1});
