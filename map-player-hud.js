'use strict';
((root)=>{
  const font='700 16px "Segoe UI", system-ui, sans-serif';
  const life={fill:'#e24562',shine:'#ff9eab',shade:'#9f2944',rim:'#825461',icon:'#ff899c'};
  const energy={fill:'#a16bea',shine:'#d4b6ff',shade:'#653ba5',rim:'#685682',icon:'#d4b6ff'};

  function measure(context,name){
    context.save();
    context.font=font;
    const width=Math.ceil(context.measureText(name).width)+4;
    context.restore();
    return width;
  }

  function bar(context,x,y,width,height,value,max,colors,rim=colors.rim){
    const fraction=Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(1,value/max)):0;
    const fill=Math.round((width-2)*fraction);

    context.beginPath();
    context.roundRect(x+.5,y+.5,width-1,height-1,3);
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
    const width=62,left=x-26,iconX=left-12;
    const lifeHeight=11,energyHeight=9,energyY=y+lifeHeight+2;
    const heartY=y+2,boltY=energyY+1;

    context.beginPath();
    context.moveTo(iconX+4,heartY+7);
    context.bezierCurveTo(iconX+2,heartY+5,iconX,heartY+4,iconX,heartY+2);
    context.bezierCurveTo(iconX,heartY,iconX+3,heartY-1,iconX+4,heartY+1);
    context.bezierCurveTo(iconX+5,heartY-1,iconX+8,heartY,iconX+8,heartY+2);
    context.bezierCurveTo(iconX+8,heartY+4,iconX+6,heartY+5,iconX+4,heartY+7);
    context.closePath();
    context.fillStyle=life.icon;
    context.fill();
    bar(context,left,y,width,lifeHeight,hp,maxHP,life);

    context.beginPath();
    context.moveTo(iconX+4,boltY-1);
    context.lineTo(iconX+1,boltY+3);
    context.lineTo(iconX+4,boltY+3);
    context.lineTo(iconX+3,boltY+7);
    context.lineTo(iconX+7,boltY+2);
    context.lineTo(iconX+4,boltY+2);
    context.lineTo(iconX+5,boltY-1);
    context.closePath();
    context.fillStyle=energy.icon;
    context.fill();
    bar(context,left,energyY,width,energyHeight,currentEnergy,maxEnergy,energy);
  }

  function drawName(context,x,y,name,color='#fff8e9'){
    context.font=font;
    context.textAlign='center';
    context.textBaseline='alphabetic';
    context.lineJoin='round';
    context.lineWidth=3;
    context.strokeStyle='#081219';
    context.strokeText(name,x,y);
    context.fillStyle=color;
    context.fillText(name,x,y);
  }

  function draw(context,x,baseline,name,resources){
    const center=Math.round(x),y=Math.round(baseline);
    context.save();
    drawName(context,center,y,name);
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
