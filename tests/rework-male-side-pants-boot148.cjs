'use strict';
const supported=[154,161,168,175];
if(!process.env.PANTS){
 const {spawnSync}=require('node:child_process');
 for(const id of supported){
  const r=spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,PANTS:String(id)}});
  if(r.error)throw r.error;
  if(r.status!==0)process.exit(r.status??1);
 }
 console.log(process.env.SELECT_ONLY?'PASS lateral B148 save gate':'PASS 136 distinct lateral B148 poses');
 process.exit(0);
}
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),{make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
const load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root),memo=new Map();make();
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(root,f))?fs.readFileSync(p.join(root,f)):require('node:zlib').gunzipSync(fs.readFileSync(p.join(root,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});
const look={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const player=(pants,boot)=>({classId:'fighter',appearance96:look,equipment:{coat:{def:151},legs:{def:pants},gloves:{def:152},...(boot?{boots:{def:boot}}:{})}});
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const take=(q,p,o,i,n)=>{let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...o,progress:(i+.25)/n}));return [pix(c),c];};
const boot=l=>l.id.startsWith('boot148-');
const src=h=>{if(!memo.has(h))memo.set(h,load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));return memo.get(h);};
(async()=>{
 await api.ready;let selected=0,rendered=0;
 const roster=process.env.PANTS.split(',').map(Number),sheets={};
 a(roster.every(id=>supported.includes(id)));
 for(const direction of ['east','west'])for(const action of ['idle','walk'])for(const pants of roster){
  const o={action,direction,consumer:'world'},worn=player(pants,148),bare=player(pants),reference=player(133,148);
  const b148=api.selectVisual(worn,o),no=api.selectVisual(bare,o),ref=api.selectVisual(reference,o);
  a.equal(b148?.slotRoutes?.boots?.item,148,JSON.stringify([direction,action,pants,b148?.id]));
  a.equal(b148.slotRoutes.legs.item,pants);a.equal(b148.slotRoutes.gloves.item,152);a.equal(b148.slotRoutes.coat.item,151);
  const x=b148.pack.directions[direction],y=no.pack.directions[direction],z=ref.pack.directions[direction];
  const equipped=x.layers.filter(boot);a.deepEqual(y.layers,x.layers.filter(l=>!boot(l)));
  a.equal(equipped.length,6);a.deepEqual(equipped,z.layers.filter(boot));
  a.deepEqual(x.clip,y.clip);a.deepEqual(x.poses,y.poses);a.deepEqual(x.rest,y.rest);
  a.deepEqual(b148.pack.pivot,no.pack.pivot);a.deepEqual(b148.pack.frame,no.pack.frame);
  const shape=[...equipped].sort((x,y)=>x.depth-y.depth).map(l=>l.depth);a.deepEqual(shape,[4.3,4.3,4.39,4.39,5,6]);
  a.deepEqual(b148.colorAppearance,no.colorAppearance);
  // This proof is for the literal archive look, not a selectable saved palette.
  const normalized=global.MareCharacterAppearance.normalize(look);
  a.notEqual(normalized.skinColor,'original');
  a(!api.selectLayered({...worn,appearance96:normalized},o)?.id.includes(':boot148:'),'literal archive look must not alias a real save');
  const saved={...worn,appearance96:{...look,skinColor:'ebony'}};
  a(!api.selectLayered(saved,o)?.id.includes(':boot148:'),'new route claimed unverified saved colors');
  for(const x of [140,147,182])a(!api.selectLayered(player(x,148),o)?.id.includes(':boot148:'),'unselected variants were promoted');
  selected++;
  if(process.env.SELECT_ONLY)continue;
  const saves=[JSON.stringify(worn),JSON.stringify(bare)],n=x.clip.frames;
  const q0=await prep(worn,b148,o),q1=await prep(bare,no,o),q2=await prep(reference,ref,o);
  const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
  try{
   for(let i=0;i<n;i++){
    const [before]=take(q1,bare,o,i,n),[after,frame]=take(q0,worn,o,i,n);
    ctx.clearRect(0,0,512,512);
    for(const l of equipped){a.equal(l.binding.kind,'fixed');ctx.drawImage(await src(l.frames[i]),0,0);}
    const mask=pix(c),[control]=take(q2,reference,o,i,n);let diff=0,visible=0,bottom=0,maxSole=0;
    for(let j=0;j<mask.length;j+=4)if(mask[j+3])bottom=j>>11;
    for(let j=(bottom-15)*2048;j<mask.length;j+=4)if(mask[j+3]){
     a.equal(after[j+3],control[j+3],'sole alpha footprint changed');
     for(let k=0;k<3;k++)maxSole=Math.max(maxSole,Math.abs(after[j+k]-control[j+k]));
    }
    a(maxSole<=3,'sole material drift vs B148 P133 '+maxSole);
    for(let j=0;j<mask.length;j+=4){
     if(before.readUInt32LE(j)===after.readUInt32LE(j))continue;
     a(mask[j+3]);diff++;
     if(mask[j+3]>127&&after[j+3]>127)visible++;
    }
    a(diff>2000);a(visible>1600,[direction,action,pants,i,visible].join('/'));
    a.deepEqual(take(q1,bare,o,i,n)[0],before);
    if(process.env.PRINT&&action==='walk'){
     if(!sheets[direction]){
      const s=cv.createCanvas(8*126,roster.length*2*115),sc=s.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#68768c';sc.fillRect(0,0,s.width,s.height);
      sheets[direction]=[s,sc];
     }
     const [s,sc]=sheets[direction],x=(i%8)*126,y=(roster.indexOf(pants)*2+Math.floor(i/8))*115;
     sc.drawImage(frame,144,280,224,190,x+4,y+2,116,98);
     sc.fillStyle='white';sc.fillText('P'+pants+' F'+i,x+6,y+109);
    }
    rendered++;
   }
  }finally{c.width=c.height=1;q0.release();q1.release();q2.release();}
  a.deepEqual([JSON.stringify(worn),JSON.stringify(bare)],saves);global.gc?.();
 }
 a.equal(selected,roster.length*4);
 if(!process.env.SELECT_ONLY)a.equal(rendered,roster.length*34);
 if(process.env.PRINT)for(const [dir,[c]] of Object.entries(sheets))fs.writeFileSync(process.env.PRINT+'/'+dir+'-boot148-all.png',c.toBuffer('image/png'));
 console.log({selected,rendered,exactNonBootLayers:true});
})().catch(e=>{console.error(e);process.exitCode=1});
