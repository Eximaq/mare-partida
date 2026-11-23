'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),mod=n=>require(path.join(root,n));
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),app=mod('character-appearance.js');
const tone=process.argv[2]||'ebony';assert(['light','ebony'].includes(tone));
const tile=()=>cv.createCanvas(640,640),pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const readLayer=(r,l,f)=>load('tools/rework-weapon-layers-hd/'+r.images[l.frames?.[f]||l.source]);
const armor=mod('tools/rework-combat-wardrobe/index.json'),slots={head:gear[4],boots:gear[2],coat:[151,158,165,179],gloves:gear[3]};
async function test(){
 const api=make();await api.ready;
 const actor=app.commit({classId:'strategist',equipment:{}},{gender:'masculino',skinColor:tone,hairColor:tone==='light'?'brown':'blue',eyeColor:tone==='light'?'brown':'green'},()=>true);
 const saved=JSON.stringify(actor.appearance96),rows=[];
 for(const direction of ['east','west']){
  const options={consumer:'world',action:'attack-focus',direction},fixed={head:19,boots:169,coat:151,gloves:152};
  async function pose(eq){
   const p={...actor,equipment:Object.fromEntries(Object.entries({weapon:16,...eq}).map(([s,id])=>[s,{def:id}]))},r=world.selectWorldHDOnly(api,catalog,p,options);
   assert.deepEqual(r.omitted||[],[]);assert(!r.visualDegraded&&!r.appearanceAdapted);
   assert.equal(r.direction,direction);assert.equal(r.action,'attack-focus');
   for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
   assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);
   const b=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   return {r,draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...options,progress:(f+.1)/8}));assert.equal(api.snapshot().last.frame,f);return pixels(c);},release:()=>b.release()};
  }
  const naked=await pose({}),bare=Array.from({length:8},(_,f)=>naked.draw(f));
  const witness=await pose({gloves:152}),rig=witness.r.independentPlan.base.compassAnatomy,parts=rig.pack.directions[direction].layers;
  assert.equal(parts.length,11);witness.release();
  for(const [slot,ids] of Object.entries(slots)){
   const peers={...fixed};delete peers[slot];const others=await pose(peers),reference=Array.from({length:8},(_,f)=>others.draw(f));
   for(const id of ids){
    const solo=await pose({[slot]:id}),full=await pose({...peers,[slot]:id});
    assert.deepEqual(solo.r.slotRoutes[slot],full.r.slotRoutes[slot]);
    for(const s of Object.keys(peers))assert.deepEqual(others.r.slotRoutes[s],full.r.slotRoutes[s]);
    for(let f=0;f<8;f++){
     const a=solo.draw(f),b=full.draw(f);let changed=0,inKit=0,owned=0;
     let glove,opaqueMetal,restore;
     if(slot==='gloves'){
      const c=tile(),x=c.getContext('2d'),all=tile();
      for(const [side,plane,material] of [['left','forearm-hand-far','staffGloves'],['right','forearm-hand-near','orbGloves']]){
       x.clearRect(0,0,640,640);x.save();if(direction==='west'){x.translate(640,0);x.scale(-1,1);}
       const key=armor[material].items[id][side][f].art;
       x.drawImage(await load('tools/rework-combat-wardrobe/assets/'+key+'.png'),0,0);x.restore();
       x.globalCompositeOperation='destination-out';
       for(const l of parts.slice(parts.findIndex(l=>l.id===plane)+1)){
        // The head bobs outside the hand bounds. Arm and shorts occlusions are phase-local.
        if(l.binding.kind==='fixed')x.drawImage(await readLayer(rig,l,f),0,0);
       }
       x.globalCompositeOperation='source-over';all.getContext('2d').drawImage(c,0,0);
      }
      glove=pixels(all);all.width=1;
      const state=naked.r.states[f],equipment=state.layers.find(l=>l.id==='equipment'),body=state.layers.find(l=>l.id==='body'),rest=state.layers.find(l=>l.id==='original-distal-hand');
      x.clearRect(0,0,640,640);if(equipment.depth>body.depth)x.drawImage(await load('tools/rework-weapon-layers-hd/'+equipment.url),0,0);opaqueMetal=pixels(c);
      x.clearRect(0,0,640,640);x.drawImage(await load('tools/rework-weapon-layers-hd/'+rest.mask.url),0,0);restore=pixels(c);c.width=1;
     }
     for(let i=0;i<a.length;i++){
      const different=a[i]!==bare[f][i],mixed=b[i]!==reference[f][i];
      if(different)changed++;if(mixed)inKit++;
      if(glove){
       if(!glove[i]||((opaqueMetal[i]>>>24)===255&&!(restore[i]&255))){assert(!different);assert(!mixed);}
       else if(different)owned++;
      }else if(different||mixed){
       const y=Math.floor(i/640);
       if(slot==='boots')assert(y>340);
       if(slot==='head')assert(y<300);
       if(slot==='coat')assert(y>=205&&y<465);
      }
     }
     assert(changed>35&&inKit>15,JSON.stringify({slot,id,direction,tone,f,changed,inKit}));
     if(glove)assert.equal(owned,changed);
     rows.push({direction,slot,id,f,changed,inKit,owned});
    }
    solo.release();full.release();
   }
   others.release();
  }
  naked.release();
 }
 assert.equal(rows.length,544);assert.equal(JSON.stringify(actor.appearance96),saved);
 if(process.env.HD_COMPASS_RESULTS)fs.writeFileSync(process.env.HD_COMPASS_RESULTS,JSON.stringify(rows));
 console.log(tone,rows.length,'single frames and the same number of mixed compass frames');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
