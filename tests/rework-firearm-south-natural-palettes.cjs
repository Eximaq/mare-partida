'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),load=require('../tools/rework-hd-test-loader.cjs').create(R),I=require('../tools/rework-weapon-layers-hd/index.json');
const dir='south',o={direction:dir,action:'attack-firearm',consumer:'world'},prefix='tools/rework-weapon-layers-hd/',n=640,px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,n,n).data),sig=x=>crypto.createHash('sha256').update(x).digest('hex');
const save=(item,skin,equipment={weapon:{def:item}},classId='gunner',look={})=>JSON.parse(JSON.stringify(A.commit({id:'firearm-south-palette',classId,equipment},{skinColor:skin,...look},()=>true)));
function draw(x,k){let c;a(api.draw({save(){},restore(){},drawImage(v){c=v;}},x,{...o,progress:(k+.25)/8,x:320,y:512}));a.equal(c.width,n);return c;}
const board=cv.createCanvas(900,720),bc=board.getContext('2d');bc.fillStyle='#334553';bc.fillRect(0,0,900,720);bc.imageSmoothingEnabled=false;
(async()=>{await api.ready;let total=0;
 for(const it of [4,113,115]){
 const neutral=save(it,'light'),r=api.selectVisual(neutral,o);a(r?.ownedSouthFirearmIris&&!r.firearmSouthSignedPalette);a.equal(r.states.length,8);a.equal(r.fps,12);a.deepEqual(r.pivot,[80,128]);a(await api.prepareClip(neutral,o));
 const base=r.timeline.map((_,i)=>px(draw(neutral,i)));
 const pack=r.basePack.pack,b=pack.directions.south,protectedPhase=[];
 for(let f=0;f<8;f++){
  const st=r.states[f],gear=st.attachment,x=cv.createCanvas(640,640),c=x.getContext('2d');c.transform(...gear.matrix);if(gear.mirrorX){c.translate(640,0);c.scale(-1,1);}c.drawImage(await load(prefix+gear.url),0,0);const weapon=px(x);x.width=1;
  const tiles=await Promise.all(b.layers.map(async z=>{const h=z.frames?.[f]??z.source,t=cv.createCanvas(640,640);t.getContext('2d').drawImage(await load(prefix+'assets/'+h+'.png'),0,0);const q=px(t);t.width=1;return q;}));
  protectedPhase.push({weapon,tiles});
 }
 for(const tone of Object.keys(A.skins)){
  const x=save(it,tone),q=api.selectVisual(x,o);
  a(q?.ownedSouthFirearmIris);a.equal(!!q.firearmSouthSignedPalette,tone!=='light');a.equal(q.colorAppearance.skin,tone);
  for(const z of ['states','timeline','fps','pivot','nativeCanvas','basePack'])a.deepEqual(q[z],r[z]);
  a(await api.prepareClip(x,o));const hashes=new Set();
  for(let f=0;f<8;f++){
   const c=draw(x,f),got=px(c),prev=base[f],{weapon,tiles}=protectedPhase[f];hashes.add(sig(got));let edits=0,metal=0,cloth=0;
   for(let i=0;i<got.length;i+=4){
    a.equal(got[i+3],prev[i+3]);
    const diff=got.readUInt32LE(i)!==prev.readUInt32LE(i);
    if(tiles[1][i+3]===255&&!weapon[i+3]&&!tiles.slice(2).some(t=>t[i+3])){a(!diff,'opaque cloth changed');cloth++;}
    if(weapon[i+3]&&(!tiles.some(t=>t[i+3])||weapon[i+3]===255&&!tiles.slice(2).some(t=>t[i+3]))){a(!diff,'opaque weapon changed');metal++;}
    if(diff)edits++;
   }
   a(cloth>1000&&metal>0, JSON.stringify({it,tone,f,cloth,metal}));a(tone==='light'?edits===0:edits>3000);total++;
   if(it===4&&[0,4,7].includes(f)&&['light','ebony'].includes(tone)){
    const ix=[0,4,7].indexOf(f),y=tone==='light'?0:360;bc.drawImage(c,175,151,300,358,ix*300,y,300,358);
    bc.fillStyle='#fff';bc.fillText(tone+' • quadro '+f,ix*300+9,y+15);
   }
  }
  a.equal(hashes.size,8);global.gc?.();
 }
 for(const [x,opts] of [[save(it,'ebony',{weapon:{def:it},coat:{def:151}}),o],[save(it,'ebony',{weapon:{def:it,variant:'other'}}),o],[save(it,'ebony',undefined,'strategist'),o],[save(it,'ebony'),{...o,consumer:'portrait'}],[save(it,'ebony'),{...o,action:'walk'}],[save(it,'ebony'),{...o,weaponless:true}]])a(!api.selectVisual(x,opts)?.firearmSouthSignedPalette);
 console.log(it,'South all eight skins x 8 native ticks; opaque cloth and gear exact');
}
a.equal(total,192);if(process.env.PREVIEW_OUT)fs.writeFileSync(process.env.PREVIEW_OUT,board.toBuffer('image/png'));console.log('PASS',total);})().catch(e=>{console.error(e);process.exitCode=1;});
