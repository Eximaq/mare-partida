/* Current player release. Shared wardrobe; save and combat state remain in the game. */
(function(root){
  'use strict';
  const Headgear=root.MareHeadgear||(typeof module!=='undefined'&&module.exports?require('./headgear-visibility.js'):null);
  const Cosmetics=root.MareCharacterAppearance||(typeof module!=='undefined'&&module.exports?require('./character-appearance.js'):null);
  const Equipment=typeof module!=='undefined'&&module.exports?require('./tools/paper-doll-96-v3/weapons.js'):null;
  const defaults=Object.freeze({body:'masculino',hair:'original',face:'original',skin:'original',hairColor:'brown',kit:'equipped'});
  const slots=Object.freeze({coat:'torso',legs:'pants',boots:'boots',gloves:'gloves',cloak:'cloak',head:'head'});
  const actions=['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'];
  // The map can ask for generic 'attack' and 'skill'; both historically use
  // the same category animation when no more specific route is registered. Authored registrations
  // are also indexed by the concrete animation. Keep the first full result;
  // retry only the player's exact weapon/category without changing the save,
  // action clock, direction, or any equipment. Do not reinterpret a class
  // specific skill, special, hurt, or transformation as a category attack.
  function selectWorldHD(nativeHD,weaponCatalog,player,options){
    const source=nativeHD?.selectVisual(player,options);
    const complete=r=>r&&!r.omitted?.length&&!r.unsupported?.length&&
      Object.values(r.slotRoutes||{}).every(x=>x.quality==='hd');
    if(complete(source)||!['attack','skill'].includes(options.action)||player.zoanTransformed)return source;
    const weapon=player.equipment?.weapon,def=weapon?.def??weapon;
    const category=weaponCatalog?.classes?.[player.classId];
    if(!category)return source;
    const model=def!=null&&!options.weaponless&&weaponCatalog.items.find(w=>w.itemId===def&&w.category===category);
    if(def!=null&&!options.weaponless&&!model)return source;
    const action=model?(model.attackAction||'attack-'+category):'attack-unarmed';
    if(!actions.includes(action))return source;
    const candidate=nativeHD?.selectVisual(player,{...options,action});
    const bound=candidate?.item??candidate?.equipment?.weapon??candidate?.slotRoutes?.weapon?.item;
    const partial=candidate?.slotFallback==='signed-pose-omit'&&candidate.layeredSlots===true&&
      !candidate.unsupported?.length&&candidate.omitted?.length&&model&&candidate.slotRoutes?.weapon?.quality==='hd';
    if((!complete(candidate)&&!partial)||(candidate.resolvedAction??candidate.action)!==action||
        (model?bound!==def:bound!=null))return source;
    const pending=new Set(partial?candidate.omitted:[]);
    for(const [key,entry]of Object.entries(player.equipment||{})){
      if(entry==null||['none','original'].includes(entry)||key==='weapon'&&options.weaponless||
        key==='head'&&Headgear.hidden(player)||['necklace','ring','belt','charm','cloak','akuma_no_mi'].includes(key))continue;
      const carried=candidate.slotRoutes?.[key];
      if(carried?.item!==(entry?.def??entry))return source;
      if(pending.has(key)){
        if(!['head','coat','torso','legs','pants','boots','gloves'].includes(key)||
            carried.quality!=='missing'||carried.reason!=='no-signed-pose-pass')return source;
        pending.delete(key);
      }else if(carried.quality!=='hd')return source;
    }
    return pending.size?source:candidate;
  }
  function selectWorldHDOnly(nativeHD,weaponCatalog,player,options){
    if(!nativeHD?.selectVisual||!player||player.zoanTransformed)return null;
    if(['attack','skill'].includes(options.action)){
      const raw=player.equipment?.weapon,item=raw?.def??raw,category=weaponCatalog?.classes?.[player.classId];
      const model=item==null||options.weaponless?null:weaponCatalog?.items?.find(w=>w.itemId===item&&w.category===category);
      if(category&&(item==null||options.weaponless||model)){
        const action=model?(model.attackAction||nativeHD.attackActionFor?.(item)||'attack-'+category):'attack-unarmed';
        if(actions.includes(action))options={...options,action};
      }
    }
    const selectPose=(actor,pose)=>{
      const current=selectWorldHD(nativeHD,weaponCatalog,actor,pose);
      if(current)return current;
      // Pre-versioned saves used English body IDs and omitted the natural
      // skin style. Adapt that representation only for this render request.
      const saved=actor.appearance96,cosmetics=root.MareCharacterAppearance;
      if(!saved||!cosmetics?.normalize||saved.version!=null&&saved.version!==1||
         !['male','female','masculino','feminino'].includes(saved.gender)||
         saved.version===1&&saved.skinStyle&& !['male','female'].includes(saved.gender))return null;
      const gender={male:'masculino',female:'feminino'}[saved.gender]||saved.gender;
      const look=cosmetics.normalize({...saved,gender});
      if(Object.keys(cosmetics.choices).some(k=>k!=='gender'&&saved[k]!=null&&look[k]!==saved[k]))return null;
      return selectWorldHD(nativeHD,weaponCatalog,{...actor,appearance96:{...saved,...look}},pose);
    };
    // Keep the independent route stable on either side of an equipment
    // change. Exact artwork still handles receivers with bespoke renderers.
    const independent=nativeHD.selectIndependentWorld?.(player,options,selectPose);
    if(independent&&!independent.omitted.length)return independent;
    const exact=selectPose(player,options);
    if(exact&&!exact.visualDegraded&&!exact.appearanceAdapted&&!exact.omitted?.length&&!exact.unsupported?.length){
      const equipped=player.equipment?.weapon,item=equipped?.def??equipped;
      if(!options.weaponless&&exact.hdKind==='weapon'&&item!=null&&item===exact.item&&exact.id&&!exact.slotRoutes?.weapon){
        const source=exact.id;
        return {...exact,slotRoutes:{...exact.slotRoutes,weapon:{item,quality:'hd',source}},
          slotResolution:{...exact.slotResolution,weapon:{state:'hd',source}}};
      }
      return exact;
    }
    if(exact?.slotFallback==='signed-pose-omit'&&exact.layeredSlots&&!exact.unsupported?.length&&!exact.appearanceAdapted)return exact;
    return independent||null;
  }
  const restAliases=Object.freeze(['combat-idle','guard','hurt','death']);
  const worldAction=action=>restAliases.includes(action)?'idle':action;
  const gaitStates=new WeakMap();
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

  const directionOf=value=>({front:'south',back:'north',left:'west',right:'east'})[value]||value;
  const enabled=()=>true;
  const clipKey=(action,dir,look,weaponless=false)=>action+':'+dir+':'+(look.hideHeadgear?'hidden':'visible')+(weaponless?':weaponless':'');
  const safeFile=file=>typeof file==='string'&&/^assets\/[a-z0-9-]+\.png$/.test(file);
  function assetReferences(value,out=new Set()){
    if(typeof value==='string'&&safeFile(value))out.add(value);
    else if(Array.isArray(value))for(const v of value)assetReferences(v,out);
    else if(value&&typeof value==='object')for(const v of Object.values(value))assetReferences(v,out);
    return out;
  }
  function validateRelease(release,manifest,catalog,rigs,weapons){
    if(release?.id!=='native-player96-v1'||release.productionEnabled!==true||release.renderer!=='native96'||!/^native96-[a-f0-9]{16}$/.test(release.assetRevision||''))throw Error('Invalid current player release');
    if(release.manifestRevision!==manifest.visualRevision||release.weaponRevision!==weapons.revision)throw Error('Current release metadata differs');
    const refs=assetReferences([manifest,catalog,rigs,weapons]),files=Object.keys(release.resources||{});
    if(!refs.size||files.length!==refs.size||files.some(f=>!safeFile(f)||!refs.has(f)||!Array.isArray(release.resources[f])||release.resources[f].length!==2||release.resources[f].some(n=>!Number.isInteger(n)||n<=0||n>8192)))throw Error('Invalid current resource registry');
    if(!Array.isArray(catalog.styles)||new Set(catalog.styles.map(s=>s.id)).size!==catalog.styles.length)throw Error('Duplicate appearance identity');
    if(manifest.referenceHeight!==96||manifest.frame?.width!==128||manifest.frame?.height!==128)throw Error('Invalid current body scale');
    for(const [body,entry]of Object.entries(manifest.bodies||{}))for(const [action,dirs]of Object.entries(entry.clips||{}))for(const [direction,clip]of Object.entries(dirs)){
      const frame=clip.frame||manifest.frame;
      for(const file of Object.values(clip.layers||{})){const size=release.resources[file];if(!size||size[0]!==frame.width*clip.frames||size[1]!==frame.height){const error=Error('Native strip incompatible: '+file);error.spriteContext={component:'current-release-validation',asset:file,body,action,direction,code:'invalid-native-layout'};throw error;}}
    }
    return true;
  }
  function appearanceLook(player,look,production=false){return production&&player?.appearance96?{...look,...Cosmetics.toLook(player)}:look;}
  function outfit(catalog,player,look,{production=false}={}){
    look=appearanceLook(player,look,production);
    const value={hair:look.hair,face:look.face,skin:look.skin,hairColor:look.hairColor,...(look.eyeColor?{eyeColor:look.eyeColor}:{})},missing=[];
    for(const kind of Object.values(slots))value[kind]='original';
    const kits={'sample-a':{coat:6,legs:21,boots:8,gloves:25,cloak:23,head:18},'sample-b':{coat:7,legs:22,boots:9,gloves:26,cloak:24,head:19}};
    for(const [slot,kind]of Object.entries(slots)){
      if(!(root.MareWeapons96||Equipment).composition.rendersSlot(slot))continue;
      const def=look.kit==='equipped'?player?.equipment?.[slot]?.def:kits[look.kit]?.[slot];
      if(def===undefined||def===null)continue;
      const item=catalog.styles.find(s=>s.kind===kind&&s.itemId===def);
      if(item)value[kind]=item.id;else missing.push({slot,def});
    }
    value.hideHeadgear=Headgear.hidden(player);
    if(production&&!player?.appearance96&&look.hair==='original'&&look.hairColor==='brown'&&(!player?.paperDollLook||player.paperDollLook.hair==='short-black'))value.hairColor='black';
    if(!player?.appearance96&&look.hair==='original'&&player?.paperDollLook?.hair==='bald')value.hair='none';
    value.baseOutfitHidden=player?.paperDollLook?.outfit==='base'&&!player?.equipment?.coat||missing.some(m=>m.slot==='coat');
    if(missing.some(m=>m.slot==='legs'))value.pants='none';
    return {look:value,missing};
  }
  function frameAt(clip,time,progress=null){
    const frame=Number.isFinite(progress)?Math.floor(Math.max(0,Math.min(1,progress))*clip.frames):Math.floor(Math.max(0,time)*clip.fps);
    return clip.loop?frame%clip.frames:Math.min(clip.frames-1,frame);
  }
  function create({search='',baseURL=root.location?.href,onChange=()=>{},sharedLobby=false,beforeNativeIndexes=null}={}){
    const active=enabled(search),rehearsal=false,base=new URL('tools/paper-doll-96-v3/',baseURL);
    const nativeHD=root.MareReworkNativeHD?.create({baseURL,onChange,beforeIndexes:beforeNativeIndexes});
    const hasPositions=!!(root.MareHDPosition&&nativeHD&&typeof fetch==='function');
    let approved=null,approvedLoaded=!hasPositions;
    if(hasPositions)void fetch(new URL('hd-position-approved.json',baseURL),{cache:'no-cache'})
      .then(async response=>{if(!response.ok)throw Error('HTTP '+response.status);approved=root.MareHDPosition.validate(await response.json());})
      .catch(error=>diagnose(error,{consumer:'hd-position',asset:'hd-position-approved.json'}))
      .finally(()=>{
        const pending=waitingPrime;
        waitingPrime=null;approvedLoaded=true;
        if(pending)primeWorldVisual(pending.player,pending);
        if(approved?.records.length)onChange();
      });
    const defaultHD=root.MareReworkDefaultHD?.create({native:nativeHD,baseURL,onChange});
    const accessoryPilot=root.MareReworkAccessoryTest?.create({search,baseURL,onChange});
    const weaponCycles=root.MareReworkWeapons?.create({search,baseURL,onChange});
    const outfitCycles=root.MareReworkWeapons?.create({search,baseURL,onChange,mode:'outfits',manifestPath:'tools/rework-outfits/catalog.json'});
    const pilot=root.MarePlayerReworkTest?.create({search,baseURL,onChange});
    const signedRework=root.MarePlayerReworkRuntime?.create({release:root.MarePlayerReworkRelease,onChange,loadImage:async path=>{const im=new Image();im.src=new URL(path,baseURL).href;await im.decode();return im;}});
    const rework=weaponCycles?.active?weaponCycles:outfitCycles?.active?outfitCycles:accessoryPilot?.active?accessoryPilot:pilot?.active?pilot:signedRework;
    let state=active?'loading':'off',message='',previewMessage='',release=null,assetRevision=null,manifest,catalog,rigs,weaponCatalog,wardrobe,choices={},current={...defaults},draft={...defaults};
    let draws=0,lastPose=null,pending=null,preparing=null,wanted=null,bundles=new Map(),failed=new Set();
    const images=new Map(),inflight=new Map(),imageFailures=new Map(),diagnostics=new Map();let loading=0,peakLoads=0,imageBytes=0;const waiting=[];
    const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
    let inventoryPreview=null;
    function drawFittedAvatar(ctx,player,{zoom=3,consumer='inventory'}={}){
      const result=nativeHD?.drawFittedAvatar(ctx,player,{zoom,consumer})||
       drawTypedSurface(ctx,player,{action:'idle',direction:'south',time:0,progress:0,consumer,
        inventoryPresentation:true,avatarZoom:zoom,avatarConsumer:consumer})||null;
      if(consumer==='inventory')inventoryPreview=result;
      return result;
    }
    const snapshot=()=>({inventoryPreview,nativeHD:nativeHD?.snapshot(),defaultHD:defaultHD?.snapshot(),rework:rework?.snapshot()||{state:'disabled'},worldVisual:worldVisual(),renderer:compatibleWorldPose(worldDrawn?.entry,worldRequest)||worldRequest?.bundle?'native-hd':['rendered','holding-native-while-loading'].includes(nativeHD?.snapshot()?.last?.state)?'native-hd':signedRework?.active?'rework':'pending-hd',enabled:active,rehearsal,state,message,previewMessage,assetRevision,visualState:['rendered','holding-native-while-loading'].includes(nativeHD?.snapshot()?.last?.state)?'ready':state!=='ready'?state:wanted&&failed.has(wanted.key)?'failed':wanted&&!bundles.has(wanted.key)?'loading':wanted?.missing.length?'degraded':'ready',errors:[...diagnostics.values()],missing:wanted?.missing||[],look:wanted?{body:wanted.body,...wanted.look,kit:'equipped'}:{...current},draft:{...draft},draws,lastPose,loading:!!pending,images:images.size,imageBytes,bundles:bundles.size,previews:surfacePoses.size,peakLoads});
    function diagnose(error,context={}){
      const detail={component:context.consumer||'player',...context,...error.spriteContext,status:'failed',message:error.message};
      const key=[detail.asset||detail.component,detail.code||'load-failed'].join(':');
      if(!diagnostics.has(key)){diagnostics.set(key,detail);while(diagnostics.size>24)diagnostics.delete(diagnostics.keys().next().value);console.error('[current-player-sprite]',detail);}
      return detail;
    }
    function report(error,context={}){diagnose(error,context);message='Não foi possível carregar o visual atual. Recarregue a página; o diagnóstico registra o recurso com falha.';onChange();}
    function failure(message,context){const error=Error(message);error.spriteContext=context;return error;}
    async function json(file){const url=new URL(file,base);if(assetRevision&&file!=='player-pack.json')url.searchParams.set('revision',assetRevision);const r=await fetch(url,{cache:file==='player-pack.json'?'no-cache':'default'});if(!r.ok)throw failure('Arquivo ausente: '+file,{component:'player-manifest',asset:file,resolved:url.href,code:'manifest-http'});try{return await r.json();}catch(cause){throw failure('Manifesto inválido: '+file,{component:'player-manifest',asset:file,resolved:url.href,code:'manifest-json'});}}
    function script(file){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.async=false;node.src=new URL(file+'?revision='+assetRevision,base).href;node.onload=resolve;node.onerror=()=>reject(failure('Compositor indisponível: '+file,{component:'player-compositor',asset:file,resolved:node.src,code:'module-load'}));document.head.append(node);});}
    async function image(file,context={}){
      const size=release?.resources?.[file];
      if(!safeFile(file)||!size)throw failure('Camada fora do registro atual: '+file,{...context,asset:file,code:'unregistered-resource'});
      if(imageFailures.has(file))throw imageFailures.get(file);
      if(images.has(file)){const value=images.get(file);images.delete(file);images.set(file,value);return value;}
      if(inflight.has(file))return inflight.get(file);
      const url=new URL(file+'?revision='+assetRevision,base).href;
      const promise=(async()=>{
        if(loading>=6)await new Promise(resolve=>waiting.push(resolve));loading++;peakLoads=Math.max(peakLoads,loading);
        try{
          const img=new Image();img.src=url;await img.decode();
          if(img.naturalWidth!==size[0]||img.naturalHeight!==size[1])throw Error('Dimensões incompatíveis com o registro atual');
          images.set(file,img);imageBytes+=size[0]*size[1]*4;while(images.size>192||imageBytes>64*1024*1024){const oldest=images.keys().next().value,old=images.get(oldest);imageBytes-=old.naturalWidth*old.naturalHeight*4;images.delete(oldest);}return img;
        }catch(cause){const error=failure('Falha na camada atual '+file+': '+cause.message,{...context,component:context.consumer||'player-compositor',asset:file,resolved:url,code:'image-load'});imageFailures.set(file,error);diagnose(error,context);throw error;}
        finally{loading--;waiting.shift()?.();}
      })();inflight.set(file,promise);try{return await promise;}finally{inflight.delete(file);}
    }
    const ready=active?(async()=>{
      try{
        release=await json('player-pack.json');assetRevision=release.assetRevision;
        if(!rehearsal&&(!release||release.productionEnabled!==true||release.id!=='native-player96-v1'))throw Error('Liberação visual indisponível.');
        [manifest,catalog,rigs,weaponCatalog]=await Promise.all(['manifest.json','appearance-catalog.json','appearance-rig.json','weapons.json'].map(json));
        validateRelease(release,manifest,catalog,rigs,weaponCatalog);
        await Promise.all(['rig','layers','motion','surface','torso','appearance','weapons','wardrobe'].map(name=>script(name+'.js')));
        await nativeHD?.warmSwordCheckpoint?.();
        root.MareLayers96.validate(manifest);
        if(catalog.productionEnabled!==false||catalog.canonicalMirror?.allLayers!==true)throw Error('Contrato de revisão incompatível.');
        for(const body of ['masculino','feminino'])for(const action of actions)for(const dir of ['south','north','east','west']){
          const clip=manifest.bodies[body]?.clips[action]?.[dir];if(!clip?.modular||!clip.frames||!clip.fps)throw Error('Movimento incompleto.');
        }
        choices={body:{masculino:'Masculino',feminino:'Feminino'},hair:{original:'Original',none:'Sem cabelo'},face:{original:'Original'},skin:{original:'Original'},hairColor:{},kit:{equipped:'Equipamentos atuais',none:'Sem equipamentos', 'sample-a':'Conjunto de ensaio A','sample-b':'Conjunto de ensaio B'}};
        for(const s of catalog.styles)if(s.kind==='hair'||s.kind==='face')choices[s.kind][s.id]=s.name;
        for(const [id,p]of Object.entries(root.MareAppearance96.skins))choices.skin[id]=p.name;
        for(const [id,p]of Object.entries(root.MareAppearance96.hairs))choices.hairColor[id]=p.name;
        wardrobe=root.MareWardrobe96.create(catalog,rigs,image,{weapons:weaponCatalog,manifest});state='ready';onChange();
      }catch(error){state='failed';report(error,{consumer:'player-init',asset:'player-pack.json'});}return snapshot();
    })():Promise.resolve(snapshot());
    function resolve(player,look=current,production=true){look=appearanceLook(player,production?defaults:look,production);const value=outfit(catalog,player,look,{production}),category=weaponCatalog.classes[player?.classId]||null,model=weaponCatalog.items.find(w=>w.itemId===player?.equipment?.weapon?.def&&w.category===category);value.look.weapon=model?.id||'original';if(player?.equipment?.weapon&&!model)value.missing.push({slot:'weapon',def:player.equipment.weapon.def});const supported=!!category;for(const m of value.missing)diagnose(failure('Equipamento sem arte atual: '+m.def,{component:'equipment-resolver',asset:'item:'+m.def,slot:m.slot,code:'unmapped-equipment'}));return {...value,body:look.body,category,attack:model?.attackAction||'attack-'+category,supported,key:JSON.stringify([look.body,{...value.look,hideHeadgear:value.look.head==='original'?false:value.look.hideHeadgear},supported?category:null])};}
    function selected(body,action,direction,look){const clip=manifest.bodies[body].clips[action][direction];return {body,action,direction,clip,layers:clip.layers,look,key:[body,action,direction].join(':')};}
    async function compose(body,action,direction,look,cancel=()=>false,consumer='player-prepare'){
      const sel=selected(body,action,direction,look),spec=root.MareMotion96.clipSpec(manifest,sel.clip);
      const files=[...new Set([...wardrobe.nativeFiles(sel,look),...wardrobe.requiredFiles(sel,look,[])])];
      const loaded=new Map(await Promise.all(files.map(async file=>[file,await image(file,{consumer,body,action,direction})])));
      const pad=wardrobe.weaponPadding(sel,spec,look),renderSpec={...spec,width:spec.width+pad.x*2,height:spec.height+pad.top+pad.bottom,pivot:{x:spec.pivot.x+pad.x,y:spec.pivot.y+pad.top}};
      // Preserve HD weapon pixels through composition. Anatomy and sockets stay
      // in their original logical coordinates; only the cached raster is denser.
      const density=weaponCatalog.items.find(w=>w.id===look.weapon)?.renderDensity||1;
      const strip=Object.assign(document.createElement('canvas'),{width:renderSpec.width*sel.clip.frames*density,height:renderSpec.height*density}),ctx=strip.getContext('2d'),emissions=[];
      const tile=Object.assign(document.createElement('canvas'),{width:renderSpec.width*density,height:renderSpec.height*density}),tc=tile.getContext('2d');tc.imageSmoothingEnabled=false;tc.scale(density,density);tc.translate(pad.x,pad.top);
      for(let frame=0;frame<sel.clip.frames;frame++){
        if(cancel()){strip.width=0;strip.height=0;return null;}
        tc.clearRect(-pad.x,-pad.top,renderSpec.width,renderSpec.height);emissions.push(wardrobe.draw(tc,loaded,sel,frame,spec,[],look));ctx.drawImage(tile,frame*renderSpec.width*density,0);await pause();
      }
      return {strip,spec:renderSpec,nativeSpec:spec,clip:sel.clip,emissions,density};
    }
    function trimSourceImages(){
      // Ready animation strips own their pixels. Keep small fittings warm instead of retaining every source atlas during combat.
      while(imageBytes>8*1024*1024&&images.size){
        let key;for(const [file,img]of images)if(img.naturalWidth*img.naturalHeight*4>256*1024){key=file;break;}
        key??=images.keys().next().value;const img=images.get(key);imageBytes-=img.naturalWidth*img.naturalHeight*4;images.delete(key);
      }
    }
    function releaseBundle(bundle){for(const value of new Set(bundle?.values())){const strip=value?.strip;if(strip){strip.width=0;strip.height=0;}}}
    function ensure(player,{consumer='player-prepare'}={}){
      if(!rehearsal)return prepareVisual(player,{consumer:'world',action:'idle',direction:'south'});
      if(state!=='ready')return Promise.resolve(false);
      const target=resolve(player);
      // Public peers share a bounded idle/walk cache; do not cancel another peer while composing.
      if(sharedLobby&&pending)return pending;
      wanted=target;
      if(bundles.has(target.key))return Promise.resolve(true);
      if(failed.has(target.key))return Promise.resolve(false);
      if(pending)return pending;
      pending=(async()=>{
        while(wanted&&!bundles.has(wanted.key)&&!failed.has(wanted.key)){
          const next=wanted,bundle=new Map();preparing={key:next.key,bundle};
          try{
            for(const action of ['idle','walk',...(!sharedLobby&&next.supported?[next.attack,'attack-unarmed']:[])].filter((v,i,a)=>a.indexOf(v)===i))for(const dir of ['south','north','east']){
              if(wanted.key!==next.key)break;
              // Fruit punches use a prepared weaponless strip in the equipped bundle.
              // Do not change wardrobe identity or reload it for a short cast.
              for(const weaponless of action==='attack-unarmed'&&next.look.weapon!=='original'?[true,false]:[false]){
                const stateLook={...next.look,...(weaponless?{weapon:'original'}:{})},key=clipKey(action,dir,stateLook,weaponless);
                const value=await compose(next.body,action,dir,stateLook,()=>wanted.key!==next.key,consumer);
                if(value){bundle.set(key,value);if(next.look.head==='original')bundle.set(clipKey(action,dir,{...stateLook,hideHeadgear:!stateLook.hideHeadgear},weaponless),value);}
              }
            }
            if(wanted.key!==next.key){releaseBundle(bundle);continue;}
            bundles.set(next.key,bundle);while(bundles.size>(sharedLobby?16:2)){const key=bundles.keys().next().value;releaseBundle(bundles.get(key));bundles.delete(key);}message='';if(sharedLobby)trimSourceImages();onChange();
          }catch(error){releaseBundle(bundle);failed.add(next.key);if(failed.size>8)failed.delete(failed.values().next().value);if(wanted?.key===next.key)report(error,{consumer});else diagnose(error,{consumer});}
        }
        return bundles.has(wanted?.key);
      })().finally(()=>{pending=null;preparing=null;});return pending;
    }
    const bundleFor=key=>bundles.get(key)||(preparing?.key===key&&!failed.has(key)?preparing.bundle:null);
    function paint(ctx,value,direction,frame,x,y,scale){
      const {spec,strip}=value;ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.translate(-spec.pivot.x,-spec.pivot.y);
      if(direction==='west'){ctx.translate(spec.width+1,0);ctx.scale(-1,1);}
      const density=value.density||1;ctx.drawImage(strip,frame*spec.width*density,0,spec.width*density,spec.height*density,0,0,spec.width,spec.height);ctx.restore();
    }
    function draw(ctx,player,{scene,action='idle',direction='south',time=0,progress=null,timing=null,x=0,y=0,scale=null,worldView=false,consumer='world',weaponless=false}={}){
      direction=directionOf(direction);if(worldView)lastPose=null;
      if(consumer==='world')return drawWorldVisual(ctx,{scene,action,direction,time,progress,timing,x,y,scale,consumer,weaponless},player);
      if(consumer==='world-silhouette'){
        if(root.MareVisualCompletoRenderer?.equipped(player)){
          return root.MareVisualCompletoRenderer.draw(ctx,player,{scene,action,direction,time,progress,timing,x,y,scale,consumer,weaponless});
        }
        return drawWorldSilhouette(ctx,player,{direction,time,progress,timing,x,y,scale,weaponless});
      }
      if(root.MareVisualCompletoRenderer?.draw(ctx,player,{scene,action,direction,time,progress,timing,x,y,scale,consumer})){draws++;return true;}
      // Peers share this instance. Use the same approved native selectors
      // without the single-actor World request/abort boundary.
      const nativeConsumer=sharedLobby?'world':consumer;
      const nativeAction=['combat-idle','guard','hurt','death'].includes(action)?'idle':action;
      if(nativeHD?.drawStable(ctx,player,{action:nativeAction,direction,time,progress,timing,x,y,consumer:nativeConsumer,weaponless})){defaultHD?.clear();draws++;return true;}
      if(drawTypedSurface(ctx,player,{action:nativeAction,direction,time,progress,timing,x,y,consumer,weaponless})){draws++;return true;}
      if(signedRework?.active&&signedRework.draw(ctx,player,{scene,action,direction,time,progress,timing,x,y,
       scale:scale===null?1:scale*46/96,consumer,weaponless})){draws++;return true;}
      // An unresolved pose remains pending. No palette substitution,
      // old player wardrobe strip, or unsigned review art may stand in.
      return false;
    }

    function valid(look){return Object.keys(defaults).every(key=>Object.hasOwn(choices[key]||{},look?.[key]));}
    function setDraft(key,value){if(Object.hasOwn(choices[key]||{},value)){draft={...draft,[key]:value};return true;}return false;}
    function apply(player){if(!valid(draft))return false;current={...draft};ensure(player);return true;}
    function discard(){draft={...current};}
    const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function panel(player){
      if(state!=='ready')return root.MareUI.notice({text:state==='loading'?'Carregando ensaio de aparência…':message,tone:'info'});
      const labels={body:'Corpo',hair:'Cabelo',face:'Rosto',skin:'Pele',hairColor:'Cor do cabelo',kit:'Equipamentos no ensaio'};
      const fields=Object.entries(choices).map(([key,options])=>`<label>${labels[key]}<select data-lobby96-look="${key}">${Object.entries(options).map(([id,name])=>`<option value="${E(id)}" ${draft[key]===id?'selected':''}>${E(name)}</option>`).join('')}</select></label>`).join('');
      const missing=resolve(player,draft).missing;
      return `<section class="doll-dressing"><header><h2>Ensaio de aparência no lobby · 96 px</h2><p>Escolhas temporárias. Seu personagem salvo e os atributos dos equipamentos são preservados.</p></header><div class="doll-dressing-grid"><figure><canvas id="lobby96Canvas" width="512" height="512" aria-label="Prévia da aparência de 96 pixels"></canvas><figcaption id="lobby96State" role="status"></figcaption><label>Direção<select id="lobby96Direction"><option value="south">Frente</option><option value="north">Costas</option><option value="west">Esquerda</option><option value="east">Direita</option></select></label><label>Movimento<select id="lobby96Action">${actions.map(a=>`<option value="${a}">${({idle:'Repouso',walk:'Caminhada','attack-sword':'Espada','attack-unarmed':'Punhos','attack-firearm':'Disparo','attack-daggers':'Adagas','attack-focus':'Canalização','attack-tech':'Tecnologia'})[a]}</option>`).join('')}</select></label></figure><div class="doll-dressing-controls">${fields}<p>Os conjuntos de ensaio mudam somente o visual. As prévias não causam dano. As armas equipadas das sete classes acompanham os movimentos e o combate. Peças sem matriz são diagnosticadas e não recebem uma substituta.</p>${missing.length?root.MareUI.notice({text:'Há equipamentos atuais sem arte de 96 px. Eles mantêm seus bônus; esta prévia não mostra uma peça substituta.',tone:'info'}):''}<div class="doll-dressing-actions">${root.MareUI.button({label:'Visualizar no lobby',attributes:{'data-lobby96-apply':''}})}${root.MareUI.button({label:'Descartar alterações',attributes:{'data-lobby96-cancel':''}})}</div><p id="lobby96Message" role="status">${E(message)}</p></div></div></section>`;
    }
    function preview(ctx,player,{action='idle',direction='south',time=0,appearance=null,consumer='appearance-preview'}={}){
      if(consumer==='character-creation'||consumer==='appearance-editor'){
        const draftPlayer={...player,appearance96:appearance??player.appearance96,equipment:{},zoanTransformed:false};
        const options={action,direction,time:0,x:ctx.canvas.width/2,y:ctx.canvas.height-24,consumer,previewFit:'appearance'};
        const direct=consumer==='character-creation'?{...options,previewFit:'creation'}:options;
        return !!(nativeHD?.draw(ctx,draftPlayer,direct)||drawTypedSurface(ctx,draftPlayer,options));
      }
      if(root.MareVisualCompletoRenderer?.draw(ctx,player,{action:'idle',direction,time:0,x:ctx.canvas.width/2,y:ctx.canvas.height-24,scale:192/46,consumer}))return true;
      if(nativeHD?.draw(ctx,appearance?{...player,appearance96:appearance}:player,{action,direction,time,x:ctx.canvas.width/2,y:ctx.canvas.height-24,consumer,preview:true})){defaultHD?.clear();return true;}
      // Draft previews use only their actual identity, never a held character.
      const shown=appearance?{...player,appearance96:appearance}:player;
      if(drawTypedSurface(ctx,shown,{action,direction,time,x:ctx.canvas.width/2,y:ctx.canvas.height-24,consumer,preview:true}))return true;
      if(!appearance&&signedRework?.active&&signedRework.draw(ctx,player,{action,direction,time,preview:true,
       x:ctx.canvas.width/2,y:ctx.canvas.height-24,scale:2,consumer}))return true;
      return false;
    }

    function projectileOrigin(player,hero,pose={},scale=1){
      const direction=directionOf(pose.direction||hero.direction);
      const bundle=player&&worldPoses.get(worldPoseKey(player,{action:pose.action||'attack',direction}))?.bundle;
      if(bundle?.projectileOrigin)return bundle.projectileOrigin(hero,{...pose,direction},scale);

      if(rework?.active&&!player?.zoanTransformed)return rework.projectileOrigin(player,hero,pose,scale);
      if(!active||state!=='ready'||player?.zoanTransformed)return null;
      const value=resolve(player);if(!value.supported||!['firearm','tech','focus'].includes(value.category)||value.look.weapon==='original')return null;
      const clip=bundleFor(value.key)?.get(clipKey(value.attack,direction==='west'?'east':direction,value.look));
      const point=clip?.emissions[4]?.[0]?.point;if(!point)return null;
      const spec=clip.nativeSpec,x=direction==='west'?spec.width+1-point.x:point.x;
      return {x:hero.x+(x-spec.pivot.x)*scale,y:hero.y+(point.y-spec.pivot.y)*scale,frame:4,weapon:value.look.weapon};
    }
    async function prepareVisual(player,options={}){
      if(options.consumer==='world'){
        if(!player||player.zoanTransformed)return false;
        const action=worldAction(options.action||'idle');
        const entry=requestWorldVisual(player,{action,direction:directionOf(options.direction||'south'),consumer:'world',
          weaponless:action!=='idle'&&!!options.weaponless},{publish:false});
        await entry.promise;
        return !!entry.bundle;
      }
      if(await nativeHD?.prepareClip(player,options))return true;
      const pending=requestTypedSurface(player,options);
      if(pending&&await pending.ready)return true;
      return signedRework?.active?!!(await signedRework.prepare(player,options)):false;
    }
    // The current request and the pose that was actually painted may differ
    // while its replacement is prepared.
    const worldPoses=new Map();
    let worldRequest=null,worldDrawn=null,worldWarm=null,worldPrime=null,waitingPrime=null;
    const worldDirections=['north','east','south','west'];
    const locomotion=action=>action==='idle'||action==='walk';
    const visualIdentity=player=>JSON.stringify([
      player.classId,player.factionId,player.appearance96,player.paperDollLook,
      Object.entries(player.equipment||{}).filter(([,item])=>item!=null).sort(([a],[b])=>a.localeCompare(b)).map(([slot,item])=>[slot,item.def??item,item.variant,item.variantId,item.appearanceVariant]),
      Headgear.hidden(player),!!player.zoanTransformed
    ]);
    // Typed preview plans share the HD selector, not the World request's
    // singleton player identity. This cache is bounded and cannot paint a
    // plan prepared for an older avatar/draft.
    const surfacePoses=new Map();
    let surfaceLoading=0;
    function requestTypedSurface(player,options){
      if(!player||player.zoanTransformed||!weaponCatalog||!nativeHD?.prepareConfiguration||
         typeof selectWorldHDOnly!=='function')return null;
      const direction=directionOf(options.direction||'south'),action=options.action||'idle',
       requested={action,direction,weaponless:!!options.weaponless,consumer:'world'};
      const held=player.equipment?.weapon,weapon=held?.def??held;
      if(weapon!=null&&!requested.weaponless&&!weaponCatalog.items.some(w=>
         w.itemId===weapon&&w.category===weaponCatalog.classes[player.classId]))return null;
      const key=JSON.stringify([visualIdentity(player),action,direction,requested.weaponless]);
      const old=surfacePoses.get(key);
      if(old){surfacePoses.delete(key);surfacePoses.set(key,old);return old;}
      if(surfaceLoading>=2)return null;
      const source=selectWorldHDOnly(nativeHD,weaponCatalog,player,requested);
      if(!source||source.appearanceAdapted||source.unsupported?.length||source.visualDegraded)return null;
      const snapshot={...player,appearance96:{...player.appearance96},preferences:{...player.preferences},
       equipment:Object.fromEntries(Object.entries(player.equipment||{}).map(([slot,v])=>[slot,v&&typeof v==='object'?{...v}:v]))};
      const resolved=requested,
       pose={player:snapshot,options:resolved},controller=new AbortController(),
       entry={source,resolved,controller,bundle:null,ready:null};
      surfacePoses.set(key,entry);surfaceLoading++;
      while(surfacePoses.size>8){
        const [oldKey,prior]=surfacePoses.entries().next().value;
        prior.controller.abort();prior.bundle?.release();surfacePoses.delete(oldKey);
      }
      entry.ready=nativeHD.prepareConfiguration([pose],{signal:controller.signal,resolve:()=>({...pose,source})})
       .then(bundle=>{
        if(controller.signal.aborted){bundle.release();return false;}
        entry.bundle=bundle;onChange();return true;
       }).catch(error=>{
        if(!controller.signal.aborted)diagnose(error,{consumer:'hd-surface',asset:action+'/'+direction});
        return false;
       }).finally(()=>{surfaceLoading--;});
      return entry;
    }
    function drawTypedSurface(ctx,player,options){
      const entry=requestTypedSurface(player,options);
      if(!entry?.bundle)return null;
      const {source,resolved,bundle}=entry;
      if(!bundle.draw(ctx,player,{...options,...resolved}))return null;
      return {source:source.id,omitted:source.omitted||[],slotRoutes:source.slotRoutes||{},consumer:options.consumer,typedHD:true};
    }
    const positionRevision=positions=>positions?.records.length?positions.revision:null;
    const worldPoseKey=(player,o,identity=visualIdentity(player),revision=positionRevision(approved))=>
      JSON.stringify([identity,o.action,o.direction,!!o.weaponless,revision]);
    const sameWorldIdentity=(a,b)=>!!a&&!!b&&a.identity===b.identity&&a.revision===b.revision;
    const hidesWeapon=(player,options)=>{
      const held=player.equipment?.weapon,item=held?.def??held;
      return !!options.weaponless&&item!=null&&item!=='none'&&item!=='original';
    };
    const worldRetryDelay=[1500,3000];
    const hasFailedSlot=bundle=>bundle?.coverage?.some(pose=>
      Object.values(pose.slotResolution||{}).some(slot=>slot.state==='load-failed'));
    function releaseWorldPose(entry,reason='pose-released'){
      if(entry.promise){
        entry.state='cancelled';
        entry.reason=reason;
      }
      entry.controller.abort();
      entry.settle?.();
      entry.settle=null;
      worldPrime?.queue.delete(entry.key);
      entry.bundle?.release();
      entry.bundle=null;
      worldPoses.delete(entry.key);
      if(worldWarm===entry)worldWarm=null;
    }
    function clearWorldVisual(){
      for(const entry of worldPoses.values())releaseWorldPose(entry);
      worldPrime=null;
      waitingPrime=null;
      worldRequest=null;
      worldDrawn=null;
    }
    const worldVisual=()=>worldRequest?{key:worldRequest.key,state:worldRequest.state,error:worldRequest.error,reason:worldRequest.reason,coverage:worldRequest.bundle?.coverage||[],preparedAt:worldRequest.preparedAt,firstDrawAt:worldRequest.firstDrawAt,publishedKey:worldRequest.bundle?worldRequest.key:undefined,preparation:worldPreparation(),
      displayed:compatibleWorldPose(worldDrawn?.entry,worldRequest)?{key:worldDrawn.entry.key,action:worldDrawn.entry.options.action,direction:worldDrawn.entry.options.direction,
        weaponless:worldDrawn.entry.options.weaponless,source:worldDrawn.entry.bundle?.coverage?.[0]?.source,exact:worldDrawn.entry===worldRequest}:null}:null;
    const worldReady=player=>!!player&&worldRequest?.state==='ready'&&
      sameWorldIdentity(worldRequest,{identity:visualIdentity(player),revision:positionRevision(approved)})&&
      firstWorldPresentationReady(worldRequest);
    async function prepareWorldPose(entry){
      const {player,options,positions,controller:{signal}}=entry;
      if(!entry.bundle)entry.state='loading';
      let bundle;
        try{
          // Both providers use the appearance registry loaded by the lobby.
          await Promise.all([ready,nativeHD?.ready]);
          signal.throwIfAborted();
          const pose={player,options};
          const source=selectWorldHDOnly(nativeHD,weaponCatalog,player,options);
          if(!source)throw Object.assign(Error('Sem fonte HD: '+options.action+' / '+options.direction),{code:'no-hd-pose'});
          const plan=sameWorldIdentity(entry,worldPrime)?worldPrime:null;
          const physical=plan&&nativeHD.sourceKeyFor&&JSON.stringify([
            nativeHD.sourceKeyFor(source,player),source.resolvedAction??source.action,options.direction,!!options.weaponless
          ]);
          const cached=physical&&plan.physical.get(physical);
          if(cached)bundle=retainWorldBundle(cached,options);
          else{
            bundle=await nativeHD.prepareConfiguration([pose],{signal,positions,bakePositions:true,
              ...(plan?{compactFrames:true}:{}),resolve:()=>({...pose,source})});
            signal.throwIfAborted();
            if(physical&&!hasFailedSlot(bundle)&&!bundle.coverage?.some(row=>row.omitted?.length||row.unsupported?.length)){
              const shared={bundle,options,users:0,drop:()=>plan.physical.delete(physical)};
              plan.physical.set(physical,shared);
              bundle=retainWorldBundle(shared,options);
            }
          }
          for(const reason of bundle.positionView?.(options)?.diagnostics||[])diagnose(Error(reason),{consumer:'hd-position',asset:source.id});
          signal.throwIfAborted();
          // A retry may succeed with a different pass missing. Keep the
          // current partial result unless the replacement preserves its passes.
          const missing=result=>new Set((result?.coverage||[]).flatMap(pose=>pose.omitted||[]));
          const previouslyMissing=missing(entry.bundle);
          if(!entry.bundle||[...missing(bundle)].every(slot=>previouslyMissing.has(slot))){
            entry.bundle?.release();
            entry.bundle=bundle;bundle=null;
          }
          entry.state='ready';entry.preparedAt=performance.now();
          entry.error=null;entry.reason=null;
          entry.retryAt=hasFailedSlot(entry.bundle)&&entry.retries<worldRetryDelay.length
            ?entry.preparedAt+worldRetryDelay[entry.retries]:null;
        }catch(error){
          if(signal.aborted)return;
          const at=performance.now();
          Object.assign(entry,{state:entry.bundle?'ready':'failed',error:error.message,
            reason:error.code||(error.asset?'source-load-failed':'composition-failed'),
            retryAt:error.code!=='no-hd-pose'&&entry.retries<worldRetryDelay.length?at+worldRetryDelay[entry.retries]:null});
          diagnose(error,{consumer:'world',asset:options.action+'/'+options.direction});
        }finally{bundle?.release();}
    }
    function requestWorldVisual(player,options,{publish=true}={}){
      const identity=visualIdentity(player),positions=approved,revision=positionRevision(positions);
      const key=worldPoseKey(player,options,identity,revision),scope={identity,revision};
      let entry=worldPoses.get(key);
      if(publish&&worldRequest?.key!==key){
        if(!sameWorldIdentity(worldRequest,scope)){
          worldDrawn=null;
          for(const previous of worldPoses.values())if(!sameWorldIdentity(previous,scope)&&previous.promise){
            releaseWorldPose(previous,'appearance-changed');
          }
        }
        if(worldWarm?.promise&&worldWarm.key!==key&&!entry?.bundle)releaseWorldPose(worldWarm,'foreground-pose');
      }
      if(entry){
        worldPoses.delete(key);worldPoses.set(key,entry);
        if(publish)worldRequest=entry;
        if(entry.retryAt!==null&&!entry.promise&&performance.now()>=entry.retryAt){
          entry.retries++;
          enqueueWorldPose(entry);
        }
        return entry;
      }
      const controller=new AbortController();
      const snapshot={...player,appearance96:player.appearance96&&{...player.appearance96},preferences:{...player.preferences},
        equipment:Object.fromEntries(Object.entries(player.equipment||{}).map(([slot,item])=>[slot,item&&typeof item==='object'?{...item}:item]))};
      entry={key,...scope,positions,player:snapshot,options:{...options},hidesWeapon:hidesWeapon(player,options),
        state:'loading',controller,retries:0,retryAt:null};
      worldPoses.set(key,entry);if(publish)worldRequest=entry;
      const limit=worldPrime?Math.max(12,worldPrime.planned.size+4):12;
      while(worldPoses.size>limit){
        const oldest=[...worldPoses.values()].find(pose=>pose!==worldRequest&&pose!==worldDrawn?.entry&&!worldPrime?.planned.has(pose.key));
        if(!oldest)break;
        releaseWorldPose(oldest,'pose-evicted');
      }
      enqueueWorldPose(entry);
      return entry;
    }
    function retainWorldBundle(shared,options){
      const raster=shared.bundle,route=o=>({...o,action:shared.options.action});
      shared.users++;
      let released=false;
      return {
        coverage:raster.coverage?.map(row=>({...row,action:options.action})),
        positionView:o=>raster.positionView?.(route(o)),
        projectileOrigin:raster.projectileOrigin&&((hero,o,scale)=>raster.projectileOrigin(hero,route(o),scale)),
        draw(ctx,player,o){
          if(released||!raster.draw(ctx,player,route(o)))return false;
          this.visualHeight=raster.visualHeight;
          return true;
        },
        release(){
          if(released)return;
          released=true;
          if(--shared.users===0){shared.drop();raster.release();}
        }
      };
    }
    function enqueueWorldPose(entry){
      if(!sameWorldIdentity(entry,worldPrime)){
        entry.promise=prepareWorldPose(entry).finally(()=>{entry.promise=null;});
        return;
      }
      entry.promise=new Promise(resolve=>{entry.settle=resolve;});
      worldPrime.queue.set(entry.key,entry);
      drainWorldPrime(worldPrime);
    }
    function drainWorldPrime(plan){
      if(plan!==worldPrime||plan.running||!plan.queue.size)return;
      const next=plan.queue.get(worldRequest?.key)||plan.queue.values().next().value;
      plan.queue.delete(next.key);
      plan.running=next;
      void prepareWorldPose(next).finally(()=>{
        next.settle?.();next.settle=null;next.promise=null;
        if(next.retryAt!==null)plan.retryAt=Math.min(plan.retryAt,next.retryAt);
        plan.running=null;
        drainWorldPrime(plan);
      });
    }
    function essentialPosesSettled(plan){
      for(const pose of plan.planned.values()){
        const state=worldPoses.get(pose.key)?.state;
        if(pose.required&&state!=='ready'&&state!=='failed')return false;
      }
      return true;
    }
    function firstWorldPresentationReady(entry){
      return !sameWorldIdentity(entry,worldPrime)||sameWorldIdentity(worldDrawn?.entry,worldPrime)||essentialPosesSettled(worldPrime);
    }
    function worldPreparation(){
      const plan=worldPrime;
      if(!plan)return null;
      const readyWalks=[],readyIdles=[],failed=[];
      let prepared=0,settled=0;
      for(const pose of plan.planned.values()){
        const entry=worldPoses.get(pose.key);
        if(entry?.state==='ready'||entry?.state==='failed')settled++;
        if(entry?.bundle){
          prepared++;
          if(pose.action==='walk')readyWalks.push(pose.direction);
          if(pose.action==='idle')readyIdles.push(pose.direction);
        }
        const reason=entry?.reason||(hasFailedSlot(entry?.bundle)?'slot-load-failed':null);
        if(reason)failed.push({action:pose.action,direction:pose.direction,reason});
      }
      return {state:settled<plan.planned.size?'loading':failed.length?'degraded':'ready',
        readyWalks:worldDirections.filter(dir=>readyWalks.includes(dir)),readyIdles:worldDirections.filter(dir=>readyIdles.includes(dir)),
        prepared,total:plan.planned.size,failed,essentialReady:essentialPosesSettled(plan)};
    }
    function primeWorldVisual(player,{direction='south',actions=[]}={}){
      if(!player||player.zoanTransformed||root.MareVisualCompletoRenderer?.equipped(player))return;
      if(!approvedLoaded){waitingPrime={player,direction,actions};return;}
      const identity=visualIdentity(player),revision=positionRevision(approved),scope={identity,revision};
      if(!sameWorldIdentity(worldPrime,scope)){
        const previous=worldPrime;
        worldPrime={...scope,planned:new Map(),queue:new Map(),physical:new Map(),running:null,retryAt:Infinity};
        if(previous)for(const entry of worldPoses.values())if(sameWorldIdentity(entry,previous)){
          releaseWorldPose(entry,'appearance-changed');
        }
        previous?.queue.clear();
      }
      const plan=worldPrime;
      if(plan.actions!==actions){
        plan.actions=actions;
        const facing=directionOf(direction),directions=[facing,...worldDirections.filter(value=>value!==facing)].filter(value=>worldDirections.includes(value));
        const variants=[{action:'idle',required:true},{action:'walk',required:true},...actions.map(spec=>{
          const item=typeof spec==='string'?{action:spec}:spec;
          return {action:worldAction(item.action),weaponless:!!item.weaponless,required:!!item.essential};
        })];
        for(const variant of variants)for(const direction of directions){
          const options={action:variant.action,direction,weaponless:!!variant.weaponless,consumer:'world'};
          const key=worldPoseKey(player,options,identity,revision);
          plan.planned.set(key,{...options,key,required:variant.required||!!plan.planned.get(key)?.required});
        }
        for(const pose of plan.planned.values())if(!worldPoses.has(pose.key))requestWorldVisual(player,pose,{publish:false});
      }
      if(plan.retryAt<=performance.now()&&!plan.running){
        plan.retryAt=Infinity;
        for(const pose of plan.planned.values()){
          const entry=worldPoses.get(pose.key);
          if(entry?.retryAt==null||entry.promise)continue;
          if(entry.retryAt<=performance.now())requestWorldVisual(player,pose,{publish:false});
          else plan.retryAt=Math.min(plan.retryAt,entry.retryAt);
        }
      }
    }
    function warmWorldVisual(player,{action,direction,weaponless=false}={}){
      if(!player||!action||!direction||!worldDrawn||worldWarm?.promise||worldRequest?.promise||
         player.zoanTransformed||root.MareVisualCompletoRenderer?.equipped(player))return false;
      const identity=visualIdentity(player),revision=positionRevision(approved);
      if(!sameWorldIdentity(worldDrawn.entry,{identity,revision}))return false;
      const options={action:worldAction(action),direction:directionOf(direction),weaponless,consumer:'world'};
      if(worldPoses.has(worldPoseKey(player,options,identity,revision)))return false;
      worldWarm=requestWorldVisual(player,options,{publish:false});
      return true;
    }
    function retryWorldVisual(){
      for(const entry of worldPoses.values())if(!entry.promise&&(entry.state==='failed'||hasFailedSlot(entry.bundle))){
        entry.retries=0;
        entry.retryAt=performance.now();
      }
      imageFailures.clear();
    }
    function compatibleWorldPose(candidate,requested){
      return !!candidate?.bundle&&sameWorldIdentity(candidate,requested)&&candidate.hidesWeapon===requested.hidesWeapon;
    }
    function continuityPose(requested){
      const previous=worldDrawn?.entry,strictDirection=sameWorldIdentity(requested,worldPrime);
      const keepPrevious=compatibleWorldPose(previous,requested)&&(!strictDirection||previous.options.direction===requested.options.direction);
      if(keepPrevious&&locomotion(previous.options.action))return previous;
      // A finished attack may have a ready idle or walk to return to even
      // while its exact next direction is pending.
      let otherDirection=null;
      for(const candidate of worldPoses.values()){
        if(candidate===requested||!locomotion(candidate.options.action)||!compatibleWorldPose(candidate,requested))continue;
        if(candidate.options.direction===requested.options.direction)return candidate;
        otherDirection=candidate;
      }
      return (!strictDirection&&otherDirection)||(keepPrevious?previous:null);
    }
    function drawWorldVisual(ctx,options,player=worldRequest?.player,{publish=true}={}){
      if(!player)return false;
      const drawOptions={...options,direction:directionOf(options.direction)};
      if(root.MareVisualCompletoRenderer?.equipped(player)){
        if(publish)worldDrawn=null;
        return root.MareVisualCompletoRenderer.draw(ctx,player,drawOptions);
      }
      if(waitingPrime&&!approvedLoaded)return false;
      const action=worldAction(options.action),weaponless=action!=='idle'&&!!options.weaponless;
      const requested=requestWorldVisual(player,{action,direction:drawOptions.direction,weaponless,consumer:'world'},{publish});
      if(publish&&!firstWorldPresentationReady(requested))return false;
      const exact={...drawOptions,action,weaponless};
      const now=publish?performance.now():null;
      let painted=requested,paintOptions=exact;
      if(!requested.bundle?.draw(ctx,player,exact)){
        if(!publish||!worldDrawn)return false;
        painted=continuityPose(requested);
        if(!painted)return false;
        const previous=worldDrawn.entry===painted?worldDrawn:null;
        // Use the held route's own animation clock. Attack progress and
        // contact timing only belong to the attack they were computed for.
        const clock=locomotion(painted.options.action)
          ?{time:(previous?.time??0)+(now-(previous?.at??now))/1000,progress:null,timing:null}
          :{time:previous?.time,progress:previous?.progress,timing:previous?.timing};
        paintOptions={...drawOptions,...painted.options,...clock};
        if(!painted.bundle.draw(ctx,player,paintOptions))return false;
      }
      if(publish){
        painted.firstDrawAt??=now;
        worldDrawn={entry:painted,at:now,time:paintOptions.time,progress:paintOptions.progress,timing:paintOptions.timing};
        defaultHD?.clear();draws++;
        if(requested.state==='failed'&&!locomotion(painted.options.action)){
          const {direction,weaponless}=painted.options;
          warmWorldVisual(player,{action:'idle',direction,weaponless});
        }
      }
      return true;
    }
    function drawWorldSilhouette(ctx,player,options){
      const shown=worldDrawn,entry=shown?.entry;
      if(!entry?.bundle||!sameWorldIdentity(entry,{identity:visualIdentity(player),revision:positionRevision(approved)})||
         entry.options.direction!==options.direction||entry.hidesWeapon!==hidesWeapon(player,options))return false;
      return entry.bundle.draw(ctx,player,{...options,...entry.options,time:shown.time,progress:shown.progress,timing:shown.timing,
        consumer:'world-silhouette',auxiliary:true});
    }
    function drawWorldPortrait(ctx,player,{consumer,x=ctx.canvas.width/2,y=ctx.canvas.height-12,scale=null,zoom=null}={}){
      const options={action:'idle',direction:'south',time:0,progress:0,x,y,scale,consumer};
      if(zoom!==null)Object.assign(options,{inventoryPresentation:true,avatarZoom:zoom,avatarConsumer:consumer});
      const drawn=drawWorldVisual(ctx,options,player,{publish:false});
      if(consumer==='inventory'){
        inventoryPreview=drawn?(root.MareVisualCompletoRenderer?.equipped(player)?
          root.MareVisualCompletoRenderer.snapshot()?.last:nativeHD?.snapshot()?.last)||null:null;
      }
      return drawn;
    }
    function height(player){
      if(!active||!player||player.zoanTransformed)return null;
      const shown=worldDrawn?.entry;
      if(compatibleWorldPose(shown,worldRequest)&&shown.bundle.visualHeight&&
         sameWorldIdentity(shown,{identity:visualIdentity(player),revision:positionRevision(approved)})){
        return shown.bundle.visualHeight;
      }
      return nativeHD?.height(player)||96;
    }
    return {ready,snapshot,draw,drawFittedAvatar,drawWorldPortrait,height,ensure,prepareVisual,worldVisual,worldReady,requestWorldVisual,primeWorldVisual,warmWorldVisual,clearWorldVisual,retryWorldVisual,drawWorldVisual,stepWalk,walkPose,projectileOrigin,panel,preview,setDraft,apply,discard,valid,resolve:player=>state==='ready'?resolve(player):null};
  }
  root.MarePaperDoll96Lobby={create,enabled,defaults,slots,outfit,appearanceLook,assetReferences,validateRelease,frameAt,directionOf,actions:Object.freeze(actions),restAliases,worldAction,selectWorldHD,selectWorldHDOnly};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MarePaperDoll96Lobby;
})(typeof globalThis!=='undefined'?globalThis:window);
