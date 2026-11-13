'use strict';
((root)=>{
  const font='700 16px "Segoe UI", system-ui, sans-serif';
  const life={fill:'#e24562',shine:'#ff9eab',shade:'#9f2944',rim:'#825461'};
  const energy={fill:'#a16bea',shine:'#d4b6ff',shade:'#653ba5',rim:'#685682'};
  const titleFont='italic 700 12px "Segoe UI", system-ui, sans-serif';
  const levelFont='600 12px "Segoe UI", system-ui, sans-serif';
  const insignias=new Map();

  function measure(context,name){
    context.save();
    context.font=font;
    const width=Math.ceil(context.measureText(name).width)+4;
    context.restore();
    return width;
  }

  function bar(context,x,y,width,height,value,max,colors,rim=colors.rim,radius=3){
    const fraction=Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(1,value/max)):0;
    const fill=Math.round((width-2)*fraction);

    context.beginPath();
    context.roundRect(x+.5,y+.5,width-1,height-1,radius);
    context.fillStyle='#111521';
    context.fill();
    if(fill){
      context.save();
      context.clip();
      context.fillStyle=colors.fill;
      context.fillRect(x+1,y+1,fill,height-2);
      context.fillStyle=colors.shine;
      context.fillRect(x+1,y+1,fill,1);
      context.fillStyle=colors.shade;
      context.fillRect(x+1,y+height-2,fill,1);
      context.restore();
    }
    context.lineWidth=1;
    context.strokeStyle=rim;
    context.stroke();
  }

  function drawResources(context,x,y,{hp,maxHP,energy:currentEnergy,maxEnergy}){
    const width=62,left=x-width/2;
    const lifeHeight=11,energyHeight=9,energyY=y+lifeHeight+2;
    bar(context,left,y,width,lifeHeight,hp,maxHP,life,'#080d16',1);
    bar(context,left,energyY,width,energyHeight,currentEnergy,maxEnergy,energy,'#080d16',1);
  }

  function drawName(context,x,y,name,color='#fff8e9',textFont=font){
    context.font=textFont;
    context.textAlign='center';
    context.textBaseline='alphabetic';
    context.lineJoin='round';
    context.lineWidth=3;
    context.strokeStyle='#081219';
    context.strokeText(name,x,y);
    context.fillStyle=color;
    context.fillText(name,x,y);
  }

  function drawInsignia(context,x,y,art){
    if(!art||typeof root.Image!=='function')return;
    let sheet=insignias.get(art.sheet);
    if(!sheet){sheet=new root.Image();sheet.src=art.sheet;insignias.set(art.sheet,sheet);}
    if(!sheet.complete||!sheet.naturalWidth)return;
    const w=sheet.naturalWidth/4,h=sheet.naturalHeight/2;
    context.drawImage(sheet,Math.round(art.x/100*3)*w,art.y/100*h,w,h,x-10,y-10,20,20);
  }

  function draw(context,x,baseline,name,resources,identity={}){
    const center=Math.round(x),y=Math.round(baseline);
    const hasLevel=Number.isInteger(identity.level)&&identity.level>0;
    const nameY=y-(hasLevel?14:0);
    const label=identity.crewTag?'['+identity.crewTag+'] '+name:name;
    context.save();
    if(identity.title)drawName(context,center,nameY-17,identity.title,identity.titleColor||'#83d7f0',titleFont);
    drawName(context,center,nameY,label,identity.self?'#ffe29a':'#fff8e9');
    if(identity.insignia){
      drawInsignia(context,center-Math.ceil(context.measureText(label).width)/2-14,nameY-6,identity.insignia);
    }
    if(hasLevel)drawName(context,center,y,'Nv '+identity.level,'#e4eaf1',levelFont);
    if(resources)drawResources(context,center,y+3,resources);
    context.restore();
  }

  function drawEnemy(context,x,baseline,name,{hp,maxHP,width,boss=false,targeted=false}){
    const center=Math.round(x),y=Math.round(baseline);
    const rim=targeted?'#f3ca80':boss?'#bd8b59':life.rim;
    context.save();
    drawName(context,center,y,name);
    bar(context,center-width/2,y+3,width,11,hp,maxHP,life,rim);
    context.restore();
  }

  function drawNPCName(context,x,y,name){
    context.save();
    drawName(context,Math.round(x),Math.round(y),name,'#d27525');
    context.restore();
  }

  const api={measure,draw,drawEnemy,drawNPCName};
  root.MareMapPlayerHud=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
