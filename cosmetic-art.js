/* East Blue cosmetics. Each fitted part is a transparent pass on the native HD frame. */
(function(root){
 'use strict';

 const layers={head:['hat','hat-v3'],coat:['vest'],legs:['shorts'],boots:['sandals']};
 // Native 4x idle mounts measured on the supplied 512px registration.
 // WEST has its own mirrored PNG and must never be flipped again.
 // The last value nudges the side views toward the face by one logical pixel.
 const hatMounts={
  south:['sul',256,176,72,122],
  north:['norte',256,166,66,117],
  east:['leste',259,168,69,119,4],
  west:['oeste',253,168,69,119,-4]
 };
 function hatFile(record){
  const mount=hatMounts[record.direction];
  return record.cosmeticLayers?.head?.layer==='hat-v3'&&mount?'assets/player-cosmetics/straw-hat-v3/'+mount[0]+'.png':null;
 }
 const selection=p=>{
  if(!p||p.zoanTransformed||p.equipment?.visual_completo!=null)return null;
  const art=root.MareCosmetics;
  const selected=art?.visualSelection(p.cosmetics?.equipped??p.cosmetics);
  if(!selected)return null;
  const supported=Object.fromEntries(Object.entries(selected).filter(([slot,id])=>{
   const item=art.get(id);
   return layers[slot]?.includes(item?.layer)&&art.available(item,p.appearance96);
  }));
  return Object.keys(supported).length?supported:null;
 };
 function project(p,selected){
  const equipment={...p.equipment};
  for(const slot of Object.keys(selected)){
   if(slot==='head'&&root.MareHeadgear?.hidden(p))continue;
   delete equipment[slot];
   if(slot==='legs')delete equipment.pants;
   if(slot==='coat')delete equipment.torso;
  }
  const shown={...selected};
  if(root.MareHeadgear?.hidden(p))delete shown.head;
  return {player:{...p,equipment,cosmetics:null},shown};
 }
 function decorate(source,shown,player,resolve){
  if(!source||!Object.keys(shown).length)return source;
  const pieces=Object.keys(layers).filter(slot=>shown[slot]).map(slot=>[slot,{id:shown[slot],layer:root.MareCosmetics.get(shown[slot]).layer}]);
  const record={...source,cosmeticLayers:Object.fromEntries(pieces)};
  if(!hatFile(record))return record;
  const look=root.MareCharacterAppearance.read(player);
  record.hatV3Hairless=look.hairStyle==='none'?null:resolve(root.MareCharacterAppearance.apply(player,{...look,hairStyle:'none'}));
  return record;
 }
 function hatClock(source){
  if(source.hdKind==='weapon')return [source.fps,source.timeline,source.states?.map(s=>s.state),source.visualSampling];
  const c=source.pack?.directions?.[source.direction]?.clip;
  return c&&[c.fps,c.frames,c.loop];
 }
 function hatHairless(record){
  const source=record.hatV3Hairless;
  return source&&record.body===source.body&&record.direction===source.direction&&
   (record.resolvedAction??record.action)===(source.resolvedAction??source.action)&&
   JSON.stringify(hatClock(record))===JSON.stringify(hatClock(source))?source:null;
 }

 const round=Math.round;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 function posePoint(name,d,p,pivot,mirror){
  const v=p?.[name]??p?.[name.replaceAll(' ','_')];
  if(!Number.isFinite(v?.x)||!Number.isFinite(v?.y))return null;
  const x=(v.x-pivot.x)*(mirror?-1:1);
  return {x:d.x+x,y:d.y+v.y-pivot.y};
 }
 function readPose(record,info,frame,density){
  const pivot={x:info.pivot.x/density,y:info.pivot.y/density};
  const pack=record.pack||record.basePack?.pack||record.orderedSwordFit?.rig?.pack||record.baseRecord?.pack;
  const d=pack?.directions?.[record.direction];
  const n=Number(record.states?.[frame]?.state??frame);
  const pose=info.pose||d?.poses?.[n]||d?.poses?.[frame];
  const originalPivot=pack?.pivot||pivot;
  const mirror=info.mirrorX??(record.mirrorX===true||record.base?.mirrorX===true);
  return name=>posePoint(name,pivot,pose,originalPivot,mirror);
 }

 function brush(cx,density,ox,oy){
  const x=v=>round(v*density)-ox,y=v=>round(v*density)-oy;
  return {
   poly(color,points){
    cx.fillStyle=color;cx.beginPath();
    points.forEach(([u,v],i)=>i?cx.lineTo(x(u),y(v)):cx.moveTo(x(u),y(v)));
    cx.closePath();cx.fill();
   },
   rect(color,u,v,w,h){cx.fillStyle=color;cx.fillRect(x(u),y(v),Math.max(1,x(u+w)-x(u)),Math.max(1,y(v+h)-y(v)));}
  };
 }
 function hat(ink,{neck,nose,direction,headTop}){
  const side=direction==='east'||direction==='west',west=direction==='west';
  const width=side?14:16,d=west?-1:1;
  const center=side?mix(neck.x,nose.x,.36)-d*1.5:nose.x;
  const level=clamp(Math.min(nose.y-6,headTop+12),headTop+7,headTop+12)+(side?1.25:1);
  const shape=(color,p)=>ink.poly(color,p.map(([x,y])=>[center+x*d,level+y]));
  shape('#45271d',[[-width-1,0],[-width-1,-2],[-width+2,-4],[-9,-5],[-8,-11],[-5,-14],[4,-14],[8,-12],[10,-7],[10,-5],[width-1,-3],[width+1,-1],[width,2],[3,4],[-7,3]]);
  shape('#b8793d',[[-width,-1],[-width+2,-3],[-8,-5],[9,-4],[width-2,-3],[width,-1],[width-2,1],[5,2],[-8,2]]);
  shape('#eabc69',[[-width+2,-2],[-8,-5],[7,-4],[width-3,-3],[width-2,-1],[5,1],[-7,1]]);
  shape('#b16d3a',[[-9,-4],[-7,-11],[-4,-13],[4,-13],[7,-11],[9,-4],[4,-3],[-4,-3]]);
  shape('#e4a853',[[-7,-7],[-6,-11],[-3,-12],[4,-12],[7,-11],[8,-7],[5,-6],[-4,-6]]);
  shape('#f5d18a',[[-5,-11],[-3,-12],[4,-12],[6,-11],[3,-10],[-3,-10]]);
  shape('#803b34',[[-8,-7],[-4,-6],[5,-6],[9,-7],[9,-3],[5,-2],[-4,-2],[-9,-4]]);
  shape('#bd5852',[[-8,-7],[-4,-6],[5,-6],[9,-7],[8,-5],[4,-4],[-4,-4],[-8,-5]]);
  for(const [x,y] of [[-7,-10],[-4,-9],[-1,-11],[2,-8],[5,-10],[-12,-1],[-8,0],[7,0],[11,-1]]){
   ink.rect('#f6cf83',center+x*d,level+y,.85,.48);
   ink.rect('#c68a45',center+(x+.4)*d,level+y+.52,.62,.27);
  }
  for(let x=-11;x<12;x+=2.4){
   ink.rect('#f4ca7a',center+x*d,level+.3+Math.abs(x)*.07,1.12,.28);
  }
 }

 // Fit the two panels on the actual neck/shoulder/hip triangle. The open
 // front follows the clavicles; it does not start below the shoulder line.
 function vest(ink,{neck,bodyNeck,pelvis,shoulderLeft,shoulderRight,direction,female}){
  const side=direction==='east'||direction==='west',back=direction==='north',east=direction==='east';
  const left=Math.min(shoulderLeft?.x??Infinity,shoulderRight?.x??Infinity);
  const right=Math.max(shoulderLeft?.x??-Infinity,shoulderRight?.x??-Infinity);
  const spread=side?10:female?10.5:12.5;
  const actual=Number.isFinite(left)&&Math.abs(left-neck.x)<24&&Math.abs(right-neck.x)<24;
  const a=actual?Math.min(left-1.8,neck.x-spread):neck.x-spread;
  const b=actual?Math.max(right+1.8,neck.x+spread):neck.x+spread;
  if(side)neck=bodyNeck;
  const shoulderY=Math.min(shoulderLeft?.y??Infinity,shoulderRight?.y??Infinity);
  const top=Number.isFinite(shoulderY)?Math.max(neck.y-4,Math.min(neck.y,shoulderY-2.4)):neck.y-1;
  const hem=Math.max(top+14,pelvis.y+(side?2.7:-.6));
  const lean=clamp(pelvis.x-neck.x,-14,14),waist=neck.x+lean;
  const waistSpan=(b-a)*(side?.68:female?.75:.86);
  const map=(u,v)=>[mix(mix(a,b,u),waist+(u-.5)*waistSpan,v*.75),mix(top,hem,v)];
  const fill=(c,points,mirror=false)=>ink.poly(c,points.map(([u,v])=>map(mirror?1-u:u,v)));
  const stitches=(array,color,mirror=false)=>array.forEach(([u,v])=>{
   const [x,y]=map(mirror?1-u:u,v);ink.rect(color,x,y,.7,.42);
  });

  if(side){
   const mirror=!east;
   const shape=(color,points)=>fill(color,points,mirror);
   // In profile, the rear panel wraps under the arm and the placket
   // follows the forward edge, opening at both the neckline and the hem.
   shape('#663139',[[.03,.37],[.10,.23],[.19,.12],[.31,.045],[.43,.04],[.55,.085],[.673,.225],[.766,.32],[.86,.185],[.956,.255],[1.10,.408],[1.15,.589],[1.07,.784],[1.045,.907],[.92,.98],[.70,.91],[.62,.98],[.41,1],[.23,.955],[.07,.98],[.02,.89],[.14,.59]]);
   shape('#be493e',[[.08,.38],[.16,.24],[.23,.14],[.33,.09],[.42,.087],[.528,.128],[.684,.268],[.766,.38],[.854,.247],[.94,.30],[1.055,.425],[1.07,.59],[1.018,.79],[.988,.905],[.90,.929],[.70,.86],[.62,.93],[.42,.953],[.22,.91],[.12,.928],[.08,.88],[.19,.59]]);
   shape('#ec7758',[[.151,.30],[.208,.197],[.318,.109],[.427,.10],[.507,.162],[.560,.234],[.406,.184],[.309,.162],[.221,.245]]);
   shape('#923b39',[[.19,.38],[.26,.34],[.27,.51],[.34,.63],[.29,.79],[.17,.84],[.22,.64]]);
   shape('#d25946',[[.36,.45],[.46,.37],[.59,.42],[.62,.53],[.50,.61],[.52,.73],[.39,.81],[.32,.66]]);
   shape('#8e3d3c',[[.13,.87],[.28,.83],[.47,.81],[.62,.74],[.67,.82],[.55,.908],[.34,.927],[.22,.882]]);
   shape('#ed7755',[[.50,.148],[.68,.305],[.775,.44],[.81,.57],[.795,.75],[.72,.873],[.68,.873],[.758,.71],[.758,.565],[.724,.455],[.616,.30]]);
   shape('#982f34',[[.76,.432],[.81,.48],[.83,.63],[.81,.76],[.74,.876],[.696,.872],[.762,.738],[.777,.584]]);
   stitches([[.155,.868],[.25,.871],[.33,.893],[.417,.91],[.513,.908],[.59,.892]],'#e48163',mirror);
   for(const [u,v] of [[.845,.563],[.868,.682],[.85,.785]]){
    const [x,y]=map(mirror?1-u:u,v);
    ink.rect('#66332b',x-.3,y-.2,1.17,1.15);
    ink.rect('#e2a454',x,y,.78,.79);
    ink.rect('#ffe4a0',x+.1,y,.42,.33);
   }
   return;
  }

  if(back){
   const mirror=false;
   // The back uses one continuous drape over the shoulder.
   fill('#672b31',[[.02,.20],[.16,.07],[.38,.01],[.53,.1],[.63,.06],[.83,.005],[.97,.15],[.99,.32],[.86,.46],[.95,.86],[.89,1],[.09,1],[.04,.86],[.13,.47]],mirror);
   fill('#bf493f',[[.065,.22],[.19,.115],[.38,.056],[.53,.145],[.64,.107],[.82,.048],[.925,.176],[.94,.31],[.81,.45],[.90,.86],[.86,.946],[.13,.948],[.089,.86],[.18,.46]],mirror);
   fill('#df6752',[[.13,.23],[.23,.125],[.39,.11],[.55,.18],[.78,.121],[.875,.19],[.80,.28],[.62,.31],[.41,.25],[.23,.34]],mirror);
   fill('#f38a68',[[.18,.21],[.24,.15],[.39,.13],[.56,.20],[.77,.146],[.81,.18],[.57,.23],[.37,.183]],mirror);
   fill('#8e3439',[[.14,.44],[.23,.35],[.22,.52],[.30,.74],[.20,.89],[.12,.87],[.185,.65]],mirror);
   fill('#9b3b41',[[.55,.45],[.77,.38],[.825,.51],[.73,.57],[.83,.86],[.77,.92],[.52,.92],[.63,.79],[.55,.66]],mirror);
   fill('#cb5445',[[.41,.32],[.53,.33],[.57,.51],[.49,.67],[.56,.91],[.44,.92],[.40,.72],[.46,.49]],mirror);
   stitches([[.18,.80],[.17,.86],[.20,.90],[.26,.924],[.34,.93],[.42,.93],[.50,.93],[.58,.928],[.65,.924],[.725,.919]],'#bb6f5f',mirror);
   return;
  }

  for(const mirror of [false,true]){
   fill('#702d32',[[.005,.205],[.078,.102],[.222,.02],[.315,0],[.365,.06],[.386,.217],[.43,.43],[.485,.72],[.499,.916],[.45,1],[.058,.979],[.069,.72],[.121,.56],[.146,.39],[.059,.35]],mirror);
   fill(mirror?'#ca4a42':'#df5546',[[.052,.203],[.11,.128],[.23,.061],[.309,.046],[.343,.085],[.355,.218],[.396,.438],[.452,.728],[.465,.9],[.405,.946],[.103,.927],[.112,.733],[.164,.58],[.19,.39],[.099,.317]],mirror);
   fill('#f47b60',[[.093,.217],[.154,.153],[.24,.078],[.306,.06],[.326,.105],[.321,.182],[.252,.17],[.21,.253],[.184,.326],[.119,.294]],mirror);
   fill('#ffa17b',[[.15,.169],[.216,.106],[.265,.086],[.305,.078],[.317,.115],[.251,.129],[.178,.174]],mirror);
   fill('#9f3f43',[[.185,.379],[.248,.285],[.228,.491],[.265,.59],[.236,.73],[.161,.88],[.118,.892],[.145,.743],[.185,.619]],mirror);
   fill('#ac4544',[[.307,.532],[.365,.502],[.41,.688],[.439,.867],[.397,.923],[.313,.917],[.347,.775],[.307,.681]],mirror);
   fill('#f48260',[[.314,.106],[.344,.101],[.355,.214],[.396,.438],[.452,.728],[.465,.9],[.426,.936],[.421,.752],[.371,.463],[.334,.232]],mirror);
   stitches([[.126,.254],[.156,.289],[.178,.338],[.186,.397],[.176,.46],[.158,.526],[.147,.592],[.127,.659],[.115,.748]],'#c6745a',mirror);
   stitches([[.129,.901],[.177,.914],[.232,.92],[.287,.922],[.348,.924],[.395,.921]],'#e49a72',mirror);
  }
  // Offset brass closures sit on the inner facing; the throat remains open.
  for(const [u,v] of [[.383,.545],[.409,.659],[.43,.773],[.444,.866]]){
   const [x,y]=map(u,v);
   ink.rect('#60332f',x-.2,y-.15,1.12,1.03);
   ink.rect('#dca166',x,y,.73,.64);
   ink.rect('#f8cc85',x+.12,y,.36,.27);
  }
 }

 // Keep fabric over the shoulder socket itself and leave the moving arm
 // and the grip in front. This works with both naming schemes in the rigs.
 function coversArm(x,y,{arms,neck}){
  if(y<neck.y+3.5)return false;
  const crosses=(a,b,min,radius)=>{
   if(!a||!b)return false;
   const u=b.x-a.x,v=b.y-a.y,length2=u*u+v*v;
   if(length2<6)return false;
   const t=((x-a.x)*u+(y-a.y)*v)/length2;
   if(t<min)return false;
   const fraction=Math.min(1,t);
   return Math.hypot(x-a.x-u*fraction,y-a.y-v*fraction)<radius;
  };
  return arms.some(({shoulder,elbow,wrist})=>
   crosses(shoulder,elbow,.42,3.4)||crosses(elbow,wrist,0,3.8));
 }
 function factory(w,h,source,geometry,makeCanvas,anatomy){
  const density=geometry.density;
  const orig=source.getImageData(0,0,w,h);
  const {data}=orig;
  const px=(x,y)=>4*(y*w+x),has=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&data[px(x,y)+3]>192;
  const rgb=i=>data[i]*65536+data[i+1]*256+data[i+2];
  const skin=new Set(Object.values(root.MareCharacterAppearance?.skins||{}).flatMap(s=>s.ramp).map(s=>Number.parseInt(s.slice(1),16)));
  const hair=new Set((root.MareCharacterAppearance?.hairs[geometry.hairColor]?.ramp||[]).map(c=>Number.parseInt(c.slice(1),16)));
  const isSkin=i=>skin.has(rgb(i))||data[i]>47&&data[i]>data[i+2]*1.28&&data[i+1]>data[i]*.34&&data[i+1]<data[i]*.92;
  const clothOwn=i=>{
   const r=data[i],g=data[i+1],b=data[i+2];
   return data[i+3]>192&&r>71&&g>54&&b>40&&r>=g&&g>=b&&r-g<58&&g-b<45&&!skin.has(rgb(i))&&!hair.has(rgb(i));
  };
  function coatOwn(x,y,armAlpha,torsoAlpha){
   const i=px(x,y);
   if(torsoAlpha!=null&&torsoAlpha<128)return false;
   if(!data[i+3]||(hair.has(rgb(i))&&!skin.has(rgb(i))))return false;
   if(geometry.female){
    if(clothOwn(i))return true;
    // Keep isolated shadows between verified shirt pixels on the same edge.
    // Exclude the signed skin palette so forearms still occlude the vest.
    if(!skin.has(rgb(i))&&isSkin(i))for(let gap=1;gap<=density*2;gap++){
     const left=x-gap>=0&&clothOwn(px(x-gap,y)),right=x+gap<w&&clothOwn(px(x+gap,y));
     const above=y-gap>=0&&clothOwn(px(x,y-gap)),below=y+gap<h&&clothOwn(px(x,y+gap));
     if(left&&right||above&&below)return true;
    }
   }
   if(armAlpha==null?coversArm(x/density,y/density,geometry):armAlpha>=128)return false;
   if(!geometry.female)return isSkin(i);
   // On the female rig the light undergarment is a reliable torso matte.
   // Extend its band only at the clavicle to carry the cloth over the shoulder;
   // the exposed arm is not used as the surface of the vest.
   const shoulder=x/density<geometry.neck.x?geometry.leftEdgeShoulder:geometry.rightEdgeShoulder;
   if(y>(shoulder?.y??geometry.neck.y+4.5)*density+density*1.5||!isSkin(i))return false;
   for(let dy=0;dy<=density*3;dy+=density)for(let dx=-density*2;dx<=density*2;dx+=density){
    if(x+dx>=0&&x+dx<w&&y+dy<h&&clothOwn(px(x+dx,y+dy)))return true;
   }
   return false;
  }
  function joinNeck(){
   const {neck,bodyNeck}=geometry;
   // The original head and moving torso can leave a small transparent
   // seam between their mounts. Sample only from this actor's own skin.
   const gapStart=round((Math.min(neck.y,bodyNeck.y)-2.5)*density);
   const gapEnd=round((Math.max(neck.y,bodyNeck.y)+3)*density);
   const left=clamp(round((Math.min(neck.x,bodyNeck.x)-3.5)*density),0,w);
   const right=clamp(round((Math.max(neck.x,bodyNeck.x)+3.5)*density),0,w);
   const skinAt=(x,y)=>has(x,y)&&isSkin(px(x,y));
   for(let x=left;x<right;x++)for(let y=Math.max(0,gapStart);y<Math.min(h,gapEnd);y++){
    const i=px(x,y);
    if(data[i+3]||!skinAt(x,y-1))continue;
    let end=y+1;
    while(end<h&&end-y<=density*3&&!data[px(x,end)+3])end++;
    if(end-y>density*3||!skinAt(x,end))continue;
    const head=data.slice(px(x,y-1),px(x,y-1)+4),body=data.slice(px(x,end),px(x,end)+4);
    for(let row=y;row<end;row++){
     const t=(row-y+1)/(end-y+1);
     const color=[0,1,2].map(channel=>round(mix(head[channel],body[channel],t)));
     data.set([...color,255],px(x,row));
    }
    y=end-1;
   }
   const neckRow=round(neck.y*density);
   for(let y=Math.max(0,neckRow-density);y<Math.min(gapEnd,h);y++){
    for(let x=left+1;x<right-1;x++){
     if(data[px(x,y)+3]||!skinAt(x-1,y))continue;
     let end=x+1;
     while(end<right&&end-x<=density&&!data[px(end,y)+3])end++;
     if(end-x>density||end>=right||!skinAt(end,y))continue;
     const a=data.slice(px(x-1,y),px(x-1,y)+3),b=data.slice(px(end,y),px(end,y)+3);
     for(let i=x;i<end;i++){
      const t=(i-x+1)/(end-x+1);
      data.set([round(mix(a[0],b[0],t)),round(mix(a[1],b[1],t)),round(mix(a[2],b[2],t)),255],px(i,y));
     }
     x=end-1;
    }
   }
   // Some side attack mounts also expose a thin horizontal overhang on
   // the forward edge of the neck. Keep any pixels supported by the body.
   const forward=geometry.direction==='east'?1:-1;
   const start=round((forward>0?Math.max(neck.x,bodyNeck.x):Math.min(neck.x,bodyNeck.x))*density);
   const extra=[];
   for(let y=Math.max(0,neckRow);y<Math.min(h,neckRow+3*density);y++){
    for(let distance=round(4.75*density);distance<10*density;distance++){
     const x=start+distance*forward;
     if(skinAt(x,y)&&!has(x,y-density)&&!has(x,y+density))extra.push(px(x,y));
    }
   }
   for(const i of extra)data.fill(0,i,i+4);
  }
  function fabric(){
   const p=source.createImageData(w,h),a=p.data,l=geometry.pelvis;
   const x0=clamp(round((l.x-25)*density),0,w),x1=clamp(round((l.x+25)*density),0,w);
   const y0=clamp(round((l.y-10)*density),0,h),y1=clamp(round((l.y+28)*density),0,h);
   const blue=(x,y)=>{
    if(!has(x,y))return false;
    const i=px(x,y),r=data[i],g=data[i+1],b=data[i+2];
    return b>r+5&&b>g+3&&r<112&&!isSkin(i);
   };
   // Measure the hem against each calf. The band follows a lifted knee
   // instead of following a fixed y coordinate or staining a hand.
   const hems=new Int16Array(w);hems.fill(-1);
   for(let x=x0;x<x1;x++)for(let y=y1-1;y>=Math.max(y0,round((l.y+7)*density));y--){
    if(!blue(x,y))continue;
    for(let d=1;d<=density*2;d++){
     if(blue(x,y+d))break;
     if(has(x,y+d)&&isSkin(px(x,y+d))){hems[x]=y;break;}
    }
    if(hems[x]>=0)break;
   }
   let visible=false;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    if(!blue(x,y))continue;
    const i=px(x,y),hem=hems[x]-y;
    const tone=clamp((data[i+2]-22)/62,0,1),seam=!blue(x-2,y)||!blue(x+2,y);
    const cuff=hems[x]>=0&&hem>=0&&hem<density*3&&blue(x,y+hem);
    const out=cuff?(hem<density*.6?[133,108,91]:hem<density*2.3?[232,218,192]:[195,179,156]):
     seam?[24,44,73]:[round(35+tone*36),round(66+tone*59),round(108+tone*69)];
    a.set([...out,data[i+3]],i);visible=true;
   }
   return visible?p:null;
  }
  function footwear(){
   const p=source.createImageData(w,h),a=p.data,{pelvis,lane}=geometry;
   const ankles=geometry.ankles.filter(Boolean);
   const start=clamp(round((pelvis.y+24)*density),0,h),end=clamp(round((lane.y+8)*density),0,h);
   const lo=clamp(round((pelvis.x-36)*density),0,w),hi=clamp(round((pelvis.x+36)*density),0,w);
   const bottom=new Int16Array(w);bottom.fill(-1);
   for(let y=start;y<end;y++)for(let x=lo;x<hi;x++)if(has(x,y)&&isSkin(px(x,y)))bottom[x]=y;
   let visible=false;
   for(let first=lo;first<hi;){
    if(bottom[first]<start){first++;continue;}
    let limit=first+1;
    while(limit<hi&&bottom[limit]>=start&&Math.abs(bottom[limit]-bottom[limit-1])<=density*2)limit++;
    for(let x=first;limit-first>=density&&x<limit;x++){
     const y=bottom[x],axis=x/density;
     const near=ankles.length===2&&Math.abs(ankles[1].x-axis)<Math.abs(ankles[0].x-axis)?ankles[1]:ankles[0];
     if(near&&Math.abs(near.x-axis)>16)continue;
     // The straps are registered to the painted foot, so they stay fixed
     // on the sole as the body moves through the cycle.
     const u=(x-first)/(limit-first-1||1),west=geometry.direction==='west';
     const along=west?1-u:u;
     for(let dy=0;dy<density*5;dy++){
      const target=y-dy;
      if(!has(x,target)||!isSkin(px(x,target)))continue;
      const i=px(x,target),height=dy/density;
      const strap=Math.min(Math.abs(height-(2.0+1.8*along)),Math.abs(height-(3.8-1.8*along)));
      const out=height<.65?[64,43,34]:height<1.55?[194,134,71]:
       along>.12&&along<.9&&strap<.55?(strap<.22?[154,91,54]:[82,49,35]):null;
      if(!out)continue;
      a.set([...out,data[i+3]],i);visible=true;
     }
    }
    first=limit;
   }
   return visible?p:null;
  }


  function transfer(draw,clip){
   // Scratch tile is cut to the garment domain and drawn directly in the
   // physical coordinate system; there is no 1x intermediate or enlargement.
   const {neck,pelvis,headTop}=geometry;
   const left=clamp(Math.floor((Math.min(neck.x,pelvis.x)-31)*density),0,w);
   const right=clamp(Math.ceil((Math.max(neck.x,pelvis.x)+31)*density),0,w);
   const top=clamp(Math.floor((clip?neck.y-8:headTop-17)*density),0,h);
   const bottom=clamp(Math.ceil((clip?pelvis.y+3:neck.y+7)*density),0,h);
   if(right<=left||bottom<=top)return null;
   const sw=right-left,sh=bottom-top;
   const tile=makeCanvas(sw,sh),cx=tile.getContext('2d');
   draw(brush(cx,density,left,top),geometry);
   const pattern=cx.getImageData(0,0,sw,sh).data;
   let armAlpha=null,torsoAlpha=null;
   if(clip&&anatomy){
    const x=anatomy.x-left,y=anatomy.y-top;
    cx.clearRect(0,0,sw,sh);
    // The torso pass already contains holes for the arm restoration.
    // Its underbody supplies the uninterrupted surface below those holes.
    for(const image of anatomy.torso)cx.drawImage(image,x,y);
    torsoAlpha=cx.getImageData(0,0,sw,sh).data;
    cx.clearRect(0,0,sw,sh);
    for(const image of anatomy.arms)cx.drawImage(image,x,y);
    armAlpha=cx.getImageData(0,0,sw,sh).data;
   }
   tile.width=tile.height=0;
   const p=source.createImageData(w,h),a=p.data;
   let visible=false;
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const j=4*(y*sw+x);
    if(pattern[j+3]<128)continue;
    const dx=x+left,dy=y+top,i=px(dx,dy);
    if(clip&&!coatOwn(dx,dy,armAlpha?.[j+3],torsoAlpha?.[j+3]))continue;
    a[i]=pattern[j];a[i+1]=pattern[j+1];a[i+2]=pattern[j+2];a[i+3]=255;
    visible=true;
   }
   return visible?p:null;
  }
  return {orig,fabric,footwear,transfer,joinNeck};
 }
 function hatPlacement(record,info,frame){
  const mount=hatMounts[record.direction];
  if(!mount||info.density!==4)return null;
  const [,neckX,neckY,top,edge,forward=0]=mount;
  const joint=readPose(record,info,frame,4)('NECK');
  const x=(joint?round(joint.x*4)-neckX:info.pivot.x-256)+forward;
  const y=joint?round(joint.y*4)-neckY:info.pivot.y-448;
  return {x,y,top:y+top,brim:y+edge};
 }
 function paintHatV3(result,record,frame,image,hairless){
  const {canvas,info}=result,placement=hatPlacement(record,info,frame);
  if(!placement||image?.width!==512||image.height!==512)return null;
  const {x,y,brim}=placement;
  const ctx=canvas.getContext('2d');
  if(hairless&&hairless.canvas.width===canvas.width&&hairless.canvas.height===canvas.height&&
     hairless.info.density===info.density&&hairless.info.pivot.x===info.pivot.x&&hairless.info.pivot.y===info.pivot.y){
   // The signed hairless variant supplies the anatomy under the brim. Copy
   // only the upper head, leaving the eyes, lower hair and equipment alone.
   const left=Math.max(0,136+x),top=Math.max(0,y);
   const width=Math.min(canvas.width,376+x)-left,height=Math.min(canvas.height,brim+1)-top;
   if(width>0&&height>0)ctx.putImageData(hairless.canvas.getContext('2d').getImageData(left,top,width,height),left,top);
  }
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,x,y);
  ctx.restore();
  return Math.max(info.visualHeight||0,info.pivot.y-placement.top);
 }
 function compose(result,record,frame,makeCanvas,anatomy=null,hatAssets=null){
  const hatV3=record.cosmeticLayers.head?.layer==='hat-v3';
  if(hatV3&&Object.keys(record.cosmeticLayers).length===1){
   const height=paintHatV3(result,record,frame,hatAssets?.image,hatAssets?.hairless);
   return {...result,info:{...result.info,cosmeticPasses:height===null?[]:['head'],visualHeight:height??result.info.visualHeight},bounds:undefined};
  }
  const {canvas,info}=result,{width:w,height:h}=canvas,density=info.density||4;
  const lane={x:info.pivot.x/density,y:info.pivot.y/density};
  const joint=readPose(record,info,frame,density);
  const female=record.body==='female'||record.body==='feminino';
  const neck=joint('NECK')||{x:lane.x,y:lane.y-(female?70:69)};
  const bodyMount=joint('BODY NECK');
  const bodyNeck=bodyMount||neck;
  const headTop=neck.y-(female?26:28);
  const nose=joint('NOSE')||{x:neck.x+(record.direction==='east'?4:record.direction==='west'?-4:0),y:neck.y-8};
  const pelvis=joint('HIP')||{x:neck.x,y:neck.y+25};
  const target=canvas.getContext('2d');
  const [leftEdgeShoulder,rightEdgeShoulder]=['LEFT','RIGHT'].map(side=>joint(side+' SHOULDER')).filter(Boolean).sort((a,b)=>a.x-b.x);
  const geometry={density,neck,bodyNeck,nose,pelvis,headTop,lane,female,direction:record.direction,
   hairColor:record.colorAppearance?.hairColor??record.headLook?.hairColor??'black',leftEdgeShoulder,rightEdgeShoulder,
   arms:['LEFT','RIGHT'].map(side=>({shoulder:joint(side+' SHOULDER'),elbow:joint(side+' ELBOW'),wrist:joint(side+' WRIST')||joint(side+' ARM')})),
   shoulderLeft:joint('LEFT SHOULDER'),shoulderRight:joint('RIGHT SHOULDER'),
   ankles:['LEFT','RIGHT'].map(a=>joint(a+' ANKLE')||joint(a+' LEG'))};
  const kit=factory(w,h,target,geometry,makeCanvas,anatomy);
  const passes=[],applied=[];
  if(anatomy&&bodyMount&&record.cosmeticLayers.coat)kit.joinNeck();
  for(const [slot,paint] of [
   ['legs',()=>kit.fabric()],
   ['boots',()=>kit.footwear()],
   ['coat',()=>kit.transfer(vest,true)],
   ['head',()=>hatV3?null:kit.transfer(hat,false)]
  ]){
   if(!record.cosmeticLayers[slot])continue;
   const layer=paint();
   if(!layer)continue;
   applied.push(layer);passes.push(slot);
  }
  if(applied.length){
   const dst=kit.orig.data;
   for(const {data} of applied)for(let i=0;i<data.length;i+=4)if(data[i+3]){
    dst[i]=data[i];dst[i+1]=data[i+1];dst[i+2]=data[i+2];dst[i+3]=data[i+3];
   }
   target.putImageData(kit.orig,0,0);
  }
  const hatHeight=hatV3?paintHatV3(result,record,frame,hatAssets?.image,hatAssets?.hairless):null;
  if(hatHeight!==null)passes.push('head');
  const next={...info,cosmeticPasses:passes};
  if(passes.includes('head'))next.visualHeight=hatHeight??Math.max(info.visualHeight||0,info.pivot.y-round((headTop-7)*density));
  return {...result,info:next,bounds:undefined};
 }
 const api={selection,project,decorate,compose,hatFile,hatHairless,hatPlacement};
 root.MareCosmeticArt=api;if(typeof module==='object')module.exports=api;
})(globalThis);
