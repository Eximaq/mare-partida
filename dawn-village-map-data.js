'use strict';
/* Foosha / Vila Dawn: new native 1448 x 1086 painting; old images remain intact.
 * Geometry is authored against the source image, then mapped to world units. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/dawn-village/foosha/scene-hd.png';
  // Dry village, the winding woodland trails and the timber pier are floor.
  // The contour ends above cliff faces and surf, not at the edge of the PNG.
  const walkableAreas=[
    [[69,337],[116,297],[169,277],[202,281],[291,289],[357,292],
      [395,304],[433,295],[470,270],[505,263],[575,284],[643,292],
      [678,281],[724,281],[767,273],[808,279],[858,276],[925,278],
      [999,286],[1056,291],[1118,298],[1195,310],[1288,310],
      [1336,296],[1380,306],[1376,356],[1364,390],[1402,429],
      [1403,466],[1427,505],[1416,554],[1396,607],[1411,645],
      [1379,692],[1338,731],[1296,756],[1246,779],[1195,789],
      [1137,806],[1096,818],[1059,824],[1009,828],[966,841],
      [925,844],[877,849],[827,852],[786,843],[746,827],
      [681,821],[636,819],[597,814],[557,824],[517,832],
      [473,840],[436,840],[395,846],[347,845],[301,852],
      [271,865],[241,878],[201,895],[156,904],[134,893],
      [155,873],[178,852],[205,833],[224,821],[207,796],
      [181,779],[156,747],[162,717],[148,692],[131,664],
      [115,637],[90,614],[91,579],[74,555],[74,526],
      [80,489],[86,449],[77,418],[60,386]],
    [[63,345],[38,326],[45,299],[60,278],[73,252],[78,229],
      [101,209],[112,186],[99,159],[91,136],[108,117],
      [124,102],[126,89],[104,75],[89,71],[101,55],
      [124,63],[150,79],[157,102],[146,126],[132,146],
      [140,169],[154,190],[151,216],[135,243],[123,268],
      [115,298],[110,321]],
    [[563,124],[576,108],[600,120],[625,124],[653,124],
      [682,138],[697,154],[692,170],[667,188],[693,202],
      [721,222],[748,252],[768,281],[749,315],[673,317],
      [689,281],[693,259],[675,240],[651,227],[628,207],
      [613,193],[614,176],[624,161],[637,151],[623,149],
      [600,152],[584,149],[572,138]],
    [[1277,333],[1315,298],[1327,271],[1344,243],[1362,221],
      [1358,198],[1337,177],[1314,159],[1305,135],[1311,113],
      [1335,95],[1359,83],[1384,77],[1405,77],[1395,96],
      [1376,106],[1352,119],[1343,135],[1362,150],[1385,171],
      [1389,194],[1399,218],[1383,244],[1364,270],[1352,298],
      [1334,333]],
    [[660,794],[782,794],[803,1025],[642,1025]]
  ].map(polygon);
  const waterAreas=[],solidAreas=[],props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'dawn-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('west-windmill',[[177,78],[201,48],[271,117],[337,50],
    [367,80],[301,148],[379,215],[349,245],[319,217],[325,270],
    [337,281],[338,307],[328,313],[324,340],[284,350],[241,347],
    [204,335],[203,308],[186,298],[188,274],[201,268],[209,212],
    [199,226],[178,245],[151,217],[231,147]],350,
    [[201,302,126,43],[192,284,18,35],[322,288,17,35]]);
  prop('east-windmill',[[1113,83],[1140,58],[1201,122],[1266,73],
    [1291,103],[1233,153],[1297,214],[1276,246],[1255,224],
    [1267,281],[1298,294],[1295,323],[1276,333],[1268,354],
    [1237,368],[1189,363],[1160,348],[1157,321],[1133,309],
    [1133,284],[1150,278],[1157,225],[1120,249],[1091,221],
    [1173,151]],368,[[1154,319,119,43],[1136,294,20,30],[1274,302,21,29]]);
  prop('north-windmill',[[548,17],[557,5],[586,27],[608,1],
    [622,9],[601,39],[629,58],[620,71],[607,65],[610,117],
    [589,128],[568,125],[566,81],[552,85],[542,73],[572,43]],128,[[569,111,39,16]]);
  prop('partys-bar',[[146,397],[175,384],[175,357],[197,352],
    [210,358],[211,379],[348,365],[377,392],[408,446],
    [423,459],[421,487],[430,487],[430,532],[410,542],
    [396,550],[346,555],[304,555],[286,560],[270,559],
    [268,549],[246,556],[221,561],[201,558],[178,565],
    [141,563],[127,555],[97,550],[91,521],[93,479],[81,470]],565,
    [[95,501,305,53],[400,494,27,46],[137,549,112,14],[260,547,22,11]]);
  prop('north-green-house',[[450,250],[483,211],[575,201],
    [576,194],[592,190],[604,193],[604,212],[643,253],
    [650,269],[639,274],[640,314],[616,327],[554,332],
    [516,323],[487,315],[486,269]],332,[[488,304,149,23]]);
  prop('north-red-house',[[840,228],[869,193],[904,191],
    [904,174],[923,171],[930,176],[929,195],[991,194],
    [1017,236],[1023,248],[1005,254],[1003,304],[978,316],
    [941,324],[884,316],[852,308],[850,258],[835,252]],324,[[851,296,151,24]]);
  prop('market-green-house',[[941,400],[979,350],[1022,358],
    [1022,339],[1043,336],[1052,343],[1051,365],[1133,378],
    [1148,406],[1160,435],[1184,447],[1190,461],[1174,468],
    [1166,503],[1136,510],[1109,511],[1085,508],[1067,513],
    [1031,505],[1000,496],[977,483],[969,437],[937,422]],513,
    [[972,467,141,36],[1113,477,57,30],[1004,495,71,15]]);
  prop('east-cottage',[[1225,527],[1265,484],[1300,482],
    [1343,495],[1345,472],[1362,469],[1375,476],[1373,502],
    [1413,518],[1402,544],[1384,572],[1380,624],[1363,640],
    [1330,641],[1318,630],[1265,620],[1242,601],[1238,547]],642,
    [[1244,595,137,33],[1332,629,34,13]]);
  prop('village-tree',[[431,290],[438,280],[447,274],[456,264],
    [470,268],[479,262],[492,273],[497,287],[509,297],
    [505,309],[492,319],[482,316],[479,334],[479,346],
    [489,355],[478,363],[470,355],[460,362],[457,352],
    [467,342],[467,322],[456,326],[443,318],[431,313]],363,[[460,348,27,13]]);
  prop('market-tree',[[902,415],[911,402],[926,396],[937,394],
    [952,401],[967,405],[977,417],[975,434],[960,446],
    [949,447],[944,463],[945,478],[953,487],[944,491],
    [936,483],[928,487],[927,477],[934,464],[933,447],
    [917,447],[903,436],[898,425]],491,[[930,478,21,12]]);
  prop('east-lane-tree',[[1015,259],[1025,247],[1040,246],
    [1057,238],[1071,245],[1085,249],[1093,268],[1083,283],
    [1071,290],[1065,285],[1062,306],[1065,325],[1073,333],
    [1063,340],[1054,332],[1045,337],[1046,325],[1052,311],
    [1051,290],[1037,294],[1023,286],[1010,274]],340,[[1048,326,23,12]]);
  // Low fences and hay stacks have their own bases, leaving the road loops open.
  for(const [id,x,y,w,h]of [
    ['mill-west-fence',125,275,67,63],['mill-hay',325,282,95,58],
    ['north-garden',494,323,64,37],['north-red-fence',789,263,53,45],
    ['east-mill-fence',1280,329,48,41],['east-mill-crate',1130,341,31,27],
    ['bar-side-fence',421,496,46,44],['west-field-fence',59,559,164,77],
    ['market-side-fence',924,442,51,50],['east-cottage-fence',1141,573,94,50]
  ]){
    // The north garden fence stands on its bottom eight source pixels.
    // Keeping its raised rail out of the footprint also leaves nearby clicks reachable.
    const depth=id==='north-garden'?9:13;
    prop(id,[[x,y],[x+w,y+7],[x+w,y+h],[x,y+h-7]],y+h,[[x+2,y+h-depth,w-4,depth-1]]);
  }
  for(const [id,x,y,w,h]of [
    ['pier-west-back',641,774,24,60],['pier-east-back',779,773,23,63],
    ['pier-west-middle',632,840,25,72],['pier-east-middle',785,841,27,75],
    ['pier-west-front',622,954,27,73],['pier-east-front',798,956,29,78],
    ['pier-west-tip',620,1005,29,62],['pier-east-tip',801,1007,29,61]
  ])prop(id,[[x+4,y],[x+w-4,y],[x+w,y+8],[x+w-2,y+h],[x+2,y+h],[x,y+8]],y+h,[[x+3,y+h-12,w-6,11]]);

  const spawn={x:1536,y:1808},returnPoint={id:'return',x:1536,y:2112,radius:48};
  const districts=[
    ['cais','Cais de Dawn',724,716],['corsarios','Jardim do Bar',355,647],
    ['estaleiro','Praia dos Barqueiros',1080,680],['mercado','Praça de Foosha',807,530],
    ['ancoras','Rua dos Moinhos',724,400],['farol','Moinho do Leste',1316,413],
    ['caldeira','Trilha do Colubo',711,247]
  ].map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const slots=Object.fromEntries([
    ['cais-0',652,703],['cais-1',811,741],
    ['corsarios-0',308,641],['corsarios-1',440,680],
    ['estaleiro-0',1025,714],['estaleiro-1',1148,682],
    ['mercado-0',755,521],['mercado-1',869,566],
    ['ancoras-0',654,394],['ancoras-1',818,412],
    ['farol-0',1319,391],['farol-1',1290,446],
    ['caldeira-0',707,241],['caldeira-1',716,287],
    ['boss',713,252]
  ].map(([id,x,y])=>['beach-'+id,point([x,y])]));
  const goals=[
    ['partys-bar-door',313,581],['west-windmill-door',282,371],
    ['east-windmill-door',1225,392],['north-windmill',604,139],
    ['west-trail',116,155],['east-trail',1376,216],['northeast-trail',1359,103],
    ['village-tree-behind',473,326],['village-tree-front',473,377],
    ['pier-approach',724,780]
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
  root.MareMapExportData.dawn=source;
  root.MareDawnVillageLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,solidAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareDawnVillageLayout;
})(globalThis);
