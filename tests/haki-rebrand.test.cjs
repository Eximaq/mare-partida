'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const gameRoot=path.join(__dirname,'..');
function read(name){return fs.readFileSync(path.join(gameRoot,name),'utf8');}
async function setup(){
  const load=[];
  const env=vm.createContext({
    fetch:async url=>({ok:true,json:async()=>JSON.parse(read(url))}),
    document:{createElement:()=>createCanvas(1,1)},
    Image:class{set src(url){load.push(loadImage(path.join(gameRoot,url)).then(image=>{Object.assign(this,{naturalWidth:image.width,naturalHeight:image.height,image});}));}}
  });
  vm.runInContext(read('haki-art.js'),env);
  vm.runInContext(read('world-system.js'),env);
  await Promise.all(load);
  return env;
}
const count=ctx=>ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height).data.filter((x,i)=>i%4===3&&x>0).length;
const map={width:1600,height:1300,colliders:[]};
const px=(ctx,x,y)=>ctx.getImageData(x,y,1,1).data[3];
test('approved atlases, directional mirroring and observation blind side',async()=>{
  const {MareHakiArt:A}=await setup(),canvas=createCanvas(400,400),ctx=canvas.getContext('2d');
  // Unwrap the Image fixture but otherwise draw actual packed RGBA with Canvas 2D.
  const vanilla=ctx.drawImage.bind(ctx);ctx.drawImage=(img,...args)=>vanilla(img.image||img,...args);
  assert.equal(Object.values(A.stats()).filter(v=>v.loaded).length,3);
  for(const direction of ['south','west','east','north']){
    ctx.clearRect(0,0,400,400);A.draw(ctx,{active:'armament'},{x:200,y:200,direction},.08,false);
    assert(count(ctx)>10,direction);
  }
  ctx.clearRect(0,0,400,400);A.draw(ctx,{active:'observation',eyeFX:.11},{x:200,y:200,direction:'south'},0,false);
  assert(count(ctx)>3);
  ctx.clearRect(0,0,400,400);A.draw(ctx,{active:'observation',eyeFX:.11},{x:200,y:200,direction:'north'},0,false);
  assert.equal(count(ctx),0);
  A.drawBack(ctx,{active:'observation',dodgeFX:.19},{x:200,y:200,direction:'north'},false,1,(c,x,y)=>{c.fillStyle='black';c.fillRect(x-15,y-80,30,80);});
  assert(count(ctx)>100,'confirmed dodge includes a back-layer ghost even facing north');
  const rt={active:'armament',kingFX:.3};assert.equal(A.presentation(rt,.6).kingFX,0);assert.equal(rt.kingFX,.3);
});
test('king VFX respects cast origin, radius, walls and walk-only blockers',async()=>{
  const {MareWorld:W,MareHakiArt:A}=await setup();
  const nav=new W.Navigation({...map,colliders:[{id:'wall',x:850,y:480,w:30,h:220,blocksProjectiles:true},{id:'counter',x:530,y:565,w:25,h:35,blocksProjectiles:false}]},24,10,{defer:true});
  const ctx=createCanvas(1600,1300).getContext('2d'),origin={x:700,y:600,radius:360};
  let solves=0;
  const solve=(a,b)=>{solves++;return nav.projectileClear(a,b);};
  A.drawKing(ctx,{kingOrigin:origin,kingFX:.42},nav,solve,false);
  assert(solves>0);
  assert(px(ctx,350,600)>0,'left can reach radius');
  assert(px(ctx,510,600)>0,'no clipping from movement-only counter');
  assert(px(ctx,995,600)===0,'behind wall');
  assert(px(ctx,1080,600)===0,'outside radius');
  assert(px(ctx,710,250)>0,'other sector reaches north');
  const n=solves;A.drawKing(ctx,{kingOrigin:{...origin},kingFX:.4},nav,solve,false);assert.equal(solves,n,'cast footprint cache');
  A.drawKing(ctx,{kingOrigin:{x:760,y:610,radius:360},kingFX:.42},nav,solve,true);assert(solves>n,'different cast starts a new footprint');
});
