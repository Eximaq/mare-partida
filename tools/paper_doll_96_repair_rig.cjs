/* Repair head references, camera depth and dorsal occlusion from native pixels. No generation. */
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'paper-doll-96-v3'),torso=require('./paper-doll-96-v3/torso.js');
async function repair(){
 const rigs=JSON.parse(await fs.readFile(path.join(root,'appearance-rig.json'),'utf8')),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));const repairs=[];if(manifest.productionEnabled!==false)throw Error('Repair requires the isolated preview');
 for(const [body,actions] of Object.entries(rigs.clips))for(const [action,dirs] of Object.entries(actions))if(action!=='attack-tech')for(const [dir,rig]of Object.entries(dirs)){
  for(let frame=0;frame<rig.poses.length;frame++){
   const pose=rig.poses[frame],j=Object.fromEntries(pose.map(p=>[p.label,p])),n=j.NECK,l=j['LEFT SHOULDER'],r=j['RIGHT SHOULDER'];
   const span=Math.hypot(l.x-r.x,l.y-r.y)*128,mid={x:(l.x+r.x)/2,y:(l.y+r.y)/2};
   if(Math.hypot(n.x-mid.x,n.y-mid.y)*128<=Math.max(4,span*.3))continue;
   if(Math.min(Math.hypot(n.x-l.x,n.y-l.y),Math.hypot(n.x-r.x,n.y-r.y))*128>2)throw Error('Ambiguous neck reference: '+[body,action,dir,frame]);
   const rest=rig.rest.find(p=>p.label==='NECK'),old={x:Math.round((n.x-rest.x)*128),y:Math.round((n.y-rest.y)*128)};
   n.x=mid.x;n.y=mid.y;const socket={x:Math.round((n.x-rest.x)*128),y:Math.round((n.y-rest.y)*128),angle:0};
   const clip=manifest.bodies[body].clips[action][dir],size=clip.frame?.width||128;
   for(const slot of ['headBase','face','hair']){
    const file=path.join(root,clip.layers[slot]),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),out=Buffer.from(data),dx=socket.x-old.x,dy=socket.y-old.y;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)out.fill(0,(y*info.width+frame*size+x)*4,(y*info.width+frame*size+x+1)*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=size||yy>=size)continue;data.copy(out,(yy*info.width+frame*size+xx)*4,(y*info.width+frame*size+x)*4,(y*info.width+frame*size+x+1)*4);}
    await sharp(out,{raw:info}).png().toFile(file);
   }
   rig.sockets[frame]=socket;clip.headSockets[frame]=socket;repairs.push({body,action,dir,frame,old,socket});
  }
 }
 // Anatomical RIGHT is the camera-facing arm of the canonical east view.
 // Wrist z from a pose estimator is not camera depth (often both are zero).
 for(const body of Object.keys(rigs.rests)){
  for(const dir of ['north','east','west']){const poses=[rigs.rests[body][dir]];for(const [action,dirs]of Object.entries(rigs.clips[body]))if(action!=='attack-tech')poses.push(dirs[dir].rest,...dirs[dir].poses);
   for(const pose of poses){const neck=pose.find(p=>p.label==='NECK');for(const side of ['LEFT','RIGHT'])for(const part of ['SHOULDER','ELBOW','ARM'])pose.find(p=>p.label===side+' '+part).z_index=(neck.z_index||0)+(dir!=='north'&&side==='RIGHT'?2:-4);}
  }
  rigs.clips[body]['attack-tech']=structuredClone(rigs.clips[body]['attack-firearm']);
 }
 // Restore the back surface in front of arms that aim away from the camera.
 // This is local underpainting from the current approved native north matrix;
 // limbs outside this panel, legs and all other directions retain their bytes.
 const backRepairs=[];
 for(const body of Object.keys(rigs.rests)){
  const reference=new Uint8ClampedArray(await sharp(path.join(root,manifest.bodies[body].layers.north.body)).ensureAlpha().raw().toBuffer()),rest=torso.geometry(rigs.rests[body].north);
  for(const [action,dirs]of Object.entries(manifest.bodies[body].clips))if(action!=='attack-tech'){
   const clip=dirs.north,file=path.join(root,clip.layers.body),size=clip.frame?.width||128,pad=(size-128)/2,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),out=Buffer.from(data);
   for(let frame=0;frame<clip.frames;frame++){
    const points=rigs.clips[body][action].north.poses[frame],g=torso.geometry(points);
    const crossing=['LEFT','RIGHT'].some(side=>{const a=g.j[side+' ELBOW'],b=g.j[side+' ARM'];return Array.from({length:9},(_,i)=>i/8).some(t=>[-3,0,3].some(dx=>[-3,0,3].some(dy=>torso.backCore(g,a.x+(b.x-a.x)*t+dx,a.y+(b.y-a.y)*t+dy))));});
    if(!crossing)continue;
    let changed=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
     const xx=x-pad,yy=y-pad;if(!torso.backCore(g,xx,yy))continue;
     const q=g.axis.at(xx,yy),t=q.along/g.axis.length,p=rest.axis.point(t*rest.axis.length,q.across*torso.radius(rest,t)/torso.radius(g,t)),sx=Math.round(p.x),sy=Math.round(p.y),i=(y*info.width+frame*size+x)*4,k=(sy*128+sx)*4;
     if(sx<0||sy<0||sx>=128||sy>=128||reference[k+3]<128||!data[i+3])continue;
     if([0,1,2].some(c=>out[i+c]!==reference[k+c]))changed++;
     out.set(reference.subarray(k,k+4),i);out[i+3]=data[i+3];
    }
    if(changed)backRepairs.push({body,action,frame,pixels:changed});
   }
   if(!out.equals(data))await sharp(out,{raw:info}).png().toFile(file);
  }
 }
 rigs.compositionRevision='directional-depth-v10';
 manifest.visualRevision='structural-occlusion-v10-2';
 rigs.ownershipMeasurements.depth='Canonical camera: north arms behind back, east/west RIGHT near and LEFT far';
 rigs.ownershipMeasurements.preserved='hips, legs, frame counts, timing and pivots';
 rigs.compositionRepair={neck:'Reject neck references copied from a shoulder; derive its midpoint',back:'Underpaint occluded dorsal surface from the current north rest matrix',limbs:'Keep native pixels outside the torso occluder'};
 await fs.writeFile(path.join(root,'appearance-rig.json'),JSON.stringify(rigs)+'\n');await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({repairs,backRepairs,paidGenerations:0}));
}
repair().catch(e=>{console.error(e);process.exitCode=1;});
