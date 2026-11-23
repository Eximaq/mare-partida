'use strict';
const a=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),n=f=>require(R+'/'+f);
const {make,cv}=n('tests/rework-integration-support.cjs'),A=n('character-appearance.js'),api=make();
const get=n('tools/rework-hd-test-loader.cjs').create(R);
const head=n('player-rework-original-hair-helmets-hd.js').create(n('tools/rework-accessories/head-layer-index.json'),
 {compat:global.MareNativeHeadCompat.create({makeCanvas:cv.createCanvas}),makeCanvas:cv.createCanvas});
const cases=[[2,'brawler','south','idle'],[119,'cyborg','north','walk'],[31,'healer','east','idle'],[128,'healer','west','walk']];
const snap=(b,p,o,f,t)=>{let c;a(b.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:(f+.25)/t}));return c;};
const px=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{await api.ready;let selected=0,rendered=0;
 for(const [weapon,classId,direction,action] of cases)for(const skinColor of Object.keys(A.skins).filter(t=>t!=='light')){
  const opts={consumer:'world',direction,action};
  const p={classId,appearance96:A.normalize({gender:'masculino',skinColor}),equipment:{weapon:{def:weapon}}};
  const root=api.selectVisual(p,opts),d=root.pack.directions[direction],frames=d.clip.frames;
  const doCanvas=!process.env.SELECT_ONLY&&['porcelain','ebony'].includes(skinColor);
  const bare=doCanvas?await api.prepareConfiguration([{player:p,options:opts}]):null;
  const without=doCanvas?await api.prepareConfiguration([{player:p,options:opts,source:{...root,id:root.id+':no-weapon-witness',plan:{...root.plan,parts:[]}}}],{resolve:x=>x}):null;
  try{
   for(const item of [164,178]){
    const actor={...p,equipment:{...p.equipment,head:{def:item}}},state=JSON.stringify(actor),r=api.selectVisual(actor,opts);
    a(r?.ownIndependentCarryHat,'certified pose and unchanged weapon plan should support skin '+[item,weapon,direction,action,skinColor]);
    a.deepEqual(r.colorAppearance,root.colorAppearance);a.deepEqual(r.plan,root.plan);a.deepEqual(r.pack,root.pack);
    a.equal(r.slotRoutes.head.item,item);a.equal(r.slotRoutes.weapon.item,weapon);a.deepEqual(r.omitted,[]);
    a.equal(api.selectVisual({...actor,preferences:{hideHeadgear:true}},opts)?.id,root.id);
    a(!api.selectVisual({...actor,classId:classId==='healer'?'strategist':'healer'},opts)?.ownIndependentCarryHat);
    const unsupported=api.selectVisual({...actor,equipment:{...actor.equipment,head:{def:157}}},opts);
    a(!unsupported?.ownIndependentCarryHat);
    selected++;
    if(!doCanvas)continue;
    const held=await api.prepareConfiguration([{player:actor,options:opts}]),refs=head.requiredFiles(r.gearOnlyRecord),
     headImages=new Map(await Promise.all(refs.map(async u=>[u,await get(u)])));
    const t=cv.createCanvas(512,512),ctx=t.getContext('2d'),l=d.layers.find(x=>x.slot==='headBase');
    try{
     for(let f=0;f<frames;f++){
      const b=snap(bare,p,opts,f,frames),z=snap(without,p,opts,f,frames),h=snap(held,actor,opts,f,frames);
      a.equal(b.width,512);
      const file='tools/rework-base-hd/assets/'+(l.frames?.[f]||l.source)+'.png';
      const proof=head.validate(r.gearOnlyRecord,{basePack:r.pack,baseBody:r.body,baseDirection:direction,baseFrame:f,baseMirrorX:!!root.base.mirrorX,baseImages:new Map([[file,await get(file)]]),headImages});
      a(proof.compatible,proof.reason);
      ctx.clearRect(0,0,512,512);head.draw(ctx,r.gearOnlyRecord,headImages,proof);const alpha=px(t);
      ctx.clearRect(0,0,512,512);ctx.drawImage(b,0,0);head.draw(ctx,r.gearOnlyRecord,headImages,proof);
      const stock=px(b),off=px(z),out=px(h);
      const expected=px(t),first=out.findIndex((v,j)=>v!==expected[j]);a.equal(first,-1,'head overlay differs at '+[item,weapon,direction,action,skinColor,f,first,out[first],expected[first],alpha[first]>>>24]);
      let changed=0;
      for(let j=0;j<out.length;j++){
       if(alpha[j]>>>24)a.equal(stock[j],off[j],'weapon contribution overlaps head');
       if(out[j]!==stock[j]){a(alpha[j]>>>24);changed++;}
      }
      a(changed>100);rendered++;
     }
    }finally{held.release();t.width=1;global.gc?.();}
    a.equal(JSON.stringify(actor),state);
   }
  }finally{bare?.release();without?.release();global.gc?.();}
 }
 console.log('PASS independent H164/H178 preserved held weapon and appearance:',selected,'selections;',rendered,'Porcelain/Ebony frames');
})().catch(e=>{console.error(e);process.exitCode=1});
