(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./surface.js') : root.MareSurface96);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareTorso96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function (surface) {
  'use strict';
  const geometry = points => {
    const j = Object.fromEntries(points.map(p => [p.label, { x: p.x * 128, y: p.y * 128, z: p.z_index || 0 }]));
    const hip = { x: (j['LEFT HIP'].x + j['RIGHT HIP'].x) / 2, y: (j['LEFT HIP'].y + j['RIGHT HIP'].y) / 2 };
    return { j, axis: surface.axis(j.NECK, hip), shoulder: Math.max(10, Math.abs(j['LEFT SHOULDER'].x - j['RIGHT SHOULDER'].x) / 2 + 1),
      waist: Math.max(8, Math.abs(j['LEFT HIP'].x - j['RIGHT HIP'].x) / 2 + 2) };
  };
  const radius = (g, t) => g.shoulder * (1 - t) + g.waist * t;
  // The dorsal surface occludes arms aiming away from the camera. The same
  // region is used by the native back repair and by item ownership.
  const backCore = (g,x,y) => {
    const q=g.axis.at(x,y),t=q.along/g.axis.length;
    const w=(g.shoulder-.5)*(1-Math.max(0,t))+(g.waist-1)*Math.max(0,t);
    return t>=0&&t<=.84&&Math.abs(q.across)<=w;
  };
  const skin = (r,g,b) => r > 45 && r > b * 1.25 && g / r > .28 && g / r < .94;
  const garment = (r,g,b) => Math.max(r,g,b)>=72 && Math.max(r,g,b)-Math.min(r,g,b)<=32 || b>r*1.1 && b>=g*.85;
  // Item-independent ownership from native body pixels and measured joints.
  // Old foreground strips and an item's colours cannot change these masks.
  function ownership(body, points, padding, width, height) {
    const g=geometry(points), hands=new Uint8Array(width*height), arms=new Uint8Array(hands.length), cloth=new Uint8Array(hands.length);
    const bones=['LEFT','RIGHT'].map(side=>({side,z:g.j[side+' ARM'].z,lower:surface.axis(g.j[side+' ELBOW'],g.j[side+' ARM']),upper:surface.axis(g.j[side+' SHOULDER'],g.j[side+' ELBOW'])}));
    const distance=(a,x,y)=>{const p=a.at(x,y);return Math.hypot(p.across,p.along-Math.max(0,Math.min(a.length,p.along)));};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const p=y*width+x,i=p*4;if(body[i+3]<128)continue;
      const xx=x-padding,yy=y-padding,q=g.axis.at(xx,yy),t=q.along/g.axis.length;
      const isSkin=skin(body[i],body[i+1],body[i+2]),isGarment=garment(body[i],body[i+1],body[i+2]);
      const sorted=bones.map(b=>({...b,d:distance(b.lower,xx,yy),u:distance(b.upper,xx,yy)})).sort((a,b)=>a.d-b.d),b=sorted[0];
      const torsoDistance=Math.abs(q.across);
      const backView=bones.every(a=>a.z<g.j.NECK.z),visible=a=>a.z>=g.j.NECK.z||backView&&!backCore(g,xx,yy);
      const palm=isSkin && bones.some(a=>{const v=a.lower.at(xx,yy);return visible(a)&&Math.hypot(xx-a.lower.b.x,yy-a.lower.b.y)<=6.3&&v.along>a.lower.length*.6;});
      const lower=isSkin && bones.some(a=>{const v=a.lower.at(xx,yy);return visible(a)&&distance(a.lower,xx,yy)<3.8&&v.along>=0&&v.along<=a.lower.length+5;});
      if(palm||lower)hands[p]=1;
      const upper=b.upper.at(xx,yy),bareUpper=isSkin && visible(b) && b.u<3.8 && b.u+.65<torsoDistance && upper.along>b.upper.length*.48;
      if(hands[p]||lower||bareUpper)arms[p]=1;
      const wide=Math.max(13,g.shoulder+3)*(1-Math.max(0,t))+Math.max(9,g.waist+1)*Math.max(0,t);
      const chest=t>=-.28&&t<=1.02&&Math.abs(q.across)<=wide;
      const sleeve=bones.some(a=>{const v=a.upper.at(xx,yy);return v.along>=-3&&v.along<=a.upper.length*.44&&Math.abs(v.across)<5;});
      const nativeTop=isGarment&&!isSkin&&yy>=g.j.NECK.y-7&&yy<g.axis.b.y-7;
      if(((chest||sleeve)&&!hands[p]&&(!arms[p]||sleeve)||nativeTop)){cloth[p]=1;arms[p]=0;}
    }
    // Keep the hand's own outline. Never grow outside the native silhouette.
    const core=new Uint8Array(hands),armCore=new Uint8Array(arms);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const p=y*width+x,i=p*4;if(!body[i+3]||Math.max(body[i],body[i+1],body[i+2])>=65)continue;
      if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>core[(y+dy)*width+x+dx])){hands[p]=arms[p]=1;cloth[p]=0;}
      else if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>armCore[(y+dy)*width+x+dx])){arms[p]=1;cloth[p]=0;}
    }
    return {hands,arms,cloth};
  }
  function fit(source, body, restPoints, posePoints, padding, width, height, handSurface, ownedMask, panels) {
    if (source.length !== 128 * 128 * 4 || body.length !== width * height * 4) throw Error('Invalid torso material');
    const rest = geometry(restPoints), pose = geometry(posePoints), out = new Uint8ClampedArray(body.length);
    const owned=ownedMask||ownership(body,posePoints,padding,width,height,handSurface);
    const sourcePixels=[];for(let i=0;i<source.length;i+=4)if(source[i+3]>=128)sourcePixels.push(i/4);
    const sample = (x, y) => {
      const xx = Math.round(x), yy = Math.round(y);
      let found = -1, distance = Infinity;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const sx = xx + dx, sy = yy + dy, d = dx * dx + dy * dy;
        if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128 || d >= distance) continue;
        const i = (sy * 128 + sx) * 4;
        if (source[i + 3] >= 128) { found = i; distance = d; }
      }
      if(found<0)for(const p of sourcePixels){const d=(p%128-xx)**2+(Math.floor(p/128)-yy)**2;if(d<distance){distance=d;found=p*4;}}
      return found;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const xx = x - padding, yy = y - padding, q = pose.axis.at(xx, yy), t = q.along / pose.axis.length;
      const shoulderCoverage=panels&&body[i+3]&&yy>=pose.j.NECK.y&&t<=.5&&Math.abs(q.across)<=pose.shoulder+3&&!owned.hands[y*width+x];
      const hem=panels&&body[i+3]&&t>1&&t<1.65&&!owned.hands[y*width+x]&&!owned.arms[y*width+x];
      if (!owned.cloth[y*width+x]&&!shoulderCoverage&&!hem) continue;
      const p = rest.axis.point(t * rest.axis.length, q.across * radius(rest, t) / radius(pose, t));
      if(hem){const sx=Math.round(p.x),sy=Math.round(p.y),from=(sy*128+sx)*4;if(sx>=0&&sx<128&&sy>=0&&sy<128&&source[from+3])out.set(source.subarray(from,from+4),i);continue;}
      const from = sample(p.x, p.y);
      if (from >= 0) { out.set(source.subarray(from, from + 4), i); out[i + 3] = 255; }
    }
    if(!panels)return { full: out };
    // Loose robe/coat panels retain their authored silhouette outside the bare
    // body. They follow the waist/shoulders; exposed hands are restored later.
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const xx=x-padding,yy=y-padding,q=pose.axis.at(xx,yy),t=q.along/pose.axis.length;if(t<.1||t>2.5)continue;
      const p=rest.axis.point(t*rest.axis.length,q.across*Math.max(8,radius(rest,Math.min(t,1)))/Math.max(8,radius(pose,Math.min(t,1)))),sx=Math.round(p.x),sy=Math.round(p.y),from=(sy*128+sx)*4,i=(y*width+x)*4;
      if(sx<0||sx>=128||sy<0||sy>=128||!source[from+3]||out[i+3])continue;
      if(owned.hands[y*width+x]||owned.arms[y*width+x])continue;
      if(t<.9&&Math.abs(q.across)<pose.shoulder+2)continue;
      out.set(source.subarray(from,from+4),i);
    }
    // Inverse projection can separate a subpixel hem edge into tiny islands.
    // Cull only detached islands; the main robe and connected ornaments remain.
    const visited=new Uint8Array(width*height);
    for(let p=0;p<visited.length;p++){
      if(visited[p]||!out[p*4+3])continue;
      const group=[p];visited[p]=1;
      for(let k=0;k<group.length;k++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const x=group[k]%width+dx,y=Math.floor(group[k]/width)+dy,n=y*width+x;
        if(x<0||y<0||x>=width||y>=height||visited[n]||!out[n*4+3])continue;
        visited[n]=1;group.push(n);
      }
      if(group.length<5)for(const n of group)out.fill(0,n*4,n*4+4);
    }
    const result={full:out,LEFT:new Uint8ClampedArray(body.length),RIGHT:new Uint8ClampedArray(body.length)};
    const bones=[];
    for(const side of ['LEFT','RIGHT'])for(const [part,from,to] of [['upper',' SHOULDER',' ELBOW'],['lower',' ELBOW',' ARM']]){const material=panels[side+part],pixels=[];if(material)for(let i=0;i<material.length;i+=4)if(material[i+3])pixels.push(i/4);bones.push({side,part,material,pixels,r:surface.axis(rest.j[side+from],rest.j[side+to]),p:surface.axis(pose.j[side+from],pose.j[side+to])});}
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const n=y*width+x,i=n*4;if(!body[i+3]||!owned.arms[n]&&!owned.cloth[n]&&!owned.hands[n])continue;
      const xx=x-padding,yy=y-padding,candidates=bones.map(b=>{const q=b.p.at(xx,yy);return {b,q,d:Math.hypot(q.across,q.along-Math.max(0,Math.min(b.p.length,q.along)))};}).sort((a,b)=>a.d-b.d),{b,q,d}=candidates[0];
      if(!b.material||d>5.5||q.along< -2||q.along>b.p.length+(b.part==='upper'?1:0))continue;
      if(b.part==='lower'&&q.along>b.p.length*.97)continue;
      const back=bones.every(v=>pose.j[v.side+' ARM'].z<pose.j.NECK.z);
      if(back&&backCore(pose,xx,yy)||!owned.arms[n]&&!owned.hands[n]&&Math.abs(pose.axis.at(xx,yy).across)<pose.shoulder-2)continue;
      const point=b.r.point(q.along/b.p.length*b.r.length,q.across);let from=-1,best=Infinity;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const sx=Math.round(point.x)+dx,sy=Math.round(point.y)+dy,j=(sy*128+sx)*4,dd=dx*dx+dy*dy;if(sx<0||sx>=128||sy<0||sy>=128||dd>=best||!b.material[j+3])continue;best=dd;from=j;}
      if(from<0)for(const p of b.pixels){const dd=(p%128-point.x)**2+(Math.floor(p/128)-point.y)**2;if(dd<best){best=dd;from=p*4;}}
      if(from>=0)result[b.side].set(b.material.subarray(from,from+4),i);
    }
    return result;
  }
  function baseClothing(body, points, padding, width, height, female) {
    const g = geometry(points), pants = new Uint8ClampedArray(body.length), top = new Uint8ClampedArray(body.length);
    const hip = g.axis.point(g.axis.length, 0), counts = { pants: 0, top: 0 };
    const ramp = [[12,16,27],[22,30,48],[32,46,69],[46,63,87],[66,84,109]];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, r = body[i], green = body[i + 1], b = body[i + 2];
      const neutral = Math.max(r, green, b) >= 72 && Math.max(r, green, b) - Math.min(r, green, b) <= 32;
      const navy = b > r * 1.1 && b >= green * .85;
      if (body[i + 3] < 128 || !neutral && !navy) continue;
      const xx = x - padding, yy = y - padding, v = g.axis.at(xx, yy);
      let slot;
      if(Math.max(r,green,b)>=120&&Math.max(r,green,b)-Math.min(r,green,b)<=10&&yy>=g.j.NECK.y-7)slot=female&&yy<hip.y-8?'top':'pants';
      else if (yy >= hip.y - 8 && yy <= hip.y + 17 && Math.abs(v.across) < g.waist + 9) slot = 'pants';
      else if (female && yy >= g.j.NECK.y - 7 && yy < hip.y - 8 && Math.abs(v.across) < g.shoulder + 7) slot = 'top';
      if (!slot) continue;
      const shade = Math.max(1, Math.min(4, Math.floor((r + green + b) / 3 / 55)));
      (slot === 'pants' ? pants : top).set(navy ? [r, green, b, 255] : [...ramp[shade], 255], i); counts[slot]++;
    }
    const legs = ['LEFT','RIGHT'].map(side => surface.axis(g.j[side + ' HIP'], g.j[side + ' KNEE']));
    const arms = ['LEFT','RIGHT'].map(side => surface.axis(g.j[side + ' ELBOW'], g.j[side + ' ARM']));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, r = body[i], green = body[i + 1], b = body[i + 2];
      if (pants[i + 3] || body[i + 3] < 128) continue;
      const xx = x - padding, yy = y - padding;
      const skin = r > 65 && r > b * 1.25 && green / r > .3 && green / r < .93;
      if (!skin && Math.max(r, green, b) >= 65) continue;
      const leg = legs.some(a => { const p = a.at(xx, yy); return p.along >= -1 && p.along <= a.length * .68 && Math.abs(p.across) <= 7; });
      const hand = arms.some(a => { const p = a.at(xx, yy); return p.along >= a.length * .45 && p.along <= a.length + 3 && Math.abs(p.across) < 3.5; });
      const pelvis = yy >= hip.y - 5 && yy <= hip.y + 3 && Math.abs(g.axis.at(xx, yy).across) <= g.waist + 2;
      if (!leg && !pelvis || hand) continue;
      const shade = Math.max(r, green, b) < 65 ? 0 : (.2126*r+.7152*green+.0722*b < 150 ? 2 : 3);
      pants.set([...ramp[shade], 255], i); counts.pants++;
    }
    // Recover only native dark edges immediately adjoining the garment.
    for (const data of [pants, top]) {
      const snapshot = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        if (snapshot[i + 3] || body[i + 3] < 128 || Math.max(body[i], body[i + 1], body[i + 2]) > 62) continue;
        if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => snapshot[((y + dy) * width + x + dx) * 4 + 3])) data.set([...ramp[0], 255], i);
      }
    }
    return { pants, top, counts };
  }
  function unpack(pixels){const n=pixels.length/4,hands=new Uint8Array(n),arms=new Uint8Array(n),cloth=new Uint8Array(n);for(let p=0;p<n;p++){cloth[p]=pixels[p*4]>=128?1:0;hands[p]=pixels[p*4+1]>=128?1:0;arms[p]=pixels[p*4+2]>=128?1:0;}return {cloth,hands,arms};}
  return { fit, geometry, radius, baseClothing, ownership, garment, unpack, backCore };
});
