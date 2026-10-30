/* Freeze anatomical ownership before fitting ANY item. No network or paid calls.
 * --estimates=<directory> optionally imports native-frame PixelLab measurements.
 * Body pixels and animation timing are never changed by this builder.
 */
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const root=path.join(__dirname,'paper-doll-96-v3'),torso=require('./paper-doll-96-v3/torso.js');
const estimateDir=process.argv.find(a=>a.startsWith('--estimates='))?.slice(12);
const referenceFile=process.argv.find(a=>a.startsWith('--reference-rig='))?.slice(16);
const raw=async(file,size,frame=0)=>new Uint8ClampedArray(await sharp(path.join(root,file)).extract({left:frame*size,top:0,width:size,height:size}).ensureAlpha().raw().toBuffer());
const save=async(file,data,w,h)=>sharp(Buffer.from(data),{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(root,file));
function mirror(data,size){const out=new Uint8ClampedArray(data.length);for(let y=0;y<size;y++)for(let x=1;x<size;x++)out.set(data.subarray((y*size+x)*4,(y*size+x+1)*4),(y*size+size-x)*4);return out;}
function paste(to,from,size,frames,frame,row=0){for(let y=0;y<size;y++)to.set(from.subarray(y*size*4,(y+1)*size*4),((row*size+y)*frames*size+frame*size)*4);}
function pasteCell(to,from,size,columns,index){for(let y=0;y<size;y++)to.set(from.subarray(y*size*4,(y+1)*size*4),((Math.floor(index/columns)*size+y)*columns*size+index%columns*size)*4);}
(async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),rigs=JSON.parse(await fs.readFile(path.join(root,'appearance-rig.json'),'utf8')),catalog=JSON.parse(await fs.readFile(path.join(root,'appearance-catalog.json'),'utf8'));
 assert.equal(manifest.productionEnabled,false);
 const corrections=[];let measurements=0;
 const reference=referenceFile?JSON.parse(await fs.readFile(referenceFile,'utf8')):structuredClone(rigs);
 if(estimateDir){
  for(const [body,b]of Object.entries(manifest.bodies))for(const action of ['static',...Object.keys(b.clips).filter(a=>a!=='attack-tech')])for(const dir of ['south','north','east']){
   const clip=action==='static'?null:b.clips[action][dir],size=clip?.frame?.width||128,pad=(size-128)/2;
   for(let frame=0;frame<(clip?.frames||1);frame++){
    const {keypoints}=JSON.parse(await fs.readFile(path.join(estimateDir,[body,action,dir,frame].join('-')+'.json'),'utf8'));assert.equal(keypoints.length,18);
    const points=action==='static'?rigs.rests[body][dir]:rigs.clips[body][action][dir].poses[frame],by=Object.fromEntries(keypoints.map(p=>[p.label,{...p,x:(p.x*size-pad)/128,y:(p.y*size-pad)/128}]));
    const old=Object.fromEntries(points.map(p=>[p.label,p])),d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const priors=Object.fromEntries((action==='static'?reference.rests[body][dir]:reference.clips[body][action][dir].poses[frame]).map(p=>[p.label,p]));
    const wristCost=(side,candidate)=>2*d(priors[side+' ELBOW'],candidate)+d(priors[side+' ARM'],candidate);
    const wristSwap=wristCost('LEFT',by['RIGHT ARM'])+wristCost('RIGHT',by['LEFT ARM'])<wristCost('LEFT',by['LEFT ARM'])+wristCost('RIGHT',by['RIGHT ARM']);
    const collapsed=/^(walk|idle|static)$/.test(action)&&d(by['LEFT ARM'],by['RIGHT ARM'])*128<4&&d(priors['LEFT ARM'],priors['RIGHT ARM'])*128>15;
    for(const side of ['LEFT','RIGHT']){const p=old[side+' ARM'];let measured=by[(wristSwap?(side==='LEFT'?'RIGHT':'LEFT'):side)+' ARM'];
      const length=d(priors[side+' ELBOW'],measured)*128,priorLength=d(priors[side+' ELBOW'],priors[side+' ARM'])*128;
      if(collapsed||length<3.8&&priorLength>7||length>25||length>16&&length>priorLength*1.8)measured=priors[side+' ARM'];
      corrections.push({body,action,dir,frame,side,distance:d(priors[side+' ARM'],measured)*128});p.x=measured.x;p.y=measured.y;
      const front=dir==='south'||dir==='east'&&side==='RIGHT';
      for(const part of [' ARM',' ELBOW',' SHOULDER'])old[side+part].z_index=(old.NECK.z_index||0)+(front?2:-4);
    }
    measurements++;
   }
  }
  for(const [body,b]of Object.entries(manifest.bodies)){
   rigs.rests[body].west=rigs.rests[body].east.map(p=>({...p,x:1-p.x}));
   for(const action of Object.keys(b.clips).filter(a=>a!=='attack-tech')){
    const east=rigs.clips[body][action].east,west=rigs.clips[body][action].west;
    west.poses=east.poses.map(points=>points.map(p=>({...p,x:1-p.x})));
    for(const dir of ['south','north','west','east'])for(const p of rigs.clips[body][action][dir].rest)if(p.label.endsWith(' ARM')){const v=rigs.rests[body][dir].find(v=>v.label===p.label);p.x=v.x;p.y=v.y;}
   }
   rigs.clips[body]['attack-tech']=structuredClone(rigs.clips[body]['attack-firearm']);
  }
  rigs.ownershipMeasurements={method:'PixelLab estimate-skeleton on native body frames',count:measurements,updatedJoints:['LEFT ARM','RIGHT ARM'],depth:'Canonical camera: north behind back, east/west RIGHT near and LEFT far',preserved:'head, shoulder/elbow positions, hips, legs, timing'};
  await fs.writeFile(path.join(root,'appearance-rig.json'),JSON.stringify(rigs)+'\n');
 }
 const atlases=catalog.nativeOwnership?.atlases||{},counts={poses:0,defaultClothingFrames:0,atlases:0};
 for(const [body,b]of Object.entries(manifest.bodies)){
  atlases[body]??={};
  for(const action of ['static',...Object.keys(b.clips).filter(a=>a!=='attack-tech')]){
   const staticPose=action==='static',east=staticPose?null:b.clips[action].east,size=east?.frame?.width||128,frames=east?.frames||1,pad=(size-128)/2,columns=size===160?6:frames,rows=Math.ceil(frames*4/columns),atlas=new Uint8ClampedArray(size*columns*size*rows*4);
   for(const dir of ['south','north','east']){
    const clip=staticPose?null:b.clips[action][dir],layers=staticPose?b.layers[dir]:clip.layers,rig=staticPose?null:rigs.clips[body][action][dir],row=['south','north','west','east'].indexOf(dir),outputs={};
    if(!staticPose){layers.foreground||='assets/'+body+'-'+action+'-'+dir+'-foreground.png';for(const slot of ['foreground','pants',...(body==='feminino'?['top']:[])])outputs[slot]=new Uint8ClampedArray(size*frames*size*4);}
    const west=Object.fromEntries(Object.keys(outputs).map(k=>[k,new Uint8ClampedArray(outputs[k].length)]));
    for(let frame=0;frame<frames;frame++){
     const pixels=await raw(layers.body,size,frame),points=rig?.poses[frame]||rigs.rests[body][dir],owned=torso.ownership(pixels,points,pad,size,size),packed=new Uint8ClampedArray(pixels.length);
     for(let p=0;p<size*size;p++)if(pixels[p*4+3])packed.set([owned.cloth[p]*255,owned.hands[p]*255,owned.arms[p]*255,255],p*4);
     pasteCell(atlas,packed,size,columns,row*frames+frame);counts.poses++;
     if(dir==='east'){pasteCell(atlas,mirror(packed,size),size,columns,2*frames+frame);counts.poses++;}
     if(staticPose)continue;
     const clothes=torso.baseClothing(pixels,points,pad,size,size,body==='feminino'),front=new Uint8ClampedArray(pixels.length);
     for(let p=0;p<size*size;p++)if(owned.arms[p])front.set(pixels.subarray(p*4,p*4+4),p*4);
     const pieces={...clothes,foreground:front};
     for(const slot of Object.keys(outputs)){paste(outputs[slot],pieces[slot],size,frames,frame);if(dir==='east')paste(west[slot],mirror(pieces[slot],size),size,frames,frame);}
     counts.defaultClothingFrames+=dir==='east'?2:1;
    }
    for(const [slot,data]of Object.entries(outputs)){await save(layers[slot],data,size*frames,size);if(dir==='east')await save(b.clips[action].west.layers[slot],west[slot],size*frames,size);}
   }
   const file='assets/ownership-'+body+'-'+action+(size===160?'-packed':'')+'.png';await save(file,atlas,size*columns,size*rows);
   atlases[body][action]={...atlases[body][action],file,cell:size,columns,rows,framesPerDirection:frames,directions:['south','north','west','east']};counts.atlases++;
  }
  atlases[body]['attack-tech']={...atlases[body]['attack-firearm'],sharedWith:'attack-firearm'};
 }
 // The reusable rest guide is derived from the same ownership atlas. Never
 // leave an older template behind after importing new anatomical contacts.
 const guide=new Uint8ClampedArray(512*256*4);
 for(const [row,body]of ['masculino','feminino'].entries()){
  const a=atlases[body].static,d=new Uint8ClampedArray(await sharp(path.join(root,a.file)).ensureAlpha().raw().toBuffer());
  for(const [column,dir]of ['south','north','west','east'].entries()){
   const n=a.directions.indexOf(dir)*a.framesPerDirection;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const from=((Math.floor(n/a.columns)*128+y)*a.columns*128+n%a.columns*128+x)*4,to=((row*128+y)*512+column*128+x)*4;
    if(d[from]>=128)guide.set([255,255,255,255],to);
   }
  }
 }
 await save('assets/template-mask-torso.png',guide,512,256);
 const template=JSON.parse(await fs.readFile(path.join(root,'fit-template.json'),'utf8'));
 template.restContacts=structuredClone(rigs.rests);template.revision=manifest.visualRevision;
 await fs.writeFile(path.join(root,'fit-template.json'),JSON.stringify(template,null,2)+'\n');
 catalog.nativeOwnership={schema:'mare-native-ownership-v9',channels:{r:'torso and short sleeves',g:'bare hands and foreground forearms',b:'near arms'},atlases};catalog.baseClothingFit='native-underwear-v9';
 await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(root,'appearance-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 console.log(JSON.stringify({measurements,maximumWristCorrection:Math.max(0,...corrections.map(p=>p.distance)),...counts,paidGenerations:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
