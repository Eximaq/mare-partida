const fs=require('node:fs'),path=require('node:path'),cv=require('@napi-rs/canvas');
module.exports.create=root=>{global.MareReworkZip=require('../player-rework-zip.js');const{create}=require('../player-rework-hd-assets.js'),stores=new Map();for(const folder of ['rework-base-hd','rework-modular-outfits-hd','rework-weapon-layers-hd']){const prefix='tools/'+folder+'/';stores.set(prefix,create(JSON.parse(fs.readFileSync(path.join(root,prefix,'archives/archive-index.json'))),{baseURL:'https://fixture.test/',prefix:prefix+'archives/',fetchBytes:async u=>new Uint8Array(fs.readFileSync(path.join(root,new URL(u).pathname))),decode:b=>cv.loadImage(Buffer.from(b))}));}const pp='tools/rework-female-profile-rig/',pf=path.join(root,pp,'index.json');if(fs.existsSync(pf)){const pi=JSON.parse(fs.readFileSync(pf));if(pi.archiveIndex)stores.set(pp,create(pi.archiveIndex,{baseURL:'https://fixture.test/',prefix:pp+'archives/',fetchBytes:async u=>new Uint8Array(fs.readFileSync(path.join(root,new URL(u).pathname))),decode:b=>cv.loadImage(Buffer.from(b))}));}let firearmZip;const firearmPrefix='tools/rework-firearm113-coat/';
return async p=>{p=path.isAbsolute(p)?path.relative(root,p):p;
 for(const[prefix,store]of stores)if(p.startsWith(prefix+'assets/'))return store.load(p);
 if(/^tools\/rework-firearm113-coat\/assets\/[0-9a-f]{64}\.png$/.test(p)){
  const name=path.basename(p),mask=path.join(root,firearmPrefix,'masks',name);
  if(fs.existsSync(mask))return cv.loadImage(mask);
  const archive=path.join(root,'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18/fuzil113-ns.zip');
  if(!firearmZip)firearmZip=global.MareReworkZip.loadArchive(fs.readFileSync(archive),'cdd9889e5d96f92f826536779298fa86b9af0e0b52f2af2af41ac382a0087377');
  return cv.loadImage(Buffer.from(await (await firearmZip).read('fuzil113-ns/assets/'+name)));
 }
 return cv.loadImage(path.join(root,p));};};
