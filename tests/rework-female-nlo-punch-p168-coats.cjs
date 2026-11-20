// Release native Canvas allocations between directions rather than relying on
// V8 to account for all compositor surfaces in its heap.
if(!process.argv[2]){
 const {spawnSync}=require('node:child_process');
 for(const direction of ['north','east','west']){
  const run=spawnSync(process.execPath,['--expose-gc',__filename,direction],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status||1);
 }
 console.log('PASS ALL 480');process.exit(0);
}
const path=require('node:path'),a=require('node:assert/strict'),R=path.resolve(__dirname,'..'),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),api=make();
const load0=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),cab=new Map,load=k=>{if(!cab.has(k))cab.set(k,load0(k));return cab.get(k);};
const oi=require(path.join(R,'tools/rework-modular-outfits-hd/index.json')),factory=global.MareReworkModularOutfitsHD.create(oi);
const sizes=(x,y)=>cv.createCanvas(x,y),p=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const pull=async (player,o)=>{const source=api.selectVisual(player,o);a(source,JSON.stringify(player));const prepared=await api.prepareConfiguration([{player,options:o,source}],{resolve:x=>x});return {source,frame(n){let t;a(prepared.draw({save(){},restore(){},drawImage(x){t=x;}},player,{...o,progress:(n+.1)/8}));return p(t);},release(){prepared.release();}};};
const profiles=[{}, {skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}];
const probes=[6,7,130,137,144,151,158,165,172,179];
(async()=>{await api.ready;let n=0;
const direction=process.argv[2];a(['north','east','west'].includes(direction));
for(const opt of profiles){
const o={direction,action:'attack-unarmed',consumer:'world'};
const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...opt}),actor=e=>({classId:'brawler',appearance96,equipment:Object.fromEntries(Object.entries(e).map(([k,def])=>[k,{def}]))});
const pants=await pull(actor({legs:168}),o),ordinary=pants.source.authoredPunchPants,owns=[];
for(let j=0;j<8;j++){
 const cloth=await load('tools/rework-modular-outfits-hd/assets/'+ordinary.cloth.frames[j]+'.png'),d=ordinary.base.pack.directions[direction],
 old=await load('tools/rework-base-hd/assets/'+d.layers[ordinary.index].frames[j]+'.png'),c=sizes(cloth.width,cloth.height);
 c.getContext('2d').drawImage(cloth,0,0);c.getContext('2d').drawImage(old,0,0);owns.push(p(c));c.width=1;
}
for(const coat of probes){
 const x=actor({coat,legs:168}),save=JSON.stringify(x),host=await pull(actor({coat}),o),pair=await pull(x,o);
 a.deepEqual(pair.source.authoredPunchPants?.base,host.source);a.deepEqual(pair.source.authoredPunchPants?.cloth,ordinary.cloth);
 a.deepEqual(pair.source.pack,host.source.pack);a.deepEqual(pair.source.omitted,[]);a.equal(pair.source.slotRoutes.coat.item,coat);a.equal(pair.source.slotRoutes.legs.item,168);
 const d=host.source.pack.directions[direction],own={...host.source,pack:{...host.source.pack,directions:{[direction]:{...d,layers:d.layers.filter(l=>!l.id.startsWith('base:'))}}}};
 const maskI=new Map(await Promise.all(factory.requiredFiles(own).map(async url=>[url,await load(url)])));
 let countLeg=0,countTorso=0,offLeg=0,offTorso=0;
 for(let j=0;j<8;j++){
  const out=pair.frame(j),c1=host.frame(j),p1=pants.frame(j),can=sizes(host.source.pack.frame.width*4,host.source.pack.frame.height*4);
  factory.render(can.getContext('2d'),own,maskI,{frame:j,appearance:host.source.colorAppearance,makeCanvas:sizes});
  const m=p(can);
  for(let i=0;i<out.length;i+=4){
   if(out.readUInt32LE(i)!==c1.readUInt32LE(i)){countLeg++;if(!owns[j][i+3])offLeg++;}
   if(out.readUInt32LE(i)!==p1.readUInt32LE(i)){countTorso++;if(!m[i+3])offTorso++;}
  }
  can.width=1;n++;
 }
 a.equal(JSON.stringify(x),save);a(countLeg>0&&countTorso>0);a.equal(offLeg,0);a.equal(offTorso,0);
 console.log(direction,appearance96.skinColor,coat,countLeg,offLeg,countTorso,offTorso);
 for(const e of [{coat,legs:168,gloves:152},{coat,legs:168,boots:9},{coat,legs:168,weapon:0},{coat,legs:168,head:129}]){
  a(!api.selectVisual(actor(e),o)?.authoredPunchPants);
 }
 host.release();pair.release();cab.clear();global.gc?.();
}
pants.release();
}
a.equal(n,160);console.log('PASS',n);})().catch(e=>{console.error(e);process.exitCode=1;});
