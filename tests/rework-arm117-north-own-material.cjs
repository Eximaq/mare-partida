const R=require('node:path').resolve(__dirname,'..'),n=f=>require(R+'/'+f);
const {make,cv}=n('tests/rework-integration-support.cjs'),A=n('character-appearance'),W=n('paper-doll-96-lobby'),C=n('tools/paper-doll-96-v3/weapons.json'),J=n('tools/rework-weapon-layers-hd/index.json'),assert=require('assert/strict'),load=n('tools/rework-hd-test-loader.cjs').create(R);
const P='tools/rework-weapon-layers-hd/assets/',fetch=load;
const api=make({loadImage:fetch}),opt={action:'attack-unarmed',direction:'north',consumer:'world'},px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),
 select=(p,o=opt)=>W.selectWorldHDOnly(api,C,p,o),actor=(t,on)=>A.commit({classId:'cyborg',equipment:on?{weapon:{def:117}}:{}},{gender:'masculino',skinColor:t},()=>true),
 count=(a,b,region)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a.readUInt32LE(i)!==b.readUInt32LE(i)){assert(!region||region[i+3]);n++}return n};
async function draw(p,s,o,positions){
 const bank=await api.prepareConfiguration([{player:p,source:s,options:o}],{resolve:x=>x});
 try{return positions.map(progress=>{let c;assert(bank.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress}));assert.equal(c.width,640);return px(c);});}finally{bank.release();global.gc?.();}
}
(async()=>{await api.ready;
 const legacy=J.records.find(x=>x.id==='arm117-north-native-layers'),seq=[...Array.from({length:8},(_,i)=>i),...Array(12).fill(7)];
 const n8=seq.slice(0,8).map(i=>(i+.125)/8),n20=seq.map((_,i)=>(i+.125)/20),rows=[];
 for(const t of ['light','ebony']){
  const p=actor(t,true),b=actor(t,false),s=select(p),r=select(b),saved=JSON.stringify([p,b]);
  assert(s.arm117NorthOwnMetal&&!s.arm117NorthOwnMaterial);assert.equal(s.fps,12);assert.deepEqual(s.timeline,seq.map(String));assert.deepEqual(s.basePack,legacy.basePack);
  assert.deepEqual(s.basePack.pack.directions.north.clip,r.pack.directions.north.clip);
  assert.equal(select(p,{...opt,action:'attack'}).id,s.id);
  const ex=(cls,equipment,extras={})=>A.commit({classId:cls,equipment},{gender:'masculino',skinColor:t,...extras},()=>true);
  for(const [who,o] of [[ex('strategist',{weapon:{def:117}}),opt],
   [ex('cyborg',{weapon:{def:117,variant:'other'}}),opt],
   [ex('cyborg',{weapon:{def:117},coat:{def:151}}),opt],
   [ex('cyborg',{weapon:{def:118}}),opt],[ex('cyborg',{weapon:{def:117}},{gender:'feminino'}),opt],
   [ex('cyborg',{weapon:{def:117}},{hairColor:'brown'}),opt],
   [p,{...opt,consumer:'portrait'}],[p,{...opt,weaponless:true}],
   [p,{...opt,action:'attack-tech'}],[p,{...opt,action:'walk'}],...['south','east','west'].map(direction=>[p,{...opt,direction}])])
    assert(!api.selectVisual(who,o)?.arm117NorthOwnMetal);

  const off=await draw(b,r,opt,n8),on=await draw(p,s,opt,n20),removed=await draw(b,select(b),opt,n8),
   weaponless=await draw(p,select(p,{...opt,weaponless:true}),{...opt,weaponless:true},n8);
  const reequip=await draw(p,select(p),opt,n20);assert(off.every((x,i)=>x.equals(removed[i])&&x.equals(weaponless[i])));
  assert(on.every((x,i)=>x.equals(reequip[i])));
  const masks=[];
  for(let i=0;i<8;i++){
   const layer=s.states[i].layers;
   if(i===1||i===6)assert.equal(layer.length,0);
   else{
    assert.equal(layer.length,1);assert.equal(layer[0].operation,'source-over');assert(!layer[0].mask);
   }
   const c=cv.createCanvas(640,640);if(layer.length)c.getContext('2d').drawImage(await fetch(P+layer[0].sha256+'.png'),0,0);masks.push(px(c));c.width=1;
  }
  for(let k=0;k<20;k++){
   const i=seq[k],pixels=count(on[k],off[i],masks[i]);
   assert(i===1||i===6?pixels===0:pixels>600);if(k>7)assert(on[k].equals(on[7]));
   for(let j=0;j<on[k].length;j+=4)if(masks[i][j+3]===255)assert.equal(on[k].readUInt32LE(j),masks[i].readUInt32LE(j));
   rows.push({tone:t,tick:k,phase:i,pixels,externalClockUnchanged:true,offExact:true,reequipExact:true});
  }
  assert.equal(JSON.stringify([p,b]),saved);
 }
 assert.equal(rows.length,40);console.log('PASS W117 M NORTH: 40 true World ticks, no anatomy/clock mutations');
})().catch(e=>{console.error(e);process.exitCode=1});
