'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),C=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance');
const index=require('../tools/rework-weapon-layers-hd/index.json'),read=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').dirname(__dirname));
const save=(tone,equipment={weapon:{def:121}},cl='strategist',patch={})=>A.commit({id:'w121-lateral',classId:cl,equipment},{skinColor:tone,...patch},()=>true);
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);const hash=b=>C.createHash('sha256').update(b).digest('hex');
const capture=(actor,o,f)=>{let c;a(api.draw({save(){},restore(){},drawImage(v){c=v;}},actor,{...o,progress:(f+.25)/8}));a.equal(c.width,640);return c;};
(async()=>{
 await api.ready;const board=cv.createCanvas(2520,710),g=board.getContext('2d');g.fillStyle='#344658';g.fillRect(0,0,2520,710);
 for(const direction of ['east','west']){
  const o={action:'attack-focus',direction,consumer:'world'},r0=index.records.find(r=>r.id===`daggers121-${direction}-native-original-source`);
  const actor=save('light'),r=api.selectVisual(actor,o);a(r?.staff121SideSkin);a.deepEqual(r.states,r0.states);a(await api.prepareClip(actor,o));
  const original=[];
  for(let f=0;f<8;f++){const c=capture(actor,o,f);original.push(px(c));if(direction==='east'&&process.env.PREVIEW_OUT)g.drawImage(c,160,155,315,355,315*f,0,315,355);}
  for(const tone of Object.keys(A.skins).filter(k=>k!=='light')){
   const actor=save(tone),r=api.selectVisual(actor,o);a(r?.staff121SideSkin);a.equal(r.fps,12);a.deepEqual(r.timeline,r0.timeline);a.deepEqual(r.pivot,r0.pivot);
   a(await api.prepareClip(actor,o));const phases=new Set;
   for(let f=0;f<8;f++){
    const c=capture(actor,o,f),b=px(c),ref=original[f];phases.add(hash(b));const state=r.states[f];a.equal(state.approved.sha256,r0.states[f].approved.sha256);a.deepEqual(state.layers.map(q=>q.role),['body','authored-scepter-contact']);
    let changed=0,gear=0;const sh=[0,-1,0,0,1,1,1,1][f];
    for(let i=0;i<b.length;i+=4){const x0=(i>>2)%640,y=Math.floor(i/2560)-sh,x=direction==='east'?x0:639-x0;
     a.equal(b[i+3],ref[i+3]);if(b.readUInt32LE(i)!==ref.readUInt32LE(i))changed++;
     if(x>=385&&x<433&&y>=198&&y<233&&ref[i+3]){a.equal(b.readUInt32LE(i),ref.readUInt32LE(i),JSON.stringify({direction,tone,f,x,y}));gear++;}
    }
    a(changed>11000&&gear>450);if(direction==='east'&&tone==='ebony'&&process.env.PREVIEW_OUT)g.drawImage(c,160,155,315,355,315*f,355,315,355);
   }
   a.equal(phases.size,8);
  }
  const player=save('ebony');
  for(const v of [{consumer:'portrait'},{action:'idle'},{weaponless:true},{variant:'other'},{direction:'north'},{direction:'south'}])a(!api.selectVisual(player,{...o,...v})?.staff121SideSkin);
  for(const v of [save('ebony',{weapon:{def:121},boots:{def:155}}),save('ebony',{weapon:{def:121,variant:'other'}}),save('ebony',undefined,'gunner')])a(!api.selectVisual(v,o)?.staff121SideSkin);
 }
 if(process.env.PREVIEW_OUT)fs.writeFileSync(process.env.PREVIEW_OUT,board.toBuffer('image/png'));
 console.log('PASS 128 saved World renders 8 tones x 8 phases x E/W, exact alpha, shaft center exact and unchanged count/clock.');
})().catch(e=>{console.error(e);process.exitCode=1;});
