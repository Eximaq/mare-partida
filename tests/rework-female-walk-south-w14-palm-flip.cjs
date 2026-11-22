'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),R=process.env.STAGE||require('node:path').resolve(__dirname,'..'),n=f=>require(R+'/'+f),
 {make,cv}=n('tests/rework-integration-support.cjs'),A=n('character-appearance'),W=n('paper-doll-96-lobby'),C=n('tools/paper-doll-96-v3/weapons.json'),
 idx=n('tools/rework-weapon-layers-hd/index.json'),load=n('tools/rework-hd-test-loader.cjs').create(R);
const api=make(),o0={direction:'south',action:'walk',consumer:'world'},oldIdx=idx.femaleRegistrations.find(z=>z.id==='female14-walk-south-candidate');
const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const approvedFlipPNG=["305ed9dfd529c75b59911dc9d4978272d47014a2b4cb8a71638b1b41c94ce12e", "d2ef6597ac8c01394017d1d14959d406f1dc6898c414c6bea03ff06f2fe570aa", "4f7daedd41dcbf554b21cdd161826afc0d4999cd64d20b9a3f7d0462d315c3f2", "a5acfac9057dc4872fef922890648eae302bf8ac79e8f9e853539dc7189925b9", "08558a53d62e1a4cf6b3d8391cd90a8efb3992ba87cb313c9b9b1ea840fc9ee2", "b571442bf838b4ce410617731634a081c39f86e7d91a5789e735b9ac26e083df", "359a5313650d80603d55bbacc705b71809161865536d21c8ac9a68daef55b6b3", "4aa16bbcacc7e2659fa55fa88c79549682853a93d9d4c360a25d18e651d7ea9c"];
const approvedPNG=["45ef94605bf58938067dd49b3268644e761f3f31264e2d31f10f6e1a69a00958", "0195be35fcdb485481c0d016426556b5fe72a732163becaef0596a2223af9acf", "5bacc66f322d73e3cd03e1dd0c306d513c18d8c9bea019d50c99d0ce7edcf3f9", "4ce0b6a9c8ed4b7450e77353ed3597a0e472fbd1963c94985d61986812e46938", "92ddefa33a69c48213bdf1135a4a92deb686be91c187b319aea095838b052b33", "ba08868b1ad5d7d595962a93145d93642cabe5a5a58d83dff44e5a08fcb1774d", "0adfd35deed42fd798df242136db454ebf53e010c22c85d0bccdfb3129c461ab", "b58175e08d257fe119522a73b489d863553ad9f9858d3d688ab16d344a5be51e"],northPNG=["c4d452e1de2726cf056e84aaeff930bdca45298c09723da3aafd78f458122319", "0bedfc0ee5baa1d5f0c5bd6f604cbf9a2cca4275c72426c5da6d352e38507e04", "809d25090072881bc3a8b829572a110622d570a0f7353895c10c3c15cbed5d72", "a74be9da4a8057587750e75522ebf5e3f6a83a8065f930c7eadff28383ecc3a2", "172af5c5185fc8918111a973b3ef99c8bc3c8bf78d8b4fdd0024482477998ad7", "e473d685e9281b048a0ae861697c92e4c152ffe61dd62a92815a6f121590a88a", "50f4a5b597503503e990f0b316e55160f87793a0e551e7e70e7b46f37442cb9d", "00792c33c070788fca867f3a83f790cb265ae3bba6ffe4eecac00fc7a7f84c3c"];
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const offsets=[[3,-32],[3,-33],[-1,-35],[0,-34],[-1,-32],[-2,-31],[0,-32],[6,-30]];
const makeActor=(skinColor)=>A.commit({classId:'cyborg',equipment:{weapon:{def:14}}},{gender:'feminino',skinColor},()=>true);
async function shoot(p,o,r){
 const prep=await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x});const result=[];
 try{for(let f=0;f<8;f++){
  let c;a(prep.draw({save(){},restore(){},drawImage(x){c=x}},p,{...o,progress:(f+.2)/8}));a.equal(c.width,512);a.equal(c.height,512);
  result.push({rgba:pixels(c),png:c.toBuffer('image/png')});
 }}finally{prep.release();global.gc?.();}
 return result;
}
(async()=>{await api.ready;const evidence=[];
 for(const skin of ['light','ebony']){
 const p=makeActor(skin),sav=JSON.stringify(p),r=W.selectWorldHDOnly(api,C,p,o0);
 a(r?.southWalk14PalmFlip&&!r.visualDegraded&&!r.omitted?.length,'missing scoped corrected South walk route');
 a.deepEqual(r.pack.directions.south.clip,{frames:8,fps:8,loop:true});
 const d=r.pack.directions.south,arm=d.layers.find(x=>x.id==='arms-phase');a.equal(arm.depth,5);
 const previous={...r,id:r.id+':approved-unflipped-palm',states:r.states.map((s,i)=>{
   const old=oldIdx.states[i].parts[0], [dx,dy]=offsets[i];
   return {...s,parts:[{...old,matrix:[...old.matrix.slice(0,4),old.matrix[4]+dx,old.matrix[5]+dy]}]};
 })};
 const empty={...r,id:r.id+':no-weapon-alpha-check',states:r.states.map(s=>({...s,parts:[]}))};
 const originalFlip={...r,id:r.id+':approved-flip-unshifted',states:r.states.map((s,i)=>({...s,parts:s.parts.map(p=>({...p,matrix:p.matrix.map((m,j)=>m-(i<4&&j===4?2:0))}))}))};
 const before=await shoot(p,o0,previous),after=await shoot(p,o0,r),off=await shoot(p,o0,empty),lastApproved=await shoot(p,o0,originalFlip);
 for(const [f,s] of r.states.entries()){
  const old=previous.states[f].parts[0],part=s.parts[0];const [a0,b0,c0,d0,tx,ty]=old.matrix,[a1,b1,c1,d1,tx1,ty1]=part.matrix,[px,py]=part.targetHandCenter;
  a.deepEqual({...part,matrix:old.matrix},old);
  a.deepEqual([a1,b1,c1,d1],[-a0,-b0,c0,d0]);
  const local=(u,v)=>{const det=a0*d0-b0*c0;return [(d0*u-c0*v)/det,(-b0*u+a0*v)/det]};
  const [lx,ly]=local(px-tx,py-ty); a(Math.abs(a1*lx+c1*ly+tx1-px-(f<4?2:0))<1e-9);a(Math.abs(b1*lx+d1*ly+ty1-py)<1e-9);
  if(skin==='light'){a.equal(hash(before[f].png),approvedPNG[f]); if(f>=4)a.equal(hash(after[f].png),approvedFlipPNG[f]);}
  a(part.depth>arm.depth);a(!s.hideBaseLayers&&!s.baseMasks);
  const gear=await load(part.url),armRaw=await load('tools/rework-base-hd/assets/'+arm.frames[f]+'.png'), mk=(im,m)=>{
   const c=cv.createCanvas(512,512),x=c.getContext('2d');x.imageSmoothingEnabled=false;if(m)x.transform(...m);x.drawImage(im,0,0);const y=pixels(c);c.width=1;return y;
  },raw=mk(armRaw),beforeSupport=mk(gear,old.matrix),afterSupport=mk(gear,part.matrix);
  const X=before[f].rgba,Y=after[f].rgba,Z=off[f].rgba,[hx,hy]=part.targetHandCenter.map(Math.round);
  if(skin==='light')a.equal(hash(lastApproved[f].png),approvedFlipPNG[f]);
  const P=lastApproved[f].rgba, origSupport=mk(gear,originalFlip.states[f].parts[0].matrix);
  let oldCoverage=0,newCoverage=0,handN=0,changed=0,microChanged=0;
  for(let i=0;i<X.length;i+=4){
   const x=(i>>>2)%512,y=(i/2048)|0;
   if(X.readUInt32LE(i)!==Y.readUInt32LE(i)){a(beforeSupport[i+3]||afterSupport[i+3],'external RGBA change');changed++;}
   if(P.readUInt32LE(i)!==Y.readUInt32LE(i)){a(origSupport[i+3]||afterSupport[i+3],'outside approved micro-shift');microChanged++;}
   if(!afterSupport[i+3])a.equal(Y.readUInt32LE(i),Z.readUInt32LE(i),'must be removable');
   if(afterSupport[i+3]===255)a.equal(Y.readUInt32LE(i),afterSupport.readUInt32LE(i),'own visible metal was recolored or covered');
   if(Math.abs(x-hx)<=7&&Math.abs(y-hy)<=8&&raw[i+3]>=128){
    handN++;oldCoverage+=beforeSupport[i+3]>=128;newCoverage+=afterSupport[i+3]>=128;
   }
  }
  a(changed>=100&&newCoverage>=handN*.8,JSON.stringify({f,changed,oldCoverage,newCoverage,handN}));
  a(f<4?microChanged>0:microChanged===0);evidence.push({skin,f,oldCoverage,newCoverage,handN,changed,microChanged});
  if(process.env.PREVIEW_DIR&&skin==='light'){
   fs.writeFileSync(process.env.PREVIEW_DIR+'/before-'+f+'.png',before[f].png);
   fs.writeFileSync(process.env.PREVIEW_DIR+'/after-'+f+'.png',after[f].png);
  }
 }
 a.equal(JSON.stringify(p),sav);
 const north={...o0,direction:'north'},nw=W.selectWorldHDOnly(api,C,p,north),nw0=idx.femaleRegistrations.find(x=>x.id==='female14-walk-north-candidate');
 a(!nw?.southWalk14RightPalm);a.deepEqual(nw.states,nw0.states);
 const other=await shoot(p,north,nw);
 if(skin==='light')for(let i=0;i<8;i++)a.equal(hash(other[i].png),northPNG[i]);
 for(const options of [{...o0,action:'idle'},{...o0,direction:'east'},{...o0,direction:'west'}])a(!W.selectWorldHDOnly(api,C,p,options)?.southWalk14RightPalm);
 }
 console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e);process.exit(1)});
