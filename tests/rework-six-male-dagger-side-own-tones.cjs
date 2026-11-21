const a=require('node:assert/strict'),A=require('../character-appearance'),{make,cv}=require('./rework-integration-support.cjs'),W=require('../tools/rework-weapon-layers-hd/index.json'),api=make();
const makeActor=(id,t,ext={})=>JSON.parse(JSON.stringify(A.commit({id:'side-dagger-tones',classId:'rogue',equipment:{weapon:{def:id}}},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:t,...ext},()=>true)));
const im=(api,x,o,i)=>{let c;a(api.draw({save(){},restore(){},drawImage(q){c=q}},x,{...o,progress:(i+.25)/8}));a.equal(c.width,640);return c;},pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const view=cv.createCanvas(1160,600),g=view.getContext('2d');g.fillStyle='#505457';g.fillRect(0,0,1160,600);g.imageSmoothingEnabled=false;
(async()=>{await api.ready;let n=0;for(const [j,direction] of ['east','west'].entries())for(const id of [12,13,71,72,73,74]){
 const o={direction,action:'attack-daggers',consumer:'world'},r=W.orderedAttackProfiles.find(r=>r.id===`authored-ordered-${id}-${direction}`),light=makeActor(id,'light'),stock=api.selectVisual(light,o);
 a.equal(stock?.id,r.id+':owned-dagger-iris:blue:owned-dagger-hair:black');a(await api.prepareClip(light,o));
 const br=Array.from({length:8},(_,i)=>pixels(im(api,light,o,i)));
 for(const t of Object.keys(A.skins)){
  if(t==='light')continue;
  const x=makeActor(id,t),before=JSON.stringify(x),v=api.selectVisual(x,o);a.equal(v?.maleDaggerSideTone,t,'route '+id+' '+direction+' '+t);
  for(const k of ['fps','timeline','pivot','nativeCanvas','contactTick','phaseCount','visualSampling'])a.deepEqual(v[k],r[k]);
  for(let i=0;i<8;i++){
   for(const k of [0,2])a.deepEqual(v.states[i].layers[k],r.states[i].layers[k]);
   a.deepEqual(v.states[i].layers[3].mask,r.states[i].layers[3].mask);
  }
  a(await api.prepareClip(x,o));
  for(let i=0;i<8;i++){
   const c=im(api,x,o,i),q=pixels(c);let ch=0;
   for(let j=0;j<q.length;j+=4){a.equal(q[j+3],br[i][j+3]);ch+=+(q.readUInt32LE(j)!==br[i].readUInt32LE(j));}a(ch>100);
   if(id===71&&['porcelain','ebony'].includes(t)){
    const cx=i*145,cy=j*300+(t==='ebony'?150:0);g.drawImage(c,180,140,310,455,cx,cy+15,80,114);g.fillStyle='white';g.fillText(`${direction} ${t} F${i}`,cx+6,cy+12);
   }
   n++;
  }
  a.equal(JSON.stringify(x),before);
  for(const [bad,opts] of [[x,{...o,consumer:'portrait'}],[x,{...o,weaponless:true}],[{...x,classId:'gunner'},o],[{...x,equipment:{weapon:{def:id,variant:'different'}}},o],[{...x,equipment:{weapon:{def:id},coat:{def:151}}},o],[makeActor(id,t,{eyeStyle:'face-calm'}),o]])a(!api.selectVisual(bad,opts)?.maleDaggerSideTone);
  global.gc?.();
 }
 console.log('PASS',id,direction,56);
}
a.equal(n,672); if(process.env.DAGGER_CONTACT)require('node:fs').writeFileSync(process.env.DAGGER_CONTACT,view.toBuffer('image/png'));console.log('PASS',n,'ordinary saved all non-Light palette World; old Light is unchanged');
})().catch(e=>{console.error(e);process.exit(1)});
