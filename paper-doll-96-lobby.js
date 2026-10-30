/* Native player release and explicit rehearsal. Shares wardrobe; owns no save or combat state. */
(function(root){
  'use strict';
  const Headgear=root.MareHeadgear||(typeof module!=='undefined'&&module.exports?require('./headgear-visibility.js'):null);
  const defaults=Object.freeze({body:'masculino',hair:'original',face:'original',skin:'original',hairColor:'brown',kit:'equipped'});
  const slots=Object.freeze({coat:'torso',legs:'pants',boots:'boots',gloves:'gloves',cloak:'cloak',head:'head'});
  const actions=['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech'];
  const directionOf=value=>({front:'south',back:'north',left:'west',right:'east'})[value]||value;
  const enabled=search=>{const p=new URLSearchParams(search);const flag=p.get('paperDoll96');return (flag===null||flag==='1')&&(p.get('dev')!=='1'||p.get('paperDoll96')==='1');};
  const clipKey=(action,dir,look)=>action+':'+dir+':'+(look.hideHeadgear?'hidden':'visible');
  const safeFile=file=>typeof file==='string'&&/^assets\/[a-z0-9-]+\.png$/.test(file);
  function outfit(catalog,player,look,{production=false}={}){
    const value={hair:look.hair,face:look.face,skin:look.skin,hairColor:look.hairColor},missing=[];
    for(const kind of Object.values(slots))value[kind]='original';
    const kits={'sample-a':{coat:6,legs:21,boots:8,gloves:25,cloak:23,head:18},'sample-b':{coat:7,legs:22,boots:9,gloves:26,cloak:24,head:19}};
    for(const [slot,kind]of Object.entries(slots)){
      const def=look.kit==='equipped'?player?.equipment?.[slot]?.def:kits[look.kit]?.[slot];
      if(def===undefined||def===null)continue;
      const item=catalog.styles.find(s=>s.kind===kind&&s.itemId===def);
      if(item)value[kind]=item.id;else missing.push({slot,def});
    }
    value.hideHeadgear=Headgear.hidden(player);
    if(production&&look.hair==='original'&&look.hairColor==='brown'&&(!player?.paperDollLook||player.paperDollLook.hair==='short-black'))value.hairColor='black';
    if(look.hair==='original'&&player?.paperDollLook?.hair==='bald')value.hair='none';
    value.baseOutfitHidden=player?.paperDollLook?.outfit==='base'&&!player?.equipment?.coat;
    return {look:value,missing};
  }
  function frameAt(clip,time,progress=null){
    const frame=Number.isFinite(progress)?Math.floor(Math.max(0,Math.min(1,progress))*clip.frames):Math.floor(Math.max(0,time)*clip.fps);
    return clip.loop?frame%clip.frames:Math.min(clip.frames-1,frame);
  }
  function create({search='',baseURL=root.location?.href,onChange=()=>{}}={}){
    const active=enabled(search),rehearsal=new URLSearchParams(search).get('paperDoll96')==='1',base=new URL('tools/paper-doll-96-v3/',baseURL);
    let state=active?'loading':'off',message='',manifest,catalog,rigs,weaponCatalog,wardrobe,choices={},current={...defaults},draft={...defaults};
    let draws=0,lastPose=null,pending=null,wanted=null,bundles=new Map(),previews=new Map(),failed=new Set();
    const images=new Map(),inflight=new Map();let loading=0,peakLoads=0;const waiting=[];
    const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
    const snapshot=()=>({enabled:active,rehearsal,state,message,look:{...current},draft:{...draft},draws,lastPose,loading:!!pending,images:images.size,bundles:bundles.size,previews:previews.size,peakLoads});
    function report(error){message='Ensaio indisponível. Visual anterior preservado. '+error.message;onChange();}
    async function json(file){const r=await fetch(new URL(file,base),{cache:'no-store'});if(!r.ok)throw Error('Arquivo ausente: '+file);return r.json();}
    function script(file){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(file+'?revision='+encodeURIComponent(manifest.visualRevision+'-'+weaponCatalog.revision+'-headgear96-v1'),base).href;s.onload=resolve;s.onerror=()=>reject(Error('Compositor ausente: '+file));document.head.append(s);});}
    async function image(file){
      if(!safeFile(file))throw Error('Caminho de camada inválido.');
      if(images.has(file)){const value=images.get(file);images.delete(file);images.set(file,value);return value;}
      if(inflight.has(file))return inflight.get(file);
      const promise=(async()=>{
        if(loading>=6)await new Promise(resolve=>waiting.push(resolve));loading++;peakLoads=Math.max(peakLoads,loading);
        try{
          const img=new Image();img.src=new URL(file+'?revision='+encodeURIComponent(manifest.visualRevision+'-'+weaponCatalog.revision),base).href;await img.decode();
          images.set(file,img);while(images.size>48)images.delete(images.keys().next().value);return img;
        }finally{loading--;waiting.shift()?.();}
      })();inflight.set(file,promise);try{return await promise;}finally{inflight.delete(file);}
    }
    const ready=active?(async()=>{
      try{
        const release=!rehearsal?await json('player-pack.json'):null;
        if(!rehearsal&&(!release||release.productionEnabled!==true||release.id!=='native-player96-v1'))throw Error('Liberação visual indisponível.');
        [manifest,catalog,rigs,weaponCatalog]=await Promise.all(['manifest.json','appearance-catalog.json','appearance-rig.json','weapons.json'].map(json));
        if(release&&(release.manifestRevision!==manifest.visualRevision||release.weaponRevision!==weaponCatalog.revision))throw Error('Liberação visual desatualizada.');
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
      }catch(error){state='failed';report(error);}return snapshot();
    })():Promise.resolve(snapshot());
    function resolve(player,look=current){const value=outfit(catalog,player,look,{production:!rehearsal}),category=weaponCatalog.classes[player?.classId]||null,model=weaponCatalog.items.find(w=>w.itemId===player?.equipment?.weapon?.def&&w.category===category);value.look.weapon=model?.id||'original';if(player?.equipment?.weapon&&!model)value.missing.push({slot:'weapon',def:player.equipment.weapon.def});const supported=!!category&&(!player?.equipment?.weapon||!!model);return {...value,body:look.body,category,attack:model?.attackAction||'attack-'+category,supported,key:JSON.stringify([look.body,{...value.look,hideHeadgear:false},supported?category:null])};}
    function selected(body,action,direction,look){const clip=manifest.bodies[body].clips[action][direction];return {body,action,direction,clip,layers:clip.layers,look,key:[body,action,direction].join(':')};}
    async function compose(body,action,direction,look,cancel=()=>false){
      const sel=selected(body,action,direction,look),spec=root.MareMotion96.clipSpec(manifest,sel.clip);
      const files=[...new Set([...Object.values(sel.layers),...wardrobe.requiredFiles(sel,look)])];
      const loaded=new Map(await Promise.all(files.map(async file=>[file,await image(file)])));
      const pad=wardrobe.weaponPadding(sel,spec,look),renderSpec={...spec,width:spec.width+pad.x*2,height:spec.height+pad.top+pad.bottom,pivot:{x:spec.pivot.x+pad.x,y:spec.pivot.y+pad.top}};
      const strip=Object.assign(document.createElement('canvas'),{width:renderSpec.width*sel.clip.frames,height:renderSpec.height}),ctx=strip.getContext('2d'),emissions=[];
      for(let frame=0;frame<sel.clip.frames;frame++){
        if(cancel())return null;
        const tile=Object.assign(document.createElement('canvas'),{width:renderSpec.width,height:renderSpec.height});
        const tc=tile.getContext('2d');tc.translate(pad.x,pad.top);emissions.push(wardrobe.draw(tc,loaded,sel,frame,spec,[],look));ctx.drawImage(tile,frame*renderSpec.width,0);await pause();
      }
      return {strip,spec:renderSpec,nativeSpec:spec,clip:sel.clip,emissions};
    }
    function ensure(player){
      if(state!=='ready')return Promise.resolve(false);
      const target=resolve(player);wanted=target;
      if(bundles.has(target.key))return Promise.resolve(true);
      if(failed.has(target.key))return Promise.resolve(false);
      if(pending)return pending;
      pending=(async()=>{
        while(wanted&&!bundles.has(wanted.key)&&!failed.has(wanted.key)){
          const next=wanted,bundle=new Map();
          try{
            for(const action of ['idle','walk',...(next.supported?[next.attack,'attack-unarmed']:[])].filter((v,i,a)=>a.indexOf(v)===i))for(const dir of ['south','north','east']){
              if(wanted.key!==next.key)break;
              for(const hideHeadgear of [false,true]){
                const stateLook={...next.look,hideHeadgear},key=clipKey(action,dir,stateLook);
                if(hideHeadgear&&next.look.head==='original'){bundle.set(key,bundle.get(clipKey(action,dir,{hideHeadgear:false})));continue;}
                const value=await compose(next.body,action,dir,stateLook,()=>wanted.key!==next.key);
                if(value)bundle.set(key,value);
              }
            }
            if(wanted.key!==next.key)continue;
            bundles.set(next.key,bundle);while(bundles.size>2)bundles.delete(bundles.keys().next().value);message='';onChange();
          }catch(error){failed.add(next.key);if(failed.size>8)failed.delete(failed.values().next().value);report(error);}
        }
        return bundles.has(wanted?.key);
      })().finally(()=>{pending=null;});return pending;
    }
    function paint(ctx,value,direction,frame,x,y,scale){
      const {spec,strip}=value;ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.translate(-spec.pivot.x,-spec.pivot.y);
      if(direction==='west'){ctx.translate(spec.width+1,0);ctx.scale(-1,1);}
      ctx.drawImage(strip,frame*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);ctx.restore();
    }
    function draw(ctx,player,{scene,action='idle',direction='south',time=0,progress=null,timing=null,x=0,y=0,scale=null,worldView=false}={}){
      direction=directionOf(direction);
      if(!active||state!=='ready'||player?.zoanTransformed||!['south','north','east','west'].includes(direction))return false;
      const value=resolve(player);if(scene!=='lobby'&&!(scene==='hunt'&&value.supported))return false;
      const requested=action;
      if(['combat-idle','guard','hurt','death'].includes(action))action='idle';
      else if(['attack','skill','skill-1','skill-2','combo','cast','heal','reload','dodge'].includes(action))action=player?.equipment?.weapon?value.attack:'attack-unarmed';
      if(!['idle','walk'].includes(action)&&!value.supported)return false;
      ensure(player);const bundle=bundles.get(value.key),clip=bundle?.get(clipKey(action,direction==='west'?'east':direction,value.look));if(!clip)return false;
      const hit=Math.max(.001,Math.min(.999,timing?.hitFrameRatio??.5));
      const p=Number.isFinite(progress)&&!clip.clip.loop?(progress<=hit?progress/hit*.5:.5+(progress-hit)/(1-hit)*.5):null;
      const frame=frameAt(clip.clip,time,p);paint(ctx,clip,direction,frame,x,y,scale===null?1:scale*46/96);draws++;
      if(worldView)lastPose={body:value.body,action,requestedAction:requested,direction,frame,progress:p,weapon:value.look.weapon,scale:1,pivot:{x,y},missing:value.missing};return true;
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
      return `<section class="doll-dressing"><header><h2>Ensaio de aparência no lobby · 96 px</h2><p>Escolhas temporárias. Seu personagem salvo e os atributos dos equipamentos são preservados.</p></header><div class="doll-dressing-grid"><figure><canvas id="lobby96Canvas" width="512" height="512" aria-label="Prévia da aparência de 96 pixels"></canvas><figcaption id="lobby96State" role="status"></figcaption><label>Direção<select id="lobby96Direction"><option value="south">Frente</option><option value="north">Costas</option><option value="west">Esquerda</option><option value="east">Direita</option></select></label><label>Movimento<select id="lobby96Action">${actions.map(a=>`<option value="${a}">${({idle:'Repouso',walk:'Caminhada','attack-sword':'Espada','attack-unarmed':'Punhos','attack-firearm':'Disparo','attack-daggers':'Adagas','attack-focus':'Canalização','attack-tech':'Tecnologia'})[a]}</option>`).join('')}</select></label></figure><div class="doll-dressing-controls">${fields}<p>Os conjuntos de ensaio mudam somente o visual. As prévias não causam dano. As armas equipadas das sete classes acompanham os movimentos e o combate. Peças sem matriz mantêm o visual anterior.</p>${missing.length?root.MareUI.notice({text:'Há equipamentos atuais sem arte de 96 px. Eles mantêm seus bônus; esta prévia não mostra uma peça substituta.',tone:'info'}):''}<div class="doll-dressing-actions">${root.MareUI.button({label:'Visualizar no lobby',attributes:{'data-lobby96-apply':''}})}${root.MareUI.button({label:'Descartar alterações',attributes:{'data-lobby96-cancel':''}})}</div><p id="lobby96Message" role="status">${E(message)}</p></div></div></section>`;
    }
    let previewPending=false;
    function preview(ctx,player,{action='idle',direction='south',time=0}={}){
      if(state!=='ready'||!actions.includes(action)||!['south','north','west','east'].includes(direction))return false;
      const value=resolve(player,draft),dir=direction==='west'?'east':direction,key=value.key+':'+clipKey(action,dir,value.look);
      let entry=previews.get(key);
      if(!entry){
        if(previewPending)return false;
        previewPending=true;entry={value:null,error:null};previews.set(key,entry);
        entry.promise=compose(value.body,action,dir,value.look).then(v=>{entry.value=v;}).catch(error=>{entry.error=error;message='Prévia indisponível: '+error.message;}).finally(()=>{previewPending=false;});
        while(previews.size>8)previews.delete(previews.keys().next().value);
      }
      if(!entry.value)return false;
      const frame=frameAt(entry.value.clip,entry.value.clip.loop?time:time%(entry.value.clip.frames/entry.value.clip.fps+.25));
      paint(ctx,entry.value,direction,frame,ctx.canvas.width/2,ctx.canvas.height-24,2);return true;
    }
    function projectileOrigin(player,hero,pose={},scale=1){
      if(!active||state!=='ready'||player?.zoanTransformed)return null;
      const value=resolve(player);if(!value.supported||!['firearm','tech','focus'].includes(value.category)||value.look.weapon==='original')return null;
      const direction=directionOf(pose.direction||hero.direction),clip=bundles.get(value.key)?.get(clipKey(value.attack,direction==='west'?'east':direction,value.look));
      const point=clip?.emissions[4]?.[0]?.point;if(!point)return null;
      const spec=clip.nativeSpec,x=direction==='west'?spec.width+1-point.x:point.x;
      return {x:hero.x+(x-spec.pivot.x)*scale,y:hero.y+(point.y-spec.pivot.y)*scale,frame:4,weapon:value.look.weapon};
    }
    const height=(player,scene)=>active&&state==='ready'&&(scene==='lobby'||scene==='hunt'&&resolve(player).supported)&&!player?.zoanTransformed&&bundles.has(resolve(player).key)?96:null;
    return {ready,snapshot,draw,height,ensure,projectileOrigin,panel,preview,setDraft,apply,discard,valid,resolve:player=>state==='ready'?resolve(player):null};
  }
  root.MarePaperDoll96Lobby={create,enabled,defaults,slots,outfit,frameAt,directionOf};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MarePaperDoll96Lobby;
})(typeof globalThis!=='undefined'?globalThis:window);
