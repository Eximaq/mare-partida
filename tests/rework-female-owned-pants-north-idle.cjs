const p=require('node:path'),a=require('node:assert/strict');
const r=p.resolve(__dirname,'..'),{make,cv}=require(p.join(r,'tests/rework-integration-support.cjs')),w=make(),load=require(p.join(r,'tools/rework-hd-test-loader.cjs')).create(r);
const catalog=require(p.join(r,'tools/rework-modular-outfits-hd/index.json')).independentPants.records;
const kinds=['east','west','north'],copy=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const pix=(u,v,m)=>{let n=0,o=0;for(let i=0;i<u.length;i+=4)if(u.readUInt32LE(i)!==v.readUInt32LE(i)){n++;if(!m?.[i+3])o++;}return [n,o];};
async function capture(player,o){a(await w.prepare(player,o),JSON.stringify(w.snapshot()));const c=cv.createCanvas(512,512),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let tile;ctx.drawImage=(im,...args)=>{tile=im;return draw(im,...args);};a(w.draw(ctx,player,{...o,x:256,y:448}));return copy(tile);}
async function read(l){const v=l.frames?.[0]||l.source,c=cv.createCanvas(512,512),cx=c.getContext('2d');cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+v+'.png'),0,0);return c;}
const hash=x=>require('node:crypto').createHash('sha256').update(x).digest('hex');
(async()=>{await w.ready;let frames=0;
const raw={gender:'feminino',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'};
for(const id of [168,182]){
const direction='north',o={action:'idle',direction,progress:0,consumer:'world'},rec=catalog.find(r=>r.equipment.pants===id&&r.direction===direction);
const layers=rec.pack.directions[direction].layers,cloth=await read(layers[1]),owner=copy(await read(layers[2])),mask=copy(cloth),approved=cv.createCanvas(512,512);
for(const l of layers)approved.getContext('2d').drawImage(await read(l),0,0);
for(let i=0;i<mask.length;i+=4)if(owner[i+3])mask[i+3]=0;
const colors=Object.keys(global.MareCharacterAppearance.skins),looks=[raw,global.MareCharacterAppearance.normalize({gender:'feminino'}),...colors.map((skinColor,i)=>global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}))];
for(const appearance96 of looks){
const bare={classId:'brawler',appearance96,equipment:{}},p={...bare,equipment:{legs:{def:id}}},saved=JSON.stringify(p),base=w.selectVisual(bare,o),x=w.selectVisual(p,o);
if(appearance96===raw){
 const signatures={168:['female-pants168-idle-north','95001e1c37193c482bedce4c2d6093647682d47215cca67e958a7df6fb1fbfa6'],182:['frozen-female-pants182-north-idle-source-v47','237d5b5f1e6ec5bda42e52bb914dd1b8a5a1002c5d190463c898ad035063ddcd']};
 const [source,sha]=signatures[id];
 for(const variant of [undefined,'other']){
   const actor={...p,equipment:{legs:{def:id,variant}}},q=w.selectVisual(actor,o);
   a.equal(q.id,source);a.equal(hash(await capture(actor,o)),sha);
 }
 const unaltered=await capture(bare,o),back=cv.createCanvas(512,512),bc=back.getContext('2d');
 const backing=bc.createImageData(512,512);backing.data.set(unaltered);bc.putImageData(backing,0,0);
 const tc=cloth.getContext('2d'),t=tc.getImageData(0,0,512,512),owned=t.data;
 for(let i=0;i<owned.length;i+=4)if(owner[i+3]){a.equal(owner[i+3],255);owned.fill(0,i,i+4);}
 tc.putImageData(t,0,0);bc.drawImage(cloth,0,0);a.deepEqual(copy(back),copy(approved));
 console.log(id,'original exact and original variant preserved');frames++;continue;
}
a(x?.authoredNorthIdlePants,JSON.stringify([id,appearance96,x?.id]));
a.deepEqual(x.pack,base.pack);a.deepEqual(x.colorAppearance,base.colorAppearance);
const full=await capture(p,o),body=await capture(bare,o),[delta,out]=pix(full,body,mask);a(delta>0);a.equal(out,0);

a.equal(JSON.stringify(p),saved);
for(const [slot,value]of Object.entries({boots:176,gloves:152,coat:151,head:129,weapon:0,pants:id}))a(!w.selectVisual({...p,equipment:{...p.equipment,[slot]:{def:value}}},o)?.authoredNorthIdlePants);
a(!w.selectVisual({...p,equipment:{legs:{def:id,variant:'other'}}},o)?.authoredNorthIdlePants);
console.log(id,appearance96.skinColor,'delta',delta,'outside',out);frames++;
}}
a.equal(frames,20);
const standard=global.MareCharacterAppearance.normalize({gender:'feminino'}),south={action:'idle',direction:'south',consumer:'world',progress:0},
 bootActor={classId:'brawler',appearance96:standard,equipment:{legs:{def:168},boots:{def:176}}};
a.equal(hash(await capture(bootActor,south)), '189f44bcc1e29e1ad74d1b8065c1191b603450271cb88aa40c42054780e3cebf');
a(w.selectVisual(bootActor,south)?.authoredPantsLayer);
a(!w.selectVisual(bootActor,{...south,direction:'north'})?.authoredNorthIdlePants);
console.log('PASS',frames);
})().catch(e=>{console.error(e);process.exitCode=1});
