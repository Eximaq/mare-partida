'use strict';
/* Shared playback for explicit DEV drafts and the owner-approved player release. No save ownership. */
((root)=>{
  const id='navy-starter',folders={'navy-starter':'pixellab-pip-generations/paper-doll-navy-starter-20261023/',unarmed:'pixellab-pip-generations/paper-doll-unarmed-combat-20261024/',gunner:'pixellab-pip-generations/paper-doll-gunner-20261025/',rogue:'pixellab-pip-generations/paper-doll-rogue-20261025/',complete:'pixellab-pip-generations/paper-doll-complete-20261026/'};
  const gaitStates=new WeakMap(),ranged=new Set(['firearm','tech','focus']);
  function walkPose(actor){return {...(gaitStates.get(actor)?.pose||{moving:false,time:0,phase:0,distance:0,speed:0,stepDistance:0,timestamp:0})};}
  function stepWalk(actor,time,active,{from=null,dt=null,context=null}={}){
    const previous=gaitStates.get(actor);
    if(!Number.isFinite(time)||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return walkPose(actor);
    if(previous&&time===previous.time&&!from)return walkPose(actor);
    const origin=from||previous,elapsed=dt??(previous?time-previous.time:0);
    const distance=origin?Math.hypot(actor.x-origin.x,actor.y-origin.y):0;
    const moving=!!active&&elapsed>0&&Number.isFinite(elapsed)&&distance>.001&&distance<160&&(!previous||previous.context===context)&&(!previous||time>=previous.time);
    // Preserve the existing stride until a complete art-based calibration is approved.
    const phase=((previous?.pose.phase||0)+(moving?distance/80:0))%1;
    const pose={moving,time:phase,phase,distance:(previous?.pose.distance||0)+(moving?distance:0),speed:moving?distance/elapsed:0,stepDistance:moving?distance:0,timestamp:time};
    gaitStates.set(actor,{x:actor.x,y:actor.y,time,context,pose});return {...pose};
  }
  function shotProgress(progress,hitRatio=.5,releaseFrame=3,frames=8){
    const p=Math.max(0,Math.min(1,progress)),hit=Math.max(.001,Math.min(.999,hitRatio));
    const release=releaseFrame/frames;return p<=hit?p/hit*release:release+(p-hit)/(1-hit)*(1-release);
  }
  function requested(search,devActive){return devActive===true&&Object.hasOwn(folders,new URLSearchParams(search).get('paperDollReview'));}
  function cosmetics(pack,player,options){
    return options.lookCatalog?.resolve(pack,player,options)||{pieces:{...pack.appearance.pieces},hidden:[],cosmeticFallbacks:[]};
  }
  function playerAppearance(pack,player,definition,options){
    const catalog=root.MarePaperDollCatalog,profile=catalog.profile(player);
    if(!profile||player?.devSandbox===true||pack.productionEnabled!==true||pack.full_character_artwork_approved!==true)return null;
    const result={rigId:pack.rig.id,...cosmetics(pack,player,options),blocked:[],substitutions:[]};
    const weapon=player.equipment?.weapon;
    if(!weapon||profile.category==='unarmed')delete result.pieces.weapon;
    else{
      const type=catalog.weaponItems[weapon.def]?.[0],def=definition?.(weapon.def);
      if(type!==profile.category&&def?.type!==player.classId)return null;
      const exact=catalog.equipmentBinding(pack,'weapon',weapon.def)[0]?.pieceId;
      result.pieces.weapon=exact||catalog.equipmentBinding(pack,'weapon',catalog.classes[player.classId]?.weapon)[0]?.pieceId||pack.categoryWeapons[profile.category];
      if(!exact)result.substitutions.push({slot:'weapon',def:weapon.def,reason:'category-default'});
    }
    const equipment=catalog.equipmentPieces(pack,player,options);
    // Optional gear never becomes a permanent cosmetic through pack defaults.
    for(const slot of new Set(Object.values(catalog.equipmentLayers).flat()))if(slot!=='weapon'&&slot!=='outfit')delete result.pieces[slot];
    Object.assign(result.pieces,equipment.pieces);result.substitutions.push(...equipment.substitutions);
    return result;
  }
  function appearance(pack,player,{production=false,definition=null,lookCatalog=root.MarePaperDollLook,unavailablePieces=new Set()}={}){
    const options={production,lookCatalog,unavailablePieces};
    if(production)return playerAppearance(pack,player,definition,options);
    const catalog=root.MarePaperDollCatalog;
    if(!catalog.eligible(player))return null;
    const unarmed=!player.equipment?.weapon,bodyWeapon=pack.completeCategories===true&&catalog.usesBodyWeapon(player);
    if(pack.unarmedOnly===true&&!unarmed)return null;
    const result={rigId:pack.rig.id,...cosmetics(pack,player,options),blocked:[]};
    result.hidden=[...((unarmed||bodyWeapon)?['weapon']:[]),...result.hidden];
    // Body identity is independent of class/faction. Missing weapon artwork
    // still falls back; empty hands and body-driven fist weapons omit that layer.
    const category=catalog.profile(player).category;
    if(pack.completeCategories===true&&(unarmed||bodyWeapon))delete result.pieces.weapon;
    if(!unarmed&&!bodyWeapon){
      if(catalog.weaponItems[player.equipment.weapon.def]?.[0]!==category)return null;
      if(category!=='sword'&&!pack.categoryWeapons?.[category])return null;
      if(pack.categoryWeapons?.[category])result.pieces.weapon=pack.categoryWeapons[category];
    }
    for(const [equipmentSlot,binding]of Object.entries(pack.bindings||{})){
      const item=player.equipment?.[equipmentSlot];if(!item||equipmentSlot==='weapon'&&bodyWeapon)continue;
      const layers=catalog.equipmentBinding(pack,equipmentSlot,item.def);
      if(layers.length)for(const {slot,pieceId}of layers)result.pieces[slot]=pieceId;
      else result.blocked.push({slot:binding.slot,pieceId:String(item.def),code:'unmapped-equipment'});
    }
    // Unsupported visible garments cannot silently disappear in a complete prototype.
    for(const slot of Object.keys(catalog.equipmentLayers))if(slot!=='weapon'&&slot!=='coat'&&player.equipment?.[slot]&&!pack.bindings?.[slot])result.blocked.push({slot:'accessory',pieceId:String(player.equipment[slot].def),code:'unmapped-equipment'});
    return result;
  }
  function create({search='',devActive=false,production=false,definition=null,lookCatalog=root.MarePaperDollLook,getImage,fetch:fetcher=root.fetch?.bind(root),baseURL=root.location?.href,onChange=()=>{}}={}){
    production=production===true&&devActive!==true;
    const selected=production?'complete':new URLSearchParams(search).get('paperDollReview'),unarmedPack=selected==='unarmed',gunnerPack=selected==='gunner',roguePack=selected==='rogue',completePack=selected==='complete';
    const weaponCategory=gunnerPack?'firearm':roguePack?'daggers':null;
    const unavailablePieces=new Set();
    const enabled=production||requested(search,devActive),runtime=root.MarePaperDollCatalog.createRuntime({getImage}),resolveAppearance=player=>appearance(pack,player,{production,definition,lookCatalog,unavailablePieces}),allowed=player=>production?player&&player.devSandbox!==true:player?.devSandbox===true;
    let pack=null,coverage=null,state=enabled?'loading':'off',message='',draws=0,fallbacks=0,lastReason=null,lastPose=null,lastRelease=null;
    let simulationTime=0,renderFrame=0,releaseSequence=0,selectedRelease=null,suspended=false,identity=null,observedActor=null,currentTiming=null;
    const releases=new Map(),releaseTokens=new WeakMap();
    const signature=player=>JSON.stringify([player?.classId,player?.factionId,player?.zoanTransformed,player?.paperDollLook,player?.equipment]);
    function cancelVisual(){releases.clear();selectedRelease=null;lastPose=null;lastRelease=null;}
    function synchronize(player,time,actor=null,timing=undefined){
      if(actor)observedActor=actor;if(timing!==undefined)currentTiming=timing?.locked?{action:timing.action,progress:timing.progress,elapsed:timing.elapsed,duration:timing.duration,direction:timing.direction,hitFrameRatio:timing.hitFrameRatio}:null;
      const next=signature(player);if(identity!==next||!root.MarePaperDollCatalog.eligible(player))cancelVisual();identity=next;
      if(time!==simulationTime){lastPose=null;lastRelease=null;}simulationTime=time;
      for(const [id,event]of releases)if(event.presented&&time-event.time>.5)releases.delete(id);
    }
    function prepareFrame(player,actor,time,scaleFactor=1){
      synchronize(player,time,actor);renderFrame++;lastPose=null;lastRelease=null;selectedRelease=null;
      if(!completePack||suspended)return;
      selectedRelease=[...releases.values()].filter(e=>!e.presented&&e.identity===identity).at(-1)||null;
      if(selectedRelease){
        const e=selectedRelease,origin=runtime.attachmentPoint(e.config,e.pose,'weapon',e.point,actor.x,actor.y,{outerScale:scaleFactor,hidden:e.config.hidden,allowDraft:!production});
        if(!origin){cancelVisual();return;}Object.assign(e,origin);
        lastRelease={id:e.id,attackId:e.id,x:e.x,y:e.y,frameIndex:e.pose.frameIndex,direction:e.pose.direction,category:e.category,simulationTime:time,renderFrame};
      }
    }
    function finishFrame(){for(const event of releases.values())event.presented=true;selectedRelease=null;}
    function holdProjectile(id){return releases.has(id)&&!releases.get(id).presented&&!suspended;}
    const notify=()=>onChange(snapshot());
    function snapshot(){return {enabled,state,message,draws,fallbacks,lastReason,lastPose,lastRelease,motion:{gait:walkPose(observedActor),attack:currentTiming},presentation:{simulationTime,renderFrame,pending:[...releases.values()].filter(e=>!e.presented).length,suspended},packId:selected,production,artworkApproved:production&&state==='ready',coverage,...runtime.stats()};}
    const ready=enabled?(async()=>{
      try{
        const base=new URL(folders[selected],baseURL),response=await fetcher(new URL(production?'player-pack.json':'review-pack.json',base),{cache:'no-store'});
        if(!response.ok)throw Error('Manifesto indisponível.');
        const data=await response.json();
        if(data.reviewOnly!==!production||data.productionEnabled!==production||data.full_character_artwork_approved!==production||data.rig?.id!=='human-v1'||data.rig.frameWidth!==84||data.rig.frameHeight!==84||!Array.isArray(data.pieces)||data.pieces.length<(unarmedPack?3:4)||data.pieces.length>64||new Set(data.pieces.map(p=>p.id)).size!==data.pieces.length)throw Error('Pacote de revisão incompatível.');
        const required=(unarmedPack||completePack)?['body','hair','outfit']:['body','hair','outfit','weapon'];
        if(required.some(s=>!data.rig.requiredSlots?.includes(s)||data.pieces.filter(p=>p.slot===s&&p.id===data.appearance?.pieces?.[s]).length!==1))throw Error('Conjunto incompleto.');
        if(unarmedPack||weaponCategory||completePack){
          if(unarmedPack&&(data.unarmedOnly!==true||data.rig.requiredSlots.length!==3||data.pieces.some(p=>p.slot==='weapon')||data.categoryWeapons))throw Error('Ensaio desarmado incompatível.');
          if(weaponCategory&&(data.classId!==selected||data.unarmedOnly===true||data.categoryWeapons?.[weaponCategory]!==data.appearance.pieces.weapon))throw Error('Ensaio de arma incompatível.');
          if(completePack&&(data.completeCategories!==true||data.rig.requiredSlots.length!==3||Object.keys(data.categoryWeapons||{}).sort().join(',')!=='daggers,firearm,focus,sword,tech'))throw Error('Categorias incompletas.');
          const canonical=root.MarePaperDollCatalog.sharedRig;
          for(const action of (completePack?Object.keys(canonical.animations):['idle','walk',weaponCategory?'attack-'+weaponCategory:'attack-unarmed'])){
            const a=data.rig.animations?.[action],expected=canonical.animations[action],directions=data.coverage?.[action];
            if(!a||a.frames!==expected.frames||a.fps!==expected.fps||a.loop!==expected.loop||!Array.isArray(directions)||!directions.length||new Set(directions).size!==directions.length||directions.some(d=>!expected.directions.includes(d)))throw Error('Cobertura desarmada inválida.');
            if(completePack&&directions.length!==4)throw Error('Direções incompletas.');
            if(unarmedPack&&action!=='attack-unarmed'&&directions.length!==4)throw Error('Locomoção incompleta.');
          }
          runtime.registerRig({...canonical,animations:Object.fromEntries(Object.entries(canonical.animations).map(([name,clip])=>[name,{...clip,...(data.rig.animations[name]?.rootOffsets?{rootOffsets:data.rig.animations[name].rootOffsets}:{})}])),requiredSlots:required});
        }
        for(const [category,pieceId]of Object.entries(data.categoryWeapons||{})){
          if(!Object.hasOwn(root.MarePaperDollCatalog.categories,category)||!data.pieces.some(p=>p.id===pieceId&&p.slot==='weapon'))throw Error('Arma de categoria inválida.');
        }
        const bindings=root.MarePaperDollCatalog.equipmentBindings(data);
        const requiredIds=new Set([...Object.values(data.appearance.pieces),...Object.values(data.categoryWeapons||{}),...bindings.filter(b=>b.equipmentSlot==='weapon').map(b=>b.pieceId)]);
        const optionalIds=new Set([...Object.values(lookCatalog?.data.groups||{}).flatMap(g=>g.options.filter(o=>o.approved&&o.pieceId).map(o=>o.pieceId)),...bindings.filter(b=>b.equipmentSlot!=='weapon').map(b=>b.pieceId)].filter(id=>!requiredIds.has(id)));
        const urls=new Set(),pieceURLs=new Map();
        const path=name=>{if(typeof name!=='string'||!/^[a-z0-9-]+\.png$/.test(name))throw Error('Fonte inválida.');return new URL(name,base).href;};
        for(const p of data.pieces){
          const optional=optionalIds.has(p.id),sources=new Set();
          try{
            if(optional&&!root.MarePaperDollCatalog.compatible(data,p,p.slot,{production}))throw Error('Opção sem cobertura completa.');
            if(p.approved!==production||!p.available)throw Error('Estado da peça inválido.');
            const rangedClip=Object.entries(p.animations).find(([name])=>name.startsWith('attack-')&&ranged.has(name.slice(7)))?.[1];
            if(completePack&&p.slot==='weapon'&&rangedClip){
              const e=p.emission;
              if(!e||!Number.isInteger(e.frame)||e.frame<0||e.frame>=rangedClip.frames||rangedClip.directions.some(d=>{const point=e.points?.[d],source=rangedClip.sources?.[d];return !point||!source||!Number.isInteger(point.x)||!Number.isInteger(point.y)||point.x<0||point.y<0||point.x>=source.width||point.y>=source.height;}))throw Error('Origem de emissão inválida ou ausente.');
            }
            for(const clip of Object.values(p.animations)){clip.url=path(clip.url);sources.add(clip.url);for(const source of Object.values(clip.sources||{})){source.url=path(source.url);sources.add(source.url);}}
            runtime.registerPiece(p);
            pieceURLs.set(p.id,sources);for(const url of sources)urls.add(url);
          }catch(e){if(!optional)throw e;unavailablePieces.add(p.id);}
        }
        // Keep cold starts within a small connection budget on mobile browsers.
        const pending=[...urls],failedURLs=new Set();
        for(let i=0;i<pending.length;i+=6){
          const batch=pending.slice(i,i+6),results=await Promise.allSettled(batch.map(url=>Promise.resolve().then(()=>getImage(url).decode())));
          results.forEach((result,n)=>{if(result.status==='rejected')failedURLs.add(batch[n]);});
        }
        for(const [pieceId,sources]of pieceURLs)if([...sources].some(url=>failedURLs.has(url))){
          if(!optionalIds.has(pieceId))throw Error('Imagem obrigatória indisponível.');
          unavailablePieces.add(pieceId);
        }
        for(const [action,clip]of Object.entries(data.rig.animations))for(const direction of ((unarmedPack||weaponCategory||completePack)?data.coverage[action]:clip.directions))for(let frameIndex=0;frameIndex<clip.frames;frameIndex++){
          const category=action.startsWith('attack-')?action.slice(7):'sword',config={...data.appearance,pieces:{...data.appearance.pieces}};
          if(data.categoryWeapons?.[category])config.pieces.weapon=data.categoryWeapons[category];
          if(completePack&&category==='unarmed')delete config.pieces.weapon;
          if(!runtime.resolve(config,{animationId:action,direction,frameIndex},{allowDraft:!production}).valid)throw Error('Há frames incompatíveis ou ausentes.');
        }
        // Validate optional pieces once, across every pose, before exposing them.
        for(const pieceId of optionalIds){
          if(unavailablePieces.has(pieceId)||!pieceURLs.has(pieceId))continue;
          const piece=data.pieces.find(p=>p.id===pieceId);
          outer:for(const [action,clip]of Object.entries(data.rig.animations))for(const direction of data.coverage?.[action]||clip.directions)for(let frameIndex=0;frameIndex<clip.frames;frameIndex++){
            const config={...data.appearance,pieces:{...data.appearance.pieces,[piece.slot]:pieceId}};
            // Weapon coverage is category-specific; test the cosmetic with a bare body.
            delete config.pieces.weapon;
            if(!runtime.resolve(config,{animationId:action,direction,frameIndex},{allowDraft:!production}).valid){unavailablePieces.add(pieceId);break outer;}
          }
        }
        pack=data;coverage=root.MarePaperDollCoverage?.inspect(pack)||null;state='ready';message=unarmedPack?'Ensaio desarmado: remova arma e equipamentos sem peças. Corpo comum em repouso e caminhada; Lutador usa os socos disponíveis. Direções ausentes mantêm o visual original.':'Corpo comum: sete classes e quatro facções, sem arma, em repouso e caminhada. Espada inicial compatível; outros equipamentos e ataques sem arte usam o personagem original.';
        if(completePack)message='Personagem único em avaliação: sete classes, quatro facções. Equipamentos sem arte e habilidades preservam o visual original. Lutador aceita os punhos equipados, preservando seus atributos.';
        if(gunnerPack)message='Atirador modular em avaliação. Use o mosquete compatível; ações, direções e equipamentos sem peças mantêm o personagem original.';
        if(roguePack)message='Gatuno modular em avaliação. Use as Adagas da Bruma; ações, direções e equipamentos sem peças mantêm o personagem original.';
        if(production)message='Personagem modular: aparência compartilhada, equipamento e progresso preservados.';
      }catch(e){pack=null;state='failed';message='Prévia indisponível: '+e.message+' Sprite original preservado.';}
      notify();return snapshot();
    })():Promise.resolve(snapshot());
    function draw(ctx,player,action,direction,time,x,y,scale,progress=null,timing=null,worldView=false){
      if(!pack||state!=='ready'||!allowed(player))return false;
      const requestedAction=action;
      if(completePack&&(production||['sword','brawler'].includes(player.classId))){
        if(['combat-idle','guard','hurt',...(production?['death']:[])].includes(action)){action='idle';progress=null;}
        else if(['skill','skill-1','skill-2','combo',...(production?['cast','heal','reload','dodge']:[])].includes(action)){action='attack';if(Number.isFinite(progress))progress=shotProgress(progress,timing?.hitFrameRatio??.5);}
      }
      const category=production&&!player.equipment?.weapon?'unarmed':root.MarePaperDollCatalog.profile(player)?.category,config=resolveAppearance(player),emission=runtime.piece(config?.pieces.weapon)?.emission;
      const synchronized=completePack&&action==='attack'&&ranged.has(category)&&Number.isFinite(progress)?shotProgress(progress,timing?.hitFrameRatio??.5,emission?.frame??3):progress;
      const event=worldView?selectedRelease:null,pose=event?.pose||(production&&category==='unarmed'&&action==='attack'?runtime.sample('human-v1','attack-unarmed',direction,time,{progress:synchronized}):root.MarePaperDollCatalog.sample(runtime,player,action,direction,time,{progress:synchronized}));
      if(!config||!pose){fallbacks++;lastReason='unsupported-character-or-action';return false;}
      if(!production&&config.hidden.includes('weapon')&&action!=='idle'&&action!=='walk'&&!((unarmedPack||completePack)&&player.classId==='brawler'&&action==='attack')){fallbacks++;lastReason='missing-unarmed-animation';return false;}
      const ok=runtime.draw(ctx,config,pose,x,y,{scale,hidden:config.hidden,allowDraft:!production});
      if(ok){draws++;lastReason=null;if(worldView||lastPose?.view!=='world')lastPose={...pose,requestedAction,view:worldView?'world':'preview',simulationTime,renderFrame,attackId:event?.id??null};}else{fallbacks++;lastReason=config.blocked[0]?.code||'missing-animation';if(worldView)lastPose=null;}
      return ok;
    }
    function projectileOrigin(player,actor,timing,scaleFactor=1){
      if(!completePack||state!=='ready'||!allowed(player)||!timing?.locked)return null;
      const config=resolveAppearance(player),category=root.MarePaperDollCatalog.profile(player)?.category;
      if(!config||!ranged.has(category))return null;
      const emission=runtime.piece(config.pieces.weapon)?.emission;if(!emission)return null;
      const pose=runtime.sample('human-v1','attack-'+category,timing.direction,0,{progress:emission.frame/8}),point=emission.points[pose?.direction];
      const origin=runtime.attachmentPoint(config,pose,'weapon',point,actor.x,actor.y,{outerScale:scaleFactor,hidden:config.hidden,allowDraft:!production});if(!origin)return null;
      if(suspended)return origin;
      const token=timing.token||timing,previous=releaseTokens.get(token);if(previous&&releases.has(previous))return {...origin,releaseId:previous};
      synchronize(player,timing.simulationTime??simulationTime);
      const id=++releaseSequence;releaseTokens.set(token,id);releases.set(id,{id,...origin,config,point,pose,category,identity,time:simulationTime,presented:false});
      if(releases.size>8)releases.delete(releases.keys().next().value);
      return {...origin,releaseId:id};
    }
    function inspect(player,pose,actor={x:0,y:0},outerScale=1){
      const config=pack&&resolveAppearance(player);if(!config||!pose)return {valid:false,layers:[],missing:[{code:'no-current-pose'}],emission:null};
      const plan=runtime.resolve(config,pose,{allowDraft:!production}),options={outerScale,hidden:config.hidden,allowDraft:!production};
      return {valid:plan.valid,missing:plan.missing,pivot:{x:actor.x,y:actor.y},layers:plan.layers.map(l=>{
        const clip=runtime.piece(l.pieceId).animations[l.animationId],source=clip.sources?.[l.direction]||clip.source;
        return {slot:l.slot,pieceId:l.pieceId,pivotX:l.pivotX,pivotY:l.pivotY,offsetX:l.offsetX,offsetY:l.offsetY,zIndex:l.zIndex,socket:l.socket,
          hand:source?runtime.attachmentPoint(config,pose,l.slot,{x:source.anchorX,y:source.anchorY},actor.x,actor.y,options):null,
          corners:[[0,0],[l.width-1,0],[l.width-1,l.height-1],[0,l.height-1]].map(([x,y])=>runtime.attachmentPoint(config,pose,l.slot,{x,y},actor.x,actor.y,options))};
      }),emission:(()=>{const e=runtime.piece(config.pieces.weapon)?.emission,p=e?.points[pose.direction];return p?runtime.attachmentPoint(config,pose,'weapon',p,actor.x,actor.y,options):null;})()};
    }
    return {ready,draw,snapshot,inspect,projectileOrigin,synchronize,prepareFrame,finishFrame,holdProjectile,releaseOrigin:id=>{const e=releases.get(id);return e?{x:e.x,y:e.y}:null;},cancelVisual,setSuspended:value=>{suspended=!!value;cancelVisual();},equipmentStatus:player=>production?{ready:state==='ready',issues:[],substitutions:pack?resolveAppearance(player)?.substitutions||[]:[],cosmeticFallbacks:pack?resolveAppearance(player)?.cosmeticFallbacks||[]:[],message:state==='ready'?'Seus equipamentos e bônus continuam ativos.':message}:equipmentStatus(pack,player),prepareEquipment:(player,options)=>!production&&state==='ready'?prepareEquipment(pack,player,options):{ok:false,message:'Preparação de equipamento disponível apenas no laboratório.'}};
  }
  function equipmentStatus(pack,player){
    const catalog=root.MarePaperDollCatalog,profile=catalog.profile(player);
    if(!pack?.completeCategories)return {ready:false,issues:[],message:'Abra o pacote das sete classes para preparar equipamentos.'};
    if(!profile)return {ready:false,issues:[],message:player?.zoanTransformed?'Volte à forma humana para avaliar o conjunto.':'Personagem incompatível com este conjunto.'};
    const issues=[];
    for(const slot of Object.keys(catalog.equipmentLayers)){
      const item=player.equipment?.[slot];
      if(slot==='weapon'){
        if(profile.category==='unarmed'){if(!catalog.usesBodyWeapon(player))issues.push({slot,def:item?.def,reason:'wrong-category'});continue;}
        if(!item){issues.push({slot,def:null,reason:'missing-weapon'});continue;}
        if(catalog.weaponItems[item.def]?.[0]!==profile.category){issues.push({slot,def:item.def,reason:'wrong-category'});continue;}
      }
      if(item&&!catalog.equipmentBinding(pack,slot,item.def).length)issues.push({slot,def:item.def,reason:'missing-art'});
    }
    return {ready:issues.length===0,issues,message:issues.length?'Estas peças impedem o conjunto modular:':'Equipamento compatível com repouso, caminhada e ataque básico.'};
  }
  // A real DEV inventory transaction, never a cosmetic suppression of equipment.
  function prepareEquipment(pack,player,{capacity=120,makeWeapon}={}){
    const fail=message=>({ok:false,message});
    if(player?.devSandbox!==true||pack?.reviewOnly!==true||pack?.productionEnabled!==false||!pack?.completeCategories)return fail('Preparação disponível somente no laboratório das sete classes.');
    const report=equipmentStatus(pack,player);
    if(!root.MarePaperDollCatalog.eligible(player))return fail(report.message);
    if(report.ready)return {ok:true,state:player,message:'Seu conjunto já está pronto. Nenhum item alterado.'};
    const next={...player,equipment:{...player.equipment},inventory:[...player.inventory]},weaponIssue=report.issues.find(i=>i.slot==='weapon');
    const profile=root.MarePaperDollCatalog.profile(player),target=root.MarePaperDollCatalog.classes[player.classId].weapon;
    let replacement=null;
    if(weaponIssue&&profile.category!=='unarmed'){
      if(!pack.bindings?.weapon?.items?.[target])return fail('A arma inicial ainda não tem camada compatível.');
      const index=next.inventory.findIndex(i=>i.def===target);
      if(index>=0)replacement=next.inventory.splice(index,1)[0];
    }
    for(const {slot}of report.issues){if(next.equipment[slot])next.inventory.push(next.equipment[slot]);next.equipment[slot]=null;}
    if(!Number.isSafeInteger(capacity)||capacity<0||next.inventory.length>capacity)return fail('Libere espaço na mochila para guardar as peças atuais. Nada foi alterado.');
    if(weaponIssue&&profile.category!=='unarmed'){
      if(!replacement){
        if(typeof makeWeapon!=='function')return fail('Arma inicial indisponível no laboratório.');
        replacement=makeWeapon(target);
        if(!replacement?.id||replacement.def!==target||next.inventory.some(i=>i.id===replacement.id)||Object.values(next.equipment).some(i=>i?.id===replacement.id))return fail('Não foi possível preparar uma arma de teste válida.');
      }
      next.equipment.weapon=replacement;
    }
    return {ok:true,state:next,message:'Conjunto preparado. Peças retiradas foram guardadas na mochila do laboratório.'};
  }
  root.MarePaperDollReview={id,requested,appearance,create,equipmentStatus,prepareEquipment,walkPose,stepWalk,shotProgress};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MarePaperDollReview;
})(typeof globalThis!=='undefined'?globalThis:window);
