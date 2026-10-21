'use strict';
(()=>{
  const $=id=>document.getElementById(id),catalog=MarePaperDollCatalog;
  const labels={body:'Corpo-base',pants:'Calças',boots:'Botas',outfit:'Roupa / armadura',hair:'Cabelo',accessory:'Acessório',weapon:'Arma'};
  const names={south:'Sul · Frente',north:'Norte · Costas',west:'Oeste · Esquerda',east:'Leste · Direita'};
  const codes={'missing-source':'Fonte modular ausente','missing-piece':'Peça ausente','missing-animation':'Animação ausente','unsupported-pose':'Pose incompatível','incompatible-animation':'Sequência incompatível','incompatible-rig':'Rig incompatível','loading-image':'Carregando PNG','failed-image':'Falha ao carregar PNG','invalid-sheet-size':'Dimensões da folha incorretas','empty-frame':'Frame vazio','unreadable-image':'PNG ilegível','invalid-transform':'Pivô ou offset inválido','unmapped-equipment':'Equipamento sem representação modular','unsupported-character':'Perfil humano não suportado','incompatible-weapon':'Arma incompatível com a categoria de ação','unapproved-piece':'Peça sem aprovação'};
  codes['missing-direction']='Direção ainda sem frames';
  codes['missing-socket']='Encaixe da arma ausente ou inválido';
  codes['invalid-attachment-source']='Fonte da peça rígida inválida';
  codes['unsupported-layer-kind']='Tipo de camada não suportado';
  let runtime=catalog.createRuntime({getImage:MareFactionSprites.image}),rigId=catalog.sharedRig.id,imported=null,objectUrls=[];
  let importedSource=null,importedFileNames=new Map();
  const player={classId:'sword',factionId:'pirate',equipment:{weapon:{def:0}}};
  function poseAnimationId(action=$('animation').value){return runtime.rig(rigId).animations[action]?action:catalog.animationId(player,action);}
  function selectedClip(){return runtime.rig(rigId).animations[poseAnimationId()];}
  function buildIdentity(){
    for(const [id,values]of [['classId',catalog.classes],['factionId',catalog.factions]]){
      $(id).replaceChildren(...Object.entries(values).map(([value,item])=>{const option=document.createElement('option');option.value=value;option.textContent=item.name;return option;}));$(id).value=player[id];
      $(id).addEventListener('change',()=>{pause();player[id]=$(id).value;if(id==='classId'){player.equipment.weapon={def:catalog.classes[player.classId].weapon};buildWeapons();}$('frame').value=0;elapsed=0;render();});
    }
  }
  function buildWeapons(){
    const category=catalog.profile(player).category,entries=Object.entries(catalog.weaponItems).filter(([,v])=>v[0]===category);
    $('weapon').replaceChildren(...entries.map(([id,[,name]])=>{const option=document.createElement('option');option.value=id;option.textContent=name;return option;}));
    const none=document.createElement('option');none.value='none';none.textContent='Removida · Visual padrão';$('weapon').append(none);$('weapon').value=player.equipment.weapon?.def??'none';
    $('animation').querySelector('[value=attack]').textContent='Attack · '+catalog.categories[category];
  }
  const hidden=new Set();let playing=false,elapsed=0,last=0,lastState={};
  const boards=new Map();
  function buildBoards(){
    $('boards').replaceChildren();boards.clear();
    for(const direction of MarePaperDoll.directions){
      const section=document.createElement('article');section.className='board';section.dataset.direction=direction;
      const title=document.createElement('h2');title.textContent=names[direction];section.append(title);
      const comparison=document.createElement('div');comparison.className='comparison';const canvases=[];
      for(const title of ['Sprite original','Paper Doll · Fallback']){
        const figure=document.createElement('figure'),caption=document.createElement('figcaption'),canvas=document.createElement('canvas');
        caption.textContent=title;canvas.width=300;canvas.height=300;canvas.setAttribute('aria-label',title+' · '+names[direction]);figure.append(caption,canvas);comparison.append(figure);canvases.push(canvas);
      }
      const note=document.createElement('p');section.append(comparison,note);$('boards').append(section);boards.set(direction,{section,canvases,note});
    }
  }
  function buildLayers(){
    $('layers').replaceChildren();
    for(const slot of MarePaperDoll.slots){
      const label=document.createElement('label');label.className='layer';
      const check=document.createElement('input');check.type='checkbox';check.checked=!hidden.has(slot);check.dataset.layer=slot;
      const span=document.createElement('span');span.textContent=labels[slot];const small=document.createElement('small');small.id='layer-'+slot;span.append(small);label.append(check,span);$('layers').append(label);
      check.addEventListener('change',()=>{if(check.checked)hidden.delete(slot);else hidden.add(slot);render();});
    }
  }
  function appearance(){
    if(!imported)return catalog.appearance(player);
    const result={rigId,pieces:{...imported.pieces},blocked:[]};
    for(const [equipmentSlot,binding]of Object.entries(imported.bindings||{})){
      const item=player.equipment[equipmentSlot];if(!item)continue;
      const pieceId=binding.items?.[item.def];
      if(pieceId)result.pieces[binding.slot]=pieceId;
      else result.blocked.push({slot:binding.slot,pieceId:String(item.def),code:'unmapped-equipment'});
    }
    return result;
  }
  function source(context,direction,animationId,frameIndex,scale){
    const reference=catalog.referenceFor(player,animationId);if(!reference)return false;
    const meta=MareFactionSprites.assets[reference.assetId]?.meta.animations[reference.action];if(!meta)return false;
    return MareFactionSprites.draw(context,reference.assetId,150,240,{action:reference.action,direction,time:reference.animated?frameIndex/meta.fps+.000001:0,scale});
  }
  function pivot(c,scale,plan=null){
    c.save();c.strokeStyle='#e5b85b';c.lineWidth=1;c.beginPath();c.moveTo(0,240.5);c.lineTo(300,240.5);c.moveTo(150.5,0);c.lineTo(150.5,300);c.stroke();c.strokeStyle='#bfe9dc';c.strokeRect(147.5,237.5,6,6);c.fillStyle='#f4d595';c.font='11px system-ui';c.fillText('Pivô dos pés · '+scale+'×',8,292);
    if(plan?.valid)for(const layer of plan.layers)if(layer.offsetX||layer.offsetY||layer.kind==='rigid-attachment'){
      const clip=layer.kind==='rigid-attachment'?runtime.piece(layer.pieceId).animations[layer.animationId]:null;
      const source=clip?(clip.sources?.[layer.direction]||clip.source):null;
      const x=150+(layer.offsetX+(source?source.anchorX-layer.pivotX:0))*scale,y=240+(layer.offsetY+(source?source.anchorY-layer.pivotY:0))*scale;
      c.strokeStyle='#f08d7d';c.strokeRect(x-3.5,y-3.5,7,7);c.fillStyle='#f4d595';c.fillText(labels[layer.slot]+(source?' · Encaixe':''),x+5,y-5);
    }
    c.restore();
  }
  function detail(term,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=String(value);$('readout').append(dt,dd);}
  function render(){
    const animationId=$('animation').value,rig=runtime.rig(rigId),clip=selectedClip(),index=Math.min(Number($('frame').value),clip.frames-1),scale=Number($('zoom').value),config=appearance();
    $('frame').max=clip.frames-1;$('frame').value=index;$('frameLabel').textContent=(index+1)+' / '+clip.frames;
    const visibleDirections=$('direction').value==='all'?MarePaperDoll.directions:[$('direction').value];document.body.classList.toggle('single',visibleDirections.length===1);
    const plans=[],differences=[];let referenceReady=true;
    for(const [direction,board]of boards){
      board.section.hidden=!visibleDirections.includes(direction);if(board.section.hidden)continue;
      const pose={animationId:poseAnimationId(animationId),direction,frameIndex:index},plan=runtime.resolve(config,pose,{allowDraft:!!imported});plans.push(plan);
      const [original,result]=board.canvases.map(c=>c.getContext('2d',{willReadFrequently:true}));
      original.clearRect(0,0,300,300);result.clearRect(0,0,300,300);const loaded=source(original,direction,animationId,index,scale);referenceReady=referenceReady&&loaded;
      const drawn=runtime.draw(result,config,pose,150,240,{scale,hidden:[...hidden],allowDraft:!!imported});
      if(!drawn)source(result,direction,animationId,index,scale);
      const a=original.getImageData(0,0,300,300).data,b=result.getImageData(0,0,300,300).data;let changed=0;
      for(let n=0;n<a.length;n+=4)if(a[n]!==b[n]||a[n+1]!==b[n+1]||a[n+2]!==b[n+2]||a[n+3]!==b[n+3])changed++;
      differences.push({direction,pixels:changed});
      if($('pivots').checked){pivot(original,scale);pivot(result,scale,plan);}
      board.canvases[1].previousElementSibling.textContent=drawn?'Paper Doll · Pacote em inspeção':'Paper Doll · Fallback';
      const reference=catalog.referenceFor(player,animationId);
      board.note.textContent=reference?.animated===false?reference.note+(drawn?' Pacote modular local em inspeção.':' O pacote modular continua pendente.'):!loaded?'Referência ainda não carregada ou indisponível.':drawn?'Frame '+index+' compartilhado · '+plan.layers.length+' camadas. Diferença: '+changed+' pixels; pode incluir mudanças de aparência.':'Fallback do sprite original · '+plan.missing.length+' pendências · '+changed+' pixels de diferença.';
    }
    const first=plans[0],valid=plans.length>0&&plans.every(p=>p.valid),readyDirections=plans.filter(p=>p.valid).map(p=>p.pose.direction);
    $('status').textContent=valid?'Pacote local sincronizado para inspeção. Aprovação artística e integração não concedidas por esta ferramenta.':'Fallback ativo: faltam camadas modulares compatíveis. O personagem original está preservado.';
    $('status').classList.toggle('valid',valid);
    if(!valid&&readyDirections.length)$('status').textContent='Pacote parcial em inspeção: '+readyDirections.map(d=>names[d]).join(', ')+'. As outras direções usam fallback. Sem aprovação artística.';
    for(const slot of MarePaperDoll.slots){
      const p=runtime.piece(config.pieces[slot]);$('layer-'+slot).textContent=!config.pieces[slot]?'Sem peça opcional':p?.available===false?'Fonte modular ausente':p?.name||config.pieces[slot];
    }
    $('missing').replaceChildren();const unique=new Map();for(const p of plans)for(const m of p.missing)unique.set(m.slot+'|'+m.pieceId+'|'+m.code,m);
    for(const m of unique.values()){const li=document.createElement('li');li.textContent=(labels[m.slot]||m.slot)+': '+(codes[m.code]||m.code)+(m.pieceId?' · '+m.pieceId:'');$('missing').append(li);}
    if(!unique.size){const li=document.createElement('li');li.textContent='Nenhuma falha estrutural nesta pose. Ainda requer inspeção artística de todos os frames.';$('missing').append(li);}
    $('readout').replaceChildren();detail('Rig / Célula',rig.id+' · '+rig.frameWidth+'×'+rig.frameHeight);detail('Pivô nativo',rig.pivotX+', '+rig.pivotY);const originalMeta=MareFactionSprites.assets[catalog.referenceFor(player,animationId).assetId].meta;detail('Fonte original',originalMeta.frame_size.join('×')+' · Pivô '+originalMeta.anchor.join(', '));detail('Corpo comum',config.pieces.body);detail('Categoria',catalog.categories[catalog.profile(player).category]);detail('Sequência',clip.frames+' frames · '+clip.fps+' FPS');detail('Peça de arma',config.pieces.weapon);detail('Peça de roupa',config.pieces.outfit);detail('Cache',runtime.stats().cacheEntries+' frames · '+runtime.stats().cacheBytes+' bytes');
    const transforms=first?.layers.map(({slot,pieceId,animationId,direction,frameIndex,pivotX,pivotY,offsetX,offsetY,zIndex,kind,socket})=>({slot,pieceId,animationId,direction,frameIndex,pivotX,pivotY,offsetX,offsetY,zIndex,kind,socket}));$('transforms').textContent=JSON.stringify(transforms||[],null,2);
    lastState={mode:valid?'draft':'fallback',artworkValidated:false,referenceReady,appearance:config,profile:catalog.profile(player),reference:catalog.referenceFor(player,animationId),pose:{animationId:poseAnimationId(animationId),frameIndex:index},differences,missing:[...unique.values()],stats:runtime.stats(),hidden:[...hidden]};
    lastState.readyDirections=readyDirections;
    if(!valid&&readyDirections.length)lastState.mode='partial-draft';
    attachmentControls();
  }
  function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
  for(const id of ['animation','direction','zoom','pivots'])$(id).addEventListener('change',()=>{if(id==='animation'){$('frame').value=0;elapsed=0;pause();}render();});
  $('frame').addEventListener('input',()=>{pause();render();});
  $('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pausar':'Reproduzir';$('play').setAttribute('aria-pressed',String(playing));elapsed=Number($('frame').value)/selectedClip().fps;});
  $('resetLayers').addEventListener('click',()=>{hidden.clear();buildLayers();render();});
  for(const [id,slot]of [['weapon','weapon'],['outfit','coat']])$(id).addEventListener('change',()=>{player.equipment[slot]=$(id).value==='none'?null:{def:Number($(id).value)};render();});
  function releaseUrls(){for(const url of objectUrls){MareFactionSprites.forgetImage?.(url);URL.revokeObjectURL(url);}objectUrls=[];}
  function attachment(){
    if(!imported)return null;
    const piece=runtime.piece(appearance().pieces.weapon),animationId=poseAnimationId(),clip=piece?.animations?.[animationId],direction=$('socketDirection').value,frameIndex=Number($('frame').value);
    if(clip?.kind!=='rigid-attachment'||!clip.directions?.includes(direction)||!clip.sockets?.[direction]?.[frameIndex])return null;
    return {piece,clip,animationId,direction,frameIndex,socket:clip.sockets[direction][frameIndex]};
  }
  function attachmentControls(){
    const entry=attachment();
    for(const id of ['socketX','socketY','socketZ','applySocket'])$(id).disabled=!entry;
    $('restoreSockets').disabled=!imported;$('exportPack').disabled=!imported;
    if(!entry){$('socketStatus').textContent=imported?'Esta pose não tem encaixe de arma rígida.':'Nenhum pacote importado.';return;}
    if(['socketX','socketY','socketZ'].includes(document.activeElement?.id))return;
    $('socketX').max=runtime.rig(rigId).frameWidth;$('socketY').max=runtime.rig(rigId).frameHeight;
    $('socketX').value=entry.socket.x;$('socketY').value=entry.socket.y;
    const plan=runtime.resolve(appearance(),{animationId:entry.animationId,direction:entry.direction,frameIndex:entry.frameIndex},{allowDraft:true});
    $('socketZ').value=plan.layers.find(l=>l.slot==='weapon')?.zIndex??entry.piece.zIndex??80;
    $('socketStatus').textContent='Frame '+(entry.frameIndex+1)+' · '+names[entry.direction]+' · alterações somente na prévia.';
  }
  $('socketDirection').addEventListener('change',()=>{pause();render();});
  for(const id of ['socketX','socketY','socketZ'])$(id).addEventListener('focus',pause);
  $('applySocket').addEventListener('click',()=>{
    const entry=attachment();if(!entry)return;
    const raw=['socketX','socketY','socketZ'].map(id=>$(id).value),[x,y,z]=raw.map(Number),rig=runtime.rig(rigId);
    if(raw.some(v=>!v.trim())||![x,y,z].every(Number.isInteger)||x<0||x>rig.frameWidth||y<0||y>rig.frameHeight||Math.abs(z)>512){$('socketStatus').textContent='Use coordenadas inteiras dentro do canvas e profundidade entre −512 e512.';return;}
    entry.clip.sockets[entry.direction][entry.frameIndex]={x,y};
    entry.clip.poseOverrides=entry.clip.poseOverrides||{};const poses=entry.clip.poseOverrides[entry.direction]||Array.from({length:entry.clip.frames},()=>({}));
    poses[entry.frameIndex]={...poses[entry.frameIndex],zIndex:z};entry.clip.poseOverrides[entry.direction]=poses;
    entry.piece.approved=false;entry.piece.revision=(entry.piece.revision||1)+1;runtime.registerPiece(entry.piece);render();
  });
  $('restoreSockets').addEventListener('click',()=>{if(!importedSource)return;pause();for(const p of importedSource.pieces){const original=structuredClone(p);original.approved=false;for(const clip of Object.values(original.animations||{})){clip.url=importedFileNames.get(clip.url);for(const source of Object.values(clip.sources||{}))source.url=importedFileNames.get(source.url);}runtime.registerPiece(original);}render();});
  $('exportPack').addEventListener('click',()=>{
    if(!importedSource)return;pause();const data=structuredClone(importedSource);
    const namesByUrl=new Map([...importedFileNames].map(([name,url])=>[url,name]));
    data.pieces=importedSource.pieces.map(p=>{const current=runtime.piece(p.id);current.approved=false;for(const clip of Object.values(current.animations||{})){clip.url=namesByUrl.get(clip.url);for(const source of Object.values(clip.sources||{}))source.url=namesByUrl.get(source.url);}return current;});
    data.appearance={...data.appearance,pieces:{...appearance().pieces}};data.reviewOnly=true;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='paper-doll-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('resetPack').addEventListener('click',()=>{pause();releaseUrls();runtime=catalog.createRuntime({getImage:MareFactionSprites.image});rigId=catalog.sharedRig.id;imported=null;importedSource=null;importedFileNames=new Map();$('weapon').disabled=false;$('outfit').disabled=false;$('classId').disabled=false;$('factionId').disabled=false;buildWeapons();$('importPack').value='';$('importStatus').textContent='Catálogo original restaurado.';render();});
  async function importFiles(files){
    const urls=[];
    try{
      const manifests=files.filter(f=>f.name.endsWith('.json'));
      if(manifests.length!==1)throw Error('Selecione exatamente um manifesto JSON junto das folhas PNG.');
      const data=JSON.parse(await manifests[0].text()),candidate=MarePaperDoll.create({getImage:MareFactionSprites.image});
      const expected=data.rig?.animations?.['attack-sword']?catalog.sharedRig:catalog.rig;
      if(data.rig?.frameWidth!==84||data.rig?.frameHeight!==84||expected.requiredSlots.some(s=>!data.rig?.requiredSlots?.includes(s)))throw Error('O protótipo exige rig84 e corpo, cabelo, roupa e arma.');
      for(const [id,a]of Object.entries(expected.animations))if(data.rig.animations?.[id]?.frames!==a.frames||data.rig.animations[id].fps!==a.fps||data.rig.animations[id].loop!==a.loop||!expected.animations[id].directions.every(d=>data.rig.animations[id].directions?.includes(d)))throw Error('As sequências devem seguir o contrato4/8/8 e quatro direções.');
      candidate.registerRig(data.rig);
      if(!Array.isArray(data.pieces)||data.pieces.length>32)throw Error('Use até32 peças por pacote de inspeção.');
      const fileUrls=new Map();
      function localImage(name){
        if(fileUrls.has(name))return fileUrls.get(name);
        const matches=files.filter(f=>f.name===name&&f.type==='image/png');if(matches.length!==1)throw Error('PNG ausente ou duplicado: '+name);
        const url=URL.createObjectURL(matches[0]);urls.push(url);fileUrls.set(name,url);return url;
      }
      for(const raw of data.pieces){
        const piece=structuredClone(raw);piece.approved=false;
        for(const clip of Object.values(piece.animations||{})){
          clip.url=localImage(clip.url);
          for(const source of Object.values(clip.sources||{}))source.url=localImage(source.url);
        }
        candidate.registerPiece(piece);
      }
      if(!data.appearance?.pieces)throw Error('Falta appearance.pieces no manifesto.');
      pause();releaseUrls();objectUrls=urls;runtime=candidate;rigId=data.rig.id;imported={...data.appearance,bindings:data.bindings};importedSource=structuredClone(data);importedFileNames=fileUrls;$('classId').disabled=true;$('factionId').disabled=true;$('weapon').disabled=!data.bindings?.weapon;$('outfit').disabled=!data.bindings?.coat;$('importStatus').textContent='Pacote local recebido. Confira todas as poses e pendências.';render();
    }catch(e){for(const url of urls){MareFactionSprites.forgetImage?.(url);URL.revokeObjectURL(url);}$('importStatus').textContent='Pacote não aplicado: '+e.message;}
  }
  $('importPack').addEventListener('change',()=>importFiles([...$('importPack').files]));
  async function bundledReview(){
    const key=new URLSearchParams(location.search).get('pack');
    const packs={'walk-north':'../../pixellab-pip-generations/paper-doll-walk-north-20261021/','walk-south':'../../pixellab-pip-generations/paper-doll-walk-fit-20261021/','expansion-idle':'../../pixellab-pip-generations/paper-doll-expansion-20261021/','front-idle':'../../pixellab-pip-generations/paper-doll-hair-outfit-20261021/'};
    if(!key||!packs[key])return;
    try{
      $('importStatus').textContent='Carregando prévia incluída no projeto…';
      const response=await fetch(packs[key]+'review-pack.json',{cache:'no-store'});if(!response.ok)throw Error('Manifesto indisponível.');
      const raw=await response.text(),data=JSON.parse(raw),names=new Set();
      for(const piece of data.pieces||[])for(const clip of Object.values(piece.animations||{})){names.add(clip.url);for(const source of Object.values(clip.sources||{}))names.add(source.url);}
      if(names.size>64||[...names].some(n=>typeof n!=='string'||!/^[a-z0-9-]+\.png$/.test(n)))throw Error('Caminhos de imagens inválidos.');
      const files=await Promise.all([...names].map(async name=>{const r=await fetch(packs[key]+name,{cache:'no-store'});if(!r.ok)throw Error('PNG indisponível: '+name);return new File([await r.blob()],name,{type:'image/png'});}));
      await importFiles([new File([raw],'review-pack.json',{type:'application/json'}),...files]);
    }catch(e){$('importStatus').textContent='Prévia não carregada: '+e.message;}
  }
  window.addEventListener('mare-faction-sprite-ready',render);
  window.__paperDollInspector={state:()=>structuredClone(lastState)};
  buildIdentity();buildWeapons();buildBoards();buildLayers();render();bundledReview();
  function tick(now){
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(playing&&!document.hidden){const a=selectedClip();elapsed+=dt;const index=Math.min(a.frames-1,Math.floor(elapsed*a.fps));if(index!==Number($('frame').value)){$('frame').value=index;render();}if(elapsed>=a.frames/a.fps){elapsed=0;$('frame').value=0;render();}}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
