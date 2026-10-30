/* Import selected PixelLab native sprites. Pad only: never resize or quantize.
 * --input=<private JSON> imports [{itemId,file,grip,tip,edgeSide,generation}].
 * Without input, verify the installed recipe and source hashes without API calls.
 */
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dest=path.join(__dirname,'paper-doll-96-v3');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function bounds(data,w,h){let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}if(x1<0)throw Error('Empty weapon');return {x0,y0,x1,y1};}
async function run(){
 const manifest=JSON.parse(await fs.readFile(path.join(dest,'weapons.json'),'utf8'));
 const input=process.argv.find(a=>a.startsWith('--input='))?.slice(8);
 if(input){
  const edits=JSON.parse(await fs.readFile(input,'utf8'));
  for(const edit of edits){
   const index=manifest.items.findIndex(i=>i.itemId===edit.itemId);if(index<0)throw Error('Unknown existing weapon '+edit.itemId);
   const parent=manifest.items[index];if(edit.view&&!['south','north'].includes(edit.view))throw Error('Invalid view');
   const previous=edit.view?{source:'assets/weapon-item-'+edit.itemId+'-'+edit.view+'.png'}:parent,source=await fs.readFile(path.resolve(path.dirname(input),edit.file));
   const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(info.width>128||info.height>128)throw Error('Native source too large; regenerate, do not downsample');
   for(let i=3;i<data.length;i+=4)if(data[i]!==0&&data[i]!==255)throw Error('Non-binary alpha in native source '+edit.itemId);
   for(const point of [edit.grip,edit.tip])if(!point||!Number.isInteger(point.x)||!Number.isInteger(point.y)||point.x<0||point.y<0||point.x>=info.width||point.y>=info.height||!data[(point.y*info.width+point.x)*4+3])throw Error('Socket must be an occupied native pixel');
   if(![-1,0,1].includes(edit.edgeSide)||edit.generation?.tool!=='pixellab'||edit.generation?.model!=='pro')throw Error('Missing selected Pro source contract');
   const left=Math.floor((128-info.width)/2),top=Math.floor((128-info.height)/2);
   const tile=await sharp(source).extend({left,right:128-info.width-left,top,bottom:128-info.height-top,background:'#0000'}).png().toBuffer();
   const pixels=await sharp(tile).ensureAlpha().raw().toBuffer(),box=bounds(pixels,128,128);
   const grip={x:edit.grip.x+left,y:edit.grip.y+top},tip={x:edit.tip.x+left,y:edit.tip.y+top};
   const axis=edit.axisAngle??(Math.atan2(tip.y-grip.y,tip.x-grip.x)+Math.PI/2),axisAngle=Math.atan2(Math.sin(axis),Math.cos(axis));
   if(!Number.isFinite(axisAngle))throw Error('Invalid authored hilt axis');
   await fs.writeFile(path.join(dest,previous.source),tile);
   const imported={source:previous.source,sha256:hash(tile),grip,tip,axisAngle,visibleHeight:box.y1-box.y0+1,bounds:box,edgeSide:edit.edgeSide,generation:{...edit.generation,nativeCanvas:{width:info.width,height:info.height},nativeSha256:hash(source),processing:'transparent padding only; no resize, palette reduction or geometry reconstruction'}};
   manifest.items[index]=edit.view?{...parent,views:{...parent.views,[edit.view]:imported}}:{...parent,...imported};
  }
 }
 if(input||process.argv.includes('--refresh')){
  manifest.revision='weapons96-pixellab-pro-v4-'+hash(Buffer.from(JSON.stringify({fitRevision:manifest.fitRevision||1,classes:manifest.classes,items:manifest.items}))).slice(0,10);
  await fs.writeFile(path.join(dest,'weapons.json'),JSON.stringify(manifest,null,2)+'\n');
 }
 for(const item of manifest.items){
  for(const material of [item,...Object.values(item.views||{})]){const bytes=await fs.readFile(path.join(dest,material.source));if(hash(bytes)!==material.sha256)throw Error('Changed material '+item.itemId);}
  const original=await fs.readFile(path.join(root,item.reference));if(hash(original)!==item.referenceSha256)throw Error('Changed original inventory art '+item.itemId);
 }
 console.log(JSON.stringify({materials:manifest.items.length,imported:!!input,revision:manifest.revision,originalsUnchanged:true}));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});module.exports={bounds,run};
