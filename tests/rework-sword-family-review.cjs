'use strict';
const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),root=p.resolve(__dirname,'..');
const fixture=p.join(root,'dist'), out=p.resolve(process.argv[2]||p.join(fixture,'sword-family-contact'));
fs.mkdirSync(out,{recursive:true});
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
require(p.join(root,'player-rework-sword0-checkpoint.js'));
const catalog=require(p.join(fixture,'tools/rework-sword0-checkpoint/sword-catalog.json'));
const index=require(p.join(root,'tools/rework-weapon-layers-hd/index.json')).femaleRegistrations;
const ITEM=Number(process.env.ITEM||1);a([1,68,69].includes(ITEM));
const cpPath='tools/rework-sword0-checkpoint/sword-catalog.json';
const fromManifest=(n,d)=>index.find(r=>r.direction===d&&r.action==='attack-sword'&&r.item===n);
const loadImage=f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(fixture,f)):loader(f);
const makeAPI=()=>make({baseURL:'https://fixture.test/',fetchJSON:async f=>f===cpPath?catalog:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage});
const apply=([a,b,c,d,e,f],[x,y])=>[a*x+c*y+e,b*x+d*y+f];
const invert=([a,b,c,d,e,f])=>{const det=a*d-b*c;return [d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];};
const times=(A,B)=>{const go=(x,y)=>apply(A,[x,y]),o=go(0,0),x=go(...B.slice(0,2)),y=go(...B.slice(2,4));return [x[0]-o[0],x[1]-o[1],y[0]-o[0],y[1]-o[1],...go(...B.slice(4,6))];};
const dist=(A,B)=>Math.hypot(...A.map((x,i)=>x-B[i]));
const sig=({parts,...o})=>o;
const pSig=(p)=>Object.fromEntries(Object.entries(p).filter(([k])=>!['sha256','matrix','url','sourceNativeSize'].includes(k)));
function derive(approved0,raw0,try1){
 const d=approved0.direction;
 a.equal(try1.item,ITEM);
 a.equal(approved0.item,0);
 a.equal(approved0.action,'attack-sword');
 a.equal(try1.action,'attack-sword');
 a.deepEqual(raw0.baseRecord,try1.baseRecord); // before final head/palette binding
 a.deepEqual(approved0.states.map(sig),try1.states.map(sig));
 const states=approved0.states.map((s,i)=>{
  a.equal(s.parts.length,1);const p0=raw0.states[i].parts[0],p1=try1.states[i].parts[0],reference=s.parts[0];
  a.deepEqual(pSig(p0),pSig(p1));
  a.deepEqual(pSig(p0),pSig(reference));
  const delta=times(reference.matrix,invert(p0.matrix));
  a(dist(apply(delta,p0.targetHandCenter),p0.targetHandCenter)<1e-9);
  const matrix=times(delta,p1.matrix);
  a(dist(apply(matrix,apply(invert(p1.matrix),p1.targetHandCenter)),p1.targetHandCenter)<1e-9);
  a(Math.abs(Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2])-1)<1e-9);
  return {...s,parts:[{...p1,matrix}]};
 });
 return {...approved0,id:approved0.id+':proof-only-sword'+ITEM,item:ITEM,states};
}
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function bundle(api,player,options,source){return api.prepareConfiguration([{player,options,source}],{resolve:p=>p});}
async function ownBlade(part,pad){
 const tile=cv.createCanvas(640+2*pad,640+2*pad),c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.translate(pad,pad);c.transform(...part.matrix);
 if(part.sourceClip){c.beginPath();c.rect(...part.sourceClip);c.clip();}
 c.drawImage(await loadImage(part.url),0,0);const px=pixels(tile);tile.width=tile.height=0;return px;
}
function capture(which,who,options,frame,pad){
 const tile=cv.createCanvas(900,900),ctx=tile.getContext('2d'),draw=ctx.drawImage.bind(ctx);let source;
 ctx.drawImage=(x,...args)=>{source=x;draw(x,...args);};
 a(which.draw(ctx,who,{...options,x:400,y:650,progress:(frame+.25)/8}));
 a.equal(source.width,640+2*pad);a.equal(source.height,640+2*pad);
 const px=pixels(source);tile.width=tile.height=0;return px;
}
(async()=>{
 const game=makeAPI();await game.ready;
 const base={appearance96:catalog.appearance96,equipment:{weapon:{def:0},coat:{def:151}}};
 let verified=0;
 const sheet=cv.createCanvas(1280,1280),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#1f2530';sc.fillRect(0,0,1280,1280);
 let row=0;
 for(const direction of ['north','south','east','west']){
  const o={action:'attack-sword',direction,consumer:'world'};
  const raw0=fromManifest(0,direction),raw1=fromManifest(ITEM,direction);
  const donor=game.select({appearance96:catalog.appearance96,equipment:{weapon:{def:ITEM}}},o);
  a.equal(donor?.sourceBaseId,raw1.sourceBaseId);a.deepEqual(donor?.states,raw1.states);
  for(const [slot,item] of [['pants',21],['boots',9],['gloves',152]]){
   const control=game.selectVisual({...base,equipment:{...base.equipment,[slot]:{def:item}}},o);
   a(control?.id?.includes('portable-sword0'));
   const r0={...control,states:catalog.states[direction]};
   const r1=derive(r0,raw0,raw1);
   a.equal(r1.baseRecord,r0.baseRecord);a.equal(r1.pack,r0.pack);a.equal(r1.material,r0.material);
   const pad=r0.paddingPhysical||0;
   const v0=await bundle(game,base,o,r0),v1=await bundle(game,base,o,r1);
   for(let f=0;f<8;f++){
    const original=capture(v0,base,o,f,pad),trial=capture(v1,base,o,f,pad);
    const [ma,mb]=await Promise.all([ownBlade(r0.states[f].parts[0],pad),ownBlade(r1.states[f].parts[0],pad)]);
    let delta=0;
    for(let i=0;i<original.length;i+=4){
     if(original.readUInt32LE(i)===trial.readUInt32LE(i))continue;
     a(ma[i+3]||mb[i+3],'changed pixel outside both weapon masks');
     delta++;
    }
    a(delta>0,'visible item swap must differ');verified++;
    if(slot==='gloves'){
      const native=640+2*pad;
      for(const [k,b] of [original,trial].entries()){
        const tile=cv.createCanvas(native,native);
        tile.getContext('2d').putImageData(new cv.ImageData(new Uint8ClampedArray(b),native,native),0,0);
        sc.drawImage(tile,f*160,row*320+k*160,160,160);
        sc.fillStyle='#fff';sc.font='12px sans-serif';sc.fillText(direction+' / '+f+' / espada '+(k?ITEM:0),f*160+2,row*320+k*160+15);
        tile.width=0;tile.height=0;
      }
    }
   }
   v0.release();v1.release();
  }
  row++;
 }
 fs.writeFileSync(p.join(out,'espada-feminina-0-'+ITEM+'-prova.png'),sheet.toBuffer('image/png'));
 a.equal(verified,96);console.log({verified});
})().catch(e=>{console.error(e);process.exitCode=1;});
