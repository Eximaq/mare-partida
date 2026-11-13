'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../..'),out=process.argv[2];
const index=require('../rework-modular-outfits-hd/index.json');
const load=require('../rework-hd-test-loader.cjs').create(root);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const asset=sha=>load('tools/rework-modular-outfits-hd/assets/'+sha+'.png');
const shaAt=(layer,frame)=>layer.frames?.[frame]||layer.source;
const pixels=image=>{const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height);};
function rows({width,height,data},isCloth){
 const result=[];
 for(let y=0;y<height;y++){
  const spans=[];let run=-1;
  for(let x=0;x<=width;x++){
   const visible=x<width&&isCloth(data,(y*width+x)*4,x,y);
   if(visible&&run<0)run=x;
   if(!visible&&run>=0){if(x-run>=2)spans.push([run,x-1]);run=-1;}
  }
  if(spans.length)result.push({y,spans});
 }
 return result;
}
const sourceBlue=(a,i,x,y)=>x>110&&x<402&&y>=228&&y<405&&a[i+3]>100&&a[i+2]>a[i]*1.13&&a[i+2]>a[i+1]*1.05;
function transfer(source,target){
 const donor=rows(source,sourceBlue),shape=rows(target,(a,i)=>a[i+3]>128);
 if(!donor.length||!shape.length)throw Error('Missing garment geometry');
 const canvas=createCanvas(target.width,target.height),ctx=canvas.getContext('2d'),result=ctx.createImageData(target.width,target.height);
 const length=Math.ceil(shape.length*.78);
 for(let row=0;row<length;row++){
  const dest=shape[row],src=donor[Math.round(row/(length-1)*(donor.length-1))];
  const [left,right]=[src.spans[0][0],src.spans.at(-1)[1]];
  const a=source.data;
  for(const [j,[start,end]] of dest.spans.entries()){
   const [l,r]=dest.spans.length===src.spans.length?src.spans[j]:dest.spans.length===1?[left,right]:src.spans[Math.min(j,src.spans.length-1)];
   for(let x=start;x<=end;x++){
    let sx=Math.round(l+(x-start)/Math.max(end-start,1)*(r-l));
    let from=(src.y*source.width+sx)*4;
    const neutral=a[from+3]>180&&Math.max(...a.subarray(from,from+3))-Math.min(...a.subarray(from,from+3))<36;
    if(!sourceBlue(a,from,sx,src.y)&&!neutral){
     const span=src.spans.reduce((best,v)=>Math.min(Math.abs(sx-v[0]),Math.abs(sx-v[1]))<Math.min(Math.abs(sx-best[0]),Math.abs(sx-best[1]))?v:best);
     sx=Math.max(span[0],Math.min(span[1],sx));from=(src.y*source.width+sx)*4;
    }
    const to=(dest.y*target.width+x)*4;
    result.data.set(a.subarray(from,from+4),to);
   }
  }
 }
 ctx.putImageData(result,0,0);
 return canvas.toBuffer('image/png');
}
(async()=>{
 fs.mkdirSync(path.join(out,'assets'),{recursive:true});
 const result=[];
 for(const direction of ['south','north','east','west']){
  const original=index.records.find(r=>r.id==='frozen-female-pants21-'+direction+'-walk-source-v47');
  const donor=original.pack.directions[direction].layers[0];
  for(const action of ['idle','walk','attack-unarmed']){
   const template=index.records.find(r=>r.id==='male-pants22-'+action+'-'+direction);
   const record=structuredClone(template),d=record.pack.directions[direction],part=d.layers.at(-1),frames=[];
   if(!part.id.startsWith('pants22-'))throw Error('Expected isolated lower garment');
   for(let frame=0;frame<d.clip.frames;frame++){
    const sourceFrame=action==='walk'?Math.floor(frame*donor.frames.length/d.clip.frames):0;
    const image=transfer(pixels(await asset(shaAt(donor,sourceFrame))),pixels(await asset(shaAt(part,frame))));
    const sha=hash(image);fs.writeFileSync(path.join(out,'assets',sha+'.png'),image);frames.push(sha);
   }
   const old=new Set([part.source,...part.frames]);
   d.layers[d.layers.length-1]={...part,id:'pants21-independent',source:frames[0],frames};
   record.id='male-pants21-'+action+'-'+direction;
   record.item=21;record.equipment={pants:21};
   record.candidate=true;record.status='authored-female-material-retargeted-to-male-candidate';
   record.sourceRefs=[...new Set([...record.sourceRefs.filter(sha=>!old.has(sha)),...frames])];
   delete record.paletteSourceMasks;delete record.paletteRefs;delete record.palettePolicy;delete record.sourceFamily;
   record.adaptation={source:original.id,targetGeometry:template.id,visualApproved:false};
   result.push(record);
  }
 }
 fs.writeFileSync(path.join(out,'records.json'),JSON.stringify(result));
 console.log(result.length+' independent records');
})().catch(error=>{console.error(error);process.exitCode=1;});
