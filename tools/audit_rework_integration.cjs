'use strict';
// A source-resolution audit, not a claim of visual approval.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>{const f=path.join(root,p);return JSON.parse(fs.existsSync(f)?fs.readFileSync(f):require('node:zlib').gunzipSync(fs.readFileSync(f+'.gz')));};
const {make}=require('../tests/rework-integration-support.cjs');
const catalog=require('../item-catalog.js').create({forge:require('../forge-system.js'),prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}).items;
const names={base:'tools/rework-base-hd/index.json',outfit:'tools/rework-modular-outfits-hd/index.json',weapon:'tools/rework-weapon-layers-hd/index.json',head:'tools/rework-accessories/head-layer-index.json'};
const slot=s=>({pants:'legs',torso:'coat'})[s]||s;
(async()=>{const api=make();await api.ready;if(api.snapshot().state!=='ready')throw Error(api.snapshot().error);const rows=[],browserSources=new Set();
for(const file of process.argv.slice(3)){const report=JSON.parse(fs.readFileSync(file,'utf8'));for(const e of report.evidence||[]){const q=e.state,s=q?.draw?.snapshot||q?.worldDraw?.snapshot||q?.render,a=s?.renderer==='native-hd'?s.nativeHD?.last:s?.defaultHD?.last;if(a?.state==='rendered'&&a.consumer==='world')browserSources.add(a.source);}}

for(const [kind,file]of Object.entries(names)){const index=read(file);for(const r of [...index.records,...(index.femaleRegistrations||[])]){
 const action=r.action||(kind==='head'?'idle':'attack'),direction=r.direction,body=r.body;
 const equipment=Object.fromEntries(Object.entries(r.equipment||{}).map(([s,id])=>[slot(s),{def:id}]));
 if(kind==='weapon')equipment.weapon={def:r.item};
 if(r.id==='rifle115-v5-south-native-layers'){equipment.coat={def:151};equipment.head={def:157};}
 if(kind==='head'&&r.item!=null)equipment.head={def:r.item};
 const appearance96={body,gender:body,hairStyle:r.hairStyle||r.style||'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'};
 const selected=api.select({appearance96,equipment},{action,direction});
 const id=r.id||[r.package,r.snapshot,r.style,r.item??'hair',direction].join(':');
 const selectedHead=selected?.headRecord||selected?.gearOnlyRecord?.sourceRecord||(r.item!=null?selected?.femaleNamedHairRecord?.gearRecord:selected?.femaleNamedHairRecord?.source);
 const matched=kind==='head'?selectedHead?.snapshot===r.snapshot&&selectedHead?.item===r.item&&selectedHead?.style===r.style:
 !!selected&&(selected.id===id||selected.sourceId===id||selected.id.startsWith(id+':'));
 const entries=Object.entries(equipment);if(!entries.length)entries.push([kind==='head'?'appearance96.hairStyle':'appearance96',null]);
 for(const [s,item]of entries){const def=item?.def,canonical=def==null?null:catalog[def];let reason=matched?'Resolver selected this exact record; PNG integrity checked separately.':'Source exists but current canonical pose/combination selects '+(selected?.id||'no compatible record')+'.';
 if(r.originalAppearanceCompatible===false&&!matched)reason+=' Composite is incompatible with the original saved appearance; no inferred binding.';
 if(def!=null&&(!canonical||canonical.slot!==s))reason+=' CANONICAL SLOT MISMATCH.';
 rows.push({def:def??'',name:canonical?.name||'Saved appearance',slot:s,body,action,direction,variant:appearance96.hairStyle,source:file+'#'+id,sourceStatus:r.status||r.approval|| (r.candidate?'candidate':''),sourceHash:r.sourceAuthoritySHA256||r.sourcePackSHA256||r.packSHA256||r.sourceArchiveSHA256||r.snapshot||'',equipment:JSON.stringify(equipment),status:matched?(kind!=='head'&&[...browserSources].some(source=>source===id||source.startsWith(id+':'))?'validado no navegador':'vinculado e verificado automaticamente'):'pendente',reason,category:matched?(selected?.headRecord?.adjustmentRecord?'calibragem aprovada aplicada':'vínculo exato') : !selected?'sem fonte compatível':selected.sourceOutfitId===id?'revisão derivada selecionada':r.body==='female'&&kind==='base'?'base original com cabeça separada':'variante alternativa; não arquivo ausente',selected:selected?.id||''});
 }
}}
if(rows.some(r=>r.reason.includes('CANONICAL SLOT MISMATCH')))throw Error('Source index disagrees with canonical item catalog');
const target=process.argv[2]||path.join(root,'docs/native-hd/CANONICAL_INTEGRATION.csv');const fields=Object.keys(rows[0]),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,[fields.join(','),...rows.map(r=>fields.map(f=>quote(r[f])).join(','))].join('\n')+'\n');
console.log(JSON.stringify({records:rows.length,definitions:[...new Set(rows.map(r=>r.def).filter(x=>x!==''))].sort((a,b)=>a-b),statuses:rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),canonicalMismatches:rows.filter(r=>r.reason.includes('MISMATCH')).map(r=>({def:r.def,slot:r.slot,name:r.name})),controls:[4,5,15,17,109,115,119,133].map(def=>({def,...catalog[def]}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
