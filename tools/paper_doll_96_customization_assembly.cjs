/* Exact material separation from masked PixelLab atlases; no generation or resampling. */
const appearance = require('./paper-doll-96-v3/appearance.js');
const motion = require('./paper-doll-96-v3/motion.js');
function hue(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  if (!d) return 0;
  const h = max === r ? (g-b)/d : max === g ? (b-r)/d+2 : (r-g)/d+4;
  return (h*60+360)%360;
}
function extract(def, raw, source, mask, width, height, rests) {
  if (raw.length !== width*height*4 || source.length !== raw.length || mask.length !== width*height*3) throw Error('Invalid atlas');
  const out = new Uint8ClampedArray(raw.length), core = new Uint8Array(width*height);
  const cellHeight = height/2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y*width+x, i = p*4, xx=x%64, yy=y%cellHeight;
    if (!mask[p*3] || !raw[i+3]) continue;
    const r=raw[i],g=raw[i+1],b=raw[i+2],h=hue(r,g,b),light=(r+g+b)/3;
    const changed=[0,1,2,3].some(c=>raw[i+c]!==source[i+c]);
    const body=y<cellHeight?'masculino':'feminino',direction=['south','north','west','east'][Math.floor(x/64)];
    const joints=Object.fromEntries(rests[body][direction].map(j=>[j.label,{x:j.x*128-32,y:j.y*128}]));
    let keep=false;
    if(def.kind==='hair')keep=changed&&light>32&&Math.max(r,g,b)-Math.min(r,g,b)<55&&b>=r*.82&&!appearance.isSkin(r,g,b)&&yy<53;
    else if(def.kind==='pants')keep=(changed||!appearance.isSkin(r,g,b))&&yy>=63&&yy<109&&!(appearance.isSkin(r,g,b)&&h<35&&['LEFT','RIGHT'].some(s=>Math.hypot(xx-joints[s+' ARM'].x,yy-joints[s+' ARM'].y)<10));
    else if(def.kind==='head')keep=(def.itemId===18?h>=165&&h<=265:(b>=r*.9&&light>40))&&!appearance.isSkin(r,g,b);
    else if(def.kind==='cloak')keep=changed&&(def.itemId===23?(h>=20&&h<=65&&g/r>.5&&b/r<.48&&g>45&&r>65):(h>=265&&h<=350&&r>30)||(h>=25&&h<=65&&g>55&&r>70));
    else if(def.kind==='gloves')keep=changed&&['LEFT','RIGHT'].some(s=>Math.hypot(xx-joints[s+' ARM'].x,yy-joints[s+' ARM'].y)<=7)&&!(appearance.isSkin(r,g,b)&&r>220&&h<35)&&(def.itemId===25?!(h>150&&h<285):(h>=175&&h<215)||Math.max(r,g,b)-Math.min(r,g,b)<35);
    else if(def.kind==='boots')keep=changed&&['LEFT','RIGHT'].some(s=>motion.distanceToSegment({x:xx,y:yy},joints[s+' KNEE'],joints[s+' LEG'])<=11)&&yy>=(def.itemId===8?95:94)&&!(appearance.isSkin(r,g,b)&&r>190&&h<35);
    if(keep)core[p]=1;
  }
  if(def.kind==='hair'){
    const seen=new Uint8Array(core.length);
    for(let start=0;start<core.length;start++){
      if(!core[start]||seen[start])continue;
      const group=[start];seen[start]=1;let top=height;
      for(let n=0;n<group.length;n++){
        const p=group[n],x=p%width,y=Math.floor(p/width);top=Math.min(top,y%cellHeight);
        for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
          const xx=x+dx,yy=y+dy,j=yy*width+xx;
          if(xx<0||yy<0||xx>=width||yy>=height||Math.floor(xx/64)!==Math.floor(x/64)||Math.floor(yy/cellHeight)!==Math.floor(y/cellHeight)||seen[j]||!core[j])continue;
          seen[j]=1;group.push(j);
        }
      }
      if(!((group.length>=8&&top<=34)||(group.length>=2&&top<=26)))for(const p of group)core[p]=0;
    }
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x,i=p*4;
    let keep=core[p]===1;
    if(!keep&&raw[i+3]&&mask[p*3]){
      const dark=Math.max(raw[i],raw[i+1],raw[i+2])<65;
      // Ink and a one-pixel fringe belong to their material, not the old body.
      if(dark)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;
        if(xx>=0&&yy>=0&&xx<width&&yy<height&&Math.floor(xx/64)===Math.floor(x/64)&&Math.floor(yy/cellHeight)===Math.floor(y/cellHeight)&&core[yy*width+xx])keep=true;
      }
    }
    if(keep)out.set(raw.subarray(i,i+4),i);
  }
  if(def.kind==='head')return cleanHeadFragments(out,width,height);
  return out;
}
// Retain the connected headgear and its upper highlights, excluding old eyes,
// jaw ink and neck scraps accidentally selected by the material colour mask.
function cleanHeadFragments(source,width,height){
  const out=new Uint8ClampedArray(source),seen=new Uint8Array(width*height),cellWidth=width/4,cellHeight=height/2;
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    const groups=[];
    for(let y=row*cellHeight;y<(row+1)*cellHeight;y++)for(let x=col*cellWidth;x<(col+1)*cellWidth;x++){
      const start=y*width+x;if(seen[start]||!out[start*4+3])continue;
      const group=[start];seen[start]=1;
      for(let n=0;n<group.length;n++){
        const p=group[n],xx=p%width,yy=Math.floor(p/width);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=xx+dx,ny=yy+dy,j=ny*width+nx;
          if(nx<col*cellWidth||nx>=(col+1)*cellWidth||ny<row*cellHeight||ny>=(row+1)*cellHeight||seen[j]||!out[j*4+3])continue;
          seen[j]=1;group.push(j);
        }
      }groups.push(group);
    }
    groups.sort((a,b)=>b.length-a.length);
    for(const group of groups.slice(1))if(Math.min(...group.map(p=>Math.floor(p/width)%cellHeight))>=30)for(const p of group)out.fill(0,p*4,p*4+4);
  }return out;
}
module.exports={extract,hue,cleanHeadFragments};
