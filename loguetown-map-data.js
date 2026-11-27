'use strict';
/* Painted Loguetown. Source art is 1448 x 1086; the world uses
 * 4096 x 3072 units. Walking and silhouettes follow the source illustration. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=4096,height=3072,imageWidth=1448,imageHeight=1086,step=16;
  const scale=width/imageWidth,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scale),y:round(y*scale)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scale),y:round(y*scale),w:round(w*scale),h:round(h*scale)});
  const groundUrl='assets/loguetown/harbor-city/scene-hd.png';
  const paths=[
    // The central wooden pier continues directly into the avenue.
    [[647,866],[761,866],[774,943],[790,1055],[622,1055],[633,943]],
    [[615,800],[831,800],[845,813],[844,855],[800,868],[774,879],[641,879],[613,859]],
    [[682,367],[762,367],[776,425],[765,527],[767,582],[765,691],[771,785],
      [790,820],[649,820],[674,781],[676,637],[676,582],[678,540],[678,451],[663,406]],
    // Open execution square: the stage, fountain and tower keep solid feet.
    [[520,243],[596,243],[603,258],[840,258],[860,244],[931,244],[957,267],
      [976,328],[998,356],[964,383],[827,399],[781,421],[668,421],[649,398],
      [537,389],[509,371],[516,324]],
    // The clear transverse street joins both neighbourhoods.
    [[124,538],[280,538],[421,539],[583,538],[680,539],[770,538],[945,538],
      [1110,540],[1277,539],[1336,536],[1343,560],[1285,575],[1113,576],
      [946,575],[782,578],[673,579],[585,574],[422,573],[280,573],[143,573],[122,560]],
    // Road outside the closed garden, and the open Marine courtyard gate.
    [[958,344],[1275,342],[1302,348],[1318,368],[1280,385],[1210,386],
      [1116,379],[1024,379],[981,375]],
    [[1025,246],[1252,246],[1273,274],[1276,318],[1023,318]],
    [[1117,306],[1183,306],[1183,365],[1117,365]],
    // The east boulevard bends around the garden, never through its fence.
    [[1280,345],[1304,343],[1331,369],[1351,412],[1358,469],[1354,515],
      [1340,544],[1313,563],[1286,551],[1316,526],[1328,495],[1326,441],[1316,396],[1293,372]],
    // West coast road and its continuous southern promenade.
    [[228,145],[248,160],[212,198],[195,247],[180,314],[152,383],[122,441],
      [111,494],[130,530],[147,541],[134,562],[111,549],[89,519],[89,470],
      [105,420],[129,367],[153,310],[170,248],[185,193]],
    [[126,547],[151,566],[149,610],[145,652],[145,706],[158,749],[178,783],
      [211,798],[254,814],[245,837],[192,825],[158,797],[133,756],[113,708],
      [106,651],[108,606],[114,570]],
    [[241,812],[612,812],[628,829],[611,850],[426,852],[426,839],
      [324,839],[325,850],[261,849],[237,838]],
    // Market lanes remain on cobbles between the permanent shops and stalls.
    [[257,709],[405,709],[443,731],[581,734],[606,727],[622,739],[611,754],
      [592,754],[572,743],[527,749],[495,755],[437,755],[409,746],[384,749],
      [364,760],[345,751],[321,740],[280,738],[256,731]],
    [[338,732],[390,732],[397,818],[336,818]],
    [[608,725],[637,725],[637,823],[605,823]],
    // The eastern waterfront is a scenic branch from the transverse street.
    [[1312,543],[1337,548],[1360,581],[1364,625],[1352,678],[1342,722],
      [1321,781],[1288,816],[1244,840],[1197,853],[1195,831],[1238,817],
      [1269,793],[1293,756],[1309,705],[1323,657],[1330,613],[1323,577],[1306,564]],
    // Both side staircases and their wooden piers are reachable floor too.
    [[271,838],[301,838],[300,889],[291,917],[286,1007],[265,1007],
      [261,956],[266,916],[266,895],[276,872]],
    [[1136,830],[1215,824],[1241,832],[1214,853],[1135,869]],
    [[1148,846],[1184,846],[1187,886],[1192,915],[1200,963],[1206,1009],
      [1176,1012],[1166,967],[1159,924],[1146,900]]
  ];
  const walkableAreas=paths.map(polygon);
  const props=[];
  function prop(id,shape,base,feet,extra={}){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'loguetown-'+id,x:round(x*scale),y:round(y*scale),w:round(w*scale),h:round(h*scale),
      base:round(base*scale),polygon:polygon(shape),ground:footprints[0],feet:footprints,...extra});
  }
  // Each polygon clips pixels from this painting. No old object PNG is drawn.
  prop('execution-platform',[[598,195],[635,181],[676,180],[678,121],[767,121],
    [769,180],[805,180],[846,241],[836,254],[599,254]],254,[[601,237,235,17]]);
  prop('clock-tower',[[424,347],[425,205],[428,153],[433,135],[436,116],[447,96],
    [459,87],[470,87],[485,100],[491,123],[494,145],[500,155],[502,349],[491,359],[430,359]],
    359,[[431,337,66,22]]);
  prop('marine-headquarters',[[1017,206],[1017,140],[1036,116],[1047,91],[1074,104],
    [1112,99],[1114,69],[1134,54],[1144,55],[1173,81],[1173,109],[1200,94],
    [1223,109],[1225,75],[1240,61],[1257,76],[1263,111],[1306,121],
    [1324,148],[1320,228],[1278,244],[1225,244],[1212,251],[1140,251],[1130,243],[1024,233]],
    251,[[1025,222,105,20],[1130,238,97,13],[1227,223,82,20]]);
  prop('square-fountain',[[822,329],[833,313],[852,307],[861,286],[873,283],
    [875,267],[887,268],[891,285],[903,289],[909,310],[931,320],[946,339],
    [935,352],[907,361],[867,361],[837,349]],361,[[832,335,107,23]]);
  prop('custom-house',[[944,256],[946,220],[935,202],[950,191],[955,170],
    [970,157],[988,169],[989,222],[1002,232],[1002,285],[947,285]],285,[[949,265,47,20]]);
  prop('garden-enclosure',[[946,390],[961,388],[969,408],[1015,408],[1020,400],
    [1040,399],[1046,414],[1124,414],[1133,399],[1150,399],[1158,412],
    [1243,405],[1254,389],[1261,396],[1266,526],[1255,537],[943,537]],
    537,[[945,522,117,15],[1062,511,76,26],[1138,522,121,15]]);
  prop('marine-courtyard-wall-west',[[1004,292],[1016,286],[1022,317],[1099,317],
    [1107,294],[1117,294],[1119,350],[1008,347]],350,[[1009,333,108,17]]);
  prop('marine-courtyard-wall-east',[[1180,294],[1193,294],[1195,318],[1263,318],
    [1269,290],[1280,292],[1282,345],[1180,350]],350,[[1181,333,99,17]]);
  // Southward facades border the cross street, with their feet on the paving.
  prop('west-upper-block',[[139,505],[139,464],[134,443],[154,420],[178,416],
    [201,430],[208,466],[210,440],[243,419],[277,437],[278,464],[304,440],
    [337,424],[373,437],[409,429],[444,447],[446,469],[475,465],[494,484],
    [500,532],[140,532]],532,[[141,515,357,18]]);
  prop('west-upper-east-houses',[[506,523],[505,440],[525,419],[547,403],[569,414],
    [595,409],[613,427],[614,449],[620,446],[621,529],[508,533]],533,[[510,517,109,16]]);
  prop('east-upper-houses',[[818,527],[815,439],[814,410],[834,385],[858,392],
    [868,423],[896,434],[928,458],[940,478],[940,534],[820,534]],534,[[822,519,115,15]]);
  prop('east-garden-shops',[[1258,521],[1261,484],[1268,469],[1261,425],[1277,407],
    [1300,424],[1313,455],[1308,472],[1330,491],[1335,529],[1258,534]],534,[[1260,519,72,15]]);
  // These roofs overhang the transverse road. Repaint their silhouettes over
  // actors behind the houses while keeping collision at the front facades.
  prop('west-lower-house',[[155,691],[155,656],[163,626],[162,589],[180,567],
    [210,548],[243,574],[246,614],[256,637],[249,670],[252,706],[161,708]],
    708,[[161,694,89,14]]);
  prop('east-lower-west-block',[[837,754],[837,645],[842,601],[846,573],[871,550],
    [911,566],[941,568],[964,556],[1022,574],[1020,661],[1012,673],
    [1022,707],[1017,780],[845,790]],790,[[845,769,172,21]]);
  prop('east-lower-commercial-block',[[1015,722],[1014,641],[1033,616],[1102,616],
    [1129,574],[1162,551],[1204,582],[1200,632],[1224,651],[1225,742],
    [1207,757],[1030,756]],757,[[1030,743,177,14]]);
  prop('east-lower-coast-houses',[[1209,728],[1208,614],[1213,583],[1240,564],
    [1275,579],[1297,625],[1296,670],[1317,697],[1320,750],[1301,782],[1224,792]],
    792,[[1226,785,27,7],[1253,782,23,7],[1272,776,8,7]]);
  prop('market-armorer',[[252,685],[252,590],[289,567],[317,558],[346,570],
    [371,589],[369,697],[262,706]],706,[[259,688,111,18]]);
  prop('market-shops',[[371,691],[374,614],[392,592],[429,599],[466,583],
    [499,613],[499,669],[520,631],[550,613],[583,630],[607,652],[609,730],
    [582,739],[497,729],[440,714],[379,714]],739,[[379,699,66,15],[444,709,51,17],[500,724,103,15]]);
  prop('market-west-stall',[[251,768],[263,743],[306,741],[329,755],[330,803],
    [320,811],[251,807]],811,[[251,798,79,13]]);
  prop('market-east-stalls',[[402,783],[400,756],[436,747],[474,752],[498,744],
    [533,741],[556,750],[577,740],[607,751],[609,798],[594,809],
    [547,809],[525,817],[477,813],[440,819],[402,814]],819,[[404,801,91,17],[495,795,112,18]]);
  prop('harbor-office-west',[[330,860],[336,831],[350,818],[393,819],[414,836],
    [416,871],[333,872]],872,[[337,859,76,13]]);
  prop('harbor-houses-east',[[846,838],[846,799],[872,777],[901,782],[911,790],
    [935,783],[966,786],[976,802],[1012,792],[1043,807],[1044,867],[849,871]],
    871,[[851,856,190,15]]);
  // Trees, lamp posts and pier bollards have small, visible collision feet.
  function tree(id,x,y,w,h){
    prop(id,[[x+w*.48,y],[x+w*.73,y+3],[x+w*.84,y+h*.2],[x+w,y+h*.38],
      [x+w*.88,y+h*.61],[x+w*.61,y+h*.69],[x+w*.6,y+h],[x+w*.39,y+h],
      [x+w*.37,y+h*.7],[x+w*.12,y+h*.64],[x,y+h*.37],[x+w*.14,y+h*.17]],
      y+h,[[x+w*.35,y+h-7,w*.3,7]]);
  }
  for(const [id,x,y,w,h] of [
    ['avenue-west-north-tree',626,395,47,64],['avenue-east-north-tree',771,391,44,70],
    ['avenue-west-mid-tree',626,464,46,65],['avenue-east-mid-tree',774,466,45,64],
    ['avenue-west-south-tree',623,643,50,70],['avenue-east-south-tree',775,642,50,70],
    ['avenue-west-quay-tree',609,749,45,66],['avenue-east-quay-tree',790,748,44,66],
    ['market-lane-tree',363,761,28,44],['marine-court-tree',1235,250,40,65],
    ['square-east-tree',953,279,38,61]
  ])tree(id,x,y,w,h);
  function lamp(id,x,y,h){
    prop(id,[[x+4,y],[x+8,y],[x+9,y+7],[x+15,y+13],[x+13,y+21],
      [x+9,y+22],[x+9,y+h-5],[x+13,y+h],[x+1,y+h],[x+5,y+h-5],
      [x+5,y+22],[x,y+19],[x,y+12],[x+5,y+7]],y+h,[[x+2,y+h-5,11,5]]);
  }
  for(const [id,x,y,h] of [
    ['square-lamp-west',570,302,54],['square-lamp-east',902,247,57],
    ['avenue-lamp-west-north',658,424,44],['avenue-lamp-east-north',772,424,44],
    ['avenue-lamp-west-mid',659,490,52],['avenue-lamp-east-mid',772,493,49],
    ['avenue-lamp-west-south',658,694,57],['avenue-lamp-east-south',773,695,56],
    ['avenue-lamp-west-quay',641,765,50],['avenue-lamp-east-quay',792,765,50]
  ])lamp(id,x,y,h);
  for(const [id,x,y,w,h] of [
    ['pier-left-upper',626,889,17,57],['pier-right-upper',769,888,17,57],
    ['pier-left-middle',613,972,18,61],['pier-right-middle',786,973,18,62]
  ])prop(id,[[x+2,y],[x+w-2,y],[x+w,y+6],[x+w-3,y+h],[x+3,y+h],[x,y+7]],y+h,[[x+3,y+h-9,w-6,9]]);

  const spawn={x:2048,y:2736},returnPoint={id:'return',x:2048,y:2856,radius:48};
  const districts=[
    {id:'cais',name:'Cais de Loguetown',...point([724,838])},
    {id:'avenida',name:'Avenida do Mercado',...point([715,635])},
    {id:'praca',name:'Praça da Execução',...point([713,322])},
    {id:'jardins',name:'Alameda dos Jardins',...point([1160,366])}
  ].map(p=>({...p,min:40,max:40,roles:['marinheiro']}));
  const slots=Object.fromEntries([
    ['cais-0',646,839],['cais-1',823,839],
    ['avenida-0',715,700],['avenida-1',715,555],
    ['praca-0',620,330],['praca-1',790,330],
    ['jardins-0',1138,366],['jardins-1',1288,551]
  ].map(([id,x,y])=>['loguetown-'+id,point([x,y])]));
  const goals=[
    {id:'porto',...point([724,881])},
    {id:'mercado',...point([357,739])},
    {id:'plataforma',...point([720,269])},
    {id:'torre',...point([530,370])},
    {id:'quartel',...point([1165,280])},
    {id:'jardim',...point([1125,556])},
    {id:'pier-oeste',...point([275,985])},
    {id:'pier-leste',...point([1187,985])}
  ];
  function inside(x,y,shape){
    let result=false;
    for(let i=0,j=shape.length-1;i<shape.length;j=i++){
      const a=shape[i],b=shape[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;
    }return result;
  }
  const feet=props.flatMap(p=>p.feet);
  const solid=(x,y)=>feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const onPaving=(x,y)=>walkableAreas.some(p=>inside(x,y,p))&&!solid(x,y);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onPaving(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas};
  root.MareMapExportData.loguetown=source;
  root.MareLoguetownLayout={version:2,width,height,imageWidth,imageHeight,scale,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareLoguetownLayout;
})(globalThis);
