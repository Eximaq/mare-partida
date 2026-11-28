'use strict';
/* Shells Town: source pixels define floor, solid bases and depth silhouettes.
 * Original PixelLab exports remain intact; saved area swamp still maps to conchas. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/conchas-marine/shells-town/scene-hd.png';
  // The yard joins the open gate, main street, waterfront and timber pier.
  // Water, quay faces and the land beyond the perimeter wall are not floor.
  const walkableAreas=[
    [[103,317],[555,317],[596,337],[851,337],[887,318],[1340,317],
      [1364,460],[1383,605],[1318,623],[1307,650],[1307,686],
      [812,686],[812,797],[859,831],[859,940],[816,962],
      [816,1072],[632,1072],[632,962],[575,940],[575,832],
      [632,797],[632,686],[141,686],[139,648],[111,626],
      [65,618],[81,458]],
    [[16,934],[1432,934],[1432,964],[16,964]]
  ].map(polygon);
  const waterAreas=[],solidAreas=[],props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'conchas-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('marine-headquarters',[[134,151],[259,150],[274,80],[328,58],
    [374,75],[396,145],[432,145],[448,52],[489,32],[536,33],
    [556,47],[577,130],[606,15],[627,0],[820,0],[842,16],
    [870,131],[888,53],[926,31],[971,34],[1000,49],[1018,146],
    [1039,85],[1080,59],[1128,66],[1153,146],[1287,152],
    [1311,197],[1305,276],[1229,284],[1157,301],[1000,306],
    [887,304],[887,323],[850,323],[850,336],[594,336],
    [594,323],[558,323],[558,308],[410,307],[327,304],
    [224,292],[135,287]],323,
    [[136,270,90,27],[225,282,184,27],[410,287,148,25],
      [559,299,326,24],[886,288,117,24],[1003,284,152,26],[1156,271,149,31]]);
  // Cross, rope, Zoro and boots are one painted landmark with a small solid base.
  prop('zoro-cross',[[712,360],[723,355],[736,360],[736,407],
    [794,409],[795,425],[780,426],[778,439],[771,440],
    [769,430],[753,426],[741,441],[739,459],[742,482],
    [744,507],[751,518],[752,524],[739,525],[730,517],
    [723,486],[717,515],[709,524],[696,524],[698,516],
    [704,504],[705,478],[709,453],[707,441],[693,429],
    [682,427],[680,439],[671,441],[668,434],[670,427],
    [652,426],[652,411],[712,407]],525,[[699,510,49,16]]);
  prop('west-wall',[[99,92],[126,101],[104,270],[76,471],
    [48,617],[10,664],[0,627],[25,492],[54,278]],650,
    [[25,490,24,115],[48,360,24,130],[68,234,24,126],[91,114,24,120]]);
  prop('east-wall',[[1324,96],[1350,91],[1391,294],[1423,484],
    [1448,647],[1419,675],[1394,614],[1370,462],[1348,273]],650,
    [[1346,118,23,120],[1365,237,23,120],[1384,356,23,128],[1406,484,23,125]]);
  prop('west-gate-wall',[[106,696],[248,697],[249,690],[276,690],
    [277,700],[519,699],[519,669],[561,669],[563,818],
    [520,818],[518,777],[113,777]],818,[[110,752,410,28],[520,791,43,28]]);
  prop('east-gate-wall',[[887,669],[925,669],[933,699],[1146,699],
    [1146,691],[1173,691],[1174,699],[1326,697],[1329,776],
    [930,777],[930,819],[887,819]],819,[[929,752,400,28],[887,793,43,27]]);
  prop('west-open-door',[[560,708],[629,670],[633,674],[632,781],
    [561,818]],818,[[560,802,22,16],[582,791,25,15],[607,777,26,16]]);
  prop('east-open-door',[[810,671],[815,670],[886,709],[886,818],
    [811,780]],818,[[811,778,24,15],[835,791,25,15],[860,803,27,15]]);
  prop('west-cannon-tower',[[23,638],[40,624],[63,622],[72,613],
    [94,604],[102,614],[103,629],[122,638],[138,658],[138,705],
    [122,730],[124,759],[29,760],[21,731],[14,701],[14,658]],760,
    [[23,709,109,49]]);
  prop('east-cannon-tower',[[1307,654],[1317,638],[1347,625],
    [1349,615],[1362,605],[1386,615],[1402,630],[1423,641],
    [1432,662],[1428,705],[1420,731],[1420,759],[1324,759],
    [1324,732],[1310,716]],760,[[1319,710,109,48]]);
  for(const [id,x,y,w,h]of [
    ['west-yard-crates',62,550,68,53],['east-yard-crates',1309,543,84,65],
    ['west-hq-crates',127,254,54,51],['west-hq-barrels',332,260,103,59],
    ['east-hq-barrels',999,274,95,47],['east-hq-crates',1155,258,56,52]
  ])prop(id,[[x+4,y],[x+w-5,y],[x+w,y+h-5],[x+w-5,y+h],[x,y+h],[x,y+10]],y+h,
    [[x+2,y+h-16,w-4,16]]);
  // Town frontages remain scenery; the broad waterfront walk stays continuous.
  for(const [id,x,y,w,h]of [
    ['town-west-red',0,785,116,145],['town-west-teal',132,795,141,136],
    ['town-west-middle',281,785,157,147],['town-west-gate',440,805,129,127],
    ['town-east-gate',897,801,157,131],['town-east-teal',1045,783,118,150],
    ['town-east-middle',1165,805,139,128],['town-east-red',1288,790,132,142]
  ])prop(id,[[x,y+35],[x+16,y+5],[x+w-19,y],[x+w,y+40],
    [x+w-10,y+h],[x+5,y+h]],y+h,[[x+6,y+h-20,w-16,20]]);
  for(const [id,x,y,w,h]of [
    ['pier-west-back',596,931,32,78],['pier-east-back',818,931,30,79],
    ['pier-west-front',583,992,32,94],['pier-east-front',830,992,31,94]
  ])prop(id,[[x+4,y],[x+w-4,y],[x+w,y+8],[x+w-3,y+h],
    [x+3,y+h],[x,y+8]],y+h,[[x+3,y+h-14,w-6,14]]);

  const spawn={x:1536,y:1968},returnPoint={id:'return',x:1536,y:2112,radius:48};
  const districts=[
    ['areia-sul','Entrada da Marinha',724,858],
    ['caminho-central','Pátio Sul',724,628],
    ['ruas-do-porto','Pátio Oeste',397,473],
    ['praca-das-conchas','Praça de Zoro',1047,464]
  ].map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const slots=Object.fromEntries([
    ['areia-sul-0',659,865],['areia-sul-1',794,867],
    ['caminho-central-0',581,609],['caminho-central-1',874,610],
    ['ruas-do-porto-0',323,430],['ruas-do-porto-1',464,513],
    ['praca-das-conchas-0',976,420],['praca-das-conchas-1',1139,518]
  ].map(([id,x,y])=>['swamp-'+id,point([x,y])]));
  const goals=[
    ['headquarters-steps',724,356],['zoro-behind',724,489],['zoro-front',724,553],
    ['zoro-west',656,516],['zoro-east',791,516],['open-gate',724,744],
    ['west-waterfront',194,947],['east-waterfront',1246,947],['pier-approach',724,977]
  ].map(([id,x,y])=>({id,...point([x,y])}));
  function inside(x,y,shape){
    let result=false;
    for(let i=0,j=shape.length-1;i<shape.length;j=i++){
      const a=shape[i],b=shape[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;
    }return result;
  }
  const feet=props.flatMap(p=>p.feet);
  const onFloor=(x,y)=>walkableAreas.some(p=>inside(x,y,p))&&
    !feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas,waterAreas,solidAreas};
  root.MareMapExportData.conchas=source;
  root.MareConchasMarineLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,solidAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareConchasMarineLayout;
})(globalThis);
