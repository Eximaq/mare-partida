const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {make,cv}=require(path.join(root,'tests/rework-integration-support.cjs'));
const api=make(),placed=api,matrix=[];
const load=require(path.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const d={consumer:'world',direction:'south',progress:0};
async function capture(api,p,action){
 const o={...d,action};assert(await api.prepare(p,o),JSON.stringify([p,action,api.snapshot()]));
 const c=cv.createCanvas(512,512),ctx=c.getContext('2d');let sprite;const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(im,...args)=>{sprite=im;return draw(im,...args);};assert(api.draw(ctx,p,{...o,x:256,y:448}));assert.equal(sprite.width,512);const rgba=Buffer.from(sprite.getContext('2d').getImageData(0,0,512,512).data);c.width=1;return rgba;
}
(async()=>{await Promise.all([api.ready,placed.ready]);
 for(const appearance96 of [{gender:'feminino'},{gender:'feminino',hairColor:'brown',eyeColor:'brown'},{gender:'feminino',hairStyle:'hair-bob',skinColor:'ebony',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}]){
 const p={classId:'brawler',appearance96:global.MareCharacterAppearance.normalize(appearance96),equipment:{}};
 const idle=await capture(api,p,'idle'),walk=await capture(api,p,'walk');
 const actor={...p,equipment:{legs:{def:168}}},save=JSON.stringify(actor);
 const pants=await capture(api,actor,'walk');
 const refs=api.select(actor,{...d,action:'walk'}).authoredPantsLayer.spec.items[168][0];
 const read=async h=>{const c=cv.createCanvas(512,512);c.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'),0,0);return c.getContext('2d').getImageData(0,0,512,512).data;};
 const [cloth,owner]=await Promise.all([refs.cloth,refs.ownerAlpha].map(read));
 const pIdle=placed.select(actor,{...d,action:'idle'});assert.equal(pIdle?.action,'idle');assert.match(pIdle.id,/:idle-phase0$/);assert.equal(pIdle.authoredPantsLayer.item,168);
 assert.deepEqual(await capture(placed,actor,'idle'),pants);
 assert.deepEqual(await capture(placed,p,'idle'),idle);
 assert.equal(JSON.stringify(actor),save);
 for(const [slot,value]of Object.entries({head:19,coat:151,boots:9,gloves:152,pants:168,weapon:0}))assert(!placed.select({...actor,equipment:{...actor.equipment,[slot]:{def:value}}},{...d,action:'idle'})?.id.endsWith(':idle-phase0'));
 let dIW=0,dWP=0,outside=0,min=512,max=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const k=(y*512+x)*4;if(!idle.subarray(k,k+4).equals(walk.subarray(k,k+4)))dIW++;
  if(!walk.subarray(k,k+4).equals(pants.subarray(k,k+4))){dWP++;min=Math.min(min,y);max=Math.max(max,y);if(!cloth[k+3]||owner[k+3])outside++;}
 }
 assert.equal(dIW,0);assert(dWP>0);assert.equal(outside,0);
 matrix.push({appearance96,dIW,dWP,min,max,outside});
 }
 console.log(JSON.stringify(matrix,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
