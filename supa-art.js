'use strict';
/* Frame rectangles, durations and origins transcribed from the supplied JSON exports. */
((root)=>{
  const animations={
  "slash": {
    "image": "assets/akuma/supa/slash-arc.png?v=d511e2150a27",
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
        "duration": 59
      },
      {
        "x": 96,
        "y": 0,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 192,
        "y": 0,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 0,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 96,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 192,
        "y": 96,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 0,
        "y": 192,
        "w": 96,
        "h": 96,
        "duration": 59
      },
      {
        "x": 96,
        "y": 192,
        "w": 96,
        "h": 96,
        "duration": 59
      }
    ],
    "duration": 472
  },
  "shield": {
    "image": "assets/akuma/supa/spiral-ward.png?v=b778a2884c50",
    "anchor": {
      "kind": "origin",
      "x": 51,
      "y": 51
    },
    "frames": [
      {
        "x": 0,
        "y": 0,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 102,
        "y": 0,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 204,
        "y": 0,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 306,
        "y": 0,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 0,
        "y": 102,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 102,
        "y": 102,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 204,
        "y": 102,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 306,
        "y": 102,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 0,
        "y": 204,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 102,
        "y": 204,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 204,
        "y": 204,
        "w": 102,
        "h": 102,
        "duration": 63
      },
      {
        "x": 306,
        "y": 204,
        "w": 102,
        "h": 102,
        "duration": 63
      }
    ],
    "duration": 756
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
