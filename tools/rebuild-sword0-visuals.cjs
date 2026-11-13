'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=process.argv[2];
const load=require('./rework-hd-test-loader.cjs').create(root);
const base=require('./rework-base-hd/index.json'),weapons=require('./rework-weapon-layers-hd/index.json'),outfits=require('./rework-modular-outfits-hd/index.json');
const dirs=['south','north','east','west'],ids=[140,147,154,161,175,182];
const shaAt=(l,i)=>l.frames?.[i]||l.source;
const read=async(folder,sha)=>{const im=await load('tools/'+folder+'/assets/'+sha+'.png'),c=createCanvas(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,im.width,im.height);};
const save=(folder,data)=>{const c=createCanvas(data.width,data.height);c.getContext('2d').putImageData(data,0,0);const png=c.toBuffer('image/png'),sha=crypto.createHash('sha256').update(png).digest('hex');fs.mkdirSync(path.join(out,folder),{recursive:true});fs.writeFileSync(path.join(out,folder,sha+'.png'),png);return sha;};
const copy=(src)=>createCanvas(src.width,src.height).getContext('2d').createImageData(src.width,src.height);
const same=(a,b,i)=>a[i+3]===b[i+3]&&Math.abs(a[i]-b[i])<=1&&Math.abs(a[i+1]-b[i+1])<=1&&Math.abs(a[i+2]-b[i+2])<=1;
const set=(a,b,i)=>a.set(b.subarray(i,i+4),i);
const warm=(a,i)=>a[i]>42&&a[i]-a[i+1]>11&&a[i+1]>a[i+2]*1.12&&a[i]-a[i+2]>24;
async function southSword(){
 const history=weapons.records.find(r=>r.id==='sword0-south-historical-attack');
 const paired=weapons.records.find(r=>r.id==='sword1-south-native-layers');
 const source=base.records.find(r=>r.id==='v7-sword-drawn8-south'),d=source.pack.directions.south;
 const phase=[
  [[272,301],[255,344],[252,360],[378,301],[393,344],[398,359]],
  [[271,272],[248,308],[247,333],[368,269],[381,312],[389,347]],
  [[272,268],[252,303],[224,296],[370,272],[381,314],[391,348]],
  [[286,263],[252,286],[271,252],[365,273],[378,309],[399,324]],
  [[297,265],[313,295],[360,251],[370,279],[385,308],[405,326]],
  [[306,263],[340,286],[387,251],[376,280],[395,303],[413,321]],
  [[290,263],[314,307],[350,335],[363,273],[380,308],[399,331]],
  [[274,265],[255,306],[252,334],[371,271],[382,308],[395,331]],
  [[271,265],[252,310],[249,356],[377,270],[390,314],[398,352]],
 ];
 const body=[],shorts=[],blades=[],hands=[];
 const shortsRef=await Promise.all(d.layers[1].frames.map(sha=>read('rework-base-hd',sha)));
 for(let i=0;i<history.states.length;i++){
  const state=history.states[i],row=paired.states[i];
  const [original,back,hand]=await Promise.all([state.layers[0],row.layers[0],row.layers[2]].map(l=>read('rework-weapon-layers-hd',l.sha256)));
  const blade=copy(original),skin=copy(original),grip=copy(original),cloth=copy(original);
  for(let j=0;j<original.data.length;j+=4){
   const x=j/4%640,y=Math.floor(j/2560),a=original.data,b=back.data,h=hand.data;
   if(!a[j+3]&&!b[j+3])continue;
   const isHead=y<238&&x>=263&&x<377;
   const matching=same(a,b,j),inHand=h[j+3]&&warm(a,j);
   const displaced=a[j+3]&&!matching&&!inHand;
   // The paired sword shares the backing pose but its near hand is cut for a
   // different hilt. Restore the historical hand from the actual item 0.
   if(inHand&&!matching){set(grip.data,a,j);continue;}
   if(displaced){set(blade.data,a,j);continue;}
   if(isHead||!b[j+3])continue;
   const navy=y>=317&&y<432&&b[j+2]>b[j]+5;
   const boundary=y>=316&&y<430&&!warm(b,j)&&shortsRef.some(s=>s.data[j+3]>200);
   set((navy||boundary?cloth:skin).data,b,j);
  }
  body.push(save('weapon',skin));shorts.push(save('weapon',cloth));
  blades.push(save('weapon',blade));hands.push(save('weapon',grip));
 }
 const anchors=['RIGHT SHOULDER','RIGHT ELBOW','RIGHT ARM','LEFT SHOULDER','LEFT ELBOW','LEFT ARM'];
 const poses=phase.map(row=>({...d.rest,...Object.fromEntries(row.map(([x,y],i)=>[anchors[i],{x:x/4,y:y/4}]))}));
 const pack={...source.pack,directions:{south:{...d,poses,clip:{frames:9,fps:history.fps,loop:false,contactFrame:5},
  layers:[{...d.layers[0],frames:body},{...d.layers[1],frames:shorts},...d.layers.slice(2)]}}};
 const images=Object.fromEntries([...source.sourceRefs.map(s=>[s,'../rework-base-hd/assets/'+s+'.png']),...[...body,...shorts].map(s=>[s,'assets/'+s+'.png'])]);
 const asset=(sha,depth)=>({url:'assets/'+sha+'.png',sha256:sha,size:[640,640],depth,operation:'source-over'});
 return {...history,id:'sword0-south-modular-nine',basePack:{pack,images},hairSeparated:true,interfaceSkinLocked:false,
  status:'historical-phase-registered-modular',historicalSource:history.id,
  states:history.states.map((s,i)=>({state:s.state,layers:[{...asset(hands[i],30),skinOnly:true}],attachment:{...asset(blades[i],3.5),matrix:[1,0,0,1,0,0]}}))};
}
async function femalePants(){
 const rows=[];
 for(const direction of dirs)for(const action of ['idle','walk','attack-sword']){
  const registration=weapons.femaleRegistrations.find(r=>r.item===0&&r.direction===direction&&r.action===action);
  const pack=registration.baseRecord.pack,d=pack.directions[direction],shorts=d.layers.find(l=>l.id==='shorts');
  const attacking=action==='attack-sword';
  const donors=ids.map(id=>outfits.records.find(r=>r.id===(attacking?'frozen-female-pants'+id+'-'+direction+'-attack-native-registration':'frozen-female-pants'+id+'-'+direction+'-'+action+'-source-v47')));
  const layers=donors.map(r=>r.pack.directions[direction].layers.at(-1));
  const frames=ids.map(()=>[]);
  for(let tick=0;tick<d.clip.frames;tick++){
   const rasters=await Promise.all(layers.map((l,i)=>read('rework-modular-outfits-hd',shaAt(l,Math.floor(tick*donors[i].pack.directions[direction].clip.frames/d.clip.frames)))));
   const normalized=rasters.map(copy);
   const cut=({south:240,north:224,east:236,west:236})[direction]+(attacking?64:0);
   for(const [k,r] of rasters.entries()){
    const {width,data}=r;
    for(let i=cut*width*4;i<data.length;i+=4){
     if(data[i+3]<12)continue;
     const identical=rasters.filter(a=>same(a.data,data,i)).length;
     const y=Math.floor(i/4/width);
     // Shared warm pixels in the frozen clips are the original anatomy.
     // Item-specific leather, gold and warm fabric belong to the garment.
     if(identical>=3&&warm(data,i)||identical===ids.length&&y>cut+112)continue;
     set(normalized[k].data,data,i);
    }
    frames[k].push(save('outfit',normalized[k]));
   }
  }
  for(const [i,id] of ids.entries())rows.push({
   id:'female-pants'+id+'-sword-'+action+'-'+direction,body:'female',direction,action,equipment:{pants:id},
   candidate:true,status:'isolated-frozen-female-garment-calibration-candidate',sourceSwordRecord:registration.id,sourceLowerRecord:donors[i].id,
   sourceRefs:[...new Set(frames[i])],pack:{...pack,directions:{[direction]:{...d,layers:[{...shorts,id:'pants'+id+'-independent-sword',source:frames[i][0],frames:frames[i]}]}}},
  });
 }
 return rows;
}
(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'sword.json'),JSON.stringify(await southSword()));fs.writeFileSync(path.join(out,'pants.json'),JSON.stringify(await femalePants()));})().catch(error=>{console.error(error);process.exitCode=1;});
