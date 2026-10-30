/* Complete hidden garment panels once on the rest template. Future frames
 * reuse these native materials; they never regenerate a costume per pose. */
const surface=require('./paper-doll-96-v3/surface.js');
const motion=require('./paper-doll-96-v3/motion.js');
function splitTrousers(source,rest,direction){
  const rig=surface.bones(rest,'pants'),parts=Object.fromEntries(rig.list.map(b=>[b.key,new Uint8ClampedArray(source.length)]));
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4;if(source[i+3]<128)continue;
    let chosen=null,best=Infinity;
    for(const b of rig.list){const p=b.at(x,y),d=p.across**2+(p.along-Math.max(0,Math.min(b.length,p.along)))**2;if(d<best){best=d;chosen=b;}}
    parts[chosen.key].set(source.subarray(i,i+4),i);
  }
  const count=data=>{let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n;},repairs=[];
  if(direction==='west'||direction==='east'){
    const near=direction==='west'?'LEFT':'RIGHT',far=near==='LEFT'?'RIGHT':'LEFT';
    const knee=(rig.j[near+' KNEE'].y+rig.j[far+' KNEE'].y)/2;
    for(const part of ['upper','lower']){
      const native=new Uint8ClampedArray(source.length);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const i=(y*128+x)*4;if(source[i+3]<128|| (part==='upper'?y>knee+1:y<knee-3))continue;
        native.set(source.subarray(i,i+4),i);
      }
      const from=rig.list.find(b=>b.key===near+part),to=rig.list.find(b=>b.key===far+part);
      const map=p=>{const q=from.at(p.x,p.y);return to.point(q.along*to.length/from.length,q.across);};
      parts[near+part]=native;parts[far+part]=motion.rasterMesh(native,128,128,motion.affineMesh(map),128,128);
      repairs.push({part:far+part,source:near+part,reason:'complete-hidden-profile-panel',after:count(parts[far+part])});
    }
    return {parts,repairs};
  }
  for(const part of ['upper','lower']){
    const a='LEFT'+part,b='RIGHT'+part,donor=count(parts[a])>=count(parts[b])?a:b,other=donor===a?b:a;
    if(count(parts[other])>=count(parts[donor])*.7)continue;
    const from=rig.list.find(v=>v.key===donor),to=rig.list.find(v=>v.key===other),old=parts[other];
    const map=p=>{const q=from.at(p.x,p.y);return to.point(q.along*to.length/from.length,q.across);};
    const replacement=motion.rasterMesh(parts[donor],128,128,motion.affineMesh(map),128,128);
    parts[other]=replacement;
    repairs.push({part:other,source:donor,before:count(old),after:count(replacement)});
  }
  return {parts,repairs};
}
module.exports={splitTrousers};
