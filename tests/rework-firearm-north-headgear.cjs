const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {make,cv}=require(path.join(root,'tests/rework-integration-support.cjs'));
const candidate=make(),load=require(path.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const json=f=>require(path.join(root,f));
const domains={vendor:global.ReworkAccessoryVendor?.compositor,makeCanvas:cv.createCanvas};
const bareIndex=json('tools/rework-base-hd/index.json'),weaponIndex=json('tools/rework-weapon-layers-hd/index.json');
const headIndex=json('tools/rework-accessories/head-layer-index.json'),owner=json('tools/rework-accessories/female-original-face-ownership.json');
const appearanceRegistry=global.MareFemaleNamedHairHD.create(headIndex,owner,{baseRegistry:global.MareReworkBaseHD.create(bareIndex),makeCanvas:cv.createCanvas});
const api=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:weaponIndex.femaleRegistrations},{...domains,appearanceRegistry});
const weapons=[4,5,113,114,115,116],helmets=[129,136,143,150,157,164,171,178],o={action:'attack-firearm',direction:'north',consumer:'world'};
function get(c){return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);}
const images=new Map;
async function render(r,f){
 const paths=api.requiredFiles(r,{frame:f}),local=new Map;
 for(const p of paths){if(!images.has(p))images.set(p,await load(p));local.set(p,images.get(p));}
 const target=cv.createCanvas(640,640);let head,others=[];
 api.render(target.getContext('2d'),r,local,{frame:f,captureOps({op,canvas}){(op.layer?.slot==='headBase'?()=>head=get(canvas):()=>others.push(get(canvas)))();canvas.width=1;}});
 const out=get(target);target.width=1;return {head,others,out};
}
(async()=>{await candidate.ready;let ticks=0,changed=0,checks=0;
 const lookVariants=[{}, {hairStyle:'hair-bob',hairColor:'pink',eyeColor:'violet',skinColor:'ebony'}];
 for(const [wi,item]of weapons.entries())for(const [hi,head]of helmets.entries()){
  const profile=lookVariants[(wi+hi)%2],appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',...profile});
  const p={classId:'gunner',appearance96,equipment:{weapon:{def:item}}},h={...p,equipment:{...p.equipment,head:{def:head}}},save=JSON.stringify(h);
  const a=candidate.selectVisual(p,o),b=candidate.selectVisual(h,o);assert(a&&b,String([item,head]));
  assert(a.northFirearmVisibleSkin);assert.deepEqual(b.northFirearmVisibleSkin,a.northFirearmVisibleSkin);assert.deepEqual(b.northFirearmHeadRecoil,[0,0,0,0,9,0,0,0]);
  assert.deepEqual(b.states,a.states);assert.deepEqual(b.pack,a.pack);assert.equal(b.material.skinColor,appearance96.skinColor);
  assert.equal(candidate.selectVisual({...h,preferences:{hideHeadgear:true}},o)?.id,a.id);
  assert(!candidate.selectVisual({...h,equipment:{...h.equipment,head:{def:head,variant:'other'}}},o)?.northFirearmHeadRecoil);
  checks++;if(process.env.SELECT_ONLY==='1')continue;
  for(let f=0;f<8;f++){
   const x=await render(a,f),y=await render(b,f);assert(x.head&&y.head);assert.deepEqual(x.others,y.others);
   let delta=0;for(let i=0;i<x.out.length;i+=4){if(x.out.readUInt32LE(i)===y.out.readUInt32LE(i))continue;delta++;assert(x.head[i+3]||y.head[i+3],`${item}/${head}/${f}/${i}`);}assert(delta);changed+=delta;
   const world={...o,progress:(f+.25)/8,x:320,y:512};assert(await candidate.prepare(h,world),JSON.stringify(candidate.snapshot()));
   const canvas=cv.createCanvas(640,640);assert(candidate.draw(canvas.getContext('2d'),h,world));canvas.width=1;
   ticks++;
  }assert.equal(JSON.stringify(h),save);
  console.log(item,head,appearance96.skinColor,ticks);
 }
 assert.equal(checks,48);if(process.env.SELECT_ONLY==='1'){console.log('PASS',checks,'selector and hidden toggle checks');return;}
 assert.equal(ticks,384);
 console.log('PASS',ticks,'native and runtime frames; unchanged arms/body/masks/weapon; all',changed,'changed pixels lie in old/new head-alpha union');
})().catch(e=>{console.error(e);process.exitCode=1});
