'use strict';
/* Original PixelLab Impel Down, native 64px tiles; floor is never a foreground overlay. */
((root)=>{
 const tileSize=64,rows=["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.","aaaaaaalllllllllllllllllllllaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbccbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbcbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbcbbccbbcbbaaaaa.","aaaaaaabbcbbbccbbbbbbcbbbcbbaaaaa.","aaaaaaabccbbbbbbbbbbbbbbbbbbaaaaa.","aaaaaaabbbbbbbbbbbbbbbbbbbbbaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],sourceOrigin={x:-1,y:-3};
 const terrain=(x,y)=>rows[Math.floor(y/tileSize)]?.[Math.floor(x/tileSize)]||'.';
 const terrainWalkable=(x,y,r=10)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>terrain(x+dx,y+dy)==='b');
 const colliders=[
  {id:'impel-top-cells',x:448,y:244,w:1344,h:216},
  {id:'impel-west-wall',x:440,y:244,w:16,h:800},
  {id:'impel-east-wall',x:1784,y:244,w:16,h:800},
  {id:'impel-south-wall',x:440,y:1024,w:1360,h:20}
 ].map(c=>({...c,isSolid:true,blocksMovement:true,blocksProjectiles:true}));
 const spawn={x:480,y:736},enemySpawn={x:1744,y:736};
 const map={id:'impel-down',width:2176,height:1344,origin:{x:0,y:0},spawn,enemySpawn,colliders,terrainWalkable,playerFootprint:{w:32,h:20},navigationCell:32,navigationGoals:[enemySpawn],interactions:[],safeZones:[],spawnZones:[]};
 const image=typeof Image==='function'?new Image():null;if(image)image.src='assets/impel-down/map.png';
 function ground(ctx,camera,width,height){ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#181720';ctx.fillRect(camera.x,camera.y,width,height);if(image?.complete&&image.naturalWidth){const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),w=Math.min(width+2,map.width-x),h=Math.min(height+2,map.height-y);if(w>0&&h>0)ctx.drawImage(image,x,y,w,h,x,y,w,h);}ctx.restore();}
 const api={map,terrain,rows,tileSize,sourceOrigin,enemySpawn,image,ground};root.MareImpel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
