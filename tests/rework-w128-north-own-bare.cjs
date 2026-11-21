const a=require('node:assert/strict'),P=require('node:path'),A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs');
const I=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(P.join(__dirname,'..')),api=make();
const o={direction:'north',action:'attack-focus',consumer:'world'},r=I.records.find(x=>x.id==='staff128-north-base127-male-151-approved'),pre='tools/rework-weapon-layers-hd/';
const actor=(t,extra={})=>JSON.parse(JSON.stringify(A.commit({id:'w128-north-saved',classId:'healer',equipment:{weapon:{def:128}}},{gender:'masculino',skinColor:t,...extra},()=>true)));
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const raw=async l=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load(pre+l),0,0);return px(c);};
const grab=(p,i)=>{let c;a(api.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(i+.25)/15}));a.equal(c.width,640);return px(c);};
(async()=>{await api.ready;
 const seed=api.selectVisual(actor('light'),o); if(!seed?.ownStaff128North)throw Error('RED: W128 bare selector not active');
 const orig=await Promise.all(seed.states.map(l=>raw(l.layers[0].url)));const tones=Object.keys(A.skins);let n=0;
 for(const t of tones){
  const x=actor(t),saved=JSON.stringify(x),s=api.selectVisual(x,o);a.equal(s?.ownStaff128North,t,'missing own W128 N '+t);
  for(const k of ['pivot','fps','timeline','nativeCanvas'])a.deepEqual(s[k],r[k]);
  a(await api.prepareClip(x,o));const masks=await Promise.all(s.states.map(v=>raw(v.staffSouthRanks)));
  const ramp=[...A.skins[t].ramp,...A.hairs.black.ramp].map(m=>Buffer.from(m.slice(1),'hex'));
  for(let i=0;i<r.timeline.length;i++){
   const f=Number(r.timeline[i]),b=grab(x,i),z=orig[f],m=masks[f];let count=0,hh=0;
   for(let j=0;j<b.length;j+=4){
    a.equal(b[j+3],z[j+3]);
    if(!m[j])a.equal(b.readUInt32LE(j),z.readUInt32LE(j));
    else{a(m[j]<=10&&b[j+3]>0);const c=ramp[m[j]-1];for(let l=0;l<3;l++)a(Math.abs(b[j+l]-c[l])*b[j+3]/255<= +(b[j+3]<255));count++;if(m[j]>5)hh++;}
   }
   a(count>10000);a(hh>6000);n++;
  }
  for(const [q,opts] of [[x,{...o,consumer:'portrait'}],[x,{...o,weaponless:true}],[actor(t,{eyeStyle:'face-calm'}),o],[{...x,classId:'brawler'},o],[{...x,equipment:{weapon:{def:128,variant:'override'}}},o],[{...x,equipment:{weapon:{def:128},coat:{def:151}}},o]])a(!api.selectVisual(q,opts)?.ownStaff128North);
  a.equal(JSON.stringify(x),saved);global.gc?.();
 }
 a.equal(n,120);console.log('PASS 120 actual World W128 NORTH ticks (72 unique pose/tones + 48 hold ticks): all 8 saved tones, clock/alpha/all unmarked including gear exact');
})().catch(e=>{console.error(e);process.exit(1)});
