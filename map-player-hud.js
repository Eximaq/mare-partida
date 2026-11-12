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

  function bar(context,x,y,height,value,max,colors){
    const width=62;
    const fraction=Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(1,value/max)):0;
    const fill=Math.round((width-2)*fraction);

    context.beginPath();
    context.roundRect(x+.5,y+.5,width-1,height-1,2);
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
    context.strokeStyle=colors.rim;
    context.stroke();
  }

  function drawResources(context,x,y,{hp,maxHP,energy:currentEnergy,maxEnergy}){
    const left=x-26,iconX=left-12;

    context.beginPath();
    context.moveTo(iconX+4,y+7);
    context.bezierCurveTo(iconX+2,y+5,iconX,y+4,iconX,y+2);
    context.bezierCurveTo(iconX,y,iconX+3,y-1,iconX+4,y+1);
    context.bezierCurveTo(iconX+5,y-1,iconX+8,y,iconX+8,y+2);
    context.bezierCurveTo(iconX+8,y+4,iconX+6,y+5,iconX+4,y+7);
    context.closePath();
    context.fillStyle=life.icon;
    context.fill();
    bar(context,left,y,7,hp,maxHP,life);

    const boltY=y+9;
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
    bar(context,left,boltY,5,currentEnergy,maxEnergy,energy);
  }

  function draw(context,x,baseline,name,resources){
    const center=Math.round(x),y=Math.round(baseline);
    context.save();
    context.font=font;
    context.textAlign='center';
    context.textBaseline='alphabetic';
    context.lineJoin='round';
    context.lineWidth=3;
    context.strokeStyle='#081219';
    context.strokeText(name,center,y);
    context.fillStyle='#fff8e9';
    context.fillText(name,center,y);
    if(resources)drawResources(context,center,y+5,resources);
    context.restore();
  }

  const api={measure,draw};
  root.MareMapPlayerHud=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
