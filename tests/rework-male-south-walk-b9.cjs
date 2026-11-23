'use strict';
const R=process.env.KAIZOKU_REPO||require('node:path').resolve(__dirname,'..'),n=s=>require(R+'/'+s);
const {make,cv}=n('tests/rework-integration-support.cjs'),api=make(),app=n('character-appearance.js'),load=n('tools/rework-hd-test-loader.cjs').create(R),a=require('node:assert/strict');
const carry=n('player-rework-weapon-carry-hd.js').create(n('tools/rework-base-hd/index.json'),n('tools/rework-weapon-layers-hd/carry-binding-plan.json'),{makeCanvas:cv.createCanvas});
const overlay=n('player-rework-outfit-carry-overlay-hd.js').create(carry,n('tools/rework-modular-outfits-hd/index.json'));
const items=n('item-catalog.js').create({forge:n('forge-system.js'),prison:n('prison-system.js'),haki:n('haki-system.js'),akuma:n('akuma-system.js'),hakiProgression:n('haki-progression.js')}).items;
const covered=[0, 1, 2, 3, 5, 12, 13, 14, 15, 16, 17, 31, 32, 67, 68, 69, 70, 71, 72, 73, 109, 110, 111, 112, 114, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128];
const action='walk',direction='south',o={consumer:'world',direction,action},actor=(id,skin,boots)=>app.commit({classId:items[id].type,equipment:{weapon:{def:id},...(boots?{boots:{def:9}}:{})}},{gender:'masculino',skinColor:skin},()=>true);
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data), prefix='tools/rework-modular-outfits-hd/assets/';
(async()=>{
 await api.ready;
 let selects=0,frames=0;
 for(const id of covered){
  if(process.env.WEAPON&&+process.env.WEAPON!==id)continue;
  const palettes=Object.keys(app.skins);
  const weaponPlans=new Set(palettes.map(t=>JSON.stringify(api.selectVisual(actor(id,t,false),o)?.plan)));
  for(const skin of palettes){
   if(process.env.SKIN&&process.env.SKIN!==skin)continue;
   const off=actor(id,skin,false),on=actor(id,skin,true),saved=JSON.stringify(on);
   const b=api.selectVisual(off,o),added=api.selectVisual(on,o);
   a(added?.id.includes(':own-b9-south-carry'),'missing independently proven B9 path '+id+'/'+skin);
   a.deepEqual([added.slotRoutes.boots.item,added.slotRoutes.weapon.item,added.omitted],[9,id,[]]);
   a.deepEqual(added.plan,b.plan);
   a.deepEqual(added.colorAppearance,b.colorAppearance);
   const dir=b.pack.directions.south,final=added.pack.directions.south,boots=final.layers.filter(x=>x.id.startsWith('boot9-'));
   a.deepEqual({...final,layers:final.layers.filter(x=>!boots.includes(x))},dir);
   a.deepEqual(boots.map(l=>l.depth),[-1,4.01,-1,4.01]);
   a.equal(dir.clip.frames,16);
   selects++;
   if(process.env.SELECT_ONLY||weaponPlans.size===1&&!['light','ebony'].includes(skin))continue;
   const naked={...b,plan:{...b.plan,parts:[]}},pad=b.plan.paddingPhysical??0;
   for(let frame=0;frame<16;frame++){
    const files=[...new Set([...carry.requiredFiles(b,{frame}),...overlay.requiredFiles(added,{frame})])];
    const map=new Map(await Promise.all(files.map(async f=>[f,await load(f)])));
    const c=cv.createCanvas(1,1),ctx=c.getContext('2d');
    carry.render(ctx,b,map,{frame});const src=pix(c),w=c.width,h=c.height;
    overlay.render(ctx,added,map,{frame});const got=pix(c);a.deepEqual([c.width,c.height],[w,h]);
    carry.render(ctx,naked,map,{frame});const noWeapon=pix(c);
    c.width=w;c.height=h;
    for(const l of boots)ctx.drawImage(map.get(prefix+l.frames[frame]+'.png'),pad,pad);
    const mask=pix(c);let visible=0,sole=-1,authoredSole=-1;
    for(let j=0;j<src.length;j+=4){
     if(got[j+3])sole=Math.floor(j/(4*w));
     if(mask[j+3])authoredSole=Math.floor(j/(4*w));
     if(src.readUInt32LE(j)===got.readUInt32LE(j))continue;
     if(!mask[j+3]||src.readUInt32LE(j)!==noWeapon.readUInt32LE(j)) throw Error('changed body/weapon outside authorized footwear: '+[id,skin,frame,j].join('/'));
     visible++;
    }
    a(visible>2900);
    a(sole>=authoredSole);
    carry.render(ctx,api.selectVisual(off,o),map,{frame});a(pix(c).equals(src),'unequip must restore the exact frame');
    c.width=1;global.gc?.();frames++;
   }
   a.equal(JSON.stringify(on),saved);
   if(process.env.WEAPON||process.env.SKIN) console.log('PASS',id,skin,selects,frames);
  }
 }
 console.log('PASS saved South B9 walk',JSON.stringify({selects,frames}));
})().catch(err=>{console.error(err);process.exitCode=1});
