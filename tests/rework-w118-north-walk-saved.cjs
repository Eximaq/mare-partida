'use strict';
const a=require('node:assert/strict'),p=require('node:path'),root=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),{make,cv}=require(root+'/tests/rework-integration-support.cjs'),A=require(root+'/character-appearance.js');
const load=require(root+'/tools/rework-hd-test-loader.cjs').create(root);
const H='4a102854a34cc0f92ecf7849dd409a8e2ed7fab2c5e2c9791be37df94297623c',file='tools/rework-weapon-layers-hd/assets/'+H+'.png', off=cv.createCanvas(640,640),api=make(),clear=make({loadImage:k=>k===file?off:load(k)});
const o={direction:'north',action:'walk',consumer:'world'};
const persist=(skinColor,classId='cyborg',look={},equipment={weapon:{def:118}})=>JSON.parse(JSON.stringify(A.commit({id:'w118-north-check',classId,equipment},{gender:'masculino',skinStyle:'natural',skinColor,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',...look},()=>true)));
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data), C=(n=512)=>cv.createCanvas(n,n);
const grab=(h,u,f)=>{let x;a(h.draw({save(){},restore(){},drawImage(c){x=c;}},u,{...o,progress:(f+.25)/16}));a.deepEqual([x.width,x.height],[512,512]);return x;};
const supported=o=>o?.stockW118NorthWalkSavedPalette===true;
(async()=>{
 await Promise.all([api.ready,clear.ready]);const u=persist('light'),s=api.selectVisual(u,o);a(supported(s));
 const literal=api.selectVisual({...u,appearance96:{...u.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}},o);
 a(!supported(literal));a.deepEqual(s.plan,literal.plan);a.deepEqual(s.base,literal.base);
 for(const [v,m] of [[persist('light','strategist'),o],[persist('light','healer'),o],[persist('light','cyborg',{hairColor:'silver'}),o],[persist('light','cyborg',{eyeColor:'violet'}),o],[persist('light','cyborg',{hairStyle:'hair-spiky'}),o],[persist('light','cyborg',{}, {weapon:{def:118},coat:{def:151}}),o],[persist('light','cyborg',{}, {weapon:{def:118,variant:'wrong'}}),o],[u,{...o,consumer:'portrait'}],[u,{...o,weaponless:true}],[u,{...o,action:'attack-unarmed'}],...[ 'south','east','west'].map(direction=>[u,{...o,direction}])])a(!supported(api.selectVisual(v,m)));
 const d=s.base.pack.directions.north,part=s.plan.parts[0],V=global.ReworkAccessoryVendor.compositor;
 a.deepEqual(d.clip,{frames:16,fps:16,loop:true});a.equal(d.poses.length,16);a.equal(part.source.sha256,H);a.equal(part.skinMaterial,undefined);a.equal(s.relicEyes,undefined);a.equal(d.layers.filter(q=>q.slot==='face').length,0);
 const source=await load(file),crop=C(640), w=C(640);crop.getContext('2d').drawImage(source,0,0);
 const raw=rgba(crop),x=w.getContext('2d');for(let y=319;y<325;y++)for(let x0=375;x0<385;x0++){a.equal(raw[(y*640+x0)*4+3],0);x.fillRect(x0,y,1,1);}
 const rigs=[];
 for(let f=0;f<16;f++){
  const body=d.poses[f],n=part.binding.a,b=part.binding.b,rig=V.rigid(part.sourceBone[b],part.sourceBone[n],body[b],body[n]);
  const place=im=>{const c=C(),cx=c.getContext('2d');cx.imageSmoothingEnabled=false;cx.transform(...rig.slice(0,4),rig[4]*4,rig[5]*4);cx.drawImage(im,0,0);return c;};
  const hardware=place(source),witness=place(w),metal=rgba(hardware),wbox=rgba(witness),points=[];
  for(let k=0;k<wbox.length;k+=4)if(wbox[k+3]){a.equal(metal[k+3],0);points.push(k);}
  a.equal(points.length,60);rigs.push({hardware,metal,points,palettes:points.map(()=>new Set())});witness.width=1;
 }
 let n=0,semi=0,solid=0;
 for(const tone of Object.keys(A.skins)){
  const v=persist(tone),memo=JSON.stringify(v),r=api.selectVisual(v,o),c=clear.selectVisual(v,o);
  a(supported(r)&&supported(c));a.equal(r.colorAppearance.skin,tone);a.deepEqual(r.plan,literal.plan);
  const banks=await Promise.all([api,clear].map((provider,i)=>provider.prepareConfiguration([{player:v,source:i?c:r,options:o}],{resolve:q=>q})));
  try{for(let f=0;f<16;f++){
   const actual=rgba(grab(banks[0],v,f)), bare=grab(banks[1],v,f),{hardware,metal,points,palettes}=rigs[f];
   const ref=C(),ctx=ref.getContext('2d');ctx.drawImage(bare,0,0);ctx.drawImage(hardware,0,0);const expected=rgba(ref),under=rgba(bare);ref.width=1;
   for(let k=0;k<metal.length;k+=4){
    if(metal[k+3]===255){a.equal(actual.readUInt32LE(k),metal.readUInt32LE(k));solid++;}
    if(metal[k+3]&&metal[k+3]<255){a.equal(actual.readUInt32LE(k),expected.readUInt32LE(k));semi++;}
   }
   points.forEach((k,i)=>{a.equal(actual[k+3],255);a.equal(actual.readUInt32LE(k),under.readUInt32LE(k));palettes[i].add(actual.readUInt32LE(k));});n++;
  }}finally{banks.forEach(b=>b.release());}
  a.equal(JSON.stringify(v),memo);global.gc?.();console.log(tone,n);
 }
 a.equal(n,128);a.equal(semi,76288);a(solid>50000);a(rigs.every(r=>r.palettes.every(x=>x.size===8)));
 console.log({n,solid,semi,visibleSkinWitness:16*60*8});
})().catch(e=>{console.error(e);process.exitCode=1});
