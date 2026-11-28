'use strict';
/* Marineford's native painting is shared by six hunts and the weekly arena.
 * Coordinates below follow the visible floor, in source-image pixels. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/marineford/naval-headquarters/scene-hd.png';
  const walkableAreas=[
    // Inner plaza: the sea walls, cannon towers and water remain outside.
    [[221,335],[528,335],[528,324],[919,324],[919,335],[1228,335],
      [1246,369],[1251,409],[1234,447],[1265,500],[1272,546],
      [1270,594],[1254,642],[1226,684],[1188,718],[1147,741],
      [1067,780],[1035,802],[934,820],[849,823],[840,846],
      [606,846],[599,823],[515,820],[412,802],[382,779],
      [303,740],[261,716],[223,681],[194,640],[178,594],
      [176,544],[182,500],[213,447],[199,410],[204,369]],
    // Southern quay, between its raised parapets.
    [[609,810],[837,810],[864,1086],[584,1086]],
    // Headquarters stair and the two side approaches behind the platform.
    [[528,337],[533,289],[609,282],[618,294],[633,292],[639,261],
      [805,261],[815,292],[830,294],[839,282],[915,289],[920,337]]
  ].map(polygon);
  const props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'marineford-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  // The execution deck is reached by its open central stair. Only rails and
  // support sections are solid; no whole-platform rectangle blocks the steps.
  prop('platform-back-rail',[[591,341],[597,312],[606,310],[609,321],
    [680,321],[681,312],[689,312],[691,321],[757,321],[758,312],
    [767,312],[768,321],[837,321],[839,310],[848,312],[855,341]],342,
    [[591,318,267,24]]);
  prop('platform-left',[[589,350],[599,338],[607,343],[608,351],
    [682,351],[682,342],[691,343],[692,382],[687,382],[687,415],
    [679,415],[679,384],[649,384],[649,413],[641,413],[641,383],
    [601,383],[601,413],[592,413]],418,[[591,369,95,49],[590,337,14,44]]);
  prop('platform-right',[[757,343],[766,342],[768,351],[838,351],
    [838,342],[848,338],[859,350],[856,414],[847,414],[847,383],
    [811,383],[811,413],[802,413],[802,383],[770,383],[770,416],[762,416]],418,
    [[762,369,96,49],[844,337,14,44]]);
  prop('northwest-supplies',[[156,327],[171,326],[174,317],[193,318],
    [198,326],[212,324],[218,339],[225,333],[228,346],[237,338],
    [241,359],[234,374],[211,373],[205,357],[178,359],[157,350]],375,
    [[159,345,48,16],[208,356,32,18]]);
  prop('northeast-supplies',[[1207,359],[1212,338],[1221,346],
    [1225,333],[1232,339],[1238,324],[1253,325],[1257,317],
    [1275,318],[1279,327],[1293,327],[1291,350],[1272,360],
    [1244,358],[1238,374],[1214,374]],375,
    [[1243,345,48,16],[1208,356,32,18]]);
  prop('northwest-cannon-tower',[[46,379],[60,363],[65,347],[80,350],
    [97,344],[124,343],[155,348],[175,360],[194,367],[207,392],
    [205,442],[194,465],[170,484],[130,500],[83,488],[48,467]],501,[[49,443,156,58]]);
  prop('northeast-cannon-tower',[[1242,389],[1253,369],[1274,360],
    [1297,348],[1329,342],[1360,349],[1379,349],[1388,365],
    [1402,381],[1402,465],[1364,490],[1320,500],[1280,484],[1253,464]],501,
    [[1244,443,156,58]]);
  prop('west-barrels',[[181,437],[195,435],[209,443],[215,458],[207,474],
    [180,475],[176,460]],476,[[180,458,34,18]]);
  prop('east-barrels',[[1238,438],[1253,436],[1270,444],[1275,461],
    [1267,474],[1239,475],[1233,460]],476,[[1237,458,35,18]]);
  prop('west-barricade',[[153,502],[158,483],[170,492],[182,476],
    [188,489],[199,480],[196,506],[179,523],[156,521]],524,[[155,507,40,17]]);
  prop('east-barricade',[[1250,481],[1261,490],[1269,477],[1281,490],
    [1292,481],[1296,504],[1291,520],[1268,522],[1253,508]],524,[[1253,507,40,17]]);
  prop('west-supply',[[145,545],[149,534],[158,531],[163,540],
    [172,538],[178,555],[177,569],[166,573],[169,582],[183,585],
    [187,598],[180,618],[163,628],[149,615],[151,583],[143,575]],628,
    [[147,549,30,20],[149,602,34,26]]);
  prop('east-supply',[[1272,548],[1279,536],[1288,531],[1294,540],
    [1300,539],[1307,558],[1305,575],[1296,582],[1298,610],
    [1283,628],[1266,619],[1261,600],[1267,584],[1280,581]],628,
    [[1274,550,31,20],[1264,602,34,26]]);
  prop('southwest-barricade',[[190,676],[193,644],[202,654],[208,641],
    [218,658],[224,649],[235,668],[242,664],[250,689],[248,704],
    [230,705],[209,691]],706,[[200,681,48,24]]);
  prop('southeast-barricade',[[1196,690],[1206,668],[1215,665],
    [1225,649],[1231,658],[1242,642],[1248,653],[1256,643],
    [1259,677],[1240,693],[1216,705],[1200,704]],706,[[1200,681,48,24]]);
  prop('southwest-cannon-tower',[[240,777],[247,758],[268,747],[296,737],
    [328,735],[362,742],[386,759],[399,785],[399,852],[389,895],
    [363,920],[324,931],[282,922],[253,902],[241,867]],932,[[242,848,157,84]]);
  prop('southeast-cannon-tower',[[1050,782],[1064,759],[1087,744],
    [1119,735],[1152,736],[1181,745],[1204,762],[1210,785],
    [1208,866],[1198,900],[1168,921],[1127,931],[1087,919],[1061,894],[1050,852]],932,
    [[1050,848,159,84]]);
  prop('southwest-sea-wall',[[397,793],[415,801],[461,809],[474,804],
    [495,810],[497,821],[574,826],[575,813],[584,811],[585,801],
    [592,796],[598,803],[599,814],[606,816],[601,850],[584,965],
    [597,981],[595,996],[541,997],[545,974],[559,925],[521,920],
    [486,917],[443,908],[398,894]],997,[[399,878,158,47],[541,975,54,22]]);
  prop('southeast-sea-wall',[[842,816],[849,813],[851,801],[858,796],
    [866,802],[868,813],[874,815],[874,826],[949,820],[952,810],
    [973,804],[984,810],[1032,801],[1051,793],[1050,893],[1004,909],
    [962,918],[925,922],[890,925],[901,974],[908,997],[854,997],
    [851,981],[865,966],[849,851]],997,[[891,878,159,47],[854,975,54,22]]);

  const spawn={x:1536,y:1824},weeklyBossSpawn={x:1536,y:1280};
  const huntReturnPoint={id:'return',x:1536,y:2112,radius:40};
  const districts=[['west-courtyard','Praça oeste',420,740],
    ['north-courtyard','Praça central',724,520],['east-courtyard','Praça leste',1028,740]]
    .map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const huntPoints=[[500,520],[724,520],[948,520],[420,740],[650,770],[1028,740]].map(point);
  const goals=[{id:'courtyard',...weeklyBossSpawn},
    ...[['west-plaza',400,540],['east-plaza',1048,540],['southern-quay',724,1015],
      ['execution-stair',724,402],['execution-deck',724,356],['headquarters-stair',724,284]]
      .map(([id,x,y])=>({id,...point([x,y])}))];
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
  // Weekly rooms have no portal or safe zone. The six hunt wrappers opt into
  // huntReturnPoint and their existing safe-zone radius independently.
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),spawn,weeklyBossSpawn,
    huntReturnPoint,huntPoints,interactions:[],safeZones:[],districts,goals,walkableAreas};
  root.MareMapExportData.marineford=source;
  root.MareMarinefordLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareMarinefordLayout;
})(globalThis);
