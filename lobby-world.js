'use strict';
/* Existing 64px PixelLab Lobby map, exported without any new art generation. */
((root)=>{
  const data=root.MareLobbyMapData||(typeof module!=='undefined'?require('./lobby-map-data.js'):null);
  const TILE=data.tileSize, origin=data.sourceOrigin;
  const point=(sx,sy)=>({x:Math.round((sx-origin.x+.5)*TILE),y:Math.round((sy-origin.y+.5)*TILE)});
  const terrain=(x,y)=>data.rows[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]||'.';
  const passable=(x,y)=>'sgem'.includes(terrain(x,y));
  const colliders=[
    {id:'west-house',x:1310,y:1000,w:190,h:95},
    {id:'east-house',x:1730,y:1030,w:190,h:92},
    {id:'forge-house',x:1460,y:1210,w:210,h:112},
    {id:'market-house',x:1690,y:1430,w:195,h:96},
    {id:'dock-house',x:2190,y:1230,w:150,h:94},
    {id:'dock-cargo',x:2380,y:1010,w:190,h:130},
    {id:'market-stall',x:1115,y:975,w:92,h:48},
    {id:'forge-chest-west',x:1740,y:928,w:52,h:38},
    {id:'forge-chest-east',x:1810,y:900,w:52,h:38},
    {id:'market-chest',x:2380,y:1250,w:64,h:42},
    {id:'dock-barrels-west',x:2268,y:1528,w:46,h:51},
    {id:'dock-barrels-east',x:2322,y:1528,w:44,h:51},
    {id:'square-monument',x:1550,y:1068,w:98,h:96},
    {id:'west-tree',x:1215,y:1080,w:72,h:48},
    {id:'south-tree',x:1270,y:1460,w:55,h:43},
    {id:'market-tree',x:1850,y:1235,w:75,h:55},
    {id:'central-palms',x:1310,y:1250,w:75,h:62},
    ...[[1632,684],[1696,684],[1568,884],[1632,884],[2208,1012],[2208,1076],[2080,1308]].map(([x,y],i)=>({id:'fruit-tree-'+i,x:x-32,y:y-64,w:64,h:64})),
    ...[[1378,840],[1976,748],[2052,928],[1240,998],[1240,1600],[1660,1514],[2004,1600],[2134,1260]].map(([x,y],i)=>({id:'lamp-'+i,x:x-12,y:y-14,w:24,h:28})),
    {id:'north-palms',x:1440,y:560,w:82,h:48},
    {id:'west-palms',x:820,y:1150,w:90,h:45},
    {id:'south-palms',x:990,y:1700,w:90,h:48},
    {id:'east-palms',x:2200,y:1690,w:90,h:48}
  ].map(o=>{
    const small=/lamp|chest|barrels/.test(o.id),w=small?o.w:Math.max(TILE,o.w),h=small?o.h:Math.max(TILE,o.h);
    return {...o,x:Math.round(o.x+(o.w-w)/2),y:Math.round(o.y+(o.h-h)/2),w,h,isSolid:true,blocksProjectiles:/house|tree|palms|monument/.test(o.id)};
  });
  const terrainWalkable=(x,y,r=10)=>[[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[0,-r],[0,r],[-r,0],[r,0]].every(([dx,dy])=>passable(x+dx,y+dy));
  const spawn=point(5,9);
  const npcs={luffy:point(20,6),nami:point(10,3),ryuma:point(6,7),donquixote:point(10,9)};
  const portals=[{id:'world-map',kind:'hunt',...point(21,8),radius:46}];
  const paths=[spawn,point(3,2),point(12,8),point(20,7)];
  const map={id:'lobby',width:data.width*TILE,height:data.height*TILE,origin:{x:0,y:0},spawn,
    colliders,playerFootprint:{w:32,h:20},terrainWalkable,navigationGoals:paths,spawnZones:[],safeZones:[{...spawn,radius:140}],
    interactions:portals,navigationCell:32};
  const image=typeof Image!=='undefined'?new Image():null;
  if(image){const file='assets/lobby-map.png?v=20261022',script=typeof document!=='undefined'?document.currentScript?.src:null;image.src=script?new URL(file,script).href:file;}
  function ground(ctx,camera,width,height){
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(image?.complete&&image.naturalWidth){
      const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
      const w=Math.min(width+2,map.width-x),h=Math.min(height+2,map.height-y);
      if(w>0&&h>0)ctx.drawImage(image,x,y,w,h,x,y,w,h);
    }else{ctx.fillStyle='#087bd0';ctx.fillRect(camera.x,camera.y,width,height);}
    ctx.restore();
  }
  // Native transparent object bounds from the current PixelLab lobby export.
  // Never use enlarged collider rectangles to redraw flattened ground.
  const depthObjects=[
    {"id":"ae481018-a31a-425d-a463-fe61d9e2bd28","assetId":"cf70f99f-f9bd-43dd-a9f2-4360c1b7f48a","x":2542,"y":1180,"w":256,"h":256,"pivotY":1415},
    {"id":"473b3a1d-8dff-4a79-be67-ca84cbfe49aa","assetId":"9eb782af-1386-4c7a-92c7-4f27f6456793","x":2542,"y":1365,"w":256,"h":256,"pivotY":1604},
    {"id":"7e5cc50b-83a6-40c3-b8fd-22d858facfdd","assetId":"bd557f3d-8dd4-4a0c-87fc-2635e613ea66","x":2587,"y":981,"w":232,"h":229,"pivotY":1209},
    {"id":"755d4b86-d888-4bd9-bab5-53a013fce637","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2371,"y":1040,"w":48,"h":48,"pivotY":1087},
    {"id":"6b50223a-52e8-4336-a113-5bb89ef3fc6d","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2436,"y":1039,"w":48,"h":48,"pivotY":1086},
    {"id":"097bc91c-4233-4ed5-be2f-751976a5b73b","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2508,"y":1037,"w":48,"h":48,"pivotY":1084},
    {"id":"2ec8a2e2-918a-450a-9bf3-12509d54e984","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2557,"y":1072,"w":48,"h":48,"pivotY":1119},
    {"id":"4578994e-c76c-4be1-b36c-6421a5ca3bcd","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2370,"y":1013,"w":48,"h":48,"pivotY":1060},
    {"id":"5e96a036-c070-4460-a6e5-6b456cb854c1","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2435,"y":1010,"w":48,"h":48,"pivotY":1057},
    {"id":"7b4ae5b1-8ac5-4cd1-92b4-c813d145fa90","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2508,"y":1006,"w":48,"h":48,"pivotY":1053},
    {"id":"43739d73-01fe-4aa3-a0e1-2ea7442a79ee","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2569,"y":1035,"w":48,"h":48,"pivotY":1082},
    {"id":"bb209780-e9d0-4ded-bcbc-f5c1dfe52b63","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2405,"y":1040,"w":48,"h":48,"pivotY":1087},
    {"id":"607f6d0f-fe5c-463d-a73a-7b8f98522c6f","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2405,"y":1011,"w":48,"h":48,"pivotY":1058},
    {"id":"e406a0fd-eaf9-4e88-8cd5-7d1c2cfa8147","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2539,"y":1038,"w":48,"h":48,"pivotY":1085},
    {"id":"5897b002-0634-46d1-9a53-e8669e5c9d93","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2472,"y":1038,"w":48,"h":48,"pivotY":1085},
    {"id":"643bc099-cd47-4fff-964c-0d420577d876","assetId":"63d14a47-133b-4079-af87-8d7127db36b9","x":2472,"y":1007,"w":48,"h":48,"pivotY":1054},
    {"id":"cfcb19e9-35ba-49a7-9b49-0abcb17312d6","assetId":"8b2e3c0c-1866-41ae-8bf3-3c9dfc89b182","x":2129,"y":1062,"w":244,"h":234,"pivotY":1294},
    {"id":"e24d55c5-9c4e-4ad2-8513-7b0d439dc088","assetId":"8f659dbc-f2c7-4bfe-9798-dcd02affaba0","x":1459,"y":1057,"w":236,"h":238,"pivotY":1294},
    {"id":"e58de4b4-b837-4cfb-914e-1f277da1d868","assetId":"370b441a-0d23-4906-819e-f388f38a2d94","x":2335,"y":1005,"w":251,"h":170,"pivotY":1171},
    {"id":"9118263c-e618-4df4-8ff0-75a72ff94402","assetId":"c5895f6c-2693-4536-aed5-2e349f3badb0","x":2384,"y":604,"w":104,"h":224,"pivotY":819},
    {"id":"d4e9fb6d-71c4-4f8a-b9c1-43d526ec1411","assetId":"fc7d9e1b-7d0a-4b2e-b551-5ce44c61f1b8","x":1710,"y":886,"w":245,"h":221,"pivotY":1107},
    {"id":"ecc2e23e-1c34-4243-aac7-fd418954ed54","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":1341,"y":1773,"w":213,"h":218,"pivotY":1988},
    {"id":"317896c9-cea4-4532-9d82-9dce17a2b382","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":1890,"y":1767,"w":213,"h":218,"pivotY":1982},
    {"id":"03c3453f-8ebf-4d82-bdf9-ac81065b6196","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":2125,"y":1586,"w":213,"h":218,"pivotY":1801},
    {"id":"3eb7bd08-c10d-477d-ab2a-8e4538eb857c","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":1408,"y":403,"w":213,"h":218,"pivotY":618},
    {"id":"9a99379c-9699-4dab-9416-0351a1905bdb","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":910,"y":1632,"w":213,"h":218,"pivotY":1847},
    {"id":"37ffd2a2-e219-45b2-9a92-d0f72c5c9afc","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":786,"y":1034,"w":213,"h":218,"pivotY":1249},
    {"id":"fd401750-a058-478d-955f-51c0830e2c53","assetId":"fee76a23-1380-4dc4-a86e-7d74fe38f7df","x":2228,"y":491,"w":213,"h":218,"pivotY":706},
    {"id":"7d3181dd-1c12-4874-b43c-dd3b59aebb47","assetId":"37c241a6-6cc7-48ef-b655-89f4ac1a610b","x":1735,"y":841,"w":48,"h":48,"pivotY":888},
    {"id":"ef0ac5bd-288d-44ab-b738-82b24a4da31b","assetId":"37c241a6-6cc7-48ef-b655-89f4ac1a610b","x":1732,"y":897,"w":48,"h":48,"pivotY":944},
    {"id":"21b8902d-e8ae-44d2-9712-b9ea77527833","assetId":"37c241a6-6cc7-48ef-b655-89f4ac1a610b","x":1798,"y":841,"w":48,"h":48,"pivotY":888},
    {"id":"d2b5d6ce-513c-45ef-976b-098aa068d0ae","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":1566,"y":603,"w":128,"h":128,"pivotY":701},
    {"id":"e5f04940-789c-4249-9894-40db0929df5e","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":1631,"y":603,"w":128,"h":128,"pivotY":701},
    {"id":"c5f223a3-4152-4f6a-afc8-a83a63b12868","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":1504,"y":800,"w":128,"h":128,"pivotY":898},
    {"id":"dfd750ab-2405-45ab-981c-9c0f11b39391","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":1563,"y":801,"w":128,"h":128,"pivotY":899},
    {"id":"a65d49a6-783d-46dd-b90d-0ac03aff8996","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":2023,"y":1240,"w":128,"h":128,"pivotY":1338},
    {"id":"29e5a8bb-b194-4974-a474-a08839b4a439","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":2140,"y":927,"w":128,"h":128,"pivotY":1025},
    {"id":"bfafb76a-3cbf-4acc-8e4f-40fa35fa5d29","assetId":"fe52465b-3482-4bd5-8415-9fd553dba8b3","x":2140,"y":984,"w":128,"h":128,"pivotY":1082},
    {"id":"79856fa3-7798-45bd-84f6-9929914f3010","assetId":"971f5ad1-c2e8-46f7-9ac1-13194f682319","x":1639,"y":1337,"w":234,"h":212,"pivotY":1540},
    {"id":"f1b6641d-3dcc-49f8-98a1-f2b6e7816109","assetId":"9b881c2e-b40e-41d0-87d6-984fab647064","x":1099,"y":908,"w":126,"h":121,"pivotY":1029},
    {"id":"b973250f-bd49-4d15-9f22-b54eba0d15e8","assetId":"d2a01c06-32d4-46a9-8370-2238515aeb18","x":2320,"y":1539,"w":48,"h":48,"pivotY":1585},
    {"id":"9e0d0b42-c269-4a92-bf61-ea65c7260f4f","assetId":"d2a01c06-32d4-46a9-8370-2238515aeb18","x":2253,"y":1541,"w":48,"h":48,"pivotY":1587},
    {"id":"ec648097-09d6-49f5-96f8-5cc49e432905","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1172,"y":1568,"w":20,"h":80,"pivotY":1648},
    {"id":"2ce5a1b3-5460-4fa2-939f-b6880deef76f","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":2068,"y":1113,"w":20,"h":80,"pivotY":1193},
    {"id":"9cab255d-4f37-4580-abad-fb501a4591e6","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":2043,"y":846,"w":20,"h":80,"pivotY":926},
    {"id":"0a2485b7-9314-46b8-b877-a2b318125f61","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1879,"y":1118,"w":20,"h":80,"pivotY":1198},
    {"id":"680b032d-d493-4dcb-937e-a26461077704","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1917,"y":1583,"w":20,"h":80,"pivotY":1663},
    {"id":"eb727576-05ba-4b50-a6af-e7688e72acf9","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1622,"y":1444,"w":20,"h":80,"pivotY":1524},
    {"id":"0616b94b-3806-4715-9108-0f414e59dd0c","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1493,"y":1244,"w":20,"h":80,"pivotY":1324},
    {"id":"db15e869-bcbf-4dd7-8fe3-bada1bf885b4","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1110,"y":988,"w":20,"h":80,"pivotY":1068},
    {"id":"4c0c1c54-51f2-4b83-a151-6afcc2265f2d","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1111,"y":1315,"w":20,"h":80,"pivotY":1395},
    {"id":"7d6efd5e-5e2f-45ea-ab57-a7bad8c27192","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":2068,"y":1447,"w":20,"h":80,"pivotY":1527},
    {"id":"a1bd6ac6-d727-4863-a52a-33a29951eb7e","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":2275,"y":1251,"w":20,"h":80,"pivotY":1331},
    {"id":"d661aa99-cbbb-411e-ab65-21537ff60d8c","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":2199,"y":1505,"w":20,"h":80,"pivotY":1585},
    {"id":"a25e39e1-891e-4e6f-a761-7f746e66f956","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1961,"y":672,"w":20,"h":80,"pivotY":752},
    {"id":"bbb52147-3b63-48aa-b3d3-ad1a88c6311c","assetId":"b6ea4daf-f6b9-4392-8eac-b45327088a6a","x":1368,"y":738,"w":20,"h":80,"pivotY":818},
    {"id":"7ca915fb-6fab-402e-94a5-ef1421bd8778","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1205,"y":1042,"w":95,"h":105,"pivotY":1147},
    {"id":"2ccfc795-7204-4e1a-a1c2-0f8b5a8368ca","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1654,"y":1235,"w":95,"h":105,"pivotY":1340},
    {"id":"8c1eef7b-440c-4372-999a-1dbe7bf53ce9","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1976,"y":1431,"w":95,"h":105,"pivotY":1536},
    {"id":"c4627295-ee4f-428c-b735-18fe8ce9f576","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1269,"y":1417,"w":95,"h":105,"pivotY":1522},
    {"id":"4da8a957-1a64-496e-9d07-3de3eba3dc8c","assetId":"7a104f5c-d27e-4532-8bce-b59972fdf0fa","x":1663,"y":1129,"w":73,"h":73,"pivotY":1202},
    {"id":"b9890f57-01aa-4842-9c2a-9371b61755f2","assetId":"7a104f5c-d27e-4532-8bce-b59972fdf0fa","x":1531,"y":1459,"w":73,"h":73,"pivotY":1532},
    {"id":"dd96189e-a0f8-4c2a-9733-4f8e5e3d5a7c","assetId":"af8166f3-3ea0-4ffc-b2fc-56936d306f1a","x":2177,"y":645,"w":128,"h":256,"pivotY":901},
    {"id":"2cee4a3b-17f0-4cd0-9b55-6101977e4575","assetId":"a14bddcd-db9b-4dbf-ab25-12b7a8ead683","x":1272,"y":856,"w":245,"h":245,"pivotY":1099},
    {"id":"37be4c18-fc3b-441a-a5db-a5fb5baf3c79","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1221,"y":1213,"w":64,"h":64,"pivotY":1271},
    {"id":"98311432-923e-4614-b819-42e871897ac6","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1342,"y":1215,"w":64,"h":64,"pivotY":1273},
    {"id":"66994e78-3328-4c44-9a25-8403a75605d6","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1714,"y":1236,"w":95,"h":105,"pivotY":1341},
    {"id":"356be093-9bea-4cc9-b77b-fc0bce08417c","assetId":"21d6c94c-29cb-440d-87d7-f2e6e54fb923","x":1780,"y":1236,"w":95,"h":105,"pivotY":1341},
    {"id":"bc78f70d-2796-41a1-8f1b-476b54f07de4","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1283,"y":1213,"w":64,"h":64,"pivotY":1271},
    {"id":"017e7935-4808-41ea-8e79-aac930b9323f","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1282,"y":1338,"w":64,"h":64,"pivotY":1396},
    {"id":"60009b91-9c0a-4ed6-b0ad-0212a66428c7","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1282,"y":1275,"w":64,"h":64,"pivotY":1333},
    {"id":"f3d3eb6b-7a9b-48f0-b3c0-aabca0bdb711","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1340,"y":1276,"w":64,"h":64,"pivotY":1334},
    {"id":"6c26e3f0-7bdb-430b-940c-c3a6916a9334","assetId":"af7eb20f-e465-4f88-916d-dd3e8ce8743a","x":1339,"y":1340,"w":64,"h":64,"pivotY":1398}
  ];
  const upper=[]; // Legacy export retained; geometric roof clips are retired.
  function depthProp(ctx,o){
    const region=root.MareWorldDepth?.regions('lobby').find(p=>p.id===o.id);
    if(region)return root.MareWorldDepth.draw(ctx,region,[{x:o.x+o.w/2,y:o.pivotY-1,visualHeight:o.h,visualWidth:o.w}]);
  }
  // Depth uses the contact point at the ground, independently from each
  // sprite's visual height or collider dimensions (including multi-tile art).
  function pivotY(entity){
    if(Number.isFinite(entity.pivotY))return entity.pivotY;
    if(Number.isFinite(entity.pivotOffsetY))return entity.y+entity.pivotOffsetY;
    if(entity.isCharacter)return entity.y+(entity.height||0);
    return entity.y+(entity.collider?.h??entity.height??0);
  }
  function sortDepth(items){return [...items].sort((a,b)=>pivotY(a)-pivotY(b));}
  function foreground(ctx,actors){
    for(const p of root.MareWorldDepth?.regions('lobby')||[])root.MareWorldDepth.draw(ctx,p,actors);
  }
  root.MareLobby={data,point,terrain,terrainWalkable,colliders,depthObjects,depthProp,upper,spawn,npcs,portals,paths,map,ground,foreground,pivotY,sortDepth,image};
  if(typeof module!=='undefined')module.exports=root.MareLobby;
})(globalThis);
