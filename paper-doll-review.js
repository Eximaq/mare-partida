'use strict';
/* Explicit DEV preview, transient only. Never approve art or persist appearance. */
((root)=>{
  const id='navy-starter',folder='pixellab-pip-generations/paper-doll-navy-starter-20261023/';
  function requested(search,devActive){return devActive===true&&new URLSearchParams(search).get('paperDollReview')===id;}
  function appearance(pack,player){
    const catalog=root.MarePaperDollCatalog;
    if(!catalog.eligible(player))return null;
    const unarmed=!player.equipment?.weapon;
    const result={rigId:pack.rig.id,pieces:{...pack.appearance.pieces},blocked:[],hidden:[...(unarmed?['weapon']:[]),...(root.MarePaperDollLook?.hidden(player)||[])]};
    // Body identity is independent of class/faction. Missing weapon artwork
    // still falls back; only genuinely unequipped hands omit the sword layer.
    const category=catalog.profile(player).category;
    if(!unarmed){
      if(catalog.weaponItems[player.equipment.weapon.def]?.[0]!==category)return null;
      if(category!=='sword'&&!pack.categoryWeapons?.[category])return null;
      if(pack.categoryWeapons?.[category])result.pieces.weapon=pack.categoryWeapons[category];
    }
    for(const [equipmentSlot,binding]of Object.entries(pack.bindings||{})){
      const item=player.equipment?.[equipmentSlot];if(!item)continue;
      const piece=Object.hasOwn(binding.items,item.def)?binding.items[item.def]:null;
      if(piece)result.pieces[binding.slot]=piece;
      else result.blocked.push({slot:binding.slot,pieceId:String(item.def),code:'unmapped-equipment'});
    }
    // Unsupported visible garments cannot silently disappear in a complete prototype.
    for(const slot of ['head','boots','legs','cloak','gloves'])if(player.equipment?.[slot])result.blocked.push({slot:'accessory',pieceId:String(player.equipment[slot].def),code:'unmapped-equipment'});
    return result;
  }
  function create({search='',devActive=false,getImage,fetch:fetcher=root.fetch?.bind(root),baseURL=root.location?.href,onChange=()=>{}}={}){
    const enabled=requested(search,devActive),runtime=root.MarePaperDollCatalog.createRuntime({getImage});
    let pack=null,coverage=null,state=enabled?'loading':'off',message='',draws=0,fallbacks=0,lastReason=null;
    const notify=()=>onChange(snapshot());
    function snapshot(){return {enabled,state,message,draws,fallbacks,lastReason,artworkApproved:false,coverage,...runtime.stats()};}
    const ready=enabled?(async()=>{
      try{
        const base=new URL(folder,baseURL),response=await fetcher(new URL('review-pack.json',base),{cache:'no-store'});
        if(!response.ok)throw Error('Manifesto indisponível.');
        const data=await response.json();
        if(data.reviewOnly!==true||data.productionEnabled!==false||data.full_character_artwork_approved!==false||data.rig?.id!=='human-v1'||data.rig.frameWidth!==84||data.rig.frameHeight!==84||!Array.isArray(data.pieces)||data.pieces.length<4||data.pieces.length>64||new Set(data.pieces.map(p=>p.id)).size!==data.pieces.length)throw Error('Pacote de revisão incompatível.');
        const required=['body','hair','outfit','weapon'];
        if(required.some(s=>!data.rig.requiredSlots?.includes(s)||data.pieces.filter(p=>p.slot===s&&p.id===data.appearance?.pieces?.[s]).length!==1))throw Error('Conjunto incompleto.');
        for(const [category,pieceId]of Object.entries(data.categoryWeapons||{})){
          if(!Object.hasOwn(root.MarePaperDollCatalog.categories,category)||!data.pieces.some(p=>p.id===pieceId&&p.slot==='weapon'))throw Error('Arma de categoria inválida.');
        }
        const urls=new Set();
        const path=name=>{if(typeof name!=='string'||!/^[a-z0-9-]+\.png$/.test(name))throw Error('Fonte inválida.');const url=new URL(name,base).href;urls.add(url);return url;};
        for(const p of data.pieces){
          if(p.approved!==false||!p.available)throw Error('Estado da peça inválido.');
          for(const clip of Object.values(p.animations)){clip.url=path(clip.url);for(const source of Object.values(clip.sources||{}))source.url=path(source.url);}
          runtime.registerPiece(p);
        }
        await Promise.all([...urls].map(url=>getImage(url).decode()));
        for(const [action,clip]of Object.entries(data.rig.animations))for(const direction of clip.directions)for(let frameIndex=0;frameIndex<clip.frames;frameIndex++){
          const category=action.startsWith('attack-')?action.slice(7):'sword',config={...data.appearance,pieces:{...data.appearance.pieces}};
          if(data.categoryWeapons?.[category])config.pieces.weapon=data.categoryWeapons[category];
          if(!runtime.resolve(config,{animationId:action,direction,frameIndex},{allowDraft:true}).valid)throw Error('Há frames incompatíveis ou ausentes.');
        }
        pack=data;coverage=root.MarePaperDollCoverage?.inspect(pack)||null;state='ready';message='Corpo comum: sete classes e quatro facções, sem arma, em repouso e caminhada. Espada inicial compatível; outros equipamentos e ataques sem arte usam o personagem original.';
      }catch(e){pack=null;state='failed';message='Prévia indisponível: '+e.message+' Sprite original preservado.';}
      notify();return snapshot();
    })():Promise.resolve(snapshot());
    function draw(ctx,player,action,direction,time,x,y,scale,progress=null){
      if(!pack||state!=='ready'||player?.devSandbox!==true)return false;
      const config=appearance(pack,player),pose=root.MarePaperDollCatalog.sample(runtime,player,action,direction,time,{progress});
      if(!config||!pose){fallbacks++;lastReason='unsupported-character-or-action';return false;}
      if(config.hidden.includes('weapon')&&action!=='idle'&&action!=='walk'){fallbacks++;lastReason='missing-unarmed-animation';return false;}
      const ok=runtime.draw(ctx,config,pose,x,y,{scale,hidden:config.hidden,allowDraft:true});
      if(ok){draws++;lastReason=null;}else{fallbacks++;lastReason=config.blocked[0]?.code||'missing-animation';}
      return ok;
    }
    return {ready,draw,snapshot};
  }
  root.MarePaperDollReview={id,requested,appearance,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MarePaperDollReview;
})(typeof globalThis!=='undefined'?globalThis:window);
