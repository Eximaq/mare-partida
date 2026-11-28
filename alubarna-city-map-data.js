'use strict';
/* Alubarna's royal square, stairs and southern arch share one HD painting.
 * Source-pixel polygons describe the visible floor; world units are separate. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/alubarna-city/royal-capital/scene-hd.png';
  const walkableAreas=[
    // Connected square and streets. The garden walls and buildings are outside.
    [[340,400],[450,397],[589,399],[615,389],[835,389],[861,398],
      [1106,397],[1135,362],[1169,322],[1206,310],[1242,356],
      [1205,389],[1190,426],[1215,461],[1230,493],[1220,536],
      [1207,575],[1205,627],[1170,675],[1172,714],[1203,754],
      [1242,787],[1268,815],[1270,834],[1142,843],[946,843],
      [946,791],[502,791],[502,843],[222,843],[196,829],
      [246,792],[265,761],[257,735],[226,710],[215,688],
      [220,650],[207,616],[190,585],[186,538],[199,488],
      [226,441],[269,407],[285,389],[270,361],[239,319],
      [222,286],[217,252],[239,224],[274,205],[291,211],
      [281,245],[278,272],[297,309],[321,348],[340,379]],
    // Palace stair treads and landing, strictly inside both balustrades.
    [[624,284],[810,284],[831,384],[831,409],[610,409],[611,384]],
    // Eastern street climbs the broad diagonal staircase to its landing.
    [[1107,402],[1137,292],[1189,149],[1258,149],
      [1211,297],[1176,404]],
    [[1185,151],[1194,132],[1233,125],[1282,114],[1281,142],
      [1257,169],[1190,171]],
    // Continuous corridor under the arch. Its stone face is an occlusion mask.
    [[681,719],[772,719],[772,947],[677,947]],
    // Stone approach outside the southern city wall; surrounding sand is closed.
    [[583,932],[858,932],[915,1073],[530,1073]]
  ].map(polygon);
  const props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'alubarna-city-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('south-arch',[[621,776],[643,757],[801,757],[824,778],
    [826,932],[775,933],[775,865],[771,850],[759,836],[740,824],
    [724,815],[707,824],[691,838],[680,855],[675,874],[675,934],[622,934]],935,
    [[626,828,49,106],[775,828,49,106]]);
  prop('south-west-gate-tower',[[550,742],[557,724],[576,713],
    [585,699],[593,714],[611,724],[623,745],[621,934],[558,940],[551,923]],941,
    [[554,842,69,98]]);
  prop('south-east-gate-tower',[[826,742],[836,725],[851,713],
    [858,699],[866,714],[883,725],[895,744],[893,924],[883,939],
    [825,934]],940,[[825,841,69,98]]);
  prop('west-gate-wing',[[501,790],[506,770],[517,766],[527,781],
    [550,781],[551,924],[532,941],[503,940]],942,[[502,860,50,82]]);
  prop('east-gate-wing',[[896,781],[922,780],[929,767],[938,770],
    [944,790],[943,941],[914,941],[894,924]],942,[[894,859,50,83]]);
  prop('south-west-wall',[[0,820],[36,825],[44,811],[59,816],
    [65,839],[107,848],[200,847],[207,834],[216,840],[223,853],
    [312,855],[319,839],[327,839],[334,859],[448,863],[460,844],
    [471,846],[476,877],[503,882],[503,969],[443,992],[0,983]],994,
    [[0,900,500,95]]);
  prop('south-east-wall',[[944,881],[972,875],[975,848],[988,841],
    [1000,862],[1111,857],[1120,839],[1129,838],[1135,855],
    [1228,853],[1238,838],[1247,838],[1254,851],[1350,846],
    [1380,836],[1386,813],[1400,808],[1410,826],[1448,821],
    [1448,982],[1007,993],[945,969]],995,[[945,900,503,95]]);
  prop('west-palace-garden',[[459,318],[477,313],[486,324],
    [514,321],[549,317],[573,321],[590,308],[608,318],[611,345],
    [602,388],[464,389]],390,[[462,344,145,45]]);
  prop('east-palace-garden',[[837,318],[849,308],[867,320],
    [899,318],[933,322],[956,315],[977,320],[982,345],
    [979,389],[843,389]],390,[[841,344,139,45]]);
  prop('west-palace-balustrade',[[609,286],[623,286],[617,317],
    [610,342],[610,398],[590,398],[590,376],[599,345]],399,[[590,368,20,31]]);
  prop('east-palace-balustrade',[[809,286],[824,286],[833,339],
    [846,366],[855,377],[855,398],[836,398],[836,345],[819,316]],399,
    [[836,369,20,30]]);
  prop('palace-west-tower',[[355,66],[368,52],[373,28],[378,20],
    [384,49],[398,62],[399,86],[389,105],[391,291],[407,303],
    [403,359],[346,359],[343,306],[354,291]],360,[[345,329,61,31]]);
  prop('palace-east-tower',[[1047,65],[1057,50],[1065,26],
    [1070,18],[1076,50],[1089,62],[1092,86],[1080,105],
    [1084,290],[1097,305],[1093,358],[1038,358],[1036,306],
    [1048,290]],359,[[1037,330,60,29]]);
  prop('clock-tower',[[1249,280],[1258,258],[1271,248],
    [1272,217],[1288,189],[1313,177],[1323,153],[1331,146],
    [1338,171],[1364,184],[1383,207],[1387,251],[1400,280],
    [1401,375],[1387,397],[1385,585],[1401,605],[1400,690],
    [1381,709],[1280,708],[1251,681],[1250,597],[1264,579],
    [1264,397],[1249,375]],710,[[1252,651,147,60]]);
  prop('clock-west-shop',[[1199,388],[1212,369],[1242,373],
    [1254,391],[1252,465],[1233,478],[1202,461]],479,
    [[1202,443,48,36]]);
  prop('west-market-front',[[75,511],[91,497],[109,502],[136,517],
    [166,519],[170,541],[162,554],[162,589],[177,596],[174,609],
    [135,612],[81,589]],613,[[81,562,94,49]]);
  prop('west-market-middle',[[122,425],[153,404],[177,410],
    [213,427],[207,450],[194,458],[197,476],[187,489],[158,491],
    [126,478]],492,[[128,460,70,32]]);
  prop('west-market-north',[[192,367],[214,348],[249,355],
    [264,370],[256,384],[265,410],[252,427],[215,431],[198,416]],432,
    [[205,402,59,30]]);
  prop('west-south-shop',[[128,740],[155,719],[174,725],
    [213,741],[232,755],[218,770],[215,803],[199,819],
    [160,820],[137,805]],821,[[137,790,79,31]]);
  prop('east-south-shop',[[1274,737],[1301,717],[1331,730],
    [1364,739],[1355,761],[1342,772],[1340,802],[1328,819],
    [1288,819],[1277,806]],820,[[1277,787,64,33]]);
  // Palm crowns only occlude; trunks and garden bases stop the feet.
  prop('west-inner-palms',[[313,797],[332,779],[351,777],[360,759],
    [375,755],[391,777],[416,786],[431,769],[448,757],[462,771],
    [482,785],[490,807],[471,812],[455,797],[447,851],[454,869],
    [434,877],[422,864],[424,803],[408,815],[390,809],[373,799],
    [372,858],[383,872],[365,879],[350,864],[352,806],[334,817]],880,
    [[350,858,30,23],[425,853,31,28]]);
  prop('east-inner-palms',[[961,796],[981,778],[998,774],
    [1008,758],[1022,762],[1040,781],[1060,793],[1077,775],
    [1092,761],[1106,769],[1114,782],[1135,798],[1138,813],
    [1119,811],[1105,798],[1104,855],[1111,871],[1094,879],
    [1080,863],[1082,809],[1063,817],[1048,810],[1024,799],
    [1026,856],[1036,871],[1018,879],[1003,866],[1005,806],
    [986,816],[970,811]],880,[[1003,855,32,25],[1081,855,31,25]]);

  const spawn={x:1536,y:1536},returnPoint={id:'return',x:1536,y:2112,radius:48};
  const districts=[
    ['entrada','Avenida Sul',724,655],['mercado','Mercado de Alubarna',330,535],
    ['praca','Praça Central',724,535],['bairro','Bairro das Torres',1090,585],
    ['palacio','Avenida do Palácio',724,425]
  ].map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const positions=[['entrada-0',652,653],['entrada-1',797,677],
    ['mercado-2',307,477],['mercado-3',390,587],
    ['praca-4',633,529],['praca-5',813,548],
    ['bairro-6',1067,524],['bairro-7',1117,630],
    ['palacio-8',650,430],['palacio-9',803,431]];
  const slots=Object.fromEntries(Array.from({length:5},(_,i)=>positions.map(([id,x,y])=>
    ['alubarna-0'+(i+1)+'-'+id,point([x,y])])).flat());
  const goals=[['palace-landing',724,295],['palace-stairs',724,340],
    ['northeast-stairs',1192,215],['northeast-landing',1230,150],
    ['west-street',252,286],['southeast-square',1090,735],
    ['gate-behind',724,798],['gate-opening',724,875],['bridge',724,1018]]
    .map(([id,x,y])=>({id,...point([x,y])}));
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
    districts,slots,goals,walkableAreas};
  root.MareMapExportData.alubarna=source;
  root.MareAlubarnaCityLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareAlubarnaCityLayout;
})(globalThis);
