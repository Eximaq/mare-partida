'use strict';
/* Catalog only. Empty pieces are explicit missing assets, never invented artwork. */
((root)=>{
  const directions=['south','north','west','east'];
  const rig={id:'swordsman-v1',revision:1,frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:70/46,
    requiredSlots:['body','hair','outfit','weapon'],animations:{
      idle:{frames:4,fps:4,loop:true,directions},walk:{frames:8,fps:8,loop:true,directions},attack:{frames:8,fps:12,loop:false,directions}
    }};
  const definitions=[['prototype-body','body','Corpo-base'],['prototype-hair','hair','Cabelo'],['prototype-outfit','outfit','Roupa padrão'],['prototype-sword','weapon','Espada de Ferro Salgado'],
    ['prototype-sabre','weapon','Sabre de Coral'],['prototype-mist-coat','outfit','Casaco da Bruma'],['prototype-bandana','accessory','Bandana das Correntes']];
  const pieces=definitions.map(([id,slot,name])=>({id,name,slot,rigId:rig.id,revision:1,approved:false,available:false,animations:{},source:'missing; no modular source supplied'}));
  const defaults={body:'prototype-body',hair:'prototype-hair',outfit:'prototype-outfit',weapon:'prototype-sword'};
  const bindings={weapon:{slot:'weapon',items:{0:'prototype-sword',1:'prototype-sabre'}},coat:{slot:'outfit',items:{6:'prototype-outfit',7:'prototype-mist-coat'}},head:{slot:'accessory',items:{18:'prototype-bandana'}}};
  const reference={idle:{assetId:'pirate',action:'idle'},walk:{assetId:'pirate',action:'walk'},attack:{assetId:'pirate-sword',action:'attack'}};
  const memo=new WeakMap();
  function eligible(player){return player?.classId==='sword'&&player?.factionId==='pirate'&&!player?.zoanTransformed;}
  function appearance(player){
    const signature=JSON.stringify([player?.classId,player?.factionId,player?.zoanTransformed,...Object.keys(bindings).map(s=>player?.equipment?.[s]?.def??null)]);
    if(player&&memo.get(player)?.signature===signature)return memo.get(player).value;
    const value={rigId:rig.id,pieces:{...defaults},blocked:[]};
    if(!eligible(player))value.blocked.push({slot:'body',pieceId:'',code:'unsupported-character'});
    for(const [equipmentSlot,binding]of Object.entries(bindings)){
      const item=player?.equipment?.[equipmentSlot];if(!item)continue;
      const id=binding.items[item.def];
      if(id)value.pieces[binding.slot]=id;
      else value.blocked.push({slot:binding.slot,pieceId:String(item.def),code:'unmapped-equipment'});
    }
    if(player)memo.set(player,{signature,value});return value;
  }
  function createRuntime(options){const runtime=root.MarePaperDoll.create(options);runtime.registerRig(rig);for(const p of pieces)runtime.registerPiece(p);return runtime;}
  const api={rig,pieces,defaults,bindings,reference,appearance,eligible,createRuntime};root.MarePaperDollCatalog=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
