'use strict';
/* Original PixelLab idle, walk and attack frames, packed without repainting. */
((root)=>{
  const meta={"sham":{"idle":{"size":48,"frames":1,"feet":[42,43,43,43],"fps":7},"walk":{"size":64,"frames":4,"feet":[52,51,51,52],"fps":7},"attack":{"size":56,"frames":9,"feet":[46,47,47,47],"fps":10}},"buchi":{"idle":{"size":48,"frames":1,"feet":[46,47,47,45],"fps":7},"walk":{"size":80,"frames":4,"feet":[71,63,63,70],"fps":7},"attack":{"size":68,"frames":9,"feet":[58,57,57,59],"fps":10}},"pearl":{"idle":{"size":48,"frames":1,"feet":[46,46,46,43],"fps":7},"walk":{"size":64,"frames":8,"feet":[54,53,53,56],"fps":7},"attack":{"size":64,"frames":6,"feet":[55,54,54,52],"fps":10}},"gin":{"idle":{"size":48,"frames":1,"feet":[42,43,43,43],"fps":7},"walk":{"size":56,"frames":8,"feet":[46,46,46,50],"fps":7},"attack":{"size":56,"frames":9,"feet":[46,47,47,47],"fps":10}},"chew":{"idle":{"size":48,"frames":1,"feet":[42,43,43,42],"fps":7},"walk":{"size":56,"frames":8,"feet":[46,47,47,46],"fps":7},"attack":{"size":56,"frames":9,"feet":[46,47,47,46],"fps":10}},"kuroobi":{"idle":{"size":48,"frames":1,"feet":[45,44,44,43],"fps":7},"walk":{"size":64,"frames":8,"feet":[54,52,52,52],"fps":7},"attack":{"size":64,"frames":7,"feet":[55,52,52,51],"fps":10}},"mr3":{"idle":{"size":64,"frames":1,"feet":[64,64,64,64],"fps":7},"walk":{"size":64,"frames":6,"feet":[64,64,64,64],"fps":7},"attack":{"size":64,"frames":9,"feet":[64,64,64,64],"fps":10}},"cabaji":{"idle":{"size":64,"frames":1,"feet":[64,64,64,64],"fps":7},"walk":{"size":64,"frames":6,"feet":[64,64,64,64],"fps":7},"attack":{"size":64,"frames":9,"feet":[64,64,64,64],"fps":10}},"marinheiro":{"idle":{"size":64,"frames":1,"feet":[64,64,64,64],"fps":7},"walk":{"size":64,"frames":8,"feet":[64,64,64,64],"fps":8},"attack":{"size":64,"frames":7,"feet":[64,64,64,64],"fps":10}},"helmeppo":{"idle":{"size":80,"frames":1,"feet":[66,66,66,66],"fps":7},"walk":{"size":80,"frames":8,"feet":[66,66,66,66],"fps":8},"attack":{"size":80,"frames":7,"feet":[66,66,66,66],"fps":10}}};
  const sheets={};
  if(typeof Image!=='undefined')for(const [id,actions] of Object.entries(meta))for(const action of Object.keys(actions)){const img=new Image();img.src='assets/new-islands/'+id+'/'+action+'.png';(sheets[id]??={})[action]=img;}
  const rows={south:0,west:1,east:2,north:3};
  const DEFAULT_MONSTER_RENDER_SIZE=80;
  const MONSTER_RENDER_SIZE={helmeppo:128};
  const DEFAULT_MONSTER_SCALE=DEFAULT_MONSTER_RENDER_SIZE/64;
  const LEGACY_MONSTER_SCALE=2.25;
  const legacyMonsterTypes=new Set(['sham','buchi','pearl','gin','chew','kuroobi']);
  function layout(monster){
    const states=meta[monster.type];if(!states)return null;
    const direction=monster.emberFacing||'south',row=rows[direction]??0,action=monster.attackAnim>0?'attack':monster.moving>0?'walk':'idle',a=states[action];
    const renderSize=MONSTER_RENDER_SIZE[monster.type]||DEFAULT_MONSTER_RENDER_SIZE;
    const scale=legacyMonsterTypes.has(monster.type)?LEGACY_MONSTER_SCALE:renderSize/a.size;
    return {row,action,a,scale,top:Math.round(monster.y+3-a.feet[row]*scale),width:Math.round(a.size*scale)};
  }
  function monster(ctx,m,time){const box=layout(m);if(!box)return false;const {row,action,a,scale,top,width}=box,img=sheets[m.type]?.[action];if(!img?.complete||!img.naturalWidth)return false;const frame=action==='attack'?Math.min(a.frames-1,Math.max(0,Math.floor((.58-m.attackAnim)*a.frames/.58))):action==='walk'?Math.floor(time*a.fps+m.bob)%a.frames:0;ctx.save();ctx.imageSmoothingEnabled=false;if(m.hit>0)ctx.filter='brightness(1.5)';ctx.drawImage(img,frame*a.size,row*a.size,a.size,a.size,Math.round(m.x-width/2),top,width,width);ctx.restore();return true;}
  root.MareNewIslandArt={monster,layout,meta,sheets,DEFAULT_MONSTER_RENDER_SIZE,DEFAULT_MONSTER_SCALE,LEGACY_MONSTER_SCALE};
})(globalThis);
