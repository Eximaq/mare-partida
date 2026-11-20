'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance.js')),V=global.ReworkAccessoryVendor.compositor,N=512;
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),stock=make(), raw={gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinStyle:'natural'};
const player=(skinColor,look={},equipment={weapon:{def:119}},classId='cyborg')=>JSON.parse(JSON.stringify(A.commit({id:'disposable-w119',equipment,classId},{...raw,skinColor,...look},()=>true)));
const canvas=()=>cv.createCanvas(N,N),ctx=c=>c.getContext('2d'),rgba=c=>Buffer.from(ctx(c).getImageData(0,0,N,N).data);
const stable=async(api,who,o,f,n)=>{let c;const opt={...o,progress:(f+.1)/n,x:0,y:0};
 a(await api.prepareStablePose(who,opt),JSON.stringify(api.snapshot()));
 a(api.draw({save(){},restore(){},drawImage(x){c=x;}},who,opt),JSON.stringify(api.snapshot()));
 a.equal(api.snapshot().last.frame,f);return rgba(c);
};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponCarryHD=require(p.resolve(C,'player-rework-weapon-carry-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const root='tools/rework-weapon-layers-hd',plans=require(p.join(R,root,'carry-binding-plan.json')),bases=require(p.join(R,'tools/rework-base-hd/index.json')),
  own=plans.records.find(x=>x.item===119&&x.direction==='south'), args={item:119,body:'male',direction:'south',action:'walk',equipment:{weapon:119},appearance:player('light').appearance96,mechanical119SouthSaved:true};
 const run=plan=>global.MareReworkWeaponCarryHD.create(bases,{...plans,records:[plan]}).resolve(args);
 a(run(own)?.mechanical119SouthSavedPalette);
 for(const mutate of [p=>p.mirrorEntireComposition=true,p=>p.paddingPhysical=4,p=>p.parts[0].source.sourceClip=[0,0,640,640],
   p=>p.parts[1].source.sha256='0'.repeat(64),p=>p.parts[1].depthOffset=1,p=>p.parts[1].sourceBone['RIGHT ARM'].x++,
   p=>p.parts[0].targetRestBone['RIGHT ELBOW'].y++,p=>p.parts[0].hideHandBeyondWrist=true,p=>p.parts.reverse()]){
  const v=structuredClone(own);mutate(v);a(!run(v)?.mechanical119SouthSavedPalette);
 }
 const o={consumer:'world',direction:'south'},Mat=global.MareNativeSkinHD,P=global.MareAppearance96,H=require(p.join(R,'player-rework-hair-anatomy-hd.js'));
 for(const action of ['idle','walk']){
  const opt={...o,action},p0=player('light'),p1=player('ebony'),l=api.selectVisual(p0,opt),e=api.selectVisual(p1,opt);
  a(l?.mechanical119SouthSavedPalette,'real cyborg save');a(e?.mechanical119SouthSavedPalette);a.deepEqual(l.base,e.base);a.deepEqual(l.plan,e.plan);
  if(C)a(!stock.selectVisual(p0,opt)?.mechanical119SouthSavedPalette);
  for(const [who,where] of [[player('porcelain'),opt],[player('light',{hairColor:'blonde'}),opt],[player('light',{},p0.equipment,'brawler'),opt],
   [player('light',{},{weapon:{def:119},coat:{def:151}}),opt],[player('light',{},{weapon:{def:119,variant:'alt'}}),opt],[player('light',{},{weapon:{def:118}}),opt],
   [p0,{...opt,action:'attack-unarmed'}],[p0,{...opt,consumer:'preview'}],[p0,{...opt,direction:'north'}],[p0,{...opt,direction:'east'}],[p0,{...opt,direction:'west'}],[p0,{...opt,weaponless:true}]]){
    const got=api.selectVisual(who,where);a(!got?.mechanical119SouthSavedPalette);if(C)a.deepEqual(got,stock.selectVisual(who,where));
  }
  const sentinel={...p0,appearance96:{...p0.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
  const sent=stock.selectVisual(sentinel,opt);a.equal(sent?.id,l.id);a.deepEqual(sent?.plan,l.plan);
  const d=l.base.pack.directions.south,n=d.clip.frames,imgs=await Promise.all(l.plan.parts.map(q=>load('tools/rework-weapon-layers-hd/'+q.source.url))),results=[];
  a.equal(n,action==='idle'?1:16);a.deepEqual(l.plan.parts.map(q=>q.replaceBoundLayer),[true,true]);
  const iris=d.layers.find(x=>x.slot==='face'),iCanvas=canvas(),iX=ctx(iCanvas),iM=iX.createImageData(N,N);
  for(const [x,y,r,g,b,a,tone] of l.relicEyes.samples){const i=((y-64)*N+x-64)*4,c=parseInt(A.eyes.blue.ramp[tone-1].slice(1),16);iM.data.set([c>>16&255,c>>8&255,c&255,255],i);}
  iX.putImageData(iM,0,0);
  const limbs=d.layers.filter(q=>['armRight','handRight'].includes(q.id));
  async function isolated(l,f,src){const c=canvas(),id=l.frames?.[f]||l.source;V.render(ctx(c),{...e.base.pack,directions:{south:{...d,layers:[l]}}},new Map([[id,src||await load('tools/rework-base-hd/assets/'+id+'.png')]]),{direction:'south',frame:f,density:4});return rgba(c);}
  for(let f=0;f<n;f++){
   const light=await stable(api,p0,opt,f,n),dark=await stable(api,p1,opt,f,n),bare=await stable(api,player('light',{},{}),opt,f,n),original=await stable(stock,sentinel,opt,f,n);
   const [upper,lower]=await Promise.all(limbs.map(q=>isolated(q,f))),eyes=await isolated(iris,f,iCanvas);
   const [lenA,lenB]=l.plan.parts.map((q,k)=>{const c=canvas(),x=ctx(c),pose=d.poses[f],m=V.rigid(q.sourceBone[q.binding.b],q.sourceBone[q.binding.a],pose[q.binding.b],pose[q.binding.a]);
    x.imageSmoothingEnabled=false;x.transform(...m.slice(0,4),m[4]*4,m[5]*4);x.drawImage(imgs[k],0,0);return rgba(c);});
   const owned=new Uint8Array(N*N);
   for(const l of d.layers.filter(q=>!['armRight','handRight'].includes(q.id))){
    const key=l.frames?.[f]||l.source,im=await load('tools/rework-base-hd/assets/'+key+'.png'),c=canvas(),t=ctx(c);t.drawImage(im,0,0);
    const z=t.getImageData(0,0,N,N),an=H.masks(key,z.data,P),kind=Mat.ownership([l]),mat=an
     ?an.skin.map((x,j)=>x||an.hair[j]):kind?Mat.mask(z.data,N,kind):l.slot==='hair'?P.materialMask(z.data,'hair'):null;
    if(!mat)continue;
    const mask=t.createImageData(N,N);for(let k=0;k<mat.length;k++)if(mat[k])mask.data[k*4+3]=255;t.putImageData(mask,0,0);
    const area=await isolated(l,f,c);for(let k=0;k<owned.length;k++)if(area[k*4+3])owned[k]=1;
   }
   const pose=d.poses[f],el=pose['RIGHT ELBOW'];let overlap=0,edge=0,regions=0,gear=0,blue=0,material=0;
   for(let i=0;i<bare.length;i+=4){
    a.equal(light[i+3],original[i+3],'saved palette changed literal silhouette');a.equal(dark[i+3],original[i+3]);
    const arm=upper[i+3]||lower[i+3],aA=lenA[i+3],aB=lenB[i+3],has=light.readUInt32LE(i),before=bare.readUInt32LE(i);
    if(eyes[i+3]){a.equal(has,eyes.readUInt32LE(i));a.equal(dark.readUInt32LE(i),has);blue++;}
    else if(has!==before){a(aA||aB||arm,'changed outside arm/parts');regions++;}
    if(!aA&&!aB&&!arm&&!eyes[i+3]&&dark.readUInt32LE(i)!==has)material++;
    if((aA===255||aB===255)&&Math.floor(i/4/N)>400)a.equal(has,dark.readUInt32LE(i),'gear color changed for skin');
    const q=i/4,x=q%N+.5,y=Math.floor(q/N)+.5;
    if((x-el.x*4)**2+(y-el.y*4)**2<16**2&&aB===255){
     if(aA===255)overlap++;
     else if([i-4,i+4,i-N*4,i+N*4].some(j=>lenA[j+3]===255&&light[j+3]===255)&&light[i+3]===255)edge++;
    }
    if(!owned[i/4]&&!eyes[i+3]){a.equal(has,original.readUInt32LE(i),'nonmaterial delta vs literal original');a.equal(dark.readUInt32LE(i),has);}
    if((aA===255&&lenA.readUInt32LE(i)===has||aB===255&&lenB.readUInt32LE(i)===has)&&has!==before){a.equal(has,dark.readUInt32LE(i),'unmixed hardware changed for skin');gear++;}
   }
   a.equal(blue,45);a(gear>100&&material>100&&regions>1000);a(overlap+edge>0,'mechanical elbow disconnected at authored seam '+f);
   results.push({f,overlap,edge,blue,gear,material,regions});global.gc?.();
  }
  console.log(action,JSON.stringify(results));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
