'use strict';
/* Gaimon's wild island: native 1447 x 1087 painting, 3072 x 2304 world.
 * The source PNG stays intact; each axis uses its actual native dimension. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1447,imageHeight=1087,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/rare-animals/gaimon-island/scene-hd.png';
  // Visible forest paths, open grass glades, dry cove and the timber landing.
  // Dense outer woodland, coastal cliff faces and the ocean are not floor.
  const walkableAreas=[
    [[341,277],[376,229],[415,200],[478,166],[538,139],[588,127],
      [650,112],[745,104],[820,122],[865,148],[930,155],[994,150],
      [1063,152],[1131,182],[1228,219],[1320,274],[1272,318],
      [1209,359],[1265,386],[1312,426],[1332,486],[1353,519],
      [1345,565],[1306,594],[1261,612],[1215,642],[1181,670],
      [1103,669],[1062,704],[1018,762],[998,805],[968,831],
      [1010,847],[1100,875],[1080,910],[1027,928],[980,948],
      [922,977],[851,995],[784,1007],[648,996],[578,975],
      [514,955],[457,925],[410,891],[392,868],[460,862],
      [493,829],[471,781],[401,747],[372,705],[354,680],
      [319,649],[286,628],[187,620],[138,582],[148,520],
      [175,456],[211,419],[275,394],[353,391],[410,392],
      [439,370],[436,343],[382,320],[348,300]],
    [[655,904],[757,904],[766,1057],[648,1057]]
  ].map(polygon);
  // The five empty chests are scenery on an inaccessible summit. Blocking
  // the whole projected rock prevents clicks on its grass from climbing it.
  const treasureRock=[[529,180],[535,151],[557,132],[581,119],
    [610,94],[652,84],[704,77],[756,83],[811,97],[847,119],
    [866,156],[875,203],[881,273],[883,345],[891,417],
    [878,467],[843,500],[805,518],[746,535],[689,530],
    [654,511],[614,500],[575,477],[548,447],[524,409],
    [509,363],[503,321],[510,277],[520,229]];
  const waterAreas=[],solidAreas=[polygon(treasureRock)],props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'rare-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('treasure-rock',treasureRock,535,[[572,454,98,47],[650,486,188,43],[830,450,44,43]]);
  prop('ancient-tree',[[1003,38],[1030,16],[1061,0],[1447,0],
    [1447,237],[1417,254],[1404,276],[1383,271],[1392,298],
    [1378,314],[1356,302],[1341,307],[1327,297],[1316,317],
    [1298,309],[1284,320],[1268,306],[1243,310],[1230,297],
    [1204,306],[1195,291],[1170,300],[1151,283],[1172,274],
    [1202,265],[1219,245],[1230,225],[1236,188],[1215,167],
    [1183,155],[1153,151],[1128,132],[1092,132],[1071,115],
    [1047,116],[1035,97],[1008,92],[1000,66]],320,
    [[1238,251,98,61],[1174,279,68,24],[1334,270,61,39]]);
  prop('south-palm',[[811,591],[828,571],[847,568],[861,548],
    [873,553],[877,577],[896,574],[916,583],[928,604],
    [923,624],[910,608],[894,604],[882,597],[881,622],
    [881,658],[888,690],[902,711],[885,715],[867,709],
    [873,691],[868,660],[866,628],[867,601],[849,615],
    [834,636],[834,609],[842,590],[825,592],[811,610]],715,[[867,691,29,22]]);
  prop('west-glade-palm',[[377,469],[391,448],[412,445],
    [431,429],[443,438],[450,453],[471,448],[491,462],
    [500,488],[483,478],[461,471],[451,466],[447,501],
    [445,533],[444,565],[457,587],[440,597],[422,590],
    [432,571],[433,534],[431,495],[434,468],[414,477],
    [398,502],[397,474],[409,461],[389,470],[378,490]],597,[[424,574,29,20]]);
  prop('east-trail-palm',[[927,423],[944,404],[966,407],
    [982,392],[995,400],[1000,416],[1021,415],[1043,434],
    [1048,465],[1031,447],[1003,433],[992,436],[988,470],
    [980,509],[979,537],[990,557],[974,565],[959,556],
    [969,538],[970,510],[977,471],[981,438],[957,447],
    [944,468],[947,442],[929,448],[917,455]],565,[[961,542,31,21]]);
  prop('cove-palm',[[411,745],[426,717],[448,715],[460,701],
    [476,709],[483,724],[503,725],[526,746],[531,770],
    [513,757],[492,745],[478,743],[469,773],[460,807],
    [458,827],[468,841],[449,849],[433,839],[448,823],
    [450,796],[461,753],[467,741],[444,749],[428,775],
    [429,751],[412,768]],849,[[438,827,29,19]]);
  prop('cove-broadleaf',[[924,681],[942,658],[963,659],[979,640],
    [1005,643],[1025,631],[1050,644],[1072,642],[1097,659],
    [1110,687],[1101,712],[1075,728],[1046,725],[1026,742],
    [1019,759],[1017,774],[1031,789],[1016,798],[1001,787],
    [982,795],[973,782],[990,766],[988,743],[969,733],
    [950,738],[935,722],[919,706]],798,[[981,768,45,26]]);
  prop('west-path-tree',[[244,259],[251,237],[270,231],
    [279,215],[302,218],[316,205],[339,218],[349,242],
    [364,257],[355,277],[334,290],[314,280],[301,303],
    [294,329],[303,345],[286,350],[273,343],[283,323],
    [286,299],[285,280],[266,286],[251,278]],350,[[277,332,27,17]]);
  prop('north-palm',[[865,55],[878,32],[904,28],[918,10],
    [935,17],[941,41],[959,41],[978,56],[985,78],
    [965,71],[944,59],[931,57],[920,86],[912,117],
    [911,143],[920,157],[900,165],[886,156],[899,139],
    [902,114],[912,82],[921,58],[897,71],[881,89],[884,66],
    [863,80]],165,[[893,147,29,16]]);
  prop('east-glade-palm',[[1267,382],[1280,363],[1304,360],
    [1321,346],[1334,357],[1338,374],[1360,378],[1380,397],
    [1380,422],[1363,404],[1340,394],[1332,397],[1341,432],
    [1352,472],[1358,499],[1372,516],[1354,525],[1338,516],
    [1344,497],[1337,470],[1326,435],[1322,399],[1304,410],
    [1291,433],[1292,405],[1275,413],[1260,417]],525,[[1341,506,30,17]]);
  prop('west-glade-log',[[132,595],[147,590],[169,595],[201,600],
    [225,604],[250,603],[271,614],[267,626],[248,640],
    [222,631],[187,626],[155,618],[140,614]],640,[[145,611,117,23]]);
  prop('west-path-rock',[[345,620],[352,607],[376,601],[393,607],
    [407,620],[398,634],[371,640],[350,635]],640,[[350,620,52,17]]);
  prop('east-path-rock',[[981,572],[994,554],[1016,547],
    [1043,553],[1057,573],[1050,591],[1019,599],[990,590]],599,[[987,577,65,19]]);
  prop('entry-rock',[[478,690],[488,681],[510,677],[529,687],
    [537,700],[521,707],[493,705]],707,[[486,693,44,12]]);
  prop('cove-west-rock',[[342,819],[352,798],[373,784],[393,786],
    [404,811],[399,842],[376,858],[353,847]],858,[[351,832,46,22]]);
  for(const [id,x,y,w,h]of [
    ['pier-west-top',648,893,21,49],['pier-east-top',747,892,22,50],
    ['pier-west-middle',643,949,22,56],['pier-east-middle',753,948,23,56],
    ['pier-west-front',639,1013,24,65],['pier-east-front',755,1013,25,65]
  ])prop(id,[[x+3,y],[x+w-3,y],[x+w,y+6],[x+w-2,y+h],[x+2,y+h],[x,y+7]],y+h,[[x+3,y+h-12,w-6,11]]);

  const spawn={x:1504,y:1952},returnPoint={id:'return',x:1504,y:2112,radius:48};
  const districts=[
    {id:'entrada',name:'Cais de Madeira',...point([712,785])},
    {id:'subbosque',name:'Bosque dos Cocox',...point([300,490])},
    {id:'mata-fechada',name:'Mata Fechada',...point([1143,500])},
    {id:'copa-antiga',name:'Copa Antiga',...point([1045,230])}
  ];
  const slots=Object.fromEntries([
    ['entrada-0',667,742],['entrada-1',764,814],
    ['subbosque-0',236,463],['subbosque-1',350,542],
    ['mata-fechada-0',1131,463],['mata-fechada-1',1207,564],
    ['copa-antiga-0',1018,214],['copa-antiga-1',1102,288]
  ].map(([id,x,y])=>['rare-'+id,point([x,y])]));
  const goals=[
    ['cove-approach',709,879],['entry-glade',716,690],
    ['treasure-rock-west',479,419],['treasure-rock-east',923,458],
    ['northwest-trail',480,186],['ancient-tree-approach',1159,219],
    ['east-glade-loop',1222,596],['south-palm-loop',880,730]
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
    !solidAreas.some(p=>inside(x,y,p))&&
    !feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas,waterAreas,solidAreas};
  root.MareMapExportData.rare=source;
  root.MareRareAnimalsLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,solidAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareRareAnimalsLayout;
})(globalThis);
