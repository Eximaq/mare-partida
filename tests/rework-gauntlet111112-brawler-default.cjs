'use strict';
const ad=require('node:assert/strict'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),old=make(),A=require(R+'/character-appearance');
if(process.env.CANDIDATE)global.MareReworkWeaponNativeHD=require(p.resolve(process.env.CANDIDATE,'player-rework-weapon-native-hd'));
const api=make(),M=global.MareReworkModularOutfitsHD,load=require(R+'/tools/rework-hd-test-loader.cjs').create(R);
const h={east:'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a',west:'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1'};
const o=(d,a='attack-unarmed')=>({direction:d,action:a,consumer:'world'});
const actor=(i,look={},classId='brawler',extras={})=>JSON.parse(JSON.stringify(A.commit({id:'true-save',classId,equipment:{weapon:{def:i},...extras}},look,()=>true)));
(async()=>{await Promise.all([api.ready,old.ready]);let checked=0;
for(const item of [111,112]) for(const d of ['east','west']){
 const brown=actor(item,{hairColor:'brown',eyeColor:'brown'}),saved=actor(item),memo=JSON.stringify(saved),options=o(d);
 const r=api.select(saved,options),b=api.select(brown,options);
 ad(r?.ownedGauntletSide);ad(b?.separableAttack&&!b.ownedGauntletSide);
 ad.deepEqual(r.states,b.states);ad.deepEqual(r.timeline,b.timeline);ad.deepEqual(r.equipmentContract,{weapon:item});ad.deepEqual(r.pivot,[80,128]);ad.equal(r.fps,12);
 for(const tone of ['ebony','porcelain'])ad(api.select(actor(item,{skinColor:tone}),options)?.ownedGauntletSide);
 for(const q of [actor(item,{hairColor:'silver'}),actor(item,{eyeColor:'green'}),actor(item,{hairStyle:'none'}),actor(item,{eyeStyle:'face-focused'}),actor(item,{},'cyborg'),actor(item,{},'rogue'),actor(item,{},'brawler',{weapon:{def:item,variant:'other'}}),actor(item,{},'brawler',{coat:{def:137}}),actor(item,{},'brawler',{head:{def:157}})]){
  ad(!api.select(q,options)?.ownedGauntletSide,JSON.stringify(q));if(process.env.CANDIDATE)ad.deepEqual(api.select(q,options),old.select(q,options));
 }
 for(const row of [o(d,'attack-tech'),o(d,'attack-focus'),o(d,'walk'),o('north'),o('south')])ad(!api.select(saved,row)?.ownedGauntletSide);
 ad.equal(api.select(saved,o(d,'attack')).id,r.id);
 if(process.env.SELECT_ONLY)continue;
 const ink=cv.createCanvas(640,640).getContext('2d');
 ink.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+h[d]+'.png'),0,0);const hm=ink.getImageData(0,0,640,640).data;
 const targets=new Map();
 for(let v=0;v<hm.length;v+=4)if(hm[v])targets.set(v/4+1280,['hair',hm[v]]);
 ad.equal(targets.size,4040);
 for(const [x,y,rr,gg,bb,aa,t] of M.sideIrisSamples(d)){const n=(y+66)*640+x+64;ad(!targets.has(n));targets.set(n,['iris',t,[rr,gg,bb,aa]]);}
 ad.equal(targets.size,4058);
 const hue={hair:A.hairs.black.ramp,iris:A.eyes.blue.ramp};
 ad(await api.prepareClip(saved,options));ad(await api.prepareClip(brown,options));
 for(let f=0;f<8;f++){
  const out=q=>{let raster;const ctx={save(){},restore(){},drawImage(c){raster=c;}};ad(api.draw(ctx,q,{...options,x:320,y:512,progress:(f+.1)/8}));ad(raster?.width===640&&raster.height===640);return Buffer.from(raster.getContext('2d').getImageData(0,0,640,640).data);};
  const x=out(brown),y=out(saved);let change=0;
  for(let i=0;i<x.length;i+=4){
   const sample=targets.get(i/4);
   if(!sample){ad.equal(x.readUInt32LE(i),y.readUInt32LE(i),[item,d,f,i]);continue;}
   if(sample[2])ad.deepEqual([...x.subarray(i,i+4)],sample[2]);
   const c=parseInt(hue[sample[0]][sample[1]-1].slice(1),16);
   ad.deepEqual([...y.subarray(i,i+4)],[c>>16,(c>>8)&255,c&255,x[i+3]]);
   if(x.readUInt32LE(i)!==y.readUInt32LE(i))change++;
  }
  ad(change>3000&&change<=4058);checked++;
 }
 ad.equal(JSON.stringify(saved),memo);console.log('PASS',item,d,'8 world draws vs own 8 light originals');global.gc?.();
}
if(!process.env.SELECT_ONLY)ad.equal(checked,32);
console.log('PASS default Brawler only, 4 true saves, '+checked+' same pose comparisons');
})().catch(e=>{console.error(e);process.exitCode=1});
