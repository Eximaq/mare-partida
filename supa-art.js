'use strict';
/* Frame rectangles, durations and origins transcribed from the supplied JSON exports. */
((root)=>{
  const animations={
  "slash": {
    "image": "assets/akuma/supa/slash-arc.png",
    "anchor": {
      "kind": "origin",
      "x": 36,
      "y": 40
    },
    "frames": [
      {
        "x": 0,
        "y": 0,
        "w": 77,
        "h": 82,
        "duration": 77
      },
      {
        "x": 77,
        "y": 0,
        "w": 77,
        "h": 82,
        "duration": 77
      },
      {
        "x": 154,
        "y": 0,
        "w": 77,
        "h": 82,
        "duration": 77
      },
      {
        "x": 0,
        "y": 82,
        "w": 77,
        "h": 82,
        "duration": 77
      },
      {
        "x": 77,
        "y": 82,
        "w": 77,
        "h": 82,
        "duration": 77
      },
      {
        "x": 154,
        "y": 82,
        "w": 77,
        "h": 82,
        "duration": 77
      }
    ],
    "duration": 462
  },
  "shield": {
    "image": "assets/akuma/supa/shield-bubble.png",
    "anchor": {
      "kind": "origin",
      "x": 48,
      "y": 48
    },
    "frames": [
      {
        "x": 0,
        "y": 0,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 96,
        "y": 0,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 192,
        "y": 0,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 0,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 96,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 192,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 0,
        "y": 192,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 96,
        "y": 192,
        "w": 96,
        "h": 96,
        "duration": 111
      },
      {
        "x": 192,
        "y": 192,
        "w": 96,
        "h": 96,
        "duration": 111
      }
    ],
    "duration": 999
  }
};
  function frameAt(kind,elapsedMs,loop=false){
    const animation=animations[kind];
    if(!animation||!Number.isFinite(elapsedMs)||elapsedMs<0||(!loop&&elapsedMs>=animation.duration))return null;
    let time=elapsedMs%animation.duration;
    for(const frame of animation.frames){if(time<frame.duration)return frame;time-=frame.duration;}
    return null;
  }
  function draw(ctx,image,kind,x,y,elapsedMs,{loop=false,scale=1}={}){
    const frame=frameAt(kind,elapsedMs,loop),animation=animations[kind];
    if(!frame||!image?.complete||!image.naturalWidth)return false;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,Math.round(x-animation.anchor.x*scale),Math.round(y-animation.anchor.y*scale),frame.w*scale,frame.h*scale);
    ctx.restore();return true;
  }
  root.MareSupaArt={animations,frameAt,draw};
  if(typeof module!=='undefined')module.exports=root.MareSupaArt;
})(globalThis);
