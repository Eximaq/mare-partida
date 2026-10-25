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
  const studyScopes={'body-motion-review':['body'],'body-hair-review':['body','hair'],'layered-gesture-review':['body','hair','outfit']};
  function bodyStudy(){return Object.hasOwn(studyScopes,imported?.scope||'');}
  function hairStudy(){return imported?.scope==='body-hair-review';}
  function selectedClip(){return runtime.rig(rigId).animations[poseAnimationId()];}
  function buildIdentity(){
    for(const [id,values]of [['classId',catalog.classes],['factionId',catalog.factions]]){
      $(id).replaceChildren(...Object.entries(values).map(([value,item])=>{const option=document.createElement('option');option.value=value;option.textContent=item.name;return option;}));$(id).value=player[id];
      $(id).addEventListener('change',()=>{pause();sequenceIndex=-1;finished=false;player[id]=$(id).value;if(id==='classId'){player.equipment.weapon={def:catalog.classes[player.classId].weapon};buildWeapons();}$('frame').value=0;elapsed=0;render();});
    }
  }
  function buildWeapons(){
    const category=catalog.profile(player).category,entries=Object.entries(catalog.weaponItems).filter(([,v])=>v[0]===category);
    $('weapon').replaceChildren(...entries.map(([id,[,name]])=>{const option=document.createElement('option');option.value=id;option.textContent=name;return option;}));
    const none=document.createElement('option');none.value='none';none.textContent='Removida · Visual padrão';$('weapon').append(none);$('weapon').value=player.equipment.weapon?.def??'none';
    $('animation').querySelector('[value=attack]').textContent='Attack · '+catalog.categories[category];
  }
  const hidden=new Set();let playing=false,elapsed=0,last=0,lastState={};
  const sequence=['idle','walk','attack','idle'];
  const actionNames={idle:'Repouso',walk:'Caminhada',attack:'Ataque'};
  let sequenceIndex=-1,finished=false;
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
      board.canvases[1].previousElementSibling.textContent=drawn?(imported?.scope==='layered-gesture-review'?'Soco · Três camadas':bodyStudy()?(hairStudy()?'Corpo e cabelo · Sem vestuário':'Corpo-base · Sem vestuário'):'Paper Doll · Pacote em inspeção'):'Paper Doll · Fallback';
      const reference=catalog.referenceFor(player,animationId);
      board.note.textContent=reference?.animated===false?reference.note+(drawn?' Pacote modular local em inspeção.':' O pacote modular continua pendente.'):!loaded?'Referência ainda não carregada ou indisponível.':drawn?'Frame '+index+' compartilhado · '+plan.layers.length+' camadas. Diferença: '+changed+' pixels; pode incluir mudanças de aparência.':'Fallback do sprite original · '+plan.missing.length+' pendências · '+changed+' pixels de diferença.';
    }
    const first=plans[0],valid=plans.length>0&&plans.every(p=>p.valid),readyDirections=plans.filter(p=>p.valid).map(p=>p.pose.direction);
    $('status').textContent=valid?'Pacote local sincronizado para inspeção. Aprovação artística e integração não concedidas por esta ferramenta.':'Fallback ativo: faltam camadas modulares compatíveis. O personagem original está preservado.';
    if(valid&&bodyStudy())$('status').textContent=hairStudy()?'Estudo de corpo e cabelo: mesma peça curta nas três ações. Roupa, calçados e arma ainda não incluídos; personagem completo em revisão.':'Estudo só do corpo: movimentos existentes reunidos para conferir anatomia e continuidade. Não inclui roupas, cabelo ou arma; personagem completo ainda não validado.';
    if(imported?.scope==='layered-gesture-review')$('status').textContent='Soco modular em avaliação: corpo, cabelo e roupa. Direções sem conjunto válido mantêm fallback. Sem luvas ou aprovação de produção.';
    $('status').classList.toggle('valid',valid&&!bodyStudy());
    if(!valid&&readyDirections.length)$('status').textContent='Pacote parcial em inspeção: '+readyDirections.map(d=>names[d]).join(', ')+'. As outras direções usam fallback. Sem aprovação artística.';
    for(const slot of MarePaperDoll.slots){
      const check=$('layers').querySelector('[data-layer='+slot+']');check.disabled=bodyStudy()&&!config.pieces[slot];check.checked=!check.disabled&&!hidden.has(slot);
      const p=runtime.piece(config.pieces[slot]);$('layer-'+slot).textContent=!config.pieces[slot]?(bodyStudy()?'Não incluída no estudo do corpo':'Sem peça opcional'):p?.available===false?'Fonte modular ausente':p?.name||config.pieces[slot];
    }
    $('missing').replaceChildren();const unique=new Map();for(const p of plans)for(const m of p.missing)unique.set(m.slot+'|'+m.pieceId+'|'+m.code,m);
    for(const m of unique.values()){const li=document.createElement('li');li.textContent=(labels[m.slot]||m.slot)+': '+(codes[m.code]||m.code)+(m.pieceId?' · '+m.pieceId:'');$('missing').append(li);}
    if(!unique.size){const li=document.createElement('li');li.textContent='Nenhuma falha estrutural nesta pose. Ainda requer inspeção artística de todos os frames.';$('missing').append(li);}
    $('readout').replaceChildren();detail('Rig / Célula',rig.id+' · '+rig.frameWidth+'×'+rig.frameHeight);detail('Pivô nativo',rig.pivotX+', '+rig.pivotY);const originalMeta=MareFactionSprites.assets[catalog.referenceFor(player,animationId).assetId].meta;detail('Fonte original',originalMeta.frame_size.join('×')+' · Pivô '+originalMeta.anchor.join(', '));detail('Corpo comum',config.pieces.body);detail('Categoria',catalog.categories[catalog.profile(player).category]);detail('Sequência',clip.frames+' frames · '+clip.fps+' FPS');detail('Peça de arma',config.pieces.weapon);detail('Peça de roupa',config.pieces.outfit);detail('Cache',runtime.stats().cacheEntries+' frames · '+runtime.stats().cacheBytes+' bytes');
    const transforms=first?.layers.map(({slot,pieceId,animationId,direction,frameIndex,pivotX,pivotY,offsetX,offsetY,zIndex,kind,socket,quarterTurns})=>({slot,pieceId,animationId,direction,frameIndex,pivotX,pivotY,offsetX,offsetY,zIndex,kind,socket,quarterTurns}));$('transforms').textContent=JSON.stringify(transforms||[],null,2);
    if(imported?.scope==='layered-gesture-review')$('playbackStatus').textContent='Soco em avaliação com corpo, cabelo e roupa independentes.';
    lastState={mode:valid?(bodyStudy()?(hairStudy()?'hair-study':'body-study'):'draft'):'fallback',artworkValidated:false,referenceReady,appearance:config,profile:catalog.profile(player),reference:catalog.referenceFor(player,animationId),pose:{animationId:poseAnimationId(animationId),frameIndex:index},differences,missing:[...unique.values()],stats:runtime.stats(),hidden:[...hidden]};
    lastState.readyDirections=readyDirections;
    if(!valid&&readyDirections.length)lastState.mode='partial-draft';
    attachmentControls();sheetFitControls();
    const progress=sequenceIndex>=0?'Etapa '+(sequenceIndex+1)+'/4 · '+actionNames[animationId]+' · ':'';
    $('playbackStatus').textContent=progress+(finished?'Ensaio concluído. ':playing?'Reproduzindo. ':'Pausado. ')+(valid?(imported?.scope==='layered-gesture-review'?'Soco em avaliação; três camadas independentes.':bodyStudy()?(hairStudy()?'Corpo e cabelo em avaliação; demais peças pendentes.':'Corpo-base somente; acabamento entre ações ainda em avaliação.'):'Camadas modulares em inspeção.'):'Sprite original por fallback; esta ação ainda não tem conjunto modular completo.');
  }
  function pause(){playing=false;$('play').textContent='Reproduzir';$('play').setAttribute('aria-pressed','false');}
  for(const id of ['animation','direction','zoom','pivots'])$(id).addEventListener('change',()=>{if(id==='animation'){$('frame').value=0;elapsed=0;sequenceIndex=-1;finished=false;pause();}render();});
  $('frame').addEventListener('input',()=>{pause();sequenceIndex=-1;finished=false;render();});
  $('playbackMode').addEventListener('change',()=>{pause();sequenceIndex=-1;finished=false;elapsed=0;$('frame').value=0;render();});
  function setSequenceStage(index){sequenceIndex=index;$('animation').value=sequence[index];$('frame').max=selectedClip().frames-1;$('frame').value=0;elapsed=0;}
  $('play').addEventListener('click',()=>{
    if(playing){pause();render();return;}
    if($('playbackMode').value==='sequence'){
      if(sequenceIndex<0||finished)setSequenceStage(0);
    }else if(finished){$('frame').value=0;}
    finished=false;playing=true;$('play').textContent='Pausar';$('play').setAttribute('aria-pressed','true');elapsed=Number($('frame').value)/selectedClip().fps;render();
  });
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
    for(const id of ['socketX','socketY','socketZ','socketTurn','applySocket'])$(id).disabled=!entry;
    $('restoreSockets').disabled=!imported;$('exportPack').disabled=!imported;
    if(!entry){$('socketStatus').textContent=imported?'Esta pose não tem encaixe de arma rígida.':'Nenhum pacote importado.';return;}
    if(['socketX','socketY','socketZ','socketTurn'].includes(document.activeElement?.id))return;
    $('socketX').max=runtime.rig(rigId).frameWidth;$('socketY').max=runtime.rig(rigId).frameHeight;
    $('socketX').value=entry.socket.x;$('socketY').value=entry.socket.y;$('socketTurn').value=entry.socket.quarterTurns??0;
    const plan=runtime.resolve(appearance(),{animationId:entry.animationId,direction:entry.direction,frameIndex:entry.frameIndex},{allowDraft:true});
    $('socketZ').value=plan.layers.find(l=>l.slot==='weapon')?.zIndex??entry.piece.zIndex??80;
    $('socketStatus').textContent='Frame '+(entry.frameIndex+1)+' · '+names[entry.direction]+' · alterações somente na prévia.';
  }
  $('socketDirection').addEventListener('change',()=>{pause();render();});
  for(const id of ['socketX','socketY','socketZ','socketTurn'])$(id).addEventListener('focus',pause);
  $('applySocket').addEventListener('click',()=>{
    const entry=attachment();if(!entry)return;
    const raw=['socketX','socketY','socketZ'].map(id=>$(id).value),[x,y,z]=raw.map(Number),rig=runtime.rig(rigId);
    if(raw.some(v=>!v.trim())||![x,y,z].every(Number.isInteger)||x<0||x>rig.frameWidth||y<0||y>rig.frameHeight||Math.abs(z)>512){$('socketStatus').textContent='Use coordenadas inteiras dentro do canvas e profundidade entre −512 e512.';return;}
    const turns=Number($('socketTurn').value);if(!Number.isInteger(turns)||turns<0||turns>3)return;
    entry.clip.sockets[entry.direction][entry.frameIndex]={...entry.socket,x,y};
    if(turns||Object.hasOwn(entry.socket,'quarterTurns'))entry.clip.sockets[entry.direction][entry.frameIndex].quarterTurns=turns;
    entry.clip.poseOverrides=entry.clip.poseOverrides||{};const poses=entry.clip.poseOverrides[entry.direction]||Array.from({length:entry.clip.frames},()=>({}));
    poses[entry.frameIndex]={...poses[entry.frameIndex],zIndex:z};entry.clip.poseOverrides[entry.direction]=poses;
    entry.piece.approved=false;entry.piece.revision=(entry.piece.revision||1)+1;runtime.registerPiece(entry.piece);render();
  });
  function restoreImported(){if(!importedSource)return;pause();for(const p of importedSource.pieces){const original=structuredClone(p);original.approved=false;for(const clip of Object.values(original.animations||{})){clip.url=importedFileNames.get(clip.url);for(const source of Object.values(clip.sources||{}))source.url=importedFileNames.get(source.url);}runtime.registerPiece(original);}render();}
  $('restoreSockets').addEventListener('click',restoreImported);
  $('restoreLayerFits').addEventListener('click',restoreImported);
  $('exportLayerFits').addEventListener('click',()=>$('exportPack').click());
  function sheetFit(){
    if(!imported)return null;
    const slot=$('fitSlot').value,piece=runtime.piece(appearance().pieces[slot]),animationId=poseAnimationId(),
      clip=piece?.animations?.[animationId],direction=$('fitDirection').value,frameIndex=Number($('frame').value);
    if(!clip||clip.kind==='rigid-attachment'||!clip.directions?.includes(direction)||frameIndex>=clip.frames)return null;
    const plan=runtime.resolve(appearance(),{animationId,direction,frameIndex},{allowDraft:true}),layer=plan.layers.find(l=>l.slot===slot);
    return layer?{piece,clip,animationId,direction,frameIndex,layer}:null;
  }
  function sheetFitControls(){
    const entry=sheetFit();for(const id of ['fitX','fitY','fitZ','applyLayerFit'])$(id).disabled=!entry;
    $('restoreLayerFits').disabled=!imported;
    $('exportLayerFits').disabled=!imported;
    if(!entry){$('fitStatus').textContent=imported?'Esta peça não tem uma folha compatível nesta ação/direção. Armas rígidas usam o painel de encaixe.':'Importe um pacote para ajustar suas camadas.';return;}
    if(['fitX','fitY','fitZ'].includes(document.activeElement?.id))return;
    $('fitX').value=entry.layer.offsetX;$('fitY').value=entry.layer.offsetY;$('fitZ').value=entry.layer.zIndex;
    $('fitStatus').textContent=labels[entry.piece.slot]+' · '+names[entry.direction]+' · frame '+(entry.frameIndex+1)+'. Somente metadados da prévia.';
  }
  for(const id of ['fitSlot','fitDirection'])$(id).addEventListener('change',()=>{pause();render();});
  for(const id of ['fitX','fitY','fitZ'])$(id).addEventListener('focus',pause);
  $('applyLayerFit').addEventListener('click',()=>{
    const entry=sheetFit();if(!entry)return;
    const raw=['fitX','fitY','fitZ'].map(id=>$(id).value),[x,y,z]=raw.map(Number);
    if(raw.some(v=>!v.trim())||![x,y,z].every(Number.isInteger)||Math.abs(x)>84||Math.abs(y)>84||Math.abs(z)>512){$('fitStatus').textContent='Use offsets inteiros entre −84 e84 e profundidade entre −512 e512.';return;}
    entry.clip.poseOverrides=entry.clip.poseOverrides||{};const poses=entry.clip.poseOverrides[entry.direction]||Array.from({length:entry.clip.frames},()=>({}));
    poses[entry.frameIndex]={...poses[entry.frameIndex],offsetX:x,offsetY:y,zIndex:z};entry.clip.poseOverrides[entry.direction]=poses;
    entry.piece.approved=false;entry.piece.revision=(entry.piece.revision||1)+1;runtime.registerPiece(entry.piece);render();
  });
  $('exportPack').addEventListener('click',()=>{
    if(!importedSource)return;pause();const data=structuredClone(importedSource);
    const namesByUrl=new Map([...importedFileNames].map(([name,url])=>[url,name]));
    data.pieces=importedSource.pieces.map(p=>{const current=runtime.piece(p.id);current.approved=false;for(const clip of Object.values(current.animations||{})){clip.url=namesByUrl.get(clip.url);for(const source of Object.values(clip.sources||{}))source.url=namesByUrl.get(source.url);}return current;});
    data.appearance={...data.appearance,pieces:{...appearance().pieces}};data.reviewOnly=true;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='paper-doll-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('resetPack').addEventListener('click',()=>{pause();sequenceIndex=-1;finished=false;releaseUrls();runtime=catalog.createRuntime({getImage:MareFactionSprites.image});rigId=catalog.sharedRig.id;imported=null;importedSource=null;importedFileNames=new Map();$('weapon').disabled=false;$('outfit').disabled=false;$('classId').disabled=false;$('factionId').disabled=false;buildWeapons();$('importPack').value='';$('importStatus').textContent='Catálogo original restaurado.';render();});
  async function importFiles(files){
    const urls=[];
    try{
      const manifests=files.filter(f=>f.name.endsWith('.json'));
      if(manifests.length!==1)throw Error('Selecione exatamente um manifesto JSON junto das folhas PNG.');
      const data=JSON.parse(await manifests[0].text()),candidate=MarePaperDoll.create({getImage:MareFactionSprites.image});
      const expected=data.rig?.id===catalog.sharedRig.id||data.rig?.animations?.['attack-sword']?catalog.sharedRig:catalog.rig;
      const studySlots=Object.hasOwn(studyScopes,data.scope||'')?studyScopes[data.scope]:null;
      if(studySlots&&(data.reviewOnly!==true||data.productionEnabled!==false||data.full_character_artwork_approved!==false||
        data.rig?.requiredSlots?.length!==studySlots.length||studySlots.some(s=>!data.rig.requiredSlots.includes(s))||
        !Array.isArray(data.pieces)||data.pieces.length!==studySlots.length||Object.keys(data.appearance?.pieces||{}).length!==studySlots.length||
        studySlots.some(s=>data.pieces.filter(p=>p.slot===s&&p.id===data.appearance?.pieces?.[s]).length!==1)||data.bindings))throw Error('Estudo parcial exige exatamente suas camadas declaradas, sem equipamentos e com produção bloqueada.');
      if(data.rig?.frameWidth!==84||data.rig?.frameHeight!==84||(!studySlots&&expected.requiredSlots.some(s=>!data.rig?.requiredSlots?.includes(s))))throw Error('O protótipo exige rig84 e corpo, cabelo, roupa e arma.');
      const declared=Object.entries(data.rig.animations||{});
      if(!declared.length||declared.some(([id,a])=>!a||!Object.hasOwn(expected.animations,id)||a.frames!==expected.animations[id].frames||a.fps!==expected.animations[id].fps||a.loop!==expected.animations[id].loop||!expected.animations[id].directions.every(d=>a.directions?.includes(d))))throw Error('As sequências declaradas devem seguir o contrato4/8/8 e quatro direções.');
      // Canonical timelines keep missing actions inspectable through the legacy fallback.
      // No missing sprite clip is created or added to the exported manifest.
      candidate.registerRig({...expected,...data.rig,animations:{...expected.animations,...data.rig.animations}});
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
      if(data.classId!==undefined&&!Object.hasOwn(catalog.classes,data.classId))throw Error('Classe do estudo inválida.');
      if(data.classId){player.classId=data.classId;player.equipment.weapon=null;$('classId').value=data.classId;buildWeapons();}
      pause();sequenceIndex=-1;finished=false;releaseUrls();objectUrls=urls;runtime=candidate;rigId=data.rig.id;imported={...data.appearance,bindings:data.bindings,scope:data.scope};importedSource=structuredClone(data);importedFileNames=fileUrls;$('classId').disabled=true;$('factionId').disabled=true;$('weapon').disabled=!data.bindings?.weapon;$('outfit').disabled=!data.bindings?.coat;
      const actions=[...$('animation').options].map(o=>o.value),current=$('animation').value;
      if(!data.rig.animations[poseAnimationId(current)])$('animation').value=actions.find(a=>data.rig.animations[poseAnimationId(a)])||current;
      $('frame').value=0;elapsed=0;$('importStatus').textContent='Pacote local recebido. Confira todas as poses e pendências.';render();
    }catch(e){for(const url of urls){MareFactionSprites.forgetImage?.(url);URL.revokeObjectURL(url);}$('importStatus').textContent='Pacote não aplicado: '+e.message;}
  }
  $('importPack').addEventListener('change',()=>importFiles([...$('importPack').files]));
  async function bundledReview(){
    const key=new URLSearchParams(location.search).get('pack');
    const packs={'unarmed':'../../pixellab-pip-generations/paper-doll-unarmed-combat-20261024/','punch':'../../pixellab-pip-generations/paper-doll-category-attacks-20261023/','punch-east':'../../pixellab-pip-generations/paper-doll-category-attacks-20261023/','navy-starter':'../../pixellab-pip-generations/paper-doll-navy-starter-20261023/','hair-continuity':'../../pixellab-pip-generations/paper-doll-hair-continuity-20261022/','body-continuity':'../../pixellab-pip-generations/paper-doll-body-continuity-20261022/','bento-east-fit':'../../pixellab-pip-generations/paper-doll-east-fit-20261022/','basic-sword':'../../pixellab-pip-generations/paper-doll-basic-sword-20261021/','walk-profiles':'../../pixellab-pip-generations/paper-doll-walk-profiles-20261021/','walk-north-complete':'../../pixellab-pip-generations/paper-doll-north-finish-20261021/','walk-north':'../../pixellab-pip-generations/paper-doll-walk-north-20261021/','walk-south':'../../pixellab-pip-generations/paper-doll-walk-fit-20261021/','expansion-idle':'../../pixellab-pip-generations/paper-doll-expansion-20261021/','front-idle':'../../pixellab-pip-generations/paper-doll-hair-outfit-20261021/'};
    if(!key||!packs[key])return;
    try{
      $('importStatus').textContent='Carregando prévia incluída no projeto…';
      const response=await fetch(packs[key]+'review-pack.json',{cache:'no-store'});if(!response.ok)throw Error('Manifesto indisponível.');
      let raw=await response.text();const data=JSON.parse(raw),names=new Set();
      // The three-layer inspector is an art study, not an equipment editor.
      if(key==='unarmed'){delete data.bindings;raw=JSON.stringify(data);}
      for(const piece of data.pieces||[])for(const clip of Object.values(piece.animations||{})){names.add(clip.url);for(const source of Object.values(clip.sources||{}))names.add(source.url);}
      if(names.size>64||[...names].some(n=>typeof n!=='string'||!/^[a-z0-9-]+\.png$/.test(n)))throw Error('Caminhos de imagens inválidos.');
      const files=await Promise.all([...names].map(async name=>{const r=await fetch(packs[key]+name,{cache:'no-store'});if(!r.ok)throw Error('PNG indisponível: '+name);return new File([await r.blob()],name,{type:'image/png'});}));
      await importFiles([new File([raw],'review-pack.json',{type:'application/json'}),...files]);
    }catch(e){$('importStatus').textContent='Prévia não carregada: '+e.message;}
  }
  window.addEventListener('mare-faction-sprite-ready',render);
  window.__paperDollInspector={state:()=>structuredClone({...lastState,playback:{playing,finished,sequenceIndex,mode:$('playbackMode').value}})};
  buildIdentity();buildWeapons();buildBoards();buildLayers();render();bundledReview();
  function tick(now){
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(playing&&!document.hidden){
      const a=selectedClip();elapsed+=dt;
      const index=Math.min(a.frames-1,Math.floor(elapsed*a.fps));
      if(index!==Number($('frame').value)){$('frame').value=index;render();}
      if(elapsed>=a.frames/a.fps){
        if(sequenceIndex>=0&&sequenceIndex<sequence.length-1){setSequenceStage(sequenceIndex+1);}
        else if(sequenceIndex<0&&a.loop){elapsed%=a.frames/a.fps;$('frame').value=0;}
        else{pause();finished=true;}
        render();
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
