'use strict';
/* Sandora-inspired Alabasta desert: source pixels define sand, water and ruins.
 * The original PixelLab data and the persisted area alabasta remain intact. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/alabasta-desert/sand-sea/scene-hd.png';
  // Sand corridors wrap around the oasis and both groups of ruins. The contour
  // ends at the rock faces and image boundary, not at the top of painted cliffs.
  const walkableAreas=[
    [[447,17],[1432,17],[1432,449],[1345,449],[1312,504],
      [1288,565],[1265,591],[1289,621],[1432,621],[1432,704],
      [1305,704],[1272,739],[1243,778],[1212,813],[1195,852],
      [1217,890],[1330,928],[1432,934],[1432,1070],
      [455,1070],[420,1028],[380,995],[340,958],[322,923],
      [245,915],[222,891],[162,889],[117,870],[16,825],
      [16,805],[119,814],[180,805],[193,785],[172,755],
      [156,715],[138,680],[106,657],[16,643],[16,523],
      [66,509],[77,479],[69,438],[45,387],[16,373],
      [16,305],[162,291],[198,272],[213,237],[205,196],
      [192,160],[197,130],[267,117],[336,111],[392,96],[451,84]]
  ].map(polygon);
  const waterAreas=[
    [[276,454],[305,451],[329,449],[351,453],[357,465],[379,473],
      [389,483],[391,494],[379,503],[372,515],[365,532],[343,539],
      [334,549],[310,553],[287,551],[268,545],[255,533],[247,516],
      [225,509],[214,501],[225,488],[242,478],[262,475]]
  ].map(polygon);
  // Dense roots and reeds leave no usable foot space in this narrow bank pocket.
  const solidAreas=[[[207,463],[236,463],[247,474],[239,485],[218,487],[209,478]]].map(polygon),props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'alabasta-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('temple-west-wall',[[376,155],[389,133],[397,120],[412,129],
    [432,127],[446,105],[449,83],[475,79],[492,80],[493,70],
    [515,66],[531,76],[553,71],[555,151],[518,154],[484,171],
    [440,181],[387,198],[376,192]],199,
    [[378,173,33,24],[409,164,35,23],[441,151,32,22],[472,139,34,23],[504,129,47,25]]);
  prop('temple-north-wall',[[605,94],[638,96],[641,102],
    [658,103],[663,115],[686,115],[690,105],[711,107],
    [711,78],[734,70],[761,69],[778,76],[801,75],
    [808,86],[806,137],[605,139]],140,[[607,123,199,17]]);
  prop('temple-west-tall-pillar',[[548,32],[559,22],[584,18],
    [612,28],[611,44],[602,57],[603,150],[609,164],
    [601,176],[558,177],[548,168],[553,153],[555,60],[545,40]],178,
    [[554,154,50,25]]);
  prop('temple-east-tall-pillar',[[801,24],[818,13],[845,14],
    [870,25],[870,43],[859,59],[859,149],[868,161],
    [858,175],[815,176],[804,166],[810,149],[809,60],[799,42]],177,
    [[806,151,59,26]]);
  prop('temple-east-back-wall',[[860,88],[880,96],[882,107],
    [905,114],[913,122],[923,123],[928,173],[938,197],
    [914,205],[890,183],[863,172]],206,
    [[866,154,25,23],[889,169,25,24],[914,184,24,22]]);
  prop('temple-west-pillar',[[463,176],[480,164],[497,174],
    [497,188],[490,197],[490,229],[499,238],[489,249],
    [466,251],[457,243],[461,229],[462,196],[457,187]],252,
    [[460,229,38,24]]);
  prop('temple-front-pillar',[[534,226],[543,214],[553,211],
    [565,223],[567,238],[561,247],[562,271],[572,281],
    [563,290],[536,293],[526,284],[531,271],[531,243]],294,
    [[530,270,40,24]]);
  prop('temple-east-front-wall',[[904,211],[941,196],[948,178],
    [964,165],[984,174],[1005,177],[1007,259],[989,270],
    [957,276],[916,285],[889,278]],286,
    [[910,260,35,24],[943,249,34,25],[975,238,32,28]]);
  prop('temple-east-front-pillar',[[891,217],[903,207],[921,213],
    [925,226],[919,237],[920,267],[928,278],[917,290],
    [897,291],[887,280],[892,268],[892,236]],292,
    [[891,269,35,23]]);
  prop('temple-east-broken-pillar',[[850,252],[858,240],[871,242],
    [882,254],[879,281],[886,291],[878,304],[854,307],
    [841,297],[847,281]],308,[[846,284,38,24]]);
  // The shrine arch is concave and has two distinct feet, leaving its doorway open.
  prop('shrine-arch',[[495,609],[554,585],[576,582],[584,591],
    [584,613],[580,617],[584,681],[578,695],[556,696],
    [553,681],[556,625],[533,634],[532,696],[524,710],
    [506,715],[496,705],[500,633],[494,625]],716,
    [[500,689,30,26],[556,678,27,20]]);
  prop('shrine-west-pillar',[[458,653],[472,644],[487,650],
    [491,662],[484,675],[483,716],[491,727],[482,737],
    [461,741],[451,731],[457,715],[458,674],[452,664]],742,
    [[456,717,34,24]]);
  prop('shrine-east-pillar',[[628,666],[640,656],[653,663],
    [657,675],[651,687],[657,700],[648,708],[633,709],
    [624,701],[629,686]],710,[[627,689,29,21]]);
  prop('shrine-short-pillar',[[585,653],[597,645],[609,653],
    [613,666],[608,679],[598,688],[583,680]],689,[[583,670,29,19]]);
  prop('oasis-west-palms',[[139,381],[151,365],[174,351],
    [193,352],[211,336],[229,318],[255,319],[281,337],
    [296,358],[291,373],[275,364],[258,355],[246,365],
    [236,395],[228,434],[230,458],[219,469],[205,461],
    [196,472],[187,459],[190,437],[179,402],[164,391],
    [150,402],[142,393]],473,[[195,452,18,15],[211,442,19,13]]);
  prop('oasis-west-small-palm',[[132,466],[142,452],[155,442],
    [171,442],[188,456],[193,471],[182,478],[169,467],
    [163,491],[165,512],[170,521],[159,530],[147,521],
    [151,505],[151,483],[141,478],[133,484]],531,[[158,514,12,16]]);
  prop('oasis-east-palm',[[375,403],[385,386],[402,378],
    [420,385],[440,401],[445,419],[433,424],[421,409],
    [411,422],[412,446],[419,457],[410,469],[397,470],
    [389,459],[397,443],[397,419],[386,423],[376,418]],471,
    [[401,450,18,16]]);
  prop('oasis-north-rocks',[[267,437],[281,423],[302,419],
    [316,429],[329,432],[338,450],[327,463],[281,468],
    [263,457]],469,[[267,446,68,23]]);
  prop('oasis-northwest-stone',[[242,451],[252,444],[267,447],
    [279,458],[280,467],[274,473],[252,474],[242,466]],475,
    [[244,457,36,16]]);
  prop('oasis-northeast-stone',[[351,447],[365,433],[382,434],
    [399,446],[398,466],[384,474],[355,470]],475,
    [[353,458,45,16]]);
  prop('oasis-south-stone',[[243,549],[253,540],[269,540],
    [282,555],[278,567],[262,573],[244,566]],574,
    [[242,554,37,16]]);
  prop('oasis-front-west-rock',[[172,529],[187,513],[213,509],
    [236,523],[244,549],[235,564],[192,570],[173,558]],571,
    [[175,544,65,27]]);
  prop('oasis-front-east-rock',[[387,495],[399,483],[419,481],
    [433,494],[434,511],[425,522],[394,523],[384,512]],524,
    [[389,506,42,19]]);
  prop('west-temple-rock',[[315,312],[325,298],[342,294],
    [357,305],[363,322],[374,329],[365,339],[317,342],
    [307,329]],343,[[311,324,62,20]]);
  prop('east-middle-rock',[[842,456],[868,448],[889,449],
    [914,434],[937,444],[949,461],[952,481],[934,494],
    [855,507],[833,493],[832,472]],508,[[839,480,109,29]]);
  prop('east-large-outcrop',[[995,390],[1004,365],[1023,352],
    [1038,358],[1050,377],[1093,368],[1107,331],[1126,310],
    [1151,307],[1192,325],[1201,370],[1245,373],[1281,390],
    [1296,421],[1283,444],[1163,449],[1104,432],[1034,429]],450,
    [[996,375,46,20],[1001,395,59,30],[1058,405,63,27],[1117,405,174,43],[1111,370,88,40]]);
  prop('southeast-outcrop',[[980,668],[1003,650],[1044,649],
    [1063,638],[1080,631],[1101,646],[1112,670],[1131,681],
    [1133,701],[1110,715],[992,716],[971,699]],717,
    [[983,688,145,30]]);
  prop('northeast-rocks',[[1047,104],[1067,84],[1089,85],
    [1100,71],[1128,75],[1146,85],[1176,84],[1183,99],
    [1198,109],[1202,125],[1188,135],[1061,133]],136,
    [[1057,115,139,22]]);
  prop('east-dune-rock',[[1325,189],[1340,174],[1361,174],
    [1375,186],[1380,203],[1397,210],[1387,222],[1332,222],
    [1320,209]],223,[[1325,207,68,17]]);
  prop('southwest-rock',[[253,882],[275,869],[294,861],
    [319,868],[331,883],[348,882],[368,900],[365,910],
    [327,920],[265,917],[247,906]],921,[[252,896,112,26]]);
  prop('south-small-rock',[[1120,895],[1133,883],[1149,883],
    [1162,894],[1166,908],[1157,918],[1127,918]],919,
    [[1123,905,41,15]]);

  const spawn={x:1536,y:1728},returnPoint={id:'return',x:1840,y:1920,radius:48};
  const districts=[
    ['entrada','Entrada do Deserto',1025,795],['oeste','Oásis do Oeste',480,510],
    ['norte','Templos do Norte',710,225],['leste','Dunas do Leste',1110,540],
    ['sul','Santuário do Sul',740,720]
  ].map(([id,name,x,y])=>({id,name,...point([x,y])}));
  const slots=Object.fromEntries([
    ['entrada-0',958,768],['entrada-1',1097,845],
    ['oeste-0',489,417],['oeste-1',529,541],
    ['norte-0',660,195],['norte-1',766,248],
    ['leste-0',1047,496],['leste-1',1171,571],
    ['sul-0',720,659],['sul-1',806,748]
  ].map(([id,x,y])=>['alabasta-'+id,point([x,y])]));
  const goals=[
    ['oasis-east',447,501],['oasis-south',310,582],
    ['oasis-west',108,486],['oasis-north',313,398],
    ['temple-court',710,225],['temple-entry',705,313],
    ['pillar-behind',550,245],['pillar-front',550,319],
    ['shrine-arch-under',543,667],['shrine-arch-front',543,750],
    ['east-dunes',1250,651],['south-sand',900,978]
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
    !waterAreas.some(p=>inside(x,y,p))&&!solidAreas.some(p=>inside(x,y,p))&&
    !feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,returnPoint,interactions:[returnPoint],safeZones:[{...spawn,radius:140}],
    districts,slots,goals,walkableAreas,waterAreas,solidAreas};
  root.MareMapExportData.alabasta=source;
  root.MareAlabastaDesertLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,waterAreas,solidAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareAlabastaDesertLayout;
})(globalThis);
