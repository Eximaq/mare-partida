'use strict';
/* Composition only: original terrain/prop pixels are loaded from project assets. */
((root)=>{
  const O=root.MareOrange,images={},characters={},chunks=new Map(),failed=new Set();let manifest={ready:false},terrain=null,ocean=null,revision=0;
  const ready=i=>i?.complete&&i.naturalWidth>0;
  const monsterRenderSize=()=>root.MareNewIslandArt?.DEFAULT_MONSTER_RENDER_SIZE||80;
  function image(key,url){return new Promise(resolve=>{const i=new Image();i.onload=()=>{images[key]=i;failed.delete(key);revision++;chunks.clear();resolve(i);};i.onerror=()=>{failed.add(key);resolve(null);};i.src=url;});}
  const boot=Promise.all([
    fetch('assets/terrain/harbor-v2/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Terrain manifest unavailable');return r.json();}).then(async data=>{
      const urls=[...Object.values(data.sets).map(s=>s.url),...Object.values(data.variants||{}).flat()];await Promise.all(urls.map(url=>image(url,url)));
      terrain=root.MareOrangeTerrain.configure(O,data,images);
      ocean=document.createElement('canvas');ocean.width=ocean.height=O.TILE;const c=ocean.getContext('2d');c.imageSmoothingEnabled=false;root.MareTerrain.draw(c,terrain.bases.water,0,0,O.TILE);
      revision++;chunks.clear();
    }).catch(()=>{failed.add('terrain');}),
    image('buildings','pixellab-pip-generations/ilha-porto-20261018/port-buildings.png'),
    image('harbor','pixellab-pip-generations/porto-compacto-20261018/harbor-props.png')
  ]).then(()=>fetch('assets/orange-town/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(async data=>{
      if(!data)return;manifest=data;
      if(data.street)await image('street',data.street.url);
      if(data.buildings)await image('buildings',data.buildings.url);
      for(const [id,asset] of Object.entries(data.monsters||{})){
        const sheets={};for(const [name,a] of Object.entries(asset.animations||{}))sheets[name]=await image(id+'-'+name,a.url);
        characters[id]={...asset,sheets};
      }
    }).catch(()=>null));
  // New ground compositor draws cached pixel-art layers and 8-way autotiles.
  function chunk(cx,cy){
    const key=cx+','+cy+':'+revision;if(chunks.has(key))return chunks.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    if(terrain)root.MareOrangeTerrain.drawChunk(c,cx,cy,terrain);
    chunks.set(key,canvas);
    if(chunks.size>20)chunks.delete(chunks.keys().next().value);
    return canvas;
  }
  function ground(c,camera,width,height,time,reduced){
    // Animated base is always present beneath transparent sea-only chunk regions.
    // Integer world-space phase prevents camera-dependent waves or interpolation.
    const phase=reduced?0:Math.floor(time*2)%64;c.save();c.translate(phase,0);
    c.fillStyle=ocean?c.createPattern(ocean,'repeat'):'#235a65';c.fillRect(camera.x-phase,camera.y,width,height);c.restore();
    for(let y=Math.floor(camera.y/512);y<Math.min(4,Math.ceil((camera.y+height)/512));y++)for(let x=Math.floor(camera.x/512);x<Math.min(4,Math.ceil((camera.x+width)/512));x++)c.drawImage(chunk(x,y),x*512,y*512);
  }
  function prop(c,p){
    const img=images[p.kind==='building'?'buildings':'harbor'];if(!ready(img))return;
    const size=p.kind==='building'?(manifest.buildings?.cell_size||256):256;
    c.drawImage(img,(p.cell%2)*size,Math.floor(p.cell/2)*size,size,size,Math.round(p.x-p.width/2),Math.round(p.y-p.height),p.width,p.height);
  }
  const motion=new WeakMap();
  function monster(c,m,time){
    const a=characters[O.skins[m.type]?.id];if(!a)return false;
    const previous=motion.get(m),moving=previous&&Math.hypot(m.x-previous.x,m.y-previous.y)>.01;motion.set(m,{x:m.x,y:m.y});
    const action=moving&&!m.telegraph?'walk':'idle',anim=a.animations[action]||a.animations.idle,img=a.sheets[action]||a.sheets.idle;if(!anim||!ready(img))return false;
    const row=Math.max(0,a.directions.indexOf(m.emberFacing||'south')),frame=action==='walk'?Math.floor(time*(anim.fps||8))%(anim.frames||1):0;
    const fw=anim.frame_width||a.frame_width,fh=anim.frame_height||a.frame_height,anchor=anim.anchor||a.anchor||[fw/2,fh*.9],scale=monsterRenderSize()/Math.max(fw,fh);
    c.save();c.imageSmoothingEnabled=false;if(m.hit>0)c.filter='brightness(1.45)';c.drawImage(img,frame*fw,row*fh,fw,fh,Math.round(m.x-anchor[0]*scale),Math.round(m.y-anchor[1]*scale),Math.round(fw*scale),Math.round(fh*scale));c.restore();return true;
  }
  function environment(c,time,reduced){
    const r=O.returnPoint;c.save();c.strokeStyle='#bce0d2';c.lineWidth=2;c.beginPath();c.ellipse(r.x,r.y,reduced?27:27+Math.sin(time*2),11,0,0,Math.PI*2);c.stroke();c.textAlign='center';c.font='bold 11px Trebuchet MS';c.fillStyle='#f4e3b7';c.fillText('Voltar ao porto',r.x,r.y+28);c.restore();
  }
  function setWoodSource(){} // Preserve the existing game API; piers now use their native atlas.
  root.MareOrangeRenderer={boot,ground,prop,monster,environment,setWoodSource,stats:()=>({chunks:chunks.size,artReady:manifest.ready&&!!terrain&&failed.size===0,terrainReady:!!terrain,terrainStatus:terrain?.manifest.status,monsters:Object.keys(characters).length,missing:[...failed]})};
})(globalThis);
