'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),I=require(R+'/tools/rework-weapon-layers-hd/index.json');
const old=make(),capture=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),look={gender:'masculino',skinStyle:'natural',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const actor=(skinColor='light',gear={},klass='cyborg',alt={})=>JSON.parse(JSON.stringify(A.commit({id:'arm117-world',classId:klass,equipment:{weapon:{def:117},...gear}},{...look,skinColor,...alt},()=>true)));
const A15=global.MareAppearance96,M=require(R+'/player-rework-skin-hd.js');
(async()=>{await old.ready;let api=old;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):require('node:zlib').gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const native=global.MareReworkWeaponNativeHD.create(I,{makeCanvas:cv.createCanvas});
 let n=0;
 for(const direction of ['east','west'])for(const color of Object.keys(A.skins)){
  const o={direction,action:'attack-unarmed',consumer:'world'},q=actor(color),r=api.selectVisual(q,o),memo=JSON.stringify(q),src=I.records.find(s=>s.id==='arm117-'+direction+'-native-layers');
  a(r?.ownedArm117SideAttack);if(C)a(!old.selectVisual(q,o)?.ownedArm117SideAttack);
  a.deepEqual(r.timeline,src.timeline);a.equal(r.fps,12);a.deepEqual(r.pivot,[80,128]);a.deepEqual(r.basePack,src.basePack);
  for(const [p,opt] of [[actor(color,{},'brawler'),o],[actor(color,{coat:{def:1171}}),o],[actor(color,{weapon:{def:117,variant:'other'}}),o],[actor(color,{},'cyborg',{eyeColor:'green'}),o],[q,{...o,consumer:'portrait'}],[q,{...o,action:'attack-tech'}],[q,{...o,direction:'south'}],[q,{...o,direction:'north'}],[q,{...o,weaponless:true}]]){
   a(!api.selectVisual(p,opt)?.ownedArm117SideAttack);if(C)a.deepEqual(api.selectVisual(p,opt),old.selectVisual(p,opt));
  }
  if(process.env.SELECT_ONLY)continue;
  a(await api.prepareClip(q,o));
  const d=r.basePack.pack.directions[direction],shot=I.separableAttackRigs.find(r=>r.rig==='male-punch-source-sleeves-117').directions[direction];
  for(let f=0;f<8;f++){
   const gear=await load('tools/rework-weapon-layers-hd/'+shot.weapons['117'][f].url);
   const [body,shorts]=await Promise.all(d.layers.slice(0,2).map(l=>load('tools/rework-weapon-layers-hd/'+r.basePack.images[l.frames[f]])));
   const [mask,patch]=await Promise.all([src.states[f].layers[0].mask,src.states[f].layers[0]].map(l=>load('tools/rework-weapon-layers-hd/'+l.url)));
   const c=cv.createCanvas(640,640),ct=c.getContext('2d'),read=im=>{ct.clearRect(0,0,640,640);ct.drawImage(im,0,0);return ct.getImageData(0,0,640,640);};
   const orig=read(patch).data,mat=read(mask).data,hard=read(gear).data,cloth=read(shorts).data,anat=read(body),oldBody=anat.data.slice();
   ct.drawImage(shorts,0,0);ct.drawImage(gear,0,0);const oldComp=capture(c);
   anat.data.set(A15.recolor(oldBody,M.mask(oldBody,640,'anatomy'),A15.skins[color].ramp));
   ct.putImageData(anat,0,0);ct.drawImage(shorts,0,0);ct.drawImage(gear,0,0);const tinted=capture(c);
   const imgs=new Map(await Promise.all(native.requiredFiles(r,{frame:f}).map(async path=>[path,await load(path)])));
   const baseline={...r,id:r.id+':own-basis-no-contact',states:r.states.map(v=>({...v,layers:[]}))},b=cv.createCanvas(640,640);
   native.render(b.getContext('2d'),baseline,imgs,{frame:f});
   const head=read(await load('tools/rework-weapon-layers-hd/'+r.basePack.images[d.layers.find(l=>l.id==='headBase').source])).data;
   const headTint=A15.recolor(head,M.mask(head,640,'anatomy'),A15.skins[color].ramp);
   const expected=capture(b);let supported=0,changed=0,hardware=0,neckCount=0;
   for(let i=0;i<mat.length;i+=4)if(mat[i]){
    const x=i/4%640,y=Math.floor(i/4/640),start=direction==='east'?306:327;
    if([1,6].includes(f)&&y===237&&x>=start&&x<start+7){
     const j=i-2*640*4;
     a.equal(hard[i+3],0);a.deepEqual(orig.subarray(i,i+4),head.subarray(j,j+4));a.equal(head[j+3],255);
     expected.set(headTint.subarray(j,j+4),i);neckCount++;continue;
    }
    a.equal(orig[i+3],oldComp[i+3]);for(let j=0;j<3;j++)a(Math.abs(orig[i+j]-oldComp[i+j])<=2);
    const yes=oldBody[i+3]&&cloth[i+3]<255&&hard[i+3]<255;
    for(let j=0;j<4;j++)expected[i+j]=orig[i+j];
    if(yes){supported++;for(let j=0;j<3;j++)expected[i+j]=Math.min(255,Math.max(0,orig[i+j]+tinted[i+j]-oldComp[i+j]));
     if(expected.readUInt32LE(i)!==Buffer.from(orig.buffer,orig.byteOffset,orig.byteLength).readUInt32LE(i))changed++;
    }else hardware++;
   }
   let out;a(api.draw({save(){},restore(){},drawImage(c){out=c}},q,{...o,progress:(f+.23)/8,x:320,y:512}),JSON.stringify(api.snapshot().last));
   a(out);a.equal(api.snapshot().last.source,r.id);a.equal(api.snapshot().last.frame,f);a(capture(out).equals(expected));
   a.equal(neckCount,[1,6].includes(f)?7:0);a(supported>800);a(changed>50);a(hardware>=0);
   const eyes=global.MareReworkModularOutfitsHD.sideIrisSamples(direction);
   for(const [x,y,,,,,rank] of eyes){const j=((y+64)*640+x+64)*4,k=parseInt(A.eyes.blue.ramp[rank-1].slice(1),16);a.deepEqual([...expected.subarray(j,j+4)],[k>>>16,k>>>8&255,k&255,255]);}
   n++;
  }
  a.equal(JSON.stringify(q),memo);console.log(direction,color,'8/8 same-interface/body/shot phases');global.gc?.();
 }
 if(!process.env.SELECT_ONLY)a.equal(n,128);
 console.log('PASS',n,'W117 attack phases in world');
})().catch(e=>{console.error(e);process.exitCode=1});
