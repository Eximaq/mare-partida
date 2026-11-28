'use strict';
/* Original maritime dungeon arena. Source pixels define the visible floor;
 * the shared quest-dungeons identity and reward interaction remain stable. */
((root)=>{
  if(typeof module!=='undefined'&&!root.MareMapExportData)require('./world-map-exports-data.js');
  const width=3072,height=2304,imageWidth=1448,imageHeight=1086,step=16;
  const scaleX=width/imageWidth,scaleY=height/imageHeight,round=n=>Math.round(n*100)/100;
  const point=([x,y])=>({x:round(x*scaleX),y:round(y*scaleY)});
  const polygon=points=>points.map(point);
  const rectangle=([x,y,w,h])=>({x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY)});
  const groundUrl='assets/quest-dungeons/boss-arena/scene-hd.png';
  const walkableAreas=[
    // Continuous stone platform, inside the curb and away from the water.
    [[553,242],[605,238],[612,229],[837,229],[848,240],[895,243],
      [918,267],[995,282],[1044,296],[1097,320],[1158,340],
      [1204,377],[1256,425],[1290,481],[1310,534],[1335,578],
      [1320,632],[1288,687],[1246,739],[1185,786],[1116,828],
      [1054,860],[997,891],[930,911],[850,928],[600,928],
      [523,909],[452,887],[356,851],[282,811],[231,773],
      [184,724],[143,667],[117,610],[107,579],[123,535],
      [139,481],[161,430],[204,381],[258,341],[326,312],
      [402,283],[489,268],[530,259]],
    // Open southern approach between the two solid gate piers.
    [[560,888],[889,888],[909,1078],[538,1078]]
  ].map(polygon);
  const props=[];
  function prop(id,shape,base,feet){
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const footprints=feet.map(rectangle);
    props.push({id:'boss-arena-'+id,x:round(x*scaleX),y:round(y*scaleY),w:round(w*scaleX),h:round(h*scaleY),
      base:round(base*scaleY),polygon:polygon(shape),ground:footprints[0],feet:footprints});
  }
  prop('northwest-brazier',[[347,249],[357,243],[365,222],[374,241],
    [389,247],[394,264],[388,285],[394,296],[375,310],[345,300],[349,281]],311,
    [[347,286,47,24]]);
  prop('northeast-brazier',[[1055,248],[1069,241],[1078,221],[1085,242],
    [1097,248],[1103,265],[1095,286],[1104,297],[1078,310],[1053,298],[1057,281]],311,
    [[1055,286,48,24]]);
  prop('west-brazier',[[106,510],[119,499],[126,474],[135,494],
    [148,503],[155,519],[146,542],[153,551],[141,564],[105,558],[109,538]],565,
    [[108,540,46,24]]);
  prop('east-brazier',[[1296,506],[1307,496],[1315,475],[1325,494],
    [1338,504],[1345,519],[1337,541],[1344,552],[1323,565],[1294,558],[1298,536]],566,
    [[1295,540,49,25]]);
  prop('southwest-brazier',[[203,738],[215,727],[222,709],[229,727],
    [244,735],[251,753],[242,777],[255,790],[234,806],[201,796],[203,773]],807,
    [[202,778,52,28]]);
  prop('southeast-brazier',[[1197,736],[1209,726],[1218,706],[1227,726],
    [1243,738],[1247,752],[1239,776],[1251,788],[1230,804],[1195,795],[1198,773]],805,
    [[1197,776,53,28]]);
  prop('southwest-gate-pier',[[409,862],[438,851],[439,819],[451,807],
    [462,795],[476,807],[489,818],[492,851],[513,855],[529,878],
    [530,890],[551,902],[558,929],[546,1086],[412,1086],[405,1056],[417,1038]],1086,
    [[419,993,129,93]]);
  prop('southeast-gate-pier',[[922,864],[948,851],[951,821],[963,807],
    [975,795],[988,810],[1000,819],[1002,851],[1023,859],[1040,886],
    [1040,1040],[1050,1061],[1036,1086],[915,1086],[891,929],[898,901],[921,889]],1086,
    [[918,993,122,93]]);
  prop('southwest-wall',[[0,705],[19,747],[55,785],[95,809],[140,831],
    [176,842],[194,858],[199,891],[217,910],[219,951],
    [255,965],[279,946],[317,957],[341,975],[342,987],
    [377,996],[396,978],[416,986],[418,1086],[0,1086]],1086,
    [[0,1000,418,86]]);
  prop('southeast-wall',[[1448,706],[1431,748],[1393,786],[1352,811],
    [1305,835],[1272,847],[1254,861],[1251,895],[1231,911],
    [1229,951],[1193,965],[1170,946],[1130,958],[1108,977],
    [1106,990],[1072,997],[1053,979],[1035,988],[1034,1086],[1448,1086]],1086,
    [[1034,1000,414,86]]);

  // The existing chest stays a separate sprite, with the same public IDs.
  // Its approach point sits below its solid foot, inside the claim radius.
  const chest={id:'40420c70-1e86-493e-a829-79b42d260c18',x:1536,y:640,radius:90,
    bounds:{x:1463,y:484,w:160,h:128}};
  props.push({id:'1cb97a09-0a88-4167-9627-1fd4b1e6ca0b',...chest.bounds,
    base:604.75,ground:{x:1471,y:572.75,w:144,h:32},
    spriteUrl:'assets/map-depth/objects/export-0c9aababd1dd8d975621951c.png'});
  const spawn={x:1536,y:1824},enemySpawn={x:1536,y:1152};
  const goals=[{id:'arena',...enemySpawn},{id:'chest-approach',x:chest.x,y:chest.y},
    ...[['west-flank',300,530],['east-flank',1150,530],['south-entry',724,1015]]
      .map(([id,x,y])=>({id,...point([x,y])}))];
  function inside(x,y,shape){
    let result=false;
    for(let i=0,j=shape.length-1;i<shape.length;j=i++){
      const a=shape[i],b=shape[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;
    }return result;
  }
  const feet=props.flatMap(p=>p.feet||[p.ground]);
  const onFloor=(x,y)=>walkableAreas.some(p=>inside(x,y,p))&&
    !feet.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
  const rows=Array.from({length:height/step},(_,cy)=>Array.from({length:width/step},(_,cx)=>
    onFloor(cx*step+step/2,cy*step+step/2)?'g':'.').join(''));
  const source={width,height,origin:[0,0],spriteMode:'painted',groundUrl,imageWidth,imageHeight,props,rows,
    coverage:Array.from({length:height/step},()=>'g'.repeat(width/step)),
    spawn,enemySpawn,chest,interactions:[chest],safeZones:[],districts:[],goals,walkableAreas};
  root.MareMapExportData['quest-dungeons']=source;
  root.MareBossArenaLayout={version:1,width,height,imageWidth,imageHeight,scaleX,scaleY,groundUrl,
    sourceImage:groundUrl,source,walkableAreas,props};
  if(typeof module!=='undefined')module.exports=root.MareBossArenaLayout;
})(globalThis);
