'use strict';
/* Orange Town: source pixels define the port, connected streets and raised quarter.
 * The earlier PixelLab painting and saved area identifier orange remain intact. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/orange-town/port-town/scene-hd.png';
  // The upper street joins the lower square through the broad central stairs.
  // Park retaining walls, quay faces, boats and water are outside these contours.
  const walkableAreas=[
    [[16,400],[567,400],[568,267],[712,267],[714,254],[879,254],
      [898,283],[942,312],[1432,312],[1432,838],[16,838]],
    [[108,126],[161,129],[157,387],[245,391],[245,411],[108,411]],
    [[110,100],[426,100],[427,133],[645,133],[660,68],[680,56],
      [723,54],[725,2],[806,2],[841,54],[1014,55],[1081,15],
      [1110,15],[1100,64],[1054,90],[1019,123],[965,137],
      [910,144],[879,171],[722,179],[703,179],[695,199],
      [573,200],[563,168],[428,168],[428,190],[161,190],
      [155,228],[108,228]],
    [[729,159],[864,159],[864,284],[729,284]],
    [[600,833],[857,833],[880,986],[578,986]]
  ].map(polygon);
  const waterAreas=[],solidAreas=[],props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'orange-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('buggy-terrace',[[151,258],[156,210],[166,190],[169,167],
    [214,140],[266,152],[274,162],[289,164],[289,110],[359,112],
    [361,170],[413,170],[420,156],[517,151],[546,172],
    [564,226],[555,380],[538,390],[172,397],[158,385]],397,
    [[158,344,398,53]]);
  prop('pet-food',[[0,511],[56,467],[87,475],[105,487],
    [144,479],[193,513],[203,548],[211,591],[207,672],
    [194,702],[164,711],[87,719],[7,704],[0,678]],719,
    [[8,650,198,65]]);
  prop('west-red-house',[[65,424],[123,380],[174,397],
    [223,429],[221,469],[249,488],[245,521],[232,535],
    [209,544],[190,511],[145,492],[78,480]],544,
    [[82,488,126,49],[207,510,32,31]]);
  prop('west-middle-house',[[0,349],[24,332],[66,344],
    [96,381],[84,436],[91,470],[52,486],[0,479]],486,
    [[0,438,84,49]]);
  prop('west-north-house',[[0,123],[40,110],[98,156],
    [92,219],[116,238],[112,268],[98,301],[63,321],
    [63,347],[0,350]],350,[[0,306,65,44],[65,282,39,32]]);
  prop('central-houses',[[411,511],[442,469],[455,469],
    [455,454],[476,452],[480,468],[544,463],[571,503],
    [583,510],[612,483],[644,495],[686,549],[694,586],
    [705,627],[701,671],[664,679],[435,679],[416,666]],680,
    [[419,601,282,78]]);
  prop('central-west-barrel',[[398,630],[405,621],[422,623],
    [429,635],[426,659],[419,669],[402,666],[397,657]],669,
    [[397,650,28,18]]);
  prop('red-awning-shop',[[871,516],[881,478],[973,483],
    [974,463],[992,458],[1001,465],[1000,491],[1023,521],
    [1044,553],[1036,591],[1047,607],[1049,647],[1042,687],
    [886,687],[869,654],[869,579]],688,[[873,623,174,65]]);
  prop('north-warehouse',[[1123,322],[1208,280],[1265,271],
    [1394,318],[1410,349],[1393,438],[1365,447],[1142,443],
    [1136,354]],447,[[1141,397,252,47]]);
  prop('south-warehouse',[[1187,481],[1293,422],[1381,436],
    [1448,484],[1448,597],[1221,599],[1207,566],[1203,518]],600,
    [[1220,553,228,47]]);
  prop('southwest-house',[[0,706],[69,704],[81,740],
    [95,767],[91,820],[64,840],[0,840]],840,[[0,791,93,49]]);
  prop('southeast-houses',[[1265,711],[1294,671],[1371,671],
    [1390,642],[1448,641],[1448,816],[1277,817],[1269,775]],818,
    [[1276,757,172,61]]);
  prop('northwest-roofs',[[0,0],[83,0],[119,34],[108,97],
    [87,131],[59,137],[4,116],[0,99]],137,[[0,101,96,33]]);
  prop('north-orange-house',[[194,37],[211,8],[229,0],[399,0],
    [417,43],[407,98],[380,108],[212,111],[198,92]],112,
    [[207,85,200,26]]);
  prop('north-central-house',[[451,60],[494,13],[527,0],
    [554,0],[610,46],[614,98],[638,104],[636,151],
    [582,164],[472,147],[463,124]],164,[[470,121,166,36]]);
  prop('north-green-house',[[839,44],[865,0],[950,0],
    [985,46],[978,89],[988,104],[965,118],[868,121],
    [851,102],[845,67]],122,[[852,88,132,32]]);
  prop('north-street-tree',[[732,32],[747,16],[773,8],
    [799,22],[818,47],[809,65],[790,79],[787,106],
    [798,114],[782,121],[766,114],[772,100],[769,77],
    [747,70],[732,52]],122,[[767,105,29,16]]);
  prop('central-tree',[[371,465],[383,443],[411,430],
    [424,416],[451,425],[476,448],[466,475],[445,487],
    [432,512],[426,549],[437,571],[418,583],[400,571],
    [407,550],[412,510],[391,502],[376,489]],584,[[400,563,32,19]]);
  prop('east-tree',[[815,520],[827,498],[852,488],
    [876,501],[885,526],[872,546],[861,557],[861,593],
    [870,611],[855,622],[840,613],[843,593],[846,559],
    [826,551],[812,536]],623,[[841,605,27,17]]);
  prop('fish-fountain',[[750,337],[780,323],[812,326],
    [818,304],[834,297],[849,302],[862,298],[869,303],
    [866,319],[854,328],[863,336],[892,327],[916,340],
    [941,366],[947,391],[936,410],[908,424],[772,423],
    [742,407],[725,386],[731,357]],425,
    [[780,344,117,22],[733,366,205,42],[754,408,160,16]]);
  // The retaining wall is not an alternate route between the two elevations.
  prop('west-stair-wall',[[561,171],[586,157],[626,164],
    [677,155],[696,145],[716,145],[720,263],[704,268],
    [568,260]],269,[[568,243,145,27]]);
  prop('east-park-wall',[[873,174],[892,173],[913,197],
    [976,215],[1137,207],[1147,228],[1348,236],[1361,231],
    [1371,255],[1448,259],[1448,312],[942,312],[900,285],
    [876,266]],313,[[880,252,30,35],[909,280,37,32],[943,294,505,19]]);
  for(const [id,x,y,w,h]of [
    ['west-quay-cargo',299,766,188,68],['east-quay-cargo',956,750,120,79],
    ['north-warehouse-cargo',1075,353,80,91],['south-warehouse-cargo',1137,511,84,88],
    ['shop-crate',1037,635,45,54],['southeast-crates',1215,769,62,52]
  ])prop(id,[[x+5,y],[x+w-5,y],[x+w,y+h-5],[x+w-5,y+h],[x,y+h],[x,y+12]],y+h,
    [[x+2,y+h-25,w-4,25]]);
  for(const [id,x,y,w,h]of [
    ['pier-west-back',579,802,30,78],['pier-east-back',852,801,31,80],
    ['pier-west-middle',568,863,31,87],['pier-east-middle',864,863,31,89],
    ['pier-west-front',550,953,35,93],['pier-east-front',881,951,35,94]
  ])prop(id,[[x+4,y],[x+w-4,y],[x+w,y+8],[x+w-3,y+h],[x+3,y+h],[x,y+8]],y+h,
    [[x+3,y+h-15,w-6,15]]);

  const spawn={x:1536,y:1712},returnPoint={id:'return',x:1536,y:1984,radius:48};
  const districts=[
    ['cais','Cais de Orange Town',976,735],['rua','Rua de Chouchou',319,574],
    ['praca','Praça da Fonte',649,433],['armazens','Armazéns do Porto',1128,649],
    ['jardins','Jardim do Bairro Alto',787,143]
  ].map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const slots=Object.fromEntries([
    ['cais-0',501,741],['cais-1',1105,752],
    ['rua-0',283,530],['rua-1',307,674],
    ['praca-0',638,336],['praca-1',993,391],
    ['armazens-0',1107,505],['armazens-1',1191,665],
    ['jardins-0',692,107],['jardins-1',835,147]
  ].map(([id,x,y])=>['orange-'+id,point([x,y])]));
  const goals=[
    ['pet-food-door',170,740],['buggy-terrace-front',344,416],
    ['fountain-behind',835,326],['fountain-front',835,452],
    ['north-stairs',796,217],['upper-street',787,143],
    ['north-warehouse-front',1107,465],['south-warehouse-front',1331,625],
    ['west-waterfront',258,813],['east-waterfront',1142,813],['pier-tip',724,968]
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
  const materialAreas=[{surface:'madeira',polygon:polygon([[600,836],[857,836],[880,986],[578,986]])}];
  const surfaceAt=(x,y)=>!onFloor(x,y)?null:materialAreas.find(a=>inside(x,y,a.polygon))?.surface||'cimento';
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas,waterAreas,solidAreas};
  root.MareMapExportData.orange=source;
  root.MareOrangeTownLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,solidAreas,materialAreas,surfaceAt,props};
  if(typeof module!=='undefined')module.exports=root.MareOrangeTownLayout;
})(globalThis);
