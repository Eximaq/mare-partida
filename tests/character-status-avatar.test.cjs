'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js');
const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const helpers=game.slice(game.indexOf('  function drawCharacterStatusPreview('),game.indexOf('  function invSymbol('));
const lobby=fs.readFileSync(path.join(__dirname,'../paper-doll-96-lobby.js'),'utf8');
const portraitStart=lobby.indexOf('    function drawWorldPortrait(');
const portrait=lobby.slice(portraitStart,lobby.indexOf('    function height(',portraitStart));
const O={action:'idle',direction:'south',consumer:'world',time:0,progress:0};
function bounds(canvas){
 const {width:w,height:h}=canvas,v=canvas.getContext('2d').getImageData(0,0,w,h).data;
 let left=w,right=-1,top=h,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(v[(y*w+x)*4+3]){
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 return {left,right,top,bottom,height:bottom-top+1,width:right-left+1};
}
test('status and inventory use the same exact 2× HD world portrait with saved equipment',async()=>{
 const api=make();await api.ready;
 for(const look of [{gender:'masculino',skinColor:'ebony'},{gender:'feminino',skinColor:'light'}]){
  const who=A.commit({classId:'swordsman',equipment:{weapon:{def:0}},zoanTransformed:true},look,()=>true),before=JSON.stringify(who);
  const base={...who,zoanTransformed:false};
  assert(await api.prepareStablePose(base,O));
  const bundle=await api.prepareConfiguration([{player:base,options:O}]);
  const surface=cv.createCanvas(272,248),inventory=cv.createCanvas(272,248),old=cv.createCanvas(272,248),renders=[];
  surface.dataset={};Object.assign(inventory,{dataset:{},clientWidth:272,clientHeight:248});
  const env=vm.createContext({$:id=>id==='characterSprite'?surface:null,world:{hero:{direction:'east'},time:0},inventory,
   MareVisualCompletoRenderer:{equipped:()=>false},game:who,lobby96:{},nativeHD:api,inventoryPreview:null,
   drawWorldVisual(c,opt,avatar,{publish}){
    assert.equal(avatar.zoanTransformed,false);assert.deepEqual(avatar.appearance96,who.appearance96);
    assert.deepEqual(avatar.equipment,who.equipment);assert.equal(opt.avatarZoom,2);
    assert.equal(opt.action,'idle');assert.equal(opt.direction,'south');assert.equal(opt.inventoryPresentation,true);assert.equal(publish,false);
    const drawn=bundle.draw(c,avatar,opt);renders.push(api.snapshot().last);return drawn;
   }});
  env.root=env;
  try{vm.runInContext(portrait+'\nlobby96.drawWorldPortrait=drawWorldPortrait;\n'+helpers+'\ndrawCharacterStatusPreview();drawInventoryAvatar(inventory);',env);}
  finally{bundle.release();}
  assert.equal(env.game.zoanTransformed,true);
  assert.deepEqual(renders.map(r=>r.consumer),['character-status','inventory']);
  assert(renders.every(r=>r.multiplier===2&&r.source===bundle.coverage[0].source));
  assert.equal(surface.dataset.avatarRenderer,'native-hd');
  assert.equal(inventory.dataset.avatarRenderer,'native-hd');
  assert.equal(surface.getContext('2d').getTransform().a,1);
  assert.deepEqual(inventory.toBuffer('image/png'),surface.toBuffer('image/png'));
  const oldCtx=old.getContext('2d');assert(api.draw(oldCtx,base,{...O,x:136,y:218}));
  const small=bounds(old),large=bounds(surface);
  assert(Math.abs(large.height-small.height*2)<=5,JSON.stringify({small,large}));
  assert(Math.abs(large.width-small.width*2)<=5,JSON.stringify({small,large}));
  assert(large.top>0&&large.bottom<247&&large.left>0&&large.right<271,JSON.stringify(large));
  assert.equal(JSON.stringify(who),before);
 }
});
