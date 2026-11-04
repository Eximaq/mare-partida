'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),appearance=require('./paper-doll-96-v3/appearance.js');
function apply(catalog,file){
 if(!file||file.format!=='mare-headgear-fit-v1'||file.baseRevision!==(catalog.headAdjustmentRevision||'base'))throw Error('A revisão do arquivo não corresponde ao catálogo atual. Concilie a arte antes de aplicar.');
 const adjustments=appearance.headAdjustmentSet(file.adjustments,catalog.styles),hash=crypto.createHash('sha256').update(JSON.stringify(adjustments)).digest('hex'),revision='headfit-'+hash.slice(0,12);
 return {...catalog,headAdjustments:adjustments,headAdjustmentRevision:revision,headAdjustmentSource:{format:file.format,baseRevision:file.baseRevision,geometryHash:hash}};
}
if(require.main===module){try{
 if(!process.argv[2])throw Error('Informe o JSON exportado pela bancada.');
 const target=path.join(__dirname,'paper-doll-96-v3/appearance-catalog.json'),catalog=JSON.parse(fs.readFileSync(target)),file=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]))),next=apply(catalog,file);
 fs.writeFileSync(target+'.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(target+'.tmp',target);
 console.log('Ajustes aplicados. Atualize o pacote: python tools/player96_release.py --write; python tools/build_pages.py');
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={apply};
