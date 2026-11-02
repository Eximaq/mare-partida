'use strict';
/* Native export art, ground bounds and independent interactive chest. */
((root)=>{
 const D=root.MareQuestDungeonData,T=D.tile,props=D.props;
 const terrain=(x,y)=>D.rows[Math.floor(y/T)]?.[Math.floor(x/T)]||'.';
 const ground=(x,y,r=0)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>'mn'.includes(terrain(x+dx,y+dy)));
 const colliders=props.map(p=>({id:p.id,...p.foot,blocksProjectiles:p.bounds.h>=96}));
 const chest={id:D.chest.id,x:D.chest.foot.x+D.chest.foot.w/2,y:D.chest.foot.y+D.chest.foot.h/2,radius:90,bounds:D.chest.bounds};
 const map={id:D.id,width:D.width,height:D.height,origin:{x:0,y:0},spawn:D.spawn,colliders,terrainWalkable:ground,navigationCell:16,visualCoverage:{rows:D.rows,tile:T,version:1},navigationGoals:[{id:'arena',...D.enemySpawn},{id:'chest-approach',x:chest.x,y:chest.y+56}],interactions:[chest]};
 let state='idle',image=null,promise=null;const sprites=new Map(),overlays=new Map();
 const load=url=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});
 function prepare(){if(promise)return promise;state='loading';promise=Promise.all([load('assets/quest-dungeons/map.png'),...Array.from(new Set(props.map(p=>p.url)),async url=>{sprites.set(url,await load(url));})]).then(([im])=>{image=im;if(!im||[...sprites.values()].some(s=>!s)){state='failed';return false;}
  for(const p of props){const b=p.bounds,c=document.createElement('canvas');c.width=b.w;c.height=b.h;const ctx=c.getContext('2d');ctx.drawImage(im,b.x,b.y,b.w,b.h,0,0,b.w,b.h);ctx.globalCompositeOperation='destination-in';ctx.drawImage(sprites.get(p.url),0,0,b.w,b.h);overlays.set(p.id,c);}state='ready';return true;
 }).catch(()=>{state='failed';return false;});return promise;}
 function drawGround(c,camera,w,h){prepare();if(state!=='ready')return;const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y)),sw=Math.min(w+2,D.width-x),sh=Math.min(h+2,D.height-y);if(sw>0&&sh>0)c.drawImage(image,x,y,sw,sh,x,y,sw,sh);}
 function prop(c,p,actors){const b=p.bounds,base=p.foot.y+p.foot.h;if(!actors.some(a=>a.y<base&&a.y>b.y&&a.x+48>b.x&&a.x-48<b.x+b.w))return;const im=overlays.get(p.id);if(im)c.drawImage(im,b.x,b.y);}
 root.MareQuestDungeonWorld={data:D,map,chest,props,ground:drawGround,prop,prepare,state:()=>state,stats:()=>({state,objects:overlays.size,images:sprites.size}),enemySpawn:D.enemySpawn};
})(globalThis);
