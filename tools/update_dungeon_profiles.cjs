'use strict';
/* Run the untouched official profile function in this disposable Node process. */
const fs=require('node:fs'),path=require('node:path'),H=require('../hunt-system.js');
const file=path.join(__dirname,'..','boss-dungeon-system.js'),source=fs.readFileSync(file,'utf8'),marker='const catalog=Object.freeze(',start=source.indexOf(marker)+marker.length,end=source.indexOf('.map(',start),catalog=JSON.parse(source.slice(start,end));
const key='__dungeon_reference';if(H.regions[key])throw Error('Reference region already exists');
try{for(const d of catalog){H.regions[key]={sectors:[{id:'reference',min:d.level,max:d.level}]};d.normalCombat=H.profile(key,'reference','bandit',0);}}finally{delete H.regions[key];}
fs.writeFileSync(file,source.slice(0,start)+JSON.stringify(catalog)+source.slice(end));
console.log('Updated nine common-level references using the official profile; no server source changed.');
