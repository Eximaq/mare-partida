'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cv=require('@napi-rs/canvas');
const {audit,warpStrip}=require('./candidate.cjs'),root=path.resolve(__dirname,'../..'),index=require('../rework-modular-outfits-hd/index.json'),vendor=require('../rework-accessories/vendor.js'),load=require('../rework-hd-test-loader.cjs').create(root);
const output=path.resolve(process.argv[2]||'artifacts/pants22-candidate');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const provenance=await audit();fs.mkdirSync(output+'/assets',{recursive:true});const records=[],checks=[];
for(const direction of ['south','north'])for(const action of ['walk','idle','attack-unarmed']){
 const ref=index.records.find(r=>r.id===('male-pants133-'+action+'-'+direction+(action==='attack-unarmed'?'-drawn8-candidate':'-isolated-r2')));if(!ref)throw Error('Missing target '+action+'/'+direction);
 const record=structuredClone(ref),d=record.pack.directions[direction],offset=action==='attack-unarmed'?64:0;
 const parts={};for(const key of ['waist','leg-left','leg-right'])parts[key]=await cv.loadImage(__dirname+'/sources/'+direction+'-pants-'+key+'.png');
 const frames=[];
 for(let frame=0;frame<d.clip.frames;frame++){
 const pose=d.poses[frame],rest=d.rest,n=record.pack.frame.width*4,canvas=cv.createCanvas(n,n),ctx=canvas.getContext('2d');
 const lower=d.layers.find(l=>l.id==='lower-redrawn'||l.id==='skin-arms-phase'),lowerImage=await load('tools/rework-modular-outfits-hd/assets/'+(lower.frames?.[frame]||lower.source)+'.png');
 const lc=cv.createCanvas(n,n),lx=lc.getContext('2d');lx.drawImage(lowerImage,0,0);const pixels=lx.getImageData(0,0,n,n).data;
 const trace=left=>{const points=[];for(let y=340+offset;y<n;y++)for(let x=(left?180:256)+offset;x<(left?256:330)+offset;x++){const i=(y*n+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(pixels[i+3]>180&&r>90&&r>g*1.15&&r>b*1.4)points.push({x,y});}if(!points.length)throw Error('No lower-leg reference');const bottom=Math.max(...points.map(p=>p.y));const at=y=>{const a=points.filter(p=>Math.abs(p.y-y)<4);return a.length?a.reduce((s,p)=>s+p.x,0)/a.length:null;};return {bottom,knee:at(350+offset),ankle:at(bottom-25)};};
 const hip=pose.HIP||rest.HIP,waistY=(direction==='south'?255:248)+offset+(hip.y-rest.HIP.y)*4,waistBottom=waistY+27;
 ctx.drawImage(warpStrip(parts.waist,{source:[{x:255,y:direction==='south'?242:245},{x:255,y:271}],target:[{x:hip.x*4,y:waistY},{x:hip.x*4,y:waistBottom}],widthScale:1,canvas:n}),0,0);
 for(const [side,key] of [[direction==='south'?'RIGHT':'LEFT','leg-left'],[direction==='south'?'LEFT':'RIGHT','leg-right']]){
 const left=key==='leg-left',pc=cv.createCanvas(512,512),px=pc.getContext('2d');px.drawImage(parts[key],0,0);const pd=px.getImageData(0,0,512,512).data;const sourceCenter=y=>{let sum=0,count=0;for(let x=0;x<512;x++)if(pd[(y*512+x)*4+3]>128){sum+=x;count++;}if(!count)throw Error('Empty source anchor');return sum/count;};const sh=sourceCenter(274),sk=sourceCenter(340),se=sourceCenter(direction==='south'?392:382);
 const hp=pose[side+' HIP']||rest[side+' HIP'],kp=pose[side+' KNEE']||rest[side+' KNEE'],ap=pose[side+' LEG']||rest[side+' LEG'];
 const measured=trace(left),target=[{x:hp.x*4,y:waistBottom},{x:measured.knee??kp.x*4,y:350+offset},{x:measured.ankle??ap.x*4,y:measured.bottom-16}];
 ctx.drawImage(warpStrip(parts[key],{source:[{x:sh,y:271},{x:sk,y:340},{x:se,y:direction==='south'?401:390}],target,widthScale:1,canvas:n}),0,0);
 }
 const png=canvas.toBuffer('image/png'),sha=hash(png);fs.writeFileSync(output+'/assets/'+sha+'.png',png);frames.push(sha);checks.push({direction,action,frame,sha,canvas:[n,n],pivot:record.pack.pivot});
 }
 d.layers=d.layers.filter(l=>!['own133-isolated','pants133-translated-candidate'].includes(l.id));d.layers.push({id:'pants22-independent-candidate',slot:'pants',depth:action==='attack-unarmed'?2:5.5,binding:{kind:'fixed'},source:frames[0],frames});
 record.id='candidate-male-pants22-'+action+'-'+direction;record.item=22;record.equipment={pants:22};record.candidate=true;record.productionEnabled=false;record.status='unvalidated-retarget-candidate';delete record.approvalEvidence;delete record.overlayContract;record.adaptation={sourceManifest:hash(fs.readFileSync(__dirname+'/MANIFEST.json')),targetGeometry:ref.id,method:'nearest original texel by explicit waist/knee/hem anchors; no original raster rewritten',visualApproved:false};
 record.sourceRefs=[...new Set(d.layers.flatMap(l=>l.frames||[l.source]).filter(Boolean))];records.push(record);
}
fs.writeFileSync(output+'/records.json',JSON.stringify(records,null,2));fs.writeFileSync(output+'/checks.json',JSON.stringify({productionEnabled:false,provenance,frames:checks},null,2));console.log(JSON.stringify({records:records.length,frames:checks.length,output}));
})().catch(e=>{console.error(e);process.exitCode=1});
