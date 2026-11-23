'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Set HD_PUBLISHED_ROOT');
const {make}=require('./rework-integration-support.cjs');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),appearance=require(path.join(root,'character-appearance.js'));
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const family=weapons.filter(w=>['healer','strategist'].includes(w.role));
const styles=Object.keys(appearance.choices.eyeStyle).filter(s=>s!=='original');
const rowCases={east:[[16,'hair-cropped',18,'face-calm'],[17,'original',null,'face-focused'],[123,'none',150,'face-almond']],
 west:[[32,'hair-long',19,'face-calm'],[121,'original',null,'face-almond'],[128,'hair-cropped',null,'face-resolute']],
 north:[[31,'hair-cropped',18,'face-calm'],[128,'original',19,'face-resolute']]};
const pigments=new Set(appearance.eyes.green.ramp.map(hex=>{const n=parseInt(hex.slice(1),16);return ((n>>16)&255)|(n&0xff00)|((n&255)<<16);}));
async function main(){
 const api=make();await api.ready;assert.equal(family.length,12);assert.equal(styles.length,4);
 const directions=process.env.FOCUS_EYE_DIRECTION?[process.env.FOCUS_EYE_DIRECTION]:Object.keys(rowCases),rows=[];
 assert(directions.every(d=>rowCases[d]));
 for(const direction of directions){
  const options={consumer:'world',action:'attack-focus',direction};
  function query(weapon,hairStyle,eyeStyle,helmet){
   const w=family.find(w=>w.id===weapon),gear={weapon:w.id,coat:137,legs:133,boots:162,gloves:159};
   if(helmet!=null)gear.head=helmet;
   const p=appearance.commit({classId:w.role,equipment:Object.fromEntries(Object.entries(gear).map(([k,id])=>[k,{def:id}]))},
    {gender:'masculino',hairColor:'blue',eyeColor:'green',skinColor:'ebony',hairStyle,eyeStyle},()=>true);
   const r=world.selectWorldHDOnly(api,catalog,p,options),label=[weapon,direction,hairStyle,eyeStyle,helmet].join('/');
   assert(r,label);assert.equal(r.direction,direction);assert.equal(r.resolvedAction||r.action,options.action);
   assert(!r.visualDegraded&&!r.appearanceAdapted,label);assert.deepEqual(r.omitted||[],[],label);
   for(const [k,id] of Object.entries(gear)){assert.equal(r.slotRoutes[k].item,id,label);assert.equal(r.slotRoutes[k].quality,'hd',label);}
   return {r,p,label};
  }
  let selected=0;
  for(const w of family)for(const style of styles)for(const hair of ['original','hair-cropped','none']){
   query(w.id,hair,style,19);selected++;
  }
  const hairShapes=Object.keys(appearance.choices.hairStyle);assert.equal(hairShapes.length,14);
  for(const w of family){
   for(const hair of hairShapes)query(w.id,hair,'face-calm',null);
   query(w.id,'none','original',null);
  }
  assert.equal(selected,144);
  async function draw(v){
   const bundle=await api.prepareConfiguration([{player:v.p,options}],{resolve:()=>({player:v.p,options,source:v.r})});
   try{const c=bundle.coverage[0];assert.equal(c.source,v.r.id);assert.equal(c.direction,direction);assert.deepEqual(c.omitted,[]);
    const n=v.r.timeline?.length??c.frames,frames=[];assert(n>=8);
    for(let f=0;f<n;f++){let canvas;
     assert(bundle.draw({save(){},restore(){},drawImage(img){canvas=img;}},v.p,{...options,progress:(f+.1)/n}),v.label);
     assert.equal(canvas.width,640);assert.equal(canvas.height,640);
     frames.push(new Uint32Array(canvas.getContext('2d').getImageData(0,0,640,640).data.buffer));
    }
    return frames;
   }finally{bundle.release();}
  }
  let count=0;
  for(const [weapon,hair,helmet,style] of rowCases[direction]){
   const neutral=await draw(query(weapon,hair,'original',helmet)),styled=await draw(query(weapon,hair,style,helmet));
   assert.equal(neutral.length,styled.length);
   const details={weapon,hair,helmet,style,direction,frames:neutral.length,minEye:null,green:0};
   for(let f=0;f<neutral.length;f++){
    const a=neutral[f],b=styled[f];let changed=0,green=0;
    // Published profile faces use a 640px canvas. Include rigid neck travel
    // in the signed eye area, but compare every pixel of every other part.
    const bounds=direction==='east'?[325,178,355,213]:[284,178,316,213];
    for(let j=0;j<a.length;j++){
     if(a[j]===b[j])continue;
     const x=j%640,y=Math.floor(j/640);
     assert(direction!=='north'&&x>=bounds[0]&&x<=bounds[2]&&y>=bounds[1]&&y<=bounds[3],
      [weapon,direction,hair,style,f,x,y,'changed outside visible eye']);
     changed++;
    }
    if(direction!=='north'){
     for(let y=bounds[1];y<=bounds[3];y++)for(let x=bounds[0];x<=bounds[2];x++){const v=b[y*640+x];if(v>>>24===255&&pigments.has(v&0xffffff))green++;}
     assert(changed>0&&green>0,[weapon,direction,style,f,changed,green]);
    }
    details.minEye=Math.min(details.minEye??Infinity,changed);details.green+=green;
   }
   rows.push(details);console.log(JSON.stringify(details));count++;global.gc?.();
  }
  const baldWeapon={east:16,west:121,north:128}[direction];
  const hair=await draw(query(baldWeapon,'original','original',null)),bald=await draw(query(baldWeapon,'none','original',null));
  const pigment=hex=>{const n=parseInt(hex.slice(1),16);return ((n>>16)&255)|(n&0xff00)|((n&255)<<16);};
  const blue=new Set(appearance.hairs.blue.ramp.map(pigment)),skin=new Set(appearance.skins.ebony.ramp.map(pigment));
  let removed=0,exposed=0;
  for(let f=0;f<hair.length;f++){let strip=0;
   for(let i=0;i<hair[f].length;i++){
    const a=hair[f][i],b=bald[f][i];if(a===b)continue;
    assert(Math.floor(i/640)<302,[direction,'bald altered clothing or weapon below the head',i]);
    if(blue.has(a&0xffffff))removed++;if((b>>>24)===255&&skin.has(b&0xffffff))exposed++;strip++;
   }
   assert(strip>100,[baldWeapon,direction,f,'bald unchanged']);
  }
  assert(removed>0&&exposed>0,[baldWeapon,direction,'expected blue hair removal and ebony scalp exposure',removed,exposed]);
  rows.push({baldWeapon,direction,frames:bald.length,removedBlue:removed,exposedSkin:exposed});
  assert.equal(count,rowCases[direction].length);console.log(direction,selected,'selected');
 }
 if(process.env.WARDROBE_EVIDENCE)fs.writeFileSync(process.env.WARDROBE_EVIDENCE,JSON.stringify(rows));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
