/* East Blue cosmetics. Each fitted part is a transparent pass on the native HD frame. */
(function(root){
 'use strict';

 const layers={head:'hat',coat:'vest',legs:'shorts',boots:'sandals'};
 const selection=p=>{
  if(!p||p.zoanTransformed||p.equipment?.visual_completo!=null)return null;
  const art=root.MareCosmetics;
  const selected=art?.visualSelection(p.cosmetics?.equipped??p.cosmetics);
  if(!selected)return null;
  const supported=Object.fromEntries(Object.entries(selected).filter(([slot,id])=>art.get(id)?.layer===layers[slot]));
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
 function decorate(source,shown){
  if(!source||!Object.keys(shown).length)return source;
  const pieces=Object.entries(layers).filter(([slot])=>shown[slot]);
  return {...source,cosmeticLayers:Object.fromEntries(pieces.map(([slot,layer])=>[slot,{id:shown[slot],layer}]))};
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
  const center=side?mix(neck.x,nose.x,.36):nose.x;
  const level=clamp(Math.min(nose.y-6,headTop+12),headTop+7,headTop+12);
  const shape=(color,p)=>ink.poly(color,p.map(([x,y])=>[center+x*d,level+y]));
  shape('#45271d',[[-width-1,0],[-width-1,-2],[-width+2,-4],[-9,-5],[-8,-11],[-5,-14],[4,-14],[8,-12],[10,-7],[10,-5],[width-1,-3],[width+1,-1],[width,2],[3,4],[-7,3]]);
  shape('#b8793d',[[-width,-1],[-width+2,-3],[-8,-5],[9,-4],[width-2,-3],[width,-1],[width-2,1],[5,2],[-8,2]]);
  shape('#eabc69',[[-width+2,-2],[-8,-5],[7,-4],[width-3,-3],[width-2,-1],[5,1],[-7,1]]);
  shape('#b16d3a',[[-9,-4],[-7,-11],[-4,-13],[4,-13],[7,-11],[9,-4],[4,-3],[-4,-3]]);
  shape('#e4a853',[[-7,-7],[-6,-11],[-3,-12],[4,-12],[7,-11],[8,-7],[5,-6],[-4,-6]]);
  shape('#f5d18a',[[-5,-11],[-3,-12],[4,-12],[6,-11],[3,-10],[-3,-10]]);
  shape('#803b34',[[-8,-7],[-4,-6],[5,-6],[9,-7],[9,-3],[5,-2],[-4,-2],[-9,-4]]);
  shape('#bd5852',[[-8,-7],[-4,-6],[5,-6],[9,-7],[8,-5],[4,-4],[-4,-4],[-8,-5]]);
  for(const [x,y] of [[-7,-10],[-4,-9],[-1,-11],[2,-8],[5,-10],[-12,-1],[-8,0],[7,0],[11,-1]])ink.rect('#f6cf83',center+x*d,level+y,1,1);
 }

 // Fit the two panels on the actual neck/shoulder/hip triangle. The open
 // front follows the clavicles; it does not start below the shoulder line.
 function vest(ink,{neck,pelvis,shoulderLeft,shoulderRight,direction,female}){
  const side=direction==='east'||direction==='west',back=direction==='north',east=direction==='east';
  const left=Math.min(shoulderLeft?.x??Infinity,shoulderRight?.x??Infinity);
  const right=Math.max(shoulderLeft?.x??-Infinity,shoulderRight?.x??-Infinity);
  const spread=side?10:female?10.5:12.5;
  const actual=Number.isFinite(left)&&Math.abs(left-neck.x)<24&&Math.abs(right-neck.x)<24;
  const a=actual?Math.min(left-1.8,neck.x-spread):neck.x-spread;
  const b=actual?Math.max(right+1.8,neck.x+spread):neck.x+spread;
  const shoulderY=Math.min(shoulderLeft?.y??Infinity,shoulderRight?.y??Infinity);
  const top=Number.isFinite(shoulderY)?Math.max(neck.y-4,Math.min(neck.y,shoulderY-2.4)):neck.y-1;
  const hem=Math.max(top+14,pelvis.y-.6);
  const lean=clamp(pelvis.x-neck.x,-14,14),waist=neck.x+lean;
  const waistSpan=(b-a)*(side?.68:female?.75:.86);
  const map=(u,v)=>[mix(mix(a,b,u),waist+(u-.5)*waistSpan,v*.75),mix(top,hem,v)];
  const fill=(c,points,mirror=false)=>ink.poly(c,points.map(([u,v])=>map(mirror?1-u:u,v)));
  const stitches=(array,color,mirror=false)=>array.forEach(([u,v])=>{
   const [x,y]=map(mirror?1-u:u,v);ink.rect(color,x,y,.7,.42);
  });

  if(back||side){
   const mirror=side&&!east;
   // Back and side use one continuous drape over the shoulder.
   fill('#672b31',[[.02,.20],[.16,.07],[.38,.01],[.53,.1],[.63,.06],[.83,.005],[.97,.15],[.99,.32],[.86,.46],[.95,.86],[.89,1],[.09,1],[.04,.86],[.13,.47]],mirror);
   fill('#bf493f',[[.065,.22],[.19,.115],[.38,.056],[.53,.145],[.64,.107],[.82,.048],[.925,.176],[.94,.31],[.81,.45],[.90,.86],[.86,.946],[.13,.948],[.089,.86],[.18,.46]],mirror);
   fill('#df6752',[[.13,.23],[.23,.125],[.39,.11],[.55,.18],[.78,.121],[.875,.19],[.80,.28],[.62,.31],[.41,.25],[.23,.34]],mirror);
   fill('#f38a68',[[.18,.21],[.24,.15],[.39,.13],[.56,.20],[.77,.146],[.81,.18],[.57,.23],[.37,.183]],mirror);
   fill('#8e3439',[[.14,.44],[.23,.35],[.22,.52],[.30,.74],[.20,.89],[.12,.87],[.185,.65]],mirror);
   fill('#9b3b41',[[.55,.45],[.77,.38],[.825,.51],[.73,.57],[.83,.86],[.77,.92],[.52,.92],[.63,.79],[.55,.66]],mirror);
   fill('#cb5445',[[.41,.32],[.53,.33],[.57,.51],[.49,.67],[.56,.91],[.44,.92],[.40,.72],[.46,.49]],mirror);
   if(side){
    fill('#983c3c',[[.68,.16],[.84,.11],[.87,.25],[.80,.4],[.86,.58],[.91,.88],[.83,.94],[.78,.67],[.74,.52],[.73,.34]],mirror);
    fill('#ee785a',[[.78,.16],[.84,.13],[.84,.24],[.78,.39],[.815,.55],[.87,.87],[.83,.90],[.79,.62],[.742,.42]],mirror);
    stitches([[.83,.58],[.841,.70],[.866,.80]],'#c98b60',mirror);
   }
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
 function factory(w,h,source,geometry,makeCanvas){
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
  function coatOwn(x,y){
   const i=px(x,y);
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
   if(coversArm(x/density,y/density,geometry))return false;
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
  function fabric(){
   const p=source.createImageData(w,h),a=p.data,l=geometry.pelvis;
   const x0=clamp(round((l.x-25)*density),0,w),x1=clamp(round((l.x+25)*density),0,w);
   const y0=clamp(round((l.y-10)*density),0,h),y1=clamp(round((l.y+28)*density),0,h);
   const blue=(x,y)=>{
    if(!has(x,y))return false;
    const i=px(x,y),r=data[i],g=data[i+1],b=data[i+2];
    return b>r+5&&b>g+3&&r<112&&!isSkin(i);
   };
   const step=Math.max(2,density-1);
   let visible=false;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    if(!blue(x,y))continue;
    const i=px(x,y),nearBottom=!blue(x,y+step*2)&&has(x,y+step)&&isSkin(px(x,y+step));
    const tone=clamp((data[i+2]-20)/63,0,1),seam=!blue(x-2,y)||!blue(x+2,y);
    const out=nearBottom?[70,113,151]:seam?[23,44,72]:[round(27+tone*26),round(57+tone*37),round(89+tone*48)];
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
   for(let x=lo;x<hi;x++){
    const y=bottom[x];if(y<start||bottom[x-density]<start&&bottom[x+density]<start)continue;
    const axis=x/density;
    const near=ankles.length===2&&Math.abs(ankles[1].x-axis)<Math.abs(ankles[0].x-axis)?ankles[1]:ankles[0];
    // Profile sheets may only expose the nearer foot. Never manufacture the other foot.
    if(near&&Math.abs(near.x-axis)>16)continue;
    for(let dy=0;dy<density*5;dy++){
     const target=y-dy;
     if(!has(x,target)||!isSkin(px(x,target)))continue;
     const i=px(x,target);
     if(dy<density) a.set([72,45,33,data[i+3]],i);
     else if(dy<density*2)a.set([139,91,53,data[i+3]],i);
     else if((Math.floor(x/density)+Math.floor(dy/density))%7<3)a.set(dy<density*3?[179,122,78,data[i+3]]:[110,68,48,data[i+3]],i);
     else continue;
     visible=true;
    }
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
   tile.width=tile.height=0;
   const p=source.createImageData(w,h),a=p.data;
   let visible=false;
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const j=4*(y*sw+x);
    if(pattern[j+3]<128)continue;
    const dx=x+left,dy=y+top,i=px(dx,dy);
    if(clip&&!coatOwn(dx,dy))continue;
    a[i]=pattern[j];a[i+1]=pattern[j+1];a[i+2]=pattern[j+2];a[i+3]=255;
    visible=true;
   }
   return visible?p:null;
  }
  return {orig,fabric,footwear,transfer};
 }
 function compose(result,record,frame,makeCanvas){
  const {canvas,info}=result,{width:w,height:h}=canvas,density=info.density||4;
  const lane={x:info.pivot.x/density,y:info.pivot.y/density};
  const joint=readPose(record,info,frame,density);
  const female=record.body==='female'||record.body==='feminino';
  const neck=joint('NECK')||{x:lane.x,y:lane.y-(female?70:69)};
  const headTop=neck.y-(female?26:28);
  const nose=joint('NOSE')||{x:neck.x+(record.direction==='east'?4:record.direction==='west'?-4:0),y:neck.y-8};
  const pelvis=joint('HIP')||{x:neck.x,y:neck.y+25};
  const target=canvas.getContext('2d');
  const [leftEdgeShoulder,rightEdgeShoulder]=['LEFT','RIGHT'].map(side=>joint(side+' SHOULDER')).filter(Boolean).sort((a,b)=>a.x-b.x);
  const geometry={density,neck,nose,pelvis,headTop,lane,female,direction:record.direction,
   hairColor:record.colorAppearance?.hairColor??record.headLook?.hairColor??'black',leftEdgeShoulder,rightEdgeShoulder,
   arms:['LEFT','RIGHT'].map(side=>({shoulder:joint(side+' SHOULDER'),elbow:joint(side+' ELBOW'),wrist:joint(side+' WRIST')||joint(side+' ARM')})),
   shoulderLeft:joint('LEFT SHOULDER'),shoulderRight:joint('RIGHT SHOULDER'),
   ankles:['LEFT','RIGHT'].map(a=>joint(a+' ANKLE')||joint(a+' LEG'))};
  const kit=factory(w,h,target,geometry,makeCanvas);
  const passes=[],applied=[];
  for(const [slot,paint] of [
   ['legs',()=>kit.fabric()],
   ['boots',()=>kit.footwear()],
   ['coat',()=>kit.transfer(vest,true)],
   ['head',()=>kit.transfer(hat,false)]
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
  const next={...info,cosmeticPasses:passes};
  if(passes.includes('head'))next.visualHeight=Math.max(info.visualHeight||0,info.pivot.y-round((headTop-7)*density));
  return {...result,info:next,bounds:undefined};
 }
 const api={selection,project,decorate,compose};
 root.MareCosmeticArt=api;if(typeof module==='object')module.exports=api;
})(globalThis);
