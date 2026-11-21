'use strict';
const a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),load=require('../tools/rework-hd-test-loader.cjs').create(R),I=require('../tools/rework-weapon-layers-hd/index.json');
const dir='north',o={direction:dir,action:'attack-firearm',consumer:'world'},prefix='tools/rework-weapon-layers-hd/',n=640,all=new Map(),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,n,n).data),sig=x=>crypto.createHash('sha256').update(x).digest('hex');
const save=(item,skin,equipment={weapon:{def:item}},classId='gunner',look={})=>JSON.parse(JSON.stringify(A.commit({id:'firearm-palette',classId,equipment},{skinColor:skin,...look},()=>true)));
const samples=async h=>{if(!all.has(h)){const c=cv.createCanvas(n,n);c.getContext('2d').drawImage(await load(prefix+h),0,0);all.set(h,px(c));c.width=1;}return all.get(h);};
function draw(x,k,N){let c;a(api.draw({save(){},restore(){},drawImage(v){c=v;}},x,{...o,progress:(k+.25)/N,x:320,y:512}));a.equal(c.width,n);return px(c);}
(async()=>{await api.ready;let total=0,unique=0;for(const it of [4,113,115]){
 const r=I.records.find(q=>q.item===it&&q.body==='male'&&q.direction===dir&&q.paletteSupport),light=save(it,'light');a((api.selectVisual(light,o))?.id===r.id);a(await api.prepareClip(light,o));
 const grabs=r.timeline.map((v,i)=>r.timeline.indexOf(v)===i?i:-1).filter(i=>i>=0),base=new Map(),masks=[];
 for(const [i,k] of grabs.entries()){
  base.set(r.timeline[k],draw(light,k,48));
  const ls=r.states[i].layers;a.deepEqual(ls.map(q=>q.role),['arms','weapon','hands','body-occluder']);a(!ls[1].paletteMask);
  const M=await Promise.all([0,2,3].map(j=>samples(ls[j].paletteMask.url))),O=await Promise.all(ls.map(j=>samples(j.url)));
  masks.push({M,O});
 }
 for(const tone of Object.keys(A.skins)){
  const x=save(it,tone),q=api.selectVisual(x,o);a(q?.id===r.id);a.equal(!!q.firearmSavedNatural,tone!=='light');a.equal(q.colorAppearance.skin,tone);
  for(const key of ['states','timeline','fps','pivot','nativeCanvas','sourceArchiveSHA256'])a.deepEqual(q[key],r[key]);
  a(await api.prepareClip(x,o));const ticks=new Map();
  for(let t=0;t<48;t++){
   const f=r.timeline[t],got=draw(x,t,48),hash=sig(got);
   if(ticks.has(f)){a.equal(hash,ticks.get(f));total++;continue;}ticks.set(f,hash);unique++;total++;
   const neutral=base.get(f),{M,O}=masks[Number(f)];
   let edits=0,weapon=0,visible=0;
   for(let k=0;k<got.length;k+=4){
    a.equal(got[k+3],neutral[k+3]);
    if(O[1][k+3]&&O[2][k+3]<255&&O[3][k+3]<255)visible++; if(O[1][k+3]===255&&!O[2][k+3]&&!O[3][k+3]){a.equal(got.readUInt32LE(k),neutral.readUInt32LE(k));weapon++;}
    if(got.readUInt32LE(k)!==neutral.readUInt32LE(k)){
     a(M[0][k]||M[1][k]||M[2][k],'delta outside signed skin mask '+[it,tone,f,k/4]);edits++;
    }
   }a(visible>0);a(tone==='light'?edits===0:edits>1000);
  }
  a.equal(ticks.size,3);
 }
 for(const [x,opts] of [[save(it,'ebony',{weapon:{def:it},coat:{def:151}}),o],[save(it,'ebony',{weapon:{def:it,variant:'other'}}),o],[save(it,'ebony',undefined,'strategist'),o],[save(it,'ebony'),{...o,consumer:'portrait'}],[save(it,'ebony'),{...o,action:'walk'}],[save(it,'ebony'),{...o,weaponless:true}]])a(!api.selectVisual(x,opts)?.firearmSavedNatural);
 console.log(it,'North all eight skins x 48 native ticks; material and weapon exact');global.gc?.();
}
a.equal(total,1152);a.equal(unique,72);console.log('PASS',total,'ticks',unique,'distinct phase/skin validations');})().catch(e=>{console.error(e);process.exitCode=1;});
