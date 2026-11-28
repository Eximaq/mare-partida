'use strict';
/* Celestial island in 4K, authored 27/11/2026. Layout coordinates retain the
 * original 1536 x 1024 design grid; the detailed texture is 4096 x 2731. */
((root)=>{
 const scale=3,point=([x,y])=>({x:x*scale,y:y*scale});
 const polygon=points=>points.map(point);
 const groundUrl='assets/skypiea/celestial-island/scene-4k.webp';
 // Walking follows the inner cloud shore. The complete sky remains visible.
 const walkableAreas=[polygon([
  [670,172],[718,158],[817,158],[858,176],[940,210],[996,227],
  [1055,241],[1115,248],[1150,273],[1195,319],[1290,350],
  [1332,382],[1353,416],[1367,465],[1360,529],[1325,583],
  [1260,627],[1228,707],[1194,770],[1155,803],[1070,829],
  [998,844],[973,869],[885,887],[830,905],[714,910],[645,893],
  [600,869],[558,845],[490,824],[410,820],[333,819],[268,814],
  [218,800],[202,774],[217,724],[240,679],[263,644],[235,618],
  [194,583],[174,547],[171,491],[177,424],[196,387],[235,369],
  [291,368],[326,343],[342,303],[373,270],[413,250],[454,234],
  [494,217],[543,199],[601,195],[634,184]
 ]),polygon([[151,793],[270,785],[267,818],[204,846],[177,906],[132,906],[146,856]])];
 const props=[],colliders=[];
 function pillar(id,x,y,w,h){
  const outline=[[x+w*.12,y],[x+w*.86,y],[x+w,y+h*.15],
   [x+w*.77,y+h*.25],[x+w*.77,y+h*.83],[x+w,y+h*.91],
   [x+w,y+h],[x,y+h],[x,y+h*.91],[x+w*.23,y+h*.83],
   [x+w*.23,y+h*.25],[x,y+h*.15]];
  props.push({id,x:x*scale,y:y*scale,w:w*scale,h:h*scale,
   base:(y+h)*scale,polygon:polygon(outline),cloud:false});
  colliders.push({id:id+'-base',x:(x+2)*scale,y:(y+h-10)*scale,
   w:(w-4)*scale,h:10*scale,isSolid:true,blocksMovement:true,blocksProjectiles:true});
 }
 // Small collision footprints leave room to walk behind the columns; their
 // original pixels are drawn again at the correct depth, without repainting.
 [
  ['north-west',398,143,28,58],['north-west-low',561,185,26,49],
  ['north-inner-west',625,143,33,61],['north-inner-east',879,141,28,61],
  ['north-east',904,168,28,55],['north-east-low',940,187,28,57],
  ['south-west-a',614,706,25,48],['south-west-b',636,708,25,49],
  ['south-inner-west',686,688,25,47],['south-inner-east',825,693,25,45],
  ['south-east-a',880,710,27,51],['south-east-b',913,716,27,47],
  ['south-border-west',538,813,25,54],['south-border-west-low',567,839,26,49],
  ['south-border-east',974,819,27,56],['west-entry',179,677,25,47]
 ].forEach(args=>pillar(...args));
 // Eight short round posts surround the return dais. Only their bottom six
 // source pixels collide, preserving the east opening and walkable platform.
 for(const [id,x,y,w,h] of [
  ['north-west',324,678,14,25],['north-east',373,678,15,25],
  ['west-upper',298,697,16,24],['east-upper',398,698,15,26],
  ['west-lower',296,724,16,24],['east-lower',399,724,15,25],
  ['south-west',322,746,16,24],['south-east',373,747,16,23]
 ]){
  props.push({id:'dais-'+id,x:x*scale,y:y*scale,w:w*scale,h:h*scale,base:(y+h)*scale,cloud:false,
   polygon:polygon([[x+2,y],[x+w-2,y],[x+w,y+3],[x+w,y+h-3],[x+w-2,y+h],[x+2,y+h],[x,y+h-3],[x,y+3]])});
  colliders.push({id:'dais-'+id+'-base',x:(x+1)*scale,y:(y+h-6)*scale,w:(w-2)*scale,h:6*scale,
   isSolid:true,blocksMovement:true,blocksProjectiles:true});
 }
 const arch=[
  ['arrival-left',[[129,784],[148,784],[148,844],[130,846]],{x:130,y:835,w:18,h:11}],
  ['arrival-right',[[215,783],[236,783],[235,849],[215,849]],{x:216,y:838,w:19,h:11}],
  ['arrival-crown',[[144,776],[155,766],[175,759],[194,763],[215,776],[213,790],[192,779],[175,776],[153,790]],null]
 ];
 for(const [id,shape,foot] of arch){
  const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  props.push({id,x:x*scale,y:y*scale,w:w*scale,h:h*scale,base:849*scale,polygon:polygon(shape),cloud:false});
  if(foot)colliders.push({id:id+'-base',x:foot.x*scale,y:foot.y*scale,w:foot.w*scale,h:foot.h*scale,isSolid:true,blocksMovement:true,blocksProjectiles:true});
 }
 const spawn=point([178,868]),returnPoint=point([356,730]);
 const routes=[
  {type:'satori',monster:'Satori',level:77,min:75,max:80,courts:[[480,620],[440,405],[768,478]]},
  {type:'shura',monster:'Shura',level:84,min:80,max:85,courts:[[480,620],[768,820],[1090,620]]},
  {type:'gendatsu',monster:'Gendatsu',level:88,min:85,max:90,courts:[[1110,460],[1100,640],[1050,300]]},
  {type:'ohm',monster:'Ohm',level:95,min:90,max:95,courts:[[768,220],[550,270],[980,295]]}
 ];
 const sectorNames=[['Jardins Celestes','Pátio das Nuvens','Praça dos Anjos'],
  ['Jardins Celestes','Pátio do Sul','Bosque das Nuvens'],
  ['Pátio do Leste','Bosque das Nuvens','Ruínas de Shandora'],
  ['Sino Dourado','Ruínas dos Anjos','Caminho de Shandora']];
 const specs=routes.map((route,index)=>{
  const id='skypiea-0'+(index+1),districts=route.courts.map((p,k)=>({id:'sky-'+k,name:sectorNames[index][k],...point(p)}));
  const slots=route.courts.flatMap(([x,y],k)=>[-1,1].map((side,j)=>({id:id+'-'+(k*2+j),sector:'sky-'+k,type:route.type,...point([x+side*38,y+10])})));
  return {id,name:'Ilha dos Anjos'+(index?' '+(index+1):''),min:route.min,max:route.max,
   type:route.type,monster:route.monster,level:route.level,spawn:{...spawn},returnPoint:{...returnPoint},districts,slots};
 });
 const data={version:'celestial-island-4k-gate-2026-11-27',width:4608,height:3072,tile:64,
  imageWidth:4096,imageHeight:2731,scale,groundUrl,walkableAreas,colliders,props,
  spawn,returnPoint,districts:specs[0].districts,slots:specs[0].slots,specs};
 root.MareSkypieaData=data;
 if(typeof module!=='undefined')module.exports=data;
})(globalThis);
