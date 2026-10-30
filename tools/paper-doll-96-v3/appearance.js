(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./motion.js') : root.MareMotion96,typeof module === 'object' && module.exports ? require('./surface.js') : root.MareSurface96);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareAppearance96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function (motion,surface) {
  'use strict';
  const hex = value => value.match(/[a-f0-9]{2}/gi).map(n => parseInt(n, 16));
  const skins = {
    porcelain: { name: 'Porcelana', ramp: ['#694a40','#a57360','#d9a68b','#f4c7aa','#ffe3c6'] },
    light: { name: 'Claro', ramp: ['#634332','#956346','#c98e61','#edb17d','#ffd09c'] },
    warm: { name: 'Dourado', ramp: ['#543323','#855030','#b87943','#d99a5b','#f4bd7c'] },
    olive: { name: 'Oliva', ramp: ['#44382b','#6d573b','#9a7b50','#bda06a','#ddc58c'] },
    copper: { name: 'Cobre', ramp: ['#432b25','#6c3e2c','#985937','#bd7a49','#dfa169'] },
    brown: { name: 'Moreno', ramp: ['#33231f','#50352a','#795039','#a27450','#c3976c'] },
    dark: { name: 'Escuro', ramp: ['#241c1b','#3b2925','#573c30','#785641','#a27b59'] },
    ebony: { name: 'Ébano', ramp: ['#19171a','#2a2325','#41312e','#5d463b','#82654f'] }
  };
  const hairs = {
    black: { name: 'Preto', ramp: ['#10131c','#202530','#353d49','#58616c','#7f8994'] },
    brown: { name: 'Castanho', ramp: ['#23171b','#452c27','#70472f','#a06a42','#cf995f'] },
    blonde: { name: 'Loiro', ramp: ['#4b3425','#805930','#b68a44','#dec574','#fff0ad'] },
    auburn: { name: 'Ruivo', ramp: ['#321923','#612b28','#9b4530','#cf713f','#f6ac65'] },
    silver: { name: 'Prateado', ramp: ['#34354d','#5c627b','#929bb0','#c4cddb','#edf1f5'] },
    blue: { name: 'Azul', ramp: ['#171b3b','#253565','#365a96','#5b91c6','#93d0e5'] },
    violet: { name: 'Violeta', ramp: ['#281b3b','#493369','#77509a','#ae7bc1','#dfb1e3'] },
    pink: { name: 'Rosa', ramp: ['#3e233a','#75405d','#ad6585','#d898b0','#f7cbda'] },
    green: { name: 'Verde', ramp: ['#172f2e','#2c5043','#497d58','#80ad72','#bbdca4'] },
    white: { name: 'Branco', ramp: ['#545369','#85869a','#b4bbca','#dce3ea','#ffffff'] }
  };
  function isSkin(r, g, b) { return r > 45 && g / r > .33 && g / r < .9 && r > b * 1.28; }
  function recolor(source, mask, ramp) {
    if (source.length / 4 !== mask.length || ramp.length !== 5) throw Error('Invalid material palette');
    const out = new Uint8ClampedArray(source), colours = ramp.map(hex);
    for (let p = 0; p < mask.length; p++) if (mask[p]) {
      const i = p * 4, colour = colours[Math.min(4, mask[p] - 1)];
      out[i] = colour[0]; out[i + 1] = colour[1]; out[i + 2] = colour[2];
    }
    return out;
  }
  function materialMask(source, type, protectedPixels=[]) {
    const mask = new Uint8Array(source.length / 4);
    const protectedSet=new Set(protectedPixels);
    const tones=[];
    if(type==='hair')for(let i=0;i<source.length;i+=4){
      if(source[i+3]<128)continue;
      const light=.2126*source[i]+.7152*source[i+1]+.0722*source[i+2];
      if(light>=20)tones.push(light);
    }
    tones.sort((a,b)=>a-b);
    // Fixed luminance bands keep tiny shade variations from becoming salt-and-pepper contrast.
    const cuts=[30,60,95,145];
    for (let p = 0; p < mask.length; p++) {
      const i = p * 4, r = source[i], g = source[i + 1], b = source[i + 2];
      if (!source[i + 3]||protectedSet.has(p)) continue;
      if (type === 'skin' && !isSkin(r, g, b)) continue;
      const light = .2126 * r + .7152 * g + .0722 * b;
      if (type === 'skin') mask[p] = light < 70 ? 1 : light < 112 ? 2 : light < 157 ? 3 : light < 202 ? 4 : 5;
      // Keep the native ink. Quantiles preserve shading in dark hairstyles;
      // fixed 52-point bins collapsed their entire range into one colour.
      else if(light>=20)mask[p]=1+cuts.filter(c=>light>c).length;
    }
    return mask;
  }
  const index = points => Object.fromEntries(points.map(p => [p.label, { x: p.x * 128, y: p.y * 128, z: p.z_index || 0 }]));
  function bone(a, b, c, d, padding, scaleAlong = true) {
    const old = Math.hypot(b.x - a.x, b.y - a.y), next = Math.hypot(d.x - c.x, d.y - c.y);
    if (old < .001 || next < .001) throw Error('Invalid attachment bone');
    const ux = (b.x - a.x) / old, uy = (b.y - a.y) / old, vx = (d.x - c.x) / next, vy = (d.y - c.y) / next;
    return v => {
      const x = v.x - b.x, y = v.y - b.y;
      const along = (x * ux + y * uy) * (scaleAlong ? next / old : 1), across = -x * uy + y * ux;
      return { x: d.x + along * vx - across * vy + padding, y: d.y + along * vy + across * vx + padding };
    };
  }
  function opaqueMesh(source,map,width=128,height=128) {
    let x0=width,y0=height,x1=0,y1=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(source[(y*width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
    if(x1===0)return [];
    const q=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
    return [[0,1,2],[0,2,3]].map(ids=>ids.map(i=>({source:q[i],target:map(q[i])})));
  }
  function pair(source, slot, restPoints, posePoints, padding, width, height) {
    const r = index(restPoints), p = index(posePoints), output = {};
    const endpoint = slot === 'boots' ? ' LEG' : ' ARM', parent = slot === 'boots' ? ' KNEE' : ' ELBOW';
    for (const side of ['LEFT', 'RIGHT']) {
      const other = side === 'LEFT' ? 'RIGHT' : 'LEFT', piece = new Uint8ClampedArray(source.length);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        if(!source[i+3])continue;
        const a = Math.hypot(x - r[side + endpoint].x, y - r[side + endpoint].y);
        const b = Math.hypot(x - r[other + endpoint].x, y - r[other + endpoint].y);
        if (a < b || (a === b && side === 'RIGHT')) piece.set(source.subarray(i, i + 4), i);
      }
      const map = bone(r[side + parent], r[side + endpoint], p[side + parent], p[side + endpoint], padding, false);
      output[side] = motion.rasterMesh(piece, 128, 128, opaqueMesh(piece,map), width, height);
    }
    return output;
  }
  function trouserMesh(restPoints, posePoints, box, padding) {
    const r = index(restPoints), p = index(posePoints), torso = motion.torsoTransform(restPoints, posePoints, padding);
    const transforms = {};
    for (const side of ['LEFT', 'RIGHT']) {
      transforms[side] = { upper: bone(r[side + ' HIP'], r[side + ' KNEE'], p[side + ' HIP'], p[side + ' KNEE'], padding),
        lower: bone(r[side + ' KNEE'], r[side + ' LEG'], p[side + ' KNEE'], p[side + ' LEG'], padding) };
    }
    const vertices = [], columns = 8, rows = 12;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      const source = { x: box.x0 + (box.x1 - box.x0) * x / columns, y: box.y0 + (box.y1 - box.y0) * y / rows };
      const d = side => motion.distanceToSegment(source, r[side + ' HIP'], r[side + ' LEG']);
      const wl = 1 / (d('LEFT') + 1) ** 4, wr = 1 / (d('RIGHT') + 1) ** 4;
      const mapped = side => {
        const knee = r[side + ' KNEE'].y, hip = r[side + ' HIP'].y;
        const t = Math.max(0, Math.min(1, (source.y - knee + 3) / 6));
        const upper = transforms[side].upper(source), lower = transforms[side].lower(source), top = torso.map(source);
        const h = Math.max(0, Math.min(1, (source.y - hip + 2) / 8));
        return { x: top.x * (1 - h) + (upper.x * (1 - t) + lower.x * t) * h,
          y: top.y * (1 - h) + (upper.y * (1 - t) + lower.y * t) * h };
      };
      const l = mapped('LEFT'), rr = mapped('RIGHT');
      vertices.push({ source, target: { x: (l.x * wl + rr.x * wr) / (wl + wr), y: (l.y * wl + rr.y * wr) / (wl + wr) } });
    }
    const triangles = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x, b = a + 1, c = a + columns + 1, d = c + 1;
      triangles.push([vertices[a], vertices[b], vertices[d]], [vertices[a], vertices[d], vertices[c]]);
    }
    return triangles;
  }
  function shoulderTransform(restPoints, posePoints, padding) {
    const r=index(restPoints),p=index(posePoints);
    const center=j=>({x:(j['LEFT SHOULDER'].x+j['RIGHT SHOULDER'].x)/2,y:(j['LEFT SHOULDER'].y+j['RIGHT SHOULDER'].y)/2});
    const a=center(r),b=center(p),rh={x:(r['LEFT HIP'].x+r['RIGHT HIP'].x)/2,y:(r['LEFT HIP'].y+r['RIGHT HIP'].y)/2},ph={x:(p['LEFT HIP'].x+p['RIGHT HIP'].x)/2,y:(p['LEFT HIP'].y+p['RIGHT HIP'].y)/2};
    const angle=Math.atan2(ph.y-p.NECK.y,ph.x-p.NECK.x)-Math.atan2(rh.y-r.NECK.y,rh.x-r.NECK.x),cos=Math.cos(angle),sin=Math.sin(angle);
    return {map(v){return {x:b.x+(v.x-a.x)*cos-(v.y-a.y)*sin+padding,y:b.y+(v.x-a.x)*sin+(v.y-a.y)*cos+padding};}};
  }
  function clipToHead(source, head) {
    if(source.length!==head.length)throw Error('Head mask dimensions differ');
    const out=new Uint8ClampedArray(source);
    for(let i=0;i<out.length;i+=4)out[i+3]=Math.min(out[i+3],head[i+3]);
    return out;
  }
  function clipHairCrown(source,rest,socket,padding,width,height,hairline,offsetX=0,offsetY=0){
    const nose=rest.find(j=>j.label==='NOSE'),nx=nose.x*128,ny=nose.y*128;
    const angle=socket?.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),out=new Uint8ClampedArray(source);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(!out[i+3])continue;
      const dx=x+.5+offsetX-padding-(socket?.x||0)-nx,dy=y+.5+offsetY-padding-(socket?.y||0)-ny;
      const nativeY=ny-dx*sn+dy*cs;
      if(nativeY<hairline)out.fill(0,i,i+4);
    }return out;
  }
  function attach(source, slot, rest, pose, socket, padding, width, height, box) {
    if (['boots', 'gloves'].includes(slot)) return pair(source, slot, rest, pose, padding, width, height);
    if (slot === 'pants') return { full: trousers(source, rest, pose, padding, width, height) };
    // The complete head family shares an integer translation. Raster rotation
    // of tiny facial features created holes and different W/E footprints.
    const headX=Math.round((socket?.x||0)+padding),headY=Math.round((socket?.y||0)+padding);
    const map = ['hair', 'face', 'head'].includes(slot)
      ? v=>({x:v.x+headX,y:v.y+headY})
      : slot==='cloak'?shoulderTransform(rest,pose,padding).map:motion.torsoTransform(rest, pose, padding).map;
    const mesh = slot === 'pants' ? trouserMesh(rest, pose, box, padding) : opaqueMesh(source,map);
    return { full: motion.rasterMesh(source, 128, 128, mesh, width, height) };
  }
  function trousers(source, restPoints, posePoints, padding, width, height) {
    const r=index(restPoints),p=index(posePoints),hipY=(r['LEFT HIP'].y+r['RIGHT HIP'].y)/2;
    const waist=new Uint8ClampedArray(source.length),parts={};
    for(const side of ['LEFT','RIGHT'])parts[side]={upper:new Uint8ClampedArray(source.length),lower:new Uint8ClampedArray(source.length)};
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const i=(y*128+x)*4;if(!source[i+3])continue;
      if(y<=hipY+4)waist.set(source.subarray(i,i+4),i);
      if(y<hipY+1)continue;
      const dl=motion.distanceToSegment({x,y},r['LEFT HIP'],r['LEFT LEG']),dr=motion.distanceToSegment({x,y},r['RIGHT HIP'],r['RIGHT LEG']);
      const side=dl<dr?'LEFT':'RIGHT',knee=r[side+' KNEE'].y;
      if(y<=knee+2)parts[side].upper.set(source.subarray(i,i+4),i);
      if(y>=knee-2)parts[side].lower.set(source.subarray(i,i+4),i);
    }
    const out=new Uint8ClampedArray(width*height*4);
    const overlay=data=>{for(let i=0;i<data.length;i+=4)if(data[i+3])out.set(data.subarray(i,i+4),i);};
    const sides=['LEFT','RIGHT'].sort((a,b)=>(p[a+' LEG'].z||0)-(p[b+' LEG'].z||0));
    for(const side of sides){
      for(const [part,a,b] of [['lower',' KNEE',' LEG'],['upper',' HIP',' KNEE']]){
        const map=bone(r[side+a],r[side+b],p[side+a],p[side+b],padding);
        overlay(motion.rasterMesh(parts[side][part],128,128,motion.affineMesh(map),width,height));
      }
    }
    overlay(motion.rasterMesh(waist,128,128,motion.affineMesh(motion.torsoTransform(restPoints,posePoints,padding).map),width,height));
    return out;
  }
  function fitPairToBody(source,slot,rest,pose,padding,width,height,body,restBody,sourceParts,options={}){
    if(options.material)return surface.nativeMaterial(source,slot,rest,pose,padding,width,height,body,sourceParts,{...options.material,handSurface:options.handSurface});
    if(!sourceParts||!sourceParts.LEFT||!sourceParts.RIGHT)return pair(source,slot,rest,pose,padding,width,height);
    const r=index(rest),p=index(pose),out={},end=slot==='boots'?' LEG':' ARM',parent=slot==='boots'?' KNEE':' ELBOW';
    for(const side of ['LEFT','RIGHT']){const material=sourceParts[side],map=bone(r[side+parent],r[side+end],p[side+parent],p[side+end],padding,false);
      let fitted=motion.rasterMesh(material,128,128,opaqueMesh(material,map),width,height);
      if(slot==='gloves'&&options.coverHand)fitted=surface.shapeCoveredHand(fitted,material,rest,pose,side,padding,width,height,body,options.handSurface);
      out[side]=surface.constrainVolume(fitted,material,body,restBody,width,height);
    }
    if(slot==='boots'&&options.occlusion!==false){
      const near=p['LEFT LEG'].z>=p['RIGHT LEG'].z?'LEFT':'RIGHT',far=near==='LEFT'?'RIGHT':'LEFT';
      const visible=surface.profile(body,pose,'boots',padding,width,height);
      // A distant boot cannot paint over the surface of the nearer leg.
      for(const v of visible.pixels)if(v.bone.side===near)out[far].fill(0,v.i,v.i+4);
    }
    return out;
  }
  function bootCoverage(body,rest,pose,padding,width,height,sourceParts){
    const mask=new Uint8ClampedArray(body.length);if(!sourceParts)return mask;
    const rb=surface.bones(rest,'boots'),pb=surface.bones(pose,'boots'),minimum={};
    for(const b of rb.list){
      let start=Infinity;const data=sourceParts[b.side];if(!data)continue;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3])start=Math.min(start,b.at(x,y).along/b.length);
      minimum[b.side]=start;
    }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(body[i+3]<128)continue;
      let chosen=null,best=Infinity;
      for(const b of pb.list){const p=b.at(x-padding,y-padding),distance=Math.hypot(p.across,p.along-Math.max(0,Math.min(b.length,p.along)));if(distance<best){best=distance;chosen={bone:b,...p};}}
      if(chosen&&best<17&&chosen.along/chosen.bone.length>=minimum[chosen.bone.side]-.02)mask[i+3]=255;
    }return mask;
  }
  function catalogItem(catalog, id, slot) {
    const item = catalog.find(item => item.itemId === Number(id));
    return item && item.kind === slot ? item : null;
  }
  function fitTrousersToBody(source, body, restPoints, posePoints, padding, width, height, restBody, sourceParts, options={}) {
    if(options.material)return surface.nativeMaterial(source,'pants',restPoints,posePoints,padding,width,height,body,sourceParts,options.material).full;
    if(restBody)return surface.transfer(source,'pants',restPoints,posePoints,padding,width,height,body,restBody,sourceParts).full;
    const r=index(restPoints),p=index(posePoints),out=new Uint8ClampedArray(body.length);
    const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const hip=midpoint(p['LEFT HIP'],p['RIGHT HIP']),restHip=midpoint(r['LEFT HIP'],r['RIGHT HIP']);
    const waistInverse=bone(p.NECK,hip,r.NECK,restHip,0),maps={};
    let sourceBottom=-1;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(source[(y*128+x)*4+3]>150)sourceBottom=Math.max(sourceBottom,y);
    for(const side of ['LEFT','RIGHT'])maps[side]={upper:bone(p[side+' HIP'],p[side+' KNEE'],r[side+' HIP'],r[side+' KNEE'],0),lower:bone(p[side+' KNEE'],p[side+' LEG'],r[side+' KNEE'],r[side+' LEG'],0)};
    const sample=point=>{
      if(point.y>sourceBottom+.5)return -1;
      const xx=Math.round(point.x),yy=Math.round(point.y),direct=xx>=0&&yy>=0&&xx<128&&yy<128?(yy*128+xx)*4:-1;
      if(direct>=0&&source[direct+3]>150)return direct;
      let best=Infinity,found=-1;
      for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){
        const x=xx+dx,y=yy+dy,d=dx*dx+dy*dy;if(x<0||y<0||x>=128||y>=128||d>=best)continue;
        const i=(y*128+x)*4;if(source[i+3]>150&&Math.max(source[i],source[i+1],source[i+2])>=55){best=d;found=i;}
      }
      return found;
    };
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,v={x:x-padding,y:y-padding};
      if(body[i+3]<100||v.y<hip.y-7)continue;
      const distance=side=>Math.min(motion.distanceToSegment(v,p[side+' HIP'],p[side+' KNEE']),motion.distanceToSegment(v,p[side+' KNEE'],p[side+' LEG']));
      const dl=distance('LEFT'),dr=distance('RIGHT'),side=dl<dr?'LEFT':'RIGHT';
      const armDistance=Math.min(...['LEFT','RIGHT'].map(s=>motion.distanceToSegment(v,p[s+' ELBOW'],p[s+' ARM'])));
      if(armDistance<=5.5&&armDistance+2<Math.min(dl,dr))continue;
      if(Math.min(dl,dr)>13||v.y>p[side+' LEG'].y+2)continue;
      const knee=motion.distanceToSegment(v,p[side+' HIP'],p[side+' KNEE']),shin=motion.distanceToSegment(v,p[side+' KNEE'],p[side+' LEG']);
      const point=v.y<hip.y+3?waistInverse(v):(knee<shin?maps[side].upper(v):maps[side].lower(v));
      const from=sample(point);if(from<0)continue;
      out.set(source.subarray(from,from+4),i);out[i+3]=Math.min(body[i+3],out[i+3]);
      if(Math.max(body[i],body[i+1],body[i+2])<55){out[i]=body[i];out[i+1]=body[i+1];out[i+2]=body[i+2];}
    }
    return out;
  }
  function closeTopCoverage(source, body, posePoints, padding, width, height) {
    const p=index(posePoints),out=new Uint8ClampedArray(source),hip={x:(p['LEFT HIP'].x+p['RIGHT HIP'].x)/2,y:(p['LEFT HIP'].y+p['RIGHT HIP'].y)/2};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(body[i+3]<100){out[i+3]=0;continue;}
      const point={x:x-padding,y:y-padding};
      if(point.y<p.NECK.y||point.y>hip.y-7||motion.distanceToSegment(point,p.NECK,hip)>16||out[i+3]>150)continue;
      if(Math.max(body[i],body[i+1],body[i+2])-Math.min(body[i],body[i+1],body[i+2])>28||Math.max(body[i],body[i+1],body[i+2])<70)continue;
      let best=Infinity,from=-1;
      for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){
        const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;if(xx<0||yy<0||xx>=width||yy>=height||d>=best)continue;
        const j=(yy*width+xx)*4;if(source[j+3]>150&&source[j+2]>source[j]){best=d;from=j;}
      }
      if(from>=0)out.set(source.subarray(from,from+4),i);
    }
    return out;
  }
  return { skins, hairs, recolor, materialMask, isSkin, opaqueMesh, shoulderTransform, clipToHead, clipHairCrown, attach, pair, fitPairToBody, bootCoverage, trousers, fitTrousersToBody, closeTopCoverage, trouserMesh, catalogItem };
});
