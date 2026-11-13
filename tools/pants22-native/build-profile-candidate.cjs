'use strict';
// Texture recovery is bounded to the garment; no inventory icon is used.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cv=require('@napi-rs/canvas');const root=path.resolve(__dirname,'../..'),index=require('../rework-modular-outfits-hd/index.json'),base=require('../rework-base-hd/index.json'),load=require('../rework-hd-test-loader.cjs').create(root),out=path.resolve(process.argv[2]);
const pixels=im=>{const c=cv.createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return c.getContext('2d').getImageData(0,0,im.width,im.height).data;};
const spans=(a,y,n,accept)=>{const list=[];let start=null;for(let x=0;x<=n;x++){const ok=x<n&&accept(a,(y*n+x)*4,x,y);if(ok&&start===null)start=x;if(!ok&&start!==null){if(x-start>2)list.push([start,x-1]);start=null;}}return list;};
(async()=>{const records=JSON.parse(fs.readFileSync(out+'/records.json')).filter(r=>!['east','west'].includes(r.direction));
for(const direction of ['east','west'])for(const action of ['walk','idle','attack-unarmed']){
 const target=base.records.find(r=>r.body==='male'&&r.hairStyle==='original'&&r.action===action&&r.direction===direction);if(!target)throw Error('Missing target');
 const female=index.records.find(r=>r.id==='frozen-female-pants22-east-walk-source-v47');const fd=female.pack.directions.east,record=structuredClone(target),d=record.pack.directions[direction],n=record.pack.frame.width*4,offset=n===640?64:0,frames=[];
 const hemMasks=require('./profile-hem-masks.json');
 const lower=d.layers.find(l=>l.id==='lower-redrawn'||l.id==='skin-arms-phase');if(!lower)throw Error('Missing anatomical lower reference');
 for(let f=0;f<d.clip.frames;f++){
 const sf=action==='walk'?Math.floor(f/d.clip.frames*fd.clip.frames):0,src=await load('tools/rework-modular-outfits-hd/assets/'+fd.layers[0].frames[sf]+'.png'),sd=pixels(src),body=await load('tools/rework-base-hd/assets/'+(lower.frames?.[f]||lower.source)+'.png'),bd=pixels(body),c=cv.createCanvas(n,n),cx=c.getContext('2d'),output=cx.createImageData(n,n);
 const srcRows=[];for(let y=238;y<390;y++){const intervals=spans(sd,y,512,(a,i,x)=>x>120&&x<350&&a[i+3]>128&&a[i+2]>a[i]*1.08&&a[i+2]>a[i+1]*1.08);if(intervals.length){const merged=[];for(const part of intervals){const prev=merged.at(-1);if(prev&&part[0]-prev[1]<12)prev[1]=part[1];else merged.push([...part]);}srcRows.push({y,intervals:merged});}}if(!srcRows.length)throw Error('No recoverable profile cloth');
 const top=srcRows[0].y,bottom=srcRows.at(-1).y;
 for(let y=256+offset;y<416+offset;y++){
 const dest=spans(bd,y,n,(a,i,x)=>x>120+offset&&x<360+offset&&a[i+3]>128);if(!dest.length)continue;
 const sy=Math.min(bottom,Math.floor(top+(y-256-offset)/(160)*(bottom-top))),sample=srcRows.reduce((a,b)=>Math.abs(a.y-sy)<=Math.abs(b.y-sy)?a:b);
 for(let j=0;j<dest.length;j++){const [left,right]=dest[j],source=sample.intervals[Math.min(j,sample.intervals.length-1)];for(let x=left;x<=right;x++){const hem=action==='walk'?hemMasks.frames[f]:action==='idle'?hemMasks.frames[0]:null;if(hem&&hem.source===(lower.frames?.[f]||lower.source)&&hem.segments.some(([x1,y1,x2,y2,minX,maxX])=>x>=minX&&x<=maxX&&y>=y1+(Math.max(x1,Math.min(x2,x))-x1)/(x2-x1)*(y2-y1)))continue;let sx=Math.round(source[0]+(x-left)/Math.max(1,right-left)*(source[1]-source[0]));const eligible=q=>{const i=(sample.y*512+q)*4;return sd[i+3]>128&&sd[i+2]>sd[i]*1.08&&sd[i+2]>sd[i+1]*1.08;};if(!eligible(sx)){let found=-1;for(let delta=1;delta<512&&found<0;delta++)for(const q of [sx-delta,sx+delta])if(q>=source[0]&&q<=source[1]&&eligible(q)){found=q;break;}if(found<0)continue;sx=found;}const si=(sample.y*512+sx)*4,di=(y*n+x)*4;output.data.set(sd.subarray(si,si+4),di);}}
 }
 cx.putImageData(output,0,0);const bytes=c.toBuffer('image/png'),sha=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(out+'/assets/'+sha+'.png',bytes);frames.push(sha);
 }
 // The base WEST record explicitly mirrors EAST. Mirror each original base layer,
 // while the new WEST garment is mirrored once into its own native coordinates.
 if(record.mirrorX){record.mirrorLayerIDs=d.layers.map(l=>l.id);for(let f=0;f<frames.length;f++){const im=await cv.loadImage(out+'/assets/'+frames[f]+'.png'),c=cv.createCanvas(n,n),cx=c.getContext('2d');cx.translate(record.pack.pivot.x*8,0);cx.scale(-1,1);cx.drawImage(im,0,0);const bytes=c.toBuffer('image/png'),sha=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(out+'/assets/'+sha+'.png',bytes);frames[f]=sha;}delete record.mirrorX;}
 d.layers.push({id:'pants22-profile-candidate',slot:'pants',depth:action==='attack-unarmed'?2:4.4,binding:{kind:'fixed'},source:frames[0],frames});record.id='candidate-male-pants22-'+action+'-'+direction;record.item=22;record.equipment={pants:22};record.candidate=true;record.productionEnabled=false;record.status='unvalidated-profile-texture-recovery';record.adaptation={source:female.id,targetGeometry:target.id,visualApproved:false,limitations:['Contour and hidden-region reconstruction require frame inspection; not a definitive binding']};record.sourceRefs=[...new Set(d.layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))];records.push(record);
}
fs.writeFileSync(out+'/records.json',JSON.stringify(records,null,2));console.log(records.length+' candidate records; unapproved');})().catch(e=>{console.error(e);process.exitCode=1});
