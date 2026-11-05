/* Shared native weapon attachment. No inventory, combat or character ownership. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MareWeapons96=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const radians=n=>n*Math.PI/180,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  // One policy shared by wardrobe, hand attachment and occlusion. Equipment
  // priorities apply within an anatomical plane, never to the world renderer.
  const priorities=Object.freeze({cloakBack:0,body:10,headBase:10,face:20,hair:30,pants:40,torso:50,cloakFront:55,belt:60,boots:70,gloves:80,head:90});
  const composition=Object.freeze({priorities,
    // These inventory slots retain their mechanics and saved identities, but
    // never request or draw an avatar layer. Torso garments remain visible.
    rendersSlot(slot){return !['belt','cloak','cloakFront'].includes(slot);},
    paint(passes){for(const pass of [...passes].filter(p=>this.rendersSlot(p.slot)).sort((a,b)=>priorities[a.slot]-priorities[b.slot]))pass.draw();},
    depth({model,pose,side,direction,action,frame}){
      const rule=model?.depthTrack?.[action]?.[direction]?.[side],explicit=Array.isArray(rule)?rule[frame]:rule;
      if(explicit)return explicit;
      const wrist=pose[side+' ARM'],body=pose.NECK;
      if(Number.isFinite(wrist?.z_index)&&Number.isFinite(body?.z_index))return wrist.z_index<body.z_index?'back':'front';
      return direction==='north'||direction==='east'&&side==='LEFT'?'back':'front';
    },
    handPriority(direction,action){return direction==='south'||action==='attack-focus'&&['east','west'].includes(direction);}
  });
  function validate(catalog){
    if(catalog?.version!==1||catalog.referenceHeight!==96||!Array.isArray(catalog.items))throw Error('Invalid weapon contract');
    const ids=new Set();for(const item of catalog.items){
      if(!Number.isSafeInteger(item.itemId)||ids.has(item.itemId)||item.id!=='weapon-'+item.itemId||!['sword','daggers','unarmed','firearm','tech','focus'].includes(item.category)||!/^assets\/weapon-item-\d+\.png$/.test(item.source)||item.frame?.width!==128||item.frame?.height!==128||![item.grip?.x,item.grip?.y].every(n=>Number.isInteger(n)&&n>=0&&n<128)||![-1,0,1].includes(item.edgeSide)||item.visibleHeight<5||item.visibleHeight>96)throw Error('Invalid weapon material');
      if(item.effect&&!(item.itemId===70&&item.effect==='gold-sheen'||item.itemId===74&&item.effect==='violet-pulse'))throw Error('Effects allowed only on Ame no Habakiri and Lamina das Trevas');ids.add(item.itemId);
      if(item.attachment&&!['gauntlet','wrist-cannon','rifle','pistol','focus','staff','book'].includes(item.attachment.kind))throw Error('Invalid weapon attachment');
      if(item.attachment?.poseReference){const p=item.attachment.poseReference;if(!['masculino','feminino'].includes(p.body)||!Array.isArray(p.directions)||!p.directions.length||p.directions.some(d=>!['south','north','east'].includes(d)))throw Error('Invalid arm pose reference');}
      if(item.depthTrack)for(const directions of Object.values(item.depthTrack))for(const sides of Object.values(directions))for(const rule of Object.values(sides))if((Array.isArray(rule)?rule:[rule]).some(v=>!['front','back',null].includes(v)))throw Error('Invalid frame depth track');
      if(item.views)for(const [direction,view]of Object.entries(item.views)){if(!['south','north','southCarry'].includes(direction)||!/^assets\/weapon-item-\d+-(south|north|south-carry)\.png$/.test(view.source)||![view.grip?.x,view.grip?.y].every(Number.isInteger))throw Error('Invalid weapon view');}
      if(item.axisAngle!==undefined&&(!Number.isFinite(item.axisAngle)||Math.abs(item.axisAngle)>Math.PI))throw Error('Invalid native weapon axis');
      if(item.materialScale!==undefined&&(!Number.isFinite(item.materialScale)||item.materialScale<=0||item.materialScale>1))throw Error('Invalid HD weapon scale');
      if(item.renderDensity!==undefined&&![1,2,3].includes(item.renderDensity))throw Error('Invalid HD weapon density');
      if(item.armour&&(!/^assets\/weapon-item-\d+-armour\.png$/.test(item.armour.source)||['shoulder','elbow','wrist'].some(j=>![item.armour[j]?.x,item.armour[j]?.y].every(n=>Number.isInteger(n)&&n>=0&&n<128))))throw Error('Invalid articulated armour');
      if(item.armour?.sleevePadding!==undefined&&(!Number.isInteger(item.armour.sleevePadding)||item.armour.sleevePadding<0||item.armour.sleevePadding>2))throw Error('Invalid sleeve padding');
      if(item.armour?.crossScale!==undefined&&(!Number.isFinite(item.armour.crossScale)||item.armour.crossScale<1||item.armour.crossScale>8))throw Error('Invalid sleeve texture scale');
    }return true;
  }
  function orientation(rest,pose,side,direction,action,frame){
    const angle=p=>Math.atan2(p[side+' ARM'].y-p[side+' ELBOW'].y,p[side+' ARM'].x-p[side+' ELBOW'].x);
    const outer=direction==='east'?45:side==='RIGHT'?(direction==='south'?-45:45):(direction==='south'?45:-45);
    let value=radians(outer)+wrap(angle(pose)-angle(rest))*.65;
    if(action.startsWith('attack-')){
      const strength=[0,.08,.3,.72,1,.6,.15,0][frame]??0;
      const target=radians(direction==='east'?90:direction==='north'?side==='RIGHT'?15:-15:side==='RIGHT'?165:195);
      value+=wrap(target-value)*strength;
    }
    return value;
  }
  function contact(joint,mask,width,height,padding,elbow){
    // Rig ARM sockets describe the wrist. Move towards the distal palm before
    // snapping to owned skin; anchoring the hilt at the wrist made it look pasted.
    const vx=elbow?(joint.x-elbow.x)*128:0,vy=elbow?(joint.y-elbow.y)*128:0,len=Math.hypot(vx,vy)||1;
    const advance=elbow?2:0;
    const x=Math.round(joint.x*128+padding+vx/len*advance),y=Math.round(joint.y*128+padding+vy/len*advance);if(!mask)return {x,y,visible:null};
    let best=null;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
      const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;if(xx<0||yy<0||xx>=width||yy>=height||!mask[yy*width+xx]||d>16)continue;
      if(!best||d<best.distance)best={x:xx,y:yy,distance:d,visible:true};
    }return best||{x,y,visible:false};
  }
  function create(catalog,rigs){
    validate(catalog);const materials=new Map(),rotated=new Map();
    const descriptor=(id,direction,action)=>{const item=catalog.items.find(item=>item.id===id),view=direction==='south'&&['idle','walk'].includes(action)&&item?.views?.southCarry?'southCarry':direction;return item?.views?.[view]?{...item,...item.views[view],view}:item;};
    function carryPose(selected,frame,look){
      const model=descriptor(look.weapon,selected.direction,selected.action);if(model?.view!=='southCarry'||model.attachment.kind!=='rifle')return null;
      const clip=rigs.clips[selected.body][selected.action][selected.direction],native=clip.poses[frame],rest=rigs.clips[selected.body].idle.south.poses[0],neck=native.find(j=>j.label==='NECK'),rn=rest.find(j=>j.label==='NECK');
      const x=neck.x*128,y=neck.y*128,pose=native.map(j=>({...j}));
      for(const j of pose){const side=j.label.split(' ')[0];if(!['LEFT','RIGHT'].includes(side))continue;
        if(j.label.endsWith('SHOULDER')){const source=rest.find(p=>p.label===j.label);j.x=source.x+neck.x-rn.x;j.y=source.y+neck.y-rn.y;}
        if(j.label.endsWith('ELBOW')){j.x=(x+(side==='LEFT'?19:-14))/128;j.y=(y+13)/128;}
        if(j.label.endsWith('ARM')){j.x=(x+(side==='LEFT'?14:-18))/128;j.y=(y+20)/128;}
      }return pose;
    }
    function armPose(selected,frame,look){
      const reference=descriptor(look.weapon,selected.direction,selected.action)?.attachment?.poseReference;
      if(!reference||reference.body===selected.body||!reference.directions.includes(selected.direction))return null;
      const native=rigs.clips[selected.body]?.[selected.action]?.[selected.direction]?.poses[frame]||rigs.rests[selected.body][selected.direction],source=rigs.clips[reference.body]?.[selected.action]?.[selected.direction]?.poses[frame]||rigs.rests[reference.body][selected.direction];
      const neck=native.find(j=>j.label==='NECK'),from=source.find(j=>j.label==='NECK');
      return native.map(j=>{if(!/^(LEFT|RIGHT) (ARM|ELBOW)$/.test(j.label))return {...j};const r=source.find(p=>p.label===j.label);return {...j,x:neck.x+r.x-from.x,y:neck.y+r.y-from.y};});
    }
    const worn=entry=>['gauntlet','wrist-cannon'].includes(entry.model.attachment?.kind);
    function plan(selected,frame,spec,look,ownership=null){
      const model=descriptor(look.weapon,selected.direction,selected.action);if(!model)return [];
      const clip=rigs.clips[selected.body]?.[selected.action]?.[selected.direction],carry=carryPose(selected,frame,look),reference=armPose(selected,frame,look),pose=reference||carry||clip?.poses[frame]||rigs.rests[selected.body][selected.direction],rest=clip?.rest||rigs.rests[selected.body][selected.direction];
      const p=Object.fromEntries(pose.map(j=>[j.label,j])),r=Object.fromEntries(rest.map(j=>[j.label,j])),padding=(spec.width-128)/2;
      // The authored masculine north sword gesture raises LEFT. Keep that
      // hand for the entire directional family, including locomotion.
      const kind=model.attachment?.kind,focus=['focus','staff','book'].includes(kind);
      const primary=carry?'LEFT':kind==='staff'?(selected.direction==='south'&&selected.body==='masculino'?'RIGHT':'LEFT'):focus?(selected.body==='masculino'&&selected.direction!=='north'?'LEFT':'RIGHT'):(selected.body==='masculino'&&selected.direction==='north'&&model.category==='sword'?'LEFT':'RIGHT');
      const paired=model.paired||model.view==='southCarry'&&kind==='pistol';
      return (paired?['LEFT','RIGHT']:[primary]).map(side=>{
        const anchor=carry?{x:Math.round(p[side+' ARM'].x*128+padding),y:Math.round(p[side+' ARM'].y*128+padding)}:contact(p[side+' ARM'],reference?null:ownership?.hands,spec.width,spec.height,padding,p[side+' ELBOW']);
        const handAngle=Math.atan2(p[side+' ARM'].y-p[side+' ELBOW'].y,p[side+' ARM'].x-p[side+' ELBOW'].x);
        let angle=orientation(r,p,side,selected.direction,selected.action,frame);
        if(['gauntlet','wrist-cannon'].includes(kind))angle=handAngle+Math.PI/2;
        else if(['rifle','pistol'].includes(kind))angle=model.view?0:handAngle+Math.PI/2;
        if(model.attachment?.carryUpright&&!selected.action.startsWith('attack-'))angle=selected.direction==='east'?.85:side==='RIGHT'?-.32:.32;
        if(model.attachment?.carryOutward&&model.view&&!selected.action.startsWith('attack-'))angle=(side==='RIGHT'?-1:1)*(selected.direction==='north'?-1:1)*.35;
        else if(focus){const restAngle=Math.atan2(r[side+' ARM'].y-r[side+' ELBOW'].y,r[side+' ARM'].x-r[side+' ELBOW'].x);angle=Math.max(-.3,Math.min(.3,wrap(handAngle-restAngle)*.12));if(kind==='staff'){const carry=selected.direction==='north'?-.3:selected.direction==='east'?.4:selected.body==='masculino'?-.4:.4;angle=carry+Math.max(-.06,Math.min(.06,wrap(handAngle-restAngle)*.025));}}
        const center={x:(p['LEFT HIP'].x+p['RIGHT HIP'].x)*64+padding,y:(p.NECK.y+(p['LEFT HIP'].y+p['RIGHT HIP'].y)/2)*64+padding};
        const outward=selected.direction==='east'?{x:1,y:(anchor.y-center.y)/64}:{x:anchor.x-center.x,y:anchor.y-center.y};
        if(Math.hypot(outward.x,outward.y)<2&&selected.direction!=='east')outward.x=(side==='RIGHT')===(selected.direction==='south')?-1:1;
        const edgeDot=model.edgeSide*(Math.cos(angle)*outward.x+Math.sin(angle)*outward.y),flip=model.edgeSide!==0?edgeDot<0:model.attachment?.palmInward?(Math.cos(angle)*outward.x+Math.sin(angle)*outward.y)>0:kind==='gauntlet'&&side==='LEFT';
        // Shared hand order for every material, including legacy equipment.
        // West mirrors the complete East composition, including this pass.
        const frontOfHand=composition.handPriority(selected.direction,selected.action);
        if(model.view==='southCarry'){angle=carry?-Math.PI/2:side==='RIGHT'?-Math.PI*5/6:Math.PI*5/6;}
        return {model,side,...anchor,angle,handAngle,flip:model.view==='southCarry'?kind==='pistol'&&side==='LEFT':flip,outward,frontOfHand,carry:!!carry,edgeDot:model.edgeSide===0?null:Math.abs(edgeDot),depth:composition.depth({model,pose:p,side,direction:selected.direction,action:selected.action,frame}),phase:frame%4};
      });
    }
    function point(entry,sourcePoint=entry.model.tip){
      const scale=entry.model.materialScale||1,dx=(sourcePoint.x-entry.model.grip.x)*scale,dy=(sourcePoint.y-entry.model.grip.y)*scale,native=entry.model.axisAngle||0,nc=Math.cos(native),ns=Math.sin(native),u=(dx*nc+dy*ns)*(entry.flip?-1:1),v=-dx*ns+dy*nc,co=Math.cos(entry.angle),si=Math.sin(entry.angle);
      return {x:entry.x+u*co-v*si,y:entry.y+u*si+v*co};
    }
    function geometry(entry){
      const {model,angle}=entry,co=Math.cos(angle),si=Math.sin(angle),box=model.bounds||{x0:32,y0:96-model.visibleHeight,x1:96,y1:96};
      const native=model.axisAngle||0,nc=Math.cos(native),ns=Math.sin(native);
      const points=[[box.x0,box.y0],[box.x1+1,box.y0],[box.x0,box.y1+1],[box.x1+1,box.y1+1]].map(([x,y])=>{
        const scale=model.materialScale||1,dx=(x-model.grip.x)*scale,dy=(y-model.grip.y)*scale,u=(dx*nc+dy*ns)*(entry.flip?-1:1),v=-dx*ns+dy*nc;
        return {x:u*co-v*si,y:u*si+v*co};
      });
      return {x0:Math.floor(Math.min(...points.map(p=>p.x)))-1,y0:Math.floor(Math.min(...points.map(p=>p.y)))-1,x1:Math.ceil(Math.max(...points.map(p=>p.x)))+1,y1:Math.ceil(Math.max(...points.map(p=>p.y)))+1};
    }
    function padding(selected,spec,look){
      let x=0,top=0,bottom=0;for(let frame=0;frame<(selected.clip?.frames||1);frame++)for(const p of plan(selected,frame,spec,look)){
        const b=geometry(p);x=Math.max(x,-p.x-b.x0,p.x+b.x1-spec.width);top=Math.max(top,-p.y-b.y0);bottom=Math.max(bottom,p.y+b.y1-spec.height);
      }return {x:Math.ceil(x+4),top:Math.ceil(top+4),bottom:Math.ceil(bottom+4)};
    }
    function material(image,model){
      if(materials.has(model.source))return materials.get(model.source);
      const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(image,0,0);
      const pixels=c.getContext('2d').getImageData(0,0,128,128).data;materials.set(model.source,pixels);return pixels;
    }
    function cleanRotation(pixels,width,height){
      // Nearest-neighbour rotation can detach a few subpixels from a thin
      // outline. Remove only tiny disconnected raster scraps; source PNGs and
      // substantial separate shapes remain untouched. This runs once per cache.
      const seen=new Uint8Array(width*height),parts=[];
      for(let p=0;p<seen.length;p++)if(pixels[p*4+3]&&!seen[p]){
        const part=[p];seen[p]=1;
        for(let n=0;n<part.length;n++){const at=part[n],x=at%width,y=Math.floor(at/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*width+xx;if(xx>=0&&yy>=0&&xx<width&&yy<height&&!seen[k]&&pixels[k*4+3]){seen[k]=1;part.push(k);}}}
        parts.push(part);
      }
      parts.sort((a,b)=>b.length-a.length);const limit=Math.max(2,Math.floor((parts[0]?.length||0)*.01)),joined=new Uint8Array(width*height);
      for(const p of parts[0]||[])joined[p]=1;
      for(const part of parts.slice(1)){
        if(part.length<=limit){for(const p of part)pixels.fill(0,p*4,p*4+4);continue;}
        // Keep substantial details: close only a subpixel raster gap, using
        // the adjacent original colour instead of deleting the detail.
        let bridge=null;
        for(const p of part){const x=p%width,y=Math.floor(p/width);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy,k=yy*width+xx,distance=dx*dx+dy*dy;if(xx<0||yy<0||xx>=width||yy>=height||!joined[k]||distance>9||bridge&&distance>=bridge.distance)continue;bridge={p,x,y,dx,dy,distance};}}
        if(bridge){const {p,x,y,dx,dy}=bridge,steps=Math.max(Math.abs(dx),Math.abs(dy));for(let i=1;i<steps;i++){const k=(y+Math.round(dy*i/steps))*width+x+Math.round(dx*i/steps);if(!pixels[k*4+3])pixels.set(pixels.subarray(p*4,p*4+4),k*4);joined[k]=1;}for(const p of part)joined[p]=1;}
      }
    }
    function sprite(image,entry){
      const {model,phase}=entry,key=[model.id,model.source,entry.angle.toFixed(5),entry.flip,model.effect?phase:0].join(':');if(rotated.has(key))return rotated.get(key);
      const density=model.renderDensity||1,scale=model.materialScale||1,b=geometry(entry),width=(b.x1-b.x0)*density,height=(b.y1-b.y0)*density,src=material(image,model),out=new Uint8ClampedArray(width*height*4),co=Math.cos(entry.angle),si=Math.sin(entry.angle),nc=Math.cos(model.axisAngle||0),ns=Math.sin(model.axisAngle||0);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const dx=x/density+b.x0,dy=y/density+b.y0,u=(entry.flip?-1:1)*(dx*co+dy*si)/scale,v=(-dx*si+dy*co)/scale,sx=Math.round(model.grip.x+u*nc-v*ns),sy=Math.round(model.grip.y+u*ns+v*nc);if(sx<0||sy<0||sx>=128||sy>=128)continue;
        const i=(sy*128+sx)*4,o=(y*width+x)*4;if(src[i+3]<128)continue;out.set(src.subarray(i,i+4),o);
        if(model.effect==='gold-sheen'&&v<-4&&((Math.round(v)+phase*7)%24+24)%24<2&&Math.max(src[i],src[i+1],src[i+2])>135)out.set([255,239,172,255],o);
        if(model.effect==='violet-pulse'&&src[i+2]>75&&src[i+2]>src[i+1]*1.4){const k=[1,1.12,1.25,1.12][phase];out[o]=Math.min(255,Math.round(out[o]*k));out[o+2]=Math.min(255,Math.round(out[o+2]*k));}
      }
      if(density>1)cleanRotation(out,width,height);
      const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').putImageData(new ImageData(out,width,height),0,0);const value={canvas:c,x:b.x0,y:b.y0,density};rotated.set(key,value);while(rotated.size>256)rotated.delete(rotated.keys().next().value);return value;
    }
    function draw(ctx,images,entries,depth){for(const entry of entries.filter(p=>p.depth===depth&&(!worn(p)||depth==='back'))){const image=images.get(entry.model.source);if(!image)throw Error('Weapon not loaded');const value=sprite(image,entry);ctx.drawImage(value.canvas,entry.x+value.x,entry.y+value.y,value.canvas.width/value.density,value.canvas.height/value.density);}}
    function maskBack(c,x0,y0,d,spec,occlusion,entry){
      if(!occlusion||entry.depth!=='back')return;
      const cx=c.getContext('2d'),pixels=cx.getImageData(0,0,c.width,c.height);
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        const xx=Math.floor(x/d+x0),yy=Math.floor(y/d+y0);if(xx<0||yy<0||xx>=spec.width||yy>=spec.height)continue;
        const p=yy*spec.width+xx,i=p*4,j=(y*c.width+x)*4,hand=occlusion.visibleHand?occlusion.visibleHand(entry,xx,yy):occlusion.hands[p];
        if((occlusion.body[i+3]||occlusion.head?.[i+3])&&!hand)pixels.data[j+3]=0;
      }
      cx.putImageData(pixels,0,0);if(occlusion.cloak){cx.globalCompositeOperation='destination-out';cx.drawImage(occlusion.cloak,-x0*d,-y0*d,spec.width*d,spec.height*d);}
    }
    function drawResolved(ctx,images,entries,spec,occlusion){
      for(const entry of entries.filter(e=>!worn(e)).sort((a,b)=>(a.depth==='front')-(b.depth==='front'))){
        const value=sprite(images.get(entry.model.source),entry),d=value.density,c=document.createElement('canvas');c.width=value.canvas.width;c.height=value.canvas.height;c.getContext('2d').drawImage(value.canvas,0,0);
        const x=entry.x+value.x,y=entry.y+value.y;maskBack(c,x,y,d,spec,occlusion,entry);ctx.drawImage(c,x,y,c.width/d,c.height/d);
      }
    }
    const closedGrip=['.111.','12341','12341','.1321','..11.'];
    function gripPixel(entry,x,y){const co=Math.cos(entry.handAngle),si=Math.sin(entry.handAngle),dx=x-entry.x,dy=y-entry.y,sx=Math.round(dx*co+dy*si)+2,sy=Math.round(-dx*si+dy*co)+2;return {index:Number(closedGrip[sy]?.[sx])||0,sx};}
    function drawGrips(ctx,entries,depth,skin,glove){
      // Closed-fist variant, authored at the final grid. Keep the native arm,
      // replace only the five-pixel palm around its distal socket. The hilt is
      // behind the curled fingers; the guard and pommel remain outside the fist.
      for(const e of entries.filter(p=>p.depth===depth&&!worn(p))){
        for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
          const {sx,index}=gripPixel(e,e.x+x,e.y+y);if(!index)continue;
          const covered=glove&&(glove.coverage==='full'||sx<2),ramp=covered?glove.ramp:skin;
          ctx.fillStyle=ramp[index-1];ctx.fillRect(e.x+x,e.y+y,1,1);
        }
      }
    }
    function drawFingers(ctx,entries,spec,occlusion,skin,glove){
      // The authored closed grip may occlude only its small native palm.
      // Preserve the explicit South/focus hand-priority exceptions.
      for(const entry of entries.filter(e=>!worn(e)&&!e.frontOfHand)){
        const d=entry.model.renderDensity||1,c=document.createElement('canvas');c.width=spec.width*d;c.height=spec.height*d;
        const cx=c.getContext('2d');cx.scale(d,d);drawGrips(cx,[entry],entry.depth,skin,glove);
        maskBack(c,0,0,d,spec,occlusion,entry);ctx.drawImage(c,0,0,spec.width,spec.height);
      }
    }
    function drawArmour(ctx,images,entries,spec,pose,occlusion){
      const armoured=entries.filter(e=>e.model.armour);if(!armoured.length)return;
      const d=armoured[0].model.renderDensity||1,pad=(spec.width-128)/2,points=Object.fromEntries(pose.map(j=>[j.label,{x:j.x*128+pad,y:j.y*128+pad}]));
      const axis=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;return {a,b,length,co:dx/length,si:dy/length};};
      const bones=armoured.flatMap(entry=>{
        const m=entry.model.armour,side=entry.side;
        return [['SHOULDER','ELBOW','shoulder','elbow'],['ELBOW','ARM','elbow','wrist']].map(([a,b,c,e])=>({entry,to:axis(points[side+' '+a],points[side+' '+b]),from:axis(m[c],m[e]),pixels:material(images.get(m.source),m)}));
      });
      const otherBones=['LEFT','RIGHT'].filter(side=>!armoured.some(e=>e.side===side)).flatMap(side=>[axis(points[side+' SHOULDER'],points[side+' ELBOW']),axis(points[side+' ELBOW'],points[side+' ARM'])]);
      const sleeveMask=occlusion.arms.slice(),margin=Math.max(...armoured.map(e=>e.model.armour.sleevePadding||0));
      if(margin)for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
        if(!occlusion.arms[y*spec.width+x])continue;
        for(let oy=-margin;oy<=margin;oy++)for(let ox=-margin;ox<=margin;ox++){const xx=x+ox,yy=y+oy;if(xx>=0&&yy>=0&&xx<spec.width&&yy<spec.height)sleeveMask[yy*spec.width+xx]=1;}
      }
      const width=spec.width*d,height=spec.height*d,out=new Uint8ClampedArray(width*height*4);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const xx=x/d,yy=y/d,p=Math.floor(yy)*spec.width+Math.floor(xx);if(!sleeveMask[p]&&!occlusion.hands[p]||occlusion.head?.[p*4+3]&&yy<occlusion.headLine&&!occlusion.hands[p])continue;
        let closest=null;
        for(const bone of bones){const a=bone.to,dx=xx-a.a.x,dy=yy-a.a.y,along=dx*a.co+dy*a.si,across=-dx*a.si+dy*a.co,clamped=Math.max(0,Math.min(a.length,along)),distance=Math.hypot(across,along-clamped);if(!closest||distance<closest.distance)closest={bone,distance,along:clamped,across};}
        // Limb ownership belongs to the native pixel, not each HD subpixel.
        // Otherwise a crossed-arm seam can leave a fraction of skin exposed.
        const nativeDistance=a=>{const dx=Math.floor(xx)-a.a.x,dy=Math.floor(yy)-a.a.y,along=dx*a.co+dy*a.si,across=-dx*a.si+dy*a.co;return Math.hypot(across,along-Math.max(0,Math.min(a.length,along)));};
        if(otherBones.length){const ownDistance=Math.min(...bones.map(b=>nativeDistance(b.to)));if(otherBones.some(a=>nativeDistance(a)<ownDistance))continue;}
        const {bone,along,across}=closest,a=bone.from,t=along/bone.to.length,side=bone.entry.flip?-1:1,crossScale=bone.entry.model.armour.crossScale||5.5,sx=Math.round(a.a.x+a.co*a.length*t-a.si*across*crossScale*side),sy=Math.round(a.a.y+a.si*a.length*t+a.co*across*crossScale*side);
        let sample=-1,best=Infinity;
        // Sample the authored armour, including its elbow hinge. Fill only
        // anatomical sleeve pixels, with only the configured contour margin.
        for(let oy=-12;oy<=12;oy++)for(let ox=-12;ox<=12;ox++){const tx=sx+ox,ty=sy+oy,i=(ty*128+tx)*4,distance=ox*ox+oy*oy;if(tx<0||ty<0||tx>=128||ty>=128||distance>=best||bone.pixels[i+3]<128)continue;sample=i;best=distance;if(!distance)break;}
        if(sample<0)for(let i=0;i<bone.pixels.length;i+=4){if(bone.pixels[i+3]<128)continue;const distance=(i/4%128-sx)**2+(Math.floor(i/512)-sy)**2;if(distance<best){best=distance;sample=i;}}
        if(sample>=0)out.set(bone.pixels.subarray(sample,sample+4),(y*width+x)*4);
      }
      const c=document.createElement('canvas');c.width=width;c.height=height;const cx=c.getContext('2d');cx.putImageData(new ImageData(out,width,height),0,0);
      if(occlusion.cloak){cx.globalCompositeOperation='destination-out';cx.drawImage(occlusion.cloak,0,0,width,height);}
      ctx.drawImage(c,0,0,spec.width,spec.height);
    }
    function drawWorn(ctx,images,entries,spec,occlusion=null){
      const ordered=entries.filter(worn).sort((a,b)=>(a.depth==='front')-(b.depth==='front'));
      for(const entry of ordered){
        const value=sprite(images.get(entry.model.source),entry),d=value.density,x0=Math.min(0,entry.x+value.x),y0=Math.min(0,entry.y+value.y),c=document.createElement('canvas');c.width=(Math.max(spec.width,entry.x+value.x+value.canvas.width/d)-x0)*d;c.height=(Math.max(spec.height,entry.y+value.y+value.canvas.height/d)-y0)*d;const cx=c.getContext('2d');cx.imageSmoothingEnabled=false;cx.drawImage(value.canvas,(entry.x+value.x-x0)*d,(entry.y+value.y-y0)*d);
        if(entry.model.attachment?.coverPalm&&occlusion){
          // Extend the same authored armour material only over the occupied
          // native palm. No skin-colour keying, rectangle, or forearm repaint.
          const pixels=cx.getImageData(0,0,c.width,c.height),before=new Uint8ClampedArray(pixels.data),co=Math.cos(entry.handAngle),si=Math.sin(entry.handAngle);
          for(let yy=Math.max(0,entry.y-6);yy<Math.min(spec.height,entry.y+7);yy++)for(let xx=Math.max(0,entry.x-6);xx<Math.min(spec.width,entry.x+7);xx++){
            const p=yy*spec.width+xx,dx=xx-entry.x,dy=yy-entry.y;if(!occlusion.hands[p]||Math.hypot(dx,dy)>5.6||dx*co+dy*si< -4)continue;
            for(let sy=0;sy<d;sy++)for(let sx=0;sx<d;sx++){
              const x=Math.round((xx-x0)*d+sx),y=Math.round((yy-y0)*d+sy),i=(y*c.width+x)*4;if(x<0||y<0||x>=c.width||y>=c.height||before[i+3])continue;
              let best=-1,distance=Infinity;for(let oy=-4*d;oy<=4*d;oy++)for(let ox=-4*d;ox<=4*d;ox++){const tx=x+ox,ty=y+oy,j=(ty*c.width+tx)*4,q=ox*ox+oy*oy;if(tx<0||ty<0||tx>=c.width||ty>=c.height||!before[j+3]||q>=distance)continue;best=j;distance=q;}
              if(best>=0)pixels.data.set(before.subarray(best,best+4),i);
            }
          }cx.putImageData(pixels,0,0);
        }
        maskBack(c,x0,y0,d,spec,occlusion,entry);
        ctx.drawImage(c,x0,y0,c.width/d,c.height/d);
      }
    }
    return {descriptor,carryPose,armPose,plan,padding,draw,drawResolved,drawGrips,drawFingers,drawArmour,drawWorn,point,gripContains:(entry,x,y)=>!!gripPixel(entry,x,y).index,get cacheSize(){return rotated.size;}};
  }
  return {validate,orientation,contact,composition,create};
});
