'use strict';
// Registration happens once, against each body's own rest pose. Animation
// frames use the existing native surface transport, never per-frame recentering.
const SIZE=128,blank=()=>new Uint8ClampedArray(SIZE*SIZE*4);
const points=pose=>Object.fromEntries(pose.map(j=>[j.label,{x:j.x*SIZE,y:j.y*SIZE,z:j.z_index||0}]));
function bounds(data){let x0=SIZE,y0=SIZE,x1=-1,y1=-1;for(let p=0;p<SIZE*SIZE;p++)if(data[p*4+3]>=128){const x=p%SIZE,y=Math.floor(p/SIZE);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return x1<0?null:{x0,y0,x1,y1,width:x1-x0+1,height:y1-y0+1};}
function groups(data){const seen=new Uint8Array(SIZE*SIZE),out=[];for(let p=0;p<seen.length;p++){if(seen[p]||data[p*4+3]<128)continue;const part=[p];seen[p]=1;for(let k=0;k<part.length;k++){const x=part[k]%SIZE,y=Math.floor(part[k]/SIZE);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*SIZE+xx;if(xx<0||yy<0||xx>=SIZE||yy>=SIZE||seen[q]||data[q*4+3]<128)continue;seen[q]=1;part.push(q);}}out.push(part);}return out.sort((a,b)=>b.length-a.length);}
function clean(data,min=3){const out=new Uint8ClampedArray(data);for(let i=0;i<out.length;i+=4){if(out[i+3]<128)out.fill(0,i,i+4);else out[i+3]=255;}for(const g of groups(out))if(g.length<min)for(const p of g)out.fill(0,p*4,p*4+4);return out;}
function moveScale(data,target){const box=bounds(data);if(!box)throw Error('Empty generated garment');const out=blank();for(let y=0;y<target.height;y++)for(let x=0;x<target.width;x++){const sx=box.x0+Math.min(box.width-1,Math.floor(x*box.width/target.width)),sy=box.y0+Math.min(box.height-1,Math.floor(y*box.height/target.height)),xx=target.x0+x,yy=target.y0+y;if(xx>=0&&yy>=0&&xx<SIZE&&yy<SIZE)out.set(data.subarray((sy*SIZE+sx)*4,(sy*SIZE+sx+1)*4),(yy*SIZE+xx)*4);}return out;}
function distance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
function split(data,pose,slot){const j=points(pose),keys=slot==='pants'?['LEFTupper','LEFTlower','RIGHTupper','RIGHTlower']:['LEFT','RIGHT'],out=Object.fromEntries(keys.map(k=>[k,blank()]));for(let p=0;p<SIZE*SIZE;p++){const i=p*4;if(!data[i+3])continue;const x=p%SIZE,y=Math.floor(p/SIZE);let best=Infinity,key;for(const k of keys){const side=k.startsWith('LEFT')?'LEFT':'RIGHT',from=slot==='pants'?(k.endsWith('upper')?' HIP':' KNEE'):slot==='boots'?' KNEE':' ELBOW',to=slot==='pants'?(k.endsWith('upper')?' KNEE':' LEG'):slot==='boots'?' LEG':' ARM',d=distance(x,y,j[side+from],j[side+to]);if(d<best){best=d;key=k;}}out[key].set(data.subarray(i,i+4),i);}return out;}
function register(data,pose,slot,guide,options={}){
 const j=points(pose),out=blank(),hip={x:(j['LEFT HIP'].x+j['RIGHT HIP'].x)/2,y:(j['LEFT HIP'].y+j['RIGHT HIP'].y)/2};data=clean(data);
 if(options.bodyIncluded&&['torso','gloves','boots'].includes(slot)){
  // PixelLab can translate a mannequin within a panel. Bind it to the actual
  // matching guide once, before extracting the garment or articulated limbs.
  const centroid=(pixels,white=false)=>{let sum=0,n=0;for(let y=20;y<40;y++)for(let x=24;x<108;x++){const i=(y*SIZE+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(pixels[i+3]&&(white?Math.min(r,g,b)>240:r>150&&r>b*1.3&&g/r>.35&&g/r<.85)){sum+=x;n++;}}return n?sum/n:null;};
  const source=centroid(data,options.matte==='white'),target=centroid(guide),dx=options.sourceOffsetX??(source!==null&&target!==null?Math.round(target-source):0);
  if(dx){const aligned=blank();for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const sx=x-dx;if(sx>=0&&sx<SIZE)aligned.set(data.subarray((y*SIZE+sx)*4,(y*SIZE+sx+1)*4),(y*SIZE+x)*4);}data=aligned;}
 }
 if(slot==='head'){
  if(options.rearTiara){const tones=new Set();for(let y=41;y<66;y++)for(let x=54;x<75;x++){const i=(y*SIZE+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]&&r>b*1.3&&g/r>.35&&g/r<.88)tones.add(r+','+g+','+b);}data=new Uint8ClampedArray(data);for(let p=0;p<SIZE*SIZE;p++){const i=p*4;if(p/SIZE>=41||tones.has(Array.from(data.subarray(i,i+3)).join(',')))data.fill(0,i,i+4);}data=clean(data);}
  const whiteBody=options.whiteHead?999:0;
  if(options.whiteHead){data=new Uint8ClampedArray(data);for(let i=0;i<data.length;i+=4)if(Math.min(...data.subarray(i,i+3))>=225)data.fill(0,i,i+4);}
  if(!options.bodyIncluded){const box=bounds(data),type=options.headType||'hat',width=type==='hood'?34:type==='diadem'?31:43,height=type==='hood'?43:type==='diadem'?Math.min(24,Math.round(width*box.height/box.width)):Math.min(31,Math.max(25,Math.round(width*box.height/box.width))),end=type==='hood'?j.NECK.y+10:type==='diadem'?j.NOSE.y-3:j.NOSE.y+3;return {full:clean(moveScale(data,{x0:Math.round(j.NECK.x-width/2),y0:Math.round(end-height),width,height}),2),parts:null};}
  // Exact native-body colours are excluded only inside the anatomical head;
  // gold/cream/feathers outside that mask are never treated as skin.
  const skinColours=new Set();for(let p=0;p<SIZE*SIZE;p++){const i=p*4,y=Math.floor(p/SIZE);if(guide[i+3]){const [r,g,b]=guide.subarray(i,i+3);if(r>b*1.25&&g/r>.28&&g/r<.94){skinColours.add(r+','+g+','+b);if(y>j.NECK.y+2&&data[i+3]){const [sr,sg,sb]=data.subarray(i,i+3);if(sr>sb*1.25&&sg/sr>.28&&sg/sr<.94)skinColours.add(sr+','+sg+','+sb);}}}}
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const i=(y*SIZE+x)*4;if(!data[i+3]||y>j.NECK.y+7)continue;const colour=Array.from(data.subarray(i,i+3)).join(',');if(skinColours.has(colour)||whiteBody>120&&y>=j.NOSE.y-3&&Math.min(...data.subarray(i,i+3))>240)continue;if(y>=j.NOSE.y-3&&Math.abs(x-j.NOSE.x)<10&&guide[i+3])continue;out.set(data.subarray(i,i+4),i);}for(const group of groups(out))if(group.every(p=>Math.floor(p/SIZE)>=j.NOSE.y-2))for(const p of group)out.fill(0,p*4,p*4+4);return options.normalizeBodyHead?register(clean(out,2),pose,slot,guide,{...options,normalizeBodyHead:false,bodyIncluded:false,whiteHead:false}):{full:clean(out,2),parts:null};
 }
 if(slot==='torso'){
  if(options.headlessTorso){const skin=new Set();for(let y=88;y<113;y++)for(let x=35;x<95;x++){const i=(y*SIZE+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]&&r>b*1.3&&g/r>.28&&g/r<.94&&b/r>.4)skin.add(r+','+g+','+b);}data=new Uint8ClampedArray(data);for(let i=0;i<data.length;i+=4)if(skin.has(Array.from(data.subarray(i,i+3)).join(',')))data.fill(0,i,i+4);data=clean(data,8);}

  const hasBody=options.bodyIncluded;
  if(options.matte!=='white'&&!hasBody){const largest=groups(data)[0],only=blank();for(const p of largest)only.set(data.subarray(p*4,p*4+4),p*4);data=only;const box=bounds(data),width=Math.round(Math.max(32,Math.abs(j['LEFT SHOULDER'].x-j['RIGHT SHOULDER'].x)+14)),height=options.longTorso?58:Math.round(width*box.height/box.width);data=clean(moveScale(data,{x0:Math.round(j.NECK.x-width/2),y0:Math.round(j.NECK.y-7),width,height}));}
  const bodyColours=new Set();if(options.matte!=='white'&&hasBody)for(let y=20;y<38;y++)for(let x=Math.round(j.NECK.x)-9;x<=j.NECK.x+9;x++){const i=(y*SIZE+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]&&r>b*1.3&&g/r>.28&&g/r<.94)bodyColours.add(r+','+g+','+b);}
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const i=(y*SIZE+x)*4;if(!data[i+3]||y<j.NECK.y-7||y>112)continue;const chest=Math.abs(x-j.NECK.x)<11&&y<hip.y+4,white=data[i]>=240&&data[i+1]>=240&&data[i+2]>=240;if(options.matte==='white'?white&&!chest:bodyColours.has(Array.from(data.subarray(i,i+3)).join(',')))continue;
   if(hasBody&&y>hip.y-3&&Math.max(...data.subarray(i,i+3))>=110&&Math.max(...data.subarray(i,i+3))-Math.min(...data.subarray(i,i+3))<=15)continue;out.set(data.subarray(i,i+4),i);}
  const garment=new Uint8ClampedArray(out);for(let y=Math.ceil(hip.y);y<113;y++)for(let x=1;x<127;x++){const i=(y*SIZE+x)*4;if(!out[i+3]||Math.max(...out.subarray(i,i+3))>65)continue;let fabric=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=((y+dy)*SIZE+x+dx)*4;if(garment[k+3]&&Math.max(...garment.subarray(k,k+3))>65)fabric=true;}if(!fabric)out.fill(0,i,i+4);}
  const parts={};for(const side of ['LEFT','RIGHT'])for(const part of ['upper','lower'])parts[side+part]=blank();
  for(let p=0;p<SIZE*SIZE;p++){const i=p*4;if(!out[i+3])continue;const x=p%SIZE,y=Math.floor(p/SIZE);for(const side of ['LEFT','RIGHT']){const sh=j[side+' SHOULDER'],el=j[side+' ELBOW'],wr=j[side+' ARM'],du=distance(x,y,sh,el),dl=distance(x,y,el,wr);if(Math.min(du,dl)>6)continue;const key=side+(du<dl?'upper':'lower');parts[key].set(out.subarray(i,i+4),i);}}
  return {full:clean(out,8),parts};
 }
 if(slot==='pants'){
  if(options.pantsCrop){data=new Uint8ClampedArray(data);data.fill(0,0,options.pantsCrop*SIZE*4);}
  if(options.bodyIncluded){
   const skin=new Set(),ys=options.headlessPants?[30,50]:[20,39];
   for(let y=ys[0];y<ys[1];y++)for(let x=53;x<75;x++){const i=(y*SIZE+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]&&r>b*1.3&&g/r>.35&&g/r<.88)skin.add(r+','+g+','+b);}
   data=new Uint8ClampedArray(data);for(let i=0;i<data.length;i+=4)if(skin.has(Array.from(data.subarray(i,i+3)).join(',')))data.fill(0,i,i+4);
   let waist=128,bottom=0;for(let y=30;y<115;y++){let gold=0,x0=128,x1=0,fabric=0;for(let x=35;x<94;x++){const i=(y*128+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(!data[i+3])continue;if(r>120&&g>60&&b<r*.6&&g/r>.4&&g/r<.9){gold++;x0=Math.min(x0,x);x1=Math.max(x1,x);}if(Math.max(r,g,b)>70)fabric++;}if(gold>=4&&x1-x0>=6)waist=Math.min(waist,y);if(fabric>=6)bottom=y;}
   if(waist===128)throw Error('Cannot identify authored waistband');
   for(let y=0;y<128;y++)if(y<waist-2||y>bottom)for(let x=0;x<128;x++)data.fill(0,(y*128+x)*4,(y*128+x+1)*4);data=clean(data);
  }
  const main=groups(data)[0],only=blank();for(const p of main)only.set(data.subarray(p*4,p*4+4),p*4);data=only;
  const target={x0:Math.round(Math.min(j['LEFT HIP'].x,j['RIGHT HIP'].x)-8),y0:Math.round(hip.y-6),width:Math.round(Math.abs(j['LEFT HIP'].x-j['RIGHT HIP'].x)+17),height:Math.round(Math.max(j['LEFT KNEE'].y,j['RIGHT KNEE'].y)+6-(hip.y-6))},registered=clean(moveScale(data,target));return {full:registered,parts:split(registered,pose,slot)};
 }
 if(slot==='gloves'||slot==='boots'){
  if(options.bodyIncluded){
   const skin=new Set();for(let y=24;y<45;y++)for(let x=Math.round(j.NOSE.x)-7;x<=j.NOSE.x+7;x++){const i=(y*SIZE+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]&&r>b*1.25&&g/r>.28&&g/r<.94)skin.add(r+','+g+','+b);}
   const parts={LEFT:blank(),RIGHT:blank()};for(let p=0;p<SIZE*SIZE;p++){const i=p*4;if(!data[i+3]||skin.has(Array.from(data.subarray(i,i+3)).join(',')))continue;const x=p%SIZE,y=Math.floor(p/SIZE);for(const side of ['LEFT','RIGHT']){const a=j[side+(slot==='boots'?' KNEE':' ELBOW')],b=j[side+(slot==='boots'?' LEG':' ARM')],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),f=((x-a.x)*dx+(y-a.y)*dy)/(len*len),across=Math.abs((x-a.x)*dy-(y-a.y)*dx)/len;if(f<(slot==='boots'?-.2:.53)||f>1.75||across>(slot==='boots'?8:6))continue;parts[side].set(data.subarray(i,i+4),i);out.set(data.subarray(i,i+4),i);}}
   return {full:clean(out),parts:Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,clean(v)]))};
  }
 }
 // Generated isolated pairs may move inside their sheet cell. Register each
 // cuff/ankle once; each gender has independent pixels and independent anchors.
 const components=groups(data).filter(g=>g.length>=3),ordered=components.slice(0,2).map(g=>{const v=blank();for(const p of g)v.set(data.subarray(p*4,p*4+4),p*4);return v;}).sort((a,b)=>bounds(a).x0-bounds(b).x0),parts={};
 const sides=['LEFT','RIGHT'].sort((a,b)=>j[a+(slot==='boots'?' LEG':' ARM')].x-j[b+(slot==='boots'?' LEG':' ARM')].x);
 for(let k=0;k<2;k++){
  const side=sides[k],material=ordered[Math.min(k,ordered.length-1)];if(!material)throw Error('Missing pair material');const b=bounds(material),anchor=j[side+(slot==='boots'?' LEG':' ARM')];
  const h=slot==='boots'?Math.round(anchor.y-j[side+' KNEE'].y+9):12,w=slot==='boots'?12:9;
  const target={x0:Math.round(anchor.x-w/2),y0:Math.round(anchor.y-h*(slot==='boots'?.7:.32)),width:w,height:h};parts[side]=clean(moveScale(material,target));for(let i=0;i<out.length;i+=4)if(parts[side][i+3])out.set(parts[side].subarray(i,i+4),i);
 }
 return {full:out,parts};
}
function palette(data){const colours=new Map();for(let i=0;i<data.length;i+=4)if(data[i+3]){const k=Array.from(data.subarray(i,i+3)).join(',');colours.set(k,(colours.get(k)||0)+1);}return [...colours].sort((a,b)=>b[1]-a[1]).map(([k])=>k.split(',').map(Number));}
module.exports={bounds,groups,clean,register,palette};
