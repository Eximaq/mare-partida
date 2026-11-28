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
test('inventory follows the equipped south world pose and foot anchor while status stays compact',async t=>{
 const api=make();await api.ready;
 for(const look of [{gender:'masculino',skinColor:'ebony'},{gender:'feminino',skinColor:'light'}]){
  const who=A.commit({classId:'swordsman',equipment:{weapon:{def:0}},zoanTransformed:true},look,()=>true),before=JSON.stringify(who);
  const base={...who,zoanTransformed:false};
  assert(await api.prepareStablePose(base,O));
  const bundle=await api.prepareConfiguration([{player:base,options:O}]);t.after(()=>bundle.release());
  const surface=cv.createCanvas(272,248),inventory=cv.createCanvas(272,280),old=cv.createCanvas(272,248),renders=[];
  surface.dataset={};Object.assign(inventory,{dataset:{},clientWidth:272,clientHeight:280});
  const env=vm.createContext({$:id=>id==='characterSprite'?surface:null,world:{hero:{direction:'east'},time:.375},inventory,
   MareVisualCompletoRenderer:{equipped:()=>false},game:who,lobby96:{},nativeHD:api,inventoryPreview:null,
   drawWorldVisual(c,opt,avatar,{publish}){
    assert.equal(avatar.zoanTransformed,false);assert.deepEqual(avatar.appearance96,who.appearance96);
    assert.deepEqual(avatar.equipment,who.equipment);assert.equal(opt.avatarZoom,2);
    assert.equal(opt.action,'idle');assert.equal(opt.direction,'south');assert.equal(opt.inventoryPresentation,true);assert.equal(publish,false);
    if(opt.consumer==='inventory'){assert.equal(opt.avatarWorldPose,true,'equipment preview keeps the map foot anchor');assert.equal(opt.time,.375,'equipment preview follows the map idle clock');assert.equal(opt.progress,null);}
    const drawn=bundle.draw(c,avatar,opt);renders.push(api.snapshot().last);return drawn;
   }});
  env.root=env;
  vm.runInContext(portrait+'\nlobby96.drawWorldPortrait=drawWorldPortrait;\n'+helpers+'\ndrawCharacterStatusPreview();drawInventoryAvatar(inventory);',env);
  assert.equal(env.game.zoanTransformed,true);
  assert.deepEqual(renders.map(r=>r.consumer),['character-status','inventory']);
  assert(renders.every(r=>r.multiplier===2&&r.source===bundle.coverage[0].source),JSON.stringify(renders));
  assert.equal(surface.dataset.avatarRenderer,'native-hd');
  assert.equal(inventory.dataset.avatarRenderer,'native-hd');
  assert.equal(surface.getContext('2d').getTransform().a,1);
  const expected=cv.createCanvas(272,280),ec=expected.getContext('2d');ec.translate(136,256);ec.scale(2,2);
  assert(bundle.draw(ec,base,{...O,time:.375,progress:null,x:0,y:0}));
  assert.deepEqual(inventory.getContext('2d').getImageData(0,0,272,280).data,expected.getContext('2d').getImageData(0,0,272,280).data,'inventory pixels match the independently positioned world renderer');
  const oldCtx=old.getContext('2d');assert(api.draw(oldCtx,base,{...O,x:136,y:218}));
  const small=bounds(old),large=bounds(surface);
  assert(Math.abs(large.height-small.height*2)<=5,JSON.stringify({small,large}));
  assert(Math.abs(large.width-small.width*2)<=5,JSON.stringify({small,large}));
  assert(large.top>0&&large.bottom<247&&large.left>0&&large.right<271,JSON.stringify(large));
  assert.equal(JSON.stringify(who),before);
 }
});

test('full-body cosmetic equipment uses its south world frame and foot anchor in inventory',async()=>{
 const atlas=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/skins/visual-completo/zoro/atlas.json'),'utf8'));
 // Decode the original PNG pixels in the test adapter; native canvas cannot
 // read the C2PA metadata embedded in these unmodified source sheets.
 class Image{
  constructor(){
   const c=cv.createCanvas(1,1);
   Object.defineProperty(c,'src',{set(file){
    const png=require('pngjs').PNG.sync.read(fs.readFileSync(path.join(__dirname,'..',file)));
    c.width=c.naturalWidth=png.width;c.height=c.naturalHeight=png.height;
    c.getContext('2d').putImageData(new cv.ImageData(new Uint8ClampedArray(png.data),png.width,png.height),0,0);
   }});
   c.decode=()=>Promise.resolve();return c;
  }
 }
 const box=vm.createContext({fetch:async()=>({ok:true,json:async()=>atlas}),Image,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../visual-completo-renderer.js'),'utf8'),box);
 const renderer=box.MareVisualCompletoRenderer;
 const who={classId:'sword',appearance96:{hairColor:'blue'},equipment:{visual_completo:{def:187},weapon:{def:0}}};
 const saved=JSON.stringify(who),actual=cv.createCanvas(272,280),expected=cv.createCanvas(272,280);
 let drawn=false;
 for(let i=0;i<6&&!drawn;i++){
  drawn=renderer.draw(actual.getContext('2d'),who,{action:'idle',direction:'south',time:.375,consumer:'inventory',
   inventoryPresentation:true,avatarWorldPose:true,avatarZoom:2,x:136,y:260,scale:256/46});
  if(!drawn)await new Promise(resolve=>setImmediate(resolve));
 }
 assert(drawn);
 assert(renderer.draw(expected.getContext('2d'),who,{action:'idle',direction:'south',time:.375,consumer:'world',x:136,y:256,scale:192/46}));
 assert.equal(Buffer.compare(Buffer.from(actual.getContext('2d').getImageData(0,0,272,280).data),Buffer.from(expected.getContext('2d').getImageData(0,0,272,280).data)),0,'skin uses world scale and foot pivot without clipping');
 assert.equal(JSON.stringify(who),saved);
});
