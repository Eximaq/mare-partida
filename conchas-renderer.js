'use strict';
/* Reuses existing PixelLab pixels and the shared whole-sprite terrain compositor. */
((root)=>{
  const O=root.MareConchas,images={},chunks=new Map(),failed=new Set();let terrain=null,ocean=null;
  function load(url){return new Promise(resolve=>{const im=new Image();im.onload=()=>{images[url]=im;resolve(im);};im.onerror=()=>{failed.add(url);resolve(null);};im.src=url;});}
  const sources={building:'pixellab-pip-generations/ilha-porto-20261018/port-buildings.png',harbor:'pixellab-pip-generations/porto-compacto-20261018/harbor-props.png',ruin:'assets/ruinas-brasas/ruin-props.png'};
  const boot=Promise.all([
    ...Object.values(sources).map(load),
    fetch('assets/terrain/harbor-v2/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Terrain unavailable');return r.json();}).then(async source=>{
      // Material graph is shared; Orange Town's location-specific soil is not copied.
      const data={...source,layout:{}};
      await Promise.all([...Object.values(data.sets).map(s=>s.url),...Object.values(data.variants||{}).flat()].map(load));
      terrain=root.MareHarborTerrain.configure(O,data,images);
      ocean=document.createElement('canvas');ocean.width=ocean.height=O.TILE;const c=ocean.getContext('2d');c.imageSmoothingEnabled=false;root.MareTerrain.draw(c,terrain.bases.water,0,0,O.TILE);chunks.clear();
    }).catch(()=>failed.add('terrain'))
  ]);
  function chunk(x,y){const key=x+','+y;if(chunks.has(key))return chunks.get(key);const e=document.createElement('canvas');e.width=e.height=512;const c=e.getContext('2d');c.imageSmoothingEnabled=false;if(terrain)root.MareHarborTerrain.drawChunk(c,x,y,terrain);chunks.set(key,e);if(chunks.size>20)chunks.delete(chunks.keys().next().value);return e;}
  function ground(c,camera,w,h,time,reduced){
    c.save();c.imageSmoothingEnabled=false;const phase=reduced?0:Math.floor(time*2)%64;c.translate(phase,0);c.fillStyle=ocean?c.createPattern(ocean,'repeat'):'#235a65';c.fillRect(camera.x-phase,camera.y,w,h);c.restore();
    for(let y=Math.floor(camera.y/512);y<Math.min(4,Math.ceil((camera.y+h)/512));y++)for(let x=Math.floor(camera.x/512);x<Math.min(4,Math.ceil((camera.x+w)/512));x++)c.drawImage(chunk(x,y),x*512,y*512);
  }
  function prop(c,p){const img=images[sources[p.kind]];if(!img?.naturalWidth)return;const size=p.kind==='ruin'?128:256,cols=p.kind==='ruin'?4:2;c.save();c.imageSmoothingEnabled=false;c.drawImage(img,(p.cell%cols)*size,Math.floor(p.cell/cols)*size,size,size,Math.round(p.x-p.width/2),Math.round(p.y-p.height),p.width,p.height);c.restore();}
  function environment(c,time,reduced){
    const r=O.returnPoint;c.save();c.strokeStyle='#c4dfdf';c.lineWidth=2;c.beginPath();c.ellipse(r.x,r.y,reduced?27:27+Math.sin(time*2),11,0,0,Math.PI*2);c.stroke();c.textAlign='center';c.font='bold 11px Trebuchet MS';c.fillStyle='#f4e3b7';c.fillText('Voltar ao porto',r.x,r.y+28);c.restore();
  }
  root.MareConchasRenderer={boot,ground,prop,environment,stats:()=>({ready:!!terrain&&failed.size===0,chunks:chunks.size,missing:[...failed]})};
})(globalThis);
