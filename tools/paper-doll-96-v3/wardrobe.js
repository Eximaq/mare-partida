/* Review-only appearance compositor. Indexed colours and native attachment rigs. */
(function () {
  'use strict';
  const api = window.MareAppearance96;
  const canvas = (w,h) => Object.assign(document.createElement('canvas'), {width:w,height:h});
  const fromPixels = (pixels,w,h) => { const c=canvas(w,h);c.getContext('2d').putImageData(new ImageData(pixels,w,h),0,0);return c; };
  function create(catalog, rigs, load) {
    const textures=new Map(),attachments=new Map();
    if(/^native-surface-v[67]$/.test(catalog.fitVersion))for(const style of catalog.styles){
      if(!['pants','boots','gloves'].includes(style.kind))continue;
      const required=style.kind==='pants'?['LEFTupper','LEFTlower','RIGHTupper','RIGHTlower']:['LEFT','RIGHT'];
      for(const body of Object.keys(catalog.fitBases))for(const dir of ['south','north','west','east'])
        for(const key of required)if(!style.parts?.[body]?.[dir]?.[key])throw Error('Incomplete native panel: '+style.id+'/'+body+'/'+dir+'/'+key);
    }
    function fitted(key,build){
      if(attachments.has(key)){const value=attachments.get(key);attachments.delete(key);attachments.set(key,value);return value;}
      const value=build();attachments.set(key,value);if(attachments.size>96)attachments.delete(attachments.keys().next().value);return value;
    }
    const descriptor=(slot,id)=>catalog.styles.find(s=>s.id===id&&s.kind===slot);
    const choices=look=>['hair','face','pants','boots','gloves','torso','cloak','head'].map(slot=>({slot,style:descriptor(slot,look[slot])})).filter(p=>p.style);
    function requiredFiles(selected,look) {
      const files=choices(look).flatMap(p=>[p.style.layers[selected.body][selected.direction],...Object.values(p.style.parts?.[selected.body]?.[selected.direction]||{}),p.style.animations?.[selected.body]?.[selected.action]?.file].filter(Boolean));
      if(catalog.fitBases?.[selected.body]?.[selected.direction])files.push(catalog.fitBases[selected.body][selected.direction]);
      if(look.face!=='none'&&catalog.originalFaces?.[selected.body]?.[selected.direction])files.push(catalog.originalFaces[selected.body][selected.direction]);
      if(look.hair!=='none'&&catalog.originalHairs?.[selected.body]?.[selected.direction])files.push(catalog.originalHairs[selected.body][selected.direction]);
      if(catalog.originalHeads?.[selected.body]?.[selected.direction])files.push(catalog.originalHeads[selected.body][selected.direction]);
      if(catalog.originalHands?.[selected.body]?.[selected.direction])files.push(catalog.originalHands[selected.body][selected.direction]);
      return [...new Set(files)];
    }
    async function prepare(selected,look){return new Map(await Promise.all(requiredFiles(selected,look).map(async file=>[file,await load(file)])));}
    function texture(image,key,material,palette,protectedPixels=[]) {
      const id=[key,material,palette?.join(',')||''].join(':');
      if(textures.has(id))return textures.get(id);
      const c=canvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      let data=ctx.getImageData(0,0,c.width,c.height).data;
      if(palette)data=api.recolor(data,api.materialMask(data,material==='face'?'skin':material,protectedPixels),palette);
      const result={pixels:data,width:c.width,height:c.height};textures.set(id,result);
      if(textures.size>32)textures.delete(textures.keys().next().value);
      return result;
    }
    function draw(ctx,images,selected,fi,spec,hidden,look) {
      const r=rigs.clips[selected.body]?.[selected.action]?.[selected.direction];
      const rest=r?.rest||rigs.rests[selected.body][selected.direction],pose=r?.poses[fi]||rest;
      const socket={...(r?.sockets[fi]||{x:0,y:0,angle:0})},padding=(spec.width-128)/2;
      if(catalog.headFit==='canonical-neck-v7'){
        const oldNeck=rest.find(j=>j.label==='NECK'),newNeck=pose.find(j=>j.label==='NECK');
        socket.x=Math.round((newNeck.x-oldNeck.x)*128);socket.y=Math.round((newNeck.y-oldNeck.y)*128);socket.angle=0;
      }
      const map=new Map(images),visibleHidden=[...hidden];
      for(const slot of ['hair','face','pants'])if(look[slot]==='none'||descriptor(slot,look[slot]))visibleHidden.push(slot);
      const skin=api.skins[look.skin]?.ramp;
      const headStyle=hidden.includes('head')?null:descriptor('head',look.head);
      const hideHair=headStyle?.hairOcclusion==='all';
      if(hideHair)visibleHidden.push('hair');
      if(descriptor('torso',look.torso))visibleHidden.push('top');
      const originalFrame=canvas(spec.width,spec.height);
      if(skin)for(const slot of ['body','headBase','underArms','foreground','face']){
        const file=selected.layers[slot];if(!file||visibleHidden.includes(slot))continue;
        const image=images.get(file),c=canvas(spec.width,spec.height),cx=c.getContext('2d');
        cx.drawImage(image,fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
        const source=cx.getImageData(0,0,c.width,c.height).data;
        const recoloured=api.recolor(source,api.materialMask(source,'skin'),skin);
        // Keep the strip indexing contract while replacing just this pose.
        const strip=canvas(image.width,image.height);strip.getContext('2d').drawImage(image,0,0);
        strip.getContext('2d').putImageData(new ImageData(recoloured,c.width,c.height),fi*spec.width,0);
        map.set(file,strip);
      }
      // Render the neutral body first. Every visible surface is drawn exactly
      // once below; a replacement face must never cover an earlier hair pass.
      MareLayers96.draw(originalFrame.getContext('2d'),map,selected.layers,fi,spec,
        [...visibleHidden,'pants','top','headBase','face','hair','foreground']);
      const pieces={};let coveredFeet=null;
      if(catalog.originalHeads?.[selected.body]?.[selected.direction]&&!selected.layers.headBase){
        // Remove only the old head. Raised attack arms above it remain intact.
        originalFrame.getContext('2d').clearRect(Math.round(44+socket.x+padding),Math.round(12+socket.y+padding),44,32);
      }
      const neutral=canvas(spec.width,spec.height);
      for(const slot of ['body','underArms','foreground']){const file=selected.layers[slot];if(file)neutral.getContext('2d').drawImage(images.get(file),fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);}
      const handCanvas=canvas(spec.width,spec.height);for(const slot of ['underArms','foreground']){const file=selected.layers[slot];if(file)handCanvas.getContext('2d').drawImage(images.get(file),fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);}
      const handSurface=handCanvas.getContext('2d').getImageData(0,0,spec.width,spec.height).data;
      const neutralPixels=neutral.getContext('2d').getImageData(0,0,spec.width,spec.height).data;
      const torsoBody=canvas(spec.width,spec.height),torsoBodyContext=torsoBody.getContext('2d');
      torsoBodyContext.drawImage(images.get(selected.layers.body),fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
      const torsoBodyPixels=torsoBodyContext.getImageData(0,0,spec.width,spec.height).data;
      const restFile=catalog.fitBases?.[selected.body]?.[selected.direction];
      const restPixels=restFile?texture(images.get(restFile),restFile,'body',null).pixels:null;
      for(const p of choices(look)){
        if(hidden.includes(p.slot))continue;
        if(p.slot==='torso'&&hidden.includes('top'))continue;
        const file=p.style.layers[selected.body][selected.direction],image=images.get(file);
        const palette=p.slot==='hair'?(look.hairColor&&look.hairColor!=='brown'?api.hairs[look.hairColor]?.ramp:null):null;
        const data=texture(image,file,p.slot==='face'?'face':'hair',palette,p.slot==='face'?(p.style.faceColorProtection?.[selected.body]?.[selected.direction]||catalog.faceColorProtection?.[selected.body]?.[selected.direction]||[]):[]).pixels;
        const box={x0:32,y0:60,x1:96,y1:113};
        const sourceParts=Object.fromEntries(Object.entries(p.style.parts?.[selected.body]?.[selected.direction]||{}).map(([name,file])=>[name,texture(images.get(file),file,p.slot,null).pixels]));
        const atlas=p.style.animations?.[selected.body]?.[selected.action];
        const torsoPiece=()=>{
          if(!atlas)return api.fitTorsoToBody(data,torsoBodyPixels,rest,pose,padding,spec.width,spec.height,handSurface);
          const index=atlas.directions.indexOf(selected.direction)*atlas.framesPerDirection+fi;
          if(index<0||fi>=atlas.framesPerDirection||atlas.cell!==spec.width)throw Error('Invalid torso animation');
          const c=canvas(spec.width,spec.height),cx=c.getContext('2d');
          cx.drawImage(images.get(atlas.file),index%atlas.columns*atlas.cell,Math.floor(index/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,spec.width,spec.height);
          return {full:cx.getImageData(0,0,spec.width,spec.height).data};
        };
        const attached=fitted([file,selected.key,fi,palette?.join(',')||'',atlas?.file||'surface'].join(':'),()=>p.slot==='torso'?torsoPiece():p.slot==='pants'?{full:api.fitTrousersToBody(data,neutralPixels,rest,pose,padding,spec.width,spec.height,restPixels,sourceParts,{material:p.style.nativeMaterial})}:['boots','gloves'].includes(p.slot)?api.fitPairToBody(data,p.slot,rest,pose,padding,spec.width,spec.height,neutralPixels,restPixels,sourceParts,{coverHand:p.style.fingerCoverage==='full',handSurface,material:p.style.nativeMaterial}):api.attach(data,p.slot,rest,pose,socket,padding,spec.width,spec.height,box));
        if(p.slot==='boots'){
          coveredFeet=p.style.nativeMaterial?new Uint8ClampedArray(neutralPixels.length):api.bootCoverage(neutralPixels,rest,pose,padding,spec.width,spec.height,sourceParts);
          if(p.style.nativeMaterial)for(let i=3;i<coveredFeet.length;i+=4)if(attached.LEFT[i]||attached.RIGHT[i])coveredFeet[i]=255;
        }
        pieces[p.slot]=Object.fromEntries(Object.entries(attached)
          .map(([name,pixels])=>[name,fromPixels(pixels,spec.width,spec.height)]));
      }
      if(!pieces.face&&look.face!=='none'&&!hidden.includes('face')){
        const file=catalog.originalFaces?.[selected.body]?.[selected.direction];
        if(file){const data=texture(images.get(file),file,'face',null,catalog.faceColorProtection?.[selected.body]?.[selected.direction]||[]).pixels;
          pieces.face={full:fromPixels(fitted([file,selected.key,fi,skin?.join(',')||''].join(':'),()=>api.attach(data,'face',rest,pose,socket,padding,spec.width,spec.height)).full,spec.width,spec.height)};}
      }
      if(!pieces.hair&&look.hair!=='none'&&!hidden.includes('hair')){
        const file=catalog.originalHairs?.[selected.body]?.[selected.direction];
        if(file){const palette=look.hairColor&&look.hairColor!=='brown'?api.hairs[look.hairColor]?.ramp:null;
          const data=texture(images.get(file),file,'hair',palette).pixels;
          pieces.hair={full:fromPixels(fitted([file,selected.key,fi,palette?.join(',')||''].join(':'),()=>api.attach(data,'hair',rest,pose,socket,padding,spec.width,spec.height)).full,spec.width,spec.height)};}
      }
      const palmFile=catalog.originalHands?.[selected.body]?.[selected.direction];
      if(palmFile&&!hidden.includes('foreground')&&catalog.headFit!=='canonical-neck-v7'){
        const data=texture(images.get(palmFile),palmFile,'skin',skin).pixels;
        const attached=fitted([palmFile,selected.key,fi,skin?.join(',')||''].join(':'),()=>api.pair(data,'gloves',rest,pose,padding,spec.width,spec.height));
        pieces.hands=Object.fromEntries(Object.entries(attached).map(([name,pixels])=>[name,fromPixels(api.clipToHead(pixels,neutralPixels),spec.width,spec.height)]));
      }
      const cleanHeadFile=catalog.originalHeads?.[selected.body]?.[selected.direction];
      if(cleanHeadFile&&!hidden.includes('headBase')){
        const data=texture(images.get(cleanHeadFile),cleanHeadFile,'headSkin',skin).pixels;
        pieces.headBase={full:fromPixels(fitted([cleanHeadFile,selected.key,fi,skin?.join(',')||''].join(':'),()=>api.attach(data,'head',rest,pose,socket,padding,spec.width,spec.height)).full,spec.width,spec.height)};
      }
      if(pieces.face&&pieces.headBase){
        const fc=pieces.face.full,hc=pieces.headBase.full;
        const data=fc.getContext('2d').getImageData(0,0,spec.width,spec.height).data,mask=hc.getContext('2d').getImageData(0,0,spec.width,spec.height).data;
        pieces.face.full=fromPixels(api.clipToHead(data,mask),spec.width,spec.height);
      }
      if(coveredFeet){
        const mask=fromPixels(coveredFeet,spec.width,spec.height);
        for(const c of [originalFrame,pieces.pants?.full].filter(Boolean)){const cx=c.getContext('2d');cx.save();cx.globalCompositeOperation='destination-out';cx.drawImage(mask,0,0);cx.restore();}
      }
      ctx.clearRect(0,0,spec.width,spec.height);
      const calibration=catalog.headCalibration?.[selected.direction]||{};
      if(headStyle?.hairOcclusion==='crown'&&pieces.hair){const c=pieces.hair.full,d=c.getContext('2d').getImageData(0,0,spec.width,spec.height).data;
        pieces.hair.full=fromPixels(api.clipHairCrown(d,rest,socket,padding,spec.width,spec.height,headStyle.hairlineY||34,calibration.hairX||0,calibration.hairY||0),spec.width,spec.height);}
      const hairPass=render=>render();
      const full=slot=>{if(pieces[slot]?.full){const render=()=>ctx.drawImage(pieces[slot].full,slot==='hair'?(calibration.hairX||0):0,slot==='hair'?(calibration.hairY||0):0);if(slot==='hair')hairPass(render);else render();}};
      const original=slot=>{
        if(['face','hair','headBase'].includes(slot)&&pieces[slot])return;
        if(hidden.includes(slot)||look[slot]==='none'||descriptor(slot,look[slot]))return;
        if(slot==='top'&&descriptor('torso',look.torso))return;
        if(slot==='hair'&&hideHair)return;
        const file=selected.layers[slot],image=file&&map.get(file);if(!image)return;
        if(slot==='top'&&selected.body==='feminino'&&selected.clip&&catalog.baseClothingFit!=='native-underwear-v8'){
          const c=canvas(spec.width,spec.height),cx=c.getContext('2d');cx.drawImage(image,fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
          const d=cx.getImageData(0,0,c.width,c.height).data;
          ctx.drawImage(fromPixels(api.closeTopCoverage(d,neutralPixels,pose,padding,spec.width,spec.height),spec.width,spec.height),0,0);
        }else if(slot==='hair'&&look.hairColor&&look.hairColor!=='brown'){
          const c=canvas(spec.width,spec.height),cx=c.getContext('2d');cx.drawImage(image,fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
          const d=cx.getImageData(0,0,c.width,c.height).data;
          cx.putImageData(new ImageData(api.recolor(d,api.materialMask(d,'hair'),api.hairs[look.hairColor].ramp),c.width,c.height),0,0);ctx.drawImage(c,calibration.hairX||0,calibration.hairY||0);
        }else ctx.drawImage(image,fi*spec.width,0,spec.width,spec.height,slot==='hair'?(calibration.hairX||0):0,slot==='hair'?(calibration.hairY||0):0,spec.width,spec.height);
      };
      const arms=['LEFT','RIGHT'].sort((a,b)=>(pose.find(j=>j.label===a+' ARM').z_index||0)-(pose.find(j=>j.label===b+' ARM').z_index||0));
      const behind=selected.direction==='north'?arms:selected.direction==='south'?[]:arms.slice(0,1);
      const headPixels=pieces.headBase?.full.getContext('2d').getImageData(0,0,spec.width,spec.height).data;
      const inFront=arms.filter(side=>!behind.includes(side));
      for(const gloveSlot of ['hands','gloves'])if(pieces[gloveSlot]&&behind.length){
        const j=Object.fromEntries(pose.map(p=>[p.label,{x:p.x*128+padding,y:p.y*128+padding}]));
        const hip={x:(j['LEFT HIP'].x+j['RIGHT HIP'].x)/2,y:(j['LEFT HIP'].y+j['RIGHT HIP'].y)/2};
        const radius=Math.max(5,Math.min(12,Math.hypot(j['LEFT SHOULDER'].x-j['RIGHT SHOULDER'].x,j['LEFT SHOULDER'].y-j['RIGHT SHOULDER'].y)/2+2));
        for(const side of behind){
          const cc=pieces[gloveSlot][side],cx=cc.getContext('2d'),d=cx.getImageData(0,0,spec.width,spec.height);
          for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
            const i=(y*spec.width+x)*4;if(!d.data[i+3]||neutralPixels[i+3]<100)continue;
            const torso=y>=j.NECK.y-1&&y<=hip.y+6&&MareMotion96.distanceToSegment({x,y},j.NECK,hip)<radius;
            const head=headPixels&&headPixels[i+3]>=128;
            if(torso||head)d.data[i+3]=0;
          }
          cx.putImageData(d,0,0);
        }
      }
      const foreground={};
      if(selected.layers.foreground){
        const image=map.get(selected.layers.foreground),c=canvas(spec.width,spec.height),cx=c.getContext('2d');
        cx.drawImage(image,fi*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
        const src=cx.getImageData(0,0,spec.width,spec.height).data,groups={LEFT:new Uint8ClampedArray(src.length),RIGHT:new Uint8ClampedArray(src.length)};
        const j=Object.fromEntries(pose.map(p=>[p.label,{x:p.x*128+padding,y:p.y*128+padding}]));
        for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){const i=(y*spec.width+x)*4;if(!src[i+3])continue;
          const dl=MareMotion96.distanceToSegment({x,y},j['LEFT ELBOW'],j['LEFT ARM']),dr=MareMotion96.distanceToSegment({x,y},j['RIGHT ELBOW'],j['RIGHT ARM']);
          const side=dl<dr?'LEFT':'RIGHT';groups[side].set(src.subarray(i,i+4),i);
        }for(const side of ['LEFT','RIGHT'])foreground[side]=fromPixels(groups[side],spec.width,spec.height);
      }
      if(selected.direction!=='north')full('cloak');
      ctx.drawImage(originalFrame,0,0);
      if(pieces.hands)for(const side of behind)ctx.drawImage(pieces.hands[side],0,0);
      for(const side of behind)if(foreground[side])ctx.drawImage(foreground[side],0,0);
      if(pieces.gloves)for(const side of behind)ctx.drawImage(pieces.gloves[side],0,0);
      original('pants');full('pants');
      if(pieces.boots)for(const side of ['LEFT','RIGHT'].sort((a,b)=>(pose.find(j=>j.label===a+' LEG').z_index||0)-(pose.find(j=>j.label===b+' LEG').z_index||0)))ctx.drawImage(pieces.boots[side],0,0);
      original('top');full('torso');
      if(selected.direction==='north')full('cloak');
      else if(pieces.cloak){
        const neck=pose.find(j=>j.label==='NECK').y*128+padding;
        ctx.save();ctx.beginPath();ctx.rect(0,0,spec.width,Math.round(neck+3));ctx.clip();full('cloak');ctx.restore();
      }
      original('headBase');full('headBase');
      original('face');full('face');
      if(!hideHair){hairPass(()=>original('hair'));full('hair');}full('head');
      if(pieces.hands)for(const side of inFront)ctx.drawImage(pieces.hands[side],0,0);
      for(const side of inFront)if(foreground[side])ctx.drawImage(foreground[side],0,0);
      if(pieces.gloves)for(const side of inFront)ctx.drawImage(pieces.gloves[side],0,0);
    }
    return {prepare,requiredFiles,draw,get cacheSize(){return textures.size;},get attachmentCacheSize(){return attachments.size;}};
  }
  window.MareWardrobe96={create};
})();
