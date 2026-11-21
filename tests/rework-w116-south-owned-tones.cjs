const P=require('path'),A=require('assert/strict'),R=P.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),S=require('../character-appearance'),J=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(R);
const api=make(),opts={action:'attack-firearm',direction:'south',consumer:'world'},ref=J.records.find(r=>r.id==='rifle116-south-original-body-native-layers'),W='tools/rework-weapon-layers-hd/';
const save=(skinColor,a={},e={})=>JSON.parse(JSON.stringify(S.commit({id:'source-proof-116',classId:'gunner',equipment:{weapon:{def:116},...e}},{skinColor,...a},()=>true)));
const raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),src=im=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(im,0,0);return raw(c);};
(async()=>{await api.ready;const iris=global.MareReworkModularOutfitsHD.southIrisSamples(),mask=src(await load('tools/rework-modular-outfits-hd/assets/dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5.png')),permit=new Set(iris.map(([x,y])=>y*640+x));for(let n=0;n<mask.length;n+=4)if(mask[n])permit.add(n/4);
const origins=await Promise.all(ref.states.map(async s=>src(await load(W+s.approved.url))));let count=0,hairs=0;
for(const t of Object.keys(S.skins)){
const s=save(t),before=JSON.stringify(s),r=api.selectVisual(s,opts),snap=[];
A(r.w116OwnedSouthTone);A.deepEqual(r.timeline,['0','1','2','4','R','4','2','1','0']);A.equal(r.fps,12);A.deepEqual(r.pivot,[80,128]);
A.equal(api.selectVisual(s,{...opts,action:'attack'})?.id,r.id);
const stage=await api.prepareConfiguration([{player:s,options:opts}]);
try{for(let tick=0;tick<9;tick++){
 let canvas;A(stage.draw({save(){},restore(){},drawImage(x){canvas=x}},s,{...opts,progress:(tick+.2)/9}));const b=raw(canvas),f=r.states.findIndex(s=>s.state===r.timeline[tick]);
 const pic=src(await load(W+r.states[f].layers[0].url)),orig=origins[f];
 for(let i=0;i<b.length;i+=4){A.equal(b[i+3],orig[i+3]);if(b.readUInt32LE(i)!==pic.readUInt32LE(i)){A(permit.has(i/4));hairs++;}}
 for(const [x,y,a,c,b1,alpha,rank]of iris){const k=(640*y+x)*4,n=parseInt(S.eyes.blue.ramp[rank-1].slice(1),16);A.deepEqual([...b.subarray(k,k+4)],[n>>>16,n>>>8&255,n&255,alpha]);}
 if(t==='light')for(let k=0;k<pic.length;k+=4)A.equal(pic.readUInt32LE(k),orig.readUInt32LE(k));
 if(snap[f])A(snap[f].equals(b));else snap[f]=b;
 count++;
}}finally{stage.release();}
A.equal(JSON.stringify(s),before);global.gc?.();
}
for(const [s,o]of [[save('ebony'),{...opts,consumer:'portrait'}],[save('ebony'),{...opts,weaponless:true}],[save('ebony'),{...opts,action:'walk'}],[save('ebony'),{...opts,direction:'north'}],[save('ebony',{hairStyle:'hair-bob'}),opts],[save('ebony',{eyeColor:'green'}),opts],[save('ebony',{}, {head:{def:157}}),opts],[save('ebony',{}, {weapon:{def:116,variant:'alt'}}),opts]])A(!api.selectVisual(s,o)?.w116OwnedSouthTone);
A.equal(count,72);A(hairs>=72*4000);console.log('PASS',count,'local real saved World ticks, unchanged authored alpha/clock, signed black/blue');})().catch(e=>{console.error(e);process.exitCode=1});
