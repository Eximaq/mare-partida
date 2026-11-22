'use strict';
const a=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(process.env.KAIZOKU_REPO||path.resolve(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),file=root+'/player-rework-native-hd.js',m=new Module(file);
 m.filename=file;m.paths=Module._nodeModulePaths(root);require.cache[file]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),file);m.loaded=true;
}
const {make,cv}=require(root+'/tests/rework-integration-support.cjs'),A=require(root+'/character-appearance.js');
const api=make(),W=require(root+'/paper-doll-96-lobby.js'),catalog=require(root+'/tools/paper-doll-96-v3/weapons.json');
const load=require(root+'/tools/rework-hd-test-loader.cjs').create(root);
const pathFor=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const directions=process.env.DIR?[process.env.DIR]:['north','south','east','west'];
const gloves=[25,26,131,138,145,152,159,166,173,180];
const saved=(skinColor,coat,glove,classId='brawler')=>({
 classId,appearance96:A.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor}),
 equipment:{head:null,weapon:null,legs:null,boots:null,coat:coat?{def:151}:null,gloves:glove?{def:glove}:null}
});
const shot=(b,actor,o,frame)=>{let image;a(b.draw({save(){},restore(){},drawImage(c){image=c;}},actor,{...o,progress:(frame+.25)/8}));return image;};
const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
(async()=>{
 await api.ready;
 let actual=0,checked=0,rejected=0;
 for(const direction of directions){
  const o={consumer:'world',direction,action:'attack-unarmed'}, open={...o,action:'attack'};
  for(const skin of Object.keys(A.skins))for(const g of gloves){
   const c=api.selectVisual(saved(skin,true),o),solo=api.selectVisual(saved(skin,false,g),o),
    actor=saved(skin,true,g),r=W.selectWorldHD(api,catalog,actor,open);
   if(!solo?.ownBarePunchGlove){a(!r?.signedWeaponGarments?.assetPool);rejected++;continue;}
   a(r?.signedWeaponGarments?.assetPool==='outfit','combined signed route missing '+direction+'/'+skin+'/G'+g);
   a.deepEqual(r.slotRoutes.coat,c.slotRoutes.coat);a.deepEqual(r.slotRoutes.gloves,solo.slotRoutes.gloves);
   a.deepEqual(r.pack,c.pack);a.deepEqual(r.colorAppearance,c.colorAppearance);a.deepEqual(r.omitted,[]);
   a.equal(W.selectWorldHD(api,catalog,actor,{...o,action:'skill'})?.id,r.id);
   a.deepEqual(api.selectVisual(actor,o),r);
   a.deepEqual(r.signedWeaponGarments.phases.map(p=>p.front[0]),solo.ownBarePunchGlove.frames);
   checked++;
  }
  // Exercise all approved silhouettes in Ebony. Claro is also a
  // contrasting-material check using the first and last glove variants.
  for(const skin of (process.env.TONE?[process.env.TONE]:['ebony','light'])){
   const coat=saved(skin,true),c=await api.prepareConfiguration([{player:coat,options:o}]);
   const canvas=cv.createCanvas(640,640),ctx=canvas.getContext('2d');
   const mask=cv.createCanvas(640,640),mx=mask.getContext('2d');
   try{
    for(const g of (skin==='ebony'?gloves:[26,180])){
     const solo=api.selectVisual(saved(skin,false,g),o);
     if(!solo?.ownBarePunchGlove)continue;
     const actor=saved(skin,true,g),before=JSON.stringify(actor),
      r=W.selectWorldHD(api,catalog,actor,open), b=await api.prepareConfiguration([{player:actor,options:o}]);
     const passes=r.signedWeaponGarments.phases;
     try{for(let i=0;i<8;i++){
      const x=shot(c,coat,o,i),y=shot(b,actor,o,i);
      const overlay=await load(pathFor(passes[i].front[0]));
      ctx.clearRect(0,0,640,640);ctx.drawImage(x,0,0);ctx.drawImage(overlay,0,0);
      mx.clearRect(0,0,640,640);mx.drawImage(overlay,0,0);
      const xa=px(x),ya=px(y),exact=px(canvas),alpha=px(mask);
      a.equal(Buffer.compare(Buffer.from(ya.buffer),Buffer.from(exact.buffer)),0,'exact source-over '+direction+'/'+g+'/'+i);
      let delta=0;
      for(let j=0;j<ya.length;j+=4){
       if(xa[j]===ya[j]&&xa[j+1]===ya[j+1]&&xa[j+2]===ya[j+2]&&xa[j+3]===ya[j+3])continue;
       a(alpha[j+3]>0,'changed outside glove ownership '+direction+'/'+g+'/'+i+'/'+j/4);
       delta++;
      }
      a(delta>0);actual++;
     }}finally{b.release();}
     a.equal(JSON.stringify(actor),before);global.gc?.();
    }
   }finally{c.release();canvas.width=1;mask.width=1;}
  }
 }
 console.log('PASS',checked,'corresponding signed slot selections,',rejected,'missing own glove profiles remain unavailable;',actual,'rendered mixed phases exact');
})().catch(e=>{console.error(e);process.exitCode=1;});
