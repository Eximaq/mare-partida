/* Native equipment extraction contract for the 96px review library.
 * All input/output pixels use a 128px cell with pivot (64,112). Do not extract
 * only changed colours: unchanged ink and fabric inside a garment are real
 * material too. Paired garments are stored as complete LEFT/RIGHT pieces.
 */
'use strict';
const motion = require('./paper-doll-96-v3/motion.js');
const SIZE=128, PIXELS=SIZE*SIZE;
const blank=()=>new Uint8ClampedArray(PIXELS*4);
const pointIndex=points=>Object.fromEntries(points.map(p=>[p.label,{x:p.x*SIZE,y:p.y*SIZE,z:p.z_index||0}]));
function pixelAlpha(source){const out=new Uint8ClampedArray(source);for(let i=0;i<out.length;i+=4){if(out[i+3]<128)out.fill(0,i,i+4);else out[i+3]=255;}return out;}
function hue(r,g,b){const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(!d)return 0;return (((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60)+360)%360;}
function components(source){
  if(source.length!==PIXELS*4)throw Error('Equipment material must be native128');
  const seen=new Uint8Array(PIXELS),groups=[];
  for(let start=0;start<PIXELS;start++){
    if(seen[start]||!source[start*4+3])continue;
    const pixels=[start];seen[start]=1;
    for(let n=0;n<pixels.length;n++){
      const p=pixels[n],x=p%SIZE,y=Math.floor(p/SIZE);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy,j=yy*SIZE+xx;
        if(xx<0||yy<0||xx>=SIZE||yy>=SIZE||seen[j]||!source[j*4+3])continue;
        seen[j]=1;pixels.push(j);
      }
    }
    groups.push({pixels,area:pixels.length,box:{x0:Math.min(...pixels.map(p=>p%SIZE)),y0:Math.min(...pixels.map(p=>Math.floor(p/SIZE))),x1:Math.max(...pixels.map(p=>p%SIZE)),y1:Math.max(...pixels.map(p=>Math.floor(p/SIZE)))}});
  }
  return groups.sort((a,b)=>b.area-a.area);
}
function keepComponents(source,minArea=4){const out=new Uint8ClampedArray(source);for(const group of components(out))if(group.area<minArea)for(const p of group.pixels)out.fill(0,p*4,p*4+4);return out;}
function inkBorder(source,core){
  const out=blank();
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const p=y*SIZE+x,i=p*4;if(!source[i+3])continue;
    let keep=!!core[p];
    if(!keep&&Math.max(source[i],source[i+1],source[i+2])<65){
      for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<SIZE&&yy<SIZE&&core[yy*SIZE+xx]){keep=true;break;}
      }
    }
    if(keep)out.set(source.subarray(i,i+4),i);
  }
  return out;
}
const CLOAK_HEMS={23:{masculino:{south:81,north:86,west:86,east:86},feminino:{south:81,north:85,west:84,east:84}},24:{masculino:{south:90,north:90,west:90,east:91},feminino:{south:81,north:87,west:86,east:85}}};
function refineMaterial(source,definition,reference,view={}){
  const out=pixelAlpha(source);
  if(!['pants','cloak'].includes(definition.kind))return out;
  const core=new Uint8Array(PIXELS);
  for(let p=0;p<PIXELS;p++){
    const i=p*4,r=source[i],g=source[i+1],b=source[i+2],h=hue(r,g,b),x=p%SIZE,y=Math.floor(p/SIZE);if(!source[i+3])continue;
    if(definition.kind==='cloak'&&(y<45||y>(CLOAK_HEMS[definition.itemId]?.[view.body]?.[view.direction]??92)))continue;
    if(definition.kind==='cloak'&&view.direction==='south'&&x>=61&&x<=68&&y<=53&&h<35&&Math.max(r,g,b)>=65)continue;
    const unchangedSkin=reference&&reference[i+3]&&r>100&&h<33&&r>b*1.35&&Math.hypot(r-reference[i],g-reference[i+1],b-reference[i+2])<12;
    if(definition.kind==='pants'){
      const fabric=b>r*1.10&&g>b*.40,metal=Math.max(r,g,b)-Math.min(r,g,b)<48&&b>=r*.90&&b>45;
      const trim=h>=31&&h<=65&&r>85&&g>55&&b/r<.48;
      core[p]=fabric||metal||trim?1:0;
    }else if(definition.itemId===23)core[p]=!unchangedSkin&&h>=18&&h<=65&&r>65&&g/r>.49&&g/r<.90&&b/r<.49&&!(r>240&&b/r>.40)?1:0;
    else core[p]=!unchangedSkin&&((h>=260&&h<=350&&r>25)||(h>=31&&h<=65&&r>85&&g>55&&b/r<.47))?1:0;
  }
  const result=pixelAlpha(inkBorder(source,core));
  if(definition.kind==='pants')return keepComponents(result,15);
  for(const group of components(result)){
    const lower=group.box.y0>53;
    if(group.area<(lower?20:4))for(const p of group.pixels)result.fill(0,p*4,p*4+4);
  }
  return result;
}
function insidePolygon(x,y,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const GLOVE_SIDE_MASKS={
  masculino:{west:[[66,66],[75,66],[77,72],[76,81],[65,81],[63,77],[63,72]],east:[[52,65],[61,65],[64,71],[64,81],[51,81],[49,77],[49,71]]},
  feminino:{west:[[63,66],[72,66],[76,72],[75,82],[62,82],[60,78],[60,72]],east:[[56,66],[65,66],[68,72],[67,82],[54,82],[52,78],[52,72]]}
};
function glovePiece(source,definition,body,direction,rest,side){
  const r=pointIndex(rest),wrist=r[side+' ARM'],core=new Uint8Array(PIXELS),candidate=blank();
  const polygon=definition.pairMasks?.[body]?.[direction]||GLOVE_SIDE_MASKS[body]?.[direction];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const p=y*SIZE+x,i=p*4;if(!source[i+3])continue;
    const within=polygon?insidePolygon(x+.5,y+.5,polygon):Math.abs(x-wrist.x)<=5.5&&y>=Math.floor(wrist.y)-8&&y<=Math.ceil(wrist.y)+5;
    if(!within)continue;
    const rr=source[i],g=source[i+1],b=source[i+2],h=hue(rr,g,b),skin=rr>180&&h<34&&rr>b*1.5&&g/rr>.45&&g/rr<.86;
    candidate.set(source.subarray(i,i+4),i);
    if(definition.gloveDesign==='fingerless'||definition.itemId===25){
      const brown=rr>35&&rr>b*1.3&&h>=9&&h<=43&&rr<225,cream=h>=34&&h<=65&&rr>120&&g/rr>.65&&b/rr>.44;
      const grey=body==='feminino'&&direction==='east'&&Math.max(rr,g,b)-Math.min(rr,g,b)<45&&rr>65;
      if(!skin&&(brown||cream||grey)){
        core[p]=1;
        if(grey){const colour=rr<100?[87,40,28]:rr<150?[132,74,45]:[173,95,54];candidate[i]=colour[0];candidate[i+1]=colour[1];candidate[i+2]=colour[2];}
      }
    }else{
      if(!skin)core[p]=1;
      // Covered gloves use their own existing navy material for generated skin
      // fingertips. This makes the layer independent of the skin palette.
      else if(y>=wrist.y-2){const colour=definition.closedFingerRGB||[25,32,49];core[p]=1;candidate[i]=colour[0];candidate[i+1]=colour[1];candidate[i+2]=colour[2];}
    }
  }
  let result=inkBorder(candidate,core),groups=components(result);
  // A cuff, palm and fingers must form one piece. Fill single-pixel holes with
  // native neighbouring material, then discard unrelated old-body contours.
  for(let pass=0;pass<2;pass++){
    const before=new Uint8ClampedArray(result);
    for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++){
      const i=(y*SIZE+x)*4;if(before[i+3]||!candidate[i+3])continue;
      const neighbours=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy])=>((y+dy)*SIZE+x+dx)*4).filter(j=>before[j+3]);
      if(neighbours.length>=3)result.set(before.subarray(neighbours[0],neighbours[0]+4),i);
    }
  }
  result=pixelAlpha(result);groups=components(result);if(groups.length)for(const group of groups.slice(1))for(const p of group.pixels)result.fill(0,p*4,p*4+4);
  return result;
}
function transportPart(source,rest,fromSide,toSide,slot){
  const r=pointIndex(rest),end=slot==='boots'?' LEG':' ARM',parent=slot==='boots'?' KNEE':' ELBOW';
  const a=r[fromSide+parent],b=r[fromSide+end],c=r[toSide+parent],d=r[toSide+end];
  const angle=Math.atan2(d.y-c.y,d.x-c.x)-Math.atan2(b.y-a.y,b.x-a.x),cs=Math.cos(angle),sn=Math.sin(angle);
  const map=v=>({x:d.x+(v.x-b.x)*cs-(v.y-b.y)*sn,y:d.y+(v.x-b.x)*sn+(v.y-b.y)*cs});
  return motion.rasterMesh(source,SIZE,SIZE,motion.affineMesh(map),SIZE,SIZE);
}
function reefSteel(source){const out=new Uint8ClampedArray(source);for(let i=0;i<out.length;i+=4){const r=out[i],g=out[i+1],b=out[i+2],light=.2126*r+.7152*g+.0722*b;if(!out[i+3])continue;const warm=r>55&&g>28&&r>g*1.06&&r>b*1.18,ivory=r>190&&g>165&&b>125&&Math.max(r,g,b)-Math.min(r,g,b)<70;if(warm||ivory)out.set(light>200?[200,224,234]:light>150?[147,183,200]:light>95?[84,128,152]:[43,78,103],i);}return out;}
function extractPairedParts(native,definition,body,direction,rest){
  const r=pointIndex(rest),parts={LEFT:blank(),RIGHT:blank()};
  if(definition.kind==='gloves'){
    if(direction==='west'||direction==='east'){
      const near=direction==='west'?'LEFT':'RIGHT',far=near==='LEFT'?'RIGHT':'LEFT';
      parts[near]=glovePiece(native,definition,body,direction,rest,near);
      parts[far]=transportPart(parts[near],rest,near,far,'gloves');
    }else for(const side of ['LEFT','RIGHT'])parts[side]=glovePiece(native,definition,body,direction,rest,side);
  }else if(definition.kind==='boots'){
    const material=blank(),start=definition.cuffY??(definition.itemId===8?94:93);
    for(let y=start;y<=112;y++)for(let x=32;x<96;x++){const i=(y*SIZE+x)*4;if(native[i+3])material.set(native.subarray(i,i+4),i);}
    if(direction==='west'||direction==='east'){
      const near=direction==='west'?'LEFT':'RIGHT',far=near==='LEFT'?'RIGHT':'LEFT';
      parts[near]=keepComponents(material,4);parts[far]=transportPart(parts[near],rest,near,far,'boots');
    }else{
      for(const group of components(material)){
        if(group.area<4)continue;
        const cx=group.pixels.reduce((sum,p)=>sum+p%SIZE,0)/group.area,cy=group.pixels.reduce((sum,p)=>sum+Math.floor(p/SIZE),0)/group.area;
        const side=Math.hypot(cx-r['LEFT LEG'].x,cy-r['LEFT LEG'].y)<Math.hypot(cx-r['RIGHT LEG'].x,cy-r['RIGHT LEG'].y)?'LEFT':'RIGHT';
        for(const p of group.pixels)parts[side].set(material.subarray(p*4,p*4+4),p*4);
      }
    }
  }else throw Error('Paired extraction requires boots or gloves');
  // The native left Cordame cuff is one pixel short of its female south
  // wrist socket. Keep this calibration on the material, not on 416 poses.
  if(definition.itemId===25&&body==='feminino'&&direction==='south'){
    const shifted=blank();for(let y=0;y<SIZE-1;y++)for(let x=0;x<SIZE-1;x++){const i=(y*SIZE+x)*4;shifted.set(parts.LEFT.subarray(i,i+4),((y+1)*SIZE+x+1)*4);}parts.LEFT=shifted;
  }
  if(definition.itemId===9)for(const side of ['LEFT','RIGHT'])parts[side]=reefSteel(parts[side]);
  return parts;
}
function combine(parts,rest,slot){const out=blank(),r=pointIndex(rest),suffix=slot==='boots'?' LEG':' ARM';for(const side of ['LEFT','RIGHT'].sort((a,b)=>r[a+suffix].z-r[b+suffix].z)){for(let i=0;i<out.length;i+=4)if(parts[side][i+3])out.set(parts[side].subarray(i,i+4),i);}return out;}
function audit(source){const groups=components(source);return {opaquePixels:groups.reduce((sum,g)=>sum+g.area,0),components:groups.map(g=>({area:g.area,box:g.box})),partialAlpha:Array.from({length:PIXELS},(_,p)=>source[p*4+3]).filter(a=>a>0&&a<255).length};}
module.exports={reefSteel,refineMaterial,extractPairedParts,combine,components,audit,glovePiece,transportPart,pixelAlpha,GLOVE_SIDE_MASKS,CLOAK_HEMS};
