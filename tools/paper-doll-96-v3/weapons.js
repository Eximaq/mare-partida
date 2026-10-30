/* Shared native weapon attachment. No inventory, combat or character ownership. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MareWeapons96=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const radians=n=>n*Math.PI/180,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function validate(catalog){
    if(catalog?.version!==1||catalog.referenceHeight!==96||!Array.isArray(catalog.items))throw Error('Invalid weapon contract');
    const ids=new Set();for(const item of catalog.items){
      if(!Number.isSafeInteger(item.itemId)||ids.has(item.itemId)||item.id!=='weapon-'+item.itemId||!['sword','daggers'].includes(item.category)||!/^assets\/weapon-item-\d+\.png$/.test(item.source)||item.frame?.width!==128||item.frame?.height!==128||![item.grip?.x,item.grip?.y].every(n=>Number.isInteger(n)&&n>=0&&n<128)||![-1,0,1].includes(item.edgeSide)||item.visibleHeight<20||item.visibleHeight>96)throw Error('Invalid weapon material');
      if(item.effect&&!(item.itemId===70&&item.effect==='gold-sheen'||item.itemId===74&&item.effect==='violet-pulse'))throw Error('Effects allowed only on Ame no Habakiri and Lamina das Trevas');ids.add(item.itemId);
      if(item.axisAngle!==undefined&&(!Number.isFinite(item.axisAngle)||Math.abs(item.axisAngle)>Math.PI))throw Error('Invalid native weapon axis');
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
    const descriptor=id=>catalog.items.find(item=>item.id===id);
    function plan(selected,frame,spec,look,ownership=null){
      const model=descriptor(look.weapon);if(!model)return [];
      const clip=rigs.clips[selected.body]?.[selected.action]?.[selected.direction],pose=clip?.poses[frame]||rigs.rests[selected.body][selected.direction],rest=clip?.rest||rigs.rests[selected.body][selected.direction];
      const p=Object.fromEntries(pose.map(j=>[j.label,j])),r=Object.fromEntries(rest.map(j=>[j.label,j])),padding=(spec.width-128)/2;
      // The authored masculine north sword gesture raises LEFT. Keep that
      // hand for the entire directional family, including locomotion.
      const primary=selected.body==='masculino'&&selected.direction==='north'?'LEFT':'RIGHT';
      return (model.paired?['LEFT','RIGHT']:[primary]).map(side=>{
        const anchor=contact(p[side+' ARM'],ownership?.hands,spec.width,spec.height,padding,p[side+' ELBOW']),angle=orientation(r,p,side,selected.direction,selected.action,frame);
        const center={x:(p['LEFT HIP'].x+p['RIGHT HIP'].x)*64+padding,y:(p.NECK.y+(p['LEFT HIP'].y+p['RIGHT HIP'].y)/2)*64+padding};
        const outward=selected.direction==='east'?{x:1,y:(anchor.y-center.y)/64}:{x:anchor.x-center.x,y:anchor.y-center.y};
        if(Math.hypot(outward.x,outward.y)<2&&selected.direction!=='east')outward.x=(side==='RIGHT')===(selected.direction==='south')?-1:1;
        const edgeDot=model.edgeSide*(Math.cos(angle)*outward.x+Math.sin(angle)*outward.y),flip=model.edgeSide!==0&&edgeDot<0;
        return {model,side,...anchor,angle,handAngle:Math.atan2(p[side+' ARM'].y-p[side+' ELBOW'].y,p[side+' ARM'].x-p[side+' ELBOW'].x),flip,outward,edgeDot:model.edgeSide===0?null:Math.abs(edgeDot),depth:selected.direction==='north'||selected.direction==='east'&&side==='LEFT'?'back':'front',phase:frame%4};
      });
    }
    function geometry(entry){
      const {model,angle}=entry,co=Math.cos(angle),si=Math.sin(angle),box=model.bounds||{x0:32,y0:96-model.visibleHeight,x1:96,y1:96};
      const native=model.axisAngle||0,nc=Math.cos(native),ns=Math.sin(native);
      const points=[[box.x0,box.y0],[box.x1+1,box.y0],[box.x0,box.y1+1],[box.x1+1,box.y1+1]].map(([x,y])=>{
        const dx=x-model.grip.x,dy=y-model.grip.y,u=(dx*nc+dy*ns)*(entry.flip?-1:1),v=-dx*ns+dy*nc;
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
      if(materials.has(model.id))return materials.get(model.id);
      const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(image,0,0);
      const pixels=c.getContext('2d').getImageData(0,0,128,128).data;materials.set(model.id,pixels);return pixels;
    }
    function sprite(image,entry){
      const {model,phase}=entry,key=[model.id,entry.angle.toFixed(5),entry.flip,model.effect?phase:0].join(':');if(rotated.has(key))return rotated.get(key);
      const b=geometry(entry),width=b.x1-b.x0,height=b.y1-b.y0,src=material(image,model),out=new Uint8ClampedArray(width*height*4),co=Math.cos(entry.angle),si=Math.sin(entry.angle),nc=Math.cos(model.axisAngle||0),ns=Math.sin(model.axisAngle||0);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const dx=x+b.x0,dy=y+b.y0,u=(entry.flip?-1:1)*(dx*co+dy*si),v=-dx*si+dy*co,sx=Math.round(model.grip.x+u*nc-v*ns),sy=Math.round(model.grip.y+u*ns+v*nc);if(sx<0||sy<0||sx>=128||sy>=128)continue;
        const i=(sy*128+sx)*4,o=(y*width+x)*4;if(src[i+3]<128)continue;out.set(src.subarray(i,i+4),o);
        if(model.effect==='gold-sheen'&&v<-4&&((Math.round(v)+phase*7)%24+24)%24<2&&Math.max(src[i],src[i+1],src[i+2])>135)out.set([255,239,172,255],o);
        if(model.effect==='violet-pulse'&&src[i+2]>75&&src[i+2]>src[i+1]*1.4){const k=[1,1.12,1.25,1.12][phase];out[o]=Math.min(255,Math.round(out[o]*k));out[o+2]=Math.min(255,Math.round(out[o+2]*k));}
      }
      const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').putImageData(new ImageData(out,width,height),0,0);const value={canvas:c,x:b.x0,y:b.y0};rotated.set(key,value);while(rotated.size>256)rotated.delete(rotated.keys().next().value);return value;
    }
    function draw(ctx,images,entries,depth){for(const entry of entries.filter(p=>p.depth===depth)){const image=images.get(entry.model.source);if(!image)throw Error('Weapon not loaded');const value=sprite(image,entry);ctx.drawImage(value.canvas,entry.x+value.x,entry.y+value.y);}}
    function drawGrips(ctx,entries,depth,skin,glove){
      // Closed-fist variant, authored at the final grid. Keep the native arm,
      // replace only the five-pixel palm around its distal socket. The hilt is
      // behind the curled fingers; the guard and pommel remain outside the fist.
      const shape=['.111.','12341','12341','.1321','..11.'];
      for(const e of entries.filter(p=>p.depth===depth)){
        const co=Math.cos(e.handAngle),si=Math.sin(e.handAngle);
        for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
          const sx=Math.round(x*co+y*si)+2,sy=Math.round(-x*si+y*co)+2,index=Number(shape[sy]?.[sx]);if(!index)continue;
          const covered=glove&&(glove.coverage==='full'||sx<2),ramp=covered?glove.ramp:skin;
          ctx.fillStyle=ramp[index-1];ctx.fillRect(e.x+x,e.y+y,1,1);
        }
      }
    }
    return {descriptor,plan,padding,draw,drawGrips,get cacheSize(){return rotated.size;}};
  }
  return {validate,orientation,contact,create};
});
