'use strict';
/* Arlong Park: original 1448 x 1086 painting, 3072 x 2304 world units.
 * Geometry is authored on the painting, shared by browser and server. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scale=width/imageWidth,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scale),y:round(y*scale)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scale),y:round(y*scale),w:round(w*scale),h:round(h*scale)});
  const groundUrl='assets/arlong-park/shark-palace/scene-hd.png';
  // Continuous forecourt, two side promenades, central avenue and south
  // crosswalk. The separate water polygons remove both pools from this floor.
  const walkableAreas=[
    [[260,426],[1186,426],[1218,477],[1255,600],[1285,717],[1310,835],
      [806,835],[806,926],[642,926],[642,835],[138,835],[160,717],[187,600],[220,478]],
    [[655,914],[786,914],[801,1085],[637,1085]]
  ].map(polygon);
  const waterAreas=[
    [[337,542],[595,542],[578,786],[294,786]],
    [[838,542],[1114,542],[1156,786],[869,786]]
  ].map(polygon);
  const props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'arlong-'+id,x:round(x*scale),y:round(y*scale),w:round(w*scale),h:round(h*scale),
      base:round(base*scale),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  // Silhouettes repaint this exact source, rather than overlaying the old
  // exported object sprites. Feet block movement independently of tall roofs.
  prop('shark-palace',[[374,420],[371,347],[381,324],[450,324],[461,291],
    [448,295],[489,271],[494,252],[532,253],[548,221],[534,212],[579,216],
    [593,182],[566,179],[602,168],[618,147],[594,144],[634,134],[647,113],
    [617,106],[649,101],[667,74],[635,72],[667,60],[706,43],[722,35],
    [725,0],[772,0],[772,31],[749,39],[774,51],[798,66],[823,64],
    [802,86],[813,103],[839,108],[816,121],[827,139],[858,141],
    [838,160],[857,178],[886,180],[864,200],[890,215],[916,213],
    [900,236],[928,255],[960,249],[946,276],[983,294],[1001,291],
    [991,323],[1066,323],[1081,347],[1078,419]],425,[[375,402,700,23]]);
  prop('south-gate-west',[[550,800],[568,796],[586,783],[594,776],[598,764],
    [605,764],[609,781],[628,794],[647,798],[650,813],[639,836],[630,840],
    [635,947],[627,964],[563,963],[555,947],[561,841],[551,838]],964,[[559,928,74,35]]);
  prop('south-gate-east',[[791,800],[810,793],[827,781],[835,768],[842,765],
    [849,785],[868,795],[887,801],[891,815],[879,839],[883,949],[875,965],
    [812,963],[805,948],[810,841],[798,837]],965,[[808,928,73,35]]);
  prop('south-wall-west',[[110,841],[377,844],[380,851],[384,852],[383,934],
    [356,943],[142,931],[113,904]],943,[[120,923,258,20]]);
  prop('south-wall-west-gate',[[447,849],[554,846],[558,951],[448,941]],951,[[450,927,106,24]]);
  prop('south-wall-east-gate',[[882,848],[990,847],[994,940],[884,950]],950,[[884,926,108,24]]);
  prop('south-wall-east',[[1065,847],[1336,841],[1336,906],[1308,932],[1066,940]],940,[[1067,921,258,19]]);
  prop('west-palm',[[16,629],[24,616],[50,609],[18,602],[47,593],[72,603],
    [86,587],[104,587],[114,600],[144,589],[169,596],[150,603],[187,605],
    [203,623],[180,618],[194,637],[170,631],[164,657],[149,635],[139,621],
    [114,619],[107,648],[96,660],[100,680],[94,705],[97,730],[99,750],
    [77,750],[79,724],[84,693],[85,664],[86,642],[75,621],[58,634],
    [41,653],[42,634],[26,646],[32,628]],750,[[78,734,21,16]]);
  prop('east-palm',[[1261,618],[1282,602],[1315,603],[1295,591],[1325,589],
    [1344,603],[1357,587],[1375,590],[1381,604],[1410,595],[1431,609],
    [1410,609],[1440,629],[1418,620],[1428,646],[1412,636],[1414,659],
    [1397,639],[1384,620],[1371,628],[1369,658],[1371,687],[1370,719],
    [1378,747],[1353,750],[1352,728],[1356,702],[1355,674],[1355,647],
    [1348,623],[1327,629],[1305,652],[1310,632],[1294,642],[1294,623]],750,[[1353,733,24,17]]);
  prop('northwest-palm',[[160,274],[174,249],[204,246],[193,229],[220,239],
    [241,217],[263,214],[262,229],[286,223],[311,237],[288,238],[317,257],
    [303,257],[321,281],[296,267],[303,290],[287,279],[277,256],
    [257,249],[246,273],[230,299],[221,332],[217,367],[220,411],
    [200,416],[199,371],[204,335],[213,295],[221,265],[206,261],
    [186,276],[177,300],[179,274]],416,[[200,400,20,16]]);
  prop('northeast-palm',[[1102,266],[1117,248],[1150,244],[1140,229],[1166,235],
    [1183,218],[1207,218],[1200,234],[1230,225],[1255,240],[1236,244],
    [1268,267],[1248,265],[1269,289],[1245,278],[1254,305],[1234,291],
    [1218,257],[1202,253],[1200,283],[1199,317],[1200,352],[1214,415],
    [1190,420],[1181,376],[1180,336],[1185,294],[1187,259],[1173,256],
    [1152,274],[1141,299],[1143,273],[1126,288],[1128,264]],420,[[1190,403,23,17]]);
  prop('west-barrels',[[172,433],[188,429],[203,435],[208,444],[205,480],
    [191,485],[190,501],[178,511],[161,510],[157,498],[162,480],[172,475]],511,[[160,493,30,18],[175,469,31,15]]);
  prop('west-crates',[[126,550],[155,548],[170,558],[168,591],[147,602],[125,589]],602,[[127,585,39,17]]);
  prop('east-barrels-crates',[[1210,413],[1241,409],[1254,423],[1254,430],
    [1267,433],[1271,451],[1264,469],[1247,470],[1244,450],[1212,446]],470,[[1211,434,33,14],[1246,455,24,15]]);
  prop('east-crates',[[1289,571],[1317,569],[1336,582],[1335,610],[1291,609]],610,[[1292,596,43,14]]);
  // Bollard feet leave the middle of the pier continuously clear.
  for(const [id,x,y,w,h]of [
    ['pier-west-upper',644,900,19,44],['pier-east-upper',779,900,19,44],
    ['pier-west-middle',637,947,19,47],['pier-east-middle',786,947,19,47],
    ['pier-west-lower',629,1005,21,53],['pier-east-lower',794,1005,21,53]
  ])prop(id,[[x+3,y],[x+w-3,y],[x+w,y+5],[x+w-3,y+h],[x+3,y+h],[x,y+6]],y+h,[[x+3,y+h-9,w-6,9]]);

  const spawn={x:1536,y:2080},returnPoint={id:'return',x:1536,y:2208,radius:48};
  const districts=[
    {id:'entrada',name:'Passarela do Porto',...point([724,817])},
    {id:'ala-oeste',name:'Ala Oeste',...point([230,655])},
    {id:'ala-leste',name:'Ala Leste',...point([1220,655])},
    {id:'palacio',name:'Praça do Palácio',...point([724,477])}
  ];
  const slots=Object.fromEntries([
    ['entrada-0',679,811],['entrada-1',773,811],
    ['ala-oeste-0',259,576],['ala-oeste-1',215,743],
    ['ala-leste-0',1184,576],['ala-leste-1',1234,743],
    ['palacio-0',507,481],['palacio-1',941,481]
  ].map(([id,x,y])=>['arlong-'+id,point([x,y])]));
  const goals=[
    ['arrival-pier',724,940],['open-gate',724,870],
    ['west-promenade',230,690],['east-promenade',1220,690],
    ['central-avenue',724,647],['south-crosswalk-west',457,815],
    ['south-crosswalk-east',1001,815],['palace-approach',724,449]
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
    !waterAreas.some(p=>inside(x,y,p))&&
    !feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas,waterAreas};
  root.MareMapExportData.arlong=source;
  root.MareArlongLayout={version:1,width,height,imageWidth,imageHeight,scale,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareArlongLayout;
})(globalThis);
