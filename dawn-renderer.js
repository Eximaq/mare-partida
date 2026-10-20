'use strict';
/* Native exported composite; conditional foreground masks use its original pixels. */
((root)=>{
  const O=root.MareDawn,D=root.MareDawnData,images={},occlusions=new Map(),chunks=new Map(),missing=new Set();let ready=false;
  function load(url){return new Promise(resolve=>{const im=new Image();im.onload=()=>{images[url]=im;resolve(im);};im.onerror=()=>{missing.add(url);resolve(null);};im.src=url;});}
  const boot=Promise.all(['assets/dawn-manual/map.png','assets/dawn-manual/water.png',...new Set(D.props.map(p=>p.url))].map(load)).then(()=>{
    const source=images['assets/dawn-manual/map.png'];if(missing.size||source.naturalWidth!==D.width||source.naturalHeight!==D.height)return;
    for(const p of O.props){const e=document.createElement('canvas'),b=p.bounds;e.width=b.width;e.height=b.height;const c=e.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(source,Math.floor(b.x),Math.floor(b.y),b.width,b.height,0,0,b.width,b.height);c.globalCompositeOperation='destination-in';c.drawImage(images[p.url],0,0);occlusions.set(p.id,e);}
    ready=true;chunks.clear();
  });
  function chunk(x,y){const key=x+','+y;if(chunks.has(key))return chunks.get(key);const e=document.createElement('canvas');e.width=e.height=512;const c=e.getContext('2d');c.imageSmoothingEnabled=false;const im=images['assets/dawn-manual/map.png'];if(im?.naturalWidth)c.drawImage(im,-x*512,-y*512);chunks.set(key,e);if(chunks.size>20)chunks.delete(chunks.keys().next().value);return e;}
  function ground(c,camera,w,h){c.save();c.imageSmoothingEnabled=false;const water=images['assets/dawn-manual/water.png'];c.fillStyle=water?.naturalWidth?c.createPattern(water,'repeat'):'#127b99';c.fillRect(camera.x,camera.y,w,h);for(let y=Math.floor(camera.y/512);y<Math.min(Math.ceil(D.height/512),Math.ceil((camera.y+h)/512));y++)for(let x=Math.floor(camera.x/512);x<Math.min(Math.ceil(D.width/512),Math.ceil((camera.x+w)/512));x++)c.drawImage(chunk(x,y),x*512,y*512);c.restore();}
  function prop(c,p,actors=[]){const b=p.bounds;if(!actors.some(a=>a.y<p.y&&a.y>b.y&&a.x+48>b.x&&a.x-48<b.x+b.width))return;const im=occlusions.get(p.id);if(im){c.save();c.imageSmoothingEnabled=false;c.drawImage(im,Math.floor(b.x),Math.floor(b.y));c.restore();}}
  function environment(c,time,reduced){const p=O.returnPoint;c.save();c.strokeStyle='#c4e5df';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,reduced?27:27+Math.sin(time*2),11,0,0,Math.PI*2);c.stroke();c.fillStyle='#f4e5bf';c.font='bold 11px Trebuchet MS';c.textAlign='center';c.fillText('Voltar ao porto',p.x,p.y+30);c.restore();}
  root.MareDawnRenderer={boot,ground,prop,environment,stats:()=>({ready,chunks:chunks.size,objects:occlusions.size,missing:[...missing]})};
})(globalThis);
