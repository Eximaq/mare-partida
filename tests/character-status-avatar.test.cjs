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
test('status uses the exact 2× HD avatar and preserves the saved equipment and shared draw',async()=>{
 const api=make();await api.ready;
 for(const look of [{gender:'masculino',skinColor:'ebony'},{gender:'feminino',skinColor:'light'}]){
  const who=A.commit({classId:'swordsman',equipment:{weapon:{def:0}}},look,()=>true),before=JSON.stringify(who);
  assert(await api.prepareStablePose(who,O));
  const bundle=await api.prepareConfiguration([{player:who,options:O}]);
  const surface=cv.createCanvas(272,248),inventory=cv.createCanvas(240,210),old=cv.createCanvas(240,210);let args=[],status;surface.dataset={};
  const env=vm.createContext({$:id=>id==='characterSprite'?surface:null,world:{hero:{visible:true},time:0},scene:'lobby',MareVisualCompletoRenderer:{equipped:()=>false},game:{...who,zoanTransformed:true},vfx_aura:{draw(){}},lobby96:{},
   drawWorldVisual(c,opt,avatar,{publish}){
    assert.equal(avatar.zoanTransformed,false);assert.deepEqual(avatar.appearance96,who.appearance96);
    assert.deepEqual(avatar.equipment,who.equipment);assert.equal(opt.avatarZoom,2);assert.equal(opt.avatarConsumer,'character-status');
    assert.equal(opt.action,'idle');assert.equal(opt.direction,'south');assert.equal(opt.inventoryPresentation,true);assert.equal(publish,false);
    const drawn=bundle.draw(c,avatar,opt);status=api.snapshot().last;return drawn;
   },
   drawPaperDoll(c,x,y,action,direction,time){args.push({scale:c.getTransform().a,action,direction,source:api.selectVisual(who,O)?.id});assert(api.draw(c,who,{...O,x,y,action,direction,time}));}});
  try{vm.runInContext(portrait+'\nlobby96.drawWorldPortrait=drawWorldPortrait;\n'+helpers+'\ndrawCharacterStatusPreview();',env);}
  finally{bundle.release();}
  assert.equal(env.game.zoanTransformed,true);
  assert.equal(surface.dataset.avatarRenderer,'native-hd');assert.equal(status.multiplier,2);assert(status.source);
  assert.equal(surface.getContext('2d').getTransform().a,1);
  env.game=who;env.inventory=inventory;vm.runInContext('drawCurrentPreview(inventory,185)',env);
  assert.equal(status.source,args[0].source);
  assert.equal(args[0].scale,1);assert.equal(args[0].action,'idle');assert.equal(args[0].direction,'south');
  const oldCtx=old.getContext('2d');assert(api.draw(oldCtx,who,{...O,x:120,y:200}));
  assert.deepEqual(inventory.toBuffer('image/png'),old.toBuffer('image/png'));
  const small=bounds(old),large=bounds(surface);
  assert(Math.abs(large.height-small.height*2)<=5,JSON.stringify({small,large}));
  assert(Math.abs(large.width-small.width*2)<=5,JSON.stringify({small,large}));
  assert(large.top>0&&large.bottom<247&&large.left>0&&large.right<271,JSON.stringify(large));
  assert.equal(JSON.stringify(who),before);
 }
});
