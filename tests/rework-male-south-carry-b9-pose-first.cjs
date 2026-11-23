'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),f=R+'/player-rework-native-hd.js',m=new Module(f);
 m.filename=f;m.paths=Module._nodeModulePaths(R);require.cache[f]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),f);m.loaded=true;
}
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),n=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),V=global.ReworkAccessoryVendor.compositor;
const npath=s=>require(R+'/'+s+'.js'),items=npath('item-catalog').create({forge:npath('forge-system'),prison:npath('prison-system'),haki:npath('haki-system'),akuma:npath('akuma-system'),hakiProgression:npath('haki-progression')}).items;
const app=(id,gear,tone)=>A.commit({classId:items[id].type,equipment:{weapon:{def:id},...gear}},{gender:'masculino',skinColor:tone},()=>true);
const px=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
function frame(b,p,o,f,ticks){let c;a(b.draw({save(){},restore(){},drawImage(i){c=i;}},p,{...o,progress:(f+.25)/ticks}));return c;}
function drawPose(p,options,source){return n.prepareConfiguration([{player:p,options,source}],{resolve:x=>x});}
(async()=>{await n.ready;
 let rows=0,count=0;
 for(const action of ['idle','walk'])for(const item of [4,74,113,115])for(const skin of Object.keys(A.skins)){
  const o={consumer:'world',direction:'south',action},player=app(item,{boots:{def:9}},skin),bare=app(item,{},skin),save=JSON.stringify(player),
   p=n.selectVisual(player,o),r=n.selectVisual(bare,o);
  a.equal(p?.slotRoutes?.boots?.quality,'hd','matching foot pose missing own B9 '+action+'/'+item+'/'+skin);
  a.equal(p.slotRoutes.weapon.item,item);a.deepEqual(p.plan,r.plan);a.deepEqual(p.colorAppearance,r.colorAppearance);a.deepEqual(p.omitted,[]);
  const d=p.pack.directions.south,normal=r.pack.directions.south,ticks=d.clip.frames,
   boots=d.layers.filter(l=>l.id.startsWith('boot9-'));
  a.deepEqual({...d,layers:d.layers.filter(l=>!boots.includes(l))},normal);
  a.equal(boots.length,4);a(boots.filter(x=>x.id.endsWith('-rear')).every(x=>x.depth<4));
  a(boots.filter(x=>!x.id.endsWith('-rear')).every(x=>x.depth>4));
  a.equal(JSON.stringify(player),save);rows++;
  if(process.env.SELECT_ONLY==='1'||skin!=='ebony')continue;
  const a0=await drawPose(bare,o,r),a1=await drawPose(player,o,p);
  let changed=0,opaqueContact=0,alphaContact=0;
  try{
   for(let f=0;f<ticks;f++){
    const c=frame(a0,bare,o,f,ticks),x=px(c),y=px(frame(a1,player,o,f,ticks)),
     [w,h]=[c.width,c.height],pad=r.plan.paddingPhysical??0, tmp=cv.createCanvas(w,h),ctx=tmp.getContext('2d');
    for(const l of boots)ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[f]+'.png'),pad,pad);
    const mask=px(tmp);ctx.clearRect(0,0,w,h);
    for(const q of r.plan.parts){
     const {a:lhs,b:rhs}=q.binding,m=V.rigid(q.sourceBone[rhs],q.sourceBone[lhs],d.poses[f][rhs],d.poses[f][lhs]),im=await load('tools/rework-weapon-layers-hd/'+q.source.url);
     a.equal(Boolean(q.staff124NativeContact||q.joinedFringe||q.joined118Sources||q.joined117Sources),false);
     ctx.save();ctx.imageSmoothingEnabled=false;const [ox,oy]=q.calibrationOffsetPhysical||[0,0];
     ctx.transform(m[0],m[1],m[2],m[3],m[4]*4+pad+ox,m[5]*4+pad+oy);
     if(q.source.sourceClip){ctx.beginPath();ctx.rect(...q.source.sourceClip);ctx.clip();}
     if(q.mirrorSource){ctx.translate(q.source.nativeSize?.[0]||640,0);ctx.scale(-1,1);}
     ctx.drawImage(im,0,0);ctx.restore();
    }
    const part=px(tmp);
    for(let i=0;i<x.length;i++){
     if(mask[i]>>>24&&part[i]>>>24)alphaContact++;
     if(mask[i]>>>24&&part[i]>>>24===255){opaqueContact++;a.equal(y[i],x[i],'opaque held weapon site changed');}
     if(y[i]!==x[i]){a(mask[i]>>>24,'changed outside own boot alpha');changed++;}
    }
    tmp.width=1;count++;
   }
   a(changed>4000,'boot must be visible');
   console.log(action,item,skin,ticks,{changed,opaqueContact,alphaContact});
  }finally{a0.release();a1.release();global.gc?.();}
 }
 console.log('PASS same lower pose, independent boot depths, no arm/weapon repack;',rows,'selectors and',count,'rendered frames');
})().catch(e=>{console.error(e);process.exitCode=1});
