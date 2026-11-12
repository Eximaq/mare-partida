// Optional offline visual QA: NODE_PATH must provide @napi-rs/canvas.
const fs=require('node:fs'),path=require('node:path'),cv=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../..'),api=require(root+'/player-rework-accessory-pilot.js'),vendor=require(root+'/tools/rework-accessories/vendor.js');
const manifest=require(root+'/tools/rework-accessories/manifest.json'),catalogs=Object.fromEntries(Object.keys(api.PACKAGE_TYPES).map(p=>[p,require(root+'/tools/rework-accessories/'+p+'/catalog.json')]));
const cache=new Map(),loadImage=async p=>{if(!cache.has(p))cache.set(p,await cv.loadImage(path.join(root,p)));return cache.get(p)};
(async()=>{const out=process.argv[2]||'/tmp/rework-accessory-qa';fs.mkdirSync(out,{recursive:true});const results=[];let rendered=0;for(const s of api.selections(manifest,catalogs)){
 const driver=api.create({enabled:true,manifest,catalogs,selection:s,vendor,loadImage,makeCanvas:cv.createCanvas});
 for(const direction of s.directions){const ready=await driver.prepare({}, {direction});const c=cv.createCanvas(512,512);const drew=driver.draw(c.getContext('2d'),{}, {direction,x:256,y:448,scale:4});results.push({package:s.package,snapshot:s.snapshot,direction,ready,drew,state:driver.snapshot()});
 if(drew){rendered++;if(rendered<=8||s.item===129&&s.style==='cropped'){fs.writeFileSync(path.join(out,`${s.body}-${s.item??'hair'}-${s.style}-${direction}.png`),c.toBuffer('image/png'));}}
 }
}const report={records:results.length,rendered,failed:results.filter(x=>!x.drew),results};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({records:report.records,rendered,failed:report.failed.length,errors:[...new Set(report.failed.map(x=>x.state.error))]}));})();
