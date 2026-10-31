/* Current player release. Shared wardrobe; save and combat state remain in the game. */
(function(root){
  'use strict';
  const Headgear=root.MareHeadgear||(typeof module!=='undefined'&&module.exports?require('./headgear-visibility.js'):null);
  const Cosmetics=root.MareCharacterAppearance||(typeof module!=='undefined'&&module.exports?require('./character-appearance.js'):null);
  const defaults=Object.freeze({body:'masculino',hair:'original',face:'original',skin:'original',hairColor:'brown',kit:'equipped'});
  const slots=Object.freeze({coat:'torso',legs:'pants',boots:'boots',gloves:'gloves',cloak:'cloak',head:'head'});
  const actions=['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'];
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
  const clipKey=(action,dir,look)=>action+':'+dir+':'+(look.hideHeadgear?'hidden':'visible');
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
  function create({search='',baseURL=root.location?.href,onChange=()=>{}}={}){
    const active=enabled(search),rehearsal=false,base=new URL('tools/paper-doll-96-v3/',baseURL);
    let state=active?'loading':'off',message='',previewMessage='',release=null,assetRevision=null,manifest,catalog,rigs,weaponCatalog,wardrobe,choices={},current={...defaults},draft={...defaults};
    let draws=0,lastPose=null,pending=null,preparing=null,wanted=null,bundles=new Map(),previews=new Map(),failed=new Set();
    const images=new Map(),inflight=new Map(),imageFailures=new Map(),diagnostics=new Map();let loading=0,peakLoads=0,imageBytes=0;const waiting=[];
    const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
    const snapshot=()=>({renderer:'native96',enabled:active,rehearsal,state,message,previewMessage,assetRevision,visualState:state!=='ready'?state:wanted&&failed.has(wanted.key)?'failed':wanted&&!bundles.has(wanted.key)?'loading':wanted?.missing.length?'degraded':'ready',errors:[...diagnostics.values()],missing:wanted?.missing||[],look:wanted?{body:wanted.body,...wanted.look,kit:'equipped'}:{...current},draft:{...draft},draws,lastPose,loading:!!pending,images:images.size,imageBytes,bundles:bundles.size,previews:previews.size,peakLoads});
    function diagnose(error,context={}){
      const detail={component:context.consumer||'player',...context,...error.spriteContext,status:'failed',message:error.message};
      const key=[detail.asset||detail.component,detail.code||'load-failed'].join(':');
      if(!diagnostics.has(key)){diagnostics.set(key,detail);while(diagnostics.size>24)diagnostics.delete(diagnostics.keys().next().value);console.error('[current-player-sprite]',detail);}
      return detail;
    }
    function report(error,context={}){diagnose(error,context);message='Não foi possível carregar o visual atual. Recarregue a página; o diagnóstico registra o recurso com falha.';onChange();}
    function failure(message,context){const error=Error(message);error.spriteContext=context;return error;}
    async function json(file){const url=new URL(file,base);if(assetRevision&&file!=='player-pack.json')url.searchParams.set('revision',assetRevision);const r=await fetch(url,{cache:file==='player-pack.json'?'no-cache':'default'});if(!r.ok)throw failure('Arquivo ausente: '+file,{component:'player-manifest',asset:file,resolved:url.href,code:'manifest-http'});try{return await r.json();}catch(cause){throw failure('Manifesto inválido: '+file,{component:'player-manifest',asset:file,resolved:url.href,code:'manifest-json'});}}
    function script(file){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL(file+'?revision='+assetRevision,base).href;node.onload=resolve;node.onerror=()=>reject(failure('Compositor indisponível: '+file,{component:'player-compositor',asset:file,resolved:node.src,code:'module-load'}));document.head.append(node);});}
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
        for(const name of ['rig','layers','motion','surface','torso','appearance','weapons','wardrobe'])await script(name+'.js');
        root.MareLayers96.validate(manifest);
        if(catalog.productionEnabled!==false||catalog.canonicalMirror?.allLayers!==true)throw Error('Contrato de revisão incompatível.');
        for(const body of ['masculino','feminino'])for(const action of actions)for(const dir of ['south','north','east','west']){
          const clip=manifest.bodies[body]?.clips[action]?.[dir];if(!clip?.modular||!clip.frames||!clip.fps)throw Error('Movimento incompleto.');
        }
        choices={body:{masculino:'Masculino',feminino:'Feminino'},hair:{original:'Original',none:'Sem cabelo'},face:{original:'Original'},skin:{original:'Original'},hairColor:{},kit:{equipped:'Equipamentos atuais',none:'Sem equipamentos', 'sample-a':'Conjunto de ensaio A','sample-b':'Conjunto de ensaio B'}};
        for(const s of catalog.styles)if(s.kind==='hair'||s.kind==='face')choices[s.kind][s.id]=s.name;
        for(const [id,p]of Object.entries(root.MareAppearance96.skins))choices.skin[id]=p.name;
        for(const [id,p]of Object.entries(root.MareAppearance96.hairs))choices.hairColor[id]=p.name;
        wardrobe=root.MareWardrobe96.create(catalog,rigs,image,{weapons:weaponCatalog});state='ready';onChange();
      }catch(error){state='failed';report(error,{consumer:'player-init',asset:'player-pack.json'});}return snapshot();
    })():Promise.resolve(snapshot());
    function resolve(player,look=current,production=true){look=appearanceLook(player,production?defaults:look,production);const value=outfit(catalog,player,look,{production}),category=weaponCatalog.classes[player?.classId]||null,model=weaponCatalog.items.find(w=>w.itemId===player?.equipment?.weapon?.def&&w.category===category);value.look.weapon=model?.id||'original';if(player?.equipment?.weapon&&!model)value.missing.push({slot:'weapon',def:player.equipment.weapon.def});const supported=!!category;for(const m of value.missing)diagnose(failure('Equipamento sem arte atual: '+m.def,{component:'equipment-resolver',asset:'item:'+m.def,slot:m.slot,code:'unmapped-equipment'}));return {...value,body:look.body,category,attack:model?.attackAction||'attack-'+category,supported,key:JSON.stringify([look.body,{...value.look,hideHeadgear:value.look.head==='original'?false:value.look.hideHeadgear},supported?category:null])};}
    function selected(body,action,direction,look){const clip=manifest.bodies[body].clips[action][direction];return {body,action,direction,clip,layers:clip.layers,look,key:[body,action,direction].join(':')};}
    async function compose(body,action,direction,look,cancel=()=>false,consumer='player-prepare'){
      const sel=selected(body,action,direction,look),spec=root.MareMotion96.clipSpec(manifest,sel.clip);
      const files=[...new Set([...wardrobe.nativeFiles(sel,look),...wardrobe.requiredFiles(sel,look,[])])];
      const loaded=new Map(await Promise.all(files.map(async file=>[file,await image(file,{consumer,body,action,direction})])));
      const pad=wardrobe.weaponPadding(sel,spec,look),renderSpec={...spec,width:spec.width+pad.x*2,height:spec.height+pad.top+pad.bottom,pivot:{x:spec.pivot.x+pad.x,y:spec.pivot.y+pad.top}};
      const strip=Object.assign(document.createElement('canvas'),{width:renderSpec.width*sel.clip.frames,height:renderSpec.height}),ctx=strip.getContext('2d'),emissions=[];
      const tile=Object.assign(document.createElement('canvas'),{width:renderSpec.width,height:renderSpec.height}),tc=tile.getContext('2d');tc.translate(pad.x,pad.top);
      for(let frame=0;frame<sel.clip.frames;frame++){
        if(cancel())return null;
        tc.clearRect(-pad.x,-pad.top,tile.width,tile.height);emissions.push(wardrobe.draw(tc,loaded,sel,frame,spec,[],look));ctx.drawImage(tile,frame*renderSpec.width,0);await pause();
      }
      return {strip,spec:renderSpec,nativeSpec:spec,clip:sel.clip,emissions};
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
      if(state!=='ready')return Promise.resolve(false);
      const target=resolve(player);wanted=target;
      if(bundles.has(target.key))return Promise.resolve(true);
      if(failed.has(target.key))return Promise.resolve(false);
      if(pending)return pending;
      pending=(async()=>{
        while(wanted&&!bundles.has(wanted.key)&&!failed.has(wanted.key)){
          const next=wanted,bundle=new Map();preparing={key:next.key,bundle};
          try{
            for(const action of ['idle','walk',...(next.supported?[next.attack,'attack-unarmed']:[])].filter((v,i,a)=>a.indexOf(v)===i))for(const dir of ['south','north','east']){
              if(wanted.key!==next.key)break;
              for(const hideHeadgear of [next.look.hideHeadgear]){
                const stateLook={...next.look,hideHeadgear},key=clipKey(action,dir,stateLook);

                const value=await compose(next.body,action,dir,stateLook,()=>wanted.key!==next.key,consumer);
                if(value){bundle.set(key,value);if(next.look.head==='original')bundle.set(clipKey(action,dir,{hideHeadgear:!hideHeadgear}),value);}
              }
            }
            if(wanted.key!==next.key){releaseBundle(bundle);continue;}
            bundles.set(next.key,bundle);while(bundles.size>2){const key=bundles.keys().next().value;releaseBundle(bundles.get(key));bundles.delete(key);}message='';onChange();
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
      ctx.drawImage(strip,frame*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);ctx.restore();
    }
    function draw(ctx,player,{scene,action='idle',direction='south',time=0,progress=null,timing=null,x=0,y=0,scale=null,worldView=false,consumer='world'}={}){
      direction=directionOf(direction);if(worldView)lastPose=null;
      if(!active||state!=='ready'||player?.zoanTransformed||!['south','north','east','west'].includes(direction))return false;
      const value=resolve(player);if(scene!=='lobby'&&!(scene==='hunt'&&value.supported))return false;
      if(scene==='hunt'&&!pending&&!previewPending)trimSourceImages();
      const requested=action;
      if(['combat-idle','guard','hurt','death'].includes(action))action='idle';
      else if(['attack','skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(action))action=player?.equipment?.weapon?value.attack:'attack-unarmed';
      if(!actions.includes(action)||!value.supported){diagnose(failure('Ação atual indisponível',{component:consumer,asset:player?.classId,action,direction,code:'unsupported-current-action'}));return false;}
      ensure(player,{consumer});const bundle=bundleFor(value.key),clip=bundle?.get(clipKey(action,direction==='west'?'east':direction,value.look));if(!clip)return false;
      const hit=Math.max(.001,Math.min(.999,timing?.hitFrameRatio??.5));
      const p=Number.isFinite(progress)&&!clip.clip.loop?(progress<=hit?progress/hit*.5:.5+(progress-hit)/(1-hit)*.5):null;
      const frame=frameAt(clip.clip,time,p);paint(ctx,clip,direction,frame,x,y,scale===null?1:scale*46/96);draws++;
      if(worldView)lastPose={consumer,assetRevision,body:value.body,action,requestedAction:requested,direction,frame,progress:p,weapon:value.look.weapon,scale:1,pivot:{x,y},missing:value.missing};return true;
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
    let previewPending=false,previewWanted=null;
    function preview(ctx,player,{action='idle',direction='south',time=0,appearance=null,consumer='appearance-preview'}={}){
      if(state!=='ready'||!actions.includes(action)||!['south','north','west','east'].includes(direction))return false;
      const value=appearance?resolve({...player,appearance96:appearance},current,true):resolve(player,draft,false),dir=direction==='west'?'east':direction,key=value.key+':'+clipKey(action,dir,value.look);
      if(previewWanted!==key)previewMessage='';previewWanted=key;
      let entry=previews.get(key);
      if(!entry){
        if(previewPending)return false;
        previewPending=true;entry={value:null,error:null};previews.set(key,entry);
        entry.promise=compose(value.body,action,dir,value.look,()=>false,consumer).then(v=>{entry.value=v;}).catch(error=>{entry.error=error;diagnose(error,{consumer});if(previewWanted===key)previewMessage='Prévia indisponível. O diagnóstico registra o recurso com falha.';}).finally(()=>{previewPending=false;});
        while(previews.size>8){const key=previews.keys().next().value,strip=previews.get(key).value?.strip;if(strip){strip.width=0;strip.height=0;}previews.delete(key);}
      }
      if(!entry.value)return false;
      const frame=frameAt(entry.value.clip,entry.value.clip.loop?time:time%(entry.value.clip.frames/entry.value.clip.fps+.25));
      paint(ctx,entry.value,direction,frame,ctx.canvas.width/2,ctx.canvas.height-24,2);return true;
    }
    function projectileOrigin(player,hero,pose={},scale=1){
      if(!active||state!=='ready'||player?.zoanTransformed)return null;
      const value=resolve(player);if(!value.supported||!['firearm','tech','focus'].includes(value.category)||value.look.weapon==='original')return null;
      const direction=directionOf(pose.direction||hero.direction),clip=bundleFor(value.key)?.get(clipKey(value.attack,direction==='west'?'east':direction,value.look));
      const point=clip?.emissions[4]?.[0]?.point;if(!point)return null;
      const spec=clip.nativeSpec,x=direction==='west'?spec.width+1-point.x:point.x;
      return {x:hero.x+(x-spec.pivot.x)*scale,y:hero.y+(point.y-spec.pivot.y)*scale,frame:4,weapon:value.look.weapon};
    }
    const height=player=>active&&!player?.zoanTransformed?96:null;
    return {ready,snapshot,draw,height,ensure,stepWalk,walkPose,projectileOrigin,panel,preview,setDraft,apply,discard,valid,resolve:player=>state==='ready'?resolve(player):null};
  }
  root.MarePaperDoll96Lobby={create,enabled,defaults,slots,outfit,appearanceLook,assetReferences,validateRelease,frameAt,directionOf};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MarePaperDoll96Lobby;
})(typeof globalThis!=='undefined'?globalThis:window);
