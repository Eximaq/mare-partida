'use strict';
((root)=>{
  const font='bold 14px Georgia, serif';
  const rims={
    pirate:['#865044','#c76b53','#f0b177'],
    marine:['#476d8b','#619ac1','#b1deed'],
    revolutionary:['#52704c','#82a96d','#c0d59e'],
    government:['#757a86','#aab1bf','#e7e9ed'],
    neutral:['#65584a','#94816b','#cab89f']
  };
  function measure(context,name){
    context.save();
    context.font=font;
    const width=Math.ceil(context.measureText(name).width)+16;
    context.restore();
    return width;
  }
  function bar(context,x,y,width,height,value,max,color){
    context.fillStyle='#06171e';
    context.fillRect(x,y,width,height);
    const fill=max>0&&Number.isFinite(value)?Math.round(width*Math.max(0,Math.min(1,value/max))):0;
    if(fill){
      context.fillStyle=color;
      context.fillRect(x,y,fill,height);
    }
  }
  function draw(context,x,baseline,name,{faction,tier,resources}={}){
    const width=measure(context,name),center=Math.round(x);
    const left=Math.round(center-width/2),right=left+width;
    const top=Math.round(baseline)-14,bottom=top+20,cut=4;
    const ranked=Number.isInteger(tier)&&tier>=1&&tier<=8&&Object.hasOwn(rims,faction)&&faction!=='neutral';
    const [low,mid,light]=rims[ranked?faction:'neutral'];
    context.save();
    context.beginPath();
    context.moveTo(left+cut,top);
    context.lineTo(right-cut,top);
    context.lineTo(right,top+cut);
    context.lineTo(right,bottom-cut);
    context.lineTo(right-cut,bottom);
    context.lineTo(left+cut,bottom);
    context.lineTo(left,bottom-cut);
    context.lineTo(left,top+cut);
    context.closePath();
    context.fillStyle='rgba(9, 22, 29, .91)';
    context.fill();
    context.strokeStyle='#071117';
    context.lineWidth=3;
    context.stroke();
    context.strokeStyle=ranked&&tier>=3?mid:low;
    context.lineWidth=1;
    context.stroke();
    if(ranked&&tier>=3){
      context.beginPath();
      context.moveTo(left+2,top+cut);
      context.lineTo(left+cut,top+1);
      context.lineTo(left+(tier>=5?12:7),top+1);
      context.moveTo(right-2,top+cut);
      context.lineTo(right-cut,top+1);
      context.lineTo(right-(tier>=5?12:7),top+1);
      context.strokeStyle=light;
      context.stroke();
    }
    context.font=font;
    context.textAlign='center';
    context.textBaseline='alphabetic';
    context.fillStyle='#fff0d4';
    context.fillText(name,center,top+14);
    if(resources){
      const x=center-30;
      bar(context,x,bottom+4,60,5,resources.hp,resources.maxHP,'#e25069');
      bar(context,x,bottom+11,60,3,resources.energy,resources.maxEnergy,'#9e71e5');
    }
    context.restore();
    return {left,top,bottom};
  }
  const api={measure,draw};
  root.MareMapPlayerHud=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
