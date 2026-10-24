'use strict';
/* Read-only release gate: declared coverage is not artistic approval. */
((root)=>{
  const directions=['south','north','west','east'];
  const categories=['sword','unarmed','firearm','daggers','tech','focus'];
  const actions={idle:4,walk:8,...Object.fromEntries(categories.map(c=>['attack-'+c,8]))};
  function inspect(pack){
    const missing=[],present=[],slots=['body','hair','outfit','weapon'];
    const compatible=(piece,action,direction,frames)=>{
      const clip=piece?.animations?.[action];
      return piece?.available===true&&clip?.frames===frames&&clip?.directions?.includes(direction)&&typeof clip.url==='string'&&clip.frameWidth===84&&clip.frameHeight===84;
    };
    for(const [action,frames]of Object.entries(actions))for(const direction of directions)for(const slot of slots){
      const category=action.startsWith('attack-')?action.slice(7):'sword';
      const pieceId=slot==='weapon'?(pack?.categoryWeapons?.[category]||(category==='sword'?pack?.appearance?.pieces?.weapon:null)):pack?.appearance?.pieces?.[slot];
      const piece=pack?.pieces?.find(p=>p.id===pieceId&&p.slot===slot);
      const valid=compatible(piece,action,direction,frames);
      (valid?present:missing).push({action,direction,slot,frames});
    }
    const approved=pack?.full_character_artwork_approved===true&&pack?.pieces?.every(p=>p.approved===true)===true;
    const missingWeaponLocomotion=[];
    for(const category of categories.filter(c=>c!=='sword')){
      const piece=pack?.pieces?.find(p=>p.id===pack?.categoryWeapons?.[category]&&p.slot==='weapon');
      for(const action of ['idle','walk'])for(const direction of directions)if(!compatible(piece,action,direction,actions[action]))missingWeaponLocomotion.push({category,action,direction,frames:actions[action]});
    }
    const readyByCategory=Object.fromEntries(categories.map(c=>[c,!missing.some(m=>['idle','walk','attack-'+c].includes(m.action))&&!missingWeaponLocomotion.some(m=>m.category===c)]));
    return {status:missing.length||missingWeaponLocomotion.length?'missing-art':approved?'ready-for-runtime-validation':'awaiting-art-review',
      productionReady:missing.length===0&&missingWeaponLocomotion.length===0&&approved&&pack?.productionEnabled===true,
      declaredFrames:present.reduce((s,p)=>s+p.frames,0),missingFrames:missing.reduce((s,p)=>s+p.frames,0),
      missingAnatomyAndClothingFrames:missing.filter(m=>m.slot!=='weapon').reduce((s,p)=>s+p.frames,0),
      missingWeaponLocomotionFrames:missingWeaponLocomotion.reduce((sum,p)=>sum+p.frames,0),readyByCategory,missing,missingWeaponLocomotion};
  }
  root.MarePaperDollCoverage={inspect};
  if(typeof module!=='undefined'&&module.exports)module.exports={inspect};
})(typeof globalThis!=='undefined'?globalThis:window);
